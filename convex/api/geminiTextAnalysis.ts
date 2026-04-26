// @ts-nocheck
/**
 * Détection de coordonnées (téléphone / email) via Gemini Flash.
 *
 * Complément du filtre regex (`convex/lib/contentFilter.ts`) qui reste en
 * première ligne (gratuit, instantané, attrape 95 % des cas évidents).
 *
 * Gemini sert à attraper les contournements créatifs que la regex rate :
 *   - Numéros écrits entièrement en lettres ("zéro six douze...")
 *   - Phrases imbriquées ("mon numéro est le zéro six suivi de un deux...")
 *   - Caractères inhabituels ou mélanges complexes
 *   - Emails avec obfuscation créative
 *
 * Modèle : gemini-2.5-flash (rapide, ~300-800ms, très peu cher).
 * Endpoint : v1beta generativelanguage REST API.
 *
 * Coût : free tier généreux (15 req/min) puis ~$0.0001 / 1000 chars output.
 */

import { internalQuery, action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

// Query interne : lit le toggle + clé Gemini depuis systemConfig
export const getGeminiConfig = internalQuery({
  args: {},
  handler: async (ctx) => {
    const enabledCfg = await ctx.db
      .query("systemConfig")
      .filter((q) => q.eq(q.field("key"), "gemini_enabled"))
      .first();
    const keyCfg = await ctx.db
      .query("systemConfig")
      .filter((q) => q.eq(q.field("key"), "gemini_api_key"))
      .first();
    // Fallback sur la clé Maps si pas de clé Gemini dédiée (même projet GCP)
    const mapsKeyCfg = await ctx.db
      .query("systemConfig")
      .filter((q) => q.eq(q.field("key"), "google_maps_api_key"))
      .first();
    return {
      enabled: enabledCfg?.value === "true", // désactivé par défaut (opt-in)
      apiKey: keyCfg?.value || mapsKeyCfg?.value || null,
    };
  },
});

interface GeminiAnalysisResult {
  hasPhone: boolean;
  hasEmail: boolean;
  reason?: string;
  /** true si l'appel Gemini a été ignoré (toggle off ou pas de clé) */
  skipped?: boolean;
  /** true si l'appel a échoué (fail-open : on n'a pas pu vérifier) */
  error?: string;
}

/**
 * Helper exporté : appelle Gemini sur un texte et retourne {hasPhone, hasEmail}.
 * Réutilisable depuis testGeminiConnection (admin) ou autre action.
 */
export async function performGeminiAnalysis(
  apiKey: string,
  text: string
): Promise<GeminiAnalysisResult> {
  // Texte trop court → pas la peine d'appeler l'API (coût inutile)
  if (text.trim().length < 8) {
    return { hasPhone: false, hasEmail: false };
  }

  const prompt = `Tu es un détecteur de coordonnées dans des descriptions de services en français.

Analyse le texte suivant et détermine s'il contient un numéro de téléphone ou une adresse email, **y compris sous forme dissimulée** (numéros écrits en lettres comme "zéro six douze...", caractères ambigus, séparateurs créatifs, mots de substitution comme "arobase" ou "point", emojis entre les chiffres, etc.).

Ignore les codes postaux (5 chiffres seuls), les SIRET (14 chiffres), les références produit, les prix, les dates et les nombres normaux d'un texte commercial.

Texte à analyser :
"""
${text}
"""

Réponds UNIQUEMENT en JSON valide selon ce schéma :
{
  "hasPhone": boolean,  // true si un numéro de téléphone (FR ou international) est présent
  "hasEmail": boolean,  // true si une adresse email est présente
  "reason": string      // courte phrase expliquant ce qui a été détecté (si rien : "")
}`;

  try {
    // gemini-2.5-flash : rapide, peu cher, gère le responseSchema JSON
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1, // déterministe
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            hasPhone: { type: "boolean" },
            hasEmail: { type: "boolean" },
            reason: { type: "string" },
          },
          required: ["hasPhone", "hasEmail", "reason"],
        },
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Gemini HTTP ${res.status} : ${errBody.slice(0, 300)}`);
    }

    const json: any = await res.json();
    // Réponse Gemini : candidates[0].content.parts[0].text contient le JSON stringifié
    const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error("Gemini : pas de réponse textuelle");
    }
    const parsed = JSON.parse(rawText);
    return {
      hasPhone: Boolean(parsed.hasPhone),
      hasEmail: Boolean(parsed.hasEmail),
      reason: parsed.reason || undefined,
    };
  } catch (err) {
    console.error("[geminiTextAnalysis] erreur:", err);
    // Fail-open : on retourne "rien détecté" pour ne pas bloquer faussement
    return {
      hasPhone: false,
      hasEmail: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Action publique : analyse un texte avec Gemini pour détecter du contact info.
 * Appelée depuis le client (ServiceCard, VariantManager...) en complément de
 * la regex locale, pour confirmer / catcher les contournements créatifs.
 */
export const analyzeTextForContact = action({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args): Promise<GeminiAnalysisResult> => {
    const cfg = await ctx.runQuery(internal.api.geminiTextAnalysis.getGeminiConfig);

    if (!cfg.enabled) {
      return { hasPhone: false, hasEmail: false, skipped: true };
    }
    if (!cfg.apiKey) {
      console.warn("[geminiTextAnalysis] pas de clé API, skip");
      return { hasPhone: false, hasEmail: false, skipped: true };
    }

    const result = await performGeminiAnalysis(cfg.apiKey, args.text);
    console.log(
      `[geminiTextAnalysis] hasPhone=${result.hasPhone} hasEmail=${result.hasEmail} reason="${result.reason || ""}"`
    );
    return result;
  },
});

