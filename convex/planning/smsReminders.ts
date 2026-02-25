// @ts-nocheck
import { internalMutation } from "../_generated/server";

/**
 * Envoie des rappels SMS J-1 pour les missions à venir demain.
 * Cron quotidien à 9h UTC (~10h Paris).
 *
 * NOTE: Les SMS Brevo ont été désactivés. Ce cron ne fait plus rien.
 * TODO: Réimplémenter avec un nouveau provider SMS si nécessaire.
 */
export const sendDayBeforeReminders = internalMutation({
  args: {},
  handler: async (_ctx) => {
    console.log("[SMS Reminders] SMS désactivé (Brevo supprimé). Aucun SMS envoyé.");
    return;
  },
});
