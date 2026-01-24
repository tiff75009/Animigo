import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { ConvexError } from "convex/values";
import { Id } from "../_generated/dataModel";

// Configuration Anthropic
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

interface VerificationResult {
  success: boolean;
  codeMatch: boolean;
  codeDetected: string | null;
  faceMatch: boolean;
  faceMatchConfidence: number;
  idCardValid: boolean;
  issues: string[];
  autoApproved: boolean;
}

// Convertir une URL d'image en base64
async function imageUrlToBase64(url: string): Promise<{ base64: string; mediaType: string }> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  // Déterminer le type MIME
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const mediaType = contentType.split(";")[0];

  return { base64, mediaType };
}

// Action interne de vérification automatique
export const autoVerifyIdentity = internalAction({
  args: {
    requestId: v.id("verificationRequests"),
    idCardFrontUrl: v.string(),
    idCardBackUrl: v.string(),
    selfieWithCodeUrl: v.string(),
    expectedCode: v.string(),
  },
  handler: async (ctx, args): Promise<VerificationResult> => {
    if (!ANTHROPIC_API_KEY) {
      throw new ConvexError("Clé API Anthropic non configurée");
    }

    const issues: string[] = [];
    let codeDetected: string | null = null;
    let codeMatch = false;
    let faceMatch = false;
    let faceMatchConfidence = 0;
    let idCardValid = false;

    try {
      // Convertir les images en base64
      const [idFront, selfie] = await Promise.all([
        imageUrlToBase64(args.idCardFrontUrl),
        imageUrlToBase64(args.selfieWithCodeUrl),
      ]);

      // === ÉTAPE 1: Vérifier le code sur le selfie ===
      const codeVerificationResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: selfie.mediaType,
                    data: selfie.base64,
                  },
                },
                {
                  type: "text",
                  text: `Analyse cette photo selfie. Une personne tient une feuille de papier avec un code écrit dessus.

TÂCHE: Extraire le code alphanumérique visible sur la feuille de papier.

Instructions:
1. Cherche une feuille de papier ou un carton tenu par la personne
2. Lis le code écrit dessus (généralement 6 caractères alphanumériques en majuscules)
3. Ignore tout autre texte (t-shirt, arrière-plan, etc.)

Réponds UNIQUEMENT avec un JSON valide dans ce format exact:
{
  "code_found": true/false,
  "code": "XXXXXX" ou null si non trouvé,
  "confidence": 0-100,
  "issues": ["liste des problèmes éventuels"]
}

Ne réponds RIEN d'autre que ce JSON.`,
                },
              ],
            },
          ],
        }),
      });

      if (!codeVerificationResponse.ok) {
        throw new Error(`Erreur API Anthropic: ${codeVerificationResponse.status}`);
      }

      const codeResult = await codeVerificationResponse.json();
      const codeText = codeResult.content[0]?.text || "";

      // Parser la réponse JSON
      try {
        // Extraire le JSON de la réponse (au cas où il y aurait du texte autour)
        const jsonMatch = codeText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const codeData = JSON.parse(jsonMatch[0]);
          codeDetected = codeData.code;

          if (codeData.code_found && codeDetected) {
            // Normaliser les codes (majuscules, sans espaces)
            const normalizedDetected = codeDetected.toUpperCase().replace(/\s/g, "");
            const normalizedExpected = args.expectedCode.toUpperCase().replace(/\s/g, "");
            codeMatch = normalizedDetected === normalizedExpected;

            if (!codeMatch) {
              issues.push(`Code détecté "${normalizedDetected}" ne correspond pas au code attendu "${normalizedExpected}"`);
            }
          } else {
            issues.push("Code non détecté sur la photo selfie");
          }

          if (codeData.issues && codeData.issues.length > 0) {
            issues.push(...codeData.issues);
          }
        }
      } catch (parseError) {
        console.error("Erreur parsing code:", parseError, codeText);
        issues.push("Impossible d'analyser le code sur la photo");
      }

      // === ÉTAPE 2: Comparer les visages ===
      const faceComparisonResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: idFront.mediaType,
                    data: idFront.base64,
                  },
                },
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: selfie.mediaType,
                    data: selfie.base64,
                  },
                },
                {
                  type: "text",
                  text: `Compare ces deux images:
- Image 1: Une pièce d'identité (carte d'identité ou passeport)
- Image 2: Un selfie d'une personne

TÂCHES:
1. Vérifie que l'image 1 est bien une pièce d'identité valide (pas une photo d'écran, pas retouchée)
2. Compare le visage sur la pièce d'identité avec le visage sur le selfie
3. Évalue si c'est la même personne

Réponds UNIQUEMENT avec un JSON valide dans ce format exact:
{
  "id_card_valid": true/false,
  "id_card_issues": ["liste des problèmes avec la pièce d'identité"],
  "face_visible_on_id": true/false,
  "face_visible_on_selfie": true/false,
  "same_person": true/false,
  "confidence": 0-100,
  "reasoning": "explication courte"
}

IMPORTANT: Sois strict sur la comparaison. En cas de doute, mets same_person à false.
Ne réponds RIEN d'autre que ce JSON.`,
                },
              ],
            },
          ],
        }),
      });

      if (!faceComparisonResponse.ok) {
        throw new Error(`Erreur API Anthropic: ${faceComparisonResponse.status}`);
      }

      const faceResult = await faceComparisonResponse.json();
      const faceText = faceResult.content[0]?.text || "";

      // Parser la réponse JSON
      try {
        const jsonMatch = faceText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const faceData = JSON.parse(jsonMatch[0]);

          idCardValid = faceData.id_card_valid === true;
          faceMatch = faceData.same_person === true;
          faceMatchConfidence = faceData.confidence || 0;

          if (!idCardValid) {
            issues.push("La pièce d'identité semble invalide ou de mauvaise qualité");
            if (faceData.id_card_issues && faceData.id_card_issues.length > 0) {
              issues.push(...faceData.id_card_issues);
            }
          }

          if (!faceData.face_visible_on_id) {
            issues.push("Visage non visible sur la pièce d'identité");
          }

          if (!faceData.face_visible_on_selfie) {
            issues.push("Visage non visible sur le selfie");
          }

          if (!faceMatch) {
            issues.push(`Les visages ne correspondent pas (confiance: ${faceMatchConfidence}%)`);
          }
        }
      } catch (parseError) {
        console.error("Erreur parsing face:", parseError, faceText);
        issues.push("Impossible de comparer les visages");
      }

    } catch (error) {
      console.error("Erreur vérification automatique:", error);
      issues.push(`Erreur technique: ${error instanceof Error ? error.message : "Erreur inconnue"}`);
    }

    // Récupérer les paramètres de vérification depuis la config
    const verificationSettings = await ctx.runQuery(internal.verification.autoVerify.getVerificationSettings, {});
    const { autoVerifyEnabled, confidenceThreshold } = verificationSettings;

    // Décision finale: auto-approuver si:
    // 1. L'auto-vérification est activée dans les paramètres
    // 2. Tous les critères sont validés
    // 3. La confiance est >= au seuil configuré
    const meetsAutoApprovalCriteria = codeMatch && faceMatch && idCardValid && issues.length === 0;
    const meetsConfidenceThreshold = faceMatchConfidence >= confidenceThreshold;
    const autoApproved = autoVerifyEnabled && meetsAutoApprovalCriteria && meetsConfidenceThreshold;

    // Si confiance insuffisante mais critères OK, ajouter une note
    if (meetsAutoApprovalCriteria && !meetsConfidenceThreshold) {
      issues.push(`Confiance insuffisante pour auto-approbation (${faceMatchConfidence}% < ${confidenceThreshold}% requis)`);
    }

    // Si auto-vérification désactivée
    if (!autoVerifyEnabled && meetsAutoApprovalCriteria && meetsConfidenceThreshold) {
      issues.push("Auto-vérification désactivée - Vérification manuelle requise");
    }

    // Sauvegarder le résultat
    await ctx.runMutation(internal.verification.autoVerify.saveVerificationResult, {
      requestId: args.requestId,
      result: {
        codeMatch,
        codeDetected,
        faceMatch,
        faceMatchConfidence,
        idCardValid,
        issues,
        autoApproved,
        verifiedAt: Date.now(),
        confidenceThreshold, // Sauvegarder le seuil utilisé pour référence
      },
    });

    return {
      success: true,
      codeMatch,
      codeDetected,
      faceMatch,
      faceMatchConfidence,
      idCardValid,
      issues,
      autoApproved,
    };
  },
});

// Query interne pour récupérer les paramètres de vérification
export const getVerificationSettings = internalQuery({
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

// Mutation interne pour sauvegarder le résultat
export const saveVerificationResult = internalMutation({
  args: {
    requestId: v.id("verificationRequests"),
    result: v.object({
      codeMatch: v.boolean(),
      codeDetected: v.union(v.string(), v.null()),
      faceMatch: v.boolean(),
      faceMatchConfidence: v.number(),
      idCardValid: v.boolean(),
      issues: v.array(v.string()),
      autoApproved: v.boolean(),
      verifiedAt: v.number(),
      confidenceThreshold: v.optional(v.number()), // Seuil utilisé pour la décision
    }),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) return;

    // Mettre à jour la demande avec les résultats de l'IA
    await ctx.db.patch(args.requestId, {
      aiVerificationResult: args.result,
      updatedAt: Date.now(),
      // Si auto-approuvé, mettre à jour le statut
      ...(args.result.autoApproved && {
        status: "approved",
        reviewedAt: Date.now(),
        adminNotes: `Vérification automatique par IA - Approuvé (confiance ${args.result.faceMatchConfidence}% >= seuil ${args.result.confidenceThreshold || 80}%)`,
      }),
    });

    // Si auto-approuvé, mettre à jour le profil
    if (args.result.autoApproved) {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", request.userId))
        .first();

      if (profile) {
        await ctx.db.patch(profile._id, {
          isIdentityVerified: true,
          identityVerifiedAt: Date.now(),
        });
      }
    }
  },
});

// Action pour déclencher la vérification lors de la soumission
export const triggerAutoVerification = action({
  args: {
    sessionToken: v.string(),
    requestId: v.id("verificationRequests"),
  },
  handler: async (ctx, args): Promise<VerificationResult | null> => {
    // Récupérer la demande via une query
    const request = await ctx.runQuery(internal.verification.autoVerify.getRequestForVerification, {
      requestId: args.requestId,
    });

    if (!request) {
      throw new ConvexError("Demande de vérification non trouvée");
    }

    if (!request.idCardFrontUrl || !request.idCardBackUrl || !request.selfieWithCodeUrl) {
      throw new ConvexError("Documents incomplets");
    }

    // Lancer la vérification automatique
    return await ctx.runAction(internal.verification.autoVerify.autoVerifyIdentity, {
      requestId: args.requestId,
      idCardFrontUrl: request.idCardFrontUrl,
      idCardBackUrl: request.idCardBackUrl,
      selfieWithCodeUrl: request.selfieWithCodeUrl,
      expectedCode: request.verificationCode,
    });
  },
});

// Query interne pour récupérer la demande
export const getRequestForVerification = internalQuery({
  args: {
    requestId: v.id("verificationRequests"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.requestId);
  },
});
