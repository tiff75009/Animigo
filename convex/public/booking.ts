import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { ConvexError } from "convex/values";
import { ANIMAL_TYPES } from "../animals";

// Générer toutes les dates entre deux dates (YYYY-MM-DD)
function getDatesBetween(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

// Vérifier si deux plages de dates se chevauchent
function datesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  return start1 <= end2 && end1 >= start2;
}

// Créer une réservation en attente
export const createPendingBooking = mutation({
  args: {
    announcerId: v.id("users"),
    serviceId: v.id("services"),
    variantId: v.string(),
    optionIds: v.optional(v.array(v.string())),
    startDate: v.string(),
    endDate: v.string(),
    startTime: v.optional(v.string()),
    calculatedAmount: v.number(),
    // Token optionnel (si utilisateur connecté)
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let userId: Id<"users"> | undefined;

    // Si un token est fourni, récupérer l'utilisateur
    if (args.token) {
      const session = await ctx.db
        .query("sessions")
        .withIndex("by_token", (q) => q.eq("token", args.token!))
        .first();

      if (session && session.expiresAt > Date.now()) {
        userId = session.userId;
      }
    }

    const now = Date.now();
    // Expiration dans 24h
    const expiresAt = now + 24 * 60 * 60 * 1000;

    const pendingBookingId = await ctx.db.insert("pendingBookings", {
      announcerId: args.announcerId,
      serviceId: args.serviceId,
      variantId: args.variantId,
      optionIds: args.optionIds,
      startDate: args.startDate,
      endDate: args.endDate,
      startTime: args.startTime,
      calculatedAmount: args.calculatedAmount,
      userId,
      expiresAt,
      createdAt: now,
    });

    return {
      success: true,
      bookingId: pendingBookingId,
    };
  },
});

// Récupérer une réservation en attente
export const getPendingBooking = query({
  args: {
    bookingId: v.id("pendingBookings"),
  },
  handler: async (ctx, args) => {
    const pendingBooking = await ctx.db.get(args.bookingId);

    if (!pendingBooking) {
      return null;
    }

    // Vérifier si la réservation n'a pas expiré
    if (pendingBooking.expiresAt < Date.now()) {
      return null;
    }

    // Récupérer les détails de l'annonceur
    const announcer = await ctx.db.get(pendingBooking.announcerId);
    if (!announcer) {
      return null;
    }

    // Récupérer le profil de l'annonceur
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", pendingBooking.announcerId))
      .first();

    // Récupérer la photo de profil
    const profilePhoto = await ctx.db
      .query("photos")
      .withIndex("by_user", (q) => q.eq("userId", pendingBooking.announcerId))
      .filter((q) => q.eq(q.field("isProfilePhoto"), true))
      .first();

    let profileImageUrl: string | null = null;
    if (profilePhoto?.storageId) {
      profileImageUrl = await ctx.storage.getUrl(profilePhoto.storageId);
    }

    // Récupérer le service
    const service = await ctx.db.get(pendingBooking.serviceId);
    if (!service) {
      return null;
    }

    // Récupérer la catégorie
    const category = await ctx.db
      .query("serviceCategories")
      .withIndex("by_slug", (q) => q.eq("slug", service.category))
      .first();

    // Récupérer la variante
    const variant = await ctx.db
      .query("serviceVariants")
      .withIndex("by_service", (q) => q.eq("serviceId", pendingBooking.serviceId))
      .filter((q) => q.eq(q.field("_id"), pendingBooking.variantId as Id<"serviceVariants">))
      .first();

    // Récupérer les options sélectionnées
    const selectedOptions: Array<{ id: string; name: string; price: number }> = [];
    if (pendingBooking.optionIds && pendingBooking.optionIds.length > 0) {
      for (const optionId of pendingBooking.optionIds) {
        const option = await ctx.db.get(optionId as Id<"serviceOptions">);
        if (option) {
          selectedOptions.push({
            id: option._id,
            name: option.name,
            price: option.price,
          });
        }
      }
    }

    // Récupérer toutes les options disponibles pour ce service
    const allOptions = await ctx.db
      .query("serviceOptions")
      .withIndex("by_service", (q) => q.eq("serviceId", pendingBooking.serviceId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const availableOptions = allOptions.map((opt) => ({
      id: opt._id,
      name: opt.name,
      description: opt.description,
      price: opt.price,
      priceUnit: opt.priceUnit,
    }));

    // Déterminer le type de statut pour le badge
    let statusType: "particulier" | "micro_entrepreneur" | "professionnel" = "particulier";
    if (announcer.accountType === "annonceur_pro") {
      if (announcer.companyType === "micro_enterprise") {
        statusType = "micro_entrepreneur";
      } else {
        statusType = "professionnel";
      }
    }

    return {
      id: pendingBooking._id,
      announcer: {
        id: announcer._id,
        firstName: announcer.firstName,
        lastName: announcer.lastName,
        profileImage: profileImageUrl,
        location: profile?.location ?? profile?.city ?? "",
        verified: announcer.accountType === "annonceur_pro",
        accountType: announcer.accountType,
        companyType: announcer.companyType,
        statusType,
      },
      service: {
        id: service._id,
        category: service.category,
        categoryName: category?.name ?? service.category,
        categoryIcon: category?.icon,
      },
      variant: variant ? {
        id: variant._id,
        name: variant.name,
        price: variant.price,
        priceUnit: variant.priceUnit,
        duration: variant.duration,
      } : null,
      options: selectedOptions,
      availableOptions,
      dates: {
        startDate: pendingBooking.startDate,
        endDate: pendingBooking.endDate,
        startTime: pendingBooking.startTime,
      },
      amount: pendingBooking.calculatedAmount,
      userId: pendingBooking.userId,
      expiresAt: pendingBooking.expiresAt,
    };
  },
});

// Finaliser une réservation (utilisateur connecté)
export const finalizeBooking = mutation({
  args: {
    token: v.string(),
    bookingId: v.id("pendingBookings"),
    animalId: v.id("animals"),
    location: v.string(),
    notes: v.optional(v.string()),
    // Options mises à jour (si l'utilisateur a modifié sur la page de réservation)
    updatedOptionIds: v.optional(v.array(v.string())),
    updatedAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Vérifier la session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Vous devez être connecté pour finaliser la réservation");
    }

    // Récupérer la réservation en attente
    const pendingBooking = await ctx.db.get(args.bookingId);

    if (!pendingBooking) {
      throw new ConvexError("Réservation non trouvée");
    }

    if (pendingBooking.expiresAt < Date.now()) {
      throw new ConvexError("La réservation a expiré");
    }

    // Récupérer l'animal
    const animal = await ctx.db.get(args.animalId);

    if (!animal) {
      throw new ConvexError("Animal non trouvé");
    }

    if (animal.userId !== session.userId) {
      throw new ConvexError("Cet animal ne vous appartient pas");
    }

    // Récupérer l'utilisateur client
    const client = await ctx.db.get(session.userId);
    if (!client) {
      throw new ConvexError("Utilisateur non trouvé");
    }

    // Récupérer le service
    const service = await ctx.db.get(pendingBooking.serviceId);
    if (!service) {
      throw new ConvexError("Service non trouvé");
    }

    // Récupérer la catégorie
    const category = await ctx.db
      .query("serviceCategories")
      .withIndex("by_slug", (q) => q.eq("slug", service.category))
      .first();

    // Récupérer la variante
    const variant = await ctx.db
      .query("serviceVariants")
      .withIndex("by_service", (q) => q.eq("serviceId", pendingBooking.serviceId))
      .filter((q) => q.eq(q.field("_id"), pendingBooking.variantId as Id<"serviceVariants">))
      .first();

    if (!variant) {
      throw new ConvexError("Formule non trouvée");
    }

    // Vérifier la disponibilité
    const unavailabilities = await ctx.db
      .query("availability")
      .withIndex("by_user", (q) => q.eq("userId", pendingBooking.announcerId))
      .filter((q) => q.eq(q.field("status"), "unavailable"))
      .collect();

    const unavailableDates = new Set(unavailabilities.map((a) => a.date));
    const requestedDates = getDatesBetween(pendingBooking.startDate, pendingBooking.endDate);

    for (const date of requestedDates) {
      if (unavailableDates.has(date)) {
        throw new ConvexError(`L'annonceur n'est plus disponible le ${date}`);
      }
    }

    // Vérifier les conflits de missions
    const existingMissions = await ctx.db
      .query("missions")
      .withIndex("by_announcer", (q) => q.eq("announcerId", pendingBooking.announcerId))
      .filter((q) =>
        q.and(
          q.eq(q.field("serviceCategory"), service.category),
          q.neq(q.field("status"), "cancelled"),
          q.neq(q.field("status"), "refused")
        )
      )
      .collect();

    const hasConflict = existingMissions.some((m) =>
      datesOverlap(m.startDate, m.endDate, pendingBooking.startDate, pendingBooking.endDate)
    );

    if (hasConflict) {
      throw new ConvexError("L'annonceur a déjà une réservation sur ces dates");
    }

    // Trouver le type d'animal pour l'emoji
    const animalType = ANIMAL_TYPES.find((t) => t.id === animal.type);

    const now = Date.now();

    // Utiliser le montant mis à jour si fourni, sinon utiliser celui de la réservation
    const finalAmount = args.updatedAmount ?? pendingBooking.calculatedAmount;

    // Créer la mission
    const missionId = await ctx.db.insert("missions", {
      announcerId: pendingBooking.announcerId,
      clientId: session.userId,
      serviceId: pendingBooking.serviceId,
      animalId: args.animalId,
      clientName: `${client.firstName} ${client.lastName}`,
      clientPhone: client.phone,
      animal: {
        name: animal.name,
        type: animal.type,
        emoji: animalType?.emoji ?? "🐾",
      },
      serviceName: `${category?.name ?? service.category} - ${variant.name}`,
      serviceCategory: service.category,
      startDate: pendingBooking.startDate,
      endDate: pendingBooking.endDate,
      startTime: pendingBooking.startTime,
      status: "pending_acceptance",
      amount: finalAmount,
      paymentStatus: "not_due",
      location: args.location,
      clientNotes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    // Supprimer la réservation en attente
    await ctx.db.delete(args.bookingId);

    return {
      success: true,
      missionId,
    };
  },
});

// Finaliser une réservation en tant qu'invité (création de compte)
export const finalizeBookingAsGuest = mutation({
  args: {
    bookingId: v.id("pendingBookings"),
    // Données utilisateur
    userData: v.object({
      firstName: v.string(),
      lastName: v.string(),
      email: v.string(),
      phone: v.string(),
      password: v.string(),
    }),
    // Données animal
    animalData: v.object({
      name: v.string(),
      type: v.string(),
      gender: v.union(v.literal("male"), v.literal("female"), v.literal("unknown")),
      breed: v.optional(v.string()),
      birthDate: v.optional(v.string()),
      description: v.optional(v.string()),
      compatibilityTraits: v.optional(v.array(v.string())),
      behaviorTraits: v.optional(v.array(v.string())),
      needsTraits: v.optional(v.array(v.string())),
      customTraits: v.optional(v.array(v.string())),
      specialNeeds: v.optional(v.string()),
      medicalConditions: v.optional(v.string()),
    }),
    location: v.string(),
    notes: v.optional(v.string()),
    // Options mises à jour (si l'utilisateur a modifié sur la page de réservation)
    updatedOptionIds: v.optional(v.array(v.string())),
    updatedAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Récupérer la réservation en attente
    const pendingBooking = await ctx.db.get(args.bookingId);

    if (!pendingBooking) {
      throw new ConvexError("Réservation non trouvée");
    }

    if (pendingBooking.expiresAt < Date.now()) {
      throw new ConvexError("La réservation a expiré");
    }

    // Vérifier si l'email est déjà utilisé
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.userData.email.toLowerCase()))
      .first();

    if (existingUser) {
      throw new ConvexError("Un compte existe déjà avec cet email. Veuillez vous connecter.");
    }

    // Récupérer le service
    const service = await ctx.db.get(pendingBooking.serviceId);
    if (!service) {
      throw new ConvexError("Service non trouvé");
    }

    // Récupérer la catégorie
    const category = await ctx.db
      .query("serviceCategories")
      .withIndex("by_slug", (q) => q.eq("slug", service.category))
      .first();

    // Récupérer la variante
    const variant = await ctx.db
      .query("serviceVariants")
      .withIndex("by_service", (q) => q.eq("serviceId", pendingBooking.serviceId))
      .filter((q) => q.eq(q.field("_id"), pendingBooking.variantId as Id<"serviceVariants">))
      .first();

    if (!variant) {
      throw new ConvexError("Formule non trouvée");
    }

    // Vérifier la disponibilité
    const unavailabilities = await ctx.db
      .query("availability")
      .withIndex("by_user", (q) => q.eq("userId", pendingBooking.announcerId))
      .filter((q) => q.eq(q.field("status"), "unavailable"))
      .collect();

    const unavailableDates = new Set(unavailabilities.map((a) => a.date));
    const requestedDates = getDatesBetween(pendingBooking.startDate, pendingBooking.endDate);

    for (const date of requestedDates) {
      if (unavailableDates.has(date)) {
        throw new ConvexError(`L'annonceur n'est plus disponible le ${date}`);
      }
    }

    // Vérifier les conflits de missions
    const existingMissions = await ctx.db
      .query("missions")
      .withIndex("by_announcer", (q) => q.eq("announcerId", pendingBooking.announcerId))
      .filter((q) =>
        q.and(
          q.eq(q.field("serviceCategory"), service.category),
          q.neq(q.field("status"), "cancelled"),
          q.neq(q.field("status"), "refused")
        )
      )
      .collect();

    const hasConflict = existingMissions.some((m) =>
      datesOverlap(m.startDate, m.endDate, pendingBooking.startDate, pendingBooking.endDate)
    );

    if (hasConflict) {
      throw new ConvexError("L'annonceur a déjà une réservation sur ces dates");
    }

    const now = Date.now();

    // Utiliser le montant mis à jour si fourni, sinon utiliser celui de la réservation
    const finalAmount = args.updatedAmount ?? pendingBooking.calculatedAmount;

    // Hash du mot de passe (utiliser bcrypt en production)
    // Pour l'instant, on utilise un hash simple - À REMPLACER PAR BCRYPT
    const passwordHash = args.userData.password; // TODO: Implémenter bcrypt

    // 1. Créer le compte utilisateur
    const userId = await ctx.db.insert("users", {
      email: args.userData.email.toLowerCase(),
      passwordHash,
      accountType: "utilisateur",
      firstName: args.userData.firstName.trim(),
      lastName: args.userData.lastName.trim(),
      phone: args.userData.phone.trim(),
      cguAcceptedAt: now,
      createdAt: now,
      updatedAt: now,
      emailVerified: false,
      isActive: true,
    });

    // 2. Créer la fiche animal
    const animalType = ANIMAL_TYPES.find((t) => t.id === args.animalData.type);

    const animalId = await ctx.db.insert("animals", {
      userId,
      name: args.animalData.name.trim(),
      type: args.animalData.type,
      gender: args.animalData.gender,
      breed: args.animalData.breed?.trim() || undefined,
      birthDate: args.animalData.birthDate || undefined,
      description: args.animalData.description?.trim() || undefined,
      compatibilityTraits: args.animalData.compatibilityTraits || undefined,
      behaviorTraits: args.animalData.behaviorTraits || undefined,
      needsTraits: args.animalData.needsTraits || undefined,
      customTraits: args.animalData.customTraits || undefined,
      specialNeeds: args.animalData.specialNeeds?.trim() || undefined,
      medicalConditions: args.animalData.medicalConditions?.trim() || undefined,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // 3. Créer la mission
    const missionId = await ctx.db.insert("missions", {
      announcerId: pendingBooking.announcerId,
      clientId: userId,
      serviceId: pendingBooking.serviceId,
      animalId,
      clientName: `${args.userData.firstName} ${args.userData.lastName}`,
      clientPhone: args.userData.phone,
      animal: {
        name: args.animalData.name,
        type: args.animalData.type,
        emoji: animalType?.emoji ?? "🐾",
      },
      serviceName: `${category?.name ?? service.category} - ${variant.name}`,
      serviceCategory: service.category,
      startDate: pendingBooking.startDate,
      endDate: pendingBooking.endDate,
      startTime: pendingBooking.startTime,
      status: "pending_acceptance",
      amount: finalAmount,
      paymentStatus: "not_due",
      location: args.location,
      clientNotes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    // 4. Créer une session pour l'utilisateur
    const token = generateToken();
    const sessionExpiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 jours

    await ctx.db.insert("sessions", {
      userId,
      token,
      expiresAt: sessionExpiresAt,
      createdAt: now,
    });

    // 5. Supprimer la réservation en attente
    await ctx.db.delete(args.bookingId);

    return {
      success: true,
      missionId,
      userId,
      token,
      expiresAt: sessionExpiresAt,
    };
  },
});

// Supprimer une réservation en attente
export const cancelPendingBooking = mutation({
  args: {
    bookingId: v.id("pendingBookings"),
  },
  handler: async (ctx, args) => {
    const pendingBooking = await ctx.db.get(args.bookingId);

    if (pendingBooking) {
      await ctx.db.delete(args.bookingId);
    }

    return { success: true };
  },
});

// Générer un token aléatoire
function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Nettoyer les réservations expirées (à exécuter périodiquement)
export const cleanupExpiredBookings = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const expiredBookings = await ctx.db
      .query("pendingBookings")
      .withIndex("by_expires")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    let deleted = 0;
    for (const booking of expiredBookings) {
      await ctx.db.delete(booking._id);
      deleted++;
    }

    return { success: true, deleted };
  },
});
