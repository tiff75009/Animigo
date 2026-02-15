import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./utils";

export const getDashboardStats = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const users = await ctx.db.query("users").collect();

    const stats = {
      totalUsers: users.length,
      activeUsers: users.filter((u) => u.isActive).length,
      inactiveUsers: users.filter((u) => !u.isActive).length,
      usersByType: {
        annonceur_pro: users.filter((u) => u.accountType === "annonceur_pro")
          .length,
        annonceur_particulier: users.filter(
          (u) => u.accountType === "annonceur_particulier"
        ).length,
        utilisateur: users.filter((u) => u.accountType === "utilisateur")
          .length,
      },
      verifiedEmails: users.filter((u) => u.emailVerified).length,
      recentSignups: users.filter(
        (u) => u.createdAt > Date.now() - 7 * 24 * 60 * 60 * 1000
      ).length,
      admins: users.filter((u) => u.role === "admin").length,
    };

    return stats;
  },
});

export const getAdminDashboardOverview = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Périodes par startDate (string "YYYY-MM-DD") — même logique que finances.ts
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const thisMonthStartDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDayThisMonth = new Date(year, month, 0).getDate();
    const thisMonthEndDate = `${year}-${String(month).padStart(2, "0")}-${lastDayThisMonth}`;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const lastMonthStartDate = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
    const lastDayPrevMonth = new Date(prevYear, prevMonth, 0).getDate();
    const lastMonthEndDate = `${prevYear}-${String(prevMonth).padStart(2, "0")}-${lastDayPrevMonth}`;

    // --- Users ---
    const users = await ctx.db.query("users").collect();
    const activeUsers = users.filter((u) => u.isActive);
    const newUsersWeek = users.filter((u) => u.createdAt > oneWeekAgo);
    const latestSignups = users
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5)
      .map((u) => ({
        name: `${u.firstName} ${u.lastName}`,
        accountType: u.accountType,
        createdAt: u.createdAt,
      }));

    // --- Missions ---
    const missions = await ctx.db.query("missions").collect();
    const missionsByStatus = {
      pending_acceptance: 0,
      pending_confirmation: 0,
      upcoming: 0,
      in_progress: 0,
      completed: 0,
      refused: 0,
      cancelled: 0,
    };
    for (const m of missions) {
      if (m.status in missionsByStatus) {
        missionsByStatus[m.status as keyof typeof missionsByStatus]++;
      }
    }
    const activeMissions = missionsByStatus.upcoming + missionsByStatus.in_progress;

    // Revenue: platformFee des missions completed+paid filtrées par startDate
    // (même logique que finances.ts — filtre par date de mission, pas date de création)
    const completedPaidMissions = missions.filter(
      (m) => m.status === "completed" && m.paymentStatus === "paid"
    );
    const thisMonthRevenue = completedPaidMissions
      .filter((m) => m.startDate >= thisMonthStartDate && m.startDate <= thisMonthEndDate)
      .reduce((sum, m) => sum + (m.platformFee ?? 0), 0);
    const lastMonthRevenue = completedPaidMissions
      .filter((m) => m.startDate >= lastMonthStartDate && m.startDate <= lastMonthEndDate)
      .reduce((sum, m) => sum + (m.platformFee ?? 0), 0);
    const revenueVariation =
      lastMonthRevenue > 0
        ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
        : thisMonthRevenue > 0
          ? 100
          : 0;
    const thisMonthPaidMissions = completedPaidMissions.filter(
      (m) => m.startDate >= thisMonthStartDate && m.startDate <= thisMonthEndDate
    ).length;

    // Latest missions
    const latestMissions = missions
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5)
      .map((m) => ({
        clientName: m.clientName,
        serviceName: m.serviceName,
        status: m.status,
        amount: m.amount,
        createdAt: m.createdAt,
      }));

    // --- Moderation ---
    const pendingServices = await ctx.db
      .query("services")
      .withIndex("by_moderation_status", (q) => q.eq("moderationStatus", "pending"))
      .collect();
    const pendingVerifications = await ctx.db
      .query("verificationRequests")
      .withIndex("by_status", (q) => q.eq("status", "submitted"))
      .collect();
    const pendingSapDeclarations = await ctx.db
      .query("sapDeclarations")
      .withIndex("by_status", (q) => q.eq("status", "submitted"))
      .collect();
    const openDisputes = await ctx.db
      .query("disputes")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();

    // --- Support ---
    const openTickets = await ctx.db
      .query("supportTickets")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();
    const inProgressTickets = await ctx.db
      .query("supportTickets")
      .withIndex("by_status", (q) => q.eq("status", "in_progress"))
      .collect();

    // --- Payouts ---
    const pendingPayouts = await ctx.db
      .query("announcerPayouts")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    const pendingPayoutsAmount = pendingPayouts.reduce((sum, p) => sum + p.amount, 0);

    return {
      adminName: user.firstName,
      kpis: {
        monthRevenue: thisMonthRevenue,
        revenueVariation,
        totalUsers: users.length,
        newUsersWeek: newUsersWeek.length,
        activeMissions,
        openTickets: openTickets.length + inProgressTickets.length,
      },
      users: {
        total: users.length,
        active: activeUsers.length,
        inactive: users.length - activeUsers.length,
        byType: {
          annonceur_pro: users.filter((u) => u.accountType === "annonceur_pro").length,
          annonceur_particulier: users.filter((u) => u.accountType === "annonceur_particulier").length,
          utilisateur: users.filter((u) => u.accountType === "utilisateur").length,
        },
        recentSignups: newUsersWeek.length,
        admins: users.filter((u) => u.role === "admin").length,
        verifiedEmails: users.filter((u) => u.emailVerified).length,
      },
      missions: missionsByStatus,
      financial: {
        thisMonthRevenue,
        lastMonthRevenue,
        revenueVariation,
        thisMonthMissions: thisMonthPaidMissions,
        pendingPayouts: pendingPayoutsAmount,
        pendingPayoutsCount: pendingPayouts.length,
      },
      moderation: {
        pendingServices: pendingServices.length,
        pendingVerifications: pendingVerifications.length,
        pendingSapDeclarations: pendingSapDeclarations.length,
        openDisputes: openDisputes.length,
        total:
          pendingServices.length +
          pendingVerifications.length +
          pendingSapDeclarations.length +
          openDisputes.length,
      },
      support: {
        openTickets: openTickets.length,
        inProgressTickets: inProgressTickets.length,
      },
      recentActivity: {
        latestSignups,
        latestMissions,
      },
    };
  },
});
