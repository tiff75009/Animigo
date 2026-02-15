import { v } from "convex/values";
import { query } from "../_generated/server";

async function validateSession(ctx: any, token: string) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();

  if (!session || session.expiresAt < Date.now()) {
    return null;
  }

  return session;
}

/**
 * Statistiques agrégées du dashboard client
 * Une seule query pour alimenter tout le dashboard
 */
export const getClientDashboardStats = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await validateSession(ctx, args.token);
    if (!session) return null;

    const userId = session.userId;

    // 1. Missions du client
    const missions = await ctx.db
      .query("missions")
      .withIndex("by_client", (q) => q.eq("clientId", userId))
      .collect();

    // Compteurs par statut
    const pendingAcceptance = missions.filter((m) => m.status === "pending_acceptance");
    const pendingConfirmation = missions.filter((m) => m.status === "pending_confirmation");
    const upcoming = missions.filter((m) => m.status === "upcoming");
    const inProgress = missions.filter((m) => m.status === "in_progress");
    const completed = missions.filter((m) => m.status === "completed");
    const cancelled = missions.filter((m) => m.status === "cancelled");

    // Missions à venir (upcoming + pending_acceptance + in_progress) — 6 max, triées par date
    const upcomingMissionsRaw = [...pendingAcceptance, ...upcoming, ...inProgress]
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 6);

    // Enrichir les missions à venir avec le nom annonceur
    const upcomingMissions = await Promise.all(
      upcomingMissionsRaw.map(async (m) => {
        const announcer = await ctx.db.get(m.announcerId);
        return {
          id: m._id,
          serviceName: m.serviceName,
          serviceCategory: m.serviceCategory,
          startDate: m.startDate,
          endDate: m.endDate,
          startTime: m.startTime,
          endTime: m.endTime,
          status: m.status,
          announcerName: announcer
            ? `${announcer.firstName} ${announcer.lastName.charAt(0)}.`
            : "Annonceur",
          animal: m.animal,
          animals: m.animals,
          location: m.location,
          city: m.city,
        };
      })
    );

    // Missions completed non confirmées par le client (à valider)
    const pendingValidationRaw = completed
      .filter((m) => m.paymentStatus === "pending" && !m.clientConfirmedAt && !m.autoConfirmedAt)
      .slice(0, 5);

    const pendingValidationEnriched = await Promise.all(
      pendingValidationRaw.map(async (m) => {
        const announcer = await ctx.db.get(m.announcerId);
        return {
          id: m._id,
          serviceName: m.serviceName,
          announcerName: announcer
            ? `${announcer.firstName} ${announcer.lastName.charAt(0)}.`
            : "Annonceur",
        };
      })
    );

    // 2. Finances
    const paidMissions = completed.filter((m) => m.paymentStatus === "paid");
    const totalSpent = paidMissions.reduce((sum, m) => sum + m.amount, 0);

    // Dépenses du mois en cours
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthSpent = paidMissions
      .filter((m) => {
        const d = new Date(m.startDate);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, m) => sum + m.amount, 0);

    // Nombre de factures (missions payées)
    const invoicesCount = paidMissions.length;

    // 3. Animaux (3 max)
    const animals = await ctx.db
      .query("animals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const topAnimals = animals.slice(0, 3).map((a) => ({
      id: a._id,
      name: a.name,
      type: a.type,
      breed: a.breed,
      profilePhoto: a.profilePhoto,
    }));

    // 4. Favoris (count)
    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return {
      reservations: {
        total: missions.length,
        pendingAcceptance: pendingAcceptance.length,
        pendingPayment: pendingConfirmation.length,
        upcoming: upcoming.length,
        inProgress: inProgress.length,
        completed: completed.length,
        cancelled: cancelled.length,
      },
      upcomingMissions,
      pendingValidation: pendingValidationEnriched,
      finances: {
        totalSpent,
        monthSpent,
        invoicesCount,
      },
      topAnimals,
      animalsCount: animals.length,
      favoritesCount: favorites.length,
    };
  },
});
