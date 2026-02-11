// @ts-nocheck
import { internalMutation, mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Sauvegarde une carte bancaire (appelée par webhook setup_intent.succeeded ou payment_intent.succeeded)
 */
export const savePaymentMethodByCustomer = internalMutation({
  args: {
    stripeCustomerId: v.string(),
    stripePaymentMethodId: v.string(),
    brand: v.string(),
    last4: v.string(),
    expMonth: v.number(),
    expYear: v.number(),
  },
  handler: async (ctx, args) => {
    // Trouver l'utilisateur par stripeCustomerId
    const user = await ctx.db
      .query("users")
      .withIndex("by_stripe_customer", (q) => q.eq("stripeCustomerId", args.stripeCustomerId))
      .first();

    if (!user) {
      console.error("savePaymentMethodByCustomer: utilisateur non trouvé pour customer", args.stripeCustomerId);
      return;
    }

    // Vérifier que la carte n'existe pas déjà
    const existing = await ctx.db
      .query("savedPaymentMethods")
      .withIndex("by_stripe_pm", (q) => q.eq("stripePaymentMethodId", args.stripePaymentMethodId))
      .first();

    if (existing) {
      console.log("Carte déjà enregistrée:", args.stripePaymentMethodId);
      return;
    }

    // Si première carte du user → isDefault: true
    const existingCards = await ctx.db
      .query("savedPaymentMethods")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const isDefault = existingCards.length === 0;
    const now = Date.now();

    await ctx.db.insert("savedPaymentMethods", {
      userId: user._id,
      stripePaymentMethodId: args.stripePaymentMethodId,
      brand: args.brand,
      last4: args.last4,
      expMonth: args.expMonth,
      expYear: args.expYear,
      isDefault,
      createdAt: now,
      updatedAt: now,
    });

    console.log(`Carte ${args.brand} •••• ${args.last4} sauvegardée pour user ${user._id} (default: ${isDefault})`);
  },
});

/**
 * Sauvegarde le stripeCustomerId sur le user (appelé via API HTTP depuis une action)
 */
export const setStripeCustomerId = mutation({
  args: {
    userId: v.string(),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId as any);
    if (!user) {
      throw new Error("Utilisateur non trouvé");
    }

    await ctx.db.patch(user._id, {
      stripeCustomerId: args.stripeCustomerId,
      updatedAt: Date.now(),
    });

    console.log(`stripeCustomerId ${args.stripeCustomerId} enregistré pour user ${user._id}`);
  },
});

/**
 * Stocke temporairement le clientSecret du SetupIntent sur le user
 */
export const setSetupIntentSecret = mutation({
  args: {
    userId: v.string(),
    setupIntentSecret: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId as any);
    if (!user) {
      throw new Error("Utilisateur non trouvé");
    }

    await ctx.db.patch(user._id, {
      pendingSetupIntentSecret: args.setupIntentSecret,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Nettoie le clientSecret temporaire
 */
export const clearSetupIntentSecret = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId as any);
    if (!user) return;

    await ctx.db.patch(user._id, {
      pendingSetupIntentSecret: undefined,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Supprime une carte par son stripePaymentMethodId (pour webhook)
 */
export const removePaymentMethodByStripeId = internalMutation({
  args: {
    stripePaymentMethodId: v.string(),
  },
  handler: async (ctx, args) => {
    const card = await ctx.db
      .query("savedPaymentMethods")
      .withIndex("by_stripe_pm", (q) => q.eq("stripePaymentMethodId", args.stripePaymentMethodId))
      .first();

    if (card) {
      await ctx.db.delete(card._id);
      console.log("Carte supprimée:", args.stripePaymentMethodId);
    }
  },
});
