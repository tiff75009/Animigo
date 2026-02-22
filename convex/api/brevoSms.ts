// @ts-nocheck
"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

/**
 * Normalise un numéro de téléphone FR pour Brevo SMS.
 * Brevo attend le format "33612345678" (sans +).
 */
function normalizePhoneForBrevo(phone: string): string {
  let cleaned = phone.replace(/[\s\-.()]/g, "");
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    cleaned = "33" + cleaned.substring(1);
  }
  return cleaned;
}

/**
 * Envoie un SMS via l'API Brevo Transactional SMS.
 * POST https://api.brevo.com/v3/transactionalSMS/sms
 */
export const sendSmsViaBrevo = internalAction({
  args: {
    to: v.string(), // Numéro de téléphone (format FR ou international)
    content: v.string(), // Contenu du SMS (max ~160 chars pour 1 SMS)
    type: v.string(), // Type de SMS pour le log
    sender: v.string(), // Nom de l'expéditeur (max 11 chars)
    brevoApiKey: v.string(),
    missionId: v.optional(v.id("missions")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const normalizedPhone = normalizePhoneForBrevo(args.to);

    try {
      const response = await fetch("https://api.brevo.com/v3/transactionalSMS/sms", {
        method: "POST",
        headers: {
          "api-key": args.brevoApiKey,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          type: "transactional",
          unicodeEnabled: true,
          sender: args.sender.substring(0, 11),
          recipient: normalizedPhone,
          content: args.content,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`[Brevo SMS] Sent to ${normalizedPhone}: messageId=${result.messageId}`);

        await ctx.runMutation(internal.api.brevoSmsInternal.logSms, {
          to: normalizedPhone,
          content: args.content,
          type: args.type,
          status: "sent",
          provider: "brevo",
          messageId: String(result.messageId || ""),
          missionId: args.missionId,
          userId: args.userId,
          creditsUsed: result.remainingCredits !== undefined ? 1 : undefined,
        });

        return { success: true, messageId: result.messageId };
      }

      const errorText = await response.text();
      console.error(`[Brevo SMS] Failed (${response.status}): ${errorText}`);

      await ctx.runMutation(internal.api.brevoSmsInternal.logSms, {
        to: normalizedPhone,
        content: args.content,
        type: args.type,
        status: "failed",
        provider: "brevo",
        errorMessage: `${response.status}: ${errorText}`,
        missionId: args.missionId,
        userId: args.userId,
      });

      return { success: false, error: errorText };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[Brevo SMS] Exception: ${msg}`);

      await ctx.runMutation(internal.api.brevoSmsInternal.logSms, {
        to: normalizedPhone,
        content: args.content,
        type: args.type,
        status: "failed",
        provider: "brevo",
        errorMessage: msg,
        missionId: args.missionId,
        userId: args.userId,
      });

      return { success: false, error: msg };
    }
  },
});
