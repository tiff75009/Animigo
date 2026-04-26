import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { ConvexError } from "convex/values";
import { ANIMAL_TYPES } from "../animals";
import { internal } from "../_generated/api";
import { missionsOverlap, missionsOverlapWithBuffers, addMinutesToTime } from "../lib/timeUtils";
import { checkBookingConflict, checkAnimalBookingConflict } from "../lib/capacityUtils";
import { calculateDistance } from "../lib/geoUtils";
import { getEmailConfigFromDb } from "../api/emailInternal";
import { hashPassword, generateUniqueSlug } from "../auth/utils";
import {
  calculateAcceptanceDeadline,
  isBookingAdvanceValid,
} from "../planning/acceptanceDeadline";
import { checkRateLimit } from "../lib/rateLimit";

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
    // Créneaux collectifs (pour formules collectives)
    collectiveSlotIds: v.optional(v.array(v.id("collectiveSlots"))),
    animalCount: v.optional(v.number()),
    selectedAnimalType: v.optional(v.string()),
    // Animaux sélectionnés par l'utilisateur
    selectedAnimalIds: v.optional(v.array(v.string())),
    // Nombre effectif d'animaux (pour le calcul du prix)
    effectiveAnimalCount: v.optional(v.number()),
    // Séances multi-sessions (pour formules individuelles multi-séances)
    sessions: v.optional(v.array(v.object({
      date: v.string(),
      startTime: v.string(),
      endTime: v.string(),
    }))),
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
    // Données pré-remplies de l'animal invité
    guestAnimalPreFill: v.optional(v.object({
      type: v.string(),
      breed: v.optional(v.string()),
      isMixedBreed: v.optional(v.boolean()),
      primaryBreed: v.optional(v.string()),
      secondaryBreed: v.optional(v.string()),
    })),
    // Token optionnel (si utilisateur connecté)
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
    let userId: Id<"users"> | undefined;

    // Si un token est fourni, récupérer l'utilisateur
    if (args.token) {
      const session = await ctx.db
        .query("sessions")
        .withIndex("by_token", (q) => q.eq("token", args.token!))
        .first();

      if (session && session.expiresAt > Date.now()) {
        userId = session.userId;

        // Vérifier que l'utilisateur n'est pas un annonceur
        const user = await ctx.db.get(session.userId);
        if (user?.accountType === "annonceur_particulier" || user?.accountType === "annonceur_pro") {
          throw new ConvexError("Les annonceurs ne peuvent pas effectuer de réservations. Veuillez utiliser un compte client.");
        }
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

    // Pour les formules collectives, les créneaux sont déjà validés côté serveur
    // On ne vérifie pas les conflits car les créneaux collectifs gèrent leur propre capacité
    const isCollectiveBooking = args.collectiveSlotIds && args.collectiveSlotIds.length > 0;
    const isMultiSessionBooking = args.sessions && args.sessions.length > 0;

    if (!isCollectiveBooking && !isMultiSessionBooking) {
      // Vérifier la disponibilité de l'annonceur AVANT de créer la réservation
      // NOUVEAU: Logique "par défaut indisponible" + vérification par type de catégorie

      // 1. Récupérer le typeId de la catégorie du service
      let typeId = category?.typeId;
      if (!typeId && category?.parentCategoryId) {
        const parentCategory = await ctx.db.get(category.parentCategoryId);
        typeId = parentCategory?.typeId;
      }

      // 2. Récupérer les disponibilités pour ce type
      const availabilities = await ctx.db
        .query("availability")
        .withIndex("by_user", (q) => q.eq("userId", args.announcerId))
        .collect();

      // Filtrer par type si disponible
      const relevantAvailabilities = typeId
        ? availabilities.filter((a) => String(a.categoryTypeId) === String(typeId))
        : availabilities;

      // Créer un map date -> availability
      const availabilityMap = new Map(
        relevantAvailabilities.map((a) => [a.date, a])
      );

      const requestedDates = getDatesBetween(args.startDate, args.endDate);

      for (const date of requestedDates) {
        const avail = availabilityMap.get(date);

        // Pas d'entrée OU status "unavailable" = indisponible (nouveau comportement par défaut)
        if (!avail || avail.status === "unavailable") {
          throw new ConvexError(`L'annonceur n'est pas disponible le ${date} pour ce type de service`);
        }

        // Si "partial", vérifier les timeSlots
        if (avail.status === "partial" && args.startTime && endTime) {
          const isInSlot = avail.timeSlots?.some(
            (ts) => args.startTime! >= ts.startTime && endTime! <= ts.endTime
          );
          if (!isInSlot) {
            throw new ConvexError(
              `L'annonceur n'est pas disponible sur ce créneau horaire le ${date}`
            );
          }
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
    }

    // Vérifier les doublons d'animaux si l'utilisateur est connecté et a sélectionné des animaux
    if (userId && args.selectedAnimalIds && args.selectedAnimalIds.length > 0) {
      const typedAnimalIds = args.selectedAnimalIds.map(
        (id) => id as Id<"animals">
      );

      const animalConflict = await checkAnimalBookingConflict(
        ctx.db,
        userId,
        typedAnimalIds,
        {
          startDate: args.startDate,
          endDate: args.endDate,
          startTime: args.startTime,
          endTime,
        },
        args.sessions,
        args.collectiveSlotIds,
      );

      if (animalConflict.hasConflict) {
        throw new ConvexError(animalConflict.conflictMessage || "Un de vos animaux est déjà réservé sur ce créneau");
      }
    }

    // ─── Vérification zone d'intervention annonceur ───
    // Si le client choisit "client_home" (à domicile chez lui), vérifier que
    // l'annonceur peut s'y déplacer (distance <= rayon d'intervention).
    // On se base sur les coordonnées fournies (guestAddress).
    // Si pas de coords client (rare) ou pas de radius annonceur défini → on ne
    // bloque pas (fail-open : la modération admin reste un filet).
    if (args.serviceLocation === "client_home") {
      const clientCoords = args.guestAddress?.coordinates;
      if (clientCoords) {
        const announcerProfile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", args.announcerId))
          .first();
        if (
          announcerProfile?.coordinates &&
          announcerProfile.radius !== undefined &&
          announcerProfile.radius > 0
        ) {
          const distanceKm = calculateDistance(
            clientCoords.lat,
            clientCoords.lng,
            announcerProfile.coordinates.lat,
            announcerProfile.coordinates.lng
          );
          if (distanceKm > announcerProfile.radius) {
            throw new ConvexError(
              `Cette adresse est en dehors de la zone d'intervention du pet-sitter (${distanceKm.toFixed(1)} km, max ${announcerProfile.radius} km). Choisissez une autre adresse ou sélectionnez "Chez le pet-sitter".`
            );
          }
        }
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
      endTime,
      calculatedAmount: args.calculatedAmount,
      // Créneaux collectifs
      collectiveSlotIds: args.collectiveSlotIds,
      animalCount: args.animalCount,
      selectedAnimalType: args.selectedAnimalType,
      // Animaux sélectionnés
      selectedAnimalIds: args.selectedAnimalIds,
      effectiveAnimalCount: args.effectiveAnimalCount,
      // Séances multi-sessions
      sessions: args.sessions,
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
      // Données pré-remplies de l'animal invité
      guestAnimalPreFill: args.guestAnimalPreFill,
      userId,
      expiresAt,
      createdAt: now,
    });

    return {
      success: true,
      bookingId: pendingBookingId,
    };
    } catch (error) {
      // Re-throw ConvexErrors as-is
      if (error instanceof ConvexError) {
        throw error;
      }
      // Log and wrap other errors
      console.error("createPendingBooking error:", error);
      throw new ConvexError(`Erreur lors de la création de la réservation: ${error instanceof Error ? error.message : String(error)}`);
    }
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

    // Récupérer les détails des créneaux collectifs si présents
    let collectiveSlots: Array<{
      _id: string;
      date: string;
      startTime: string;
      endTime: string;
      availableSpots: number;
    }> = [];
    if (pendingBooking.collectiveSlotIds && pendingBooking.collectiveSlotIds.length > 0) {
      for (const slotId of pendingBooking.collectiveSlotIds) {
        const slot = await ctx.db.get(slotId);
        if (slot) {
          collectiveSlots.push({
            _id: slot._id,
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            availableSpots: slot.maxAnimals - slot.bookedAnimals,
          });
        }
      }
      // Trier par date
      collectiveSlots.sort((a, b) => a.date.localeCompare(b.date));
    }

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
        slug: announcer.slug ?? null,
        firstName: announcer.firstName,
        lastName: announcer.lastName,
        username: announcer.username ?? undefined,
        profileImage: profileImageUrl,
        location: profile?.location ?? profile?.city ?? "",
        city: profile?.city ?? null,
        postalCode: profile?.postalCode ?? null,
        coordinates: profile?.coordinates,
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
        // Mode de facturation client (arrondi demi-journée, journée, ou horaire exact)
        clientBillingMode: category?.clientBillingMode as ("exact_hourly" | "round_half_day" | "round_full_day") | undefined,
      },
      variant: variant ? {
        id: variant._id,
        name: variant.name,
        price: variant.price,
        priceUnit: variant.priceUnit,
        duration: variant.duration,
        // Pricing nightly si défini
        pricing: variant.pricing,
        // Support formules collectives/multi-séances
        numberOfSessions: variant.numberOfSessions,
        sessionInterval: variant.sessionInterval,
        sessionType: variant.sessionType,
        animalTypes: variant.animalTypes,
        isSapEligible: variant.isSapEligible ?? false,
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
      // Adresse guest (pour utilisateurs non connectés)
      guestAddress: pendingBooking.guestAddress,
      // Support formules collectives
      collectiveSlotIds: pendingBooking.collectiveSlotIds,
      collectiveSlots, // Détails complets des créneaux
      animalCount: pendingBooking.animalCount,
      selectedAnimalType: pendingBooking.selectedAnimalType,
      // Animaux sélectionnés par l'utilisateur
      selectedAnimalIds: pendingBooking.selectedAnimalIds,
      // Support formules multi-séances
      sessions: pendingBooking.sessions,
      // Données pré-remplies de l'animal invité
      guestAnimalPreFill: pendingBooking.guestAnimalPreFill,
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
    animalIds: v.optional(v.array(v.id("animals"))),
    location: v.string(),
    city: v.optional(v.string()),
    postalCode: v.optional(v.string()),
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
    console.log("[finalizeBooking] Starting with args:", {
      bookingId: args.bookingId,
      animalId: args.animalId,
      location: args.location
    });

    // Vérifier la session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    // Rate limit : 10 finalisations par minute par utilisateur
    if (session) {
      try {
        await checkRateLimit(ctx, `booking:${session.userId}`, 10, 60 * 1000);
      } catch {
        throw new ConvexError("Trop de tentatives de réservation. Veuillez réessayer dans une minute.");
      }
    }

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Vous devez être connecté pour finaliser la réservation");
    }

    // Vérifier que l'utilisateur n'est pas un annonceur
    const bookingUser = await ctx.db.get(session.userId);
    if (bookingUser?.accountType === "annonceur_particulier" || bookingUser?.accountType === "annonceur_pro") {
      throw new ConvexError("Les annonceurs ne peuvent pas effectuer de réservations. Veuillez utiliser un compte client.");
    }

    console.log("[finalizeBooking] Session valid, userId:", session.userId);

    // Récupérer la réservation en attente
    const pendingBooking = await ctx.db.get(args.bookingId);

    if (!pendingBooking) {
      throw new ConvexError("Réservation non trouvée");
    }
    console.log("[finalizeBooking] PendingBooking found:", pendingBooking._id);

    if (pendingBooking.expiresAt < Date.now()) {
      throw new ConvexError("La réservation a expiré");
    }

    // Récupérer l'animal principal
    const animal = await ctx.db.get(args.animalId);

    if (!animal) {
      throw new ConvexError("Animal non trouvé");
    }
    console.log("[finalizeBooking] Animal found:", animal.name);

    if (animal.userId !== session.userId) {
      throw new ConvexError("Cet animal ne vous appartient pas");
    }

    // Résoudre tous les animaux si animalIds fourni
    const allAnimalIds = args.animalIds && args.animalIds.length > 0
      ? args.animalIds
      : [args.animalId];
    const allAnimals = [];
    for (const aid of allAnimalIds) {
      const a = aid === args.animalId ? animal : await ctx.db.get(aid);
      if (!a) throw new ConvexError("Animal non trouvé");
      if (a.userId !== session.userId) throw new ConvexError("Cet animal ne vous appartient pas");
      const aType = ANIMAL_TYPES.find((t) => t.id === a.type);
      allAnimals.push({ name: a.name, type: a.type, emoji: aType?.emoji ?? "🐾" });
    }
    console.log("[finalizeBooking] All animals resolved:", allAnimals.length);

    // Vérifier que les animaux ne sont pas déjà réservés sur le même créneau
    const animalConflict = await checkAnimalBookingConflict(
      ctx.db,
      session.userId,
      allAnimalIds,
      {
        startDate: pendingBooking.startDate,
        endDate: pendingBooking.endDate,
        startTime: pendingBooking.startTime,
        endTime: pendingBooking.endTime,
      },
      pendingBooking.sessions,
      pendingBooking.collectiveSlotIds,
    );

    if (animalConflict.hasConflict) {
      throw new ConvexError(animalConflict.conflictMessage || "Un de vos animaux est déjà réservé sur ce créneau");
    }

    // Récupérer l'utilisateur client
    const client = await ctx.db.get(session.userId);
    if (!client) {
      throw new ConvexError("Utilisateur non trouvé");
    }
    console.log("[finalizeBooking] Client found:", client.firstName);

    // Récupérer le service
    const service = await ctx.db.get(pendingBooking.serviceId);
    if (!service) {
      throw new ConvexError("Service non trouvé");
    }
    console.log("[finalizeBooking] Service found:", service.category);

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
    console.log("[finalizeBooking] Variant found:", variant.name, "sessionType:", variant.sessionType);

    // Pour les formules collectives, on ne vérifie pas la disponibilité standard
    // car les créneaux collectifs ont leur propre système de disponibilité
    const isCollectiveFormule = variant.sessionType === "collective";
    console.log("[finalizeBooking] isCollectiveFormule:", isCollectiveFormule, "collectiveSlotIds:", pendingBooking.collectiveSlotIds?.length || 0);

    // Vérifier la disponibilité selon le categoryType
    // Récupérer le categoryTypeId de cette catégorie
    let categoryTypeId: Id<"categoryTypes"> | null = null;
    if (category) {
      if (category.typeId) {
        categoryTypeId = category.typeId;
      } else if (category.parentCategoryId) {
        const parentCat = await ctx.db.get(category.parentCategoryId);
        categoryTypeId = parentCat?.typeId ?? null;
      }
    }

    // Pour les formules collectives, les créneaux sont déjà validés lors de la sélection
    // On ne vérifie pas la disponibilité standard car ils ont leur propre système
    // Pour les formules multi-séances individuelles, on vérifie uniquement les dates des sessions

    // Détecter les formules multi-sessions via le variant OU via les sessions présentes
    const isVariantMultiSession = (variant.numberOfSessions ?? 1) > 1;
    const hasSessions = pendingBooking.sessions && pendingBooking.sessions.length > 0;
    const isMultiSessionFormule = hasSessions || isVariantMultiSession;

    console.log("[finalizeBooking] Multi-session detection:", {
      variantNumberOfSessions: variant.numberOfSessions,
      isVariantMultiSession,
      hasSessions,
      sessionsCount: pendingBooking.sessions?.length ?? 0,
      isMultiSessionFormule,
    });

    // Si c'est une formule multi-sessions mais qu'aucune session n'est fournie,
    // on ne doit vérifier que les sessions, pas toute la plage startDate-endDate
    // Dans ce cas, on utilise startDate comme seule date à vérifier
    const requestedDatesForAvailability = hasSessions
      ? pendingBooking.sessions!.map((s) => s.date)
      : isVariantMultiSession
        // Formule multi-sessions sans sessions définies: vérifier seulement la première date
        // (les sessions seront planifiées plus tard)
        ? [pendingBooking.startDate]
        : getDatesBetween(pendingBooking.startDate, pendingBooking.endDate);

    if (!isCollectiveFormule) {
      // Récupérer toutes les disponibilités de l'annonceur
      const availabilities = await ctx.db
        .query("availability")
        .withIndex("by_user", (q) => q.eq("userId", pendingBooking.announcerId))
        .collect();

      // Utiliser les dates calculées plus haut
      console.log("[finalizeBooking] Checking availability for dates:", requestedDatesForAvailability);
      console.log("[finalizeBooking] categoryTypeId:", categoryTypeId);
      console.log("[finalizeBooking] Total availabilities found:", availabilities.length);

      // Debug: montrer les disponibilités pour les dates demandées
      for (const date of requestedDatesForAvailability) {
        const availsForDate = availabilities.filter((a) => a.date === date);
        console.log(`[finalizeBooking] Availabilities for ${date}:`, availsForDate.map((a) => ({
          status: a.status,
          categoryTypeId: a.categoryTypeId,
        })));
      }

      for (const date of requestedDatesForAvailability) {
        // Chercher une disponibilité pour ce jour et ce type de catégorie
        let availabilityForDate = availabilities.find(
          (a) => a.date === date &&
                 (categoryTypeId ? String(a.categoryTypeId) === String(categoryTypeId) : !a.categoryTypeId)
        );

        // Si la catégorie n'a pas de typeId et qu'on n'a pas trouvé de disponibilité sans type,
        // OU si la disponibilité trouvée est "unavailable",
        // chercher une disponibilité "available" pour n'importe quel type
        if (!categoryTypeId && (!availabilityForDate || availabilityForDate.status === "unavailable")) {
          const anyAvailableForDate = availabilities.find(
            (a) => a.date === date && a.status === "available"
          );
          if (anyAvailableForDate) {
            availabilityForDate = anyAvailableForDate;
            console.log(`[finalizeBooking] Fallback: using available entry with categoryTypeId ${anyAvailableForDate.categoryTypeId} for ${date}`);
          }
        }

        // Si pas d'entrée ou status "unavailable" → indisponible
        if (!availabilityForDate || availabilityForDate.status === "unavailable") {
          throw new ConvexError(`L'annonceur n'est plus disponible le ${date}`);
        }

        // Si status "partial", vérifier que le créneau demandé est dans les timeSlots
        if (availabilityForDate.status === "partial") {
          // Pour les multi-séances, récupérer le créneau horaire de la session spécifique
          let startTimeToCheck = pendingBooking.startTime;
          let endTimeToCheck = pendingBooking.endTime;

          if (hasSessions) {
            const sessionForDate = pendingBooking.sessions!.find((s) => s.date === date);
            if (sessionForDate) {
              startTimeToCheck = sessionForDate.startTime;
              endTimeToCheck = sessionForDate.endTime;
            }
          }

          if (startTimeToCheck && endTimeToCheck) {
            const isInSlot = availabilityForDate.timeSlots?.some(
              (ts) => startTimeToCheck! >= ts.startTime && endTimeToCheck! <= ts.endTime
            );
            if (!isInSlot) {
              throw new ConvexError(
                `L'annonceur n'est pas disponible sur ce créneau horaire le ${date}`
              );
            }
          }
        }
      }

      // Récupérer le profil de l'annonceur pour les buffers (temps de préparation)
      const announcerProfile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", pendingBooking.announcerId))
        .first();

      const bufferBefore = announcerProfile?.bufferBefore ?? 0;
      const bufferAfter = announcerProfile?.bufferAfter ?? 0;

      // Pour les multi-séances avec sessions définies, vérifier les conflits pour chaque session
      if (hasSessions) {
        for (const session of pendingBooking.sessions!) {
          const sessionSlot = {
            startDate: session.date,
            endDate: session.date,
            startTime: session.startTime,
            endTime: session.endTime,
          };

          console.log(`[finalizeBooking] Checking conflict for session: ${session.date} ${session.startTime}-${session.endTime}`);

          const conflictCheck = await checkBookingConflict(
            ctx.db,
            pendingBooking.announcerId,
            service.category,
            sessionSlot,
            bufferBefore,
            bufferAfter
          );

          if (conflictCheck.hasConflict) {
            console.log(`[finalizeBooking] CONFLICT on ${session.date}: ${conflictCheck.conflictMessage}`);
            throw new ConvexError(conflictCheck.conflictMessage || `L'annonceur n'est pas disponible le ${session.date}`);
          }
          console.log(`[finalizeBooking] No conflict for ${session.date}`);
        }
      } else {
        // Mode standard: vérifier la plage globale
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
      }
    } else {
      console.log("[finalizeBooking] Skipping availability check for collective formule");
    }

    // Trouver le type d'animal pour l'emoji
    const animalType = ANIMAL_TYPES.find((t) => t.id === animal.type);

    const now = Date.now();

    // Récupérer la configuration des délais d'acceptation
    const deadlineConfig = await ctx.runQuery(
      internal.planning.acceptanceDeadline.getAcceptanceDeadlineConfig,
      {}
    );

    // Valider le minimum à l'avance (24h par défaut)
    if (!isBookingAdvanceValid(pendingBooking.startDate, pendingBooking.startTime, deadlineConfig)) {
      throw new ConvexError(
        `Les réservations doivent être effectuées au minimum ${deadlineConfig.minimumBookingAdvanceHours}h à l'avance`
      );
    }

    // Calculer la deadline d'acceptation
    const acceptanceDeadline = calculateAcceptanceDeadline(
      now,
      pendingBooking.startDate,
      deadlineConfig
    );

    // Déterminer le taux TVA (SAP ou standard)
    let vatRate = 20;
    let isSapApplied = false;

    if (variant.isSapEligible || service.isSapEligible || category?.isSapEligible) {
      const announcerProfile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", pendingBooking.announcerId))
        .first();

      if (announcerProfile?.isSapApproved) {
        const clientProfile = await ctx.db
          .query("clientProfiles")
          .withIndex("by_user", (q) => q.eq("userId", session.userId))
          .first();

        if (clientProfile?.sapEligibility && clientProfile.sapEligibility !== "none" && clientProfile.sapEligibilityAttested) {
          vatRate = 10;
          isSapApplied = true;
        }
      }
    }

    // Recalcul autoritaire du prix côté backend pour éviter toute manipulation
    // côté client. On ignore `args.updatedAmount` / `pendingBooking.calculatedAmount`
    // pour les formules collectives et multi-séances et on recalcule depuis
    // variant.price + variant.duration + variant.priceUnit.
    function getSessionPrice(v: {
      price: number;
      priceUnit?: string | null;
      duration?: number | null;
      pricingMode?: "per_session" | "per_hour" | null;
    }): number {
      const duration = v.duration ?? 60;
      // Nouveau système : pricingMode prioritaire
      if (v.pricingMode === "per_session") return v.price;
      if (v.pricingMode === "per_hour") return Math.round((v.price * duration) / 60);
      // Rétro-compat
      const unit = v.priceUnit ?? "hour";
      switch (unit) {
        case "hour": return Math.round((v.price * duration) / 60);
        case "half_day": return Math.round((v.price * duration) / 240);
        case "day": return Math.round((v.price * duration) / 480);
        case "week": return Math.round((v.price * duration) / (60 * 24 * 7));
        case "month": return Math.round((v.price * duration) / (60 * 24 * 30));
        case "flat":
        default: return v.price;
      }
    }

    let serviceAmount: number;
    if (isCollectiveFormule && pendingBooking.collectiveSlotIds && pendingBooking.collectiveSlotIds.length > 0) {
      const animals = pendingBooking.effectiveAnimalCount ?? pendingBooking.animalCount ?? 1;
      const slots = pendingBooking.collectiveSlotIds.length;
      const sessionPrice = getSessionPrice(variant);
      const optionsForRecalc = (args.updatedOptionIds ?? pendingBooking.optionIds ?? []) as Id<"serviceOptions">[];
      let optionsSum = 0;
      for (const oid of optionsForRecalc) {
        const o = await ctx.db.get(oid);
        if (o) optionsSum += o.price;
      }
      serviceAmount = sessionPrice * slots * Math.max(1, animals) + optionsSum;
    } else if (variant.sessionType !== "collective" && (variant.numberOfSessions ?? 1) > 1) {
      // Multi-séances individuelle
      const animals = pendingBooking.effectiveAnimalCount ?? pendingBooking.animalCount ?? 1;
      const nSessions = variant.numberOfSessions ?? 1;
      const sessionPrice = getSessionPrice(variant);
      const optionsForRecalc = (args.updatedOptionIds ?? pendingBooking.optionIds ?? []) as Id<"serviceOptions">[];
      let optionsSum = 0;
      for (const oid of optionsForRecalc) {
        const o = await ctx.db.get(oid);
        if (o) optionsSum += o.price;
      }
      serviceAmount = sessionPrice * nSessions * Math.max(1, animals) + optionsSum;
    } else {
      // Uni-séance / garde : on garde le calcul existant côté client
      serviceAmount = args.updatedAmount ?? pendingBooking.calculatedAmount;
    }

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

    // Récupérer le taux de frais Stripe depuis la config
    const stripeFeeConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "stripe_fee_rate"))
      .first();
    const stripeFeeRate = stripeFeeConfig
      ? parseFloat(stripeFeeConfig.value)
      : 3; // 3% par défaut

    // Calculer les montants (même logique que SummaryStep.tsx)
    // platformFee = commission sur le montant HT
    // stripeFee = frais de paiement sur (montant HT + commission)
    // announcerEarnings = serviceAmount (ce que l'annonceur reçoit)
    // amount = serviceAmount + platformFee + stripeFee (ce que le client paie)
    const platformFee = Math.round((serviceAmount * commissionRate) / 100);
    const totalBeforeStripeFee = serviceAmount + platformFee;
    const stripeFee = Math.round((totalBeforeStripeFee * stripeFeeRate) / 100);
    const announcerEarnings = serviceAmount;
    const totalAmount = serviceAmount + platformFee + stripeFee;

    // Calculer le breakdown détaillé des prix
    // Charger les options sélectionnées depuis la pendingBooking
    const finalOptionIds = args.updatedOptionIds ?? pendingBooking.optionIds;
    let optionsPrice = 0;
    const optionNames: string[] = [];
    if (finalOptionIds && finalOptionIds.length > 0) {
      for (const optionId of finalOptionIds) {
        const option = await ctx.db.get(optionId as Id<"serviceOptions">);
        if (option) {
          optionsPrice += option.price;
          optionNames.push(option.name);
        }
      }
    }
    const basePrice = serviceAmount - optionsPrice;

    // TVA sur la prestation (uniquement si annonceur pro assujetti, pas micro-entreprise)
    const isVatSubject = announcerForCommission?.companyType !== "micro_enterprise"
      && announcerForCommission?.accountType === "annonceur_pro";
    const vatAmount = isVatSubject
      ? Math.round(serviceAmount - serviceAmount / (1 + vatRate / 100))
      : 0;

    // TVA sur la commission — extraction TVA du montant TTC
    // Formule : TVA = TTC × taux / (100 + taux)
    // Taux TVA depuis la config admin (commission_vat_rate), 20% par défaut
    const commissionVatConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "commission_vat_rate"))
      .first();
    const commissionVatRate = commissionVatConfig ? parseFloat(commissionVatConfig.value) : 20;
    const vatOnCommission = Math.round(platformFee * commissionVatRate / (100 + commissionVatRate));

    // Créer la mission
    const missionId = await ctx.db.insert("missions", {
      announcerId: pendingBooking.announcerId,
      clientId: session.userId,
      serviceId: pendingBooking.serviceId,
      animalId: args.animalId,
      animalIds: allAnimalIds,
      clientName: `${client.firstName} ${client.lastName}`,
      clientPhone: client.phone,
      animal: {
        name: animal.name,
        type: animal.type,
        emoji: animalType?.emoji ?? "🐾",
      },
      animals: allAnimals,
      serviceName: `${category?.name ?? service.category} - ${variant.name}`,
      serviceCategory: service.category,
      variantId: pendingBooking.variantId,
      variantName: variant.name,
      optionIds: finalOptionIds,
      optionNames: optionNames.length > 0 ? optionNames : undefined,
      startDate: pendingBooking.startDate,
      endDate: pendingBooking.endDate,
      startTime: pendingBooking.startTime,
      endTime: pendingBooking.endTime,
      status: "pending_acceptance",
      amount: totalAmount, // Montant total que le client paie (service + commission + frais Stripe)
      platformFee, // Commission de la plateforme
      stripeFee, // Frais de gestion paiement Stripe
      commissionRate, // Taux de commission appliqué (%)
      stripeFeeRate, // Taux frais Stripe appliqué (%)
      vatRate, // Taux TVA appliqué (10 si SAP, 20 sinon)
      isSapApplied, // true si taux réduit SAP appliqué
      announcerEarnings, // Ce que l'annonceur reçoit (prix du service)
      basePrice,          // Prix formule pur (sans options)
      optionsPrice,       // Prix des options
      serviceAmount,      // Montant prestation total (base + options) × animaux
      vatAmount,          // TVA sur prestation (pro assujetti uniquement)
      vatOnCommission,    // TVA sur commission plateforme
      paymentStatus: "not_due",
      location: args.location,
      city: args.city,
      postalCode: args.postalCode,
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
      // Type de formule et multi-séances
      sessionType: variant.sessionType,
      numberOfSessions: variant.numberOfSessions,
      // Créneaux collectifs
      collectiveSlotIds: pendingBooking.collectiveSlotIds,
      animalCount: pendingBooking.animalCount,
      // Séances multi-sessions
      sessions: pendingBooking.sessions,
      // Timestamps
      bookedAt: now, // Date/heure de la réservation par le client
      createdAt: now,
      updatedAt: now,
      // Délai d'acceptation
      acceptanceDeadline: acceptanceDeadline ?? undefined,
    });

    // Supprimer la réservation en attente
    await ctx.db.delete(args.bookingId);

    // Créer les entrées collectiveSlotBookings pour les formules collectives
    if (pendingBooking.collectiveSlotIds && pendingBooking.collectiveSlotIds.length > 0) {
      const animalCount = pendingBooking.animalCount || 1;

      for (let i = 0; i < pendingBooking.collectiveSlotIds.length; i++) {
        const slotId = pendingBooking.collectiveSlotIds[i];

        // Créer l'entrée de réservation
        await ctx.db.insert("collectiveSlotBookings", {
          slotId,
          missionId,
          clientId: session.userId,
          animalId: args.animalId,
          animalCount,
          sessionNumber: i + 1,
          status: "booked",
          createdAt: now,
          updatedAt: now,
        });

        // Mettre à jour le compteur bookedAnimals du créneau
        const slot = await ctx.db.get(slotId);
        if (slot) {
          await ctx.db.patch(slotId, {
            bookedAnimals: slot.bookedAnimals + animalCount,
            updatedAt: now,
          });
        }
      }
    }

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
    const allAnimalNames = allAnimals.map(a => a.name).join(", ");
    await ctx.scheduler.runAfter(0, internal.notifications.actions.sendNewMissionNotification, {
      announcerId: pendingBooking.announcerId,
      clientName: `${client.firstName} ${client.lastName}`,
      animalName: allAnimalNames,
      serviceName: `${category?.name ?? service.category} - ${variant.name}`,
      missionId,
    });

    // Envoyer l'email de notification à l'annonceur
    const announcer = await ctx.db.get(pendingBooking.announcerId);
    if (announcer) {
      const { emailConfig: bookingEmailConfig, appUrl: bookingAppUrl } = await getEmailConfigFromDb(ctx.db);

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
          animalName: allAnimalNames,
          animalType: animalTypeName?.name ?? animal.type,
          location: args.location,
          includeOvernightStay: pendingBooking.includeOvernightStay,
          overnightNights: pendingBooking.overnightNights,
          totalAmount: totalAmount,
        },
        emailConfig: bookingEmailConfig,
        appUrl: bookingAppUrl,
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
    postalCode: v.optional(v.string()),
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

    // Récupérer la catégorie
    const categoryGuest = await ctx.db
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

    // Vérifier la disponibilité selon le categoryType
    let categoryTypeIdGuest: Id<"categoryTypes"> | null = null;
    if (categoryGuest) {
      if (categoryGuest.typeId) {
        categoryTypeIdGuest = categoryGuest.typeId;
      } else if (categoryGuest.parentCategoryId) {
        const parentCatGuest = await ctx.db.get(categoryGuest.parentCategoryId);
        categoryTypeIdGuest = parentCatGuest?.typeId ?? null;
      }
    }

    const availabilitiesGuest = await ctx.db
      .query("availability")
      .withIndex("by_user", (q) => q.eq("userId", pendingBooking.announcerId))
      .collect();

    const requestedDates = getDatesBetween(pendingBooking.startDate, pendingBooking.endDate);

    for (const date of requestedDates) {
      const availabilityForDateGuest = availabilitiesGuest.find(
        (a) => a.date === date &&
               (categoryTypeIdGuest ? String(a.categoryTypeId) === String(categoryTypeIdGuest) : !a.categoryTypeId)
      );

      if (!availabilityForDateGuest || availabilityForDateGuest.status !== "available") {
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

    // Récupérer la configuration des délais d'acceptation
    const deadlineConfigGuest = await ctx.runQuery(
      internal.planning.acceptanceDeadline.getAcceptanceDeadlineConfig,
      {}
    );

    // Valider le minimum à l'avance (24h par défaut)
    if (!isBookingAdvanceValid(pendingBooking.startDate, pendingBooking.startTime, deadlineConfigGuest)) {
      throw new ConvexError(
        `Les réservations doivent être effectuées au minimum ${deadlineConfigGuest.minimumBookingAdvanceHours}h à l'avance`
      );
    }

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

    // 2bis. Créer l'adresse dans la table clientAddresses (pour "Mes adresses")
    if (args.location) {
      await ctx.db.insert("clientAddresses", {
        userId,
        label: "Domicile",
        address: args.location,
        city: args.city,
        postalCode: args.postalCode,
        coordinates: args.coordinates,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      });
    }

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
      postalCode: args.postalCode,
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
    const { emailConfig: guestEmailConfig, appUrl: guestAppUrl } = await getEmailConfigFromDb(ctx.db);

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
      emailConfig: guestEmailConfig,
      appUrl: guestAppUrl,
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
