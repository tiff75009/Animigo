// @ts-nocheck
import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

/**
 * Enregistre un log SMS en base
 */
export const logSms = internalMutation({
  args: {
    to: v.string(),
    content: v.string(),
    type: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed"), v.literal("pending"), v.literal("delivered")),
    provider: v.union(v.literal("brevo"), v.literal("octopush")),
    messageId: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    missionId: v.optional(v.id("missions")),
    userId: v.optional(v.id("users")),
    creditsUsed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("smsLogs", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

/**
 * Récupère la config SMS depuis systemConfig
 */
export const getSmsConfig = internalQuery({
  args: {},
  handler: async (ctx) => {
    const [smsEnabled, smsSender, brevoApiKey] = await Promise.all([
      ctx.db.query("systemConfig").withIndex("by_key", (q) => q.eq("key", "brevo_sms_enabled")).first(),
      ctx.db.query("systemConfig").withIndex("by_key", (q) => q.eq("key", "brevo_sms_sender")).first(),
      ctx.db.query("systemConfig").withIndex("by_key", (q) => q.eq("key", "brevo_api_key")).first(),
    ]);

    return {
      enabled: smsEnabled?.value === "true",
      sender: smsSender?.value || "Animigo",
      brevoApiKey: brevoApiKey?.value || null,
    };
  },
});
