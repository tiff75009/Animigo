// @ts-nocheck
import { query, mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internal } from "../_generated/api";

// ============================================
// HELPERS
// ============================================

async function getClientCancellationCount(
  ctx: any,
  clientId: any,
  periodMonths: number
): Promise<number> {
  const now = Date.now();
  const periodStart = now - periodMonths * 30 * 24 * 60 * 60 * 1000;

  const missions = await ctx.db
    .query("missions")
    .withIndex("by_client", (q: any) => q.eq("clientId", clientId))
    .collect();

  return missions.filter(
    (m: any) =>
      m.cancelledBy === "client" &&
      m.cancelledAt &&
      m.cancelledAt > periodStart
  ).length;
}

async function getConfigValue(
  ctx: any,
  key: string,
  defaultValue: string
): Promise<string> {
  const config = await ctx.db
    .query("systemConfig")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .first();
  return config?.value ?? defaultValue;
}

function formatPriceCents(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " \u20ac";
}

async function countSessionBreakdown(
  ctx: any,
  mission: any
): Promise<{ pastSessions: number; remainingSessions: number; totalSessions: number }> {
  const totalSessions = mission.numberOfSessions || 1;

  if (mission.sessionType === "collective") {
    // Collectif : compter les bookings completed vs booked
    const bookings = await ctx.db
      .query("collectiveSlotBookings")
      .withIndex("by_mission", (q: any) => q.eq("missionId", mission._id))
      .collect();

    const pastSessions = bookings.filter((b: any) => b.status === "completed").length;
    const remainingSessions = totalSessions - pastSessions;
    return { pastSessions, remainingSessions: Math.max(0, remainingSessions), totalSessions };
  }

  // Individuel multi-séance : comparer session.date < today
  if (mission.sessions && mission.sessions.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    const pastSessions = mission.sessions.filter((s: any) => {
      const sessionDate = new Date(s.date);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.getTime() < todayTime;
    }).length;

    const remainingSessions = totalSessions - pastSessions;
    return { pastSessions, remainingSessions: Math.max(0, remainingSessions), totalSessions };
  }

  return { pastSessions: 0, remainingSessions: totalSessions, totalSessions };
}

async function getAnnouncerPolicy(
  ctx: any,
  announcerId: any
): Promise<{ refundMode: "per_session" | "percentage_remaining"; commissionPercent: number }> {
  const policy = await ctx.db
    .query("cancellationPolicies")
    .withIndex("by_user", (q: any) => q.eq("userId", announcerId))
    .first();

  return {
    refundMode: policy?.refundMode || "per_session",
    commissionPercent: policy?.defaultCommissionPercent || 0,
  };
}

async function calculateRefund(
  ctx: any,
  mission: any,
  payment: any | null
): Promise<{
  canCancel: boolean;
  refundAmount: number;
  platformFeeRetained: number;
  announcerRetained: number;
  reason: string;
  cancellationCount: number;
  sessionBreakdown?: {
    pastSessions: number;
    remainingSessions: number;
    totalSessions: number;
    amountPerSession: number;
    pastSessionsAmount: number;
    remainingAmount: number;
  };
}> {
  const status = mission.status;

  if (status === "pending_acceptance" || status === "pending_confirmation") {
    return {
      canCancel: true,
      refundAmount: 0,
      platformFeeRetained: 0,
      announcerRetained: 0,
      reason: "Annulation gratuite (pas encore payé)",
      cancellationCount: 0,
    };
  }

  if (status === "in_progress") {
    const isMultiSession =
      (mission.numberOfSessions && mission.numberOfSessions > 1) ||
      mission.sessionType === "collective";
    if (!isMultiSession) {
      return {
        canCancel: false,
        refundAmount: 0,
        platformFeeRetained: 0,
        announcerRetained: 0,
        reason: "Impossible d'annuler une prestation uni-séance en cours",
        cancellationCount: 0,
      };
    }

    // Mission in_progress multi-séance : calcul pro-rata
    if (payment && payment.status === "captured") {
      const breakdown = await countSessionBreakdown(ctx, mission);
      const { pastSessions, remainingSessions, totalSessions } = breakdown;

      if (remainingSessions === 0) {
        return {
          canCancel: false,
          refundAmount: 0,
          platformFeeRetained: 0,
          announcerRetained: 0,
          reason: "Toutes les séances ont été effectuées, annulation impossible",
          cancellationCount: 0,
        };
      }

      const totalAmount = payment.amount;
      const platformFee = mission.platformFee || payment.platformFee || 0;
      const announcerEarnings = mission.announcerEarnings || payment.announcerEarnings || 0;

      const amountPerSession = Math.round(totalAmount / totalSessions);
      const pastSessionsAmount = amountPerSession * pastSessions;
      const remainingAmount = totalAmount - pastSessionsAmount;

      // Commission plateforme proportionnelle aux séances restantes
      const platformFeePerSession = Math.round(platformFee / totalSessions);
      const platformFeeRemaining = platformFeePerSession * remainingSessions;

      const announcerPolicy = await getAnnouncerPolicy(ctx, mission.announcerId);

      const cancellationCount = await getClientCancellationCount(
        ctx, mission.clientId, 12
      );

      const sessionBreakdown = {
        pastSessions,
        remainingSessions,
        totalSessions,
        amountPerSession,
        pastSessionsAmount,
        remainingAmount,
      };

      if (announcerPolicy.refundMode === "per_session") {
        // Mode par séance : remboursement intégral des séances restantes - commission plateforme
        const refundAmount = Math.max(0, remainingAmount - platformFeeRemaining);
        return {
          canCancel: true,
          refundAmount,
          platformFeeRetained: platformFeeRemaining,
          announcerRetained: 0,
          reason: `Remboursement pro-rata : ${remainingSessions}/${totalSessions} séance${remainingSessions > 1 ? "s" : ""} restante${remainingSessions > 1 ? "s" : ""} remboursée${remainingSessions > 1 ? "s" : ""}`,
          cancellationCount,
          sessionBreakdown,
        };
      }

      // Mode percentage_remaining : l'annonceur conserve X% des gains des séances restantes
      const announcerEarningsPerSession = Math.round(announcerEarnings / totalSessions);
      const remainingAnnouncerEarnings = announcerEarningsPerSession * remainingSessions;
      const announcerRetained = Math.round(remainingAnnouncerEarnings * (announcerPolicy.commissionPercent / 100));
      const refundAmount = Math.max(0, remainingAmount - platformFeeRemaining - announcerRetained);

      return {
        canCancel: true,
        refundAmount,
        platformFeeRetained: platformFeeRemaining,
        announcerRetained,
        reason: `Remboursement pro-rata : ${remainingSessions}/${totalSessions} séance${remainingSessions > 1 ? "s" : ""} restante${remainingSessions > 1 ? "s" : ""} (annonceur conserve ${announcerPolicy.commissionPercent}%)`,
        cancellationCount,
        sessionBreakdown,
      };
    }
  }

  if (!payment || payment.status !== "captured") {
    return {
      canCancel: true,
      refundAmount: 0,
      platformFeeRetained: 0,
      announcerRetained: 0,
      reason: "Annulation gratuite (pas de paiement capturé)",
      cancellationCount: 0,
    };
  }

  const gracePeriodHours = parseInt(
    await getConfigValue(ctx, "cancellation_grace_period_hours", "24"), 10
  );
  const thresholdHours = parseInt(
    await getConfigValue(ctx, "cancellation_threshold_hours", "48"), 10
  );
  const secondPercent = parseInt(
    await getConfigValue(ctx, "cancellation_2nd_announcer_percent", "50"), 10
  );
  const thirdPercent = parseInt(
    await getConfigValue(ctx, "cancellation_3rd_announcer_percent", "100"), 10
  );
  const counterPeriodMonths = parseInt(
    await getConfigValue(ctx, "cancellation_counter_period_months", "12"), 10
  );

  const now = Date.now();
  const paidAt = payment.paidAt || payment.capturedAt || payment.createdAt;
  const hoursSincePaid = (now - paidAt) / (1000 * 60 * 60);

  const startDateTime = new Date(`${mission.startDate}T${mission.startTime || "00:00"}`).getTime();
  const hoursBeforeStart = (startDateTime - now) / (1000 * 60 * 60);

  const cancellationCount = await getClientCancellationCount(
    ctx, mission.clientId, counterPeriodMonths
  );

  const totalAmount = payment.amount;
  const platformFee = mission.platformFee || payment.platformFee || 0;
  const announcerEarnings = mission.announcerEarnings || payment.announcerEarnings || 0;

  // 1. Grâce post-paiement → remboursement 100%
  if (hoursSincePaid <= gracePeriodHours) {
    return {
      canCancel: true,
      refundAmount: totalAmount,
      platformFeeRetained: 0,
      announcerRetained: 0,
      reason: `Remboursement intégral (dans les ${gracePeriodHours}h après paiement)`,
      cancellationCount,
    };
  }

  // 2. Plus de 48h avant le début → remboursement total - commission
  if (hoursBeforeStart > thresholdHours) {
    return {
      canCancel: true,
      refundAmount: totalAmount - platformFee,
      platformFeeRetained: platformFee,
      announcerRetained: 0,
      reason: `Remboursement moins la commission plateforme (plus de ${thresholdHours}h avant le début)`,
      cancellationCount,
    };
  }

  // 3. Moins de 48h → selon compteur
  if (cancellationCount === 0) {
    return {
      canCancel: true,
      refundAmount: totalAmount - platformFee,
      platformFeeRetained: platformFee,
      announcerRetained: 0,
      reason: "Première annulation : remboursement moins la commission plateforme",
      cancellationCount,
    };
  }

  if (cancellationCount === 1) {
    const announcerRetained = Math.round(announcerEarnings * (secondPercent / 100));
    const refund = Math.max(0, totalAmount - platformFee - announcerRetained);
    return {
      canCancel: true,
      refundAmount: refund,
      platformFeeRetained: platformFee,
      announcerRetained,
      reason: `2ème annulation : l'annonceur conserve ${secondPercent}% de ses gains`,
      cancellationCount,
    };
  }

  // 3ème+ annulation → aucun remboursement
  return {
    canCancel: true,
    refundAmount: 0,
    platformFeeRetained: platformFee,
    announcerRetained: announcerEarnings,
    reason: `${cancellationCount + 1}ème annulation : aucun remboursement`,
    cancellationCount,
  };
}

// ============================================
// QUERIES
// ============================================

export const getCancellationPreview = query({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const mission = await ctx.db.get(args.missionId);
    if (!mission) {
      throw new ConvexError("Mission non trouvée");
    }

    if (mission.clientId !== session.userId) {
      throw new ConvexError("Vous n'êtes pas le client de cette mission");
    }

    let payment = null;
    if (mission.stripePaymentId) {
      payment = await ctx.db.get(mission.stripePaymentId);
    }

    const result = await calculateRefund(ctx, mission, payment);

    return {
      ...result,
      totalPaid: payment?.amount || mission.amount,
      missionStatus: mission.status,
      sessionBreakdown: result.sessionBreakdown ?? null,
    };
  },
});

export const getAnnouncerCancellationPolicy = query({
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

    const policy = await ctx.db
      .query("cancellationPolicies")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    return policy
      ? {
          defaultCommissionPercent: policy.defaultCommissionPercent,
          refundMode: policy.refundMode || "per_session",
        }
      : {
          defaultCommissionPercent: 0,
          refundMode: "per_session" as const,
        };
  },
});

export const getClientCancellationInfo = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    const counterPeriodMonths = parseInt(
      await getConfigValue(ctx, "cancellation_counter_period_months", "12"), 10
    );
    const secondPercent = parseInt(
      await getConfigValue(ctx, "cancellation_2nd_announcer_percent", "50"), 10
    );

    const cancellationCount = await getClientCancellationCount(
      ctx, session.userId, counterPeriodMonths
    );

    return {
      cancellationCount,
      counterPeriodMonths,
      secondAnnouncerPercent: secondPercent,
    };
  },
});

export const getPublicAnnouncerCancellationPolicy = query({
  args: { announcerId: v.id("users") },
  handler: async (ctx, args) => {
    const policy = await ctx.db
      .query("cancellationPolicies")
      .withIndex("by_user", (q: any) => q.eq("userId", args.announcerId))
      .first();

    return {
      refundMode: policy?.refundMode || "per_session",
      commissionPercent: policy?.defaultCommissionPercent || 0,
    };
  },
});

// ============================================
// MUTATIONS
// ============================================

export const cancelMissionByClient = mutation({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const mission = await ctx.db.get(args.missionId);
    if (!mission) {
      throw new ConvexError("Mission non trouvée");
    }

    if (mission.clientId !== session.userId) {
      throw new ConvexError("Vous n'êtes pas le client de cette mission");
    }

    const allowedStatuses = [
      "pending_acceptance",
      "pending_confirmation",
      "upcoming",
      "in_progress",
    ];
    if (!allowedStatuses.includes(mission.status)) {
      throw new ConvexError("Cette mission ne peut pas être annulée");
    }

    let payment = null;
    if (mission.stripePaymentId) {
      payment = await ctx.db.get(mission.stripePaymentId);
    }

    const refundResult = await calculateRefund(ctx, mission, payment);

    if (!refundResult.canCancel) {
      throw new ConvexError(refundResult.reason);
    }

    const now = Date.now();

    // Libérer les créneaux collectifs (uniquement ceux encore "booked", pas les "completed")
    if (
      mission.sessionType === "collective" &&
      mission.collectiveSlotIds &&
      mission.collectiveSlotIds.length > 0
    ) {
      const animalCount = mission.animalCount || 1;

      const bookings = await ctx.db
        .query("collectiveSlotBookings")
        .withIndex("by_mission", (q) => q.eq("missionId", args.missionId))
        .collect();

      for (const booking of bookings) {
        if (booking.status === "booked") {
          // Libérer le créneau uniquement pour les bookings non complétés
          const slot = await ctx.db.get(booking.slotId);
          if (slot) {
            await ctx.db.patch(booking.slotId, {
              bookedAnimals: Math.max(0, slot.bookedAnimals - animalCount),
              updatedAt: now,
            });
          }

          await ctx.db.patch(booking._id, {
            status: "cancelled",
            cancelledAt: now,
            updatedAt: now,
          });
        }
      }
    }

    // Mettre à jour la mission
    await ctx.db.patch(args.missionId, {
      status: "cancelled",
      cancelledBy: "client",
      cancelledAt: now,
      cancellationReason: args.reason,
      refundAmount: refundResult.refundAmount,
      announcerRetainedAmount: refundResult.announcerRetained,
      updatedAt: now,
    });

    // Remboursement Stripe si nécessaire
    if (refundResult.refundAmount > 0 && payment?.paymentIntentId) {
      const stripeSecretKeyConfig = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", (q) => q.eq("key", "stripe_secret_key"))
        .first();

      if (stripeSecretKeyConfig?.value) {
        await ctx.scheduler.runAfter(
          0,
          internal.planning.cancellationActions.processStripeRefund,
          {
            missionId: args.missionId,
            paymentIntentId: payment.paymentIntentId,
            refundAmount: refundResult.refundAmount,
            stripeSecretKey: stripeSecretKeyConfig.value,
          }
        );
      }
    }

    // Annuler PaymentIntent en attente
    if (
      mission.status === "pending_confirmation" &&
      payment?.paymentIntentId &&
      payment.status === "pending"
    ) {
      const stripeSecretKeyConfig = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", (q) => q.eq("key", "stripe_secret_key"))
        .first();

      if (stripeSecretKeyConfig?.value) {
        await ctx.scheduler.runAfter(
          0,
          internal.planning.cancellationActions.cancelStripePaymentIntent,
          {
            paymentIntentId: payment.paymentIntentId,
            stripeSecretKey: stripeSecretKeyConfig.value,
          }
        );
      }

      await ctx.db.patch(payment._id, {
        status: "cancelled",
        cancelledAt: now,
        updatedAt: now,
      });
    }

    // Notifications
    const client = await ctx.db.get(mission.clientId);
    const announcer = await ctx.db.get(mission.announcerId);
    const clientName = client
      ? `${client.firstName} ${client.lastName.charAt(0)}.`
      : "Client";
    const announcerName = announcer
      ? `${announcer.firstName} ${announcer.lastName.charAt(0)}.`
      : "Annonceur";

    if (announcer) {
      await ctx.db.insert("notifications", {
        userId: mission.announcerId,
        type: "mission_cancelled",
        title: "Réservation annulée par le client",
        message: `${clientName} a annulé "${mission.serviceName}"${refundResult.refundAmount > 0 ? ` (remboursement ${formatPriceCents(refundResult.refundAmount)})` : ""}`,
        linkType: "mission",
        linkId: args.missionId,
        linkUrl: "/dashboard/missions",
        isRead: false,
        createdAt: now,
        expiresAt: now + 30 * 24 * 60 * 60 * 1000,
      });
    }

    if (client) {
      const refundMessage =
        refundResult.refundAmount > 0
          ? `Remboursement de ${formatPriceCents(refundResult.refundAmount)} en cours.`
          : "Aucun remboursement applicable.";
      await ctx.db.insert("notifications", {
        userId: mission.clientId,
        type: "mission_cancelled",
        title: "Votre réservation a été annulée",
        message: `Votre réservation "${mission.serviceName}" avec ${announcerName} a été annulée. ${refundMessage}`,
        linkType: "mission",
        linkId: args.missionId,
        linkUrl: "/client/missions",
        isRead: false,
        createdAt: now,
        expiresAt: now + 30 * 24 * 60 * 60 * 1000,
      });
    }

    // Email à l'annonceur
    if (announcer) {
      const emailApiKeyConfig = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", (q) => q.eq("key", "resend_api_key"))
        .first();
      const emailFromConfig = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", (q) => q.eq("key", "resend_from_email"))
        .first();
      const emailFromNameConfig = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", (q) => q.eq("key", "resend_from_name"))
        .first();

      if (emailApiKeyConfig?.value) {
        await ctx.scheduler.runAfter(
          0,
          internal.planning.cancellationActions.sendCancellationEmail,
          {
            recipientEmail: announcer.email,
            recipientName: announcer.firstName,
            clientName,
            serviceName: mission.serviceName,
            animalName: mission.animal?.name || "Animal",
            startDate: mission.startDate,
            endDate: mission.endDate,
            totalAmount: mission.amount,
            refundAmount: refundResult.refundAmount,
            announcerRetained: refundResult.announcerRetained,
            cancellationReason: args.reason,
            isAnnouncer: true,
            emailConfig: {
              apiKey: emailApiKeyConfig.value,
              fromEmail: emailFromConfig?.value,
              fromName: emailFromNameConfig?.value,
            },
          }
        );
      }
    }

    return {
      success: true,
      refundAmount: refundResult.refundAmount,
      reason: refundResult.reason,
    };
  },
});

export const updateAnnouncerCancellationPolicy = mutation({
  args: {
    token: v.string(),
    defaultCommissionPercent: v.number(),
    refundMode: v.optional(v.union(v.literal("per_session"), v.literal("percentage_remaining"))),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const percent = Math.min(100, Math.max(0, args.defaultCommissionPercent));
    const refundMode = args.refundMode || "per_session";
    const now = Date.now();

    const existing = await ctx.db
      .query("cancellationPolicies")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        defaultCommissionPercent: percent,
        refundMode,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("cancellationPolicies", {
        userId: session.userId,
        defaultCommissionPercent: percent,
        refundMode,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true, defaultCommissionPercent: percent, refundMode };
  },
});

// ============================================
// INTERNAL MUTATIONS
// ============================================

export const markRefundProcessed = internalMutation({
  args: {
    missionId: v.id("missions"),
    refundStripeId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.missionId, {
      refundStripeId: args.refundStripeId,
      updatedAt: Date.now(),
    });
  },
});
