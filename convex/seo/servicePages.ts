import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../admin/utils";
import { ConvexError } from "convex/values";

// ============================================
// Helpers
// ============================================

/**
 * Génère l'URL du CTA primaire en fonction de la catégorie de service
 * - Si categorySlug === "garde" → /recherche?mode=garde
 * - Sinon → /recherche?mode=services&category={categorySlug}
 */
function generateCtaUrl(categorySlug: string): string {
  if (categorySlug === "garde") {
    return "/recherche?mode=garde";
  }
  return `/recherche?mode=services&category=${categorySlug}`;
}

// ============================================
// Queries publiques
// ============================================

// Liste les pages services actives (public)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const pages = await ctx.db
      .query("seoServicePages")
      .withIndex("by_active_order", (q) => q.eq("isActive", true))
      .collect();

    // Trier par ordre
    pages.sort((a, b) => a.order - b.order);

    // Récupérer les catégories et enrichir les pages
    const pagesWithData = await Promise.all(
      pages.map(async (page) => {
        // Récupérer la catégorie liée
        let category = null;
        if (page.serviceCategoryId) {
          category = await ctx.db.get(page.serviceCategoryId);
        }

        // Générer les URLs CTAs automatiquement
        const ctaPrimaryUrl = category
          ? generateCtaUrl(category.slug)
          : "/recherche";

        return {
          ...page,
          category: category ? {
            id: category._id,
            slug: category.slug,
            name: category.name,
            icon: category.icon,
            color: category.color,
          } : null,
          ctaPrimaryUrl,
          ctaSecondaryUrl: "/inscription",
          ctaPrimaryText: page.ctaPrimaryText || "Trouver un prestataire",
          ctaSecondaryText: page.ctaSecondaryText || "Devenir prestataire",
          thumbnailUrl: page.thumbnailUrl,
        };
      })
    );

    return pagesWithData;
  },
});

// Récupérer une page service par slug (public)
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("seoServicePages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!page || !page.isActive) {
      return null;
    }

    // Récupérer la catégorie liée
    let category = null;
    if (page.serviceCategoryId) {
      category = await ctx.db.get(page.serviceCategoryId);
    }

    // Générer les URLs CTAs automatiquement
    const ctaPrimaryUrl = category
      ? generateCtaUrl(category.slug)
      : "/recherche";

    return {
      ...page,
      category: category ? {
        id: category._id,
        slug: category.slug,
        name: category.name,
        icon: category.icon,
        color: category.color,
      } : null,
      ctaPrimaryUrl,
      ctaSecondaryUrl: "/inscription",
      ctaPrimaryText: page.ctaPrimaryText || "Trouver un prestataire",
      ctaSecondaryText: page.ctaSecondaryText || "Devenir prestataire",
      thumbnailUrl: page.thumbnailUrl,
    };
  },
});

// ============================================
// Queries admin
// ============================================

// Liste toutes les pages services (admin)
export const adminList = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const pages = await ctx.db
      .query("seoServicePages")
      .collect();

    // Trier par ordre
    pages.sort((a, b) => a.order - b.order);

    // Récupérer les catégories et enrichir les pages
    const pagesWithData = await Promise.all(
      pages.map(async (page) => {
        // Récupérer la catégorie liée
        let category = null;
        if (page.serviceCategoryId) {
          category = await ctx.db.get(page.serviceCategoryId);
        }

        // Compter les pages villes associées
        const cityPages = await ctx.db
          .query("seoServiceCityPages")
          .withIndex("by_service", (q) => q.eq("servicePageId", page._id))
          .collect();

        // Générer les URLs CTAs automatiquement
        const ctaPrimaryUrl = category
          ? generateCtaUrl(category.slug)
          : "/recherche";

        return {
          id: page._id,
          slug: page.slug,
          serviceCategoryId: page.serviceCategoryId,
          category: category ? {
            id: category._id,
            slug: category.slug,
            name: category.name,
            icon: category.icon,
            color: category.color,
          } : null,
          title: page.title,
          subtitle: page.subtitle,
          description: page.description,
          heroImageUrl: page.heroImageUrl,
          thumbnailUrl: page.thumbnailUrl,
          ctaPrimaryText: page.ctaPrimaryText || "Trouver un prestataire",
          ctaSecondaryText: page.ctaSecondaryText || "Devenir prestataire",
          ctaPrimaryUrl,
          ctaSecondaryUrl: "/inscription",
          features: page.features,
          descriptionCards: page.descriptionCards,
          metaTitle: page.metaTitle,
          metaDescription: page.metaDescription,
          isActive: page.isActive,
          order: page.order,
          cityPagesCount: cityPages.length,
          activeCityPagesCount: cityPages.filter(cp => cp.isActive).length,
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
        };
      })
    );

    return pagesWithData;
  },
});

// Récupérer une page service par ID (admin)
export const adminGet = query({
  args: {
    token: v.string(),
    pageId: v.id("seoServicePages"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const page = await ctx.db.get(args.pageId);
    if (!page) {
      return null;
    }

    // Récupérer la catégorie liée
    let category = null;
    if (page.serviceCategoryId) {
      category = await ctx.db.get(page.serviceCategoryId);
    }

    // Générer les URLs CTAs automatiquement
    const ctaPrimaryUrl = category
      ? generateCtaUrl(category.slug)
      : "/recherche";

    return {
      ...page,
      id: page._id,
      category: category ? {
        id: category._id,
        slug: category.slug,
        name: category.name,
        icon: category.icon,
        color: category.color,
      } : null,
      ctaPrimaryUrl,
      ctaSecondaryUrl: "/inscription",
      ctaPrimaryText: page.ctaPrimaryText || "Trouver un prestataire",
      ctaSecondaryText: page.ctaSecondaryText || "Devenir prestataire",
      thumbnailUrl: page.thumbnailUrl,
    };
  },
});

// ============================================
// Mutations admin
// ============================================

// Créer une page service
export const create = mutation({
  args: {
    token: v.string(),
    slug: v.string(),
    serviceCategoryId: v.optional(v.id("serviceCategories")),
    title: v.string(),
    subtitle: v.optional(v.string()),
    description: v.string(),
    heroImageUrl: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    ctaPrimaryText: v.optional(v.string()),
    ctaSecondaryText: v.optional(v.string()),
    features: v.array(v.object({
      icon: v.optional(v.string()),
      title: v.string(),
      description: v.optional(v.string()),
    })),
    descriptionCards: v.array(v.object({
      title: v.string(),
      content: v.string(),
      icon: v.optional(v.string()),
    })),
    metaTitle: v.string(),
    metaDescription: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    // Vérifier que le slug est unique
    const existing = await ctx.db
      .query("seoServicePages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      throw new ConvexError("Une page service avec ce slug existe déjà");
    }

    // Vérifier que la catégorie existe si fournie
    if (args.serviceCategoryId) {
      const category = await ctx.db.get(args.serviceCategoryId);
      if (!category) {
        throw new ConvexError("Catégorie de service non trouvée");
      }
    }

    // Trouver l'ordre max
    const allPages = await ctx.db.query("seoServicePages").collect();
    const maxOrder = allPages.reduce((max, page) => Math.max(max, page.order), -1);

    const now = Date.now();

    const pageId = await ctx.db.insert("seoServicePages", {
      slug: args.slug.toLowerCase().replace(/\s+/g, "-"),
      serviceCategoryId: args.serviceCategoryId,
      title: args.title,
      subtitle: args.subtitle,
      description: args.description,
      heroImageUrl: args.heroImageUrl,
      thumbnailUrl: args.thumbnailUrl,
      ctaPrimaryText: args.ctaPrimaryText,
      ctaSecondaryText: args.ctaSecondaryText,
      features: args.features,
      descriptionCards: args.descriptionCards,
      metaTitle: args.metaTitle,
      metaDescription: args.metaDescription,
      isActive: true,
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, pageId };
  },
});

// Mettre à jour une page service
export const update = mutation({
  args: {
    token: v.string(),
    pageId: v.id("seoServicePages"),
    slug: v.optional(v.string()),
    serviceCategoryId: v.optional(v.union(v.id("serviceCategories"), v.null())),
    title: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    description: v.optional(v.string()),
    heroImageUrl: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    ctaPrimaryText: v.optional(v.string()),
    ctaSecondaryText: v.optional(v.string()),
    features: v.optional(v.array(v.object({
      icon: v.optional(v.string()),
      title: v.string(),
      description: v.optional(v.string()),
    }))),
    descriptionCards: v.optional(v.array(v.object({
      title: v.string(),
      content: v.string(),
      icon: v.optional(v.string()),
    }))),
    metaTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const page = await ctx.db.get(args.pageId);
    if (!page) {
      throw new ConvexError("Page service non trouvée");
    }

    // Si le slug change, vérifier qu'il est unique
    if (args.slug && args.slug !== page.slug) {
      const newSlug = args.slug;
      const existing = await ctx.db
        .query("seoServicePages")
        .withIndex("by_slug", (q) => q.eq("slug", newSlug))
        .first();

      if (existing) {
        throw new ConvexError("Une page service avec ce slug existe déjà");
      }
    }

    // Vérifier que la catégorie existe si fournie
    if (args.serviceCategoryId !== undefined && args.serviceCategoryId !== null) {
      const category = await ctx.db.get(args.serviceCategoryId);
      if (!category) {
        throw new ConvexError("Catégorie de service non trouvée");
      }
    }

    // Construire les mises à jour
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = { updatedAt: Date.now() };

    if (args.slug !== undefined) updates.slug = args.slug.toLowerCase().replace(/\s+/g, "-");
    if (args.serviceCategoryId !== undefined) {
      updates.serviceCategoryId = args.serviceCategoryId === null ? undefined : args.serviceCategoryId;
    }
    if (args.title !== undefined) updates.title = args.title;
    if (args.subtitle !== undefined) updates.subtitle = args.subtitle;
    if (args.description !== undefined) updates.description = args.description;
    if (args.heroImageUrl !== undefined) updates.heroImageUrl = args.heroImageUrl;
    if (args.thumbnailUrl !== undefined) updates.thumbnailUrl = args.thumbnailUrl;
    if (args.ctaPrimaryText !== undefined) updates.ctaPrimaryText = args.ctaPrimaryText;
    if (args.ctaSecondaryText !== undefined) updates.ctaSecondaryText = args.ctaSecondaryText;
    if (args.features !== undefined) updates.features = args.features;
    if (args.descriptionCards !== undefined) updates.descriptionCards = args.descriptionCards;
    if (args.metaTitle !== undefined) updates.metaTitle = args.metaTitle;
    if (args.metaDescription !== undefined) updates.metaDescription = args.metaDescription;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.pageId, updates);

    return { success: true };
  },
});

// Supprimer une page service
export const delete_ = mutation({
  args: {
    token: v.string(),
    pageId: v.id("seoServicePages"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const page = await ctx.db.get(args.pageId);
    if (!page) {
      throw new ConvexError("Page service non trouvée");
    }

    // Supprimer toutes les pages ville associées
    const cityPages = await ctx.db
      .query("seoServiceCityPages")
      .withIndex("by_service", (q) => q.eq("servicePageId", args.pageId))
      .collect();

    for (const cityPage of cityPages) {
      await ctx.db.delete(cityPage._id);
    }

    await ctx.db.delete(args.pageId);

    return { success: true, deletedCityPages: cityPages.length };
  },
});

// Réordonner les pages services
export const reorder = mutation({
  args: {
    token: v.string(),
    pageIds: v.array(v.id("seoServicePages")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    for (let i = 0; i < args.pageIds.length; i++) {
      await ctx.db.patch(args.pageIds[i], {
        order: i,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Toggle actif/inactif
export const toggleActive = mutation({
  args: {
    token: v.string(),
    pageId: v.id("seoServicePages"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const page = await ctx.db.get(args.pageId);
    if (!page) {
      throw new ConvexError("Page service non trouvée");
    }

    await ctx.db.patch(args.pageId, {
      isActive: !page.isActive,
      updatedAt: Date.now(),
    });

    return { success: true, isActive: !page.isActive };
  },
});
