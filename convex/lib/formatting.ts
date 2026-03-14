/**
 * Utilitaires de formatage centralisés.
 * Source unique de vérité pour le formatage des prix et dates.
 */

/**
 * Formate un montant en centimes vers un string en euros.
 * Ex: 1234 → "12,34 €"
 */
export function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

/**
 * Formate une date ISO (YYYY-MM-DD) en format français (JJ/MM/AAAA).
 * Ex: "2026-03-15" → "15/03/2026"
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

/**
 * Formate un timestamp en date française.
 * Ex: 1710460800000 → "15/03/2026"
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

/**
 * Formate un timestamp en date + heure française.
 * Ex: 1710460800000 → "15/03/2026 à 14h30"
 */
export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const d = formatTimestamp(timestamp);
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${d} à ${h}h${m}`;
}
