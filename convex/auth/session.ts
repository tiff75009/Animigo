// @ts-nocheck
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { hashPassword, verifyPassword } from "./utils";

// Vérifier une session et retourner l'utilisateur
export const getSession = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) {
      return null;
    }

    // Vérifier expiration
    if (session.expiresAt < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(session.userId);

    if (!user || !user.isActive) {
      return null;
    }

    // Récupérer le profil client pour l'adresse
    const clientProfile = await ctx.db
      .query("clientProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        accountType: user.accountType,
        phone: user.phone,
        siret: user.siret,
        companyName: user.companyName,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        role: user.role || "user",
        // Adresse depuis le profil client
        location: clientProfile?.location,
        city: clientProfile?.city,
      },
      session: {
        expiresAt: session.expiresAt,
      },
    };
  },
});

// Déconnexion
export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});

// Déconnecter toutes les sessions d'un utilisateur
export const logoutAll = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const currentSession = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!currentSession) {
      throw new ConvexError("Session invalide");
    }

    const allSessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", currentSession.userId))
      .collect();

    for (const session of allSessions) {
      await ctx.db.delete(session._id);
    }

    return { success: true, count: allSessions.length };
  },
});

// Rafraîchir une session
export const refreshSession = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) {
      throw new ConvexError("Session invalide");
    }

    if (session.expiresAt < Date.now()) {
      await ctx.db.delete(session._id);
      throw new ConvexError("Session expirée");
    }

    // Prolonger la session de 7 jours
    const newExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    await ctx.db.patch(session._id, {
      expiresAt: newExpiresAt,
    });

    return { success: true, expiresAt: newExpiresAt };
  },
});

// Changer le mot de passe
export const changePassword = mutation({
  args: {
    token: v.string(),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    // Vérifier la session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide ou expirée");
    }

    // Récupérer l'utilisateur
    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new ConvexError("Utilisateur non trouvé");
    }

    // Vérifier le mot de passe actuel
    const isValidPassword = await verifyPassword(args.currentPassword, user.passwordHash);
    if (!isValidPassword) {
      throw new ConvexError("Mot de passe actuel incorrect");
    }

    // Valider le nouveau mot de passe
    if (args.newPassword.length < 8) {
      throw new ConvexError("Le nouveau mot de passe doit contenir au moins 8 caractères");
    }

    // Hasher et enregistrer le nouveau mot de passe
    const newPasswordHash = await hashPassword(args.newPassword);

    await ctx.db.patch(user._id, {
      passwordHash: newPasswordHash,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
