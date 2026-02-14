// @ts-nocheck
import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Query légère : données complémentaires du dashboard annonceur
 * - Résumé des avis (note moyenne, total, en attente de réponse)
 * - Complétion du profil (pourcentage, éléments manquants)
 * - Statut de vérification d'identité
 */
export const getAnnouncerDashboardExtras = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    const userId = session.userId;

    // --- REVIEWS SUMMARY ---
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_announcer", (q) => q.eq("announcerId", userId))
      .collect();

    const visibleReviews = reviews.filter((r) => r.isVisible);
    const totalReviews = visibleReviews.length;
    const avgRating = totalReviews > 0
      ? Math.round((visibleReviews.reduce((sum, r) => sum + r.overallRating, 0) / totalReviews) * 10) / 10
      : 0;
    const pendingReplies = visibleReviews.filter((r) => !r.reply).length;
    const recommendRate = totalReviews > 0
      ? Math.round((visibleReviews.filter((r) => r.wouldRecommend).length / totalReviews) * 100)
      : 0;

    // --- PROFILE COMPLETION ---
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    // Photos de profil fallback
    let hasProfilePhoto = !!profile?.profileImageUrl;
    if (!hasProfilePhoto) {
      const profilePhoto = await ctx.db
        .query("photos")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("isProfilePhoto"), true))
        .first();
      hasProfilePhoto = !!profilePhoto;
    }

    const completionChecks = [
      { key: "photo", label: "Photo de profil", weight: 10, done: hasProfilePhoto },
      { key: "cover", label: "Photo de couverture", weight: 10, done: !!profile?.coverImageUrl },
      { key: "description", label: "Description", weight: 15, done: !!profile?.description && profile.description.trim().length > 0 },
      { key: "location", label: "Adresse", weight: 10, done: !!profile?.city || !!profile?.location },
      { key: "radius", label: "Rayon d'intervention", weight: 10, done: !!profile?.radius && profile.radius > 0 },
      { key: "animals", label: "Animaux acceptés", weight: 10, done: !!profile?.acceptedAnimals && profile.acceptedAnimals.length > 0 },
      { key: "equipments", label: "Équipements", weight: 5, done: profile?.hasGarden !== undefined || profile?.hasVehicle !== undefined },
      { key: "capacity", label: "Capacité max", weight: 10, done: !!profile?.maxAnimalsPerSlot && profile.maxAnimalsPerSlot > 0 },
      { key: "services", label: "Services & tarifs", weight: 10, done: true },
      { key: "availability", label: "Disponibilités", weight: 10, done: true },
      { key: "icad", label: "I-CAD", weight: 5, done: profile?.icadRegistered !== undefined && profile?.icadRegistered !== null },
    ];

    const totalWeight = completionChecks.reduce((sum, c) => sum + c.weight, 0);
    const completedWeight = completionChecks.reduce((sum, c) => sum + (c.done ? c.weight : 0), 0);
    const percentage = Math.round((completedWeight / totalWeight) * 100);
    const missingItems = completionChecks.filter((c) => !c.done).map((c) => c.label);

    // --- VERIFICATION STATUS ---
    const latestVerification = await ctx.db
      .query("verificationRequests")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .first();

    const isIdentityVerified = profile?.isIdentityVerified || false;
    const verificationPending = latestVerification?.status === "pending" || latestVerification?.status === "submitted";

    return {
      reviewSummary: {
        avgRating,
        totalReviews,
        pendingReplies,
        recommendRate,
      },
      profileCompletion: {
        percentage,
        missingCount: missingItems.length,
        nextMissing: missingItems[0] || null,
      },
      verification: {
        isVerified: isIdentityVerified,
        isPending: verificationPending,
      },
    };
  },
});
