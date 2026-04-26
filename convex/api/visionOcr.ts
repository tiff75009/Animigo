// @ts-nocheck
/**
 * OCR Google Vision pour modération des photos de formules.
 *
 * Pipeline :
 *   1. Upload photo (côté client) → URL Cloudinary
 *   2. addVariant/updateVariant insère la photo avec moderationStatus="pending"
 *      et schedule cette action pour la scanner en background
 *   3. Cette action télécharge l'image, l'envoie à Google Vision (TEXT_DETECTION)
 *   4. Le texte extrait est passé dans le filtre `detectContactInfo`
 *   5. La mutation interne met à jour la photo : approved | rejected
 *
 * Coût : ~$1.50 / 1000 images (1500 gratuits/mois sur Google Cloud).
 *
 * Réutilise la clé Google API stockée dans systemConfig (mêmes credentials
 * que Google Maps — il suffit d'activer "Cloud Vision API" sur le projet GCP).
 */

import { internalAction, internalQuery, action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { detectContactInfo } from "../lib/contentFilter";

/**
 * Helper interne : exécute le scan OCR sur une URL et retourne le résultat
 * structuré. Réutilisé par scanVariantPhoto (background) ET scanPhotoUrl (client).
 */
async function performOcrScan(
  apiKey: string,
  photoUrl: string
): Promise<{
  status: "approved" | "rejected";
  rejectionReason?: string;
  extractedText?: string;
  error?: string;
}> {
  try {
    const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
    const body = {
      requests: [
        {
          image: { source: { imageUri: photoUrl } },
          features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
        },
      ],
    };
    const res = await fetch(visionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Vision API HTTP ${res.status} : ${errBody.slice(0, 300)}`);
    }
    const json: VisionResponse = await res.json();
    const r = json.responses?.[0];
    if (r?.error) {
      throw new Error(`Vision API error: ${r.error.message}`);
    }
    const extractedText = r?.fullTextAnnotation?.text || "";
    const detection = detectContactInfo(extractedText, "aggressive");

    let status: "approved" | "rejected" = "approved";
    let rejectionReason: string | undefined;
    if (detection.hasEmail && detection.hasPhone) {
      status = "rejected";
      rejectionReason = "Un email et un numéro de téléphone ont été détectés sur cette photo.";
    } else if (detection.hasEmail) {
      status = "rejected";
      rejectionReason = "Une adresse email a été détectée sur cette photo.";
    } else if (detection.hasPhone) {
      status = "rejected";
      rejectionReason = "Un numéro de téléphone a été détecté sur cette photo.";
    }

    return { status, rejectionReason, extractedText };
  } catch (err) {
    console.error("[visionOcr] performOcrScan error:", err);
    // Fail-open : on approuve par défaut pour ne pas bloquer l'annonceur
    return {
      status: "approved",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Action PUBLIQUE : scanne une URL d'image et retourne le résultat.
 * Appelée depuis le client immédiatement après un upload Cloudinary.
 *
 * Pas de variantId requis (la photo n'est pas encore liée à une formule en DB).
 * Le client utilise le résultat pour afficher un badge live et bloquer le submit
 * si la photo est rejetée.
 *
 * Sécurité : le serveur RE-SCANNE quand même au moment de addVariant/updateVariant
 * (le client peut être contourné).
 */
export const scanPhotoUrl = action({
  args: {
    url: v.string(),
  },
  handler: async (ctx, args): Promise<{
    status: "approved" | "rejected";
    rejectionReason?: string;
    extractedText?: string;
    skipped?: boolean;
  }> => {
    const cfg = await ctx.runQuery(internal.api.visionOcr.getVisionConfig);

    if (!cfg.enabled) {
      return { status: "approved", skipped: true };
    }
    if (!cfg.apiKey) {
      console.warn("[visionOcr] scanPhotoUrl : pas de clé API, skip");
      return { status: "approved", skipped: true };
    }

    console.log(`[visionOcr] scanPhotoUrl : ${args.url}`);
    const result = await performOcrScan(cfg.apiKey, args.url);
    console.log(
      `[visionOcr] scanPhotoUrl résultat : status=${result.status}${
        result.rejectionReason ? ` — ${result.rejectionReason}` : ""
      }`
    );
    return {
      status: result.status,
      rejectionReason: result.rejectionReason,
      extractedText: result.extractedText,
    };
  },
});

// Query interne : récupère la config Vision (clé dédiée + toggle).
// Fallback sur la clé Google Maps si pas de clé Vision dédiée.
export const getVisionConfig = internalQuery({
  args: {},
  handler: async (ctx) => {
    const enabledCfg = await ctx.db
      .query("systemConfig")
      .filter((q) => q.eq(q.field("key"), "vision_ocr_enabled"))
      .first();
    const visionKeyCfg = await ctx.db
      .query("systemConfig")
      .filter((q) => q.eq(q.field("key"), "google_vision_api_key"))
      .first();
    const mapsKeyCfg = await ctx.db
      .query("systemConfig")
      .filter((q) => q.eq(q.field("key"), "google_maps_api_key"))
      .first();
    return {
      enabled: enabledCfg?.value !== "false", // activé par défaut
      apiKey: visionKeyCfg?.value || mapsKeyCfg?.value || null,
    };
  },
});

interface VisionTextAnnotation {
  description?: string;
  locale?: string;
}

interface VisionResponse {
  responses?: Array<{
    textAnnotations?: VisionTextAnnotation[];
    fullTextAnnotation?: { text?: string };
    error?: { message?: string; code?: number };
  }>;
}

/**
 * Action interne : scanne une photo de formule via Google Vision OCR
 * et met à jour son `moderationStatus`.
 *
 * Appelée via ctx.scheduler.runAfter(0, internal.api.visionOcr.scanVariantPhoto, {...})
 * depuis addVariant / updateVariant après insertion d'une nouvelle photo.
 */
export const scanVariantPhoto = internalAction({
  args: {
    variantId: v.id("serviceVariants"),
    photoUrl: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(
      `[visionOcr] Démarrage scan variantId=${args.variantId} photo=${args.photoUrl}`
    );

    // 1. Récupérer la config Vision (toggle + clé)
    const cfg = await ctx.runQuery(internal.api.visionOcr.getVisionConfig);
    console.log(
      `[visionOcr] config : enabled=${cfg.enabled} hasKey=${Boolean(cfg.apiKey)}`
    );

    // Si la modération OCR est désactivée par l'admin, on approuve direct
    if (!cfg.enabled) {
      console.log("[visionOcr] OCR désactivé par l'admin → photo approuvée");
      await ctx.runMutation(internal.api.visionOcr.updatePhotoModeration, {
        variantId: args.variantId,
        photoUrl: args.photoUrl,
        status: "approved",
        extractedText: undefined,
        rejectionReason: undefined,
      });
      return;
    }

    const apiKey = cfg.apiKey;
    if (!apiKey) {
      console.error("[visionOcr] Clé Google API manquante — scan ignoré, photo approuvée par défaut");
      await ctx.runMutation(internal.api.visionOcr.updatePhotoModeration, {
        variantId: args.variantId,
        photoUrl: args.photoUrl,
        status: "approved",
        extractedText: undefined,
        rejectionReason: undefined,
      });
      return;
    }

    // 2. Appeler Google Vision via le helper partagé
    console.log(`[visionOcr] Appel Vision API pour ${args.photoUrl}`);
    const result = await performOcrScan(apiKey, args.photoUrl);
    console.log(
      `[visionOcr] Status final : ${result.status}${
        result.rejectionReason ? ` — ${result.rejectionReason}` : ""
      }`
    );

    await ctx.runMutation(internal.api.visionOcr.updatePhotoModeration, {
      variantId: args.variantId,
      photoUrl: args.photoUrl,
      status: result.status,
      extractedText: result.extractedText || undefined,
      rejectionReason: result.rejectionReason,
    });
  },
});

/**
 * Mutation interne : met à jour le status de modération d'une photo
 * (identifiée par son URL) dans le tableau `photos` d'une variante.
 */
import { internalMutation } from "../_generated/server";

export const updatePhotoModeration = internalMutation({
  args: {
    variantId: v.id("serviceVariants"),
    photoUrl: v.string(),
    status: v.union(v.literal("approved"), v.literal("rejected"), v.literal("pending")),
    extractedText: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const variant = await ctx.db.get(args.variantId);
    if (!variant) return;

    const photos = (variant.photos || []).map((p: any) => {
      if (p.url !== args.photoUrl) return p;
      return {
        ...p,
        moderationStatus: args.status,
        extractedText: args.extractedText,
        rejectionReason: args.rejectionReason,
        scannedAt: Date.now(),
      };
    });

    await ctx.db.patch(args.variantId, { photos, updatedAt: Date.now() });
  },
});
