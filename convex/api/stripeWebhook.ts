// @ts-nocheck
"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import Stripe from "stripe";
import { createStripeClient } from "../lib/stripeFactory";

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

    const stripe = createStripeClient(stripeSecretKey);

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

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`Paiement réussi: ${paymentIntent.id}`);

        // Récupérer les détails du moyen de paiement (marque + 4 derniers chiffres)
        let cardBrand: string | undefined;
        let cardLast4: string | undefined;
        try {
          if (paymentIntent.latest_charge) {
            const chargeId = typeof paymentIntent.latest_charge === "string"
              ? paymentIntent.latest_charge
              : paymentIntent.latest_charge.id;
            const charge = await stripe.charges.retrieve(chargeId);
            if (charge.payment_method_details?.card) {
              cardBrand = charge.payment_method_details.card.brand || undefined;
              cardLast4 = charge.payment_method_details.card.last4 || undefined;
            }
          }
        } catch (e) {
          console.error("Erreur récupération détails carte:", e);
        }

        // Avec le nouveau système de paiement immédiat, on marque le paiement comme payé
        // et la mission passe en "upcoming"
        await ctx.runMutation(
          internal.api.stripeInternal.markPaymentPaid,
          {
            paymentIntentId: paymentIntent.id,
            stripeCustomerId:
              typeof paymentIntent.customer === "string"
                ? paymentIntent.customer
                : undefined,
            cardBrand,
            cardLast4,
          }
        );
        console.log(`Paiement marqué comme payé pour PaymentIntent: ${paymentIntent.id}`);

        // Si le client a demandé à sauvegarder la carte (metadata.saveCard === "true")
        if (
          paymentIntent.metadata?.saveCard === "true" &&
          paymentIntent.payment_method &&
          typeof paymentIntent.customer === "string"
        ) {
          console.log(`Sauvegarde carte demandée - customer: ${paymentIntent.customer}, pm: ${paymentIntent.payment_method}`);
          try {
            const pmId = typeof paymentIntent.payment_method === "string"
              ? paymentIntent.payment_method
              : paymentIntent.payment_method.id;

            // Attacher explicitement le PM au customer (no-op si déjà attaché via setup_future_usage)
            try {
              await stripe.paymentMethods.attach(pmId, {
                customer: paymentIntent.customer as string,
              });
              console.log(`PM ${pmId} attaché au customer ${paymentIntent.customer}`);
            } catch (attachError: any) {
              // Ignorer si déjà attaché
              if (attachError?.code !== "resource_already_exists") {
                console.warn("Erreur attachement PM (non bloquante):", attachError?.message || attachError);
              }
            }

            const pm = await stripe.paymentMethods.retrieve(pmId);
            if (pm.card) {
              await ctx.runMutation(
                internal.api.savedCardsInternal.savePaymentMethodByCustomer,
                {
                  stripeCustomerId: paymentIntent.customer as string,
                  stripePaymentMethodId: pm.id,
                  brand: pm.card.brand || "unknown",
                  last4: pm.card.last4 || "????",
                  expMonth: pm.card.exp_month,
                  expYear: pm.card.exp_year,
                }
              );
              console.log(`Carte sauvegardée via payment_intent.succeeded: ${pm.id} (${pm.card.brand} **** ${pm.card.last4})`);
            } else {
              console.warn(`PM ${pmId} n'est pas une carte, type: ${pm.type}`);
            }
          } catch (e) {
            console.error("Erreur sauvegarde carte via PI:", e);
          }
        } else if (paymentIntent.metadata?.saveCard === "true") {
          console.warn(`Sauvegarde carte demandée mais conditions non remplies - pm: ${paymentIntent.payment_method}, customer: ${paymentIntent.customer} (type: ${typeof paymentIntent.customer})`);
        }
        break;
      }

      case "setup_intent.succeeded": {
        const setupIntent = event.data.object as Stripe.SetupIntent;
        console.log(`SetupIntent réussi: ${setupIntent.id}`);

        const pmId = typeof setupIntent.payment_method === "string"
          ? setupIntent.payment_method
          : setupIntent.payment_method?.id;

        const customerId = typeof setupIntent.customer === "string"
          ? setupIntent.customer
          : setupIntent.customer?.id;

        if (pmId && customerId) {
          try {
            const pm = await stripe.paymentMethods.retrieve(pmId);
            if (pm.card) {
              await ctx.runMutation(
                internal.api.savedCardsInternal.savePaymentMethodByCustomer,
                {
                  stripeCustomerId: customerId,
                  stripePaymentMethodId: pm.id,
                  brand: pm.card.brand || "unknown",
                  last4: pm.card.last4 || "????",
                  expMonth: pm.card.exp_month,
                  expYear: pm.card.exp_year,
                }
              );
              console.log(`Carte sauvegardée via setup_intent.succeeded: ${pm.id}`);
            }
          } catch (e) {
            console.error("Erreur sauvegarde carte via SI:", e);
          }
        }
        break;
      }

      case "payment_intent.amount_capturable_updated": {
        // Pré-autorisation réussie (Stripe Elements)
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`PaymentIntent pré-autorisé: ${paymentIntent.id}`);

        // Marquer le paiement comme autorisé
        if (paymentIntent.amount_capturable > 0) {
          await ctx.runMutation(
            internal.api.stripeInternal.markPaymentAuthorized,
            {
              paymentIntentId: paymentIntent.id,
              stripeCustomerId:
                typeof paymentIntent.customer === "string"
                  ? paymentIntent.customer
                  : undefined,
            }
          );
          console.log(`Paiement autorisé pour PaymentIntent: ${paymentIntent.id}`);
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        console.log(`Remboursement effectué: ${charge.id}`);

        // Récupérer le PaymentIntent associé
        const paymentIntentId = typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;

        if (paymentIntentId) {
          await ctx.runMutation(internal.api.stripeInternal.markPaymentRefunded, {
            paymentIntentId,
            refundedAmount: charge.amount_refunded,
          });
        }
        break;
      }

      case "refund.created": {
        const refund = event.data.object as Stripe.Refund;
        console.log(`Refund créé: ${refund.id} - statut: ${refund.status}`);

        const piId = typeof refund.payment_intent === "string"
          ? refund.payment_intent
          : refund.payment_intent?.id;

        if (piId) {
          await ctx.runMutation(internal.api.stripeInternal.updateRefundStatus, {
            paymentIntentId: piId,
            refundStatus: (refund.status as any) || "pending",
            refundStripeId: refund.id,
          });
        }
        break;
      }

      case "refund.updated": {
        const refund = event.data.object as Stripe.Refund;
        console.log(`Refund mis à jour: ${refund.id} - statut: ${refund.status}`);

        const piId = typeof refund.payment_intent === "string"
          ? refund.payment_intent
          : refund.payment_intent?.id;

        if (piId) {
          await ctx.runMutation(internal.api.stripeInternal.updateRefundStatus, {
            paymentIntentId: piId,
            refundStatus: (refund.status as any) || "pending",
            refundStripeId: refund.id,
          });
        }
        break;
      }

      case "refund.failed": {
        const refund = event.data.object as Stripe.Refund;
        console.error(`Échec du remboursement: ${refund.id}`);

        const piId = typeof refund.payment_intent === "string"
          ? refund.payment_intent
          : refund.payment_intent?.id;

        if (piId) {
          await ctx.runMutation(internal.api.stripeInternal.updateRefundStatus, {
            paymentIntentId: piId,
            refundStatus: "failed",
            refundStripeId: refund.id,
            failureReason: refund.failure_reason || undefined,
          });
        }
        break;
      }

      case "transfer.created": {
        // En mode "destination charge" (transfer_data sur le PaymentIntent),
        // Stripe émet automatiquement un transfer.created sans metadata.missionId.
        // On log uniquement pour audit — pas d'action métier nécessaire ici.
        const transfer = event.data.object as Stripe.Transfer;
        console.log(`[transfer.created] ${transfer.id} → ${transfer.destination} : ${transfer.amount / 100}€ (no-op)`);
        break;
      }

      case "payout.paid": {
        const payout = event.data.object as Stripe.Payout;
        console.log(`[payout.paid] ${payout.id} - ${payout.amount / 100}€ → ${payout.destination}`);
        await ctx.runMutation(internal.planning.payouts.handlePayoutPaidWebhook, {
          stripePayoutId: payout.id,
          paidAt: payout.arrival_date ? payout.arrival_date * 1000 : Date.now(),
        });
        break;
      }

      case "payout.failed": {
        const payout = event.data.object as Stripe.Payout;
        const reason = payout.failure_message || payout.failure_code || "Échec inconnu";
        console.error(`[payout.failed] ${payout.id} : ${reason}`);
        await ctx.runMutation(internal.planning.payouts.handlePayoutFailedWebhook, {
          stripePayoutId: payout.id,
          failureReason: reason,
        });
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        console.log(`Compte Connect mis à jour: ${account.id}`);

        // Mettre à jour le statut de vérification de l'annonceur
        await ctx.runMutation(internal.api.stripeInternal.updateConnectAccountStatus, {
          stripeAccountId: account.id,
          chargesEnabled: account.charges_enabled || false,
          payoutsEnabled: account.payouts_enabled || false,
          detailsSubmitted: account.details_submitted || false,
        });
        break;
      }

      default:
        console.log(`Événement non géré: ${event.type}`);
    }

    return { received: true };
  },
});
