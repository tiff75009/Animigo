// @ts-nocheck
import { action, mutation, query } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAdmin, requireAdminAction } from "./utils";
import { internal } from "../_generated/api";

// Query: Lire une configuration (avec auth admin)
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

// Query: Lire une valeur de configuration (pour usage interne/actions)
// Retourne uniquement la valeur, pas l'objet complet
export const getConfigValue = query({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    return config?.value ?? null;
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

// Action: Tester la connexion Redis
export const testRedisConnection = action({
  args: {
    token: v.string(),
    redisUrl: v.string(),
    redisToken: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    message?: string;
    profileCount?: number;
    error?: string;
  }> => {
    await requireAdminAction(ctx, args.token);

    try {
      // Test PING
      const pingResponse = await fetch(args.redisUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${args.redisToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(["PING"]),
      });

      if (!pingResponse.ok) {
        const errorText = await pingResponse.text();
        return {
          success: false,
          error: `Erreur API (${pingResponse.status}): ${errorText}`,
        };
      }

      const pingData = await pingResponse.json();
      if (pingData.result !== "PONG") {
        return {
          success: false,
          error: "Réponse PING invalide",
        };
      }

      // Compter les profils dans geo:profiles
      const countResponse = await fetch(args.redisUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${args.redisToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(["ZCARD", "geo:profiles"]),
      });

      const countData = await countResponse.json();

      return {
        success: true,
        message: "Connexion Redis OK",
        profileCount: countData.result || 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      };
    }
  },
});

// Action: Tester la connexion Octopush
export const testOctopushConnection = action({
  args: {
    token: v.string(),
    apiLogin: v.string(),
    apiKey: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    message?: string;
    balance?: string;
    error?: string;
  }> => {
    await requireAdminAction(ctx, args.token);

    try {
      // Vérifier le solde via l'API Octopush
      const response = await fetch("https://api.octopush.com/v1/public/wallet/check-balance", {
        method: "GET",
        headers: {
          "api-login": args.apiLogin,
          "api-key": args.apiKey,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          return {
            success: false,
            error: "Identifiants invalides. Vérifiez votre api-login (email) et api-key.",
          };
        }
        const errorText = await response.text();
        return {
          success: false,
          error: `Erreur API (${response.status}): ${errorText}`,
        };
      }

      const data = await response.json();

      // Octopush retourne { amount: 12.50, unit: "euros" } ou similaire
      const balance = data.amount !== undefined ? `${data.amount} ${data.unit || "€"}` : "OK";

      return {
        success: true,
        message: "Connexion Octopush OK",
        balance,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      };
    }
  },
});

// Action: Tester la connexion Google Vision (OCR)
// Envoie une mini-image base64 pour valider que la clé API est active
// et que l'API Vision est bien activée sur le projet GCP.
export const testVisionConnection = action({
  args: {
    token: v.string(),
    apiKey: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> => {
    await requireAdminAction(ctx, args.token);

    if (!args.apiKey) {
      return {
        success: false,
        error: "Aucune clé API fournie. Renseignez la clé Google Vision (ou Google Maps si partagée).",
      };
    }

    try {
      // PNG 1x1 pixel transparent en base64 (suffisant pour valider le pipeline)
      const tinyPng =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${args.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: [
              {
                image: { content: tinyPng },
                features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        // Tente d'extraire le message structuré de Google (souvent très explicite)
        let googleMessage = "";
        try {
          const parsed = JSON.parse(errorText);
          googleMessage = parsed?.error?.message || "";
        } catch {
          // pas du JSON, garder le texte brut tronqué
        }
        const detail = googleMessage || errorText.slice(0, 300);

        if (response.status === 403) {
          // Causes typiques d'un 403 Vision avec API pourtant activée :
          // - clé restreinte à des APIs (Maps uniquement, sans Vision)
          // - clé restreinte par HTTP referrer (Convex appelle sans referer)
          // - clé restreinte par IP (les IPs Convex ne sont pas whitelistées)
          // - billing pas activé sur le projet GCP
          // - mauvais projet GCP (clé d'un projet, Vision activée sur un autre)
          return {
            success: false,
            error:
              `API refusée (403) — message Google : "${detail}".\n\n` +
              `Causes les plus fréquentes :\n` +
              `1. La clé est restreinte à certaines APIs (ex : Maps seulement). ` +
              `Aller dans Google Cloud Console → Credentials → cliquer sur la clé → "API restrictions" : ` +
              `mettre "Don't restrict key" OU ajouter "Cloud Vision API" à la liste.\n` +
              `2. La clé a une restriction "HTTP referrers" : Convex appelle l'API côté serveur (sans referer), ` +
              `donc la clé est rejetée. Solution : créer une clé serveur séparée sans restriction de referrer ` +
              `(ou utiliser "IP addresses" avec les IPs Convex, ou aucune restriction).\n` +
              `3. Le billing n'est pas activé sur le projet GCP (Vision exige un compte facturation, même pour le tier gratuit).\n` +
              `4. La clé appartient à un projet GCP différent de celui où Vision API est activée.`,
          };
        }
        if (response.status === 400) {
          return {
            success: false,
            error: `Clé API invalide ou requête mal formée (400) : ${detail}`,
          };
        }
        return {
          success: false,
          error: `Erreur API (${response.status}) : ${detail}`,
        };
      }

      const data = await response.json();
      const r = data.responses?.[0];
      if (r?.error) {
        return {
          success: false,
          error: `Vision API : ${r.error.message}`,
        };
      }

      return {
        success: true,
        message: "Connexion Google Vision OK — l'OCR est opérationnel.",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      };
    }
  },
});

// Action: Tester la connexion Gemini (analyse de texte)
// Envoie un texte avec un numéro de téléphone "obfusqué en lettres" pour
// valider que le pipeline fonctionne ET que le modèle est assez précis.
export const testGeminiConnection = action({
  args: {
    token: v.string(),
    apiKey: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    detected?: { hasPhone: boolean; hasEmail: boolean; reason?: string };
  }> => {
    await requireAdminAction(ctx, args.token);

    if (!args.apiKey) {
      return {
        success: false,
        error: "Aucune clé API fournie. Renseignez la clé Gemini ou Google Maps.",
      };
    }

    const { performGeminiAnalysis } = await import("../api/geminiTextAnalysis");
    const testText =
      "Bonjour, contactez-moi au zéro six douze trente quatre cinquante six soixante dix huit.";
    const result = await performGeminiAnalysis(args.apiKey, testText);

    if (result.error) {
      return {
        success: false,
        error: `Gemini API : ${result.error}`,
      };
    }

    if (!result.hasPhone) {
      return {
        success: false,
        error: `Gemini a répondu mais n'a pas détecté le numéro de test obfusqué. Réponse : "${result.reason || "(vide)"}". Le modèle fonctionne mais sa précision est dégradée.`,
        detected: { hasPhone: result.hasPhone, hasEmail: result.hasEmail, reason: result.reason },
      };
    }

    return {
      success: true,
      message: `Gemini OK — détection correcte du numéro obfusqué : "${result.reason || "détecté"}"`,
      detected: { hasPhone: result.hasPhone, hasEmail: result.hasEmail, reason: result.reason },
    };
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
// NOM DU SITE (PUBLIC)
// ==========================================

// Query publique: Récupérer le nom du site
export const getSiteName = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "site_name"))
      .first();

    return config?.value || "Animigo";
  },
});

// Query publique: Récupérer le logo du site
export const getSiteLogo = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "site_logo"))
      .first();

    return config?.value || null;
  },
});

// ==========================================
// DÉLAIS D'ACCEPTATION DES MISSIONS
// ==========================================

// Query: Récupérer les paramètres de délais d'acceptation (pour le panel admin)
export const getAcceptanceDeadlineSettings = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const configs = await ctx.db.query("systemConfig").collect();
    const configMap = new Map(configs.map((c) => [c.key, c.value]));

    return {
      enabled: configMap.get("acceptance_deadline_enabled") !== "false",
      intervalShortDays: parseInt(configMap.get("acceptance_interval_short_days") || "") || 7,
      intervalLongDays: parseInt(configMap.get("acceptance_interval_long_days") || "") || 30,
      deadlineShortHours: parseInt(configMap.get("acceptance_deadline_short_hours") || "") || 12,
      deadlineMediumHours: parseInt(configMap.get("acceptance_deadline_medium_hours") || "") || 36,
      deadlineLongHours: parseInt(configMap.get("acceptance_deadline_long_hours") || "") || 168,
      minimumBookingAdvanceHours: parseInt(configMap.get("minimum_booking_advance_hours") || "") || 24,
    };
  },
});

// Mutation: Mettre à jour les paramètres de délais d'acceptation
export const updateAcceptanceDeadlineSettings = mutation({
  args: {
    token: v.string(),
    enabled: v.boolean(),
    intervalShortDays: v.number(),
    intervalLongDays: v.number(),
    deadlineShortHours: v.number(),
    deadlineMediumHours: v.number(),
    deadlineLongHours: v.number(),
    minimumBookingAdvanceHours: v.number(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    // Seul garde-fou strict : la zone "Mission normale" doit exister.
    // Les délais d'acceptation peuvent dépasser le temps disponible avant la
    // mission — le cron auto-refus s'occupe d'expirer naturellement les
    // deadlines, donc pas besoin de bloquer ici.
    if (args.intervalShortDays >= args.intervalLongDays) {
      throw new ConvexError(
        `Le seuil "Mission urgente" (${args.intervalShortDays}j) doit être strictement inférieur ` +
          `au seuil "Mission lointaine" (${args.intervalLongDays}j) pour laisser une plage à "Mission normale".`
      );
    }

    const configsToUpdate = [
      { key: "acceptance_deadline_enabled", value: args.enabled ? "true" : "false" },
      { key: "acceptance_interval_short_days", value: args.intervalShortDays.toString() },
      { key: "acceptance_interval_long_days", value: args.intervalLongDays.toString() },
      { key: "acceptance_deadline_short_hours", value: args.deadlineShortHours.toString() },
      { key: "acceptance_deadline_medium_hours", value: args.deadlineMediumHours.toString() },
      { key: "acceptance_deadline_long_hours", value: args.deadlineLongHours.toString() },
      { key: "minimum_booking_advance_hours", value: args.minimumBookingAdvanceHours.toString() },
    ];

    for (const config of configsToUpdate) {
      const existing = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", (q) => q.eq("key", config.key))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          value: config.value,
          updatedAt: Date.now(),
          updatedBy: user._id,
        });
      } else {
        await ctx.db.insert("systemConfig", {
          key: config.key,
          value: config.value,
          isSecret: false,
          environment: "production",
          updatedAt: Date.now(),
          updatedBy: user._id,
        });
      }
    }

    return { success: true };
  },
});

// ==========================================
// DÉLAIS DE PAIEMENT
// ==========================================

// Query: Récupérer les paramètres de délais de paiement (pour le panel admin)
export const getPaymentDeadlineSettings = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const configs = await ctx.db.query("systemConfig").collect();
    const configMap = new Map(configs.map((c) => [c.key, c.value]));

    return {
      enabled: configMap.get("payment_deadline_enabled") !== "false",
      hours: parseInt(configMap.get("payment_deadline_hours") || "") || 48,
    };
  },
});

// Mutation: Mettre à jour les paramètres de délais de paiement
export const updatePaymentDeadlineSettings = mutation({
  args: {
    token: v.string(),
    enabled: v.boolean(),
    hours: v.number(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    const configsToUpdate = [
      { key: "payment_deadline_enabled", value: args.enabled ? "true" : "false" },
      { key: "payment_deadline_hours", value: args.hours.toString() },
    ];

    for (const config of configsToUpdate) {
      const existing = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", (q) => q.eq("key", config.key))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          value: config.value,
          updatedAt: Date.now(),
          updatedBy: user._id,
        });
      } else {
        await ctx.db.insert("systemConfig", {
          key: config.key,
          value: config.value,
          isSecret: false,
          environment: "production",
          updatedAt: Date.now(),
          updatedBy: user._id,
        });
      }
    }

    return { success: true };
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

// ==========================================
// VERSEMENTS ANNONCEURS
// ==========================================

// Query: Récupérer les paramètres de versements (pour le panel admin)
export const getPayoutSettings = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const configs = await ctx.db.query("systemConfig").collect();
    const configMap = new Map(configs.map((c) => [c.key, c.value]));

    // Frais désormais centralisé sur stripe_fee_rate (admin/commissions) — exposé ici aussi
    // pour info à l'UI (libellé "Frais retenus").
    const stripeFeeRate = parseFloat(configMap.get("stripe_fee_rate") || "") || 3;
    return {
      scheduledDay: parseInt(configMap.get("payout_scheduled_day") || "") || 25,
      confirmationHours: parseInt(configMap.get("mission_confirmation_hours") || "") || 48,
      stripeFeeRate, // source unique
      scheduledModeEnabled: configMap.get("payout_mode_scheduled_enabled") !== "false",
      instantModeEnabled: configMap.get("payout_mode_instant_enabled") !== "false",
    };
  },
});

// Query publique: Récupérer les paramètres de versements (pour les calculs)
export const getPayoutSettingsPublic = query({
  args: {},
  handler: async (ctx) => {
    const configs = await ctx.db.query("systemConfig").collect();
    const configMap = new Map(configs.map((c) => [c.key, c.value]));

    const stripeFeeRate = parseFloat(configMap.get("stripe_fee_rate") || "") || 3;
    return {
      scheduledDay: parseInt(configMap.get("payout_scheduled_day") || "") || 25,
      confirmationHours: parseInt(configMap.get("mission_confirmation_hours") || "") || 48,
      stripeFeeRate,
      scheduledModeEnabled: configMap.get("payout_mode_scheduled_enabled") !== "false",
      instantModeEnabled: configMap.get("payout_mode_instant_enabled") !== "false",
    };
  },
});

// Mutation: Mettre à jour les paramètres de versements
// Note : les frais (`monthlyFeePercent`, `perMissionFeePercent`) ont été retirés
// — la source unique est désormais `stripe_fee_rate` (configuré dans /admin/commissions).
// Args gardés optionnels en signature pour rétrocompat des appelants existants mais
// **non sauvegardés en BDD** (les anciennes clés sont obsolètes).
export const updatePayoutSettings = mutation({
  args: {
    token: v.string(),
    scheduledDay: v.number(),
    monthlyFeePercent: v.optional(v.number()), // déprécié — ignoré
    perMissionFeePercent: v.optional(v.number()), // déprécié — ignoré
    confirmationHours: v.number(),
    scheduledModeEnabled: v.optional(v.boolean()),
    instantModeEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    // Validation des valeurs
    const scheduledDay = Math.min(28, Math.max(1, args.scheduledDay));
    const confirmationHours = Math.min(168, Math.max(12, args.confirmationHours));

    // Garde-fou : interdire de désactiver les deux modes en même temps (sinon
    // aucun annonceur ne pourrait être payé).
    if (args.scheduledModeEnabled === false && args.instantModeEnabled === false) {
      throw new ConvexError(
        "Au moins un mode de versement doit rester activé (sinon aucun annonceur ne peut être payé)."
      );
    }

    const configsToUpdate: Array<{ key: string; value: string }> = [
      { key: "payout_scheduled_day", value: scheduledDay.toString() },
      { key: "mission_confirmation_hours", value: confirmationHours.toString() },
    ];
    if (args.scheduledModeEnabled !== undefined) {
      configsToUpdate.push({ key: "payout_mode_scheduled_enabled", value: args.scheduledModeEnabled ? "true" : "false" });
    }
    if (args.instantModeEnabled !== undefined) {
      configsToUpdate.push({ key: "payout_mode_instant_enabled", value: args.instantModeEnabled ? "true" : "false" });
    }

    for (const config of configsToUpdate) {
      const existing = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", (q) => q.eq("key", config.key))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          value: config.value,
          updatedAt: Date.now(),
          updatedBy: user._id,
        });
      } else {
        await ctx.db.insert("systemConfig", {
          key: config.key,
          value: config.value,
          isSecret: false,
          environment: "production",
          updatedAt: Date.now(),
          updatedBy: user._id,
        });
      }
    }

    return {
      success: true,
      scheduledDay,
      confirmationHours,
    };
  },
});

// ==========================================
// CHAMPS ENTREPRISE ÉDITABLES
// ==========================================

// Query publique: Récupérer quels champs entreprise sont éditables par les pros
export const getCompanyEditableFields = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "company_editable_fields"))
      .first();

    const defaults: Record<string, boolean> = {
      companyName: false,
      companyAddress: false,
      companyPostalCode: false,
      companyCity: false,
      activityCode: false,
      activityLabel: false,
      companyCreationDate: false,
      capital: true,
      legalForm: false,
    };

    if (!config?.value) return defaults;
    try {
      return { ...defaults, ...JSON.parse(config.value) };
    } catch {
      return defaults;
    }
  },
});

// Mutation admin: Mettre à jour les champs entreprise éditables
export const updateCompanyEditableFields = mutation({
  args: {
    token: v.string(),
    fields: v.object({
      companyName: v.boolean(),
      companyAddress: v.boolean(),
      companyPostalCode: v.boolean(),
      companyCity: v.boolean(),
      activityCode: v.boolean(),
      activityLabel: v.boolean(),
      companyCreationDate: v.boolean(),
      capital: v.boolean(),
      legalForm: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    const existing = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "company_editable_fields"))
      .first();

    const value = JSON.stringify(args.fields);

    if (existing) {
      await ctx.db.patch(existing._id, {
        value,
        updatedAt: Date.now(),
        updatedBy: user._id,
      });
    } else {
      await ctx.db.insert("systemConfig", {
        key: "company_editable_fields",
        value,
        isSecret: false,
        environment: "production",
        updatedAt: Date.now(),
        updatedBy: user._id,
      });
    }

    return { success: true };
  },
});

// ==========================================
// FUSEAU HORAIRE PLATEFORME
// ==========================================

// Query admin: Récupérer le fuseau horaire configuré
export const getTimezoneSettings = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "platform_timezone"))
      .first();

    return {
      timezone: config?.value || "Europe/Paris",
    };
  },
});

// Query publique: Récupérer le fuseau horaire (pour les crons et logique interne)
export const getTimezone = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "platform_timezone"))
      .first();

    return config?.value || "Europe/Paris";
  },
});

// Mutation admin: Mettre à jour le fuseau horaire
export const updateTimezone = mutation({
  args: {
    token: v.string(),
    timezone: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    const existing = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "platform_timezone"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.timezone,
        updatedAt: Date.now(),
        updatedBy: user._id,
      });
    } else {
      await ctx.db.insert("systemConfig", {
        key: "platform_timezone",
        value: args.timezone,
        isSecret: false,
        environment: "production",
        updatedAt: Date.now(),
        updatedBy: user._id,
      });
    }

    return { success: true, timezone: args.timezone };
  },
});

// ==========================================
// POLITIQUE D'ANNULATION CLIENT
// ==========================================

export const getCancellationSettings = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const configs = await ctx.db.query("systemConfig").collect();
    const configMap = new Map(configs.map((c) => [c.key, c.value]));

    // Refonte 2026 : politique simplifiée + niveaux 3ème/4ème distincts.
    // Anciennes clés grace/lastMinute conservées en BDD pour rétrocompat mais
    // NON utilisées par cancellation.ts.
    return {
      thresholdHours: parseInt(configMap.get("cancellation_threshold_hours") || "") || 36,
      thirdCancellationAnnouncerPercent: parseInt(configMap.get("cancellation_3rd_announcer_percent") || "") || 50,
      fourthCancellationAnnouncerPercent: parseInt(configMap.get("cancellation_4th_announcer_percent") || "") || 100,
      counterPeriodMonths: parseInt(configMap.get("cancellation_counter_period_months") || "") || 12,
    };
  },
});

export const updateCancellationSettings = mutation({
  args: {
    token: v.string(),
    thresholdHours: v.number(),
    thirdCancellationAnnouncerPercent: v.number(),
    fourthCancellationAnnouncerPercent: v.number(),
    counterPeriodMonths: v.number(),
    // Args dépréciés gardés optionnels en signature pour rétrocompat
    secondCancellationAnnouncerPercent: v.optional(v.number()),
    gracePeriodHours: v.optional(v.number()),
    lastMinuteThresholdHours: v.optional(v.number()),
    lastMinuteGraceHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    const thresholdHours = Math.min(168, Math.max(1, args.thresholdHours));
    const thirdPercent = Math.min(100, Math.max(0, args.thirdCancellationAnnouncerPercent));
    const fourthPercent = Math.min(100, Math.max(0, args.fourthCancellationAnnouncerPercent));
    const counterPeriodMonths = Math.min(24, Math.max(1, args.counterPeriodMonths));

    const configsToUpdate = [
      { key: "cancellation_threshold_hours", value: thresholdHours.toString() },
      { key: "cancellation_3rd_announcer_percent", value: thirdPercent.toString() },
      { key: "cancellation_4th_announcer_percent", value: fourthPercent.toString() },
      { key: "cancellation_counter_period_months", value: counterPeriodMonths.toString() },
    ];

    for (const config of configsToUpdate) {
      const existing = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", (q) => q.eq("key", config.key))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          value: config.value,
          updatedAt: Date.now(),
          updatedBy: user._id,
        });
      } else {
        await ctx.db.insert("systemConfig", {
          key: config.key,
          value: config.value,
          isSecret: false,
          environment: "production",
          updatedAt: Date.now(),
          updatedBy: user._id,
        });
      }
    }

    return {
      success: true,
      thresholdHours,
      thirdCancellationAnnouncerPercent: thirdPercent,
      fourthCancellationAnnouncerPercent: fourthPercent,
      counterPeriodMonths,
    };
  },
});

