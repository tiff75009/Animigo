// @ts-nocheck
import { internalQuery } from "../_generated/server";

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
