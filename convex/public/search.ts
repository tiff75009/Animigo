import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { Id, Doc } from "../_generated/dataModel";
import { ConvexError } from "convex/values";
import { missionsOverlap, missionsOverlapWithBuffers, timeSlotsOverlapWithBuffers, addMinutesToTime, subtractMinutesFromTime, applyBuffersToTimeSlot } from "../lib/timeUtils";
import { checkBookingConflict, checkCapacityAvailability, isCategoryCapacityBased, getAllSubcategorySlugs } from "../lib/capacityUtils";
import { getDefaultPricing } from "../utils/defaultPricing";
import { isInBoundingBox } from "../lib/geoUtils";
import {
  batchLoadProfiles,
  batchLoadServices,
  batchLoadProfilePhotos,
  batchLoadAvailability,
  batchLoadMissions,
  batchLoadCollectiveSlots,
  batchLoadVariants,
  batchLoadVariantsByService,
  batchLoadCategories,
  batchLoadUsers,
  resolvePhotoUrls,
  batchLoadCollectiveSlotsByVariant,
} from "../lib/batchLoaders";

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

/**
 * Retourne l'offset UTC de Europe/Paris en heures pour une date donnée.
 * CET = UTC+1 (hiver), CEST = UTC+2 (été).
 * DST : dernier dimanche de mars → dernier dimanche d'octobre.
 */
function getParisUtcOffsetHours(year: number, month: number, day: number): number {
  if (month >= 4 && month <= 9) return 2; // Avril-Septembre : toujours CEST
  if (month <= 2 || month >= 11) return 1; // Jan-Fév, Nov-Déc : toujours CET
  if (month === 3) {
    // Mars : trouver le dernier dimanche
    for (let d = 31; d >= 25; d--) {
      if (new Date(Date.UTC(year, 2, d)).getUTCDay() === 0) {
        return day >= d ? 2 : 1;
      }
    }
  }
  if (month === 10) {
    // Octobre : trouver le dernier dimanche
    for (let d = 31; d >= 25; d--) {
      if (new Date(Date.UTC(year, 9, d)).getUTCDay() === 0) {
        return day < d ? 2 : 1;
      }
    }
  }
  return 1;
}

/**
 * Vérifie si un créneau respecte le délai minimum de réservation à l'avance.
 * Les heures de créneaux sont en Europe/Paris, minBookingTimestamp est basé sur Date.now() (UTC).
 */
function isSlotAfterMinimumAdvance(
  date: string,
  startTime: string | undefined,
  minBookingTimestamp: number
): boolean {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = (startTime || "08:00").split(":").map(Number);

  // Créer le timestamp UTC correspondant à l'heure de Paris
  const parisOffset = getParisUtcOffsetHours(year, month, day);
  const slotUtcMs = Date.UTC(year, month - 1, day, hours - parisOffset, minutes, 0, 0);

  return slotUtcMs >= minBookingTimestamp;
}

/**
 * Trouve le premier créneau libre dans une journée en tenant compte des missions existantes et buffers.
 * Les availWindows sont les plages de disponibilité (ex: [{startTime: "09:00", endTime: "18:00"}]).
 * Les dayMissions sont les missions déjà réservées ce jour.
 * Retourne le startTime du premier créneau libre de durée `sessionDuration`, ou null.
 */
function findFirstFreeSlotInDay(
  day: string,
  availWindows: { startTime: string; endTime: string }[],
  dayMissions: { startTime: string; endTime: string }[],
  sessionDuration: number,
  bufferBefore: number,
  bufferAfter: number,
  minBookingTs: number,
): { startTime: string; endTime: string } | null {
  // Trier les fenêtres de dispo par heure de début
  const sortedWindows = [...availWindows].sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Trier les missions par heure de début et calculer les périodes bloquées (mission + buffers)
  const blockedPeriods = dayMissions
    .map((m) => ({
      start: subtractMinutesFromTime(m.startTime, bufferBefore),
      end: addMinutesToTime(m.endTime, bufferAfter),
    }))
    .sort((a, b) => a.start.localeCompare(b.start));

  for (const window of sortedWindows) {
    // On cherche un créneau libre dans cette fenêtre de disponibilité
    let candidate = window.startTime;

    // Tant qu'on est dans la fenêtre de disponibilité
    while (true) {
      const candidateEnd = addMinutesToTime(candidate, sessionDuration);

      // Vérifier que le créneau tient dans la fenêtre
      if (candidateEnd > window.endTime) break;

      // Vérifier le délai minimum de réservation
      if (!isSlotAfterMinimumAdvance(day, candidate, minBookingTs)) {
        // Avancer de 30 min et réessayer
        candidate = addMinutesToTime(candidate, 30);
        continue;
      }

      // Vérifier si ce créneau chevauche une période bloquée
      let conflict = false;
      for (const blocked of blockedPeriods) {
        // Le créneau candidat [candidate, candidateEnd] chevauche [blocked.start, blocked.end] ?
        if (candidate < blocked.end && candidateEnd > blocked.start) {
          // Conflit : sauter après la fin de la période bloquée
          candidate = blocked.end;
          conflict = true;
          break;
        }
      }

      if (!conflict) {
        return { startTime: candidate, endTime: candidateEnd };
      }
    }
  }

  return null;
}

// Convertit "HH:MM" en minutes depuis minuit
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Calcule le taux d'occupation d'un jour à partir des missions existantes
function computeSlotOccupancy(
  dayMissions: { startTime: string; endTime: string }[],
  totalWindowMinutes: number
): "free" | "busy" | "almost_full" {
  if (dayMissions.length === 0) return "free";
  let busyMinutes = 0;
  for (const m of dayMissions) {
    busyMinutes += timeToMinutes(m.endTime) - timeToMinutes(m.startTime);
  }
  const ratio = busyMinutes / totalWindowMinutes;
  if (ratio >= 0.75) return "almost_full";
  if (ratio >= 0.25) return "busy";
  return "free";
}

// Types pour les résultats
interface NextSlot {
  date: string;
  startTime: string;
  endTime?: string;
  isFullDay?: boolean;
  slotOccupancy?: "free" | "busy" | "almost_full";
}

interface CollectiveSlotInfo {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  spotsLeft: number;
  formule: string;
}

interface AnnouncerAvailability {
  status: "available" | "partial" | "unavailable";
  nextAvailable?: string;
  nextSlot?: NextSlot;
  collectiveSlots?: CollectiveSlotInfo[];
  availableSlots?: Array<{ startTime: string; endTime: string }>;
}

interface AnnouncerResult {
  id: Id<"users">;
  firstName: string;
  lastName: string;
  username?: string;
  profileImage?: string | null; // Avatar
  coverImage?: string | null; // Photo de couverture
  location: string;
  coordinates?: { lat: number; lng: number };
  distance?: number;
  rating: number;
  reviewCount: number;
  basePrice?: number;
  verified: boolean;
  isIdentityVerified: boolean;
  acceptedAnimals: string[];
  services: string[];
  availability: AnnouncerAvailability;
  accountType: string;
  companyType?: string;
  statusType: "particulier" | "micro_entrepreneur" | "professionnel";
}

// Arguments communs pour la recherche d'annonceurs
const searchAnnouncersArgs = {
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

  // Date/heure
  date: v.optional(v.string()),
  time: v.optional(v.string()),
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
  offset: v.optional(v.number()),
};

// Type de retour paginé
interface PaginatedResult<T> {
  results: T[];
  total: number;
  hasMore: boolean;
}

// Query principale de recherche d'annonceurs (publique, sans Redis)
export const searchAnnouncers = query({
  args: searchAnnouncersArgs,
  handler: async (ctx, args): Promise<AnnouncerResult[]> => {
    const radius = args.radiusKm ?? 20;
    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    // 0. Lire le délai minimum de réservation à l'avance
    const minAdvanceConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "minimum_booking_advance_hours"))
      .first();
    const minimumBookingAdvanceHours = minAdvanceConfig
      ? parseInt(minAdvanceConfig.value) || 24
      : 24;
    const minBookingTimestamp = Date.now() + minimumBookingAdvanceHours * 60 * 60 * 1000;

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

    // ============================================================
    // PHASE 2 OPTIMISATION: Batch Loading (élimination N+1)
    // ============================================================
    const announcerIds = announcers.map((a) => a._id);

    // Dates pour les créneaux collectifs
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);
    const in7DaysStr = `${in7Days.getFullYear()}-${String(in7Days.getMonth() + 1).padStart(2, "0")}-${String(in7Days.getDate()).padStart(2, "0")}`;

    // Chargement batch de toutes les données nécessaires
    const [
      profilesMap,
      servicesMap,
      photosMap,
      availabilityMap,
      missionsMap,
      collectiveSlotsMap,
    ] = await Promise.all([
      batchLoadProfiles(ctx, announcerIds),
      batchLoadServices(ctx, announcerIds),
      batchLoadProfilePhotos(ctx, announcerIds),
      batchLoadAvailability(ctx, announcerIds),
      batchLoadMissions(ctx, announcerIds),
      batchLoadCollectiveSlots(ctx, announcerIds, todayStr, in7DaysStr),
    ]);

    // Résoudre les URLs des photos en parallèle
    const photoUrlsMap = await resolvePhotoUrls(ctx, photosMap);

    // Collecter les variantIds pour le batch loading
    const allVariantIds: Id<"serviceVariants">[] = [];
    for (const slots of Array.from(collectiveSlotsMap.values())) {
      for (const slot of slots) {
        if (!allVariantIds.includes(slot.variantId)) {
          allVariantIds.push(slot.variantId);
        }
      }
    }
    const variantsMap = await batchLoadVariants(ctx, allVariantIds);

    const results: AnnouncerResult[] = [];

    for (const announcer of announcers) {
      // 2. Récupérer le profil depuis le cache
      const profile = profilesMap.get(announcer._id);

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

      // 3. Filtrer par localisation si coordonnées fournies (avec pré-filtrage bounding box)
      let distance: number | undefined;
      if (args.coordinates && profile.coordinates) {
        // Pré-filtrage rapide avec bounding box (Phase 1 optimisation)
        if (!isInBoundingBox(
          args.coordinates.lat,
          args.coordinates.lng,
          profile.coordinates.lat,
          profile.coordinates.lng,
          radius
        )) {
          continue; // Hors du bounding box = certainement hors du rayon
        }

        // Calcul Haversine précis seulement si dans le bounding box
        distance = calculateDistance(
          args.coordinates.lat,
          args.coordinates.lng,
          profile.coordinates.lat,
          profile.coordinates.lng
        );

        if (distance > radius) continue;
      }

      // 4. Récupérer les services actifs depuis le cache (Phase 2 batch loading)
      const services = servicesMap.get(announcer._id) ?? [];

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
        // Vérifier les indisponibilités manuelles depuis le cache (Phase 2 batch loading)
        const allAvailability = availabilityMap.get(announcer._id) ?? [];
        const unavailableDates = allAvailability.filter((a) => a.status === "unavailable");

        const unavailableDateSet = new Set(unavailableDates.map((a) => a.date));
        const hasManualUnavailability = datesToCheck.some((d) =>
          unavailableDateSet.has(d)
        );

        // Vérifier les missions existantes depuis le cache (Phase 2 batch loading)
        const allMissions = missionsMap.get(announcer._id) ?? [];
        const existingMissions = allMissions.filter(
          (m) => m.serviceCategory === args.categorySlug
        );

        // Récupérer les buffers (temps de préparation) de l'annonceur
        const bufferBefore = profile?.bufferBefore ?? 0;
        const bufferAfter = profile?.bufferAfter ?? 0;

        // Vérifier chevauchement de créneaux avec missions existantes (détection temporelle + buffers)
        const hasConflictingMission = existingMissions.some((mission) => {
          // D'abord vérifier si la mission concerne les dates recherchées
          const searchStartDate = args.date || args.startDate!;
          const searchEndDate = args.date || args.endDate!;

          if (!datesOverlap(mission.startDate, mission.endDate, searchStartDate, searchEndDate)) {
            return false; // Pas de chevauchement de dates
          }

          // Si l'utilisateur a spécifié une heure, on vérifie le créneau exact avec buffers
          if (args.time) {
            const searchSlot = {
              startDate: searchStartDate,
              endDate: searchEndDate,
              startTime: args.time,
              endTime: addMinutesToTime(args.time, 60), // 1h par défaut
            };

            // Utiliser missionsOverlapWithBuffers pour prendre en compte le temps de préparation
            return missionsOverlapWithBuffers(
              { startDate: mission.startDate, endDate: mission.endDate, startTime: mission.startTime, endTime: mission.endTime },
              searchSlot,
              bufferBefore,
              bufferAfter
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

        // Vérifier disponibilité partielle (créneaux horaires) depuis le cache (Phase 2)
        if (args.time && args.date) {
          const partialAvailability = allAvailability.find(
            (a) => a.date === args.date && a.status === "partial"
          );

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

      // 9. Récupérer la photo de profil depuis le cache (Phase 2 batch loading)
      const profileImageUrl = photoUrlsMap.get(announcer._id) ?? null;

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

      // 10.1 Récupérer les créneaux collectifs depuis le cache (Phase 2 batch loading)
      const collectiveSlots = collectiveSlotsMap.get(announcer._id) ?? [];

      // Filtrer les créneaux avec places disponibles, respectant le délai minimum de réservation
      const collectiveSlotsInfo: CollectiveSlotInfo[] = [];
      for (const slot of collectiveSlots) {
        const spotsLeft = slot.maxAnimals - slot.bookedAnimals;
        if (spotsLeft > 0 && isSlotAfterMinimumAdvance(slot.date, slot.startTime, minBookingTimestamp)) {
          // Récupérer le nom de la formule depuis le cache (Phase 2)
          const variant = variantsMap.get(slot.variantId);
          collectiveSlotsInfo.push({
            id: slot._id,
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            spotsLeft,
            formule: variant?.name ?? "Séance collective",
          });
        }
      }

      // Trier par date et heure
      collectiveSlotsInfo.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.startTime.localeCompare(b.startTime);
      });

      // Calculer le prochain créneau (collectif ou individuel)
      let nextSlot: NextSlot | undefined;

      // Si des créneaux collectifs disponibles, prendre le premier
      if (collectiveSlotsInfo.length > 0) {
        nextSlot = {
          date: collectiveSlotsInfo[0].date,
          startTime: collectiveSlotsInfo[0].startTime,
          endTime: collectiveSlotsInfo[0].endTime,
        };
      }

      // Sinon, chercher le prochain créneau individuel avec findFirstFreeSlotInDay
      if (!nextSlot) {
        const userAvailability = availabilityMap.get(announcer._id) ?? [];
        const announcerMissions = missionsMap.get(announcer._id) ?? [];
        const bufferBefore = profile?.bufferBefore ?? 0;
        const bufferAfter = profile?.bufferAfter ?? 0;
        const defaultSessionDuration = 60; // durée typique pour searchAnnouncers (pas de formule spécifique)

        // Construire la map des jours disponibles dans les 30 prochains jours
        const in30Days = new Date(today);
        in30Days.setDate(in30Days.getDate() + 30);
        const in30DaysStr = `${in30Days.getFullYear()}-${String(in30Days.getMonth() + 1).padStart(2, "0")}-${String(in30Days.getDate()).padStart(2, "0")}`;

        const availDays = new Map<string, { status: "available" | "partial"; timeSlots?: { startTime: string; endTime: string }[] }>();
        for (const a of userAvailability) {
          if (a.date < todayStr || a.date > in30DaysStr) continue;
          if (a.status === "unavailable") continue;
          if (!availDays.has(a.date)) {
            availDays.set(a.date, {
              status: a.status as "available" | "partial",
              timeSlots: (a.status === "partial" && a.timeSlots) ? a.timeSlots : undefined,
            });
          }
        }

        const sortedAvailDays = Array.from(availDays.entries()).sort((a, b) => a[0].localeCompare(b[0]));

        for (const [day, dayInfo] of sortedAvailDays) {
          const dayMissions = announcerMissions.filter(
            (m) => m.startDate <= day && m.endDate >= day && m.startTime && m.endTime
          ).map((m) => ({ startTime: m.startTime!, endTime: m.endTime! }));

          if (dayInfo.status === "partial" && dayInfo.timeSlots && dayInfo.timeSlots.length > 0) {
            const freeSlot = findFirstFreeSlotInDay(
              day, dayInfo.timeSlots, dayMissions, defaultSessionDuration,
              bufferBefore, bufferAfter, minBookingTimestamp
            );
            if (freeSlot) {
              const windowMinutes = dayInfo.timeSlots.reduce((sum, s) => sum + timeToMinutes(s.endTime) - timeToMinutes(s.startTime), 0);
              const occupancy = computeSlotOccupancy(dayMissions, windowMinutes || 720);
              nextSlot = { date: day, startTime: freeSlot.startTime, endTime: freeSlot.endTime, slotOccupancy: occupancy };
              break;
            }
          } else if (dayInfo.status === "available") {
            const freeSlot = findFirstFreeSlotInDay(
              day, [{ startTime: "08:00", endTime: "20:00" }], dayMissions, defaultSessionDuration,
              bufferBefore, bufferAfter, minBookingTimestamp
            );
            if (freeSlot) {
              const occupancy = computeSlotOccupancy(dayMissions, 720);
              nextSlot = { date: day, startTime: freeSlot.startTime, endTime: freeSlot.endTime, slotOccupancy: occupancy };
              break;
            }
          }
        }
      }

      // Ajouter les créneaux collectifs et nextSlot à la disponibilité
      if (collectiveSlotsInfo.length > 0) {
        availability.collectiveSlots = collectiveSlotsInfo.slice(0, 5); // Limiter à 5 créneaux
      }
      if (nextSlot) {
        availability.nextSlot = nextSlot;
      }

      // 11. Construire le résultat
      results.push({
        id: announcer._id,
        firstName: announcer.firstName,
        lastName: announcer.lastName,
        username: announcer.username ?? undefined,
        profileImage: (profile.listingDisplayImage === "logo" && profile.companyLogoUrl)
          ? profile.companyLogoUrl
          : (profile.profileImageUrl ?? profileImageUrl),
        isDisplayingLogo: !!(profile.listingDisplayImage === "logo" && profile.companyLogoUrl),
        coverImage: profile.coverImageUrl ?? null,
        location: profile.city ?? profile.location ?? "",
        coordinates: profile.coordinates,
        distance,
        rating: 4.5, // TODO: Calculer depuis les avis
        reviewCount: 0, // TODO: Compter les avis
        basePrice,
        verified: announcer.accountType === "annonceur_pro",
        isIdentityVerified: profile.isIdentityVerified ?? false,
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
      // Disponibles en premier (toujours, sauf si tri explicite par créneau)
      if (sortBy === "relevance" || sortBy === "distance") {
        if (a.availability.status === "available" && b.availability.status !== "available") return -1;
        if (a.availability.status !== "available" && b.availability.status === "available") return 1;
      }

      // Appliquer le tri demandé
      switch (sortBy) {
        case "next_slot":
          // Tri par prochain créneau disponible (le plus proche en premier)
          const aSlot = a.availability.nextSlot;
          const bSlot = b.availability.nextSlot;

          // Ceux avec un créneau en premier
          if (aSlot && !bSlot) return -1;
          if (!aSlot && bSlot) return 1;
          if (!aSlot && !bSlot) {
            // Fallback: par date nextAvailable
            const aNext = a.availability.nextAvailable;
            const bNext = b.availability.nextAvailable;
            if (aNext && !bNext) return -1;
            if (!aNext && bNext) return 1;
            if (aNext && bNext) return aNext.localeCompare(bNext);
            return 0;
          }

          // Comparer date + heure
          const aDateTime = `${aSlot!.date}T${aSlot!.startTime}`;
          const bDateTime = `${bSlot!.date}T${bSlot!.startTime}`;
          return aDateTime.localeCompare(bDateTime);

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
          // Pertinence: disponibles puis par prochain créneau puis par distance
          // Comparer par prochain créneau si disponible
          const aSlotRel = a.availability.nextSlot;
          const bSlotRel = b.availability.nextSlot;
          if (aSlotRel && bSlotRel) {
            const aDateTimeRel = `${aSlotRel.date}T${aSlotRel.startTime}`;
            const bDateTimeRel = `${bSlotRel.date}T${bSlotRel.startTime}`;
            const slotCompare = aDateTimeRel.localeCompare(bDateTimeRel);
            if (slotCompare !== 0) return slotCompare;
          }
          // Fallback par distance
          if (a.distance !== undefined && b.distance !== undefined) {
            return a.distance - b.distance;
          }
          return 0;
      }
    });

    return results.slice(offset, offset + limit);
  },
});

// Query interne pour la recherche avec Redis (appelée par l'action)
export const searchAnnouncersInternal = query({
  args: {
    ...searchAnnouncersArgs,
    // Paramètres Redis (optionnels, fournis par l'action)
    redisProfileIds: v.optional(v.array(v.string())),
    redisDistances: v.optional(v.record(v.string(), v.number())),
  },
  handler: async (ctx, args): Promise<AnnouncerResult[]> => {
    const radius = args.radiusKm ?? 20;
    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    // Redis: utiliser les distances pré-calculées comme optimisation (pas comme filtre exclusif)
    const redisDistanceMap = args.redisDistances ? new Map(Object.entries(args.redisDistances)) : null;

    // 1. Récupérer TOUS les annonceurs actifs (Redis = optimisation distance, pas filtre)
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

    // Le reste du code est identique à searchAnnouncers
    const announcerIds = announcers.map((a) => a._id);

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);
    const in7DaysStr = `${in7Days.getFullYear()}-${String(in7Days.getMonth() + 1).padStart(2, "0")}-${String(in7Days.getDate()).padStart(2, "0")}`;

    const [
      profilesMap,
      servicesMap,
      photosMap,
      availabilityMap,
      missionsMap,
      collectiveSlotsMap,
    ] = await Promise.all([
      batchLoadProfiles(ctx, announcerIds),
      batchLoadServices(ctx, announcerIds),
      batchLoadProfilePhotos(ctx, announcerIds),
      batchLoadAvailability(ctx, announcerIds),
      batchLoadMissions(ctx, announcerIds),
      batchLoadCollectiveSlots(ctx, announcerIds, todayStr, in7DaysStr),
    ]);

    const photoUrlsMap = await resolvePhotoUrls(ctx, photosMap);

    const allVariantIds: Id<"serviceVariants">[] = [];
    for (const slots of Array.from(collectiveSlotsMap.values())) {
      for (const slot of slots) {
        if (!allVariantIds.includes(slot.variantId)) {
          allVariantIds.push(slot.variantId);
        }
      }
    }
    const variantsMap = await batchLoadVariants(ctx, allVariantIds);

    const results: AnnouncerResult[] = [];

    for (const announcer of announcers) {
      const profile = profilesMap.get(announcer._id);
      if (!profile) continue;

      // Filtres de base
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

      if (args.verifiedOnly && !announcer.emailVerified) continue;
      if (args.hasGarden === true && !profile.hasGarden) continue;
      if (args.hasVehicle === true && !profile.hasVehicle) continue;

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

      // Distance: Redis si disponible, sinon Haversine
      let distance: number | undefined;
      if (redisDistanceMap && redisDistanceMap.has(profile._id)) {
        // Distance pré-calculée par Redis
        distance = redisDistanceMap.get(profile._id);
      } else if (args.coordinates && profile.coordinates) {
        // Fallback: calcul Haversine (profils non indexés dans Redis)
        if (!isInBoundingBox(
          args.coordinates.lat,
          args.coordinates.lng,
          profile.coordinates.lat,
          profile.coordinates.lng,
          radius
        )) {
          continue;
        }
        distance = calculateDistance(
          args.coordinates.lat,
          args.coordinates.lng,
          profile.coordinates.lat,
          profile.coordinates.lng
        );
        if (distance > radius) continue;
      }

      // Services
      const services = servicesMap.get(announcer._id) ?? [];
      if (services.length === 0) continue;

      let matchingServices = services;
      if (args.categorySlug) {
        matchingServices = services.filter((s) => s.category === args.categorySlug);
        if (matchingServices.length === 0) continue;
      }
      if (args.excludeCategory) {
        matchingServices = matchingServices.filter((s) => s.category !== args.excludeCategory);
        if (matchingServices.length === 0) continue;
      }
      if (args.animalType) {
        matchingServices = matchingServices.filter((s) =>
          s.animalTypes.includes(args.animalType!)
        );
        if (matchingServices.length === 0) continue;
      }

      // Disponibilité (simplifié pour la version interne)
      let availability: AnnouncerAvailability = { status: "available" };

      // Prix
      let basePrice: number | undefined;
      for (const service of matchingServices) {
        if (service.basePrice && (!basePrice || service.basePrice < basePrice)) {
          basePrice = service.basePrice;
        }
      }

      if (args.priceMin !== undefined && basePrice !== undefined) {
        if (basePrice < args.priceMin * 100) continue;
      }
      if (args.priceMax !== undefined && basePrice !== undefined) {
        if (basePrice > args.priceMax * 100) continue;
      }

      const profileImageUrl = photoUrlsMap.get(announcer._id) ?? null;
      if (args.withPhotoOnly && !profileImageUrl) continue;

      let statusType: "particulier" | "micro_entrepreneur" | "professionnel" = "particulier";
      if (announcer.accountType === "annonceur_pro") {
        if (announcer.companyType === "micro_enterprise") {
          statusType = "micro_entrepreneur";
        } else {
          statusType = "professionnel";
        }
      }

      // Créneaux collectifs
      const collectiveSlots = collectiveSlotsMap.get(announcer._id) ?? [];
      const collectiveSlotsInfo: CollectiveSlotInfo[] = [];
      for (const slot of collectiveSlots) {
        const spotsLeft = slot.maxAnimals - slot.bookedAnimals;
        if (spotsLeft > 0) {
          const variant = variantsMap.get(slot.variantId);
          collectiveSlotsInfo.push({
            id: slot._id,
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            spotsLeft,
            formule: variant?.name ?? "Séance collective",
          });
        }
      }

      collectiveSlotsInfo.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.startTime.localeCompare(b.startTime);
      });

      let nextSlot: NextSlot | undefined;
      if (collectiveSlotsInfo.length > 0) {
        nextSlot = {
          date: collectiveSlotsInfo[0].date,
          startTime: collectiveSlotsInfo[0].startTime,
          endTime: collectiveSlotsInfo[0].endTime,
        };
      }

      if (collectiveSlotsInfo.length > 0) {
        availability.collectiveSlots = collectiveSlotsInfo.slice(0, 5);
      }
      if (nextSlot) {
        availability.nextSlot = nextSlot;
      }

      results.push({
        id: announcer._id,
        firstName: announcer.firstName,
        lastName: announcer.lastName,
        username: announcer.username ?? undefined,
        profileImage: (profile.listingDisplayImage === "logo" && profile.companyLogoUrl)
          ? profile.companyLogoUrl
          : (profile.profileImageUrl ?? profileImageUrl),
        isDisplayingLogo: !!(profile.listingDisplayImage === "logo" && profile.companyLogoUrl),
        coverImage: profile.coverImageUrl ?? null,
        location: profile.city ?? profile.location ?? "",
        coordinates: profile.coordinates,
        distance,
        rating: 4.5,
        reviewCount: 0,
        basePrice,
        verified: announcer.accountType === "annonceur_pro",
        isIdentityVerified: profile.isIdentityVerified ?? false,
        acceptedAnimals: profile.acceptedAnimals ?? [],
        services: services.map((s) => s.category),
        availability,
        accountType: announcer.accountType,
        companyType: announcer.companyType,
        statusType,
      });
    }

    // Tri
    const sortBy = args.sortBy ?? "relevance";
    results.sort((a, b) => {
      if (sortBy === "relevance" || sortBy === "distance") {
        if (a.availability.status === "available" && b.availability.status !== "available") return -1;
        if (a.availability.status !== "available" && b.availability.status === "available") return 1;
      }

      switch (sortBy) {
        case "price_asc":
          if (a.basePrice !== undefined && b.basePrice !== undefined) {
            return a.basePrice - b.basePrice;
          }
          return 0;
        case "price_desc":
          if (a.basePrice !== undefined && b.basePrice !== undefined) {
            return b.basePrice - a.basePrice;
          }
          return 0;
        case "distance":
          if (a.distance !== undefined && b.distance !== undefined) {
            return a.distance - b.distance;
          }
          return 0;
        default:
          if (a.distance !== undefined && b.distance !== undefined) {
            return a.distance - b.distance;
          }
          return 0;
      }
    });

    return results.slice(offset, offset + limit);
  },
});

// ============================================================
// NOUVELLE QUERY: Recherche par formule (mode services)
// ============================================================

interface FormuleResult {
  // Infos formule
  formuleId: string;
  formuleName: string;
  formuleDescription?: string;
  price: number;
  priceUnit: string;
  duration?: number;
  sessionType: "individual" | "collective";
  serviceLocation?: "announcer_home" | "client_home" | "both";
  numberOfSessions?: number;
  // Infos service/catégorie
  serviceId: string;
  categorySlug: string;
  categoryName: string;
  categoryIcon?: string;
  animalTypes: string[];
  // Infos annonceur
  announcerId: Id<"users">;
  announcerSlug?: string;
  announcerFirstName: string;
  announcerLastName: string;
  announcerUsername?: string;
  announcerProfileImage?: string | null;
  announcerRating: number;
  announcerReviewCount: number;
  announcerLocation: string;
  announcerDistance?: number;
  announcerVerified: boolean;
  announcerStatusType: "particulier" | "micro_entrepreneur" | "professionnel";
  // SAP
  isSapEligible?: boolean; // Service éligible TVA réduite
  announcerSapApproved?: boolean; // Annonceur agréé SAP
  // Disponibilité
  nextSlot?: NextSlot;
  collectiveSlots?: CollectiveSlotInfo[];
  spotsLeft?: number; // Pour créneaux collectifs
}

// Arguments communs pour la recherche de formules
const searchFormulesArgs = {
  categorySlug: v.optional(v.string()),
  excludeCategory: v.optional(v.string()),
  animalType: v.optional(v.string()),
  coordinates: v.optional(v.object({ lat: v.number(), lng: v.number() })),
  radiusKm: v.optional(v.number()),
  date: v.optional(v.string()),
  time: v.optional(v.string()),
  sessionType: v.optional(v.union(v.literal("individual"), v.literal("collective"))),
  serviceLocation: v.optional(v.array(v.union(v.literal("announcer_home"), v.literal("client_home")))),
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
  limit: v.optional(v.number()),
  offset: v.optional(v.number()),
};

export const searchFormules = query({
  args: searchFormulesArgs,
  handler: async (ctx, args): Promise<FormuleResult[]> => {
    const radius = args.radiusKm ?? 20;
    const limit = args.limit ?? 100;
    const offset = args.offset ?? 0;
    const results: FormuleResult[] = [];

    // 0. Lire le délai minimum de réservation à l'avance
    const minAdvanceConfigFormules = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "minimum_booking_advance_hours"))
      .first();
    const minAdvanceHours = minAdvanceConfigFormules
      ? parseInt(minAdvanceConfigFormules.value) || 24
      : 24;
    const minBookingTs = Date.now() + minAdvanceHours * 60 * 60 * 1000;

    // Récupérer les services actifs avec index optimisé (Phase 1 optimisation)
    let services;
    if (args.categorySlug) {
      // Utiliser l'index by_category_active si catégorie spécifiée
      services = await ctx.db
        .query("services")
        .withIndex("by_category_active", (q) =>
          q.eq("category", args.categorySlug!).eq("isActive", true)
        )
        .collect();
    } else {
      // Utiliser l'index by_active pour récupérer seulement les services actifs
      services = await ctx.db
        .query("services")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .collect();
    }

    // Filtrer les conditions restantes en JavaScript (moins coûteux car déjà pré-filtré)
    services = services.filter((s) => {
      if (args.excludeCategory && s.category === args.excludeCategory) return false;
      if (args.animalType && !s.animalTypes?.includes(args.animalType)) return false;
      return true;
    });

    // ============================================================
    // PHASE 2 OPTIMISATION: Batch Loading (élimination N+1)
    // ============================================================

    // Dates pour les créneaux
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);
    const in7DaysStr = `${in7Days.getFullYear()}-${String(in7Days.getMonth() + 1).padStart(2, "0")}-${String(in7Days.getDate()).padStart(2, "0")}`;

    // Extraire les IDs uniques
    const userIdsSet = new Set<Id<"users">>();
    for (const s of services) {
      userIdsSet.add(s.userId);
    }
    const userIds: Id<"users">[] = [];
    userIdsSet.forEach((id) => userIds.push(id));
    const serviceIds = services.map((s) => s._id);

    // Chargement batch de toutes les données nécessaires
    const [
      usersMap,
      profilesMap,
      categoriesMap,
      variantsByServiceMap,
      photosMap,
    ] = await Promise.all([
      batchLoadUsers(ctx, userIds),
      batchLoadProfiles(ctx, userIds),
      batchLoadCategories(ctx),
      batchLoadVariantsByService(ctx, serviceIds),
      batchLoadProfilePhotos(ctx, userIds),
    ]);

    // Résoudre les URLs des photos en parallèle
    const photoUrlsMap = await resolvePhotoUrls(ctx, photosMap);

    // Collecter tous les variantIds pour charger les collectiveSlots
    const allVariantIds: Id<"serviceVariants">[] = [];
    for (const variants of Array.from(variantsByServiceMap.values())) {
      for (const v of variants) {
        if (v.sessionType === "collective") {
          allVariantIds.push(v._id);
        }
      }
    }

    // Charger les créneaux collectifs et disponibilités
    const [collectiveSlotsByVariantMap, availabilityMap, missionsMap] = await Promise.all([
      batchLoadCollectiveSlotsByVariant(ctx, allVariantIds, todayStr, in7DaysStr),
      batchLoadAvailability(ctx, userIds),
      batchLoadMissions(ctx, userIds),
    ]);

    for (const service of services) {
      // Récupérer l'annonceur depuis le cache (Phase 2 batch loading)
      const announcer = usersMap.get(service.userId);
      if (!announcer || !announcer.isActive) continue;

      // Récupérer le profil depuis le cache (Phase 2 batch loading)
      const profile = profilesMap.get(announcer._id);
      if (!profile) continue;

      // Filtrer par localisation avec pré-filtrage bounding box (Phase 1 optimisation)
      let distance: number | undefined;
      if (args.coordinates && profile.coordinates) {
        // Pré-filtrage rapide avec bounding box (évite le calcul Haversine coûteux)
        if (!isInBoundingBox(
          args.coordinates.lat,
          args.coordinates.lng,
          profile.coordinates.lat,
          profile.coordinates.lng,
          radius
        )) {
          continue; // Hors du bounding box = certainement hors du rayon
        }

        // Calcul Haversine précis seulement si dans le bounding box
        distance = calculateDistance(
          args.coordinates.lat,
          args.coordinates.lng,
          profile.coordinates.lat,
          profile.coordinates.lng
        );
        if (distance > radius) continue;
      }

      // Récupérer la catégorie depuis le cache (Phase 2 batch loading)
      const categoryDoc = service.category ? categoriesMap.get(service.category) ?? null : null;

      // Résoudre le categoryTypeId pour filtrer les disponibilités correctement
      let serviceCategoryTypeId: string | null = null;
      if (categoryDoc) {
        if (categoryDoc.typeId) {
          serviceCategoryTypeId = String(categoryDoc.typeId);
        } else if (categoryDoc.parentCategoryId) {
          // Sous-catégorie : chercher le typeId du parent dans categoriesMap
          for (const cat of Array.from(categoriesMap.values())) {
            if (String(cat._id) === String(categoryDoc.parentCategoryId) && cat.typeId) {
              serviceCategoryTypeId = String(cat.typeId);
              break;
            }
          }
        }
      }

      // Récupérer les variantes depuis le cache (Phase 2 batch loading)
      const variants = variantsByServiceMap.get(service._id) ?? [];

      // Déterminer le type de statut
      let statusType: "particulier" | "micro_entrepreneur" | "professionnel" = "particulier";
      if (announcer.accountType === "annonceur_pro") {
        statusType = announcer.companyType === "micro_enterprise" ? "micro_entrepreneur" : "professionnel";
      }

      // Filtre par type d'annonceur
      if (args.accountTypes && args.accountTypes.length > 0) {
        const mappedType = statusType === "professionnel" ? "pro" : statusType;
        if (!args.accountTypes.includes(mappedType)) continue;
      }

      // Filtres avancés profil
      if (args.verifiedOnly && !announcer.emailVerified) continue;
      if (args.hasGarden === true && !profile.hasGarden) continue;
      if (args.hasVehicle === true && !profile.hasVehicle) continue;
      if (args.noAnimals) {
        if (profile.ownedAnimals && profile.ownedAnimals.length > 0) continue;
      }
      if (args.ownsAnimals && args.ownsAnimals.length > 0) {
        const ownedAnimals = profile.ownedAnimals ?? [];
        const hasMatchingAnimal = args.ownsAnimals.some((animal: string) => {
          return ownedAnimals.some((oa: { type?: string }) => oa.type === animal);
        });
        if (!hasMatchingAnimal) continue;
      }

      // Photo de profil depuis le cache (Phase 2 batch loading)
      const profileImageUrl = photoUrlsMap.get(announcer._id) ?? null;
      if (args.withPhotoOnly && !profileImageUrl) continue;

      for (const variant of variants) {
        // Filtrer par type de séance si spécifié
        const isCollective = variant.sessionType === "collective";
        if (args.sessionType === "individual" && isCollective) continue;
        if (args.sessionType === "collective" && !isCollective) continue;

        // Filtrer par lieu si spécifié
        if (args.serviceLocation && args.serviceLocation.length > 0) {
          const variantLocation = variant.serviceLocation || service.serviceLocation || "both";
          if (variantLocation !== "both" && !args.serviceLocation.includes(variantLocation as "announcer_home" | "client_home")) {
            continue;
          }
        }

        // Calculer le prix en fonction du priceUnit
        const priceUnit = variant.priceUnit || "hour";
        let price = variant.price || 0;

        // Si pricing est défini, utiliser le bon champ selon le priceUnit
        if (variant.pricing) {
          switch (priceUnit) {
            case "hour":
              price = variant.pricing.hourly ?? variant.price ?? 0;
              break;
            case "half_day":
              price = variant.pricing.halfDaily ?? variant.price ?? 0;
              break;
            case "day":
              price = variant.pricing.daily ?? variant.price ?? 0;
              break;
            case "week":
              price = variant.pricing.weekly ?? variant.price ?? 0;
              break;
            case "month":
              price = variant.pricing.monthly ?? variant.price ?? 0;
              break;
            default:
              price = variant.price ?? 0;
          }
        }

        // Filtrer par prix
        if (args.priceMin !== undefined && price < args.priceMin * 100) continue;
        if (args.priceMax !== undefined && price > args.priceMax * 100) continue;

        let nextSlot: NextSlot | undefined;
        let collectiveSlots: CollectiveSlotInfo[] = [];
        let spotsLeft: number | undefined;

        if (isCollective) {
          // Récupérer les créneaux collectifs depuis le cache (Phase 2 batch loading)
          const slots = collectiveSlotsByVariantMap.get(variant._id) ?? [];

          for (const slot of slots) {
            const remaining = slot.maxAnimals - slot.bookedAnimals;
            if (remaining > 0 && isSlotAfterMinimumAdvance(slot.date, slot.startTime, minBookingTs)) {
              collectiveSlots.push({
                id: slot._id,
                date: slot.date,
                startTime: slot.startTime,
                endTime: slot.endTime,
                spotsLeft: remaining,
                formule: variant.name,
              });
            }
          }

          // Trier par date/heure
          collectiveSlots.sort((a, b) => {
            const dateCompare = a.date.localeCompare(b.date);
            if (dateCompare !== 0) return dateCompare;
            return a.startTime.localeCompare(b.startTime);
          });

          if (collectiveSlots.length > 0) {
            nextSlot = {
              date: collectiveSlots[0].date,
              startTime: collectiveSlots[0].startTime,
              endTime: collectiveSlots[0].endTime,
            };
            spotsLeft = collectiveSlots[0].spotsLeft;
          }

          // Limiter à 5 créneaux
          collectiveSlots = collectiveSlots.slice(0, 5);

          // Pas de créneaux disponibles = ne pas afficher la formule collective
          if (collectiveSlots.length === 0) continue;
        } else {
          // Formule individuelle: chercher le prochain créneau disponible
          const nextDays: string[] = [];
          // Chercher dans les entrées de disponibilité directement (plus efficace)
          // Filtrer les entrées futures pour ce user, triées par date
          const allUserAvail = availabilityMap.get(announcer._id) ?? [];

          const priceUnit = variant.priceUnit || "hour";
          const isLongDuration = priceUnit === "day" || priceUnit === "week" || priceUnit === "month";
          const hasNightly = variant.pricing?.nightly !== undefined && variant.pricing.nightly > 0;
          const needsFullDayOnly = isLongDuration || hasNightly;

          const announcerMissions = missionsMap.get(announcer._id) ?? [];
          const bufferBefore = profile?.bufferBefore ?? 0;
          const bufferAfter = profile?.bufferAfter ?? 0;
          const sessionDuration = variant.duration ?? 60;

          // Extraire les jours disponibles depuis les entrées d'availability (pas d'entrée = indisponible)
          const availableDays = new Map<string, { status: "available" | "partial"; timeSlots?: { startTime: string; endTime: string }[] }>();
          const in30Days = new Date(today);
          in30Days.setDate(in30Days.getDate() + 30);
          const in30DaysStr = `${in30Days.getFullYear()}-${String(in30Days.getMonth() + 1).padStart(2, "0")}-${String(in30Days.getDate()).padStart(2, "0")}`;

          for (const a of allUserAvail) {
            if (a.date < todayStr || a.date > in30DaysStr) continue;
            if (a.status === "unavailable") continue;

            // Matching par categoryTypeId
            if (serviceCategoryTypeId && a.categoryTypeId) {
              if (String(a.categoryTypeId) !== serviceCategoryTypeId) continue;
            }

            // Ne garder que la première entrée par jour (priorité aux entrées typées)
            if (!availableDays.has(a.date)) {
              availableDays.set(a.date, {
                status: a.status,
                timeSlots: (a.status === "partial" && a.timeSlots) ? a.timeSlots : undefined,
              });
            }
          }

          // Trier les jours disponibles par date
          const sortedDays = Array.from(availableDays.entries()).sort((a, b) => a[0].localeCompare(b[0]));

          for (const [day, dayInfo] of sortedDays) {
            if (needsFullDayOnly) {
              if (isSlotAfterMinimumAdvance(day, "08:00", minBookingTs)) {
                const fullDayMissions = announcerMissions.filter(
                  (m) => m.startDate <= day && m.endDate >= day && m.startTime && m.endTime
                ).map((m) => ({ startTime: m.startTime!, endTime: m.endTime! }));
                const occupancy = computeSlotOccupancy(fullDayMissions, 720);
                nextSlot = { date: day, startTime: "08:00", isFullDay: true, slotOccupancy: occupancy };
                break;
              }
            } else {
              const dayMissions = announcerMissions.filter(
                (m) => m.startDate <= day && m.endDate >= day && m.startTime && m.endTime
              ).map((m) => ({ startTime: m.startTime!, endTime: m.endTime! }));

              if (dayInfo.status === "partial" && dayInfo.timeSlots && dayInfo.timeSlots.length > 0) {
                const freeSlot = findFirstFreeSlotInDay(
                  day, dayInfo.timeSlots, dayMissions, sessionDuration,
                  bufferBefore, bufferAfter, minBookingTs
                );
                if (freeSlot) {
                  const windowMinutes = dayInfo.timeSlots.reduce((sum, s) => sum + timeToMinutes(s.endTime) - timeToMinutes(s.startTime), 0);
                  const occupancy = computeSlotOccupancy(dayMissions, windowMinutes || 720);
                  nextSlot = { date: day, startTime: freeSlot.startTime, endTime: freeSlot.endTime, slotOccupancy: occupancy };
                  break;
                }
              } else if (dayInfo.status === "available") {
                // Journée complète dispo : trouver le premier créneau libre dans la plage 08:00-20:00
                const freeSlot = findFirstFreeSlotInDay(
                  day, [{ startTime: "08:00", endTime: "20:00" }], dayMissions, sessionDuration,
                  bufferBefore, bufferAfter, minBookingTs
                );
                if (freeSlot) {
                  const occupancy = computeSlotOccupancy(dayMissions, 720);
                  nextSlot = { date: day, startTime: freeSlot.startTime, endTime: freeSlot.endTime, slotOccupancy: occupancy };
                  break;
                }
              }
            }
          }
        }

        results.push({
          formuleId: variant._id,
          formuleName: variant.name,
          formuleDescription: variant.description,
          price,
          priceUnit: variant.priceUnit || "hour",
          duration: variant.duration,
          sessionType: isCollective ? "collective" : "individual",
          serviceLocation: variant.serviceLocation || service.serviceLocation,
          numberOfSessions: variant.numberOfSessions,
          serviceId: service._id,
          categorySlug: service.category,
          categoryName: categoryDoc?.name || service.category,
          categoryIcon: categoryDoc?.icon,
          animalTypes: variant.animalTypes || service.animalTypes || [],
          announcerId: announcer._id,
          announcerSlug: announcer.username || announcer.slug || undefined,
          announcerFirstName: announcer.firstName,
          announcerLastName: announcer.lastName,
          announcerUsername: announcer.username ?? undefined,
          announcerProfileImage: (profile.listingDisplayImage === "logo" && profile.companyLogoUrl)
            ? profile.companyLogoUrl
            : (profile.profileImageUrl ?? profileImageUrl),
          announcerIsDisplayingLogo: !!(profile.listingDisplayImage === "logo" && profile.companyLogoUrl),
          announcerRating: 4.5, // TODO: calculer
          announcerReviewCount: 0,
          announcerLocation: profile.city ?? profile.location ?? "",
          announcerDistance: distance,
          announcerVerified: announcer.accountType === "annonceur_pro",
          announcerStatusType: statusType,
          isSapEligible: variant.isSapEligible || false,
          announcerSapApproved: profile.isSapApproved || false,
          nextSlot,
          collectiveSlots: collectiveSlots.length > 0 ? collectiveSlots : undefined,
          spotsLeft,
        });
      }
    }

    // Trier les résultats
    const sortBy = args.sortBy ?? "relevance";
    results.sort((a, b) => {
      switch (sortBy) {
        case "next_slot":
          // Tri par prochain créneau
          if (a.nextSlot && !b.nextSlot) return -1;
          if (!a.nextSlot && b.nextSlot) return 1;
          if (a.nextSlot && b.nextSlot) {
            const aDateTime = `${a.nextSlot.date}T${a.nextSlot.startTime}`;
            const bDateTime = `${b.nextSlot.date}T${b.nextSlot.startTime}`;
            return aDateTime.localeCompare(bDateTime);
          }
          return 0;

        case "price_asc":
          return a.price - b.price;

        case "price_desc":
          return b.price - a.price;

        case "distance":
          if (a.announcerDistance !== undefined && b.announcerDistance !== undefined) {
            return a.announcerDistance - b.announcerDistance;
          }
          if (a.announcerDistance === undefined) return 1;
          if (b.announcerDistance === undefined) return -1;
          return 0;

        case "relevance":
        default:
          // Par défaut: d'abord par distance, puis par créneau
          if (a.announcerDistance !== undefined && b.announcerDistance !== undefined) {
            const distDiff = a.announcerDistance - b.announcerDistance;
            if (Math.abs(distDiff) > 0.5) return distDiff; // Si différence > 500m, trier par distance
          }
          // Sinon par créneau
          if (a.nextSlot && !b.nextSlot) return -1;
          if (!a.nextSlot && b.nextSlot) return 1;
          if (a.nextSlot && b.nextSlot) {
            const aDateTime = `${a.nextSlot.date}T${a.nextSlot.startTime}`;
            const bDateTime = `${b.nextSlot.date}T${b.nextSlot.startTime}`;
            return aDateTime.localeCompare(bDateTime);
          }
          return 0;
      }
    });

    return results.slice(offset, offset + limit);
  },
});

// Query interne pour searchFormules avec Redis (appelée par l'action)
export const searchFormulesInternal = query({
  args: {
    ...searchFormulesArgs,
    // Paramètres Redis (optionnels, fournis par l'action)
    redisProfileIds: v.optional(v.array(v.string())),
    redisDistances: v.optional(v.record(v.string(), v.number())),
  },
  handler: async (ctx, args): Promise<FormuleResult[]> => {
    const radius = args.radiusKm ?? 20;
    const limit = args.limit ?? 100;
    const offset = args.offset ?? 0;
    const results: FormuleResult[] = [];

    // Redis: distances pré-calculées comme optimisation (pas filtre exclusif)
    const redisDistanceMap = args.redisDistances ? new Map(Object.entries(args.redisDistances)) : null;

    // 0. Lire le délai minimum de réservation à l'avance
    const minAdvanceCfg = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "minimum_booking_advance_hours"))
      .first();
    const minAdvHours = minAdvanceCfg ? parseInt(minAdvanceCfg.value) || 24 : 24;
    const minBookingTsInternal = Date.now() + minAdvHours * 60 * 60 * 1000;

    // Récupérer TOUS les services actifs (Redis = optimisation distance, pas filtre)
    let services;
    if (args.categorySlug) {
      services = await ctx.db
        .query("services")
        .withIndex("by_category_active", (q) =>
          q.eq("category", args.categorySlug!).eq("isActive", true)
        )
        .collect();
    } else {
      services = await ctx.db
        .query("services")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .collect();
    }

    services = services.filter((s) => {
      if (args.excludeCategory && s.category === args.excludeCategory) return false;
      if (args.animalType && !s.animalTypes?.includes(args.animalType)) return false;
      return true;
    });

    // Dates
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);
    const in7DaysStr = `${in7Days.getFullYear()}-${String(in7Days.getMonth() + 1).padStart(2, "0")}-${String(in7Days.getDate()).padStart(2, "0")}`;

    // Batch loading
    const userIdsSet = new Set<Id<"users">>();
    for (const s of services) {
      userIdsSet.add(s.userId);
    }
    const userIds: Id<"users">[] = [];
    userIdsSet.forEach((id) => userIds.push(id));
    const serviceIds = services.map((s) => s._id);

    const [
      usersMap,
      profilesMap,
      categoriesMap,
      variantsByServiceMap,
      photosMap,
    ] = await Promise.all([
      batchLoadUsers(ctx, userIds),
      batchLoadProfiles(ctx, userIds),
      batchLoadCategories(ctx),
      batchLoadVariantsByService(ctx, serviceIds),
      batchLoadProfilePhotos(ctx, userIds),
    ]);

    const photoUrlsMap = await resolvePhotoUrls(ctx, photosMap);

    const allVariantIds: Id<"serviceVariants">[] = [];
    for (const variants of Array.from(variantsByServiceMap.values())) {
      for (const v of variants) {
        if (v.sessionType === "collective") {
          allVariantIds.push(v._id);
        }
      }
    }

    const [collectiveSlotsByVariantMap, availabilityMap, missionsMap] = await Promise.all([
      batchLoadCollectiveSlotsByVariant(ctx, allVariantIds, todayStr, in7DaysStr),
      batchLoadAvailability(ctx, userIds),
      batchLoadMissions(ctx, userIds),
    ]);

    for (const service of services) {
      const announcer = usersMap.get(service.userId);
      if (!announcer || !announcer.isActive) continue;

      const profile = profilesMap.get(announcer._id);
      if (!profile) continue;

      // Distance: Redis si disponible, sinon Haversine
      let distance: number | undefined;
      if (redisDistanceMap && redisDistanceMap.has(profile._id)) {
        distance = redisDistanceMap.get(profile._id);
      } else if (args.coordinates && profile.coordinates) {
        // Fallback Haversine pour profils non indexés dans Redis
        if (!isInBoundingBox(
          args.coordinates.lat,
          args.coordinates.lng,
          profile.coordinates.lat,
          profile.coordinates.lng,
          radius
        )) {
          continue;
        }
        distance = calculateDistance(
          args.coordinates.lat,
          args.coordinates.lng,
          profile.coordinates.lat,
          profile.coordinates.lng
        );
        if (distance > radius) continue;
      }

      const categoryDoc = service.category ? categoriesMap.get(service.category) ?? null : null;
      const variants = variantsByServiceMap.get(service._id) ?? [];

      // Résoudre le categoryTypeId pour filtrer les disponibilités correctement
      let serviceCategoryTypeId: string | null = null;
      if (categoryDoc) {
        if (categoryDoc.typeId) {
          serviceCategoryTypeId = String(categoryDoc.typeId);
        } else if (categoryDoc.parentCategoryId) {
          for (const cat of Array.from(categoriesMap.values())) {
            if (String(cat._id) === String(categoryDoc.parentCategoryId) && cat.typeId) {
              serviceCategoryTypeId = String(cat.typeId);
              break;
            }
          }
        }
      }

      let statusType: "particulier" | "micro_entrepreneur" | "professionnel" = "particulier";
      if (announcer.accountType === "annonceur_pro") {
        statusType = announcer.companyType === "micro_enterprise" ? "micro_entrepreneur" : "professionnel";
      }

      // Filtre par type d'annonceur
      if (args.accountTypes && args.accountTypes.length > 0) {
        const mappedType = statusType === "professionnel" ? "pro" : statusType;
        if (!args.accountTypes.includes(mappedType)) continue;
      }

      // Filtres avancés profil
      if (args.verifiedOnly && !announcer.emailVerified) continue;
      if (args.hasGarden === true && !profile.hasGarden) continue;
      if (args.hasVehicle === true && !profile.hasVehicle) continue;
      if (args.noAnimals) {
        if (profile.ownedAnimals && profile.ownedAnimals.length > 0) continue;
      }
      if (args.ownsAnimals && args.ownsAnimals.length > 0) {
        const ownedAnimals = profile.ownedAnimals ?? [];
        const hasMatchingAnimal = args.ownsAnimals.some((animal: string) => {
          return ownedAnimals.some((oa: { type?: string }) => oa.type === animal);
        });
        if (!hasMatchingAnimal) continue;
      }

      const profileImageUrl = photoUrlsMap.get(announcer._id) ?? null;
      if (args.withPhotoOnly && !profileImageUrl) continue;

      for (const variant of variants) {
        const isCollective = variant.sessionType === "collective";
        if (args.sessionType === "individual" && isCollective) continue;
        if (args.sessionType === "collective" && !isCollective) continue;

        if (args.serviceLocation && args.serviceLocation.length > 0) {
          const variantLocation = variant.serviceLocation || service.serviceLocation || "both";
          if (variantLocation !== "both" && !args.serviceLocation.includes(variantLocation as "announcer_home" | "client_home")) {
            continue;
          }
        }

        const priceUnit = variant.priceUnit || "hour";
        let price = variant.price || 0;

        if (variant.pricing) {
          switch (priceUnit) {
            case "hour":
              price = variant.pricing.hourly ?? variant.price ?? 0;
              break;
            case "half_day":
              price = variant.pricing.halfDaily ?? variant.price ?? 0;
              break;
            case "day":
              price = variant.pricing.daily ?? variant.price ?? 0;
              break;
            case "week":
              price = variant.pricing.weekly ?? variant.price ?? 0;
              break;
            case "month":
              price = variant.pricing.monthly ?? variant.price ?? 0;
              break;
            default:
              price = variant.price ?? 0;
          }
        }

        if (args.priceMin !== undefined && price < args.priceMin * 100) continue;
        if (args.priceMax !== undefined && price > args.priceMax * 100) continue;

        let nextSlot: NextSlot | undefined;
        let collectiveSlots: CollectiveSlotInfo[] = [];
        let spotsLeft: number | undefined;

        if (isCollective) {
          const slots = collectiveSlotsByVariantMap.get(variant._id) ?? [];
          for (const slot of slots) {
            const remaining = slot.maxAnimals - slot.bookedAnimals;
            if (remaining > 0 && isSlotAfterMinimumAdvance(slot.date, slot.startTime, minBookingTsInternal)) {
              collectiveSlots.push({
                id: slot._id,
                date: slot.date,
                startTime: slot.startTime,
                endTime: slot.endTime,
                spotsLeft: remaining,
                formule: variant.name,
              });
            }
          }
          collectiveSlots.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
          if (collectiveSlots.length > 0) {
            nextSlot = { date: collectiveSlots[0].date, startTime: collectiveSlots[0].startTime, endTime: collectiveSlots[0].endTime };
            spotsLeft = collectiveSlots[0].spotsLeft;
          }
          collectiveSlots = collectiveSlots.slice(0, 5);
          if (collectiveSlots.length === 0) continue;
        } else {
          // Chercher dans les entrées de disponibilité directement (pas d'entrée = indisponible)
          const allUserAvail = availabilityMap.get(announcer._id) ?? [];

          const priceUnit = variant.priceUnit || "hour";
          const isLongDuration = priceUnit === "day" || priceUnit === "week" || priceUnit === "month";
          const hasNightly = variant.pricing?.nightly !== undefined && variant.pricing.nightly > 0;
          const needsFullDayOnly = isLongDuration || hasNightly;

          const announcerMissions = missionsMap.get(announcer._id) ?? [];
          const bufferBefore = profile?.bufferBefore ?? 0;
          const bufferAfter = profile?.bufferAfter ?? 0;
          const sessionDuration = variant.duration ?? 60;

          // Extraire les jours disponibles depuis les entrées d'availability
          // Pour chaque date, on garde la meilleure entrée (typed match > any, partial > available)
          const availableDays = new Map<string, { status: "available" | "partial"; timeSlots?: { startTime: string; endTime: string }[]; isTypedMatch: boolean }>();
          const in30Days = new Date(today);
          in30Days.setDate(in30Days.getDate() + 30);
          const in30DaysStr = `${in30Days.getFullYear()}-${String(in30Days.getMonth() + 1).padStart(2, "0")}-${String(in30Days.getDate()).padStart(2, "0")}`;

          for (const a of allUserAvail) {
            if (a.date < todayStr || a.date > in30DaysStr) continue;
            if (a.status === "unavailable") continue;

            // Vérifier si c'est un match typé
            const isTypedMatch = !!(serviceCategoryTypeId && a.categoryTypeId && String(a.categoryTypeId) === serviceCategoryTypeId);
            const isDifferentType = !!(serviceCategoryTypeId && a.categoryTypeId && String(a.categoryTypeId) !== serviceCategoryTypeId);

            // Ignorer les entrées d'un type différent (si on connaît notre type)
            if (isDifferentType) continue;

            const existing = availableDays.get(a.date);
            const entryInfo = {
              status: a.status as "available" | "partial",
              timeSlots: (a.status === "partial" && a.timeSlots) ? a.timeSlots : undefined,
              isTypedMatch,
            };

            if (!existing) {
              availableDays.set(a.date, entryInfo);
            } else {
              // Remplacer si meilleure entrée : typed > non-typed, partial > available
              const betterType = entryInfo.isTypedMatch && !existing.isTypedMatch;
              const betterStatus = entryInfo.status === "partial" && entryInfo.timeSlots && entryInfo.timeSlots.length > 0 && existing.status !== "partial";
              if (betterType || betterStatus) {
                availableDays.set(a.date, entryInfo);
              }
            }
          }

          // Trier les jours disponibles par date
          const sortedDays = Array.from(availableDays.entries()).sort((a, b) => a[0].localeCompare(b[0]));

          for (const [day, dayInfo] of sortedDays) {
            if (needsFullDayOnly) {
              if (isSlotAfterMinimumAdvance(day, "08:00", minBookingTsInternal)) {
                const fullDayMissions = announcerMissions.filter(
                  (m) => m.startDate <= day && m.endDate >= day && m.startTime && m.endTime
                ).map((m) => ({ startTime: m.startTime!, endTime: m.endTime! }));
                const occupancy = computeSlotOccupancy(fullDayMissions, 720);
                nextSlot = { date: day, startTime: "08:00", isFullDay: true, slotOccupancy: occupancy };
                break;
              }
            } else {
              const dayMissions = announcerMissions.filter(
                (m) => m.startDate <= day && m.endDate >= day && m.startTime && m.endTime
              ).map((m) => ({ startTime: m.startTime!, endTime: m.endTime! }));

              if (dayInfo.status === "partial" && dayInfo.timeSlots && dayInfo.timeSlots.length > 0) {
                const freeSlot = findFirstFreeSlotInDay(
                  day, dayInfo.timeSlots, dayMissions, sessionDuration,
                  bufferBefore, bufferAfter, minBookingTsInternal
                );
                if (freeSlot) {
                  const windowMinutes = dayInfo.timeSlots.reduce((sum, s) => sum + timeToMinutes(s.endTime) - timeToMinutes(s.startTime), 0);
                  const occupancy = computeSlotOccupancy(dayMissions, windowMinutes || 720);
                  nextSlot = { date: day, startTime: freeSlot.startTime, endTime: freeSlot.endTime, slotOccupancy: occupancy };
                  break;
                }
              } else if (dayInfo.status === "available") {
                // Journée complète dispo : trouver le premier créneau libre dans la plage 08:00-20:00
                const freeSlot = findFirstFreeSlotInDay(
                  day, [{ startTime: "08:00", endTime: "20:00" }], dayMissions, sessionDuration,
                  bufferBefore, bufferAfter, minBookingTsInternal
                );
                if (freeSlot) {
                  const occupancy = computeSlotOccupancy(dayMissions, 720);
                  nextSlot = { date: day, startTime: freeSlot.startTime, endTime: freeSlot.endTime, slotOccupancy: occupancy };
                  break;
                }
              }
            }
          }
        }

        results.push({
          formuleId: variant._id,
          formuleName: variant.name,
          formuleDescription: variant.description,
          price,
          priceUnit: variant.priceUnit || "hour",
          duration: variant.duration,
          sessionType: isCollective ? "collective" : "individual",
          serviceLocation: variant.serviceLocation || service.serviceLocation,
          numberOfSessions: variant.numberOfSessions,
          serviceId: service._id,
          categorySlug: service.category,
          categoryName: categoryDoc?.name || service.category,
          categoryIcon: categoryDoc?.icon,
          animalTypes: variant.animalTypes || service.animalTypes || [],
          announcerId: announcer._id,
          announcerSlug: announcer.username || announcer.slug || undefined,
          announcerFirstName: announcer.firstName,
          announcerLastName: announcer.lastName,
          announcerUsername: announcer.username ?? undefined,
          announcerProfileImage: (profile.listingDisplayImage === "logo" && profile.companyLogoUrl)
            ? profile.companyLogoUrl
            : (profile.profileImageUrl ?? profileImageUrl),
          announcerIsDisplayingLogo: !!(profile.listingDisplayImage === "logo" && profile.companyLogoUrl),
          announcerRating: 4.5,
          announcerReviewCount: 0,
          announcerLocation: profile.city ?? profile.location ?? "",
          announcerDistance: distance,
          announcerVerified: announcer.accountType === "annonceur_pro",
          announcerStatusType: statusType,
          isSapEligible: variant.isSapEligible || false,
          announcerSapApproved: profile.isSapApproved || false,
          nextSlot,
          collectiveSlots: collectiveSlots.length > 0 ? collectiveSlots : undefined,
          spotsLeft,
        });
      }
    }

    // Tri
    const sortBy = args.sortBy ?? "relevance";
    results.sort((a, b) => {
      switch (sortBy) {
        case "next_slot":
          if (a.nextSlot && !b.nextSlot) return -1;
          if (!a.nextSlot && b.nextSlot) return 1;
          if (a.nextSlot && b.nextSlot) {
            return `${a.nextSlot.date}T${a.nextSlot.startTime}`.localeCompare(`${b.nextSlot.date}T${b.nextSlot.startTime}`);
          }
          return 0;
        case "price_asc":
          return a.price - b.price;
        case "price_desc":
          return b.price - a.price;
        case "distance":
          if (a.announcerDistance !== undefined && b.announcerDistance !== undefined) {
            return a.announcerDistance - b.announcerDistance;
          }
          if (a.announcerDistance === undefined) return 1;
          if (b.announcerDistance === undefined) return -1;
          return 0;
        case "relevance":
        default:
          // Par défaut: d'abord par distance, puis par créneau
          if (a.announcerDistance !== undefined && b.announcerDistance !== undefined) {
            const distDiff = a.announcerDistance - b.announcerDistance;
            if (Math.abs(distDiff) > 0.5) return distDiff; // Si différence > 500m, trier par distance
          }
          // Sinon par créneau
          if (a.nextSlot && !b.nextSlot) return -1;
          if (!a.nextSlot && b.nextSlot) return 1;
          if (a.nextSlot && b.nextSlot) {
            return `${a.nextSlot.date}T${a.nextSlot.startTime}`.localeCompare(`${b.nextSlot.date}T${b.nextSlot.startTime}`);
          }
          return 0;
      }
    });

    return results.slice(offset, offset + limit);
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
  // Restrictions chiens (au niveau de la formule)
  dogCategoryAcceptance?: "none" | "cat1" | "cat2" | "both";
  acceptedDogSizes?: ("small" | "medium" | "large")[];
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
  // Tailles de chiens acceptées
  acceptedDogSizes?: ("small" | "medium" | "large")[];
  // Chiens catégorisés (législation française)
  dogCategoryAcceptance?: "none" | "cat1" | "cat2" | "both";
  variants: ServiceVariant[];
  options: ServiceOption[];
  // Overnight stay support
  allowOvernightStay?: boolean;
  dayStartTime?: string;
  dayEndTime?: string;
  overnightPrice?: number;
  // Service location
  serviceLocation?: "announcer_home" | "client_home" | "both";
  // Duration-based blocking (from category settings)
  enableDurationBasedBlocking?: boolean;
  // Pricing configuration from category
  allowedPriceUnits?: ("hour" | "half_day" | "day" | "week" | "month")[];
  clientBillingMode?: "exact_hourly" | "round_half_day" | "round_full_day";
  // Price range for positioning indicator
  priceRange?: { min: number; max: number; avg: number };
}

// Query pour obtenir les détails des services d'un annonceur
export const getAnnouncerServiceDetails = query({
  args: {
    announcerId: v.id("users"),
  },
  handler: async (ctx, args): Promise<ServiceDetail[]> => {
    // Récupérer le type de compte de l'annonceur (pro ou particulier)
    const announcer = await ctx.db.get(args.announcerId);
    const accountType = announcer?.accountType === "annonceur_pro" ? "pro" : "particulier";

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

      // Récupérer le price range pour cette catégorie
      // Utiliser le premier variant pour déterminer l'unité de prix principale
      const firstVariant = variants[0];
      let priceRange: { min: number; max: number; avg: number } | undefined;
      if (firstVariant) {
        // Déterminer l'unité de prix principale
        const pricing = firstVariant.pricing as { hourly?: number; daily?: number; weekly?: number; monthly?: number } | undefined;
        let priceUnit: "hour" | "day" | "week" | "month" | "flat" = "hour";
        if (pricing?.daily) priceUnit = "day";
        else if (pricing?.weekly) priceUnit = "week";
        else if (pricing?.monthly) priceUnit = "month";
        else if (pricing?.hourly) priceUnit = "hour";
        else priceUnit = "flat";

        const defaultRange = getDefaultPricing(service.category, priceUnit, accountType);
        if (defaultRange) {
          priceRange = defaultRange;
        }
      }

      results.push({
        id: service._id,
        category: service.category,
        categoryName: categoryData?.name ?? service.category,
        categoryIcon: categoryData?.icon,
        categoryDescription: categoryData?.description,
        animalTypes: service.animalTypes,
        // Tailles de chiens acceptées
        acceptedDogSizes: service.acceptedDogSizes as ("small" | "medium" | "large")[] | undefined,
        // Chiens catégorisés (législation française)
        dogCategoryAcceptance: service.dogCategoryAcceptance as "none" | "cat1" | "cat2" | "both" | undefined,
        // Overnight fields from service
        allowOvernightStay: service.allowOvernightStay,
        dayStartTime: service.dayStartTime,
        dayEndTime: service.dayEndTime,
        overnightPrice: service.overnightPrice,
        // Service location
        serviceLocation: service.serviceLocation as "announcer_home" | "client_home" | "both" | undefined,
        // Duration-based blocking (from category settings)
        enableDurationBasedBlocking: categoryData?.enableDurationBasedBlocking,
        // Pricing configuration from category
        allowedPriceUnits: categoryData?.allowedPriceUnits as ("hour" | "half_day" | "day" | "week" | "month")[] | undefined,
        clientBillingMode: categoryData?.clientBillingMode as ("exact_hourly" | "round_half_day" | "round_full_day") | undefined,
        // Price range
        priceRange,
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
          // Session fields for multi-session and collective formulas
          numberOfSessions: v.numberOfSessions,
          sessionInterval: v.sessionInterval,
          sessionType: v.sessionType as "individual" | "collective" | undefined,
          // Objectives for formula details
          objectives: v.objectives,
          // Animal types accepted by this variant
          animalTypes: v.animalTypes,
          // Max animals for collective sessions
          maxAnimalsPerSession: v.maxAnimalsPerSession,
          // Restrictions chiens (au niveau de la formule)
          dogCategoryAcceptance: v.dogCategoryAcceptance as "none" | "cat1" | "cat2" | "both" | undefined,
          acceptedDogSizes: v.acceptedDogSizes as ("small" | "medium" | "large")[] | undefined,
          // SAP eligibility
          isSapEligible: v.isSapEligible ?? false,
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
    // Récupérer le profil de l'annonceur pour les buffers et capacité
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.announcerId))
      .first();

    // Récupérer les préférences utilisateur pour les horaires de disponibilité
    const userPreferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", args.announcerId))
      .first();

    const bufferBefore = profile?.bufferBefore ?? 0;
    const bufferAfter = profile?.bufferAfter ?? 0;
    const maxAnimalsPerSlot = profile?.maxAnimalsPerSlot ?? 1;
    const acceptReservationsFrom = userPreferences?.acceptReservationsFrom ?? "08:00";
    const acceptReservationsTo = userPreferences?.acceptReservationsTo ?? "20:00";

    // Vérifier si la catégorie est basée sur la capacité
    const isCapacityBasedCategory = await isCategoryCapacityBased(ctx.db, args.serviceCategory);

    // Pour les catégories capacity-based, récupérer toutes les sous-catégories du même parent
    const categorySlugs = isCapacityBasedCategory
      ? await getAllSubcategorySlugs(ctx.db, args.serviceCategory)
      : [args.serviceCategory];

    // NOUVEAU: Récupérer le categoryTypeId de cette catégorie
    const category = await ctx.db
      .query("serviceCategories")
      .withIndex("by_slug", (q) => q.eq("slug", args.serviceCategory))
      .first();

    let categoryTypeId: Id<"categoryTypes"> | null = null;

    if (category) {
      // Si catégorie a un typeId, utiliser directement
      if (category.typeId) {
        categoryTypeId = category.typeId;
      }
      // Si sous-catégorie, récupérer le typeId du parent
      else if (category.parentCategoryId) {
        const parent = await ctx.db.get(category.parentCategoryId);
        categoryTypeId = parent?.typeId ?? null;
      }

      // Fallback: Si pas de typeId trouvé, chercher par correspondance de slug
      // Les categoryTypes ont généralement des slugs comme "garde", "service", "sante", "reproduction"
      if (!categoryTypeId) {
        // Récupérer tous les categoryTypes
        const allCategoryTypes = await ctx.db
          .query("categoryTypes")
          .withIndex("by_active", (q) => q.eq("isActive", true))
          .collect();

        // Slugs à vérifier: la catégorie actuelle et son parent si c'est une sous-catégorie
        const slugsToCheck: string[] = [args.serviceCategory.toLowerCase()];

        // Si sous-catégorie, ajouter aussi le slug du parent
        if (category.parentCategoryId) {
          const parent = await ctx.db.get(category.parentCategoryId);
          if (parent?.slug) {
            slugsToCheck.push(parent.slug.toLowerCase());
          }
        }

        // Vérifier si un des slugs correspond à un type
        for (const slugToCheck of slugsToCheck) {
          const matchingType = allCategoryTypes.find((type) => {
            const typeSlugLower = type.slug.toLowerCase();
            // Match exact ou le slug commence par le slug du type
            return slugToCheck === typeSlugLower ||
                   slugToCheck.startsWith(typeSlugLower + "-") ||
                   slugToCheck.startsWith(typeSlugLower + "_");
          });

          if (matchingType) {
            categoryTypeId = matchingType._id;
            break;
          }
        }

        // Fallback ultime: utiliser isCapacityBased pour identifier le type "garde"
        if (!categoryTypeId && isCapacityBasedCategory) {
          // Si c'est une catégorie capacity-based, c'est probablement de type "garde"
          const gardeType = allCategoryTypes.find((type) =>
            type.slug.toLowerCase().includes("garde")
          );
          if (gardeType) {
            categoryTypeId = gardeType._id;
          }
        }

        // Fallback pour les services non capacity-based: essayer de trouver le type "service"
        if (!categoryTypeId && !isCapacityBasedCategory) {
          // Chercher un type "service" ou similaire
          const serviceType = allCategoryTypes.find((type) =>
            type.slug.toLowerCase().includes("service") ||
            type.slug.toLowerCase().includes("prestation")
          );
          if (serviceType) {
            categoryTypeId = serviceType._id;
          }
        }
      }
    }

    // Récupérer toutes les entrées de disponibilité de l'annonceur
    const allAvailabilities = await ctx.db
      .query("availability")
      .withIndex("by_user", (q) => q.eq("userId", args.announcerId))
      .collect();

    // Filtrer par categoryTypeId si défini
    // On garde les entrées qui:
    // 1. N'ont pas de categoryTypeId (rétrocompatibilité - s'applique à tous les types)
    // 2. Ont le même categoryTypeId que la catégorie demandée
    const unavailabilities = categoryTypeId
      ? allAvailabilities.filter(
          (a) => !a.categoryTypeId || String(a.categoryTypeId) === String(categoryTypeId)
        )
      : allAvailabilities;

    // Créer une map des disponibilités par date pour ce type de catégorie
    // Clé: date, Valeur: entrée de disponibilité
    const availabilityByDate = new Map<string, typeof unavailabilities[0]>();
    for (const avail of unavailabilities) {
      const existing = availabilityByDate.get(avail.date);

      if (categoryTypeId) {
        // Cas 1: On a un categoryTypeId à chercher
        // Priorité: entrée avec categoryTypeId correspondant > entrée sans categoryTypeId
        if (avail.categoryTypeId && String(avail.categoryTypeId) === String(categoryTypeId)) {
          // Entrée spécifique pour ce type - prioritaire (écrase toute entrée existante)
          availabilityByDate.set(avail.date, avail);
        } else if (!existing && !avail.categoryTypeId) {
          // Entrée générique (sans type) - fallback si pas d'entrée spécifique
          availabilityByDate.set(avail.date, avail);
        }
      } else {
        // Cas 2: Pas de categoryTypeId (catégorie sans typeId configuré)
        // Mode rétrocompatibilité: utiliser toutes les entrées disponibles
        // Priorité: entrées sans categoryTypeId > entrées avec categoryTypeId
        if (!existing) {
          availabilityByDate.set(avail.date, avail);
        } else if (!avail.categoryTypeId && existing.categoryTypeId) {
          // Entrée générique remplace une entrée spécifique
          availabilityByDate.set(avail.date, avail);
        }
      }
    }

    // Set des dates explicitement marquées comme indisponibles (pour rétrocompatibilité)
    const unavailableDatesSet = new Set(
      unavailabilities
        .filter((a) => a.status === "unavailable")
        .map((a) => a.date)
    );

    // Récupérer TOUTES les missions de l'annonceur (toutes catégories confondues)
    // Car un annonceur ne peut être qu'à un seul endroit à la fois
    // On inclut aussi les réservations en attente (pending_acceptance, pending_confirmation, etc.)
    // Seules les missions cancelled et refused sont exclues
    const allMissions = await ctx.db
      .query("missions")
      .withIndex("by_announcer", (q) => q.eq("announcerId", args.announcerId))
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "cancelled"),
          q.neq(q.field("status"), "refused")
        )
      )
      .collect();

    // Pour les catégories capacity-based, on filtre par catégorie pour le comptage
    const categoryMissions = allMissions.filter((m) => categorySlugs.includes(m.serviceCategory));

    // Pour le blocage des créneaux, on utilise TOUTES les missions (toutes catégories)
    // car l'annonceur ne peut pas être à deux endroits à la fois
    const missions = allMissions;

    // Récupérer les créneaux collectifs actifs de l'annonceur (ils bloquent aussi les disponibilités)
    const collectiveSlots = await ctx.db
      .query("collectiveSlots")
      .withIndex("by_user", (q) => q.eq("userId", args.announcerId))
      .filter((q) =>
        q.and(
          q.eq(q.field("isActive"), true),
          q.eq(q.field("isCancelled"), false)
        )
      )
      .collect();

    // Filtrer les créneaux collectifs dans la plage de dates
    const collectiveSlotsInRange = collectiveSlots.filter(
      (slot) => slot.date >= args.startDate && slot.date <= args.endDate
    );

    // Générer les dates de la plage
    const allDates = getDatesBetween(args.startDate, args.endDate);
    // Formater la date du jour sans toISOString()
    const todayDate = new Date();
    const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, "0")}-${String(todayDate.getDate()).padStart(2, "0")}`;

    // Lire le délai minimum de réservation à l'avance (24h par défaut)
    const advanceConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q: any) => q.eq("key", "minimum_booking_advance_hours"))
      .first();
    const minimumBookingAdvanceHours = advanceConfig
      ? parseInt(advanceConfig.value) || 24
      : 24;

    // Calculer la date/heure minimum réservable
    const nowMs = Date.now();
    const minBookableMs = nowMs + minimumBookingAdvanceHours * 60 * 60 * 1000;
    const minBookableDate = new Date(minBookableMs);
    const minBookableDateStr = `${minBookableDate.getFullYear()}-${String(minBookableDate.getMonth() + 1).padStart(2, "0")}-${String(minBookableDate.getDate()).padStart(2, "0")}`;
    const minBookableTimeStr = `${String(minBookableDate.getHours()).padStart(2, "0")}:${String(minBookableDate.getMinutes()).padStart(2, "0")}`;

    // Construire le calendrier
    const calendar: Array<{
      date: string;
      status: "available" | "partial" | "unavailable" | "past";
      timeSlots?: Array<{ startTime: string; endTime: string }>;
      bookedSlots?: Array<{ startTime: string; endTime: string; originalStartTime?: string; originalEndTime?: string }>;
      // Informations de capacité (pour les catégories capacity-based)
      capacity?: {
        current: number; // Nombre d'animaux actuellement réservés
        max: number; // Capacité maximale
        remaining: number; // Places restantes
      };
    }> = [];

    for (const date of allDates) {
      if (date < today) {
        calendar.push({ date, status: "past" });
        continue;
      }

      // Vérifier le délai minimum de réservation à l'avance
      // Si la date est entièrement avant la date/heure minimum réservable, la marquer comme passée
      if (date < minBookableDateStr) {
        // Toute la journée est dans le délai minimum → non réservable
        calendar.push({ date, status: "past" });
        continue;
      }
      // Si la date est le jour de la limite, vérifier si l'heure de fin de dispo est avant le minimum
      if (date === minBookableDateStr && acceptReservationsTo <= minBookableTimeStr) {
        // Tous les créneaux de cette journée sont avant le minimum → non réservable
        calendar.push({ date, status: "past" });
        continue;
      }

      // Trouver TOUTES les missions pour ce jour (toutes catégories)
      const dayMissions = missions.filter((m) =>
        datesOverlap(m.startDate, m.endDate, date, date)
      );

      // Pour les catégories capacity-based, compter seulement les missions de la même catégorie
      const dayCategoryMissions = categoryMissions.filter((m) =>
        datesOverlap(m.startDate, m.endDate, date, date)
      );

      // Trouver les créneaux collectifs pour ce jour
      const dayCollectiveSlots = collectiveSlotsInRange.filter((slot) => slot.date === date);

      // NOUVEAU: Vérifier la disponibilité explicite pour ce type de catégorie
      // Par défaut, un annonceur est INDISPONIBLE sauf s'il a défini une disponibilité
      const dayAvailability = availabilityByDate.get(date);
      const hasExplicitAvailability = dayAvailability &&
        (dayAvailability.status === "available" || dayAvailability.status === "partial");

      // Si pas de disponibilité explicite ET pas de missions/créneaux collectifs ce jour
      // => INDISPONIBLE (comportement par défaut)
      if (!hasExplicitAvailability && dayMissions.length === 0 && dayCollectiveSlots.length === 0) {
        calendar.push({ date, status: "unavailable" });
        continue;
      }

      // Vérifier indisponibilité explicite (status = "unavailable")
      const isExplicitlyUnavailable = dayAvailability?.status === "unavailable";
      if (isExplicitlyUnavailable && dayMissions.length === 0 && dayCollectiveSlots.length === 0) {
        calendar.push({ date, status: "unavailable" });
        continue;
      }

      // S'il y a des missions ou des créneaux collectifs ce jour
      if (dayMissions.length > 0 || dayCollectiveSlots.length > 0) {
        // Compter les animaux pour les catégories capacity-based (seulement même catégorie)
        const currentAnimalsCount = dayCategoryMissions.length;

        if (isCapacityBasedCategory) {
          // NOUVEAU: Pour les catégories capacity-based, vérifier d'abord la disponibilité explicite
          // Si pas de disponibilité définie pour ce type, le jour reste indisponible
          if (!hasExplicitAvailability) {
            calendar.push({
              date,
              status: "unavailable",
              capacity: {
                current: currentAnimalsCount,
                max: maxAnimalsPerSlot,
                remaining: 0, // Pas de capacité si pas de disponibilité
              },
            });
            continue;
          }

          // Mode capacité: vérifier si la capacité maximale est atteinte
          const remainingCapacity = Math.max(0, maxAnimalsPerSlot - currentAnimalsCount);

          if (remainingCapacity === 0) {
            // Capacité maximale atteinte - indisponible
            calendar.push({
              date,
              status: "unavailable",
              capacity: {
                current: currentAnimalsCount,
                max: maxAnimalsPerSlot,
                remaining: 0,
              },
            });
            continue;
          }

          // Pour les catégories capacity-based (garde), on ne bloque PAS les créneaux horaires
          // Seule la capacité d'animaux compte - les utilisateurs peuvent réserver n'importe quel créneau
          // tant que la capacité maximale n'est pas atteinte

          // Disponible avec capacité restante
          calendar.push({
            date,
            status: remainingCapacity < maxAnimalsPerSlot ? "partial" : "available",
            // Pas de bookedSlots pour les services garde - créneaux libres tant que capacité disponible
            capacity: {
              current: currentAnimalsCount,
              max: maxAnimalsPerSlot,
              remaining: remainingCapacity,
            },
          });
          continue;
        }

        // Mode standard: Filtrer les missions réellement actives sur cette date
        // Les missions collectives multi-jours ne sont actives que sur les dates avec créneaux collectifs
        const missionsActiveOnThisDate = dayMissions.filter((m) => {
          // Mission uni-jour: toujours active
          if (m.startDate === m.endDate) return true;

          // Mission collective multi-jours: active SEULEMENT si un créneau collectif existe ce jour
          if (m.sessionType === "collective") {
            return dayCollectiveSlots.length > 0;
          }

          // Mission individuelle multi-séances: active si une séance est programmée ce jour
          if (m.sessions && m.sessions.length > 0) {
            return m.sessions.some((s: { date: string }) => s.date === date);
          }

          // Autres missions multi-jours (garde, etc.): actives chaque jour
          return true;
        });

        // S'il n'y a plus de missions actives ni de créneaux collectifs, gérer ce cas
        if (missionsActiveOnThisDate.length === 0 && dayCollectiveSlots.length === 0) {
          // Ce jour n'a pas de missions actives ni de créneaux collectifs
          // Vérifier la disponibilité explicite
          if (!hasExplicitAvailability) {
            calendar.push({ date, status: "unavailable" });
            continue;
          }
          // Jour disponible sans missions actives - sera géré en fin de boucle
        } else {
          // Extraire les créneaux occupés AVEC les buffers (TOUJOURS, même si pas de disponibilité explicite)
          const missionBookedSlots: Array<{
            startTime: string;
            endTime: string;
            originalStartTime: string;
            originalEndTime: string;
          }> = [];

          for (const m of missionsActiveOnThisDate) {
            if (!m.startTime || !m.endTime) continue;

            // Cas 1: Mission uni-jour standard
            if (m.startDate === m.endDate) {
              const adjustedSlot = applyBuffersToTimeSlot(m.startTime, m.endTime, bufferBefore, bufferAfter);
              missionBookedSlots.push({
                startTime: adjustedSlot.startTime,
                endTime: adjustedSlot.endTime,
                originalStartTime: adjustedSlot.originalStartTime,
                originalEndTime: adjustedSlot.originalEndTime,
              });
              continue;
            }

            // Cas 2: Mission collective avec créneaux
            if (m.sessionType === "collective") {
              const adjustedSlot = applyBuffersToTimeSlot(m.startTime, m.endTime, bufferBefore, bufferAfter);
              missionBookedSlots.push({
                startTime: adjustedSlot.startTime,
                endTime: adjustedSlot.endTime,
                originalStartTime: adjustedSlot.originalStartTime,
                originalEndTime: adjustedSlot.originalEndTime,
              });
              continue;
            }

            // Cas 3: Mission individuelle multi-séances
            if (m.sessions && m.sessions.length > 0) {
              const sessionOnDate = m.sessions.find((s: { date: string; startTime: string; endTime: string }) => s.date === date);
              if (sessionOnDate) {
                const adjustedSlot = applyBuffersToTimeSlot(sessionOnDate.startTime, sessionOnDate.endTime, bufferBefore, bufferAfter);
                missionBookedSlots.push({
                  startTime: adjustedSlot.startTime,
                  endTime: adjustedSlot.endTime,
                  originalStartTime: adjustedSlot.originalStartTime,
                  originalEndTime: adjustedSlot.originalEndTime,
                });
              }
            }
          }

          // Ajouter les créneaux collectifs comme slots bloqués
          const collectiveSlotsForDay = dayCollectiveSlots.map((slot) => {
            const adjustedSlot = applyBuffersToTimeSlot(slot.startTime, slot.endTime, bufferBefore, bufferAfter);
            return {
              startTime: adjustedSlot.startTime,
              endTime: adjustedSlot.endTime,
              originalStartTime: adjustedSlot.originalStartTime,
              originalEndTime: adjustedSlot.originalEndTime,
            };
          });

          // Combiner missions et créneaux collectifs
          const bookedSlots = [...missionBookedSlots, ...collectiveSlotsForDay];

          // NOUVEAU: Vérifier la disponibilité explicite même avec des missions existantes
          // Si pas de disponibilité pour ce type, le jour est indisponible pour de NOUVELLES réservations
          // MAIS on inclut quand même les bookedSlots pour information
          if (!hasExplicitAvailability) {
            calendar.push({
              date,
              status: "unavailable",
              bookedSlots: bookedSlots.length > 0 ? bookedSlots : undefined,
            });
            continue;
          }

          // Vérifier si une mission bloque toute la journée
          const hasFullDayBlock = missionsActiveOnThisDate.some((m) => {
            const isMultiDay = m.startDate !== m.endDate;
            const hasNoTimeSlot = !m.startTime || !m.endTime;

            // Mission collective avec créneaux ne bloque pas toute la journée
            if (m.sessionType === "collective" && m.startTime && m.endTime) return false;

            // Mission multi-séances avec créneaux ne bloque pas toute la journée
            if (m.sessions && m.sessions.length > 0 && m.startTime && m.endTime) return false;

            return isMultiDay || hasNoTimeSlot;
          });

          if (hasFullDayBlock) {
            calendar.push({
              date,
              status: "unavailable",
              bookedSlots: bookedSlots.length > 0 ? bookedSlots : undefined,
            });
            continue;
          }

          // Vérifier disponibilité partielle manuelle
          const partialAvail = unavailabilities.find((a) => a.date === date && a.status === "partial");

          calendar.push({
            date,
            status: "partial",
            timeSlots: partialAvail?.timeSlots,
            bookedSlots,
          });
          continue;
        }
      }

      // Mapper les créneaux collectifs avec buffers pour les bookedSlots
      const collectiveSlotsWithBuffers = dayCollectiveSlots.map((slot) => {
        const adjustedSlot = applyBuffersToTimeSlot(
          slot.startTime,
          slot.endTime,
          bufferBefore,
          bufferAfter
        );
        return {
          startTime: adjustedSlot.startTime,
          endTime: adjustedSlot.endTime,
          originalStartTime: adjustedSlot.originalStartTime,
          originalEndTime: adjustedSlot.originalEndTime,
        };
      });

      // Utiliser la disponibilité déjà récupérée pour ce jour
      // (dayAvailability est défini plus haut dans la boucle)
      const partialAvail = dayAvailability?.status === "partial" ? dayAvailability : undefined;

      // S'il y a des créneaux collectifs ou une disponibilité partielle
      if (collectiveSlotsWithBuffers.length > 0 || partialAvail?.timeSlots) {
        calendar.push({
          date,
          status: "partial",
          timeSlots: partialAvail?.timeSlots,
          bookedSlots: collectiveSlotsWithBuffers.length > 0 ? collectiveSlotsWithBuffers : undefined,
        });
        continue;
      }

      // NOUVEAU: Vérifier si l'annonceur a une disponibilité explicite pour ce jour
      // Si pas de disponibilité explicite (available ou partial), le jour est INDISPONIBLE
      if (!hasExplicitAvailability) {
        calendar.push({ date, status: "unavailable" });
        continue;
      }

      // Jour entièrement disponible (a une entrée "available" explicite)
      const calendarEntry: {
        date: string;
        status: "available" | "partial" | "unavailable" | "past";
        capacity?: { current: number; max: number; remaining: number };
      } = { date, status: "available" };

      // Ajouter les infos de capacité pour les catégories capacity-based
      if (isCapacityBasedCategory) {
        calendarEntry.capacity = {
          current: 0,
          max: maxAnimalsPerSlot,
          remaining: maxAnimalsPerSlot,
        };
      }

      calendar.push(calendarEntry);
    }

    return {
      calendar,
      bufferBefore,
      bufferAfter,
      // Horaires de disponibilité de l'annonceur
      acceptReservationsFrom,
      acceptReservationsTo,
      // Informations de capacité globales
      isCapacityBased: isCapacityBasedCategory,
      maxAnimalsPerSlot: isCapacityBasedCategory ? maxAnimalsPerSlot : undefined,
      // Délai minimum de réservation à l'avance (en heures)
      minimumBookingAdvanceHours,
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

    // Déterminer le type de statut pour la commission
    let statusType: "particulier" | "micro_entrepreneur" | "professionnel" = "particulier";
    if (announcer.accountType === "annonceur_pro") {
      if (announcer.companyType === "micro_enterprise") {
        statusType = "micro_entrepreneur";
      } else {
        statusType = "professionnel";
      }
    }

    return {
      id: announcer._id,
      firstName: announcer.firstName,
      lastName: announcer.lastName,
      username: announcer.username ?? undefined,
      profileImage: (profile?.listingDisplayImage === "logo" && profile?.companyLogoUrl)
        ? profile.companyLogoUrl
        : profileImageUrl,
      isDisplayingLogo: !!(profile?.listingDisplayImage === "logo" && profile?.companyLogoUrl),
      location: profile?.city ?? profile?.location ?? "",
      city: profile?.city ?? null,
      postalCode: profile?.postalCode ?? null,
      coordinates: profile?.coordinates ?? null,
      statusType,
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
  username?: string;
  profileImage: string | null;
  isDisplayingLogo: boolean;
  coverImage: string | null;
  location: string;
  coordinates: { lat: number; lng: number } | null;
  distance?: number;
  rating: number;
  reviewCount: number;
  verified: boolean;
  isIdentityVerified: boolean;
  statusType: "particulier" | "micro_entrepreneur" | "professionnel";

  // Infos service
  categorySlug: string;
  categoryName: string;
  categoryIcon: string;
  basePrice: number;
  basePriceUnit: "hour" | "day" | "week" | "month" | "flat";
  animalTypes: string[];
  serviceLocation?: "announcer_home" | "client_home" | "both";

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

  // Capacity info for garde categories (when dates are selected)
  capacityInfo?: {
    isCapacityBased: boolean;
    currentCount: number;
    maxCapacity: number;
    remainingCapacity: number;
  };

  // Price range for positioning indicator
  priceRange?: { min: number; max: number; avg: number };
}

// Arguments communs pour la recherche de services
const searchServicesArgs = {
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

  // Filtre lieu de prestation
  serviceLocation: v.optional(v.array(v.union(
    v.literal("announcer_home"),
    v.literal("client_home")
  ))),

  // Pagination
  limit: v.optional(v.number()),
  offset: v.optional(v.number()),
};

// Query de recherche par service (1 carte par service au lieu de 1 carte par annonceur)
// Phase 2 Optimisation: Batch Loading pour éliminer les N+1 queries
export const searchServices = query({
  args: {
    ...searchServicesArgs,
    // Paramètres Redis (optionnels, fournis par l'action)
    redisProfileIds: v.optional(v.array(v.string())),
    redisDistances: v.optional(v.record(v.string(), v.number())),
  },
  handler: async (ctx, args): Promise<ServiceSearchResult[]> => {
    const radius = args.radiusKm ?? 20;
    const limit = args.limit ?? 100;
    const offset = args.offset ?? 0;

    // Redis: distances pré-calculées comme optimisation (pas filtre exclusif)
    const redisDistanceMap = args.redisDistances ? new Map(Object.entries(args.redisDistances)) : null;

    // ============================================================
    // PHASE 2 OPTIMISATION: Batch Loading (élimination N+1)
    // ============================================================

    // 1. Récupérer TOUS les annonceurs actifs (Redis = optimisation distance, pas filtre)
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

    // 2. Extraire les IDs des annonceurs
    const announcerIds = announcers.map((a) => a._id);

    // 3. Batch loading de toutes les données nécessaires en parallèle
    const [
      profilesMap,
      servicesMap,
      photosMap,
      categoriesMap,
      availabilityMap,
      missionsMap,
    ] = await Promise.all([
      batchLoadProfiles(ctx, announcerIds),
      batchLoadServices(ctx, announcerIds),
      batchLoadProfilePhotos(ctx, announcerIds),
      batchLoadCategories(ctx),
      batchLoadAvailability(ctx, announcerIds),
      batchLoadMissions(ctx, announcerIds),
    ]);

    // 4. Résoudre les URLs des photos en parallèle
    const photoUrlsMap = await resolvePhotoUrls(ctx, photosMap);

    // 5. Collecter tous les serviceIds pour charger les variants
    const allServiceIds: Id<"services">[] = [];
    for (const services of Array.from(servicesMap.values())) {
      for (const s of services) {
        allServiceIds.push(s._id);
      }
    }

    // 6. Batch loading des variants
    const variantsByServiceMap = await batchLoadVariantsByService(ctx, allServiceIds);

    const results: ServiceSearchResult[] = [];

    for (const announcer of announcers) {
      // Récupérer le profil depuis le cache
      const profile = profilesMap.get(announcer._id);
      if (!profile) continue;

      // Filtrer par type de compte
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

      // Filtrer par profil vérifié
      if (args.verifiedOnly && !announcer.emailVerified) continue;

      // Filtrer par équipements
      if (args.hasGarden === true && !profile.hasGarden) continue;
      if (args.hasVehicle === true && !profile.hasVehicle) continue;

      // Filtrer par animaux du gardien
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

      // Filtrer par localisation (utiliser Redis si disponible)
      let distance: number | undefined;
      if (redisDistanceMap && redisDistanceMap.has(profile._id)) {
        distance = redisDistanceMap.get(profile._id);
      } else if (args.coordinates && profile.coordinates) {
        // Pré-filtrage bounding box
        if (!isInBoundingBox(
          args.coordinates.lat,
          args.coordinates.lng,
          profile.coordinates.lat,
          profile.coordinates.lng,
          radius
        )) {
          continue;
        }
        distance = calculateDistance(
          args.coordinates.lat,
          args.coordinates.lng,
          profile.coordinates.lat,
          profile.coordinates.lng
        );
        if (distance > radius) continue;
      }

      // Récupérer les services depuis le cache
      const services = servicesMap.get(announcer._id) ?? [];
      if (services.length === 0) continue;

      // Photo de profil depuis le cache
      const profileImageUrl = photoUrlsMap.get(announcer._id) ?? null;

      // Filtrer par photo
      if (args.withPhotoOnly && !profileImageUrl && !profile.profileImageUrl) continue;

      // Déterminer le type de statut
      let statusType: "particulier" | "micro_entrepreneur" | "professionnel" = "particulier";
      if (announcer.accountType === "annonceur_pro") {
        statusType = announcer.companyType === "micro_enterprise" ? "micro_entrepreneur" : "professionnel";
      }

      // Récupérer les données de disponibilité depuis le cache
      const unavailableDates = (availabilityMap.get(announcer._id) ?? [])
        .filter((a) => a.status === "unavailable");
      const unavailableDateSet = new Set(unavailableDates.map((a) => a.date));

      // Récupérer les missions depuis le cache
      const existingMissions = missionsMap.get(announcer._id) ?? [];

      // Buffers
      const bufferBeforeService = profile?.bufferBefore ?? 0;
      const bufferAfterService = profile?.bufferAfter ?? 0;

      // Pour chaque service, créer un résultat
      for (const service of services) {
        // Filtrer par catégorie si spécifiée
        if (args.categorySlug && service.category !== args.categorySlug) continue;

        // Exclure une catégorie si spécifiée
        if (args.excludeCategory && service.category === args.excludeCategory) continue;

        // Filtrer par type d'animal
        if (args.animalType && !service.animalTypes.includes(args.animalType)) continue;

        // Filtrer par lieu de prestation
        if (args.serviceLocation && args.serviceLocation.length > 0) {
          const serviceLocation = service.serviceLocation;
          if (serviceLocation && serviceLocation !== "both") {
            if (!args.serviceLocation.includes(serviceLocation as "announcer_home" | "client_home")) {
              continue;
            }
          }
        }

        // Récupérer les variants depuis le cache
        const variants = variantsByServiceMap.get(service._id) ?? [];

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

        // Récupérer le price range pour cette catégorie
        const priceRange = getDefaultPricing(service.category, basePriceUnit, statusType === "professionnel" ? "pro" : "particulier") ?? undefined;

        // Vérifier la disponibilité pour ce service
        let availability: { status: "available" | "partial" | "unavailable"; nextAvailable?: string } = { status: "available" };
        let capacityInfo: { isCapacityBased: boolean; currentCount: number; maxCapacity: number; remainingCapacity: number; } | undefined;

        // Déterminer les dates à vérifier
        let datesToCheck: string[] = [];
        if (args.date) {
          datesToCheck = [args.date];
        } else if (args.startDate && args.endDate) {
          datesToCheck = getDatesBetween(args.startDate, args.endDate);
        }

        if (datesToCheck.length > 0) {
          // Utiliser les données en cache (déjà chargées en batch)
          const hasManualUnavailability = datesToCheck.some((d) =>
            unavailableDateSet.has(d)
          );

          // Vérifier si la catégorie est basée sur la capacité
          const isCapacityBasedCategory = await isCategoryCapacityBased(ctx.db, service.category);

          if (isCapacityBasedCategory) {
            // Mode capacité: vérifier les places disponibles
            const searchStartDate = args.date || args.startDate!;
            const searchEndDate = args.date || args.endDate!;
            const searchSlot = {
              startDate: searchStartDate,
              endDate: searchEndDate,
              startTime: args.time,
              endTime: args.time ? addMinutesToTime(args.time, 60) : undefined,
            };

            const capacityCheck = await checkCapacityAvailability(
              ctx.db,
              announcer._id,
              service.category,
              searchSlot,
              bufferBeforeService,
              bufferAfterService
            );

            capacityInfo = {
              isCapacityBased: true,
              currentCount: capacityCheck.currentCount,
              maxCapacity: capacityCheck.maxCapacity,
              remainingCapacity: capacityCheck.remainingCapacity,
            };

            if (hasManualUnavailability) {
              availability = { status: "unavailable" };
              if (!args.includeUnavailable) continue;
            } else if (!capacityCheck.isAvailable) {
              availability = { status: "unavailable" };
              if (!args.includeUnavailable) continue;
            } else if (capacityCheck.remainingCapacity < capacityCheck.maxCapacity) {
              // Partiellement disponible (certaines places prises)
              availability = { status: "partial" };
            }
          } else {
            // Mode standard: utiliser les missions depuis le cache (filtrées par catégorie)
            const serviceMissions = existingMissions.filter(
              (m) => m.serviceCategory === service.category
            );

            const hasConflictingMission = serviceMissions.some((mission) => {
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

                return missionsOverlapWithBuffers(
                  { startDate: mission.startDate, endDate: mission.endDate, startTime: mission.startTime, endTime: mission.endTime },
                  searchSlot,
                  bufferBeforeService,
                  bufferAfterService
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
                const hasFullDayBlock = serviceMissions.some((m) => {
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
        }

        const categoryData = categoriesMap.get(service.category);

        results.push({
          serviceId: service._id,
          announcerId: announcer._id,
          announcerSlug: announcer.username || announcer.slug || announcer._id, // Username > slug > ID
          firstName: announcer.firstName,
          lastName: announcer.lastName,
          username: announcer.username ?? undefined,
          profileImage: (profile.listingDisplayImage === "logo" && profile.companyLogoUrl)
            ? profile.companyLogoUrl
            : (profile.profileImageUrl ?? profileImageUrl),
          isDisplayingLogo: !!(profile.listingDisplayImage === "logo" && profile.companyLogoUrl),
          coverImage: profile.coverImageUrl ?? null,
          location: profile.city ?? profile.location ?? "",
          coordinates: profile.coordinates ?? null,
          distance,
          rating: 4.5, // TODO: Calculer depuis les avis
          reviewCount: 0, // TODO: Compter les avis
          verified: announcer.accountType === "annonceur_pro",
          isIdentityVerified: profile.isIdentityVerified ?? false,
          statusType,
          categorySlug: service.category,
          categoryName: categoryData?.name ?? service.category,
          categoryIcon: categoryData?.icon ?? "📋",
          basePrice,
          basePriceUnit,
          animalTypes: service.animalTypes,
          serviceLocation: service.serviceLocation as "announcer_home" | "client_home" | "both" | undefined,
          variants: variants.slice(0, 3).map((v) => ({
            id: v._id,
            name: v.name,
            price: v.price,
            unit: v.priceUnit,
          })),
          availability,
          capacityInfo,
          priceRange,
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

    return results.slice(offset, offset + limit);
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

    // Récupérer le profil de l'annonceur pour les buffers (temps de préparation)
    const announcerProfileForBuffers = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.announcerId))
      .first();

    const bufferBeforeBooking = announcerProfileForBuffers?.bufferBefore ?? 0;
    const bufferAfterBooking = announcerProfileForBuffers?.bufferAfter ?? 0;

    // Construire le créneau de la nouvelle mission
    const newMissionSlot = {
      startDate: args.startDate,
      endDate: args.endDate,
      startTime: args.startTime,
      endTime: args.endTime,
    };

    // Vérifier les conflits en tenant compte de la capacité pour les catégories de garde
    const conflictCheckRequest = await checkBookingConflict(
      ctx.db,
      args.announcerId,
      service.category,
      newMissionSlot,
      bufferBeforeBooking,
      bufferAfterBooking
    );

    if (conflictCheckRequest.hasConflict) {
      throw new ConvexError(conflictCheckRequest.conflictMessage || "L'annonceur n'est pas disponible sur ce créneau");
    }

    // Récupérer le profil client pour le téléphone
    const clientProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    const now = Date.now();

    // Déterminer le taux TVA (SAP ou standard)
    let vatRate = 20;
    let isSapApplied = false;

    if (variant.isSapEligible || service.isSapEligible || category?.isSapEligible) {
      const announcerProfileSap = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", args.announcerId))
        .first();

      if (announcerProfileSap?.isSapApproved) {
        const clientProfileSap = await ctx.db
          .query("clientProfiles")
          .withIndex("by_user", (q) => q.eq("userId", session.userId))
          .first();

        if (clientProfileSap?.sapEligibility && clientProfileSap.sapEligibility !== "none" && clientProfileSap.sapEligibilityAttested) {
          vatRate = 10;
          isSapApplied = true;
        }
      }
    }

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
      vatRate,
      isSapApplied,
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

