import { query, QueryCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { v, ConvexError } from "convex/values";

// ─── Helpers ──────────────────────────────────────────

async function validateAnnouncerSession(
  ctx: QueryCtx,
  sessionToken: string
): Promise<{ user: Doc<"users">; session: Doc<"sessions"> }> {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", sessionToken))
    .first();

  if (!session || session.expiresAt < Date.now()) {
    throw new ConvexError("Session invalide ou expirée");
  }

  const user = await ctx.db.get(session.userId);
  if (!user || !user.isActive) {
    throw new ConvexError("Utilisateur non trouvé ou inactif");
  }

  if (
    user.accountType !== "annonceur_pro" &&
    user.accountType !== "annonceur_particulier"
  ) {
    throw new ConvexError("Accès réservé aux annonceurs");
  }

  return { user, session };
}

function centsToEuros(cents: number): number {
  return Math.round(cents) / 100;
}

// Taux de commission par défaut si systemConfig absent
const DEFAULT_COMMISSIONS: Record<string, number> = {
  particulier: 15,
  micro_entrepreneur: 12,
  professionnel: 10,
};

function getCommissionType(user: Doc<"users">): string {
  if (user.accountType === "annonceur_particulier") return "particulier";
  if (user.companyType === "micro_enterprise") return "micro_entrepreneur";
  return "professionnel";
}

function getCommissionLabel(type: string): string {
  switch (type) {
    case "particulier":
      return "Particulier";
    case "micro_entrepreneur":
      return "Micro-entrepreneur";
    case "professionnel":
      return "Professionnel";
    default:
      return type;
  }
}

const MONTH_LABELS = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Août",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];

// ─── Query unique ──────────────────────────────────────

export const getAnnouncerPaymentsData = query({
  args: {
    sessionToken: v.string(),
    year: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await validateAnnouncerSession(ctx, args.sessionToken);

    const selectedYear = args.year || new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-indexed

    // 1. Taux de commission réel depuis systemConfig
    const commissionType = getCommissionType(user);
    const commissionConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", `commission_${commissionType}`))
      .first();
    const commissionRate = commissionConfig
      ? parseFloat(commissionConfig.value)
      : DEFAULT_COMMISSIONS[commissionType] || 15;

    // 2. Charger toutes les missions de l'annonceur
    const allMissions = await ctx.db
      .query("missions")
      .withIndex("by_announcer", (q) => q.eq("announcerId", user._id))
      .collect();

    // 3. Enrichir chaque mission avec client name + stripePayment
    const enrichedMissions = await Promise.all(
      allMissions.map(async (m) => {
        const client = await ctx.db.get(m.clientId);
        const clientName = client
          ? `${client.firstName} ${client.lastName}`
          : m.clientName || "Client";

        // Charger le paiement Stripe pour obtenir capturedAt/paidAt
        let paidAt: number | undefined;
        if (m.stripePaymentId) {
          const stripePayment = await ctx.db.get(m.stripePaymentId);
          if (stripePayment) {
            paidAt = stripePayment.capturedAt || stripePayment.paidAt;
          }
        }

        const announcerEarnings = m.announcerEarnings || 0;
        const isVatSubject = user.isVatSubject === true;
        const vatRate = m.vatRate || 20;
        const vatAmount = isVatSubject ? (m.vatAmount || 0) : 0;
        const vatOnCommission = isVatSubject ? (m.vatOnCommission || 0) : 0;
        const earningsHT = isVatSubject
          ? announcerEarnings - vatAmount
          : announcerEarnings;

        return {
          _id: m._id,
          // Dates
          bookedAt: m.bookedAt || m.createdAt || m._creationTime,
          paidAt,
          startDate: m.startDate,
          endDate: m.endDate,
          startTime: m.startTime,
          endTime: m.endTime,
          completedAt: m.clientConfirmedAt || m.autoConfirmedAt,
          // Montants (euros)
          serviceAmount: centsToEuros(m.serviceAmount || m.amount || 0),
          basePrice: centsToEuros(m.basePrice || 0),
          optionsPrice: centsToEuros(m.optionsPrice || 0),
          platformFee: centsToEuros(m.platformFee || 0),
          stripeFee: centsToEuros(m.stripeFee || 0),
          amount: centsToEuros(m.amount || 0),
          announcerEarnings: centsToEuros(announcerEarnings),
          commissionRate: m.commissionRate || commissionRate,
          // Pro TVA
          vatAmount: centsToEuros(vatAmount),
          vatOnCommission: centsToEuros(vatOnCommission),
          earningsHT: centsToEuros(earningsHT),
          // Infos
          clientName,
          animal: m.animal || { name: "Animal", type: "inconnu", emoji: "🐾" },
          animals: m.animals,
          serviceName: m.serviceName || "",
          serviceCategory: m.serviceCategory || "",
          sessionType: m.sessionType,
          serviceLocation: m.serviceLocation,
          // Statuts
          status: m.status,
          paymentStatus: m.paymentStatus,
          announcerPaymentStatus: m.announcerPaymentStatus,
          readyForPayout: m.readyForPayout,
          payoutScheduledFor: m.payoutScheduledFor,
          // Annulations
          cancelledBy: m.cancelledBy,
          cancelledAt: m.cancelledAt,
          cancellationReason: m.cancellationReason,
          refundAmount: m.refundAmount ? centsToEuros(m.refundAmount) : undefined,
          announcerRetainedAmount: m.announcerRetainedAmount
            ? centsToEuros(m.announcerRetainedAmount)
            : 0,
        };
      })
    );

    // 4. Regrouper par statut
    const awaitingPayment = enrichedMissions.filter(
      (m) =>
        m.status === "pending_confirmation" &&
        (m.paymentStatus === "not_due" || m.paymentStatus === "pending")
    );

    const paid = enrichedMissions.filter(
      (m) =>
        (m.status === "upcoming" || m.status === "in_progress") &&
        (m.paymentStatus === "paid" || m.paymentStatus === "pending")
    );

    const completed = enrichedMissions.filter(
      (m) => m.status === "completed"
    );

    const cancelled = enrichedMissions.filter(
      (m) => m.status === "cancelled"
    );

    // 5. Stats globales
    const totalEarnings = completed.reduce(
      (sum, m) => sum + m.announcerEarnings,
      0
    );
    const totalPending = completed
      .filter((m) => m.announcerPaymentStatus !== "paid")
      .reduce((sum, m) => sum + m.announcerEarnings, 0);
    const totalCollected = completed
      .filter((m) => m.announcerPaymentStatus === "paid")
      .reduce((sum, m) => sum + m.announcerEarnings, 0);
    const pendingCount = completed.filter(
      (m) => m.announcerPaymentStatus !== "paid"
    ).length;
    const collectedCount = completed.filter(
      (m) => m.announcerPaymentStatus === "paid"
    ).length;

    const totalVatCollected = completed.reduce(
      (sum, m) => sum + m.vatAmount,
      0
    );
    const totalVatOnCommission = completed.reduce(
      (sum, m) => sum + m.vatOnCommission,
      0
    );

    // 6. Ventilation mensuelle (12 mois pour l'année sélectionnée)
    const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
      const monthMissions = completed.filter((m) => {
        if (!m.startDate) return false;
        const d = new Date(m.startDate);
        return d.getFullYear() === selectedYear && d.getMonth() === i;
      });

      const earnings = monthMissions.reduce(
        (sum, m) => sum + m.announcerEarnings,
        0
      );
      const earningsHT = monthMissions.reduce(
        (sum, m) => sum + m.earningsHT,
        0
      );
      const vat = monthMissions.reduce((sum, m) => sum + m.vatAmount, 0);
      const vatOnComm = monthMissions.reduce(
        (sum, m) => sum + m.vatOnCommission,
        0
      );
      const commissions = monthMissions.reduce(
        (sum, m) => sum + m.platformFee,
        0
      );

      return {
        month: i,
        monthLabel: MONTH_LABELS[i],
        earnings: Math.round(earnings * 100) / 100,
        earningsHT: Math.round(earningsHT * 100) / 100,
        vatAmount: Math.round(vat * 100) / 100,
        vatOnCommission: Math.round(vatOnComm * 100) / 100,
        missionsCount: monthMissions.length,
        commissionsTotal: Math.round(commissions * 100) / 100,
      };
    });

    // 7. Revenus annuels (année courante + précédente)
    const computeAnnualRevenue = (year: number) => {
      const yearMissions = completed.filter((m) => {
        if (!m.startDate) return false;
        return new Date(m.startDate).getFullYear() === year;
      });
      const total = yearMissions.reduce(
        (sum, m) => sum + m.announcerEarnings,
        0
      );
      const totalHT = yearMissions.reduce((sum, m) => sum + m.earningsHT, 0);
      const vat = yearMissions.reduce((sum, m) => sum + m.vatAmount, 0);
      return {
        year,
        total: Math.round(total * 100) / 100,
        totalHT: Math.round(totalHT * 100) / 100,
        vat: Math.round(vat * 100) / 100,
        count: yearMissions.length,
      };
    };

    const annualRevenue = {
      currentYear: computeAnnualRevenue(selectedYear),
      previousYear: computeAnnualRevenue(selectedYear - 1),
    };

    // 8. Charger les payouts
    const payouts = await ctx.db
      .query("announcerPayouts")
      .withIndex("by_announcer", (q) => q.eq("announcerId", user._id))
      .order("desc")
      .take(12);

    const payoutHistory = await Promise.all(
      payouts.map(async (payout) => {
        const missionDetails = await Promise.all(
          payout.missions.map(async (mId) => {
            const m = await ctx.db.get(mId);
            if (!m) return null;
            return m.serviceName || "Mission";
          })
        );

        return {
          id: payout._id,
          date: payout.processedAt || payout.createdAt,
          amount: centsToEuros(payout.amount),
          grossAmount: payout.grossAmount
            ? centsToEuros(payout.grossAmount)
            : undefined,
          commissionAmount: payout.commissionAmount
            ? centsToEuros(payout.commissionAmount)
            : undefined,
          status: payout.status,
          missionsCount: payout.missions.length,
          missionNames: missionDetails.filter(Boolean) as string[],
        };
      })
    );

    // 9. Prochain virement
    const readyMissions = completed.filter(
      (m) =>
        m.readyForPayout === true && m.announcerPaymentStatus !== "paid"
    );
    const nextPayout =
      readyMissions.length > 0
        ? {
            amount: Math.round(
              readyMissions.reduce(
                (sum, m) => sum + m.announcerEarnings,
                0
              ) * 100
            ) / 100,
            missionsCount: readyMissions.length,
            scheduledDate: (() => {
              const now = new Date();
              const day = now.getDate();
              if (day >= 25) {
                return new Date(
                  now.getFullYear(),
                  now.getMonth() + 1,
                  25
                ).getTime();
              }
              return new Date(
                now.getFullYear(),
                now.getMonth(),
                25
              ).getTime();
            })(),
          }
        : null;

    // 10. Retour
    return {
      userInfo: {
        accountType: user.accountType,
        companyType: user.companyType,
        isVatSubject: user.isVatSubject === true,
        siret: user.siret,
        companyName: user.companyName,
        commissionRate,
        commissionType,
        commissionLabel: getCommissionLabel(commissionType),
      },
      stats: {
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        totalPending: Math.round(totalPending * 100) / 100,
        totalCollected: Math.round(totalCollected * 100) / 100,
        pendingCount,
        collectedCount,
        totalVatCollected: Math.round(totalVatCollected * 100) / 100,
        totalVatOnCommission: Math.round(totalVatOnCommission * 100) / 100,
      },
      monthlyRevenue,
      annualRevenue,
      currentMonth,
      selectedYear,
      missionsByStatus: {
        awaitingPayment,
        paid,
        completed,
        cancelled,
      },
      payoutHistory,
      nextPayout,
    };
  },
});
