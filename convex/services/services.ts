import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { analyzeContent } from "../utils/contentModeration";

// Catégories de services (deprecated - utiliser serviceCategories table)
export const SERVICE_CATEGORIES = [
  { id: "garde", name: "Garde", icon: "🏠", description: "Garde à domicile ou en famille" },
  { id: "promenade", name: "Promenade", icon: "🚶", description: "Balades et sorties" },
  { id: "toilettage", name: "Toilettage", icon: "🛁", description: "Soins et hygiène" },
  { id: "dressage", name: "Dressage", icon: "🎓", description: "Éducation et comportement" },
  { id: "agilite", name: "Agilité", icon: "🏃", description: "Sport et activités physiques" },
  { id: "transport", name: "Transport", icon: "🚗", description: "Accompagnement véhiculé" },
  { id: "pension", name: "Pension", icon: "🏨", description: "Hébergement longue durée" },
  { id: "visite", name: "Visite", icon: "👋", description: "Visite à domicile" },
  { id: "medical", name: "Soins médicaux", icon: "💊", description: "Accompagnement vétérinaire" },
  { id: "autre", name: "Autre", icon: "✨", description: "Autres services" },
];

// Unités de prix
export const PRICE_UNITS = [
  { id: "hour", label: "par heure" },
  { id: "day", label: "par jour" },
  { id: "week", label: "par semaine" },
  { id: "month", label: "par mois" },
];

// Vérifier le contenu pour les informations interdites (query pour le frontend)
export const checkContent = query({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const nameAnalysis = analyzeContent(args.name);
    const descriptionAnalysis = args.description
      ? analyzeContent(args.description)
      : { isClean: true, requiresModeration: false, message: null };

    const errors: string[] = [];

    if (!nameAnalysis.isClean && nameAnalysis.message) {
      errors.push(`Nom du service: ${nameAnalysis.message}`);
    }
    if (!descriptionAnalysis.isClean && descriptionAnalysis.message) {
      errors.push(`Description: ${descriptionAnalysis.message}`);
    }

    return {
      isValid: errors.length === 0,
      requiresModeration: nameAnalysis.requiresModeration || descriptionAnalysis.requiresModeration,
      errors,
    };
  },
});

// Récupérer les services d'un utilisateur
export const getMyServices = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return [];
    }

    const services = await ctx.db
      .query("services")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .collect();

    return services.map((s) => ({
      id: s._id,
      category: s.category,
      name: s.name,
      description: s.description,
      price: s.price,
      priceUnit: s.priceUnit,
      duration: s.duration,
      animalTypes: s.animalTypes,
      isActive: s.isActive,
      moderationStatus: s.moderationStatus || "approved",
      moderationNote: s.moderationNote,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  },
});

// Ajouter un service
export const addService = mutation({
  args: {
    token: v.string(),
    category: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(),
    priceUnit: v.union(
      v.literal("hour"),
      v.literal("day"),
      v.literal("week"),
      v.literal("month"),
      v.literal("flat")
    ),
    duration: v.optional(v.number()),
    animalTypes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) throw new ConvexError("Utilisateur non trouvé");

    if (user.accountType === "utilisateur") {
      throw new ConvexError("Seuls les annonceurs peuvent ajouter des services");
    }

    // Vérifier si la modération globale est activée
    const moderationConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "service_moderation_enabled"))
      .first();
    const globalModerationEnabled = moderationConfig?.value === "true";

    // Analyse du contenu pour détecter les informations interdites
    const nameAnalysis = analyzeContent(args.name);
    const descriptionAnalysis = args.description
      ? analyzeContent(args.description)
      : { isClean: true, requiresModeration: false, message: null, phoneDetection: { found: false }, emailDetection: { found: false } };

    // Bloquer si contenu interdit avec haute confiance
    if (!nameAnalysis.isClean && !nameAnalysis.requiresModeration) {
      throw new ConvexError(nameAnalysis.message || "Le nom du service contient des informations interdites (email ou téléphone)");
    }
    if (!descriptionAnalysis.isClean && !descriptionAnalysis.requiresModeration) {
      throw new ConvexError(descriptionAnalysis.message || "La description contient des informations interdites (email ou téléphone)");
    }

    const now = Date.now();

    // Déterminer le statut de modération
    // Si modération globale activée OU contenu suspect => modération requise
    const contentRequiresModeration = nameAnalysis.requiresModeration || descriptionAnalysis.requiresModeration;
    const requiresModeration = globalModerationEnabled || contentRequiresModeration;

    let moderationReason: string | undefined;

    if (globalModerationEnabled && !contentRequiresModeration) {
      moderationReason = "Modération systématique activée";
    } else if (contentRequiresModeration) {
      const reasons: string[] = [];
      if (nameAnalysis.phoneDetection.found) reasons.push("Téléphone suspect dans le nom");
      if (nameAnalysis.emailDetection.found) reasons.push("Email suspect dans le nom");
      if (descriptionAnalysis.phoneDetection.found) reasons.push("Téléphone suspect dans la description");
      if (descriptionAnalysis.emailDetection.found) reasons.push("Email suspect dans la description");
      moderationReason = reasons.join(", ");
    }

    const serviceId = await ctx.db.insert("services", {
      userId: session.userId,
      category: args.category,
      name: args.name,
      description: args.description,
      price: args.price,
      priceUnit: args.priceUnit,
      duration: args.duration,
      animalTypes: args.animalTypes,
      isActive: !requiresModeration, // Désactivé si en attente de modération
      moderationStatus: requiresModeration ? "pending" : "approved",
      moderationReason: moderationReason,
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      serviceId,
      requiresModeration,
      message: requiresModeration
        ? "Votre service a été soumis et sera visible après validation par un modérateur."
        : undefined
    };
  },
});

// Modifier un service
export const updateService = mutation({
  args: {
    token: v.string(),
    serviceId: v.id("services"),
    category: v.optional(v.string()),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    priceUnit: v.optional(
      v.union(
        v.literal("hour"),
        v.literal("day"),
        v.literal("week"),
        v.literal("month"),
        v.literal("flat")
      )
    ),
    duration: v.optional(v.number()),
    animalTypes: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const service = await ctx.db.get(args.serviceId);
    if (!service) throw new ConvexError("Service non trouvé");

    if (service.userId !== session.userId) {
      throw new ConvexError("Vous ne pouvez pas modifier ce service");
    }

    // Vérifier si la modération globale est activée
    const moderationConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "service_moderation_enabled"))
      .first();
    const globalModerationEnabled = moderationConfig?.value === "true";

    // Analyse du contenu si nom ou description modifiés
    let contentRequiresModeration = false;
    let moderationReason: string | undefined;

    if (args.name !== undefined) {
      const nameAnalysis = analyzeContent(args.name);
      if (!nameAnalysis.isClean && !nameAnalysis.requiresModeration) {
        throw new ConvexError(nameAnalysis.message || "Le nom du service contient des informations interdites");
      }
      if (nameAnalysis.requiresModeration) {
        contentRequiresModeration = true;
        moderationReason = "Modification du nom suspecte";
      }
    }

    if (args.description !== undefined) {
      const descriptionAnalysis = analyzeContent(args.description);
      if (!descriptionAnalysis.isClean && !descriptionAnalysis.requiresModeration) {
        throw new ConvexError(descriptionAnalysis.message || "La description contient des informations interdites");
      }
      if (descriptionAnalysis.requiresModeration) {
        contentRequiresModeration = true;
        moderationReason = moderationReason
          ? moderationReason + ", description suspecte"
          : "Modification de la description suspecte";
      }
    }

    // Si modération globale activée et modification du nom/description => re-modération
    const requiresModeration = (globalModerationEnabled && (args.name !== undefined || args.description !== undefined)) || contentRequiresModeration;

    if (globalModerationEnabled && !contentRequiresModeration && (args.name !== undefined || args.description !== undefined)) {
      moderationReason = "Modération systématique activée";
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.category !== undefined) updates.category = args.category;
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.price !== undefined) updates.price = args.price;
    if (args.priceUnit !== undefined) updates.priceUnit = args.priceUnit;
    if (args.duration !== undefined) updates.duration = args.duration;
    if (args.animalTypes !== undefined) updates.animalTypes = args.animalTypes;
    if (args.isActive !== undefined && !requiresModeration) updates.isActive = args.isActive;

    // Si modération requise, mettre en attente
    if (requiresModeration) {
      updates.moderationStatus = "pending";
      updates.moderationReason = moderationReason;
      updates.isActive = false;
    }

    await ctx.db.patch(args.serviceId, updates);

    return {
      success: true,
      requiresModeration,
      message: requiresModeration
        ? "Votre modification sera visible après validation par un modérateur."
        : undefined
    };
  },
});

// Supprimer un service
export const deleteService = mutation({
  args: {
    token: v.string(),
    serviceId: v.id("services"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const service = await ctx.db.get(args.serviceId);
    if (!service) throw new ConvexError("Service non trouvé");

    if (service.userId !== session.userId) {
      throw new ConvexError("Vous ne pouvez pas supprimer ce service");
    }

    await ctx.db.delete(args.serviceId);

    return { success: true };
  },
});
