/**
 * Batch Loading Utilities
 * Phase 2 - Optimisation recherche : élimination des N+1 queries
 *
 * Ces fonctions chargent les données en batch et retournent des Maps
 * pour un accès O(1) au lieu de queries individuelles.
 */

import { QueryCtx } from "../_generated/server";
import { Id, Doc } from "../_generated/dataModel";

// ============================================================
// Types pour les Maps de cache
// ============================================================

export type ProfilesMap = Map<Id<"users">, Doc<"profiles">>;
export type ServicesMap = Map<Id<"users">, Doc<"services">[]>;
export type PhotosMap = Map<Id<"users">, Doc<"photos"> | null>;
export type AvailabilityMap = Map<Id<"users">, Doc<"availability">[]>;
export type MissionsMap = Map<Id<"users">, Doc<"missions">[]>;
export type CollectiveSlotsMap = Map<Id<"users">, Doc<"collectiveSlots">[]>;
export type CollectiveSlotsByVariantMap = Map<Id<"serviceVariants">, Doc<"collectiveSlots">[]>;
export type VariantsMap = Map<Id<"serviceVariants">, Doc<"serviceVariants">>;
export type VariantsByServiceMap = Map<Id<"services">, Doc<"serviceVariants">[]>;
export type CategoriesMap = Map<string, Doc<"serviceCategories">>;
export type UsersMap = Map<Id<"users">, Doc<"users">>;

// ============================================================
// Batch Loaders
// ============================================================

/**
 * Charge tous les profils pour une liste d'utilisateurs
 */
export async function batchLoadProfiles(
  ctx: QueryCtx,
  userIds: Id<"users">[]
): Promise<ProfilesMap> {
  const profilesMap: ProfilesMap = new Map();

  if (userIds.length === 0) return profilesMap;

  // Charger tous les profils en une seule query
  const allProfiles = await ctx.db.query("profiles").collect();

  // Filtrer et indexer par userId
  for (const profile of allProfiles) {
    if (userIds.includes(profile.userId)) {
      profilesMap.set(profile.userId, profile);
    }
  }

  return profilesMap;
}

/**
 * Charge tous les services actifs pour une liste d'utilisateurs
 */
export async function batchLoadServices(
  ctx: QueryCtx,
  userIds: Id<"users">[]
): Promise<ServicesMap> {
  const servicesMap: ServicesMap = new Map();

  if (userIds.length === 0) return servicesMap;

  // Initialiser les entrées vides
  for (const userId of userIds) {
    servicesMap.set(userId, []);
  }

  // Charger tous les services actifs
  const allServices = await ctx.db
    .query("services")
    .withIndex("by_active", (q) => q.eq("isActive", true))
    .collect();

  // Indexer par userId
  for (const service of allServices) {
    if (userIds.includes(service.userId)) {
      servicesMap.get(service.userId)!.push(service);
    }
  }

  return servicesMap;
}

/**
 * Charge toutes les photos de profil pour une liste d'utilisateurs
 */
export async function batchLoadProfilePhotos(
  ctx: QueryCtx,
  userIds: Id<"users">[]
): Promise<PhotosMap> {
  const photosMap: PhotosMap = new Map();

  if (userIds.length === 0) return photosMap;

  // Initialiser avec null
  for (const userId of userIds) {
    photosMap.set(userId, null);
  }

  // Charger toutes les photos de profil
  const allPhotos = await ctx.db.query("photos").collect();

  // Filtrer les photos de profil et indexer par userId
  for (const photo of allPhotos) {
    if (photo.isProfilePhoto && userIds.includes(photo.userId)) {
      photosMap.set(photo.userId, photo);
    }
  }

  return photosMap;
}

/**
 * Charge toutes les indisponibilités pour une liste d'utilisateurs
 */
export async function batchLoadAvailability(
  ctx: QueryCtx,
  userIds: Id<"users">[]
): Promise<AvailabilityMap> {
  const availabilityMap: AvailabilityMap = new Map();

  if (userIds.length === 0) return availabilityMap;

  // Initialiser les entrées vides
  for (const userId of userIds) {
    availabilityMap.set(userId, []);
  }

  // Charger toutes les disponibilités
  const allAvailability = await ctx.db.query("availability").collect();

  // Indexer par userId
  for (const avail of allAvailability) {
    if (userIds.includes(avail.userId)) {
      availabilityMap.get(avail.userId)!.push(avail);
    }
  }

  return availabilityMap;
}

/**
 * Charge toutes les missions actives pour une liste d'annonceurs
 */
export async function batchLoadMissions(
  ctx: QueryCtx,
  announcerIds: Id<"users">[]
): Promise<MissionsMap> {
  const missionsMap: MissionsMap = new Map();

  if (announcerIds.length === 0) return missionsMap;

  // Initialiser les entrées vides
  for (const announcerId of announcerIds) {
    missionsMap.set(announcerId, []);
  }

  // Charger toutes les missions non annulées/refusées
  const allMissions = await ctx.db.query("missions").collect();

  // Filtrer et indexer par announcerId
  for (const mission of allMissions) {
    if (
      announcerIds.includes(mission.announcerId) &&
      mission.status !== "cancelled" &&
      mission.status !== "refused"
    ) {
      missionsMap.get(mission.announcerId)!.push(mission);
    }
  }

  return missionsMap;
}

/**
 * Charge tous les créneaux collectifs actifs pour une liste d'utilisateurs
 */
export async function batchLoadCollectiveSlots(
  ctx: QueryCtx,
  userIds: Id<"users">[],
  dateFrom: string,
  dateTo: string
): Promise<CollectiveSlotsMap> {
  const slotsMap: CollectiveSlotsMap = new Map();

  if (userIds.length === 0) return slotsMap;

  // Initialiser les entrées vides
  for (const userId of userIds) {
    slotsMap.set(userId, []);
  }

  // Charger tous les créneaux collectifs actifs
  const allSlots = await ctx.db.query("collectiveSlots").collect();

  // Filtrer et indexer par userId
  for (const slot of allSlots) {
    if (
      userIds.includes(slot.userId) &&
      slot.isActive &&
      !slot.isCancelled &&
      slot.date >= dateFrom &&
      slot.date <= dateTo
    ) {
      slotsMap.get(slot.userId)!.push(slot);
    }
  }

  return slotsMap;
}

/**
 * Charge tous les créneaux collectifs actifs indexés par variantId
 */
export async function batchLoadCollectiveSlotsByVariant(
  ctx: QueryCtx,
  variantIds: Id<"serviceVariants">[],
  dateFrom: string,
  dateTo: string
): Promise<CollectiveSlotsByVariantMap> {
  const slotsMap: CollectiveSlotsByVariantMap = new Map();

  if (variantIds.length === 0) return slotsMap;

  // Initialiser les entrées vides
  for (const variantId of variantIds) {
    slotsMap.set(variantId, []);
  }

  // Charger tous les créneaux collectifs actifs
  const allSlots = await ctx.db.query("collectiveSlots").collect();

  // Filtrer et indexer par variantId
  for (const slot of allSlots) {
    if (
      variantIds.includes(slot.variantId) &&
      slot.isActive &&
      !slot.isCancelled &&
      slot.date >= dateFrom &&
      slot.date <= dateTo
    ) {
      slotsMap.get(slot.variantId)!.push(slot);
    }
  }

  return slotsMap;
}

/**
 * Charge tous les variants par leur ID
 */
export async function batchLoadVariants(
  ctx: QueryCtx,
  variantIds: Id<"serviceVariants">[]
): Promise<VariantsMap> {
  const variantsMap: VariantsMap = new Map();

  if (variantIds.length === 0) return variantsMap;

  // Charger tous les variants
  const allVariants = await ctx.db.query("serviceVariants").collect();

  // Indexer par ID
  for (const variant of allVariants) {
    if (variantIds.includes(variant._id)) {
      variantsMap.set(variant._id, variant);
    }
  }

  return variantsMap;
}

/**
 * Charge tous les variants actifs indexés par serviceId
 */
export async function batchLoadVariantsByService(
  ctx: QueryCtx,
  serviceIds: Id<"services">[]
): Promise<VariantsByServiceMap> {
  const variantsMap: VariantsByServiceMap = new Map();

  if (serviceIds.length === 0) return variantsMap;

  // Initialiser les entrées vides
  for (const serviceId of serviceIds) {
    variantsMap.set(serviceId, []);
  }

  // Charger tous les variants actifs
  const allVariants = await ctx.db
    .query("serviceVariants")
    .withIndex("by_active", (q) => q.eq("isActive", true))
    .collect();

  // Indexer par serviceId
  for (const variant of allVariants) {
    if (serviceIds.includes(variant.serviceId)) {
      variantsMap.get(variant.serviceId)!.push(variant);
    }
  }

  return variantsMap;
}

/**
 * Charge toutes les catégories de services
 */
export async function batchLoadCategories(
  ctx: QueryCtx
): Promise<CategoriesMap> {
  const categoriesMap: CategoriesMap = new Map();

  const allCategories = await ctx.db.query("serviceCategories").collect();

  for (const category of allCategories) {
    categoriesMap.set(category.slug, category);
  }

  return categoriesMap;
}

/**
 * Charge tous les utilisateurs par leur ID
 */
export async function batchLoadUsers(
  ctx: QueryCtx,
  userIds: Id<"users">[]
): Promise<UsersMap> {
  const usersMap: UsersMap = new Map();

  if (userIds.length === 0) return usersMap;

  // Charger tous les utilisateurs actifs
  const allUsers = await ctx.db
    .query("users")
    .filter((q) => q.eq(q.field("isActive"), true))
    .collect();

  // Indexer par ID
  for (const user of allUsers) {
    if (userIds.includes(user._id)) {
      usersMap.set(user._id, user);
    }
  }

  return usersMap;
}

/**
 * Résout les URLs de storage pour une Map de photos
 */
export async function resolvePhotoUrls(
  ctx: QueryCtx,
  photosMap: PhotosMap
): Promise<Map<Id<"users">, string | null>> {
  const urlsMap = new Map<Id<"users">, string | null>();

  for (const [userId, photo] of photosMap) {
    if (photo?.storageId) {
      const url = await ctx.storage.getUrl(photo.storageId);
      urlsMap.set(userId, url);
    } else {
      urlsMap.set(userId, null);
    }
  }

  return urlsMap;
}
