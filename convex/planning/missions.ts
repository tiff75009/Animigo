import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// Types pour les missions
export type MissionStatus =
  | "pending_acceptance"
  | "pending_confirmation"
  | "upcoming"
  | "in_progress"
  | "completed"
  | "refused"
  | "cancelled";

export type PaymentStatus = "not_due" | "pending" | "paid";

/**
 * Récupère les missions d'un annonceur pour une plage de dates
 */
export const getMissionsByDateRange = query({
  args: {
    token: v.string(),
    startDate: v.string(), // "YYYY-MM-DD"
    endDate: v.string(), // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    // Récupérer toutes les missions de l'annonceur
    const missions = await ctx.db
      .query("missions")
      .withIndex("by_announcer", (q) => q.eq("announcerId", session.userId))
      .collect();

    // Filtrer par plage de dates
    const filteredMissions = missions.filter((m) => {
      return m.startDate <= args.endDate && m.endDate >= args.startDate;
    });

    return filteredMissions.map((m) => ({
      id: m._id,
      clientId: m.clientId,
      clientName: m.clientName,
      clientPhone: m.clientPhone,
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
      location: m.location,
      clientNotes: m.clientNotes,
      announcerNotes: m.announcerNotes,
      cancellationReason: m.cancellationReason,
    }));
  },
});

/**
 * Récupère les statistiques des missions pour le mois
 */
export const getMissionStats = query({
  args: {
    token: v.string(),
    month: v.number(), // 0-11
    year: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return {
        total: 0,
        pending: 0,
        upcoming: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        revenue: 0,
      };
    }

    // Calculer les dates de début et fin du mois
    const startDate = new Date(args.year, args.month, 1);
    const endDate = new Date(args.year, args.month + 1, 0);

    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    // Récupérer les missions du mois
    const missions = await ctx.db
      .query("missions")
      .withIndex("by_announcer", (q) => q.eq("announcerId", session.userId))
      .collect();

    const monthMissions = missions.filter((m) => {
      return m.startDate <= endDateStr && m.endDate >= startDateStr;
    });

    // Calculer les stats
    const stats = {
      total: monthMissions.length,
      pending: monthMissions.filter(
        (m) =>
          m.status === "pending_acceptance" ||
          m.status === "pending_confirmation"
      ).length,
      upcoming: monthMissions.filter((m) => m.status === "upcoming").length,
      inProgress: monthMissions.filter((m) => m.status === "in_progress")
        .length,
      completed: monthMissions.filter((m) => m.status === "completed").length,
      cancelled: monthMissions.filter(
        (m) => m.status === "cancelled" || m.status === "refused"
      ).length,
      revenue: monthMissions
        .filter((m) => m.status === "completed" && m.paymentStatus === "paid")
        .reduce((sum, m) => sum + m.amount, 0),
    };

    return stats;
  },
});

/**
 * Récupère les missions par statut
 */
export const getMissionsByStatus = query({
  args: {
    token: v.string(),
    status: v.union(
      v.literal("pending_acceptance"),
      v.literal("pending_confirmation"),
      v.literal("upcoming"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("refused"),
      v.literal("cancelled")
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return [];
    }

    let missionsQuery = ctx.db
      .query("missions")
      .withIndex("by_announcer_status", (q) =>
        q.eq("announcerId", session.userId).eq("status", args.status)
      );

    const missions = args.limit
      ? await missionsQuery.take(args.limit)
      : await missionsQuery.collect();

    return missions.map((m) => ({
      id: m._id,
      clientId: m.clientId,
      clientName: m.clientName,
      clientPhone: m.clientPhone,
      animal: m.animal,
      animalId: m.animalId,
      serviceName: m.serviceName,
      serviceCategory: m.serviceCategory,
      variantId: m.variantId,
      variantName: m.variantName,
      optionIds: m.optionIds,
      optionNames: m.optionNames,
      basePrice: m.basePrice,
      optionsPrice: m.optionsPrice,
      platformFee: m.platformFee,
      announcerEarnings: m.announcerEarnings,
      startDate: m.startDate,
      endDate: m.endDate,
      startTime: m.startTime,
      endTime: m.endTime,
      status: m.status,
      amount: m.amount,
      paymentStatus: m.paymentStatus,
      location: m.location,
      city: m.city,
      clientCoordinates: m.clientCoordinates,
      clientNotes: m.clientNotes,
      announcerNotes: m.announcerNotes,
    }));
  },
});

/**
 * Accepter une mission
 */
export const acceptMission = mutation({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const mission = await ctx.db.get(args.missionId);
    if (!mission) {
      throw new ConvexError("Mission non trouvée");
    }

    if (mission.announcerId !== session.userId) {
      throw new ConvexError("Vous ne pouvez pas modifier cette mission");
    }

    if (mission.status !== "pending_acceptance") {
      throw new ConvexError("Cette mission ne peut pas être acceptée");
    }

    await ctx.db.patch(args.missionId, {
      status: "pending_confirmation",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Refuser une mission
 */
export const refuseMission = mutation({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const mission = await ctx.db.get(args.missionId);
    if (!mission) {
      throw new ConvexError("Mission non trouvée");
    }

    if (mission.announcerId !== session.userId) {
      throw new ConvexError("Vous ne pouvez pas modifier cette mission");
    }

    if (
      mission.status !== "pending_acceptance" &&
      mission.status !== "pending_confirmation"
    ) {
      throw new ConvexError("Cette mission ne peut pas être refusée");
    }

    await ctx.db.patch(args.missionId, {
      status: "refused",
      cancellationReason: args.reason,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Annuler une mission
 */
export const cancelMission = mutation({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const mission = await ctx.db.get(args.missionId);
    if (!mission) {
      throw new ConvexError("Mission non trouvée");
    }

    if (mission.announcerId !== session.userId) {
      throw new ConvexError("Vous ne pouvez pas modifier cette mission");
    }

    // On ne peut annuler que les missions confirmées ou à venir
    if (mission.status !== "upcoming" && mission.status !== "in_progress") {
      throw new ConvexError("Cette mission ne peut pas être annulée");
    }

    await ctx.db.patch(args.missionId, {
      status: "cancelled",
      cancellationReason: args.reason,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Marquer une mission comme terminée
 */
export const completeMission = mutation({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const mission = await ctx.db.get(args.missionId);
    if (!mission) {
      throw new ConvexError("Mission non trouvée");
    }

    if (mission.announcerId !== session.userId) {
      throw new ConvexError("Vous ne pouvez pas modifier cette mission");
    }

    if (mission.status !== "in_progress") {
      throw new ConvexError("Seules les missions en cours peuvent être terminées");
    }

    await ctx.db.patch(args.missionId, {
      status: "completed",
      announcerNotes: args.notes || mission.announcerNotes,
      paymentStatus: "pending",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Ajouter une note à une mission
 */
export const updateMissionNotes = mutation({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const mission = await ctx.db.get(args.missionId);
    if (!mission) {
      throw new ConvexError("Mission non trouvée");
    }

    if (mission.announcerId !== session.userId) {
      throw new ConvexError("Vous ne pouvez pas modifier cette mission");
    }

    await ctx.db.patch(args.missionId, {
      announcerNotes: args.notes,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Créer une mission de test (pour développement)
 */
export const createTestMission = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const now = Date.now();
    const today = new Date();
    const startDate = today.toISOString().split("T")[0];
    const endDate = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const missionId = await ctx.db.insert("missions", {
      announcerId: session.userId,
      clientId: session.userId, // Pour le test, on utilise le même user
      clientName: "Client Test",
      clientPhone: "0612345678",
      animal: {
        name: "Max",
        type: "chien",
        emoji: "🐕",
      },
      serviceName: "Garde à domicile",
      serviceCategory: "garde",
      startDate,
      endDate,
      startTime: "09:00",
      endTime: "18:00",
      status: "pending_acceptance",
      amount: 5000, // 50€
      paymentStatus: "not_due",
      location: "Paris 15ème",
      clientNotes: "Max est très gentil, il adore les balades.",
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, missionId };
  },
});

/**
 * Récupérer les coordonnées du profil annonceur pour calcul distance
 */
export const getAnnouncerCoordinates = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    if (!profile || !profile.coordinates) {
      return null;
    }

    return {
      coordinates: profile.coordinates,
      city: profile.city,
    };
  },
});

/**
 * Récupérer les détails de l'animal d'une mission
 */
export const getMissionAnimalDetails = query({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    const mission = await ctx.db.get(args.missionId);
    if (!mission || mission.announcerId !== session.userId) {
      return null;
    }

    // Si pas d'animalId, retourner les infos inline
    if (!mission.animalId) {
      return {
        name: mission.animal.name,
        type: mission.animal.type,
        emoji: mission.animal.emoji,
        isInline: true,
      };
    }

    // Sinon récupérer la fiche complète
    const animal = await ctx.db.get(mission.animalId);
    if (!animal) {
      return {
        name: mission.animal.name,
        type: mission.animal.type,
        emoji: mission.animal.emoji,
        isInline: true,
      };
    }

    return {
      id: animal._id,
      name: animal.name,
      type: animal.type,
      emoji: mission.animal.emoji,
      gender: animal.gender,
      breed: animal.breed,
      birthDate: animal.birthDate,
      description: animal.description,
      compatibilityTraits: animal.compatibilityTraits,
      behaviorTraits: animal.behaviorTraits,
      needsTraits: animal.needsTraits,
      customTraits: animal.customTraits,
      specialNeeds: animal.specialNeeds,
      medicalConditions: animal.medicalConditions,
      isInline: false,
    };
  },
});
