// @ts-nocheck
import { query, mutation, action, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v, ConvexError } from "convex/values";
import { checkAdmin, requireAdminAction } from "./utils";

/**
 * Lister toutes les réservations avec pagination et filtres
 */
export const listReservations = query({
  args: {
    token: v.string(),
    search: v.optional(v.string()),
    status: v.optional(v.string()),
    showArchived: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const auth = await checkAdmin(ctx, args.token);
    if (!auth.success) {
      return { reservations: [], total: 0 };
    }

    const limit = args.limit || 20;
    const offset = args.offset || 0;

    // Récupérer toutes les missions
    let missions = await ctx.db.query("missions").order("desc").collect();

    // Filtrer les archivées par défaut
    if (!args.showArchived) {
      missions = missions.filter((m) => !m.isArchived);
    }

    // Filtrer par statut
    if (args.status && args.status !== "all") {
      missions = missions.filter((m) => m.status === args.status);
    }

    // Filtrer par recherche (nom client, nom service)
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      missions = missions.filter(
        (m) =>
          m.clientName?.toLowerCase().includes(searchLower) ||
          m.serviceName?.toLowerCase().includes(searchLower) ||
          m.animal?.name?.toLowerCase().includes(searchLower)
      );
    }

    const total = missions.length;

    // Pagination
    const paginatedMissions = missions.slice(offset, offset + limit);

    // Enrichir avec les infos utilisateurs
    const reservations = await Promise.all(
      paginatedMissions.map(async (m) => {
        const client = await ctx.db.get(m.clientId);
        const announcer = await ctx.db.get(m.announcerId);

        // Récupérer le paiement si présent
        let payment = null;
        if (m.stripePaymentId) {
          payment = await ctx.db.get(m.stripePaymentId);
        }

        return {
          _id: m._id,
          clientId: m.clientId,
          clientName: m.clientName || (client ? `${client.firstName} ${client.lastName}` : "Client inconnu"),
          clientEmail: client?.email,
          announcerId: m.announcerId,
          announcerName: announcer ? `${announcer.firstName} ${announcer.lastName}` : "Annonceur inconnu",
          announcerEmail: announcer?.email,
          animal: m.animal,
          serviceName: m.serviceName,
          serviceCategory: m.serviceCategory,
          startDate: m.startDate,
          endDate: m.endDate,
          startTime: m.startTime,
          endTime: m.endTime,
          status: m.status,
          amount: m.amount,
          paymentStatus: m.paymentStatus,
          stripePaymentStatus: payment?.status,
          location: m.location,
          city: m.city,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
          hasDispute: m.hasDispute || false,
          disputeId: m.disputeId || null,
          isArchived: m.isArchived || false,
        };
      })
    );

    return { reservations, total };
  },
});

/**
 * Récupérer les statistiques des réservations
 */
export const getReservationStats = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = await checkAdmin(ctx, args.token);
    if (!auth.success) {
      return {
        total: 0,
        pending: 0,
        upcoming: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
      };
    }

    const allMissions = await ctx.db.query("missions").collect();
    const missions = allMissions.filter((m) => !m.isArchived);

    return {
      total: missions.length,
      pending: missions.filter(
        (m) => m.status === "pending_acceptance" || m.status === "pending_confirmation"
      ).length,
      upcoming: missions.filter((m) => m.status === "upcoming").length,
      inProgress: missions.filter((m) => m.status === "in_progress").length,
      completed: missions.filter((m) => m.status === "completed").length,
      cancelled: missions.filter(
        (m) => m.status === "cancelled" || m.status === "refused"
      ).length,
    };
  },
});

/**
 * Récupérer le détail complet d'une réservation
 */
export const getReservationDetail = query({
  args: { token: v.string(), missionId: v.id("missions") },
  handler: async (ctx, args) => {
    const auth = await checkAdmin(ctx, args.token);
    if (!auth.success) return null;

    const mission = await ctx.db.get(args.missionId);
    if (!mission) return null;

    const client = await ctx.db.get(mission.clientId);
    const announcer = await ctx.db.get(mission.announcerId);
    let payment = mission.stripePaymentId ? await ctx.db.get(mission.stripePaymentId) : null;
    let dispute = mission.disputeId ? await ctx.db.get(mission.disputeId) : null;

    return {
      // Mission complète
      _id: mission._id,
      status: mission.status,
      serviceName: mission.serviceName,
      serviceCategory: mission.serviceCategory,
      variantName: mission.variantName,
      optionNames: mission.optionNames,
      startDate: mission.startDate,
      endDate: mission.endDate,
      startTime: mission.startTime,
      endTime: mission.endTime,
      location: mission.location,
      city: mission.city,
      postalCode: mission.postalCode,
      sessionType: mission.sessionType,
      numberOfSessions: mission.numberOfSessions,
      animal: mission.animal,
      animals: mission.animals,
      clientNotes: mission.clientNotes,
      announcerNotes: mission.announcerNotes,
      cancellationReason: mission.cancellationReason,
      cancelledBy: mission.cancelledBy,
      cancelledAt: mission.cancelledAt,
      createdAt: mission.createdAt,
      bookedAt: mission.bookedAt,
      acceptedAt: mission.acceptedAt,

      // Prix détaillé
      amount: mission.amount,
      basePrice: mission.basePrice,
      optionsPrice: mission.optionsPrice,
      platformFee: mission.platformFee,
      stripeFee: mission.stripeFee,
      commissionRate: mission.commissionRate,
      stripeFeeRate: mission.stripeFeeRate,
      vatRate: mission.vatRate,
      isSapApplied: mission.isSapApplied,
      announcerEarnings: mission.announcerEarnings,

      // Paiement client
      paymentStatus: mission.paymentStatus,
      announcerPaymentStatus: mission.announcerPaymentStatus,
      readyForPayout: mission.readyForPayout,
      payoutScheduledFor: mission.payoutScheduledFor,
      refundAmount: mission.refundAmount,
      announcerRetainedAmount: mission.announcerRetainedAmount,
      refundStripeId: mission.refundStripeId,

      // Confirmation
      clientConfirmedAt: mission.clientConfirmedAt,
      autoConfirmedAt: mission.autoConfirmedAt,

      // Client
      client: client ? {
        _id: client._id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        phone: client.phone,
      } : null,

      // Annonceur
      announcer: announcer ? {
        _id: announcer._id,
        firstName: announcer.firstName,
        lastName: announcer.lastName,
        email: announcer.email,
        phone: announcer.phone,
        companyName: announcer.companyName,
        stripeAccountId: announcer.stripeAccountId,
      } : null,

      // Paiement Stripe
      payment: payment ? {
        _id: payment._id,
        paymentIntentId: payment.paymentIntentId,
        status: payment.status,
        amount: payment.amount,
        platformFee: payment.platformFee,
        announcerEarnings: payment.announcerEarnings,
        paidAt: payment.paidAt,
        capturedAt: payment.capturedAt,
        refundedAt: payment.refundedAt,
        refundedAmount: payment.refundedAmount,
        transferId: payment.transferId,
        transferAmount: payment.transferAmount,
        transferCreatedAt: payment.transferCreatedAt,
        receiptUrl: payment.receiptUrl,
      } : null,

      // Réclamation
      dispute: dispute ? {
        _id: dispute._id,
        status: dispute.status,
        reasonLabel: dispute.reasonLabel,
        description: dispute.description,
        paymentBlocked: dispute.paymentBlocked,
        createdAt: dispute.createdAt,
      } : null,

      // Avis
      hasReview: mission.hasReview,
      hasDispute: mission.hasDispute,

      // Archivage
      isArchived: mission.isArchived,
      archivedAt: mission.archivedAt,
    };
  },
});

/**
 * Compter les réservations nécessitant une action (réclamations ouvertes/en investigation)
 */
export const getReservationsNeedingAction = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const auth = await checkAdmin(ctx, args.token);
    if (!auth.success) return 0;

    const openDisputes = await ctx.db.query("disputes")
      .filter(q => q.or(
        q.eq(q.field("status"), "open"),
        q.eq(q.field("status"), "investigating")
      ))
      .collect();

    return openDisputes.length;
  },
});

/**
 * Action admin pour émettre un remboursement (total ou partiel)
 */
export const adminRefundMission = action({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
    refundType: v.union(v.literal("total"), v.literal("partial")),
    partialAmount: v.optional(v.number()),
    partialPercent: v.optional(v.number()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminAction(ctx, args.token);

    // 1. Récupérer mission + paiement via query interne
    const data = await ctx.runQuery(internal.admin.financesInternal.getMissionForRefund, {
      missionId: args.missionId,
    });
    if (!data) throw new ConvexError("Mission non trouvée");
    if (!data.paymentIntentId) throw new ConvexError("Pas de paiement Stripe associé");
    if (data.paymentStatus === "refunded") throw new ConvexError("Déjà remboursé");

    // 2. Calculer montant à rembourser
    let refundAmount: number;
    if (args.refundType === "total") {
      refundAmount = data.totalAmount;
    } else {
      if (args.partialPercent) {
        refundAmount = Math.round(data.totalAmount * args.partialPercent / 100);
      } else if (args.partialAmount) {
        refundAmount = args.partialAmount;
      } else {
        throw new ConvexError("Montant partiel requis");
      }
    }

    // 3. Récupérer la clé Stripe
    const stripeSecretKey = await ctx.runQuery(internal.admin.financesInternal.getStripeSecretKey, {});
    if (!stripeSecretKey) throw new ConvexError("Clé Stripe non configurée");

    // 4. Émettre le remboursement via Stripe
    const result = await ctx.runAction(internal.planning.cancellationActions.processStripeRefund, {
      missionId: args.missionId,
      paymentIntentId: data.paymentIntentId,
      refundAmount,
      stripeSecretKey,
    });

    if (!result.success) throw new ConvexError("Échec du remboursement Stripe: " + result.error);

    // 5. Mettre à jour mission
    await ctx.runMutation(internal.admin.reservations.markAdminRefund, {
      missionId: args.missionId,
      refundAmount,
      isTotal: args.refundType === "total",
      reason: args.reason,
    });

    return { success: true, refundAmount, refundId: result.refundId };
  },
});

/**
 * Mutation interne pour marquer le remboursement admin
 */
export const markAdminRefund = internalMutation({
  args: {
    missionId: v.id("missions"),
    refundAmount: v.number(),
    isTotal: v.boolean(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const mission = await ctx.db.get(args.missionId);
    if (!mission) return;

    const updates: Record<string, unknown> = {
      refundAmount: args.refundAmount,
      paymentStatus: args.isTotal ? "refunded" : mission.paymentStatus,
      updatedAt: Date.now(),
    };

    if (args.isTotal) {
      updates.readyForPayout = false;
      updates.announcerRetainedAmount = 0;
    }

    if (args.reason) {
      updates.cancellationReason = args.reason;
    }

    await ctx.db.patch(args.missionId, updates);

    // Mettre à jour stripePayments
    if (mission.stripePaymentId) {
      const paymentUpdates: Record<string, unknown> = {
        refundedAmount: args.refundAmount,
        refundedAt: Date.now(),
        updatedAt: Date.now(),
      };
      if (args.isTotal) {
        paymentUpdates.status = "refunded";
      }
      await ctx.db.patch(mission.stripePaymentId, paymentUpdates);
    }

    // Notification au client
    await ctx.db.insert("notifications", {
      userId: mission.clientId,
      type: "payment_refunded",
      title: "Remboursement effectué",
      message: `Un remboursement de ${(args.refundAmount / 100).toFixed(2).replace(".", ",")}€ a été effectué pour "${mission.serviceName}".`,
      read: false,
      linkType: "reservation",
      linkUrl: `/client/reservations/${args.missionId}`,
      createdAt: Date.now(),
    });
  },
});

/**
 * Archiver une réservation (soft-delete)
 */
export const archiveReservation = mutation({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
  },
  handler: async (ctx, args) => {
    const auth = await checkAdmin(ctx, args.token);
    if (!auth.success) {
      throw new Error(auth.error);
    }

    const mission = await ctx.db.get(args.missionId);
    if (!mission) {
      throw new Error("Réservation non trouvée");
    }

    await ctx.db.patch(args.missionId, {
      isArchived: true,
      archivedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Archiver plusieurs réservations
 */
export const archiveMultipleReservations = mutation({
  args: {
    token: v.string(),
    missionIds: v.array(v.id("missions")),
  },
  handler: async (ctx, args) => {
    const auth = await checkAdmin(ctx, args.token);
    if (!auth.success) {
      throw new Error(auth.error);
    }

    let archived = 0;
    let errors = 0;

    for (const missionId of args.missionIds) {
      try {
        const mission = await ctx.db.get(missionId);
        if (mission) {
          await ctx.db.patch(missionId, {
            isArchived: true,
            archivedAt: Date.now(),
            updatedAt: Date.now(),
          });
          archived++;
        }
      } catch (error) {
        errors++;
      }
    }

    return { archived, errors };
  },
});

/**
 * Désarchiver une réservation
 */
export const unarchiveReservation = mutation({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
  },
  handler: async (ctx, args) => {
    const auth = await checkAdmin(ctx, args.token);
    if (!auth.success) {
      throw new Error(auth.error);
    }

    const mission = await ctx.db.get(args.missionId);
    if (!mission) {
      throw new Error("Réservation non trouvée");
    }

    await ctx.db.patch(args.missionId, {
      isArchived: false,
      archivedAt: undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Changer le statut d'une réservation (pour debug)
 */
export const updateReservationStatus = mutation({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
    status: v.union(
      v.literal("pending_acceptance"),
      v.literal("pending_confirmation"),
      v.literal("upcoming"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("refused"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    const auth = await checkAdmin(ctx, args.token);
    if (!auth.success) {
      throw new Error(auth.error);
    }

    const mission = await ctx.db.get(args.missionId);
    if (!mission) {
      throw new Error("Réservation non trouvée");
    }

    await ctx.db.patch(args.missionId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Recalculer les compteurs bookedAnimals pour tous les créneaux collectifs
 * Utile pour corriger les données après un bug ou une migration
 */
export const recalculateSlotCounts = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = await checkAdmin(ctx, args.token);
    if (!auth.success) {
      throw new Error(auth.error);
    }

    // Récupérer tous les créneaux collectifs
    const slots = await ctx.db.query("collectiveSlots").collect();

    // Récupérer toutes les missions collectives actives (pas cancelled/refused)
    const missions = await ctx.db.query("missions").collect();
    const activeMissions = missions.filter(
      (m) =>
        m.sessionType === "collective" &&
        m.collectiveSlotIds &&
        m.collectiveSlotIds.length > 0 &&
        m.status !== "cancelled" &&
        m.status !== "refused"
    );

    let updated = 0;

    for (const slot of slots) {
      // Compter les animaux réservés pour ce créneau
      let bookedCount = 0;
      for (const mission of activeMissions) {
        if (mission.collectiveSlotIds?.some((id) => String(id) === String(slot._id))) {
          bookedCount += mission.animalCount || 1;
        }
      }

      // Mettre à jour si différent
      if (slot.bookedAnimals !== bookedCount) {
        await ctx.db.patch(slot._id, {
          bookedAnimals: bookedCount,
          updatedAt: Date.now(),
        });
        updated++;
      }
    }

    return { success: true, slotsUpdated: updated, totalSlots: slots.length };
  },
});
