import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin } from "./utils";

// Query: Liste des utilisateurs avec pagination et filtres
export const listUsers = query({
  args: {
    token: v.string(),
    accountType: v.optional(v.string()),
    search: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    let users = await ctx.db.query("users").collect();

    // Filtrer par type de compte
    if (args.accountType) {
      users = users.filter((u) => u.accountType === args.accountType);
    }

    // Filtrer par recherche (email, nom, société)
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      users = users.filter(
        (u) =>
          u.email.toLowerCase().includes(searchLower) ||
          u.firstName.toLowerCase().includes(searchLower) ||
          u.lastName.toLowerCase().includes(searchLower) ||
          (u.companyName && u.companyName.toLowerCase().includes(searchLower))
      );
    }

    // Filtrer par statut actif
    if (args.isActive !== undefined) {
      users = users.filter((u) => u.isActive === args.isActive);
    }

    const total = users.length;
    const limit = args.limit || 50;
    const offset = args.offset || 0;

    return {
      users: users.slice(offset, offset + limit).map((u) => ({
        _id: u._id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        accountType: u.accountType,
        phone: u.phone,
        siret: u.siret,
        companyName: u.companyName,
        isActive: u.isActive,
        emailVerified: u.emailVerified,
        createdAt: u.createdAt,
        role: u.role || "user",
      })),
      total,
    };
  },
});

// Mutation: Activer/Désactiver un utilisateur
export const toggleUserActive = mutation({
  args: {
    token: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError("Utilisateur non trouvé");

    // Ne pas permettre de désactiver un admin
    if (user.role === "admin") {
      throw new ConvexError("Impossible de modifier un administrateur");
    }

    await ctx.db.patch(args.userId, {
      isActive: !user.isActive,
      updatedAt: Date.now(),
    });

    // Si désactivation, supprimer toutes les sessions
    if (user.isActive) {
      const sessions = await ctx.db
        .query("sessions")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();

      for (const session of sessions) {
        await ctx.db.delete(session._id);
      }
    }

    return { success: true, isActive: !user.isActive };
  },
});

// Query: Détails d'un utilisateur
export const getUserDetails = query({
  args: {
    token: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError("Utilisateur non trouvé");

    // Compter les sessions actives
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const activeSessions = sessions.filter(
      (s) => s.expiresAt > Date.now()
    ).length;

    return {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      accountType: user.accountType,
      phone: user.phone,
      siret: user.siret,
      companyName: user.companyName,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      role: user.role || "user",
      activeSessions,
    };
  },
});
