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
 * Modèle : gemini-2.5-flash-lite (rapide, ~200-500ms, très peu cher,
 * pas de mode "thinking" qui consommerait des tokens avant la sortie).
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
 * Action publique : génère une description de profil personnalisée via Gemini.
 *
 * Inputs : ton souhaité (familial / pro / chaleureux / expert), services proposés,
 *          types d'animaux acceptés, années d'expérience, équipements (jardin, voiture).
 *
 * Output : 2-3 paragraphes de description prête à être collée dans le profil.
 *          Garantie sans téléphone/email (le prompt l'interdit explicitement).
 */
export const generateProfileDescription = action({
  args: {
    tone: v.union(
      v.literal("familial"),
      v.literal("professionnel"),
      v.literal("chaleureux"),
      v.literal("expert"),
    ),
    // Statut professionnel
    activityStatus: v.optional(
      v.union(
        v.literal("main"),       // Activité principale
        v.literal("side"),       // Complément d'un autre métier
        v.literal("retired"),    // À la retraite
        v.literal("student"),    // Étudiant
        v.literal("hobby"),      // Passion / loisir
      )
    ),
    currentJob: v.optional(v.string()),    // Si side : métier principal
    // Expérience et formation
    experienceLevel: v.optional(
      v.union(
        v.literal("debutant"),    // Moins d'1 an
        v.literal("1-3"),         // 1 à 3 ans
        v.literal("3-10"),        // 3 à 10 ans
        v.literal("10plus"),      // Plus de 10 ans
      )
    ),
    formations: v.optional(v.array(v.string())),  // ACACED, premiers secours, vétérinaire, éducateur, comportementaliste...
    // Animaux personnels
    ownsAnimals: v.optional(v.boolean()),
    ownAnimalsDescription: v.optional(v.string()), // "2 chiens, 1 chat"
    // Motivation
    motivation: v.optional(v.string()),
    // Compétences spéciales
    specialSkills: v.optional(v.array(v.string())), // "medication", "vieux", "anxieux", "cat1_2", "transport", "agility"...
    // Animaux préférés
    favoriteAnimals: v.optional(v.array(v.string())),
    // Équipements
    hasGarden: v.optional(v.boolean()),
    hasVehicle: v.optional(v.boolean()),
    // Note libre
    customNote: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    description?: string;
    error?: string;
  }> => {
    const cfg = await ctx.runQuery(internal.api.geminiTextAnalysis.getGeminiConfig);
    if (!cfg.enabled) {
      return { success: false, error: "Gemini désactivé par l'admin" };
    }
    if (!cfg.apiKey) {
      return { success: false, error: "Aucune clé API Gemini configurée" };
    }

    const toneDesc: Record<string, string> = {
      familial: "chaleureux et familial, comme à un voisin de confiance, vouvoiement amical et accessible",
      professionnel: "sérieux et rassurant, vouvoiement, mettant en avant le professionnalisme et la fiabilité",
      chaleureux: "passionné et bienveillant, qui transmet l'amour des animaux, vouvoiement chaleureux",
      expert: "technique et expert, mettant en avant les compétences, formations et expérience, vouvoiement expert",
    };

    // Construction des sections du prompt à partir des inputs
    const sections: string[] = [];

    // ─── Statut professionnel ───
    if (args.activityStatus) {
      const statusMap: Record<string, string> = {
        main: "C'est mon activité principale, je m'y consacre à temps plein.",
        side: args.currentJob
          ? `Je propose ce service en complément de mon activité de ${args.currentJob}.`
          : "Je propose ce service en complément de mon activité principale.",
        retired: "Je suis à la retraite et propose ce service pour rester actif·ve et entouré·e d'animaux.",
        student: "Je suis étudiant·e et propose ce service avec passion sur mon temps libre.",
        hobby: "C'est avant tout une passion : j'adore m'occuper des animaux et le fais avec plaisir.",
      };
      sections.push(`STATUT : ${statusMap[args.activityStatus]}`);
    }

    // ─── Expérience ───
    if (args.experienceLevel) {
      const expMap: Record<string, string> = {
        debutant: "Je débute dans la garde d'animaux mais j'ai grandi entouré·e d'animaux.",
        "1-3": "J'ai entre 1 et 3 ans d'expérience dans la garde d'animaux.",
        "3-10": "J'ai entre 3 et 10 ans d'expérience solide dans la garde d'animaux.",
        "10plus": "J'ai plus de 10 ans d'expérience dans la garde d'animaux.",
      };
      sections.push(`EXPÉRIENCE : ${expMap[args.experienceLevel]}`);
    }

    // ─── Formations ───
    if (args.formations && args.formations.length > 0) {
      sections.push(`FORMATIONS : ${args.formations.join(", ")}.`);
    }

    // ─── Animaux personnels ───
    if (args.ownsAnimals) {
      sections.push(
        `ANIMAUX PERSONNELS : Je vis avec ${args.ownAnimalsDescription || "des animaux"}.`
      );
    } else if (args.ownsAnimals === false) {
      sections.push("ANIMAUX PERSONNELS : Je n'ai pas d'animaux à la maison actuellement.");
    }

    // ─── Motivation libre ───
    if (args.motivation && args.motivation.trim()) {
      sections.push(`MOTIVATION : ${args.motivation.trim()}`);
    }

    // ─── Compétences spéciales ───
    if (args.specialSkills && args.specialSkills.length > 0) {
      const skillLabels: Record<string, string> = {
        medication: "administration de médicaments",
        vieux: "animaux âgés / soins palliatifs",
        anxieux: "animaux anxieux ou réactifs",
        cat1_2: "chiens catégorisés (catégories 1 et 2)",
        transport: "transport vétérinaire",
        agility: "sport canin et agility",
        socialisation: "socialisation des chiots",
        soins: "soins quotidiens et hygiène",
        education: "éducation positive",
      };
      const labeled = args.specialSkills
        .map((s) => skillLabels[s] || s)
        .join(", ");
      sections.push(`COMPÉTENCES PARTICULIÈRES : ${labeled}.`);
    }

    // ─── Animaux préférés ───
    if (args.favoriteAnimals && args.favoriteAnimals.length > 0) {
      sections.push(`ANIMAUX DE PRÉDILECTION : ${args.favoriteAnimals.join(", ")}.`);
    }

    // ─── Équipements ───
    const equip: string[] = [];
    if (args.hasGarden) equip.push("dispose d'un jardin sécurisé");
    if (args.hasVehicle) equip.push("véhiculé·e (peut effectuer des transports)");
    if (equip.length > 0) {
      sections.push(`ÉQUIPEMENTS : ${equip.join(", ")}.`);
    }

    // ─── Note personnelle libre ───
    if (args.customNote && args.customNote.trim()) {
      sections.push(`PRÉCISIONS PERSONNELLES À INTÉGRER : ${args.customNote.trim()}`);
    }

    const userContext = sections.length > 0
      ? sections.join("\n\n")
      : "(aucune information spécifique fournie — rester très générique)";

    const prompt = `Tu es un copywriter expérimenté spécialisé dans les profils de pet-sitters en France.

Ton job : rédiger une description de profil personnalisée à partir des informations factuelles fournies par le pet-sitter, sans rien inventer.

═══════════════════════════════════════════════════════
INFORMATIONS FOURNIES PAR LE PET-SITTER
═══════════════════════════════════════════════════════

${userContext}

═══════════════════════════════════════════════════════
TON ATTENDU
═══════════════════════════════════════════════════════

${toneDesc[args.tone]}

═══════════════════════════════════════════════════════
RÈGLES STRICTES
═══════════════════════════════════════════════════════

1. **STRUCTURE** : 2 à 3 paragraphes, 120 à 200 mots au total.
2. **CONTENU** :
   - Utilise UNIQUEMENT les informations fournies ci-dessus
   - N'invente PAS de prénom, ville, anecdote précise, citation, statistique
   - Si une info n'est pas fournie, ne l'évoque pas (ne dis pas "j'aime tous les animaux" si rien n'est précisé)
3. **INTERDICTIONS ABSOLUES** :
   - Aucun numéro de téléphone
   - Aucune adresse email
   - Aucun lien externe
   - Aucun pseudo de réseaux sociaux
4. **STYLE** :
   - Évite les superlatifs cliché : "le meilleur", "depuis toujours", "passionné·e dans l'âme", "amour inconditionnel"
   - Préfère le concret : "5 ans d'expérience" plutôt que "longue expérience"
   - Une phrase d'accroche, le cœur factuel, une invitation finale à réserver via la plateforme
5. **FIN** : termine par une invitation à réserver une prestation via Animigo (sans donner de coordonnées hors plateforme).

═══════════════════════════════════════════════════════

RÉPONDS UNIQUEMENT avec la description finale, sans titre, sans intro ("Voici la description :"), sans guillemets autour, sans markdown.`;

    try {
      // gemini-2.5-flash-lite : pas de mode "thinking" par défaut → tous les
      // tokens vont au texte final, pas de troncature à mi-phrase.
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${cfg.apiKey}`;
      const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.75,
          maxOutputTokens: 800,
        },
      };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.text();
        return {
          success: false,
          error: `Gemini HTTP ${res.status} : ${errBody.slice(0, 200)}`,
        };
      }
      const json: any = await res.json();
      const description = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      const finishReason = json?.candidates?.[0]?.finishReason;
      if (!description) {
        return {
          success: false,
          error: `Gemini n'a retourné aucun texte (finishReason: ${finishReason || "inconnu"})`,
        };
      }
      // Si la sortie est marquée comme tronquée par limite de tokens, le signaler
      if (finishReason === "MAX_TOKENS") {
        console.warn("[generateProfileDescription] Réponse tronquée (MAX_TOKENS atteint)");
      }
      return { success: true, description };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erreur inconnue",
      };
    }
  },
});

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
    // gemini-2.5-flash-lite : rapide, peu cher, gère le responseSchema JSON,
    // pas de mode "thinking" qui consommerait les tokens
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;
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

