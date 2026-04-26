// @ts-nocheck
"use node";

/**
 * Génération automatique du reçu de paiement CLIENT après paiement Stripe réussi.
 *
 * Pipeline :
 *   1. payment_intent.succeeded webhook (stripeWebhook.ts)
 *      → markPaymentPaid (stripePaymentLifecycle.ts)
 *      → ctx.scheduler.runAfter(0, internal.api.clientReceipt.generateClientReceipt, { missionId, paymentIntentId, cardBrand, cardLast4 })
 *
 *   2. generateClientReceipt (cette action) :
 *      - charge la mission, le paiement, l'annonceur, le client
 *      - charge le template par défaut "client_receipt"
 *      - génère le PDF via pdfme avec les balises de paiement (paymentDate, transactionId, etc.)
 *      - stocke le PDF dans Convex storage
 *      - patch la mission avec clientReceiptStorageId
 *      - envoie un email au client avec le lien de download
 *
 *   3. Le client peut télécharger depuis son dashboard via getClientReceiptUrl (clientReceiptQueries.ts)
 */

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

const formatPrice = (cents: number) =>
  (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

const formatDateTimeFR = (timestamp: number) => {
  const d = new Date(timestamp);
  return `${d.toLocaleDateString("fr-FR")} à ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
};

const formatDateFR = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR");
};

export const generateClientReceipt = internalAction({
  args: {
    missionId: v.id("missions"),
    paymentIntentId: v.string(),
    cardBrand: v.optional(v.string()),
    cardLast4: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; storageId?: string; error?: string }> => {
    console.log("[generateClientReceipt] Démarrage pour mission:", args.missionId);

    try {
      // 1. Charger la mission, le paiement, le client, l'annonceur
      const data = await ctx.runQuery(internal.api.clientReceiptQueries.getReceiptData, {
        missionId: args.missionId,
      });

      if (!data) {
        console.error("[generateClientReceipt] Données introuvables");
        return { success: false, error: "Mission ou paiement introuvable" };
      }

      // 2. Charger le template par défaut "client_receipt"
      const template = await ctx.runQuery(internal.services.pdfGeneratorQueries.getDefaultPdfTemplate, {
        documentType: "client_receipt",
        companyType: "all",
      });

      if (!template) {
        console.warn("[generateClientReceipt] Aucun template par défaut configuré pour client_receipt");
        return { success: false, error: "Template par défaut manquant" };
      }

      // 3. Construire les inputs pdfme avec les balises de paiement
      const paymentMethod = args.cardBrand && args.cardLast4
        ? `${args.cardBrand.charAt(0).toUpperCase() + args.cardBrand.slice(1)} •••• ${args.cardLast4}`
        : "Carte bancaire";

      const cardLast4Display = args.cardLast4 ? `•••• ${args.cardLast4}` : "—";
      const cardBrandDisplay = args.cardBrand
        ? args.cardBrand.charAt(0).toUpperCase() + args.cardBrand.slice(1)
        : "Carte";

      // ─── Log debug : confirme que les vraies données Stripe sont propagées ───
      console.log(`[generateClientReceipt] Données paiement Stripe :
        - transactionId (Payment Intent) : ${args.paymentIntentId}
        - paymentDate (capturedAt) : ${new Date(data.paymentDate).toISOString()}
        - cardBrand : ${args.cardBrand || "(non fourni)"}
        - cardLast4 : ${args.cardLast4 || "(non fourni)"}
        - paymentMethod final : ${paymentMethod}`);

      const inputs = [
        {
          documentType: "REÇU DE PAIEMENT",
          receiptNumber: `REC-${new Date(data.paymentDate).getFullYear()}-${String(args.missionId).slice(-6).toUpperCase()}`,
          bookingNumber: `RES-${String(args.missionId).slice(-6).toUpperCase()}`,
          date: `Émis le ${formatDateFR(new Date().toISOString().split("T")[0])}`,
          paymentStatus: "PAYÉ",
          // ─── Paiement Stripe ───
          paymentDate: formatDateTimeFR(data.paymentDate),
          paymentMethod,
          cardBrand: cardBrandDisplay,
          cardLast4: cardLast4Display,
          transactionId: args.paymentIntentId,
          paidAmount: formatPrice(data.totalAmount),
          paidAmountInWords: "",
          // ─── Service ───
          bookingDate: data.missionDateRange,
          serviceLocation: data.serviceLocation || "",
          // ─── Prestataire ───
          serviceProvider: data.announcerName,
          providerStatus: data.providerStatus,
          providerAddress: data.providerAddress,
          providerSiret: data.providerSiretLine,
          // ─── Plateforme (Animigo) ───
          platformName: "Animigo",
          platformLegalName: data.platformLegalName,
          platformAddress: data.platformAddress,
          platformSiret: data.platformSiret,
          platformCapital: data.platformCapital,
          platformContact: data.platformContact,
          // ─── Décomposition ───
          platformFee: formatPrice(data.platformFee),
          providerEarnings: formatPrice(data.providerEarnings),
          // ─── Mentions légales ───
          intermediaryMention: "Animigo agit en tant que plateforme de mise en relation entre les particuliers et les prestataires de services animaliers. La présente preuve de paiement n'est pas une facture commerciale.",
          stripeMention: "Paiement sécurisé traité par Stripe Payments Europe Ltd, prestataire de services de paiement agréé.",
          escrowMention: "Les fonds sont conservés sur le compte séquestre Animigo jusqu'à confirmation par le client de la réalisation du service, puis reversés au prestataire conformément à nos CGV.",
          cgvMention: "Document établi conformément aux Conditions Générales de Vente acceptées lors de la réservation.",
          thankYouMessage: "Merci pour votre confiance — l'équipe Animigo",
          _legal_note: "Ce reçu n'est pas une facture commerciale. Pour toute facture comptable détaillée (TVA, mentions légales du prestataire), veuillez vous référer à la facture émise par votre prestataire.",
          // ─── Balises communes ───
          clientName: data.clientName,
          clientEmail: data.clientEmail,
          clientAddress: data.clientAddress || "",
          serviceName: data.serviceName,
          missionDate: data.missionDateRange,
          animalDetails: data.animalDetails || "",
          itemsTable: "[]",
          totalsTable: "[]",
        },
      ];

      // 4. Appeler pdfme via l'helper existant (réutilise la même infra que generatePdfFromTemplate)
      const pdfBuffer = await ctx.runAction(internal.api.clientReceipt.renderPdfBuffer, {
        templateJson: template.templateJson,
        inputs: JSON.stringify(inputs),
      });

      if (!pdfBuffer) {
        return { success: false, error: "Échec génération PDF" };
      }

      // 5. Stocker le PDF dans Convex storage
      const blob = new Blob([new Uint8Array(pdfBuffer as any)], { type: "application/pdf" });
      const storageId = await ctx.storage.store(blob);

      // 6. Patch la mission avec le storageId du reçu
      await ctx.runMutation(internal.api.clientReceiptQueries.attachReceiptToMission, {
        missionId: args.missionId,
        storageId,
      });

      console.log(`[generateClientReceipt] PDF généré et stocké : ${storageId}`);

      // 7. Envoyer l'email au client AVEC le PDF en pièce jointe
      try {
        const pdfBase64 = Buffer.from(pdfBuffer as ArrayBuffer).toString("base64");
        const filename = `recu-paiement-${String(args.missionId).slice(-6).toUpperCase()}.pdf`;
        await ctx.runAction(internal.api.clientReceipt.sendReceiptEmailWithAttachment, {
          missionId: args.missionId,
          paymentIntentId: args.paymentIntentId,
          cardBrand: args.cardBrand,
          cardLast4: args.cardLast4,
          pdfBase64,
          filename,
        });
        console.log(`[generateClientReceipt] Email envoyé au client avec PDF en PJ`);
      } catch (emailErr) {
        console.error("[generateClientReceipt] Erreur envoi email (PDF généré OK) :", emailErr);
      }

      return { success: true, storageId };
    } catch (err) {
      console.error("[generateClientReceipt] Erreur:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erreur inconnue",
      };
    }
  },
});

/**
 * Action interne dédiée à l'envoi de l'email "reçu de paiement" avec le PDF en PJ.
 * Charge mission/client/annonceur et appelle sendPaymentReceiptEmail.
 */
export const sendReceiptEmailWithAttachment = internalAction({
  args: {
    missionId: v.id("missions"),
    paymentIntentId: v.string(),
    cardBrand: v.optional(v.string()),
    cardLast4: v.optional(v.string()),
    pdfBase64: v.string(),
    filename: v.string(),
  },
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(internal.api.clientReceipt.getEmailReceiptData, {
      missionId: args.missionId,
    });
    if (!data || !data.clientEmail) {
      console.warn("[sendReceiptEmailWithAttachment] Email client introuvable");
      return;
    }

    if (!data.emailConfig) {
      console.warn("[sendReceiptEmailWithAttachment] Config email manquante");
      return;
    }

    await ctx.runAction(internal.api.email.sendPaymentReceiptEmail, {
      clientEmail: data.clientEmail,
      clientName: data.clientName,
      serviceName: data.serviceName,
      announcerName: data.announcerName,
      announcerStatus: data.announcerStatus,
      announcerCompany: data.announcerCompany,
      announcerSiret: data.announcerSiret,
      startDate: data.startDate,
      endDate: data.endDate,
      announcerEarnings: data.announcerEarnings,
      vatRate: data.vatRate,
      isSapApplied: data.isSapApplied,
      platformFee: data.platformFee,
      commissionRate: data.commissionRate,
      stripeFee: data.stripeFee,
      stripeFeeRate: data.stripeFeeRate,
      totalAmount: data.totalAmount,
      paymentRef: args.paymentIntentId,
      cardBrand: args.cardBrand,
      cardLast4: args.cardLast4,
      pdfAttachmentBase64: args.pdfBase64,
      pdfAttachmentFilename: args.filename,
      emailConfig: data.emailConfig,
      appUrl: data.appUrl,
    });
  },
});

/**
 * Action interne dédiée au rendu pdfme (séparée pour pouvoir tester / réutiliser).
 * Reçoit le template JSON + inputs JSON et retourne un Buffer PDF.
 */
export const renderPdfBuffer = internalAction({
  args: {
    templateJson: v.string(),
    inputs: v.string(),
  },
  handler: async (_ctx, args): Promise<ArrayBuffer | null> => {
    try {
      const { generate } = await import("@pdfme/generator");
      const { text, image, table, line, rectangle } = await import("@pdfme/schemas");
      const template = JSON.parse(args.templateJson);
      const inputs = JSON.parse(args.inputs);
      const pdf = await generate({
        template,
        inputs,
        plugins: { text, image, table, line, rectangle },
      });
      return pdf.buffer as ArrayBuffer;
    } catch (err) {
      console.error("[renderPdfBuffer] Erreur:", err);
      return null;
    }
  },
});
