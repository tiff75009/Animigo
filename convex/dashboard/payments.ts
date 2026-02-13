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

  // Vérifier que c'est un annonceur
  if (user.accountType !== "annonceur_pro" && user.accountType !== "annonceur_particulier") {
    throw new ConvexError("Accès réservé aux annonceurs");
  }

  return { user, session };
}

/**
 * Obtenir les statistiques de paiement de l'annonceur
 */
export const getAnnouncerPaymentStats = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const { user } = await validateAnnouncerSession(ctx, args.sessionToken);

    const missions = await ctx.db
      .query("missions")
      .withIndex("by_announcer", (q) => q.eq("announcerId", user._id))
      .collect();

    const completed = missions.filter((m) => m.status === "completed");
    const cancelled = missions.filter((m) => m.status === "cancelled");
    const pending = completed.filter((m) => m.paymentStatus === "pending");
    const paid = completed.filter((m) => m.paymentStatus === "paid");

    // Helper pour obtenir le montant net de l'annonceur (après commission)
    const getNetAmount = (m: any) => m.announcerEarnings || Math.round((m.amount || 0) * 0.85);

    // Stats annulations
    const cancelledByClient = cancelled.filter((m) => m.cancelledBy === "client");
    const cancelledByAnnouncer = cancelled.filter(
      (m) => m.cancelledBy === "announcer" || m.cancelledBy === undefined
    );

    return {
      // Montants NETS en euros (ce que l'annonceur reçoit après commission)
      totalPending: Math.round(pending.reduce((sum, m) => sum + getNetAmount(m), 0) / 100),
      totalCollected: Math.round(paid.reduce((sum, m) => sum + getNetAmount(m), 0) / 100),
      pendingCount: pending.length,
      paidCount: paid.length,
      // Total net cumulé (revenus réels de l'annonceur)
      totalEarned: Math.round(
        completed.reduce((sum, m) => sum + getNetAmount(m), 0) / 100
      ),
      // Total brut pour référence (ce que les clients ont payé)
      totalGross: Math.round(
        completed.reduce((sum, m) => sum + (m.amount || 0), 0) / 100
      ),
      // Annulations par le client
      cancelledByClientCount: cancelledByClient.length,
      cancelledByClientLost: Math.round(
        cancelledByClient.reduce((sum, m) => sum + getNetAmount(m) - (m.announcerRetainedAmount || 0), 0) / 100
      ),
      // Annulations par l'annonceur
      cancelledByAnnouncerCount: cancelledByAnnouncer.length,
      cancelledByAnnouncerLost: Math.round(
        cancelledByAnnouncer.reduce((sum, m) => sum + getNetAmount(m), 0) / 100
      ),
      // Montant retenu suite aux annulations client
      announcerRetainedFromCancellations: Math.round(
        cancelledByClient.reduce((sum, m) => sum + (m.announcerRetainedAmount || 0), 0) / 100
      ),
    };
  },
});

/**
 * Obtenir l'historique des virements de l'annonceur
 */
export const getAnnouncerPayoutHistory = query({
  args: {
    sessionToken: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await validateAnnouncerSession(ctx, args.sessionToken);

    const payouts = await ctx.db
      .query("announcerPayouts")
      .withIndex("by_announcer", (q) => q.eq("announcerId", user._id))
      .order("desc")
      .take(args.limit || 10);

    return Promise.all(
      payouts.map(async (payout) => {
        // Récupérer les missions associées pour le détail
        const missionDetails = await Promise.all(
          payout.missions.map(async (mId) => {
            const m = await ctx.db.get(mId);
            if (!m) return null;
            const client = await ctx.db.get(m.clientId);
            return {
              serviceName: m.serviceName,
              clientName: client ? `${client.firstName} ${client.lastName}` : "Client",
            };
          })
        );

        return {
          id: payout._id,
          date: payout.processedAt || payout.createdAt,
          // Montant NET en euros
          amount: Math.round(payout.amount / 100),
          // Montant BRUT et commission (stockés directement, fallback calcul inverse)
          grossAmount: payout.grossAmount
            ? Math.round(payout.grossAmount / 100)
            : undefined,
          commissionAmount: payout.commissionAmount
            ? Math.round(payout.commissionAmount / 100)
            : undefined,
          status: payout.status,
          missions: missionDetails.filter(Boolean).map((m) =>
            `${m!.serviceName} - ${m!.clientName}`
          ),
          missionsCount: payout.missions.length,
        };
      })
    );
  },
});

/**
 * Obtenir les missions avec paiement confirmé (client a payé)
 * Inclut : upcoming, in_progress (à venir / en cours) ET completed en attente de versement
 */
export const getAuthorizedPayments = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const { user } = await validateAnnouncerSession(ctx, args.sessionToken);

    // Récupérer les missions de l'annonceur
    const missions = await ctx.db
      .query("missions")
      .withIndex("by_announcer", (q) => q.eq("announcerId", user._id))
      .collect();

    // Missions confirmées (client a payé) : upcoming/in_progress + completed en attente de versement
    const authorizedPayments = missions.filter(
      (m) =>
        // Missions à venir ou en cours avec paiement autorisé ou capturé
        ((m.status === "upcoming" || m.status === "in_progress") &&
          (m.paymentStatus === "pending" || m.paymentStatus === "paid")) ||
        // Missions terminées en attente de versement annonceur
        (m.status === "completed" &&
          (m.paymentStatus === "pending" || m.paymentStatus === "paid") &&
          m.announcerPaymentStatus !== "paid")
    );

    // Enrichir avec infos client et paiement
    return Promise.all(
      authorizedPayments.map(async (m) => {
        const client = await ctx.db.get(m.clientId);
        const payment = m.stripePaymentId ? await ctx.db.get(m.stripePaymentId) : null;

        return {
          id: m._id,
          clientId: m.clientId,
          clientName: client ? `${client.firstName} ${client.lastName}` : m.clientName,
          animal: m.animal || { name: "Animal", type: "inconnu", emoji: "🐾" },
          serviceName: m.serviceName,
          serviceCategory: m.serviceCategory,
          startDate: m.startDate,
          endDate: m.endDate,
          status: m.status,
          amount: Math.round((m.amount || 0) / 100),
          announcerEarnings: Math.round((m.announcerEarnings || m.amount * 0.85) / 100),
          paymentStatus: payment?.status || m.paymentStatus || "pending",
          authorizedAt: payment?.authorizedAt,
          autoCaptureScheduledAt: m.autoCaptureScheduledAt,
          sessionType: m.sessionType,
          serviceLocation: m.serviceLocation,
          // Infos confirmation (pour missions terminées)
          clientConfirmedAt: m.clientConfirmedAt,
          autoConfirmedAt: m.autoConfirmedAt,
          readyForPayout: m.readyForPayout,
        };
      })
    );
  },
});

/**
 * Obtenir les missions complétées de l'annonceur avec tous les statuts de paiement
 */
export const getCompletedMissions = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const { user } = await validateAnnouncerSession(ctx, args.sessionToken);

    const missions = await ctx.db
      .query("missions")
      .withIndex("by_announcer", (q) => q.eq("announcerId", user._id))
      .order("desc")
      .collect();

    const completed = missions.filter((m) => m.status === "completed");

    return Promise.all(
      completed.map(async (m) => {
        const client = await ctx.db.get(m.clientId);

        return {
          id: m._id,
          clientName: client ? `${client.firstName} ${client.lastName}` : m.clientName,
          animal: m.animal || { name: "Animal", type: "inconnu", emoji: "🐾" },
          service: m.serviceName,
          startDate: m.startDate,
          endDate: m.endDate,
          amount: Math.round((m.amount || 0) / 100),
          paymentStatus: m.paymentStatus,
        };
      })
    );
  },
});

/**
 * Obtenir les missions annulées de l'annonceur (pour suivi des pertes)
 */
export const getAnnouncerCancelledMissions = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const { user } = await validateAnnouncerSession(ctx, args.sessionToken);

    const missions = await ctx.db
      .query("missions")
      .withIndex("by_announcer_status", (q) =>
        q.eq("announcerId", user._id).eq("status", "cancelled")
      )
      .order("desc")
      .collect();

    return Promise.all(
      missions.map(async (m) => {
        const client = await ctx.db.get(m.clientId);

        return {
          id: m._id,
          cancelledBy: m.cancelledBy ?? "announcer",
          cancelledAt: m.cancelledAt ?? m._creationTime,
          amount: Math.round((m.amount || 0) / 100),
          announcerEarnings: Math.round(
            (m.announcerEarnings || (m.amount || 0) * 0.85) / 100
          ),
          refundAmount: m.refundAmount
            ? Math.round(m.refundAmount / 100)
            : undefined,
          announcerRetainedAmount: m.announcerRetainedAmount
            ? Math.round(m.announcerRetainedAmount / 100)
            : 0,
          clientName: client
            ? `${client.firstName} ${client.lastName}`
            : m.clientName || "Client",
          serviceName: m.serviceName,
          startDate: m.startDate,
          endDate: m.endDate,
          animal: m.animal || { name: "Animal", type: "inconnu", emoji: "🐾" },
          cancellationReason: m.cancellationReason,
        };
      })
    );
  },
});
