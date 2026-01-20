// @ts-nocheck
"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import Stripe from "stripe";

/**
 * Helper pour récupérer le client Stripe
 */
async function getStripeClient(ctx: any): Promise<Stripe> {
  const secretKey = await ctx.runQuery(
    internal.api.stripeInternal.getStripeSecretKey
  );
  if (!secretKey) {
    throw new Error("Stripe non configuré - clé secrète manquante");
  }
  return new Stripe(secretKey, { apiVersion: "2024-12-18.acacia" });
}

/**
 * Créer un PaymentIntent pour Stripe Elements (paiement intégré)
 * NOTE: Sur Convex self-hosted, les actions ne peuvent pas appeler runMutation ni scheduler
 * donc on utilise l'API HTTP Convex directement pour mettre à jour la base
 */
export const createPaymentIntent = internalAction({
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
    // Config
    stripeSecretKey: v.string(),
    appUrl: v.string(),
    convexUrl: v.string(), // URL Convex self-hosted
    convexAdminKey: v.string(), // Admin key pour l'API HTTP Convex
    // Config email
    emailConfig: v.optional(v.object({
      apiKey: v.string(),
      fromEmail: v.optional(v.string()),
      fromName: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    console.log("=== createPaymentIntent START ===");

    try {
      const stripe = new Stripe(args.stripeSecretKey, { apiVersion: "2024-12-18.acacia" });
      const appUrl = args.appUrl || "http://localhost:3000";

      // Créer le PaymentIntent avec capture manuelle (pré-autorisation)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: args.amount,
        currency: "eur",
        capture_method: "manual", // Pré-autorisation
        receipt_email: args.clientEmail,
        metadata: {
          missionId: args.missionId,
          platformFee: args.platformFee.toString(),
          announcerEarnings: args.announcerEarnings.toString(),
        },
        description: `${args.serviceName} - ${args.animalName || "Service"} avec ${args.announcerName}`,
      });

      console.log("PaymentIntent created:", paymentIntent.id);

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

      // Envoyer l'email au client
      if (args.emailConfig?.apiKey) {
        const fromEmail = args.emailConfig?.fromEmail || "onboarding@resend.dev";
        const fromName = args.emailConfig?.fromName || "Animigo";

        const formatDate = (dateStr: string) => {
          const [year, month, day] = dateStr.split("-");
          return `${day}/${month}/${year}`;
        };

        const formatPrice = (cents: number) => {
          return (cents / 100).toFixed(2).replace(".", ",") + " €";
        };

        const clientFirstName = args.clientName.split(" ")[0];

        const subject = `Votre réservation a été acceptée - Finalisez le paiement`;
        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <div style="background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🎉 Bonne nouvelle !</h1>
      <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Votre réservation a été acceptée</p>
    </div>
    <div style="padding: 40px 30px;">
      <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px;">Bonjour ${clientFirstName} !</h2>
      <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
        ${args.announcerName} a accepté votre demande de réservation. Pour confirmer définitivement votre prestation, veuillez procéder au paiement sécurisé.
      </p>
      <div style="margin: 20px 0; padding: 20px; background-color: #f0f9ff; border-radius: 12px; border-left: 4px solid #0ea5e9;">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #0369a1;">📋 Récapitulatif</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Service :</strong> ${args.serviceName}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Prestataire :</strong> ${args.announcerName}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Dates :</strong> Du ${formatDate(args.startDate)} au ${formatDate(args.endDate)}</p>
        ${args.animalName ? `<p style="margin: 5px 0; color: #475569;"><strong>Animal :</strong> ${args.animalName}</p>` : ""}
        <p style="margin: 10px 0 0 0; font-size: 20px; font-weight: bold; color: #0369a1;">Montant : ${formatPrice(args.amount)}</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${paymentUrl}" style="display: inline-block; background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: bold; font-size: 16px;">💳 Procéder au paiement</a>
      </div>
      <div style="margin-top: 20px; padding: 15px; background-color: #fef3c7; border-radius: 12px;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">⏰ <strong>Important :</strong> Ce lien expire dans 24 heures.</p>
      </div>
      <div style="margin-top: 20px; padding: 15px; background-color: #ecfdf5; border-radius: 12px;">
        <p style="margin: 0; color: #065f46; font-size: 14px;">🔒 <strong>Paiement sécurisé :</strong> Vos fonds seront réservés jusqu'à la fin de la prestation.</p>
      </div>
    </div>
    <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; color: #94a3b8; font-size: 12px;">© 2025 Animigo. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`;

        try {
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${args.emailConfig.apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: `${fromName} <${fromEmail}>`,
              to: [args.clientEmail],
              subject,
              html,
            }),
          });

          if (emailResponse.ok) {
            console.log("Payment email sent successfully");
          } else {
            console.error("Failed to send payment email");
          }
        } catch (emailError) {
          console.error("Error sending payment email:", emailError);
        }
      }

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
    // Config email pour l'envoi du lien de paiement
    emailConfig: v.optional(v.object({
      apiKey: v.string(),
      fromEmail: v.optional(v.string()),
      fromName: v.optional(v.string()),
    })),
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
      const stripe = new Stripe(args.stripeSecretKey, { apiVersion: "2024-12-18.acacia" });
      const appUrl = args.appUrl || "http://localhost:3000";

      // Formater les dates pour l'affichage
      const formatDate = (dateStr: string) => {
        const [year, month, day] = dateStr.split("-");
        return `${day}/${month}/${year}`;
      };

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
          capture_method: "manual", // Pré-autorisation
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

      // NOTE: Sur Convex self-hosted, les actions ne peuvent PAS appeler:
      // - ctx.runMutation (échoue avec HTML 404)
      // - ctx.runQuery (échoue avec HTML 404)
      // - ctx.scheduler.runAfter (échoue avec "Transient error")
      //
      // Solution: Faire tout directement dans l'action (appels HTTP seulement)
      // La sauvegarde en base se fera via le webhook Stripe checkout.session.completed

      // Envoyer l'email au client avec le lien de paiement DIRECTEMENT
      const apiKey = args.emailConfig?.apiKey;
      if (apiKey) {
        const fromEmail = args.emailConfig?.fromEmail || "onboarding@resend.dev";
        const fromName = args.emailConfig?.fromName || "Animigo";
        const siteName = "Animigo";

        // Formater les dates et le prix
        const formatDateEmail = (dateStr: string) => {
          const [year, month, day] = dateStr.split("-");
          return `${day}/${month}/${year}`;
        };

        const formatPriceEmail = (cents: number) => {
          return (cents / 100).toFixed(2).replace(".", ",") + " €";
        };

        const clientFirstName = args.clientName.split(" ")[0];

        const subject = `Votre réservation a été acceptée - Finalisez le paiement - ${siteName}`;
        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <div style="background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🎉 Bonne nouvelle !</h1>
      <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Votre réservation a été acceptée</p>
    </div>
    <div style="padding: 40px 30px;">
      <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px;">Bonjour ${clientFirstName} !</h2>
      <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
        ${args.announcerName} a accepté votre demande de réservation. Pour confirmer définitivement votre prestation, veuillez procéder au paiement sécurisé.
      </p>
      <div style="margin: 20px 0; padding: 20px; background-color: #f0f9ff; border-radius: 12px; border-left: 4px solid #0ea5e9;">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #0369a1;">📋 Récapitulatif</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Service :</strong> ${args.serviceName}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Prestataire :</strong> ${args.announcerName}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Dates :</strong> Du ${formatDateEmail(args.startDate)} au ${formatDateEmail(args.endDate)}</p>
        ${args.animalName ? `<p style="margin: 5px 0; color: #475569;"><strong>Animal :</strong> ${args.animalName}</p>` : ""}
        <p style="margin: 10px 0 0 0; font-size: 20px; font-weight: bold; color: #0369a1;">Montant : ${formatPriceEmail(args.amount)}</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${session.url}" style="display: inline-block; background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: bold; font-size: 16px;">💳 Procéder au paiement</a>
      </div>
      <div style="margin-top: 20px; padding: 15px; background-color: #fef3c7; border-radius: 12px;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">⏰ <strong>Important :</strong> Ce lien expire dans 1 heure.</p>
      </div>
      <div style="margin-top: 20px; padding: 15px; background-color: #ecfdf5; border-radius: 12px;">
        <p style="margin: 0; color: #065f46; font-size: 14px;">🔒 <strong>Paiement sécurisé :</strong> Vos fonds seront réservés jusqu'à la fin de la prestation.</p>
      </div>
    </div>
    <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; color: #94a3b8; font-size: 12px;">© 2025 ${siteName}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`;

        try {
          console.log("Sending payment email directly to:", args.clientEmail);

          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: `${fromName} <${fromEmail}>`,
              to: [args.clientEmail],
              subject,
              html,
            }),
          });

          const emailResult = await emailResponse.text();
          if (emailResponse.ok) {
            console.log("Payment email sent successfully:", emailResult);
          } else {
            console.error("Failed to send payment email:", emailResult);
          }
        } catch (emailError) {
          console.error("Error sending payment email:", emailError);
        }
      } else {
        console.warn("No email config provided, skipping payment email");
      }

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
 * Envoyer l'email de demande de paiement
 * Utilise le template "reservation_accepted" du système de templates
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
    console.log("=== sendPaymentEmail START ===");

    // Récupérer la config email
    const configs = await ctx.runQuery(
      internal.api.emailInternal.getEmailConfigs
    );

    if (!configs.apiKey) {
      console.error("Email service not configured");
      return { success: false, error: "Email service not configured" };
    }

    const fromEmail = configs.fromEmail || "onboarding@resend.dev";
    const fromName = configs.fromName || "Animigo";
    const siteName = "Animigo";

    // Récupérer le template depuis la base de données
    const template = await ctx.runQuery(
      internal.admin.emailTemplates.getTemplateBySlug,
      { slug: "reservation_accepted" }
    );

    // Formater les dates et le prix
    const formatDate = (dateStr: string) => {
      const [year, month, day] = dateStr.split("-");
      return `${day}/${month}/${year}`;
    };

    const formatPrice = (cents: number) => {
      return (cents / 100).toFixed(2).replace(".", ",") + " \u20ac";
    };

    // Extraire le prénom du nom complet
    const clientFirstName = args.clientName.split(" ")[0];

    // Variables à remplacer dans le template
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

    // Fonction pour remplacer les variables {{variable}} dans une chaîne
    const replaceVariables = (text: string): string => {
      return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return variables[key] !== undefined ? variables[key] : match;
      });
    };

    // Utiliser le template ou fallback sur un sujet/contenu par défaut
    let subject: string;
    let html: string;

    if (template && template.htmlContent) {
      subject = replaceVariables(template.subject);
      html = replaceVariables(template.htmlContent);
    } else {
      // Fallback si le template n'existe pas
      subject = `Votre réservation a été acceptée - Finalisez le paiement - ${siteName}`;
      html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <div style="background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🎉 Bonne nouvelle !</h1>
      <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Votre réservation a été acceptée</p>
    </div>
    <div style="padding: 40px 30px;">
      <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px;">Bonjour ${clientFirstName} !</h2>
      <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
        ${args.announcerName} a accepté votre demande de réservation. Pour confirmer définitivement votre prestation, veuillez procéder au paiement sécurisé.
      </p>
      <div style="margin: 20px 0; padding: 20px; background-color: #f0f9ff; border-radius: 12px; border-left: 4px solid #0ea5e9;">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #0369a1;">📋 Récapitulatif</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Service :</strong> ${args.serviceName}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Prestataire :</strong> ${args.announcerName}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Dates :</strong> Du ${formatDate(args.startDate)} au ${formatDate(args.endDate)}</p>
        ${args.animalName ? `<p style="margin: 5px 0; color: #475569;"><strong>Animal :</strong> ${args.animalName}</p>` : ""}
        <p style="margin: 10px 0 0 0; font-size: 20px; font-weight: bold; color: #0369a1;">Montant : ${formatPrice(args.amount)}</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${args.paymentUrl}" style="display: inline-block; background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: bold; font-size: 16px;">💳 Procéder au paiement</a>
      </div>
      <div style="margin-top: 20px; padding: 15px; background-color: #fef3c7; border-radius: 12px;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">⏰ <strong>Important :</strong> Ce lien expire dans 1 heure.</p>
      </div>
      <div style="margin-top: 20px; padding: 15px; background-color: #ecfdf5; border-radius: 12px;">
        <p style="margin: 0; color: #065f46; font-size: 14px;">🔒 <strong>Paiement sécurisé :</strong> Vos fonds seront réservés jusqu'à la fin de la prestation.</p>
      </div>
    </div>
    <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; color: #94a3b8; font-size: 12px;">© 2025 ${siteName}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`;
    }

    // Envoyer l'email via Resend
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${configs.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: [args.clientEmail],
          subject,
          html,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Erreur envoi email:", result);
        return { success: false, error: result.message || "Erreur envoi email" };
      }

      console.log("Email envoyé:", result.id);

      // Logger l'email
      await ctx.runMutation(internal.api.emailInternal.logEmail, {
        to: args.clientEmail,
        from: `${fromName} <${fromEmail}>`,
        subject,
        template: "reservation_accepted",
        status: "sent",
        resendId: result.id,
      });

      return { success: true, id: result.id };
    } catch (error) {
      console.error("Erreur envoi email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Envoyer l'email de demande de paiement (version sans appels runQuery/runMutation)
 * Utilisé par createCheckoutSession pour éviter les problèmes Convex self-hosted
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
    // Config email passée directement
    emailConfig: v.optional(v.object({
      apiKey: v.string(),
      fromEmail: v.optional(v.string()),
      fromName: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    console.log("=== sendPaymentEmailDirect START ===");

    const apiKey = args.emailConfig?.apiKey;
    if (!apiKey) {
      console.error("Email service not configured - no API key");
      return { success: false, error: "Email service not configured" };
    }

    const fromEmail = args.emailConfig?.fromEmail || "onboarding@resend.dev";
    const fromName = args.emailConfig?.fromName || "Animigo";
    const siteName = "Animigo";

    // Formater les dates et le prix
    const formatDate = (dateStr: string) => {
      const [year, month, day] = dateStr.split("-");
      return `${day}/${month}/${year}`;
    };

    const formatPrice = (cents: number) => {
      return (cents / 100).toFixed(2).replace(".", ",") + " €";
    };

    // Extraire le prénom du nom complet
    const clientFirstName = args.clientName.split(" ")[0];

    const subject = `Votre réservation a été acceptée - Finalisez le paiement - ${siteName}`;
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <div style="background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🎉 Bonne nouvelle !</h1>
      <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Votre réservation a été acceptée</p>
    </div>
    <div style="padding: 40px 30px;">
      <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px;">Bonjour ${clientFirstName} !</h2>
      <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
        ${args.announcerName} a accepté votre demande de réservation. Pour confirmer définitivement votre prestation, veuillez procéder au paiement sécurisé.
      </p>
      <div style="margin: 20px 0; padding: 20px; background-color: #f0f9ff; border-radius: 12px; border-left: 4px solid #0ea5e9;">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #0369a1;">📋 Récapitulatif</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Service :</strong> ${args.serviceName}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Prestataire :</strong> ${args.announcerName}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Dates :</strong> Du ${formatDate(args.startDate)} au ${formatDate(args.endDate)}</p>
        ${args.animalName ? `<p style="margin: 5px 0; color: #475569;"><strong>Animal :</strong> ${args.animalName}</p>` : ""}
        <p style="margin: 10px 0 0 0; font-size: 20px; font-weight: bold; color: #0369a1;">Montant : ${formatPrice(args.amount)}</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${args.paymentUrl}" style="display: inline-block; background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: bold; font-size: 16px;">💳 Procéder au paiement</a>
      </div>
      <div style="margin-top: 20px; padding: 15px; background-color: #fef3c7; border-radius: 12px;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">⏰ <strong>Important :</strong> Ce lien expire dans 1 heure.</p>
      </div>
      <div style="margin-top: 20px; padding: 15px; background-color: #ecfdf5; border-radius: 12px;">
        <p style="margin: 0; color: #065f46; font-size: 14px;">🔒 <strong>Paiement sécurisé :</strong> Vos fonds seront réservés jusqu'à la fin de la prestation.</p>
      </div>
    </div>
    <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; color: #94a3b8; font-size: 12px;">© 2025 ${siteName}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`;

    // Envoyer l'email via Resend
    try {
      console.log("Sending payment email to:", args.clientEmail);

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: [args.clientEmail],
          subject,
          html,
        }),
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.error("Erreur envoi email:", responseText);
        return { success: false, error: responseText };
      }

      const result = JSON.parse(responseText);
      console.log("Email envoyé avec succès:", result.id);

      return { success: true, id: result.id };
    } catch (error) {
      console.error("Erreur envoi email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Capturer un PaymentIntent (après confirmation client ou auto-capture)
 */
export const capturePayment = internalAction({
  args: {
    paymentIntentId: v.string(),
    missionId: v.id("missions"),
    stripeSecretKey: v.string(), // Passé depuis la mutation appelante
  },
  handler: async (ctx, args) => {
    console.log("=== capturePayment START ===");
    console.log("PaymentIntent:", args.paymentIntentId);

    const stripe = new Stripe(args.stripeSecretKey, { apiVersion: "2024-12-18.acacia" });

    try {
      const paymentIntent = await stripe.paymentIntents.capture(
        args.paymentIntentId
      );

      console.log("PaymentIntent captured:", paymentIntent.id);

      // Récupérer l'URL du reçu si disponible
      let receiptUrl: string | undefined;
      if (paymentIntent.latest_charge) {
        if (typeof paymentIntent.latest_charge === "string") {
          const charge = await stripe.charges.retrieve(
            paymentIntent.latest_charge
          );
          receiptUrl = charge.receipt_url || undefined;
        } else {
          receiptUrl = paymentIntent.latest_charge.receipt_url || undefined;
        }
      }

      // Mettre à jour la base
      await ctx.runMutation(internal.api.stripeInternal.markPaymentCaptured, {
        missionId: args.missionId,
        paymentIntentId: args.paymentIntentId,
        receiptUrl,
      });

      return { success: true, paymentIntent };
    } catch (error) {
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

    const stripe = new Stripe(args.stripeSecretKey, { apiVersion: "2024-12-18.acacia" });

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

      const stripe = new Stripe(secretKey, { apiVersion: "2024-12-18.acacia" });

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
