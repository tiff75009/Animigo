// @ts-nocheck
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internal } from "../_generated/api";

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
    // Utiliser le formatage local pour éviter les problèmes de fuseau horaire
    const formatDateLocal = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const startDate = new Date(args.year, args.month, 1);
    const endDate = new Date(args.year, args.month + 1, 0);

    const startDateStr = formatDateLocal(startDate);
    const endDateStr = formatDateLocal(endDate);

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
 * Déclenche la création d'une session Stripe Checkout pour le paiement
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

    // Récupérer les infos du client
    const client = await ctx.db.get(mission.clientId);
    if (!client) {
      throw new ConvexError("Client non trouvé");
    }

    // Récupérer les infos de l'annonceur
    const announcer = await ctx.db.get(mission.announcerId);
    if (!announcer) {
      throw new ConvexError("Annonceur non trouvé");
    }

    // Utiliser les montants déjà calculés dans la mission
    const amount = mission.amount;
    const platformFee = mission.platformFee || Math.round(amount * 0.15); // 15% par défaut
    const announcerEarnings = mission.announcerEarnings || (amount - platformFee);

    // Récupérer les configs Stripe et Email pour les passer à l'action
    const stripeSecretKeyConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "stripe_secret_key"))
      .first();

    const appUrlConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "app_url"))
      .first();

    const emailApiKeyConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "resend_api_key"))
      .first();

    const emailFromConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "resend_from_email"))
      .first();

    const emailFromNameConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "resend_from_name"))
      .first();

    if (!stripeSecretKeyConfig?.value) {
      throw new ConvexError("Stripe non configuré - clé secrète manquante");
    }

    const now = Date.now();

    // Créer un payment record préliminaire (sera mis à jour par le webhook)
    // NOTE: Sur Convex self-hosted, les actions ne peuvent pas appeler runMutation/scheduler
    // donc on crée le record ici avant de scheduler l'action Stripe
    const paymentId = await ctx.db.insert("stripePayments", {
      missionId: args.missionId,
      checkoutSessionId: "pending", // Sera mis à jour par webhook
      checkoutUrl: "pending", // Sera mis à jour par webhook
      amount,
      platformFee,
      announcerEarnings,
      status: "pending",
      expiresAt: now + 3600 * 1000, // +1h
      createdAt: now,
      updatedAt: now,
    });

    // Mettre à jour le statut de la mission
    await ctx.db.patch(args.missionId, {
      status: "pending_confirmation",
      stripePaymentId: paymentId,
      updatedAt: now,
    });

    // Planifier la création de la session Stripe (action asynchrone)
    await ctx.scheduler.runAfter(0, internal.api.stripe.createCheckoutSession, {
      missionId: args.missionId,
      amount,
      platformFee,
      announcerEarnings,
      clientEmail: client.email,
      clientName: `${client.firstName} ${client.lastName}`,
      serviceName: mission.serviceName,
      announcerName: `${announcer.firstName} ${announcer.lastName}`,
      startDate: mission.startDate,
      endDate: mission.endDate,
      animalName: mission.animal?.name,
      // Configs passées depuis la mutation (contourne le bug ctx.runQuery sur self-hosted)
      stripeSecretKey: stripeSecretKeyConfig.value,
      appUrl: appUrlConfig?.value || "http://localhost:3000",
      // Config email pour l'envoi du lien de paiement
      emailConfig: emailApiKeyConfig?.value
        ? {
            apiKey: emailApiKeyConfig.value,
            fromEmail: emailFromConfig?.value,
            fromName: emailFromNameConfig?.value,
          }
        : undefined,
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
 * Confirmation de fin de prestation par le client
 * Déclenche la capture du paiement
 */
export const confirmMissionCompletion = mutation({
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

    // Seul le client peut confirmer la fin de prestation
    if (mission.clientId !== session.userId) {
      throw new ConvexError("Seul le client peut confirmer la fin de prestation");
    }

    // La mission doit être complétée
    if (mission.status !== "completed") {
      throw new ConvexError("La mission n'est pas terminée");
    }

    // Le paiement doit être en attente
    if (mission.paymentStatus !== "pending") {
      throw new ConvexError("Le paiement n'est pas en attente de confirmation");
    }

    // Récupérer le paiement associé
    if (!mission.stripePaymentId) {
      throw new ConvexError("Aucun paiement associé à cette mission");
    }

    const payment = await ctx.db.get(mission.stripePaymentId);
    if (!payment || !payment.paymentIntentId) {
      throw new ConvexError("Informations de paiement invalides");
    }

    if (payment.status !== "authorized") {
      throw new ConvexError("Le paiement n'est pas autorisé");
    }

    // Récupérer la clé Stripe pour la passer à l'action
    const stripeSecretKeyConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "stripe_secret_key"))
      .first();

    if (!stripeSecretKeyConfig?.value) {
      throw new ConvexError("Stripe non configuré - clé secrète manquante");
    }

    const now = Date.now();

    // Marquer la confirmation par le client
    await ctx.db.patch(args.missionId, {
      completedByClientAt: now,
      updatedAt: now,
    });

    // Planifier la capture du paiement
    await ctx.scheduler.runAfter(0, internal.api.stripe.capturePayment, {
      paymentIntentId: payment.paymentIntentId,
      missionId: args.missionId,
      stripeSecretKey: stripeSecretKeyConfig.value,
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

    // Formater sans toISOString() pour éviter les problèmes de fuseau horaire
    const formatDateLocal = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const startDate = formatDateLocal(today);
    const endDateObj = new Date(today);
    endDateObj.setDate(today.getDate() + 2);
    const endDate = formatDateLocal(endDateObj);

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
