// @ts-nocheck
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Envoie des rappels SMS J-1 pour les missions à venir demain.
 * Cron quotidien à 9h UTC (~10h Paris).
 *
 * Conditions :
 * - Mission en statut "upcoming"
 * - startDate = demain (format YYYY-MM-DD)
 * - SMS Brevo activé dans systemConfig
 * - Pas de SMS déjà envoyé pour cette mission (type reminder_j1)
 */
export const sendDayBeforeReminders = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Vérifier la config SMS
    const smsConfig = await ctx.runQuery(internal.api.brevoSmsInternal.getSmsConfig);
    if (!smsConfig.enabled || !smsConfig.brevoApiKey) {
      console.log("[SMS Reminders] SMS Brevo désactivé ou clé API manquante, skip.");
      return;
    }

    // Calculer la date de demain (UTC)
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0]; // YYYY-MM-DD

    // Récupérer les missions upcoming qui commencent demain
    const upcomingMissions = await ctx.db
      .query("missions")
      .withIndex("by_status", (q) => q.eq("status", "upcoming"))
      .collect();

    const tomorrowMissions = upcomingMissions.filter(
      (m) => m.startDate === tomorrowStr
    );

    if (tomorrowMissions.length === 0) {
      console.log(`[SMS Reminders] Aucune mission demain (${tomorrowStr}).`);
      return;
    }

    console.log(`[SMS Reminders] ${tomorrowMissions.length} mission(s) demain (${tomorrowStr}).`);

    for (const mission of tomorrowMissions) {
      // Vérifier si un SMS reminder a déjà été envoyé pour cette mission
      const existingSms = await ctx.db
        .query("smsLogs")
        .withIndex("by_mission", (q) => q.eq("missionId", mission._id))
        .filter((q) => q.eq(q.field("type"), "reminder_j1"))
        .first();

      if (existingSms) {
        console.log(`[SMS Reminders] SMS déjà envoyé pour mission ${mission._id}, skip.`);
        continue;
      }

      // Récupérer client et annonceur
      const client = await ctx.db.get(mission.clientId);
      const announcer = await ctx.db.get(mission.announcerId);

      if (!client || !announcer) continue;

      const timeStr = mission.startTime ? ` a ${mission.startTime}` : "";
      const dateFormatted = `${tomorrowStr.split("-")[2]}/${tomorrowStr.split("-")[1]}`;

      // SMS au client
      if (client.phone) {
        const clientMsg = `Rappel Animigo : votre ${mission.serviceName} avec ${announcer.firstName} est prevu demain ${dateFormatted}${timeStr}. Bonne journee !`;
        await ctx.scheduler.runAfter(0, internal.api.brevoSms.sendSmsViaBrevo, {
          to: client.phone,
          content: clientMsg,
          type: "reminder_j1",
          sender: smsConfig.sender,
          brevoApiKey: smsConfig.brevoApiKey,
          missionId: mission._id,
          userId: mission.clientId,
        });
      }

      // SMS à l'annonceur
      if (announcer.phone) {
        const announcerMsg = `Rappel Animigo : vous avez un ${mission.serviceName} avec ${client.firstName} demain ${dateFormatted}${timeStr}. Bonne prestation !`;
        await ctx.scheduler.runAfter(0, internal.api.brevoSms.sendSmsViaBrevo, {
          to: announcer.phone,
          content: announcerMsg,
          type: "reminder_j1",
          sender: smsConfig.sender,
          brevoApiKey: smsConfig.brevoApiKey,
          missionId: mission._id,
          userId: mission.announcerId,
        });
      }
    }
  },
});
