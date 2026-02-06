// @ts-nocheck
import { query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// Helper pour valider la session et obtenir l'utilisateur (annonceur)
async function validateAnnouncerSession(ctx: any, sessionToken: string) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", sessionToken))
    .first();

  if (!session || session.expiresAt < Date.now()) {
    throw new ConvexError("Session invalide ou expirée");
  }

  const user = await ctx.db.get(session.userId);
  if (!user || !user.isActive) {
    throw new ConvexError("Utilisateur non trouvé ou inactif");
  }

  if (user.accountType !== "annonceur_pro" && user.accountType !== "annonceur_particulier") {
    throw new ConvexError("Accès réservé aux annonceurs");
  }

  return { user, session };
}

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

/**
 * Récapitulatif fiscal d'une année civile pour l'annonceur
 */
export const getFiscalYearSummary = query({
  args: {
    sessionToken: v.string(),
    year: v.number(),
  },
  handler: async (ctx, args) => {
    const { user } = await validateAnnouncerSession(ctx, args.sessionToken);

    // Récupérer toutes les missions completed de l'annonceur
    const allMissions = await ctx.db
      .query("missions")
      .withIndex("by_announcer", (q) => q.eq("announcerId", user._id))
      .collect();

    const completedMissions = allMissions.filter((m) => m.status === "completed");

    // Déterminer les années disponibles
    const yearsSet = new Set<number>();
    for (const m of completedMissions) {
      const year = parseInt(m.startDate.substring(0, 4), 10);
      if (!isNaN(year)) yearsSet.add(year);
    }
    const availableYears = Array.from(yearsSet).sort((a, b) => b - a);

    // Filtrer les missions de l'année demandée
    const yearPrefix = String(args.year);
    const yearMissions = completedMissions.filter(
      (m) => m.startDate.startsWith(yearPrefix + "-")
    );

    // Initialiser la ventilation mensuelle
    // Note : la commission est payée par le client en sus du prix du service.
    // announcerEarnings = prix du service = revenu de l'annonceur (rien n'est déduit).
    // amount = total payé par le client (prix service + commission client).
    const monthlyBreakdown = MONTH_NAMES.map((month, i) => ({
      month,
      monthIndex: i,
      missions: 0,
      earnings: 0,
    }));

    let totalEarnings = 0;

    const missionDetails = await Promise.all(
      yearMissions.map(async (m) => {
        const client = await ctx.db.get(m.clientId);
        const earnings = Math.round((m.announcerEarnings || (m.amount || 0) * 0.85) / 100);

        const monthIndex = parseInt(m.startDate.substring(5, 7), 10) - 1;
        totalEarnings += earnings;

        if (monthIndex >= 0 && monthIndex < 12) {
          monthlyBreakdown[monthIndex].missions += 1;
          monthlyBreakdown[monthIndex].earnings += earnings;
        }

        return {
          date: m.startDate,
          clientName: client ? `${client.firstName} ${client.lastName}` : m.clientName,
          service: m.serviceName,
          earnings,
        };
      })
    );

    missionDetails.sort((a, b) => a.date.localeCompare(b.date));

    return {
      year: args.year,
      totalEarnings,
      missionCount: yearMissions.length,
      monthlyBreakdown,
      missionDetails,
      userInfo: {
        firstName: user.firstName,
        lastName: user.lastName,
        accountType: user.accountType,
        siret: user.siret,
        companyName: user.companyName,
      },
      availableYears,
    };
  },
});
