import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin } from "./utils";

// Query: Liste des avoirs clients
export const listClientCredits = query({
  args: {
    token: v.string(),
    clientId: v.optional(v.id("users")),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    let credits = await ctx.db
      .query("clientCredits")
      .order("desc")
      .collect();

    // Filtrer par client
    if (args.clientId) {
      credits = credits.filter((c) => c.clientId === args.clientId);
    }

    // Filtrer par statut
    if (args.status) {
      credits = credits.filter((c) => c.status === args.status);
    }

    const total = credits.length;
    const limit = args.limit || 20;
    const offset = args.offset || 0;

    const paginatedCredits = credits.slice(offset, offset + limit);

    // Enrichir avec les infos client et mission
    const enrichedCredits = await Promise.all(
      paginatedCredits.map(async (credit) => {
        const client = await ctx.db.get(credit.clientId);
        const mission = credit.missionId ? await ctx.db.get(credit.missionId) : null;
        const createdBy = await ctx.db.get(credit.createdBy);

        return {
          _id: credit._id,
          amount: credit.amount,
          originalAmount: credit.originalAmount,
          reason: credit.reason,
          status: credit.status,
          expiresAt: credit.expiresAt,
          usedAt: credit.usedAt,
          createdAt: credit.createdAt,
          client: client ? {
            id: client._id,
            name: `${client.firstName} ${client.lastName}`,
            email: client.email,
          } : null,
          mission: mission ? {
            id: mission._id,
            serviceName: mission.serviceName,
            startDate: mission.startDate,
          } : null,
          createdByName: createdBy ? `${createdBy.firstName} ${createdBy.lastName}` : "Système",
        };
      })
    );

    return {
      credits: enrichedCredits,
      total,
    };
  },
});

// Query: Avoirs actifs d'un client
export const getClientActiveCredits = query({
  args: {
    token: v.string(),
    clientId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const credits = await ctx.db
      .query("clientCredits")
      .withIndex("by_client_active", (q) =>
        q.eq("clientId", args.clientId).eq("status", "active")
      )
      .collect();

    // Filtrer les avoirs expirés
    const now = Date.now();
    const activeCredits = credits.filter(
      (c) => !c.expiresAt || c.expiresAt > now
    );

    const totalAvailable = activeCredits.reduce((sum, c) => sum + c.amount, 0);

    return {
      credits: activeCredits.map((c) => ({
        id: c._id,
        amount: c.amount,
        originalAmount: c.originalAmount,
        reason: c.reason,
        expiresAt: c.expiresAt,
        createdAt: c.createdAt,
      })),
      totalAvailable,
    };
  },
});

// Mutation: Créer un avoir client
export const createClientCredit = mutation({
  args: {
    token: v.string(),
    clientId: v.id("users"),
    amount: v.number(),
    reason: v.string(),
    missionId: v.optional(v.id("missions")),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    // Vérifier que le client existe
    const client = await ctx.db.get(args.clientId);
    if (!client) throw new ConvexError("Client non trouvé");

    // Vérifier la mission si fournie
    if (args.missionId) {
      const mission = await ctx.db.get(args.missionId);
      if (!mission) throw new ConvexError("Mission non trouvée");
      if (mission.clientId !== args.clientId) {
        throw new ConvexError("Cette mission n'appartient pas à ce client");
      }
    }

    // Créer l'avoir
    const creditId = await ctx.db.insert("clientCredits", {
      clientId: args.clientId,
      amount: args.amount,
      originalAmount: args.amount,
      reason: args.reason,
      missionId: args.missionId,
      createdBy: user._id,
      status: "active",
      expiresAt: args.expiresAt,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { creditId };
  },
});

// Mutation: Annuler un avoir
export const cancelCredit = mutation({
  args: {
    token: v.string(),
    creditId: v.id("clientCredits"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const credit = await ctx.db.get(args.creditId);
    if (!credit) throw new ConvexError("Avoir non trouvé");

    if (credit.status !== "active") {
      throw new ConvexError("Seuls les avoirs actifs peuvent être annulés");
    }

    await ctx.db.patch(args.creditId, {
      status: "cancelled",
      reason: args.reason ? `${credit.reason} | Annulé: ${args.reason}` : credit.reason,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Mutation: Utiliser un avoir (lors d'une réservation)
export const useCredit = mutation({
  args: {
    token: v.string(),
    creditId: v.id("clientCredits"),
    amountToUse: v.number(),
    missionId: v.id("missions"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const credit = await ctx.db.get(args.creditId);
    if (!credit) throw new ConvexError("Avoir non trouvé");

    if (credit.status !== "active") {
      throw new ConvexError("Cet avoir n'est plus actif");
    }

    if (credit.expiresAt && credit.expiresAt < Date.now()) {
      throw new ConvexError("Cet avoir a expiré");
    }

    if (args.amountToUse > credit.amount) {
      throw new ConvexError("Montant demandé supérieur au solde de l'avoir");
    }

    const newAmount = credit.amount - args.amountToUse;

    if (newAmount === 0) {
      // Avoir entièrement utilisé
      await ctx.db.patch(args.creditId, {
        amount: 0,
        status: "used",
        usedAt: Date.now(),
        usedOnMissionId: args.missionId,
        updatedAt: Date.now(),
      });
    } else {
      // Avoir partiellement utilisé
      await ctx.db.patch(args.creditId, {
        amount: newAmount,
        updatedAt: Date.now(),
      });
    }

    return { success: true, remainingAmount: newAmount };
  },
});

// Query: Stats des avoirs
export const getCreditStats = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const credits = await ctx.db
      .query("clientCredits")
      .collect();

    const now = Date.now();

    let totalActive = 0;
    let totalUsed = 0;
    let totalExpired = 0;
    let totalCancelled = 0;
    let activeCount = 0;
    let usedCount = 0;

    for (const credit of credits) {
      switch (credit.status) {
        case "active":
          if (credit.expiresAt && credit.expiresAt < now) {
            totalExpired += credit.amount;
          } else {
            totalActive += credit.amount;
            activeCount++;
          }
          break;
        case "used":
          totalUsed += credit.originalAmount;
          usedCount++;
          break;
        case "expired":
          totalExpired += credit.originalAmount;
          break;
        case "cancelled":
          totalCancelled += credit.originalAmount;
          break;
      }
    }

    return {
      totalActive,
      totalUsed,
      totalExpired,
      totalCancelled,
      activeCount,
      usedCount,
      totalCount: credits.length,
    };
  },
});
