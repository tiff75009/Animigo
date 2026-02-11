// @ts-nocheck
import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

/**
 * Liste les cartes sauvegardées de l'utilisateur
 */
export const getSavedCards = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return [];
    }

    const cards = await ctx.db
      .query("savedPaymentMethods")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .collect();

    return cards.map((card) => ({
      id: card._id,
      brand: card.brand,
      last4: card.last4,
      expMonth: card.expMonth,
      expYear: card.expYear,
      isDefault: card.isDefault,
    }));
  },
});

/**
 * Définir une carte comme carte par défaut
 */
export const setDefaultCard = mutation({
  args: {
    token: v.string(),
    cardId: v.id("savedPaymentMethods"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Session invalide");
    }

    const card = await ctx.db.get(args.cardId);
    if (!card || card.userId !== session.userId) {
      throw new Error("Carte non trouvée");
    }

    const now = Date.now();

    // Retirer isDefault de toutes les cartes du user
    const allCards = await ctx.db
      .query("savedPaymentMethods")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .collect();

    for (const c of allCards) {
      if (c.isDefault) {
        await ctx.db.patch(c._id, { isDefault: false, updatedAt: now });
      }
    }

    // Mettre isDefault sur la carte choisie
    await ctx.db.patch(args.cardId, { isDefault: true, updatedAt: now });

    return { success: true };
  },
});

/**
 * Supprimer une carte
 */
export const deleteCard = mutation({
  args: {
    token: v.string(),
    cardId: v.id("savedPaymentMethods"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Session invalide");
    }

    const card = await ctx.db.get(args.cardId);
    if (!card || card.userId !== session.userId) {
      throw new Error("Carte non trouvée");
    }

    // Récupérer la clé Stripe pour détacher côté Stripe
    const stripeSecretKeyConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "stripe_secret_key"))
      .first();

    if (stripeSecretKeyConfig?.value) {
      await ctx.scheduler.runAfter(0, internal.api.savedCardsActions.detachPaymentMethod, {
        stripePaymentMethodId: card.stripePaymentMethodId,
        stripeSecretKey: stripeSecretKeyConfig.value,
      });
    }

    const wasDefault = card.isDefault;
    await ctx.db.delete(args.cardId);

    // Si c'était la carte par défaut, promouvoir la première restante
    if (wasDefault) {
      const remaining = await ctx.db
        .query("savedPaymentMethods")
        .withIndex("by_user", (q) => q.eq("userId", session.userId))
        .first();

      if (remaining) {
        await ctx.db.patch(remaining._id, { isDefault: true, updatedAt: Date.now() });
      }
    }

    return { success: true };
  },
});

/**
 * Vérifie le statut du Stripe Customer et du SetupIntent
 */
export const getSetupIntentStatus = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(session.userId);
    if (!user) return null;

    return {
      hasCustomer: !!user.stripeCustomerId,
      stripeCustomerId: user.stripeCustomerId,
      clientSecret: user.pendingSetupIntentSecret || null,
    };
  },
});

/**
 * Déclenche l'ajout d'une carte (crée customer si besoin + SetupIntent)
 */
export const initiateAddCard = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Session invalide");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("Utilisateur non trouvé");
    }

    // Récupérer les configs nécessaires
    const stripeSecretKeyConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "stripe_secret_key"))
      .first();

    const convexUrlConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "convex_url"))
      .first();

    const convexAdminKeyConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "convex_admin_key"))
      .first();

    if (!stripeSecretKeyConfig?.value || !convexUrlConfig?.value || !convexAdminKeyConfig?.value) {
      throw new Error("Configuration Stripe manquante");
    }

    // Nettoyer un éventuel ancien secret
    await ctx.db.patch(user._id, {
      pendingSetupIntentSecret: undefined,
      updatedAt: Date.now(),
    });

    if (!user.stripeCustomerId) {
      // Pas de customer → créer customer + SetupIntent
      await ctx.scheduler.runAfter(0, internal.api.savedCardsActions.createStripeCustomerAndSetupIntent, {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        userId: user._id,
        stripeSecretKey: stripeSecretKeyConfig.value,
        convexUrl: convexUrlConfig.value,
        convexAdminKey: convexAdminKeyConfig.value,
      });

      return { status: "creating_customer" };
    } else {
      // Customer existe → créer SetupIntent directement
      await ctx.scheduler.runAfter(0, internal.api.savedCardsActions.createSetupIntent, {
        stripeCustomerId: user.stripeCustomerId,
        userId: user._id,
        stripeSecretKey: stripeSecretKeyConfig.value,
        convexUrl: convexUrlConfig.value,
        convexAdminKey: convexAdminKeyConfig.value,
      });

      return { status: "creating_setup" };
    }
  },
});

/**
 * Nettoie le SetupIntent secret après usage (appelé par le frontend)
 */
export const clearSetupIntent = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return;
    }

    await ctx.db.patch(session.userId, {
      pendingSetupIntentSecret: undefined,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Payer avec une carte sauvegardée
 */
export const payWithSavedCard = mutation({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
    savedCardId: v.id("savedPaymentMethods"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Session invalide");
    }

    const user = await ctx.db.get(session.userId);
    if (!user || !user.stripeCustomerId) {
      throw new Error("Pas de compte Stripe associé");
    }

    const mission = await ctx.db.get(args.missionId);
    if (!mission || mission.clientId !== session.userId) {
      throw new Error("Mission non trouvée");
    }

    const card = await ctx.db.get(args.savedCardId);
    if (!card || card.userId !== session.userId) {
      throw new Error("Carte non trouvée");
    }

    // Récupérer le paiement associé
    const payment = mission.stripePaymentId
      ? await ctx.db.get(mission.stripePaymentId)
      : null;

    if (!payment || !payment.paymentIntentId) {
      throw new Error("Paiement non trouvé ou pas encore initialisé");
    }

    // Récupérer les configs
    const stripeSecretKeyConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "stripe_secret_key"))
      .first();

    const convexUrlConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "convex_url"))
      .first();

    const convexAdminKeyConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "convex_admin_key"))
      .first();

    if (!stripeSecretKeyConfig?.value || !convexUrlConfig?.value || !convexAdminKeyConfig?.value) {
      throw new Error("Configuration Stripe manquante");
    }

    // Lancer l'action pour payer avec la carte sauvegardée
    await ctx.scheduler.runAfter(0, internal.api.savedCardsActions.updatePaymentIntentForSavedCard, {
      paymentIntentId: payment.paymentIntentId,
      stripePaymentMethodId: card.stripePaymentMethodId,
      stripeCustomerId: user.stripeCustomerId,
      stripeSecretKey: stripeSecretKeyConfig.value,
      convexUrl: convexUrlConfig.value,
      convexAdminKey: convexAdminKeyConfig.value,
    });

    return { status: "processing", clientSecret: payment.clientSecret };
  },
});

/**
 * Prépare un paiement pour sauvegarder la carte (crée customer si besoin + ajoute setup_future_usage au PI)
 * Le frontend doit poll getSetupIntentStatus et attendre clientSecret === "SAVE_CARD_READY" avant de confirmer le paiement
 */
export const preparePaymentForSave = mutation({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Session invalide");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("Utilisateur non trouvé");
    }

    const mission = await ctx.db.get(args.missionId);
    if (!mission || mission.clientId !== session.userId) {
      throw new Error("Mission non trouvée");
    }

    const payment = mission.stripePaymentId
      ? await ctx.db.get(mission.stripePaymentId)
      : null;

    if (!payment || !payment.paymentIntentId) {
      throw new Error("Paiement non trouvé");
    }

    // Récupérer les configs
    const stripeSecretKeyConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "stripe_secret_key"))
      .first();

    const convexUrlConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "convex_url"))
      .first();

    const convexAdminKeyConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "convex_admin_key"))
      .first();

    if (!stripeSecretKeyConfig?.value || !convexUrlConfig?.value || !convexAdminKeyConfig?.value) {
      throw new Error("Configuration Stripe manquante");
    }

    // Nettoyer tout flag précédent
    await ctx.db.patch(user._id, {
      pendingSetupIntentSecret: undefined,
      updatedAt: Date.now(),
    });

    // Action combinée : crée customer si besoin + update PI + signale complétion
    await ctx.scheduler.runAfter(0, internal.api.savedCardsActions.preparePaymentIntentForSave, {
      userId: user._id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      existingCustomerId: user.stripeCustomerId || undefined,
      paymentIntentId: payment.paymentIntentId,
      stripeSecretKey: stripeSecretKeyConfig.value,
      convexUrl: convexUrlConfig.value,
      convexAdminKey: convexAdminKeyConfig.value,
    });

    return { status: "preparing" };
  },
});
