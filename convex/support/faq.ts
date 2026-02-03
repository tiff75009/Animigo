// @ts-nocheck
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// Récupérer les catégories FAQ actives (filtrées par audience)
export const getFaqCategories = query({
  args: {
    audience: v.optional(v.union(v.literal("client"), v.literal("annonceur"))),
  },
  handler: async (ctx, args) => {
    const categories = await ctx.db
      .query("faqCategories")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Filtrer par audience si spécifié
    let filtered = categories;
    if (args.audience) {
      filtered = categories.filter(
        (cat) => cat.targetAudience === "all" || cat.targetAudience === args.audience
      );
    }

    // Trier par ordre
    filtered.sort((a, b) => a.order - b.order);

    // Compter les articles par catégorie
    const categoriesWithCount = await Promise.all(
      filtered.map(async (cat) => {
        const articles = await ctx.db
          .query("faqArticles")
          .withIndex("by_category", (q) => q.eq("categoryId", cat._id))
          .filter((q) => q.eq(q.field("isActive"), true))
          .collect();

        // Filtrer les articles par audience
        const audienceArticles = args.audience
          ? articles.filter(
              (art) => art.targetAudience === "all" || art.targetAudience === args.audience
            )
          : articles;

        return {
          ...cat,
          articleCount: audienceArticles.length,
        };
      })
    );

    return categoriesWithCount;
  },
});

// Récupérer les articles d'une catégorie
export const getFaqArticles = query({
  args: {
    categorySlug: v.string(),
    audience: v.optional(v.union(v.literal("client"), v.literal("annonceur"))),
  },
  handler: async (ctx, args) => {
    // Trouver la catégorie par slug
    const category = await ctx.db
      .query("faqCategories")
      .withIndex("by_slug", (q) => q.eq("slug", args.categorySlug))
      .first();

    if (!category || !category.isActive) {
      return { category: null, articles: [] };
    }

    // Récupérer les articles de cette catégorie
    const articles = await ctx.db
      .query("faqArticles")
      .withIndex("by_category", (q) => q.eq("categoryId", category._id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Filtrer par audience
    let filtered = articles;
    if (args.audience) {
      filtered = articles.filter(
        (art) => art.targetAudience === "all" || art.targetAudience === args.audience
      );
    }

    // Trier par ordre
    filtered.sort((a, b) => a.order - b.order);

    return {
      category,
      articles: filtered.map((art) => ({
        _id: art._id,
        title: art.title,
        slug: art.slug,
        viewCount: art.viewCount,
        helpfulCount: art.helpfulCount,
      })),
    };
  },
});

// Récupérer un article FAQ par slug
export const getFaqArticle = query({
  args: {
    articleSlug: v.string(),
    audience: v.optional(v.union(v.literal("client"), v.literal("annonceur"))),
  },
  handler: async (ctx, args) => {
    const article = await ctx.db
      .query("faqArticles")
      .withIndex("by_slug", (q) => q.eq("slug", args.articleSlug))
      .first();

    if (!article || !article.isActive) {
      return null;
    }

    // Vérifier l'audience
    if (args.audience && article.targetAudience !== "all" && article.targetAudience !== args.audience) {
      return null;
    }

    // Récupérer la catégorie
    const category = await ctx.db.get(article.categoryId);

    // Récupérer les articles connexes (même catégorie)
    const relatedArticles = await ctx.db
      .query("faqArticles")
      .withIndex("by_category", (q) => q.eq("categoryId", article.categoryId))
      .filter((q) =>
        q.and(
          q.eq(q.field("isActive"), true),
          q.neq(q.field("_id"), article._id)
        )
      )
      .take(3);

    return {
      article,
      category,
      relatedArticles: relatedArticles.map((art) => ({
        _id: art._id,
        title: art.title,
        slug: art.slug,
      })),
    };
  },
});

// Rechercher dans la FAQ
export const searchFaq = query({
  args: {
    query: v.string(),
    audience: v.optional(v.union(v.literal("client"), v.literal("annonceur"))),
  },
  handler: async (ctx, args) => {
    if (!args.query || args.query.length < 2) {
      return [];
    }

    const searchTerm = args.query.toLowerCase();

    // Récupérer tous les articles actifs
    const allArticles = await ctx.db
      .query("faqArticles")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Filtrer par audience et recherche
    const results = allArticles.filter((art) => {
      // Vérifier l'audience
      if (args.audience && art.targetAudience !== "all" && art.targetAudience !== args.audience) {
        return false;
      }

      // Rechercher dans le titre et le contenu
      const titleMatch = art.title.toLowerCase().includes(searchTerm);
      const contentMatch = art.content.toLowerCase().includes(searchTerm);

      return titleMatch || contentMatch;
    });

    // Récupérer les catégories pour l'affichage
    const categoriesMap = new Map();
    for (const art of results) {
      if (!categoriesMap.has(art.categoryId)) {
        const cat = await ctx.db.get(art.categoryId);
        if (cat) {
          categoriesMap.set(art.categoryId, cat);
        }
      }
    }

    // Trier par pertinence (titre match en premier)
    results.sort((a, b) => {
      const aInTitle = a.title.toLowerCase().includes(searchTerm);
      const bInTitle = b.title.toLowerCase().includes(searchTerm);
      if (aInTitle && !bInTitle) return -1;
      if (!aInTitle && bInTitle) return 1;
      return b.viewCount - a.viewCount;
    });

    return results.slice(0, 10).map((art) => ({
      _id: art._id,
      title: art.title,
      slug: art.slug,
      categoryName: categoriesMap.get(art.categoryId)?.name || "",
      categorySlug: categoriesMap.get(art.categoryId)?.slug || "",
    }));
  },
});

// Récupérer les articles populaires
export const getPopularArticles = query({
  args: {
    audience: v.optional(v.union(v.literal("client"), v.literal("annonceur"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 5;

    // Récupérer les articles triés par vues
    const articles = await ctx.db
      .query("faqArticles")
      .withIndex("by_views")
      .order("desc")
      .collect();

    // Filtrer par audience et actif
    const filtered = articles.filter((art) => {
      if (!art.isActive) return false;
      if (args.audience && art.targetAudience !== "all" && art.targetAudience !== args.audience) {
        return false;
      }
      return true;
    });

    // Récupérer les catégories
    const categoriesMap = new Map();
    for (const art of filtered.slice(0, limit)) {
      if (!categoriesMap.has(art.categoryId)) {
        const cat = await ctx.db.get(art.categoryId);
        if (cat) {
          categoriesMap.set(art.categoryId, cat);
        }
      }
    }

    return filtered.slice(0, limit).map((art) => ({
      _id: art._id,
      title: art.title,
      slug: art.slug,
      viewCount: art.viewCount,
      categoryName: categoriesMap.get(art.categoryId)?.name || "",
      categorySlug: categoriesMap.get(art.categoryId)?.slug || "",
    }));
  },
});

// Incrémenter le compteur de vues d'un article
export const incrementViewCount = mutation({
  args: {
    articleId: v.id("faqArticles"),
  },
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.articleId);
    if (!article) {
      throw new ConvexError("Article non trouvé");
    }

    await ctx.db.patch(args.articleId, {
      viewCount: article.viewCount + 1,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Voter si l'article est utile ou non
export const markArticleHelpful = mutation({
  args: {
    articleId: v.id("faqArticles"),
    helpful: v.boolean(),
  },
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.articleId);
    if (!article) {
      throw new ConvexError("Article non trouvé");
    }

    if (args.helpful) {
      await ctx.db.patch(args.articleId, {
        helpfulCount: article.helpfulCount + 1,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(args.articleId, {
        notHelpfulCount: article.notHelpfulCount + 1,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});
