import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin } from "./utils";

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
    }

    // Créer le virement
    const payoutId = await ctx.db.insert("announcerPayouts", {
      announcerId: args.announcerId,
      amount: totalAmount,
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
