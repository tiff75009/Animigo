import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Auto-capture des paiements
 * Exécuté toutes les heures pour capturer les paiements des missions
 * terminées depuis 48h sans confirmation client
 * NOTE: Utilise une mutation au lieu d'une action pour contourner
 * le bug ctx.runQuery sur Convex self-hosted
 */
crons.hourly(
  "auto-capture-payments",
  { minuteUTC: 0 },
  internal.api.stripeInternal.triggerAutoCapture
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

/**
 * Nettoyage des notifications expirées
 * Exécuté tous les jours à 3h du matin (UTC) pour supprimer
 * les notifications de plus de 30 jours
 */
crons.daily(
  "cleanup-expired-notifications",
  { hourUTC: 3, minuteUTC: 0 },
  internal.notifications.mutations.cleanupExpired
);

/**
 * Auto-refus des missions expirées
 * Exécuté toutes les 15 minutes pour refuser automatiquement
 * les missions dont le délai d'acceptation est dépassé
 */
crons.interval(
  "auto-refuse-expired-missions",
  { minutes: 15 },
  internal.planning.acceptanceDeadline.autoRefuseExpiredMissions
);

/**
 * Auto-expiration des paiements en attente
 * Exécuté toutes les 15 minutes pour annuler automatiquement
 * les missions dont le délai de paiement est dépassé
 */
crons.interval(
  "auto-expire-pending-payments",
  { minutes: 15 },
  internal.planning.paymentDeadline.autoExpirePendingPayments
);

/**
 * Auto-démarrage des missions à venir
 * Exécuté toutes les 15 minutes pour passer en "in_progress"
 * les missions dont la date/heure de début est atteinte
 */
crons.interval(
  "auto-start-missions",
  { minutes: 15 },
  internal.planning.missions.autoStartMissions
);

/**
 * Auto-complétion des missions en cours
 * Exécuté toutes les 15 minutes pour passer en "completed"
 * les missions dont la date/heure de fin est dépassée
 */
crons.interval(
  "auto-complete-missions",
  { minutes: 15 },
  internal.planning.missions.autoCompleteMissions
);

/**
 * Auto-confirmation des missions terminées
 * Exécuté toutes les heures pour confirmer automatiquement
 * les missions dont le délai de confirmation client est dépassé
 */
crons.hourly(
  "auto-confirm-completed-missions",
  { minuteUTC: 30 },
  internal.planning.payouts.autoConfirmMissions
);

/**
 * Versements mensuels planifiés
 * Exécuté le 25 de chaque mois à 9h UTC pour déclencher
 * les versements groupés aux annonceurs (mode scheduled)
 */
crons.monthly(
  "process-scheduled-payouts",
  { day: 25, hourUTC: 9, minuteUTC: 0 },
  internal.planning.payouts.processScheduledPayouts
);

/**
 * Calcul hebdomadaire des scores de régularité
 * Exécuté chaque lundi à 6h UTC pour détecter les annonceurs
 * particuliers dont l'activité atteint les seuils professionnels
 */
crons.weekly(
  "compute-regularity-scores",
  { dayOfWeek: "monday", hourUTC: 6, minuteUTC: 0 },
  internal.planning.regularity.computeAllScores
);

export default crons;
