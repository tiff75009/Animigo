/**
 * Utilitaires de détection de contenu interdit (emails, téléphones)
 * Détecte les tentatives d'obfuscation comme:
 * - 06 12 34 56 78
 * - 06-12-34-56-78
 * - 06.12.34.56.78
 * - 06X12X34X56X78
 * - zero six douze...
 * - 0 6 1 2 3 4 5 6 7 8
 * - +33612345678
 * - email@domain.com
 * - email [at] domain [dot] com
 */

// Normalise le texte pour la détection
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    // Remplacer les substitutions de lettres courantes
    .replace(/[àáâãäå]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôõö]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/[ç]/g, "c")
    // Remplacer les mots par des chiffres
    .replace(/\b(zero|zéro)\b/gi, "0")
    .replace(/\b(un|une)\b/gi, "1")
    .replace(/\b(deux)\b/gi, "2")
    .replace(/\b(trois)\b/gi, "3")
    .replace(/\b(quatre)\b/gi, "4")
    .replace(/\b(cinq)\b/gi, "5")
    .replace(/\b(six)\b/gi, "6")
    .replace(/\b(sept)\b/gi, "7")
    .replace(/\b(huit)\b/gi, "8")
    .replace(/\b(neuf)\b/gi, "9")
    .replace(/\b(dix)\b/gi, "10")
    // Remplacer les caractères de substitution
    .replace(/[oO]/g, "0") // o -> 0
    .replace(/[iIlL|!1]/g, "1") // i, l, |, ! -> 1
    .replace(/[@]/g, "a")
    .replace(/[€3]/g, "e")
    .replace(/[$5]/g, "s");
}

// Extrait uniquement les chiffres d'une chaîne
function extractDigits(text: string): string {
  const normalized = normalizeText(text);
  return normalized.replace(/[^0-9]/g, "");
}

// Caractères séparateurs courants pour les numéros de téléphone
const PHONE_SEPARATORS = "[\\s.\\-_xX*/\\\\|,;:()\\[\\]{}]{0,4}";
const PHONE_SEP_REQUIRED = "[\\s.\\-_xX*/\\\\|,;:()\\[\\]{}]+";

// Détecte les numéros de téléphone français
export function detectPhoneNumber(text: string): {
  found: boolean;
  confidence: "high" | "medium" | "low" | "none";
  matches: string[];
} {
  const matches: string[] = [];
  let confidence: "high" | "medium" | "low" | "none" = "none";

  // Patterns de téléphone français
  const phonePatterns = [
    // Format standard: 0612345678, 06 12 34 56 78, 06.12.34.56.78, 06-12-34-56-78
    /(?:(?:\+|00)33[\s.-]?|0)[1-9](?:[\s.-]?\d{2}){4}/g,
    // Format avec TOUS les séparateurs possibles (espaces, tirets, slashs, etc.)
    new RegExp(`0[1-9]${PHONE_SEPARATORS}\\d{2}${PHONE_SEPARATORS}\\d{2}${PHONE_SEPARATORS}\\d{2}${PHONE_SEPARATORS}\\d{2}`, "gi"),
    // Format international
    /\+33[\s.-]?[1-9][\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}/g,
    // Format avec séparateurs mixtes entre chaque chiffre (06 - 67 / 65 56 54)
    new RegExp(`0[1-9]${PHONE_SEP_REQUIRED}\\d{1,2}${PHONE_SEP_REQUIRED}\\d{1,2}${PHONE_SEPARATORS}\\d{1,2}${PHONE_SEPARATORS}\\d{1,2}`, "gi"),
  ];

  // Tester les patterns directs
  for (const pattern of phonePatterns) {
    const found = text.match(pattern);
    if (found) {
      matches.push(...found);
      confidence = "high";
    }
  }

  // Vérifier les chiffres extraits (après normalisation)
  const digits = extractDigits(text);

  // Chercher des séquences de 10 chiffres commençant par 0[1-9]
  const tenDigitPattern = /0[1-9]\d{8}/g;
  const digitMatches = digits.match(tenDigitPattern);
  if (digitMatches) {
    for (const match of digitMatches) {
      if (!matches.some(m => extractDigits(m) === match)) {
        matches.push(match);
        if (confidence === "none") confidence = "medium";
      }
    }
  }

  // Détecter les patterns obfusqués avec X, *, /, etc.
  const obfuscatedPatterns = [
    // Pattern avec séparateurs entre paires de chiffres
    new RegExp(`0[1-9]\\s*[xX*.\\-_/\\\\|]\\s*\\d{1,2}\\s*[xX*.\\-_/\\\\|]\\s*\\d{1,2}\\s*[xX*.\\-_/\\\\|]?\\s*\\d{1,2}\\s*[xX*.\\-_/\\\\|]?\\s*\\d{1,2}`, "gi"),
    /0[1-9](?:[\s]+\d){8,}/g, // 0 6 1 2 3 4 5 6 7 8
    // Pattern ultra-flexible: 10 chiffres avec n'importe quels caractères entre eux
    /0[1-9][^a-zA-Z0-9]*\d[^a-zA-Z0-9]*\d[^a-zA-Z0-9]*\d[^a-zA-Z0-9]*\d[^a-zA-Z0-9]*\d[^a-zA-Z0-9]*\d[^a-zA-Z0-9]*\d[^a-zA-Z0-9]*\d/gi,
  ];

  for (const pattern of obfuscatedPatterns) {
    const found = text.match(pattern);
    if (found) {
      // Vérifier que le match contient bien 10 chiffres
      for (const m of found) {
        const digitsInMatch = m.replace(/[^0-9]/g, "");
        if (digitsInMatch.length === 10 && /^0[1-9]/.test(digitsInMatch)) {
          if (!matches.includes(m)) {
            matches.push(m);
          }
          if (confidence !== "high") {
            confidence = "medium";
          }
        }
      }
    }
  }

  // Vérifier si le texte contient beaucoup de chiffres suspects
  const suspiciousDigitCount = (text.match(/\d/g) || []).length;
  if (suspiciousDigitCount >= 8 && suspiciousDigitCount <= 15) {
    // Vérifier si les chiffres sont espacés de manière suspecte
    const spacedDigits = text.match(/\d[\s.\-_xX*/\\|]{1,4}\d[\s.\-_xX*/\\|]{1,4}\d/g);
    if (spacedDigits && spacedDigits.length >= 3) {
      if (confidence === "none") confidence = "low";
      matches.push("Chiffres espacés suspects");
    }
  }

  return {
    found: matches.length > 0,
    confidence,
    matches: [...new Set(matches)], // Dédupliquer
  };
}

// Détecte les adresses email
export function detectEmail(text: string): {
  found: boolean;
  confidence: "high" | "medium" | "low" | "none";
  matches: string[];
} {
  const matches: string[] = [];
  let confidence: "high" | "medium" | "low" | "none" = "none";

  // Pattern email standard
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const standardMatches = text.match(emailPattern);
  if (standardMatches) {
    matches.push(...standardMatches);
    confidence = "high";
  }

  // Patterns obfusqués
  const obfuscatedPatterns = [
    // [at], (at), {at}, -at-, _at_
    /[a-zA-Z0-9._%+-]+[\s]*[\[\(\{<]?[\s]*(?:at|arobase|@)[\s]*[\]\)\}>]?[\s]*[a-zA-Z0-9.-]+[\s]*[\[\(\{<]?[\s]*(?:dot|point|\.)[\s]*[\]\)\}>]?[\s]*[a-zA-Z]{2,}/gi,
    // Avec espaces: email at domain dot com
    /[a-zA-Z0-9._]+\s+(?:at|arobase|chez)\s+[a-zA-Z0-9.-]+\s+(?:dot|point)\s+[a-zA-Z]{2,}/gi,
  ];

  for (const pattern of obfuscatedPatterns) {
    const found = text.match(pattern);
    if (found) {
      matches.push(...found);
      if (confidence === "none") confidence = "medium";
    }
  }

  // Détecter les mentions de domaines email courants
  const domainHints = /(?:gmail|hotmail|yahoo|outlook|orange|free|sfr|wanadoo|laposte)\s*[\[\(\{<]?\s*(?:dot|point|\.)\s*[\]\)\}>]?\s*(?:com|fr|net)/gi;
  const domainMatches = text.match(domainHints);
  if (domainMatches) {
    matches.push(...domainMatches);
    if (confidence === "none") confidence = "low";
  }

  return {
    found: matches.length > 0,
    confidence,
    matches: [...new Set(matches)],
  };
}

// Analyse complète du contenu
export interface ContentAnalysisResult {
  isClean: boolean;
  requiresModeration: boolean;
  phoneDetection: ReturnType<typeof detectPhoneNumber>;
  emailDetection: ReturnType<typeof detectEmail>;
  message: string | null;
}

export function analyzeContent(text: string): ContentAnalysisResult {
  const phoneDetection = detectPhoneNumber(text);
  const emailDetection = detectEmail(text);

  const hasHighConfidenceIssue =
    phoneDetection.confidence === "high" || emailDetection.confidence === "high";

  const hasMediumConfidenceIssue =
    phoneDetection.confidence === "medium" || emailDetection.confidence === "medium";

  const hasLowConfidenceIssue =
    phoneDetection.confidence === "low" || emailDetection.confidence === "low";

  let isClean = true;
  let requiresModeration = false;
  let message: string | null = null;

  if (hasHighConfidenceIssue) {
    isClean = false;
    requiresModeration = false; // Bloqué directement
    if (phoneDetection.confidence === "high" && emailDetection.confidence === "high") {
      message = "Le texte contient un numéro de téléphone et une adresse email. Ces informations sont interdites.";
    } else if (phoneDetection.confidence === "high") {
      message = "Le texte contient un numéro de téléphone. Cette information est interdite.";
    } else {
      message = "Le texte contient une adresse email. Cette information est interdite.";
    }
  } else if (hasMediumConfidenceIssue) {
    isClean = false;
    requiresModeration = true;
    message = "Le texte semble contenir des informations de contact masquées. Il sera soumis à modération.";
  } else if (hasLowConfidenceIssue) {
    isClean = true;
    requiresModeration = true;
    message = null; // Pas de message visible, mais modération en arrière-plan
  }

  return {
    isClean,
    requiresModeration,
    phoneDetection,
    emailDetection,
    message,
  };
}

// Fonction simplifiée pour le frontend
export function checkContentForProhibitedInfo(name: string, description: string): {
  isValid: boolean;
  requiresModeration: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  let requiresModeration = false;

  const nameAnalysis = analyzeContent(name);
  const descriptionAnalysis = analyzeContent(description);

  if (!nameAnalysis.isClean && nameAnalysis.message) {
    errors.push(`Nom du service: ${nameAnalysis.message}`);
  }
  if (!descriptionAnalysis.isClean && descriptionAnalysis.message) {
    errors.push(`Description: ${descriptionAnalysis.message}`);
  }

  if (nameAnalysis.requiresModeration || descriptionAnalysis.requiresModeration) {
    requiresModeration = true;
  }

  return {
    isValid: errors.length === 0,
    requiresModeration,
    errors,
  };
}
