/**
 * Détecteur de coordonnées (téléphones / emails) dans du texte libre.
 *
 * Stratégie : normalisation agressive AVANT matching pour neutraliser les
 * contournements courants (espaces, points, tirets, mots, fullwidth, etc.).
 *
 * Utilisé côté serveur (mutations) ET côté client (warning live).
 * Réutilisé par l'OCR photo (le texte extrait passe dans le même filtre).
 */

import { ConvexError } from "convex/values";

// ─── Tables de remplacement ────────────────────────────────────────────────

// Mots → chiffres (FR + EN)
const WORD_TO_DIGIT: Record<string, string> = {
  zero: "0", zéro: "0", nul: "0", oh: "0", o: "0",
  un: "1", une: "1", one: "1",
  deux: "2", two: "2",
  trois: "3", three: "3",
  quatre: "4", four: "4",
  cinq: "5", five: "5",
  six: "6",
  sept: "7", seven: "7",
  huit: "8", eight: "8",
  neuf: "9", nine: "9",
};

// Substituts d'arobase
const AT_REPLACEMENTS = [
  /\barobase\b/g,
  /\barobas\b/g,
  /\bat\b/g,
  /\bchez\b/g,
  /\(\s*at\s*\)/g,
  /\[\s*at\s*\]/g,
  /\{\s*at\s*\}/g,
];

// Substituts de point
const DOT_REPLACEMENTS = [
  /\bpoint\b/g,
  /\bdot\b/g,
  /\(\s*dot\s*\)/g,
  /\[\s*dot\s*\]/g,
  /\(\s*point\s*\)/g,
  /\[\s*point\s*\]/g,
];

// ─── Normalisation ────────────────────────────────────────────────────────

/** Supprime les accents (NFD + supprime les diacritiques). */
function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Convertit les chiffres Unicode (fullwidth, arabes-indiens, etc.) en ASCII. */
function normalizeUnicodeDigits(s: string): string {
  return s.normalize("NFKD").replace(/[٠-٩]/g, (d) =>
    String(d.charCodeAt(0) - 0x0660)
  ).replace(/[۰-۹]/g, (d) =>
    String(d.charCodeAt(0) - 0x06f0)
  );
}

/**
 * Normalise un texte en vue de la détection.
 * - Lowercase
 * - Strip accents + Unicode digits → ASCII
 * - Mots-chiffres ("zéro", "six", "two") → chiffres
 * - Substituts d'arobase et de point → @ / .
 * - Compresse les séparateurs ENTRE chiffres (ex: "06 12 34" → "061234")
 */
export function normalizeForDetection(input: string): string {
  if (!input) return "";

  let s = input.toLowerCase();
  s = stripAccents(s);
  s = normalizeUnicodeDigits(s);

  // Mots-chiffres → chiffres (avec word boundaries)
  for (const [word, digit] of Object.entries(WORD_TO_DIGIT)) {
    s = s.replace(new RegExp(`\\b${word}\\b`, "g"), digit);
  }

  // Substituts d'arobase
  for (const re of AT_REPLACEMENTS) s = s.replace(re, "@");

  // Substituts de point
  for (const re of DOT_REPLACEMENTS) s = s.replace(re, ".");

  // Compresser les séparateurs entre chiffres (espaces, ponctuation, émojis...)
  // Itère plusieurs fois pour traiter "0 6 1 2" → "0612"
  for (let i = 0; i < 3; i++) {
    s = s.replace(/(\d)[\s.\-_/\\·•:()*\[\]]+(\d)/g, "$1$2");
  }

  return s;
}

// ─── Détection ─────────────────────────────────────────────────────────────

// Téléphone FR : +33|0033|0 suivi de [1-9] et 8 chiffres (10 chiffres au total)
const PHONE_FR_REGEX = /(?:\+33|0033|0)[1-9]\d{8}/;

// Fallback : suite de 9 à 13 chiffres consécutifs (téléphones internationaux).
// On EXCLUT les séquences de 14+ chiffres pour éviter de bloquer les SIRET (14),
// les IBAN partiels, ou des références produit longues.
// On EXCLUT aussi les séquences de 5 chiffres exactement (codes postaux FR).
const PHONE_GENERIC_REGEX = /(?<!\d)\d{9,13}(?!\d)/;

// Mode AGRESSIF (OCR) : pas de limite haute (un numéro de tel peut s'enchaîner
// avec d'autres chiffres détectés sur l'image). 9+ chiffres = suspect.
const PHONE_AGGRESSIVE_REGEX = /\d{9,}/;

// Email standard
const EMAIL_REGEX = /[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/;

// Caractères OCR ambigus → chiffre. Appliqué SEULEMENT en mode aggressive
// car ces substitutions provoquent beaucoup de faux positifs sur du texte.
// Exemples typiques d'erreurs OCR Vision sur des numéros écrits à la main :
//   O → 0   (lettre O)
//   o → 0   (lettre o)
//   l → 1   (L minuscule)
//   I → 1   (I majuscule)
//   B → 8   (B → 8)
//   S → 5   (S → 5)
//   Z → 2   (Z → 2)
//   g → 9   (g → 9)
//   q → 9   (q → 9)
const OCR_LOOKALIKES_TO_DIGIT: Record<string, string> = {
  o: "0",
  l: "1",
  i: "1",
  b: "8",
  s: "5",
  z: "2",
  g: "9",
  q: "9",
};

/**
 * Normalise UNIQUEMENT les sous-chaînes ressemblant à des numéros : si un mot
 * contient au moins 6 chiffres ET d'autres caractères dans la liste OCR-ambigus,
 * on remplace tous les ambigus par leurs chiffres.
 *
 * Évite de transformer "Bonjour" → "8onj0ur" (on ne touche pas à du vrai texte).
 */
function ocrAggressiveDigitSubstitution(text: string): string {
  return text.replace(/[\w\d]{6,}/g, (chunk) => {
    const digitCount = (chunk.match(/\d/g) || []).length;
    // Si déjà beaucoup de chiffres ET du bruit alphabétique → suspect
    if (digitCount >= 6) {
      return chunk
        .split("")
        .map((c) => OCR_LOOKALIKES_TO_DIGIT[c] ?? c)
        .join("");
    }
    return chunk;
  });
}

export interface DetectionResult {
  hasPhone: boolean;
  hasEmail: boolean;
  /** Échantillon trouvé (pour aider l'utilisateur à corriger). */
  phoneSample?: string;
  emailSample?: string;
}

/**
 * Détecte la présence de téléphone ou d'email dans un texte libre.
 * Renvoie un résultat structuré (sans throw) — le caller décide quoi faire.
 *
 * @param input texte à analyser
 * @param mode "default" (description) | "aggressive" (OCR photo, plus tolérant
 *             aux ambiguïtés OCR + matche des séquences de chiffres plus longues)
 */
export function detectContactInfo(
  input: string,
  mode: "default" | "aggressive" = "default"
): DetectionResult {
  let normalized = normalizeForDetection(input);

  if (mode === "aggressive") {
    normalized = ocrAggressiveDigitSubstitution(normalized);
  }

  const phoneRegex = mode === "aggressive" ? PHONE_AGGRESSIVE_REGEX : PHONE_GENERIC_REGEX;
  const phoneMatch =
    normalized.match(PHONE_FR_REGEX) || normalized.match(phoneRegex);
  const emailMatch = normalized.match(EMAIL_REGEX);

  return {
    hasPhone: Boolean(phoneMatch),
    hasEmail: Boolean(emailMatch),
    phoneSample: phoneMatch?.[0],
    emailSample: emailMatch?.[0],
  };
}

/**
 * Helper pour les mutations Convex : valide un texte et lance une erreur si
 * du contact est détecté. Le label aide l'utilisateur à savoir quel champ.
 *
 * Utilise `ConvexError` pour que le message soit transmis intact au client
 * (un `throw new Error(...)` arrive comme "Server Error" générique côté front).
 */
export function assertNoContactInfo(input: string | undefined | null, label = "Ce champ"): void {
  if (!input) return;
  const result = detectContactInfo(input);
  if (result.hasEmail && result.hasPhone) {
    throw new ConvexError(
      `${label} contient un email et un numéro de téléphone. Pour la sécurité de tous, les coordonnées doivent rester sur la plateforme.`
    );
  }
  if (result.hasEmail) {
    throw new ConvexError(
      `${label} contient une adresse email. Pour la sécurité de tous, les emails doivent rester sur la plateforme.`
    );
  }
  if (result.hasPhone) {
    throw new ConvexError(
      `${label} contient un numéro de téléphone. Pour la sécurité de tous, les numéros doivent rester sur la plateforme.`
    );
  }
}
