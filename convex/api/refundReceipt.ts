// @ts-nocheck
"use node";

/**
 * Génération automatique du bon de remboursement CLIENT après annulation.
 *
 * Pipeline (mêmes contraintes self-hosted que clientReceipt.ts) :
 *   1. cancelMissionByClient (planning/cancellation.ts) déclenche le refund Stripe
 *      puis schedule prepareAndDispatchRefundReceipt (mutation)
 *   2. prepareAndDispatchRefundReceipt (mutation, ctx.db direct) :
 *      - charge mission + client + annonceur + payment + plateforme configs + emailConfig
 *      - charge le pdfTemplate "refund_receipt" (default si plusieurs)
 *      - construit inputs PDF avec toutes les balises de remboursement
 *      - schedule renderRefundReceiptPdf avec tout en args
 *   3. renderRefundReceiptPdf (cette action, "use node" pour pdfme) :
 *      - génère le PDF via pdfme
 *      - patch la mission via HTTP API Convex (base64 fallback)
 *      - envoie email Resend en direct (avec PDF en PJ)
 *
 *   4. Le client reçoit un email avec son bon de remboursement en PDF.
 *      Il peut aussi le retélécharger depuis /client/factures (à ajouter UI).
 */

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

export const renderRefundReceiptPdf = internalAction({
  args: {
    missionId: v.id("missions"),
    refundReference: v.string(),
    templateJson: v.string(),
    inputsJson: v.string(),
    uploadUrl: v.string(),
    emailArgs: v.any(),
    convexUrl: v.optional(v.string()),
    convexAdminKey: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; storageId?: string; error?: string }> => {
    console.log("[renderRefundReceiptPdf] Démarrage pour mission:", args.missionId);

    try {
      // 1. Génération PDF via pdfme (require + tous plugins)
      const generatorMod = require("@pdfme/generator");
      const schemasMod: any = require("@pdfme/schemas");
      const generate = generatorMod.generate ?? generatorMod.default?.generate;
      const schemas = schemasMod.default ?? schemasMod;

      const template = JSON.parse(args.templateJson);
      const inputs = JSON.parse(args.inputsJson);

      const plugins: Record<string, any> = {
        text: schemas.text,
        multiVariableText: schemas.multiVariableText,
        image: schemas.image,
        svg: schemas.svg,
        table: schemas.table,
        line: schemas.line,
        rectangle: schemas.rectangle,
        ellipse: schemas.ellipse,
        dateTime: schemas.dateTime,
        date: schemas.date,
        time: schemas.time,
        select: schemas.select,
        radioGroup: schemas.radioGroup,
        checkbox: schemas.checkbox,
        ...(schemas.barcodes || {}),
      };
      for (const k of Object.keys(plugins)) if (!plugins[k]) delete plugins[k];

      // Auto-fill labels statiques absents des inputs
      if (Array.isArray(inputs) && inputs[0]) {
        const allSchemas: Array<{ name?: string; content?: string }> = (template.schemas || []).flat();
        for (const sch of allSchemas) {
          if (!sch?.name) continue;
          if (inputs[0][sch.name] === undefined) {
            inputs[0][sch.name] = sch.content ?? "";
          }
        }
      }

      const pdf = await generate({ template, inputs, plugins });
      const pdfBuffer = pdf.buffer as ArrayBuffer;
      console.log(`[renderRefundReceiptPdf] PDF généré (${pdfBuffer.byteLength} bytes)`);

      // 2. Upload best-effort
      let storageId: string | null = null;
      try {
        const uploadResp = await fetch(args.uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "application/pdf" },
          body: new Uint8Array(pdfBuffer),
        });
        if (uploadResp.ok) {
          const json = await uploadResp.json();
          storageId = json.storageId;
        }
      } catch {
        // ignore (fallback base64)
      }

      const pdfBase64 = Buffer.from(pdfBuffer as ArrayBuffer).toString("base64");
      const filename = `bon-remboursement-${args.refundReference}.pdf`;

      // 3. Patch mission (base64 fallback) via HTTP API Convex
      if (args.convexUrl && args.convexAdminKey) {
        try {
          const patchResp = await fetch(
            `${args.convexUrl}/api/run/api/refundReceiptQueries/attachRefundPdfBase64`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Convex ${args.convexAdminKey}`,
              },
              body: JSON.stringify({
                args: {
                  missionId: args.missionId,
                  pdfBase64,
                  filename,
                  storageId,
                },
                format: "json",
              }),
            }
          );
          if (!patchResp.ok) {
            const errTxt = await patchResp.text();
            console.warn(`[renderRefundReceiptPdf] Patch base64 échec (${patchResp.status}): ${errTxt.slice(0, 200)}`);
          }
        } catch (patchErr) {
          console.warn(`[renderRefundReceiptPdf] Patch exception: ${patchErr instanceof Error ? patchErr.message : "inconnu"}`);
        }
      }

      // 4. Envoi email Resend direct (avec PJ)
      const ea = args.emailArgs || {};
      if (!ea.clientEmail || !ea.emailConfig?.apiKey) {
        console.warn("[renderRefundReceiptPdf] Email non envoyé (clientEmail ou apiKey manquant)");
        return { success: true };
      }

      const fromEmail = ea.emailConfig.fromEmail || "onboarding@resend.dev";
      const fromName = ea.emailConfig.fromName || "Animigo";
      const fromStr = `${fromName} <${fromEmail}>`;
      const refundStr = (ea.refundAmount / 100).toLocaleString("fr-FR", {
        style: "currency",
        currency: "EUR",
      });
      const totalStr = (ea.totalAmount / 100).toLocaleString("fr-FR", {
        style: "currency",
        currency: "EUR",
      });

      // Subject : utilise celui pré-rendu (depuis BDD ou défaut), fallback sur l'inline
      const subject = ea.emailSubject || `↩ Remboursement confirmé · ${refundStr} · ${ea.serviceName}`;

      // HTML : si pré-rendu (template BDD existant ou sera fourni par defaut DEFAULT_TEMPLATES),
      // l'utiliser directement. Sinon fallback sur le HTML inline ci-dessous (legacy).
      const html = ea.emailHtml || `<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:#fcfaf4;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#1f1f1d;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fcfaf4;">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ece9e1;">
    <tr>
      <td style="padding:32px;background-color:#fef3c7;border-bottom:1px solid #fde68a;">
        <span style="display:inline-block;padding:6px 14px;background-color:#f59e0b;color:#ffffff;font-size:11px;font-weight:bold;letter-spacing:1px;border-radius:99px;">↩ REMBOURSEMENT</span>
        <h1 style="margin:14px 0 0 0;color:#78350f;font-size:24px;">Bon de remboursement</h1>
        <p style="margin:6px 0 0 0;color:#92400e;font-size:12px;">Réf. : <span style="font-family:'Courier New',monospace;color:#78350f;">${args.refundReference}</span></p>
        <p style="margin:14px 0 0 0;color:#9c9484;font-size:10px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Montant remboursé</p>
        <p style="margin:4px 0 0 0;color:#10b981;font-size:28px;font-weight:bold;">${refundStr}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 32px;">
        <p style="margin:0;color:#1f1f1d;font-size:15px;">Bonjour <strong>${ea.clientName}</strong>,</p>
        <p style="margin:12px 0 0 0;color:#6d6d68;font-size:14px;line-height:1.6;">Suite à l'annulation de votre réservation <strong style="color:#1f3a33;">${ea.serviceName}</strong>, un remboursement de <strong style="color:#10b981;">${refundStr}</strong> a été effectué sur votre carte bancaire d'origine.</p>
        <p style="margin:12px 0 0 0;color:#6d6d68;font-size:14px;line-height:1.6;">Le remboursement apparaîtra sur votre compte sous 3 à 5 jours ouvrés selon votre banque.</p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;background-color:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;">
          <tr><td style="padding:18px 20px;color:#065f46;font-size:14px;font-weight:bold;">📎 Votre bon de remboursement PDF est joint à cet email</td></tr>
        </table>

        <p style="margin:20px 0 8px 0;color:#9c9484;font-size:10px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Détail du remboursement</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fcfaf4;border:1px solid #ece9e1;border-radius:10px;">
          <tr><td style="padding:14px 16px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="padding:4px 0;color:#9c9484;font-size:12.5px;width:55%;">Montant payé initialement</td><td style="padding:4px 0;color:#1f1f1d;font-size:13px;font-weight:600;text-align:right;">${totalStr}</td></tr>
              <tr><td style="padding:4px 0;color:#9c9484;font-size:12.5px;">Frais de service retenus</td><td style="padding:4px 0;color:#dc2626;font-size:13px;font-weight:600;text-align:right;">−${(ea.platformFeeRetained / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</td></tr>
              <tr><td style="padding:4px 0;color:#9c9484;font-size:12.5px;">Frais bancaires retenus</td><td style="padding:4px 0;color:#dc2626;font-size:13px;font-weight:600;text-align:right;">−${(ea.stripeFeeRetained / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</td></tr>
              ${ea.announcerRetained > 0 ? `<tr><td style="padding:4px 0;color:#9c9484;font-size:12.5px;">Pénalité d'annulation</td><td style="padding:4px 0;color:#dc2626;font-size:13px;font-weight:600;text-align:right;">−${(ea.announcerRetained / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</td></tr>` : ""}
              <tr><td style="padding:8px 0 4px 0;color:#9c9484;font-size:12.5px;border-top:1px solid #ece9e1;">Remboursement net</td><td style="padding:8px 0 4px 0;color:#10b981;font-size:15px;font-weight:bold;text-align:right;border-top:1px solid #ece9e1;">${refundStr}</td></tr>
            </table>
          </td></tr>
        </table>

        <p style="margin:16px 0 0 0;color:#9c9484;font-size:11px;line-height:1.5;font-style:italic;">${ea.refundReason || "Conformément aux conditions générales de vente."}</p>
      </td>
    </tr>
    <tr>
      <td align="center" style="background-color:#fcfaf4;padding:24px 32px;border-top:1px solid #f1ede3;">
        <p style="margin:0;color:#1f3a33;font-size:13px;font-weight:600;">Animigo</p>
        <p style="margin:6px 0 0 0;color:#9c9484;font-size:11px;">Plateforme de services animaliers</p>
      </td>
    </tr>
  </table>
</td></tr></table></body></html>`;

      const resendResp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ea.emailConfig.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromStr,
          to: ea.clientEmail,
          subject,
          html,
          attachments: [{ filename, content: pdfBase64 }],
        }),
      });

      if (!resendResp.ok) {
        const errText = await resendResp.text();
        throw new Error(`Resend échec (${resendResp.status}): ${errText.slice(0, 300)}`);
      }
      const resendJson = await resendResp.json();
      console.log(`[renderRefundReceiptPdf] Email envoyé : id=${resendJson.id} to=${ea.clientEmail}`);

      return { success: true, storageId: storageId || undefined };
    } catch (err) {
      console.error("[renderRefundReceiptPdf] Erreur:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erreur inconnue",
      };
    }
  },
});
