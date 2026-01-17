import { action, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

// Types pour la classification d'entreprise
type CompanyType = "micro_enterprise" | "regular_company" | "unknown";

interface CompanyClassification {
  companyType: CompanyType;
  isVatSubject: boolean;
}

/**
 * Classifie une entreprise en micro-entreprise ou société classique
 * basé sur la forme juridique (catjurlib de société.com)
 */
function classifyCompanyType(legalForm: string | null): CompanyClassification {
  if (!legalForm) {
    return { companyType: "unknown", isVatSubject: false };
  }

  const legalFormLower = legalForm.toLowerCase().trim();

  // Patterns micro-entreprise (généralement non assujetti TVA sauf option)
  // EI = Entreprise Individuelle, peut être micro-entreprise
  const microPatterns = [
    "entrepreneur individuel",
    "micro-entrepreneur",
    "micro entrepreneur",
    "microentrepreneur",
    "auto-entrepreneur",
    "auto entrepreneur",
    "autoentrepreneur",
    "entreprise individuelle",
    "ei ",
    "eirl", // Entreprise Individuelle à Responsabilité Limitée (peut être micro)
  ];

  // Vérifier si c'est une micro-entreprise
  for (const pattern of microPatterns) {
    if (legalFormLower.includes(pattern)) {
      return { companyType: "micro_enterprise", isVatSubject: false };
    }
  }

  // Patterns société (assujetti TVA)
  const regularCompanyPatterns = [
    "sarl",      // Société à Responsabilité Limitée
    "sas",       // Société par Actions Simplifiée
    "sa ",       // Société Anonyme
    "sasu",      // SAS Unipersonnelle
    "eurl",      // Entreprise Unipersonnelle à Responsabilité Limitée
    "snc",       // Société en Nom Collectif
    "sca",       // Société en Commandite par Actions
    "sci",       // Société Civile Immobilière
    "scp",       // Société Civile Professionnelle
    "scop",      // Société Coopérative
    "selca",     // Société d'Exercice Libéral en Commandite par Actions
    "selarl",    // Société d'Exercice Libéral à Responsabilité Limitée
    "selas",     // Société d'Exercice Libéral par Actions Simplifiée
    "société",   // Générique
    "societe",   // Sans accent
  ];

  // Vérifier si c'est une société classique
  for (const pattern of regularCompanyPatterns) {
    if (legalFormLower.includes(pattern)) {
      return { companyType: "regular_company", isVatSubject: true };
    }
  }

  // Si on ne peut pas déterminer, on considère comme "unknown"
  // mais on assume potentiellement assujetti TVA pour être prudent
  return { companyType: "unknown", isVatSubject: false };
}

// Query interne pour récupérer la clé API
export const getApiKeyInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query("systemConfig")
      .filter((q) => q.eq(q.field("key"), "societe_api_key"))
      .first();
    return config?.value || null;
  },
});

// Vérifie un SIRET via l'API société.com et retourne les infos de l'entreprise
export const verifySiret = action({
  args: {
    siret: v.string(),
  },
  handler: async (ctx, args): Promise<{
    valid: boolean;
    companyName?: string;
    address?: string;
    postalCode?: string;
    city?: string;
    legalForm?: string;
    activityCode?: string;
    activityLabel?: string;
    creationDate?: string;
    isActive?: boolean;
    // Classification entreprise (pour prix conseillé)
    companyType?: CompanyType;
    isVatSubject?: boolean;
    error?: string;
  }> => {
    // Valider le format SIRET (14 chiffres)
    const siret = args.siret.replace(/\s/g, "");
    if (!/^\d{14}$/.test(siret)) {
      return { valid: false, error: "Format SIRET invalide (14 chiffres requis)" };
    }

    // Validation Luhn du SIRET
    let sum = 0;
    for (let i = 0; i < 14; i++) {
      let digit = parseInt(siret[i], 10);
      if (i % 2 === 0) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    if (sum % 10 !== 0) {
      return { valid: false, error: "Numéro SIRET invalide (checksum incorrecte)" };
    }

    // Récupérer la clé API via query interne
    const apiKey = await ctx.runQuery(internal.api.societe.getApiKeyInternal);

    if (!apiKey) {
      // Mode dégradé : validation locale seulement
      return {
        valid: true,
        error: "API société.com non configurée - validation locale uniquement",
      };
    }

    try {
      // Appel à l'API société.com - endpoint infoslegales
      // Documentation : https://api.societe.com/apisite/documentations/v1/documentation-api.html
      const response = await fetch(
        `https://api.societe.com/api/v1/entreprise/${siret}/infoslegales`,
        {
          method: "GET",
          headers: {
            "X-Authorization": `socapi ${apiKey}`,
            Accept: "application/json",
          },
        }
      );

      if (response.status === 404) {
        return { valid: false, error: "SIRET non trouvé dans la base société.com" };
      }

      if (response.status === 401 || response.status === 403) {
        return { valid: true, error: "Clé API société.com invalide ou expirée" };
      }

      if (response.status === 402) {
        return { valid: true, error: "Crédit API société.com épuisé" };
      }

      if (response.status === 429) {
        return { valid: true, error: "Limite de requêtes API atteinte, réessayez plus tard" };
      }

      if (!response.ok) {
        // En cas d'erreur API, on valide quand même localement
        return {
          valid: true,
          error: `Erreur API société.com (${response.status})`,
        };
      }

      const data = await response.json();
      console.log("API société.com - data reçue:", Object.keys(data));

      // Structure de réponse société.com /infoslegales
      // Les données sont dans data.infolegales
      const info = data.infolegales || data;
      console.log("info object keys:", Object.keys(info));
      console.log("denoinsee:", info.denoinsee);
      console.log("denorcs:", info.denorcs);

      // Extraire le nom (priorité: RCS > INSEE > commercial)
      const companyName =
        info.denorcs ||
        info.denoinsee ||
        info.nomcommercialrcs ||
        info.nomcommercialinsee ||
        info.enseignercs ||
        info.enseigneinsee ||
        null;

      console.log("companyName extrait:", companyName);

      // Extraire l'adresse
      const address = info.voieadressagercs || info.voieadressageinsee || null;
      const postalCode = info.codepostalrcs || info.codepostalinsee || null;
      const city = info.villercs || info.villeinsee || null;

      // Forme juridique et activité
      const legalForm = info.catjurlibrcs || info.catjurlibinsee || null;
      const activityCode = info.nafrcs || info.nafinsee || null;
      const activityLabel = info.naflibrcs || info.naflibinsee || null;

      // Dates et statut
      const creationDate = info.datecrearcs || info.datecreainsee || null;
      const isActive = !info.datefermrcs && !info.dateferminsee;

      // Classification de l'entreprise (micro-entreprise vs société)
      const classification = classifyCompanyType(legalForm);
      console.log("Classification entreprise:", legalForm, "->", classification);

      return {
        valid: true,
        companyName,
        address,
        postalCode,
        city,
        legalForm,
        activityCode,
        activityLabel,
        creationDate,
        isActive,
        companyType: classification.companyType,
        isVatSubject: classification.isVatSubject,
      };
    } catch (error) {
      // En cas d'erreur réseau, on valide quand même localement
      console.error("Erreur lors de l'appel API société.com:", error);
      return {
        valid: true,
        error: "Impossible de contacter l'API société.com - validation locale uniquement",
      };
    }
  },
});
