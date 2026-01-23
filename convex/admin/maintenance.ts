import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./utils";
import { generateUniqueSlug } from "../auth/utils";

/**
 * Régénère les slugs pour TOUS les utilisateurs
 * Format: prenom-ville ou prenom-ville-2 si déjà pris
 * Mutation temporaire pour la migration
 */
export const regenerateAllSlugs = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    // Récupérer tous les utilisateurs
    const allUsers = await ctx.db.query("users").collect();

    let updated = 0;
    let errors = 0;
    const results: Array<{
      userId: string;
      name: string;
      city: string | null;
      oldSlug: string | null;
      newSlug: string;
    }> = [];

    for (const user of allUsers) {
      try {
        // Récupérer le profil pour avoir la ville
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .first();

        const city = profile?.city || null;

        // Générer le nouveau slug (prenom-ville)
        // excludeUserId permet de garder le même slug si déjà correct
        const newSlug = await generateUniqueSlug(
          ctx.db,
          user.firstName,
          city,
          user._id
        );

        // Mettre à jour seulement si différent
        if (newSlug !== user.slug) {
          await ctx.db.patch(user._id, {
            slug: newSlug,
            updatedAt: Date.now(),
          });

          results.push({
            userId: user._id,
            name: `${user.firstName} ${user.lastName}`,
            city,
            oldSlug: user.slug || null,
            newSlug,
          });
          updated++;
        }
      } catch (error) {
        console.error(
          `Erreur pour ${user.firstName} ${user.lastName}:`,
          error
        );
        errors++;
      }
    }

    return {
      total: allUsers.length,
      updated,
      unchanged: allUsers.length - updated - errors,
      errors,
      results,
    };
  },
});

/**
 * Génère les slugs manquants uniquement
 * @deprecated Utiliser regenerateAllSlugs pour le nouveau format
 */
export const generateMissingSlugs = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    // Récupérer tous les utilisateurs sans slug
    const usersWithoutSlug = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("slug"), undefined))
      .collect();

    let generated = 0;
    let errors = 0;
    const results: Array<{ userId: string; name: string; slug: string }> = [];

    for (const user of usersWithoutSlug) {
      try {
        // Récupérer le profil pour avoir la ville
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .first();

        const city = profile?.city || null;

        const slug = await generateUniqueSlug(
          ctx.db,
          user.firstName,
          city
        );

        await ctx.db.patch(user._id, {
          slug,
          updatedAt: Date.now(),
        });

        results.push({
          userId: user._id,
          name: `${user.firstName} ${user.lastName}`,
          slug,
        });
        generated++;
      } catch (error) {
        console.error(
          `Erreur pour ${user.firstName} ${user.lastName}:`,
          error
        );
        errors++;
      }
    }

    return {
      total: usersWithoutSlug.length,
      generated,
      errors,
      results,
    };
  },
});

/**
 * Compte le nombre d'utilisateurs sans slug
 */
export const countUsersWithoutSlug = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const usersWithoutSlug = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("slug"), undefined))
      .collect();

    return {
      count: usersWithoutSlug.length,
    };
  },
});
