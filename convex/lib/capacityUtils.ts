/**
 * Utilitaires pour la gestion de la capacité des catégories de garde
 *
 * Les catégories "capacity-based" (ex: garde d'animaux) permettent à un annonceur
 * de gérer plusieurs animaux simultanément au lieu de bloquer entièrement le créneau.
 *
 * Le nombre maximum d'animaux est défini dans le profil de l'annonceur (maxAnimalsPerSlot).
 */

import { DatabaseReader } from "../_generated/server";
import { Id, Doc } from "../_generated/dataModel";
import { missionsOverlapWithBuffers } from "./timeUtils";

// Type pour un créneau de mission
interface MissionTimeSlot {
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
}

/**
 * Vérifie si une catégorie est basée sur la capacité (garde d'animaux)
 * @param db - Le contexte de base de données
 * @param categorySlug - Le slug de la catégorie du service
 * @returns true si la catégorie parente est basée sur la capacité
 */
export async function isCategoryCapacityBased(
  db: DatabaseReader,
  categorySlug: string
): Promise<boolean> {
  // Trouver la catégorie par son slug
  const category = await db
    .query("serviceCategories")
    .withIndex("by_slug", (q) => q.eq("slug", categorySlug))
    .first();

  if (!category) return false;

  // Si c'est une sous-catégorie, vérifier la catégorie parente
  if (category.parentCategoryId) {
    const parentCategory = await db.get(category.parentCategoryId);
    return parentCategory?.isCapacityBased === true;
  }

  // Si c'est une catégorie parente, vérifier directement
  return category.isCapacityBased === true;
}

/**
 * Récupère tous les slugs des sous-catégories d'une catégorie parente
 * @param db - Le contexte de base de données
 * @param categorySlug - Le slug de la catégorie (peut être parent ou sous-catégorie)
 * @returns Liste des slugs de toutes les sous-catégories (incluant le slug fourni si c'est une sous-catégorie)
 */
export async function getAllSubcategorySlugs(
  db: DatabaseReader,
  categorySlug: string
): Promise<string[]> {
  // Trouver la catégorie par son slug
  const category = await db
    .query("serviceCategories")
    .withIndex("by_slug", (q) => q.eq("slug", categorySlug))
    .first();

  if (!category) return [categorySlug];

  // Si c'est une sous-catégorie, trouver toutes les sous-catégories de son parent
  if (category.parentCategoryId) {
    const subcategories = await db
      .query("serviceCategories")
      .withIndex("by_parent", (q) => q.eq("parentCategoryId", category.parentCategoryId))
      .collect();
    return subcategories.map((c) => c.slug);
  }

  // Si c'est une catégorie parente, trouver toutes ses sous-catégories
  const subcategories = await db
    .query("serviceCategories")
    .withIndex("by_parent", (q) => q.eq("parentCategoryId", category._id))
    .collect();

  // Retourner les slugs des sous-catégories (ou le slug parent si pas de sous-catégories)
  return subcategories.length > 0 ? subcategories.map((c) => c.slug) : [categorySlug];
}

/**
 * Compte le nombre d'animaux déjà réservés sur un créneau pour une catégorie donnée
 * Pour les catégories capacity-based, compte les animaux sur TOUTES les sous-catégories
 * de la même catégorie parente.
 *
 * @param db - Le contexte de base de données
 * @param announcerId - L'ID de l'annonceur
 * @param categorySlug - Le slug de la catégorie du service
 * @param newSlot - Le créneau de la nouvelle réservation
 * @param bufferBefore - Temps de préparation avant (en minutes)
 * @param bufferAfter - Temps de préparation après (en minutes)
 * @returns Le nombre d'animaux déjà réservés sur le créneau
 */
export async function countAnimalsOnSlot(
  db: DatabaseReader,
  announcerId: Id<"users">,
  categorySlug: string,
  newSlot: MissionTimeSlot,
  bufferBefore: number = 0,
  bufferAfter: number = 0
): Promise<number> {
  // Pour les catégories capacity-based, nous devons compter les animaux
  // sur toutes les sous-catégories de la même catégorie parente
  const categorySlugs = await getAllSubcategorySlugs(db, categorySlug);

  // Récupérer toutes les missions actives pour cet annonceur
  const existingMissions = await db
    .query("missions")
    .withIndex("by_announcer", (q) => q.eq("announcerId", announcerId))
    .filter((q) =>
      q.and(
        q.neq(q.field("status"), "cancelled"),
        q.neq(q.field("status"), "refused")
      )
    )
    .collect();

  // Filtrer les missions par catégorie (toutes les sous-catégories du même parent)
  const relevantMissions = existingMissions.filter((m) =>
    categorySlugs.includes(m.serviceCategory)
  );

  // Compter les missions qui chevauchent le créneau demandé
  let count = 0;
  for (const mission of relevantMissions) {
    const missionSlot = {
      startDate: mission.startDate,
      endDate: mission.endDate,
      startTime: mission.startTime,
      endTime: mission.endTime,
    };

    if (missionsOverlapWithBuffers(missionSlot, newSlot, bufferBefore, bufferAfter)) {
      // Chaque mission = 1 animal (car une mission est pour un seul animal)
      count++;
    }
  }

  return count;
}

/**
 * Vérifie si une nouvelle réservation peut être acceptée selon la capacité
 * @param db - Le contexte de base de données
 * @param announcerId - L'ID de l'annonceur
 * @param categorySlug - Le slug de la catégorie du service
 * @param newSlot - Le créneau de la nouvelle réservation
 * @param bufferBefore - Temps de préparation avant (en minutes)
 * @param bufferAfter - Temps de préparation après (en minutes)
 * @returns Un objet avec les informations de capacité
 */
export async function checkCapacityAvailability(
  db: DatabaseReader,
  announcerId: Id<"users">,
  categorySlug: string,
  newSlot: MissionTimeSlot,
  bufferBefore: number = 0,
  bufferAfter: number = 0
): Promise<{
  isCapacityBased: boolean;
  isAvailable: boolean;
  currentCount: number;
  maxCapacity: number;
  remainingCapacity: number;
}> {
  // Vérifier si la catégorie est basée sur la capacité
  const capacityBased = await isCategoryCapacityBased(db, categorySlug);

  if (!capacityBased) {
    // Catégorie standard - pas de gestion de capacité
    return {
      isCapacityBased: false,
      isAvailable: true, // La disponibilité sera vérifiée par le système standard
      currentCount: 0,
      maxCapacity: 1,
      remainingCapacity: 1,
    };
  }

  // Récupérer le profil de l'annonceur pour maxAnimalsPerSlot
  const profile = await db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", announcerId))
    .first();

  const maxCapacity = profile?.maxAnimalsPerSlot ?? 1; // Défaut: 1 animal à la fois

  // Compter les animaux déjà réservés sur ce créneau
  const currentCount = await countAnimalsOnSlot(
    db,
    announcerId,
    categorySlug,
    newSlot,
    bufferBefore,
    bufferAfter
  );

  const remainingCapacity = Math.max(0, maxCapacity - currentCount);
  const isAvailable = remainingCapacity > 0;

  return {
    isCapacityBased: true,
    isAvailable,
    currentCount,
    maxCapacity,
    remainingCapacity,
  };
}

/**
 * Vérifie les conflits de réservation en tenant compte de la capacité
 * Pour les catégories standard: bloque si chevauchement
 * Pour les catégories capacity-based: bloque uniquement si capacité maximale atteinte
 *
 * @param db - Le contexte de base de données
 * @param announcerId - L'ID de l'annonceur
 * @param categorySlug - Le slug de la catégorie du service
 * @param newSlot - Le créneau de la nouvelle réservation
 * @param bufferBefore - Temps de préparation avant (en minutes)
 * @param bufferAfter - Temps de préparation après (en minutes)
 * @returns Un objet indiquant s'il y a conflit et les détails de capacité
 */
export async function checkBookingConflict(
  db: DatabaseReader,
  announcerId: Id<"users">,
  categorySlug: string,
  newSlot: MissionTimeSlot,
  bufferBefore: number = 0,
  bufferAfter: number = 0
): Promise<{
  hasConflict: boolean;
  isCapacityBased: boolean;
  capacityInfo?: {
    currentCount: number;
    maxCapacity: number;
    remainingCapacity: number;
  };
  conflictMessage?: string;
}> {
  // Vérifier si la catégorie est basée sur la capacité
  const capacityBased = await isCategoryCapacityBased(db, categorySlug);

  if (capacityBased) {
    // Mode capacité: vérifier si la capacité maximale est atteinte
    const capacityCheck = await checkCapacityAvailability(
      db,
      announcerId,
      categorySlug,
      newSlot,
      bufferBefore,
      bufferAfter
    );

    if (!capacityCheck.isAvailable) {
      return {
        hasConflict: true,
        isCapacityBased: true,
        capacityInfo: {
          currentCount: capacityCheck.currentCount,
          maxCapacity: capacityCheck.maxCapacity,
          remainingCapacity: capacityCheck.remainingCapacity,
        },
        conflictMessage: `Capacité maximale atteinte (${capacityCheck.maxCapacity} animaux). L'annonceur ne peut pas accepter plus d'animaux sur ce créneau.`,
      };
    }

    return {
      hasConflict: false,
      isCapacityBased: true,
      capacityInfo: {
        currentCount: capacityCheck.currentCount,
        maxCapacity: capacityCheck.maxCapacity,
        remainingCapacity: capacityCheck.remainingCapacity,
      },
    };
  }

  // Mode standard: vérifier les chevauchements
  const existingMissions = await db
    .query("missions")
    .withIndex("by_announcer", (q) => q.eq("announcerId", announcerId))
    .filter((q) =>
      q.and(
        q.eq(q.field("serviceCategory"), categorySlug),
        q.neq(q.field("status"), "cancelled"),
        q.neq(q.field("status"), "refused")
      )
    )
    .collect();

  for (const mission of existingMissions) {
    const missionSlot = {
      startDate: mission.startDate,
      endDate: mission.endDate,
      startTime: mission.startTime,
      endTime: mission.endTime,
    };

    if (missionsOverlapWithBuffers(missionSlot, newSlot, bufferBefore, bufferAfter)) {
      return {
        hasConflict: true,
        isCapacityBased: false,
        conflictMessage: "L'annonceur a déjà une réservation sur ce créneau (temps de préparation inclus)",
      };
    }
  }

  return {
    hasConflict: false,
    isCapacityBased: false,
  };
}
