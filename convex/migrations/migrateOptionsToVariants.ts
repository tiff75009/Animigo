/**
 * Migration: Lier les options existantes aux formules
 *
 * Ce script migre les options de services existantes pour:
 * 1. Attribuer un variantId aux options sans variantId (lier à la première formule)
 * 2. Copier les animalTypes du service vers ses formules si elles n'en ont pas
 *
 * À exécuter une seule fois après le déploiement du nouveau schéma.
 */

import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// Migration des options: attribuer variantId à toutes les options sans variantId
export const migrateOptionsToVariants = mutation({
  args: {
    token: v.string(),
    dryRun: v.optional(v.boolean()), // true = simulation sans modification
  },
  handler: async (ctx, args) => {
    // Valider la session admin
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const user = await ctx.db.get(session.userId);
    if (!user || user.role !== "admin") {
      throw new ConvexError("Accès réservé aux administrateurs");
    }

    const isDryRun = args.dryRun === true;
    const results = {
      optionsProcessed: 0,
      optionsMigrated: 0,
      optionsSkipped: 0,
      servicesWithoutVariants: [] as string[],
      errors: [] as string[],
    };

    // Récupérer toutes les options sans variantId
    const allOptions = await ctx.db.query("serviceOptions").collect();
    const optionsWithoutVariant = allOptions.filter((o) => !o.variantId);

    for (const option of optionsWithoutVariant) {
      results.optionsProcessed++;

      try {
        // Trouver la première formule du service
        const variants = await ctx.db
          .query("serviceVariants")
          .withIndex("by_service", (q) => q.eq("serviceId", option.serviceId))
          .collect();

        if (variants.length === 0) {
          results.optionsSkipped++;
          results.servicesWithoutVariants.push(option.serviceId);
          continue;
        }

        // Trier par ordre et prendre la première
        const firstVariant = variants.sort((a, b) => a.order - b.order)[0];

        if (!isDryRun) {
          await ctx.db.patch(option._id, {
            variantId: firstVariant._id,
            updatedAt: Date.now(),
          });
        }

        results.optionsMigrated++;
      } catch (error) {
        results.errors.push(
          `Option ${option._id}: ${error instanceof Error ? error.message : "Erreur inconnue"}`
        );
      }
    }

    return {
      success: true,
      isDryRun,
      results,
      message: isDryRun
        ? `Simulation terminée: ${results.optionsMigrated} options seraient migrées`
        : `Migration terminée: ${results.optionsMigrated} options migrées`,
    };
  },
});

// Migration des animaux: copier les animalTypes du service vers ses formules
export const migrateAnimalsToVariants = mutation({
  args: {
    token: v.string(),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Valider la session admin
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const user = await ctx.db.get(session.userId);
    if (!user || user.role !== "admin") {
      throw new ConvexError("Accès réservé aux administrateurs");
    }

    const isDryRun = args.dryRun === true;
    const results = {
      variantsProcessed: 0,
      variantsMigrated: 0,
      variantsSkipped: 0,
      errors: [] as string[],
    };

    // Récupérer tous les services
    const allServices = await ctx.db.query("services").collect();

    for (const service of allServices) {
      // Si le service n'a pas d'animalTypes, passer
      if (!service.animalTypes || service.animalTypes.length === 0) {
        continue;
      }

      // Récupérer les formules du service
      const variants = await ctx.db
        .query("serviceVariants")
        .withIndex("by_service", (q) => q.eq("serviceId", service._id))
        .collect();

      for (const variant of variants) {
        results.variantsProcessed++;

        try {
          // Si la formule n'a pas d'animalTypes, copier ceux du service
          if (!variant.animalTypes || variant.animalTypes.length === 0) {
            if (!isDryRun) {
              await ctx.db.patch(variant._id, {
                animalTypes: service.animalTypes,
                // Copier aussi les restrictions chiens si définies au niveau service
                dogCategoryAcceptance:
                  variant.dogCategoryAcceptance || service.dogCategoryAcceptance,
                acceptedDogSizes:
                  variant.acceptedDogSizes || service.acceptedDogSizes,
                updatedAt: Date.now(),
              });
            }
            results.variantsMigrated++;
          } else {
            results.variantsSkipped++;
          }
        } catch (error) {
          results.errors.push(
            `Variant ${variant._id}: ${error instanceof Error ? error.message : "Erreur inconnue"}`
          );
        }
      }
    }

    return {
      success: true,
      isDryRun,
      results,
      message: isDryRun
        ? `Simulation terminée: ${results.variantsMigrated} formules seraient migrées`
        : `Migration terminée: ${results.variantsMigrated} formules migrées`,
    };
  },
});

// Migration complète: exécute les deux migrations
export const runFullMigration = mutation({
  args: {
    token: v.string(),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Valider la session admin
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const user = await ctx.db.get(session.userId);
    if (!user || user.role !== "admin") {
      throw new ConvexError("Accès réservé aux administrateurs");
    }

    const isDryRun = args.dryRun === true;
    const now = Date.now();

    // ========== MIGRATION 1: Options vers Variants ==========
    const optionsResults = {
      processed: 0,
      migrated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    const allOptions = await ctx.db.query("serviceOptions").collect();
    const optionsWithoutVariant = allOptions.filter((o) => !o.variantId);

    for (const option of optionsWithoutVariant) {
      optionsResults.processed++;
      try {
        const variants = await ctx.db
          .query("serviceVariants")
          .withIndex("by_service", (q) => q.eq("serviceId", option.serviceId))
          .collect();

        if (variants.length === 0) {
          optionsResults.skipped++;
          continue;
        }

        const firstVariant = variants.sort((a, b) => a.order - b.order)[0];

        if (!isDryRun) {
          await ctx.db.patch(option._id, {
            variantId: firstVariant._id,
            updatedAt: now,
          });
        }
        optionsResults.migrated++;
      } catch (error) {
        optionsResults.errors.push(
          `Option ${option._id}: ${error instanceof Error ? error.message : "Erreur"}`
        );
      }
    }

    // ========== MIGRATION 2: Animaux vers Variants ==========
    const animalsResults = {
      processed: 0,
      migrated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    const allServices = await ctx.db.query("services").collect();

    for (const service of allServices) {
      if (!service.animalTypes || service.animalTypes.length === 0) continue;

      const variants = await ctx.db
        .query("serviceVariants")
        .withIndex("by_service", (q) => q.eq("serviceId", service._id))
        .collect();

      for (const variant of variants) {
        animalsResults.processed++;
        try {
          if (!variant.animalTypes || variant.animalTypes.length === 0) {
            if (!isDryRun) {
              await ctx.db.patch(variant._id, {
                animalTypes: service.animalTypes,
                dogCategoryAcceptance:
                  variant.dogCategoryAcceptance || service.dogCategoryAcceptance,
                acceptedDogSizes:
                  variant.acceptedDogSizes || service.acceptedDogSizes,
                updatedAt: now,
              });
            }
            animalsResults.migrated++;
          } else {
            animalsResults.skipped++;
          }
        } catch (error) {
          animalsResults.errors.push(
            `Variant ${variant._id}: ${error instanceof Error ? error.message : "Erreur"}`
          );
        }
      }
    }

    return {
      success: true,
      isDryRun,
      optionsMigration: optionsResults,
      animalsMigration: animalsResults,
      summary: isDryRun
        ? `Simulation: ${optionsResults.migrated} options et ${animalsResults.migrated} formules seraient migrées`
        : `Migration terminée: ${optionsResults.migrated} options et ${animalsResults.migrated} formules migrées`,
    };
  },
});
