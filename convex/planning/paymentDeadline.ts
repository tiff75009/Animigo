// @ts-nocheck
import { query, internalQuery, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { getEmailConfigFromDb } from "../api/emailInternal";

// ============================================
// TYPES
// ============================================

interface PaymentDeadlineConfig {
  enabled: boolean;
  hours: number; // Nombre d'heures pour payer après acceptation
}

// ============================================
// CONFIGURATION
// ============================================

// Valeurs par défaut
const DEFAULT_CONFIG: PaymentDeadlineConfig = {
  enabled: true,
  hours: 48, // 48h par défaut pour payer
};

/**
 * Récupère la configuration des délais de paiement depuis systemConfig
 * Usage interne uniquement
 */
export const getPaymentDeadlineConfig = internalQuery({
  args: {},
  handler: async (ctx): Promise<PaymentDeadlineConfig> => {
    const configs = await ctx.db.query("systemConfig").collect();
    const configMap = new Map(configs.map((c) => [c.key, c.value]));

    return {
      enabled: configMap.get("payment_deadline_enabled") !== "false",
      hours: parseInt(configMap.get("payment_deadline_hours") || "") || DEFAULT_CONFIG.hours,
    };
  },
});

/**
 * Version publique pour le frontend (admin)
 */
export const getPaymentDeadlineConfigPublic = query({
  args: {},
  handler: async (ctx): Promise<PaymentDeadlineConfig> => {
    const configs = await ctx.db.query("systemConfig").collect();
    const configMap = new Map(configs.map((c) => [c.key, c.value]));

    return {
      enabled: configMap.get("payment_deadline_enabled") !== "false",
      hours: parseInt(configMap.get("payment_deadline_hours") || "") || DEFAULT_CONFIG.hours,
    };
  },
});

// ============================================
// CALCUL DE LA DEADLINE
// ============================================

/**
 * Calcule la deadline de paiement
 *
 * @param acceptanceTimestamp - Timestamp de l'acceptation (Date.now())
 * @param config - Configuration des délais
 * @returns Timestamp de la deadline ou null si le système est désactivé
 */
export function calculatePaymentDeadline(
  acceptanceTimestamp: number,
  config: PaymentDeadlineConfig
): number | null {
  if (!config.enabled) {
    return null;
  }

  // Calculer le timestamp de la deadline
  const deadlineTimestamp = acceptanceTimestamp + (config.hours * 60 * 60 * 1000);

  return deadlineTimestamp;
}

// ============================================
// AUTO-EXPIRATION DES PAIEMENTS EN ATTENTE
// ============================================

/**
 * Mutation interne appelée par le cron toutes les 15 minutes
 * Expire automatiquement les missions dont le délai de paiement est dépassé
 */
export const autoExpirePendingPayments = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Récupérer les missions pending_confirmation avec une deadline de paiement dépassée
    const expiredMissions = await ctx.db
      .query("missions")
      .withIndex("by_pending_payment_deadline", (q) =>
        q.eq("status", "pending_confirmation")
      )
      .filter((q) =>
        q.and(
          q.neq(q.field("paymentDeadline"), undefined),
          q.lt(q.field("paymentDeadline"), now)
        )
      )
      .collect();

    let expiredCount = 0;
    const notifications: Array<{
      clientId: Id<"users">;
      announcerId: Id<"users">;
      serviceName: string;
      missionId: Id<"missions">;
    }> = [];

    for (const mission of expiredMissions) {
      // Libérer les places dans les créneaux collectifs si applicable
      if (mission.sessionType === "collective" && mission.collectiveSlotIds && mission.collectiveSlotIds.length > 0) {
        const animalCount = mission.animalCount || 1;
        for (const slotId of mission.collectiveSlotIds) {
          const slot = await ctx.db.get(slotId);
          if (slot) {
            await ctx.db.patch(slotId, {
              bookedAnimals: Math.max(0, slot.bookedAnimals - animalCount),
              updatedAt: now,
            });
          }
        }
      }

      // Mettre à jour la mission
      await ctx.db.patch(mission._id, {
        status: "cancelled",
        paymentDeadlineAutoExpired: true,
        cancellationReason: "Délai de paiement dépassé",
        updatedAt: now,
      });

      // Annuler le paiement Stripe si existant
      if (mission.stripePaymentId) {
        const payment = await ctx.db.get(mission.stripePaymentId);
        if (payment && payment.status === "pending") {
          await ctx.db.patch(mission.stripePaymentId, {
            status: "cancelled",
            cancelledAt: now,
            updatedAt: now,
          });
        }
      }

      // Préparer la notification
      notifications.push({
        clientId: mission.clientId,
        announcerId: mission.announcerId,
        serviceName: mission.serviceName,
        missionId: mission._id,
      });

      expiredCount++;
    }

    // Envoyer les notifications (via scheduler pour ne pas bloquer)
    for (const notif of notifications) {
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.actions.sendPaymentExpiredNotification,
        notif
      );
    }

    // Envoyer les emails d'expiration paiement (client + annonceur)
    const { emailConfig: payDeadlineEmailConfig, brevoApiKey: payDeadlineBrevoKey, emailProvider: payDeadlineProvider, appUrl: payDeadlineAppUrl } = await getEmailConfigFromDb(ctx.db);

    if (payDeadlineEmailConfig || payDeadlineBrevoKey) {
      for (const mission of expiredMissions) {
        const client = await ctx.db.get(mission.clientId);
        const announcer = await ctx.db.get(mission.announcerId);

        const announcerName = announcer
          ? `${announcer.firstName} ${announcer.lastName.charAt(0)}.`
          : "Le prestataire";
        const clientName = client
          ? `${client.firstName} ${client.lastName.charAt(0)}.`
          : "Le client";

        // Email au client
        if (client?.email) {
          await ctx.scheduler.runAfter(
            0,
            internal.api.email.sendMissionAutoExpiredClientEmail,
            {
              clientEmail: client.email,
              clientName: client.firstName,
              announcerName,
              serviceName: mission.serviceName,
              startDate: mission.startDate,
              endDate: mission.endDate,
              emailConfig: payDeadlineEmailConfig || { apiKey: "" },
              brevoApiKey: payDeadlineBrevoKey,
              emailProvider: payDeadlineProvider,
              appUrl: payDeadlineAppUrl,
            }
          );
        }

        // Email à l'annonceur
        if (announcer?.email) {
          await ctx.scheduler.runAfter(
            0,
            internal.api.email.sendMissionAutoExpiredAnnouncerEmail,
            {
              announcerEmail: announcer.email,
              announcerName: announcer.firstName,
              clientName,
              serviceName: mission.serviceName,
              startDate: mission.startDate,
              endDate: mission.endDate,
              emailConfig: payDeadlineEmailConfig || { apiKey: "" },
              brevoApiKey: payDeadlineBrevoKey,
              emailProvider: payDeadlineProvider,
              appUrl: payDeadlineAppUrl,
            }
          );
        }
      }
    }

    console.log(`[autoExpirePendingPayments] ${expiredCount} mission(s) auto-expirée(s) pour délai de paiement dépassé`);

    return {
      success: true,
      expiredCount,
    };
  },
});

// ============================================
// HELPERS EXPORTÉS
// ============================================

/**
 * Récupère le délai restant avant expiration en ms
 */
export function getPaymentTimeRemainingMs(deadlineTimestamp: number): number {
  return Math.max(0, deadlineTimestamp - Date.now());
}

/**
 * Détermine le niveau d'urgence basé sur les heures restantes
 */
export function getPaymentUrgencyLevel(hoursRemaining: number): "normal" | "warning" | "urgent" {
  if (hoursRemaining > 24) return "normal";
  if (hoursRemaining > 6) return "warning";
  return "urgent";
}
