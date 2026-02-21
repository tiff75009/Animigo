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
        amount: mission.amount,
        serviceName: mission.serviceName,
        notes: mission.notes,
        platformFee: mission.platformFee,
        stripeFee: mission.stripeFee,
        commissionRate: mission.commissionRate,
        stripeFeeRate: mission.stripeFeeRate,
        vatRate: mission.vatRate,
        isSapApplied: mission.isSapApplied,
        announcerEarnings: mission.announcerEarnings,
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

    // Si le paiement est déjà autorisé ou capturé, ne rien faire
    // (le webhook markPaymentPaid peut avoir déjà mis à jour le statut)
    if (["authorized", "captured"].includes(payment.status)) {
      return { success: true, message: "Paiement déjà confirmé" };
    }

    // Déterminer le bon statut selon le mode de capture Stripe
    const isCaptured = args.paymentStatus === "succeeded"; // Paiement immédiat (automatic capture)
    const isAuthorized = args.paymentStatus === "requires_capture"; // Pré-autorisation (manual capture)

    if (isCaptured || isAuthorized) {
      const now = Date.now();

      // Mettre à jour le paiement avec le bon statut
      await ctx.db.patch(payment._id, {
        status: isCaptured ? "captured" : "authorized",
        ...(isCaptured ? { capturedAt: now } : { authorizedAt: now }),
        updatedAt: now,
      });

      // Mettre à jour la mission: passer en "upcoming"
      await ctx.db.patch(args.missionId, {
        status: "upcoming",
        paymentStatus: isCaptured ? "paid" : "pending",
        ...(isAuthorized ? { autoCaptureScheduledAt: now + 48 * 60 * 60 * 1000 } : {}),
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

      // Envoyer le reçu de paiement par email au client (si pas déjà envoyé par le webhook)
      const freshPayment = await ctx.db.get(payment._id);
      const receiptAlreadySent = freshPayment?.receiptEmailSent === true;

      const announcer = await ctx.db.get(mission.announcerId);
      const apiKeyConfig = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", (q) => q.eq("key", "resend_api_key"))
        .first();

      if (apiKeyConfig?.value && client?.email && !receiptAlreadySent) {
        const fromEmailConfig = await ctx.db
          .query("systemConfig")
          .withIndex("by_key", (q) => q.eq("key", "resend_from_email"))
          .first();
        const fromNameConfig = await ctx.db
          .query("systemConfig")
          .withIndex("by_key", (q) => q.eq("key", "resend_from_name"))
          .first();
        const appUrlConfig = await ctx.db
          .query("systemConfig")
          .withIndex("by_key", (q) => q.eq("key", "app_url"))
          .first();

        const isPro = announcer?.accountType === "annonceur_pro" && !!announcer?.siret;
        const announcerDisplayName = announcer
          ? `${announcer.firstName} ${announcer.lastName.charAt(0)}.`
          : "Le prestataire";

        await ctx.scheduler.runAfter(
          0,
          internalApi.api.email.sendPaymentReceiptEmail,
          {
            clientEmail: client.email,
            clientName: clientProfile?.firstName || client.firstName || "Client",
            serviceName: mission.serviceName || "Service",
            announcerName: announcerDisplayName,
            announcerStatus: isPro ? "Professionnel" : "Particulier",
            announcerCompany: isPro && announcer?.companyName ? announcer.companyName : "",
            announcerSiret: isPro && announcer?.siret ? announcer.siret : "",
            startDate: mission.startDate,
            endDate: mission.endDate,
            announcerEarnings: mission.announcerEarnings || mission.amount || 0,
            vatRate: mission.vatRate || 0,
            isSapApplied: mission.isSapApplied || false,
            platformFee: mission.platformFee || 0,
            commissionRate: mission.commissionRate || 0,
            stripeFee: mission.stripeFee || 0,
            stripeFeeRate: mission.stripeFeeRate || 0,
            totalAmount: payment.amount || mission.amount || 0,
            paymentRef: args.paymentIntentId,
            cardBrand: "",
            cardLast4: "",
            emailConfig: {
              apiKey: apiKeyConfig.value,
              fromEmail: fromEmailConfig?.value,
              fromName: fromNameConfig?.value,
            },
            appUrl: appUrlConfig?.value || undefined,
          }
        );

        // Marquer que le reçu a été planifié pour éviter un double envoi via webhook
        await ctx.db.patch(payment._id, {
          receiptEmailSent: true,
        });
      }

      console.log(`Paiement confirmé pour mission ${args.missionId} - status: ${args.paymentStatus}`);
      return { success: true, message: "Paiement confirmé avec succès" };
    }

    // Si le status n'est pas fourni, on attend le webhook
    return { success: true, message: "Paiement en cours de confirmation" };
  },
});
