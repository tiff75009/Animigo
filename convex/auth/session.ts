// @ts-nocheck
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

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
