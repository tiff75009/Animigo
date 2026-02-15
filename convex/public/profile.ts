import { query } from "../_generated/server";
import { v } from "convex/values";

// Récupérer un profil public par son username (ou slug en fallback)
export const getPublicProfileBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    // Chercher d'abord par username
    let user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.slug.toLowerCase()))
      .first();

    // Fallback : chercher par slug (rétrocompatibilité)
    if (!user) {
      user = await ctx.db
        .query("users")
        .withIndex("by_slug", (q) => q.eq("slug", args.slug))
        .first();
    }

    if (!user || !user.isActive) {
      return null;
    }

    // Récupérer le profil associé
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    // Récupérer les animaux - depuis le profil (ownedAnimals) pour les annonceurs
    // ou depuis la table animals pour les utilisateurs
    const isAnnouncer = user.accountType === "annonceur_pro" || user.accountType === "annonceur_particulier";

    let animalsWithSlug: any[] = [];

    if (isAnnouncer && profile?.ownedAnimals && profile.ownedAnimals.length > 0) {
      // Animaux stockés dans le profil (annonceurs)
      animalsWithSlug = (profile.ownedAnimals as any[]).map((animal: any, index: number) => ({
        id: animal.id || `animal-${index}`,
        name: animal.name || "Animal",
        slug: (animal.name || "animal")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
        type: animal.type || "autre",
        breed: animal.breed || null,
        gender: animal.gender || null,
        birthDate: null,
        age: animal.age || null,
        weight: animal.weight || null,
        size: animal.size || null,
        description: animal.description || null,
        profilePhoto: animal.profilePhoto || null,
        galleryPhotos: animal.galleryPhotos || [],
        goodWithChildren: animal.goodWithChildren ?? null,
        goodWithDogs: animal.goodWithDogs ?? null,
        goodWithCats: animal.goodWithCats ?? null,
        goodWithOtherAnimals: animal.goodWithOtherAnimals ?? null,
        behaviorTraits: animal.behaviorTraits || [],
      }));
    } else {
      // Animaux depuis la table animals (utilisateurs)
      const animals = await ctx.db
        .query("animals")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      animalsWithSlug = animals.map((animal) => ({
        id: animal._id,
        name: animal.name,
        slug: animal.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
        type: animal.type,
        breed: animal.breed,
        gender: animal.gender,
        birthDate: animal.birthDate,
        age: null,
        weight: animal.weight,
        size: animal.size,
        description: animal.description,
        profilePhoto: animal.profilePhoto,
        galleryPhotos: animal.galleryPhotos || [],
        goodWithChildren: animal.goodWithChildren,
        goodWithDogs: animal.goodWithDogs,
        goodWithCats: animal.goodWithCats,
        goodWithOtherAnimals: animal.goodWithOtherAnimals,
        behaviorTraits: animal.behaviorTraits || [],
      }));
    }

    // Les avis seront ajoutés ultérieurement quand la table reviews sera créée
    const enrichedReviews: {
      id: string;
      rating: number;
      comment?: string | null;
      createdAt: number;
      reviewer: { firstName: string; lastName: string };
    }[] = [];
    const averageRating = 0;

    // Récupérer les services/formules si c'est un annonceur
    let services: any[] = [];
    let collectiveSlots: any[] = [];
    if (user.accountType === "annonceur_pro" || user.accountType === "annonceur_particulier") {
      const userServices = await ctx.db
        .query("services")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      // Mapping des catégories vers noms et icônes
      const categoryInfo: Record<string, { name: string; icon: string }> = {
        "garde": { name: "Garde", icon: "🏠" },
        "hebergement": { name: "Hébergement", icon: "🛏️" },
        "promenade": { name: "Promenade", icon: "🚶" },
        "visite": { name: "Visite à domicile", icon: "🏡" },
        "toilettage": { name: "Toilettage", icon: "✂️" },
        "education": { name: "Éducation", icon: "🎓" },
        "transport": { name: "Transport", icon: "🚗" },
      };

      // Enrichir avec les variantes (formules)
      services = await Promise.all(
        userServices.map(async (service) => {
          const catInfo = categoryInfo[service.category] || { name: service.category || "Service", icon: "🐾" };

          // Récupérer les variantes du service
          const variants = await ctx.db
            .query("serviceVariants")
            .withIndex("by_service", (q) => q.eq("serviceId", service._id))
            .filter((q) => q.eq(q.field("isActive"), true))
            .collect();

          return {
            id: service._id,
            categorySlug: service.category,
            categoryName: catInfo.name,
            categoryIcon: catInfo.icon,
            animalTypes: service.animalTypes || [],
            formules: variants.map((variant) => ({
              id: variant._id,
              name: variant.name,
              description: variant.description,
              basePrice: variant.price,
              priceUnit: variant.priceUnit,
              pricePerHour: variant.pricing?.hourly,
              pricePerHalfDay: variant.pricing?.halfDaily,
              pricePerDay: variant.pricing?.daily,
              pricePerWeek: variant.pricing?.weekly,
              pricePerMonth: variant.pricing?.monthly,
              animalTypes: variant.animalTypes || [],
              sessionType: variant.sessionType,
              numberOfSessions: variant.numberOfSessions,
              maxAnimalsPerSession: variant.maxAnimalsPerSession,
            })),
          };
        })
      );

      // Récupérer les créneaux collectifs futurs (14 prochains jours)
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const allSlots = await ctx.db
        .query("collectiveSlots")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();

      collectiveSlots = allSlots
        .filter((slot) =>
          slot.isActive &&
          !slot.isCancelled &&
          slot.date >= todayStr
        )
        .slice(0, 50)
        .map((slot) => ({
          id: slot._id,
          variantId: slot.variantId,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          maxAnimals: slot.maxAnimals,
          bookedAnimals: slot.bookedAnimals ?? 0,
        }));
    }

    // Déterminer le type de membre
    const memberSince = new Date(user.createdAt).getFullYear().toString();

    return {
      id: user._id,
      slug: user.slug,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username ?? undefined,
      accountType: user.accountType,
      memberSince,
      isAnnouncer: user.accountType === "annonceur_pro" || user.accountType === "annonceur_particulier",
      statusType: user.accountType === "annonceur_pro"
        ? "professionnel"
        : user.accountType === "annonceur_particulier"
          ? "particulier"
          : "utilisateur",
      // Données pro
      siret: user.accountType === "annonceur_pro" ? (user.siret || null) : null,
      companyName: user.accountType === "annonceur_pro" ? (user.companyName || null) : null,
      // Profil
      profileImage: (profile?.listingDisplayImage === "logo" && profile?.companyLogoUrl)
        ? profile.companyLogoUrl
        : (profile?.profileImageUrl || null),
      isDisplayingLogo: !!(profile?.listingDisplayImage === "logo" && profile?.companyLogoUrl),
      coverImage: profile?.coverImageUrl || null,
      bio: profile?.description || profile?.bio || null,
      location: profile?.location || profile?.city || null,
      city: profile?.city || null,
      coordinates: profile?.coordinates || null,
      radius: profile?.radius || null,
      // Équipement (pour annonceurs)
      equipment: {
        housingType: profile?.housingType || null,
        housingSize: profile?.housingSize || null,
        hasGarden: profile?.hasGarden || false,
        gardenSize: profile?.gardenSize || null,
        hasVehicle: profile?.hasVehicle || false,
        isSmoker: profile?.isSmoker ?? null,
        hasChildren: profile?.hasChildren ?? null,
        childrenAges: profile?.childrenAges || [],
        providesFood: profile?.providesFood || false,
      },
      icadRegistered: profile?.icadRegistered || false,
      isIdentityVerified: profile?.isIdentityVerified || false,
      isSapApproved: profile?.isSapApproved || false,
      // Galerie
      gallery: profile?.environmentPhotos?.map((p: { url: string }) => p.url) || [],
      // Animaux
      animals: animalsWithSlug,
      // Avis
      reviews: enrichedReviews,
      rating: averageRating,
      reviewCount: enrichedReviews.length,
      // Services (pour annonceurs)
      services,
      // Créneaux collectifs futurs
      collectiveSlots,
    };
  },
});

/**
 * Query publique pour les disponibilités d'un annonceur par mois.
 * Retourne uniquement les statuts (pas les détails de missions/réservations).
 */
export const getPublicAvailability = query({
  args: {
    slug: v.string(),
    startDate: v.string(), // "YYYY-MM-DD"
    endDate: v.string(),   // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    // Trouver l'utilisateur par username ou slug
    let user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.slug.toLowerCase()))
      .first();
    if (!user) {
      user = await ctx.db
        .query("users")
        .withIndex("by_slug", (q) => q.eq("slug", args.slug))
        .first();
    }
    if (!user || !user.isActive) return [];

    // Récupérer les disponibilités
    const availabilities = await ctx.db
      .query("availability")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const filtered = availabilities.filter(
      (a) => a.date >= args.startDate && a.date <= args.endDate
    );

    // Récupérer les créneaux collectifs actifs sur la période
    const collectiveSlots = await ctx.db
      .query("collectiveSlots")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const activeSlots = collectiveSlots.filter(
      (s) => s.isActive && !s.isCancelled && s.date >= args.startDate && s.date <= args.endDate
    );

    return {
      availability: filtered.map((a) => ({
        date: a.date,
        status: a.status,
      })),
      collectiveSlots: activeSlots.map((s) => ({
        id: s._id,
        variantId: s.variantId,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        maxAnimals: s.maxAnimals,
        bookedAnimals: s.bookedAnimals ?? 0,
      })),
    };
  },
});
