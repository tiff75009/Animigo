// @ts-nocheck
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// Valider une session utilisateur et retourner l'utilisateur
async function validateSession(ctx: any, token: string) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();

  if (!session || session.expiresAt < Date.now()) {
    throw new ConvexError("Session invalide ou expirée");
  }

  const user = await ctx.db.get(session.userId);
  if (!user || !user.isActive) {
    throw new ConvexError("Utilisateur non trouvé ou inactif");
  }

  return user;
}

// Générer un numéro de ticket unique
async function generateTicketNumber(ctx: any): Promise<string> {
  const year = new Date().getFullYear();

  // Compter les tickets de l'année en cours
  const startOfYear = new Date(year, 0, 1).getTime();
  const tickets = await ctx.db
    .query("supportTickets")
    .filter((q: any) => q.gte(q.field("createdAt"), startOfYear))
    .collect();

  const count = tickets.length + 1;
  const paddedCount = count.toString().padStart(6, "0");

  return `TKT-${year}-${paddedCount}`;
}

// Déterminer le type d'utilisateur (client ou annonceur)
function getUserType(accountType: string): "client" | "annonceur" {
  return accountType === "utilisateur" ? "client" : "annonceur";
}

// Créer un nouveau ticket
export const createTicket = mutation({
  args: {
    sessionToken: v.string(),
    subject: v.string(),
    category: v.string(),
    message: v.string(),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    relatedMissionId: v.optional(v.id("missions")),
  },
  handler: async (ctx, args) => {
    const user = await validateSession(ctx, args.sessionToken);

    // Validation des champs
    if (!args.subject.trim() || args.subject.length < 5) {
      throw new ConvexError("Le sujet doit contenir au moins 5 caractères");
    }
    if (!args.message.trim() || args.message.length < 10) {
      throw new ConvexError("Le message doit contenir au moins 10 caractères");
    }

    const ticketNumber = await generateTicketNumber(ctx);
    const now = Date.now();
    const userType = getUserType(user.accountType);

    // Créer le ticket
    const ticketId = await ctx.db.insert("supportTickets", {
      ticketNumber,
      userId: user._id,
      userType,
      subject: args.subject.trim(),
      category: args.category,
      priority: args.priority || "medium",
      status: "open",
      relatedMissionId: args.relatedMissionId,
      createdAt: now,
      updatedAt: now,
    });

    // Créer le premier message
    await ctx.db.insert("ticketMessages", {
      ticketId,
      senderId: user._id.toString(),
      senderType: "user",
      senderName: `${user.firstName} ${user.lastName}`,
      content: args.message.trim(),
      isInternal: false,
      createdAt: now,
    });

    return { ticketId, ticketNumber };
  },
});

// Récupérer les tickets de l'utilisateur connecté
export const getMyTickets = query({
  args: {
    sessionToken: v.string(),
    status: v.optional(v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("waiting_user"),
      v.literal("resolved"),
      v.literal("closed")
    )),
  },
  handler: async (ctx, args) => {
    const user = await validateSession(ctx, args.sessionToken);

    let tickets = await ctx.db
      .query("supportTickets")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Filtrer par statut si spécifié
    if (args.status) {
      tickets = tickets.filter((t) => t.status === args.status);
    }

    // Trier par date de mise à jour décroissante
    tickets.sort((a, b) => b.updatedAt - a.updatedAt);

    // Récupérer le dernier message de chaque ticket
    const ticketsWithLastMessage = await Promise.all(
      tickets.map(async (ticket) => {
        const lastMessage = await ctx.db
          .query("ticketMessages")
          .withIndex("by_ticket", (q) => q.eq("ticketId", ticket._id))
          .filter((q) => q.eq(q.field("isInternal"), false))
          .order("desc")
          .first();

        // Compter les messages non lus (réponses admin)
        const unreadMessages = await ctx.db
          .query("ticketMessages")
          .withIndex("by_ticket", (q) => q.eq("ticketId", ticket._id))
          .filter((q) =>
            q.and(
              q.eq(q.field("senderType"), "admin"),
              q.eq(q.field("isInternal"), false)
            )
          )
          .collect();

        return {
          ...ticket,
          lastMessagePreview: lastMessage?.content.slice(0, 100) || "",
          lastMessageAt: lastMessage?.createdAt,
          lastMessageSender: lastMessage?.senderType,
          unreadCount: 0, // TODO: implémenter le tracking de lecture
        };
      })
    );

    return ticketsWithLastMessage;
  },
});

// Récupérer les détails d'un ticket avec ses messages
export const getTicketDetails = query({
  args: {
    sessionToken: v.string(),
    ticketId: v.id("supportTickets"),
  },
  handler: async (ctx, args) => {
    const user = await validateSession(ctx, args.sessionToken);

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) {
      throw new ConvexError("Ticket non trouvé");
    }

    // Vérifier que l'utilisateur est le propriétaire du ticket
    if (ticket.userId !== user._id) {
      throw new ConvexError("Accès non autorisé");
    }

    // Récupérer les messages (exclure les notes internes)
    const messages = await ctx.db
      .query("ticketMessages")
      .withIndex("by_ticket", (q) => q.eq("ticketId", ticket._id))
      .filter((q) => q.eq(q.field("isInternal"), false))
      .collect();

    // Trier par date croissante
    messages.sort((a, b) => a.createdAt - b.createdAt);

    // Récupérer la mission liée si elle existe
    let relatedMission = null;
    if (ticket.relatedMissionId) {
      const mission = await ctx.db.get(ticket.relatedMissionId);
      if (mission) {
        relatedMission = {
          _id: mission._id,
          serviceName: mission.serviceName,
          startDate: mission.startDate,
          status: mission.status,
        };
      }
    }

    return {
      ticket,
      messages,
      relatedMission,
    };
  },
});

// Ajouter un message à un ticket
export const addMessage = mutation({
  args: {
    sessionToken: v.string(),
    ticketId: v.id("supportTickets"),
    content: v.string(),
    attachments: v.optional(v.array(v.object({
      name: v.string(),
      url: v.string(),
      type: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    const user = await validateSession(ctx, args.sessionToken);

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) {
      throw new ConvexError("Ticket non trouvé");
    }

    // Vérifier que l'utilisateur est le propriétaire du ticket
    if (ticket.userId !== user._id) {
      throw new ConvexError("Accès non autorisé");
    }

    // Vérifier que le ticket n'est pas fermé
    if (ticket.status === "closed") {
      throw new ConvexError("Ce ticket est fermé et ne peut plus recevoir de messages");
    }

    if (!args.content.trim()) {
      throw new ConvexError("Le message ne peut pas être vide");
    }

    const now = Date.now();

    // Créer le message
    await ctx.db.insert("ticketMessages", {
      ticketId: args.ticketId,
      senderId: user._id.toString(),
      senderType: "user",
      senderName: `${user.firstName} ${user.lastName}`,
      content: args.content.trim(),
      attachments: args.attachments,
      isInternal: false,
      createdAt: now,
    });

    // Mettre à jour le ticket
    // Si le ticket était en attente de réponse utilisateur, le remettre en "in_progress"
    const newStatus = ticket.status === "waiting_user" ? "in_progress" : ticket.status;

    await ctx.db.patch(args.ticketId, {
      status: newStatus,
      updatedAt: now,
    });

    return { success: true };
  },
});

// Fermer un ticket (par l'utilisateur)
export const closeTicket = mutation({
  args: {
    sessionToken: v.string(),
    ticketId: v.id("supportTickets"),
  },
  handler: async (ctx, args) => {
    const user = await validateSession(ctx, args.sessionToken);

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) {
      throw new ConvexError("Ticket non trouvé");
    }

    // Vérifier que l'utilisateur est le propriétaire du ticket
    if (ticket.userId !== user._id) {
      throw new ConvexError("Accès non autorisé");
    }

    // Vérifier que le ticket n'est pas déjà fermé
    if (ticket.status === "closed") {
      throw new ConvexError("Ce ticket est déjà fermé");
    }

    const now = Date.now();

    await ctx.db.patch(args.ticketId, {
      status: "closed",
      closedAt: now,
      updatedAt: now,
    });

    // Ajouter un message système
    await ctx.db.insert("ticketMessages", {
      ticketId: args.ticketId,
      senderId: user._id.toString(),
      senderType: "user",
      senderName: "Système",
      content: "L'utilisateur a fermé ce ticket.",
      isInternal: false,
      createdAt: now,
    });

    return { success: true };
  },
});

// Rouvrir un ticket fermé
export const reopenTicket = mutation({
  args: {
    sessionToken: v.string(),
    ticketId: v.id("supportTickets"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await validateSession(ctx, args.sessionToken);

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) {
      throw new ConvexError("Ticket non trouvé");
    }

    // Vérifier que l'utilisateur est le propriétaire du ticket
    if (ticket.userId !== user._id) {
      throw new ConvexError("Accès non autorisé");
    }

    // Vérifier que le ticket est fermé ou résolu
    if (ticket.status !== "closed" && ticket.status !== "resolved") {
      throw new ConvexError("Ce ticket n'est pas fermé");
    }

    if (!args.message.trim()) {
      throw new ConvexError("Veuillez expliquer pourquoi vous rouvrez ce ticket");
    }

    const now = Date.now();

    await ctx.db.patch(args.ticketId, {
      status: "open",
      closedAt: undefined,
      resolvedAt: undefined,
      updatedAt: now,
    });

    // Ajouter le message de réouverture
    await ctx.db.insert("ticketMessages", {
      ticketId: args.ticketId,
      senderId: user._id.toString(),
      senderType: "user",
      senderName: `${user.firstName} ${user.lastName}`,
      content: args.message.trim(),
      isInternal: false,
      createdAt: now,
    });

    return { success: true };
  },
});

// Récupérer les missions de l'utilisateur (pour lier à un ticket)
export const getMyMissionsForTicket = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await validateSession(ctx, args.sessionToken);
    const userType = getUserType(user.accountType);

    let missions;
    if (userType === "client") {
      missions = await ctx.db
        .query("missions")
        .withIndex("by_client", (q) => q.eq("clientId", user._id))
        .collect();
    } else {
      missions = await ctx.db
        .query("missions")
        .withIndex("by_announcer", (q) => q.eq("announcerId", user._id))
        .collect();
    }

    // Trier par date décroissante et limiter à 50 missions récentes
    missions.sort((a, b) => b.createdAt - a.createdAt);

    return missions.slice(0, 50).map((m) => ({
      _id: m._id,
      reference: m.reference || `RES-${m._id.slice(-6).toUpperCase()}`,
      serviceName: m.serviceName,
      startDate: m.startDate,
      endDate: m.endDate,
      status: m.status,
      clientName: m.clientName,
      announcerName: m.announcerName,
      totalPrice: m.totalPrice,
      createdAt: m.createdAt,
    }));
  },
});

// Catégories de tickets disponibles (différentes selon le type d'utilisateur)
export const getTicketCategories = query({
  args: {
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Si pas de token, retourner les catégories clients par défaut
    if (!args.sessionToken) {
      return getClientCategories();
    }

    try {
      const user = await validateSession(ctx, args.sessionToken);
      const userType = getUserType(user.accountType);

      if (userType === "annonceur") {
        return getAnnouncerCategories();
      } else {
        return getClientCategories();
      }
    } catch {
      return getClientCategories();
    }
  },
});

// Catégories pour les annonceurs
function getAnnouncerCategories() {
  return [
    { value: "services", label: "Mes services", description: "Création, modification, publication de services" },
    { value: "revenus", label: "Revenus & Paiements", description: "Virements, commissions, factures" },
    { value: "missions", label: "Missions & Réservations", description: "Gestion des missions, clients, planning" },
    { value: "verification", label: "Vérification de profil", description: "Validation d'identité, documents" },
    { value: "plateforme", label: "Utilisation plateforme", description: "Fonctionnalités, navigation, paramètres" },
    { value: "technique", label: "Problème technique", description: "Bugs, erreurs, dysfonctionnements" },
    { value: "signalement", label: "Signalement client", description: "Comportement inapproprié, litige" },
    { value: "autre", label: "Autre demande", description: "Toute autre question" },
  ];
}

// Catégories pour les clients
function getClientCategories() {
  return [
    { value: "reservation_individuelle", label: "Réservation individuelle", description: "Séance privée avec un prestataire" },
    { value: "reservation_collective", label: "Réservation collective", description: "Cours ou activité en groupe" },
    { value: "reservation_seance_unique", label: "Séance unique", description: "Prestation ponctuelle" },
    { value: "reservation_abonnement", label: "Abonnement / Forfait", description: "Packs de séances, abonnements" },
    { value: "paiement", label: "Paiement & Remboursement", description: "Facturation, remboursements, moyens de paiement" },
    { value: "annulation", label: "Annulation / Modification", description: "Changer ou annuler une réservation" },
    { value: "prestataire", label: "Problème avec un prestataire", description: "Qualité de service, comportement" },
    { value: "compte", label: "Mon compte", description: "Profil, animaux, paramètres" },
    { value: "plateforme", label: "Utilisation plateforme", description: "Navigation, recherche, fonctionnalités" },
    { value: "technique", label: "Problème technique", description: "Bugs, erreurs, dysfonctionnements" },
    { value: "autre", label: "Autre demande", description: "Toute autre question" },
  ];
}
