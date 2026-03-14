// @ts-nocheck
import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

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
