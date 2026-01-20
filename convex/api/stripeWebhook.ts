// @ts-nocheck
"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import Stripe from "stripe";

/**
 * Traite les événements webhook Stripe
 */
export const handleStripeWebhook = internalAction({
  args: {
    body: v.string(),
    signature: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("=== handleStripeWebhook START ===");

    // Récupérer les secrets depuis la base de données
    const webhookSecret = await ctx.runQuery(
      internal.api.stripeInternal.getStripeWebhookSecret
    );
    const stripeSecretKey = await ctx.runQuery(
      internal.api.stripeInternal.getStripeSecretKey
    );

    if (!webhookSecret) {
      throw new Error("Webhook secret non configuré");
    }

    if (!stripeSecretKey) {
      throw new Error("Clé secrète Stripe non configurée");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-12-18.acacia",
    });

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        args.body,
        args.signature,
        webhookSecret
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      console.error(`Webhook Stripe: Erreur de vérification - ${message}`);
      throw new Error(`Signature invalide: ${message}`);
    }

    console.log(`Webhook Stripe: Événement reçu - ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`Checkout Session complétée: ${session.id}`);

        // Récupérer le PaymentIntent
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id;

        if (paymentIntentId) {
          // Marquer le paiement comme autorisé
          await ctx.runMutation(
            internal.api.stripeInternal.markPaymentAuthorized,
            {
              checkoutSessionId: session.id,
              paymentIntentId,
              stripeCustomerId:
                typeof session.customer === "string"
                  ? session.customer
                  : undefined,
            }
          );
          console.log(`Paiement autorisé pour session: ${session.id}`);
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`Checkout Session expirée: ${session.id}`);

        // Marquer la session comme expirée
        await ctx.runMutation(internal.api.stripeInternal.markSessionExpired, {
          checkoutSessionId: session.id,
        });
        break;
      }

      case "payment_intent.canceled": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`PaymentIntent annulé: ${paymentIntent.id}`);

        // Si on a le missionId dans les metadata
        const missionId = paymentIntent.metadata?.missionId;
        if (missionId) {
          await ctx.runMutation(
            internal.api.stripeInternal.markPaymentCancelled,
            {
              missionId: missionId as any,
              reason: "Annulé via Stripe",
            }
          );
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error(`Paiement échoué: ${paymentIntent.id}`);
        // TODO: Gérer l'échec de paiement (notifier le client)
        break;
      }

      default:
        console.log(`Événement non géré: ${event.type}`);
    }

    return { received: true };
  },
});
