import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// Récupérer les photos d'un utilisateur
export const getMyPhotos = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return [];
    }

    const photos = await ctx.db
      .query("photos")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .collect();

    // Trier par ordre et récupérer les URLs
    const sortedPhotos = photos.sort((a, b) => a.order - b.order);

    const photosWithUrls = await Promise.all(
      sortedPhotos.map(async (photo) => {
        const url = await ctx.storage.getUrl(photo.storageId);
        return {
          id: photo._id,
          url,
          title: photo.title,
          description: photo.description,
          order: photo.order,
          isProfilePhoto: photo.isProfilePhoto,
          createdAt: photo.createdAt,
        };
      })
    );

    return photosWithUrls;
  },
});

// Générer une URL d'upload
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

    const user = await ctx.db.get(session.userId);
    if (!user) throw new ConvexError("Utilisateur non trouvé");

    if (user.accountType === "utilisateur") {
      throw new ConvexError("Seuls les annonceurs peuvent ajouter des photos");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

// Enregistrer une photo après upload
export const savePhoto = mutation({
  args: {
    token: v.string(),
    storageId: v.id("_storage"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    isProfilePhoto: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) throw new ConvexError("Utilisateur non trouvé");

    if (user.accountType === "utilisateur") {
      throw new ConvexError("Seuls les annonceurs peuvent ajouter des photos");
    }

    // Compter les photos existantes pour l'ordre
    const existingPhotos = await ctx.db
      .query("photos")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .collect();

    // Si c'est une photo de profil, retirer le flag des autres
    if (args.isProfilePhoto) {
      for (const photo of existingPhotos) {
        if (photo.isProfilePhoto) {
          await ctx.db.patch(photo._id, { isProfilePhoto: false });
        }
      }
    }

    const photoId = await ctx.db.insert("photos", {
      userId: session.userId,
      storageId: args.storageId,
      title: args.title,
      description: args.description,
      order: existingPhotos.length,
      isProfilePhoto: args.isProfilePhoto || false,
      createdAt: Date.now(),
    });

    return { success: true, photoId };
  },
});

// Mettre à jour une photo
export const updatePhoto = mutation({
  args: {
    token: v.string(),
    photoId: v.id("photos"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    isProfilePhoto: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const photo = await ctx.db.get(args.photoId);
    if (!photo) throw new ConvexError("Photo non trouvée");

    if (photo.userId !== session.userId) {
      throw new ConvexError("Vous ne pouvez pas modifier cette photo");
    }

    // Si on définit comme photo de profil
    if (args.isProfilePhoto) {
      const otherPhotos = await ctx.db
        .query("photos")
        .withIndex("by_user", (q) => q.eq("userId", session.userId))
        .collect();

      for (const p of otherPhotos) {
        if (p._id !== args.photoId && p.isProfilePhoto) {
          await ctx.db.patch(p._id, { isProfilePhoto: false });
        }
      }
    }

    const updates: Record<string, unknown> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.isProfilePhoto !== undefined) updates.isProfilePhoto = args.isProfilePhoto;

    await ctx.db.patch(args.photoId, updates);

    return { success: true };
  },
});

// Supprimer une photo
export const deletePhoto = mutation({
  args: {
    token: v.string(),
    photoId: v.id("photos"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const photo = await ctx.db.get(args.photoId);
    if (!photo) throw new ConvexError("Photo non trouvée");

    if (photo.userId !== session.userId) {
      throw new ConvexError("Vous ne pouvez pas supprimer cette photo");
    }

    // Supprimer le fichier du storage
    await ctx.storage.delete(photo.storageId);

    // Supprimer l'entrée en base
    await ctx.db.delete(args.photoId);

    return { success: true };
  },
});

// Réordonner les photos
export const reorderPhotos = mutation({
  args: {
    token: v.string(),
    photoIds: v.array(v.id("photos")),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    // Mettre à jour l'ordre de chaque photo
    for (let i = 0; i < args.photoIds.length; i++) {
      const photo = await ctx.db.get(args.photoIds[i]);
      if (photo && photo.userId === session.userId) {
        await ctx.db.patch(args.photoIds[i], { order: i });
      }
    }

    return { success: true };
  },
});
