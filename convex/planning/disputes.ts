// @ts-nocheck
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { notifySystem } from "../lib/notificationTemplates";

/**
 * Liste des motifs de réclamation actifs (pour le client)
 */
export const getDisputeReasons = query({
  args: {},
  handler: async (ctx) => {
    const reasons = await ctx.db
      .query("disputeReasons")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    return reasons
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((r) => ({
        _id: r._id,
        label: r.label,
        slug: r.slug,
        description: r.description,
        blocksPayment: r.blocksPayment,
      }));
  },
});

/**
 * Client ouvre une réclamation
 */
export const submitDispute = mutation({
  args: {
    sessionToken: v.string(),
    missionId: v.id("missions"),
    reasonId: v.id("disputeReasons"),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    // Valider la session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const mission = await ctx.db.get(args.missionId);
    if (!mission) throw new ConvexError("Mission non trouvée");

    if (mission.clientId !== session.userId) {
      throw new ConvexError("Vous n'êtes pas le client de cette mission");
    }

    if (mission.status !== "completed") {
      throw new ConvexError("La mission n'est pas terminée");
    }

    // Vérifier pas de dispute existante
    const existingDispute = await ctx.db
      .query("disputes")
      .withIndex("by_mission", (q) => q.eq("missionId", args.missionId))
      .first();

    if (existingDispute) {
      throw new ConvexError("Une réclamation existe déjà pour cette mission");
    }

    if (args.description.length < 20) {
      throw new ConvexError("La description doit contenir au moins 20 caractères");
    }

    // Récupérer le motif
    const reason = await ctx.db.get(args.reasonId);
    if (!reason || !reason.isActive) {
      throw new ConvexError("Motif de réclamation invalide");
    }

    const now = Date.now();

    // Créer la réclamation
    const disputeId = await ctx.db.insert("disputes", {
      missionId: args.missionId,
      clientId: session.userId,
      announcerId: mission.announcerId,
      reasonId: args.reasonId,
      reasonLabel: reason.label,
      description: args.description,
      status: "open",
      paymentBlocked: reason.blocksPayment,
      createdAt: now,
      updatedAt: now,
    });

    // Si blocage paiement, empêcher le versement
    const missionPatch: Record<string, unknown> = {
      hasDispute: true,
      disputeId,
      updatedAt: now,
    };

    if (reason.blocksPayment) {
      missionPatch.readyForPayout = false;
      missionPatch.announcerPaymentStatus = "not_due";
    }

    await ctx.db.patch(args.missionId, missionPatch);

    // Notification annonceur
    const client = await ctx.db.get(session.userId);
    const clientName = client ? `${client.firstName} ${client.lastName.charAt(0)}.` : "Un client";

    await notifySystem({
      userId: mission.announcerId,
      title: "Réclamation ouverte",
      message: `${clientName} a ouvert une réclamation pour "${mission.serviceName}" : ${reason.label}`,
      linkUrl: `/dashboard/missions`,
    });

    return { success: true, disputeId, paymentBlocked: reason.blocksPayment };
  },
});

/**
 * Récupérer la réclamation d'une mission
 */
export const getDisputeByMission = query({
  args: {
    sessionToken: v.string(),
    missionId: v.id("missions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) return null;

    return await ctx.db
      .query("disputes")
      .withIndex("by_mission", (q) => q.eq("missionId", args.missionId))
      .first();
  },
});
