import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";

/** Nombre maximum de photos par service. */
const MAX_PHOTOS_PER_SERVICE = 3;

/**
 * Validation partagée : vérifie que l'utilisateur est authentifié et
 * propriétaire du service.
 */
async function requireServiceOwner(ctx: any, token: string, serviceId: Id<"services">) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();
  if (!session || session.expiresAt < Date.now()) {
    throw new ConvexError("Session invalide");
  }
  const service = await ctx.db.get(serviceId);
  if (!service) throw new ConvexError("Service introuvable");
  if (service.userId !== session.userId) {
    throw new ConvexError("Vous n'êtes pas propriétaire de ce service");
  }
  return { session, service };
}

/**
 * Ajoute une URL de photo à un service (déjà uploadée sur Cloudinary).
 * Bloque au-delà de 3 photos.
 */
export const addServicePhoto = mutation({
  args: {
    token: v.string(),
    serviceId: v.id("services"),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const { service } = await requireServiceOwner(ctx, args.token, args.serviceId);
    const photos = service.photos ?? [];
    if (photos.length >= MAX_PHOTOS_PER_SERVICE) {
      throw new ConvexError(
        `Maximum ${MAX_PHOTOS_PER_SERVICE} photos par service. Supprimez-en une avant d'en ajouter.`
      );
    }
    const nextOrder = photos.length;
    const newPhoto = { url: args.url, order: nextOrder };
    await ctx.db.patch(args.serviceId, {
      photos: [...photos, newPhoto],
      updatedAt: Date.now(),
    });
    return newPhoto;
  },
});

/**
 * Supprime une photo d'un service par URL. Ré-ordonne les photos restantes.
 */
export const deleteServicePhoto = mutation({
  args: {
    token: v.string(),
    serviceId: v.id("services"),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const { service } = await requireServiceOwner(ctx, args.token, args.serviceId);
    const photos = service.photos ?? [];
    const idx = photos.findIndex((p: any) => p.url === args.url);
    if (idx === -1) {
      throw new ConvexError("Photo introuvable sur ce service");
    }
    const remaining = photos
      .filter((_: any, i: number) => i !== idx)
      .map((p: any, i: number) => ({ ...p, order: i }));
    await ctx.db.patch(args.serviceId, {
      photos: remaining,
      updatedAt: Date.now(),
    });
    return { remaining };
  },
});

/**
 * Remplace complètement les photos d'un service (utile pour le form
 * de création/édition où les photos sont uploadées avant le submit).
 */
export const setServicePhotos = mutation({
  args: {
    token: v.string(),
    serviceId: v.id("services"),
    urls: v.array(v.string()), // max 3, ordonnées
  },
  handler: async (ctx, args) => {
    const { service } = await requireServiceOwner(ctx, args.token, args.serviceId);
    const urls = args.urls.slice(0, MAX_PHOTOS_PER_SERVICE);
    const photos = urls.map((url, order) => ({ url, order }));
    await ctx.db.patch(args.serviceId, {
      photos,
      updatedAt: Date.now(),
    });
    return { photos };
  },
});

/**
 * Récupère les photos d'un service (public).
 */
export const getServicePhotos = query({
  args: { serviceId: v.id("services") },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.serviceId);
    if (!service) return [];
    const photos = (service.photos ?? []).slice().sort((a: any, b: any) => a.order - b.order);
    return photos;
  },
});
