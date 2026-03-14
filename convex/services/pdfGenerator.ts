// @ts-nocheck
"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

// ============================================
// GÉNÉRATION PDF SERVEUR (pdfme) — Action Node.js
// Les queries/mutations sont dans pdfGeneratorQueries.ts
// ============================================

const formatPrice = (cents: number) => {
  return (cents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });
};

const formatDateFR = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR");
};

export const generatePdfFromTemplate = internalAction({
  args: {
    invoiceId: v.id("invoices"),
  },
  handler: async (ctx, args) => {
    console.log("=== generatePdfFromTemplate START ===", args.invoiceId);

    try {
      // 1. Charger la facture
      const invoice = await ctx.runQuery(internal.services.pdfGeneratorQueries.getInvoiceForPdf, {
        invoiceId: args.invoiceId,
      });

      if (!invoice) {
        console.error("Facture non trouvée:", args.invoiceId);
        return;
      }

      // 2. Résoudre le companyType de l'annonceur
      const emitter = await ctx.runQuery(internal.services.pdfGeneratorQueries.getUserForPdf, {
        userId: invoice.createdBy,
      });
      const companyType = emitter?.companyType || "unknown";

      // 3. Chercher le template par défaut selon documentType + companyType
      const documentType = invoice.documentType || "invoice";
      const template = await ctx.runQuery(internal.services.pdfGeneratorQueries.getDefaultPdfTemplate, {
        documentType,
        companyType,
      });

      if (!template) {
        console.log("Aucun template PDF par défaut configuré pour:", documentType, companyType);
        return;
      }

      // 4. Charger les données complètes
      const data = await ctx.runQuery(internal.services.pdfGeneratorQueries.getInvoiceFullData, {
        invoiceId: args.invoiceId,
      });

      if (!data) {
        console.error("Données complètes non trouvées pour:", args.invoiceId);
        return;
      }

      // 5. TVA globale
      const isVatSubject = !!invoice.tva && invoice.tva > 0;
      const vatRate = invoice.vatRate || 20;
      const mentionTVA = isVatSubject
        ? ""
        : "TVA non applicable, art. 293 B du CGI";

      // 6. Construire le tableau des items enrichi
      // Colonnes : Description | Qté | Unité | P.U. HT | TVA % | Montant TVA | Total TTC
      const itemsTable = data.items.map((item: any, index: number) => {
        let desc = item.description;
        if (index === 0 && data.descriptionDetails) {
          desc += "\n" + data.descriptionDetails;
        }

        const itemTTC = item.total;
        const itemHT = isVatSubject
          ? Math.round(itemTTC / (1 + vatRate / 100))
          : itemTTC;
        const itemTVA = itemTTC - itemHT;
        const unitPriceHT = isVatSubject
          ? Math.round(item.unitPrice / (1 + vatRate / 100))
          : item.unitPrice;

        return [
          desc,
          String(item.quantity),
          item.unit || "",
          formatPrice(unitPriceHT),
          isVatSubject ? `${vatRate}%` : "0%",
          formatPrice(itemTVA),
          formatPrice(itemTTC),
        ];
      });

      // 7. Construire le tableau des totaux
      const totalsRows: string[][] = [];
      if (isVatSubject) {
        totalsRows.push(["Total HT", formatPrice(invoice.amountHT || invoice.amount)]);
        totalsRows.push([`TVA (${vatRate}%)`, formatPrice(invoice.tva!)]);
      }
      totalsRows.push(["Total TTC", formatPrice(invoice.amount)]);

      // 8. Inputs pour pdfme
      const inputs = [
        {
          invoiceNumber: invoice.invoiceNumber,
          documentType: documentType === "invoice" ? "FACTURE" : "REÇU",
          date: formatDateFR(new Date().toISOString().split("T")[0]),
          clientName: data.clientName || "",
          clientEmail: data.clientEmail || "",
          clientPhone: data.clientPhone || "",
          clientAddress: data.clientAddress || "",
          announcerName: data.announcerName || "",
          announcerEmail: data.announcerEmail || "",
          announcerPhone: data.announcerPhone || "",
          announcerAddress: data.announcerAddress || "",
          companyName: data.companyName || "",
          siret: data.siret ? `SIRET : ${data.siret}` : "",
          serviceName: data.serviceName || "",
          missionDate: data.missionDateRange || "",
          sessionType: data.sessionTypeLabel || "",
          animalDetails: data.animalDetails || "",
          timeRange: data.timeRange || "",
          sapMention: data.sapMention || "",
          sapApprovalNumber: data.sapApprovalNumber
            ? `Agrément SAP : ${data.sapApprovalNumber}`
            : "",
          amountHT: `Total HT : ${invoice.amountHT ? formatPrice(invoice.amountHT) : formatPrice(invoice.amount)}`,
          tva: isVatSubject ? `TVA (${vatRate}%) : ${formatPrice(invoice.tva!)}` : "",
          amountTTC: `Total TTC : ${formatPrice(invoice.amount)}`,
          vatRate: `${vatRate} %`,
          mentionTVA,
          itemsTable: JSON.stringify(itemsTable),
          totalsTable: JSON.stringify(totalsRows),
        },
      ];

      // 9. Générer le PDF avec pdfme
      const { generate } = await import("@pdfme/generator");
      const { text, image, table, line, rectangle } = await import("@pdfme/schemas");

      const templateData = JSON.parse(template.templateJson);
      const plugins = { text, image, table, line, rectangle };

      const pdf = await generate({
        template: templateData,
        inputs,
        plugins,
      });

      // 10. Stocker le PDF dans Convex storage
      const blob = new Blob([pdf], { type: "application/pdf" });
      const storageId = await ctx.storage.store(blob);

      // 11. Mettre à jour la facture avec le storageId
      await ctx.runMutation(internal.services.pdfGeneratorQueries.updateInvoicePdf, {
        invoiceId: args.invoiceId,
        pdfStorageId: storageId,
      });

      console.log(`PDF généré et stocké pour facture ${invoice.invoiceNumber}`);
      return { success: true, storageId };
    } catch (error) {
      console.error("Erreur génération PDF:", error);
      return { success: false, error: error instanceof Error ? error.message : "Erreur inconnue" };
    }
  },
});
