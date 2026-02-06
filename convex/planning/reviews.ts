// @ts-nocheck
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { notifyReviewReceived } from "../lib/notificationTemplates";

/**
 * Client soumet un avis après confirmation de fin de mission
 */
export const submitReview = mutation({
  args: {
    sessionToken: v.string(),
    missionId: v.id("missions"),
    qualityRating: v.number(),
    communicationRating: v.number(),
    wouldRecommend: v.boolean(),
    comment: v.optional(v.string()),
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

    // Vérifier que la mission est confirmée
    if (!mission.clientConfirmedAt && !mission.autoConfirmedAt) {
      throw new ConvexError("La mission n'est pas encore confirmée");
    }

    // Vérifier pas de review existante
    const existingReview = await ctx.db
      .query("reviews")
      .withIndex("by_mission", (q) => q.eq("missionId", args.missionId))
      .first();

    if (existingReview) {
      throw new ConvexError("Un avis existe déjà pour cette mission");
    }

    // Valider les notes
    if (args.qualityRating < 1 || args.qualityRating > 5 || args.communicationRating < 1 || args.communicationRating > 5) {
      throw new ConvexError("Les notes doivent être entre 1 et 5");
    }

    const overallRating = Math.round(((args.qualityRating + args.communicationRating) / 2) * 10) / 10;
    const now = Date.now();

    await ctx.db.insert("reviews", {
      missionId: args.missionId,
      announcerId: mission.announcerId,
      clientId: session.userId,
      qualityRating: args.qualityRating,
      communicationRating: args.communicationRating,
      wouldRecommend: args.wouldRecommend,
      overallRating,
      comment: args.comment,
      isVisible: true,
      createdAt: now,
      updatedAt: now,
    });

    // Marquer la mission
    await ctx.db.patch(args.missionId, {
      hasReview: true,
      updatedAt: now,
    });

    // Récupérer le client pour la notification
    const client = await ctx.db.get(session.userId);
    const clientName = client ? `${client.firstName} ${client.lastName.charAt(0)}.` : "Un client";

    // Notification annonceur
    await notifyReviewReceived({
      announcerId: mission.announcerId,
      clientName,
      rating: Math.round(overallRating),
    });

    return { success: true, overallRating };
  },
});

/**
 * Récupérer l'avis d'une mission
 */
export const getReviewByMission = query({
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
      .query("reviews")
      .withIndex("by_mission", (q) => q.eq("missionId", args.missionId))
      .first();
  },
});

/**
 * Tous les avis d'un annonceur (pour page /dashboard/avis)
 */
export const getAnnouncerReviews = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return { reviews: [], stats: null };
    }

    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_announcer", (q) => q.eq("announcerId", session.userId))
      .collect();

    // Enrichir avec les données client et mission
    const enrichedReviews = await Promise.all(
      reviews
        .filter((r) => r.isVisible)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(async (review) => {
          const client = await ctx.db.get(review.clientId);
          const mission = await ctx.db.get(review.missionId);
          const clientProfile = client
            ? await ctx.db
                .query("clientProfiles")
                .withIndex("by_user", (q) => q.eq("userId", client._id))
                .first()
            : null;

          return {
            ...review,
            clientName: client ? `${client.firstName} ${client.lastName.charAt(0)}.` : "Anonyme",
            clientImage: clientProfile?.profileImageUrl || null,
            missionType: mission?.serviceName || "Service",
            animalName: mission?.animal?.name || "",
            animalEmoji: mission?.animal?.emoji || "🐾",
          };
        })
    );

    // Calculer les stats
    const total = enrichedReviews.length;
    if (total === 0) {
      return {
        reviews: [],
        stats: {
          total: 0,
          avgRating: 0,
          distribution: [5, 4, 3, 2, 1].map((r) => ({ rating: r, count: 0 })),
          replied: 0,
          pending: 0,
          recommendRate: 0,
        },
      };
    }

    const avgRating = enrichedReviews.reduce((sum, r) => sum + r.overallRating, 0) / total;
    const distribution = [5, 4, 3, 2, 1].map((rating) => ({
      rating,
      count: enrichedReviews.filter((r) => Math.round(r.overallRating) === rating).length,
    }));
    const replied = enrichedReviews.filter((r) => r.reply).length;
    const recommendRate = enrichedReviews.filter((r) => r.wouldRecommend).length / total;

    return {
      reviews: enrichedReviews,
      stats: {
        total,
        avgRating: Math.round(avgRating * 10) / 10,
        distribution,
        replied,
        pending: total - replied,
        recommendRate: Math.round(recommendRate * 100),
      },
    };
  },
});

/**
 * Annonceur répond à un avis
 */
export const replyToReview = mutation({
  args: {
    sessionToken: v.string(),
    reviewId: v.id("reviews"),
    reply: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const review = await ctx.db.get(args.reviewId);
    if (!review) throw new ConvexError("Avis non trouvé");

    if (review.announcerId !== session.userId) {
      throw new ConvexError("Vous n'êtes pas l'annonceur de cette mission");
    }

    if (args.reply.length > 500) {
      throw new ConvexError("La réponse ne doit pas dépasser 500 caractères");
    }

    const now = Date.now();
    await ctx.db.patch(args.reviewId, {
      reply: args.reply,
      repliedAt: now,
      updatedAt: now,
    });

    return { success: true };
  },
});
