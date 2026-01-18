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
    bio: v.optional(v.string()),
    description: v.optional(v.string()),
    experience: v.optional(v.string()),
    availability: v.optional(v.string()),
    location: v.optional(v.string()),
    radius: v.optional(v.number()),
    // Localisation structurée (Google Maps)
    postalCode: v.optional(v.string()),
    city: v.optional(v.string()),
    department: v.optional(v.string()),
    region: v.optional(v.string()),
    coordinates: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
    googlePlaceId: v.optional(v.string()),
    acceptedAnimals: v.optional(v.array(v.string())),
    hasGarden: v.optional(v.boolean()),
    hasVehicle: v.optional(v.boolean()),
    ownedAnimals: v.optional(v.array(v.object({
      type: v.string(),
      name: v.string(),
      breed: v.optional(v.string()),
      age: v.optional(v.number()),
    }))),
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

    // Utiliser les données Google Maps si fournies, sinon parser la localisation
    let locationFields: {
      postalCode?: string;
      city?: string;
      department?: string;
      region?: string;
      coordinates?: { lat: number; lng: number };
      googlePlaceId?: string;
    };

    if (args.googlePlaceId && args.coordinates) {
      // Données Google Maps fournies
      locationFields = {
        postalCode: args.postalCode || undefined,
        city: args.city || undefined,
        department: args.department || undefined,
        region: args.region || undefined,
        coordinates: args.coordinates,
        googlePlaceId: args.googlePlaceId,
      };
    } else {
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
    }

    const profileData = {
      bio: args.bio,
      description: args.description,
      experience: args.experience,
      availability: args.availability,
      location: args.location,
      radius: args.radius,
      // Localisation structurée
      ...locationFields,
      acceptedAnimals: args.acceptedAnimals,
      hasGarden: args.hasGarden,
      hasVehicle: args.hasVehicle,
      ownedAnimals: args.ownedAnimals,
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
