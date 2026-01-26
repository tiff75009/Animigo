import { v, ConvexError } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAdmin } from "./utils";

// ============================================
// QUERIES
// ============================================

// Liste tous les types de catégories (admin)
export const listCategoryTypes = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const types = await ctx.db
      .query("categoryTypes")
      .withIndex("by_order")
      .collect();

    // Ajouter le nombre de catégories utilisant chaque type
    const typesWithCount = await Promise.all(
      types.map(async (type) => {
        const categoriesUsingType = await ctx.db
          .query("serviceCategories")
          .filter((q) => q.eq(q.field("typeId"), type._id))
          .collect();

        return {
          ...type,
          id: type._id,
          categoriesCount: categoriesUsingType.length,
        };
      })
    );

    return typesWithCount;
  },
});

// Récupère un type par ID
export const getCategoryType = query({
  args: {
    token: v.string(),
    typeId: v.id("categoryTypes"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const type = await ctx.db.get(args.typeId);
    if (!type) {
      throw new ConvexError("Type non trouvé");
    }

    return {
      ...type,
      id: type._id,
    };
  },
});

// Liste les types actifs (pour les dropdowns)
export const listActiveTypes = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const types = await ctx.db
      .query("categoryTypes")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Trier par ordre
    types.sort((a, b) => a.order - b.order);

    return types.map((type) => ({
      id: type._id,
      slug: type.slug,
      name: type.name,
      icon: type.icon,
      color: type.color,
    }));
  },
});

// ============================================
// MUTATIONS
// ============================================

// Crée un nouveau type
export const createCategoryType = mutation({
  args: {
    token: v.string(),
    slug: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    // Normaliser le slug
    const normalizedSlug = args.slug
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Vérifier que le slug est unique
    const existingType = await ctx.db
      .query("categoryTypes")
      .withIndex("by_slug", (q) => q.eq("slug", normalizedSlug))
      .first();

    if (existingType) {
      throw new ConvexError("Un type avec ce slug existe déjà");
    }

    // Obtenir l'ordre max
    const allTypes = await ctx.db.query("categoryTypes").collect();
    const maxOrder = allTypes.reduce((max, t) => Math.max(max, t.order), 0);

    const now = Date.now();

    const typeId = await ctx.db.insert("categoryTypes", {
      slug: normalizedSlug,
      name: args.name,
      description: args.description,
      icon: args.icon || "📁",
      color: args.color || "#6B7280",
      order: maxOrder + 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return typeId;
  },
});

// Met à jour un type
export const updateCategoryType = mutation({
  args: {
    token: v.string(),
    typeId: v.id("categoryTypes"),
    slug: v.optional(v.string()),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const type = await ctx.db.get(args.typeId);
    if (!type) {
      throw new ConvexError("Type non trouvé");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    // Mise à jour du slug si fourni
    if (args.slug !== undefined) {
      const normalizedSlug = args.slug
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      // Vérifier que le slug est unique (sauf pour ce type)
      const existingType = await ctx.db
        .query("categoryTypes")
        .withIndex("by_slug", (q) => q.eq("slug", normalizedSlug))
        .first();

      if (existingType && existingType._id !== args.typeId) {
        throw new ConvexError("Un type avec ce slug existe déjà");
      }

      updates.slug = normalizedSlug;
    }

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.icon !== undefined) updates.icon = args.icon;
    if (args.color !== undefined) updates.color = args.color;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.typeId, updates);

    return args.typeId;
  },
});

// Supprime un type (si non utilisé)
export const deleteCategoryType = mutation({
  args: {
    token: v.string(),
    typeId: v.id("categoryTypes"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const type = await ctx.db.get(args.typeId);
    if (!type) {
      throw new ConvexError("Type non trouvé");
    }

    // Vérifier qu'aucune catégorie n'utilise ce type
    const categoriesUsingType = await ctx.db
      .query("serviceCategories")
      .filter((q) => q.eq(q.field("typeId"), args.typeId))
      .first();

    if (categoriesUsingType) {
      throw new ConvexError(
        "Impossible de supprimer ce type : des catégories l'utilisent. Réassignez-les d'abord à un autre type."
      );
    }

    await ctx.db.delete(args.typeId);

    return { success: true };
  },
});

// Réordonne les types
export const reorderCategoryTypes = mutation({
  args: {
    token: v.string(),
    orderedIds: v.array(v.id("categoryTypes")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const now = Date.now();

    // Mettre à jour l'ordre de chaque type
    await Promise.all(
      args.orderedIds.map(async (typeId, index) => {
        await ctx.db.patch(typeId, {
          order: index + 1,
          updatedAt: now,
        });
      })
    );

    return { success: true };
  },
});

// Seed les types par défaut
export const seedDefaultCategoryTypes = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    // Vérifier si des types existent déjà
    const existingTypes = await ctx.db.query("categoryTypes").first();
    if (existingTypes) {
      throw new ConvexError("Des types existent déjà. Supprimez-les d'abord pour reseed.");
    }

    const defaultTypes = [
      { slug: "garde", name: "Garde", icon: "🏠", color: "#FF6B6B", description: "Services de garde d'animaux" },
      { slug: "service", name: "Services", icon: "✨", color: "#4ECDC4", description: "Services divers" },
      { slug: "sante", name: "Santé", icon: "💊", color: "#45B7D1", description: "Services de santé animale" },
      { slug: "reproduction", name: "Reproduction", icon: "🐾", color: "#96CEB4", description: "Services de reproduction" },
    ];

    const now = Date.now();

    const insertedIds = await Promise.all(
      defaultTypes.map(async (type, index) => {
        return await ctx.db.insert("categoryTypes", {
          ...type,
          order: index + 1,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      })
    );

    return { insertedIds, count: insertedIds.length };
  },
});
