/**
 * Redis Client pour Upstash
 * Phase 3 - Cache géographique avec Redis GEO
 */

import { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";

// Type pour le client Redis
interface RedisConfig {
  url: string;
  token: string;
}

/**
 * Récupère la configuration Redis depuis systemConfig
 */
export async function getRedisConfig(
  ctx: QueryCtx | MutationCtx
): Promise<RedisConfig | null> {
  const urlConfig = await ctx.db
    .query("systemConfig")
    .withIndex("by_key", (q) => q.eq("key", "upstash_redis_rest_url"))
    .first();

  const tokenConfig = await ctx.db
    .query("systemConfig")
    .withIndex("by_key", (q) => q.eq("key", "upstash_redis_rest_token"))
    .first();

  if (!urlConfig?.value || !tokenConfig?.value) {
    return null;
  }

  return {
    url: urlConfig.value,
    token: tokenConfig.value,
  };
}

/**
 * Exécute une commande Redis via l'API REST Upstash
 */
export async function redisCommand(
  config: RedisConfig,
  command: string[]
): Promise<{ result: unknown; error?: string }> {
  try {
    const response = await fetch(`${config.url}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { result: null, error: `Redis error: ${response.status} - ${errorText}` };
    }

    const data = await response.json();
    return { result: data.result };
  } catch (error) {
    return {
      result: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * GEOADD - Ajoute un profil avec ses coordonnées
 * Clé: "geo:profiles"
 *
 * @param config Configuration Redis
 * @param profileId ID du profil (membre)
 * @param lat Latitude
 * @param lng Longitude
 */
export async function geoAddProfile(
  config: RedisConfig,
  profileId: string,
  lat: number,
  lng: number
): Promise<{ success: boolean; error?: string }> {
  // GEOADD key longitude latitude member
  const { result, error } = await redisCommand(config, [
    "GEOADD",
    "geo:profiles",
    lng.toString(),
    lat.toString(),
    profileId,
  ]);

  if (error) {
    return { success: false, error };
  }

  return { success: true };
}

/**
 * ZREM - Supprime un profil du set géographique
 *
 * @param config Configuration Redis
 * @param profileId ID du profil à supprimer
 */
export async function geoRemoveProfile(
  config: RedisConfig,
  profileId: string
): Promise<{ success: boolean; error?: string }> {
  const { result, error } = await redisCommand(config, [
    "ZREM",
    "geo:profiles",
    profileId,
  ]);

  if (error) {
    return { success: false, error };
  }

  return { success: true };
}

/**
 * GEORADIUS - Trouve les profils dans un rayon donné
 *
 * @param config Configuration Redis
 * @param lat Latitude du centre
 * @param lng Longitude du centre
 * @param radiusKm Rayon en kilomètres
 * @param limit Nombre max de résultats (défaut: 100)
 * @returns Liste de { profileId, distance } triée par distance
 */
export async function geoSearchProfiles(
  config: RedisConfig,
  lat: number,
  lng: number,
  radiusKm: number,
  limit: number = 100
): Promise<{ results: Array<{ profileId: string; distance: number }>; error?: string }> {
  // GEORADIUS key longitude latitude radius km WITHDIST COUNT limit ASC
  const { result, error } = await redisCommand(config, [
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
  ]);

  if (error) {
    return { results: [], error };
  }

  // Résultat: [[profileId, distance], [profileId, distance], ...]
  const results = (result as string[][] || []).map(([profileId, distanceStr]) => ({
    profileId,
    distance: parseFloat(distanceStr),
  }));

  return { results };
}

/**
 * GEODIST - Calcule la distance entre deux membres
 *
 * @param config Configuration Redis
 * @param profileId1 Premier profil
 * @param profileId2 Deuxième profil
 * @returns Distance en km ou null si un des membres n'existe pas
 */
export async function geoDistance(
  config: RedisConfig,
  profileId1: string,
  profileId2: string
): Promise<{ distance: number | null; error?: string }> {
  const { result, error } = await redisCommand(config, [
    "GEODIST",
    "geo:profiles",
    profileId1,
    profileId2,
    "km",
  ]);

  if (error) {
    return { distance: null, error };
  }

  return { distance: result ? parseFloat(result as string) : null };
}

/**
 * GEOPOS - Récupère les coordonnées d'un membre
 *
 * @param config Configuration Redis
 * @param profileId ID du profil
 * @returns Coordonnées ou null si le membre n'existe pas
 */
export async function geoGetPosition(
  config: RedisConfig,
  profileId: string
): Promise<{ coordinates: { lat: number; lng: number } | null; error?: string }> {
  const { result, error } = await redisCommand(config, [
    "GEOPOS",
    "geo:profiles",
    profileId,
  ]);

  if (error) {
    return { coordinates: null, error };
  }

  // Résultat: [[longitude, latitude]] ou [null]
  const positions = result as (string[] | null)[];
  if (!positions || !positions[0]) {
    return { coordinates: null };
  }

  return {
    coordinates: {
      lng: parseFloat(positions[0][0]),
      lat: parseFloat(positions[0][1]),
    },
  };
}

/**
 * Ping Redis pour tester la connexion
 */
export async function redisPing(
  config: RedisConfig
): Promise<{ success: boolean; error?: string }> {
  const { result, error } = await redisCommand(config, ["PING"]);

  if (error) {
    return { success: false, error };
  }

  return { success: result === "PONG" };
}

/**
 * Compte le nombre de profils dans le set géographique
 */
export async function geoCount(
  config: RedisConfig
): Promise<{ count: number; error?: string }> {
  const { result, error } = await redisCommand(config, [
    "ZCARD",
    "geo:profiles",
  ]);

  if (error) {
    return { count: 0, error };
  }

  return { count: result as number };
}
