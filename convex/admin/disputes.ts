// @ts-nocheck
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { requireAdmin } from "./utils";
import { notifySystem } from "../lib/notificationTemplates";
import { getEmailConfigFromDb } from "../api/emailInternal";

/**
 * Liste paginée des réclamations pour admin
 */
export const getAllDisputes = query({
  args: {
    token: v.string(),
    statusFilter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    let disputes;
    if (args.statusFilter && args.statusFilter !== "all") {
      disputes = await ctx.db
        .query("disputes")
        .withIndex("by_status", (q) => q.eq("status", args.statusFilter as any))
        .collect();
    } else {
      disputes = await ctx.db.query("disputes").collect();
    }

    // Enrichir avec les données
    const enriched = await Promise.all(
      disputes
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(async (dispute) => {
          const mission = await ctx.db.get(dispute.missionId);
          const client = await ctx.db.get(dispute.clientId);
          const announcer = await ctx.db.get(dispute.announcerId);
          const assignedAdmin = dispute.assignedAdminId
            ? await ctx.db.get(dispute.assignedAdminId)
            : null;

          return {
            ...dispute,
            mission: mission
              ? {
                  serviceName: mission.serviceName,
                  startDate: mission.startDate,
                  endDate: mission.endDate,
                  amount: mission.amount,
                  status: mission.status,
                }
              : null,
            clientName: client ? `${client.firstName} ${client.lastName}` : "Inconnu",
            clientEmail: client?.email,
            announcerName: announcer ? `${announcer.firstName} ${announcer.lastName}` : "Inconnu",
            announcerEmail: announcer?.email,
            assignedAdminName: assignedAdmin ? `${assignedAdmin.firstName} ${assignedAdmin.lastName}` : null,
          };
        })
    );

    return enriched;
  },
});

/**
 * Détail complet d'une réclamation
 */
export const getDisputeDetail = query({
  args: {
    token: v.string(),
    disputeId: v.id("disputes"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const dispute = await ctx.db.get(args.disputeId);
    if (!dispute) return null;

    const mission = await ctx.db.get(dispute.missionId);
    const client = await ctx.db.get(dispute.clientId);
    const announcer = await ctx.db.get(dispute.announcerId);
    const reason = await ctx.db.get(dispute.reasonId);
    const assignedAdmin = dispute.assignedAdminId
      ? await ctx.db.get(dispute.assignedAdminId)
      : null;
    const review = await ctx.db
      .query("reviews")
      .withIndex("by_mission", (q) => q.eq("missionId", dispute.missionId))
      .first();

    return {
      ...dispute,
      mission: mission
        ? {
            _id: mission._id,
            serviceName: mission.serviceName,
            serviceCategory: mission.serviceCategory,
            startDate: mission.startDate,
            endDate: mission.endDate,
            amount: mission.amount,
            // Frais retenus par la plateforme (jamais remboursés au client)
            platformFee: mission.platformFee,
            stripeFee: mission.stripeFee,
            announcerEarnings: mission.announcerEarnings,
            refundAmount: mission.refundAmount,
            paymentStatus: mission.paymentStatus,
            announcerPaymentStatus: mission.announcerPaymentStatus,
            readyForPayout: mission.readyForPayout,
            clientConfirmedAt: mission.clientConfirmedAt,
            autoConfirmedAt: mission.autoConfirmedAt,
            animal: mission.animal,
          }
        : null,
      client: client
        ? { _id: client._id, firstName: client.firstName, lastName: client.lastName, email: client.email, phone: client.phone }
        : null,
      announcer: announcer
        ? { _id: announcer._id, firstName: announcer.firstName, lastName: announcer.lastName, email: announcer.email, phone: announcer.phone }
        : null,
      reason: reason
        ? {
            label: reason.label,
            slug: reason.slug,
            description: reason.description,
            blocksPayment: reason.blocksPayment,
            // Template pré-rempli dans la card Action / Résolution
            resolutionTemplate: reason.resolutionTemplate,
            clientHelperMessage: reason.clientHelperMessage,
          }
        : null,
      assignedAdminName: assignedAdmin ? `${assignedAdmin.firstName} ${assignedAdmin.lastName}` : null,
      review: review
        ? { overallRating: review.overallRating, comment: review.comment, createdAt: review.createdAt }
        : null,
    };
  },
});

/**
 * Admin change le statut d'une réclamation
 */
export const updateDisputeStatus = mutation({
  args: {
    token: v.string(),
    disputeId: v.id("disputes"),
    status: v.union(
      v.literal("investigating"),
      v.literal("resolved_client"),
      v.literal("resolved_announcer"),
      v.literal("closed")
    ),
    resolution: v.optional(v.string()),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    const dispute = await ctx.db.get(args.disputeId);
    if (!dispute) throw new Error("Réclamation non trouvée");

    const now = Date.now();

    const updates: Record<string, unknown> = {
      status: args.status,
      assignedAdminId: user._id,
      updatedAt: now,
    };

    if (args.resolution) updates.resolution = args.resolution;
    if (args.adminNotes) updates.adminNotes = args.adminNotes;

    if (args.status === "resolved_client" || args.status === "resolved_announcer" || args.status === "closed") {
      updates.resolvedAt = now;
    }

    await ctx.db.patch(args.disputeId, updates);

    // Logique de déblocage / refund alignée avec resolveDisputeWithActions :
    //  - resolved_announcer : débloquer le payout si la dispute le bloquait
    //  - resolved_client : impossible de refund automatiquement ici (pas
    //    d'arg refundAmount sur cette mutation simple) → on garde le payout
    //    bloqué mais on FLAG la mission pour que l'admin remarque qu'il
    //    reste à émettre le remboursement Stripe
    //  - closed : si la dispute bloquait le paiement, on débloque pour que
    //    le payout puisse reprendre son cours
    if (
      (args.status === "resolved_announcer" || args.status === "closed") &&
      dispute.paymentBlocked
    ) {
      const mission = await ctx.db.get(dispute.missionId);
      if (mission && mission.paymentStatus !== "refunded") {
        // Recalcul du prochain jour de versement (cron lit payoutScheduledFor)
        const payoutDayCfg = await ctx.db
          .query("systemConfig")
          .withIndex("by_key", (q) => q.eq("key", "payout_scheduled_day"))
          .first();
        const payoutDay = parseInt(payoutDayCfg?.value || "25", 10);
        const today = new Date();
        let payoutDate = new Date(today.getFullYear(), today.getMonth(), payoutDay);
        if (today.getDate() >= payoutDay) {
          payoutDate = new Date(today.getFullYear(), today.getMonth() + 1, payoutDay);
        }
        const payoutScheduledFor = payoutDate.toISOString().split("T")[0];

        await ctx.db.patch(dispute.missionId, {
          readyForPayout: true,
          announcerPaymentStatus: "pending",
          payoutScheduledFor,
          updatedAt: now,
        });
      }
    }

    // Notifications
    const statusLabels: Record<string, string> = {
      investigating: "En cours d'investigation",
      resolved_client: "Résolu en votre faveur",
      resolved_announcer: "Résolu en faveur du prestataire",
      closed: "Fermée",
    };

    // Notifier le client
    await notifySystem({
      userId: dispute.clientId,
      title: "Mise à jour de votre réclamation",
      message: `Votre réclamation "${dispute.reasonLabel}" est maintenant : ${statusLabels[args.status]}`,
      linkUrl: `/client/reservations/${dispute.missionId}`,
    });

    // Notifier l'annonceur
    await notifySystem({
      userId: dispute.announcerId,
      title: "Mise à jour de la réclamation",
      message: `La réclamation "${dispute.reasonLabel}" est maintenant : ${statusLabels[args.status]}`,
      linkUrl: `/dashboard/reclamations`,
    });

    return { success: true };
  },
});

/**
 * Résolution enrichie d'une réclamation avec actions optionnelles :
 * - Suspendre le compte annonceur + email de notification
 * - Clôturer la réservation (statut cancelled)
 * - Débloquer le paiement si résolu en faveur de l'annonceur
 */
export const resolveDisputeWithActions = mutation({
  args: {
    token: v.string(),
    disputeId: v.id("disputes"),
    status: v.union(
      v.literal("investigating"),
      v.literal("resolved_client"),
      v.literal("resolved_announcer"),
      v.literal("closed")
    ),
    resolution: v.optional(v.string()),
    adminNotes: v.optional(v.string()),
    suspendAnnouncer: v.optional(v.boolean()),
    suspendReason: v.optional(v.string()),
    closeMission: v.optional(v.boolean()),
    // ─── Remboursement client (uniquement si status="resolved_client") ───
    // Si refundAmount n'est PAS fourni mais refundClient=true, on rembourse
    // automatiquement la totalité du montant de la mission.
    refundClient: v.optional(v.boolean()),
    refundAmount: v.optional(v.number()), // en centimes, partiel possible
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    const dispute = await ctx.db.get(args.disputeId);
    if (!dispute) throw new Error("Réclamation non trouvée");

    const now = Date.now();

    // 1. Mettre à jour la réclamation (même logique que updateDisputeStatus)
    const updates: Record<string, unknown> = {
      status: args.status,
      assignedAdminId: user._id,
      updatedAt: now,
    };

    if (args.resolution) updates.resolution = args.resolution;
    if (args.adminNotes) updates.adminNotes = args.adminNotes;

    if (args.status === "resolved_client" || args.status === "resolved_announcer" || args.status === "closed") {
      updates.resolvedAt = now;
    }

    await ctx.db.patch(args.disputeId, updates);

    // 2. Débloquer le paiement si résolu en faveur de l'annonceur OU clôturée.
    //    On réactive aussi `payoutScheduledFor` (date du prochain virement
    //    mensuel) car le cron ne prend que les missions avec date définie.
    if (
      (args.status === "resolved_announcer" || args.status === "closed") &&
      dispute.paymentBlocked
    ) {
      const mission = await ctx.db.get(dispute.missionId);
      if (mission && mission.paymentStatus !== "refunded") {
        // Calcul du prochain jour de versement configuré
        const payoutDayCfg = await ctx.db
          .query("systemConfig")
          .withIndex("by_key", (q) => q.eq("key", "payout_scheduled_day"))
          .first();
        const payoutDay = parseInt(payoutDayCfg?.value || "25", 10);
        const today = new Date();
        let payoutDate = new Date(today.getFullYear(), today.getMonth(), payoutDay);
        if (today.getDate() >= payoutDay) {
          payoutDate = new Date(today.getFullYear(), today.getMonth() + 1, payoutDay);
        }
        const payoutScheduledFor = payoutDate.toISOString().split("T")[0];

        await ctx.db.patch(dispute.missionId, {
          readyForPayout: true,
          announcerPaymentStatus: "pending",
          payoutScheduledFor,
          updatedAt: now,
        });
      }
    }

    // 2bis. Remboursement client si résolu en sa faveur
    // ⚠️ Politique remboursement : seul le PRIX DU SERVICE est remboursé.
    //    La commission plateforme + les frais Stripe sont retenus par
    //    Animigo (= le client a payé ces frais en sus, ils ne sont jamais
    //    rendus). Concrètement le montant max remboursable est :
    //      mission.amount - platformFee - stripeFee
    //    qui correspond aussi à mission.announcerEarnings (ce qui était
    //    censé partir au prestataire).
    //
    //    L'admin peut quand même fournir un refundAmount inférieur
    //    (remboursement partiel) ; on le clamp au max.
    if (args.status === "resolved_client" && (args.refundClient || args.refundAmount !== undefined)) {
      const mission = await ctx.db.get(dispute.missionId);
      if (mission) {
        const totalAmount = mission.amount || 0;
        const platformFee = mission.platformFee ?? 0;
        const stripeFee = mission.stripeFee ?? 0;
        // Montant max remboursable au client = service uniquement (sans frais)
        const maxRefundable = Math.max(0, totalAmount - platformFee - stripeFee);

        const requested = args.refundAmount ?? maxRefundable;
        // Clamp : on n'autorise jamais à rembourser plus que le service net
        const refundAmount = Math.min(requested, maxRefundable);
        const isTotal = refundAmount >= maxRefundable;
        const alreadyRefunded = mission.paymentStatus === "refunded";

        if (refundAmount > 0 && !alreadyRefunded) {
          const missionPatch: Record<string, unknown> = {
            refundAmount,
            paymentStatus: "refunded",
            readyForPayout: false,
            announcerPaymentStatus: "not_due",
            updatedAt: now,
          };
          if (isTotal) {
            // Remboursement total du service : annonceur ne touche rien
            missionPatch.announcerRetainedAmount = 0;
            missionPatch.announcerEarnings = 0;
          } else if (maxRefundable > 0) {
            // Remboursement partiel : annonceur garde le solde du service non remboursé
            const reducedEarnings = Math.max(0, maxRefundable - refundAmount);
            missionPatch.announcerEarnings = reducedEarnings;
            missionPatch.announcerRetainedAmount = reducedEarnings;
          }
          await ctx.db.patch(dispute.missionId, missionPatch);

          // Schedule le refund Stripe réel.
          // ⚠️ processStripeRefund applique :
          //    - refund_application_fee: false → commission + frais Stripe
          //      restent acquis à la plateforme (Animigo garde les frais)
          //    - reverse_transfer: true → pull-back du montant depuis le
          //      compte Connect annonceur (qui était crédité de earnings)
          if (mission.stripePaymentId) {
            const stripePayment = await ctx.db.get(mission.stripePaymentId);
            if (stripePayment?.paymentIntentId) {
              const stripeKeyConfig = await ctx.db
                .query("systemConfig")
                .filter((q) => q.eq(q.field("key"), "stripe_secret_key"))
                .first();
              if (stripeKeyConfig?.value) {
                await ctx.scheduler.runAfter(
                  0,
                  internal.planning.cancellationActions.processStripeRefund,
                  {
                    missionId: dispute.missionId,
                    paymentIntentId: stripePayment.paymentIntentId,
                    refundAmount,
                    stripeSecretKey: stripeKeyConfig.value,
                  }
                );
              }
            }
          }
        }
      }
    }

    // 3. Suspendre l'annonceur si demandé
    if (args.suspendAnnouncer) {
      const announcer = await ctx.db.get(dispute.announcerId);
      if (announcer && announcer.role !== "admin") {
        await ctx.db.patch(dispute.announcerId, {
          isActive: false,
          updatedAt: now,
        });

        // Supprimer toutes les sessions de l'annonceur
        const sessions = await ctx.db
          .query("sessions")
          .withIndex("by_user", (q) => q.eq("userId", dispute.announcerId))
          .collect();
        for (const session of sessions) {
          await ctx.db.delete(session._id);
        }

        // Envoyer l'email de désactivation
        if (announcer.email) {
          const { emailConfig: deactivateEmailConfig } = await getEmailConfigFromDb(ctx.db);

          if (deactivateEmailConfig) {
            await ctx.scheduler.runAfter(0, internal.api.email.sendAccountDeactivatedEmail, {
              announcerEmail: announcer.email,
              announcerName: announcer.firstName || "Prestataire",
              reason: args.suspendReason || "Décision administrative suite à une réclamation",
              emailConfig: deactivateEmailConfig || { apiKey: "" },
            });
          }
        }
      }
    }

    // 4. Clôturer la réservation si demandé
    if (args.closeMission) {
      const mission = await ctx.db.get(dispute.missionId);
      if (mission && mission.status !== "cancelled") {
        await ctx.db.patch(dispute.missionId, {
          status: "cancelled",
          cancelledBy: "system",
          cancellationReason: args.resolution || "Clôturée suite à une réclamation",
          cancelledAt: now,
          updatedAt: now,
        });
      }
    }

    // 5. Notifications
    const statusLabels: Record<string, string> = {
      investigating: "En cours d'investigation",
      resolved_client: "Résolu en votre faveur",
      resolved_announcer: "Résolu en faveur du prestataire",
      closed: "Fermée",
    };

    await notifySystem({
      userId: dispute.clientId,
      title: "Mise à jour de votre réclamation",
      message: `Votre réclamation "${dispute.reasonLabel}" est maintenant : ${statusLabels[args.status]}`,
      linkUrl: `/client/reservations/${dispute.missionId}`,
    });

    await notifySystem({
      userId: dispute.announcerId,
      title: "Mise à jour de la réclamation",
      message: `La réclamation "${dispute.reasonLabel}" est maintenant : ${statusLabels[args.status]}`,
      linkUrl: `/dashboard/missions`,
    });

    return { success: true };
  },
});

/**
 * Admin ajoute une note
 */
export const addAdminNote = mutation({
  args: {
    token: v.string(),
    disputeId: v.id("disputes"),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    const dispute = await ctx.db.get(args.disputeId);
    if (!dispute) throw new Error("Réclamation non trouvée");

    const existingNotes = dispute.adminNotes || "";
    const timestamp = new Date().toLocaleString("fr-FR");
    const adminName = `${user.firstName} ${user.lastName}`;
    const newNote = `[${timestamp} - ${adminName}] ${args.note}`;
    const updatedNotes = existingNotes ? `${existingNotes}\n${newNote}` : newNote;

    await ctx.db.patch(args.disputeId, {
      adminNotes: updatedNotes,
      assignedAdminId: user._id,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Compteur de réclamations ouvertes (pour badge sidebar)
 */
export const getOpenDisputesCount = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    // Tolérant aux sessions expirées : retourne 0 au lieu de throw (sidebar badge)
    try {
      await requireAdmin(ctx, args.token);
    } catch {
      return 0;
    }

    const openDisputes = await ctx.db
      .query("disputes")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();

    return openDisputes.length;
  },
});
