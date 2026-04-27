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

      // 6. Construire le tableau des items enrichi (colonnes configurables)
      const templateData_parsed = JSON.parse(template.templateJson);
      const colsConfig = templateData_parsed._tableColumnsConfig;

      // Colonnes items : utiliser la config du template ou les colonnes par défaut
      const defaultItemsCols = [
        { dataField: "description", enabled: true },
        { dataField: "quantity", enabled: true },
        { dataField: "unit", enabled: true },
        { dataField: "unitPriceHT", enabled: true },
        { dataField: "vatRate", enabled: true },
        { dataField: "vatAmount", enabled: true },
        { dataField: "totalTTC", enabled: true },
      ];
      const itemsCols = (colsConfig?.itemsTable || defaultItemsCols).filter((c: any) => c.enabled);

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

        // Données per-row pour résolution des {{balise}} dans les templates
        const rowData: Record<string, string> = {
          description: desc,
          quantity: String(item.quantity),
          unit: item.unit || "",
          unitPriceHT: formatPrice(unitPriceHT),
          unitPriceTTC: formatPrice(item.unitPrice),
          vatRate: isVatSubject ? `${vatRate}%` : "0%",
          vatAmount: formatPrice(itemTVA),
          totalHT: formatPrice(itemHT),
          totalTTC: formatPrice(itemTTC),
        };

        return itemsCols.map((col: any) => {
          // Si un contentTemplate est défini, l'utiliser avec remplacement des {{balise}}
          if (col.contentTemplate) {
            return col.contentTemplate.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => rowData[key] ?? key);
          }
          // Sinon, valeur par défaut du dataField
          return rowData[col.dataField] ?? "";
        });
      });

      // 7. Construire le tableau des totaux (colonnes configurables)
      const defaultTotalsCols = [
        { dataField: "label", enabled: true },
        { dataField: "amount", enabled: true },
      ];
      const totalsCols = (colsConfig?.totalsTable || defaultTotalsCols).filter((c: any) => c.enabled);

      const totalsData: Record<string, string>[] = [];
      if (isVatSubject) {
        totalsData.push({ label: "Total HT", amount: formatPrice(invoice.amountHT || invoice.amount) });
        totalsData.push({ label: `TVA (${vatRate}%)`, amount: formatPrice(invoice.tva!) });
      }
      totalsData.push({ label: "Total TTC", amount: formatPrice(invoice.amount) });

      const totalsRows = totalsData.map(row =>
        totalsCols.map((col: any) => {
          if (col.contentTemplate) {
            return col.contentTemplate.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => row[key] ?? key);
          }
          return row[col.dataField] ?? "";
        })
      );

      // 8. Logo entreprise (fetch + base64)
      let companyLogoBase64 = "";
      if (data.companyLogoUrl) {
        try {
          const logoRes = await fetch(data.companyLogoUrl);
          if (logoRes.ok) {
            const logoBuffer = await logoRes.arrayBuffer();
            const contentType = logoRes.headers.get("content-type") || "image/png";
            const base64 = Buffer.from(logoBuffer).toString("base64");
            companyLogoBase64 = `data:${contentType};base64,${base64}`;
          }
        } catch (e) {
          console.warn("Impossible de charger le logo:", e);
        }
      }

      // 9. Inputs pour pdfme
      const inputs = [
        {
          invoiceNumber: invoice.invoiceNumber,
          documentType: documentType === "invoice"
            ? "FACTURE"
            : documentType === "client_receipt"
            ? "REÇU DE PAIEMENT"
            : "REÇU",
          date: formatDateFR(new Date().toISOString().split("T")[0]),
          clientName: data.clientName || "",
          clientEmail: data.clientEmail || "",
          clientPhone: data.clientPhone || "",
          clientAddress: data.clientAddress || "",
          clientStreet: data.clientStreet || "",
          clientPostalCode: data.clientPostalCode || "",
          clientCity: data.clientCity || "",
          announcerName: data.announcerName || "",
          announcerEmail: data.announcerEmail || "",
          announcerPhone: data.announcerPhone || "",
          announcerAddress: data.announcerAddress || "",
          announcerStreet: data.announcerStreet || "",
          announcerPostalCode: data.announcerPostalCode || "",
          announcerCity: data.announcerCity || "",
          companyName: data.companyName || "",
          siret: data.siret ? `SIRET : ${data.siret}` : "",
          capital: data.capital ? `Capital : ${data.capital.toLocaleString("fr-FR").replace(/\s/g, " ")} €` : "",
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
          itemsTable: "__PLACEHOLDER__",
          totalsTable: "__PLACEHOLDER__",
          ...(companyLogoBase64 ? { companyLogo: companyLogoBase64 } : {}),
        },
      ];

      // 10. Remplacer les {{balise}} dans les cellules freeText des tableaux
      const inputData0 = inputs[0] as Record<string, string>;
      const replaceTags = (text: string) => text.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => inputData0[key] ?? key);
      const resolvedItemsTable = itemsTable.map((row: string[]) => row.map(replaceTags));
      const resolvedTotalsRows = totalsRows.map((row: string[]) => row.map(replaceTags));
      inputData0.itemsTable = JSON.stringify(resolvedItemsTable);
      inputData0.totalsTable = JSON.stringify(resolvedTotalsRows);

      // 11. Générer le PDF avec pdfme
      const { generate } = await import("@pdfme/generator");
      const { text, image, table, line, rectangle } = await import("@pdfme/schemas");

      const templateData = JSON.parse(template.templateJson);
      const plugins = { text, image, table, line, rectangle };

      // Préserver les textes libres et images statiques (non-balises) du template
      const inputData = inputs[0];
      for (const page of templateData.schemas) {
        for (const schema of page) {
          if (!(schema.name in inputData) && schema.content) {
            inputData[schema.name] = schema.content;
          }
        }
      }

      // Remplacer les balises {{key}} dans tous les inputs texte
      for (const key of Object.keys(inputData)) {
        const val = inputData[key];
        if (typeof val === "string" && val.includes("{{")) {
          inputData[key] = val.replace(/\{\{(\w+)\}\}/g, (_match: string, fieldKey: string) => {
            return inputData[fieldKey] ?? fieldKey;
          });
        }
      }

      // Si le footer est activé, retirer les éléments de la zone footer du template principal
      // (ils seront rendus via un PDF séparé en post-traitement)
      const hfConfig = templateData._headerFooterConfig;
      const genTemplate = JSON.parse(JSON.stringify(templateData));
      const paddingTop = templateData.basePdf?.padding?.[0] ?? 20;
      let footerThresholdY = Infinity;
      if (hfConfig?.footer?.enabled) {
        footerThresholdY = 297 - hfConfig.footer.height - paddingTop;
        for (let p = 0; p < genTemplate.schemas.length; p++) {
          genTemplate.schemas[p] = genTemplate.schemas[p].filter(
            (s: any) => s.type === "table" || (s.position?.y || 0) < footerThresholdY
          );
        }
      }

      // Charger les polices pour la génération
      const fontUrls: Record<string, { url: string; fallback?: boolean }> = {
        "Montserrat":           { url: "https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-Regular.ttf", fallback: true },
        "Montserrat Bold":      { url: "https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-Bold.ttf" },
        "Montserrat SemiBold":  { url: "https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-SemiBold.ttf" },
        "Montserrat Italic":    { url: "https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-Italic.ttf" },
        "Montserrat Bold Italic": { url: "https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-BoldItalic.ttf" },
        "Montserrat Light":     { url: "https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-Light.ttf" },
      };
      const pdfFont: Record<string, { data: ArrayBuffer; fallback?: boolean }> = {};
      await Promise.all(
        Object.entries(fontUrls).map(async ([key, def]) => {
          try {
            const res = await fetch(def.url);
            if (res.ok) pdfFont[key] = { data: await res.arrayBuffer(), ...(def.fallback ? { fallback: true } : {}) };
          } catch { /* skip */ }
        })
      );

      const genOpts: any = { template: genTemplate, inputs, plugins };
      if (Object.keys(pdfFont).length > 0) genOpts.options = { font: pdfFont };
      let pdfBytes = await generate(genOpts);

      // 11. Post-traitement : en-tête / pied de page (AVANT numérotation)
      if (hfConfig?.header?.enabled || hfConfig?.footer?.enabled) {
        const pdfLib = await import("pdf-lib");
        const pdfDoc = await pdfLib.PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        const mainPageCount = pages.length;

        if (mainPageCount > 0) {
          const firstPage = pages[0];
          const { width: pageW, height: pageH } = firstPage.getSize();
          const mmToPt = 2.835;

          // ── Header : embarquer depuis page 1 (les éléments du haut ne bougent pas) ──
          let headerEmbed: any = null;
          if (hfConfig.header?.enabled) {
            const hH = hfConfig.header.height * mmToPt;
            [headerEmbed] = await pdfDoc.embedPages([firstPage], [
              { left: 0, bottom: pageH - hH, right: pageW, top: pageH },
            ]);
          }

          // ── Footer : PDF séparé avec uniquement les éléments de la zone footer ──
          let footerEmbed: any = null;
          if (hfConfig.footer?.enabled) {
            const fH = hfConfig.footer.height * mmToPt;

            const footerTemplate = JSON.parse(JSON.stringify(templateData));
            let hasFooterElements = false;
            for (let p = 0; p < footerTemplate.schemas.length; p++) {
              footerTemplate.schemas[p] = footerTemplate.schemas[p].filter(
                (s: any) => s.position?.y >= footerThresholdY
              );
              if (footerTemplate.schemas[p].length > 0) hasFooterElements = true;
            }
            delete footerTemplate._pageNumberConfig;
            delete footerTemplate._headerFooterConfig;

            if (hasFooterElements) {
              const footerGenOpts: any = { template: footerTemplate, inputs, plugins };
              if (Object.keys(pdfFont).length > 0) footerGenOpts.options = { font: pdfFont };
              const footerPdfBytes = await generate(footerGenOpts);
              const footerDoc = await pdfLib.PDFDocument.load(footerPdfBytes);
              const [copiedFooterPage] = await pdfDoc.copyPages(footerDoc, [0]);
              pdfDoc.addPage(copiedFooterPage);
              const tempPage = pdfDoc.getPage(pdfDoc.getPageCount() - 1);
              [footerEmbed] = await pdfDoc.embedPages([tempPage], [
                { left: 0, bottom: 0, right: pageW, top: fH },
              ]);
              pdfDoc.removePage(pdfDoc.getPageCount() - 1);
            }
          }

          // ── Appliquer header ──
          if (headerEmbed && hfConfig.header?.enabled) {
            const hH = hfConfig.header.height * mmToPt;
            const repeat = hfConfig.header.repeat;
            for (let i = 0; i < mainPageCount; i++) {
              const apply = shouldApplyToPageServer(repeat, i);
              if (i > 0 && apply) {
                pages[i].drawRectangle({ x: 0, y: pageH - hH, width: pageW, height: hH, color: pdfLib.rgb(1, 1, 1) });
                pages[i].drawPage(headerEmbed, { x: 0, y: pageH - hH });
              }
              if (i === 0 && !apply) {
                pages[0].drawRectangle({ x: 0, y: pageH - hH, width: pageW, height: hH, color: pdfLib.rgb(1, 1, 1) });
              }
            }
            if (hfConfig.header.showLine) {
              const lineY = pageH - hH;
              for (let i = 0; i < mainPageCount; i++) {
                if (shouldApplyToPageServer(repeat, i)) {
                  pages[i].drawLine({ start: { x: 20, y: lineY }, end: { x: pageW - 20, y: lineY }, thickness: 0.5, color: pdfLib.rgb(0.85, 0.87, 0.89) });
                }
              }
            }
          }

          // ── Appliquer footer (sur TOUTES les pages, y compris page 1) ──
          if (footerEmbed && hfConfig.footer?.enabled) {
            const fH = hfConfig.footer.height * mmToPt;
            const repeat = hfConfig.footer.repeat;
            for (let i = 0; i < mainPageCount; i++) {
              const apply = shouldApplyToPageServer(repeat, i);
              if (apply) {
                pages[i].drawRectangle({ x: 0, y: 0, width: pageW, height: fH, color: pdfLib.rgb(1, 1, 1) });
                pages[i].drawPage(footerEmbed, { x: 0, y: 0 });
              }
            }
            if (hfConfig.footer.showLine) {
              const lineY = fH;
              for (let i = 0; i < mainPageCount; i++) {
                if (shouldApplyToPageServer(repeat, i)) {
                  pages[i].drawLine({ start: { x: 20, y: lineY }, end: { x: pageW - 20, y: lineY }, thickness: 0.5, color: pdfLib.rgb(0.85, 0.87, 0.89) });
                }
              }
            }
          }

          pdfBytes = await pdfDoc.save();
        }
      }

      // 12. Post-traitement : numérotation de pages (APRÈS header/footer pour ne pas être masquée)
      const pageNumConfig = templateData._pageNumberConfig;
      if (pageNumConfig?.enabled) {
        const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const pages = pdfDoc.getPages();
        const totalPages = pages.length;

        for (let i = 0; i < totalPages; i++) {
          const page = pages[i];
          const { width, height } = page.getSize();
          const label = formatPageNum(pageNumConfig.format, i + 1, totalPages);
          const textWidth = font.widthOfTextAtSize(label, pageNumConfig.fontSize);
          const marginX = 20;

          let x: number;
          if (pageNumConfig.alignment === "left") x = marginX;
          else if (pageNumConfig.alignment === "right") x = width - textWidth - marginX;
          else x = (width - textWidth) / 2;

          const mmToPt = 2.835;
          const y = pageNumConfig.position === "footer"
            ? pageNumConfig.marginY * mmToPt
            : height - pageNumConfig.marginY * mmToPt - pageNumConfig.fontSize;

          page.drawText(label, { x, y, size: pageNumConfig.fontSize, font, color: rgb(0.58, 0.64, 0.69) });
        }

        pdfBytes = await pdfDoc.save();
      }

      // 13. Stocker le PDF dans Convex storage
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const storageId = await ctx.storage.store(blob);

      // 14. Mettre à jour la facture avec le storageId
      await ctx.runMutation(internal.services.pdfGeneratorQueries.updateInvoicePdf, {
        invoiceId: args.invoiceId,
        pdfStorageId: storageId,
      });

      console.log(`PDF généré et stocké pour facture ${invoice.invoiceNumber}`);

      // 15. Envoi email "Facture suite à validation prestation" au client AVEC PDF en PJ
      //     Conditions :
      //       - destinataire = client (recipientType="client")
      //       - mission liée existe et est confirmée (clientConfirmedAt OU autoConfirmedAt)
      //     Le PDF est encodé base64 et envoyé via Resend HTTP direct (pattern client_receipt).
      try {
        if (invoice.recipientType === "client" && invoice.missionId) {
          const emailCtx = await ctx.runQuery(
            internal.services.pdfGeneratorQueries.getInvoiceEmailContext,
            { invoiceId: args.invoiceId }
          );

          if (emailCtx && emailCtx.clientEmail && emailCtx.emailConfig?.apiKey) {
            const pdfBase64 = Buffer.from(pdfBytes).toString("base64");
            const filename = `facture-${invoice.invoiceNumber}.pdf`;

            // Récupérer template email (BDD prio, fallback HTML inline)
            const emailTemplate = emailCtx.emailTemplate; // {subject, htmlContent} ou null
            const totalStr = (invoice.amount / 100).toLocaleString("fr-FR", {
              style: "currency",
              currency: "EUR",
            });
            const documentTypeLabel = invoice.documentType === "invoice" ? "Facture" : "Reçu";
            const validationType = emailCtx.autoConfirmed
              ? "auto-confirmée après le délai"
              : "confirmée par vous";
            const vars: Record<string, string> = {
              clientName: emailCtx.clientFirstName || "",
              serviceName: emailCtx.serviceName || "",
              announcerName: emailCtx.announcerName || "",
              invoiceNumber: invoice.invoiceNumber,
              documentTypeLabel,
              totalAmount: totalStr,
              amountHT: invoice.amountHT
                ? (invoice.amountHT / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })
                : totalStr,
              tva: invoice.tva
                ? (invoice.tva / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })
                : "0,00 €",
              vatRate: String(invoice.vatRate ?? 0),
              startDate: emailCtx.startDate || "",
              endDate: emailCtx.endDate || emailCtx.startDate || "",
              validationType,
              siteName: "Animigo",
              reservationsUrl: `${emailCtx.appUrl || ""}/client/reservations`,
              facturesUrl: `${emailCtx.appUrl || ""}/client/factures`,
            };
            const replaceVars = (str: string) =>
              str.replace(/\{\{(\w+)\}\}/g, (_m, k) => vars[k] ?? "");

            const subject = emailTemplate?.subject
              ? replaceVars(emailTemplate.subject)
              : `✓ Prestation terminée · Votre ${documentTypeLabel.toLowerCase()} ${invoice.invoiceNumber} en pièce jointe`;
            const html = emailTemplate?.htmlContent
              ? replaceVars(emailTemplate.htmlContent)
              : `<p>Bonjour ${vars.clientName},</p><p>Votre ${documentTypeLabel.toLowerCase()} <strong>${invoice.invoiceNumber}</strong> pour ${vars.serviceName} (${totalStr}) est jointe à cet email.</p><p>— l'équipe Animigo</p>`;

            const fromEmail = emailCtx.emailConfig.fromEmail || "onboarding@resend.dev";
            const fromName = emailCtx.emailConfig.fromName || "Animigo";

            const resendResp = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${emailCtx.emailConfig.apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: `${fromName} <${fromEmail}>`,
                to: emailCtx.clientEmail,
                subject,
                html,
                attachments: [{ filename, content: pdfBase64 }],
              }),
            });
            if (resendResp.ok) {
              const j = await resendResp.json();
              console.log(`[generatePdfFromTemplate] Email facture envoyé : id=${j.id} to=${emailCtx.clientEmail}`);
            } else {
              const errText = await resendResp.text();
              console.warn(`[generatePdfFromTemplate] Échec envoi email facture (${resendResp.status}): ${errText.slice(0, 200)}`);
            }
          } else {
            console.log("[generatePdfFromTemplate] Email facture non envoyé (clientEmail ou apiKey manquant)");
          }
        }
      } catch (emailErr) {
        console.warn("[generatePdfFromTemplate] Erreur envoi email facture (PDF généré OK):", emailErr);
      }

      return { success: true, storageId };
    } catch (error) {
      console.error("Erreur génération PDF:", error);
      return { success: false, error: error instanceof Error ? error.message : "Erreur inconnue" };
    }
  },
});

function shouldApplyToPageServer(repeat: string, pageIndex: number): boolean {
  const pageNum = pageIndex + 1;
  switch (repeat) {
    case "all_pages": return true;
    case "first_page_only": return pageIndex === 0;
    case "all_except_first": return pageIndex > 0;
    case "even_pages": return pageNum % 2 === 0;
    case "odd_pages": return pageNum % 2 === 1;
    default: return true;
  }
}

function formatPageNum(format: string, page: number, total: number): string {
  switch (format) {
    case "page_x_of_y": return `Page ${page} sur ${total}`;
    case "x_of_y": return `${page} sur ${total}`;
    case "x_slash_y": return `${page} / ${total}`;
    case "page_x": return `Page ${page}`;
    default: return `${page} / ${total}`;
  }
}
