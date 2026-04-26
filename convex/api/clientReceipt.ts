// @ts-nocheck
"use node";

/**
 * Génération automatique du reçu de paiement CLIENT après paiement Stripe réussi.
 *
 * IMPORTANT — Convex self-hosted limitation :
 *   `ctx.runQuery` depuis une action retourne du HTML (page 404 du dashboard) au lieu
 *   d'exécuter la query. Pour contourner ça, toute la lecture BDD se fait dans la
 *   mutation `prepareAndDispatchClientReceipt` (clientReceiptQueries.ts) qui pré-construit
 *   les inputs PDF + les données email, puis schedule cette action avec tout en args.
 *
 * Pipeline (post-paiement) :
 *   1. confirmPaymentSuccess (stripeClient.ts) OU markPaymentPaid (stripePaymentLifecycle.ts)
 *      → ctx.scheduler.runAfter(0, internal.api.clientReceiptQueries.prepareAndDispatchClientReceipt, { missionId, paymentIntentId, cardBrand?, cardLast4? })
 *
 *   2. prepareAndDispatchClientReceipt (mutation, ctx.db direct) :
 *      - lit mission + payment + client + announcer + profile + plateforme configs + emailConfig
 *      - charge le pdfTemplate par défaut "client_receipt"
 *      - construit l'objet inputs (toutes les balises pdfme)
 *      - schedule renderClientReceiptPdf avec templateJson + inputsJson + tous les args email
 *
 *   3. renderClientReceiptPdf (cette action, "use node" pour pdfme) :
 *      - génère le PDF via pdfme/generator
 *      - stocke dans Convex storage → storageId
 *      - encode en base64 pour l'email
 *      - schedule attachReceiptToMission (patch mission.clientReceiptStorageId)
 *      - schedule sendPaymentReceiptEmail avec PDF en pièce jointe
 *
 *   4. Le client peut télécharger depuis son dashboard via getClientReceiptUrl (clientReceiptQueries.ts)
 */

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

export const renderClientReceiptPdf = internalAction({
  args: {
    missionId: v.id("missions"),
    paymentIntentId: v.string(),
    cardBrand: v.optional(v.string()),
    cardLast4: v.optional(v.string()),
    templateJson: v.string(),
    inputsJson: v.string(),
    // URL d'upload Convex storage pré-générée par la mutation (workaround self-hosted)
    uploadUrl: v.string(),
    // Données email pré-résolues (la mutation a déjà fait toutes les lectures BDD)
    emailArgs: v.any(),
    // Configs pour les workarounds self-hosted : Stripe pour brand/last4, Convex HTTP API pour patcher la mission
    stripeSecretKey: v.optional(v.string()),
    convexUrl: v.optional(v.string()),
    convexAdminKey: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; storageId?: string; error?: string }> => {
    console.log("[renderClientReceiptPdf] Démarrage pour mission:", args.missionId);

    try {
      // 1. Génération du PDF via pdfme.
      //    "use node" → utiliser require() directement car le dynamic import esbuild
      //    ne résout pas les named exports CJS de @pdfme/schemas (tous undefined).
      const generatorMod = require("@pdfme/generator");
      const schemasMod: any = require("@pdfme/schemas");
      const generate = generatorMod.generate ?? generatorMod.default?.generate;
      const schemas = schemasMod.default ?? schemasMod;

      const template = JSON.parse(args.templateJson);
      const inputs = JSON.parse(args.inputsJson);

      // 1bis. Si cardBrand/cardLast4 manquants, récup depuis Stripe API (PaymentIntent expand=payment_method)
      let cardBrand = args.cardBrand;
      let cardLast4 = args.cardLast4;
      if ((!cardBrand || !cardLast4) && args.stripeSecretKey) {
        try {
          const stripeResp = await fetch(
            `https://api.stripe.com/v1/payment_intents/${args.paymentIntentId}?expand[]=payment_method`,
            { headers: { Authorization: `Bearer ${args.stripeSecretKey}` } }
          );
          if (stripeResp.ok) {
            const pi: any = await stripeResp.json();
            const card = pi?.payment_method?.card;
            if (card) {
              cardBrand = cardBrand || card.brand;
              cardLast4 = cardLast4 || card.last4;
              console.log(`[renderClientReceiptPdf] Card récupérée depuis Stripe : ${cardBrand} •••• ${cardLast4}`);
            }
          } else {
            console.warn(`[renderClientReceiptPdf] Stripe API ${stripeResp.status} pour récup card`);
          }
        } catch (stripeErr) {
          console.warn(`[renderClientReceiptPdf] Échec fetch Stripe: ${stripeErr instanceof Error ? stripeErr.message : "inconnu"}`);
        }
      }

      // Patch les inputs avec les vraies données carte (overwrite les valeurs par défaut "—" / "Carte")
      if (Array.isArray(inputs) && inputs[0] && (cardBrand || cardLast4)) {
        if (cardLast4) inputs[0].cardLast4 = `•••• ${cardLast4}`;
        if (cardBrand) inputs[0].cardBrand = cardBrand.charAt(0).toUpperCase() + cardBrand.slice(1);
        if (cardBrand && cardLast4) {
          inputs[0].paymentMethod = `${cardBrand.charAt(0).toUpperCase() + cardBrand.slice(1)} •••• ${cardLast4}`;
        }
      }

      // Auto-fill : pour chaque schéma du template absent des inputs (typiquement
      // les labels statiques "labelPaymentDate", "labelTransaction", "sectionService" etc.),
      // récupérer son `content` par défaut. pdfme rend vide les schémas sans input,
      // donc sans cette étape les labels n'apparaissent pas dans le PDF.
      if (Array.isArray(inputs) && inputs[0]) {
        const allSchemas: Array<{ name?: string; content?: string }> = (template.schemas || []).flat();
        const autoFilled: string[] = [];
        for (const sch of allSchemas) {
          if (!sch?.name) continue;
          if (inputs[0][sch.name] === undefined) {
            inputs[0][sch.name] = sch.content ?? "";
            autoFilled.push(sch.name);
          }
        }
        console.log(
          `[renderClientReceiptPdf] Schémas total: ${allSchemas.length}, auto-fill ${autoFilled.length} clés (${autoFilled.slice(0, 10).join(", ")}${autoFilled.length > 10 ? "..." : ""})`
        );
      }

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

      // Filtrer les undefined (plugins absents de la version installée)
      for (const k of Object.keys(plugins)) {
        if (!plugins[k]) delete plugins[k];
      }

      // Log de debug
      const schemaTypes = (template.schemas || [])
        .flat()
        .map((s: any) => s?.type)
        .filter(Boolean);
      console.log(`[renderClientReceiptPdf] Schémas dans le template: ${[...new Set(schemaTypes)].join(", ")}`);
      console.log(`[renderClientReceiptPdf] Plugins enregistrés: ${Object.keys(plugins).join(", ")}`);

      const pdf = await generate({ template, inputs, plugins });
      const pdfBuffer = pdf.buffer as ArrayBuffer;

      // 2. Upload du PDF via l'URL pré-générée — tentative best-effort.
      //    Si le storage Convex est mal configuré sur cette instance self-hosted (404),
      //    on continue quand même : l'email avec PDF en PJ reste envoyé. Seul le
      //    téléchargement depuis /client/factures sera indisponible.
      console.log(`[renderClientReceiptPdf] PDF size = ${pdfBuffer.byteLength} bytes`);
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
          console.log(`[renderClientReceiptPdf] PDF stocké : ${storageId}`);
        } else {
          console.warn(
            `[renderClientReceiptPdf] Upload storage échoué (${uploadResp.status}). ` +
              `PDF envoyé en PJ email seulement (téléchargement /client/factures indisponible). ` +
              `À fixer côté infra : routage de /api/storage/upload sur le backend Convex.`
          );
        }
      } catch (uploadErr) {
        console.warn(
          `[renderClientReceiptPdf] Upload storage exception : ${uploadErr instanceof Error ? uploadErr.message : "inconnu"}. ` +
            `Continue avec email seulement.`
        );
      }

      // 3. Encodage base64 pour pièce jointe email
      const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");
      const filename = `recu-paiement-${String(args.missionId).slice(-6).toUpperCase()}.pdf`;

      // 4. Patcher la mission avec le PDF (base64 fallback) via HTTP API Convex
      //    (ctx.scheduler depuis action est cassé sur self-hosted, mais l'API HTTP
      //    avec admin key fonctionne — c'est le pattern utilisé dans createPaymentIntent).
      if (args.convexUrl && args.convexAdminKey) {
        try {
          const patchResp = await fetch(`${args.convexUrl}/api/run/api/clientReceiptQueries/attachReceiptPdfBase64`, {
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
              },
              format: "json",
            }),
          });
          if (patchResp.ok) {
            console.log(`[renderClientReceiptPdf] PDF base64 patché sur mission via HTTP API Convex`);
          } else {
            const errTxt = await patchResp.text();
            console.warn(`[renderClientReceiptPdf] Patch base64 mission échoué (${patchResp.status}): ${errTxt.slice(0, 200)}`);
          }
        } catch (patchErr) {
          console.warn(
            `[renderClientReceiptPdf] Patch base64 exception: ${patchErr instanceof Error ? patchErr.message : "inconnu"}`
          );
        }
      } else {
        console.warn("[renderClientReceiptPdf] convexUrl ou convexAdminKey manquant — PDF dispo uniquement par email");
      }

      // 5. Envoi email Resend en DIRECT via fetch (bypass total de Convex car
      //    ctx.scheduler.runAfter retourne 404 depuis une action self-hosted).
      const ea = args.emailArgs || {};
      if (!ea.clientEmail || !ea.emailConfig?.apiKey) {
        console.warn("[renderClientReceiptPdf] Email non envoyé (clientEmail ou apiKey manquant)");
        return { success: true };
      }

      const fromEmail = ea.emailConfig.fromEmail || "onboarding@resend.dev";
      const fromName = ea.emailConfig.fromName || "Animigo";
      const fromStr = `${fromName} <${fromEmail}>`;
      const totalAmountStr = (ea.totalAmount / 100).toLocaleString("fr-FR", {
        style: "currency",
        currency: "EUR",
      });
      const subject = `✓ Paiement confirmé · ${ea.serviceName} · Reçu PDF en pièce jointe`;
      const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:#fcfaf4;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#1f1f1d;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fcfaf4;">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ece9e1;">
    <tr><td style="padding:32px;background-color:#f5f9f6;border-bottom:1px solid #cfdbd3;">
      <span style="display:inline-block;padding:6px 14px;background-color:#10b981;color:#ffffff;font-size:11px;font-weight:bold;letter-spacing:1px;border-radius:99px;">✓ PAIEMENT REÇU</span>
      <h1 style="margin:14px 0 0 0;color:#1f3a33;font-size:24px;">Merci pour votre paiement</h1>
      <p style="margin:6px 0 0 0;color:#6d6d68;font-size:12px;">Réf. : <span style="font-family:'Courier New',monospace;color:#1f3a33;">${args.paymentIntentId}</span></p>
      <p style="margin:14px 0 0 0;color:#9c9484;font-size:10px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Montant payé</p>
      <p style="margin:4px 0 0 0;color:#10b981;font-size:28px;font-weight:bold;">${totalAmountStr}</p>
    </td></tr>
    <tr><td style="padding:28px 32px;">
      <p style="margin:0;color:#1f1f1d;font-size:15px;">Bonjour <strong>${ea.clientName}</strong>,</p>
      <p style="margin:12px 0 0 0;color:#6d6d68;font-size:14px;line-height:1.6;">Votre paiement de <strong style="color:#1f3a33;">${totalAmountStr}</strong> pour <strong style="color:#1f3a33;">${ea.serviceName}</strong> avec ${ea.announcerName} a bien été reçu.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;background-color:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;">
        <tr><td style="padding:18px 20px;color:#065f46;font-size:14px;font-weight:bold;">📎 Votre reçu PDF est joint à cet email</td></tr>
      </table>
      <p style="margin:20px 0 0 0;color:#9c9484;font-size:11px;line-height:1.5;">Animigo agit en tant que plateforme de mise en relation. Paiement sécurisé traité par Stripe Payments Europe Ltd. Les fonds sont conservés sur le compte séquestre Animigo jusqu'à confirmation du service.</p>
    </td></tr>
    <tr><td align="center" style="background-color:#fcfaf4;padding:24px 32px;border-top:1px solid #f1ede3;">
      <p style="margin:0;color:#1f3a33;font-size:13px;font-weight:600;">Animigo</p>
      <p style="margin:6px 0 0 0;color:#9c9484;font-size:11px;">Plateforme de services animaliers</p>
    </td></tr>
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
          attachments: [
            {
              filename,
              content: pdfBase64,
            },
          ],
        }),
      });

      if (!resendResp.ok) {
        const errText = await resendResp.text();
        throw new Error(`Resend échec (${resendResp.status}): ${errText.slice(0, 300)}`);
      }
      const resendJson = await resendResp.json();
      console.log(`[renderClientReceiptPdf] Email envoyé via Resend : id=${resendJson.id} to=${ea.clientEmail}`);

      return { success: true, storageId: storageId || undefined };
    } catch (err) {
      console.error("[renderClientReceiptPdf] Erreur:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erreur inconnue",
      };
    }
  },
});
