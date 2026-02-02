// @ts-nocheck
import { query, internalQuery, mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internal } from "../_generated/api";

/**
 * Queries pour Stripe Connect (sans "use node")
 * Les actions sont dans stripeConnect.ts
 */

/**
 * Récupérer les informations du compte Stripe d'un annonceur
 */
export const getAnnouncerStripeInfo = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      return null;
    }

    return {
      hasStripeAccount: !!user.stripeAccountId,
      stripeAccountId: user.stripeAccountId,
      stripeAccountStatus: user.stripeAccountStatus || null,
      chargesEnabled: user.stripeChargesEnabled || false,
      payoutsEnabled: user.stripePayoutsEnabled || false,
      hasIban: !!user.iban,
      ibanLast4: user.ibanLast4 || null,
      ibanMasked: user.iban || null,
      payoutMode: user.payoutMode || "scheduled",
    };
  },
});

/**
 * Query interne pour valider la session annonceur
 */
export const validateAnnouncerSession = internalQuery({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(session.userId);
    if (!user || !user.isActive) {
      return null;
    }

    // Vérifier que c'est un annonceur
    if (user.accountType !== "annonceur_pro" && user.accountType !== "annonceur_particulier") {
      return null;
    }

    return {
      userId: user._id,
      email: user.email,
      stripeAccountId: user.stripeAccountId || null,
    };
  },
});

// ============================================
// MUTATIONS (base de données)
// ============================================

/**
 * Sauvegarder l'ID du compte Stripe dans l'utilisateur
 */
export const saveAccountToUser = internalMutation({
  args: {
    userId: v.id("users"),
    stripeAccountId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("verified"),
      v.literal("restricted"),
      v.literal("disabled")
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.userId, {
      stripeAccountId: args.stripeAccountId,
      stripeAccountStatus: args.status,
      stripeAccountUpdatedAt: now,
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Sauvegarder l'IBAN masqué
 */
export const saveIbanToUser = internalMutation({
  args: {
    userId: v.id("users"),
    iban: v.string(),
    ibanLast4: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.userId, {
      iban: args.iban,
      ibanLast4: args.ibanLast4,
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Mettre à jour le mode de versement d'un annonceur
 */
export const updatePayoutMode = mutation({
  args: {
    sessionToken: v.string(),
    payoutMode: v.union(v.literal("scheduled"), v.literal("instant")),
  },
  handler: async (ctx, args) => {
    // Valider la session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const user = await ctx.db.get(session.userId);
    if (!user || !user.isActive) {
      throw new ConvexError("Utilisateur non trouvé");
    }

    // Vérifier que c'est un annonceur
    if (user.accountType !== "annonceur_pro" && user.accountType !== "annonceur_particulier") {
      throw new ConvexError("Réservé aux annonceurs");
    }

    await ctx.db.patch(session.userId, {
      payoutMode: args.payoutMode,
      updatedAt: Date.now(),
    });

    return { success: true, payoutMode: args.payoutMode };
  },
});

/**
 * Mettre à jour le statut du compte Connect
 */
export const updateAccountStatus = internalMutation({
  args: {
    stripeAccountId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("verified"),
      v.literal("restricted"),
      v.literal("disabled")
    ),
    chargesEnabled: v.boolean(),
    payoutsEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Trouver l'utilisateur avec ce compte Stripe
    const users = await ctx.db.query("users").collect();
    const user = users.find((u: any) => u.stripeAccountId === args.stripeAccountId);

    if (!user) {
      console.log("Utilisateur non trouvé pour compte Stripe:", args.stripeAccountId);
      return { success: false };
    }

    const now = Date.now();

    await ctx.db.patch(user._id, {
      stripeAccountStatus: args.status,
      stripeChargesEnabled: args.chargesEnabled,
      stripePayoutsEnabled: args.payoutsEnabled,
      stripeAccountUpdatedAt: now,
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Mutation publique pour configurer le compte bancaire
 * Reçoit les tokens Stripe créés côté frontend avec Stripe.js
 * (Requis pour les plateformes FR - account tokens obligatoires)
 */
export const setupBankAccount = mutation({
  args: {
    sessionToken: v.string(),
    accountToken: v.string(), // Token créé avec stripe.createToken('account', {...})
    bankAccountToken: v.string(), // Token créé avec stripe.createToken('bank_account', {...})
    firstName: v.string(),
    lastName: v.string(),
    ibanLast4: v.string(), // Pour affichage (les 4 derniers chiffres)
  },
  handler: async (ctx, args) => {
    // Valider la session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide ou expirée. Veuillez vous reconnecter.");
    }

    const user = await ctx.db.get(session.userId);
    if (!user || !user.isActive) {
      throw new ConvexError("Utilisateur non trouvé");
    }

    // Vérifier que c'est un annonceur
    if (user.accountType !== "annonceur_pro" && user.accountType !== "annonceur_particulier") {
      throw new ConvexError("Cette fonctionnalité est réservée aux annonceurs");
    }

    // Récupérer la clé Stripe
    const stripeConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "stripe_secret_key"))
      .first();

    if (!stripeConfig?.value) {
      throw new ConvexError("Stripe n'est pas configuré. Contactez l'administrateur.");
    }

    if (!stripeConfig.value.startsWith("sk_")) {
      throw new ConvexError("La clé Stripe configurée est invalide. Contactez l'administrateur.");
    }

    // Sauvegarder temporairement l'IBAN masqué (sera mis à jour après création du compte)
    const now = Date.now();
    await ctx.db.patch(user._id, {
      ibanLast4: args.ibanLast4,
      iban: `****${args.ibanLast4}`,
      updatedAt: now,
    });

    // Planifier l'action avec les tokens
    await ctx.scheduler.runAfter(0, internal.api.stripeConnect.setupBankAccountAction, {
      userId: user._id,
      email: user.email,
      stripeAccountId: user.stripeAccountId || null,
      stripeSecretKey: stripeConfig.value,
      accountToken: args.accountToken,
      bankAccountToken: args.bankAccountToken,
      firstName: args.firstName,
      lastName: args.lastName,
    });

    return { success: true, message: "Configuration en cours. Veuillez patienter quelques secondes..." };
  },
});
