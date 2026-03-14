// @ts-nocheck
"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import Stripe from "stripe";
import { createStripeClient } from "../lib/stripeFactory";
import { formatPrice, formatDate } from "../lib/formatting";

/**
 * Helper pour récupérer le client Stripe depuis la config Convex.
 */
async function getStripeClient(ctx: any): Promise<Stripe> {
  const secretKey = await ctx.runQuery(
    internal.api.stripeInternal.getStripeSecretKey
  );
  if (!secretKey) {
    throw new Error("Stripe non configuré - clé secrète manquante");
  }
  return createStripeClient(secretKey);
}

/**
 * Créer un PaymentIntent pour Stripe Elements (paiement intégré)
 * NOTE: Sur Convex self-hosted, les actions ne peuvent pas appeler runMutation ni scheduler
 * donc on utilise l'API HTTP Convex directement pour mettre à jour la base
 */
export const createPaymentIntent = internalAction({
  args: {
    missionId: v.id("missions"),
    amount: v.number(), // centimes — montant total payé par le client
    platformFee: v.number(), // centimes — commission plateforme
    announcerEarnings: v.number(), // centimes — revenus annonceur
    stripeFee: v.optional(v.number()), // centimes — frais Stripe
    stripeAccountId: v.optional(v.string()), // compte Connect annonceur (acct_xxx)
    clientEmail: v.string(),
    clientName: v.string(),
    serviceName: v.string(),
    announcerName: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    animalName: v.optional(v.string()),
    // Config
    stripeSecretKey: v.string(),
    appUrl: v.string(),
    convexUrl: v.string(), // URL Convex self-hosted
    convexAdminKey: v.string(), // Admin key pour l'API HTTP Convex
    // Cartes sauvegardées
    stripeCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log("=== createPaymentIntent START ===");

    try {
      const stripe = createStripeClient(args.stripeSecretKey);
      const appUrl = args.appUrl || "http://localhost:3000";

      // Créer le PaymentIntent avec paiement immédiat
      // Si l'annonceur a un compte Connect, utiliser les destination charges
      // pour que le paiement soit associé à son compte dès l'encaissement
      const applicationFee = args.platformFee + (args.stripeFee || 0); // Commission + frais Stripe retenus par la plateforme

      const piCreateParams: any = {
        amount: args.amount,
        currency: "eur",
        payment_method_types: ["card"],
        receipt_email: args.clientEmail,
        metadata: {
          missionId: args.missionId,
          platformFee: args.platformFee.toString(),
          announcerEarnings: args.announcerEarnings.toString(),
        },
        description: `${args.serviceName} - ${args.animalName || "Service"} avec ${args.announcerName}`,
      };

      // Destination charge : associer le paiement au compte Connect de l'annonceur
      if (args.stripeAccountId) {
        piCreateParams.transfer_data = {
          destination: args.stripeAccountId,
        };
        // application_fee_amount = ce que la plateforme retient (commission + frais Stripe)
        piCreateParams.application_fee_amount = applicationFee;
      }

      // Si le client a un Stripe Customer, l'attacher au PI
      if (args.stripeCustomerId) {
        piCreateParams.customer = args.stripeCustomerId;
      }

      // DEBUG: Log les paramètres de destination charge
      console.log("stripeAccountId:", args.stripeAccountId || "NONE");
      console.log("transfer_data:", piCreateParams.transfer_data ? JSON.stringify(piCreateParams.transfer_data) : "NONE");
      console.log("application_fee_amount:", piCreateParams.application_fee_amount || "NONE");

      const paymentIntent = await stripe.paymentIntents.create(piCreateParams);

      console.log("PaymentIntent created:", paymentIntent.id);
      console.log("PI transfer_data:", paymentIntent.transfer_data ? JSON.stringify(paymentIntent.transfer_data) : "NULL");

      // Mettre à jour le payment record via l'API HTTP Convex
      // (car scheduler/runMutation ne fonctionnent pas sur Convex self-hosted)
      const convexApiUrl = `${args.convexUrl}/api/mutation`;
      const updateResponse = await fetch(convexApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Convex ${args.convexAdminKey}`,
        },
        body: JSON.stringify({
          path: "api/stripeInternal:updatePaymentIntentDetailsDirect",
          args: {
            missionId: args.missionId,
            paymentIntentId: paymentIntent.id,
            clientSecret: paymentIntent.client_secret,
          },
        }),
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error("Failed to update payment intent details via Convex API:", errorText);
        // Ne pas throw - le PaymentIntent est créé, on continue
      } else {
        const result = await updateResponse.json();
        console.log("Payment intent details updated via Convex API:", result);
      }

      // URL de paiement interne
      const paymentUrl = `${appUrl}/client/paiement/${args.missionId}`;

      // Note: l'email "reservation_accepted" est maintenant envoyé depuis acceptMission
      // via internal.api.email.sendReservationAcceptedEmail

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        paymentUrl,
      };
    } catch (error) {
      console.error("Erreur createPaymentIntent:", error);
      throw error;
    }
  },
});

/**
 * Créer une Checkout Session avec PaymentIntent en mode capture manuelle
 */
export const createCheckoutSession = internalAction({
  args: {
    missionId: v.id("missions"),
    amount: v.number(), // centimes
    platformFee: v.number(), // centimes
    announcerEarnings: v.number(), // centimes
    clientEmail: v.string(),
    clientName: v.string(),
    serviceName: v.string(),
    announcerName: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    animalName: v.optional(v.string()),
    // Config passée depuis la mutation (contourne le bug ctx.runQuery sur self-hosted)
    stripeSecretKey: v.string(),
    appUrl: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("=== createCheckoutSession START ===");
    console.log("Args:", {
      missionId: args.missionId,
      amount: args.amount,
      clientEmail: args.clientEmail,
    });

    try {
      // Utiliser la clé passée en paramètre
      const stripe = createStripeClient(args.stripeSecretKey);
      const appUrl = args.appUrl || "http://localhost:3000";

      const startDateFormatted = formatDate(args.startDate);
      const endDateFormatted = formatDate(args.endDate);
      const dateRange =
        args.startDate === args.endDate
          ? startDateFormatted
          : `Du ${startDateFormatted} au ${endDateFormatted}`;

      // Créer la Checkout Session
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_intent_data: {
          // Plus de capture_method: "manual" - paiement immédiat
          metadata: {
            missionId: args.missionId,
            platformFee: args.platformFee.toString(),
            announcerEarnings: args.announcerEarnings.toString(),
          },
        },
        line_items: [
          {
            price_data: {
              currency: "eur",
              unit_amount: args.amount,
              product_data: {
                name: args.serviceName,
                description: `${dateRange}${args.animalName ? ` - ${args.animalName}` : ""} avec ${args.announcerName}`,
              },
            },
            quantity: 1,
          },
        ],
        customer_email: args.clientEmail,
        expires_at: Math.floor(Date.now() / 1000) + 3600, // +1h
        success_url: `${appUrl}/paiement/succes?mission=${args.missionId}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/paiement/annule?mission=${args.missionId}`,
        metadata: {
          missionId: args.missionId,
        },
      });

      console.log("Checkout Session created:", session.id);

      // Note: l'email "reservation_accepted" est maintenant envoyé depuis acceptMission
      // via internal.api.email.sendReservationAcceptedEmail

      return {
        success: true,
        checkoutUrl: session.url,
        sessionId: session.id,
      };
    } catch (error) {
      console.error("Erreur createCheckoutSession:", error);
      throw error;
    }
  },
});

/**
 * Génère le HTML de l'email de paiement (template fallback).
 * Source unique pour éviter la duplication du template.
 */
function buildPaymentEmailHtml(params: {
  clientFirstName: string;
  announcerName: string;
  serviceName: string;
  startDate: string;
  endDate: string;
  animalName?: string;
  amount: number;
  paymentUrl: string;
  siteName: string;
}): string {
  const { clientFirstName, announcerName, serviceName, startDate, endDate, animalName, amount, paymentUrl, siteName } = params;
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <div style="background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Bonne nouvelle !</h1>
      <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Votre réservation a été acceptée</p>
    </div>
    <div style="padding: 40px 30px;">
      <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px;">Bonjour ${clientFirstName} !</h2>
      <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
        ${announcerName} a accepté votre demande de réservation. Pour confirmer définitivement votre prestation, veuillez procéder au paiement sécurisé.
      </p>
      <div style="margin: 20px 0; padding: 20px; background-color: #f0f9ff; border-radius: 12px; border-left: 4px solid #0ea5e9;">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #0369a1;">Récapitulatif</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Service :</strong> ${serviceName}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Prestataire :</strong> ${announcerName}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Dates :</strong> Du ${formatDate(startDate)} au ${formatDate(endDate)}</p>
        ${animalName ? `<p style="margin: 5px 0; color: #475569;"><strong>Animal :</strong> ${animalName}</p>` : ""}
        <p style="margin: 10px 0 0 0; font-size: 20px; font-weight: bold; color: #0369a1;">Montant : ${formatPrice(amount)}</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${paymentUrl}" style="display: inline-block; background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: bold; font-size: 16px;">Procéder au paiement</a>
      </div>
      <div style="margin-top: 20px; padding: 15px; background-color: #fef3c7; border-radius: 12px;">
        <p style="margin: 0; color: #92400e; font-size: 14px;"><strong>Important :</strong> Ce lien expire dans 1 heure.</p>
      </div>
      <div style="margin-top: 20px; padding: 15px; background-color: #ecfdf5; border-radius: 12px;">
        <p style="margin: 0; color: #065f46; font-size: 14px;"><strong>Paiement sécurisé :</strong> Votre paiement sera encaissé immédiatement pour confirmer la réservation.</p>
      </div>
    </div>
    <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; color: #94a3b8; font-size: 12px;">&copy; 2025 ${siteName}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`;
}

/**
 * Envoie un email via Resend. Helper interne partagé.
 */
async function sendEmailViaResend(params: {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${params.fromName} <${params.fromEmail}>`,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });

    const responseText = await response.text();
    if (!response.ok) {
      console.error("Erreur envoi email:", responseText);
      return { success: false, error: responseText };
    }

    const result = JSON.parse(responseText);
    console.log("Email envoyé:", result.id);
    return { success: true, id: result.id };
  } catch (error) {
    console.error("Erreur envoi email:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Envoyer l'email de demande de paiement.
 * Utilise le template "reservation_accepted" si disponible, sinon fallback HTML.
 */
export const sendPaymentEmail = internalAction({
  args: {
    missionId: v.id("missions"),
    clientEmail: v.string(),
    clientName: v.string(),
    serviceName: v.string(),
    announcerName: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    animalName: v.optional(v.string()),
    amount: v.number(),
    paymentUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const configs = await ctx.runQuery(internal.api.emailInternal.getEmailConfigs);
    if (!configs.apiKey) {
      return { success: false, error: "Email service not configured" };
    }

    const fromEmail = configs.fromEmail || "onboarding@resend.dev";
    const fromName = configs.fromName || "Animigo";
    const siteName = "Animigo";
    const clientFirstName = args.clientName.split(" ")[0];

    // Essayer le template DB en priorité
    const template = await ctx.runQuery(
      internal.admin.emailTemplates.getTemplateBySlug,
      { slug: "reservation_accepted" }
    );

    const variables: Record<string, string> = {
      firstName: clientFirstName,
      siteName,
      announcerName: args.announcerName,
      serviceName: args.serviceName,
      startDate: formatDate(args.startDate),
      endDate: formatDate(args.endDate),
      animalName: args.animalName || "",
      paymentUrl: args.paymentUrl,
      totalAmount: formatPrice(args.amount),
      expirationTime: "1 heure",
    };

    let subject: string;
    let html: string;

    if (template?.htmlContent) {
      const replaceVars = (text: string) =>
        text.replace(/\{\{(\w+)\}\}/g, (match, key) => variables[key] ?? match);
      subject = replaceVars(template.subject);
      html = replaceVars(template.htmlContent);
    } else {
      subject = `Votre réservation a été acceptée - Finalisez le paiement - ${siteName}`;
      html = buildPaymentEmailHtml({
        clientFirstName, ...args, siteName,
      });
    }

    const result = await sendEmailViaResend({
      apiKey: configs.apiKey, fromEmail, fromName,
      to: args.clientEmail, subject, html,
    });

    if (result.success && result.id) {
      await ctx.runMutation(internal.api.emailInternal.logEmail, {
        to: args.clientEmail,
        from: `${fromName} <${fromEmail}>`,
        subject,
        template: "reservation_accepted",
        status: "sent",
        resendId: result.id,
      });
    }

    return result;
  },
});

/**
 * Envoyer l'email de demande de paiement (version directe, config passée en params).
 * Même template que sendPaymentEmail, sans appels runQuery/runMutation.
 */
export const sendPaymentEmailDirect = internalAction({
  args: {
    clientEmail: v.string(),
    clientName: v.string(),
    serviceName: v.string(),
    announcerName: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    animalName: v.optional(v.string()),
    amount: v.number(),
    paymentUrl: v.string(),
    emailConfig: v.optional(v.object({
      apiKey: v.string(),
      fromEmail: v.optional(v.string()),
      fromName: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const apiKey = args.emailConfig?.apiKey;
    if (!apiKey) {
      return { success: false, error: "Email service not configured" };
    }

    const fromEmail = args.emailConfig?.fromEmail || "onboarding@resend.dev";
    const fromName = args.emailConfig?.fromName || "Animigo";
    const siteName = "Animigo";
    const clientFirstName = args.clientName.split(" ")[0];

    return sendEmailViaResend({
      apiKey, fromEmail, fromName,
      to: args.clientEmail,
      subject: `Votre réservation a été acceptée - Finalisez le paiement - ${siteName}`,
      html: buildPaymentEmailHtml({
        clientFirstName, ...args, siteName,
      }),
    });
  },
});

/**
 * Récupère l'URL du reçu Stripe depuis un PaymentIntent.
 */
async function getReceiptUrl(stripe: Stripe, pi: any): Promise<string | undefined> {
  if (!pi.latest_charge) return undefined;
  const chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge.id;
  try {
    const charge = await stripe.charges.retrieve(chargeId);
    return charge.receipt_url || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Capturer un PaymentIntent (après confirmation client ou auto-capture)
 */
export const capturePayment = internalAction({
  args: {
    paymentIntentId: v.string(),
    missionId: v.id("missions"),
    stripeSecretKey: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("=== capturePayment START ===", args.paymentIntentId);

    const stripe = createStripeClient(args.stripeSecretKey);

    try {
      const piCheck = await stripe.paymentIntents.retrieve(args.paymentIntentId);

      // Déjà capturé → juste mettre à jour la base
      if (piCheck.status === "succeeded") {
        const receiptUrl = await getReceiptUrl(stripe, piCheck);
        await ctx.runMutation(internal.api.stripeInternal.markPaymentCaptured, {
          missionId: args.missionId,
          paymentIntentId: args.paymentIntentId,
          receiptUrl,
        });
        return { success: true, alreadyCaptured: true };
      }

      if (piCheck.status === "canceled") {
        return { success: false, reason: "canceled" };
      }

      if (piCheck.status !== "requires_capture") {
        return { success: false, reason: `unexpected_status_${piCheck.status}` };
      }

      // Capturer le paiement
      const paymentIntent = await stripe.paymentIntents.capture(args.paymentIntentId);
      console.log("PaymentIntent captured:", paymentIntent.id);

      const receiptUrl = await getReceiptUrl(stripe, paymentIntent);
      await ctx.runMutation(internal.api.stripeInternal.markPaymentCaptured, {
        missionId: args.missionId,
        paymentIntentId: args.paymentIntentId,
        receiptUrl,
      });

      return { success: true, paymentIntent };
    } catch (error: any) {
      if (error?.code === "payment_intent_unexpected_state") {
        await ctx.runMutation(internal.api.stripeInternal.markPaymentCaptured, {
          missionId: args.missionId,
          paymentIntentId: args.paymentIntentId,
        });
        return { success: true, alreadyCaptured: true };
      }
      console.error("Erreur capture PaymentIntent:", error);
      throw error;
    }
  },
});

/**
 * Annuler une pré-autorisation (mission annulée)
 */
export const cancelPaymentAuthorization = internalAction({
  args: {
    paymentIntentId: v.string(),
    missionId: v.id("missions"),
    reason: v.optional(v.string()),
    stripeSecretKey: v.string(), // Passé depuis la mutation appelante
  },
  handler: async (ctx, args) => {
    console.log("=== cancelPaymentAuthorization START ===");
    console.log("PaymentIntent:", args.paymentIntentId);

    const stripe = createStripeClient(args.stripeSecretKey);

    try {
      await stripe.paymentIntents.cancel(args.paymentIntentId, {
        cancellation_reason: "requested_by_customer",
      });

      console.log("PaymentIntent cancelled:", args.paymentIntentId);

      await ctx.runMutation(internal.api.stripeInternal.markPaymentCancelled, {
        missionId: args.missionId,
        reason: args.reason,
      });

      return { success: true };
    } catch (error) {
      console.error("Erreur annulation PaymentIntent:", error);
      throw error;
    }
  },
});

/**
 * Traiter les auto-captures (appelé par cron)
 */
export const processAutoCapture = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("=== processAutoCapture START ===");

    // Récupérer les missions éligibles
    const missions = await ctx.runQuery(
      internal.api.stripeInternal.getMissionsForAutoCapture
    );

    console.log(`Auto-capture: ${missions.length} missions à traiter`);

    let processed = 0;
    let errors = 0;

    for (const mission of missions) {
      try {
        await ctx.runAction(internal.api.stripe.capturePayment, {
          paymentIntentId: mission.paymentIntentId,
          missionId: mission.missionId,
        });
        console.log(`Auto-capture réussie pour mission ${mission.missionId}`);
        processed++;
      } catch (error) {
        console.error(
          `Erreur auto-capture mission ${mission.missionId}:`,
          error
        );
        errors++;
      }
    }

    return { processed, errors, total: missions.length };
  },
});

/**
 * Tester la connexion Stripe
 * Utilise balance.retrieve() qui ne nécessite que la permission "Balance" en lecture
 * La clé est passée en paramètre pour éviter les problèmes avec runQuery en self-hosted
 */
export const testConnection = internalAction({
  args: {
    secretKey: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("=== testStripeConnection START ===");

    try {
      const { secretKey } = args;

      console.log("Secret key received:", secretKey ? `${secretKey.substring(0, 10)}...` : "NONE");

      if (!secretKey) {
        return {
          success: false,
          error: "Clé secrète Stripe non fournie.",
        };
      }

      // Vérifier le format de la clé
      if (!secretKey.startsWith("sk_") && !secretKey.startsWith("rk_")) {
        return {
          success: false,
          error: `Format de clé invalide. La clé doit commencer par sk_ ou rk_. Reçu: ${secretKey.substring(0, 20)}...`,
        };
      }

      const stripe = createStripeClient(secretKey);

      // Tester la connexion en récupérant le solde (permission minimale)
      const balance = await stripe.balance.retrieve();

      console.log("Stripe connection OK");

      // Calculer le solde disponible
      const availableBalance = balance.available.reduce((sum, b) => sum + b.amount, 0);
      const pendingBalance = balance.pending.reduce((sum, b) => sum + b.amount, 0);
      const currency = balance.available[0]?.currency?.toUpperCase() || "EUR";

      return {
        success: true,
        message: "Connexion Stripe OK",
        availableBalance: `${(availableBalance / 100).toFixed(2)} ${currency}`,
        pendingBalance: `${(pendingBalance / 100).toFixed(2)} ${currency}`,
        livemode: balance.livemode,
      };
    } catch (error) {
      console.error("Erreur test Stripe:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      };
    }
  },
});
