// @ts-nocheck
// PAS de "use node" — fetch est disponible dans le runtime V8 Convex
// et ctx.runQuery/ctx.runMutation fonctionnent mieux sans "use node" sur self-hosted

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

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
    // Config Infobip passée depuis le frontend (contourne le bug ctx.runQuery sur self-hosted)
    infobipConfig: v.optional(v.object({
      apiKey: v.string(),
      baseUrl: v.string(),
      appId: v.string(),
      messageId: v.string(),
    })),
  },
  handler: async (ctx, args): Promise<{ success: boolean; pinId?: string; error?: string }> => {
    try {
      // Utiliser la config passée en argument (le frontend la récupère via getInfobipConfig query)
      let config = args.infobipConfig;

      // Fallback : essayer de lire depuis la DB (fonctionne si pas en "use node")
      if (!config) {
        try {
          const apiKey = await ctx.runQuery(internal.api.smsInternal.getConfigValue, { key: "infobip_api_key" });
          const baseUrl = await ctx.runQuery(internal.api.smsInternal.getConfigValue, { key: "infobip_base_url" });
          const appId = await ctx.runQuery(internal.api.smsInternal.getConfigValue, { key: "infobip_app_id" });
          const messageId = await ctx.runQuery(internal.api.smsInternal.getConfigValue, { key: "infobip_message_id" });

          if (apiKey && baseUrl && appId && messageId) {
            config = { apiKey, baseUrl, appId, messageId };
          }
        } catch (e) {
          console.warn("Fallback ctx.runQuery failed (self-hosted bug), using args only");
        }
      }

      if (!config) {
        return { success: false, error: "Service SMS non configuré. Configurez Infobip dans Admin > Intégrations (les 4 champs sont requis)." };
      }

      // Nettoyer le baseUrl : enlever https://, espaces, slashes finaux
      let cleanBaseUrl = config.baseUrl.trim();
      cleanBaseUrl = cleanBaseUrl.replace(/^https?:\/\//, "");
      cleanBaseUrl = cleanBaseUrl.replace(/\/+$/, "");

      // Valider que le baseUrl ressemble à une URL Infobip
      if (!cleanBaseUrl.includes(".api.infobip.com") && !cleanBaseUrl.includes("infobip")) {
        console.error(`Infobip base URL invalide: "${cleanBaseUrl}". Attendu: xxxxx.api.infobip.com`);
        return { success: false, error: "Configuration Infobip incorrecte (URL invalide)" };
      }

      const normalizedPhone = normalizePhone(args.phone);

      // Rate limit : max 3 envois par numéro en 15 min (tolérant si ça échoue)
      try {
        const recentAttempts = await ctx.runQuery(internal.api.smsInternal.getRecentAttempts, {
          phone: normalizedPhone,
          since: Date.now() - 15 * 60 * 1000,
        });

        if (recentAttempts >= 3) {
          return { success: false, error: "Trop de tentatives. Réessayez dans quelques minutes." };
        }
      } catch (e) {
        console.warn("Rate limit check failed (self-hosted bug), continuing without rate limit...");
      }

      const url = `https://${cleanBaseUrl}/2fa/2/pin`;
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

      // Enregistrer la tentative (tolérant si ça échoue sur self-hosted)
      try {
        await ctx.runMutation(internal.api.smsInternal.insertAttempt, {
          phone: normalizedPhone,
          pinId,
        });
      } catch (e) {
        console.warn("insertAttempt failed (self-hosted bug), continuing without tracking...");
      }

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
    // Config Infobip passée depuis le frontend
    infobipConfig: v.optional(v.object({
      apiKey: v.string(),
      baseUrl: v.string(),
    })),
  },
  handler: async (ctx, args): Promise<{ success: boolean; verified?: boolean; error?: string }> => {
    try {
      // Utiliser la config passée en argument
      let apiKey = args.infobipConfig?.apiKey;
      let baseUrl = args.infobipConfig?.baseUrl;

      // Fallback : essayer de lire depuis la DB
      if (!apiKey || !baseUrl) {
        try {
          apiKey = apiKey || await ctx.runQuery(internal.api.smsInternal.getConfigValue, { key: "infobip_api_key" });
          baseUrl = baseUrl || await ctx.runQuery(internal.api.smsInternal.getConfigValue, { key: "infobip_base_url" });
        } catch (e) {
          console.warn("Fallback ctx.runQuery failed for verify");
        }
      }

      if (!apiKey || !baseUrl) {
        return { success: false, error: "Service SMS non configuré" };
      }

      // Nettoyer le baseUrl
      let cleanBaseUrl = baseUrl.trim();
      cleanBaseUrl = cleanBaseUrl.replace(/^https?:\/\//, "");
      cleanBaseUrl = cleanBaseUrl.replace(/\/+$/, "");

      const url = `https://${cleanBaseUrl}/2fa/2/pin/${args.pinId}/verify`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `App ${apiKey}`,
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
        // Marquer comme vérifié (tolérant si ça échoue)
        try {
          await ctx.runMutation(internal.api.smsInternal.markVerified, {
            pinId: args.pinId,
          });
        } catch (e) {
          console.warn("markVerified failed (self-hosted bug), continuing...");
        }
        return { success: true, verified: true };
      }

      return { success: false, error: "Code incorrect" };
    } catch (error: any) {
      console.error("verifyPhoneCode error:", error?.message || error);
      return { success: false, error: "Impossible de vérifier le code" };
    }
  },
});
