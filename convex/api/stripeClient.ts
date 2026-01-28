// @ts-nocheck
import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { internal, api } from "../_generated/api";
import { internal as internalApi } from "../_generated/api";

/**
 * Récupérer la clé publique Stripe (accessible au client)
 */
export const getPublicKey = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "stripe_public_key"))
      .first();
    return config?.value || null;
  },
});

/**
 * Récupérer les informations de paiement pour une mission (pour le client)
 */
export const getPaymentInfo = query({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
  },
  handler: async (ctx, args) => {
    // Vérifier la session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    // Récupérer la mission
    const mission = await ctx.db.get(args.missionId);
    if (!mission) {
      return null;
    }

    // Vérifier que l'utilisateur est le client de cette mission
    if (mission.clientId !== session.userId) {
      return null;
    }

    // Récupérer le paiement associé
    let payment = null;
    if (mission.stripePaymentId) {
      payment = await ctx.db.get(mission.stripePaymentId);
    }

    // Récupérer les infos de l'annonceur et du service
    const announcer = await ctx.db.get(mission.announcerId);
    const service = mission.serviceId ? await ctx.db.get(mission.serviceId) : null;

    // Récupérer l'animal si présent
    let animal = null;
    if (mission.animalId) {
      animal = await ctx.db.get(mission.animalId);
    }

    return {
      mission: {
        id: mission._id,
        status: mission.status,
        startDate: mission.startDate,
        endDate: mission.endDate,
        startTime: mission.startTime,
        endTime: mission.endTime,
        totalPrice: mission.totalPrice,
        serviceName: mission.serviceName,
        notes: mission.notes,
      },
      payment: payment ? {
        id: payment._id,
        paymentIntentId: payment.paymentIntentId,
        status: payment.status,
        clientSecret: payment.clientSecret,
        amount: payment.amount,
        expiresAt: payment.expiresAt,
      } : null,
      announcer: announcer ? {
        id: announcer._id,
        firstName: announcer.firstName,
        lastName: announcer.lastName,
        profileImage: announcer.profileImage,
        companyName: announcer.companyName,
      } : null,
      animal: animal ? {
        id: animal._id,
        name: animal.name,
        type: animal.type,
        breed: animal.breed,
      } : null,
    };
  },
});

/**
 * Récupérer les missions en attente de paiement pour un client
 */
export const getPendingPayments = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Vérifier la session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return [];
    }

    // Récupérer les missions du client en attente de paiement
    const missions = await ctx.db
      .query("missions")
      .withIndex("by_client", (q) => q.eq("clientId", session.userId))
      .collect();

    const pendingMissions = missions.filter(
      (m) => m.status === "pending_confirmation" && m.stripePaymentId
    );

    const results = [];
    for (const mission of pendingMissions) {
      const payment = mission.stripePaymentId
        ? await ctx.db.get(mission.stripePaymentId)
        : null;

      // Afficher le paiement s'il est pending, même si clientSecret n'est pas encore défini
      // (l'action Stripe est peut-être en cours de traitement)
      if (payment && payment.status === "pending") {
        const announcer = await ctx.db.get(mission.announcerId);

        results.push({
          missionId: mission._id,
          serviceName: mission.serviceName,
          startDate: mission.startDate,
          endDate: mission.endDate,
          amount: payment.amount,
          expiresAt: payment.expiresAt,
          announcerName: announcer
            ? `${announcer.firstName} ${announcer.lastName}`
            : "Annonceur",
          // Indiquer si le paiement est prêt (clientSecret défini)
          isReady: !!payment.clientSecret,
        });
      }
    }

    return results;
  },
});

/**
 * Confirmer le paiement côté client (après succès Stripe Elements)
 * Cette mutation est appelée après que le paiement a été confirmé via Stripe Elements
 * Elle met à jour les statuts directement si le paiement est en état requires_capture
 */
export const confirmPaymentSuccess = mutation({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
    paymentIntentId: v.string(),
    paymentStatus: v.optional(v.string()), // Status retourné par Stripe Elements
  },
  handler: async (ctx, args) => {
    // Vérifier la session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return { success: false, error: "Session invalide" };
    }

    // Récupérer la mission
    const mission = await ctx.db.get(args.missionId);
    if (!mission || mission.clientId !== session.userId) {
      return { success: false, error: "Mission non trouvée" };
    }

    // Récupérer le paiement
    const payment = mission.stripePaymentId
      ? await ctx.db.get(mission.stripePaymentId)
      : null;

    if (!payment || payment.paymentIntentId !== args.paymentIntentId) {
      return { success: false, error: "Paiement non trouvé" };
    }

    // Si le paiement est déjà autorisé, ne rien faire
    if (payment.status === "authorized") {
      return { success: true, message: "Paiement déjà confirmé" };
    }

    // Si le status Stripe est requires_capture ou succeeded, mettre à jour
    // C'est un fallback si le webhook n'est pas configuré
    if (args.paymentStatus === "requires_capture" || args.paymentStatus === "succeeded") {
      const now = Date.now();
      const autoCaptureTime = now + 48 * 60 * 60 * 1000; // +48h

      // Mettre à jour le paiement
      await ctx.db.patch(payment._id, {
        status: "authorized",
        authorizedAt: now,
        updatedAt: now,
      });

      // Mettre à jour la mission: passer en "upcoming"
      await ctx.db.patch(args.missionId, {
        status: "upcoming",
        paymentStatus: "pending", // Fonds bloqués mais pas encore capturés
        autoCaptureScheduledAt: autoCaptureTime,
        updatedAt: now,
      });

      // Envoyer une notification à l'annonceur
      const client = await ctx.db.get(mission.clientId);
      const clientProfile = client ? await ctx.db
        .query("clientProfiles")
        .withIndex("by_user", (q) => q.eq("userId", client._id))
        .first() : null;

      const clientName = clientProfile
        ? `${clientProfile.firstName || ""} ${clientProfile.lastName || ""}`.trim() || client?.email || "Client"
        : client?.email || "Client";

      await ctx.scheduler.runAfter(0, api.notifications.actions.sendMissionConfirmedNotification, {
        announcerId: mission.announcerId,
        clientName,
        serviceName: mission.serviceName || "Service",
        startDate: mission.startDate,
        missionId: args.missionId,
      });

      // Créer la conversation de messagerie
      await ctx.scheduler.runAfter(0, internalApi.messaging.mutations.createConversation, {
        missionId: args.missionId,
      });

      console.log(`Paiement confirmé pour mission ${args.missionId} - status: ${args.paymentStatus}`);
      return { success: true, message: "Paiement confirmé avec succès" };
    }

    // Si le status n'est pas fourni, on attend le webhook
    return { success: true, message: "Paiement en cours de confirmation" };
  },
});
