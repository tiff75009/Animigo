// @ts-nocheck
"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

export const processStripeRefund = internalAction({
  args: {
    missionId: v.id("missions"),
    paymentIntentId: v.string(),
    refundAmount: v.number(),
    stripeSecretKey: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(args.stripeSecretKey, {
        apiVersion: "2024-12-18.acacia",
      });

      // Tenter le remboursement avec reverse_transfer pour inverser
      // le transfert Connect automatique (transfer_data.destination)
      const refund = await stripe.refunds.create({
        payment_intent: args.paymentIntentId,
        amount: args.refundAmount,
        reverse_transfer: true,
      });

      // NE PAS appeler ctx.runMutation ici — le runtime Node.js de Convex
      // self-hosted a un bug qui retourne le HTML du dashboard au lieu de la réponse.
      // L'appelant (adminRefundMission) gère les mises à jour via markAdminRefund.

      return { success: true, refundId: refund.id };
    } catch (error: any) {
      console.error("Stripe refund failed:", error);
      // Si la charge est déjà remboursée (tentatives précédentes),
      // considérer comme succès pour permettre la mise à jour Convex
      const errMsg = error?.raw?.message || error?.message || "Unknown error";
      if (typeof errMsg === "string" && errMsg.includes("greater than unrefunded amount")) {
        console.log("Charge déjà remboursée côté Stripe, on continue");
        return { success: true, refundId: "already_refunded" };
      }
      return { success: false, error: typeof errMsg === "string" ? errMsg : "Erreur Stripe inconnue" };
    }
  },
});

export const capturePartialPaymentIntent = internalAction({
  args: {
    missionId: v.id("missions"),
    paymentIntentId: v.string(),
    amountToCapture: v.number(),
    stripeSecretKey: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(args.stripeSecretKey, {
        apiVersion: "2024-12-18.acacia",
      });

      // Capturer uniquement le montant retenu, le reste est libéré automatiquement
      const paymentIntent = await stripe.paymentIntents.capture(
        args.paymentIntentId,
        { amount_to_capture: args.amountToCapture }
      );

      return { success: true, status: paymentIntent.status };
    } catch (error) {
      console.error("Stripe partial capture failed:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

export const cancelStripePaymentIntent = internalAction({
  args: {
    paymentIntentId: v.string(),
    stripeSecretKey: v.string(),
    missionId: v.optional(v.id("missions")),
    refundAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(args.stripeSecretKey, {
        apiVersion: "2024-12-18.acacia",
      });

      // Vérifier le vrai statut du PI côté Stripe avant d'agir
      const pi = await stripe.paymentIntents.retrieve(args.paymentIntentId);

      if (pi.status === "requires_capture") {
        // PI en pré-autorisation → annuler (libère le hold)
        await stripe.paymentIntents.cancel(args.paymentIntentId);
        console.log("PaymentIntent annulé (requires_capture):", args.paymentIntentId);
        return { success: true };
      } else if (pi.status === "succeeded") {
        // PI déjà capturé (paiement immédiat) → créer un remboursement
        const refundAmount = args.refundAmount || pi.amount;
        // reverse_transfer: true car transfer_data.destination crée un transfert auto
        const refund = await stripe.refunds.create({
          payment_intent: args.paymentIntentId,
          amount: refundAmount,
          reverse_transfer: true,
        });
        console.log("Refund créé (PI succeeded):", refund.id, "montant:", refundAmount);
        // L'appelant gère les mises à jour Convex (pas de ctx.runMutation ici)
        return { success: true, refundId: refund.id };
      } else if (pi.status === "canceled") {
        console.log("PaymentIntent déjà annulé:", args.paymentIntentId);
        return { success: true };
      } else {
        console.warn("PaymentIntent dans un état inattendu:", pi.status);
        return { success: false, error: `État inattendu: ${pi.status}` };
      }
    } catch (error) {
      console.error("Failed to cancel/refund PaymentIntent:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

/**
 * @deprecated Utiliser sendCancellationAnnouncerEmail et sendCancellationClientEmail dans convex/api/email.ts
 * Conservé pour rétrocompatibilité uniquement.
 */
export const sendCancellationEmail = internalAction({
  args: {
    recipientEmail: v.string(),
    recipientName: v.string(),
    clientName: v.string(),
    serviceName: v.string(),
    animalName: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    totalAmount: v.number(),
    refundAmount: v.number(),
    announcerRetained: v.number(),
    cancellationReason: v.string(),
    isAnnouncer: v.boolean(),
    emailConfig: v.object({
      apiKey: v.string(),
      fromEmail: v.optional(v.string()),
      fromName: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    try {
      const fromEmail = args.emailConfig.fromEmail || "onboarding@resend.dev";
      const fromName = args.emailConfig.fromName || "Animigo";
      const siteName = "Animigo";

      const formatPrice = (cents: number) =>
        (cents / 100).toFixed(2).replace(".", ",") + " \u20ac";
      const formatDate = (dateStr: string) => {
        const [year, month, day] = dateStr.split("-");
        return `${day}/${month}/${year}`;
      };

      const subject = args.isAnnouncer
        ? `Une réservation a été annulée - ${siteName}`
        : `Votre réservation a été annulée - ${siteName}`;

      const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <div style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Réservation annulée</h1>
    </div>
    <div style="padding: 40px 30px;">
      <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px;">Bonjour ${args.recipientName},</h2>
      <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
        ${args.isAnnouncer
          ? `${args.clientName} a annulé sa réservation pour "${args.serviceName}".`
          : `Votre réservation pour "${args.serviceName}" a bien été annulée.`
        }
      </p>
      <div style="margin: 20px 0; padding: 20px; background-color: #f0f9ff; border-radius: 12px; border-left: 4px solid #0ea5e9;">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #0369a1;">Détails</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Service :</strong> ${args.serviceName}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Animal :</strong> ${args.animalName}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Dates :</strong> Du ${formatDate(args.startDate)} au ${formatDate(args.endDate)}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Montant total :</strong> ${formatPrice(args.totalAmount)}</p>
      </div>
      ${args.refundAmount > 0 || args.announcerRetained > 0 ? `
      <div style="margin: 20px 0; padding: 20px; background-color: #ecfdf5; border-radius: 12px; border-left: 4px solid #10b981;">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #065f46;">Récapitulatif financier</p>
        ${args.refundAmount > 0 ? `<p style="margin: 5px 0; color: #475569;"><strong>Remboursement client :</strong> ${formatPrice(args.refundAmount)}</p>` : ""}
        ${args.announcerRetained > 0 ? `<p style="margin: 5px 0; color: #475569;"><strong>Conservé par l'annonceur :</strong> ${formatPrice(args.announcerRetained)}</p>` : ""}
        ${args.refundAmount === 0 ? `<p style="margin: 5px 0; color: #dc2626;"><strong>Aucun remboursement</strong></p>` : ""}
      </div>
      ` : ""}
      ${args.cancellationReason ? `
      <div style="margin: 20px 0; padding: 20px; background-color: #fef3c7; border-radius: 12px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0 0 5px 0; font-weight: bold; color: #92400e;">Raison de l'annulation :</p>
        <p style="margin: 0; color: #78350f;">${args.cancellationReason}</p>
      </div>
      ` : ""}
    </div>
    <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; color: #94a3b8; font-size: 12px;">&copy; 2025 ${siteName}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`;

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${args.emailConfig.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: [args.recipientEmail],
          subject,
          html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Resend API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return { success: true, id: result.id };
    } catch (error) {
      console.error("Failed to send cancellation email:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});
