// @ts-nocheck
"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

// Helper pour récupérer la config Infobip depuis systemConfig
async function getInfobipConfig(ctx: any) {
  const apiKey = await ctx.runQuery(internal.api.smsInternal.getConfigValue, { key: "infobip_api_key" });
  const baseUrl = await ctx.runQuery(internal.api.smsInternal.getConfigValue, { key: "infobip_base_url" });
  const appId = await ctx.runQuery(internal.api.smsInternal.getConfigValue, { key: "infobip_app_id" });
  const messageId = await ctx.runQuery(internal.api.smsInternal.getConfigValue, { key: "infobip_message_id" });

  // Log détaillé pour debug
  const missing = [];
  if (!apiKey) missing.push("infobip_api_key");
  if (!baseUrl) missing.push("infobip_base_url");
  if (!appId) missing.push("infobip_app_id");
  if (!messageId) missing.push("infobip_message_id");

  if (missing.length > 0) {
    console.error(`Infobip: config incomplète. Champs manquants: ${missing.join(", ")}`);
    return null;
  }

  // Nettoyer le baseUrl : enlever https://, espaces, slashes finaux
  let cleanBaseUrl = baseUrl.trim();
  cleanBaseUrl = cleanBaseUrl.replace(/^https?:\/\//, "");
  cleanBaseUrl = cleanBaseUrl.replace(/\/+$/, "");

  // Valider que le baseUrl ressemble à une URL Infobip
  if (!cleanBaseUrl.includes(".api.infobip.com") && !cleanBaseUrl.includes("infobip")) {
    console.error(`Infobip base URL invalide: "${cleanBaseUrl}". Attendu: xxxxx.api.infobip.com`);
    return null;
  }

  return { apiKey, baseUrl: cleanBaseUrl, appId, messageId };
}

// Normaliser un numéro français : "06 12 34 56 78" → "+33612345678"
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\s/g, "").replace(/\D/g, "");

  if (digits.startsWith("0") && digits.length === 10) {
    return "+33" + digits.slice(1);
  }
  if (digits.startsWith("33") && digits.length === 11) {
    return "+" + digits;
  }
  if (phone.startsWith("+33")) {
    return phone.replace(/\s/g, "");
  }
  return "+33" + digits;
}

// Action publique : Envoyer un code de vérification SMS
export const sendPhoneVerification = action({
  args: {
    phone: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; pinId?: string; error?: string }> => {
    try {
      const config = await getInfobipConfig(ctx);
      if (!config) {
        return { success: false, error: "Service SMS non configuré. Configurez Infobip dans Admin > Intégrations (les 4 champs sont requis)." };
      }

      console.log(`Infobip config OK: baseUrl=${config.baseUrl}, appId=${config.appId}, messageId=${config.messageId}`);

      const normalizedPhone = normalizePhone(args.phone);

      // Rate limit : max 3 envois par numéro en 15 min
      const recentAttempts = await ctx.runQuery(internal.api.smsInternal.getRecentAttempts, {
        phone: normalizedPhone,
        since: Date.now() - 15 * 60 * 1000,
      });

      if (recentAttempts >= 3) {
        return { success: false, error: "Trop de tentatives. Réessayez dans quelques minutes." };
      }

      const url = `https://${config.baseUrl}/2fa/2/pin`;
      console.log(`Infobip SMS: envoi vers ${normalizedPhone} via ${url}`);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `App ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicationId: config.appId,
          messageId: config.messageId,
          to: normalizedPhone,
        }),
      });

      // Vérifier que la réponse est bien du JSON (pas une page HTML)
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/html")) {
        console.error(`Infobip API a retourné du HTML au lieu de JSON. URL appelée: ${url}. Vérifiez la valeur de infobip_base_url (attendu: xxxxx.api.infobip.com)`);
        return { success: false, error: "Configuration Infobip incorrecte (URL invalide)" };
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Infobip API error:", response.status, errorText);
        return { success: false, error: `Erreur d'envoi SMS (${response.status})` };
      }

      const data = await response.json();
      const pinId = data.pinId;

      if (!pinId) {
        console.error("Infobip API: pas de pinId dans la réponse", data);
        return { success: false, error: "Réponse Infobip invalide" };
      }

      // Enregistrer la tentative
      await ctx.runMutation(internal.api.smsInternal.insertAttempt, {
        phone: normalizedPhone,
        pinId,
      });

      return { success: true, pinId };
    } catch (error: any) {
      console.error("sendPhoneVerification error:", error?.message || error);
      return { success: false, error: "Impossible d'envoyer le SMS. Vérifiez la configuration Infobip." };
    }
  },
});

// Action publique : Vérifier le code SMS
export const verifyPhoneCode = action({
  args: {
    pinId: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; verified?: boolean; error?: string }> => {
    try {
      const config = await getInfobipConfig(ctx);
      if (!config) {
        return { success: false, error: "Service SMS non configuré" };
      }

      const url = `https://${config.baseUrl}/2fa/2/pin/${args.pinId}/verify`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `App ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pin: args.code,
        }),
      });

      // Vérifier que la réponse est bien du JSON
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/html")) {
        console.error(`Infobip verify: réponse HTML reçue. URL: ${url}`);
        return { success: false, error: "Configuration Infobip incorrecte" };
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Infobip verify error:", response.status, errorText);

        if (response.status === 401 || response.status === 400) {
          return { success: false, error: "Code incorrect" };
        }
        return { success: false, error: "Erreur de vérification" };
      }

      const data = await response.json();

      if (data.verified) {
        await ctx.runMutation(internal.api.smsInternal.markVerified, {
          pinId: args.pinId,
        });
        return { success: true, verified: true };
      }

      return { success: false, error: "Code incorrect" };
    } catch (error: any) {
      console.error("verifyPhoneCode error:", error?.message || error);
      return { success: false, error: "Impossible de vérifier le code" };
    }
  },
});
