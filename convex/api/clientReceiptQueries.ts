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
 * Internal query : agrège toutes les données nécessaires pour envoyer
 * l'email "reçu de paiement" avec PDF en pièce jointe.
 * Réutilise les données existantes (mission, client, annonceur, payment, config email).
 */
export const getEmailReceiptData = internalQuery({
  args: { missionId: v.id("missions") },
  handler: async (ctx, args) => {
    const mission = await ctx.db.get(args.missionId);
    if (!mission) return null;

    const client = await ctx.db.get(mission.clientId);
    const announcer = await ctx.db.get(mission.announcerId);

    const payment = await ctx.db
      .query("stripePayments")
      .withIndex("by_mission", (q: any) => q.eq("missionId", args.missionId))
      .first();

    // Récupérer la config email + URL app depuis systemConfig
    const emailCfg = await getEmailConfigFromDb(ctx.db);

    const isPro = announcer?.accountType === "annonceur_pro" && !!announcer?.siret;
    const announcerDisplayName = announcer
      ? `${announcer.firstName} ${announcer.lastName.charAt(0)}.`
      : "Le prestataire";

    return {
      clientEmail: client?.email || "",
      clientName: client?.firstName || "",
      serviceName: mission.serviceName,
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
      totalAmount: payment?.amount || mission.amount || 0,
      emailConfig: emailCfg.emailConfig,
      appUrl: emailCfg.appUrl,
    };
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

    if (!mission.clientReceiptStorageId) {
      return { url: null, generatedAt: null };
    }

    const url = await ctx.storage.getUrl(mission.clientReceiptStorageId);
    return {
      url,
      generatedAt: mission.clientReceiptGeneratedAt,
    };
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
      .filter((m) => m.clientReceiptStorageId)
      .map((m) => ({
        missionId: m._id,
        serviceName: m.serviceName,
        missionDate: m.startDate,
        amount: m.amount,
        receiptGeneratedAt: m.clientReceiptGeneratedAt,
        storageId: m.clientReceiptStorageId,
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
