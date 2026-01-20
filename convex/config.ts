import { query } from "./_generated/server";

/**
 * Query publique: Récupérer la configuration Cloudinary
 * Ne retourne que les informations nécessaires pour l'upload côté client
 * (pas le secret API)
 */
export const getCloudinaryConfig = query({
  args: {},
  handler: async (ctx) => {
    const cloudName = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "cloudinary_cloud_name"))
      .first();

    const apiKey = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "cloudinary_api_key"))
      .first();

    const uploadPreset = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "cloudinary_upload_preset"))
      .first();

    if (!cloudName?.value || !apiKey?.value) {
      return null;
    }

    return {
      cloudName: cloudName.value,
      apiKey: apiKey.value,
      uploadPreset: uploadPreset?.value || "animigo_unsigned",
    };
  },
});

/**
 * Query publique: Récupérer l'URL de l'application
 */
export const getAppUrl = query({
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
 * Query publique: Récupérer la clé publique Stripe
 */
export const getStripePublicKey = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "stripe_public_key"))
      .first();

    return config?.value || null;
  },
});
