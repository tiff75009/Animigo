import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { Id, Doc } from "../_generated/dataModel";
import { ConvexError } from "convex/values";
import { missionsOverlap, addMinutesToTime } from "../lib/timeUtils";

// Calcul de distance avec la formule de Haversine (en km)
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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

// Types pour les résultats
interface AnnouncerAvailability {
  status: "available" | "partial" | "unavailable";
  nextAvailable?: string;
  availableSlots?: Array<{ startTime: string; endTime: string }>;
}

interface AnnouncerResult {
  id: Id<"users">;
  firstName: string;
  lastName: string;
  profileImage?: string | null; // Avatar
  coverImage?: string | null; // Photo de couverture
  location: string;
  coordinates?: { lat: number; lng: number };
  distance?: number;
  rating: number;
  reviewCount: number;
  basePrice?: number;
  verified: boolean;
  acceptedAnimals: string[];
  services: string[];
  availability: AnnouncerAvailability;
  accountType: string;
  companyType?: string;
  statusType: "particulier" | "micro_entrepreneur" | "professionnel";
}

// Query principale de recherche d'annonceurs
export const searchAnnouncers = query({
  args: {
    // Filtres
    categorySlug: v.optional(v.string()),
    excludeCategory: v.optional(v.string()), // Exclure une catégorie (ex: "garde" pour mode services)
    animalType: v.optional(v.string()),

    // Localisation
    coordinates: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
    radiusKm: v.optional(v.number()), // Défaut: 20km

    // Date/heure (pour services hourly)
    date: v.optional(v.string()), // "YYYY-MM-DD"
    time: v.optional(v.string()), // "HH:MM"

    // Plage de dates (pour services daily)
    startDate: v.optional(v.string()), // "YYYY-MM-DD"
    endDate: v.optional(v.string()), // "YYYY-MM-DD"

    // Options
    includeUnavailable: v.optional(v.boolean()),

    // Filtres avancés
    accountTypes: v.optional(v.array(v.string())), // "particulier", "micro_entrepreneur", "pro"
    verifiedOnly: v.optional(v.boolean()),
    withPhotoOnly: v.optional(v.boolean()),
    hasGarden: v.optional(v.boolean()),
    hasVehicle: v.optional(v.boolean()),
    ownsAnimals: v.optional(v.array(v.string())), // "chien", "chat", etc.
    noAnimals: v.optional(v.boolean()),
    priceMin: v.optional(v.number()), // En euros
    priceMax: v.optional(v.number()), // En euros
    sortBy: v.optional(v.string()), // "relevance", "price_asc", "price_desc", "rating", "distance"

    // Pagination
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<AnnouncerResult[]> => {
    const radius = args.radiusKm ?? 20;
    const limit = args.limit ?? 50;

    // 1. Récupérer tous les annonceurs actifs (pas les utilisateurs simples)
    const announcers = await ctx.db
      .query("users")
      .filter((q) =>
        q.and(
          q.eq(q.field("isActive"), true),
          q.or(
            q.eq(q.field("accountType"), "annonceur_pro"),
            q.eq(q.field("accountType"), "annonceur_particulier")
          )
        )
      )
      .collect();

    const results: AnnouncerResult[] = [];

    for (const announcer of announcers) {
      // 2. Récupérer le profil
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", announcer._id))
        .first();

      if (!profile) continue;

      // 2.1 Filtrer par type de compte
      if (args.accountTypes && args.accountTypes.length > 0) {
        let statusType: string;
        if (announcer.accountType === "annonceur_particulier") {
          statusType = "particulier";
        } else if (announcer.companyType === "micro_enterprise") {
          statusType = "micro_entrepreneur";
        } else {
          statusType = "pro";
        }
        if (!args.accountTypes.includes(statusType)) continue;
      }

      // 2.2 Filtrer par profil vérifié (email vérifié)
      if (args.verifiedOnly && !announcer.emailVerified) continue;

      // 2.3 Filtrer par équipements
      if (args.hasGarden === true && !profile.hasGarden) continue;
      if (args.hasVehicle === true && !profile.hasVehicle) continue;

      // 2.4 Filtrer par animaux du gardien
      if (args.noAnimals) {
        // L'annonceur ne doit pas avoir d'animaux
        if (profile.ownedAnimals && profile.ownedAnimals.length > 0) continue;
      }
      if (args.ownsAnimals && args.ownsAnimals.length > 0) {
        // L'annonceur doit avoir au moins un des animaux spécifiés
        const ownedTypes = profile.ownedAnimals?.map((a) => a.type) ?? [];
        const hasMatchingAnimal = args.ownsAnimals.some((animal) => {
          if (animal === "autre") {
            // "autre" = tout sauf chien et chat
            return ownedTypes.some((t) => t !== "chien" && t !== "chat");
          }
          return ownedTypes.includes(animal);
        });
        if (!hasMatchingAnimal) continue;
      }

      // 3. Filtrer par localisation si coordonnées fournies
      let distance: number | undefined;
      if (args.coordinates && profile.coordinates) {
        distance = calculateDistance(
          args.coordinates.lat,
          args.coordinates.lng,
          profile.coordinates.lat,
          profile.coordinates.lng
        );

        if (distance > radius) continue;
      }

      // 4. Récupérer les services actifs de l'annonceur
      let servicesQuery = ctx.db
        .query("services")
        .withIndex("by_user_active", (q) =>
          q.eq("userId", announcer._id).eq("isActive", true)
        );

      const services = await servicesQuery.collect();

      if (services.length === 0) continue;

      // 5. Filtrer par catégorie si spécifiée
      let matchingServices = services;
      if (args.categorySlug) {
        matchingServices = services.filter((s) => s.category === args.categorySlug);
        if (matchingServices.length === 0) continue;
      }

      // 5.1 Exclure une catégorie si spécifiée (mode services)
      if (args.excludeCategory) {
        matchingServices = matchingServices.filter((s) => s.category !== args.excludeCategory);
        if (matchingServices.length === 0) continue;
      }

      // 6. Filtrer par type d'animal si spécifié
      if (args.animalType) {
        matchingServices = matchingServices.filter((s) =>
          s.animalTypes.includes(args.animalType!)
        );
        if (matchingServices.length === 0) continue;
      }

      // 7. Vérifier la disponibilité
      let availability: AnnouncerAvailability = { status: "available" };

      // Déterminer les dates à vérifier
      let datesToCheck: string[] = [];
      if (args.date) {
        datesToCheck = [args.date];
      } else if (args.startDate && args.endDate) {
        datesToCheck = getDatesBetween(args.startDate, args.endDate);
      }

      if (datesToCheck.length > 0 && args.categorySlug) {
        // Vérifier les indisponibilités manuelles
        const unavailableDates = await ctx.db
          .query("availability")
          .withIndex("by_user", (q) => q.eq("userId", announcer._id))
          .filter((q) => q.eq(q.field("status"), "unavailable"))
          .collect();

        const unavailableDateSet = new Set(unavailableDates.map((a) => a.date));
        const hasManualUnavailability = datesToCheck.some((d) =>
          unavailableDateSet.has(d)
        );

        // Vérifier les missions existantes UNIQUEMENT pour la même catégorie
        const existingMissions = await ctx.db
          .query("missions")
          .withIndex("by_announcer", (q) => q.eq("announcerId", announcer._id))
          .filter((q) =>
            q.and(
              q.eq(q.field("serviceCategory"), args.categorySlug),
              q.neq(q.field("status"), "cancelled"),
              q.neq(q.field("status"), "refused")
            )
          )
          .collect();

        // Vérifier chevauchement de créneaux avec missions existantes (détection temporelle)
        const hasConflictingMission = existingMissions.some((mission) => {
          // D'abord vérifier si la mission concerne les dates recherchées
          const searchStartDate = args.date || args.startDate!;
          const searchEndDate = args.date || args.endDate!;

          if (!datesOverlap(mission.startDate, mission.endDate, searchStartDate, searchEndDate)) {
            return false; // Pas de chevauchement de dates
          }

          // Si l'utilisateur a spécifié une heure, on vérifie le créneau exact
          if (args.time) {
            const searchSlot = {
              startDate: searchStartDate,
              endDate: searchEndDate,
              startTime: args.time,
              endTime: addMinutesToTime(args.time, 60), // 1h par défaut
            };

            return missionsOverlap(
              { startDate: mission.startDate, endDate: mission.endDate, startTime: mission.startTime, endTime: mission.endTime },
              searchSlot
            );
          }

          // Si pas d'heure spécifiée, on ne bloque QUE si la mission prend TOUTE la journée
          // (mission multi-jours OU mission sans créneau horaire défini)
          const isMultiDay = mission.startDate !== mission.endDate;
          const hasNoTimeSlot = !mission.startTime || !mission.endTime;

          // Si la mission a des créneaux horaires définis, l'annonceur reste disponible
          // (il y a d'autres créneaux libres dans la journée)
          return isMultiDay || hasNoTimeSlot;
        });

        // Vérifier disponibilité partielle (créneaux horaires)
        if (args.time && args.date) {
          const partialAvailability = await ctx.db
            .query("availability")
            .withIndex("by_user_date", (q) =>
              q.eq("userId", announcer._id).eq("date", args.date!)
            )
            .first();

          if (partialAvailability?.status === "partial" && partialAvailability.timeSlots) {
            // Vérifier si l'heure demandée est dans un créneau disponible
            const requestedTime = args.time;
            const isInSlot = partialAvailability.timeSlots.some((slot) =>
              requestedTime >= slot.startTime && requestedTime < slot.endTime
            );

            if (!isInSlot) {
              availability = {
                status: "partial",
                availableSlots: partialAvailability.timeSlots,
              };
            }
          }
        }

        if (hasManualUnavailability || hasConflictingMission) {
          // Trouver la prochaine date disponible
          const today = new Date();
          const nextDays: string[] = [];
          for (let i = 1; i <= 30; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() + i);
            // Formater sans toISOString() pour éviter la conversion UTC
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            nextDays.push(`${year}-${month}-${day}`);
          }

          let nextAvailable: string | undefined;
          for (const day of nextDays) {
            const isUnavailable = unavailableDateSet.has(day);
            // Vérifier si une mission bloque TOUTE la journée (pas seulement un créneau)
            const hasFullDayBlock = existingMissions.some((m) => {
              // D'abord vérifier si la mission couvre ce jour
              if (!datesOverlap(m.startDate, m.endDate, day, day)) return false;
              // Vérifier si c'est un blocage journée entière
              const isMultiDay = m.startDate !== m.endDate;
              const hasNoTimeSlot = !m.startTime || !m.endTime;
              return isMultiDay || hasNoTimeSlot;
            });

            if (!isUnavailable && !hasFullDayBlock) {
              nextAvailable = day;
              break;
            }
          }

          availability = {
            status: "unavailable",
            nextAvailable,
          };

          // Skip si on ne veut pas les indisponibles
          if (!args.includeUnavailable) continue;
        }
      }

      // 8. Calculer le prix de base (minimum des services correspondants)
      let basePrice: number | undefined;
      for (const service of matchingServices) {
        if (service.basePrice && (!basePrice || service.basePrice < basePrice)) {
          basePrice = service.basePrice;
        }
      }

      // 8.1 Filtrer par fourchette de prix (prix en euros, basePrice en centimes)
      if (args.priceMin !== undefined && basePrice !== undefined) {
        if (basePrice < args.priceMin * 100) continue;
      }
      if (args.priceMax !== undefined && basePrice !== undefined) {
        if (basePrice > args.priceMax * 100) continue;
      }

      // 9. Récupérer la photo de profil
      const profilePhoto = await ctx.db
        .query("photos")
        .withIndex("by_user", (q) => q.eq("userId", announcer._id))
        .filter((q) => q.eq(q.field("isProfilePhoto"), true))
        .first();

      let profileImageUrl: string | null = null;
      if (profilePhoto?.storageId) {
        profileImageUrl = await ctx.storage.getUrl(profilePhoto.storageId);
      }

      // 9.1 Filtrer par photo
      if (args.withPhotoOnly && !profileImageUrl) continue;

      // 10. Déterminer le type de statut pour le badge
      let statusType: "particulier" | "micro_entrepreneur" | "professionnel" = "particulier";
      if (announcer.accountType === "annonceur_pro") {
        if (announcer.companyType === "micro_enterprise") {
          statusType = "micro_entrepreneur";
        } else {
          statusType = "professionnel";
        }
      }

      // 11. Construire le résultat
      results.push({
        id: announcer._id,
        firstName: announcer.firstName,
        lastName: announcer.lastName,
        profileImage: profile.profileImageUrl ?? profileImageUrl,
        coverImage: profile.coverImageUrl ?? null,
        location: profile.city ?? profile.location ?? "",
        coordinates: profile.coordinates,
        distance,
        rating: 4.5, // TODO: Calculer depuis les avis
        reviewCount: 0, // TODO: Compter les avis
        basePrice,
        verified: announcer.accountType === "annonceur_pro",
        acceptedAnimals: profile.acceptedAnimals ?? [],
        services: services.map((s) => s.category),
        availability,
        accountType: announcer.accountType,
        companyType: announcer.companyType,
        statusType,
      });
    }

    // Trier selon le critère choisi
    const sortBy = args.sortBy ?? "relevance";

    results.sort((a, b) => {
      // Disponibles en premier (toujours, sauf si tri explicite)
      if (sortBy === "relevance" || sortBy === "distance") {
        if (a.availability.status === "available" && b.availability.status !== "available") return -1;
        if (a.availability.status !== "available" && b.availability.status === "available") return 1;
      }

      // Appliquer le tri demandé
      switch (sortBy) {
        case "price_asc":
          // Prix croissant (les moins chers en premier)
          if (a.basePrice !== undefined && b.basePrice !== undefined) {
            return a.basePrice - b.basePrice;
          }
          if (a.basePrice === undefined) return 1;
          if (b.basePrice === undefined) return -1;
          return 0;

        case "price_desc":
          // Prix décroissant (les plus chers en premier)
          if (a.basePrice !== undefined && b.basePrice !== undefined) {
            return b.basePrice - a.basePrice;
          }
          if (a.basePrice === undefined) return 1;
          if (b.basePrice === undefined) return -1;
          return 0;

        case "rating":
          // Mieux notés en premier
          return b.rating - a.rating;

        case "distance":
          // Plus proches en premier
          if (a.distance !== undefined && b.distance !== undefined) {
            return a.distance - b.distance;
          }
          if (a.distance === undefined) return 1;
          if (b.distance === undefined) return -1;
          return 0;

        case "relevance":
        default:
          // Pertinence: disponibles puis par distance
          if (a.distance !== undefined && b.distance !== undefined) {
            return a.distance - b.distance;
          }
          return 0;
      }
    });

    return results.slice(0, limit);
  },
});

// Types pour les détails de service
type PriceUnit = "hour" | "day" | "week" | "month" | "flat";
type PriceType = "flat" | "per_day" | "per_unit";

interface ServiceVariant {
  id: string;
  name: string;
  description?: string;
  price: number;
  priceUnit: PriceUnit;
  duration?: number;
  includedFeatures?: string[];
  isActive: boolean;
  // Multi-pricing support
  pricing?: {
    hourly?: number;
    daily?: number;
    weekly?: number;
    monthly?: number;
    nightly?: number;
  };
}

interface ServiceOption {
  id: string;
  name: string;
  description?: string;
  price: number;
  priceType: PriceType;
  unitLabel?: string;
  maxQuantity?: number;
  isActive: boolean;
}

interface ServiceDetail {
  id: string;
  category: string;
  categoryName: string;
  categoryIcon?: string;
  categoryDescription?: string;
  animalTypes: string[];
  variants: ServiceVariant[];
  options: ServiceOption[];
  // Overnight stay support
  allowOvernightStay?: boolean;
  dayStartTime?: string;
  dayEndTime?: string;
  overnightPrice?: number;
  // Service location
  serviceLocation?: "announcer_home" | "client_home" | "both";
}

// Query pour obtenir les détails des services d'un annonceur
export const getAnnouncerServiceDetails = query({
  args: {
    announcerId: v.id("users"),
  },
  handler: async (ctx, args): Promise<ServiceDetail[]> => {
    // Récupérer les services actifs de l'annonceur
    const services = await ctx.db
      .query("services")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", args.announcerId).eq("isActive", true)
      )
      .collect();

    // Récupérer les catégories pour les noms et icônes
    const categories = await ctx.db.query("serviceCategories").collect();
    const categoryMap = new Map(categories.map((c) => [c.slug, c]));

    const results: ServiceDetail[] = [];

    for (const service of services) {
      // Récupérer les variants actifs
      const variants = await ctx.db
        .query("serviceVariants")
        .withIndex("by_service", (q) => q.eq("serviceId", service._id))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      // Récupérer les options actives
      const options = await ctx.db
        .query("serviceOptions")
        .withIndex("by_service", (q) => q.eq("serviceId", service._id))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      const categoryData = categoryMap.get(service.category);

      results.push({
        id: service._id,
        category: service.category,
        categoryName: categoryData?.name ?? service.category,
        categoryIcon: categoryData?.icon,
        categoryDescription: categoryData?.description,
        animalTypes: service.animalTypes,
        // Overnight fields from service
        allowOvernightStay: service.allowOvernightStay,
        dayStartTime: service.dayStartTime,
        dayEndTime: service.dayEndTime,
        overnightPrice: service.overnightPrice,
        // Service location
        serviceLocation: service.serviceLocation as "announcer_home" | "client_home" | "both" | undefined,
        variants: variants.map((v) => ({
          id: v._id,
          name: v.name,
          description: v.description,
          price: v.price,
          priceUnit: v.priceUnit as PriceUnit,
          duration: v.duration,
          includedFeatures: v.includedFeatures,
          isActive: v.isActive,
          // Pricing object for multi-pricing support
          pricing: v.pricing,
        })),
        options: options.map((o) => ({
          id: o._id,
          name: o.name,
          description: o.description,
          price: o.price,
          priceType: o.priceType as PriceType,
          unitLabel: o.unitLabel,
          maxQuantity: o.maxQuantity,
          isActive: o.isActive,
        })),
      });
    }

    return results;
  },
});

// Query pour obtenir les préférences de disponibilité d'un annonceur
export const getAnnouncerAvailabilityPreferences = query({
  args: {
    announcerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", args.announcerId))
      .first();

    return {
      acceptReservationsFrom: preferences?.acceptReservationsFrom ?? "08:00",
      acceptReservationsTo: preferences?.acceptReservationsTo ?? "20:00",
    };
  },
});

// Query pour obtenir les créneaux alternatifs d'un annonceur
export const getAnnouncerAlternativeSlots = query({
  args: {
    announcerId: v.id("users"),
    categorySlug: v.string(),
    monthStart: v.string(), // "YYYY-MM-DD"
    monthEnd: v.string(), // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    // Récupérer toutes les indisponibilités du mois
    const unavailabilities = await ctx.db
      .query("availability")
      .withIndex("by_user", (q) => q.eq("userId", args.announcerId))
      .collect();

    const unavailableDates = new Set(
      unavailabilities
        .filter((a) => a.status === "unavailable")
        .map((a) => a.date)
    );

    // Récupérer les missions existantes pour cette catégorie
    const missions = await ctx.db
      .query("missions")
      .withIndex("by_announcer", (q) => q.eq("announcerId", args.announcerId))
      .filter((q) =>
        q.and(
          q.eq(q.field("serviceCategory"), args.categorySlug),
          q.neq(q.field("status"), "cancelled"),
          q.neq(q.field("status"), "refused")
        )
      )
      .collect();

    // Générer les dates du mois
    const allDates = getDatesBetween(args.monthStart, args.monthEnd);
    // Formater la date du jour sans toISOString()
    const todayDate = new Date();
    const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, "0")}-${String(todayDate.getDate()).padStart(2, "0")}`;

    // Filtrer les dates disponibles ou partiellement disponibles
    const availableDates = allDates.filter((date) => {
      // Ignorer les dates passées
      if (date < today) return false;

      // Ignorer les indisponibilités manuelles
      if (unavailableDates.has(date)) return false;

      // Vérifier les missions pour cette date
      const dayMissions = missions.filter((m) =>
        datesOverlap(m.startDate, m.endDate, date, date)
      );

      // Si pas de missions, la date est disponible
      if (dayMissions.length === 0) return true;

      // Si une mission bloque toute la journée (multi-jours ou sans heures), exclure
      const hasFullDayBlock = dayMissions.some((m) => {
        const isMultiDay = m.startDate !== m.endDate;
        const hasNoTimeSlot = !m.startTime || !m.endTime;
        return isMultiDay || hasNoTimeSlot;
      });

      if (hasFullDayBlock) return false;

      // Sinon, il y a des créneaux spécifiques occupés, mais d'autres heures sont disponibles
      return true;
    });

    // Récupérer les créneaux partiels
    const partialAvailabilities = unavailabilities.filter(
      (a) => a.status === "partial" && availableDates.includes(a.date)
    );

    return {
      availableDates,
      partialSlots: partialAvailabilities.map((a) => ({
        date: a.date,
        timeSlots: a.timeSlots ?? [],
      })),
    };
  },
});

// Query pour obtenir les disponibilités d'un annonceur pour le calendrier de réservation
export const getAnnouncerAvailabilityCalendar = query({
  args: {
    announcerId: v.id("users"),
    serviceCategory: v.string(),
    startDate: v.string(), // "YYYY-MM-DD"
    endDate: v.string(), // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    // Récupérer le profil de l'annonceur pour les buffers
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.announcerId))
      .first();

    const bufferBefore = profile?.bufferBefore ?? 0;
    const bufferAfter = profile?.bufferAfter ?? 0;

    // Récupérer toutes les indisponibilités
    const unavailabilities = await ctx.db
      .query("availability")
      .withIndex("by_user", (q) => q.eq("userId", args.announcerId))
      .collect();

    const unavailableDatesSet = new Set(
      unavailabilities
        .filter((a) => a.status === "unavailable")
        .map((a) => a.date)
    );

    // Récupérer les missions existantes pour cette catégorie
    const missions = await ctx.db
      .query("missions")
      .withIndex("by_announcer", (q) => q.eq("announcerId", args.announcerId))
      .filter((q) =>
        q.and(
          q.eq(q.field("serviceCategory"), args.serviceCategory),
          q.neq(q.field("status"), "cancelled"),
          q.neq(q.field("status"), "refused")
        )
      )
      .collect();

    // Générer les dates de la plage
    const allDates = getDatesBetween(args.startDate, args.endDate);
    // Formater la date du jour sans toISOString()
    const todayDate = new Date();
    const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, "0")}-${String(todayDate.getDate()).padStart(2, "0")}`;

    // Construire le calendrier
    const calendar: Array<{
      date: string;
      status: "available" | "partial" | "unavailable" | "past";
      timeSlots?: Array<{ startTime: string; endTime: string }>;
      bookedSlots?: Array<{ startTime: string; endTime: string }>;
    }> = [];

    for (const date of allDates) {
      if (date < today) {
        calendar.push({ date, status: "past" });
        continue;
      }

      // Vérifier indisponibilité manuelle
      if (unavailableDatesSet.has(date)) {
        calendar.push({ date, status: "unavailable" });
        continue;
      }

      // Trouver les missions pour ce jour
      const dayMissions = missions.filter((m) =>
        datesOverlap(m.startDate, m.endDate, date, date)
      );

      if (dayMissions.length > 0) {
        // Vérifier si une mission bloque toute la journée
        // Une mission bloque toute la journée si:
        // - Elle couvre plusieurs jours (startDate !== endDate)
        // - Ou elle n'a pas d'heures définies (startTime/endTime)
        const hasFullDayBlock = dayMissions.some((m) => {
          const isMultiDay = m.startDate !== m.endDate;
          const hasNoTimeSlot = !m.startTime || !m.endTime;
          return isMultiDay || hasNoTimeSlot;
        });

        if (hasFullDayBlock) {
          calendar.push({ date, status: "unavailable" });
          continue;
        }

        // Sinon, ce sont des missions avec créneaux horaires spécifiques
        // Extraire les créneaux occupés
        const bookedSlots = dayMissions
          .filter((m) => m.startTime && m.endTime && m.startDate === m.endDate)
          .map((m) => ({
            startTime: m.startTime!,
            endTime: m.endTime!,
          }));

        // Vérifier aussi les disponibilités partielles définies manuellement
        const partialAvail = unavailabilities.find(
          (a) => a.date === date && a.status === "partial"
        );

        calendar.push({
          date,
          status: "partial",
          timeSlots: partialAvail?.timeSlots,
          bookedSlots,
        });
        continue;
      }

      // Vérifier disponibilité partielle (définie manuellement)
      const partialAvail = unavailabilities.find(
        (a) => a.date === date && a.status === "partial"
      );
      if (partialAvail?.timeSlots) {
        calendar.push({
          date,
          status: "partial",
          timeSlots: partialAvail.timeSlots,
        });
        continue;
      }

      calendar.push({ date, status: "available" });
    }

    return {
      calendar,
      bufferBefore,
      bufferAfter,
    };
  },
});

// Query pour obtenir les informations de base d'un annonceur
export const getAnnouncerById = query({
  args: {
    announcerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Récupérer l'annonceur
    const announcer = await ctx.db.get(args.announcerId);
    if (!announcer) {
      return null;
    }

    // Récupérer le profil
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.announcerId))
      .first();

    // Récupérer la photo de profil
    const profilePhoto = await ctx.db
      .query("photos")
      .withIndex("by_user", (q) => q.eq("userId", args.announcerId))
      .filter((q) => q.eq(q.field("isProfilePhoto"), true))
      .first();

    let profileImageUrl: string | null = null;
    if (profilePhoto?.storageId) {
      profileImageUrl = await ctx.storage.getUrl(profilePhoto.storageId);
    }

    return {
      id: announcer._id,
      firstName: announcer.firstName,
      lastName: announcer.lastName,
      profileImage: profileImageUrl,
      location: profile?.city ?? profile?.location ?? "",
    };
  },
});

// Types pour les résultats de recherche par service
interface ServiceSearchResult {
  // Identifiants
  serviceId: Id<"services">;
  announcerId: Id<"users">;
  announcerSlug: string;

  // Infos annonceur
  firstName: string;
  lastName: string;
  profileImage: string | null;
  coverImage: string | null;
  location: string;
  distance?: number;
  rating: number;
  reviewCount: number;
  verified: boolean;
  statusType: "particulier" | "micro_entrepreneur" | "professionnel";

  // Infos service
  categorySlug: string;
  categoryName: string;
  categoryIcon: string;
  basePrice: number;
  basePriceUnit: "hour" | "day" | "week" | "month" | "flat";
  animalTypes: string[];

  // Preview variantes (2-3 max)
  variants: Array<{
    id: string;
    name: string;
    price: number;
    unit: string;
  }>;

  // Disponibilité
  availability: {
    status: "available" | "partial" | "unavailable";
    nextAvailable?: string;
  };
}

// Query de recherche par service (1 carte par service au lieu de 1 carte par annonceur)
export const searchServices = query({
  args: {
    // Filtres
    categorySlug: v.optional(v.string()),
    excludeCategory: v.optional(v.string()),
    animalType: v.optional(v.string()),

    // Localisation
    coordinates: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
    radiusKm: v.optional(v.number()),

    // Date/heure (pour services hourly)
    date: v.optional(v.string()),
    time: v.optional(v.string()),

    // Plage de dates (pour services daily)
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),

    // Options
    includeUnavailable: v.optional(v.boolean()),

    // Filtres avancés
    accountTypes: v.optional(v.array(v.string())),
    verifiedOnly: v.optional(v.boolean()),
    withPhotoOnly: v.optional(v.boolean()),
    hasGarden: v.optional(v.boolean()),
    hasVehicle: v.optional(v.boolean()),
    ownsAnimals: v.optional(v.array(v.string())),
    noAnimals: v.optional(v.boolean()),
    priceMin: v.optional(v.number()),
    priceMax: v.optional(v.number()),
    sortBy: v.optional(v.string()),

    // Pagination
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<ServiceSearchResult[]> => {
    const radius = args.radiusKm ?? 20;
    const limit = args.limit ?? 100;

    // 1. Récupérer tous les annonceurs actifs
    const announcers = await ctx.db
      .query("users")
      .filter((q) =>
        q.and(
          q.eq(q.field("isActive"), true),
          q.or(
            q.eq(q.field("accountType"), "annonceur_pro"),
            q.eq(q.field("accountType"), "annonceur_particulier")
          )
        )
      )
      .collect();

    // Récupérer les catégories pour les noms et icônes
    const categories = await ctx.db.query("serviceCategories").collect();
    const categoryMap = new Map(categories.map((c) => [c.slug, c]));

    const results: ServiceSearchResult[] = [];

    for (const announcer of announcers) {
      // 2. Récupérer le profil
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", announcer._id))
        .first();

      if (!profile) continue;

      // 2.1 Filtrer par type de compte
      if (args.accountTypes && args.accountTypes.length > 0) {
        let statusType: string;
        if (announcer.accountType === "annonceur_particulier") {
          statusType = "particulier";
        } else if (announcer.companyType === "micro_enterprise") {
          statusType = "micro_entrepreneur";
        } else {
          statusType = "pro";
        }
        if (!args.accountTypes.includes(statusType)) continue;
      }

      // 2.2 Filtrer par profil vérifié
      if (args.verifiedOnly && !announcer.emailVerified) continue;

      // 2.3 Filtrer par équipements
      if (args.hasGarden === true && !profile.hasGarden) continue;
      if (args.hasVehicle === true && !profile.hasVehicle) continue;

      // 2.4 Filtrer par animaux du gardien
      if (args.noAnimals) {
        if (profile.ownedAnimals && profile.ownedAnimals.length > 0) continue;
      }
      if (args.ownsAnimals && args.ownsAnimals.length > 0) {
        const ownedTypes = profile.ownedAnimals?.map((a) => a.type) ?? [];
        const hasMatchingAnimal = args.ownsAnimals.some((animal) => {
          if (animal === "autre") {
            return ownedTypes.some((t) => t !== "chien" && t !== "chat");
          }
          return ownedTypes.includes(animal);
        });
        if (!hasMatchingAnimal) continue;
      }

      // 3. Filtrer par localisation
      let distance: number | undefined;
      if (args.coordinates && profile.coordinates) {
        distance = calculateDistance(
          args.coordinates.lat,
          args.coordinates.lng,
          profile.coordinates.lat,
          profile.coordinates.lng
        );
        if (distance > radius) continue;
      }

      // 4. Récupérer les services actifs
      const services = await ctx.db
        .query("services")
        .withIndex("by_user_active", (q) =>
          q.eq("userId", announcer._id).eq("isActive", true)
        )
        .collect();

      if (services.length === 0) continue;

      // 5. Récupérer la photo de profil
      const profilePhoto = await ctx.db
        .query("photos")
        .withIndex("by_user", (q) => q.eq("userId", announcer._id))
        .filter((q) => q.eq(q.field("isProfilePhoto"), true))
        .first();

      let profileImageUrl: string | null = null;
      if (profilePhoto?.storageId) {
        profileImageUrl = await ctx.storage.getUrl(profilePhoto.storageId);
      }

      // 5.1 Filtrer par photo
      if (args.withPhotoOnly && !profileImageUrl && !profile.profileImageUrl) continue;

      // 6. Déterminer le type de statut
      let statusType: "particulier" | "micro_entrepreneur" | "professionnel" = "particulier";
      if (announcer.accountType === "annonceur_pro") {
        if (announcer.companyType === "micro_enterprise") {
          statusType = "micro_entrepreneur";
        } else {
          statusType = "professionnel";
        }
      }

      // 7. Pour chaque service, créer un résultat
      for (const service of services) {
        // Filtrer par catégorie si spécifiée
        if (args.categorySlug && service.category !== args.categorySlug) continue;

        // Exclure une catégorie si spécifiée
        if (args.excludeCategory && service.category === args.excludeCategory) continue;

        // Filtrer par type d'animal
        if (args.animalType && !service.animalTypes.includes(args.animalType)) continue;

        // Récupérer les variants
        const variants = await ctx.db
          .query("serviceVariants")
          .withIndex("by_service", (q) => q.eq("serviceId", service._id))
          .filter((q) => q.eq(q.field("isActive"), true))
          .collect();

        // Calculer le prix de base et l'unité
        // Pour les gardes: priorité daily, pour les services: priorité hourly
        const isGardeCategory = service.category.includes("garde") || service.category === "garde";
        let basePrice = service.basePrice ?? 0;
        let basePriceUnit: "hour" | "day" | "week" | "month" | "flat" = isGardeCategory ? "day" : "hour";

        if (variants.length > 0) {
          // Chercher le meilleur prix selon la catégorie
          let bestPrice = 0;
          let bestUnit: "hour" | "day" | "week" | "month" | "flat" = isGardeCategory ? "day" : "hour";

          for (const v of variants) {
            const pricing = v.pricing;
            if (pricing) {
              if (isGardeCategory) {
                // Pour garde: priorité daily > weekly > monthly > hourly
                if (pricing.daily && (bestPrice === 0 || pricing.daily < bestPrice)) {
                  bestPrice = pricing.daily;
                  bestUnit = "day";
                } else if (!bestPrice && pricing.weekly) {
                  bestPrice = pricing.weekly;
                  bestUnit = "week";
                } else if (!bestPrice && pricing.monthly) {
                  bestPrice = pricing.monthly;
                  bestUnit = "month";
                } else if (!bestPrice && pricing.hourly) {
                  bestPrice = pricing.hourly;
                  bestUnit = "hour";
                }
              } else {
                // Pour services: priorité hourly > daily
                if (pricing.hourly && (bestPrice === 0 || pricing.hourly < bestPrice)) {
                  bestPrice = pricing.hourly;
                  bestUnit = "hour";
                } else if (!bestPrice && pricing.daily) {
                  bestPrice = pricing.daily;
                  bestUnit = "day";
                }
              }
            }

            // Fallback sur price/priceUnit si pas de pricing object
            if (bestPrice === 0 && v.price > 0) {
              if (bestPrice === 0 || v.price < bestPrice) {
                bestPrice = v.price;
                bestUnit = v.priceUnit as "hour" | "day" | "week" | "month" | "flat";
              }
            }
          }

          if (bestPrice > 0) {
            basePrice = bestPrice;
            basePriceUnit = bestUnit;
          } else {
            // Fallback: minimum des prix bruts
            basePrice = Math.min(...variants.map(v => v.price));
          }
        }

        // Filtrer par prix
        if (args.priceMin !== undefined && basePrice < args.priceMin * 100) continue;
        if (args.priceMax !== undefined && basePrice > args.priceMax * 100) continue;

        // Vérifier la disponibilité pour ce service
        let availability: { status: "available" | "partial" | "unavailable"; nextAvailable?: string } = { status: "available" };

        // Déterminer les dates à vérifier
        let datesToCheck: string[] = [];
        if (args.date) {
          datesToCheck = [args.date];
        } else if (args.startDate && args.endDate) {
          datesToCheck = getDatesBetween(args.startDate, args.endDate);
        }

        if (datesToCheck.length > 0) {
          // Vérifier les indisponibilités manuelles
          const unavailableDates = await ctx.db
            .query("availability")
            .withIndex("by_user", (q) => q.eq("userId", announcer._id))
            .filter((q) => q.eq(q.field("status"), "unavailable"))
            .collect();

          const unavailableDateSet = new Set(unavailableDates.map((a) => a.date));
          const hasManualUnavailability = datesToCheck.some((d) =>
            unavailableDateSet.has(d)
          );

          // Vérifier les missions existantes pour cette catégorie
          const existingMissions = await ctx.db
            .query("missions")
            .withIndex("by_announcer", (q) => q.eq("announcerId", announcer._id))
            .filter((q) =>
              q.and(
                q.eq(q.field("serviceCategory"), service.category),
                q.neq(q.field("status"), "cancelled"),
                q.neq(q.field("status"), "refused")
              )
            )
            .collect();

          const hasConflictingMission = existingMissions.some((mission) => {
            const searchStartDate = args.date || args.startDate!;
            const searchEndDate = args.date || args.endDate!;

            if (!datesOverlap(mission.startDate, mission.endDate, searchStartDate, searchEndDate)) {
              return false;
            }

            if (args.time) {
              const searchSlot = {
                startDate: searchStartDate,
                endDate: searchEndDate,
                startTime: args.time,
                endTime: addMinutesToTime(args.time, 60),
              };

              return missionsOverlap(
                { startDate: mission.startDate, endDate: mission.endDate, startTime: mission.startTime, endTime: mission.endTime },
                searchSlot
              );
            }

            const isMultiDay = mission.startDate !== mission.endDate;
            const hasNoTimeSlot = !mission.startTime || !mission.endTime;
            return isMultiDay || hasNoTimeSlot;
          });

          if (hasManualUnavailability || hasConflictingMission) {
            // Trouver la prochaine date disponible
            const today = new Date();
            const nextDays: string[] = [];
            for (let i = 1; i <= 30; i++) {
              const d = new Date(today);
              d.setDate(d.getDate() + i);
              const year = d.getFullYear();
              const month = String(d.getMonth() + 1).padStart(2, "0");
              const day = String(d.getDate()).padStart(2, "0");
              nextDays.push(`${year}-${month}-${day}`);
            }

            let nextAvailable: string | undefined;
            for (const day of nextDays) {
              const isUnavailable = unavailableDateSet.has(day);
              const hasFullDayBlock = existingMissions.some((m) => {
                if (!datesOverlap(m.startDate, m.endDate, day, day)) return false;
                const isMultiDay = m.startDate !== m.endDate;
                const hasNoTimeSlot = !m.startTime || !m.endTime;
                return isMultiDay || hasNoTimeSlot;
              });

              if (!isUnavailable && !hasFullDayBlock) {
                nextAvailable = day;
                break;
              }
            }

            availability = { status: "unavailable", nextAvailable };

            if (!args.includeUnavailable) continue;
          }
        }

        const categoryData = categoryMap.get(service.category);

        results.push({
          serviceId: service._id,
          announcerId: announcer._id,
          announcerSlug: announcer.slug ?? announcer._id, // Fallback sur l'ID si pas de slug
          firstName: announcer.firstName,
          lastName: announcer.lastName,
          profileImage: profile.profileImageUrl ?? profileImageUrl,
          coverImage: profile.coverImageUrl ?? null,
          location: profile.city ?? profile.location ?? "",
          distance,
          rating: 4.5, // TODO: Calculer depuis les avis
          reviewCount: 0, // TODO: Compter les avis
          verified: announcer.accountType === "annonceur_pro",
          statusType,
          categorySlug: service.category,
          categoryName: categoryData?.name ?? service.category,
          categoryIcon: categoryData?.icon ?? "📋",
          basePrice,
          basePriceUnit,
          animalTypes: service.animalTypes,
          variants: variants.slice(0, 3).map((v) => ({
            id: v._id,
            name: v.name,
            price: v.price,
            unit: v.priceUnit,
          })),
          availability,
        });
      }
    }

    // Trier selon le critère choisi
    const sortBy = args.sortBy ?? "relevance";

    results.sort((a, b) => {
      // Disponibles en premier
      if (sortBy === "relevance" || sortBy === "distance") {
        if (a.availability.status === "available" && b.availability.status !== "available") return -1;
        if (a.availability.status !== "available" && b.availability.status === "available") return 1;
      }

      switch (sortBy) {
        case "price_asc":
          return a.basePrice - b.basePrice;

        case "price_desc":
          return b.basePrice - a.basePrice;

        case "rating":
          return b.rating - a.rating;

        case "distance":
          if (a.distance !== undefined && b.distance !== undefined) {
            return a.distance - b.distance;
          }
          if (a.distance === undefined) return 1;
          if (b.distance === undefined) return -1;
          return 0;

        case "relevance":
        default:
          if (a.distance !== undefined && b.distance !== undefined) {
            return a.distance - b.distance;
          }
          return 0;
      }
    });

    return results.slice(0, limit);
  },
});

// Mutation pour créer une demande de réservation
export const createBookingRequest = mutation({
  args: {
    token: v.string(),
    announcerId: v.id("users"),
    serviceId: v.id("services"),
    variantId: v.string(),
    optionIds: v.optional(v.array(v.string())),
    // Dates
    startDate: v.string(), // "YYYY-MM-DD"
    endDate: v.string(), // "YYYY-MM-DD"
    startTime: v.optional(v.string()), // "HH:MM"
    endTime: v.optional(v.string()),
    // Animal
    animal: v.object({
      name: v.string(),
      type: v.string(),
      emoji: v.string(),
    }),
    // Localisation
    location: v.string(),
    // Notes
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Vérifier la session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Vous devez être connecté pour réserver");
    }

    // Récupérer l'utilisateur client
    const client = await ctx.db.get(session.userId);
    if (!client) {
      throw new ConvexError("Utilisateur non trouvé");
    }

    // Récupérer le service
    const service = await ctx.db.get(args.serviceId);
    if (!service) {
      throw new ConvexError("Service non trouvé");
    }

    // Récupérer la catégorie pour le nom
    const category = await ctx.db
      .query("serviceCategories")
      .filter((q) => q.eq(q.field("slug"), service.category))
      .first();

    // Récupérer la variante sélectionnée
    const variant = await ctx.db
      .query("serviceVariants")
      .withIndex("by_service", (q) => q.eq("serviceId", args.serviceId))
      .filter((q) => q.eq(q.field("_id"), args.variantId as Id<"serviceVariants">))
      .first();

    if (!variant) {
      throw new ConvexError("Formule non trouvée");
    }

    // Calculer le montant total
    let totalAmount = variant.price;

    // Ajouter les options si sélectionnées
    if (args.optionIds && args.optionIds.length > 0) {
      for (const optionId of args.optionIds) {
        const option = await ctx.db.get(optionId as Id<"serviceOptions">);
        if (option) {
          totalAmount += option.price;
        }
      }
    }

    // Calculer le nombre de jours si tarification journalière
    if (variant.priceUnit === "day" && args.startDate !== args.endDate) {
      const days = getDatesBetween(args.startDate, args.endDate).length;
      totalAmount = variant.price * days;

      // Ajouter les options par jour
      if (args.optionIds && args.optionIds.length > 0) {
        for (const optionId of args.optionIds) {
          const option = await ctx.db.get(optionId as Id<"serviceOptions">);
          if (option && option.priceType === "per_day") {
            totalAmount += option.price * days;
          }
        }
      }
    }

    // Vérifier la disponibilité
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

    // Vérifier les conflits de missions (avec détection temporelle)
    const existingMissions = await ctx.db
      .query("missions")
      .withIndex("by_announcer", (q) => q.eq("announcerId", args.announcerId))
      .filter((q) =>
        q.and(
          q.eq(q.field("serviceCategory"), service.category),
          q.neq(q.field("status"), "cancelled"),
          q.neq(q.field("status"), "refused")
        )
      )
      .collect();

    // Construire le créneau de la nouvelle mission
    const newMissionSlot = {
      startDate: args.startDate,
      endDate: args.endDate,
      startTime: args.startTime,
      endTime: args.endTime,
    };

    const hasConflict = existingMissions.some((m) =>
      missionsOverlap(
        { startDate: m.startDate, endDate: m.endDate, startTime: m.startTime, endTime: m.endTime },
        newMissionSlot
      )
    );

    if (hasConflict) {
      throw new ConvexError("L'annonceur a déjà une réservation sur ce créneau");
    }

    // Récupérer le profil client pour le téléphone
    const clientProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    const now = Date.now();

    // Créer la mission
    const missionId = await ctx.db.insert("missions", {
      announcerId: args.announcerId,
      clientId: session.userId,
      serviceId: args.serviceId,
      clientName: `${client.firstName} ${client.lastName}`,
      clientPhone: client.phone,
      animal: args.animal,
      serviceName: `${category?.name ?? service.category} - ${variant.name}`,
      serviceCategory: service.category,
      startDate: args.startDate,
      endDate: args.endDate,
      startTime: args.startTime,
      endTime: args.endTime,
      status: "pending_acceptance",
      amount: totalAmount,
      paymentStatus: "not_due",
      location: args.location,
      clientNotes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      missionId,
      amount: totalAmount,
    };
  },
});
