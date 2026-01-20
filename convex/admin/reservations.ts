// @ts-nocheck
import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { checkAdmin } from "./utils";

/**
 * Lister toutes les réservations avec pagination et filtres
 */
export const listReservations = query({
  args: {
    token: v.string(),
    search: v.optional(v.string()),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const auth = await checkAdmin(ctx, args.token);
    if (!auth.success) {
      return { reservations: [], total: 0 };
    }

    const limit = args.limit || 20;
    const offset = args.offset || 0;

    // Récupérer toutes les missions
    let missions = await ctx.db.query("missions").order("desc").collect();

    // Filtrer par statut
    if (args.status && args.status !== "all") {
      missions = missions.filter((m) => m.status === args.status);
    }

    // Filtrer par recherche (nom client, nom service)
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      missions = missions.filter(
        (m) =>
          m.clientName?.toLowerCase().includes(searchLower) ||
          m.serviceName?.toLowerCase().includes(searchLower) ||
          m.animal?.name?.toLowerCase().includes(searchLower)
      );
    }

    const total = missions.length;

    // Pagination
    const paginatedMissions = missions.slice(offset, offset + limit);

    // Enrichir avec les infos utilisateurs
    const reservations = await Promise.all(
      paginatedMissions.map(async (m) => {
        const client = await ctx.db.get(m.clientId);
        const announcer = await ctx.db.get(m.announcerId);

        // Récupérer le paiement si présent
        let payment = null;
        if (m.stripePaymentId) {
          payment = await ctx.db.get(m.stripePaymentId);
        }

        return {
          _id: m._id,
          clientId: m.clientId,
          clientName: m.clientName || (client ? `${client.firstName} ${client.lastName}` : "Client inconnu"),
          clientEmail: client?.email,
          announcerId: m.announcerId,
          announcerName: announcer ? `${announcer.firstName} ${announcer.lastName}` : "Annonceur inconnu",
          announcerEmail: announcer?.email,
          animal: m.animal,
          serviceName: m.serviceName,
          serviceCategory: m.serviceCategory,
          startDate: m.startDate,
          endDate: m.endDate,
          startTime: m.startTime,
          endTime: m.endTime,
          status: m.status,
          amount: m.amount,
          paymentStatus: m.paymentStatus,
          stripePaymentStatus: payment?.status,
          location: m.location,
          city: m.city,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        };
      })
    );

    return { reservations, total };
  },
});

/**
 * Récupérer les statistiques des réservations
 */
export const getReservationStats = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = await checkAdmin(ctx, args.token);
    if (!auth.success) {
      return {
        total: 0,
        pending: 0,
        upcoming: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
      };
    }

    const missions = await ctx.db.query("missions").collect();

    return {
      total: missions.length,
      pending: missions.filter(
        (m) => m.status === "pending_acceptance" || m.status === "pending_confirmation"
      ).length,
      upcoming: missions.filter((m) => m.status === "upcoming").length,
      inProgress: missions.filter((m) => m.status === "in_progress").length,
      completed: missions.filter((m) => m.status === "completed").length,
      cancelled: missions.filter(
        (m) => m.status === "cancelled" || m.status === "refused"
      ).length,
    };
  },
});

/**
 * Supprimer une réservation (pour les tests/dev)
 */
export const deleteReservation = mutation({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
  },
  handler: async (ctx, args) => {
    const auth = await checkAdmin(ctx, args.token);
    if (!auth.success) {
      throw new Error(auth.error);
    }

    const mission = await ctx.db.get(args.missionId);
    if (!mission) {
      throw new Error("Réservation non trouvée");
    }

    // Supprimer le paiement associé si présent
    if (mission.stripePaymentId) {
      await ctx.db.delete(mission.stripePaymentId);
    }

    // Supprimer la mission
    await ctx.db.delete(args.missionId);

    return { success: true };
  },
});

/**
 * Supprimer plusieurs réservations
 */
export const deleteMultipleReservations = mutation({
  args: {
    token: v.string(),
    missionIds: v.array(v.id("missions")),
  },
  handler: async (ctx, args) => {
    const auth = await checkAdmin(ctx, args.token);
    if (!auth.success) {
      throw new Error(auth.error);
    }

    let deleted = 0;
    let errors = 0;

    for (const missionId of args.missionIds) {
      try {
        const mission = await ctx.db.get(missionId);
        if (mission) {
          // Supprimer le paiement associé si présent
          if (mission.stripePaymentId) {
            await ctx.db.delete(mission.stripePaymentId);
          }
          await ctx.db.delete(missionId);
          deleted++;
        }
      } catch (error) {
        errors++;
      }
    }

    return { deleted, errors };
  },
});

/**
 * Changer le statut d'une réservation (pour debug)
 */
export const updateReservationStatus = mutation({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
    status: v.union(
      v.literal("pending_acceptance"),
      v.literal("pending_confirmation"),
      v.literal("upcoming"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("refused"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    const auth = await checkAdmin(ctx, args.token);
    if (!auth.success) {
      throw new Error(auth.error);
    }

    const mission = await ctx.db.get(args.missionId);
    if (!mission) {
      throw new Error("Réservation non trouvée");
    }

    await ctx.db.patch(args.missionId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
