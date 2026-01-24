import { query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin } from "./utils";

// Query: Détails complets d'un annonceur
export const getAnnouncerDetails = query({
  args: {
    token: v.string(),
    announcerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const user = await ctx.db.get(args.announcerId);
    if (!user) throw new ConvexError("Annonceur non trouvé");
    if (user.accountType !== "annonceur_pro" && user.accountType !== "annonceur_particulier") {
      throw new ConvexError("Cet utilisateur n'est pas un annonceur");
    }

    // Profil
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.announcerId))
      .first();

    // Services avec stats
    const services = await ctx.db
      .query("services")
      .withIndex("by_user", (q) => q.eq("userId", args.announcerId))
      .collect();

    const servicesWithStats = await Promise.all(
      services.map(async (service) => {
        // Variantes
        const variants = await ctx.db
          .query("serviceVariants")
          .withIndex("by_service", (q) => q.eq("serviceId", service._id))
          .collect();

        // Options
        const options = await ctx.db
          .query("serviceOptions")
          .withIndex("by_service", (q) => q.eq("serviceId", service._id))
          .collect();

        // Missions pour ce service
        const missions = await ctx.db
          .query("missions")
          .withIndex("by_announcer", (q) => q.eq("announcerId", args.announcerId))
          .collect();

        const serviceMissions = missions.filter((m) => m.serviceId === service._id);
        const completedMissions = serviceMissions.filter((m) => m.status === "completed");
        const totalRevenue = completedMissions.reduce((sum, m) => sum + (m.announcerEarnings || 0), 0);

        // Catégorie
        const category = await ctx.db
          .query("serviceCategories")
          .withIndex("by_slug", (q) => q.eq("slug", service.category))
          .first();

        return {
          _id: service._id,
          category: service.category,
          categoryName: category?.name || service.category,
          animalTypes: service.animalTypes,
          isActive: service.isActive,
          basePrice: service.basePrice,
          moderationStatus: service.moderationStatus,
          variantsCount: variants.length,
          optionsCount: options.length,
          stats: {
            totalSales: completedMissions.length,
            revenue: totalRevenue,
          },
        };
      })
    );

    // Stats globales
    const allMissions = await ctx.db
      .query("missions")
      .withIndex("by_announcer", (q) => q.eq("announcerId", args.announcerId))
      .collect();

    const completedMissions = allMissions.filter((m) => m.status === "completed");
    const cancelledMissions = allMissions.filter((m) => m.status === "cancelled" || m.status === "refused");
    const totalRevenue = completedMissions.reduce((sum, m) => sum + (m.announcerEarnings || 0), 0);

    // Vérification d'identité
    const verification = await ctx.db
      .query("verificationRequests")
      .withIndex("by_user", (q) => q.eq("userId", args.announcerId))
      .order("desc")
      .first();

    return {
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        accountType: user.accountType,
        companyName: user.companyName,
        siret: user.siret,
        slug: user.slug,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        stripeAccountId: user.stripeAccountId,
        stripeChargesEnabled: user.stripeChargesEnabled,
        stripePayoutsEnabled: user.stripePayoutsEnabled,
        stripeDetailsSubmitted: user.stripeDetailsSubmitted,
        createdAt: user.createdAt,
      },
      profile: profile ? {
        profileImageUrl: profile.profileImageUrl,
        coverImageUrl: profile.coverImageUrl,
        bio: profile.bio,
        description: profile.description,
        experience: profile.experience,
        location: profile.location,
        city: profile.city,
        postalCode: profile.postalCode,
        department: profile.department,
        coordinates: profile.coordinates,
        acceptedAnimals: profile.acceptedAnimals,
        housingType: profile.housingType,
        hasGarden: profile.hasGarden,
        ownedAnimals: profile.ownedAnimals,
        isIdentityVerified: profile.isIdentityVerified,
        identityVerifiedAt: profile.identityVerifiedAt,
      } : null,
      services: servicesWithStats,
      stats: {
        totalMissions: allMissions.length,
        completedMissions: completedMissions.length,
        cancelledMissions: cancelledMissions.length,
        totalRevenue,
        pendingMissions: allMissions.filter((m) =>
          m.status === "pending_acceptance" || m.status === "pending_confirmation" || m.status === "upcoming"
        ).length,
      },
      verification: verification ? {
        status: verification.status,
        submittedAt: verification.submittedAt,
        reviewedAt: verification.reviewedAt,
        rejectionReason: verification.rejectionReason,
        aiVerificationResult: verification.aiVerificationResult,
      } : null,
      stripeAccount: user.stripeAccountId ? {
        id: user.stripeAccountId,
        chargesEnabled: user.stripeChargesEnabled,
        payoutsEnabled: user.stripePayoutsEnabled,
        detailsSubmitted: user.stripeDetailsSubmitted,
      } : null,
    };
  },
});

// Query: Missions d'un annonceur avec filtres
export const getAnnouncerMissions = query({
  args: {
    token: v.string(),
    announcerId: v.id("users"),
    status: v.optional(v.string()),
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    let missions = await ctx.db
      .query("missions")
      .withIndex("by_announcer", (q) => q.eq("announcerId", args.announcerId))
      .order("desc")
      .collect();

    // Filtrer par statut
    if (args.status) {
      missions = missions.filter((m) => m.status === args.status);
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

    // Enrichir avec les infos client et service
    const enrichedMissions = await Promise.all(
      paginatedMissions.map(async (mission) => {
        const client = await ctx.db.get(mission.clientId);
        const service = mission.serviceId ? await ctx.db.get(mission.serviceId) : null;

        // Catégorie du service
        let categoryName = mission.serviceCategory;
        if (service) {
          const category = await ctx.db
            .query("serviceCategories")
            .withIndex("by_slug", (q) => q.eq("slug", service.category))
            .first();
          if (category) categoryName = category.name;
        }

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
          startTime: mission.startTime,
          endTime: mission.endTime,
          serviceName: mission.serviceName,
          variantName: mission.variantName,
          serviceCategory: categoryName,
          animal: mission.animal,
          location: mission.location,
          city: mission.city,
          client: client ? {
            id: client._id,
            name: `${client.firstName} ${client.lastName}`,
            email: client.email,
            phone: client.phone,
          } : null,
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

// Query: Finances d'un annonceur
export const getAnnouncerFinances = query({
  args: {
    token: v.string(),
    announcerId: v.id("users"),
    period: v.union(v.literal("month"), v.literal("year")),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const [year, month] = args.date.split("-").map(Number);

    let startDate: string;
    let endDate: string;

    if (args.period === "month") {
      startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
    } else {
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
    }

    // Missions de la période
    const missions = await ctx.db
      .query("missions")
      .withIndex("by_announcer", (q) => q.eq("announcerId", args.announcerId))
      .collect();

    const periodMissions = missions.filter(
      (m) => m.startDate >= startDate && m.startDate <= endDate
    );

    // Calculer les revenus
    let pending = 0;   // Missions en cours ou à venir
    let completed = 0; // Missions terminées, paiement capturé
    let paid = 0;      // Virements effectués

    for (const mission of periodMissions) {
      const earnings = mission.announcerEarnings || 0;

      if (mission.status === "completed" && mission.paymentStatus === "paid") {
        if (mission.announcerPaymentStatus === "paid") {
          paid += earnings;
        } else {
          completed += earnings;
        }
      } else if (
        mission.status === "pending_confirmation" ||
        mission.status === "upcoming" ||
        mission.status === "in_progress"
      ) {
        pending += earnings;
      }
    }

    // Virements
    const payouts = await ctx.db
      .query("announcerPayouts")
      .withIndex("by_announcer", (q) => q.eq("announcerId", args.announcerId))
      .order("desc")
      .collect();

    const periodPayouts = payouts.filter((p) => {
      const payoutDate = new Date(p.createdAt);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return payoutDate >= start && payoutDate <= end;
    });

    // Prochain virement programmé
    const nextPayout = payouts.find(
      (p) => p.status === "pending" && p.scheduledAt && p.scheduledAt > Date.now()
    );

    // Avoirs / déductions
    const credits = await ctx.db
      .query("clientCredits")
      .collect();

    // Filtrer les crédits liés aux missions de cet annonceur
    const announcerMissionIds = new Set(missions.map((m) => m._id));
    const announcerCredits = credits.filter(
      (c) => c.missionId && announcerMissionIds.has(c.missionId)
    );

    return {
      earnings: {
        pending,
        completed,
        paid,
        total: pending + completed + paid,
      },
      payouts: periodPayouts.slice(0, 10).map((p) => ({
        id: p._id,
        date: p.processedAt || p.createdAt,
        amount: p.amount,
        status: p.status,
        missionsCount: p.missions.length,
      })),
      credits: announcerCredits.map((c) => ({
        id: c._id,
        amount: c.originalAmount,
        reason: c.reason,
        status: c.status,
        createdAt: c.createdAt,
      })),
      nextPayout: nextPayout ? {
        date: nextPayout.scheduledAt!,
        estimatedAmount: nextPayout.amount,
      } : null,
    };
  },
});

// Query: Recherche d'annonceurs avec autocomplete
export const searchAnnouncers = query({
  args: {
    token: v.string(),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    if (args.query.length < 2) {
      return [];
    }

    const searchLower = args.query.toLowerCase();
    const limit = args.limit || 10;

    // Récupérer tous les annonceurs
    const users = await ctx.db
      .query("users")
      .collect();

    const annonceurs = users.filter(
      (u) =>
        (u.accountType === "annonceur_pro" || u.accountType === "annonceur_particulier") &&
        (u.email.toLowerCase().includes(searchLower) ||
          u.firstName.toLowerCase().includes(searchLower) ||
          u.lastName.toLowerCase().includes(searchLower) ||
          (u.companyName && u.companyName.toLowerCase().includes(searchLower)) ||
          (u.slug && u.slug.toLowerCase().includes(searchLower)))
    );

    // Enrichir avec le profil
    const results = await Promise.all(
      annonceurs.slice(0, limit).map(async (user) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .first();

        return {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          companyName: user.companyName,
          slug: user.slug,
          profileImage: profile?.profileImageUrl,
          accountType: user.accountType,
          isActive: user.isActive,
          isVerified: profile?.isIdentityVerified || false,
        };
      })
    );

    return results;
  },
});

// Query: Liste des annonceurs avec pagination et filtres avancés
export const listAnnouncers = query({
  args: {
    token: v.string(),
    accountType: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    isVerified: v.optional(v.boolean()),
    hasStripe: v.optional(v.boolean()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    let users = await ctx.db
      .query("users")
      .collect();

    // Filtrer uniquement les annonceurs
    users = users.filter(
      (u) => u.accountType === "annonceur_pro" || u.accountType === "annonceur_particulier"
    );

    // Filtrer par type
    if (args.accountType) {
      users = users.filter((u) => u.accountType === args.accountType);
    }

    // Filtrer par statut actif
    if (args.isActive !== undefined) {
      users = users.filter((u) => u.isActive === args.isActive);
    }

    // Filtrer par Stripe
    if (args.hasStripe !== undefined) {
      users = users.filter((u) => {
        const hasStripe = !!u.stripeAccountId && u.stripeChargesEnabled === true;
        return args.hasStripe ? hasStripe : !hasStripe;
      });
    }

    // Recherche textuelle
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      users = users.filter(
        (u) =>
          u.email.toLowerCase().includes(searchLower) ||
          u.firstName.toLowerCase().includes(searchLower) ||
          u.lastName.toLowerCase().includes(searchLower) ||
          (u.companyName && u.companyName.toLowerCase().includes(searchLower))
      );
    }

    const total = users.length;
    const limit = args.limit || 20;
    const offset = args.offset || 0;

    const paginatedUsers = users.slice(offset, offset + limit);

    // Enrichir avec profil et stats
    const enrichedUsers = await Promise.all(
      paginatedUsers.map(async (user) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .first();

        const missions = await ctx.db
          .query("missions")
          .withIndex("by_announcer", (q) => q.eq("announcerId", user._id))
          .collect();

        const completedMissions = missions.filter((m) => m.status === "completed");
        const totalRevenue = completedMissions.reduce((sum, m) => sum + (m.announcerEarnings || 0), 0);

        // Filtrer par vérification si demandé
        if (args.isVerified !== undefined) {
          const isVerified = profile?.isIdentityVerified || false;
          if (args.isVerified !== isVerified) {
            return null;
          }
        }

        return {
          _id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          accountType: user.accountType,
          companyName: user.companyName,
          slug: user.slug,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          profileImage: profile?.profileImageUrl,
          city: profile?.city,
          isVerified: profile?.isIdentityVerified || false,
          hasStripe: !!user.stripeAccountId && user.stripeChargesEnabled === true,
          stats: {
            totalMissions: missions.length,
            completedMissions: completedMissions.length,
            totalRevenue,
          },
          createdAt: user.createdAt,
        };
      })
    );

    // Filtrer les nulls (si filtre isVerified)
    const filteredUsers = enrichedUsers.filter((u) => u !== null);

    return {
      announcers: filteredUsers,
      total: args.isVerified !== undefined ? filteredUsers.length : total,
    };
  },
});
