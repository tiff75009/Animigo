// @ts-nocheck
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { checkAdmin } from "./utils";

// Récupérer tous les tickets avec filtres
export const getAllTickets = query({
  args: {
    sessionToken: v.string(),
    status: v.optional(v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("waiting_user"),
      v.literal("resolved"),
      v.literal("closed")
    )),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    category: v.optional(v.string()),
    assignedToMe: v.optional(v.boolean()),
    search: v.optional(v.string()),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const adminResult = await checkAdmin(ctx, args.sessionToken);
    if (!adminResult.success) {
      return { success: false, error: adminResult.error, tickets: [], total: 0 };
    }

    const admin = adminResult.user;

    // Utiliser l'index by_status si un filtre status est appliqué
    let tickets = args.status
      ? await ctx.db.query("supportTickets").withIndex("by_status", (q) => q.eq("status", args.status!)).collect()
      : await ctx.db.query("supportTickets").collect();

    // Filtres restants
    if (args.priority) {
      tickets = tickets.filter((t) => t.priority === args.priority);
    }
    if (args.category) {
      tickets = tickets.filter((t) => t.category === args.category);
    }
    if (args.assignedToMe) {
      tickets = tickets.filter((t) => t.assignedAdminId === admin._id);
    }
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      tickets = tickets.filter(
        (t) =>
          t.ticketNumber.toLowerCase().includes(searchLower) ||
          t.subject.toLowerCase().includes(searchLower)
      );
    }

    // Trier par priorité puis par date
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    tickets.sort((a, b) => {
      // D'abord par statut (open en premier)
      if (a.status === "open" && b.status !== "open") return -1;
      if (a.status !== "open" && b.status === "open") return 1;
      // Puis par priorité
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      // Puis par date de mise à jour
      return b.updatedAt - a.updatedAt;
    });

    const total = tickets.length;

    // Pagination
    const page = args.page || 1;
    const pageSize = args.pageSize || 20;
    const start = (page - 1) * pageSize;
    const paginatedTickets = tickets.slice(start, start + pageSize);

    // Enrichir avec les infos utilisateur
    const enrichedTickets = await Promise.all(
      paginatedTickets.map(async (ticket) => {
        const user = await ctx.db.get(ticket.userId);
        const assignedAdmin = ticket.assignedAdminId
          ? await ctx.db.get(ticket.assignedAdminId)
          : null;

        // Dernier message
        const lastMessage = await ctx.db
          .query("ticketMessages")
          .withIndex("by_ticket", (q) => q.eq("ticketId", ticket._id))
          .order("desc")
          .first();

        return {
          ...ticket,
          userName: user ? `${user.firstName} ${user.lastName}` : "Utilisateur supprimé",
          userEmail: user?.email,
          assignedAdminName: assignedAdmin ? `${assignedAdmin.firstName} ${assignedAdmin.lastName}` : null,
          lastMessageAt: lastMessage?.createdAt,
          lastMessageSender: lastMessage?.senderType,
        };
      })
    );

    return {
      success: true,
      tickets: enrichedTickets,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },
});

// Compteur de tickets ouverts (léger, pour la sidebar)
export const getOpenTicketsCount = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const adminResult = await checkAdmin(ctx, args.token);
    if (!adminResult.success) return 0;

    const openTickets = await ctx.db
      .query("supportTickets")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();

    return openTickets.length;
  },
});

// Statistiques des tickets
export const getTicketStats = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const adminResult = await checkAdmin(ctx, args.sessionToken);
    if (!adminResult.success) {
      return { success: false, error: adminResult.error };
    }

    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);

    // Requêtes parallèles par index au lieu d'un seul .collect()
    const [openTickets, inProgressTickets, waitingUserTickets, resolvedTickets, closedTickets, highPriorityTickets] = await Promise.all([
      ctx.db.query("supportTickets").withIndex("by_status", (q) => q.eq("status", "open")).collect(),
      ctx.db.query("supportTickets").withIndex("by_status", (q) => q.eq("status", "in_progress")).collect(),
      ctx.db.query("supportTickets").withIndex("by_status", (q) => q.eq("status", "waiting_user")).collect(),
      ctx.db.query("supportTickets").withIndex("by_status", (q) => q.eq("status", "resolved")).collect(),
      ctx.db.query("supportTickets").withIndex("by_status", (q) => q.eq("status", "closed")).collect(),
      ctx.db.query("supportTickets").withIndex("by_priority", (q) => q.eq("priority", "high")).collect(),
    ]);

    const allActive = [...openTickets, ...inProgressTickets, ...waitingUserTickets];
    const activeHighPriority = highPriorityTickets.filter((t) => t.status !== "closed" && t.status !== "resolved");
    const allTickets = [...allActive, ...resolvedTickets, ...closedTickets];

    const stats = {
      total: allTickets.length,
      open: openTickets.length,
      inProgress: inProgressTickets.length,
      waitingUser: waitingUserTickets.length,
      resolved: resolvedTickets.length,
      closed: closedTickets.length,
      highPriority: activeHighPriority.length,
      createdToday: allTickets.filter((t) => t.createdAt >= todayStart).length,
      resolvedToday: resolvedTickets.filter((t) => t.resolvedAt && t.resolvedAt >= todayStart).length,
    };

    // Temps moyen de résolution (derniers 30 jours)
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const recentResolved = resolvedTickets.filter(
      (t) => t.resolvedAt && t.createdAt >= thirtyDaysAgo
    );
    const avgResolutionTime =
      recentResolved.length > 0
        ? recentResolved.reduce((acc, t) => acc + (t.resolvedAt! - t.createdAt), 0) / recentResolved.length
        : 0;

    return {
      success: true,
      stats: {
        ...stats,
        avgResolutionTimeHours: Math.round(avgResolutionTime / (1000 * 60 * 60) * 10) / 10,
      },
    };
  },
});

// Récupérer les détails d'un ticket (admin)
export const getTicketDetailsAdmin = query({
  args: {
    sessionToken: v.string(),
    ticketId: v.id("supportTickets"),
  },
  handler: async (ctx, args) => {
    const adminResult = await checkAdmin(ctx, args.sessionToken);
    if (!adminResult.success) {
      return { success: false, error: adminResult.error };
    }

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) {
      return { success: false, error: "Ticket non trouvé" };
    }

    // Récupérer l'utilisateur
    const user = await ctx.db.get(ticket.userId);

    // Récupérer les messages (y compris les notes internes pour l'admin)
    const messages = await ctx.db
      .query("ticketMessages")
      .withIndex("by_ticket", (q) => q.eq("ticketId", ticket._id))
      .collect();
    messages.sort((a, b) => a.createdAt - b.createdAt);

    // Récupérer l'admin assigné
    const assignedAdmin = ticket.assignedAdminId
      ? await ctx.db.get(ticket.assignedAdminId)
      : null;

    // Récupérer la mission liée
    let relatedMission = null;
    if (ticket.relatedMissionId) {
      const mission = await ctx.db.get(ticket.relatedMissionId);
      if (mission) {
        const announcer = await ctx.db.get(mission.announcerId);
        relatedMission = {
          _id: mission._id,
          serviceName: mission.serviceName,
          startDate: mission.startDate,
          endDate: mission.endDate,
          status: mission.status,
          amount: mission.amount,
          clientName: mission.clientName,
          announcerName: announcer ? `${announcer.firstName} ${announcer.lastName}` : null,
        };
      }
    }

    // Historique des autres tickets de cet utilisateur
    const userTickets = await ctx.db
      .query("supportTickets")
      .withIndex("by_user", (q) => q.eq("userId", ticket.userId))
      .collect();

    return {
      success: true,
      ticket,
      user: user
        ? {
            _id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            accountType: user.accountType,
            createdAt: user.createdAt,
          }
        : null,
      messages,
      assignedAdmin: assignedAdmin
        ? { _id: assignedAdmin._id, firstName: assignedAdmin.firstName, lastName: assignedAdmin.lastName }
        : null,
      relatedMission,
      userTicketsCount: userTickets.length,
    };
  },
});

// Assigner un ticket à un admin
export const assignTicket = mutation({
  args: {
    sessionToken: v.string(),
    ticketId: v.id("supportTickets"),
    adminId: v.optional(v.id("users")), // Si non fourni, assigne à l'admin connecté
  },
  handler: async (ctx, args) => {
    const adminResult = await checkAdmin(ctx, args.sessionToken);
    if (!adminResult.success) {
      throw new ConvexError(adminResult.error);
    }

    const admin = adminResult.user;
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) {
      throw new ConvexError("Ticket non trouvé");
    }

    const assignToId = args.adminId || admin._id;
    const assignedAdmin = await ctx.db.get(assignToId);
    if (!assignedAdmin || assignedAdmin.role !== "admin") {
      throw new ConvexError("Admin non trouvé");
    }

    const now = Date.now();

    await ctx.db.patch(args.ticketId, {
      assignedAdminId: assignToId,
      status: ticket.status === "open" ? "in_progress" : ticket.status,
      updatedAt: now,
    });

    // Ajouter une note interne
    await ctx.db.insert("ticketMessages", {
      ticketId: args.ticketId,
      senderId: admin._id.toString(),
      senderType: "admin",
      senderName: "Système",
      content: `Ticket assigné à ${assignedAdmin.firstName} ${assignedAdmin.lastName}`,
      isInternal: true,
      createdAt: now,
    });

    return { success: true };
  },
});

// Mettre à jour le statut d'un ticket
export const updateTicketStatus = mutation({
  args: {
    sessionToken: v.string(),
    ticketId: v.id("supportTickets"),
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("waiting_user"),
      v.literal("resolved"),
      v.literal("closed")
    ),
  },
  handler: async (ctx, args) => {
    const adminResult = await checkAdmin(ctx, args.sessionToken);
    if (!adminResult.success) {
      throw new ConvexError(adminResult.error);
    }

    const admin = adminResult.user;
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) {
      throw new ConvexError("Ticket non trouvé");
    }

    const now = Date.now();
    const updates: any = {
      status: args.status,
      updatedAt: now,
    };

    if (args.status === "resolved" && !ticket.resolvedAt) {
      updates.resolvedAt = now;
    }
    if (args.status === "closed" && !ticket.closedAt) {
      updates.closedAt = now;
    }

    await ctx.db.patch(args.ticketId, updates);

    // Ajouter une note interne
    const statusLabels: Record<string, string> = {
      open: "Ouvert",
      in_progress: "En cours",
      waiting_user: "En attente utilisateur",
      resolved: "Résolu",
      closed: "Fermé",
    };

    await ctx.db.insert("ticketMessages", {
      ticketId: args.ticketId,
      senderId: admin._id.toString(),
      senderType: "admin",
      senderName: "Système",
      content: `Statut changé en "${statusLabels[args.status]}"`,
      isInternal: true,
      createdAt: now,
    });

    return { success: true };
  },
});

// Mettre à jour la priorité d'un ticket
export const updateTicketPriority = mutation({
  args: {
    sessionToken: v.string(),
    ticketId: v.id("supportTickets"),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
  },
  handler: async (ctx, args) => {
    const adminResult = await checkAdmin(ctx, args.sessionToken);
    if (!adminResult.success) {
      throw new ConvexError(adminResult.error);
    }

    const admin = adminResult.user;
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) {
      throw new ConvexError("Ticket non trouvé");
    }

    const now = Date.now();

    await ctx.db.patch(args.ticketId, {
      priority: args.priority,
      updatedAt: now,
    });

    const priorityLabels: Record<string, string> = {
      low: "Basse",
      medium: "Moyenne",
      high: "Haute",
    };

    await ctx.db.insert("ticketMessages", {
      ticketId: args.ticketId,
      senderId: admin._id.toString(),
      senderType: "admin",
      senderName: "Système",
      content: `Priorité changée en "${priorityLabels[args.priority]}"`,
      isInternal: true,
      createdAt: now,
    });

    return { success: true };
  },
});

// Ajouter un message admin (réponse ou note interne)
export const addAdminMessage = mutation({
  args: {
    sessionToken: v.string(),
    ticketId: v.id("supportTickets"),
    content: v.string(),
    isInternal: v.optional(v.boolean()),
    attachments: v.optional(v.array(v.object({
      name: v.string(),
      url: v.string(),
      type: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    const adminResult = await checkAdmin(ctx, args.sessionToken);
    if (!adminResult.success) {
      throw new ConvexError(adminResult.error);
    }

    const admin = adminResult.user;
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) {
      throw new ConvexError("Ticket non trouvé");
    }

    if (!args.content.trim()) {
      throw new ConvexError("Le message ne peut pas être vide");
    }

    const now = Date.now();
    const isInternal = args.isInternal || false;

    await ctx.db.insert("ticketMessages", {
      ticketId: args.ticketId,
      senderId: admin._id.toString(),
      senderType: "admin",
      senderName: `${admin.firstName} ${admin.lastName}`,
      content: args.content.trim(),
      attachments: args.attachments,
      isInternal,
      createdAt: now,
    });

    // Si c'est une réponse (pas interne), mettre à jour le statut si nécessaire
    if (!isInternal) {
      const newStatus = ticket.status === "open" ? "in_progress" : "waiting_user";
      await ctx.db.patch(args.ticketId, {
        status: newStatus,
        updatedAt: now,
        // Assigner automatiquement si pas déjà assigné
        ...(ticket.assignedAdminId ? {} : { assignedAdminId: admin._id }),
      });
    } else {
      await ctx.db.patch(args.ticketId, {
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

// Résoudre un ticket
export const resolveTicket = mutation({
  args: {
    sessionToken: v.string(),
    ticketId: v.id("supportTickets"),
    resolutionMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const adminResult = await checkAdmin(ctx, args.sessionToken);
    if (!adminResult.success) {
      throw new ConvexError(adminResult.error);
    }

    const admin = adminResult.user;
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) {
      throw new ConvexError("Ticket non trouvé");
    }

    const now = Date.now();

    await ctx.db.patch(args.ticketId, {
      status: "resolved",
      resolvedAt: now,
      updatedAt: now,
    });

    // Message de résolution si fourni
    if (args.resolutionMessage?.trim()) {
      await ctx.db.insert("ticketMessages", {
        ticketId: args.ticketId,
        senderId: admin._id.toString(),
        senderType: "admin",
        senderName: `${admin.firstName} ${admin.lastName}`,
        content: args.resolutionMessage.trim(),
        isInternal: false,
        createdAt: now,
      });
    }

    // Note interne de résolution
    await ctx.db.insert("ticketMessages", {
      ticketId: args.ticketId,
      senderId: admin._id.toString(),
      senderType: "admin",
      senderName: "Système",
      content: `Ticket résolu par ${admin.firstName} ${admin.lastName}`,
      isInternal: true,
      createdAt: now,
    });

    return { success: true };
  },
});

// Récupérer la liste des admins (pour l'assignation)
export const getAdminsList = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const adminResult = await checkAdmin(ctx, args.sessionToken);
    if (!adminResult.success) {
      return { success: false, error: adminResult.error, admins: [] };
    }

    const admins = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return {
      success: true,
      admins: admins.map((a) => ({
        _id: a._id,
        firstName: a.firstName,
        lastName: a.lastName,
        email: a.email,
      })),
    };
  },
});
