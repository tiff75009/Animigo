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

// Helper: Vérifier si une formule collective a des créneaux configurés
async function hasConfiguredSlots(ctx: any, variantId: Id<"serviceVariants">): Promise<boolean> {
  const today = new Date().toISOString().split("T")[0];
  const slots = await ctx.db
    .query("collectiveSlots")
    .withIndex("by_variant", (q: any) => q.eq("variantId", variantId))
    .filter((q: any) =>
      q.and(
        q.gte(q.field("date"), today),
        q.eq(q.field("isActive"), true),
        q.eq(q.field("isCancelled"), false)
      )
    )
    .first();

  return slots !== null;
}

// Helper: Compter les créneaux futurs actifs pour une formule
async function countActiveSlots(ctx: any, variantId: Id<"serviceVariants">): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const slots = await ctx.db
    .query("collectiveSlots")
    .withIndex("by_variant", (q: any) => q.eq("variantId", variantId))
    .filter((q: any) =>
      q.and(
        q.gte(q.field("date"), today),
        q.eq(q.field("isActive"), true),
        q.eq(q.field("isCancelled"), false)
      )
    )
    .collect();

  return slots.length;
}

// Helper: Recalculer le basePrice d'un service
// basePrice = prix total minimum calculé (prix horaire × durée / 60 × nombre de séances)
async function updateServiceBasePrice(ctx: any, serviceId: Id<"services">) {
  const variants = await ctx.db
    .query("serviceVariants")
    .withIndex("by_service_active", (q: any) =>
      q.eq("serviceId", serviceId).eq("isActive", true)
    )
    .collect();

  if (variants.length === 0) {
    return;
  }

  // Calculer le prix total pour chaque variante: prix horaire × durée / 60 × nombre de séances
  const totalPrices = variants.map((v: any) => {
    const duration = v.duration || 60; // Par défaut 60 minutes
    const sessions = v.numberOfSessions || 1; // Par défaut 1 séance
    return Math.round((v.price * duration / 60) * sessions);
  });

  const minPrice = Math.min(...totalPrices);
  await ctx.db.patch(serviceId, { basePrice: minPrice });
}

// ============================================
// QUERIES
// ============================================

// Récupérer les variantes d'un service
export const getVariantsByService = query({
  args: {
    token: v.string(),
    serviceId: v.id("services"),
  },
  handler: async (ctx, args) => {
    await validateSession(ctx, args.token);

    const variants = await ctx.db
      .query("serviceVariants")
      .withIndex("by_service", (q) => q.eq("serviceId", args.serviceId))
      .collect();

    // Trier par ordre
    return variants.sort((a, b) => a.order - b.order);
  },
});

// Récupérer les détails d'une variante
export const getVariantDetails = query({
  args: {
    token: v.string(),
    variantId: v.id("serviceVariants"),
  },
  handler: async (ctx, args) => {
    await validateSession(ctx, args.token);

    const variant = await ctx.db.get(args.variantId);
    if (!variant) {
      throw new Error("Variante non trouvée");
    }

    return variant;
  },
});

// ============================================
// MUTATIONS
// ============================================

// Ajouter une variante
export const addVariant = mutation({
  args: {
    token: v.string(),
    serviceId: v.id("services"),
    name: v.string(),
    description: v.optional(v.string()),
    objectives: v.optional(v.array(v.object({
      icon: v.string(),
      text: v.string(),
    }))),
    numberOfSessions: v.optional(v.number()),
    sessionInterval: v.optional(v.number()), // Délai en jours entre chaque séance
    sessionType: v.optional(v.union(v.literal("individual"), v.literal("collective"))),
    maxAnimalsPerSession: v.optional(v.number()), // Si collective
    serviceLocation: v.optional(v.union(
      v.literal("announcer_home"),
      v.literal("client_home"),
      v.literal("both")
    )), // Lieu de prestation (si collective, forcé à announcer_home)
    animalTypes: v.optional(v.array(v.string())), // Animaux acceptés pour cette formule
    // Restrictions chiens
    dogCategoryAcceptance: v.optional(v.union(
      v.literal("none"),
      v.literal("cat1"),
      v.literal("cat2"),
      v.literal("both")
    )),
    acceptedDogSizes: v.optional(v.array(v.union(
      v.literal("small"),
      v.literal("medium"),
      v.literal("large")
    ))),
    price: v.number(),
    priceUnit: v.union(
      v.literal("hour"),
      v.literal("half_day"),
      v.literal("day"),
      v.literal("week"),
      v.literal("month"),
      v.literal("flat")
    ),
    // Multi-tarification par unité de temps
    pricing: v.optional(v.object({
      hourly: v.optional(v.number()),
      halfDaily: v.optional(v.number()),
      daily: v.optional(v.number()),
      weekly: v.optional(v.number()),
      monthly: v.optional(v.number()),
      nightly: v.optional(v.number()),
    })),
    duration: v.optional(v.number()),
    includedFeatures: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { user } = await validateSession(ctx, args.token);
    const service = await verifyServiceOwnership(ctx, args.serviceId, user._id);

    // Trouver l'ordre max pour mettre la nouvelle variante à la fin
    const existingVariants = await ctx.db
      .query("serviceVariants")
      .withIndex("by_service", (q) => q.eq("serviceId", args.serviceId))
      .collect();
    const maxOrder = existingVariants.reduce(
      (max, v) => Math.max(max, v.order),
      -1
    );

    const now = Date.now();

    // Si collective, forcer le lieu à announcer_home
    const effectiveLocation = args.sessionType === "collective" ? "announcer_home" : args.serviceLocation;

    // Les formules collectives sont inactives par défaut jusqu'à ce que des créneaux soient configurés
    const isCollective = args.sessionType === "collective";

    const variantId = await ctx.db.insert("serviceVariants", {
      serviceId: args.serviceId,
      name: args.name,
      description: args.description,
      objectives: args.objectives,
      numberOfSessions: args.numberOfSessions,
      sessionInterval: args.sessionInterval,
      sessionType: args.sessionType,
      maxAnimalsPerSession: args.maxAnimalsPerSession,
      serviceLocation: effectiveLocation,
      animalTypes: args.animalTypes,
      dogCategoryAcceptance: args.dogCategoryAcceptance,
      acceptedDogSizes: args.acceptedDogSizes,
      price: args.price,
      priceUnit: args.priceUnit,
      pricing: args.pricing,
      duration: args.duration,
      includedFeatures: args.includedFeatures,
      order: maxOrder + 1,
      isActive: !isCollective, // Désactivé par défaut si collective (pas de créneaux)
      needsSlotConfiguration: isCollective, // Flag pour indiquer que des créneaux sont requis
      createdAt: now,
      updatedAt: now,
    });

    // Activer le mode variantes sur le service si pas déjà fait
    if (!service.hasVariants) {
      await ctx.db.patch(args.serviceId, {
        hasVariants: true,
        updatedAt: now,
      });
    }

    // Mettre à jour le basePrice
    await updateServiceBasePrice(ctx, args.serviceId);

    return { success: true, variantId };
  },
});

// Modifier une variante
export const updateVariant = mutation({
  args: {
    token: v.string(),
    variantId: v.id("serviceVariants"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    objectives: v.optional(v.array(v.object({
      icon: v.string(),
      text: v.string(),
    }))),
    numberOfSessions: v.optional(v.number()),
    sessionInterval: v.optional(v.number()), // Délai en jours entre chaque séance
    sessionType: v.optional(v.union(v.literal("individual"), v.literal("collective"))),
    maxAnimalsPerSession: v.optional(v.number()), // Si collective
    serviceLocation: v.optional(v.union(
      v.literal("announcer_home"),
      v.literal("client_home"),
      v.literal("both")
    )), // Lieu de prestation
    animalTypes: v.optional(v.array(v.string())), // Animaux acceptés
    // Restrictions chiens
    dogCategoryAcceptance: v.optional(v.union(
      v.literal("none"),
      v.literal("cat1"),
      v.literal("cat2"),
      v.literal("both")
    )),
    acceptedDogSizes: v.optional(v.array(v.union(
      v.literal("small"),
      v.literal("medium"),
      v.literal("large")
    ))),
    price: v.optional(v.number()),
    priceUnit: v.optional(
      v.union(
        v.literal("hour"),
        v.literal("half_day"),
        v.literal("day"),
        v.literal("week"),
        v.literal("month"),
        v.literal("flat")
      )
    ),
    // Multi-tarification par unité de temps
    pricing: v.optional(v.object({
      hourly: v.optional(v.number()),
      halfDaily: v.optional(v.number()),
      daily: v.optional(v.number()),
      weekly: v.optional(v.number()),
      monthly: v.optional(v.number()),
      nightly: v.optional(v.number()),
    })),
    duration: v.optional(v.number()),
    includedFeatures: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { user } = await validateSession(ctx, args.token);

    const variant = await ctx.db.get(args.variantId);
    if (!variant) {
      throw new Error("Variante non trouvée");
    }

    await verifyServiceOwnership(ctx, variant.serviceId, user._id);

    const now = Date.now();
    const updates: Record<string, unknown> = { updatedAt: now };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.objectives !== undefined) updates.objectives = args.objectives;
    if (args.numberOfSessions !== undefined) updates.numberOfSessions = args.numberOfSessions;
    if (args.sessionInterval !== undefined) updates.sessionInterval = args.sessionInterval;
    if (args.sessionType !== undefined) updates.sessionType = args.sessionType;
    if (args.maxAnimalsPerSession !== undefined) updates.maxAnimalsPerSession = args.maxAnimalsPerSession;
    // Si sessionType change en collective, forcer le lieu à announcer_home
    if (args.serviceLocation !== undefined) {
      const newSessionType = args.sessionType ?? variant.sessionType;
      updates.serviceLocation = newSessionType === "collective" ? "announcer_home" : args.serviceLocation;
    } else if (args.sessionType === "collective" && variant.serviceLocation !== "announcer_home") {
      updates.serviceLocation = "announcer_home";
    }
    if (args.animalTypes !== undefined) updates.animalTypes = args.animalTypes;
    if (args.dogCategoryAcceptance !== undefined) updates.dogCategoryAcceptance = args.dogCategoryAcceptance;
    if (args.acceptedDogSizes !== undefined) updates.acceptedDogSizes = args.acceptedDogSizes;
    if (args.price !== undefined) updates.price = args.price;
    if (args.priceUnit !== undefined) updates.priceUnit = args.priceUnit;
    if (args.pricing !== undefined) updates.pricing = args.pricing;
    if (args.duration !== undefined) updates.duration = args.duration;
    if (args.includedFeatures !== undefined)
      updates.includedFeatures = args.includedFeatures;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.variantId, updates);

    // Mettre à jour le basePrice si le prix, durée, séances ou isActive a changé
    if (args.price !== undefined || args.duration !== undefined || args.numberOfSessions !== undefined || args.isActive !== undefined) {
      await updateServiceBasePrice(ctx, variant.serviceId);
    }

    return { success: true };
  },
});

// Supprimer une variante
export const deleteVariant = mutation({
  args: {
    token: v.string(),
    variantId: v.id("serviceVariants"),
  },
  handler: async (ctx, args) => {
    const { user } = await validateSession(ctx, args.token);

    const variant = await ctx.db.get(args.variantId);
    if (!variant) {
      throw new Error("Variante non trouvée");
    }

    await verifyServiceOwnership(ctx, variant.serviceId, user._id);

    // Vérifier qu'il reste au moins une autre variante
    const existingVariants = await ctx.db
      .query("serviceVariants")
      .withIndex("by_service", (q) => q.eq("serviceId", variant.serviceId))
      .collect();

    if (existingVariants.length <= 1) {
      throw new Error("Un service doit avoir au moins une formule. Vous ne pouvez pas supprimer la dernière.");
    }

    await ctx.db.delete(args.variantId);

    // Mettre à jour le basePrice
    await updateServiceBasePrice(ctx, variant.serviceId);

    return { success: true };
  },
});

// Réordonner les variantes
export const reorderVariants = mutation({
  args: {
    token: v.string(),
    serviceId: v.id("services"),
    variantIds: v.array(v.id("serviceVariants")),
  },
  handler: async (ctx, args) => {
    const { user } = await validateSession(ctx, args.token);
    await verifyServiceOwnership(ctx, args.serviceId, user._id);

    const now = Date.now();

    // Mettre à jour l'ordre de chaque variante
    for (let i = 0; i < args.variantIds.length; i++) {
      await ctx.db.patch(args.variantIds[i], {
        order: i,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

// Activer le mode variantes sur un service existant
// Crée une variante "Standard" avec les valeurs actuelles du service
export const enableVariantMode = mutation({
  args: {
    token: v.string(),
    serviceId: v.id("services"),
  },
  handler: async (ctx, args) => {
    const { user } = await validateSession(ctx, args.token);
    const service = await verifyServiceOwnership(ctx, args.serviceId, user._id);

    if (service.hasVariants) {
      throw new Error("Le mode variantes est déjà activé pour ce service");
    }

    const now = Date.now();

    // Créer une variante "Standard" avec les valeurs actuelles
    const variantId = await ctx.db.insert("serviceVariants", {
      serviceId: args.serviceId,
      name: "Standard",
      description: service.description,
      price: service.price,
      priceUnit: service.priceUnit,
      duration: service.duration,
      order: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Activer le mode variantes
    await ctx.db.patch(args.serviceId, {
      hasVariants: true,
      basePrice: service.price,
      updatedAt: now,
    });

    return { success: true, variantId };
  },
});
