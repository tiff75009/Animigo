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

    return {
      _id: mission._id,
      paymentStatus: mission.paymentStatus,
      announcerPaymentStatus: mission.announcerPaymentStatus,
      announcerEarnings: mission.announcerEarnings,
      serviceName: mission.serviceName,
      announcerStripeAccountId: announcer?.stripeAccountId || null,
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

// Mutation interne pour marquer le transfert comme complété
export const markMissionTransferCompleted = internalMutation({
  args: {
    missionId: v.id("missions"),
    transferId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.missionId, {
      announcerPaymentStatus: "paid",
      readyForPayout: true,
      updatedAt: Date.now(),
    });
  },
});
