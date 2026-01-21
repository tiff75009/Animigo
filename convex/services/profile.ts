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
      profile: profile || null,
    };
  },
});

// Créer ou mettre à jour le profil
export const upsertProfile = mutation({
  args: {
    token: v.string(),
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
    hasGarden: v.optional(v.union(v.boolean(), v.null())),
    hasVehicle: v.optional(v.union(v.boolean(), v.null())),
    ownedAnimals: v.optional(v.union(v.array(v.object({
      type: v.string(),
      name: v.string(),
      breed: v.optional(v.string()),
      age: v.optional(v.number()),
    })), v.null())),
    // Nombre max d'animaux acceptés en même temps
    maxAnimalsPerSlot: v.optional(v.union(v.number(), v.null())),
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

    // Helper pour convertir null en undefined
    const nullToUndefined = <T>(val: T | null | undefined): T | undefined =>
      val === null ? undefined : val;

    // Chercher un profil existant
    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    // Utiliser les données Google Maps si fournies, sinon parser la localisation
    let locationFields: {
      postalCode?: string;
      city?: string;
      department?: string;
      region?: string;
      coordinates?: { lat: number; lng: number };
      googlePlaceId?: string;
    };

    if (args.coordinates || args.googlePlaceId) {
      // Données Google Maps fournies (au moins coordonnées ou placeId)
      locationFields = {
        postalCode: nullToUndefined(args.postalCode) || undefined,
        city: nullToUndefined(args.city) || undefined,
        department: nullToUndefined(args.department) || undefined,
        region: nullToUndefined(args.region) || undefined,
        coordinates: nullToUndefined(args.coordinates),
        googlePlaceId: nullToUndefined(args.googlePlaceId),
      };
    } else if (args.location) {
      // Fallback: parser la localisation texte
      const locationData = parseLocationString(args.location);
      locationFields = {
        postalCode: locationData.postalCode || undefined,
        city: locationData.city || undefined,
        department: locationData.department || undefined,
        region: locationData.region || undefined,
        coordinates: undefined,
        googlePlaceId: undefined,
      };
    } else {
      // Pas de données de localisation
      locationFields = {};
    }

    const profileData = {
      bio: nullToUndefined(args.bio),
      description: nullToUndefined(args.description),
      experience: nullToUndefined(args.experience),
      availability: nullToUndefined(args.availability),
      location: nullToUndefined(args.location),
      radius: nullToUndefined(args.radius),
      // Localisation structurée
      ...locationFields,
      acceptedAnimals: nullToUndefined(args.acceptedAnimals),
      hasGarden: nullToUndefined(args.hasGarden),
      hasVehicle: nullToUndefined(args.hasVehicle),
      ownedAnimals: nullToUndefined(args.ownedAnimals),
      maxAnimalsPerSlot: nullToUndefined(args.maxAnimalsPerSlot),
      updatedAt: now,
    };

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, profileData);
      return { success: true, profileId: existingProfile._id };
    } else {
      const profileId = await ctx.db.insert("profiles", {
        userId: session.userId,
        ...profileData,
      });
      return { success: true, profileId };
    }
  },
});
