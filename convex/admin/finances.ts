import { query, mutation, action } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin, requireAdminAction } from "./utils";
import { internal } from "../_generated/api";

/**
 * Dashboard financier complet — agrège toutes les données financières
 */
export const getFinanceDashboard = query({
  args: {
    token: v.string(),
    period: v.union(v.literal("month"), v.literal("year")),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    // ═══ TAUX CONFIGURÉS (admin/commissions) ═══
    const vatRateConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "commission_vat_rate"))
      .first();
    const configuredVatRate = vatRateConfig ? parseFloat(vatRateConfig.value) : 20;

    const stripeFeeRateConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "stripe_fee_rate"))
      .first();
    const configuredStripeFeeRate = stripeFeeRateConfig ? parseFloat(stripeFeeRateConfig.value) : 3;

    // Date du virement mensuel programmé (admin/paiements)
    const payoutDayConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "payout_scheduled_day"))
      .first();
    const payoutScheduledDay = payoutDayConfig ? parseInt(payoutDayConfig.value, 10) : 25;

    // Calcul de la prochaine date effective de virement (Europe/Paris)
    const nowDate = new Date();
    const todayDay = parseInt(
      new Date(nowDate).toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" }).split("-")[2],
      10
    );
    const nextPayoutMonth = todayDay >= payoutScheduledDay
      ? new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, payoutScheduledDay)
      : new Date(nowDate.getFullYear(), nowDate.getMonth(), payoutScheduledDay);
    const nextPayoutDateISO = nextPayoutMonth.toISOString().split("T")[0];

    // Taux de commission par type d'annonceur
    const commissionTypes = ["particulier", "micro_entrepreneur", "professionnel"] as const;
    const configuredCommissionRates: Record<string, number> = {};
    const defaultRates: Record<string, number> = { particulier: 15, micro_entrepreneur: 12, professionnel: 10 };
    for (const type of commissionTypes) {
      const config = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", (q) => q.eq("key", `commission_${type}`))
        .first();
      configuredCommissionRates[type] = config ? parseFloat(config.value) : defaultRates[type];
    }

    const [year, month] = args.date.split("-").map(Number);

    let periodStartDate: string;
    let periodEndDate: string;

    if (args.period === "month") {
      periodStartDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      periodEndDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
    } else {
      periodStartDate = `${year}-01-01`;
      periodEndDate = `${year}-12-31`;
    }

    // Période précédente pour comparaison
    let prevStartDate: string;
    let prevEndDate: string;
    if (args.period === "month") {
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      prevStartDate = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
      const prevLastDay = new Date(prevYear, prevMonth, 0).getDate();
      prevEndDate = `${prevYear}-${String(prevMonth).padStart(2, "0")}-${prevLastDay}`;
    } else {
      prevStartDate = `${year - 1}-01-01`;
      prevEndDate = `${year - 1}-12-31`;
    }

    // ═══ MISSIONS ═══
    const allMissions = await ctx.db.query("missions").collect();

    const periodMissions = allMissions.filter(
      (m) => m.startDate >= periodStartDate && m.startDate <= periodEndDate
    );
    const prevPeriodMissions = allMissions.filter(
      (m) => m.startDate >= prevStartDate && m.startDate <= prevEndDate
    );

    // Pipeline missions par statut
    const missionsByStatus = {
      pending_acceptance: periodMissions.filter((m) => m.status === "pending_acceptance"),
      pending_confirmation: periodMissions.filter((m) => m.status === "pending_confirmation"),
      upcoming: periodMissions.filter((m) => m.status === "upcoming"),
      in_progress: periodMissions.filter((m) => m.status === "in_progress"),
      completed: periodMissions.filter((m) => m.status === "completed"),
      cancelled: periodMissions.filter((m) => m.status === "cancelled"),
      refused: periodMissions.filter((m) => m.status === "refused"),
    };

    // Missions terminées et payées
    const completedPaid = missionsByStatus.completed.filter((m) => m.paymentStatus === "paid");
    const prevCompletedPaid = prevPeriodMissions.filter(
      (m) => m.status === "completed" && m.paymentStatus === "paid"
    );

    // ═══ VOLUME FINANCIER ═══
    const sumField = (missions: typeof allMissions, field: "amount" | "platformFee" | "announcerEarnings" | "stripeFee" | "vatOnCommission") =>
      missions.reduce((sum, m) => sum + ((m as any)[field] || 0), 0);

    // Revenus plateforme (commissions)
    const periodRevenue = sumField(completedPaid, "platformFee");
    const prevRevenue = sumField(prevCompletedPaid, "platformFee");

    // Volume brut (montants payés par les clients)
    const periodGross = sumField(completedPaid, "amount");
    const prevGross = sumField(prevCompletedPaid, "amount");

    // Revenus annonceurs
    const periodAnnouncerEarnings = sumField(completedPaid, "announcerEarnings");

    // Frais Stripe (frais de gestion facturés au client, TTC)
    const periodStripeFees = sumField(completedPaid, "stripeFee");

    // TVA sur commissions — recalcul correct : extraction TVA du TTC
    // Formule : TVA = TTC × taux / (100 + taux)
    // On recalcule plutôt que lire vatOnCommission car les anciennes missions
    // ont un calcul erroné (platformFee * 20 / 100 au lieu de * 20 / 120)
    // Utilise le taux TVA configuré dans admin/commissions
    const periodVatOnCommission = completedPaid.reduce(
      (sum, m) => sum + Math.round(((m.platformFee || 0) * configuredVatRate) / (100 + configuredVatRate)),
      0
    );

    // TVA sur frais de gestion (stripeFee est aussi TTC)
    const periodVatOnStripeFees = completedPaid.reduce(
      (sum, m) => sum + Math.round(((m.stripeFee || 0) * configuredVatRate) / (100 + configuredVatRate)),
      0
    );

    // Pipeline commissions par état
    const commissionsUpcoming = sumField(
      periodMissions.filter(
        (m) =>
          m.status === "pending_confirmation" ||
          m.status === "upcoming" ||
          m.status === "in_progress"
      ),
      "platformFee"
    );
    const commissionsValidated = sumField(
      missionsByStatus.completed.filter((m) => m.paymentStatus === "pending"),
      "platformFee"
    );
    const commissionsPaid = periodRevenue;

    // ═══ REVENUS PÉNALITÉS (annulations) ═══
    // Quand une mission est cancelled après paiement capturé, la plateforme garde
    // la commission ET les frais Stripe (politique 2026 : commission TOUJOURS retenue).
    // On les comptabilise séparément pour donner de la visibilité.
    const cancelledWithPayment = missionsByStatus.cancelled.filter(
      (m) =>
        // Le paiement a été capturé (puis remboursé partiellement OU pas du tout)
        m.paymentStatus === "paid" ||
        m.paymentStatus === "refunded" ||
        // Cas où la mission était `paid` puis annulée → status passe à "cancelled" mais
        // paymentStatus peut rester "paid" ou avoir refundAmount > 0
        (m.refundAmount !== undefined && m.refundAmount >= 0 && m.platformFee !== undefined)
    );
    const cancellationCommissions = sumField(cancelledWithPayment, "platformFee");
    const cancellationStripeFees = sumField(cancelledWithPayment, "stripeFee");
    const cancellationCount = cancelledWithPayment.length;
    // Montant retenu par les annonceurs sur annulations (selon le compteur 3ème/4ème)
    const cancellationAnnouncerRetained = cancelledWithPayment.reduce(
      (sum, m) => sum + (m.announcerRetainedAmount || 0),
      0
    );
    // Remboursements clients sur ces annulations
    const cancellationRefundsTotal = cancelledWithPayment.reduce(
      (sum, m) => sum + (m.refundAmount || 0),
      0
    );

    // ═══ VERSEMENTS ANNONCEURS ═══
    const readyForPayout = periodMissions.filter(
      (m) => m.readyForPayout === true && m.announcerPaymentStatus !== "paid"
    );
    const pendingPayoutAmount = sumField(readyForPayout, "announcerEarnings");

    const alreadyPaid = periodMissions.filter((m) => m.announcerPaymentStatus === "paid");
    const paidOutAmount = sumField(alreadyPaid, "announcerEarnings");

    // ═══ PAYOUTS (table announcerPayouts) ═══
    const allPayouts = await ctx.db.query("announcerPayouts").collect();
    const periodStart = new Date(periodStartDate).getTime();
    const periodEnd = new Date(periodEndDate + "T23:59:59.999Z").getTime();

    const periodPayouts = allPayouts.filter(
      (p) => p.createdAt >= periodStart && p.createdAt <= periodEnd
    );

    const payoutsByStatus = {
      pending: periodPayouts.filter((p) => p.status === "pending"),
      processing: periodPayouts.filter((p) => p.status === "processing"),
      completed: periodPayouts.filter((p) => p.status === "completed"),
      failed: periodPayouts.filter((p) => p.status === "failed"),
    };

    const payoutAmounts = {
      pending: payoutsByStatus.pending.reduce((s, p) => s + p.amount, 0),
      processing: payoutsByStatus.processing.reduce((s, p) => s + p.amount, 0),
      completed: payoutsByStatus.completed.reduce((s, p) => s + p.amount, 0),
      failed: payoutsByStatus.failed.reduce((s, p) => s + p.amount, 0),
    };

    // ═══ AVOIRS CLIENTS ═══
    const allCredits = await ctx.db.query("clientCredits").collect();
    const now = Date.now();
    let creditsActive = 0;
    let creditsActiveCount = 0;
    let creditsUsed = 0;
    let creditsUsedCount = 0;
    let creditsExpired = 0;

    for (const credit of allCredits) {
      if (credit.status === "active") {
        if (credit.expiresAt && credit.expiresAt < now) {
          creditsExpired += credit.amount;
        } else {
          creditsActive += credit.amount;
          creditsActiveCount++;
        }
      } else if (credit.status === "used") {
        creditsUsed += credit.originalAmount;
        creditsUsedCount++;
      } else if (credit.status === "expired") {
        creditsExpired += credit.originalAmount;
      }
    }

    // ═══ BREAKDOWN MENSUEL (si year) ═══
    let monthlyBreakdown: Array<{
      month: string;
      gross: number;
      revenue: number;
      announcerEarnings: number;
      missionsCount: number;
      avgBasket: number;
    }> | undefined;

    if (args.period === "year") {
      monthlyBreakdown = [];
      for (let m = 0; m < 12; m++) {
        const mStart = `${year}-${String(m + 1).padStart(2, "0")}-01`;
        const mLastDay = new Date(year, m + 1, 0).getDate();
        const mEnd = `${year}-${String(m + 1).padStart(2, "0")}-${mLastDay}`;
        const monthName = new Date(year, m, 1).toLocaleDateString("fr-FR", { month: "short" });

        const monthMissions = completedPaid.filter(
          (mi) => mi.startDate >= mStart && mi.startDate <= mEnd
        );

        const gross = sumField(monthMissions, "amount");
        const revenue = sumField(monthMissions, "platformFee");
        const earnings = sumField(monthMissions, "announcerEarnings");

        monthlyBreakdown.push({
          month: monthName,
          gross,
          revenue,
          announcerEarnings: earnings,
          missionsCount: monthMissions.length,
          avgBasket: monthMissions.length > 0 ? Math.round(gross / monthMissions.length) : 0,
        });
      }
    }

    // ═══ TOP ANNONCEURS ═══
    const announcerMap = new Map<string, { earnings: number; missions: number; fees: number }>();
    for (const m of completedPaid) {
      const key = m.announcerId;
      const existing = announcerMap.get(key) || { earnings: 0, missions: 0, fees: 0 };
      existing.earnings += m.announcerEarnings || 0;
      existing.missions += 1;
      existing.fees += m.platformFee || 0;
      announcerMap.set(key, existing);
    }

    const topAnnouncerIds = [...announcerMap.entries()]
      .sort((a, b) => b[1].earnings - a[1].earnings)
      .slice(0, 5);

    const topAnnouncers = await Promise.all(
      topAnnouncerIds.map(async ([id, data]) => {
        const user = (await ctx.db.get(id as any)) as
          | { firstName?: string; lastName?: string; email?: string }
          | null;
        return {
          userId: id,
          name: user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Inconnu" : "Inconnu",
          email: user?.email || "",
          earnings: data.earnings,
          missions: data.missions,
          fees: data.fees,
        };
      })
    );

    // ═══ TOUTES LES TRANSACTIONS (pagination côté client) ═══
    const sortedMissions = [...completedPaid]
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const recentTransactions = await Promise.all(
      sortedMissions.map(async (m) => {
        const client = await ctx.db.get(m.clientId);
        const announcer = await ctx.db.get(m.announcerId);
        return {
          _id: m._id,
          reference: m._id.slice(-8).toUpperCase(),
          serviceName: m.serviceName,
          startDate: m.startDate,
          amount: m.amount,
          platformFee: m.platformFee || 0,
          announcerEarnings: m.announcerEarnings || 0,
          commissionRate: m.commissionRate || null,
          announcerPaymentStatus: m.announcerPaymentStatus || "not_due",
          clientName: client ? `${client.firstName} ${client.lastName}` : "Inconnu",
          announcerName: announcer ? `${announcer.firstName} ${announcer.lastName}` : "Inconnu",
          createdAt: m.createdAt,
        };
      })
    );

    // ═══ VIREMENTS EN ATTENTE ═══
    const pendingPayouts = allPayouts
      .filter((p) => p.status === "pending")
      .sort((a, b) => (a.scheduledAt || a.createdAt) - (b.scheduledAt || b.createdAt))
      .slice(0, 8);

    const pendingPayoutsList = await Promise.all(
      pendingPayouts.map(async (p) => {
        const announcer = await ctx.db.get(p.announcerId);
        return {
          _id: p._id,
          amount: p.amount,
          missionsCount: p.missions.length,
          scheduledAt: p.scheduledAt || null,
          createdAt: p.createdAt,
          announcerName: announcer ? `${announcer.firstName} ${announcer.lastName}` : "Inconnu",
          announcerEmail: announcer?.email || "",
        };
      })
    );

    // ═══ COMPARAISON ═══
    const calcVariation = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const prevMissionsCount = prevPeriodMissions.filter(
      (m) => m.status === "completed" && m.paymentStatus === "paid"
    ).length;

    return {
      // KPIs principaux
      kpis: {
        gross: periodGross,
        grossVariation: calcVariation(periodGross, prevGross),
        revenue: periodRevenue,
        revenueVariation: calcVariation(periodRevenue, prevRevenue),
        announcerEarnings: periodAnnouncerEarnings,
        stripeFees: periodStripeFees,
        vatOnCommission: periodVatOnCommission,
        vatOnStripeFees: periodVatOnStripeFees,
        // Taux configurés depuis admin/commissions
        vatRate: configuredVatRate,
        stripeFeeRate: configuredStripeFeeRate,
        commissionRates: configuredCommissionRates,
        missionsCount: completedPaid.length,
        missionsVariation: calcVariation(completedPaid.length, prevMissionsCount),
        avgBasket: completedPaid.length > 0 ? Math.round(periodGross / completedPaid.length) : 0,
        avgCommissionRate:
          periodGross > 0 ? Math.round((periodRevenue / periodGross) * 10000) / 100 : 0,
      },
      // Pipeline commissions
      commissions: {
        upcoming: commissionsUpcoming,
        validated: commissionsValidated,
        paid: commissionsPaid,
        total: commissionsUpcoming + commissionsValidated + commissionsPaid,
      },
      // Pipeline missions
      missions: {
        pending_acceptance: missionsByStatus.pending_acceptance.length,
        pending_confirmation: missionsByStatus.pending_confirmation.length,
        upcoming: missionsByStatus.upcoming.length,
        in_progress: missionsByStatus.in_progress.length,
        completed: missionsByStatus.completed.length,
        cancelled: missionsByStatus.cancelled.length,
        refused: missionsByStatus.refused.length,
        total: periodMissions.length,
      },
      // Versements
      payouts: {
        pendingPayoutAmount,
        pendingPayoutMissions: readyForPayout.length,
        paidOutAmount,
        paidOutMissions: alreadyPaid.length,
        scheduledDay: payoutScheduledDay,
        nextPayoutDate: nextPayoutDateISO,
        byStatus: payoutAmounts,
        byStatusCount: {
          pending: payoutsByStatus.pending.length,
          processing: payoutsByStatus.processing.length,
          completed: payoutsByStatus.completed.length,
          failed: payoutsByStatus.failed.length,
        },
      },
      // Revenus pénalités (annulations qui rapportent à la plateforme)
      cancellations: {
        commissions: cancellationCommissions,
        stripeFees: cancellationStripeFees,
        announcerRetained: cancellationAnnouncerRetained,
        refunded: cancellationRefundsTotal,
        count: cancellationCount,
      },
      // Avoirs
      credits: {
        active: creditsActive,
        activeCount: creditsActiveCount,
        used: creditsUsed,
        usedCount: creditsUsedCount,
        expired: creditsExpired,
      },
      // Graphique
      monthlyBreakdown,
      // Top annonceurs
      topAnnouncers,
      // Dernières transactions
      recentTransactions,
      // Virements en attente
      pendingPayoutsList,
    };
  },
});

// Query: Statistiques des commissions par période
export const getCommissionStats = query({
  args: {
    token: v.string(),
    period: v.union(v.literal("month"), v.literal("year")),
    date: v.string(), // Format: "YYYY-MM" ou "YYYY"
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    // Parser la date pour obtenir la période
    const [year, month] = args.date.split("-").map(Number);

    let startDate: Date;
    let endDate: Date;

    if (args.period === "month") {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
    } else {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    }

    // Récupérer les missions de la période
    const missions = await ctx.db
      .query("missions")
      .collect();

    // Filtrer par période
    const periodMissions = missions.filter((m) => {
      const missionDate = new Date(m.startDate);
      return missionDate >= startDate && missionDate <= endDate;
    });

    // Calculer les commissions
    let upcoming = 0;   // pending_confirmation + upcoming
    let validated = 0;  // completed, paymentStatus pending
    let paid = 0;       // completed, paymentStatus paid

    for (const mission of periodMissions) {
      const platformFee = mission.platformFee || 0;

      if (mission.status === "pending_confirmation" || mission.status === "upcoming" || mission.status === "in_progress") {
        upcoming += platformFee;
      } else if (mission.status === "completed") {
        if (mission.paymentStatus === "paid") {
          paid += platformFee;
        } else if (mission.paymentStatus === "pending") {
          validated += platformFee;
        }
      }
    }

    // Breakdown par mois si période = year
    let breakdown: Array<{ month: string; upcoming: number; validated: number; paid: number }> | undefined;

    if (args.period === "year") {
      breakdown = [];
      for (let m = 0; m < 12; m++) {
        const monthStart = new Date(year, m, 1);
        const monthEnd = new Date(year, m + 1, 0, 23, 59, 59, 999);
        const monthName = monthStart.toLocaleDateString("fr-FR", { month: "short" });

        let mUpcoming = 0;
        let mValidated = 0;
        let mPaid = 0;

        for (const mission of periodMissions) {
          const missionDate = new Date(mission.startDate);
          if (missionDate >= monthStart && missionDate <= monthEnd) {
            const platformFee = mission.platformFee || 0;

            if (mission.status === "pending_confirmation" || mission.status === "upcoming" || mission.status === "in_progress") {
              mUpcoming += platformFee;
            } else if (mission.status === "completed") {
              if (mission.paymentStatus === "paid") {
                mPaid += platformFee;
              } else if (mission.paymentStatus === "pending") {
                mValidated += platformFee;
              }
            }
          }
        }

        breakdown.push({
          month: monthName,
          upcoming: mUpcoming,
          validated: mValidated,
          paid: mPaid,
        });
      }
    }

    return {
      upcoming,
      validated,
      paid,
      total: upcoming + validated + paid,
      breakdown,
    };
  },
});

// Query: Statistiques des virements annonceurs
export const getPayoutStats = query({
  args: {
    token: v.string(),
    period: v.union(v.literal("month"), v.literal("year")),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const [year, month] = args.date.split("-").map(Number);

    let startDate: Date;
    let endDate: Date;

    if (args.period === "month") {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
    } else {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    }

    // Récupérer les virements de la période
    const payouts = await ctx.db
      .query("announcerPayouts")
      .collect();

    const periodPayouts = payouts.filter((p) => {
      const payoutDate = new Date(p.createdAt);
      return payoutDate >= startDate && payoutDate <= endDate;
    });

    let pending = 0;
    let processing = 0;
    let completed = 0;

    for (const payout of periodPayouts) {
      switch (payout.status) {
        case "pending":
          pending += payout.amount;
          break;
        case "processing":
          processing += payout.amount;
          break;
        case "completed":
          completed += payout.amount;
          break;
      }
    }

    // Virements programmés (futurs)
    const scheduledPayouts = payouts
      .filter((p) => p.scheduledAt && p.scheduledAt > Date.now() && p.status === "pending")
      .sort((a, b) => (a.scheduledAt || 0) - (b.scheduledAt || 0))
      .slice(0, 5);

    const scheduled = await Promise.all(
      scheduledPayouts.map(async (p) => {
        const announcer = await ctx.db.get(p.announcerId);
        return {
          date: p.scheduledAt!,
          amount: p.amount,
          count: p.missions.length,
          announcerName: announcer ? `${announcer.firstName} ${announcer.lastName}` : "Inconnu",
        };
      })
    );

    return {
      pending,
      processing,
      completed,
      scheduled,
    };
  },
});

// Query: Détails financiers d'une mission
export const getMissionFinanceDetails = query({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const mission = await ctx.db.get(args.missionId);
    if (!mission) throw new ConvexError("Mission non trouvée");

    // Client
    const client = await ctx.db.get(mission.clientId);

    // Annonceur
    const announcer = await ctx.db.get(mission.announcerId);

    // Paiement Stripe
    const payment = mission.stripePaymentId
      ? await ctx.db.get(mission.stripePaymentId)
      : null;

    // Facture existante
    const invoice = await ctx.db
      .query("invoices")
      .withIndex("by_mission", (q) => q.eq("missionId", args.missionId))
      .first();

    // Avoirs liés à cette mission
    const credits = await ctx.db
      .query("clientCredits")
      .withIndex("by_client", (q) => q.eq("clientId", mission.clientId))
      .collect();

    const missionCredits = credits.filter((c) => c.missionId === args.missionId);

    return {
      mission: {
        _id: mission._id,
        status: mission.status,
        amount: mission.amount,
        basePrice: mission.basePrice,
        optionsPrice: mission.optionsPrice,
        platformFee: mission.platformFee,
        announcerEarnings: mission.announcerEarnings,
        paymentStatus: mission.paymentStatus,
        announcerPaymentStatus: mission.announcerPaymentStatus,
        startDate: mission.startDate,
        endDate: mission.endDate,
        serviceName: mission.serviceName,
        variantName: mission.variantName,
      },
      client: client ? {
        id: client._id,
        name: `${client.firstName} ${client.lastName}`,
        email: client.email,
        phone: client.phone,
      } : null,
      announcer: announcer ? {
        id: announcer._id,
        name: `${announcer.firstName} ${announcer.lastName}`,
        email: announcer.email,
        phone: announcer.phone,
        companyName: announcer.companyName,
      } : null,
      payment: payment ? {
        status: payment.status,
        stripePaymentIntentId: payment.paymentIntentId,
        authorizedAt: payment.authorizedAt,
        capturedAt: payment.capturedAt,
        refundedAt: payment.refundedAt,
        refundedAmount: payment.refundedAmount,
      } : null,
      credits: missionCredits.map((c) => ({
        id: c._id,
        amount: c.amount,
        originalAmount: c.originalAmount,
        reason: c.reason,
        status: c.status,
        createdAt: c.createdAt,
      })),
      invoice: invoice ? {
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        pdfUrl: invoice.pdfUrl,
        sentAt: invoice.sentAt,
      } : null,
    };
  },
});

// Query: Liste des missions avec filtres financiers
export const listMissionsFinance = query({
  args: {
    token: v.string(),
    status: v.optional(v.string()),
    paymentStatus: v.optional(v.string()),
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    let missions = await ctx.db
      .query("missions")
      .order("desc")
      .collect();

    // Filtrer par statut
    if (args.status) {
      missions = missions.filter((m) => m.status === args.status);
    }

    // Filtrer par statut de paiement
    if (args.paymentStatus) {
      missions = missions.filter((m) => m.paymentStatus === args.paymentStatus);
    }

    // Filtrer par date
    if (args.dateFrom) {
      missions = missions.filter((m) => m.startDate >= args.dateFrom!);
    }
    if (args.dateTo) {
      missions = missions.filter((m) => m.startDate <= args.dateTo!);
    }

    const total = missions.length;
    const limit = args.limit || 20;
    const offset = args.offset || 0;

    const paginatedMissions = missions.slice(offset, offset + limit);

    // Enrichir avec les infos client/annonceur
    const enrichedMissions = await Promise.all(
      paginatedMissions.map(async (mission) => {
        const client = await ctx.db.get(mission.clientId);
        const announcer = await ctx.db.get(mission.announcerId);

        return {
          _id: mission._id,
          status: mission.status,
          amount: mission.amount,
          platformFee: mission.platformFee,
          announcerEarnings: mission.announcerEarnings,
          paymentStatus: mission.paymentStatus,
          announcerPaymentStatus: mission.announcerPaymentStatus,
          startDate: mission.startDate,
          endDate: mission.endDate,
          serviceName: mission.serviceName,
          clientName: client ? `${client.firstName} ${client.lastName}` : "Inconnu",
          announcerName: announcer ? `${announcer.firstName} ${announcer.lastName}` : "Inconnu",
          createdAt: mission.createdAt,
        };
      })
    );

    return {
      missions: enrichedMissions,
      total,
    };
  },
});

// Mutation: Créer un virement annonceur
export const createPayout = mutation({
  args: {
    token: v.string(),
    announcerId: v.id("users"),
    missionIds: v.array(v.id("missions")),
    scheduledAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    const announcer = await ctx.db.get(args.announcerId);
    if (!announcer) throw new ConvexError("Annonceur non trouvé");

    // Vérifier que les missions appartiennent à cet annonceur et sont éligibles
    let totalAmount = 0;
    let totalGross = 0;
    for (const missionId of args.missionIds) {
      const mission = await ctx.db.get(missionId);
      if (!mission) throw new ConvexError(`Mission ${missionId} non trouvée`);
      if (mission.announcerId !== args.announcerId) {
        throw new ConvexError(`Mission ${missionId} n'appartient pas à cet annonceur`);
      }
      if (mission.status !== "completed" || mission.paymentStatus !== "paid") {
        throw new ConvexError(`Mission ${missionId} n'est pas éligible au virement`);
      }
      if (mission.announcerPaymentStatus === "paid") {
        throw new ConvexError(`Mission ${missionId} a déjà été payée`);
      }
      totalAmount += mission.announcerEarnings || 0;
      totalGross += mission.amount || 0;
    }

    // Créer le virement
    const payoutId = await ctx.db.insert("announcerPayouts", {
      announcerId: args.announcerId,
      amount: totalAmount,
      grossAmount: totalGross,
      commissionAmount: totalGross - totalAmount,
      missions: args.missionIds,
      status: "pending",
      scheduledAt: args.scheduledAt,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Marquer les missions comme en attente de paiement
    for (const missionId of args.missionIds) {
      await ctx.db.patch(missionId, {
        announcerPaymentStatus: "pending",
        updatedAt: Date.now(),
      });
    }

    return { payoutId, amount: totalAmount };
  },
});

// Mutation: Mettre à jour le statut d'un virement
export const updatePayoutStatus = mutation({
  args: {
    token: v.string(),
    payoutId: v.id("announcerPayouts"),
    status: v.union(
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    stripeTransferId: v.optional(v.string()),
    stripePayoutId: v.optional(v.string()),
    failureReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const payout = await ctx.db.get(args.payoutId);
    if (!payout) throw new ConvexError("Virement non trouvé");

    await ctx.db.patch(args.payoutId, {
      status: args.status,
      stripeTransferId: args.stripeTransferId,
      stripePayoutId: args.stripePayoutId,
      failureReason: args.failureReason,
      processedAt: args.status === "completed" ? Date.now() : undefined,
      updatedAt: Date.now(),
    });

    // Mettre à jour le statut des missions
    if (args.status === "completed") {
      for (const missionId of payout.missions) {
        await ctx.db.patch(missionId, {
          announcerPaymentStatus: "paid",
          updatedAt: Date.now(),
        });
      }
    } else if (args.status === "failed") {
      for (const missionId of payout.missions) {
        await ctx.db.patch(missionId, {
          announcerPaymentStatus: "not_due",
          updatedAt: Date.now(),
        });
      }
    }

    return { success: true };
  },
});

// Query: Liste des virements
export const listPayouts = query({
  args: {
    token: v.string(),
    announcerId: v.optional(v.id("users")),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    let payouts = await ctx.db
      .query("announcerPayouts")
      .order("desc")
      .collect();

    if (args.announcerId) {
      payouts = payouts.filter((p) => p.announcerId === args.announcerId);
    }

    if (args.status) {
      payouts = payouts.filter((p) => p.status === args.status);
    }

    const total = payouts.length;
    const limit = args.limit || 20;
    const offset = args.offset || 0;

    const paginatedPayouts = payouts.slice(offset, offset + limit);

    // Enrichir avec les infos annonceur
    const enrichedPayouts = await Promise.all(
      paginatedPayouts.map(async (payout) => {
        const announcer = await ctx.db.get(payout.announcerId);

        return {
          _id: payout._id,
          amount: payout.amount,
          status: payout.status,
          missionsCount: payout.missions.length,
          scheduledAt: payout.scheduledAt,
          processedAt: payout.processedAt,
          announcerName: announcer ? `${announcer.firstName} ${announcer.lastName}` : "Inconnu",
          announcerEmail: announcer?.email,
          createdAt: payout.createdAt,
        };
      })
    );

    return {
      payouts: enrichedPayouts,
      total,
    };
  },
});


