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
    const clientProfile = await ctx.db
      .query("clientProfiles")
      .withIndex("by_user", (q: any) => q.eq("userId", mission.clientId))
      .first();

    // Récupérer le paiement Stripe associé
    const payment = await ctx.db
      .query("stripePayments")
      .withIndex("by_mission", (q: any) => q.eq("missionId", args.missionId))
      .first();

    // Adresse client (depuis clientAddresses ou mission.location)
    const clientAddress = mission.location || "";

    // Détails animaux (compact pour le reçu)
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

    return {
      missionId: mission._id,
      // Client
      clientName: client ? `${client.firstName} ${client.lastName}` : "",
      clientEmail: client?.email || "",
      clientAddress,
      // Annonceur (juste le nom, pas de SIRET car c'est Animigo qui émet)
      announcerName: announcer
        ? `${announcer.firstName} ${announcer.lastName}`
        : "",
      // Service
      serviceName: mission.serviceName || "Prestation",
      missionDateRange,
      animalDetails,
      // Paiement
      paymentDate: payment?.capturedAt || Date.now(),
      totalAmount: payment?.amount || mission.amount || 0,
      platformFee: mission.platformFee || 0,
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
