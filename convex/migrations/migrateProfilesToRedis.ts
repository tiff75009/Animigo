// @ts-nocheck
/**
 * Migration: Synchroniser les profils existants avec Redis GEO
 * Phase 3 - Optimisation recherche avec Redis
 *
 * Usage:
 * 1. D'abord configurer Redis dans l'admin (Intégrations > Upstash Redis)
 * 2. npx convex run migrations/migrateProfilesToRedis:checkRedisConnection
 * 3. npx convex run migrations/migrateProfilesToRedis:migrate
 */

import { action, query } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

/**
 * Vérifie la connexion Redis
 */
export const checkRedisConnection = action({
  args: {},
  handler: async (ctx) => {
    // Récupérer la config Redis
    const urlConfig: string | null = await ctx.runQuery(api.admin.config.getConfigValue, {
      key: "upstash_redis_rest_url",
    });
    const tokenConfig: string | null = await ctx.runQuery(api.admin.config.getConfigValue, {
      key: "upstash_redis_rest_token",
    });

    if (!urlConfig || !tokenConfig) {
      return {
        success: false,
        error: "Redis non configuré. Allez dans Admin > Intégrations > Upstash Redis",
      };
    }

    // Tester la connexion
    try {
      const response = await fetch(urlConfig, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenConfig}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(["PING"]),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Erreur Redis: ${response.status}`,
        };
      }

      const data = await response.json();
      if (data.result === "PONG") {
        // Compter les membres actuels
        const countResponse = await fetch(urlConfig, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokenConfig}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(["ZCARD", "geo:profiles"]),
        });
        const countData = await countResponse.json();

        return {
          success: true,
          message: "Connexion Redis OK",
          currentProfilesInRedis: countData.result || 0,
        };
      }

      return {
        success: false,
        error: "Réponse PING invalide",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      };
    }
  },
});

/**
 * Liste les profils à migrer
 */
export const listProfilesToMigrate = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();

    const withCoordinates = profiles.filter((p) => p.coordinates);
    const withoutCoordinates = profiles.filter((p) => !p.coordinates);

    return {
      total: profiles.length,
      withCoordinates: withCoordinates.length,
      withoutCoordinates: withoutCoordinates.length,
      sampleProfiles: withCoordinates.slice(0, 5).map((p) => ({
        id: p._id,
        city: p.city,
        coordinates: p.coordinates,
      })),
    };
  },
});

/**
 * Migration principale - pousse tous les profils vers Redis GEO
 */
export const migrate = action({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 100;

    // Récupérer la config Redis
    const urlConfig: string | null = await ctx.runQuery(api.admin.config.getConfigValue, {
      key: "upstash_redis_rest_url",
    });
    const tokenConfig: string | null = await ctx.runQuery(api.admin.config.getConfigValue, {
      key: "upstash_redis_rest_token",
    });

    if (!urlConfig || !tokenConfig) {
      return {
        success: false,
        error: "Redis non configuré",
        migrated: 0,
      };
    }

    // Récupérer les profils avec coordonnées
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stats: any = await ctx.runQuery(
      api.migrations.migrateProfilesToRedis.listProfilesToMigrate,
      {}
    );

    // Récupérer tous les profils pour migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allProfiles: any[] = await ctx.runQuery(api.migrations.migrateProfilesToRedis.getProfilesForMigration, {
      limit: batchSize,
    });

    let migrated = 0;
    const errors: string[] = [];

    for (const profile of allProfiles) {
      if (!profile.coordinates) continue;

      try {
        const response = await fetch(urlConfig, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokenConfig}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify([
            "GEOADD",
            "geo:profiles",
            profile.coordinates.lng.toString(),
            profile.coordinates.lat.toString(),
            profile.id,
          ]),
        });

        if (response.ok) {
          migrated++;
        } else {
          errors.push(`Erreur pour ${profile.id}: ${response.status}`);
        }
      } catch (error) {
        errors.push(
          `Erreur pour ${profile.id}: ${error instanceof Error ? error.message : "Erreur inconnue"}`
        );
      }
    }

    return {
      success: errors.length === 0,
      migrated,
      total: stats.withCoordinates,
      remaining: stats.withCoordinates - migrated,
      errors: errors.slice(0, 10), // Limiter les erreurs affichées
    };
  },
});

/**
 * Query helper pour récupérer les profils à migrer
 */
export const getProfilesForMigration = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const profiles = await ctx.db.query("profiles").collect();

    return profiles
      .filter((p) => p.coordinates)
      .slice(0, args.limit)
      .map((p) => ({
        id: p._id,
        coordinates: p.coordinates,
      }));
  },
});

/**
 * Vider le set Redis (pour reset)
 */
export const clearRedisGeo = action({
  args: {},
  handler: async (ctx) => {
    const urlConfig: string | null = await ctx.runQuery(api.admin.config.getConfigValue, {
      key: "upstash_redis_rest_url",
    });
    const tokenConfig: string | null = await ctx.runQuery(api.admin.config.getConfigValue, {
      key: "upstash_redis_rest_token",
    });

    if (!urlConfig || !tokenConfig) {
      return { success: false, error: "Redis non configuré" };
    }

    try {
      const response = await fetch(urlConfig, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenConfig}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(["DEL", "geo:profiles"]),
      });

      if (response.ok) {
        return { success: true, message: "Set geo:profiles supprimé" };
      }

      return { success: false, error: `Erreur: ${response.status}` };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      };
    }
  },
});
