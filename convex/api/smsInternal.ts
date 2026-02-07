import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

// Query interne : récupérer une valeur de config
export const getConfigValue = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    return config?.value ?? null;
  },
});

// Query interne : compter les tentatives récentes pour un numéro
export const getRecentAttempts = internalQuery({
  args: {
    phone: v.string(),
    since: v.number(),
  },
  handler: async (ctx, args) => {
    const attempts = await ctx.db
      .query("phoneVerificationAttempts")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .collect();

    return attempts.filter((a) => a.createdAt >= args.since).length;
  },
});

// Mutation interne : insérer une tentative
export const insertAttempt = internalMutation({
  args: {
    phone: v.string(),
    pinId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("phoneVerificationAttempts", {
      phone: args.phone,
      pinId: args.pinId,
      createdAt: Date.now(),
      verified: false,
    });
  },
});

// Mutation interne : marquer une tentative comme vérifiée
export const markVerified = internalMutation({
  args: {
    pinId: v.string(),
  },
  handler: async (ctx, args) => {
    const attempt = await ctx.db
      .query("phoneVerificationAttempts")
      .withIndex("by_pinId", (q) => q.eq("pinId", args.pinId))
      .first();

    if (attempt) {
      await ctx.db.patch(attempt._id, { verified: true });
    }
  },
});
