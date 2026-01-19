import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { Id, Doc } from "../_generated/dataModel";
import { ConvexError } from "convex/values";

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
  profileImage?: string | null;
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

        // Vérifier chevauchement de dates avec missions existantes
        const hasConflictingMission = existingMissions.some((mission) => {
          if (args.date) {
            return datesOverlap(mission.startDate, mission.endDate, args.date, args.date);
          } else if (args.startDate && args.endDate) {
            return datesOverlap(
              mission.startDate,
              mission.endDate,
              args.startDate,
              args.endDate
            );
          }
          return false;
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
            nextDays.push(d.toISOString().split("T")[0]);
          }

          let nextAvailable: string | undefined;
          for (const day of nextDays) {
            const isUnavailable = unavailableDateSet.has(day);
            const hasConflict = existingMissions.some((m) =>
              datesOverlap(m.startDate, m.endDate, day, day)
            );

            if (!isUnavailable && !hasConflict) {
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
        profileImage: profileImageUrl,
        location: profile.location ?? profile.city ?? "",
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

    // Trier: disponibles d'abord, puis par distance
    results.sort((a, b) => {
      // Disponibles en premier
      if (a.availability.status === "available" && b.availability.status !== "available") return -1;
      if (a.availability.status !== "available" && b.availability.status === "available") return 1;

      // Puis par distance
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }

      return 0;
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
  animalTypes: string[];
  variants: ServiceVariant[];
  options: ServiceOption[];
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
        animalTypes: service.animalTypes,
        variants: variants.map((v) => ({
          id: v._id,
          name: v.name,
          description: v.description,
          price: v.price,
          priceUnit: v.priceUnit as PriceUnit,
          duration: v.duration,
          includedFeatures: v.includedFeatures,
          isActive: v.isActive,
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
    const today = new Date().toISOString().split("T")[0];

    // Filtrer les dates disponibles
    const availableDates = allDates.filter((date) => {
      // Ignorer les dates passées
      if (date < today) return false;

      // Ignorer les indisponibilités manuelles
      if (unavailableDates.has(date)) return false;

      // Ignorer les dates avec missions
      const hasConflict = missions.some((m) =>
        datesOverlap(m.startDate, m.endDate, date, date)
      );
      if (hasConflict) return false;

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
    const today = new Date().toISOString().split("T")[0];

    // Construire le calendrier
    const calendar: Array<{
      date: string;
      status: "available" | "partial" | "unavailable" | "past";
      timeSlots?: Array<{ startTime: string; endTime: string }>;
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

      // Vérifier conflit avec mission existante
      const hasConflict = missions.some((m) =>
        datesOverlap(m.startDate, m.endDate, date, date)
      );
      if (hasConflict) {
        calendar.push({ date, status: "unavailable" });
        continue;
      }

      // Vérifier disponibilité partielle
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

    return calendar;
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

    // Vérifier les conflits de missions
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

    const hasConflict = existingMissions.some((m) =>
      datesOverlap(m.startDate, m.endDate, args.startDate, args.endDate)
    );

    if (hasConflict) {
      throw new ConvexError("L'annonceur a déjà une réservation sur ces dates");
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
      clientPhone: clientProfile?.phone,
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
