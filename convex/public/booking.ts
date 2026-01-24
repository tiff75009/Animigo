import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { ConvexError } from "convex/values";
import { ANIMAL_TYPES } from "../animals";
import { internal } from "../_generated/api";
import { missionsOverlap, missionsOverlapWithBuffers, addMinutesToTime } from "../lib/timeUtils";
import { checkBookingConflict } from "../lib/capacityUtils";
import { hashPassword, generateUniqueSlug } from "../auth/utils";

// Générer toutes les dates entre deux dates (YYYY-MM-DD)
// Utilise une approche sans conversion UTC pour éviter les décalages de fuseau horaire
function getDatesBetween(startDate: string, endDate: string): string[] {
  const dates: string[] = [];

  // Parser les dates manuellement pour éviter les problèmes de fuseau horaire
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);

  // Créer les dates en spécifiant année, mois, jour (mois 0-indexé)
  const current = new Date(startYear, startMonth - 1, startDay);
  const end = new Date(endYear, endMonth - 1, endDay);

  while (current <= end) {
    // Formater sans toISOString() pour éviter la conversion UTC
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const day = String(current.getDate()).padStart(2, "0");
    dates.push(`${year}-${month}-${day}`);

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
    endTime: v.optional(v.string()), // Heure de fin (pour réservation par plage)
    calculatedAmount: v.number(),
    // Garde de nuit
    includeOvernightStay: v.optional(v.boolean()),
    overnightNights: v.optional(v.number()),
    overnightAmount: v.optional(v.number()),
    // Lieu de prestation
    serviceLocation: v.optional(v.union(
      v.literal("announcer_home"),
      v.literal("client_home")
    )),
    // Adresse invité (pour les utilisateurs non connectés)
    guestAddress: v.optional(v.object({
      address: v.string(),
      city: v.optional(v.string()),
      postalCode: v.optional(v.string()),
      coordinates: v.optional(v.object({
        lat: v.number(),
        lng: v.number(),
      })),
    })),
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

    // Récupérer la variante pour obtenir la durée
    const variant = await ctx.db.get(args.variantId as Id<"serviceVariants">);

    // Récupérer le service pour obtenir la catégorie
    const service = await ctx.db.get(args.serviceId);
    if (!service) {
      throw new ConvexError("Service non trouvé");
    }

    // Récupérer la catégorie pour vérifier le mode de blocage basé sur la durée
    const category = await ctx.db
      .query("serviceCategories")
      .withIndex("by_slug", (q) => q.eq("slug", service.category))
      .first();

    // Si la catégorie a le blocage basé sur la durée activé, vérifier que la variante a une durée
    if (category?.enableDurationBasedBlocking && !variant?.duration) {
      throw new ConvexError("Cette prestation nécessite une formule avec une durée définie");
    }

    const duration = variant?.duration || 60; // Par défaut 60 minutes

    // Utiliser endTime fourni OU calculer depuis startTime + duration
    let endTime: string | undefined = args.endTime;
    if (!endTime && args.startTime) {
      endTime = addMinutesToTime(args.startTime, duration);
    }

    // Vérifier la disponibilité de l'annonceur AVANT de créer la réservation
    const unavailabilities = await ctx.db
      .query("availability")
      .withIndex("by_user", (q) => q.eq("userId", args.announcerId))
      .filter((q) => q.eq(q.field("status"), "unavailable"))
      .collect();

    const unavailableDates = new Set(unavailabilities.map((a) => a.date));
    const requestedDates = getDatesBetween(args.startDate, args.endDate);

    for (const date of requestedDates) {
      if (unavailableDates.has(date)) {
        throw new ConvexError(`L'annonceur n'est pas disponible le ${date}`);
      }
    }

    // Vérifier les conflits avec les missions existantes
    const announcerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.announcerId))
      .first();

    const bufferBefore = announcerProfile?.bufferBefore ?? 0;
    const bufferAfter = announcerProfile?.bufferAfter ?? 0;

    const newMissionSlot = {
      startDate: args.startDate,
      endDate: args.endDate,
      startTime: args.startTime,
      endTime,
    };

    const conflictCheck = await checkBookingConflict(
      ctx.db,
      args.announcerId,
      service.category,
      newMissionSlot,
      bufferBefore,
      bufferAfter
    );

    if (conflictCheck.hasConflict) {
      throw new ConvexError(conflictCheck.conflictMessage || "L'annonceur n'est pas disponible sur ce créneau");
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
      endTime,
      calculatedAmount: args.calculatedAmount,
      // Garde de nuit
      includeOvernightStay: args.includeOvernightStay,
      overnightNights: args.overnightNights,
      overnightAmount: args.overnightAmount,
      // Lieu de prestation
      serviceLocation: args.serviceLocation,
      // Adresse invité
      guestAddress: args.guestAddress ? {
        address: args.guestAddress.address,
        city: args.guestAddress.city,
        postalCode: args.guestAddress.postalCode,
        coordinates: args.guestAddress.coordinates,
      } : undefined,
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
      priceType: opt.priceType,
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
        // Garde de nuit: paramètres du service
        allowOvernightStay: service.allowOvernightStay,
        dayStartTime: service.dayStartTime,
        dayEndTime: service.dayEndTime,
        overnightPrice: service.overnightPrice,
        // Blocage basé sur la durée
        enableDurationBasedBlocking: category?.enableDurationBasedBlocking,
      },
      variant: variant ? {
        id: variant._id,
        name: variant.name,
        price: variant.price,
        priceUnit: variant.priceUnit,
        duration: variant.duration,
        // Pricing nightly si défini
        pricing: variant.pricing,
      } : null,
      options: selectedOptions,
      availableOptions,
      dates: {
        startDate: pendingBooking.startDate,
        endDate: pendingBooking.endDate,
        startTime: pendingBooking.startTime,
        endTime: pendingBooking.endTime,
      },
      amount: pendingBooking.calculatedAmount,
      // Garde de nuit: données de la réservation
      overnight: {
        includeOvernightStay: pendingBooking.includeOvernightStay,
        overnightNights: pendingBooking.overnightNights,
        overnightAmount: pendingBooking.overnightAmount,
      },
      // Lieu de prestation
      serviceLocation: pendingBooking.serviceLocation,
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
    city: v.optional(v.string()),
    coordinates: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
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

    // Récupérer le profil de l'annonceur pour les buffers (temps de préparation)
    const announcerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", pendingBooking.announcerId))
      .first();

    const bufferBefore = announcerProfile?.bufferBefore ?? 0;
    const bufferAfter = announcerProfile?.bufferAfter ?? 0;

    // Construire l'objet de la nouvelle mission pour la comparaison temporelle
    const newMissionSlot = {
      startDate: pendingBooking.startDate,
      endDate: pendingBooking.endDate,
      startTime: pendingBooking.startTime,
      endTime: pendingBooking.endTime,
    };

    // Vérifier les conflits en tenant compte de la capacité pour les catégories de garde
    const conflictCheck = await checkBookingConflict(
      ctx.db,
      pendingBooking.announcerId,
      service.category,
      newMissionSlot,
      bufferBefore,
      bufferAfter
    );

    if (conflictCheck.hasConflict) {
      throw new ConvexError(conflictCheck.conflictMessage || "L'annonceur n'est pas disponible sur ce créneau");
    }

    // Trouver le type d'animal pour l'emoji
    const animalType = ANIMAL_TYPES.find((t) => t.id === animal.type);

    const now = Date.now();

    // Utiliser le montant mis à jour si fourni, sinon utiliser celui de la réservation
    // Ce montant représente le prix du service (ce que l'annonceur recevra)
    const serviceAmount = args.updatedAmount ?? pendingBooking.calculatedAmount;

    // Récupérer l'annonceur pour déterminer le type de commission
    const announcerForCommission = await ctx.db.get(pendingBooking.announcerId);
    let commissionType: "particulier" | "micro_entrepreneur" | "professionnel" = "particulier";
    if (announcerForCommission?.accountType === "annonceur_pro") {
      if (announcerForCommission.companyType === "micro_enterprise") {
        commissionType = "micro_entrepreneur";
      } else {
        commissionType = "professionnel";
      }
    }

    // Récupérer le taux de commission depuis la config
    const commissionConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", `commission_${commissionType}`))
      .first();

    // Taux par défaut si non configuré
    const defaultRates = { particulier: 15, micro_entrepreneur: 12, professionnel: 10 };
    const commissionRate = commissionConfig
      ? parseFloat(commissionConfig.value)
      : defaultRates[commissionType];

    // Calculer les montants
    // platformFee = commission (ce que la plateforme garde)
    // announcerEarnings = serviceAmount (ce que l'annonceur reçoit)
    // amount = serviceAmount + platformFee (ce que le client paie)
    const platformFee = Math.round((serviceAmount * commissionRate) / 100);
    const announcerEarnings = serviceAmount;
    const totalAmount = serviceAmount + platformFee;

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
      endTime: pendingBooking.endTime,
      status: "pending_acceptance",
      amount: totalAmount, // Montant total que le client paie (service + commission)
      platformFee, // Commission de la plateforme
      announcerEarnings, // Ce que l'annonceur reçoit (prix du service)
      paymentStatus: "not_due",
      location: args.location,
      city: args.city,
      clientCoordinates: args.coordinates,
      clientNotes: args.notes,
      // Garde de nuit
      includeOvernightStay: pendingBooking.includeOvernightStay,
      overnightNights: pendingBooking.overnightNights,
      overnightAmount: pendingBooking.overnightAmount,
      dayStartTime: service.dayStartTime,
      dayEndTime: service.dayEndTime,
      // Lieu de prestation
      serviceLocation: pendingBooking.serviceLocation,
      createdAt: now,
      updatedAt: now,
    });

    // Supprimer la réservation en attente
    await ctx.db.delete(args.bookingId);

    // Sauvegarder/mettre à jour profil client avec localisation
    const existingClientProfile = await ctx.db
      .query("clientProfiles")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    if (!existingClientProfile) {
      // Créer un nouveau profil client avec la localisation
      await ctx.db.insert("clientProfiles", {
        userId: session.userId,
        location: args.location,
        city: args.city,
        coordinates: args.coordinates,
        updatedAt: now,
      });
    } else if (!existingClientProfile.coordinates && args.coordinates) {
      // Mettre à jour la localisation si pas encore définie
      await ctx.db.patch(existingClientProfile._id, {
        location: args.location,
        city: args.city,
        coordinates: args.coordinates,
        updatedAt: now,
      });
    }

    // Envoyer la notification push à l'annonceur (nouvelle mission)
    await ctx.scheduler.runAfter(0, internal.notifications.actions.sendNewMissionNotification, {
      announcerId: pendingBooking.announcerId,
      clientName: `${client.firstName} ${client.lastName}`,
      animalName: animal.name,
      serviceName: `${category?.name ?? service.category} - ${variant.name}`,
      missionId,
    });

    // Envoyer l'email de notification à l'annonceur
    const announcer = await ctx.db.get(pendingBooking.announcerId);
    if (announcer) {
      // Récupérer la config email depuis la DB
      const apiKeyConfig = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", (q) => q.eq("key", "resend_api_key"))
        .first();
      const fromEmailConfig = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", (q) => q.eq("key", "resend_from_email"))
        .first();
      const fromNameConfig = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", (q) => q.eq("key", "resend_from_name"))
        .first();
      const appUrlConfig = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", (q) => q.eq("key", "app_url"))
        .first();

      // Trouver le type d'animal pour le nom
      const animalTypeName = ANIMAL_TYPES.find((t) => t.id === animal.type);

      await ctx.scheduler.runAfter(0, internal.api.email.sendNewReservationRequestEmail, {
        announcerEmail: announcer.email,
        announcerFirstName: announcer.firstName,
        clientName: `${client.firstName} ${client.lastName}`,
        reservation: {
          serviceName: `${category?.name ?? service.category} - ${variant.name}`,
          startDate: pendingBooking.startDate,
          endDate: pendingBooking.endDate,
          startTime: pendingBooking.startTime,
          endTime: pendingBooking.endTime,
          animalName: animal.name,
          animalType: animalTypeName?.name ?? animal.type,
          location: args.location,
          includeOvernightStay: pendingBooking.includeOvernightStay,
          overnightNights: pendingBooking.overnightNights,
          totalAmount: totalAmount,
        },
        emailConfig: apiKeyConfig?.value ? {
          apiKey: apiKeyConfig.value,
          fromEmail: fromEmailConfig?.value,
          fromName: fromNameConfig?.value,
        } : undefined,
        appUrl: appUrlConfig?.value || undefined,
      });
    }

    return {
      success: true,
      missionId,
    };
  },
});

// Finaliser une réservation en tant qu'invité (création de compte)
// NOTE: Pour les utilisateurs non inscrits, la mission n'est PAS créée immédiatement.
// L'utilisateur doit d'abord vérifier son email. La mission sera créée lors de la
// vérification de l'email (voir convex/api/emailInternal.ts - verifyEmailToken).
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
    city: v.optional(v.string()),
    coordinates: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
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

    // Récupérer le profil de l'annonceur pour les buffers (temps de préparation)
    const announcerProfileGuest = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", pendingBooking.announcerId))
      .first();

    const bufferBeforeGuest = announcerProfileGuest?.bufferBefore ?? 0;
    const bufferAfterGuest = announcerProfileGuest?.bufferAfter ?? 0;

    // Construire l'objet de la nouvelle mission pour la comparaison temporelle
    const newMissionSlot = {
      startDate: pendingBooking.startDate,
      endDate: pendingBooking.endDate,
      startTime: pendingBooking.startTime,
      endTime: pendingBooking.endTime,
    };

    // Vérifier les conflits en tenant compte de la capacité pour les catégories de garde
    const conflictCheckGuest = await checkBookingConflict(
      ctx.db,
      pendingBooking.announcerId,
      service.category,
      newMissionSlot,
      bufferBeforeGuest,
      bufferAfterGuest
    );

    if (conflictCheckGuest.hasConflict) {
      throw new ConvexError(conflictCheckGuest.conflictMessage || "L'annonceur n'est pas disponible sur ce créneau");
    }

    const now = Date.now();

    // Utiliser le montant mis à jour si fourni, sinon utiliser celui de la réservation
    const finalAmount = args.updatedAmount ?? pendingBooking.calculatedAmount;

    // Hash du mot de passe avec bcrypt (comme dans register.ts)
    const passwordHash = await hashPassword(args.userData.password);

    // Générer un slug unique (prenom seulement, ville sera ajoutée plus tard)
    const slug = await generateUniqueSlug(ctx.db, args.userData.firstName.trim());

    // 1. Créer le compte utilisateur (email NON vérifié, compte INACTIF jusqu'à vérification)
    // L'utilisateur reçoit un token de session pour cette réservation
    // Après vérification email, isActive passe à true et il pourra se connecter normalement
    const userId = await ctx.db.insert("users", {
      email: args.userData.email.toLowerCase(),
      passwordHash,
      slug,
      accountType: "utilisateur",
      firstName: args.userData.firstName.trim(),
      lastName: args.userData.lastName.trim(),
      phone: args.userData.phone.trim(),
      cguAcceptedAt: now,
      createdAt: now,
      updatedAt: now,
      emailVerified: false,
      isActive: false,
    });

    // 2. Créer le profil client avec localisation
    await ctx.db.insert("clientProfiles", {
      userId,
      location: args.location,
      city: args.city,
      coordinates: args.coordinates,
      updatedAt: now,
    });

    // 3. Créer la fiche animal
    const animalType = ANIMAL_TYPES.find((t) => t.id === args.animalData.type);

    await ctx.db.insert("animals", {
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

    // 4. Mettre à jour la pending booking avec le statut et les données client
    // NE PAS supprimer la pending booking - elle sera convertie en mission après vérification email
    await ctx.db.patch(args.bookingId, {
      userId,
      status: "awaiting_email_verification",
      location: args.location,
      city: args.city,
      coordinates: args.coordinates,
      calculatedAmount: finalAmount,
      optionIds: args.updatedOptionIds,
      clientData: {
        firstName: args.userData.firstName.trim(),
        lastName: args.userData.lastName.trim(),
        phone: args.userData.phone.trim(),
        animalName: args.animalData.name.trim(),
        animalType: args.animalData.type,
        notes: args.notes,
      },
    });

    // 5. Créer une session pour l'utilisateur
    const token = generateToken();
    const sessionExpiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 jours

    await ctx.db.insert("sessions", {
      userId,
      token,
      expiresAt: sessionExpiresAt,
      createdAt: now,
    });

    // 6. Créer un token de vérification email avec contexte "reservation"
    const verificationToken = await ctx.runMutation(internal.api.emailInternal.createVerificationToken, {
      userId,
      email: args.userData.email.toLowerCase(),
      context: "reservation",
      pendingBookingId: args.bookingId,
    });

    // 7. Récupérer les détails de la réservation pour l'email
    const announcer = await ctx.db.get(pendingBooking.announcerId);
    const category = await ctx.db
      .query("serviceCategories")
      .withIndex("by_slug", (q) => q.eq("slug", service.category))
      .first();

    // 7bis. Récupérer la config email depuis la DB (pour passer à l'action)
    const apiKeyConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "resend_api_key"))
      .first();
    const fromEmailConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "resend_from_email"))
      .first();
    const fromNameConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "resend_from_name"))
      .first();

    // 7ter. Récupérer l'URL de l'application depuis la DB
    const appUrlConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "app_url"))
      .first();

    // 8. Envoyer l'email de vérification avec contexte réservation
    await ctx.scheduler.runAfter(0, internal.api.email.sendVerificationEmail, {
      userId,
      email: args.userData.email.toLowerCase(),
      firstName: args.userData.firstName.trim(),
      token: verificationToken,
      context: "reservation",
      reservationData: {
        serviceName: `${category?.name ?? service.category} - ${variant.name}`,
        announcerName: announcer ? `${announcer.firstName} ${announcer.lastName.charAt(0)}.` : "Annonceur",
        startDate: pendingBooking.startDate,
        endDate: pendingBooking.endDate,
        startTime: pendingBooking.startTime,
        endTime: pendingBooking.endTime,
        animalName: args.animalData.name.trim(),
        location: args.location,
        totalAmount: finalAmount,
      },
      // Passer la config email depuis la mutation (car ctx.runQuery échoue dans les actions sur self-hosted)
      emailConfig: apiKeyConfig?.value ? {
        apiKey: apiKeyConfig.value,
        fromEmail: fromEmailConfig?.value,
        fromName: fromNameConfig?.value,
      } : undefined,
      // Passer l'URL de l'application depuis la DB
      appUrl: appUrlConfig?.value || undefined,
    });

    // Retourner le succès - la mission sera créée après vérification de l'email
    return {
      success: true,
      requiresEmailVerification: true,
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
