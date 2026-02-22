// @ts-nocheck
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Traite un événement webhook Brevo et met à jour le log email correspondant.
 *
 * Événements Brevo gérés :
 * - delivered, request, deferred
 * - click, open (unique_opened)
 * - invalid_email, soft_bounce, hard_bounce, complaint
 * - unsubscribed, blocked, error
 */
export const processBrevoEvent = internalMutation({
  args: {
    event: v.string(),
    messageId: v.string(),
    email: v.optional(v.string()),
    date: v.optional(v.string()),
    reason: v.optional(v.string()),
    tag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Chercher le log email par brevoMessageId
    const emailLog = await ctx.db
      .query("emailLogs")
      .withIndex("by_brevo_message_id", (q) => q.eq("brevoMessageId", args.messageId))
      .first();

    if (!emailLog) {
      console.log(`[Brevo Webhook] No email log found for messageId: ${args.messageId}`);
      return;
    }

    const now = Date.now();
    const eventDate = args.date ? new Date(args.date).getTime() : now;

    const updates: Record<string, unknown> = {};

    switch (args.event) {
      case "delivered":
      case "request":
        updates.status = "delivered";
        updates.deliveredAt = eventDate;
        break;

      case "open":
      case "unique_opened":
        updates.status = "opened";
        updates.openedAt = eventDate;
        if (!emailLog.firstOpenedAt) {
          updates.firstOpenedAt = eventDate;
        }
        break;

      case "click":
        updates.status = "clicked";
        updates.clickedAt = eventDate;
        break;

      case "hard_bounce":
      case "soft_bounce":
      case "invalid_email":
        updates.status = "bounced";
        updates.bouncedAt = eventDate;
        updates.bouncedReason = args.reason || args.event;
        break;

      case "complaint":
        updates.status = "complained";
        updates.complainedAt = eventDate;
        break;

      case "blocked":
      case "error":
        updates.status = "blocked";
        updates.bouncedReason = args.reason || args.event;
        break;

      case "unsubscribed":
        // On ne change pas le statut, juste un log
        console.log(`[Brevo Webhook] Unsubscribed: ${args.email}`);
        return;

      case "deferred":
        // Temporaire, pas de changement de statut
        console.log(`[Brevo Webhook] Deferred: ${args.messageId}`);
        return;

      default:
        console.log(`[Brevo Webhook] Unknown event: ${args.event}`);
        return;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(emailLog._id, updates);
      console.log(`[Brevo Webhook] Updated emailLog ${emailLog._id}: ${args.event}`);
    }
  },
});
