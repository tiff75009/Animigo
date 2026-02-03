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
