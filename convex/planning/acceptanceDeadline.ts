// @ts-nocheck
import { query, internalQuery, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { getEmailConfigFromDb } from "../api/emailInternal";

// ============================================
// TYPES
// ============================================

interface AcceptanceDeadlineConfig {
  enabled: boolean;
  // Seuils d'intervalle (en jours)
  intervalShortDays: number;  // < 7j = mission proche
  intervalLongDays: number;   // > 30j = mission lointaine
  // Délais d'acceptation (en heures)
  deadlineShortHours: number;   // 12h pour mission proche
  deadlineMediumHours: number;  // 36h pour mission moyenne
  deadlineLongHours: number;    // 168h (7j) pour mission lointaine
  // Minimum de réservation à l'avance (en heures)
  minimumBookingAdvanceHours: number; // 24h
}

// ============================================
// CONFIGURATION
// ============================================

// Valeurs par défaut
const DEFAULT_CONFIG: AcceptanceDeadlineConfig = {
  enabled: true,
  intervalShortDays: 7,
  intervalLongDays: 30,
  deadlineShortHours: 12,
  deadlineMediumHours: 36,
  deadlineLongHours: 168, // 7 jours
  minimumBookingAdvanceHours: 24,
};

/**
 * Récupère la configuration des délais d'acceptation depuis systemConfig
 * Usage interne uniquement
 */
export const getAcceptanceDeadlineConfig = internalQuery({
  args: {},
  handler: async (ctx): Promise<AcceptanceDeadlineConfig> => {
    const configs = await ctx.db.query("systemConfig").collect();
    const configMap = new Map(configs.map((c) => [c.key, c.value]));

    return {
      enabled: configMap.get("acceptance_deadline_enabled") !== "false",
      intervalShortDays: parseInt(configMap.get("acceptance_interval_short_days") || "") || DEFAULT_CONFIG.intervalShortDays,
      intervalLongDays: parseInt(configMap.get("acceptance_interval_long_days") || "") || DEFAULT_CONFIG.intervalLongDays,
      deadlineShortHours: parseInt(configMap.get("acceptance_deadline_short_hours") || "") || DEFAULT_CONFIG.deadlineShortHours,
      deadlineMediumHours: parseInt(configMap.get("acceptance_deadline_medium_hours") || "") || DEFAULT_CONFIG.deadlineMediumHours,
      deadlineLongHours: parseInt(configMap.get("acceptance_deadline_long_hours") || "") || DEFAULT_CONFIG.deadlineLongHours,
      minimumBookingAdvanceHours: parseInt(configMap.get("minimum_booking_advance_hours") || "") || DEFAULT_CONFIG.minimumBookingAdvanceHours,
    };
  },
});

/**
 * Version publique pour le frontend (annonceur/admin)
 */
export const getAcceptanceDeadlineConfigPublic = query({
  args: {},
  handler: async (ctx): Promise<AcceptanceDeadlineConfig> => {
    const configs = await ctx.db.query("systemConfig").collect();
    const configMap = new Map(configs.map((c) => [c.key, c.value]));

    return {
      enabled: configMap.get("acceptance_deadline_enabled") !== "false",
      intervalShortDays: parseInt(configMap.get("acceptance_interval_short_days") || "") || DEFAULT_CONFIG.intervalShortDays,
      intervalLongDays: parseInt(configMap.get("acceptance_interval_long_days") || "") || DEFAULT_CONFIG.intervalLongDays,
      deadlineShortHours: parseInt(configMap.get("acceptance_deadline_short_hours") || "") || DEFAULT_CONFIG.deadlineShortHours,
      deadlineMediumHours: parseInt(configMap.get("acceptance_deadline_medium_hours") || "") || DEFAULT_CONFIG.deadlineMediumHours,
      deadlineLongHours: parseInt(configMap.get("acceptance_deadline_long_hours") || "") || DEFAULT_CONFIG.deadlineLongHours,
      minimumBookingAdvanceHours: parseInt(configMap.get("minimum_booking_advance_hours") || "") || DEFAULT_CONFIG.minimumBookingAdvanceHours,
    };
  },
});

// ============================================
// CALCUL DE LA DEADLINE
// ============================================

/**
 * Calcule la deadline d'acceptation en fonction de l'intervalle entre
 * la réservation et le début de la mission.
 *
 * @param bookingTimestamp - Timestamp de la réservation (Date.now())
 * @param missionStartDate - Date de début de la mission "YYYY-MM-DD"
 * @param config - Configuration des délais
 * @returns Timestamp de la deadline ou null si le système est désactivé
 */
export function calculateAcceptanceDeadline(
  bookingTimestamp: number,
  missionStartDate: string,
  config: AcceptanceDeadlineConfig
): number | null {
  if (!config.enabled) {
    return null;
  }

  // Calculer le nombre de jours entre maintenant et le début de la mission
  const now = new Date(bookingTimestamp);
  const missionStart = new Date(missionStartDate);

  // Reset les heures pour comparer uniquement les dates
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDate = new Date(missionStart.getFullYear(), missionStart.getMonth(), missionStart.getDate());

  const diffMs = startDate.getTime() - nowDate.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // Déterminer le délai d'acceptation en heures
  let deadlineHours: number;

  if (diffDays < config.intervalShortDays) {
    // Mission proche (< 7 jours) -> délai court (12h)
    deadlineHours = config.deadlineShortHours;
  } else if (diffDays <= config.intervalLongDays) {
    // Mission moyenne (7-30 jours) -> délai moyen (36h)
    deadlineHours = config.deadlineMediumHours;
  } else {
    // Mission lointaine (> 30 jours) -> délai long (168h = 7j)
    deadlineHours = config.deadlineLongHours;
  }

  // Calculer le timestamp de la deadline
  const deadlineTimestamp = bookingTimestamp + (deadlineHours * 60 * 60 * 1000);

  return deadlineTimestamp;
}

/**
 * Vérifie si une réservation respecte le minimum de temps à l'avance
 *
 * @param missionStartDate - Date de début de la mission "YYYY-MM-DD"
 * @param missionStartTime - Heure de début optionnelle "HH:MM"
 * @param config - Configuration
 * @returns true si OK, false si trop proche
 */
export function isBookingAdvanceValid(
  missionStartDate: string,
  missionStartTime: string | undefined,
  config: AcceptanceDeadlineConfig
): boolean {
  if (!config.enabled) {
    return true;
  }

  const now = Date.now();

  // Parser la date de mission
  const [year, month, day] = missionStartDate.split("-").map(Number);
  let missionStart = new Date(year, month - 1, day);

  // Si on a une heure de début, l'ajouter
  if (missionStartTime) {
    const [hours, minutes] = missionStartTime.split(":").map(Number);
    missionStart.setHours(hours, minutes, 0, 0);
  } else {
    // Par défaut, début de journée (8h)
    missionStart.setHours(8, 0, 0, 0);
  }

  const minimumAdvanceMs = config.minimumBookingAdvanceHours * 60 * 60 * 1000;
  const minBookingTime = now + minimumAdvanceMs;

  return missionStart.getTime() >= minBookingTime;
}

// ============================================
// AUTO-REFUS DES MISSIONS EXPIRÉES
// ============================================

/**
 * Mutation interne appelée par le cron toutes les 15 minutes
 * Refuse automatiquement les missions dont la deadline est dépassée
 */
export const autoRefuseExpiredMissions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Récupérer les missions pending_acceptance avec une deadline dépassée
    const expiredMissions = await ctx.db
      .query("missions")
      .withIndex("by_pending_deadline", (q) =>
        q.eq("status", "pending_acceptance")
      )
      .filter((q) =>
        q.and(
          q.neq(q.field("acceptanceDeadline"), undefined),
          q.lt(q.field("acceptanceDeadline"), now)
        )
      )
      .collect();

    let refusedCount = 0;
    const notifications: Array<{
      clientId: Id<"users">;
      announcerName: string;
      serviceName: string;
      missionId: Id<"missions">;
    }> = [];

    for (const mission of expiredMissions) {
      // Mettre à jour la mission
      await ctx.db.patch(mission._id, {
        status: "refused",
        acceptanceDeadlineAutoRefused: true,
        cancellationReason: "Délai d'acceptation dépassé (auto-refus)",
        updatedAt: now,
      });

      // Récupérer l'annonceur pour le nom
      const announcer = await ctx.db.get(mission.announcerId);
      const announcerName = announcer
        ? `${announcer.firstName} ${announcer.lastName.charAt(0)}.`
        : "L'annonceur";

      // Préparer la notification
      notifications.push({
        clientId: mission.clientId,
        announcerName,
        serviceName: mission.serviceName,
        missionId: mission._id,
      });

      refusedCount++;
    }

    // Envoyer les notifications (via scheduler pour ne pas bloquer)
    for (const notif of notifications) {
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.actions.sendMissionAutoRefusedNotification,
        notif
      );
    }

    // Envoyer les emails d'auto-refus aux clients
    // Récupérer la config email depuis la DB
    const { emailConfig: deadlineEmailConfig, appUrl: deadlineAppUrl } = await getEmailConfigFromDb(ctx.db);

    if (deadlineEmailConfig) {
      for (const mission of expiredMissions) {
        const client = await ctx.db.get(mission.clientId);
        const announcer = await ctx.db.get(mission.announcerId);
        if (client?.email) {
          const announcerName = announcer
            ? `${announcer.firstName} ${announcer.lastName.charAt(0)}.`
            : "Le prestataire";

          await ctx.scheduler.runAfter(
            0,
            internal.api.email.sendMissionAutoRefusedEmail,
            {
              clientEmail: client.email,
              clientName: client.firstName,
              announcerName,
              serviceName: mission.serviceName,
              startDate: mission.startDate,
              endDate: mission.endDate,
              emailConfig: deadlineEmailConfig || { apiKey: "" },
              appUrl: deadlineAppUrl,
            }
          );
        }
      }
    }

    console.log(`[autoRefuseExpiredMissions] ${refusedCount} mission(s) auto-refusée(s)`);

    return {
      success: true,
      refusedCount,
    };
  },
});

// ============================================
// HELPERS EXPORTÉS
// ============================================

/**
 * Récupère le délai restant avant expiration en ms
 */
export function getTimeRemainingMs(deadlineTimestamp: number): number {
  return Math.max(0, deadlineTimestamp - Date.now());
}

/**
 * Retourne le pourcentage de temps restant (0-100)
 */
export function getTimeRemainingPercent(
  bookingTimestamp: number,
  deadlineTimestamp: number
): number {
  const totalDuration = deadlineTimestamp - bookingTimestamp;
  const remaining = deadlineTimestamp - Date.now();

  if (totalDuration <= 0) return 0;
  if (remaining <= 0) return 0;

  return Math.min(100, Math.max(0, (remaining / totalDuration) * 100));
}

/**
 * Détermine le niveau d'urgence basé sur le pourcentage restant
 */
export function getUrgencyLevel(percentRemaining: number): "normal" | "warning" | "urgent" {
  if (percentRemaining > 50) return "normal";
  if (percentRemaining > 20) return "warning";
  return "urgent";
}
