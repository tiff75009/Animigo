// @ts-nocheck
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { checkAdmin } from "./utils";

// ============================================
// CATÉGORIES
// ============================================

// Récupérer toutes les catégories (admin)
export const getAllCategories = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const adminResult = await checkAdmin(ctx, args.sessionToken);
    if (!adminResult.success) {
      return { success: false, error: adminResult.error, categories: [] };
    }

    const categories = await ctx.db.query("faqCategories").collect();
    categories.sort((a, b) => a.order - b.order);

    // Compter les articles par catégorie
    const categoriesWithStats = await Promise.all(
      categories.map(async (cat) => {
        const articles = await ctx.db
          .query("faqArticles")
          .withIndex("by_category", (q) => q.eq("categoryId", cat._id))
          .collect();

        const totalViews = articles.reduce((acc, art) => acc + art.viewCount, 0);
        const totalHelpful = articles.reduce((acc, art) => acc + art.helpfulCount, 0);
        const totalNotHelpful = articles.reduce((acc, art) => acc + art.notHelpfulCount, 0);

        return {
          ...cat,
          articleCount: articles.length,
          activeArticleCount: articles.filter((a) => a.isActive).length,
          totalViews,
          helpfulRatio: totalHelpful + totalNotHelpful > 0
            ? Math.round((totalHelpful / (totalHelpful + totalNotHelpful)) * 100)
            : null,
        };
      })
    );

    return { success: true, categories: categoriesWithStats };
  },
});

// Créer une catégorie
export const createCategory = mutation({
  args: {
    sessionToken: v.string(),
    name: v.string(),
    slug: v.string(),
    icon: v.string(),
    targetAudience: v.union(v.literal("all"), v.literal("client"), v.literal("annonceur")),
  },
  handler: async (ctx, args) => {
    const adminResult = await checkAdmin(ctx, args.sessionToken);
    if (!adminResult.success) {
      throw new ConvexError(adminResult.error);
    }

    // Vérifier que le slug est unique
    const existing = await ctx.db
      .query("faqCategories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      throw new ConvexError("Ce slug existe déjà");
    }

    // Trouver le prochain ordre
    const categories = await ctx.db.query("faqCategories").collect();
    const maxOrder = categories.length > 0 ? Math.max(...categories.map((c) => c.order)) : -1;

    const now = Date.now();

    const categoryId = await ctx.db.insert("faqCategories", {
      name: args.name.trim(),
      slug: args.slug.toLowerCase().trim(),
      icon: args.icon,
      order: maxOrder + 1,
      isActive: true,
      targetAudience: args.targetAudience,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, categoryId };
  },
});

// Modifier une catégorie
export const updateCategory = mutation({
  args: {
    sessionToken: v.string(),
    categoryId: v.id("faqCategories"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    icon: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    targetAudience: v.optional(v.union(v.literal("all"), v.literal("client"), v.literal("annonceur"))),
  },
  handler: async (ctx, args) => {
    const adminResult = await checkAdmin(ctx, args.sessionToken);
    if (!adminResult.success) {
      throw new ConvexError(adminResult.error);
    }

    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new ConvexError("Catégorie non trouvée");
    }

    // Si le slug change, vérifier qu'il est unique
    if (args.slug && args.slug !== category.slug) {
      const existing = await ctx.db
        .query("faqCategories")
        .withIndex("by_slug", (q) => q.eq("slug", args.slug))
        .first();

      if (existing) {
        throw new ConvexError("Ce slug existe déjà");
      }
    }

    const updates: any = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name.trim();
    if (args.slug !== undefined) updates.slug = args.slug.toLowerCase().trim();
    if (args.icon !== undefined) updates.icon = args.icon;
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    if (args.targetAudience !== undefined) updates.targetAudience = args.targetAudience;

    await ctx.db.patch(args.categoryId, updates);

    return { success: true };
  },
});

// Supprimer une catégorie
export const deleteCategory = mutation({
  args: {
    sessionToken: v.string(),
    categoryId: v.id("faqCategories"),
  },
  handler: async (ctx, args) => {
    const adminResult = await checkAdmin(ctx, args.sessionToken);
    if (!adminResult.success) {
      throw new ConvexError(adminResult.error);
    }

    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new ConvexError("Catégorie non trouvée");
    }

    // Vérifier s'il y a des articles
    const articles = await ctx.db
      .query("faqArticles")
      .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
      .collect();

    if (articles.length > 0) {
      throw new ConvexError(
        `Cette catégorie contient ${articles.length} article(s). Supprimez-les d'abord.`
      );
    }

    await ctx.db.delete(args.categoryId);

    return { success: true };
  },
});

// Réordonner les catégories
export const reorderCategories = mutation({
  args: {
    sessionToken: v.string(),
    orderedIds: v.array(v.id("faqCategories")),
  },
  handler: async (ctx, args) => {
    const adminResult = await checkAdmin(ctx, args.sessionToken);
    if (!adminResult.success) {
      throw new ConvexError(adminResult.error);
    }

    const now = Date.now();

    for (let i = 0; i < args.orderedIds.length; i++) {
      await ctx.db.patch(args.orderedIds[i], {
        order: i,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

// ============================================
// ARTICLES
// ============================================

// Récupérer tous les articles (admin)
export const getAllArticles = query({
  args: {
    sessionToken: v.string(),
    categoryId: v.optional(v.id("faqCategories")),
  },
  handler: async (ctx, args) => {
    const adminResult = await checkAdmin(ctx, args.sessionToken);
    if (!adminResult.success) {
      return { success: false, error: adminResult.error, articles: [] };
    }

    let articles;
    if (args.categoryId) {
      articles = await ctx.db
        .query("faqArticles")
        .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
        .collect();
    } else {
      articles = await ctx.db.query("faqArticles").collect();
    }

    articles.sort((a, b) => a.order - b.order);

    // Enrichir avec les noms de catégorie
    const enrichedArticles = await Promise.all(
      articles.map(async (art) => {
        const category = await ctx.db.get(art.categoryId);
        return {
          ...art,
          categoryName: category?.name || "Catégorie supprimée",
          categorySlug: category?.slug || "",
        };
      })
    );

    return { success: true, articles: enrichedArticles };
  },
});

// Récupérer un article (admin)
export const getArticle = query({
  args: {
    sessionToken: v.string(),
    articleId: v.id("faqArticles"),
  },
  handler: async (ctx, args) => {
    const adminResult = await checkAdmin(ctx, args.sessionToken);
    if (!adminResult.success) {
      return { success: false, error: adminResult.error };
    }

    const article = await ctx.db.get(args.articleId);
    if (!article) {
      return { success: false, error: "Article non trouvé" };
    }

    const category = await ctx.db.get(article.categoryId);

    return {
      success: true,
      article,
      category,
    };
  },
});

// Créer un article
export const createArticle = mutation({
  args: {
    sessionToken: v.string(),
    categoryId: v.id("faqCategories"),
    title: v.string(),
    content: v.string(),
    slug: v.string(),
    targetAudience: v.union(v.literal("all"), v.literal("client"), v.literal("annonceur")),
  },
  handler: async (ctx, args) => {
    const adminResult = await checkAdmin(ctx, args.sessionToken);
    if (!adminResult.success) {
      throw new ConvexError(adminResult.error);
    }

    // Vérifier que la catégorie existe
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new ConvexError("Catégorie non trouvée");
    }

    // Vérifier que le slug est unique
    const existing = await ctx.db
      .query("faqArticles")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      throw new ConvexError("Ce slug existe déjà");
    }

    // Trouver le prochain ordre dans la catégorie
    const articles = await ctx.db
      .query("faqArticles")
      .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
      .collect();
    const maxOrder = articles.length > 0 ? Math.max(...articles.map((a) => a.order)) : -1;

    const now = Date.now();

    const articleId = await ctx.db.insert("faqArticles", {
      categoryId: args.categoryId,
      title: args.title.trim(),
      content: args.content,
      slug: args.slug.toLowerCase().trim(),
      order: maxOrder + 1,
      isActive: true,
      viewCount: 0,
      helpfulCount: 0,
      notHelpfulCount: 0,
      targetAudience: args.targetAudience,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, articleId };
  },
});

// Modifier un article
export const updateArticle = mutation({
  args: {
    sessionToken: v.string(),
    articleId: v.id("faqArticles"),
    categoryId: v.optional(v.id("faqCategories")),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    slug: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    targetAudience: v.optional(v.union(v.literal("all"), v.literal("client"), v.literal("annonceur"))),
  },
  handler: async (ctx, args) => {
    const adminResult = await checkAdmin(ctx, args.sessionToken);
    if (!adminResult.success) {
      throw new ConvexError(adminResult.error);
    }

    const article = await ctx.db.get(args.articleId);
    if (!article) {
      throw new ConvexError("Article non trouvé");
    }

    // Si le slug change, vérifier qu'il est unique
    if (args.slug && args.slug !== article.slug) {
      const existing = await ctx.db
        .query("faqArticles")
        .withIndex("by_slug", (q) => q.eq("slug", args.slug))
        .first();

      if (existing) {
        throw new ConvexError("Ce slug existe déjà");
      }
    }

    // Si la catégorie change, vérifier qu'elle existe
    if (args.categoryId && args.categoryId !== article.categoryId) {
      const category = await ctx.db.get(args.categoryId);
      if (!category) {
        throw new ConvexError("Catégorie non trouvée");
      }
    }

    const updates: any = { updatedAt: Date.now() };
    if (args.categoryId !== undefined) updates.categoryId = args.categoryId;
    if (args.title !== undefined) updates.title = args.title.trim();
    if (args.content !== undefined) updates.content = args.content;
    if (args.slug !== undefined) updates.slug = args.slug.toLowerCase().trim();
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    if (args.targetAudience !== undefined) updates.targetAudience = args.targetAudience;

    await ctx.db.patch(args.articleId, updates);

    return { success: true };
  },
});

// Supprimer un article
export const deleteArticle = mutation({
  args: {
    sessionToken: v.string(),
    articleId: v.id("faqArticles"),
  },
  handler: async (ctx, args) => {
    const adminResult = await checkAdmin(ctx, args.sessionToken);
    if (!adminResult.success) {
      throw new ConvexError(adminResult.error);
    }

    const article = await ctx.db.get(args.articleId);
    if (!article) {
      throw new ConvexError("Article non trouvé");
    }

    await ctx.db.delete(args.articleId);

    return { success: true };
  },
});

// Réordonner les articles d'une catégorie
export const reorderArticles = mutation({
  args: {
    sessionToken: v.string(),
    orderedIds: v.array(v.id("faqArticles")),
  },
  handler: async (ctx, args) => {
    const adminResult = await checkAdmin(ctx, args.sessionToken);
    if (!adminResult.success) {
      throw new ConvexError(adminResult.error);
    }

    const now = Date.now();

    for (let i = 0; i < args.orderedIds.length; i++) {
      await ctx.db.patch(args.orderedIds[i], {
        order: i,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

// ============================================
// STATISTIQUES
// ============================================

// Statistiques FAQ
export const getFaqStats = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const adminResult = await checkAdmin(ctx, args.sessionToken);
    if (!adminResult.success) {
      return { success: false, error: adminResult.error };
    }

    const categories = await ctx.db.query("faqCategories").collect();
    const articles = await ctx.db.query("faqArticles").collect();

    const totalViews = articles.reduce((acc, art) => acc + art.viewCount, 0);
    const totalHelpful = articles.reduce((acc, art) => acc + art.helpfulCount, 0);
    const totalNotHelpful = articles.reduce((acc, art) => acc + art.notHelpfulCount, 0);

    // Top 5 articles les plus vus
    const topArticles = [...articles]
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 5)
      .map((art) => ({
        _id: art._id,
        title: art.title,
        viewCount: art.viewCount,
        helpfulCount: art.helpfulCount,
      }));

    // Articles avec beaucoup de votes négatifs (à améliorer)
    const needsImprovement = articles
      .filter((art) => art.notHelpfulCount > art.helpfulCount && art.notHelpfulCount >= 3)
      .map((art) => ({
        _id: art._id,
        title: art.title,
        helpfulCount: art.helpfulCount,
        notHelpfulCount: art.notHelpfulCount,
      }));

    return {
      success: true,
      stats: {
        totalCategories: categories.length,
        activeCategories: categories.filter((c) => c.isActive).length,
        totalArticles: articles.length,
        activeArticles: articles.filter((a) => a.isActive).length,
        totalViews,
        totalHelpful,
        totalNotHelpful,
        helpfulRatio: totalHelpful + totalNotHelpful > 0
          ? Math.round((totalHelpful / (totalHelpful + totalNotHelpful)) * 100)
          : null,
        topArticles,
        needsImprovement,
      },
    };
  },
});

// Générer un slug à partir d'un titre
export const generateSlug = query({
  args: {
    title: v.string(),
    type: v.union(v.literal("category"), v.literal("article")),
  },
  handler: async (ctx, args) => {
    // Générer le slug de base
    let slug = args.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Supprimer les accents
      .replace(/[^a-z0-9]+/g, "-") // Remplacer les caractères spéciaux par des tirets
      .replace(/^-|-$/g, "") // Supprimer les tirets en début/fin
      .slice(0, 50); // Limiter la longueur

    // Vérifier si le slug existe déjà
    const table = args.type === "category" ? "faqCategories" : "faqArticles";
    let existing = await ctx.db
      .query(table)
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (!existing) {
      return { slug };
    }

    // Ajouter un suffixe numérique si nécessaire
    let counter = 2;
    while (existing) {
      const newSlug = `${slug}-${counter}`;
      existing = await ctx.db
        .query(table)
        .withIndex("by_slug", (q) => q.eq("slug", newSlug))
        .first();

      if (!existing) {
        return { slug: newSlug };
      }
      counter++;
    }

    return { slug };
  },
});
