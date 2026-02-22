import { internalQuery, internalMutation } from "../_generated/server";
import { v } from "convex/values";

// Query interne pour récupérer les infos mission pour le transfert
export const getMissionForTransfer = internalQuery({
  args: {
    missionId: v.id("missions"),
  },
  handler: async (ctx, args) => {
    const mission = await ctx.db.get(args.missionId);
    if (!mission) return null;

    const announcer = await ctx.db.get(mission.announcerId);

    // Récupérer le paiement Stripe associé si existe
    let stripePayment = null;
    if (mission.stripePaymentId) {
      stripePayment = await ctx.db.get(mission.stripePaymentId);
    }

    return {
      _id: mission._id,
      status: mission.status,
      paymentStatus: mission.paymentStatus,
      announcerPaymentStatus: mission.announcerPaymentStatus,
      announcerEarnings: mission.announcerEarnings,
      serviceName: mission.serviceName,
      announcerStripeAccountId: announcer?.stripeAccountId || null,
      stripePaymentStatus: stripePayment?.status || null,
    };
  },
});

// Query interne pour récupérer la clé Stripe
export const getStripeSecretKey = internalQuery({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "stripe_secret_key"))
      .first();
    return config?.value || null;
  },
});

// Query interne pour récupérer les infos mission pour le remboursement admin
export const getMissionForRefund = internalQuery({
  args: { missionId: v.id("missions") },
  handler: async (ctx, args) => {
    const mission = await ctx.db.get(args.missionId);
    if (!mission) return null;

    let payment = mission.stripePaymentId ? await ctx.db.get(mission.stripePaymentId) : null;
    const client = await ctx.db.get(mission.clientId);
    const announcer = await ctx.db.get(mission.announcerId);

    return {
      _id: mission._id,
      totalAmount: mission.amount,
      platformFee: mission.platformFee || 0,
      stripeFee: mission.stripeFee || 0,
      announcerEarnings: mission.announcerEarnings || 0,
      paymentStatus: mission.paymentStatus,
      paymentIntentId: payment?.paymentIntentId || null,
      stripePaymentStatus: payment?.status || null,
      serviceName: mission.serviceName || "",
      startDate: mission.startDate || "",
      endDate: mission.endDate || "",
      clientEmail: client?.email || null,
      clientName: client ? `${client.firstName} ${client.lastName}` : null,
      announcerName: announcer ? `${announcer.firstName} ${announcer.lastName}` : null,
    };
  },
});

// Query interne pour récupérer l'URL de l'application
export const getAppUrl = internalQuery({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "app_url"))
      .first();
    return config?.value || null;
  },
});

// Mutation interne pour marquer le transfert comme complété
export const markMissionTransferCompleted = internalMutation({
  args: {
    missionId: v.id("missions"),
    transferId: v.string(),
  },
  handler: async (ctx, args) => {
    const mission = await ctx.db.get(args.missionId);

    // Préparer les mises à jour
    const updates: Record<string, unknown> = {
      announcerPaymentStatus: "paid",
      readyForPayout: true,
      updatedAt: Date.now(),
    };

    // Si paymentStatus n'est pas "paid", le corriger aussi
    if (mission && mission.paymentStatus !== "paid") {
      updates.paymentStatus = "paid";
    }

    await ctx.db.patch(args.missionId, updates);
  },
});
