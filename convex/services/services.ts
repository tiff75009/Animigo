import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { analyzeContent } from "../utils/contentModeration";
import { Id } from "../_generated/dataModel";

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

// Récupérer les services d'un utilisateur (avec variantes et options)
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

    // Pour chaque service, récupérer les variantes et options
    const servicesWithDetails = await Promise.all(
      services.map(async (s) => {
        // Récupérer les variantes
        const variants = await ctx.db
          .query("serviceVariants")
          .withIndex("by_service", (q) => q.eq("serviceId", s._id))
          .collect();

        // Pour les variantes collectives, vérifier si des créneaux existent
        // Pour les variantes individuelles, s'assurer qu'elles sont actives par défaut
        const today = new Date().toISOString().split("T")[0];
        const variantsWithSlotCount = await Promise.all(
          variants.map(async (v) => {
            if (v.sessionType === "collective") {
              // Compter les créneaux futurs actifs
              const slots = await ctx.db
                .query("collectiveSlots")
                .withIndex("by_variant", (q: any) => q.eq("variantId", v._id))
                .collect();

              const activeSlots = slots.filter(
                (slot: any) => slot.date >= today && slot.isActive && !slot.isCancelled
              );

              return {
                ...v,
                slotsCount: activeSlots.length,
                needsSlotConfiguration: activeSlots.length === 0,
                isActive: activeSlots.length > 0, // Une formule collective n'est active que si elle a des créneaux
              };
            }
            // Pour les formules individuelles, utiliser isActive de la DB ou true par défaut
            return {
              ...v,
              isActive: v.isActive !== false, // true si isActive est true ou undefined
            };
          })
        );

        // Récupérer les options
        const options = await ctx.db
          .query("serviceOptions")
          .withIndex("by_service", (q) => q.eq("serviceId", s._id))
          .collect();

        return {
          id: s._id,
          category: s.category,
          name: s.name,
          description: s.description,
          price: s.price,
          priceUnit: s.priceUnit,
          duration: s.duration,
          animalTypes: s.animalTypes,
          serviceLocation: s.serviceLocation,
          allowOvernightStay: s.allowOvernightStay,
          dayStartTime: s.dayStartTime,
          dayEndTime: s.dayEndTime,
          overnightPrice: s.overnightPrice,
          acceptedDogSizes: s.acceptedDogSizes,
          isActive: s.isActive,
          hasVariants: s.hasVariants || false,
          basePrice: s.basePrice,
          moderationStatus: s.moderationStatus || "approved",
          moderationNote: s.moderationNote,
          isSapEligible: s.isSapEligible || false,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          // Compteurs pour l'affichage
          variantsCount: variantsWithSlotCount.length,
          optionsCount: options.length,
          // Variantes triées par ordre
          variants: variantsWithSlotCount
            .sort((a, b) => a.order - b.order)
            .map((v) => ({
              id: v._id,
              name: v.name,
              description: v.description,
              objectives: v.objectives,
              numberOfSessions: v.numberOfSessions,
              sessionInterval: v.sessionInterval,
              sessionType: v.sessionType,
              maxAnimalsPerSession: v.maxAnimalsPerSession,
              serviceLocation: v.serviceLocation,
              animalTypes: v.animalTypes,
              dogCategoryAcceptance: v.dogCategoryAcceptance,
              acceptedDogSizes: v.acceptedDogSizes,
              price: v.price,
              priceUnit: v.priceUnit,
              pricing: v.pricing, // Multi-tarification
              duration: v.duration,
              includedFeatures: v.includedFeatures,
              order: v.order,
              isActive: v.isActive,
              needsSlotConfiguration: v.needsSlotConfiguration, // Créneaux requis pour collectives
              slotsCount: v.slotsCount, // Nombre de créneaux configurés
              isSapEligible: v.isSapEligible || false,
            })),
          // Options triées par ordre (avec info variantId pour affichage par formule)
          options: options
            .sort((a, b) => a.order - b.order)
            .map((o) => ({
              id: o._id,
              variantId: o.variantId, // ID de la formule liée (undefined = option partagée)
              name: o.name,
              description: o.description,
              price: o.price,
              priceType: o.priceType,
              unitLabel: o.unitLabel,
              maxQuantity: o.maxQuantity,
              order: o.order,
              isActive: o.isActive,
            })),
        };
      })
    );

    return servicesWithDetails;
  },
});

// Ajouter un service (structure simplifiée: prestation + formules + options)
// LOGIQUE UPSERT: Si un service existe déjà pour cette catégorie, on ajoute une nouvelle formule
export const addService = mutation({
  args: {
    token: v.string(),
    category: v.string(), // Slug de la prestation (ex: "toilettage")
    // animalTypes est maintenant optionnel au niveau service (legacy/rétrocompatibilité)
    // Les animaux acceptés sont définis au niveau de chaque formule
    animalTypes: v.optional(v.array(v.string())),
    // Lieu de prestation (legacy - maintenant au niveau formule)
    serviceLocation: v.optional(v.union(
      v.literal("announcer_home"),
      v.literal("client_home"),
      v.literal("both")
    )),
    // Garde de nuit
    allowOvernightStay: v.optional(v.boolean()),
    dayStartTime: v.optional(v.string()),
    dayEndTime: v.optional(v.string()),
    overnightPrice: v.optional(v.number()),
    // Chiens catégorisés (législation française) - legacy, maintenant au niveau formule
    dogCategoryAcceptance: v.optional(v.union(
      v.literal("none"),
      v.literal("cat1"),
      v.literal("cat2"),
      v.literal("both")
    )),
    // Tailles de chiens acceptées - legacy, maintenant au niveau formule
    acceptedDogSizes: v.optional(v.array(v.union(
      v.literal("small"),
      v.literal("medium"),
      v.literal("large")
    ))),
    // SAP : éligible TVA réduite pour personnes dépendantes/handicapées
    isSapEligible: v.optional(v.boolean()),
    // Formule initiale obligatoire
    initialVariants: v.array(v.object({
      name: v.string(),
      description: v.optional(v.string()),
      objectives: v.optional(v.array(v.object({
        icon: v.string(),
        text: v.string(),
      }))),
      numberOfSessions: v.optional(v.number()),
      sessionInterval: v.optional(v.number()),
      sessionType: v.optional(v.union(v.literal("individual"), v.literal("collective"))),
      maxAnimalsPerSession: v.optional(v.number()),
      serviceLocation: v.optional(v.union(
        v.literal("announcer_home"),
        v.literal("client_home"),
        v.literal("both")
      )),
      // Animaux acceptés au niveau de la formule (NOUVEAU: obligatoire)
      animalTypes: v.optional(v.array(v.string())),
      // Restrictions chiens (au niveau de la formule)
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
      price: v.number(), // En centimes (prix principal)
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
      isSapEligible: v.optional(v.boolean()),
    })),
    // Options additionnelles (optionnelles) - seront liées aux formules créées
    initialOptions: v.optional(v.array(v.object({
      name: v.string(),
      description: v.optional(v.string()),
      price: v.number(), // En centimes
      priceType: v.union(
        v.literal("flat"),
        v.literal("per_day"),
        v.literal("per_unit")
      ),
      unitLabel: v.optional(v.string()),
      maxQuantity: v.optional(v.number()),
    }))),
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

    // Vérifier le statut de vérification du téléphone
    const isPhoneVerified = user.phoneVerified === true;

    // Vérifier qu'au moins une formule est fournie
    if (!args.initialVariants || args.initialVariants.length === 0) {
      throw new ConvexError("Au moins une formule est requise");
    }

    // Vérifier que la catégorie existe
    const categoryExists = await ctx.db
      .query("serviceCategories")
      .withIndex("by_slug", (q) => q.eq("slug", args.category))
      .first();

    if (!categoryExists) {
      throw new ConvexError("Catégorie de prestation invalide");
    }

    const now = Date.now();

    // LOGIQUE UPSERT: Vérifier si un service existe déjà pour cette catégorie
    const existingService = await ctx.db
      .query("services")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .filter((q) => q.eq(q.field("category"), args.category))
      .first();

    // Vérifier si l'annonceur est SAP-approuvé (pour les formules)
    const sapProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();
    const announcerIsSapApproved = sapProfile?.isSapApproved === true;

    let serviceId: Id<"services">;
    let isNewService = false;
    let existingVariantsCount = 0;

    if (existingService) {
      // Service existant: on va ajouter les nouvelles formules
      serviceId = existingService._id;

      // Récupérer le nombre de formules existantes pour l'ordre
      const existingVariants = await ctx.db
        .query("serviceVariants")
        .withIndex("by_service", (q) => q.eq("serviceId", serviceId))
        .collect();
      existingVariantsCount = existingVariants.length;
    } else {
      // Nouveau service
      isNewService = true;

      // Collecter tous les types d'animaux des formules pour le service
      const allAnimalTypes = [...new Set(args.initialVariants.flatMap(v => v.animalTypes || []))];
      // Fallback sur args.animalTypes si aucun animal défini dans les formules
      const serviceAnimalTypes = allAnimalTypes.length > 0 ? allAnimalTypes : (args.animalTypes || []);

      // Calculer le prix de base (min des totaux: prix horaire × durée / 60 × nombre de séances)
      const totalPrices = args.initialVariants.map(v => {
        const duration = v.duration || 60; // Par défaut 60 minutes
        const sessions = v.numberOfSessions || 1; // Par défaut 1 séance
        return Math.round((v.price * duration / 60) * sessions);
      });
      const basePrice = Math.min(...totalPrices);

      // Créer le service
      serviceId = await ctx.db.insert("services", {
        userId: session.userId,
        category: args.category,
        animalTypes: serviceAnimalTypes,
        serviceLocation: args.serviceLocation,
        allowOvernightStay: args.allowOvernightStay,
        dayStartTime: args.dayStartTime,
        dayEndTime: args.dayEndTime,
        overnightPrice: args.overnightPrice,
        dogCategoryAcceptance: args.dogCategoryAcceptance,
        acceptedDogSizes: args.acceptedDogSizes,
        isActive: isPhoneVerified, // Inactif si téléphone non vérifié
        basePrice: basePrice,
        moderationStatus: "approved", // Catégories gérées par admin = pas de modération
        createdAt: now,
        updatedAt: now,
      });
    }

    // Créer les formules
    const createdVariantIds: Id<"serviceVariants">[] = [];
    for (let i = 0; i < args.initialVariants.length; i++) {
      const variant = args.initialVariants[i];
      // Si collective, forcer le lieu à announcer_home
      const effectiveLocation = variant.sessionType === "collective" ? "announcer_home" : variant.serviceLocation;
      const variantId = await ctx.db.insert("serviceVariants", {
        serviceId: serviceId,
        name: variant.name,
        description: variant.description,
        objectives: variant.objectives,
        numberOfSessions: variant.numberOfSessions,
        sessionInterval: variant.sessionInterval,
        sessionType: variant.sessionType,
        maxAnimalsPerSession: variant.maxAnimalsPerSession,
        serviceLocation: effectiveLocation,
        animalTypes: variant.animalTypes,
        dogCategoryAcceptance: variant.dogCategoryAcceptance,
        acceptedDogSizes: variant.acceptedDogSizes,
        price: variant.price,
        priceUnit: variant.priceUnit,
        pricing: variant.pricing,
        duration: variant.duration,
        includedFeatures: variant.includedFeatures,
        isSapEligible: (variant.isSapEligible && announcerIsSapApproved) ? true : undefined,
        order: existingVariantsCount + i, // Continuer l'ordre après les formules existantes
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      createdVariantIds.push(variantId);
    }

    // Créer les options si fournies - liées aux nouvelles formules créées
    if (args.initialOptions && args.initialOptions.length > 0) {
      // Trouver l'ordre max des options existantes
      const existingOptions = await ctx.db
        .query("serviceOptions")
        .withIndex("by_service", (q) => q.eq("serviceId", serviceId))
        .collect();
      const maxOrder = existingOptions.reduce((max, o) => Math.max(max, o.order), -1);

      for (let i = 0; i < args.initialOptions.length; i++) {
        const option = args.initialOptions[i];
        // Lier l'option à la première formule créée (ou pas de variantId si plusieurs formules)
        const variantId = createdVariantIds.length === 1 ? createdVariantIds[0] : undefined;
        await ctx.db.insert("serviceOptions", {
          serviceId: serviceId,
          variantId: variantId,
          name: option.name,
          description: option.description,
          price: option.price,
          priceType: option.priceType,
          unitLabel: option.unitLabel,
          maxQuantity: option.maxQuantity,
          order: maxOrder + 1 + i,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Si service existant, mettre à jour les animalTypes et le basePrice
    if (!isNewService) {
      // Récupérer toutes les formules pour recalculer
      const allVariants = await ctx.db
        .query("serviceVariants")
        .withIndex("by_service", (q) => q.eq("serviceId", serviceId))
        .collect();

      // Collecter tous les types d'animaux des formules
      const allAnimalTypes = [...new Set(allVariants.flatMap(v => v.animalTypes || []))];

      // Recalculer le prix de base
      const totalPrices = allVariants.map(v => {
        const duration = v.duration || 60;
        const sessions = v.numberOfSessions || 1;
        return Math.round((v.price * duration / 60) * sessions);
      });
      const newBasePrice = Math.min(...totalPrices);

      await ctx.db.patch(serviceId, {
        animalTypes: allAnimalTypes,
        basePrice: newBasePrice,
        updatedAt: now,
      });
    }

    return {
      success: true,
      serviceId,
      variantIds: createdVariantIds,
      isNewService,
      phoneVerified: isPhoneVerified,
      message: isNewService
        ? (isPhoneVerified
            ? "Service créé avec succès"
            : "Service créé mais inactif — veuillez vérifier votre téléphone pour le mettre en ligne")
        : `${args.initialVariants.length} formule(s) ajoutée(s) au service existant`,
    };
  },
});

// Modifier un service (structure simplifiée)
export const updateService = mutation({
  args: {
    token: v.string(),
    serviceId: v.id("services"),
    category: v.optional(v.string()),
    animalTypes: v.optional(v.array(v.string())),
    serviceLocation: v.optional(v.union(
      v.literal("announcer_home"),
      v.literal("client_home"),
      v.literal("both")
    )),
    // Garde de nuit
    allowOvernightStay: v.optional(v.boolean()),
    dayStartTime: v.optional(v.string()),
    dayEndTime: v.optional(v.string()),
    overnightPrice: v.optional(v.number()),
    // Chiens catégorisés
    dogCategoryAcceptance: v.optional(v.union(
      v.literal("none"),
      v.literal("cat1"),
      v.literal("cat2"),
      v.literal("both")
    )),
    // Tailles de chiens acceptées
    acceptedDogSizes: v.optional(v.array(v.union(
      v.literal("small"),
      v.literal("medium"),
      v.literal("large")
    ))),
    // SAP : éligible TVA réduite
    isSapEligible: v.optional(v.boolean()),
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

    // Si changement de catégorie, vérifier qu'elle existe
    if (args.category !== undefined) {
      const newCategory = args.category;
      const categoryExists = await ctx.db
        .query("serviceCategories")
        .withIndex("by_slug", (q) => q.eq("slug", newCategory))
        .first();

      if (!categoryExists) {
        throw new ConvexError("Catégorie de prestation invalide");
      }

      // Vérifier qu'un autre service n'existe pas déjà pour cette catégorie
      const existingService = await ctx.db
        .query("services")
        .withIndex("by_user", (q) => q.eq("userId", session.userId))
        .filter((q) => q.and(
          q.eq(q.field("category"), newCategory),
          q.neq(q.field("_id"), args.serviceId)
        ))
        .first();

      if (existingService) {
        throw new ConvexError("Vous avez déjà un service pour cette prestation");
      }
    }

    // Bloquer l'activation si le téléphone n'est pas vérifié
    const user = await ctx.db.get(session.userId);
    if (args.isActive === true && user && user.phoneVerified !== true) {
      throw new ConvexError("Vous devez vérifier votre numéro de téléphone avant d'activer un service. Rendez-vous dans Paramètres pour vérifier votre téléphone.");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.category !== undefined) updates.category = args.category;
    if (args.animalTypes !== undefined) updates.animalTypes = args.animalTypes;
    if (args.serviceLocation !== undefined) updates.serviceLocation = args.serviceLocation;
    if (args.allowOvernightStay !== undefined) updates.allowOvernightStay = args.allowOvernightStay;
    if (args.dayStartTime !== undefined) updates.dayStartTime = args.dayStartTime;
    if (args.dayEndTime !== undefined) updates.dayEndTime = args.dayEndTime;
    if (args.overnightPrice !== undefined) updates.overnightPrice = args.overnightPrice;
    if (args.dogCategoryAcceptance !== undefined) updates.dogCategoryAcceptance = args.dogCategoryAcceptance;
    if (args.acceptedDogSizes !== undefined) updates.acceptedDogSizes = args.acceptedDogSizes;
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    if (args.isSapEligible !== undefined) {
      // Vérifier que l'annonceur est SAP-approuvé
      if (args.isSapEligible === true) {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", session.userId))
          .first();
        if (profile?.isSapApproved) {
          updates.isSapEligible = true;
        }
      } else {
        updates.isSapEligible = false;
      }
    }

    await ctx.db.patch(args.serviceId, updates);

    return { success: true };
  },
});

// Supprimer un service (et ses variantes/options)
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

    // Supprimer les variantes associées
    const variants = await ctx.db
      .query("serviceVariants")
      .withIndex("by_service", (q) => q.eq("serviceId", args.serviceId))
      .collect();
    for (const variant of variants) {
      await ctx.db.delete(variant._id);
    }

    // Supprimer les options associées
    const options = await ctx.db
      .query("serviceOptions")
      .withIndex("by_service", (q) => q.eq("serviceId", args.serviceId))
      .collect();
    for (const option of options) {
      await ctx.db.delete(option._id);
    }

    // Supprimer le service
    await ctx.db.delete(args.serviceId);

    return { success: true };
  },
});

// Migration des services existants vers le nouveau modèle
// Convertit les services avec prix direct en formule "Standard"
export const migrateServicesToVariants = mutation({
  args: {
    token: v.string(),
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
    if (!user || user.role !== "admin") {
      throw new ConvexError("Accès réservé aux administrateurs");
    }

    // Récupérer tous les services qui ont un prix mais pas de formules
    const allServices = await ctx.db.query("services").collect();

    let migrated = 0;
    const now = Date.now();

    for (const service of allServices) {
      // Vérifier si le service a des formules
      const existingVariants = await ctx.db
        .query("serviceVariants")
        .withIndex("by_service", (q) => q.eq("serviceId", service._id))
        .collect();

      // Si pas de formules et que le service a un prix legacy
      if (existingVariants.length === 0 && service.price && service.price > 0) {
        // Créer une formule "Standard" avec les valeurs existantes
        await ctx.db.insert("serviceVariants", {
          serviceId: service._id,
          name: service.name || "Standard",
          description: service.description,
          price: service.price,
          priceUnit: service.priceUnit || "flat",
          duration: service.duration,
          order: 0,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });

        // Mettre à jour le basePrice du service
        await ctx.db.patch(service._id, {
          basePrice: service.price,
          updatedAt: now,
        });

        migrated++;
      }
    }

    return {
      success: true,
      migrated,
      message: `${migrated} service(s) migré(s) vers le nouveau modèle`,
    };
  },
});
