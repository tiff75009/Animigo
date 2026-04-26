/**
 * Constantes et fonctions de pricing centralisées
 * Évite la duplication de la formule de commission dans le code
 */

// Taux de commission plateforme
export const PLATFORM_FEE_PERCENT = 15;

// Taux de rétention annonceur (100% - commission)
export const ANNOUNCER_RATE = 0.85;

/**
 * Calcule les gains annonceur à partir du montant total en centimes
 * @param amountCents - Montant total en centimes
 * @param storedEarnings - Gains pré-calculés stockés en base (optionnel)
 * @returns Gains annonceur en centimes
 */
export function calculateAnnouncerEarnings(
  amountCents: number,
  storedEarnings?: number | null
): number {
  return storedEarnings ?? Math.round(amountCents * ANNOUNCER_RATE);
}

/**
 * Formate un montant en centimes vers un affichage en euros
 * @param amountCents - Montant en centimes
 * @returns Chaîne formatée (ex: "50,00 €")
 */
export function formatCurrency(amountCents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amountCents / 100);
}

/**
 * Formate les gains annonceur pour l'affichage
 * @param amountCents - Montant total en centimes
 * @param storedEarnings - Gains pré-calculés stockés en base (optionnel)
 * @returns Chaîne formatée (ex: "42,50 €")
 */
export function formatAnnouncerEarnings(
  amountCents: number,
  storedEarnings?: number | null
): string {
  const earnings = calculateAnnouncerEarnings(amountCents, storedEarnings);
  return formatCurrency(earnings);
}

/**
 * Durées de séance autorisées (en minutes) — règle métier :
 * multiples de 30 min, max 2h30. Sert pour les sélecteurs et la validation.
 */
export const ALLOWED_SESSION_DURATIONS = [30, 60, 90, 120, 150] as const;
export const MAX_SESSION_DURATION = 150;

/** Vérifie qu'une durée respecte la règle (multiple de 30, max 150) */
export function isValidSessionDuration(d: number | null | undefined): boolean {
  if (!d || d <= 0) return false;
  if (d > MAX_SESSION_DURATION) return false;
  return d % 30 === 0;
}

/** Format affichage : 30 → "30min", 60 → "1h", 90 → "1h30", 120 → "2h", etc. */
export function formatSessionDuration(durationMinutes: number): string {
  if (durationMinutes < 60) return `${durationMinutes}min`;
  const h = Math.floor(durationMinutes / 60);
  const m = durationMinutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

/**
 * Calcule le prix d'UNE séance pour une formule (collective ou multi-séances).
 *
 * Convention :
 * - `pricingMode="per_session"` → `price` est déjà le prix d'une séance complète
 * - `pricingMode="per_hour"` (défaut) → `price` est horaire, on multiplie par duration/60
 * - Rétro-compat : si `pricingMode` absent, on tombe back sur `priceUnit`
 *
 * Exemples :
 *   - price=2500 (25€), priceUnit="hour", duration=120 (2h) → 5000 (50€)
 *   - price=5000 (50€), pricingMode="per_session", duration=120 → 5000 (50€)
 *
 * @param variant - Champs nécessaires de la variante
 * @returns Prix unitaire d'une séance en centimes
 */
export function getVariantSessionPrice(variant: {
  price: number;
  priceUnit?: string | null;
  duration?: number | null;
  pricingMode?: "per_session" | "per_hour" | null;
}): number {
  const duration = variant.duration ?? 60;

  // Nouveau système : pricingMode prioritaire
  if (variant.pricingMode === "per_session") {
    return variant.price;
  }
  if (variant.pricingMode === "per_hour") {
    return Math.round((variant.price * duration) / 60);
  }

  // Rétro-compat : on dérive du priceUnit
  const unit = variant.priceUnit ?? "hour";
  switch (unit) {
    case "hour":
      return Math.round((variant.price * duration) / 60);
    case "half_day":
      return Math.round((variant.price * duration) / 240);
    case "day":
      return Math.round((variant.price * duration) / 480);
    case "week":
      return Math.round((variant.price * duration) / (60 * 24 * 7));
    case "month":
      return Math.round((variant.price * duration) / (60 * 24 * 30));
    case "flat":
    default:
      return variant.price;
  }
}

/**
 * Calcule le total HT d'une formule collective ou multi-séances.
 * @param variant - Variante de service
 * @param sessionCount - Nombre de séances/créneaux réservés
 * @param animalCount - Nombre d'animaux
 * @returns Montant total HT en centimes
 */
export function getCollectiveOrMultiSessionTotal(
  variant: { price: number; priceUnit?: string | null; duration?: number | null },
  sessionCount: number,
  animalCount: number
): number {
  const sessionPrice = getVariantSessionPrice(variant);
  return Math.round(sessionPrice * sessionCount * Math.max(1, animalCount));
}
