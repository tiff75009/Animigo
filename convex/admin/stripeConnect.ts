// @ts-nocheck
import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin } from "./utils";

/**
 * Helper : calcul du début du mois courant (format YYYY-MM-DD)
 */
function getCurrentMonthStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function getCurrentMonthEnd(): string {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${lastDay}`;
}

/**
 * Liste tous les comptes Stripe Connect des annonceurs
 * Inclut les gains du mois en cours et les montants en attente de versement
 */
export const listConnectAccounts = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const allUsers = await ctx.db.query("users").collect();
    const usersWithStripe = allUsers.filter((u) => !!u.stripeAccountId);

    const monthStart = getCurrentMonthStart();
    const monthEnd = getCurrentMonthEnd();

    const enriched = await Promise.all(
      usersWithStripe.map(async (user) => {
        // Missions de cet annonceur
        const missions = await ctx.db
          .query("missions")
          .withIndex("by_announcer", (q) => q.eq("announcerId", user._id))
          .collect();

        // Gains du mois en cours (missions completed + paid)
        const currentMonthMissions = missions.filter(
          (m) =>
            m.startDate >= monthStart &&
            m.startDate <= monthEnd &&
            m.status === "completed" &&
            m.paymentStatus === "paid"
        );
        const monthEarnings = currentMonthMissions.reduce(
          (sum, m) => sum + (m.announcerEarnings || 0),
          0
        );

        // Montant en attente de versement
        const pendingPayout = missions
          .filter(
            (m) =>
              m.readyForPayout === true &&
              m.announcerPaymentStatus !== "paid"
          )
          .reduce((sum, m) => sum + (m.announcerEarnings || 0), 0);

        // Total tous temps
        const completedMissions = missions.filter(
          (m) => m.status === "completed" && m.paymentStatus === "paid"
        );
        const totalEarnings = completedMissions.reduce(
          (sum, m) => sum + (m.announcerEarnings || 0),
          0
        );

        return {
          userId: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          accountType: user.accountType,
          stripeAccountId: user.stripeAccountId!,
          stripeAccountStatus: user.stripeAccountStatus || "pending",
          stripeChargesEnabled: user.stripeChargesEnabled || false,
          stripePayoutsEnabled: user.stripePayoutsEnabled || false,
          iban: user.iban || null,
          ibanLast4: user.ibanLast4 || null,
          payoutMode: user.payoutMode || "scheduled",
          stripeAccountUpdatedAt: user.stripeAccountUpdatedAt || null,
          createdAt: user.createdAt,
          // Données financières
          monthEarnings,
          pendingPayout,
          totalEarnings,
          totalMissions: completedMissions.length,
        };
      })
    );

    return enriched;
  },
});

/**
 * Détails complets d'un compte Stripe Connect
 */
export const getConnectAccountDetails = query({
  args: {
    token: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError("Utilisateur non trouvé");

    // Profil
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    // Missions
    const missions = await ctx.db
      .query("missions")
      .withIndex("by_announcer", (q) => q.eq("announcerId", args.userId))
      .collect();

    const monthStart = getCurrentMonthStart();
    const monthEnd = getCurrentMonthEnd();

    // Stats missions
    const completedMissions = missions.filter((m) => m.status === "completed" && m.paymentStatus === "paid");
    const currentMonthMissions = completedMissions.filter(
      (m) => m.startDate >= monthStart && m.startDate <= monthEnd
    );

    // Gains
    const totalEarnings = completedMissions.reduce((sum, m) => sum + (m.announcerEarnings || 0), 0);
    const monthEarnings = currentMonthMissions.reduce((sum, m) => sum + (m.announcerEarnings || 0), 0);
    const totalPlatformFees = completedMissions.reduce((sum, m) => sum + (m.platformFee || 0), 0);
    const totalGross = completedMissions.reduce((sum, m) => sum + (m.amount || 0), 0);

    // En attente de versement
    const pendingPayoutMissions = missions.filter(
      (m) => m.readyForPayout === true && m.announcerPaymentStatus !== "paid"
    );
    const pendingPayoutAmount = pendingPayoutMissions.reduce(
      (sum, m) => sum + (m.announcerEarnings || 0),
      0
    );

    // Déjà versé
    const paidMissions = missions.filter((m) => m.announcerPaymentStatus === "paid");
    const paidAmount = paidMissions.reduce((sum, m) => sum + (m.announcerEarnings || 0), 0);

    // Virements (payouts)
    const payouts = await ctx.db
      .query("announcerPayouts")
      .withIndex("by_announcer", (q) => q.eq("announcerId", args.userId))
      .order("desc")
      .collect();

    // Politique d'annulation annonceur
    const cancellationPolicy = await ctx.db
      .query("cancellationPolicies")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    // 10 dernières missions terminées
    const recentMissions = [...completedMissions]
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 10)
      .map((m) => ({
        _id: m._id,
        serviceName: m.serviceName,
        startDate: m.startDate,
        endDate: m.endDate,
        amount: m.amount,
        announcerEarnings: m.announcerEarnings || 0,
        platformFee: m.platformFee || 0,
        commissionRate: m.commissionRate,
        paymentStatus: m.paymentStatus,
        announcerPaymentStatus: m.announcerPaymentStatus || "not_due",
        readyForPayout: m.readyForPayout || false,
        payoutScheduledFor: m.payoutScheduledFor || null,
        hasDispute: m.hasDispute || false,
      }));

    // Missions à venir (confirmées + payées)
    const upcomingMissions = missions
      .filter((m) => m.status === "upcoming" && m.paymentStatus === "paid")
      .sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""))
      .slice(0, 10)
      .map((m) => ({
        _id: m._id,
        serviceName: m.serviceName,
        clientName: m.clientName,
        startDate: m.startDate,
        endDate: m.endDate,
        startTime: m.startTime || null,
        amount: m.amount || 0,
        announcerEarnings: m.announcerEarnings || 0,
        platformFee: m.platformFee || 0,
        commissionRate: m.commissionRate,
        numberOfSessions: m.numberOfSessions || 1,
      }));

    // Missions annulées
    const cancelledMissions = missions
      .filter((m) => m.status === "cancelled")
      .sort((a, b) => (b.cancelledAt || 0) - (a.cancelledAt || 0))
      .slice(0, 15)
      .map((m) => ({
        _id: m._id,
        serviceName: m.serviceName,
        clientName: m.clientName,
        startDate: m.startDate,
        cancelledBy: m.cancelledBy || null,
        cancelledAt: m.cancelledAt || null,
        cancellationReason: m.cancellationReason || null,
        amount: m.amount || 0,
        refundAmount: m.refundAmount || 0,
        announcerRetainedAmount: m.announcerRetainedAmount || 0,
        platformFee: m.platformFee || 0,
        paymentStatus: m.paymentStatus,
        numberOfSessions: m.numberOfSessions || 1,
      }));

    // Réclamations
    const disputes = await ctx.db
      .query("disputes")
      .collect();
    const userDisputes = disputes.filter(
      (d) => missions.some((m) => m._id === d.missionId)
    );

    // Missions contestées (réclamation)
    const disputedMissions = missions
      .filter((m) => m.hasDispute === true && m.status === "completed")
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, 15)
      .map((m) => {
        const dispute = userDisputes.find((d) => d.missionId === m._id);
        return {
          _id: m._id,
          serviceName: m.serviceName,
          clientName: m.clientName,
          startDate: m.startDate,
          amount: m.amount || 0,
          announcerEarnings: m.announcerEarnings || 0,
          paymentStatus: m.paymentStatus,
          readyForPayout: m.readyForPayout || false,
          disputeStatus: dispute?.status || "open",
          disputeReason: dispute?.reasonLabel || null,
          disputePaymentBlocked: dispute?.paymentBlocked || false,
          disputeCreatedAt: dispute?.createdAt || null,
        };
      });

    return {
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        accountType: user.accountType,
        companyName: user.companyName,
        siret: user.siret,
        slug: user.slug,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
      profile: profile
        ? {
            profileImageUrl: profile.profileImageUrl,
            city: profile.city,
            postalCode: profile.postalCode,
            location: profile.location,
          }
        : null,
      stripe: {
        stripeAccountId: user.stripeAccountId || null,
        stripeAccountStatus: user.stripeAccountStatus || "pending",
        stripeChargesEnabled: user.stripeChargesEnabled || false,
        stripePayoutsEnabled: user.stripePayoutsEnabled || false,
        iban: user.iban || null,
        ibanLast4: user.ibanLast4 || null,
        payoutMode: user.payoutMode || "scheduled",
        stripeAccountUpdatedAt: user.stripeAccountUpdatedAt || null,
      },
      finances: {
        totalGross,
        totalEarnings,
        totalPlatformFees,
        monthEarnings,
        pendingPayoutAmount,
        pendingPayoutCount: pendingPayoutMissions.length,
        paidAmount,
        paidCount: paidMissions.length,
        disputedAmount: missions
          .filter((m) => m.hasDispute && m.status === "completed" && !m.readyForPayout)
          .reduce((sum, m) => sum + (m.announcerEarnings || 0), 0),
        disputedCount: missions
          .filter((m) => m.hasDispute && m.status === "completed" && !m.readyForPayout)
          .length,
      },
      stats: {
        totalMissions: missions.length,
        completedMissions: completedMissions.length,
        currentMonthMissions: currentMonthMissions.length,
        pendingMissions: missions.filter(
          (m) =>
            m.status === "pending_acceptance" ||
            m.status === "pending_confirmation" ||
            m.status === "upcoming"
        ).length,
        inProgressMissions: missions.filter((m) => m.status === "in_progress").length,
        cancelledMissions: missions.filter(
          (m) => m.status === "cancelled" || m.status === "refused"
        ).length,
        disputesCount: userDisputes.length,
        openDisputes: userDisputes.filter(
          (d) => d.status === "open" || d.status === "investigating"
        ).length,
      },
      recentMissions,
      upcomingMissions,
      cancelledMissions,
      disputedMissions,
      cancellationPolicy: cancellationPolicy
        ? {
            refundMode: cancellationPolicy.refundMode || "per_session",
            defaultCommissionPercent: cancellationPolicy.defaultCommissionPercent,
            isActive: cancellationPolicy.isActive,
          }
        : null,
      payouts: payouts.slice(0, 10).map((p) => ({
        _id: p._id,
        amount: p.amount,
        grossAmount: p.grossAmount || null,
        commissionAmount: p.commissionAmount || null,
        missionsCount: p.missions.length,
        status: p.status,
        stripeTransferId: p.stripeTransferId || null,
        scheduledAt: p.scheduledAt || null,
        processedAt: p.processedAt || null,
        failureReason: p.failureReason || null,
        createdAt: p.createdAt,
      })),
    };
  },
});

/**
 * Supprimer un compte Stripe Connect depuis l'admin
 * Efface le compte sur Stripe + nettoie les champs en BDD
 */
export const adminDeleteStripeAccount = mutation({
  args: {
    token: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError("Utilisateur non trouvé");
    if (!user.stripeAccountId) throw new ConvexError("Aucun compte Stripe associé");

    const now = Date.now();
    await ctx.db.patch(args.userId, {
      stripeAccountId: undefined,
      stripeAccountStatus: undefined,
      stripeChargesEnabled: undefined,
      stripePayoutsEnabled: undefined,
      iban: undefined,
      ibanLast4: undefined,
      stripeAccountUpdatedAt: undefined,
      updatedAt: now,
    });

    return { success: true, stripeAccountId: user.stripeAccountId };
  },
});

/**
 * Désactiver un compte Stripe Connect (marquer comme disabled)
 */
export const adminRejectStripeAccount = mutation({
  args: {
    token: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError("Utilisateur non trouvé");
    if (!user.stripeAccountId) throw new ConvexError("Aucun compte Stripe associé");

    const now = Date.now();
    await ctx.db.patch(args.userId, {
      stripeAccountStatus: "disabled",
      stripeChargesEnabled: false,
      stripePayoutsEnabled: false,
      stripeAccountUpdatedAt: now,
      updatedAt: now,
    });

    return { success: true };
  },
});
