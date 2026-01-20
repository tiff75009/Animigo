// @ts-nocheck
import { internalMutation, internalQuery } from "../_generated/server";
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
 * Créer un enregistrement de paiement
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
 * Marquer le paiement comme autorisé (pré-autorisation réussie)
 */
export const markPaymentAuthorized = internalMutation({
  args: {
    checkoutSessionId: v.string(),
    paymentIntentId: v.string(),
    stripeCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("stripePayments")
      .withIndex("by_checkout_session", (q) =>
        q.eq("checkoutSessionId", args.checkoutSessionId)
      )
      .first();

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

    return { paymentId: payment._id, missionId: payment.missionId };
  },
});

/**
 * Marquer le paiement comme capturé
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
      return { processed: 0, errors: 0, total: 0, error: "Stripe non configuré" };
    }

    // Récupérer les missions éligibles à l'auto-capture
    const allMissions = await ctx.db.query("missions").collect();

    const eligibleMissions = allMissions.filter(
      (m) =>
        m.status === "completed" &&
        m.paymentStatus === "pending" &&
        m.autoCaptureScheduledAt &&
        m.autoCaptureScheduledAt <= now &&
        m.stripePaymentId
    );

    console.log(`Auto-capture: ${eligibleMissions.length} missions éligibles`);

    // Récupérer les infos de paiement et planifier les captures
    let scheduled = 0;
    for (const mission of eligibleMissions) {
      if (mission.stripePaymentId) {
        const payment = await ctx.db.get(mission.stripePaymentId);
        if (
          payment &&
          payment.status === "authorized" &&
          payment.paymentIntentId
        ) {
          // Planifier la capture avec la clé Stripe
          await ctx.scheduler.runAfter(0, internal.api.stripe.capturePayment, {
            paymentIntentId: payment.paymentIntentId,
            missionId: mission._id,
            stripeSecretKey: stripeSecretKeyConfig.value,
          });
          scheduled++;
          console.log(`Auto-capture planifiée pour mission ${mission._id}`);
        }
      }
    }

    return { processed: 0, errors: 0, total: eligibleMissions.length, scheduled };
  },
});
