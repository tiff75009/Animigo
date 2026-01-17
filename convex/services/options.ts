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

    const now = Date.now();
    const updates: Record<string, unknown> = { updatedAt: now };

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
