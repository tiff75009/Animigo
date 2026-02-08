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

// Action publique : Envoyer un code de vérification SMS via Octopush OTP
export const sendPhoneVerification = action({
  args: {
    phone: v.string(),
    // Config Octopush passée depuis le frontend (contourne le bug ctx.runQuery sur self-hosted)
    octopushConfig: v.optional(v.object({
      apiLogin: v.string(),
      apiKey: v.string(),
    })),
  },
  handler: async (ctx, args): Promise<{ success: boolean; pinId?: string; error?: string }> => {
    try {
      // Utiliser la config passée en argument (le frontend la récupère via getOctopushConfig query)
      let config = args.octopushConfig;

      // Fallback : essayer de lire depuis la DB (fonctionne si pas en "use node")
      if (!config) {
        try {
          const apiLogin = await ctx.runQuery(internal.api.smsInternal.getConfigValue, { key: "octopush_api_login" });
          const apiKey = await ctx.runQuery(internal.api.smsInternal.getConfigValue, { key: "octopush_api_key" });

          if (apiLogin && apiKey) {
            config = { apiLogin, apiKey };
          }
        } catch (e) {
          console.warn("Fallback ctx.runQuery failed (self-hosted bug), using args only");
        }
      }

      if (!config) {
        return { success: false, error: "Service SMS non configuré. Configurez Octopush dans Admin > Intégrations." };
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

      // Appeler l'API Octopush OTP Generate
      console.log(`Octopush OTP: envoi vers ${normalizedPhone}`);

      const response = await fetch("https://api.octopush.com/v1/public/service/otp/generate", {
        method: "POST",
        headers: {
          "api-login": config.apiLogin,
          "api-key": config.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone_number: normalizedPhone,
          text: "Votre code de verification Animigo : {code}",
          sender: "Animigo",
          channel: "sms",
          code_length: 6,
          validity_period: 900, // 15 minutes
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Octopush API error:", response.status, errorText);

        // Interpréter les erreurs courantes
        if (response.status === 401) {
          return { success: false, error: "Identifiants Octopush invalides. Vérifiez api-login et api-key dans Admin > Intégrations." };
        }
        if (response.status === 402) {
          return { success: false, error: "Crédits SMS insuffisants. Rechargez votre compte Octopush." };
        }

        return { success: false, error: `Erreur d'envoi SMS (${response.status})` };
      }

      const data = await response.json();

      // Octopush retourne { otp_request_token: "xxx", ... } en cas de succès
      if (!data.otp_request_token) {
        console.error("Octopush API: pas de otp_request_token dans la réponse", data);
        return { success: false, error: data.message || "Erreur Octopush : réponse inattendue" };
      }

      const otpToken = data.otp_request_token;

      // Enregistrer la tentative
      try {
        await ctx.runMutation(internal.api.smsInternal.insertAttempt, {
          phone: normalizedPhone,
          pinId: otpToken,
        });
      } catch (e) {
        console.warn("insertAttempt failed (self-hosted bug), continuing without tracking...");
      }

      return { success: true, pinId: otpToken };
    } catch (error: any) {
      console.error("sendPhoneVerification error:", error?.message || error);
      return { success: false, error: "Impossible d'envoyer le SMS. Vérifiez la configuration Octopush." };
    }
  },
});

// Action publique : Vérifier le code SMS via Octopush OTP Validate
export const verifyPhoneCode = action({
  args: {
    pinId: v.string(),
    code: v.string(),
    // Config Octopush nécessaire pour appeler l'API de validation
    octopushConfig: v.optional(v.object({
      apiLogin: v.string(),
      apiKey: v.string(),
    })),
  },
  handler: async (ctx, args): Promise<{ success: boolean; verified?: boolean; error?: string }> => {
    try {
      // Utiliser la config passée en argument
      let config = args.octopushConfig;

      // Fallback : essayer de lire depuis la DB
      if (!config) {
        try {
          const apiLogin = await ctx.runQuery(internal.api.smsInternal.getConfigValue, { key: "octopush_api_login" });
          const apiKey = await ctx.runQuery(internal.api.smsInternal.getConfigValue, { key: "octopush_api_key" });

          if (apiLogin && apiKey) {
            config = { apiLogin, apiKey };
          }
        } catch (e) {
          console.warn("Fallback ctx.runQuery failed (self-hosted bug), using args only");
        }
      }

      if (!config) {
        return { success: false, error: "Service SMS non configuré" };
      }

      // Appeler l'API Octopush OTP Validate
      const response = await fetch("https://api.octopush.com/v1/public/service/otp/validate", {
        method: "PUT",
        headers: {
          "api-login": config.apiLogin,
          "api-key": config.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          otp_request_token: args.pinId,
          code: args.code,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Octopush validate error:", response.status, errorText);

        if (response.status === 422 || response.status === 400) {
          return { success: false, error: "Code incorrect" };
        }
        if (response.status === 410) {
          return { success: false, error: "Code expiré. Demandez un nouveau code." };
        }

        return { success: false, error: "Impossible de vérifier le code" };
      }

      // Succès : Octopush a validé le code
      // Marquer comme vérifié dans notre DB
      try {
        await ctx.runMutation(internal.api.smsInternal.markVerified, {
          pinId: args.pinId,
        });
      } catch (e) {
        console.warn("markVerified failed (self-hosted bug), continuing...");
      }

      return { success: true, verified: true };
    } catch (error: any) {
      console.error("verifyPhoneCode error:", error?.message || error);
      return { success: false, error: "Impossible de vérifier le code" };
    }
  },
});
