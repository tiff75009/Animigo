import { query } from "../_generated/server";
import { v } from "convex/values";

// Récupérer un profil public par son slug
export const getPublicProfileBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    // Trouver l'utilisateur par son slug
    const user = await ctx.db
      .query("users")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

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
            formules: variants.map((v) => ({
              id: v._id,
              name: v.name,
              description: v.description,
              basePrice: v.price,
              pricePerHour: v.pricing?.hourly,
              pricePerDay: v.pricing?.daily,
              animalTypes: v.animalTypes || [],
            })),
          };
        })
      );
    }

    // Déterminer le type de membre
    const memberSince = new Date(user.createdAt).getFullYear().toString();

    return {
      id: user._id,
      slug: user.slug,
      firstName: user.firstName,
      lastName: user.lastName,
      accountType: user.accountType,
      memberSince,
      isAnnouncer: user.accountType === "annonceur_pro" || user.accountType === "annonceur_particulier",
      statusType: user.accountType === "annonceur_pro"
        ? "professionnel"
        : user.accountType === "annonceur_particulier"
          ? "particulier"
          : "utilisateur",
      // Profil
      profileImage: profile?.profileImageUrl || null,
      coverImage: profile?.coverImageUrl || null,
      bio: profile?.description || profile?.bio || null,
      location: profile?.location || profile?.city || null,
      coordinates: profile?.coordinates || null,
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
    };
  },
});
