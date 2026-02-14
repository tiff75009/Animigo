/**
 * Recherche avec Redis GEO
 * Phase 3 - Les calculs de distance sont faits par Redis, pas Convex
 *
 * Flow:
 * 1. Action récupère la config Redis
 * 2. Si Redis configuré → GEORADIUS pour obtenir profileIds + distances
 * 3. Appelle la query Convex avec les profils pré-filtrés
 * 4. Si Redis non configuré → fallback sur la query normale
 */

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";

// Types pour les résultats Redis
interface RedisGeoResult {
  profileId: string;
  distance: number;
}

/**
 * Appelle Redis GEORADIUS pour trouver les profils dans le rayon
 */
async function searchProfilesInRedis(
  redisUrl: string,
  redisToken: string,
  lat: number,
  lng: number,
  radiusKm: number,
  limit: number = 200
): Promise<{ results: RedisGeoResult[]; error?: string }> {
  try {
    const response = await fetch(redisUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        "GEORADIUS",
        "geo:profiles",
        lng.toString(),
        lat.toString(),
        radiusKm.toString(),
        "km",
        "WITHDIST",
        "COUNT",
        limit.toString(),
        "ASC",
      ]),
    });

    if (!response.ok) {
      return { results: [], error: `Redis error: ${response.status}` };
    }

    const data = await response.json();

    // Résultat: [[profileId, distance], [profileId, distance], ...]
    const results = (data.result as string[][] || []).map(([profileId, distanceStr]) => ({
      profileId,
      distance: parseFloat(distanceStr),
    }));

    return { results };
  } catch (error) {
    return {
      results: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Action: Recherche d'annonceurs avec Redis GEO
 * Décharge les calculs de distance vers Redis
 */
export const searchAnnouncersAction = action({
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
  },
  handler: async (ctx, args) => {
    const radius = args.radiusKm ?? 20;
    const limit = args.limit ?? 50;

    // 1. Vérifier si Redis est configuré
    const redisUrl = await ctx.runQuery(api.admin.config.getConfigValue, {
      key: "upstash_redis_rest_url",
    });
    const redisToken = await ctx.runQuery(api.admin.config.getConfigValue, {
      key: "upstash_redis_rest_token",
    });

    let redisDistances: Map<string, number> | null = null;
    let preFilteredProfileIds: string[] | null = null;

    // 2. Si Redis configuré ET coordonnées fournies → utiliser GEORADIUS
    if (redisUrl && redisToken && args.coordinates) {
      const { results, error } = await searchProfilesInRedis(
        redisUrl,
        redisToken,
        args.coordinates.lat,
        args.coordinates.lng,
        radius,
        limit * 3 // Marge pour les filtres supplémentaires
      );

      if (!error && results.length > 0) {
        // Construire la map des distances
        redisDistances = new Map();
        preFilteredProfileIds = [];

        for (const { profileId, distance } of results) {
          redisDistances.set(profileId, distance);
          preFilteredProfileIds.push(profileId);
        }

        console.log(`[Redis GEO] Found ${results.length} profiles in ${radius}km radius`);
      } else if (error) {
        console.warn(`[Redis GEO] Error: ${error}, falling back to Convex`);
      }
    }

    // 3. Appeler la query Convex avec le pré-filtrage Redis
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const announcerResults: any = await ctx.runQuery(api.public.search.searchAnnouncersInternal, {
      ...args,
      // Si Redis a trouvé des résultats, passer les IDs et distances
      redisProfileIds: preFilteredProfileIds ?? undefined,
      redisDistances: redisDistances ? Object.fromEntries(redisDistances) : undefined,
    });

    return announcerResults;
  },
});

/**
 * Action: Recherche de formules avec Redis GEO
 */
export const searchFormulesAction = action({
  args: {
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
  },
  handler: async (ctx, args) => {
    const radius = args.radiusKm ?? 20;
    const limit = args.limit ?? 100;

    // 1. Vérifier si Redis est configuré
    const redisUrl = await ctx.runQuery(api.admin.config.getConfigValue, {
      key: "upstash_redis_rest_url",
    });
    const redisToken = await ctx.runQuery(api.admin.config.getConfigValue, {
      key: "upstash_redis_rest_token",
    });

    let redisDistances: Map<string, number> | null = null;
    let preFilteredProfileIds: string[] | null = null;

    // 2. Si Redis configuré ET coordonnées fournies → utiliser GEORADIUS
    if (redisUrl && redisToken && args.coordinates) {
      const { results, error } = await searchProfilesInRedis(
        redisUrl,
        redisToken,
        args.coordinates.lat,
        args.coordinates.lng,
        radius,
        limit * 5 // Plus de marge car plusieurs formules par profil
      );

      if (!error && results.length > 0) {
        redisDistances = new Map();
        preFilteredProfileIds = [];

        for (const { profileId, distance } of results) {
          redisDistances.set(profileId, distance);
          preFilteredProfileIds.push(profileId);
        }

        console.log(`[Redis GEO] Found ${results.length} profiles for formules search`);
      }
    }

    // 3. Appeler la query Convex
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formuleResults: any = await ctx.runQuery(api.public.search.searchFormulesInternal, {
      ...args,
      redisProfileIds: preFilteredProfileIds ?? undefined,
      redisDistances: redisDistances ? Object.fromEntries(redisDistances) : undefined,
    });

    return formuleResults;
  },
});

/**
 * Action: Recherche de services avec Redis GEO
 */
export const searchServicesAction = action({
  args: {
    categorySlug: v.optional(v.string()),
    excludeCategory: v.optional(v.string()),
    animalType: v.optional(v.string()),
    coordinates: v.optional(v.object({ lat: v.number(), lng: v.number() })),
    radiusKm: v.optional(v.number()),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    includeUnavailable: v.optional(v.boolean()),
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
    serviceLocation: v.optional(v.array(v.union(v.literal("announcer_home"), v.literal("client_home")))),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const radius = args.radiusKm ?? 20;
    const limit = args.limit ?? 100;

    // 1. Vérifier si Redis est configuré
    const redisUrl = await ctx.runQuery(api.admin.config.getConfigValue, {
      key: "upstash_redis_rest_url",
    });
    const redisToken = await ctx.runQuery(api.admin.config.getConfigValue, {
      key: "upstash_redis_rest_token",
    });

    let redisDistances: Map<string, number> | null = null;
    let preFilteredProfileIds: string[] | null = null;

    // 2. Si Redis configuré ET coordonnées fournies → utiliser GEORADIUS
    if (redisUrl && redisToken && args.coordinates) {
      const { results, error } = await searchProfilesInRedis(
        redisUrl,
        redisToken,
        args.coordinates.lat,
        args.coordinates.lng,
        radius,
        limit * 3
      );

      if (!error && results.length > 0) {
        redisDistances = new Map();
        preFilteredProfileIds = [];

        for (const { profileId, distance } of results) {
          redisDistances.set(profileId, distance);
          preFilteredProfileIds.push(profileId);
        }

        console.log(`[Redis GEO] Found ${results.length} profiles for services search`);
      }
    }

    // 3. Appeler la query Convex avec le pré-filtrage Redis
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serviceResults: any = await ctx.runQuery(api.public.search.searchServices, {
      ...args,
      redisProfileIds: preFilteredProfileIds ?? undefined,
      redisDistances: redisDistances ? Object.fromEntries(redisDistances) : undefined,
    });

    return serviceResults;
  },
});
