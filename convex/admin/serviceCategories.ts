import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./utils";
import { ConvexError } from "convex/values";

// Liste toutes les catégories (admin) avec hiérarchie
export const listCategories = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const categories = await ctx.db
      .query("serviceCategories")
      .collect();

    // Créer un map pour lookup rapide des parents
    const categoryMap = new Map(categories.map(c => [c._id, c]));

    // Trier : parents d'abord (par ordre), puis sous-catégories (par ordre)
    const sorted = categories.sort((a, b) => {
      // Si les deux sont des parents (pas de parentCategoryId)
      if (!a.parentCategoryId && !b.parentCategoryId) {
        return a.order - b.order;
      }
      // Si a est parent et b est sous-catégorie
      if (!a.parentCategoryId && b.parentCategoryId) {
        return -1;
      }
      // Si a est sous-catégorie et b est parent
      if (a.parentCategoryId && !b.parentCategoryId) {
        return 1;
      }
      // Les deux sont des sous-catégories - trier par parent puis par ordre
      if (a.parentCategoryId !== b.parentCategoryId) {
        const parentA = categoryMap.get(a.parentCategoryId!);
        const parentB = categoryMap.get(b.parentCategoryId!);
        return (parentA?.order ?? 0) - (parentB?.order ?? 0);
      }
      return a.order - b.order;
    });

    // Récupérer tous les types pour enrichir les données
    const allTypes = await ctx.db.query("categoryTypes").collect();
    const typeMap = new Map(allTypes.map(t => [t._id, t]));

    // Récupérer les URLs des images et ajouter parentName + typeInfo
    const categoriesWithUrls = await Promise.all(
      sorted.map(async (cat) => {
        let imageUrl = null;
        if (cat.imageStorageId) {
          imageUrl = await ctx.storage.getUrl(cat.imageStorageId);
        }

        // Récupérer le nom du parent si existe
        let parentName: string | undefined;
        let typeId = cat.typeId;
        if (cat.parentCategoryId) {
          const parent = categoryMap.get(cat.parentCategoryId);
          parentName = parent?.name;
          // Les prestations héritent du type de leur parent
          typeId = parent?.typeId;
        }

        // Récupérer les infos du type
        const type = typeId ? typeMap.get(typeId) : null;

        return {
          id: cat._id,
          slug: cat.slug,
          name: cat.name,
          description: cat.description,
          icon: cat.icon,
          color: cat.color,
          imageUrl,
          order: cat.order,
          isActive: cat.isActive,
          parentCategoryId: cat.parentCategoryId,
          parentName,
          isParent: !cat.parentCategoryId,
          // Type information
          typeId: typeId || null,
          typeName: type?.name || null,
          typeIcon: type?.icon || null,
          typeColor: type?.color || null,
          // Business fields
          billingType: cat.billingType,
          defaultHourlyPrice: cat.defaultHourlyPrice,
          allowRangeBooking: cat.allowRangeBooking,
          allowedPriceUnits: cat.allowedPriceUnits,
          defaultVariants: cat.defaultVariants,
          allowCustomVariants: cat.allowCustomVariants,
          allowOvernightStay: cat.allowOvernightStay,
          displayFormat: cat.displayFormat,
          isCapacityBased: cat.isCapacityBased,
          enableDurationBasedBlocking: cat.enableDurationBasedBlocking,
          isSapEligible: cat.isSapEligible,
          // Configuration tarification avancée
          announcerPriceMode: cat.announcerPriceMode,
          clientBillingMode: cat.clientBillingMode,
          hourlyBillingSurchargePercent: cat.hourlyBillingSurchargePercent,
          displayPriceUnit: cat.displayPriceUnit,
          createdAt: cat.createdAt,
          updatedAt: cat.updatedAt,
        };
      })
    );

    return categoriesWithUrls;
  },
});

// Liste des catégories parentes uniquement (pour dropdown)
export const listParentCategories = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const categories = await ctx.db
      .query("serviceCategories")
      .collect();

    // Filtrer pour ne garder que les catégories sans parent
    const parentCategories = categories
      .filter(c => !c.parentCategoryId)
      .sort((a, b) => a.order - b.order);

    // Récupérer tous les types
    const allTypes = await ctx.db.query("categoryTypes").collect();
    const typeMap = new Map(allTypes.map(t => [t._id, t]));

    // Récupérer les URLs des images et les infos de type
    const result = await Promise.all(
      parentCategories.map(async (cat) => {
        let imageUrl = null;
        if (cat.imageStorageId) {
          imageUrl = await ctx.storage.getUrl(cat.imageStorageId);
        }

        // Récupérer les infos du type
        const type = cat.typeId ? typeMap.get(cat.typeId) : null;

        return {
          id: cat._id,
          slug: cat.slug,
          name: cat.name,
          icon: cat.icon,
          imageUrl,
          isCapacityBased: cat.isCapacityBased,
          // Type information
          typeId: cat.typeId || null,
          typeName: type?.name || null,
          typeIcon: type?.icon || null,
          typeColor: type?.color || null,
        };
      })
    );

    return result;
  },
});

// Liste les catégories actives (pour le frontend public) - structure hiérarchique
export const getActiveCategories = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("serviceCategories")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Récupérer tous les types de catégories
    const allTypes = await ctx.db
      .query("categoryTypes")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
    const typeMap = new Map(allTypes.map(t => [t._id, t]));

    // Créer un map pour lookup rapide
    const categoryMap = new Map(categories.map(c => [c._id, c]));

    // Séparer parents et sous-catégories
    const parentCategories = categories.filter(c => !c.parentCategoryId).sort((a, b) => a.order - b.order);
    const subcategories = categories.filter(c => c.parentCategoryId).sort((a, b) => a.order - b.order);

    // Catégories orphelines (ont un parent mais parent inactif ou inexistant)
    const rootCategories = subcategories.filter(c => {
      const parent = categoryMap.get(c.parentCategoryId!);
      return !parent; // Parent n'existe pas ou inactif
    });

    // Construire la structure hiérarchique
    const hierarchy = await Promise.all(
      parentCategories.map(async (parent) => {
        let imageUrl = null;
        if (parent.imageStorageId) {
          imageUrl = await ctx.storage.getUrl(parent.imageStorageId);
        }

        // Récupérer les infos du type
        const type = parent.typeId ? typeMap.get(parent.typeId) : null;

        // Trouver les sous-catégories de ce parent
        const children = subcategories.filter(c => c.parentCategoryId === parent._id);

        const childrenWithUrls = await Promise.all(
          children.map(async (child) => {
            let childImageUrl = null;
            if (child.imageStorageId) {
              childImageUrl = await ctx.storage.getUrl(child.imageStorageId);
            }
            return {
              id: child._id,
              slug: child.slug,
              name: child.name,
              description: child.description,
              icon: child.icon,
              color: child.color,
              imageUrl: childImageUrl,
              parentCategoryId: child.parentCategoryId,
              billingType: child.billingType,
              allowRangeBooking: child.allowRangeBooking,
              allowedPriceUnits: child.allowedPriceUnits,
              defaultVariants: child.defaultVariants,
              allowCustomVariants: child.allowCustomVariants,
              allowOvernightStay: child.allowOvernightStay,
              enableDurationBasedBlocking: child.enableDurationBasedBlocking,
              isSapEligible: child.isSapEligible,
              // Configuration tarification avancée
              announcerPriceMode: child.announcerPriceMode,
              displayPriceUnit: child.displayPriceUnit,
              clientBillingMode: child.clientBillingMode,
              hourlyBillingSurchargePercent: child.hourlyBillingSurchargePercent,
              defaultNightlyPrice: child.defaultNightlyPrice,
              // Propagé depuis le parent
              isCapacityBased: parent.isCapacityBased,
              // Type hérité du parent
              typeId: parent.typeId || null,
              typeName: type?.name || null,
              typeIcon: type?.icon || null,
              typeColor: type?.color || null,
            };
          })
        );

        return {
          id: parent._id,
          slug: parent.slug,
          name: parent.name,
          description: parent.description,
          icon: parent.icon,
          color: parent.color,
          imageUrl,
          isParent: true,
          displayFormat: parent.displayFormat,
          // Type de la catégorie parente
          typeId: parent.typeId || null,
          typeName: type?.name || null,
          typeIcon: type?.icon || null,
          typeColor: type?.color || null,
          subcategories: childrenWithUrls,
        };
      })
    );

    // Catégories sans parent (rétrocompatibilité + orphelines)
    const rootWithUrls = await Promise.all(
      rootCategories.map(async (cat) => {
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
          color: cat.color,
          imageUrl,
          billingType: cat.billingType,
          allowRangeBooking: cat.allowRangeBooking,
          allowedPriceUnits: cat.allowedPriceUnits,
          defaultVariants: cat.defaultVariants,
          allowCustomVariants: cat.allowCustomVariants,
          allowOvernightStay: cat.allowOvernightStay,
          enableDurationBasedBlocking: cat.enableDurationBasedBlocking,
          isSapEligible: cat.isSapEligible,
          // Configuration tarification avancée
          announcerPriceMode: cat.announcerPriceMode,
          displayPriceUnit: cat.displayPriceUnit,
          clientBillingMode: cat.clientBillingMode,
          hourlyBillingSurchargePercent: cat.hourlyBillingSurchargePercent,
          defaultNightlyPrice: cat.defaultNightlyPrice,
          // Pas de type pour les catégories orphelines
          typeId: null,
          typeName: null,
          typeIcon: null,
          typeColor: null,
        };
      })
    );

    // Récupérer la liste des types avec leurs catégories pour le groupement par type
    const typesList = allTypes
      .sort((a, b) => a.order - b.order)
      .map(type => ({
        id: type._id,
        slug: type.slug,
        name: type.name,
        icon: type.icon || null,
        color: type.color || null,
      }));

    return {
      parentCategories: hierarchy,
      rootCategories: rootWithUrls,
      // Nouvelle propriété: liste des types pour le groupement
      categoryTypes: typesList,
    };
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

// Créer une catégorie (parent) ou prestation (sous-catégorie)
export const createCategory = mutation({
  args: {
    token: v.string(),
    slug: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()), // Couleur HEX
    imageStorageId: v.optional(v.id("_storage")),
    // Type de catégorie (uniquement pour les catégories parentes)
    typeId: v.optional(v.id("categoryTypes")),
    // Référence vers la catégorie parente (undefined = catégorie parente)
    parentCategoryId: v.optional(v.id("serviceCategories")),
    // Champs métier (uniquement pour les sous-catégories)
    billingType: v.optional(v.union(
      v.literal("hourly"),
      v.literal("daily"),
      v.literal("flexible")
    )),
    defaultHourlyPrice: v.optional(v.number()),
    defaultNightlyPrice: v.optional(v.number()),
    allowRangeBooking: v.optional(v.boolean()),
    allowedPriceUnits: v.optional(v.array(v.union(
      v.literal("hour"),
      v.literal("half_day"),
      v.literal("day"),
      v.literal("week"),
      v.literal("month")
    ))),
    defaultVariants: v.optional(v.array(v.object({
      name: v.string(),
      description: v.optional(v.string()),
      suggestedDuration: v.optional(v.number()),
      includedFeatures: v.optional(v.array(v.string())),
    }))),
    allowCustomVariants: v.optional(v.boolean()),
    allowOvernightStay: v.optional(v.boolean()),
    // Format d'affichage (uniquement pour catégories parentes)
    displayFormat: v.optional(v.union(
      v.literal("hierarchy"),
      v.literal("subcategory"),
      v.literal("badge")
    )),
    // Catégorie basée sur la capacité (uniquement pour catégories parentes)
    isCapacityBased: v.optional(v.boolean()),
    // Blocage basé sur la durée (uniquement pour sous-catégories)
    enableDurationBasedBlocking: v.optional(v.boolean()),
    // SAP : éligible au taux réduit de TVA
    isSapEligible: v.optional(v.boolean()),
    // === Configuration tarification avancée ===
    announcerPriceMode: v.optional(v.union(v.literal("manual"), v.literal("automatic"))),
    clientBillingMode: v.optional(v.union(
      v.literal("exact_hourly"),
      v.literal("round_half_day"),
      v.literal("round_full_day")
    )),
    hourlyBillingSurchargePercent: v.optional(v.number()),
    displayPriceUnit: v.optional(v.union(
      v.literal("hour"), v.literal("half_day"), v.literal("day"),
      v.literal("week"), v.literal("month")
    )),
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

    // Si parentCategoryId fourni, vérifier que le parent existe et n'a pas de parent (max 2 niveaux)
    if (args.parentCategoryId) {
      const parent = await ctx.db.get(args.parentCategoryId);
      if (!parent) {
        throw new ConvexError("Catégorie parente non trouvée");
      }
      if (parent.parentCategoryId) {
        throw new ConvexError("Impossible de créer une sous-sous-catégorie (2 niveaux max)");
      }
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
      color: args.color,
      imageStorageId: args.imageStorageId,
      // Type de catégorie (uniquement pour les catégories parentes)
      typeId: !args.parentCategoryId ? args.typeId : undefined,
      parentCategoryId: args.parentCategoryId,
      // Champs métier (ignorés pour les catégories parentes)
      billingType: args.parentCategoryId ? args.billingType : undefined,
      defaultHourlyPrice: args.parentCategoryId ? args.defaultHourlyPrice : undefined,
      defaultNightlyPrice: args.parentCategoryId ? args.defaultNightlyPrice : undefined,
      allowRangeBooking: args.parentCategoryId ? args.allowRangeBooking : undefined,
      allowedPriceUnits: args.parentCategoryId ? args.allowedPriceUnits : undefined,
      defaultVariants: args.parentCategoryId ? args.defaultVariants : undefined,
      allowCustomVariants: args.parentCategoryId ? args.allowCustomVariants : undefined,
      allowOvernightStay: args.parentCategoryId ? args.allowOvernightStay : undefined,
      // Blocage basé sur la durée (uniquement pour les sous-catégories)
      enableDurationBasedBlocking: args.parentCategoryId ? args.enableDurationBasedBlocking : undefined,
      // SAP : éligible au taux réduit (uniquement pour les sous-catégories)
      isSapEligible: args.parentCategoryId ? args.isSapEligible : undefined,
      // Format d'affichage (uniquement pour les catégories parentes)
      displayFormat: !args.parentCategoryId ? args.displayFormat : undefined,
      // Catégorie basée sur la capacité (uniquement pour les catégories parentes)
      isCapacityBased: !args.parentCategoryId ? args.isCapacityBased : undefined,
      // Configuration tarification avancée (uniquement pour les sous-catégories)
      announcerPriceMode: args.parentCategoryId ? args.announcerPriceMode : undefined,
      clientBillingMode: args.parentCategoryId ? args.clientBillingMode : undefined,
      hourlyBillingSurchargePercent: args.parentCategoryId ? args.hourlyBillingSurchargePercent : undefined,
      displayPriceUnit: args.parentCategoryId ? args.displayPriceUnit : undefined,
      order: maxOrder + 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, categoryId };
  },
});

// Mettre à jour une catégorie ou prestation
export const updateCategory = mutation({
  args: {
    token: v.string(),
    categoryId: v.id("serviceCategories"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()), // Couleur HEX
    imageStorageId: v.optional(v.id("_storage")),
    isActive: v.optional(v.boolean()),
    // Type de catégorie (uniquement pour les catégories parentes)
    typeId: v.optional(v.union(v.id("categoryTypes"), v.null())),
    // Changer le parent (null = devient catégorie parente, Id = devient prestation)
    parentCategoryId: v.optional(v.union(v.id("serviceCategories"), v.null())),
    billingType: v.optional(v.union(
      v.literal("hourly"),
      v.literal("daily"),
      v.literal("flexible")
    )),
    defaultHourlyPrice: v.optional(v.number()),
    defaultNightlyPrice: v.optional(v.number()),
    allowRangeBooking: v.optional(v.boolean()),
    allowedPriceUnits: v.optional(v.array(v.union(
      v.literal("hour"),
      v.literal("half_day"),
      v.literal("day"),
      v.literal("week"),
      v.literal("month")
    ))),
    defaultVariants: v.optional(v.array(v.object({
      name: v.string(),
      description: v.optional(v.string()),
      suggestedDuration: v.optional(v.number()),
      includedFeatures: v.optional(v.array(v.string())),
    }))),
    allowCustomVariants: v.optional(v.boolean()),
    allowOvernightStay: v.optional(v.boolean()),
    // Format d'affichage (uniquement pour catégories parentes)
    displayFormat: v.optional(v.union(
      v.literal("hierarchy"),
      v.literal("subcategory"),
      v.literal("badge")
    )),
    // Catégorie basée sur la capacité (uniquement pour catégories parentes)
    isCapacityBased: v.optional(v.boolean()),
    // Blocage basé sur la durée (uniquement pour sous-catégories)
    enableDurationBasedBlocking: v.optional(v.boolean()),
    // SAP : éligible au taux réduit de TVA
    isSapEligible: v.optional(v.boolean()),
    // === Configuration tarification avancée ===
    announcerPriceMode: v.optional(v.union(v.literal("manual"), v.literal("automatic"))),
    clientBillingMode: v.optional(v.union(
      v.literal("exact_hourly"),
      v.literal("round_half_day"),
      v.literal("round_full_day")
    )),
    hourlyBillingSurchargePercent: v.optional(v.number()),
    displayPriceUnit: v.optional(v.union(
      v.literal("hour"), v.literal("half_day"), v.literal("day"),
      v.literal("week"), v.literal("month")
    )),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new ConvexError("Catégorie non trouvée");
    }

    // Si on essaie de changer le parentCategoryId
    if (args.parentCategoryId !== undefined) {
      const newParentId = args.parentCategoryId;

      if (newParentId !== null) {
        // Vérifier que le nouveau parent existe
        const newParent = await ctx.db.get(newParentId);
        if (!newParent) {
          throw new ConvexError("Catégorie parente non trouvée");
        }
        // Vérifier que le parent n'a pas de parent (max 2 niveaux)
        if (newParent.parentCategoryId) {
          throw new ConvexError("Impossible d'assigner à une sous-catégorie (2 niveaux max)");
        }
        // Empêcher référence circulaire (ne peut pas être son propre parent)
        if (newParentId === args.categoryId) {
          throw new ConvexError("Une catégorie ne peut pas être son propre parent");
        }
      }

      // Si cette catégorie a des sous-catégories, elle ne peut pas devenir une sous-catégorie
      if (newParentId !== null) {
        const hasChildren = await ctx.db
          .query("serviceCategories")
          .withIndex("by_parent", (q) => q.eq("parentCategoryId", args.categoryId))
          .first();
        if (hasChildren) {
          throw new ConvexError("Cette catégorie a des sous-catégories et ne peut pas devenir une sous-catégorie");
        }
      }
    }

    // Construire les mises à jour
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.icon !== undefined) updates.icon = args.icon;
    if (args.color !== undefined) updates.color = args.color;
    if (args.imageStorageId !== undefined) updates.imageStorageId = args.imageStorageId;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    // Gérer parentCategoryId: null = supprimer le parent (devient catégorie parente)
    if (args.parentCategoryId !== undefined) {
      if (args.parentCategoryId === null) {
        // Supprimer le champ parentCategoryId pour en faire une catégorie parente
        // On doit patcher avec undefined pour supprimer le champ
        updates.parentCategoryId = undefined;
      } else {
        updates.parentCategoryId = args.parentCategoryId;
      }
    }

    if (args.billingType !== undefined) updates.billingType = args.billingType;
    if (args.defaultHourlyPrice !== undefined) updates.defaultHourlyPrice = args.defaultHourlyPrice;
    if (args.defaultNightlyPrice !== undefined) updates.defaultNightlyPrice = args.defaultNightlyPrice;
    if (args.allowRangeBooking !== undefined) updates.allowRangeBooking = args.allowRangeBooking;
    if (args.allowedPriceUnits !== undefined) updates.allowedPriceUnits = args.allowedPriceUnits;
    if (args.defaultVariants !== undefined) updates.defaultVariants = args.defaultVariants;
    if (args.allowCustomVariants !== undefined) updates.allowCustomVariants = args.allowCustomVariants;
    if (args.allowOvernightStay !== undefined) updates.allowOvernightStay = args.allowOvernightStay;
    if (args.displayFormat !== undefined) updates.displayFormat = args.displayFormat;
    if (args.isCapacityBased !== undefined) updates.isCapacityBased = args.isCapacityBased;
    if (args.enableDurationBasedBlocking !== undefined) updates.enableDurationBasedBlocking = args.enableDurationBasedBlocking;
    if (args.isSapEligible !== undefined) updates.isSapEligible = args.isSapEligible;
    // Configuration tarification avancée
    if (args.announcerPriceMode !== undefined) updates.announcerPriceMode = args.announcerPriceMode;
    if (args.clientBillingMode !== undefined) updates.clientBillingMode = args.clientBillingMode;
    if (args.hourlyBillingSurchargePercent !== undefined) updates.hourlyBillingSurchargePercent = args.hourlyBillingSurchargePercent;
    if (args.displayPriceUnit !== undefined) updates.displayPriceUnit = args.displayPriceUnit;

    // Gérer typeId (uniquement pour les catégories parentes)
    // On détermine si la catégorie est/sera une catégorie parente
    const willBeParent = args.parentCategoryId === null ||
      (args.parentCategoryId === undefined && !category.parentCategoryId);

    if (args.typeId !== undefined && willBeParent) {
      if (args.typeId === null) {
        updates.typeId = undefined; // Supprimer le type
      } else {
        updates.typeId = args.typeId;
      }
    }

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

    // Vérifier si cette catégorie a des sous-catégories
    const hasChildren = await ctx.db
      .query("serviceCategories")
      .withIndex("by_parent", (q) => q.eq("parentCategoryId", args.categoryId))
      .first();

    if (hasChildren) {
      throw new ConvexError("Impossible de supprimer une catégorie parente qui a des sous-catégories. Supprimez d'abord les sous-catégories ou déplacez-les vers un autre parent.");
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

// Liste des prestations (sous-catégories) avec filtrage
export const listPrestations = query({
  args: {
    token: v.string(),
    typeId: v.optional(v.id("categoryTypes")),
    parentId: v.optional(v.id("serviceCategories")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    // Récupérer toutes les catégories
    const allCategories = await ctx.db.query("serviceCategories").collect();

    // Créer un map des catégories parentes
    const parentCategories = allCategories.filter(c => !c.parentCategoryId);
    const parentMap = new Map(parentCategories.map(c => [c._id, c]));

    // Récupérer tous les types
    const allTypes = await ctx.db.query("categoryTypes").collect();
    const typeMap = new Map(allTypes.map(t => [t._id, t]));

    // Filtrer pour ne garder que les prestations (sous-catégories)
    let prestations = allCategories.filter(c => c.parentCategoryId);

    // Filtre par parent
    if (args.parentId) {
      prestations = prestations.filter(c => c.parentCategoryId === args.parentId);
    }

    // Filtre par type (via le parent)
    if (args.typeId) {
      prestations = prestations.filter(c => {
        const parent = parentMap.get(c.parentCategoryId!);
        return parent?.typeId === args.typeId;
      });
    }

    // Trier par ordre
    prestations.sort((a, b) => a.order - b.order);

    // Enrichir avec infos du parent et du type
    const result = await Promise.all(
      prestations.map(async (prestation) => {
        const parent = parentMap.get(prestation.parentCategoryId!);
        const type = parent?.typeId ? typeMap.get(parent.typeId) : null;

        let imageUrl = null;
        if (prestation.imageStorageId) {
          imageUrl = await ctx.storage.getUrl(prestation.imageStorageId);
        }

        return {
          id: prestation._id,
          slug: prestation.slug,
          name: prestation.name,
          description: prestation.description,
          icon: prestation.icon,
          color: prestation.color,
          imageUrl,
          order: prestation.order,
          isActive: prestation.isActive,
          // Parent info
          parentCategoryId: prestation.parentCategoryId,
          parentName: parent?.name || null,
          parentIcon: parent?.icon || null,
          // Type info (hérité du parent)
          typeId: parent?.typeId || null,
          typeName: type?.name || null,
          typeIcon: type?.icon || null,
          typeColor: type?.color || null,
          // Business fields
          billingType: prestation.billingType,
          allowRangeBooking: prestation.allowRangeBooking,
          allowOvernightStay: prestation.allowOvernightStay,
          enableDurationBasedBlocking: prestation.enableDurationBasedBlocking,
          isSapEligible: prestation.isSapEligible,
          // Configuration tarification avancée
          announcerPriceMode: prestation.announcerPriceMode,
          clientBillingMode: prestation.clientBillingMode,
          hourlyBillingSurchargePercent: prestation.hourlyBillingSurchargePercent,
          displayPriceUnit: prestation.displayPriceUnit,
          defaultHourlyPrice: prestation.defaultHourlyPrice,
          defaultNightlyPrice: prestation.defaultNightlyPrice,
          createdAt: prestation.createdAt,
          updatedAt: prestation.updatedAt,
        };
      })
    );

    return result;
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

    const defaultCategories: Array<{
      slug: string;
      name: string;
      icon: string;
      description: string;
      billingType: "hourly" | "daily" | "flexible";
      allowRangeBooking?: boolean;
      allowOvernightStay?: boolean;
    }> = [
      { slug: "garde", name: "Garde", icon: "🏠", description: "Garde à domicile ou en famille", billingType: "flexible", allowRangeBooking: true, allowOvernightStay: true },
      { slug: "promenade", name: "Promenade", icon: "🚶", description: "Balades et sorties", billingType: "hourly" },
      { slug: "toilettage", name: "Toilettage", icon: "🛁", description: "Soins et hygiène", billingType: "hourly" },
      { slug: "dressage", name: "Dressage", icon: "🎓", description: "Éducation et comportement", billingType: "hourly" },
      { slug: "agilite", name: "Agilité", icon: "🏃", description: "Sport et activités physiques", billingType: "hourly" },
      { slug: "transport", name: "Transport", icon: "🚗", description: "Accompagnement véhiculé", billingType: "hourly" },
      { slug: "pension", name: "Pension", icon: "🏨", description: "Hébergement longue durée", billingType: "daily", allowRangeBooking: true, allowOvernightStay: true },
      { slug: "visite", name: "Visite", icon: "👋", description: "Visite à domicile", billingType: "hourly" },
      { slug: "medical", name: "Soins médicaux", icon: "💊", description: "Accompagnement vétérinaire", billingType: "hourly" },
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
