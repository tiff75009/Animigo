// @ts-nocheck
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { getEmailConfigFromDb } from "./emailInternal";

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
      // Ce cas peut arriver si le webhook arrive avant que le paymentIntentId soit enregistré
      // On ignore silencieusement car un autre webhook ou mise à jour le gérera
      console.log("Paiement non trouvé par paymentIntentId, recherche par status pending...");
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

      // Générer le reçu PDF client + envoyer l'email avec PDF en pièce jointe
      // (l'email d'avant a été déplacé dans generateClientReceipt pour pouvoir
      //  attacher le PDF généré — ne plus envoyer ici)
      const freshPayment = await ctx.db.get(payment._id);
      const receiptAlreadySent = freshPayment?.receiptEmailSent === true;
      if (!receiptAlreadySent) {
        await ctx.scheduler.runAfter(0, internal.api.clientReceiptQueries.prepareAndDispatchClientReceipt, {
          missionId: payment.missionId,
          paymentIntentId: args.paymentIntentId,
          cardBrand: args.cardBrand,
          cardLast4: args.cardLast4,
        });
        // Pre-marquer comme envoyé pour éviter un double envoi
        await ctx.db.patch(payment._id, { receiptEmailSent: true });
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
