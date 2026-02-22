// @ts-nocheck
import { internalQuery } from "../_generated/server";

// Récupérer le secret webhook Brevo depuis systemConfig
export const getBrevoWebhookSecret = internalQuery({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "brevo_webhook_secret"))
      .first();
    return config?.value || null;
  },
});
