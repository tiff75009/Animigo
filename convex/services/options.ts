import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// Helper: Valider la session et récupérer l'utilisateur
async function validateSession(ctx: any, token: string) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();

  if (!session || session.expiresAt < Date.now()) {
    throw new Error("Session invalide ou expirée");
  }

  const user = await ctx.db.get(session.userId);
  if (!user) {
    throw new Error("Utilisateur non trouvé");
  }

  return { session, user };
}

// Helper: Vérifier que l'utilisateur possède le service
async function verifyServiceOwnership(
  ctx: any,
  serviceId: Id<"services">,
  userId: Id<"users">
) {
  const service = await ctx.db.get(serviceId);
  if (!service) {
    throw new Error("Service non trouvé");
  }
  if (service.userId !== userId) {
    throw new Error("Vous n'êtes pas autorisé à modifier ce service");
  }
  return service;
}

// ============================================
// QUERIES
// ============================================

// Récupérer les options d'un service
export const getOptionsByService = query({
  args: {
    token: v.string(),
    serviceId: v.id("services"),
  },
  handler: async (ctx, args) => {
    await validateSession(ctx, args.token);

    const options = await ctx.db
      .query("serviceOptions")
      .withIndex("by_service", (q) => q.eq("serviceId", args.serviceId))
      .collect();

    // Trier par ordre
    return options.sort((a, b) => a.order - b.order);
  },
});

// Récupérer les options d'une formule spécifique
export const getOptionsByVariant = query({
  args: {
    token: v.string(),
    variantId: v.id("serviceVariants"),
  },
  handler: async (ctx, args) => {
    await validateSession(ctx, args.token);

    // Récupérer la variante pour obtenir le serviceId
    const variant = await ctx.db.get(args.variantId);
    if (!variant) {
      throw new Error("Formule non trouvée");
    }

    // Récupérer les options liées à cette formule spécifique
    // OU les options du service sans variantId (options partagées)
    const allServiceOptions = await ctx.db
      .query("serviceOptions")
      .withIndex("by_service", (q) => q.eq("serviceId", variant.serviceId))
      .collect();

    // Filtrer: options sans variantId (partagées) + options de cette formule spécifique
    const relevantOptions = allServiceOptions.filter(
      (o) => !o.variantId || o.variantId === args.variantId
    );

    // Trier par ordre
    return relevantOptions.sort((a, b) => a.order - b.order);
  },
});

// Récupérer les options d'un service avec info sur les formules liées
export const getOptionsWithVariantInfo = query({
  args: {
    token: v.string(),
    serviceId: v.id("services"),
  },
  handler: async (ctx, args) => {
    await validateSession(ctx, args.token);

    const options = await ctx.db
      .query("serviceOptions")
      .withIndex("by_service", (q) => q.eq("serviceId", args.serviceId))
      .collect();

    // Enrichir avec les infos de la formule liée
    const enrichedOptions = await Promise.all(
      options.map(async (option) => {
        let variantName: string | null = null;
        if (option.variantId) {
          const variant = await ctx.db.get(option.variantId);
          variantName = variant?.name || null;
        }
        return {
          ...option,
          variantName,
          isShared: !option.variantId, // true si l'option est partagée entre toutes les formules
        };
      })
    );

    // Trier par ordre
    return enrichedOptions.sort((a, b) => a.order - b.order);
  },
});

// Récupérer les détails d'une option
export const getOptionDetails = query({
  args: {
    token: v.string(),
    optionId: v.id("serviceOptions"),
  },
  handler: async (ctx, args) => {
    await validateSession(ctx, args.token);

    const option = await ctx.db.get(args.optionId);
    if (!option) {
      throw new Error("Option non trouvée");
    }

    return option;
  },
});

// ============================================
// MUTATIONS
// ============================================

// Ajouter une option
export const addOption = mutation({
  args: {
    token: v.string(),
    serviceId: v.id("services"),
    // Nouveau: variantId optionnel pour lier l'option à une formule spécifique
    variantId: v.optional(v.id("serviceVariants")),
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(),
    priceType: v.union(
      v.literal("flat"),
      v.literal("per_day"),
      v.literal("per_unit")
    ),
    unitLabel: v.optional(v.string()),
    maxQuantity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await validateSession(ctx, args.token);
    await verifyServiceOwnership(ctx, args.serviceId, user._id);

    // Si variantId fourni, vérifier qu'il appartient au service
    if (args.variantId) {
      const variant = await ctx.db.get(args.variantId);
      if (!variant || variant.serviceId !== args.serviceId) {
        throw new Error("La formule spécifiée n'appartient pas à ce service");
      }
    }

    // Trouver l'ordre max pour mettre la nouvelle option à la fin
    const existingOptions = await ctx.db
      .query("serviceOptions")
      .withIndex("by_service", (q) => q.eq("serviceId", args.serviceId))
      .collect();
    const maxOrder = existingOptions.reduce(
      (max, o) => Math.max(max, o.order),
      -1
    );

    const now = Date.now();

    const optionId = await ctx.db.insert("serviceOptions", {
      serviceId: args.serviceId,
      variantId: args.variantId,
      name: args.name,
      description: args.description,
      price: args.price,
      priceType: args.priceType,
      unitLabel: args.unitLabel,
      maxQuantity: args.maxQuantity,
      order: maxOrder + 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, optionId };
  },
});

// Modifier une option
export const updateOption = mutation({
  args: {
    token: v.string(),
    optionId: v.id("serviceOptions"),
    // Nouveau: possibilité de changer le variantId (null = option partagée)
    variantId: v.optional(v.union(v.id("serviceVariants"), v.null())),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    priceType: v.optional(
      v.union(
        v.literal("flat"),
        v.literal("per_day"),
        v.literal("per_unit")
      )
    ),
    unitLabel: v.optional(v.string()),
    maxQuantity: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { user } = await validateSession(ctx, args.token);

    const option = await ctx.db.get(args.optionId);
    if (!option) {
      throw new Error("Option non trouvée");
    }

    await verifyServiceOwnership(ctx, option.serviceId, user._id);

    // Si variantId fourni (pas null), vérifier qu'il appartient au service
    if (args.variantId !== undefined && args.variantId !== null) {
      const variant = await ctx.db.get(args.variantId);
      if (!variant || variant.serviceId !== option.serviceId) {
        throw new Error("La formule spécifiée n'appartient pas à ce service");
      }
    }

    const now = Date.now();
    const updates: Record<string, unknown> = { updatedAt: now };

    // Gérer variantId: null = retirer le lien, undefined = ne pas modifier
    if (args.variantId !== undefined) {
      updates.variantId = args.variantId === null ? undefined : args.variantId;
    }
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.price !== undefined) updates.price = args.price;
    if (args.priceType !== undefined) updates.priceType = args.priceType;
    if (args.unitLabel !== undefined) updates.unitLabel = args.unitLabel;
    if (args.maxQuantity !== undefined) updates.maxQuantity = args.maxQuantity;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.optionId, updates);

    return { success: true };
  },
});

// Supprimer une option
export const deleteOption = mutation({
  args: {
    token: v.string(),
    optionId: v.id("serviceOptions"),
  },
  handler: async (ctx, args) => {
    const { user } = await validateSession(ctx, args.token);

    const option = await ctx.db.get(args.optionId);
    if (!option) {
      throw new Error("Option non trouvée");
    }

    await verifyServiceOwnership(ctx, option.serviceId, user._id);

    await ctx.db.delete(args.optionId);

    return { success: true };
  },
});

// Réordonner les options
export const reorderOptions = mutation({
  args: {
    token: v.string(),
    serviceId: v.id("services"),
    optionIds: v.array(v.id("serviceOptions")),
  },
  handler: async (ctx, args) => {
    const { user } = await validateSession(ctx, args.token);
    await verifyServiceOwnership(ctx, args.serviceId, user._id);

    const now = Date.now();

    // Mettre à jour l'ordre de chaque option
    for (let i = 0; i < args.optionIds.length; i++) {
      await ctx.db.patch(args.optionIds[i], {
        order: i,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});
