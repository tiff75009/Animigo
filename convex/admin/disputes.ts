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
        ? { label: reason.label, slug: reason.slug, description: reason.description, blocksPayment: reason.blocksPayment }
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

    // Si résolu en faveur de l'annonceur, débloquer le paiement
    if (args.status === "resolved_announcer" && dispute.paymentBlocked) {
      const mission = await ctx.db.get(dispute.missionId);
      if (mission) {
        await ctx.db.patch(dispute.missionId, {
          readyForPayout: true,
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
      linkUrl: `/dashboard/missions`,
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

    // 2. Débloquer le paiement si résolu en faveur de l'annonceur
    if (args.status === "resolved_announcer" && dispute.paymentBlocked) {
      const mission = await ctx.db.get(dispute.missionId);
      if (mission) {
        await ctx.db.patch(dispute.missionId, {
          readyForPayout: true,
          updatedAt: now,
        });
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
    await requireAdmin(ctx, args.token);

    const openDisputes = await ctx.db
      .query("disputes")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();

    return openDisputes.length;
  },
});
