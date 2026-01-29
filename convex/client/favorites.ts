import { v } from "convex/values";
import { query, mutation } from "../_generated/server";

// Helper pour valider la session
async function validateSession(ctx: any, token: string) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();

  if (!session || session.expiresAt < Date.now()) {
    return null;
  }

  return session;
}

// Récupérer tous les favoris d'un utilisateur
export const list = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await validateSession(ctx, args.token);
    if (!session) return [];

    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .order("desc")
      .collect();

    // Enrichir avec les données actuelles
    const enrichedFavorites = await Promise.all(
      favorites.map(async (fav) => {
        // Récupérer la formule actuelle pour avoir le prix à jour
        const formule = await ctx.db.get(fav.formuleId);
        const announcer = await ctx.db.get(fav.announcerId);

        // Récupérer la photo de profil de l'annonceur
        let profileImageUrl: string | null = null;
        if (announcer) {
          // D'abord vérifier profiles
          const profile = await ctx.db
            .query("profiles")
            .withIndex("by_user", (q: any) => q.eq("userId", announcer._id))
            .first();

          if (profile?.profileImageUrl) {
            profileImageUrl = profile.profileImageUrl;
          } else {
            // Sinon chercher dans photos
            const profilePhoto = await ctx.db
              .query("photos")
              .withIndex("by_user", (q: any) => q.eq("userId", announcer._id))
              .filter((q: any) => q.eq(q.field("isProfilePhoto"), true))
              .first();
            if (profilePhoto?.storageId) {
              profileImageUrl = await ctx.storage.getUrl(profilePhoto.storageId);
            }
          }
        }

        // Récupérer le service et la catégorie
        let categoryIcon: string | undefined;
        if (formule) {
          const service = await ctx.db.get(formule.serviceId);
          if (service) {
            const category = await ctx.db
              .query("serviceCategories")
              .withIndex("by_slug", (q) => q.eq("slug", service.category))
              .first();
            categoryIcon = category?.icon;
          }
        }

        return {
          ...fav,
          // Données mises à jour
          currentPrice: formule?.price ?? fav.price,
          currentPriceUnit: formule?.priceUnit ?? fav.priceUnit,
          isAvailable: formule?.isActive ?? false,
          announcerProfileImage: profileImageUrl,
          categoryIcon,
        };
      })
    );

    return enrichedFavorites;
  },
});

// Vérifier si une formule est en favoris
export const isFavorite = query({
  args: { token: v.string(), formuleId: v.id("serviceVariants") },
  handler: async (ctx, args) => {
    const session = await validateSession(ctx, args.token);
    if (!session) return false;

    const favorite = await ctx.db
      .query("favorites")
      .withIndex("by_user_formule", (q) =>
        q.eq("userId", session.userId).eq("formuleId", args.formuleId)
      )
      .first();

    return !!favorite;
  },
});

// Récupérer les IDs des formules favorites (pour affichage rapide)
export const getFavoriteIds = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await validateSession(ctx, args.token);
    if (!session) return [];

    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .collect();

    return favorites.map((f) => f.formuleId);
  },
});

// Ajouter une formule aux favoris
export const add = mutation({
  args: {
    token: v.string(),
    formuleId: v.id("serviceVariants"),
  },
  handler: async (ctx, args) => {
    const session = await validateSession(ctx, args.token);
    if (!session) throw new Error("Non authentifié");

    // Vérifier si déjà en favoris
    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_user_formule", (q) =>
        q.eq("userId", session.userId).eq("formuleId", args.formuleId)
      )
      .first();

    if (existing) return existing._id;

    // Récupérer les données de la formule
    const formule = await ctx.db.get(args.formuleId);
    if (!formule) throw new Error("Formule introuvable");

    const service = await ctx.db.get(formule.serviceId);
    if (!service) throw new Error("Service introuvable");

    const announcer = await ctx.db.get(service.userId);
    if (!announcer) throw new Error("Annonceur introuvable");

    const category = await ctx.db
      .query("serviceCategories")
      .withIndex("by_slug", (q) => q.eq("slug", service.category))
      .first();

    // Créer le favori
    const favoriteId = await ctx.db.insert("favorites", {
      userId: session.userId,
      formuleId: args.formuleId,
      formuleName: formule.name,
      announcerId: announcer._id,
      announcerName: announcer.firstName,
      announcerSlug: announcer.slug,
      categorySlug: service.category,
      categoryName: category?.name ?? service.category,
      price: formule.price,
      priceUnit: formule.priceUnit,
      createdAt: Date.now(),
    });

    return favoriteId;
  },
});

// Supprimer une formule des favoris
export const remove = mutation({
  args: {
    token: v.string(),
    formuleId: v.id("serviceVariants"),
  },
  handler: async (ctx, args) => {
    const session = await validateSession(ctx, args.token);
    if (!session) throw new Error("Non authentifié");

    const favorite = await ctx.db
      .query("favorites")
      .withIndex("by_user_formule", (q) =>
        q.eq("userId", session.userId).eq("formuleId", args.formuleId)
      )
      .first();

    if (favorite) {
      await ctx.db.delete(favorite._id);
    }

    return true;
  },
});

// Toggle favori (ajoute si pas présent, supprime si présent)
export const toggle = mutation({
  args: {
    token: v.string(),
    formuleId: v.id("serviceVariants"),
  },
  handler: async (ctx, args) => {
    const session = await validateSession(ctx, args.token);
    if (!session) throw new Error("Non authentifié");

    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_user_formule", (q) =>
        q.eq("userId", session.userId).eq("formuleId", args.formuleId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { action: "removed" as const, isFavorite: false };
    }

    // Récupérer les données de la formule
    const formule = await ctx.db.get(args.formuleId);
    if (!formule) throw new Error("Formule introuvable");

    const service = await ctx.db.get(formule.serviceId);
    if (!service) throw new Error("Service introuvable");

    const announcer = await ctx.db.get(service.userId);
    if (!announcer) throw new Error("Annonceur introuvable");

    const category = await ctx.db
      .query("serviceCategories")
      .withIndex("by_slug", (q) => q.eq("slug", service.category))
      .first();

    await ctx.db.insert("favorites", {
      userId: session.userId,
      formuleId: args.formuleId,
      formuleName: formule.name,
      announcerId: announcer._id,
      announcerName: announcer.firstName,
      announcerSlug: announcer.slug,
      categorySlug: service.category,
      categoryName: category?.name ?? service.category,
      price: formule.price,
      priceUnit: formule.priceUnit,
      createdAt: Date.now(),
    });

    return { action: "added" as const, isFavorite: true };
  },
});
