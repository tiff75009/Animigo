// @ts-nocheck
import { query, mutation, internalMutation } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import { Doc, Id } from "../_generated/dataModel";
import { validateSiret } from "../auth/utils";
import { notifyRegularityAlert } from "../lib/notificationTemplates";
import { getEmailConfigFromDb } from "../api/emailInternal";

// ============================================
// CONSTANTES - Seuils URSSAF
// ============================================

const THRESHOLDS = {
  MONTHLY_MISSIONS: 4,        // > 4 missions/mois
  ANNUAL_REVENUE: 300_000,    // > 3000€ (en centimes)
  CONSECUTIVE_MONTHS: 3,      // > 3 mois consécutifs
  UNIQUE_CLIENTS: 5,          // > 5 clients uniques
  GRACE_PERIOD_MS: 30 * 24 * 60 * 60 * 1000, // 30 jours
} as const;

// ============================================
// HELPER PUR - computeScore
// ============================================

type AlertLevel = "ok" | "attention" | "warning" | "critical";

interface ScoreResult {
  score: number;
  alertLevel: AlertLevel;
  monthlyMissions: number;
  annualRevenue: number;
  consecutiveActiveMonths: number;
  uniqueClients: number;
}

export function computeScore(metrics: {
  monthlyMissions: number;
  annualRevenue: number;
  consecutiveActiveMonths: number;
  uniqueClients: number;
}): ScoreResult {
  let score = 0;

  if (metrics.monthlyMissions > THRESHOLDS.MONTHLY_MISSIONS) score += 1;
  if (metrics.annualRevenue > THRESHOLDS.ANNUAL_REVENUE) score += 1;
  if (metrics.consecutiveActiveMonths > THRESHOLDS.CONSECUTIVE_MONTHS) score += 1;
  if (metrics.uniqueClients > THRESHOLDS.UNIQUE_CLIENTS) score += 1;

  const alertLevel: AlertLevel =
    score <= 1 ? "ok" :
    score === 2 ? "attention" :
    score === 3 ? "warning" :
    "critical";

  return {
    score,
    alertLevel,
    ...metrics,
  };
}

// ============================================
// INTERNAL MUTATION - Calcul hebdomadaire
// ============================================

export const computeAllScores = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const currentDate = new Date(now);
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-indexed

    // Récupérer tous les annonceurs particuliers
    const particuliers = await ctx.db
      .query("users")
      .withIndex("by_account_type", (q) => q.eq("accountType", "annonceur_particulier"))
      .collect();

    for (const user of particuliers) {
      // Récupérer toutes les missions de cet annonceur
      const missions = await ctx.db
        .query("missions")
        .withIndex("by_announcer", (q) => q.eq("announcerId", user._id))
        .collect();

      // 1. Missions du mois en cours (completed/upcoming/in_progress)
      const currentMonthStart = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const currentMonthEnd = `${nextMonthYear}-${String(nextMonth + 1).padStart(2, "0")}-01`;

      const monthlyMissions = missions.filter(
        (m) =>
          m.startDate >= currentMonthStart &&
          m.startDate < currentMonthEnd &&
          ["completed", "upcoming", "in_progress"].includes(m.status)
      ).length;

      // 2. Revenus annuels (missions completed de l'année civile)
      const yearStart = `${currentYear}-01-01`;
      const yearEnd = `${currentYear + 1}-01-01`;
      const annualRevenue = missions
        .filter(
          (m) =>
            m.status === "completed" &&
            m.startDate >= yearStart &&
            m.startDate < yearEnd
        )
        .reduce((sum, m) => sum + (m.announcerEarnings || 0), 0);

      // 3. Mois consécutifs d'activité (en remontant depuis le mois en cours)
      let consecutiveActiveMonths = 0;
      let checkMonth = currentMonth;
      let checkYear = currentYear;

      for (let i = 0; i < 24; i++) { // Max 24 mois en arrière
        const monthStart = `${checkYear}-${String(checkMonth + 1).padStart(2, "0")}-01`;
        const prevNextMonth = checkMonth === 11 ? 0 : checkMonth + 1;
        const prevNextYear = checkMonth === 11 ? checkYear + 1 : checkYear;
        const monthEnd = `${prevNextYear}-${String(prevNextMonth + 1).padStart(2, "0")}-01`;

        const hasCompletedMission = missions.some(
          (m) =>
            m.status === "completed" &&
            m.startDate >= monthStart &&
            m.startDate < monthEnd
        );

        if (hasCompletedMission) {
          consecutiveActiveMonths++;
        } else {
          break;
        }

        // Reculer d'un mois
        checkMonth--;
        if (checkMonth < 0) {
          checkMonth = 11;
          checkYear--;
        }
      }

      // 4. Clients uniques (missions completed de l'année)
      const uniqueClientIds = new Set(
        missions
          .filter(
            (m) =>
              m.status === "completed" &&
              m.startDate >= yearStart &&
              m.startDate < yearEnd
          )
          .map((m) => m.clientId.toString())
      );
      const uniqueClients = uniqueClientIds.size;

      // Calculer le score
      const result = computeScore({
        monthlyMissions,
        annualRevenue,
        consecutiveActiveMonths,
        uniqueClients,
      });

      // Récupérer le score existant
      const existingScore = await ctx.db
        .query("regularityScores")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();

      const previousLevel = existingScore?.alertLevel || "ok";
      const levelChanged = result.alertLevel !== previousLevel;
      const levelIncreased = levelChanged &&
        getAlertOrder(result.alertLevel) > getAlertOrder(previousLevel);

      // Gestion de la grâce period et blocage
      let isBlocked = existingScore?.isBlocked || false;
      let criticalSince = existingScore?.criticalSince;
      let graceDeadline = existingScore?.graceDeadline;

      if (result.alertLevel === "critical") {
        if (!criticalSince) {
          criticalSince = now;
          graceDeadline = now + THRESHOLDS.GRACE_PERIOD_MS;
        }
        // Vérifier si la grâce period est dépassée
        if (graceDeadline && now >= graceDeadline) {
          isBlocked = true;
        }
      } else {
        // Reset si le niveau redescend en dessous de critical
        criticalSince = undefined;
        graceDeadline = undefined;
        isBlocked = false;
      }

      // Upsert dans regularityScores
      if (existingScore) {
        await ctx.db.patch(existingScore._id, {
          monthlyMissions: result.monthlyMissions,
          annualRevenue: result.annualRevenue,
          consecutiveActiveMonths: result.consecutiveActiveMonths,
          uniqueClients: result.uniqueClients,
          score: result.score,
          alertLevel: result.alertLevel,
          isBlocked,
          criticalSince,
          graceDeadline,
          lastCalculatedAt: now,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("regularityScores", {
          userId: user._id,
          monthlyMissions: result.monthlyMissions,
          annualRevenue: result.annualRevenue,
          consecutiveActiveMonths: result.consecutiveActiveMonths,
          uniqueClients: result.uniqueClients,
          score: result.score,
          alertLevel: result.alertLevel,
          isBlocked,
          criticalSince,
          graceDeadline,
          lastNotifiedLevel: undefined,
          lastNotifiedAt: undefined,
          lastEmailSentLevel: undefined,
          lastEmailSentAt: undefined,
          bannerDismissedAt: undefined,
          bannerDismissedForLevel: undefined,
          lastCalculatedAt: now,
          createdAt: now,
          updatedAt: now,
        });
      }

      // Notifications si le niveau a augmenté
      if (levelIncreased && result.alertLevel !== "ok") {
        // Notification in-app (attention, warning, critical)
        const alreadyNotified = existingScore?.lastNotifiedLevel === result.alertLevel;
        if (!alreadyNotified) {
          await notifyRegularityAlert({
            userId: user._id,
            alertLevel: result.alertLevel,
            score: result.score,
            monthlyMissions: result.monthlyMissions,
            annualRevenue: result.annualRevenue,
            consecutiveActiveMonths: result.consecutiveActiveMonths,
            uniqueClients: result.uniqueClients,
          });

          // Mettre à jour le suivi de notification
          const scoreDoc = await ctx.db
            .query("regularityScores")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .first();
          if (scoreDoc) {
            await ctx.db.patch(scoreDoc._id, {
              lastNotifiedLevel: result.alertLevel,
              lastNotifiedAt: now,
            });
          }
        }

        // Email pour warning et critical
        if (
          (result.alertLevel === "warning" || result.alertLevel === "critical") &&
          existingScore?.lastEmailSentLevel !== result.alertLevel
        ) {
          // Récupérer les configs email
          const { emailConfig: regEmailConfig } = await getEmailConfigFromDb(ctx.db);

          if (regEmailConfig) {
            await ctx.scheduler.runAfter(
              0,
              internal.planning.regularityActions.sendRegularityAlertEmail,
              {
                recipientEmail: user.email,
                recipientName: user.firstName,
                alertLevel: result.alertLevel,
                monthlyMissions: result.monthlyMissions,
                annualRevenue: result.annualRevenue,
                consecutiveActiveMonths: result.consecutiveActiveMonths,
                uniqueClients: result.uniqueClients,
                score: result.score,
                isBlocked,
                graceDeadline: graceDeadline || null,
                emailConfig: regEmailConfig || { apiKey: "" },
              }
            );

            // Mettre à jour le suivi d'email
            const scoreDoc2 = await ctx.db
              .query("regularityScores")
              .withIndex("by_user", (q) => q.eq("userId", user._id))
              .first();
            if (scoreDoc2) {
              await ctx.db.patch(scoreDoc2._id, {
                lastEmailSentLevel: result.alertLevel,
                lastEmailSentAt: now,
              });
            }
          }
        }
      }
    }
  },
});

// ============================================
// QUERY - Score pour le dashboard
// ============================================

export const getMyRegularityScore = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(session.userId);
    if (!user || user.accountType !== "annonceur_particulier") {
      return null;
    }

    const score = await ctx.db
      .query("regularityScores")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    if (!score) return null;

    // Vérifier si la bannière est dismiss pour ce niveau
    const isBannerDismissed =
      score.bannerDismissedForLevel === score.alertLevel &&
      score.bannerDismissedAt !== undefined;

    return {
      ...score,
      isBannerDismissed,
      graceRemainingMs: score.graceDeadline
        ? Math.max(0, score.graceDeadline - Date.now())
        : null,
    };
  },
});

// ============================================
// MUTATION - Masquer la bannière
// ============================================

export const dismissBanner = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const score = await ctx.db
      .query("regularityScores")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    if (!score) {
      throw new ConvexError("Aucun score trouvé");
    }

    await ctx.db.patch(score._id, {
      bannerDismissedAt: Date.now(),
      bannerDismissedForLevel: score.alertLevel,
      updatedAt: Date.now(),
    });
  },
});

// ============================================
// MUTATION - Upgrade vers pro
// ============================================

export const upgradeToProAccount = mutation({
  args: {
    token: v.string(),
    siret: v.string(),
    companyName: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new ConvexError("Utilisateur non trouvé");
    }

    if (user.accountType !== "annonceur_particulier") {
      throw new ConvexError("Seuls les annonceurs particuliers peuvent effectuer cette opération");
    }

    // Valider le SIRET
    if (!validateSiret(args.siret)) {
      throw new ConvexError("Le numéro SIRET est invalide");
    }

    // Vérifier l'unicité du SIRET
    const existingSiret = await ctx.db
      .query("users")
      .withIndex("by_siret", (q) => q.eq("siret", args.siret))
      .first();

    if (existingSiret && existingSiret._id !== user._id) {
      throw new ConvexError("Ce numéro SIRET est déjà utilisé par un autre compte");
    }

    const now = Date.now();

    // Mettre à jour le compte
    await ctx.db.patch(user._id, {
      accountType: "annonceur_pro",
      siret: args.siret,
      companyName: args.companyName,
      updatedAt: now,
    });

    // Reset le score de régularité
    const score = await ctx.db
      .query("regularityScores")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (score) {
      await ctx.db.patch(score._id, {
        alertLevel: "ok",
        score: 0,
        isBlocked: false,
        criticalSince: undefined,
        graceDeadline: undefined,
        updatedAt: now,
      });
    }

    // Notification de confirmation
    await notifyRegularityAlert({
      userId: user._id,
      alertLevel: "ok",
      score: 0,
      monthlyMissions: 0,
      annualRevenue: 0,
      consecutiveActiveMonths: 0,
      uniqueClients: 0,
    });

    return { success: true };
  },
});

// ============================================
// HELPER - Ordre des niveaux d'alerte
// ============================================

function getAlertOrder(level: AlertLevel): number {
  switch (level) {
    case "ok": return 0;
    case "attention": return 1;
    case "warning": return 2;
    case "critical": return 3;
  }
}
