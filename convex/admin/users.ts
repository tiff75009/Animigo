import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin } from "./utils";
import { internal } from "../_generated/api";

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

// Mutation: Supprimer un utilisateur
export const deleteUser = mutation({
  args: {
    token: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError("Utilisateur non trouvé");

    // Ne pas permettre de supprimer un admin
    if (user.role === "admin") {
      throw new ConvexError("Impossible de supprimer un administrateur");
    }

    // Supprimer toutes les sessions de l'utilisateur
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    // Supprimer les tokens de vérification email
    const emailTokens = await ctx.db
      .query("emailVerificationTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const token of emailTokens) {
      await ctx.db.delete(token._id);
    }

    // Supprimer les animaux de l'utilisateur
    const animals = await ctx.db
      .query("animals")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const animal of animals) {
      await ctx.db.delete(animal._id);
    }

    // Supprimer les pending bookings de l'utilisateur
    const pendingBookings = await ctx.db
      .query("pendingBookings")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    for (const booking of pendingBookings) {
      await ctx.db.delete(booking._id);
    }

    // Supprimer les disponibilités (si annonceur)
    const availabilities = await ctx.db
      .query("availability")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const availability of availabilities) {
      await ctx.db.delete(availability._id);
    }

    // Supprimer l'utilisateur
    await ctx.db.delete(args.userId);

    return { success: true };
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

// Mutation: Activer manuellement un utilisateur (email vérifié + compte actif)
export const activateUserManually = mutation({
  args: {
    token: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError("Utilisateur non trouvé");

    // Ne pas permettre de modifier un admin
    if (user.role === "admin") {
      throw new ConvexError("Impossible de modifier un administrateur");
    }

    // Vérifier si déjà activé
    if (user.emailVerified && user.isActive) {
      throw new ConvexError("Cet utilisateur est déjà activé");
    }

    await ctx.db.patch(args.userId, {
      emailVerified: true,
      isActive: true,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Mutation: Renvoyer un email de confirmation (crée un nouveau token et programme l'envoi)
export const adminResendVerificationEmail = mutation({
  args: {
    token: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError("Utilisateur non trouvé");

    // Ne pas permettre de modifier un admin
    if (user.role === "admin") {
      throw new ConvexError("Impossible de modifier un administrateur");
    }

    // Vérifier si l'email n'est pas déjà vérifié
    if (user.emailVerified) {
      throw new ConvexError("L'email de cet utilisateur est déjà vérifié");
    }

    // Supprimer les anciens tokens pour cet utilisateur
    const oldTokens = await ctx.db
      .query("emailVerificationTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const token of oldTokens) {
      await ctx.db.delete(token._id);
    }

    // Générer un nouveau token (64 chars hex)
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const verificationToken = Array.from(tokenBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Créer le token (expire dans 24h)
    await ctx.db.insert("emailVerificationTokens", {
      userId: args.userId,
      token: verificationToken,
      email: user.email,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      createdAt: Date.now(),
      context: "registration",
    });

    // Récupérer les configs email pour les passer à l'action
    const apiKeyConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "resend_api_key"))
      .first();

    const fromEmailConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "resend_from_email"))
      .first();

    const fromNameConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "resend_from_name"))
      .first();

    const appUrlConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "app_url"))
      .first();

    // Programmer l'envoi d'email
    await ctx.scheduler.runAfter(0, internal.api.email.sendVerificationEmail, {
      userId: args.userId,
      email: user.email,
      firstName: user.firstName,
      token: verificationToken,
      context: "registration",
      emailConfig: apiKeyConfig?.value
        ? {
            apiKey: apiKeyConfig.value,
            fromEmail: fromEmailConfig?.value,
            fromName: fromNameConfig?.value,
          }
        : undefined,
      appUrl: appUrlConfig?.value,
    });

    return { success: true };
  },
});

// Mutation: Envoyer un email de réinitialisation de mot de passe
export const adminSendPasswordResetEmail = mutation({
  args: {
    token: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError("Utilisateur non trouvé");

    // Ne pas permettre de modifier un admin
    if (user.role === "admin") {
      throw new ConvexError("Impossible de modifier un administrateur");
    }

    // Supprimer les anciens tokens pour cet utilisateur
    const oldTokens = await ctx.db
      .query("passwordResetTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const token of oldTokens) {
      await ctx.db.delete(token._id);
    }

    // Générer un nouveau token (64 chars hex)
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const resetToken = Array.from(tokenBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Créer le token (expire dans 1h)
    await ctx.db.insert("passwordResetTokens", {
      userId: args.userId,
      token: resetToken,
      email: user.email,
      expiresAt: Date.now() + 1 * 60 * 60 * 1000, // 1 heure
      createdAt: Date.now(),
      createdByAdmin: true,
    });

    // Récupérer les configs email pour les passer à l'action
    const apiKeyConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "resend_api_key"))
      .first();

    const fromEmailConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "resend_from_email"))
      .first();

    const fromNameConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "resend_from_name"))
      .first();

    const appUrlConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "app_url"))
      .first();

    // Programmer l'envoi d'email
    await ctx.scheduler.runAfter(0, internal.api.email.sendPasswordResetEmail, {
      userId: args.userId,
      email: user.email,
      firstName: user.firstName,
      token: resetToken,
      emailConfig: apiKeyConfig?.value
        ? {
            apiKey: apiKeyConfig.value,
            fromEmail: fromEmailConfig?.value,
            fromName: fromNameConfig?.value,
          }
        : undefined,
      appUrl: appUrlConfig?.value,
    });

    return { success: true };
  },
});
