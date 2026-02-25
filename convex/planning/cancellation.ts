// @ts-nocheck
import { query, mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import { getEmailConfigFromDb } from "../api/emailInternal";

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
    if (payment && ["captured", "authorized"].includes(payment.status)) {
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

  // Seuls les paiements capturés ou autorisés (pré-auth) permettent un remboursement
  if (!payment || !["captured", "authorized"].includes(payment.status)) {
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
  const lastMinuteThresholdHours = parseInt(
    await getConfigValue(ctx, "cancellation_last_minute_threshold_hours", "24"), 10
  );
  const lastMinuteGraceHours = parseInt(
    await getConfigValue(ctx, "cancellation_last_minute_grace_hours", "6"), 10
  );

  const now = Date.now();
  const paidAt = payment.paidAt || payment.capturedAt || payment.authorizedAt || payment.createdAt;
  const hoursSincePaid = (now - paidAt) / (1000 * 60 * 60);

  const startDateTime = new Date(`${mission.startDate}T${mission.startTime || "00:00"}`).getTime();
  const hoursBeforeStart = (startDateTime - now) / (1000 * 60 * 60);

  // Déterminer si réservation last-minute (payé < Xh avant le début)
  const hoursBeforeStartAtBooking = (startDateTime - paidAt) / (1000 * 60 * 60);
  const isLastMinuteBooking = hoursBeforeStartAtBooking < lastMinuteThresholdHours;
  const effectiveGracePeriodHours = isLastMinuteBooking ? lastMinuteGraceHours : gracePeriodHours;

  const cancellationCount = await getClientCancellationCount(
    ctx, mission.clientId, counterPeriodMonths
  );

  const totalAmount = payment.amount;
  const platformFee = mission.platformFee || payment.platformFee || 0;
  const announcerEarnings = mission.announcerEarnings || payment.announcerEarnings || 0;

  // 1. Grâce post-paiement → remboursement 100% (réduite si last-minute)
  if (hoursSincePaid <= effectiveGracePeriodHours) {
    return {
      canCancel: true,
      refundAmount: totalAmount,
      platformFeeRetained: 0,
      announcerRetained: 0,
      reason: isLastMinuteBooking
        ? `Remboursement intégral (grâce last-minute : ${effectiveGracePeriodHours}h après paiement)`
        : `Remboursement intégral (dans les ${effectiveGracePeriodHours}h après paiement)`,
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

  // 3ème+ annulation → annonceur conserve thirdPercent% de ses gains
  const announcerRetained3rd = Math.round(announcerEarnings * (thirdPercent / 100));
  const refund3rd = Math.max(0, totalAmount - platformFee - announcerRetained3rd);
  return {
    canCancel: true,
    refundAmount: refund3rd,
    platformFeeRetained: platformFee,
    announcerRetained: announcerRetained3rd,
    reason: `${cancellationCount + 1}ème annulation : l'annonceur conserve ${thirdPercent}% de ses gains`,
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

    // Gestion Stripe selon le statut du paiement
    if (payment?.paymentIntentId) {
      const stripeSecretKeyConfig = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", (q) => q.eq("key", "stripe_secret_key"))
        .first();

      if (stripeSecretKeyConfig?.value) {
        if (payment.status === "captured") {
          // Paiement déjà capturé → remboursement classique
          if (refundResult.refundAmount > 0) {
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

            // Marquer le paiement comme en cours de remboursement
            // (markRefundProcessed finalisera le statut "refunded" après confirmation Stripe)
            await ctx.db.patch(payment._id, {
              refundedAmount: refundResult.refundAmount,
              updatedAt: now,
            });
          }
        } else if (payment.status === "authorized") {
          // Paiement marqué "authorized" en base
          // Note : avec le paiement immédiat, le PI peut être "succeeded" côté Stripe
          // cancelStripePaymentIntent gère les deux cas (cancel ou refund selon le vrai statut)
          const retainedAmount = (payment.amount || 0) - refundResult.refundAmount;

          if (retainedAmount <= 0) {
            // Remboursement total → cancel ou refund selon le vrai statut Stripe
            await ctx.scheduler.runAfter(
              0,
              internal.planning.cancellationActions.cancelStripePaymentIntent,
              {
                paymentIntentId: payment.paymentIntentId,
                stripeSecretKey: stripeSecretKeyConfig.value,
                missionId: args.missionId,
                refundAmount: refundResult.refundAmount,
              }
            );
          } else {
            // Remboursement partiel → capturer uniquement le montant retenu
            await ctx.scheduler.runAfter(
              0,
              internal.planning.cancellationActions.capturePartialPaymentIntent,
              {
                missionId: args.missionId,
                paymentIntentId: payment.paymentIntentId,
                amountToCapture: retainedAmount,
                stripeSecretKey: stripeSecretKeyConfig.value,
              }
            );
          }

          // Mettre à jour le statut du paiement
          await ctx.db.patch(payment._id, {
            status: retainedAmount <= 0 ? "cancelled" : "captured",
            ...(retainedAmount <= 0 ? { cancelledAt: now } : { capturedAt: now }),
            refundedAmount: refundResult.refundAmount,
            updatedAt: now,
          });
        } else if (payment.status === "pending") {
          // Paiement en attente → annuler le PaymentIntent
          await ctx.scheduler.runAfter(
            0,
            internal.planning.cancellationActions.cancelStripePaymentIntent,
            {
              paymentIntentId: payment.paymentIntentId,
              stripeSecretKey: stripeSecretKeyConfig.value,
            }
          );

          await ctx.db.patch(payment._id, {
            status: "cancelled",
            cancelledAt: now,
            updatedAt: now,
          });
        }
      }
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
      const announcerNotifMessage = refundResult.announcerRetained > 0
        ? `${clientName} a annulé "${mission.serviceName}". Vous conservez ${formatPriceCents(refundResult.announcerRetained)}. Règle : ${refundResult.reason}`
        : `${clientName} a annulé "${mission.serviceName}". ${refundResult.refundAmount > 0 ? `Remboursement client : ${formatPriceCents(refundResult.refundAmount)}.` : ""} Règle : ${refundResult.reason}`;
      await ctx.db.insert("notifications", {
        userId: mission.announcerId,
        type: "mission_cancelled",
        title: "Réservation annulée par le client",
        message: announcerNotifMessage,
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
          ? `Remboursement de ${formatPriceCents(refundResult.refundAmount)} en cours (délai : 5-10 jours ouvrés).${refundResult.platformFeeRetained > 0 ? ` Commission retenue : ${formatPriceCents(refundResult.platformFeeRetained)}.` : ""}`
          : "Aucun remboursement applicable.";
      await ctx.db.insert("notifications", {
        userId: mission.clientId,
        type: "mission_cancelled",
        title: "Votre réservation a été annulée",
        message: `Votre réservation "${mission.serviceName}" avec ${announcerName} a été annulée. ${refundMessage} Règle : ${refundResult.reason}`,
        linkType: "mission",
        linkId: args.missionId,
        linkUrl: "/client/missions",
        isRead: false,
        createdAt: now,
        expiresAt: now + 30 * 24 * 60 * 60 * 1000,
      });
    }

    // Emails d'annulation (via templates)
    const { emailConfig: cancelEmailConfig } = await getEmailConfigFromDb(ctx.db);

    // Email à l'annonceur
    if (announcer && cancelEmailConfig) {
      await ctx.scheduler.runAfter(
        0,
        internal.api.email.sendCancellationAnnouncerEmail,
        {
          announcerEmail: announcer.email,
          announcerName: announcer.firstName,
          clientName,
          serviceName: mission.serviceName,
          animalName: mission.animal?.name || "Animal",
          startDate: mission.startDate,
          endDate: mission.endDate,
          totalAmount: mission.amount,
          refundAmount: refundResult.refundAmount,
          announcerRetained: refundResult.announcerRetained,
          cancellationReason: args.reason,
          cancellationRule: refundResult.reason,
          emailConfig: cancelEmailConfig || { apiKey: "" },
        }
      );
    }

    // Email au client
    if (client && cancelEmailConfig) {
      await ctx.scheduler.runAfter(
        0,
        internal.api.email.sendCancellationClientEmail,
        {
          clientEmail: client.email,
          clientName: client.firstName,
          serviceName: mission.serviceName,
          animalName: mission.animal?.name || "Animal",
          startDate: mission.startDate,
          endDate: mission.endDate,
          totalAmount: mission.amount,
          refundAmount: refundResult.refundAmount,
          platformFeeRetained: refundResult.platformFeeRetained,
          cancellationRule: refundResult.reason,
          emailConfig: cancelEmailConfig || { apiKey: "" },
        }
      );
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
    const now = Date.now();
    const mission = await ctx.db.get(args.missionId);

    await ctx.db.patch(args.missionId, {
      refundStripeId: args.refundStripeId,
      updatedAt: now,
    });

    // Mettre à jour le statut du paiement en "refunded"
    if (mission?.stripePaymentId) {
      const payment = await ctx.db.get(mission.stripePaymentId);
      if (payment) {
        await ctx.db.patch(payment._id, {
          status: "refunded",
          refundedAt: now,
          refundedAmount: mission.refundAmount || payment.amount,
          updatedAt: now,
        });
      }
    }

    // Notification au client : remboursement traité
    if (mission?.clientId) {
      const refundedAmount = mission.refundAmount || 0;
      const formatCents = (c: number) => (c / 100).toFixed(2).replace(".", ",") + " \u20ac";
      await ctx.db.insert("notifications", {
        userId: mission.clientId,
        type: "payment_refunded",
        title: "Remboursement effectué",
        message: `Votre remboursement de ${formatCents(refundedAmount)} pour "${mission.serviceName}" a été traité. Il apparaîtra sur votre relevé sous 5-10 jours ouvrés.`,
        linkType: "mission",
        linkId: args.missionId,
        linkUrl: "/client/missions",
        isRead: false,
        createdAt: now,
        expiresAt: now + 30 * 24 * 60 * 60 * 1000,
      });
    }
  },
});
