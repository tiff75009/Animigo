// @ts-nocheck
import { internalMutation, internalQuery, mutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

/**
 * Récupérer la clé secrète Stripe
 */
export const getStripeSecretKey = internalQuery({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "stripe_secret_key"))
      .first();
    return config?.value || null;
  },
});

/**
 * Récupérer la clé publique Stripe
 */
export const getStripePublicKey = internalQuery({
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
 * Récupérer le webhook secret Stripe
 */
export const getStripeWebhookSecret = internalQuery({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "stripe_webhook_secret"))
      .first();
    return config?.value || null;
  },
});

/**
 * Récupérer l'URL de l'application
 */
export const getAppUrl = internalQuery({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "app_url"))
      .first();
    return config?.value || "http://localhost:3000";
  },
});

/**
 * Créer un enregistrement de paiement (Checkout Session)
 */
export const createPaymentRecord = internalMutation({
  args: {
    missionId: v.id("missions"),
    checkoutSessionId: v.string(),
    checkoutUrl: v.string(),
    amount: v.number(),
    platformFee: v.number(),
    announcerEarnings: v.number(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const paymentId = await ctx.db.insert("stripePayments", {
      missionId: args.missionId,
      checkoutSessionId: args.checkoutSessionId,
      checkoutUrl: args.checkoutUrl,
      amount: args.amount,
      platformFee: args.platformFee,
      announcerEarnings: args.announcerEarnings,
      status: "pending",
      expiresAt: args.expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    // Lier le paiement à la mission
    await ctx.db.patch(args.missionId, {
      stripePaymentId: paymentId,
      updatedAt: now,
    });

    return paymentId;
  },
});

/**
 * Créer un enregistrement de paiement pour PaymentIntent (Stripe Elements)
 * Appelé depuis acceptMission AVANT de scheduler l'action
 */
export const createPaymentIntentRecord = internalMutation({
  args: {
    missionId: v.id("missions"),
    amount: v.number(),
    platformFee: v.number(),
    announcerEarnings: v.number(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const paymentId = await ctx.db.insert("stripePayments", {
      missionId: args.missionId,
      // Ces champs seront mis à jour par updatePaymentIntentDetails
      paymentIntentId: undefined,
      clientSecret: undefined,
      amount: args.amount,
      platformFee: args.platformFee,
      announcerEarnings: args.announcerEarnings,
      status: "pending",
      expiresAt: args.expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    // Lier le paiement à la mission
    await ctx.db.patch(args.missionId, {
      stripePaymentId: paymentId,
      updatedAt: now,
    });

    return paymentId;
  },
});

/**
 * Mettre à jour le payment record avec les détails du PaymentIntent
 * Appelé par l'action createPaymentIntent via scheduler
 */
export const updatePaymentIntentDetails = internalMutation({
  args: {
    missionId: v.id("missions"),
    paymentIntentId: v.string(),
    clientSecret: v.string(),
  },
  handler: async (ctx, args) => {
    const mission = await ctx.db.get(args.missionId);
    if (!mission?.stripePaymentId) {
      throw new Error("Mission ou paiement non trouvé");
    }

    const now = Date.now();

    await ctx.db.patch(mission.stripePaymentId, {
      paymentIntentId: args.paymentIntentId,
      clientSecret: args.clientSecret,
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Version pour l'API HTTP Convex (appelé via fetch depuis l'action)
 * L'authentification est gérée par l'admin key dans le header Authorization
 */
export const updatePaymentIntentDetailsDirect = mutation({
  args: {
    missionId: v.id("missions"),
    paymentIntentId: v.string(),
    clientSecret: v.string(),
  },
  handler: async (ctx, args) => {
    const mission = await ctx.db.get(args.missionId);
    if (!mission?.stripePaymentId) {
      throw new Error("Mission ou paiement non trouvé");
    }

    const now = Date.now();

    await ctx.db.patch(mission.stripePaymentId, {
      paymentIntentId: args.paymentIntentId,
      clientSecret: args.clientSecret,
      updatedAt: now,
    });

    console.log("Payment intent details updated via Convex HTTP API:", args.paymentIntentId);

    return { success: true };
  },
});

/**
 * Marquer le paiement comme autorisé (pré-autorisation réussie)
 * Supporte à la fois Checkout Session et PaymentIntent direct (Stripe Elements)
 */
export const markPaymentAuthorized = internalMutation({
  args: {
    checkoutSessionId: v.optional(v.string()),
    paymentIntentId: v.string(),
    stripeCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let payment;

    // Chercher par checkout session ou par payment intent
    if (args.checkoutSessionId) {
      payment = await ctx.db
        .query("stripePayments")
        .withIndex("by_checkout_session", (q) =>
          q.eq("checkoutSessionId", args.checkoutSessionId)
        )
        .first();
    }

    if (!payment) {
      payment = await ctx.db
        .query("stripePayments")
        .withIndex("by_payment_intent", (q) =>
          q.eq("paymentIntentId", args.paymentIntentId)
        )
        .first();
    }

    if (!payment) {
      throw new Error("Paiement non trouvé");
    }

    const now = Date.now();

    // Mettre à jour le paiement
    await ctx.db.patch(payment._id, {
      status: "authorized",
      paymentIntentId: args.paymentIntentId,
      stripeCustomerId: args.stripeCustomerId,
      authorizedAt: now,
      updatedAt: now,
    });

    // Mettre à jour la mission: passer en "upcoming" et planifier auto-capture
    const autoCaptureTime = now + 48 * 60 * 60 * 1000; // +48h

    await ctx.db.patch(payment.missionId, {
      status: "upcoming",
      paymentStatus: "pending", // Fonds bloqués mais pas encore capturés
      autoCaptureScheduledAt: autoCaptureTime,
      updatedAt: now,
    });

    // Envoyer la notification push à l'annonceur (mission confirmée)
    const mission = await ctx.db.get(payment.missionId);
    if (mission) {
      const client = await ctx.db.get(mission.clientId);
      if (client) {
        await ctx.scheduler.runAfter(0, internal.notifications.actions.sendMissionConfirmedNotification, {
          announcerId: mission.announcerId,
          clientName: `${client.firstName} ${client.lastName}`,
          serviceName: mission.serviceName,
          startDate: mission.startDate,
          missionId: payment.missionId,
        });
      }
    }

    return { paymentId: payment._id, missionId: payment.missionId };
  },
});

/**
 * Marquer le paiement comme payé (nouveau flux paiement immédiat)
 * Remplace markPaymentAuthorized pour le nouveau système
 */
export const markPaymentPaid = internalMutation({
  args: {
    paymentIntentId: v.string(),
    stripeCustomerId: v.optional(v.string()),
    cardBrand: v.optional(v.string()),
    cardLast4: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Chercher le paiement par payment intent
    const payment = await ctx.db
      .query("stripePayments")
      .withIndex("by_payment_intent", (q) =>
        q.eq("paymentIntentId", args.paymentIntentId)
      )
      .first();

    if (!payment) {
      // Essayer de trouver par mission ID dans les paiements pending
      console.log("Paiement non trouvé par paymentIntentId, recherche par status pending...");
      // Ce cas peut arriver si le webhook arrive avant que le paymentIntentId soit enregistré
      // On ignore silencieusement car un autre webhook ou mise à jour le gérera
      return;
    }

    const now = Date.now();

    // Mettre à jour le paiement - nouveau status "paid" au lieu de "captured"
    await ctx.db.patch(payment._id, {
      status: "captured", // On garde "captured" pour la rétrocompatibilité du schema
      paymentIntentId: args.paymentIntentId,
      stripeCustomerId: args.stripeCustomerId,
      capturedAt: now, // paidAt serait mieux mais on garde capturedAt pour compatibilité
      updatedAt: now,
    });

    // Mettre à jour la mission: passer en "upcoming" avec paymentStatus = "paid"
    await ctx.db.patch(payment.missionId, {
      status: "upcoming",
      paymentStatus: "paid", // Paiement encaissé immédiatement
      updatedAt: now,
    });

    // Envoyer la notification push à l'annonceur (paiement reçu, mission confirmée)
    const mission = await ctx.db.get(payment.missionId);
    if (mission) {
      const client = await ctx.db.get(mission.clientId);
      if (client) {
        await ctx.scheduler.runAfter(0, internal.notifications.actions.sendMissionConfirmedNotification, {
          announcerId: mission.announcerId,
          clientName: `${client.firstName} ${client.lastName}`,
          serviceName: mission.serviceName,
          startDate: mission.startDate,
          missionId: payment.missionId,
        });
      }

      // Envoyer le reçu de paiement par email au client
      // Vérifier si le reçu n'a pas déjà été envoyé par confirmPaymentSuccess (frontend)
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
          internal.api.email.sendPaymentReceiptEmail,
          {
            clientEmail: client.email,
            clientName: client.firstName,
            serviceName: mission.serviceName,
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
            cardBrand: args.cardBrand || "",
            cardLast4: args.cardLast4 || "",
            emailConfig: {
              apiKey: apiKeyConfig.value,
              fromEmail: fromEmailConfig?.value,
              fromName: fromNameConfig?.value,
            },
            appUrl: appUrlConfig?.value || undefined,
          }
        );

        // Marquer que le reçu a été envoyé pour éviter un double envoi
        await ctx.db.patch(payment._id, {
          receiptEmailSent: true,
        });
      }
    }

    return { paymentId: payment._id, missionId: payment.missionId };
  },
});

/**
 * Marquer le paiement comme capturé
 * @deprecated Utilisé pour la rétrocompatibilité avec les anciens paiements pré-autorisés
 */
export const markPaymentCaptured = internalMutation({
  args: {
    missionId: v.id("missions"),
    paymentIntentId: v.string(),
    receiptUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("stripePayments")
      .withIndex("by_payment_intent", (q) =>
        q.eq("paymentIntentId", args.paymentIntentId)
      )
      .first();

    if (!payment) {
      throw new Error("Paiement non trouvé");
    }

    const now = Date.now();

    await ctx.db.patch(payment._id, {
      status: "captured",
      capturedAt: now,
      receiptUrl: args.receiptUrl,
      updatedAt: now,
    });

    await ctx.db.patch(args.missionId, {
      paymentStatus: "paid",
      updatedAt: now,
    });

    // Envoyer la notification push à l'annonceur (paiement capturé)
    const mission = await ctx.db.get(args.missionId);
    if (mission) {
      const client = await ctx.db.get(mission.clientId);
      if (client) {
        await ctx.scheduler.runAfter(0, internal.notifications.actions.sendPaymentCapturedNotification, {
          announcerId: mission.announcerId,
          clientName: `${client.firstName} ${client.lastName}`,
          amount: payment.announcerEarnings ?? payment.amount, // Montant reçu par l'annonceur
          missionId: args.missionId,
        });
      }
    }
  },
});

/**
 * Marquer le paiement comme annulé
 */
export const markPaymentCancelled = internalMutation({
  args: {
    missionId: v.id("missions"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const mission = await ctx.db.get(args.missionId);
    if (!mission?.stripePaymentId) return;

    const now = Date.now();

    await ctx.db.patch(mission.stripePaymentId, {
      status: "cancelled",
      cancelledAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(args.missionId, {
      paymentStatus: "not_due",
      updatedAt: now,
    });
  },
});

/**
 * Marquer la session comme expirée
 */
export const markSessionExpired = internalMutation({
  args: {
    checkoutSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("stripePayments")
      .withIndex("by_checkout_session", (q) =>
        q.eq("checkoutSessionId", args.checkoutSessionId)
      )
      .first();

    if (!payment) return;

    const now = Date.now();

    await ctx.db.patch(payment._id, {
      status: "expired",
      updatedAt: now,
    });

    // Remettre la mission en "pending_acceptance" pour que l'annonceur puisse réaccepter
    await ctx.db.patch(payment.missionId, {
      status: "pending_acceptance",
      stripePaymentId: undefined,
      updatedAt: now,
    });
  },
});

/**
 * Récupérer les missions éligibles à l'auto-capture
 * (missions terminées depuis 48h avec paiement autorisé mais pas capturé)
 */
export const getMissionsForAutoCapture = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Récupérer les missions completed avec autoCaptureScheduledAt dépassé
    const allMissions = await ctx.db.query("missions").collect();

    const eligibleMissions = allMissions.filter(
      (m) =>
        m.status === "completed" &&
        m.paymentStatus === "pending" &&
        m.autoCaptureScheduledAt &&
        m.autoCaptureScheduledAt <= now &&
        m.stripePaymentId
    );

    // Récupérer les infos de paiement associées
    const results = [];
    for (const mission of eligibleMissions) {
      if (mission.stripePaymentId) {
        const payment = await ctx.db.get(mission.stripePaymentId);
        if (
          payment &&
          payment.status === "authorized" &&
          payment.paymentIntentId
        ) {
          results.push({
            missionId: mission._id,
            paymentIntentId: payment.paymentIntentId,
          });
        }
      }
    }

    return results;
  },
});

/**
 * Nettoyer les sessions de paiement expirées
 */
export const cleanupExpiredSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Récupérer les paiements en statut "pending" dont expiresAt est dépassé
    const expiredPayments = await ctx.db
      .query("stripePayments")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const toCleanup = expiredPayments.filter((p) => p.expiresAt < now);

    for (const payment of toCleanup) {
      await ctx.db.patch(payment._id, {
        status: "expired",
        updatedAt: now,
      });

      // Remettre la mission en "pending_acceptance"
      const mission = await ctx.db.get(payment.missionId);
      if (mission && mission.status === "pending_confirmation") {
        await ctx.db.patch(payment.missionId, {
          status: "pending_acceptance",
          stripePaymentId: undefined,
          updatedAt: now,
        });
      }
    }

    return { cleaned: toCleanup.length };
  },
});

/**
 * Récupérer un paiement par ID de mission
 */
export const getPaymentByMission = internalQuery({
  args: {
    missionId: v.id("missions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("stripePayments")
      .withIndex("by_mission", (q) => q.eq("missionId", args.missionId))
      .first();
  },
});

/**
 * Récupérer les données de la mission et du paiement pour l'email
 */
export const getMissionPaymentData = internalQuery({
  args: {
    missionId: v.id("missions"),
  },
  handler: async (ctx, args) => {
    const mission = await ctx.db.get(args.missionId);
    if (!mission) return null;

    const client = await ctx.db.get(mission.clientId);
    const announcer = await ctx.db.get(mission.announcerId);

    let payment = null;
    if (mission.stripePaymentId) {
      payment = await ctx.db.get(mission.stripePaymentId);
    }

    return {
      mission,
      client,
      announcer,
      payment,
    };
  },
});

/**
 * Marquer le paiement comme remboursé
 */
export const markPaymentRefunded = internalMutation({
  args: {
    paymentIntentId: v.string(),
    refundedAmount: v.number(),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("stripePayments")
      .withIndex("by_payment_intent", (q) =>
        q.eq("paymentIntentId", args.paymentIntentId)
      )
      .first();

    if (!payment) {
      console.log("Paiement non trouvé pour remboursement:", args.paymentIntentId);
      return;
    }

    const now = Date.now();

    await ctx.db.patch(payment._id, {
      status: "refunded" as any,
      refundedAt: now,
      refundedAmount: args.refundedAmount,
      updatedAt: now,
    });

    // Mettre à jour la mission
    await ctx.db.patch(payment.missionId, {
      paymentStatus: "refunded",
      updatedAt: now,
    });
  },
});

/**
 * Mettre à jour le statut du remboursement Stripe (refund.created/updated/failed)
 */
export const updateRefundStatus = internalMutation({
  args: {
    paymentIntentId: v.string(),
    refundStatus: v.union(
      v.literal("pending"),
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("requires_action"),
      v.literal("canceled"),
    ),
    refundStripeId: v.optional(v.string()),
    failureReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("stripePayments")
      .withIndex("by_payment_intent", (q) =>
        q.eq("paymentIntentId", args.paymentIntentId)
      )
      .first();

    if (!payment) {
      console.log("Paiement non trouvé pour updateRefundStatus:", args.paymentIntentId);
      return;
    }

    const now = Date.now();

    await ctx.db.patch(payment._id, {
      refundStatus: args.refundStatus,
      ...(args.refundStripeId && { refundStripeId: args.refundStripeId }),
      ...(args.failureReason && { refundFailureReason: args.failureReason }),
      updatedAt: now,
    });
  },
});

/**
 * Marquer le transfert comme créé (virement vers annonceur initié)
 */
export const markTransferCreated = internalMutation({
  args: {
    missionId: v.id("missions"),
    transferId: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const mission = await ctx.db.get(args.missionId);
    if (!mission?.stripePaymentId) return;

    const now = Date.now();

    await ctx.db.patch(mission.stripePaymentId, {
      transferId: args.transferId,
      transferAmount: args.amount,
      transferCreatedAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(args.missionId, {
      announcerPaymentStatus: "pending",
      updatedAt: now,
    });
  },
});

/**
 * Mettre à jour le statut du compte Stripe Connect d'un annonceur
 */
export const updateConnectAccountStatus = internalMutation({
  args: {
    stripeAccountId: v.string(),
    chargesEnabled: v.boolean(),
    payoutsEnabled: v.boolean(),
    detailsSubmitted: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Trouver l'utilisateur avec ce compte Stripe
    const users = await ctx.db.query("users").collect();
    const user = users.find((u: any) => u.stripeAccountId === args.stripeAccountId);

    if (!user) {
      console.log("Utilisateur non trouvé pour compte Stripe:", args.stripeAccountId);
      return;
    }

    const now = Date.now();

    await ctx.db.patch(user._id, {
      stripeChargesEnabled: args.chargesEnabled,
      stripePayoutsEnabled: args.payoutsEnabled,
      stripeDetailsSubmitted: args.detailsSubmitted,
      stripeAccountUpdatedAt: now,
      updatedAt: now,
    });

    console.log(`Compte Connect ${args.stripeAccountId} mis à jour pour user ${user._id}`);
  },
});

/**
 * Déclencher l'auto-capture des paiements (appelé par cron)
 * Cette mutation récupère les configs et planifie les captures
 * (contourne le bug ctx.runQuery dans les actions sur Convex self-hosted)
 *
 * Gère 2 cas :
 * 1. Legacy pré-autorisation (payment.status === "authorized") → capture manuelle
 * 2. Paiement immédiat déjà capturé mais DB pas à jour → sync le statut
 */
export const triggerAutoCapture = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("=== triggerAutoCapture START ===");
    const now = Date.now();

    // Récupérer la clé Stripe
    const stripeSecretKeyConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "stripe_secret_key"))
      .first();

    if (!stripeSecretKeyConfig?.value) {
      console.log("Stripe non configuré - clé secrète manquante");
      return { scheduled: 0, synced: 0 };
    }

    // Utiliser l'index by_auto_capture au lieu de charger toutes les missions
    const missionsWithAutoCapture = await ctx.db
      .query("missions")
      .withIndex("by_auto_capture")
      .collect();

    // Filtrer les missions éligibles (autoCaptureScheduledAt dépassé + status/paymentStatus cohérents)
    const eligibleMissions = missionsWithAutoCapture.filter(
      (m) =>
        m.autoCaptureScheduledAt &&
        m.autoCaptureScheduledAt <= now &&
        m.stripePaymentId &&
        (
          // Cas 1 : paiement en attente (legacy pré-autorisation OU DB pas sync)
          (m.status === "completed" && m.paymentStatus === "pending") ||
          // Cas 2 : mission upcoming avec paymentStatus pending (désynchronisation)
          (m.status === "upcoming" && m.paymentStatus === "pending")
        )
    );

    if (eligibleMissions.length === 0) {
      console.log("Auto-capture: aucune mission éligible");
      return { scheduled: 0, synced: 0 };
    }

    console.log(`Auto-capture: ${eligibleMissions.length} missions éligibles`);

    let scheduled = 0;
    let synced = 0;

    for (const mission of eligibleMissions) {
      if (!mission.stripePaymentId) continue;

      const payment = await ctx.db.get(mission.stripePaymentId);
      if (!payment || !payment.paymentIntentId) continue;

      if (payment.status === "authorized") {
        // Pré-autorisation legacy → planifier la capture (vérifiera le statut Stripe avant)
        await ctx.scheduler.runAfter(0, internal.api.stripe.capturePayment, {
          paymentIntentId: payment.paymentIntentId,
          missionId: mission._id,
          stripeSecretKey: stripeSecretKeyConfig.value,
        });
        scheduled++;
        console.log(`Auto-capture planifiée pour mission ${mission._id}`);
      } else if (payment.status === "captured" && mission.paymentStatus === "pending") {
        // DB désynchronisée : le paiement est capturé mais la mission dit "pending"
        await ctx.db.patch(mission._id, {
          paymentStatus: "paid",
          updatedAt: now,
        });
        synced++;
        console.log(`Sync paymentStatus → paid pour mission ${mission._id}`);
      } else if (payment.status === "pending") {
        // Paiement jamais confirmé mais autoCaptureScheduledAt dépassé → vérifier côté Stripe
        await ctx.scheduler.runAfter(0, internal.api.stripe.capturePayment, {
          paymentIntentId: payment.paymentIntentId,
          missionId: mission._id,
          stripeSecretKey: stripeSecretKeyConfig.value,
        });
        scheduled++;
        console.log(`Vérification/capture planifiée pour mission ${mission._id} (payment pending)`);
      }
    }

    console.log(`=== triggerAutoCapture END: ${scheduled} planifiées, ${synced} synchronisées ===`);
    return { scheduled, synced };
  },
});
