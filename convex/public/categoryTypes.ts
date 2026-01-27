import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Liste les types de catégories actifs (pour le frontend planning)
 * Ne nécessite pas d'authentification admin
 */
export const listActiveTypes = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Vérifier la session si token fourni (optionnel)
    if (args.token) {
      const session = await ctx.db
        .query("sessions")
        .withIndex("by_token", (q) => q.eq("token", args.token!))
        .first();

      if (!session || session.expiresAt < Date.now()) {
        return [];
      }
    }

    const types = await ctx.db
      .query("categoryTypes")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Trier par ordre
    types.sort((a, b) => a.order - b.order);

    return types.map((type) => ({
      _id: type._id,
      id: type._id,
      slug: type.slug,
      name: type.name,
      icon: type.icon,
      color: type.color,
    }));
  },
});
