// @ts-nocheck
import { internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";

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
