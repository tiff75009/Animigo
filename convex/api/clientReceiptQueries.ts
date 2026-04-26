/**
 * Queries / mutations associées aux reçus de paiement clients.
 *
 * - getReceiptData (internal) : agrège mission + paiement + client + annonceur pour la génération PDF
 * - attachReceiptToMission (internal) : patch la mission après génération
 * - getClientReceiptUrl (public) : URL de téléchargement du reçu pour le client connecté
 * - getMyReceipts (public) : liste des reçus du client (pour son dashboard)
 */

import { internalQuery, internalMutation, query } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import { getEmailConfigFromDb } from "./emailInternal";

// ============================================
// INTERNAL : pour la génération PDF
// ============================================

export const getReceiptData = internalQuery({
  args: { missionId: v.id("missions") },
  handler: async (ctx, args) => {
    const mission = await ctx.db.get(args.missionId);
    if (!mission) return null;

    const client = await ctx.db.get(mission.clientId);
    const announcer = await ctx.db.get(mission.announcerId);

    // Profil annonceur pour SIRET, statut, adresse
    const announcerProfile = announcer
      ? await ctx.db
          .query("profiles")
          .withIndex("by_user", (q: any) => q.eq("userId", announcer._id))
          .first()
      : null;

    // Paiement Stripe associé
    const payment = await ctx.db
      .query("stripePayments")
      .withIndex("by_mission", (q: any) => q.eq("missionId", args.missionId))
      .first();

    // Adresse client (mission.location)
    const clientAddress = mission.location || "";

    // Détail animaux
    let animalDetails = "";
    if (mission.animalIds && mission.animalIds.length > 0) {
      const animals = await Promise.all(
        mission.animalIds.map((id: any) => ctx.db.get(id))
      );
      animalDetails = animals
        .filter(Boolean)
        .map((a: any) => `${a.name} (${a.type})`)
        .join(", ");
    }

    // Format date prestation
    let missionDateRange = "";
    if (mission.startDate === mission.endDate || !mission.endDate) {
      missionDateRange = formatDateFR(mission.startDate);
    } else {
      missionDateRange = `${formatDateFR(mission.startDate)} → ${formatDateFR(mission.endDate)}`;
    }

    // ─── Statut & SIRET prestataire ───
    let providerStatus = "Particulier";
    let providerSiretLine = ""; // Vide si particulier
    if (announcer?.accountType === "annonceur_pro") {
      if (announcer.companyType === "micro_enterprise") {
        providerStatus = "Micro-entrepreneur";
      } else {
        providerStatus = announcer.companyType === "regular_company" ? "Société" : "Professionnel";
      }
      if (announcer.siret) {
        providerSiretLine = `SIRET : ${announcer.siret}`;
      }
    }

    // Adresse prestataire (depuis profile)
    let providerAddress = "";
    if (announcerProfile?.location) {
      providerAddress = announcerProfile.location;
    } else if (announcerProfile?.city) {
      providerAddress = `${announcerProfile.postalCode || ""} ${announcerProfile.city}`.trim();
    }

    // ─── Lieu de prestation ───
    let serviceLocation = "";
    if (mission.serviceLocation === "client_home") {
      serviceLocation = "Au domicile du client";
    } else if (mission.serviceLocation === "announcer_home") {
      serviceLocation = "Au domicile du prestataire";
    }

    // ─── Configs plateforme depuis systemConfig ───
    const cfgKeys = [
      "platform_legal_name", "platform_address", "platform_siret",
      "platform_capital", "platform_contact",
    ];
    const cfgs = await Promise.all(
      cfgKeys.map((k) =>
        ctx.db
          .query("systemConfig")
          .filter((q: any) => q.eq(q.field("key"), k))
          .first()
      )
    );
    const [legalCfg, addrCfg, siretCfg, capitalCfg, contactCfg] = cfgs;

    return {
      missionId: mission._id,
      // ─── Client ───
      clientName: client ? `${client.firstName} ${client.lastName}` : "",
      clientEmail: client?.email || "",
      clientAddress,
      // ─── Prestataire ───
      announcerName: announcer ? `${announcer.firstName} ${announcer.lastName}` : "",
      providerStatus,
      providerSiretLine,
      providerAddress,
      // ─── Service ───
      serviceName: mission.serviceName || "Prestation",
      missionDateRange,
      animalDetails,
      serviceLocation,
      // ─── Paiement ───
      paymentDate: payment?.capturedAt || Date.now(),
      totalAmount: payment?.amount || mission.amount || 0,
      platformFee: mission.platformFee || 0,
      providerEarnings: mission.announcerEarnings || ((payment?.amount || mission.amount || 0) - (mission.platformFee || 0)),
      // ─── Plateforme (depuis systemConfig avec fallbacks) ───
      platformLegalName: legalCfg?.value || "Animigo SAS",
      platformAddress: addrCfg?.value || "Adresse à configurer (Admin > Paramètres)",
      platformSiret: siretCfg?.value ? `SIRET : ${siretCfg.value}` : "",
      platformCapital: capitalCfg?.value ? `Capital social : ${capitalCfg.value}` : "",
      platformContact: contactCfg?.value || "support@animigo.fr",
    };
  },
});

/**
 * Mutation orchestratrice : pré-construit toutes les données nécessaires
 * (inputs PDF + email args + template) et schedule l'action de rendu PDF.
 *
 * Pourquoi une mutation et pas l'action ?
 *   Convex self-hosted a un bug : `ctx.runQuery` depuis une action retourne
 *   du HTML (page 404 du dashboard). On contourne en faisant TOUTE la lecture
 *   BDD ici (mutation a accès direct à ctx.db) puis on schedule l'action
 *   avec les données déjà résolues.
 */
const formatPriceCents = (cents: number) =>
  (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

// Force le fuseau Europe/Paris (sinon le serveur Convex est en UTC)
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

export const prepareAndDispatchClientReceipt = internalMutation({
  args: {
    missionId: v.id("missions"),
    paymentIntentId: v.string(),
    cardBrand: v.optional(v.string()),
    cardLast4: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Charger la mission, client, annonceur, profil annonceur, payment
    const mission = await ctx.db.get(args.missionId);
    if (!mission) {
      console.error("[prepareAndDispatchClientReceipt] Mission introuvable:", args.missionId);
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

    // 2. Charger un template de RECU client (jamais "invoice" qui est pour la facture annonceur).
    //    Accepte "client_receipt" (nouveau) et "receipt" (legacy "Déprécié") — préfère le nouveau.
    //    Préfère isDefault=true. Ne filtre pas sur companyType.
    const allTemplates = await ctx.db.query("pdfTemplates").collect();
    const receiptTemplates = allTemplates.filter(
      (t: any) => t.documentType === "client_receipt" || t.documentType === "receipt"
    );

    // Priorité : (1) client_receipt + isDefault, (2) client_receipt, (3) receipt + isDefault, (4) receipt
    const template =
      receiptTemplates.find((t: any) => t.documentType === "client_receipt" && t.isDefault) ??
      receiptTemplates.find((t: any) => t.documentType === "client_receipt") ??
      receiptTemplates.find((t: any) => t.documentType === "receipt" && t.isDefault) ??
      receiptTemplates.find((t: any) => t.documentType === "receipt") ??
      null;

    if (!template) {
      console.warn(
        "[prepareAndDispatchClientReceipt] Aucun pdfTemplate de reçu client trouvé en BDD. " +
          "Templates disponibles : " +
          allTemplates.map((t: any) => `${t.documentType}(${t.isDefault ? "default" : "non-default"})`).join(", ")
      );
      return { success: false, error: "Template PDF reçu client manquant" };
    }
    console.log(
      `[prepareAndDispatchClientReceipt] Template reçu trouvé : ${template._id} (documentType=${template.documentType}, isDefault=${template.isDefault}, companyType=${template.companyType})`
    );

    // 3. Construire les inputs pdfme — réplique la logique de l'ancien generateClientReceipt
    const paymentDateTs = payment?.capturedAt || Date.now();
    const totalAmount = payment?.amount || mission.amount || 0;
    const platformFee = mission.platformFee || 0;
    const providerEarnings = mission.announcerEarnings || (totalAmount - platformFee);

    const paymentMethod = args.cardBrand && args.cardLast4
      ? `${args.cardBrand.charAt(0).toUpperCase() + args.cardBrand.slice(1)} •••• ${args.cardLast4}`
      : "Carte bancaire";
    const cardLast4Display = args.cardLast4 ? `•••• ${args.cardLast4}` : "—";
    const cardBrandDisplay = args.cardBrand
      ? args.cardBrand.charAt(0).toUpperCase() + args.cardBrand.slice(1)
      : "Carte";

    // Statut & SIRET prestataire
    let providerStatus = "Particulier";
    let providerSiretLine = "";
    if (announcer?.accountType === "annonceur_pro") {
      if (announcer.companyType === "micro_enterprise") {
        providerStatus = "Micro-entrepreneur";
      } else {
        providerStatus = announcer.companyType === "regular_company" ? "Société" : "Professionnel";
      }
      if (announcer.siret) {
        providerSiretLine = `SIRET : ${announcer.siret}`;
      }
    }

    // Adresse prestataire
    let providerAddress = "";
    if (announcerProfile?.location) {
      providerAddress = announcerProfile.location;
    } else if (announcerProfile?.city) {
      providerAddress = `${announcerProfile.postalCode || ""} ${announcerProfile.city}`.trim();
    }

    // Lieu de prestation
    let serviceLocation = "";
    if (mission.serviceLocation === "client_home") serviceLocation = "Au domicile du client";
    else if (mission.serviceLocation === "announcer_home") serviceLocation = "Au domicile du prestataire";

    // Détail animaux
    let animalDetails = "";
    if (mission.animalIds && mission.animalIds.length > 0) {
      const animals = await Promise.all(
        mission.animalIds.map((id: any) => ctx.db.get(id))
      );
      animalDetails = animals
        .filter(Boolean)
        .map((a: any) => `${a.name} (${a.type})`)
        .join(", ");
    }

    // Date prestation
    let missionDateRange = "";
    if (mission.startDate === mission.endDate || !mission.endDate) {
      const d = new Date(mission.startDate);
      missionDateRange = d.toLocaleDateString("fr-FR");
    } else {
      const ds = new Date(mission.startDate).toLocaleDateString("fr-FR");
      const de = new Date(mission.endDate).toLocaleDateString("fr-FR");
      missionDateRange = `${ds} → ${de}`;
    }

    // Plateforme depuis systemConfig
    const cfgKeys = ["platform_legal_name", "platform_address", "platform_siret", "platform_capital", "platform_contact"];
    const cfgs = await Promise.all(
      cfgKeys.map((k) =>
        ctx.db.query("systemConfig").filter((q: any) => q.eq(q.field("key"), k)).first()
      )
    );
    const [legalCfg, addrCfg, siretCfg, capitalCfg, contactCfg] = cfgs;

    const inputs = [
      {
        documentType: "REÇU DE PAIEMENT",
        receiptNumber: `REC-${new Date(paymentDateTs).getFullYear()}-${String(args.missionId).slice(-6).toUpperCase()}`,
        bookingNumber: `RES-${String(args.missionId).slice(-6).toUpperCase()}`,
        date: `Émis le ${new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}`,
        paymentStatus: "PAYÉ",
        paymentDate: formatDateTimeFR(paymentDateTs),
        paymentMethod,
        cardBrand: cardBrandDisplay,
        cardLast4: cardLast4Display,
        transactionId: args.paymentIntentId,
        paidAmount: formatPriceCents(totalAmount),
        paidAmountInWords: "",
        bookingDate: missionDateRange,
        serviceLocation,
        serviceProvider: announcer ? `${announcer.firstName} ${announcer.lastName}` : "",
        providerStatus,
        providerAddress,
        providerSiret: providerSiretLine,
        platformName: "Animigo",
        platformLegalName: legalCfg?.value || "Animigo SAS",
        platformAddress: addrCfg?.value || "Adresse à configurer (Admin > Paramètres)",
        platformSiret: siretCfg?.value ? `SIRET : ${siretCfg.value}` : "",
        platformCapital: capitalCfg?.value ? `Capital social : ${capitalCfg.value}` : "",
        platformContact: contactCfg?.value || "support@animigo.fr",
        platformFee: formatPriceCents(platformFee),
        providerEarnings: formatPriceCents(providerEarnings),
        intermediaryMention: "Animigo agit en tant que plateforme de mise en relation entre les particuliers et les prestataires de services animaliers. La présente preuve de paiement n'est pas une facture commerciale.",
        stripeMention: "Paiement sécurisé traité par Stripe Payments Europe Ltd, prestataire de services de paiement agréé.",
        escrowMention: "Les fonds sont conservés sur le compte séquestre Animigo jusqu'à confirmation par le client de la réalisation du service, puis reversés au prestataire conformément à nos CGV.",
        cgvMention: "Document établi conformément aux Conditions Générales de Vente acceptées lors de la réservation.",
        thankYouMessage: "Merci pour votre confiance — l'équipe Animigo",
        _legal_note: "Ce reçu n'est pas une facture commerciale. Pour toute facture comptable détaillée (TVA, mentions légales du prestataire), veuillez vous référer à la facture émise par votre prestataire.",
        clientName: client ? `${client.firstName} ${client.lastName}` : "",
        clientEmail: client?.email || "",
        clientAddress: mission.location || "",
        serviceName: mission.serviceName || "Prestation",
        missionDate: missionDateRange,
        animalDetails,
        itemsTable: "[]",
        totalsTable: "[]",
      },
    ];

    // 4. Préparer les emailArgs (sendPaymentReceiptEmail attend ces champs)
    const emailCfg = await getEmailConfigFromDb(ctx.db);
    const isPro = announcer?.accountType === "annonceur_pro" && !!announcer?.siret;
    const announcerDisplayName = announcer
      ? `${announcer.firstName} ${announcer.lastName.charAt(0)}.`
      : "Le prestataire";

    const emailArgs = {
      clientEmail: client?.email || "",
      clientName: client?.firstName || "",
      serviceName: mission.serviceName || "Service",
      announcerName: announcerDisplayName,
      announcerStatus: isPro ? "Professionnel" : "Particulier",
      announcerCompany: isPro && announcer?.companyName ? announcer.companyName : "",
      announcerSiret: isPro && announcer?.siret ? announcer.siret : "",
      startDate: mission.startDate,
      endDate: mission.endDate,
      announcerEarnings: mission.announcerEarnings || mission.amount || 0,
      vatRate: mission.vatRate || 0,
      isSapApplied: mission.isSapApplied || false,
      platformFee: mission.platformFee || 0,
      commissionRate: mission.commissionRate || 0,
      stripeFee: mission.stripeFee || 0,
      stripeFeeRate: mission.stripeFeeRate || 0,
      totalAmount,
      emailConfig: emailCfg.emailConfig,
      appUrl: emailCfg.appUrl,
    };

    // 5. Pré-charger les configs nécessaires à l'action (qui ne peut PAS faire ctx.runQuery
    //    sur self-hosted) — Stripe API key pour récup brand/last4, Convex URL+admin key pour
    //    appeler attachReceiptPdfBase64 via HTTP API (workaround scheduler cassé), upload URL
    //    pour storage best-effort.
    const [stripeKeyCfg, convexUrlCfg, convexAdminKeyCfg] = await Promise.all([
      ctx.db.query("systemConfig").withIndex("by_key", (q: any) => q.eq("key", "stripe_secret_key")).first(),
      ctx.db.query("systemConfig").withIndex("by_key", (q: any) => q.eq("key", "convex_url")).first(),
      ctx.db.query("systemConfig").withIndex("by_key", (q: any) => q.eq("key", "convex_admin_key")).first(),
    ]);

    let uploadUrl = "";
    try {
      uploadUrl = await ctx.storage.generateUploadUrl();
    } catch {
      // Si même la génération d'URL d'upload échoue, on continue sans (l'action gérera).
    }

    // 6. Schedule l'action de rendu PDF avec tout en args
    await ctx.scheduler.runAfter(0, internal.api.clientReceipt.renderClientReceiptPdf, {
      missionId: args.missionId,
      paymentIntentId: args.paymentIntentId,
      cardBrand: args.cardBrand,
      cardLast4: args.cardLast4,
      templateJson: template!.templateJson,
      inputsJson: JSON.stringify(inputs),
      uploadUrl,
      emailArgs,
      stripeSecretKey: stripeKeyCfg?.value || "",
      convexUrl: convexUrlCfg?.value || "",
      convexAdminKey: convexAdminKeyCfg?.value || "",
    });

    console.log(`[prepareAndDispatchClientReceipt] Action renderClientReceiptPdf schedulée pour mission ${args.missionId}`);
    return { success: true };
  },
});

export const attachReceiptToMission = internalMutation({
  args: {
    missionId: v.id("missions"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.missionId, {
      clientReceiptStorageId: args.storageId,
      clientReceiptGeneratedAt: Date.now(),
    });
  },
});

/**
 * Variante "fallback" : stocke le PDF directement en base64 dans la mission
 * (workaround Convex self-hosted où ctx.storage est cassé). Appelée depuis
 * l'action via HTTP API Convex avec admin key (puisque ctx.scheduler/runMutation
 * depuis une action sont cassés aussi).
 *
 * Note : exposée comme `internalMutation` pour éviter qu'un client la
 * déclenche directement, mais accessible via /api/run avec admin key.
 */
export const attachReceiptPdfBase64 = internalMutation({
  args: {
    missionId: v.id("missions"),
    pdfBase64: v.string(),
    filename: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.missionId, {
      clientReceiptPdfBase64: args.pdfBase64,
      clientReceiptFilename: args.filename,
      clientReceiptGeneratedAt: Date.now(),
    });
  },
});

// ============================================
// PUBLIC : téléchargement client
// ============================================

/**
 * Retourne l'URL signée du reçu de paiement pour téléchargement.
 * Vérifie que le caller est bien le client de la mission.
 */
export const getClientReceiptUrl = query({
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

    // Priorité : storageId (idéal) > base64 fallback (data URL)
    if (mission.clientReceiptStorageId) {
      const url = await ctx.storage.getUrl(mission.clientReceiptStorageId);
      return {
        url,
        generatedAt: mission.clientReceiptGeneratedAt,
        filename: mission.clientReceiptFilename || `recu-paiement-${String(args.missionId).slice(-6).toUpperCase()}.pdf`,
      };
    }
    if (mission.clientReceiptPdfBase64) {
      // Data URL — téléchargeable directement par le navigateur
      const dataUrl = `data:application/pdf;base64,${mission.clientReceiptPdfBase64}`;
      return {
        url: dataUrl,
        generatedAt: mission.clientReceiptGeneratedAt,
        filename: mission.clientReceiptFilename || `recu-paiement-${String(args.missionId).slice(-6).toUpperCase()}.pdf`,
      };
    }
    return { url: null, generatedAt: null, filename: null };
  },
});

/**
 * Liste les reçus de paiement disponibles pour le client connecté.
 * Pour la section "Mes documents" du dashboard client.
 */
export const getMyReceipts = query({
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
      .filter((m) => m.clientReceiptStorageId || m.clientReceiptPdfBase64)
      .map((m) => ({
        missionId: m._id,
        serviceName: m.serviceName,
        missionDate: m.startDate,
        amount: m.amount,
        receiptGeneratedAt: m.clientReceiptGeneratedAt,
        storageId: m.clientReceiptStorageId,
        hasBase64: !!m.clientReceiptPdfBase64,
      }))
      .sort((a, b) => (b.receiptGeneratedAt || 0) - (a.receiptGeneratedAt || 0));

    return receipts;
  },
});

// ============================================
// HELPERS
// ============================================

function formatDateFR(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR");
  } catch {
    return dateStr;
  }
}
