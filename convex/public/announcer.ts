import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Récupère le profil public d'un annonceur par son ID utilisateur
 * Cette query est publique (pas besoin d'authentification)
 */
export const getAnnouncerProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Récupérer l'utilisateur
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }

    // Vérifier que c'est bien un annonceur
    if (user.accountType === "utilisateur") {
      return null;
    }

    // Récupérer le profil
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    // Récupérer les services de l'annonceur
    const services = await ctx.db
      .query("services")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Récupérer les formules (prestations) pour chaque service
    const servicesWithFormules = await Promise.all(
      services.map(async (service) => {
        const formules = await ctx.db
          .query("serviceVariants")
          .withIndex("by_service", (q) => q.eq("serviceId", service._id))
          .filter((q) => q.eq(q.field("isActive"), true))
          .collect();

        // Récupérer les options
        const options = await ctx.db
          .query("serviceOptions")
          .withIndex("by_service", (q) => q.eq("serviceId", service._id))
          .filter((q) => q.eq(q.field("isActive"), true))
          .collect();

        // Récupérer la catégorie depuis le slug
        const category = service.category
          ? await ctx.db
              .query("serviceCategories")
              .withIndex("by_slug", (q) => q.eq("slug", service.category))
              .first()
          : null;

        return {
          id: service._id,
          categoryId: service.category,
          categoryName: category?.name || "Service",
          categoryIcon: category?.icon || "🐾",
          description: service.description || category?.description || "",
          animalTypes: service.animalTypes || [],
          formules: formules.map((f) => ({
            id: f._id,
            name: f.name,
            description: f.description || "",
            price: f.price, // en centimes
            duration: f.duration || 0,
            unit: f.priceUnit,
            pricing: f.pricing || null, // Multi-tarification {hourly, daily, weekly, monthly}
          })),
          options: options.map((o) => ({
            id: o._id,
            name: o.name,
            description: o.description,
            price: o.price, // en centimes
          })),
        };
      })
    );

    // Récupérer les activités sélectionnées avec leurs détails
    let activities: Array<{
      id: string;
      name: string;
      icon: string;
      customDescription?: string;
    }> = [];

    if (profile?.selectedActivities && profile.selectedActivities.length > 0) {
      activities = await Promise.all(
        profile.selectedActivities.map(async (sa) => {
          const activity = await ctx.db.get(sa.activityId);
          return {
            id: sa.activityId,
            name: activity?.name || "Activité",
            icon: activity?.emoji || "🎯",
            customDescription: sa.customDescription,
          };
        })
      );
    }

    // TODO: Calculer la note moyenne et le nombre d'avis depuis une table reviews
    // Pour l'instant, on retourne des valeurs par défaut
    const rating = 0;
    const reviewCount = 0;
    const reviews: Array<{
      id: string;
      author: string;
      avatar?: string;
      rating: number;
      date: string;
      animal: string;
      content: string;
    }> = [];

    // Construire l'adresse d'affichage
    const buildDisplayLocation = () => {
      if (profile?.city && profile?.postalCode) {
        return `${profile.postalCode} ${profile.city}`;
      }
      if (profile?.city) {
        return profile.city;
      }
      if (profile?.location) {
        return profile.location;
      }
      return null;
    };

    // Déterminer le type de statut
    const getStatusType = () => {
      if (user.accountType === "annonceur_pro") {
        if (user.companyType === "micro_enterprise") {
          return "micro_entrepreneur";
        }
        return "professionnel";
      }
      return "particulier";
    };

    return {
      // Infos utilisateur (publiques)
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      memberSince: new Date(user.createdAt).getFullYear().toString(),
      verified: user.emailVerified,
      statusType: getStatusType(),

      // Infos profil
      profileImage: profile?.profileImageUrl || null,
      coverImage: profile?.coverImageUrl || null,
      bio: profile?.description || null,
      location: buildDisplayLocation(),
      coordinates: profile?.coordinates || null,

      // Stats
      rating,
      reviewCount,
      responseTime: "< 1h", // TODO: calculer depuis les messages
      responseRate: 98, // TODO: calculer depuis les messages

      // Animaux acceptés
      acceptedAnimals: profile?.acceptedAnimals || [],

      // Récupérer les animaux depuis le profil (ownedAnimals)
      ownAnimals: (profile?.ownedAnimals || []).map((animal) => ({
        id: animal.id || null,
        type: animal.type,
        name: animal.name,
        breed: animal.breed || null,
        age: animal.age || null,
        gender: animal.gender || null,
        weight: animal.weight || null,
        size: animal.size || null,
        description: animal.description || null,
        profilePhoto: animal.profilePhoto || null,
        galleryPhotos: animal.galleryPhotos || [],
        // Compatibilité
        goodWithChildren: animal.goodWithChildren ?? null,
        goodWithDogs: animal.goodWithDogs ?? null,
        goodWithCats: animal.goodWithCats ?? null,
        goodWithOtherAnimals: animal.goodWithOtherAnimals ?? null,
        // Caractère
        behaviorTraits: animal.behaviorTraits || [],
      })),

      // Équipements et conditions
      equipment: {
        housingType: profile?.housingType || null,
        housingSize: profile?.housingSize || null,
        hasGarden: profile?.hasGarden || false,
        gardenSize: profile?.gardenSize || null,
        hasVehicle: profile?.hasVehicle || false,
        isSmoker: profile?.isSmoker ?? null,
        hasChildren: profile?.hasChildren || false,
        childrenAges: profile?.childrenAges || [],
        providesFood: profile?.providesFood ?? null,
      },

      // I-CAD
      icadRegistered: profile?.icadRegistered ?? null,

      // Galerie (photos d'environnement)
      gallery: profile?.environmentPhotos?.map((p) => p.url) || [],

      // Services/Prestations
      services: servicesWithFormules,

      // Activités
      activities,

      // Avis
      reviews,

      // Disponibilité
      availability: {
        nextAvailable: "Demain", // TODO: calculer depuis le calendrier
      },

      // Rayon d'intervention
      radius: profile?.radius || null,
    };
  },
});

/**
 * Récupère le profil public d'un annonceur par son slug
 * Cette query est publique (pas besoin d'authentification)
 */
export const getAnnouncerBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    // Récupérer l'utilisateur par son slug
    const user = await ctx.db
      .query("users")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!user) {
      return null;
    }

    // Vérifier que c'est bien un annonceur
    if (user.accountType === "utilisateur") {
      return null;
    }

    // Récupérer le profil
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    // Récupérer les services de l'annonceur
    const services = await ctx.db
      .query("services")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Récupérer les formules (prestations) pour chaque service
    const servicesWithFormules = await Promise.all(
      services.map(async (service) => {
        const formules = await ctx.db
          .query("serviceVariants")
          .withIndex("by_service", (q) => q.eq("serviceId", service._id))
          .filter((q) => q.eq(q.field("isActive"), true))
          .collect();

        // Récupérer les options
        const options = await ctx.db
          .query("serviceOptions")
          .withIndex("by_service", (q) => q.eq("serviceId", service._id))
          .filter((q) => q.eq(q.field("isActive"), true))
          .collect();

        // Récupérer la catégorie depuis le slug
        const category = service.category
          ? await ctx.db
              .query("serviceCategories")
              .withIndex("by_slug", (q) => q.eq("slug", service.category))
              .first()
          : null;

        return {
          id: service._id,
          categoryId: service.category,
          categorySlug: service.category,
          categoryName: category?.name || "Service",
          categoryIcon: category?.icon || "🐾",
          description: service.description || category?.description || "",
          animalTypes: service.animalTypes || [],
          formules: formules.map((f) => ({
            id: f._id,
            name: f.name,
            description: f.description || "",
            price: f.price, // en centimes
            duration: f.duration || 0,
            unit: f.priceUnit,
            pricing: f.pricing || null, // Multi-tarification {hourly, daily, weekly, monthly}
          })),
          options: options.map((o) => ({
            id: o._id,
            name: o.name,
            description: o.description,
            price: o.price, // en centimes
          })),
        };
      })
    );

    // Récupérer les activités sélectionnées avec leurs détails
    let activities: Array<{
      id: string;
      name: string;
      icon: string;
      customDescription?: string;
    }> = [];

    if (profile?.selectedActivities && profile.selectedActivities.length > 0) {
      activities = await Promise.all(
        profile.selectedActivities.map(async (sa) => {
          const activity = await ctx.db.get(sa.activityId);
          return {
            id: sa.activityId,
            name: activity?.name || "Activité",
            icon: activity?.emoji || "🎯",
            customDescription: sa.customDescription,
          };
        })
      );
    }

    // TODO: Calculer la note moyenne et le nombre d'avis depuis une table reviews
    const rating = 0;
    const reviewCount = 0;
    const reviews: Array<{
      id: string;
      author: string;
      avatar?: string;
      rating: number;
      date: string;
      animal: string;
      content: string;
    }> = [];

    // Construire l'adresse d'affichage
    const buildDisplayLocation = () => {
      if (profile?.city && profile?.postalCode) {
        return `${profile.postalCode} ${profile.city}`;
      }
      if (profile?.city) {
        return profile.city;
      }
      if (profile?.location) {
        return profile.location;
      }
      return null;
    };

    // Déterminer le type de statut
    const getStatusType = () => {
      if (user.accountType === "annonceur_pro") {
        if (user.companyType === "micro_enterprise") {
          return "micro_entrepreneur";
        }
        return "professionnel";
      }
      return "particulier";
    };

    return {
      // Infos utilisateur (publiques)
      id: user._id,
      slug: user.slug,
      firstName: user.firstName,
      lastName: user.lastName,
      memberSince: new Date(user.createdAt).getFullYear().toString(),
      verified: user.emailVerified,
      statusType: getStatusType(),

      // Infos profil
      profileImage: profile?.profileImageUrl || null,
      coverImage: profile?.coverImageUrl || null,
      bio: profile?.description || null,
      location: buildDisplayLocation(),
      coordinates: profile?.coordinates || null,

      // Stats
      rating,
      reviewCount,
      responseTime: "< 1h",
      responseRate: 98,

      // Animaux acceptés
      acceptedAnimals: profile?.acceptedAnimals || [],

      // Animaux du gardien
      ownAnimals: (profile?.ownedAnimals || []).map((animal) => ({
        id: animal.id || null,
        type: animal.type,
        name: animal.name,
        breed: animal.breed || null,
        age: animal.age || null,
        gender: animal.gender || null,
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
      })),

      // Équipements et conditions
      equipment: {
        housingType: profile?.housingType || null,
        housingSize: profile?.housingSize || null,
        hasGarden: profile?.hasGarden || false,
        gardenSize: profile?.gardenSize || null,
        hasVehicle: profile?.hasVehicle || false,
        isSmoker: profile?.isSmoker ?? null,
        hasChildren: profile?.hasChildren || false,
        childrenAges: profile?.childrenAges || [],
        providesFood: profile?.providesFood ?? null,
      },

      // I-CAD
      icadRegistered: profile?.icadRegistered ?? null,

      // Galerie
      gallery: profile?.environmentPhotos?.map((p) => p.url) || [],

      // Services/Prestations
      services: servicesWithFormules,

      // Activités
      activities,

      // Avis
      reviews,

      // Disponibilité
      availability: {
        nextAvailable: "Demain",
      },

      // Rayon d'intervention
      radius: profile?.radius || null,
    };
  },
});
