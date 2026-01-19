import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// Types d'animaux disponibles
export const ANIMAL_TYPES = [
  { id: "chien", name: "Chien", emoji: "🐕" },
  { id: "chat", name: "Chat", emoji: "🐱" },
  { id: "oiseau", name: "Oiseau", emoji: "🐦" },
  { id: "rongeur", name: "Rongeur", emoji: "🐹" },
  { id: "poisson", name: "Poisson", emoji: "🐠" },
  { id: "reptile", name: "Reptile", emoji: "🦎" },
  { id: "nac", name: "NAC", emoji: "🐾" },
];

// Traits de compatibilité disponibles
export const COMPATIBILITY_TRAITS = [
  "Ne s'entend pas avec les mâles",
  "Ne s'entend pas avec les femelles",
  "Ne s'entend pas avec les chiens",
  "Ne s'entend pas avec les chats",
  "Ne s'entend pas avec les enfants",
  "Ne s'entend pas avec les autres animaux",
];

// Traits de comportement disponibles
export const BEHAVIOR_TRAITS = [
  "Anxieux",
  "Peureux",
  "Agressif",
  "Joueur",
  "Calme",
  "Énergique",
  "Sociable",
  "Indépendant",
  "Affectueux",
  "Territorial",
];

// Traits de besoins disponibles
export const NEEDS_TRAITS = [
  "A besoin de se dépenser",
  "Demande beaucoup d'attention",
  "Régime alimentaire spécial",
  "Besoin de sorties fréquentes",
  "Nécessite un environnement calme",
  "Traitement médical régulier",
];

// Récupérer les animaux d'un utilisateur
export const getUserAnimals = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return [];
    }

    const animals = await ctx.db
      .query("animals")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", session.userId).eq("isActive", true)
      )
      .collect();

    // Pour chaque animal, générer les URLs des photos
    const animalsWithPhotoUrls = await Promise.all(
      animals.map(async (animal) => {
        let photoUrls: { url: string; isPrimary: boolean; order: number }[] = [];

        if (animal.photos && animal.photos.length > 0) {
          photoUrls = await Promise.all(
            animal.photos.map(async (photo) => {
              const url = await ctx.storage.getUrl(photo.storageId);
              return {
                url: url || "",
                isPrimary: photo.isPrimary,
                order: photo.order,
              };
            })
          );
          // Trier par ordre
          photoUrls.sort((a, b) => a.order - b.order);
        }

        // Trouver le type d'animal pour l'emoji
        const animalType = ANIMAL_TYPES.find((t) => t.id === animal.type);

        return {
          id: animal._id,
          name: animal.name,
          type: animal.type,
          emoji: animalType?.emoji || "🐾",
          breed: animal.breed,
          gender: animal.gender,
          birthDate: animal.birthDate,
          description: animal.description,
          photos: photoUrls,
          primaryPhotoUrl: photoUrls.find((p) => p.isPrimary)?.url || photoUrls[0]?.url || null,
          compatibilityTraits: animal.compatibilityTraits || [],
          behaviorTraits: animal.behaviorTraits || [],
          needsTraits: animal.needsTraits || [],
          customTraits: animal.customTraits || [],
          specialNeeds: animal.specialNeeds,
          medicalConditions: animal.medicalConditions,
          createdAt: animal.createdAt,
        };
      })
    );

    return animalsWithPhotoUrls;
  },
});

// Récupérer un animal spécifique
export const getAnimal = query({
  args: {
    token: v.string(),
    animalId: v.id("animals"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    const animal = await ctx.db.get(args.animalId);

    if (!animal || animal.userId !== session.userId) {
      return null;
    }

    // Générer les URLs des photos
    let photoUrls: { url: string; isPrimary: boolean; order: number; storageId: string }[] = [];

    if (animal.photos && animal.photos.length > 0) {
      photoUrls = await Promise.all(
        animal.photos.map(async (photo) => {
          const url = await ctx.storage.getUrl(photo.storageId);
          return {
            url: url || "",
            isPrimary: photo.isPrimary,
            order: photo.order,
            storageId: photo.storageId,
          };
        })
      );
      photoUrls.sort((a, b) => a.order - b.order);
    }

    const animalType = ANIMAL_TYPES.find((t) => t.id === animal.type);

    return {
      id: animal._id,
      name: animal.name,
      type: animal.type,
      emoji: animalType?.emoji || "🐾",
      breed: animal.breed,
      gender: animal.gender,
      birthDate: animal.birthDate,
      description: animal.description,
      photos: photoUrls,
      primaryPhotoUrl: photoUrls.find((p) => p.isPrimary)?.url || photoUrls[0]?.url || null,
      compatibilityTraits: animal.compatibilityTraits || [],
      behaviorTraits: animal.behaviorTraits || [],
      needsTraits: animal.needsTraits || [],
      customTraits: animal.customTraits || [],
      specialNeeds: animal.specialNeeds,
      medicalConditions: animal.medicalConditions,
      createdAt: animal.createdAt,
      updatedAt: animal.updatedAt,
    };
  },
});

// Créer une fiche animal
export const createAnimal = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    type: v.string(),
    gender: v.union(v.literal("male"), v.literal("female"), v.literal("unknown")),
    breed: v.optional(v.string()),
    birthDate: v.optional(v.string()),
    description: v.optional(v.string()),
    photos: v.optional(v.array(v.object({
      storageId: v.id("_storage"),
      isPrimary: v.boolean(),
      order: v.number(),
    }))),
    compatibilityTraits: v.optional(v.array(v.string())),
    behaviorTraits: v.optional(v.array(v.string())),
    needsTraits: v.optional(v.array(v.string())),
    customTraits: v.optional(v.array(v.string())),
    specialNeeds: v.optional(v.string()),
    medicalConditions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    // Validation du nom
    if (!args.name || args.name.trim().length === 0) {
      throw new ConvexError("Le nom de l'animal est requis");
    }

    if (args.name.length > 50) {
      throw new ConvexError("Le nom de l'animal ne peut pas dépasser 50 caractères");
    }

    // Validation du type
    const validType = ANIMAL_TYPES.find((t) => t.id === args.type);
    if (!validType) {
      throw new ConvexError("Type d'animal invalide");
    }

    const now = Date.now();

    const animalId = await ctx.db.insert("animals", {
      userId: session.userId,
      name: args.name.trim(),
      type: args.type,
      gender: args.gender,
      breed: args.breed?.trim() || undefined,
      birthDate: args.birthDate || undefined,
      description: args.description?.trim() || undefined,
      photos: args.photos || undefined,
      compatibilityTraits: args.compatibilityTraits || undefined,
      behaviorTraits: args.behaviorTraits || undefined,
      needsTraits: args.needsTraits || undefined,
      customTraits: args.customTraits || undefined,
      specialNeeds: args.specialNeeds?.trim() || undefined,
      medicalConditions: args.medicalConditions?.trim() || undefined,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, animalId };
  },
});

// Modifier une fiche animal
export const updateAnimal = mutation({
  args: {
    token: v.string(),
    animalId: v.id("animals"),
    name: v.optional(v.string()),
    type: v.optional(v.string()),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("unknown"))),
    breed: v.optional(v.string()),
    birthDate: v.optional(v.string()),
    description: v.optional(v.string()),
    photos: v.optional(v.array(v.object({
      storageId: v.id("_storage"),
      isPrimary: v.boolean(),
      order: v.number(),
    }))),
    compatibilityTraits: v.optional(v.array(v.string())),
    behaviorTraits: v.optional(v.array(v.string())),
    needsTraits: v.optional(v.array(v.string())),
    customTraits: v.optional(v.array(v.string())),
    specialNeeds: v.optional(v.string()),
    medicalConditions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const animal = await ctx.db.get(args.animalId);

    if (!animal) {
      throw new ConvexError("Animal non trouvé");
    }

    if (animal.userId !== session.userId) {
      throw new ConvexError("Vous ne pouvez pas modifier cet animal");
    }

    // Validation du nom si fourni
    if (args.name !== undefined) {
      if (!args.name || args.name.trim().length === 0) {
        throw new ConvexError("Le nom de l'animal est requis");
      }
      if (args.name.length > 50) {
        throw new ConvexError("Le nom de l'animal ne peut pas dépasser 50 caractères");
      }
    }

    // Validation du type si fourni
    if (args.type !== undefined) {
      const validType = ANIMAL_TYPES.find((t) => t.id === args.type);
      if (!validType) {
        throw new ConvexError("Type d'animal invalide");
      }
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.name !== undefined) updates.name = args.name.trim();
    if (args.type !== undefined) updates.type = args.type;
    if (args.gender !== undefined) updates.gender = args.gender;
    if (args.breed !== undefined) updates.breed = args.breed.trim() || undefined;
    if (args.birthDate !== undefined) updates.birthDate = args.birthDate || undefined;
    if (args.description !== undefined) updates.description = args.description.trim() || undefined;
    if (args.photos !== undefined) updates.photos = args.photos;
    if (args.compatibilityTraits !== undefined) updates.compatibilityTraits = args.compatibilityTraits;
    if (args.behaviorTraits !== undefined) updates.behaviorTraits = args.behaviorTraits;
    if (args.needsTraits !== undefined) updates.needsTraits = args.needsTraits;
    if (args.customTraits !== undefined) updates.customTraits = args.customTraits;
    if (args.specialNeeds !== undefined) updates.specialNeeds = args.specialNeeds.trim() || undefined;
    if (args.medicalConditions !== undefined) updates.medicalConditions = args.medicalConditions.trim() || undefined;

    await ctx.db.patch(args.animalId, updates);

    return { success: true };
  },
});

// Supprimer une fiche animal (soft delete)
export const deleteAnimal = mutation({
  args: {
    token: v.string(),
    animalId: v.id("animals"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const animal = await ctx.db.get(args.animalId);

    if (!animal) {
      throw new ConvexError("Animal non trouvé");
    }

    if (animal.userId !== session.userId) {
      throw new ConvexError("Vous ne pouvez pas supprimer cet animal");
    }

    // Soft delete
    await ctx.db.patch(args.animalId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Générer une URL d'upload pour une photo d'animal
export const generateUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

// Supprimer une photo du storage
export const deletePhoto = mutation({
  args: {
    token: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    await ctx.storage.delete(args.storageId);

    return { success: true };
  },
});
