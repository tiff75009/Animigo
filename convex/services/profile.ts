import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { parseLocationString } from "../utils/location";

// Récupérer le profil d'un utilisateur
export const getProfile = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    // Vérifier la session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(session.userId);
    if (!user) return null;

    // Récupérer le profil
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    // Récupérer la photo de profil depuis la table photos comme fallback
    let profilePhotoUrl: string | null = null;
    if (!profile?.profileImageUrl) {
      const profilePhoto = await ctx.db
        .query("photos")
        .withIndex("by_user", (q) => q.eq("userId", session.userId))
        .filter((q) => q.eq(q.field("isProfilePhoto"), true))
        .first();

      if (profilePhoto?.storageId) {
        profilePhotoUrl = await ctx.storage.getUrl(profilePhoto.storageId);
      }
    }

    return {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        accountType: user.accountType,
        companyName: user.companyName,
        siret: user.siret,
      },
      profile: profile ? {
        ...profile,
        // Utiliser profileImageUrl du profil ou fallback vers photos table
        profileImageUrl: profile.profileImageUrl ?? profilePhotoUrl,
      } : null,
    };
  },
});

// Créer ou mettre à jour le profil
export const upsertProfile = mutation({
  args: {
    token: v.string(),
    profileImageUrl: v.optional(v.union(v.string(), v.null())),
    coverImageUrl: v.optional(v.union(v.string(), v.null())),
    bio: v.optional(v.union(v.string(), v.null())),
    description: v.optional(v.union(v.string(), v.null())),
    experience: v.optional(v.union(v.string(), v.null())),
    availability: v.optional(v.union(v.string(), v.null())),
    location: v.optional(v.union(v.string(), v.null())),
    radius: v.optional(v.union(v.number(), v.null())),
    // Localisation structurée (Google Maps)
    postalCode: v.optional(v.union(v.string(), v.null())),
    city: v.optional(v.union(v.string(), v.null())),
    department: v.optional(v.union(v.string(), v.null())),
    region: v.optional(v.union(v.string(), v.null())),
    coordinates: v.optional(v.union(v.object({
      lat: v.number(),
      lng: v.number(),
    }), v.null())),
    googlePlaceId: v.optional(v.union(v.string(), v.null())),
    acceptedAnimals: v.optional(v.union(v.array(v.string()), v.null())),
    // Conditions de garde - Logement
    housingType: v.optional(v.union(v.literal("house"), v.literal("apartment"), v.null())),
    housingSize: v.optional(v.union(v.number(), v.null())),
    hasGarden: v.optional(v.union(v.boolean(), v.null())),
    gardenSize: v.optional(v.union(v.string(), v.null())),
    // Conditions de garde - Mode de vie
    isSmoker: v.optional(v.union(v.boolean(), v.null())),
    hasChildren: v.optional(v.union(v.boolean(), v.null())),
    childrenAges: v.optional(v.union(v.array(v.string()), v.null())),
    // Conditions de garde - Alimentation
    providesFood: v.optional(v.union(v.boolean(), v.null())),
    hasVehicle: v.optional(v.union(v.boolean(), v.null())),
    ownedAnimals: v.optional(v.union(v.array(v.object({
      id: v.optional(v.string()),
      type: v.string(),
      name: v.string(),
      breed: v.optional(v.string()),
      age: v.optional(v.number()),
      gender: v.optional(v.string()),
      profilePhoto: v.optional(v.string()),
      galleryPhotos: v.optional(v.array(v.string())),
      weight: v.optional(v.number()),
      size: v.optional(v.string()),
      description: v.optional(v.string()),
      goodWithChildren: v.optional(v.boolean()),
      goodWithDogs: v.optional(v.boolean()),
      goodWithCats: v.optional(v.boolean()),
      goodWithOtherAnimals: v.optional(v.boolean()),
      behaviorTraits: v.optional(v.array(v.string())),
    })), v.null())),
    // Nombre max d'animaux acceptés en même temps
    maxAnimalsPerSlot: v.optional(v.union(v.number(), v.null())),
    // Activités proposées
    selectedActivities: v.optional(v.union(v.array(v.object({
      activityId: v.id("activities"),
      customDescription: v.optional(v.string()),
    })), v.null())),
    // Photos d'environnement
    environmentPhotos: v.optional(v.union(v.array(v.object({
      id: v.string(),
      url: v.string(),
      caption: v.optional(v.string()),
    })), v.null())),
    // I-CAD (Identification des Carnivores Domestiques)
    icadRegistered: v.optional(v.union(v.boolean(), v.null())),
  },
  handler: async (ctx, args) => {
    // Vérifier la session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) throw new ConvexError("Utilisateur non trouvé");

    // Vérifier que c'est un annonceur
    if (user.accountType === "utilisateur") {
      throw new ConvexError("Seuls les annonceurs peuvent créer un profil");
    }

    const now = Date.now();

    // Chercher un profil existant
    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    // Helper pour ajouter un champ seulement s'il est explicitement fourni (pas undefined)
    // null = effacer la valeur, undefined = ne pas toucher
    const addIfDefined = <T>(obj: Record<string, unknown>, key: string, value: T | null | undefined) => {
      if (value !== undefined) {
        obj[key] = value === null ? undefined : value;
      }
    };

    // Construire l'objet de mise à jour avec seulement les champs fournis
    const profileData: Record<string, unknown> = {
      updatedAt: now,
    };

    // Champs simples
    addIfDefined(profileData, "profileImageUrl", args.profileImageUrl);
    addIfDefined(profileData, "coverImageUrl", args.coverImageUrl);
    addIfDefined(profileData, "bio", args.bio);
    addIfDefined(profileData, "description", args.description);
    addIfDefined(profileData, "experience", args.experience);
    addIfDefined(profileData, "availability", args.availability);
    addIfDefined(profileData, "radius", args.radius);
    addIfDefined(profileData, "acceptedAnimals", args.acceptedAnimals);
    // Conditions de garde - Logement
    addIfDefined(profileData, "housingType", args.housingType);
    addIfDefined(profileData, "housingSize", args.housingSize);
    addIfDefined(profileData, "hasGarden", args.hasGarden);
    addIfDefined(profileData, "gardenSize", args.gardenSize);
    // Conditions de garde - Mode de vie
    addIfDefined(profileData, "isSmoker", args.isSmoker);
    addIfDefined(profileData, "hasChildren", args.hasChildren);
    addIfDefined(profileData, "childrenAges", args.childrenAges);
    // Conditions de garde - Alimentation
    addIfDefined(profileData, "providesFood", args.providesFood);
    addIfDefined(profileData, "hasVehicle", args.hasVehicle);
    addIfDefined(profileData, "ownedAnimals", args.ownedAnimals);
    addIfDefined(profileData, "maxAnimalsPerSlot", args.maxAnimalsPerSlot);
    addIfDefined(profileData, "selectedActivities", args.selectedActivities);
    addIfDefined(profileData, "environmentPhotos", args.environmentPhotos);
    addIfDefined(profileData, "icadRegistered", args.icadRegistered);

    // Localisation - traiter ensemble car ils sont liés
    if (args.location !== undefined || args.coordinates !== undefined || args.googlePlaceId !== undefined) {
      // Au moins un champ de localisation fourni, mettre à jour tous les champs de localisation
      if (args.coordinates || args.googlePlaceId) {
        // Données Google Maps fournies
        addIfDefined(profileData, "location", args.location);
        addIfDefined(profileData, "postalCode", args.postalCode);
        addIfDefined(profileData, "city", args.city);
        addIfDefined(profileData, "department", args.department);
        addIfDefined(profileData, "region", args.region);
        addIfDefined(profileData, "coordinates", args.coordinates);
        addIfDefined(profileData, "googlePlaceId", args.googlePlaceId);
      } else if (args.location) {
        // Fallback: parser la localisation texte
        const locationData = parseLocationString(args.location);
        profileData.location = args.location;
        profileData.postalCode = locationData.postalCode || undefined;
        profileData.city = locationData.city || undefined;
        profileData.department = locationData.department || undefined;
        profileData.region = locationData.region || undefined;
        profileData.coordinates = undefined;
        profileData.googlePlaceId = undefined;
      } else if (args.location === null) {
        // Effacer toute la localisation
        profileData.location = undefined;
        profileData.postalCode = undefined;
        profileData.city = undefined;
        profileData.department = undefined;
        profileData.region = undefined;
        profileData.coordinates = undefined;
        profileData.googlePlaceId = undefined;
      }
    }

    if (existingProfile) {
      // Update: seulement les champs fournis
      await ctx.db.patch(existingProfile._id, profileData);
      return { success: true, profileId: existingProfile._id };
    } else {
      // Create: construire un objet complet avec les valeurs par défaut
      const newProfile: {
        userId: typeof session.userId;
        updatedAt: number;
        profileImageUrl?: string;
        coverImageUrl?: string;
        bio?: string;
        description?: string;
        experience?: string;
        availability?: string;
        location?: string;
        radius?: number;
        postalCode?: string;
        city?: string;
        department?: string;
        region?: string;
        coordinates?: { lat: number; lng: number };
        googlePlaceId?: string;
        acceptedAnimals?: string[];
        // Conditions de garde
        housingType?: "house" | "apartment";
        housingSize?: number;
        hasGarden?: boolean;
        gardenSize?: string;
        isSmoker?: boolean;
        hasChildren?: boolean;
        childrenAges?: string[];
        providesFood?: boolean;
        hasVehicle?: boolean;
        ownedAnimals?: Array<{
          id?: string;
          type: string;
          name: string;
          breed?: string;
          age?: number;
          gender?: string;
          profilePhoto?: string;
          galleryPhotos?: string[];
          weight?: number;
          size?: string;
          description?: string;
          goodWithChildren?: boolean;
          goodWithDogs?: boolean;
          goodWithCats?: boolean;
          goodWithOtherAnimals?: boolean;
          behaviorTraits?: string[];
        }>;
        maxAnimalsPerSlot?: number;
        selectedActivities?: Array<{
          activityId: import("../_generated/dataModel").Id<"activities">;
          customDescription?: string;
        }>;
      } = {
        userId: session.userId,
        updatedAt: now,
      };

      // Copier les valeurs définies
      if (profileData.profileImageUrl !== undefined) newProfile.profileImageUrl = profileData.profileImageUrl as string | undefined;
      if (profileData.coverImageUrl !== undefined) newProfile.coverImageUrl = profileData.coverImageUrl as string | undefined;
      if (profileData.bio !== undefined) newProfile.bio = profileData.bio as string | undefined;
      if (profileData.description !== undefined) newProfile.description = profileData.description as string | undefined;
      if (profileData.experience !== undefined) newProfile.experience = profileData.experience as string | undefined;
      if (profileData.availability !== undefined) newProfile.availability = profileData.availability as string | undefined;
      if (profileData.location !== undefined) newProfile.location = profileData.location as string | undefined;
      if (profileData.radius !== undefined) newProfile.radius = profileData.radius as number | undefined;
      if (profileData.postalCode !== undefined) newProfile.postalCode = profileData.postalCode as string | undefined;
      if (profileData.city !== undefined) newProfile.city = profileData.city as string | undefined;
      if (profileData.department !== undefined) newProfile.department = profileData.department as string | undefined;
      if (profileData.region !== undefined) newProfile.region = profileData.region as string | undefined;
      if (profileData.coordinates !== undefined) newProfile.coordinates = profileData.coordinates as { lat: number; lng: number } | undefined;
      if (profileData.googlePlaceId !== undefined) newProfile.googlePlaceId = profileData.googlePlaceId as string | undefined;
      if (profileData.acceptedAnimals !== undefined) newProfile.acceptedAnimals = profileData.acceptedAnimals as string[] | undefined;
      // Conditions de garde
      if (profileData.housingType !== undefined) newProfile.housingType = profileData.housingType as "house" | "apartment" | undefined;
      if (profileData.housingSize !== undefined) newProfile.housingSize = profileData.housingSize as number | undefined;
      if (profileData.hasGarden !== undefined) newProfile.hasGarden = profileData.hasGarden as boolean | undefined;
      if (profileData.gardenSize !== undefined) newProfile.gardenSize = profileData.gardenSize as string | undefined;
      if (profileData.isSmoker !== undefined) newProfile.isSmoker = profileData.isSmoker as boolean | undefined;
      if (profileData.hasChildren !== undefined) newProfile.hasChildren = profileData.hasChildren as boolean | undefined;
      if (profileData.childrenAges !== undefined) newProfile.childrenAges = profileData.childrenAges as string[] | undefined;
      if (profileData.providesFood !== undefined) newProfile.providesFood = profileData.providesFood as boolean | undefined;
      if (profileData.hasVehicle !== undefined) newProfile.hasVehicle = profileData.hasVehicle as boolean | undefined;
      if (profileData.ownedAnimals !== undefined) newProfile.ownedAnimals = profileData.ownedAnimals as Array<{
        id?: string;
        type: string;
        name: string;
        breed?: string;
        age?: number;
        gender?: string;
        profilePhoto?: string;
        galleryPhotos?: string[];
        weight?: number;
        size?: string;
        description?: string;
        goodWithChildren?: boolean;
        goodWithDogs?: boolean;
        goodWithCats?: boolean;
        goodWithOtherAnimals?: boolean;
        behaviorTraits?: string[];
      }> | undefined;
      if (profileData.maxAnimalsPerSlot !== undefined) newProfile.maxAnimalsPerSlot = profileData.maxAnimalsPerSlot as number | undefined;
      if (profileData.selectedActivities !== undefined) newProfile.selectedActivities = profileData.selectedActivities as Array<{
        activityId: import("../_generated/dataModel").Id<"activities">;
        customDescription?: string;
      }> | undefined;

      const profileId = await ctx.db.insert("profiles", newProfile);
      return { success: true, profileId };
    }
  },
});
