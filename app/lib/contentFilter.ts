/**
 * Détecteur de coordonnées (téléphones / emails) — version client.
 * Logique identique au filtre côté serveur (`convex/lib/contentFilter.ts`)
 * pour offrir un feedback live (warning sous le textarea) avant le submit.
 */

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

const AT_REPLACEMENTS = [
  /\barobase\b/g,
  /\barobas\b/g,
  /\bat\b/g,
  /\bchez\b/g,
  /\(\s*at\s*\)/g,
  /\[\s*at\s*\]/g,
  /\{\s*at\s*\}/g,
];

const DOT_REPLACEMENTS = [
  /\bpoint\b/g,
  /\bdot\b/g,
  /\(\s*dot\s*\)/g,
  /\[\s*dot\s*\]/g,
  /\(\s*point\s*\)/g,
  /\[\s*point\s*\]/g,
];

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normalizeUnicodeDigits(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

export function normalizeForDetection(input: string): string {
  if (!input) return "";
  let s = input.toLowerCase();
  s = stripAccents(s);
  s = normalizeUnicodeDigits(s);
  for (const [word, digit] of Object.entries(WORD_TO_DIGIT)) {
    s = s.replace(new RegExp(`\\b${word}\\b`, "g"), digit);
  }
  for (const re of AT_REPLACEMENTS) s = s.replace(re, "@");
  for (const re of DOT_REPLACEMENTS) s = s.replace(re, ".");
  for (let i = 0; i < 3; i++) {
    s = s.replace(/(\d)[\s.\-_/\\·•:()*\[\]]+(\d)/g, "$1$2");
  }
  return s;
}

const PHONE_FR_REGEX = /(?:\+33|0033|0)[1-9]\d{8}/;
// 9 à 13 chiffres consécutifs (téléphones) — exclut SIRET (14), longues réfs, codes postaux (5)
const PHONE_GENERIC_REGEX = /(?<!\d)\d{9,13}(?!\d)/;
const EMAIL_REGEX = /[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/;

export interface DetectionResult {
  hasPhone: boolean;
  hasEmail: boolean;
  phoneSample?: string;
  emailSample?: string;
}

export function detectContactInfo(input: string): DetectionResult {
  const normalized = normalizeForDetection(input);
  const phoneMatch = normalized.match(PHONE_FR_REGEX) || normalized.match(PHONE_GENERIC_REGEX);
  const emailMatch = normalized.match(EMAIL_REGEX);
  return {
    hasPhone: Boolean(phoneMatch),
    hasEmail: Boolean(emailMatch),
    phoneSample: phoneMatch?.[0],
    emailSample: emailMatch?.[0],
  };
}

/** Message d'avertissement à afficher sous un champ. Renvoie null si rien. */
export function getContactInfoWarning(input: string | undefined | null): string | null {
  if (!input) return null;
  const r = detectContactInfo(input);
  if (r.hasEmail && r.hasPhone) {
    return "Les emails et numéros de téléphone ne sont pas autorisés. Les échanges doivent rester sur Animigo.";
  }
  if (r.hasEmail) return "Les adresses email ne sont pas autorisées dans ce champ.";
  if (r.hasPhone) return "Les numéros de téléphone ne sont pas autorisés dans ce champ.";
  return null;
}
