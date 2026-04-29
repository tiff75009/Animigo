// @ts-nocheck
import { mutation, query, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import { getEmailConfigFromDb } from "../api/emailInternal";

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
 * OPTIMISÉ : Élimine les N+1 queries
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

    // 1. Récupérer toutes les missions de l'annonceur (une seule query)
    const allMissions = await ctx.db
      .query("missions")
      .withIndex("by_announcer", (q) => q.eq("announcerId", session.userId))
      .collect();

    // 2. Filtrer par plage de dates
    const filteredMissions = allMissions.filter((m) => {
      return m.startDate <= args.endDate && m.endDate >= args.startDate;
    });

    // 3. Grouper par clientId en mémoire (évite N+1)
    const clientMissionsMap = new Map<string, typeof allMissions>();
    allMissions.forEach(m => {
      const list = clientMissionsMap.get(m.clientId as string) || [];
      list.push(m);
      clientMissionsMap.set(m.clientId as string, list);
    });

    // 4. Calculer l'historique client SANS requête supplémentaire
    const uniqueClientIds = [...new Set(filteredMissions.map(m => m.clientId as string))];
    const clientHistoryMap: Record<string, { previousMissionsCount: number; isNewClient: boolean }> = {};

    for (const clientId of uniqueClientIds) {
      const clientMissions = clientMissionsMap.get(clientId) || [];
      const completedCount = clientMissions.filter(m => m.status === "completed").length;

      clientHistoryMap[clientId] = {
        previousMissionsCount: completedCount,
        isNewClient: completedCount === 0,
      };
    }

    // 5. Batch lookup des collectiveSlots (évite N² queries)
    const allSlotIds: string[] = [];
    filteredMissions.forEach(m => {
      if (m.sessionType === "collective" && m.collectiveSlotIds?.length) {
        allSlotIds.push(...(m.collectiveSlotIds as string[]));
      }
    });

    const slotMap = new Map<string, { date: string }>();
    if (allSlotIds.length > 0) {
      const slots = await Promise.all(
        allSlotIds.map(id => ctx.db.get(id as any))
      );
      allSlotIds.forEach((id, i) => {
        if (slots[i]) {
          slotMap.set(id, { date: slots[i].date });
        }
      });
    }

    // 6. Enrichir les missions
    const enrichedMissions = filteredMissions.map(m => {
      let collectiveSlotDates: string[] | undefined;
      if (m.sessionType === "collective" && m.collectiveSlotIds?.length) {
        collectiveSlotDates = (m.collectiveSlotIds as string[])
          .map(id => slotMap.get(id)?.date)
          .filter((d): d is string => d !== undefined);
      }

      return {
        id: m._id,
        clientId: m.clientId,
        clientName: m.clientName,
        clientPhone: m.clientPhone,
        animal: m.animal,
        animals: m.animals,
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
        sessionType: m.sessionType,
        numberOfSessions: m.numberOfSessions,
        sessions: m.sessions,
        collectiveSlotIds: m.collectiveSlotIds,
        collectiveSlotDates,
        animalCount: m.animalCount,
        serviceAmount: m.serviceAmount,
        isSapApplied: m.isSapApplied,
        serviceLocation: m.serviceLocation,
        clientHistory: clientHistoryMap[m.clientId as string] || { previousMissionsCount: 0, isNewClient: true },
      };
    });

    return enrichedMissions;
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
      // Utiliser announcerEarnings pour les nouvelles missions, sinon amount pour les anciennes
      revenue: monthMissions
        .filter((m) => m.status === "completed" && m.paymentStatus === "paid")
        .reduce((sum, m) => sum + (m.announcerEarnings ?? m.amount), 0),
    };

    return stats;
  },
});

/**
 * Récupère les missions par statut
 * OPTIMISÉ : Élimine les N+1 queries en groupant les données en mémoire
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

    // 1. Récupérer TOUTES les missions de l'annonceur en une seule query
    // Cela évite les N+1 queries pour calculer les stats client
    const allAnnouncerMissions = await ctx.db
      .query("missions")
      .withIndex("by_announcer", (q) => q.eq("announcerId", session.userId))
      .collect();

    // Récupérer le statut TVA de l'annonceur
    const announcer = await ctx.db.get(session.userId);
    const announcerIsVatSubject = announcer?.isVatSubject === true;

    // 2. Filtrer par statut demandé
    let missions = allAnnouncerMissions.filter(m => m.status === args.status);
    if (args.limit) {
      missions = missions.slice(0, args.limit);
    }

    // 3. Grouper toutes les missions par clientId en mémoire (évite N+1)
    const clientMissionsMap = new Map<string, typeof allAnnouncerMissions>();
    allAnnouncerMissions.forEach(m => {
      const list = clientMissionsMap.get(m.clientId as string) || [];
      list.push(m);
      clientMissionsMap.set(m.clientId as string, list);
    });

    // 4. Calculer les stats de confiance pour chaque client SANS requête supplémentaire
    const now = Date.now();
    const fortyEightHours = 48 * 60 * 60 * 1000;

    const clientTrustStats: Record<string, {
      totalBookings: number;
      cancelled: number;
      notFinalized: number;
      completed: number;
      trustScore: number;
    }> = {};

    const clientHistoryWithAnnouncer: Record<string, {
      previousMissionsCount: number;
      isNewClient: boolean;
    }> = {};

    // Calculer les stats pour les clients des missions filtrées uniquement
    const uniqueClientIds = [...new Set(missions.map(m => m.clientId as string))];

    for (const clientId of uniqueClientIds) {
      const clientMissions = clientMissionsMap.get(clientId) || [];

      const totalBookings = clientMissions.length;
      const cancelled = clientMissions.filter(m => m.status === "cancelled").length;
      const completed = clientMissions.filter(m => m.status === "completed").length;
      const notFinalized = clientMissions.filter(m =>
        m.status === "pending_confirmation" &&
        m.updatedAt &&
        (now - m.updatedAt) > fortyEightHours
      ).length;

      // Calcul du score de confiance
      let trustScore = 100;
      if (totalBookings > 0) {
        const cancelPenalty = (cancelled / totalBookings) * 40;
        const notFinalizedPenalty = (notFinalized / totalBookings) * 30;
        trustScore = Math.max(0, Math.round(100 - cancelPenalty - notFinalizedPenalty));
      }

      clientTrustStats[clientId] = {
        totalBookings,
        cancelled,
        notFinalized,
        completed,
        trustScore
      };

      // Historique avec cet annonceur (déjà filtré car allAnnouncerMissions)
      const completedWithAnnouncer = clientMissions.filter(m => m.status === "completed").length;
      clientHistoryWithAnnouncer[clientId] = {
        previousMissionsCount: completedWithAnnouncer,
        isNewClient: completedWithAnnouncer === 0,
      };
    }

    // 5. Batch lookup des collectiveSlots (évite N² queries)
    const allSlotIds: string[] = [];
    missions.forEach(m => {
      if (m.sessionType === "collective" && m.collectiveSlotIds?.length) {
        allSlotIds.push(...(m.collectiveSlotIds as string[]));
      }
    });

    // Récupérer tous les slots en parallèle (une seule vague)
    const slotMap = new Map<string, { date: string }>();
    if (allSlotIds.length > 0) {
      const slots = await Promise.all(
        allSlotIds.map(id => ctx.db.get(id as any))
      );
      allSlotIds.forEach((id, i) => {
        if (slots[i]) {
          slotMap.set(id, { date: slots[i].date });
        }
      });
    }

    // 6. Enrichir les missions avec les données calculées
    const enrichedMissions = missions.map(m => {
      // Dates des créneaux collectifs depuis le cache
      let collectiveSlotDates: string[] | undefined;
      if (m.sessionType === "collective" && m.collectiveSlotIds?.length) {
        collectiveSlotDates = (m.collectiveSlotIds as string[])
          .map(id => slotMap.get(id)?.date)
          .filter((d): d is string => d !== undefined);
      }

      const clientStats = clientTrustStats[m.clientId as string] || {
        totalBookings: 1,
        cancelled: 0,
        notFinalized: 0,
        completed: 0,
        trustScore: 100,
      };

      const clientHistory = clientHistoryWithAnnouncer[m.clientId as string] || {
        previousMissionsCount: 0,
        isNewClient: true,
      };

      return {
        id: m._id,
        clientId: m.clientId,
        clientName: m.clientName,
        clientPhone: m.clientPhone,
        animal: m.animal,
        animalId: m.animalId,
        animals: m.animals,
        animalIds: m.animalIds,
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
        sessionType: m.sessionType,
        numberOfSessions: m.numberOfSessions,
        collectiveSlotIds: m.collectiveSlotIds,
        collectiveSlotDates,
        animalCount: m.animalCount,
        sessions: m.sessions,
        bookedAt: m.bookedAt,
        acceptanceDeadline: m.acceptanceDeadline,
        clientTrustStats: clientStats,
        serviceLocation: m.serviceLocation,
        clientHistory,
        vatRate: m.vatRate,
        isSapApplied: m.isSapApplied,
        isVatSubject: announcerIsVatSubject,
      };
    });

    return enrichedMissions;
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

    // Vérifier le blocage de régularité pour les annonceurs particuliers
    const announcerForCheck = await ctx.db.get(session.userId);
    if (announcerForCheck?.accountType === "annonceur_particulier") {
      const regularityScore = await ctx.db
        .query("regularityScores")
        .withIndex("by_user", (q) => q.eq("userId", session.userId))
        .first();
      if (regularityScore?.isBlocked) {
        throw new ConvexError(
          "Votre activité nécessite un statut professionnel. Veuillez devenir auto-entrepreneur pour continuer à accepter des missions."
        );
      }
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

    // Récupérer les configs Convex pour l'API HTTP (workaround self-hosted)
    const convexUrlConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "convex_url"))
      .first();

    const convexAdminKeyConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "convex_admin_key"))
      .first();

    if (!stripeSecretKeyConfig?.value) {
      throw new ConvexError("Stripe non configuré - clé secrète manquante");
    }

    if (!convexUrlConfig?.value || !convexAdminKeyConfig?.value) {
      throw new ConvexError("Configuration manquante - convex_url ou convex_admin_key");
    }

    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000; // +24h

    // Récupérer la config du délai de paiement
    const paymentDeadlineEnabled = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "payment_deadline_enabled"))
      .first();
    const paymentDeadlineHours = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "payment_deadline_hours"))
      .first();

    // Calculer paymentDeadline si activé
    let paymentDeadline: number | undefined;
    const isDeadlineEnabled = paymentDeadlineEnabled?.value !== "false";
    if (isDeadlineEnabled) {
      const hours = parseInt(paymentDeadlineHours?.value || "") || 48; // 48h par défaut
      paymentDeadline = now + hours * 60 * 60 * 1000;
    }

    // Créer le payment record AVANT de scheduler l'action
    // (car les actions ne peuvent pas appeler runMutation sur Convex self-hosted)
    const paymentId = await ctx.db.insert("stripePayments", {
      missionId: args.missionId,
      // paymentIntentId et clientSecret seront mis à jour par l'action via scheduler
      amount,
      platformFee,
      announcerEarnings,
      status: "pending",
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    // Mettre à jour le statut de la mission en attente de paiement
    await ctx.db.patch(args.missionId, {
      status: "pending_confirmation",
      stripePaymentId: paymentId,
      acceptedAt: now,
      paymentDeadline,
      updatedAt: now,
    });

    // Planifier la création du PaymentIntent Stripe (paiement intégré via Stripe Elements)
    await ctx.scheduler.runAfter(0, internal.api.stripe.createPaymentIntent, {
      missionId: args.missionId,
      amount,
      platformFee,
      announcerEarnings,
      stripeFee: mission.stripeFee || 0,
      stripeAccountId: announcer.stripeAccountId || undefined,
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
      convexUrl: convexUrlConfig.value, // URL Convex pour l'API HTTP
      convexAdminKey: convexAdminKeyConfig.value, // Admin key pour l'authentification
      // Stripe Customer (pour cartes sauvegardées)
      stripeCustomerId: client.stripeCustomerId || undefined,
    });

    // Envoyer l'email au client (réservation acceptée + lien paiement)
    const emailApiKey = emailApiKeyConfig?.value;
    if (emailApiKey) {
      const deadlineHours = parseInt(paymentDeadlineHours?.value || "") || 48;
      await ctx.scheduler.runAfter(0, internal.api.email.sendReservationAcceptedEmail, {
        clientEmail: client.email,
        clientName: `${client.firstName} ${client.lastName}`,
        announcerName: `${announcer.firstName} ${announcer.lastName}`,
        serviceName: mission.serviceName,
        startDate: mission.startDate,
        endDate: mission.endDate,
        animalName: mission.animal?.name,
        amount,
        missionId: args.missionId,
        emailConfig: {
          apiKey: emailApiKeyConfig?.value || "",
          fromEmail: emailFromConfig?.value,
          fromName: emailFromNameConfig?.value,
        },
        appUrl: appUrlConfig?.value,
        paymentDeadlineHours: deadlineHours,
      });
    }

    // Envoyer la notification push au client (mission acceptée)
    await ctx.scheduler.runAfter(0, internal.notifications.actions.sendMissionAcceptedNotification, {
      clientId: mission.clientId,
      announcerName: `${announcer.firstName} ${announcer.lastName.charAt(0)}.`,
      serviceName: mission.serviceName,
      missionId: args.missionId,
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

    // Libérer les places dans les créneaux collectifs si applicable
    if (mission.sessionType === "collective" && mission.collectiveSlotIds && mission.collectiveSlotIds.length > 0) {
      const animalCount = mission.animalCount || 1;
      for (const slotId of mission.collectiveSlotIds) {
        const slot = await ctx.db.get(slotId);
        if (slot) {
          await ctx.db.patch(slotId, {
            bookedAnimals: Math.max(0, slot.bookedAnimals - animalCount),
            updatedAt: Date.now(),
          });
        }
      }
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
 * Annuler une mission (par l'annonceur)
 * Remboursement intégral au client + notifications + emails
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

    const now = Date.now();

    // Libérer les places dans les créneaux collectifs si applicable
    if (mission.sessionType === "collective" && mission.collectiveSlotIds && mission.collectiveSlotIds.length > 0) {
      const animalCount = mission.animalCount || 1;

      // Libérer les slots ET marquer les bookings comme annulés
      const bookings = await ctx.db
        .query("collectiveSlotBookings")
        .withIndex("by_mission", (q: any) => q.eq("missionId", args.missionId))
        .collect();

      for (const booking of bookings) {
        if (booking.status === "booked") {
          const slot = await ctx.db.get(booking.slotId);
          if (slot) {
            await ctx.db.patch(booking.slotId, {
              bookedAnimals: Math.max(0, slot.bookedAnimals - animalCount),
              updatedAt: now,
            });
          }
          await ctx.db.patch(booking._id, {
            status: "cancelled",
            cancelledAt: now,
            updatedAt: now,
          });
        }
      }
    }

    await ctx.db.patch(args.missionId, {
      status: "cancelled",
      cancelledBy: "announcer",
      cancelledAt: now,
      cancellationReason: args.reason,
      refundAmount: mission.amount,
      announcerRetainedAmount: 0,
      updatedAt: now,
    });

    // Remboursement Stripe si paiement capturé
    let payment = null;
    if (mission.stripePaymentId) {
      payment = await ctx.db.get(mission.stripePaymentId);
    }

    if (payment?.paymentIntentId) {
      const stripeSecretKeyConfig = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", (q) => q.eq("key", "stripe_secret_key"))
        .first();

      if (stripeSecretKeyConfig?.value) {
        if (payment.status === "captured") {
          // Paiement immédiat capturé → remboursement intégral
          await ctx.scheduler.runAfter(
            0,
            internal.planning.cancellationActions.processStripeRefund,
            {
              missionId: args.missionId,
              paymentIntentId: payment.paymentIntentId,
              refundAmount: payment.amount,
              stripeSecretKey: stripeSecretKeyConfig.value,
            }
          );

          await ctx.db.patch(payment._id, {
            refundedAmount: payment.amount,
            updatedAt: now,
          });
        } else if (payment.status === "authorized" || payment.status === "pending") {
          // Annuler le PaymentIntent (gère aussi le cas succeeded côté Stripe)
          await ctx.scheduler.runAfter(
            0,
            internal.planning.cancellationActions.cancelStripePaymentIntent,
            {
              paymentIntentId: payment.paymentIntentId,
              stripeSecretKey: stripeSecretKeyConfig.value,
              missionId: args.missionId,
              refundAmount: payment.amount,
            }
          );

          await ctx.db.patch(payment._id, {
            status: "cancelled",
            cancelledAt: now,
            refundedAmount: payment.amount,
            updatedAt: now,
          });
        }
      }
    }

    // Notifications
    const client = await ctx.db.get(mission.clientId);
    const announcer = await ctx.db.get(mission.announcerId);
    const clientName = client
      ? `${client.firstName} ${client.lastName.charAt(0)}.`
      : "Client";
    const announcerName = announcer
      ? `${announcer.firstName} ${announcer.lastName.charAt(0)}.`
      : "Annonceur";

    const formatPriceCents = (cents: number) =>
      (cents / 100).toFixed(2).replace(".", ",") + " €";

    // Notification au client
    if (client) {
      const refundMessage = mission.amount > 0 && payment
        ? `Remboursement intégral de ${formatPriceCents(mission.amount)} en cours (délai : 5-10 jours ouvrés).`
        : "";
      await ctx.db.insert("notifications", {
        userId: mission.clientId,
        type: "mission_cancelled",
        title: "Réservation annulée par l'annonceur",
        message: `${announcerName} a annulé la réservation "${mission.serviceName}". ${refundMessage}`,
        linkType: "mission",
        linkId: args.missionId,
        linkUrl: "/client/reservations",
        isRead: false,
        createdAt: now,
        expiresAt: now + 30 * 24 * 60 * 60 * 1000,
      });
    }

    // Notification à l'annonceur (confirmation)
    if (announcer) {
      await ctx.db.insert("notifications", {
        userId: mission.announcerId,
        type: "mission_cancelled",
        title: "Réservation annulée",
        message: `Vous avez annulé la réservation "${mission.serviceName}" avec ${clientName}. Le client sera remboursé intégralement.`,
        linkType: "mission",
        linkId: args.missionId,
        linkUrl: "/dashboard/missions",
        isRead: false,
        createdAt: now,
        expiresAt: now + 30 * 24 * 60 * 60 * 1000,
      });
    }

    // Emails d'annulation
    const { emailConfig } = await getEmailConfigFromDb(ctx.db);

    if (emailConfig && client) {
      await ctx.scheduler.runAfter(
        0,
        internal.api.email.sendCancellationByAnnouncerClientEmail,
        {
          clientEmail: client.email,
          clientName: client.firstName,
          announcerName: announcerName,
          serviceName: mission.serviceName,
          animalName: mission.animal?.name || "Animal",
          startDate: mission.startDate,
          endDate: mission.endDate,
          totalAmount: mission.amount,
          refundAmount: mission.amount,
          cancellationReason: args.reason,
          emailConfig: emailConfig || { apiKey: "" },
        }
      );
    }

    if (emailConfig && announcer) {
      await ctx.scheduler.runAfter(
        0,
        internal.api.email.sendCancellationByAnnouncerConfirmEmail,
        {
          announcerEmail: announcer.email,
          announcerName: announcer.firstName,
          clientName: clientName,
          serviceName: mission.serviceName,
          animalName: mission.animal?.name || "Animal",
          startDate: mission.startDate,
          endDate: mission.endDate,
          cancellationReason: args.reason,
          emailConfig: emailConfig || { apiKey: "" },
        }
      );
    }

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

    if (mission.status !== "in_progress" && mission.status !== "upcoming") {
      throw new ConvexError("Seules les missions en cours ou à venir peuvent être terminées");
    }

    // Ne pas écraser paymentStatus si déjà "paid" (capture immédiate Stripe)
    const patch: Record<string, any> = {
      status: "completed",
      announcerNotes: args.notes || mission.announcerNotes,
      updatedAt: Date.now(),
    };
    if (mission.paymentStatus !== "paid") {
      patch.paymentStatus = "pending";
    }
    await ctx.db.patch(args.missionId, patch);

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

/**
 * Récupère les fiches détaillées de TOUS les animaux d'une mission (multi-animaux)
 */
export const getMissionAnimalsDetails = query({
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

    // Déterminer la liste des animalIds à résoudre
    const animalIds = mission.animalIds && mission.animalIds.length > 0
      ? mission.animalIds
      : mission.animalId
        ? [mission.animalId]
        : [];

    // Déterminer les infos inline (animals[] ou animal)
    const inlineAnimals = mission.animals && mission.animals.length > 0
      ? mission.animals
      : [mission.animal];

    // Résoudre toutes les fiches en parallèle
    const animals = await Promise.all(
      animalIds.map(async (id, index) => {
        const animal = await ctx.db.get(id);
        const inline = inlineAnimals[index] || inlineAnimals[0];

        if (!animal) {
          return {
            name: inline.name,
            type: inline.type,
            emoji: inline.emoji,
            isInline: true,
          };
        }

        return {
          id: animal._id,
          name: animal.name,
          type: animal.type,
          emoji: inline.emoji,
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
      })
    );

    // Si aucun animalId, retourner les données inline
    if (animals.length === 0) {
      return inlineAnimals.map(a => ({
        name: a.name,
        type: a.type,
        emoji: a.emoji,
        isInline: true,
      }));
    }

    return animals;
  },
});

/**
 * Récupère les missions d'un client (propriétaire d'animal)
 */
export const getClientMissions = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return [];
    }

    // Récupérer toutes les missions où l'utilisateur est le client
    const missions = await ctx.db
      .query("missions")
      .withIndex("by_client", (q) => q.eq("clientId", session.userId))
      .order("desc")
      .collect();

    // Cache pour les catégories et types (stocker les vrais IDs Convex)
    const categoryCache = new Map<string, {
      slug: string;
      parentCategoryId?: typeof missions[0]["_id"] | null;
      typeId?: typeof missions[0]["_id"] | null;
    }>();
    const categoryTypeCache = new Map<string, string>(); // typeId string -> slug

    // Récupérer les infos des annonceurs et enrichir les missions
    const missionsWithDetails = await Promise.all(
      missions.map(async (m) => {
        const announcer = await ctx.db.get(m.announcerId);

        // Déterminer le serviceTypeSlug (garde ou service)
        let serviceTypeSlug: string | undefined;
        if (m.serviceCategory) {
          // Essayer depuis le cache
          if (!categoryCache.has(m.serviceCategory)) {
            const category = await ctx.db
              .query("serviceCategories")
              .withIndex("by_slug", (q) => q.eq("slug", m.serviceCategory))
              .first();
            if (category) {
              categoryCache.set(m.serviceCategory, {
                slug: category.slug,
                parentCategoryId: category.parentCategoryId || null,
                typeId: category.typeId || null,
              });
            }
          }

          const catInfo = categoryCache.get(m.serviceCategory);
          if (catInfo) {
            let typeId = catInfo.typeId;

            // Si c'est une sous-catégorie, récupérer le typeId du parent
            if (!typeId && catInfo.parentCategoryId) {
              const parentCat = await ctx.db.get(catInfo.parentCategoryId as any);
              if (parentCat?.typeId) {
                typeId = parentCat.typeId;
              }
            }

            // Récupérer le slug du type
            if (typeId) {
              const typeIdStr = typeId.toString();
              if (!categoryTypeCache.has(typeIdStr)) {
                const catType = await ctx.db.get(typeId as any);
                if (catType?.slug) {
                  categoryTypeCache.set(typeIdStr, catType.slug);
                }
              }
              serviceTypeSlug = categoryTypeCache.get(typeIdStr);
            }
          }
        }

        return {
          id: m._id,
          announcerId: m.announcerId,
          announcerName: announcer
            ? `${announcer.firstName} ${announcer.lastName.charAt(0)}.`
            : "Annonceur",
          announcerPhone: announcer?.phone,
          animal: m.animal,
          animals: m.animals,
          animalCount: m.animalCount,
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
          city: m.city,
          clientNotes: m.clientNotes,
          announcerNotes: m.announcerNotes,
          cancellationReason: m.cancellationReason,
          cancelledBy: m.cancelledBy,
          refundAmount: m.refundAmount,
          createdAt: m.createdAt,
          // Formule et options
          variantName: m.variantName,
          // Nouveaux champs pour filtres et affichage
          sessionType: m.sessionType,           // "individual" | "collective"
          numberOfSessions: m.numberOfSessions, // Nombre de séances
          sessions: m.sessions,                 // Array des séances (pour affichage)
          serviceTypeSlug,                      // "garde" | "service" (via lookup)
          // Lieu de prestation
          serviceLocation: m.serviceLocation,   // "announcer_home" | "client_home"
          // Délai de paiement
          paymentDeadline: m.paymentDeadline,   // Timestamp deadline
          // Infos supplémentaires
          acceptanceDeadline: m.acceptanceDeadline,
          hasReview: m.hasReview,
          hasDispute: m.hasDispute,
          // Confirmation fin de service
          clientConfirmedAt: m.clientConfirmedAt,
          autoConfirmedAt: m.autoConfirmedAt,
        };
      })
    );

    return missionsWithDetails;
  },
});

/**
 * Récupère le détail d'une mission pour un client
 */
export const getClientMissionById = query({
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
    if (!mission) {
      return null;
    }

    // Vérifier que l'utilisateur est bien le client
    if (mission.clientId !== session.userId) {
      return null;
    }

    // Récupérer les infos de l'annonceur
    const announcer = await ctx.db.get(mission.announcerId);

    // Récupérer le profil de l'annonceur pour la photo
    let announcerPhotoUrl: string | null = null;
    if (announcer) {
      const profilePhoto = await ctx.db
        .query("photos")
        .withIndex("by_user", (q) => q.eq("userId", mission.announcerId))
        .filter((q) => q.eq(q.field("isProfilePhoto"), true))
        .first();

      if (profilePhoto?.storageId) {
        announcerPhotoUrl = await ctx.storage.getUrl(profilePhoto.storageId);
      }
    }

    // Récupérer le service pour plus de détails
    const service = mission.serviceId ? await ctx.db.get(mission.serviceId) : null;

    // Récupérer les détails du paiement si existant
    let paymentDetails = null;
    if (mission.stripePaymentId) {
      const payment = await ctx.db.get(mission.stripePaymentId);
      if (payment) {
        paymentDetails = {
          status: payment.status,
          amount: payment.amount,
          platformFee: payment.platformFee,
          paymentUrl: payment.paymentUrl,
          expiresAt: payment.expiresAt,
          refundedAmount: payment.refundedAmount,
          refundedAt: payment.refundedAt,
          refundStatus: payment.refundStatus,
        };
      }
    }

    // Récupérer le profil de l'annonceur pour le slug
    const announcerProfile = announcer
      ? await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", mission.announcerId))
          .first()
      : null;

    return {
      id: mission._id,
      announcerId: mission.announcerId,
      announcerName: announcer
        ? `${announcer.firstName} ${announcer.lastName.charAt(0)}.`
        : "Annonceur",
      announcerFirstName: announcer?.firstName || "Annonceur",
      announcerPhone: announcer?.phone,
      announcerEmail: announcer?.email,
      announcerPhotoUrl,
      announcerSlug: announcer?.username || announcer?.slug,
      animal: mission.animal,
      animals: mission.animals,
      animalId: mission.animalId,
      animalIds: mission.animalIds,
      animalCount: mission.animalCount,
      serviceName: mission.serviceName,
      serviceCategory: mission.serviceCategory,
      // Formule et options
      variantName: mission.variantName,
      optionNames: mission.optionNames,
      basePrice: mission.basePrice,
      optionsPrice: mission.optionsPrice,
      // Dates
      startDate: mission.startDate,
      endDate: mission.endDate,
      startTime: mission.startTime,
      endTime: mission.endTime,
      status: mission.status,
      // Prix
      amount: mission.amount,
      platformFee: mission.platformFee,
      stripeFee: mission.stripeFee,
      commissionRate: mission.commissionRate,
      stripeFeeRate: mission.stripeFeeRate,
      announcerEarnings: mission.announcerEarnings,
      paymentStatus: mission.paymentStatus,
      location: mission.location,
      city: mission.city,
      postalCode: mission.postalCode,
      clientNotes: mission.clientNotes,
      announcerNotes: mission.announcerNotes,
      cancellationReason: mission.cancellationReason,
      cancelledBy: mission.cancelledBy,
      cancelledAt: mission.cancelledAt,
      refundAmount: mission.refundAmount,
      announcerRetainedAmount: mission.announcerRetainedAmount,
      refundStripeId: mission.refundStripeId,
      createdAt: mission.createdAt,
      updatedAt: mission.updatedAt,
      // Garde de nuit
      includeOvernightStay: mission.includeOvernightStay,
      overnightNights: mission.overnightNights,
      overnightAmount: mission.overnightAmount,
      dayStartTime: mission.dayStartTime || service?.dayStartTime,
      dayEndTime: mission.dayEndTime || service?.dayEndTime,
      // Multi-séances
      sessions: mission.sessions,
      sessionType: mission.sessionType,
      numberOfSessions: mission.numberOfSessions,
      // Lieu de prestation
      serviceLocation: mission.serviceLocation,
      // TVA
      vatRate: mission.vatRate,
      isSapApplied: mission.isSapApplied,
      // Paiement
      paymentDetails,
      // Délai de paiement
      paymentDeadline: mission.paymentDeadline,
      // Confirmation fin de service
      clientConfirmedAt: mission.clientConfirmedAt,
      autoConfirmedAt: mission.autoConfirmedAt,
      readyForPayout: mission.readyForPayout,
      payoutScheduledFor: mission.payoutScheduledFor,
      // Délai d'acceptation par l'annonceur (timestamp ms)
      acceptanceDeadline: mission.acceptanceDeadline,
    };
  },
});

/**
 * Récupère les statistiques du dashboard annonceur
 * - Revenus à venir (missions confirmées - upcoming)
 * - Revenus encaissables (missions terminées - completed)
 * - Compteurs par statut
 */
export const getAnnouncerDashboardStats = query({
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

    // Récupérer toutes les missions de l'annonceur
    const missions = await ctx.db
      .query("missions")
      .withIndex("by_announcer", (q) => q.eq("announcerId", session.userId))
      .collect();

    // Compteurs par statut
    const pendingAcceptance = missions.filter((m) => m.status === "pending_acceptance");
    const pendingConfirmation = missions.filter((m) => m.status === "pending_confirmation");
    const upcoming = missions.filter((m) => m.status === "upcoming");
    const inProgress = missions.filter((m) => m.status === "in_progress");
    const completed = missions.filter((m) => m.status === "completed");
    const refused = missions.filter((m) => m.status === "refused");
    const cancelled = missions.filter((m) => m.status === "cancelled");

    // Revenus à venir = missions confirmées (upcoming + in_progress) - utiliser announcerEarnings
    const upcomingRevenue = [...upcoming, ...inProgress].reduce(
      (sum, m) => sum + (m.announcerEarnings ?? Math.round(m.amount * 0.85)),
      0
    );

    // Revenus encaissables = missions terminées (completed) - utiliser announcerEarnings
    const completedRevenue = completed.reduce(
      (sum, m) => sum + (m.announcerEarnings ?? Math.round(m.amount * 0.85)),
      0
    );

    // Missions actives pour l'affichage (les 6 plus proches, enrichies)
    const activeMissions = [...pendingAcceptance, ...inProgress, ...upcoming]
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 6)
      .map((m) => ({
        id: m._id,
        animal: m.animal,
        animals: m.animals,
        serviceName: m.serviceName,
        startDate: m.startDate,
        endDate: m.endDate,
        startTime: m.startTime,
        endTime: m.endTime,
        status: m.status,
        clientName: m.clientName,
        announcerEarnings: m.announcerEarnings ?? Math.round(m.amount * 0.85),
        serviceLocation: m.serviceLocation,
        city: m.city,
      }));

    return {
      pendingAcceptance: pendingAcceptance.length,
      pendingConfirmation: pendingConfirmation.length,
      upcoming: upcoming.length,
      inProgress: inProgress.length,
      completed: completed.length,
      refused: refused.length,
      cancelled: cancelled.length,
      upcomingRevenue,
      completedRevenue,
      activeMissions,

      // KPIs de performance
      // Pool = missions acceptées (tout sauf pending_acceptance et refused)
      // Réalisation + Annulation = 100%
      kpis: {
        totalMissions: missions.length,
        acceptanceRate: (() => {
          const accepted = pendingConfirmation.length + upcoming.length + inProgress.length + completed.length;
          const pool = accepted + cancelled.length;
          if (pool === 0) return 100;
          return Math.round((accepted / pool) * 100);
        })(),
        cancellationRate: (() => {
          const accepted = pendingConfirmation.length + upcoming.length + inProgress.length + completed.length;
          const pool = accepted + cancelled.length;
          if (pool === 0) return 0;
          return Math.round((cancelled.length / pool) * 100);
        })(),
        refusalRate: (() => {
          const decided = pendingConfirmation.length + upcoming.length + inProgress.length + completed.length + cancelled.length + refused.length;
          if (decided === 0) return 0;
          return Math.round((refused.length / decided) * 100);
        })(),
      },

      // Sparkline revenus - 6 derniers mois
      monthlySparkline: (() => {
        const now = new Date();
        return Array.from({ length: 6 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
          const year = d.getFullYear();
          const month = d.getMonth();
          const monthMissions = completed.filter((m) => {
            const sd = new Date(m.startDate);
            return sd.getFullYear() === year && sd.getMonth() === month;
          });
          return {
            month: d.toLocaleDateString("fr-FR", { month: "short" }),
            earnings: monthMissions.reduce(
              (sum, m) => sum + (m.announcerEarnings ?? Math.round(m.amount * 0.85)),
              0
            ),
            count: monthMissions.length,
          };
        });
      })(),

      // Prochain virement estimé
      nextPayout: (() => {
        const readyMissions = completed.filter(
          (m) => m.readyForPayout === true && m.announcerPaymentStatus !== "paid"
        );
        if (readyMissions.length === 0) return null;
        const amount = readyMissions.reduce(
          (sum, m) => sum + (m.announcerEarnings ?? Math.round(m.amount * 0.85)),
          0
        );
        const now = new Date();
        const day = now.getDate();
        const scheduledDate = day >= 25
          ? new Date(now.getFullYear(), now.getMonth() + 1, 25).getTime()
          : new Date(now.getFullYear(), now.getMonth(), 25).getTime();
        return { amount, missionsCount: readyMissions.length, scheduledDate };
      })(),
    };
  },
});

/**
 * Récupère les services les plus réservés (top 5) pour l'annonceur
 * avec panier moyen par service et global
 */
export const getAnnouncerTopServices = query({
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

    const missions = await ctx.db
      .query("missions")
      .withIndex("by_announcer", (q) => q.eq("announcerId", session.userId))
      .collect();

    const completedMissions = missions.filter((m) => m.status === "completed");

    if (completedMissions.length === 0) {
      return {
        topServices: [],
        overallAverageBasket: 0,
        totalCompleted: 0,
      };
    }

    // Grouper par serviceCategory::serviceName
    const serviceMap = new Map<string, { count: number; totalEarnings: number; name: string; category: string }>();

    for (const m of completedMissions) {
      const key = `${m.serviceCategory}::${m.serviceName}`;
      const existing = serviceMap.get(key);
      const earnings = m.announcerEarnings ?? Math.round(m.amount * 0.85);

      if (existing) {
        existing.count++;
        existing.totalEarnings += earnings;
      } else {
        serviceMap.set(key, {
          count: 1,
          totalEarnings: earnings,
          name: m.serviceName,
          category: m.serviceCategory,
        });
      }
    }

    // Top 5 triés par count desc
    const topServices = Array.from(serviceMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((s) => ({
        name: s.name,
        category: s.category,
        missionCount: s.count,
        totalEarnings: s.totalEarnings,
        averageEarnings: Math.round(s.totalEarnings / s.count),
      }));

    const totalEarnings = completedMissions.reduce(
      (sum, m) => sum + (m.announcerEarnings ?? Math.round(m.amount * 0.85)),
      0
    );

    return {
      topServices,
      overallAverageBasket: Math.round(totalEarnings / completedMissions.length),
      totalCompleted: completedMissions.length,
    };
  },
});

/**
 * Query unifiée : Récupère les missions ET les stats en une seule query
 * OPTIMISÉ : Évite les appels dupliqués entre getAnnouncerDashboardStats et getMissionsByStatus
 *
 * Retourne :
 * - missions : Liste des missions filtrées par statut (avec enrichissement)
 * - stats : Compteurs par statut + revenus
 * - announcerCoordinates : Coordonnées de l'annonceur pour calcul distance
 */
export const getAnnouncerMissionsWithStats = query({
  args: {
    token: v.string(),
    status: v.optional(v.union(
      v.literal("pending_acceptance"),
      v.literal("pending_confirmation"),
      v.literal("upcoming"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("refused"),
      v.literal("cancelled")
    )),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    // 1. Récupérer TOUTES les missions de l'annonceur en UNE SEULE query
    const allMissions = await ctx.db
      .query("missions")
      .withIndex("by_announcer", (q) => q.eq("announcerId", session.userId))
      .collect();

    // 2. Calculer les stats par statut
    const pendingAcceptance = allMissions.filter(m => m.status === "pending_acceptance");
    const pendingConfirmation = allMissions.filter(m => m.status === "pending_confirmation");
    const upcoming = allMissions.filter(m => m.status === "upcoming");
    const inProgress = allMissions.filter(m => m.status === "in_progress");
    const completed = allMissions.filter(m => m.status === "completed");
    const refused = allMissions.filter(m => m.status === "refused");
    const cancelled = allMissions.filter(m => m.status === "cancelled");

    // Revenus
    const upcomingRevenue = [...upcoming, ...inProgress].reduce(
      (sum, m) => sum + (m.announcerEarnings ?? Math.round(m.amount * 0.85)),
      0
    );
    const completedRevenue = completed.reduce(
      (sum, m) => sum + (m.announcerEarnings ?? Math.round(m.amount * 0.85)),
      0
    );

    const stats = {
      pending_acceptance: pendingAcceptance.length,
      pending_confirmation: pendingConfirmation.length,
      upcoming: upcoming.length,
      in_progress: inProgress.length,
      completed: completed.length,
      refused: refused.length,
      cancelled: cancelled.length,
      upcomingRevenue,
      completedRevenue,
    };

    // 3. Filtrer par statut demandé
    const filteredMissions = args.status
      ? allMissions.filter(m => m.status === args.status)
      : allMissions;

    // 4. Grouper par clientId pour les stats de confiance (évite N+1)
    const clientMissionsMap = new Map<string, typeof allMissions>();
    allMissions.forEach(m => {
      const list = clientMissionsMap.get(m.clientId as string) || [];
      list.push(m);
      clientMissionsMap.set(m.clientId as string, list);
    });

    const now = Date.now();
    const fortyEightHours = 48 * 60 * 60 * 1000;
    const uniqueClientIds = [...new Set(filteredMissions.map(m => m.clientId as string))];

    const clientTrustStats: Record<string, any> = {};
    const clientHistoryWithAnnouncer: Record<string, any> = {};

    for (const clientId of uniqueClientIds) {
      const clientMissions = clientMissionsMap.get(clientId) || [];
      const totalBookings = clientMissions.length;
      const cancelledCount = clientMissions.filter(m => m.status === "cancelled").length;
      const completedCount = clientMissions.filter(m => m.status === "completed").length;
      const notFinalized = clientMissions.filter(m =>
        m.status === "pending_confirmation" &&
        m.updatedAt &&
        (now - m.updatedAt) > fortyEightHours
      ).length;

      let trustScore = 100;
      if (totalBookings > 0) {
        const cancelPenalty = (cancelledCount / totalBookings) * 40;
        const notFinalizedPenalty = (notFinalized / totalBookings) * 30;
        trustScore = Math.max(0, Math.round(100 - cancelPenalty - notFinalizedPenalty));
      }

      clientTrustStats[clientId] = {
        totalBookings,
        cancelled: cancelledCount,
        notFinalized,
        completed: completedCount,
        trustScore
      };

      clientHistoryWithAnnouncer[clientId] = {
        previousMissionsCount: completedCount,
        isNewClient: completedCount === 0,
      };
    }

    // Récupérer le statut TVA de l'annonceur
    const announcerUser = await ctx.db.get(session.userId);
    const announcerIsVatSubject = announcerUser?.isVatSubject === true;

    // 5. Batch lookup des collectiveSlots
    const allSlotIds: string[] = [];
    filteredMissions.forEach(m => {
      if (m.sessionType === "collective" && m.collectiveSlotIds?.length) {
        allSlotIds.push(...(m.collectiveSlotIds as string[]));
      }
    });

    const slotMap = new Map<string, { date: string }>();
    if (allSlotIds.length > 0) {
      const slots = await Promise.all(
        allSlotIds.map(id => ctx.db.get(id as any))
      );
      allSlotIds.forEach((id, i) => {
        if (slots[i]) {
          slotMap.set(id, { date: slots[i].date });
        }
      });
    }

    // 6. Enrichir les missions
    const enrichedMissions = filteredMissions.map(m => {
      let collectiveSlotDates: string[] | undefined;
      if (m.sessionType === "collective" && m.collectiveSlotIds?.length) {
        collectiveSlotDates = (m.collectiveSlotIds as string[])
          .map(id => slotMap.get(id)?.date)
          .filter((d): d is string => d !== undefined);
      }

      return {
        id: m._id,
        clientId: m.clientId,
        clientName: m.clientName,
        clientPhone: m.clientPhone,
        animal: m.animal,
        animalId: m.animalId,
        animals: m.animals,
        animalIds: m.animalIds,
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
        sessionType: m.sessionType,
        numberOfSessions: m.numberOfSessions,
        collectiveSlotIds: m.collectiveSlotIds,
        collectiveSlotDates,
        animalCount: m.animalCount,
        sessions: m.sessions,
        bookedAt: m.bookedAt,
        acceptanceDeadline: m.acceptanceDeadline,
        clientTrustStats: clientTrustStats[m.clientId as string] || {
          totalBookings: 1, cancelled: 0, notFinalized: 0, completed: 0, trustScore: 100
        },
        serviceLocation: m.serviceLocation,
        clientHistory: clientHistoryWithAnnouncer[m.clientId as string] || {
          previousMissionsCount: 0, isNewClient: true
        },
        vatRate: m.vatRate,
        isSapApplied: m.isSapApplied,
        isVatSubject: announcerIsVatSubject,
      };
    });

    // 7. Récupérer les coordonnées de l'annonceur (pour calcul distance)
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    const announcerCoordinates = profile?.coordinates || null;

    return {
      missions: enrichedMissions,
      stats,
      announcerCoordinates,
    };
  },
});

/**
 * Convertit une date locale "YYYY-MM-DD" + "HH:MM" en timestamp UTC,
 * en tenant compte du fuseau horaire configuré (ex: Europe/Paris).
 * Utilise Intl.DateTimeFormat pour résoudre l'offset UTC du timezone IANA.
 */
function localDateToTimestamp(date: string, time: string, timezone: string): number {
  // Construire la date en UTC d'abord
  const utcDate = new Date(`${date}T${time}:00Z`);
  // Calculer l'offset du timezone cible à cette date
  // En formatant la date UTC dans le timezone cible, on obtient l'heure locale
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(utcDate);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "0";
  const localAtUtc = new Date(
    `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}Z`
  );
  // L'offset = heure locale affichée quand il est X en UTC - X en UTC
  const offsetMs = localAtUtc.getTime() - utcDate.getTime();
  // La date locale voulue = UTC - offset (si Paris est UTC+1, 14:00 local = 13:00 UTC)
  return utcDate.getTime() - offsetMs;
}

/**
 * Auto-démarrage des missions à venir
 * Cron toutes les 15 min : passe les missions "upcoming" en "in_progress"
 * quand leur date/heure de début est atteinte
 */
export const autoStartMissions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Récupérer le fuseau horaire configuré
    const timezoneConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "platform_timezone"))
      .first();
    const timezone = timezoneConfig?.value || "Europe/Paris";

    const missions = await ctx.db
      .query("missions")
      .filter((q) => q.eq(q.field("status"), "upcoming"))
      .collect();

    let started = 0;
    for (const mission of missions) {
      try {
        let shouldStart = false;

        // Multi-sessions : démarrer à la 1ère session
        if (mission.sessions && mission.sessions.length > 0) {
          const firstSession = mission.sessions[0];
          const startTs = localDateToTimestamp(
            firstSession.date,
            firstSession.startTime || "00:00",
            timezone
          );
          shouldStart = now >= startTs;
        } else {
          // Garde ou session unique : utiliser startDate + startTime
          const startTs = localDateToTimestamp(
            mission.startDate,
            mission.startTime || "00:00",
            timezone
          );
          shouldStart = now >= startTs;
        }

        if (shouldStart) {
          await ctx.db.patch(mission._id, {
            status: "in_progress",
            updatedAt: now,
          });
          started++;
        }
      } catch (error) {
        console.error(`Erreur auto-start mission ${mission._id}:`, error);
      }
    }

    return { started, total: missions.length };
  },
});

/**
 * Auto-complétion des missions en cours
 * Cron toutes les 15 min : passe les missions "in_progress" en "completed"
 * quand leur date/heure de fin est dépassée
 */
export const autoCompleteMissions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Récupérer le fuseau horaire configuré
    const timezoneConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "platform_timezone"))
      .first();
    const timezone = timezoneConfig?.value || "Europe/Paris";

    const missions = await ctx.db
      .query("missions")
      .filter((q) => q.eq(q.field("status"), "in_progress"))
      .collect();

    let completed = 0;
    for (const mission of missions) {
      try {
        let shouldComplete = false;

        // Multi-sessions : terminer après la dernière session
        if (mission.sessions && mission.sessions.length > 0) {
          const lastSession = mission.sessions[mission.sessions.length - 1];
          const endTs = localDateToTimestamp(
            lastSession.date,
            lastSession.endTime || "23:59",
            timezone
          );
          shouldComplete = now >= endTs;
        } else {
          // Garde ou session unique : utiliser endDate + endTime
          const endTs = localDateToTimestamp(
            mission.endDate,
            mission.endTime || "23:59",
            timezone
          );
          shouldComplete = now >= endTs;
        }

        if (shouldComplete) {
          // Ne pas écraser paymentStatus si déjà "paid" (capture immédiate Stripe)
          const patch: Record<string, any> = {
            status: "completed",
            updatedAt: now,
          };
          if (mission.paymentStatus !== "paid") {
            patch.paymentStatus = "pending";
          }
          await ctx.db.patch(mission._id, patch);
          completed++;
        }
      } catch (error) {
        console.error(`Erreur auto-complete mission ${mission._id}:`, error);
      }
    }

    return { completed, total: missions.length };
  },
});
