// @ts-nocheck
import { action, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin, requireAdminAction } from "./utils";
import { internal } from "../_generated/api";

// Query: Lire une configuration
export const getConfig = query({
  args: {
    token: v.string(),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    return config;
  },
});

// Query: Toutes les configurations
export const getAllConfigs = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const configs = await ctx.db.query("systemConfig").collect();

    // Les admins peuvent voir toutes les valeurs (y compris les secrets)
    return configs;
  },
});

// Mutation: Mettre à jour une configuration
export const updateConfig = mutation({
  args: {
    token: v.string(),
    key: v.string(),
    value: v.string(),
    isSecret: v.optional(v.boolean()),
    environment: v.optional(
      v.union(v.literal("development"), v.literal("production"))
    ),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    const existing = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        isSecret: args.isSecret ?? existing.isSecret,
        environment: args.environment ?? existing.environment,
        updatedAt: Date.now(),
        updatedBy: user._id,
      });
    } else {
      await ctx.db.insert("systemConfig", {
        key: args.key,
        value: args.value,
        isSecret: args.isSecret ?? false,
        environment: args.environment ?? "development",
        updatedAt: Date.now(),
        updatedBy: user._id,
      });
    }

    return { success: true };
  },
});

// Mutation: Supprimer une configuration
export const deleteConfig = mutation({
  args: {
    token: v.string(),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (config) {
      await ctx.db.delete(config._id);
    }

    return { success: true };
  },
});

// Query publique: Vérifier si la modération des services est activée
export const isServiceModerationEnabled = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "service_moderation_enabled"))
      .first();

    // Par défaut, la modération est désactivée
    return config?.value === "true";
  },
});

// Query publique: Récupérer la configuration de tarification (durée journée/demi-journée)
export const getWorkdayConfig = query({
  args: {},
  handler: async (ctx) => {
    const workdayConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "workday_hours"))
      .first();

    const workdayHours = workdayConfig ? parseInt(workdayConfig.value, 10) : 8;
    const halfDayHours = Math.round(workdayHours / 2);

    return {
      workdayHours,
      halfDayHours,
    };
  },
});

// Mutation: Toggle la modération des services
export const toggleServiceModeration = mutation({
  args: {
    token: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    const existing = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "service_moderation_enabled"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.enabled ? "true" : "false",
        updatedAt: Date.now(),
        updatedBy: user._id,
      });
    } else {
      await ctx.db.insert("systemConfig", {
        key: "service_moderation_enabled",
        value: args.enabled ? "true" : "false",
        isSecret: false,
        environment: "production",
        updatedAt: Date.now(),
        updatedBy: user._id,
      });
    }

    return { success: true, enabled: args.enabled };
  },
});

// Action: Tester la connexion Stripe
export const testStripeConnection = action({
  args: {
    token: v.string(),
    secretKey: v.string(), // La clé est passée depuis le frontend
  },
  handler: async (ctx, args) => {
    await requireAdminAction(ctx, args.token);

    const result = await ctx.runAction(internal.api.stripe.testConnection, {
      secretKey: args.secretKey,
    });

    return result;
  },
});

// Action: Tester la connexion QStash
export const testQStashConnection = action({
  args: {
    token: v.string(),
    qstashToken: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    message?: string;
    messageId?: string;
    error?: string;
  }> => {
    await requireAdminAction(ctx, args.token);

    try {
      // Test: vérifier que le token est valide en appelant l'API QStash
      const response = await fetch("https://qstash.upstash.io/v2/publish/https://httpstat.us/200", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${args.qstashToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ test: true }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Erreur API (${response.status}): ${errorText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        message: "Connexion QStash OK",
        messageId: data.messageId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      };
    }
  },
});

// ==========================================
// VERIFICATION D'IDENTITE
// ==========================================

// Query: Récupérer les paramètres de vérification d'identité
export const getVerificationSettings = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const autoVerifyEnabled = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "identity_auto_verify_enabled"))
      .first();

    const confidenceThreshold = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "identity_confidence_threshold"))
      .first();

    return {
      autoVerifyEnabled: autoVerifyEnabled?.value === "true",
      confidenceThreshold: confidenceThreshold ? parseInt(confidenceThreshold.value, 10) : 80,
    };
  },
});

// Query publique: Récupérer les paramètres de vérification (pour l'action auto-verify)
export const getVerificationSettingsPublic = query({
  args: {},
  handler: async (ctx) => {
    const autoVerifyEnabled = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "identity_auto_verify_enabled"))
      .first();

    const confidenceThreshold = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "identity_confidence_threshold"))
      .first();

    return {
      autoVerifyEnabled: autoVerifyEnabled?.value === "true",
      confidenceThreshold: confidenceThreshold ? parseInt(confidenceThreshold.value, 10) : 80,
    };
  },
});

// Mutation: Mettre à jour les paramètres de vérification d'identité
export const updateVerificationSettings = mutation({
  args: {
    token: v.string(),
    autoVerifyEnabled: v.boolean(),
    confidenceThreshold: v.number(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    // Valider le seuil (entre 50 et 100)
    const threshold = Math.min(100, Math.max(50, args.confidenceThreshold));

    // Mise à jour auto_verify_enabled
    const existingEnabled = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "identity_auto_verify_enabled"))
      .first();

    if (existingEnabled) {
      await ctx.db.patch(existingEnabled._id, {
        value: args.autoVerifyEnabled ? "true" : "false",
        updatedAt: Date.now(),
        updatedBy: user._id,
      });
    } else {
      await ctx.db.insert("systemConfig", {
        key: "identity_auto_verify_enabled",
        value: args.autoVerifyEnabled ? "true" : "false",
        isSecret: false,
        environment: "production",
        updatedAt: Date.now(),
        updatedBy: user._id,
      });
    }

    // Mise à jour confidence_threshold
    const existingThreshold = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "identity_confidence_threshold"))
      .first();

    if (existingThreshold) {
      await ctx.db.patch(existingThreshold._id, {
        value: threshold.toString(),
        updatedAt: Date.now(),
        updatedBy: user._id,
      });
    } else {
      await ctx.db.insert("systemConfig", {
        key: "identity_confidence_threshold",
        value: threshold.toString(),
        isSecret: false,
        environment: "production",
        updatedAt: Date.now(),
        updatedBy: user._id,
      });
    }

    return { success: true, autoVerifyEnabled: args.autoVerifyEnabled, confidenceThreshold: threshold };
  },
});

// ==========================================
// MODE MAINTENANCE
// ==========================================

// Query publique: Vérifier si le mode maintenance est activé
export const isMaintenanceModeEnabled = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "maintenance_mode_enabled"))
      .first();

    // Par défaut, le mode maintenance est désactivé
    return config?.value === "true";
  },
});

// Mutation admin: Toggle le mode maintenance
export const toggleMaintenanceMode = mutation({
  args: {
    token: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    const existing = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "maintenance_mode_enabled"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.enabled ? "true" : "false",
        updatedAt: Date.now(),
        updatedBy: user._id,
      });
    } else {
      await ctx.db.insert("systemConfig", {
        key: "maintenance_mode_enabled",
        value: args.enabled ? "true" : "false",
        isSecret: false,
        environment: "production",
        updatedAt: Date.now(),
        updatedBy: user._id,
      });
    }

    return { success: true, enabled: args.enabled };
  },
});
