// @ts-nocheck
import { internalMutation, mutation } from "../_generated/server";
import { v } from "convex/values";

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
