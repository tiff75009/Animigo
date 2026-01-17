import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./utils";

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

    return configs.map((c) => ({
      ...c,
      value: c.isSecret ? "********" : c.value, // Masquer les secrets
    }));
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
