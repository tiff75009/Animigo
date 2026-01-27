import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// Query: Récupérer le profil client
export const getClientProfile = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    // 1. Valider session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    // 2. Récupérer l'utilisateur
    const user = await ctx.db.get(session.userId);
    if (!user) {
      return null;
    }

    // 3. Vérifier que c'est un client (utilisateur)
    if (user.accountType !== "utilisateur") {
      return null;
    }

    // 4. Récupérer le profil client
    const clientProfile = await ctx.db
      .query("clientProfiles")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    // 5. Retourner les données combinées
    return {
      userId: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      createdAt: user.createdAt,
      // Données du profil client
      profileImageUrl: clientProfile?.profileImageUrl ?? null,
      coverImageUrl: clientProfile?.coverImageUrl ?? null,
      description: clientProfile?.description ?? null,
      location: clientProfile?.location ?? null,
      city: clientProfile?.city ?? null,
      postalCode: clientProfile?.postalCode ?? null,
      coordinates: clientProfile?.coordinates ?? null,
      googlePlaceId: clientProfile?.googlePlaceId ?? null,
      updatedAt: clientProfile?.updatedAt ?? null,
    };
  },
});

// Query: Récupérer les coordonnées de l'utilisateur (client ou annonceur) pour la recherche
export const getClientCoordinates = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    // 1. Valider session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    // 2. Récupérer l'utilisateur pour connaître son type
    const user = await ctx.db.get(session.userId);
    if (!user) return null;

    // 3. Chercher dans la bonne table selon le type de compte
    if (user.accountType === "utilisateur") {
      const clientProfile = await ctx.db
        .query("clientProfiles")
        .withIndex("by_user", (q) => q.eq("userId", session.userId))
        .first();

      if (!clientProfile?.coordinates) return null;

      return {
        coordinates: clientProfile.coordinates,
        city: clientProfile.city,
        location: clientProfile.location,
      };
    } else {
      // Annonceur (pro ou particulier)
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", session.userId))
        .first();

      if (!profile?.coordinates) return null;

      return {
        coordinates: profile.coordinates,
        city: profile.city,
        location: profile.location,
      };
    }
  },
});

// Mutation: Créer/mettre à jour profil client
export const upsertClientProfile = mutation({
  args: {
    token: v.string(),
    profileImageUrl: v.optional(v.union(v.string(), v.null())),
    coverImageUrl: v.optional(v.union(v.string(), v.null())),
    description: v.optional(v.union(v.string(), v.null())),
    location: v.optional(v.union(v.string(), v.null())),
    city: v.optional(v.union(v.string(), v.null())),
    postalCode: v.optional(v.union(v.string(), v.null())),
    coordinates: v.optional(v.union(
      v.object({ lat: v.number(), lng: v.number() }),
      v.null()
    )),
    googlePlaceId: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    // 1. Valider session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide ou expirée");
    }

    // 2. Récupérer l'utilisateur
    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new ConvexError("Utilisateur non trouvé");
    }

    // 3. Vérifier que c'est un client (utilisateur)
    if (user.accountType !== "utilisateur") {
      throw new ConvexError("Cette fonctionnalité est réservée aux clients");
    }

    const now = Date.now();

    // 4. Chercher un profil existant
    const existingProfile = await ctx.db
      .query("clientProfiles")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    // Préparer les données à mettre à jour (exclure token)
    const { token: _token, ...updateData } = args;

    // Convertir les valeurs null en undefined pour Convex
    const cleanedData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        cleanedData[key] = value === null ? undefined : value;
      }
    }

    if (existingProfile) {
      // 5a. Mettre à jour le profil existant
      await ctx.db.patch(existingProfile._id, {
        ...cleanedData,
        updatedAt: now,
      });
      return { success: true, profileId: existingProfile._id };
    } else {
      // 5b. Créer un nouveau profil
      const profileId = await ctx.db.insert("clientProfiles", {
        userId: session.userId,
        profileImageUrl: cleanedData.profileImageUrl as string | undefined,
        description: cleanedData.description as string | undefined,
        location: cleanedData.location as string | undefined,
        city: cleanedData.city as string | undefined,
        postalCode: cleanedData.postalCode as string | undefined,
        coordinates: cleanedData.coordinates as { lat: number; lng: number } | undefined,
        googlePlaceId: cleanedData.googlePlaceId as string | undefined,
        updatedAt: now,
      });
      return { success: true, profileId };
    }
  },
});

// Mutation: Mettre à jour uniquement la localisation
export const updateLocation = mutation({
  args: {
    token: v.string(),
    location: v.string(),
    city: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    coordinates: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
    googlePlaceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Valider session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide ou expirée");
    }

    const now = Date.now();

    // 2. Chercher un profil existant
    const existingProfile = await ctx.db
      .query("clientProfiles")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    const locationData = {
      location: args.location,
      city: args.city,
      postalCode: args.postalCode,
      coordinates: args.coordinates,
      googlePlaceId: args.googlePlaceId,
      updatedAt: now,
    };

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, locationData);
    } else {
      await ctx.db.insert("clientProfiles", {
        userId: session.userId,
        ...locationData,
      });
    }

    // 3. Synchroniser avec l'adresse par défaut dans clientAddresses
    const defaultAddress = await ctx.db
      .query("clientAddresses")
      .withIndex("by_user_default", (q) =>
        q.eq("userId", session.userId).eq("isDefault", true)
      )
      .first();

    if (defaultAddress) {
      // Mettre à jour l'adresse par défaut existante
      await ctx.db.patch(defaultAddress._id, {
        address: args.location,
        city: args.city,
        postalCode: args.postalCode,
        coordinates: args.coordinates,
        googlePlaceId: args.googlePlaceId,
        updatedAt: now,
      });
    } else {
      // Créer l'adresse par défaut si aucune n'existe
      await ctx.db.insert("clientAddresses", {
        userId: session.userId,
        label: "Mon adresse",
        address: args.location,
        city: args.city,
        postalCode: args.postalCode,
        coordinates: args.coordinates,
        googlePlaceId: args.googlePlaceId,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});
