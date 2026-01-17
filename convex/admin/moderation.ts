import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./utils";
import { ConvexError } from "convex/values";

// Récupérer les services en attente de modération
export const getPendingServices = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const pendingServices = await ctx.db
      .query("services")
      .withIndex("by_moderation_status", (q) => q.eq("moderationStatus", "pending"))
      .collect();

    // Récupérer les infos des utilisateurs
    const servicesWithUsers = await Promise.all(
      pendingServices.map(async (service) => {
        const user = await ctx.db.get(service.userId);
        return {
          id: service._id,
          category: service.category,
          name: service.name,
          description: service.description,
          price: service.price,
          priceUnit: service.priceUnit,
          animalTypes: service.animalTypes,
          moderationReason: service.moderationReason,
          createdAt: service.createdAt,
          user: user
            ? {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                accountType: user.accountType,
              }
            : null,
        };
      })
    );

    return servicesWithUsers;
  },
});

// Récupérer tous les services avec filtre de modération
export const getAllServicesForModeration = query({
  args: {
    token: v.string(),
    status: v.optional(v.union(
      v.literal("all"),
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    )),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    let services;

    if (args.status && args.status !== "all") {
      services = await ctx.db
        .query("services")
        .withIndex("by_moderation_status", (q) =>
          q.eq("moderationStatus", args.status as "pending" | "approved" | "rejected")
        )
        .collect();
    } else {
      services = await ctx.db.query("services").collect();
    }

    // Trier par date de création (plus récent en premier)
    services.sort((a, b) => b.createdAt - a.createdAt);

    // Pagination
    const offset = args.offset || 0;
    const limit = args.limit || 50;
    const paginatedServices = services.slice(offset, offset + limit);

    // Récupérer les infos des utilisateurs
    const servicesWithUsers = await Promise.all(
      paginatedServices.map(async (service) => {
        const user = await ctx.db.get(service.userId);
        return {
          id: service._id,
          category: service.category,
          name: service.name,
          description: service.description,
          price: service.price,
          priceUnit: service.priceUnit,
          animalTypes: service.animalTypes,
          isActive: service.isActive,
          moderationStatus: service.moderationStatus || "approved",
          moderationReason: service.moderationReason,
          moderationNote: service.moderationNote,
          moderatedAt: service.moderatedAt,
          createdAt: service.createdAt,
          user: user
            ? {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                accountType: user.accountType,
              }
            : null,
        };
      })
    );

    return {
      services: servicesWithUsers,
      total: services.length,
      hasMore: offset + limit < services.length,
    };
  },
});

// Compter les services par statut de modération
export const getModerationStats = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const allServices = await ctx.db.query("services").collect();

    const stats = {
      total: allServices.length,
      pending: 0,
      approved: 0,
      rejected: 0,
    };

    for (const service of allServices) {
      const status = service.moderationStatus || "approved";
      if (status === "pending") stats.pending++;
      else if (status === "approved") stats.approved++;
      else if (status === "rejected") stats.rejected++;
    }

    return stats;
  },
});

// Approuver un service
export const approveService = mutation({
  args: {
    token: v.string(),
    serviceId: v.id("services"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    const service = await ctx.db.get(args.serviceId);
    if (!service) {
      throw new ConvexError("Service non trouvé");
    }

    await ctx.db.patch(args.serviceId, {
      moderationStatus: "approved",
      moderationNote: args.note,
      moderatedAt: Date.now(),
      moderatedBy: user._id,
      isActive: true,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Rejeter un service
export const rejectService = mutation({
  args: {
    token: v.string(),
    serviceId: v.id("services"),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    const service = await ctx.db.get(args.serviceId);
    if (!service) {
      throw new ConvexError("Service non trouvé");
    }

    if (!args.note.trim()) {
      throw new ConvexError("Une note explicative est requise pour le rejet");
    }

    await ctx.db.patch(args.serviceId, {
      moderationStatus: "rejected",
      moderationNote: args.note,
      moderatedAt: Date.now(),
      moderatedBy: user._id,
      isActive: false,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Remettre un service en modération
export const resetToModeration = mutation({
  args: {
    token: v.string(),
    serviceId: v.id("services"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const service = await ctx.db.get(args.serviceId);
    if (!service) {
      throw new ConvexError("Service non trouvé");
    }

    await ctx.db.patch(args.serviceId, {
      moderationStatus: "pending",
      moderationNote: undefined,
      moderatedAt: undefined,
      moderatedBy: undefined,
      isActive: false,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
