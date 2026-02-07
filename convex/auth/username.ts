// @ts-nocheck
import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// Regex de validation username : 3-30 caractères, lettres, chiffres, underscores, tirets
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;

function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username) {
    return { valid: false, error: "Le nom d'utilisateur est requis" };
  }
  if (username.length < 3) {
    return { valid: false, error: "Le nom d'utilisateur doit contenir au moins 3 caractères" };
  }
  if (username.length > 30) {
    return { valid: false, error: "Le nom d'utilisateur ne peut pas dépasser 30 caractères" };
  }
  if (!USERNAME_REGEX.test(username)) {
    return { valid: false, error: "Le nom d'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores" };
  }
  return { valid: true };
}

// Vérifier la disponibilité d'un username (query publique)
export const checkUsernameAvailability = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const username = args.username.toLowerCase().trim();

    // Valider le format
    const validation = validateUsername(username);
    if (!validation.valid) {
      return { available: false, error: validation.error };
    }

    // Chercher si le username existe déjà
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .first();

    if (existing) {
      // Générer une suggestion
      const suggestion = `${username}${Math.floor(Math.random() * 999) + 1}`;
      return { available: false, suggestion };
    }

    return { available: true };
  },
});

// Mettre à jour les informations utilisateur (username, firstName, lastName, phone)
export const updateUserInfo = mutation({
  args: {
    sessionToken: v.string(),
    username: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Valider la session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide ou expirée");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new ConvexError("Utilisateur non trouvé");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    // Valider et mettre à jour le username si fourni
    if (args.username !== undefined) {
      const username = args.username.toLowerCase().trim();
      const validation = validateUsername(username);
      if (!validation.valid) {
        throw new ConvexError(validation.error!);
      }

      // Vérifier unicité (sauf si c'est le même)
      if (username !== user.username) {
        const existing = await ctx.db
          .query("users")
          .withIndex("by_username", (q) => q.eq("username", username))
          .first();

        if (existing) {
          throw new ConvexError("Ce nom d'utilisateur est déjà pris");
        }
      }

      updates.username = username;
    }

    if (args.firstName !== undefined) {
      updates.firstName = args.firstName.trim();
    }

    if (args.lastName !== undefined) {
      updates.lastName = args.lastName.trim();
    }

    if (args.phone !== undefined) {
      updates.phone = args.phone.replace(/\s/g, "");
    }

    await ctx.db.patch(user._id, updates);

    return { success: true };
  },
});
