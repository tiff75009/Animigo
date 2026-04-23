import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";

/** Nombre maximum de photos par formule (variant). */
const MAX_PHOTOS_PER_VARIANT = 3;

/** Vérifie que l'utilisateur est propriétaire du service parent de la formule. */
async function requireVariantOwner(ctx: any, token: string, variantId: Id<"serviceVariants">) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();
  if (!session || session.expiresAt < Date.now()) {
    throw new ConvexError("Session invalide");
  }
  const variant = await ctx.db.get(variantId);
  if (!variant) throw new ConvexError("Formule introuvable");
  const service = await ctx.db.get(variant.serviceId);
  if (!service) throw new ConvexError("Service introuvable");
  if (service.userId !== session.userId) {
    throw new ConvexError("Vous n'êtes pas propriétaire de cette formule");
  }
  return { session, variant, service };
}

/** Ajoute une photo à une formule. */
export const addVariantPhoto = mutation({
  args: {
    token: v.string(),
    variantId: v.id("serviceVariants"),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const { variant } = await requireVariantOwner(ctx, args.token, args.variantId);
    const photos = variant.photos ?? [];
    if (photos.length >= MAX_PHOTOS_PER_VARIANT) {
      throw new ConvexError(
        `Maximum ${MAX_PHOTOS_PER_VARIANT} photos par formule. Supprimez-en une avant d'en ajouter.`
      );
    }
    const newPhoto = { url: args.url, order: photos.length };
    await ctx.db.patch(args.variantId, {
      photos: [...photos, newPhoto],
      updatedAt: Date.now(),
    });
    return newPhoto;
  },
});

/** Supprime une photo (par URL) d'une formule. */
export const deleteVariantPhoto = mutation({
  args: {
    token: v.string(),
    variantId: v.id("serviceVariants"),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const { variant } = await requireVariantOwner(ctx, args.token, args.variantId);
    const photos = variant.photos ?? [];
    const idx = photos.findIndex((p: any) => p.url === args.url);
    if (idx === -1) {
      throw new ConvexError("Photo introuvable sur cette formule");
    }
    const remaining = photos
      .filter((_: any, i: number) => i !== idx)
      .map((p: any, i: number) => ({ ...p, order: i }));
    await ctx.db.patch(args.variantId, {
      photos: remaining,
      updatedAt: Date.now(),
    });
    return { remaining };
  },
});

/** Remplace complètement les photos d'une formule (pour le form de création). */
export const setVariantPhotos = mutation({
  args: {
    token: v.string(),
    variantId: v.id("serviceVariants"),
    urls: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { variant: _variant } = await requireVariantOwner(ctx, args.token, args.variantId);
    const urls = args.urls.slice(0, MAX_PHOTOS_PER_VARIANT);
    const photos = urls.map((url, order) => ({ url, order }));
    await ctx.db.patch(args.variantId, {
      photos,
      updatedAt: Date.now(),
    });
    return { photos };
  },
});

/** Récupère les photos d'une formule (public). */
export const getVariantPhotos = query({
  args: { variantId: v.id("serviceVariants") },
  handler: async (ctx, args) => {
    const variant = await ctx.db.get(args.variantId);
    if (!variant) return [];
    return (variant.photos ?? []).slice().sort((a: any, b: any) => a.order - b.order);
  },
});
