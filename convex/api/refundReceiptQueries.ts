/**
 * Queries / mutations pour les bons de remboursement.
 *
 * - prepareAndDispatchRefundReceipt : mutation orchestratrice qui lit toute la BDD
 *   et schedule l'action PDF avec inputs déjà résolus
 * - attachRefundPdfBase64 : patch mission (appelé via HTTP API depuis l'action)
 */

import { internalMutation, query } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import { getEmailConfigFromDb } from "./emailInternal";

const formatPriceCents = (cents: number) =>
  (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

const formatDateTimeFR = (timestamp: number) => {
  const d = new Date(timestamp);
  const dateStr = d.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
  const timeStr = d.toLocaleTimeString("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dateStr} à ${timeStr}`;
};

export const prepareAndDispatchRefundReceipt = internalMutation({
  args: {
    missionId: v.id("missions"),
    refundAmount: v.number(),
    platformFeeRetained: v.number(),
    stripeFeeRetained: v.number(),
    announcerRetained: v.number(),
    refundReason: v.string(),
    cancellationCount: v.number(),
    // Stripe IDs pour traçabilité dans le PDF
    refundStripeId: v.optional(v.string()),
    refundDelay: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const mission = await ctx.db.get(args.missionId);
    if (!mission) {
      console.error("[prepareAndDispatchRefundReceipt] Mission introuvable:", args.missionId);
      return { success: false, error: "Mission introuvable" };
    }

    const client = await ctx.db.get(mission.clientId);
    const announcer = await ctx.db.get(mission.announcerId);
    const announcerProfile = announcer
      ? await ctx.db
          .query("profiles")
          .withIndex("by_user", (q: any) => q.eq("userId", announcer._id))
          .first()
      : null;
    const payment = await ctx.db
      .query("stripePayments")
      .withIndex("by_mission", (q: any) => q.eq("missionId", args.missionId))
      .first();

    // Charger un template "refund_receipt" — préfère isDefault
    const allTemplates = await ctx.db.query("pdfTemplates").collect();
    const refundTemplates = allTemplates.filter(
      (t: any) => t.documentType === "refund_receipt"
    );
    const template =
      refundTemplates.find((t: any) => t.isDefault) ?? refundTemplates[0] ?? null;

    if (!template) {
      console.warn(
        "[prepareAndDispatchRefundReceipt] Aucun pdfTemplate refund_receipt en BDD. " +
          "Crée-en un dans /admin/pdf-templates (onglet Remboursements)."
      );
      return { success: false, error: "Template PDF remboursement manquant" };
    }
    console.log(
      `[prepareAndDispatchRefundReceipt] Template trouvé : ${template._id} (isDefault=${template.isDefault})`
    );

    const totalAmount = payment?.amount || mission.amount || 0;
    const refundReference = `REM-${new Date().getFullYear()}-${String(args.missionId).slice(-6).toUpperCase()}`;
    const bookingNumber = `RES-${String(args.missionId).slice(-6).toUpperCase()}`;
    const now = Date.now();

    // Date de la mission (range)
    let missionDateRange = "";
    if (mission.startDate === mission.endDate || !mission.endDate) {
      missionDateRange = new Date(mission.startDate).toLocaleDateString("fr-FR");
    } else {
      const ds = new Date(mission.startDate).toLocaleDateString("fr-FR");
      const de = new Date(mission.endDate).toLocaleDateString("fr-FR");
      missionDateRange = `${ds} → ${de}`;
    }

    // Configs plateforme depuis systemConfig
    const cfgKeys = [
      "platform_legal_name", "platform_address", "platform_siret",
      "platform_capital", "platform_contact",
    ];
    const cfgs = await Promise.all(
      cfgKeys.map((k) =>
        ctx.db.query("systemConfig").filter((q: any) => q.eq(q.field("key"), k)).first()
      )
    );
    const [legalCfg, addrCfg, siretCfg, capitalCfg, contactCfg] = cfgs;

    // Statut prestataire
    let providerStatus = "Particulier";
    if (announcer?.accountType === "annonceur_pro") {
      if (announcer.companyType === "micro_enterprise") {
        providerStatus = "Micro-entrepreneur";
      } else {
        providerStatus = announcer.companyType === "regular_company" ? "Société" : "Professionnel";
      }
    }

    // Carte utilisée (lue depuis le payment, persisté par markPaymentPaid)
    const cardBrand = payment?.cardBrand
      ? payment.cardBrand.charAt(0).toUpperCase() + payment.cardBrand.slice(1)
      : "Carte";
    const cardLast4 = payment?.cardLast4 ? `•••• ${payment.cardLast4}` : "—";

    // Numéro d'annulation lisible (1ère, 2ème, 3ème, 4ème, ...)
    const cancellationLabel =
      args.cancellationCount === 0
        ? "1ère annulation"
        : `${args.cancellationCount + 1}ème annulation`;

    // Inputs PDF — toutes les balises remboursement
    const inputs = [
      {
        documentType: "BON DE REMBOURSEMENT",
        refundNumber: refundReference,
        bookingNumber,
        date: `Émis le ${new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}`,
        refundDate: formatDateTimeFR(now),
        refundStatus: "TRAITÉ",
        // Montants
        originalAmount: formatPriceCents(totalAmount),
        refundAmount: formatPriceCents(args.refundAmount),
        platformFeeRetained: formatPriceCents(args.platformFeeRetained),
        stripeFeeRetained: formatPriceCents(args.stripeFeeRetained),
        announcerRetained: formatPriceCents(args.announcerRetained),
        // Carte de remboursement
        cardBrand,
        cardLast4,
        // Stripe IDs (traçabilité)
        transactionId: payment?.paymentIntentId || "—",
        refundStripeId: args.refundStripeId || "(en cours)",
        refundDelay: args.refundDelay || "3 à 5 jours ouvrés",
        // Motif
        refundReason: args.refundReason,
        cancellationCount: cancellationLabel,
        // Service
        serviceName: mission.serviceName || "Prestation",
        bookingDate: missionDateRange,
        // Prestataire
        serviceProvider: announcer ? `${announcer.firstName} ${announcer.lastName}` : "",
        providerStatus,
        providerAddress: announcerProfile?.location || "",
        // Plateforme
        platformName: "Animigo",
        platformLegalName: legalCfg?.value || "Animigo SAS",
        platformAddress: addrCfg?.value || "",
        platformSiret: siretCfg?.value ? `SIRET : ${siretCfg.value}` : "",
        platformCapital: capitalCfg?.value ? `Capital social : ${capitalCfg.value}` : "",
        platformContact: contactCfg?.value || "support@animigo.fr",
        // Client
        clientName: client ? `${client.firstName} ${client.lastName}` : "",
        clientEmail: client?.email || "",
        clientAddress: mission.location || "",
        // Mentions
        refundMention: "Le remboursement apparaîtra sur votre carte bancaire d'origine sous 3 à 5 jours ouvrés.",
        feesMention: "Conformément aux CGV, les frais de service et de gestion bancaire sont conservés par la plateforme.",
        legalMention: "Document généré automatiquement par Animigo. En cas de question, contactez notre support.",
        thankYouMessage: "Merci pour votre confiance — l'équipe Animigo",
        itemsTable: "[]",
        totalsTable: "[]",
      },
    ];

    // Configs pour l'action
    const [convexUrlCfg, convexAdminKeyCfg] = await Promise.all([
      ctx.db.query("systemConfig").withIndex("by_key", (q: any) => q.eq("key", "convex_url")).first(),
      ctx.db.query("systemConfig").withIndex("by_key", (q: any) => q.eq("key", "convex_admin_key")).first(),
    ]);

    let uploadUrl = "";
    try {
      uploadUrl = await ctx.storage.generateUploadUrl();
    } catch {
      // ignore
    }

    // Email config + template depuis BDD (priorité) ou défaut inline
    const emailCfg = await getEmailConfigFromDb(ctx.db);
    const emailTemplate = await ctx.db
      .query("emailTemplates")
      .withIndex("by_slug", (q: any) => q.eq("slug", "refund_confirmation"))
      .first();

    // Variables pour replaceVariables (toutes en string)
    const refundAmountStr = formatPriceCents(args.refundAmount);
    const emailVars: Record<string, string> = {
      clientName: client?.firstName || "",
      serviceName: mission.serviceName || "Service",
      refundAmount: refundAmountStr,
      originalAmount: formatPriceCents(totalAmount),
      platformFeeRetained: formatPriceCents(args.platformFeeRetained),
      stripeFeeRetained: formatPriceCents(args.stripeFeeRetained),
      announcerRetained: formatPriceCents(args.announcerRetained),
      refundReason: args.refundReason,
      cancellationCount: cancellationLabel,
      cardBrand,
      cardLast4,
      transactionId: payment?.paymentIntentId || "—",
      refundStripeId: args.refundStripeId || "(en cours)",
      refundDelay: args.refundDelay || "3 à 5 jours ouvrés",
      refundReference,
      siteName: "Animigo",
      reservationsUrl: `${emailCfg.appUrl || ""}/client/factures`,
    };

    // Si template BDD existe, on le pré-rend (replace variables) ; sinon l'action utilisera son fallback inline.
    const replaceVars = (str: string) =>
      str.replace(/\{\{(\w+)\}\}/g, (_m, k) => emailVars[k] ?? "");
    const emailSubjectFinal = emailTemplate?.subject
      ? replaceVars(emailTemplate.subject)
      : `↩ Remboursement confirmé · ${refundAmountStr} · ${mission.serviceName || "Service"}`;
    const emailHtmlFinal = emailTemplate?.htmlContent
      ? replaceVars(emailTemplate.htmlContent)
      : null; // null = fallback inline dans l'action

    const emailArgs = {
      clientEmail: client?.email || "",
      clientName: client?.firstName || "",
      serviceName: mission.serviceName || "Service",
      refundAmount: args.refundAmount,
      totalAmount,
      platformFeeRetained: args.platformFeeRetained,
      stripeFeeRetained: args.stripeFeeRetained,
      announcerRetained: args.announcerRetained,
      refundReason: args.refundReason,
      // Email pré-rendu (HTML + subject avec variables remplacées)
      emailSubject: emailSubjectFinal,
      emailHtml: emailHtmlFinal,
      emailConfig: emailCfg.emailConfig,
      appUrl: emailCfg.appUrl,
    };

    await ctx.scheduler.runAfter(0, internal.api.refundReceipt.renderRefundReceiptPdf, {
      missionId: args.missionId,
      refundReference,
      templateJson: template!.templateJson,
      inputsJson: JSON.stringify(inputs),
      uploadUrl,
      emailArgs,
      convexUrl: convexUrlCfg?.value || "",
      convexAdminKey: convexAdminKeyCfg?.value || "",
    });

    console.log(`[prepareAndDispatchRefundReceipt] Action schedulée pour mission ${args.missionId} (refund=${args.refundAmount}c)`);
    return { success: true };
  },
});

/**
 * Patch la mission avec le PDF base64 (workaround storage cassé).
 * Appelée via HTTP API Convex depuis renderRefundReceiptPdf.
 */
export const attachRefundPdfBase64 = internalMutation({
  args: {
    missionId: v.id("missions"),
    pdfBase64: v.string(),
    filename: v.string(),
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.missionId, {
      refundReceiptPdfBase64: args.pdfBase64,
      refundReceiptFilename: args.filename,
      refundReceiptStorageId: args.storageId,
      refundReceiptGeneratedAt: Date.now(),
    });
  },
});

// ============================================
// PUBLIC QUERIES (côté client /client/factures)
// ============================================

/**
 * Liste les bons de remboursement disponibles pour le client connecté.
 */
export const getMyRefundReceipts = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) return [];

    const missions = await ctx.db
      .query("missions")
      .withIndex("by_client", (q: any) => q.eq("clientId", session.userId))
      .collect();

    const receipts = missions
      .filter((m: any) => m.refundReceiptStorageId || m.refundReceiptPdfBase64)
      .map((m: any) => ({
        missionId: m._id,
        serviceName: m.serviceName,
        missionDate: m.startDate,
        refundAmount: m.refundAmount || 0,
        cancelledAt: m.cancelledAt,
        receiptGeneratedAt: m.refundReceiptGeneratedAt,
        storageId: m.refundReceiptStorageId,
        hasBase64: !!m.refundReceiptPdfBase64,
      }))
      .sort((a, b) => (b.receiptGeneratedAt || 0) - (a.receiptGeneratedAt || 0));

    return receipts;
  },
});

/**
 * Retourne l'URL signée du bon de remboursement pour téléchargement.
 * Vérifie que le caller est bien le client de la mission.
 * Pattern identique à getClientReceiptUrl : storage > base64 fallback.
 */
export const getRefundReceiptUrl = query({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const mission = await ctx.db.get(args.missionId);
    if (!mission) throw new ConvexError("Mission introuvable");
    if (mission.clientId !== session.userId) {
      throw new ConvexError("Accès refusé");
    }

    const refSuffix = String(args.missionId).slice(-6).toUpperCase();
    const defaultFilename = `bon-remboursement-REM-${new Date().getFullYear()}-${refSuffix}.pdf`;

    if (mission.refundReceiptStorageId) {
      const url = await ctx.storage.getUrl(mission.refundReceiptStorageId);
      return {
        url,
        generatedAt: mission.refundReceiptGeneratedAt,
        filename: mission.refundReceiptFilename || defaultFilename,
      };
    }
    if (mission.refundReceiptPdfBase64) {
      const dataUrl = `data:application/pdf;base64,${mission.refundReceiptPdfBase64}`;
      return {
        url: dataUrl,
        generatedAt: mission.refundReceiptGeneratedAt,
        filename: mission.refundReceiptFilename || defaultFilename,
      };
    }
    return { url: null, generatedAt: null, filename: null };
  },
});
