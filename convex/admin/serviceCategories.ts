import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./utils";
import { ConvexError } from "convex/values";

// Liste toutes les catégories (admin)
export const listCategories = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const categories = await ctx.db
      .query("serviceCategories")
      .collect();

    // Trier par ordre
    const sorted = categories.sort((a, b) => a.order - b.order);

    // Récupérer les URLs des images
    const categoriesWithUrls = await Promise.all(
      sorted.map(async (cat) => {
        let imageUrl = null;
        if (cat.imageStorageId) {
          imageUrl = await ctx.storage.getUrl(cat.imageStorageId);
        }
        return {
          id: cat._id,
          slug: cat.slug,
          name: cat.name,
          description: cat.description,
          icon: cat.icon,
          imageUrl,
          order: cat.order,
          isActive: cat.isActive,
          createdAt: cat.createdAt,
          updatedAt: cat.updatedAt,
        };
      })
    );

    return categoriesWithUrls;
  },
});

// Liste les catégories actives (pour le frontend public)
export const getActiveCategories = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("serviceCategories")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Trier par ordre
    const sorted = categories.sort((a, b) => a.order - b.order);

    // Récupérer les URLs des images
    const categoriesWithUrls = await Promise.all(
      sorted.map(async (cat) => {
        let imageUrl = null;
        if (cat.imageStorageId) {
          imageUrl = await ctx.storage.getUrl(cat.imageStorageId);
        }
        return {
          id: cat._id,
          slug: cat.slug,
          name: cat.name,
          description: cat.description,
          icon: cat.icon,
          imageUrl,
        };
      })
    );

    return categoriesWithUrls;
  },
});

// Générer URL d'upload pour l'image
export const generateUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    return await ctx.storage.generateUploadUrl();
  },
});

// Créer une catégorie
export const createCategory = mutation({
  args: {
    token: v.string(),
    slug: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    // Vérifier que le slug est unique
    const existing = await ctx.db
      .query("serviceCategories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      throw new ConvexError("Une catégorie avec ce slug existe déjà");
    }

    // Trouver l'ordre max pour mettre la nouvelle catégorie à la fin
    const allCategories = await ctx.db.query("serviceCategories").collect();
    const maxOrder = allCategories.reduce((max, cat) => Math.max(max, cat.order), -1);

    const now = Date.now();

    const categoryId = await ctx.db.insert("serviceCategories", {
      slug: args.slug.toLowerCase().replace(/\s+/g, "-"),
      name: args.name,
      description: args.description,
      icon: args.icon,
      imageStorageId: args.imageStorageId,
      order: maxOrder + 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, categoryId };
  },
});

// Mettre à jour une catégorie
export const updateCategory = mutation({
  args: {
    token: v.string(),
    categoryId: v.id("serviceCategories"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new ConvexError("Catégorie non trouvée");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.icon !== undefined) updates.icon = args.icon;
    if (args.imageStorageId !== undefined) updates.imageStorageId = args.imageStorageId;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.categoryId, updates);

    return { success: true };
  },
});

// Supprimer une catégorie
export const deleteCategory = mutation({
  args: {
    token: v.string(),
    categoryId: v.id("serviceCategories"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new ConvexError("Catégorie non trouvée");
    }

    // Supprimer l'image si elle existe
    if (category.imageStorageId) {
      await ctx.storage.delete(category.imageStorageId);
    }

    await ctx.db.delete(args.categoryId);

    return { success: true };
  },
});

// Réordonner les catégories
export const reorderCategories = mutation({
  args: {
    token: v.string(),
    categoryIds: v.array(v.id("serviceCategories")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    // Mettre à jour l'ordre de chaque catégorie
    for (let i = 0; i < args.categoryIds.length; i++) {
      await ctx.db.patch(args.categoryIds[i], {
        order: i,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Seed des catégories par défaut
export const seedDefaultCategories = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    // Vérifier si des catégories existent déjà
    const existing = await ctx.db.query("serviceCategories").first();
    if (existing) {
      throw new ConvexError("Des catégories existent déjà");
    }

    const defaultCategories = [
      { slug: "garde", name: "Garde", icon: "🏠", description: "Garde à domicile ou en famille" },
      { slug: "promenade", name: "Promenade", icon: "🚶", description: "Balades et sorties" },
      { slug: "toilettage", name: "Toilettage", icon: "🛁", description: "Soins et hygiène" },
      { slug: "dressage", name: "Dressage", icon: "🎓", description: "Éducation et comportement" },
      { slug: "agilite", name: "Agilité", icon: "🏃", description: "Sport et activités physiques" },
      { slug: "transport", name: "Transport", icon: "🚗", description: "Accompagnement véhiculé" },
      { slug: "pension", name: "Pension", icon: "🏨", description: "Hébergement longue durée" },
      { slug: "visite", name: "Visite", icon: "👋", description: "Visite à domicile" },
      { slug: "medical", name: "Soins médicaux", icon: "💊", description: "Accompagnement vétérinaire" },
    ];

    const now = Date.now();

    for (let i = 0; i < defaultCategories.length; i++) {
      await ctx.db.insert("serviceCategories", {
        ...defaultCategories[i],
        order: i,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true, count: defaultCategories.length };
  },
});
