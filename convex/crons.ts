import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Auto-capture des paiements
 * Exécuté toutes les heures pour capturer les paiements des missions
 * terminées depuis 48h sans confirmation client
 */
crons.hourly(
  "auto-capture-payments",
  { minuteUTC: 0 },
  internal.api.stripe.processAutoCapture
);

/**
 * Nettoyage des sessions de paiement expirées
 * Exécuté toutes les 6 heures pour marquer comme expirées
 * les sessions Checkout qui n'ont pas été complétées
 */
crons.interval(
  "cleanup-expired-sessions",
  { hours: 6 },
  internal.api.stripeInternal.cleanupExpiredSessions
);

export default crons;
