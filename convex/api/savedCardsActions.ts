// @ts-nocheck
"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import Stripe from "stripe";

/**
 * Crée un Stripe Customer + SetupIntent pour ajouter une carte (sans paiement)
 * Sauvegarde le customerID et le clientSecret via API HTTP Convex
 */
export const createStripeCustomerAndSetupIntent = internalAction({
  args: {
    email: v.string(),
    name: v.string(),
    userId: v.string(),
    stripeSecretKey: v.string(),
    convexUrl: v.string(),
    convexAdminKey: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("=== createStripeCustomerAndSetupIntent START ===");

    const stripe = new Stripe(args.stripeSecretKey, { apiVersion: "2024-12-18.acacia" });

    // Créer le Customer Stripe
    const customer = await stripe.customers.create({
      email: args.email,
      name: args.name,
      metadata: { userId: args.userId },
    });

    console.log("Stripe Customer créé:", customer.id);

    // Sauvegarder stripeCustomerId sur le user via API HTTP Convex
    const convexApiUrl = `${args.convexUrl}/api/mutation`;

    const customerResponse = await fetch(convexApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Convex ${args.convexAdminKey}`,
      },
      body: JSON.stringify({
        path: "api/savedCardsInternal:setStripeCustomerId",
        args: {
          userId: args.userId,
          stripeCustomerId: customer.id,
        },
      }),
    });

    if (!customerResponse.ok) {
      const errorText = await customerResponse.text();
      console.error("Erreur sauvegarde stripeCustomerId:", errorText);
      throw new Error("Impossible de sauvegarder le stripeCustomerId");
    }

    // Créer le SetupIntent
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ["card"],
    });

    console.log("SetupIntent créé:", setupIntent.id);

    // Sauvegarder le clientSecret temporairement sur le user
    const secretResponse = await fetch(convexApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Convex ${args.convexAdminKey}`,
      },
      body: JSON.stringify({
        path: "api/savedCardsInternal:setSetupIntentSecret",
        args: {
          userId: args.userId,
          setupIntentSecret: setupIntent.client_secret,
        },
      }),
    });

    if (!secretResponse.ok) {
      const errorText = await secretResponse.text();
      console.error("Erreur sauvegarde setupIntentSecret:", errorText);
    }

    console.log("=== createStripeCustomerAndSetupIntent END ===");
    return { customerId: customer.id, setupIntentId: setupIntent.id };
  },
});

/**
 * Crée un SetupIntent pour un customer existant
 */
export const createSetupIntent = internalAction({
  args: {
    stripeCustomerId: v.string(),
    userId: v.string(),
    stripeSecretKey: v.string(),
    convexUrl: v.string(),
    convexAdminKey: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("=== createSetupIntent START ===");

    const stripe = new Stripe(args.stripeSecretKey, { apiVersion: "2024-12-18.acacia" });

    const setupIntent = await stripe.setupIntents.create({
      customer: args.stripeCustomerId,
      payment_method_types: ["card"],
    });

    console.log("SetupIntent créé:", setupIntent.id);

    // Sauvegarder le clientSecret temporairement
    const convexApiUrl = `${args.convexUrl}/api/mutation`;
    const response = await fetch(convexApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Convex ${args.convexAdminKey}`,
      },
      body: JSON.stringify({
        path: "api/savedCardsInternal:setSetupIntentSecret",
        args: {
          userId: args.userId,
          setupIntentSecret: setupIntent.client_secret,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erreur sauvegarde setupIntentSecret:", errorText);
    }

    console.log("=== createSetupIntent END ===");
    return { setupIntentId: setupIntent.id };
  },
});

/**
 * Détache une carte côté Stripe
 */
export const detachPaymentMethod = internalAction({
  args: {
    stripePaymentMethodId: v.string(),
    stripeSecretKey: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("=== detachPaymentMethod START ===");

    const stripe = new Stripe(args.stripeSecretKey, { apiVersion: "2024-12-18.acacia" });

    try {
      await stripe.paymentMethods.detach(args.stripePaymentMethodId);
      console.log("PaymentMethod détaché:", args.stripePaymentMethodId);
    } catch (error) {
      console.error("Erreur détachement PaymentMethod:", error);
      // On ne throw pas car la carte est déjà supprimée en base
    }
  },
});

/**
 * Met à jour un PaymentIntent existant pour payer avec une carte sauvegardée
 * puis le confirme
 */
export const updatePaymentIntentForSavedCard = internalAction({
  args: {
    paymentIntentId: v.string(),
    stripePaymentMethodId: v.string(),
    stripeCustomerId: v.string(),
    stripeSecretKey: v.string(),
    convexUrl: v.string(),
    convexAdminKey: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("=== updatePaymentIntentForSavedCard START ===");

    const stripe = new Stripe(args.stripeSecretKey, { apiVersion: "2024-12-18.acacia" });

    // Mettre à jour le PI avec customer + payment_method
    await stripe.paymentIntents.update(args.paymentIntentId, {
      customer: args.stripeCustomerId,
      payment_method: args.stripePaymentMethodId,
    });

    // Confirmer le paiement
    const paymentIntent = await stripe.paymentIntents.confirm(args.paymentIntentId);

    console.log("PaymentIntent confirmé:", paymentIntent.id, "status:", paymentIntent.status);

    // Si le paiement nécessite une action 3DS
    if (paymentIntent.status === "requires_action") {
      return {
        status: "requires_action",
        clientSecret: paymentIntent.client_secret,
      };
    }

    // Si le paiement est réussi, le webhook le gérera
    if (paymentIntent.status === "succeeded") {
      return { status: "succeeded" };
    }

    return { status: paymentIntent.status };
  },
});

/**
 * Ajoute setup_future_usage sur un PI existant (pour sauvegarder la carte lors du paiement)
 * @deprecated Utiliser preparePaymentIntentForSave à la place
 */
export const updatePaymentIntentForSave = internalAction({
  args: {
    paymentIntentId: v.string(),
    stripeCustomerId: v.string(),
    stripeSecretKey: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("=== updatePaymentIntentForSave START ===");

    const stripe = new Stripe(args.stripeSecretKey, { apiVersion: "2024-12-18.acacia" });

    await stripe.paymentIntents.update(args.paymentIntentId, {
      customer: args.stripeCustomerId,
      setup_future_usage: "off_session",
      metadata: {
        saveCard: "true",
      },
    });

    console.log("PaymentIntent mis à jour avec setup_future_usage:", args.paymentIntentId);
    return { success: true };
  },
});

/**
 * Action combinée : crée un customer Stripe si nécessaire + met à jour le PI
 * avec setup_future_usage + signale la complétion via un flag en base
 * Utilisé lors du paiement avec checkbox "Enregistrer cette carte"
 */
export const preparePaymentIntentForSave = internalAction({
  args: {
    userId: v.string(),
    email: v.string(),
    name: v.string(),
    existingCustomerId: v.optional(v.string()),
    paymentIntentId: v.string(),
    stripeSecretKey: v.string(),
    convexUrl: v.string(),
    convexAdminKey: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("=== preparePaymentIntentForSave START ===");

    const stripe = new Stripe(args.stripeSecretKey, { apiVersion: "2024-12-18.acacia" });
    const convexApiUrl = `${args.convexUrl}/api/mutation`;

    let customerId = args.existingCustomerId;

    // 1. Créer le Customer Stripe si nécessaire
    if (!customerId) {
      console.log("Pas de customer Stripe, création...");
      const customer = await stripe.customers.create({
        email: args.email,
        name: args.name,
        metadata: { userId: args.userId },
      });
      customerId = customer.id;
      console.log("Stripe Customer créé:", customerId);

      // Sauvegarder stripeCustomerId sur le user via API HTTP
      const customerResponse = await fetch(convexApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Convex ${args.convexAdminKey}`,
        },
        body: JSON.stringify({
          path: "api/savedCardsInternal:setStripeCustomerId",
          args: { userId: args.userId, stripeCustomerId: customerId },
        }),
      });

      if (!customerResponse.ok) {
        const errorText = await customerResponse.text();
        console.error("Erreur sauvegarde stripeCustomerId:", errorText);
        throw new Error("Impossible de sauvegarder le stripeCustomerId");
      }
    }

    // 2. Mettre à jour le PaymentIntent avec customer + setup_future_usage
    await stripe.paymentIntents.update(args.paymentIntentId, {
      customer: customerId,
      setup_future_usage: "off_session",
      metadata: { saveCard: "true" },
    });

    console.log("PI mis à jour avec setup_future_usage et customer:", args.paymentIntentId);

    // 3. Signaler la complétion via un flag sur le user
    const flagResponse = await fetch(convexApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Convex ${args.convexAdminKey}`,
      },
      body: JSON.stringify({
        path: "api/savedCardsInternal:setSetupIntentSecret",
        args: { userId: args.userId, setupIntentSecret: "SAVE_CARD_READY" },
      }),
    });

    if (!flagResponse.ok) {
      console.error("Erreur signalement complétion:", await flagResponse.text());
    }

    console.log("=== preparePaymentIntentForSave END (ready) ===");
    return { success: true, customerId };
  },
});
