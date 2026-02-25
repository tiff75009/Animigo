// @ts-nocheck
"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

export const sendRegularityAlertEmail = internalAction({
  args: {
    recipientEmail: v.string(),
    recipientName: v.string(),
    alertLevel: v.string(),
    monthlyMissions: v.number(),
    annualRevenue: v.number(),
    consecutiveActiveMonths: v.number(),
    uniqueClients: v.number(),
    score: v.number(),
    isBlocked: v.boolean(),
    graceDeadline: v.union(v.number(), v.null()),
    emailConfig: v.object({
      apiKey: v.string(),
      fromEmail: v.optional(v.string()),
      fromName: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    try {
      const fromEmail = args.emailConfig.fromEmail || "onboarding@resend.dev";
      const fromName = args.emailConfig.fromName || "Animigo";
      const siteName = "Animigo";

      const formatPrice = (cents: number) =>
        (cents / 100).toFixed(2).replace(".", ",") + " €";

      const formatDate = (timestamp: number) => {
        const d = new Date(timestamp);
        return d.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      };

      const levelLabels: Record<string, string> = {
        attention: "Attention",
        warning: "Avertissement",
        critical: "Critique",
      };

      const levelColors: Record<string, { bg: string; border: string; text: string; headerBg: string }> = {
        attention: {
          bg: "#fef9c3",
          border: "#f59e0b",
          text: "#92400e",
          headerBg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        },
        warning: {
          bg: "#fff7ed",
          border: "#f97316",
          text: "#9a3412",
          headerBg: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
        },
        critical: {
          bg: "#fef2f2",
          border: "#ef4444",
          text: "#991b1b",
          headerBg: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
        },
      };

      const colors = levelColors[args.alertLevel] || levelColors.attention;
      const levelLabel = levelLabels[args.alertLevel] || args.alertLevel;

      const subject =
        args.alertLevel === "critical"
          ? `⚠️ Action requise : votre activité nécessite un statut professionnel - ${siteName}`
          : `Information sur votre activité - ${siteName}`;

      const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <div style="background: ${colors.headerBg}; padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Niveau d'alerte : ${levelLabel}</h1>
      <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Score de régularité : ${args.score}/4</p>
    </div>

    <div style="padding: 40px 30px;">
      <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px;">Bonjour ${args.recipientName},</h2>

      <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
        Notre système a détecté que votre activité sur ${siteName} atteint un niveau qui pourrait être requalifié en activité professionnelle au sens de la loi française.
      </p>

      <div style="margin: 20px 0; padding: 20px; background-color: ${colors.bg}; border-radius: 12px; border-left: 4px solid ${colors.border};">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: ${colors.text};">Vos métriques d'activité</p>
        <p style="margin: 5px 0; color: #475569;">
          <strong>Missions ce mois :</strong> ${args.monthlyMissions} ${args.monthlyMissions > 4 ? "⚠️ (seuil : 4)" : "✅"}
        </p>
        <p style="margin: 5px 0; color: #475569;">
          <strong>Revenus annuels :</strong> ${formatPrice(args.annualRevenue)} ${args.annualRevenue > 300000 ? "⚠️ (seuil : 3 000 €)" : "✅"}
        </p>
        <p style="margin: 5px 0; color: #475569;">
          <strong>Mois consécutifs d'activité :</strong> ${args.consecutiveActiveMonths} ${args.consecutiveActiveMonths > 3 ? "⚠️ (seuil : 3)" : "✅"}
        </p>
        <p style="margin: 5px 0; color: #475569;">
          <strong>Clients uniques (année) :</strong> ${args.uniqueClients} ${args.uniqueClients > 5 ? "⚠️ (seuil : 5)" : "✅"}
        </p>
      </div>

      ${args.isBlocked ? `
      <div style="margin: 20px 0; padding: 20px; background-color: #fef2f2; border-radius: 12px; border-left: 4px solid #ef4444;">
        <p style="margin: 0 0 5px 0; font-weight: bold; color: #991b1b;">⛔ Compte bloqué</p>
        <p style="margin: 0; color: #b91c1c;">
          Votre période de grâce est terminée. Vous ne pouvez plus accepter de nouvelles missions tant que vous n'avez pas régularisé votre situation.
        </p>
      </div>
      ` : args.graceDeadline ? `
      <div style="margin: 20px 0; padding: 20px; background-color: #fef9c3; border-radius: 12px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0 0 5px 0; font-weight: bold; color: #92400e;">⏳ Période de grâce</p>
        <p style="margin: 0; color: #a16207;">
          Vous avez jusqu'au ${formatDate(args.graceDeadline)} pour régulariser votre situation en devenant auto-entrepreneur. Passé ce délai, vous ne pourrez plus accepter de missions.
        </p>
      </div>
      ` : ""}

      <div style="margin: 30px 0; padding: 20px; background-color: #f0f9ff; border-radius: 12px; border-left: 4px solid #0ea5e9;">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #0369a1;">💡 Comment régulariser votre situation ?</p>
        <ol style="margin: 0; padding-left: 20px; color: #475569; line-height: 1.8;">
          <li>Créez votre statut d'auto-entrepreneur sur <strong>autoentrepreneur.urssaf.fr</strong></li>
          <li>Choisissez l'activité "Services aux animaux de compagnie"</li>
          <li>Une fois votre SIRET obtenu, rendez-vous sur votre dashboard ${siteName}</li>
          <li>Cliquez sur "Devenir auto-entrepreneur" et renseignez votre SIRET</li>
        </ol>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://animigo.fr/dashboard/devenir-pro" style="display: inline-block; background-color: #4ECDC4; color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px;">
          Devenir auto-entrepreneur
        </a>
      </div>
    </div>

    <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0 0 10px 0; color: #64748b; font-size: 13px;">
        Cette notification est envoyée automatiquement pour vous aider à respecter la réglementation française.
      </p>
      <p style="margin: 0; color: #94a3b8; font-size: 12px;">&copy; 2025 ${siteName}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`;

      const fromStr = `${fromName} <${fromEmail}>`;

      let emailId: string | undefined;

      // Envoi via Resend
      if (args.emailConfig.apiKey) {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${args.emailConfig.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromStr,
            to: [args.recipientEmail],
            subject,
            html,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Resend API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        emailId = result.id;
      }

      if (!emailId) {
        throw new Error("No email provider available");
      }

      // Logger l'email (non-bloquant car ctx.runMutation peut échouer sur Convex self-hosted)
      try {
        await ctx.runMutation(internal.api.emailInternal.logEmail, {
          to: args.recipientEmail,
          from: fromStr,
          subject,
          template: "regularity_alert",
          status: "sent",
          resendId: emailId,
          provider: "resend",
        });
      } catch (e) {
        console.warn("[logEmail] Failed to log email:", e instanceof Error ? e.message.substring(0, 100) : e);
      }

      return { success: true, id: emailId, provider: "resend" };
    } catch (error) {
      console.error("Failed to send regularity alert email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
