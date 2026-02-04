// @ts-nocheck
/**
 * Migration: Ajouter latGrid et lngGrid aux profils existants
 * Phase 1 - Optimisation recherche
 *
 * Usage: npx convex run migrations/migrateProfilesGeoGrid:migrate
 */

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { calculateGeoGrid } from "../lib/geoUtils";

/**
 * Query pour lister les profils sans grille géographique
 */
export const listProfilesWithoutGrid = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();

    const profilesToMigrate = profiles.filter(
      (p) => p.coordinates && (p.latGrid === undefined || p.lngGrid === undefined)
    );

    return {
      total: profiles.length,
      withCoordinates: profiles.filter((p) => p.coordinates).length,
      toMigrate: profilesToMigrate.length,
      profiles: profilesToMigrate.slice(0, 10).map((p) => ({
        id: p._id,
        userId: p.userId,
        city: p.city,
        coordinates: p.coordinates,
      })),
    };
  },
});

/**
 * Mutation pour migrer les profils (par batch)
 */
export const migrate = mutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 100;

    const profiles = await ctx.db.query("profiles").collect();

    const profilesToMigrate = profiles.filter(
      (p) => p.coordinates && (p.latGrid === undefined || p.lngGrid === undefined)
    );

    let migrated = 0;
    const batch = profilesToMigrate.slice(0, batchSize);

    for (const profile of batch) {
      if (profile.coordinates) {
        const { latGrid, lngGrid } = calculateGeoGrid(
          profile.coordinates.lat,
          profile.coordinates.lng
        );

        await ctx.db.patch(profile._id, {
          latGrid,
          lngGrid,
        });
        migrated++;
      }
    }

    return {
      migrated,
      remaining: profilesToMigrate.length - migrated,
      totalToMigrate: profilesToMigrate.length,
    };
  },
});

/**
 * Mutation pour mettre à jour un profil spécifique
 */
export const updateSingleProfile = mutation({
  args: {
    profileId: v.id("profiles"),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) {
      throw new Error("Profile not found");
    }

    if (!profile.coordinates) {
      return { success: false, reason: "No coordinates" };
    }

    const { latGrid, lngGrid } = calculateGeoGrid(
      profile.coordinates.lat,
      profile.coordinates.lng
    );

    await ctx.db.patch(args.profileId, {
      latGrid,
      lngGrid,
    });

    return {
      success: true,
      latGrid,
      lngGrid,
    };
  },
});
