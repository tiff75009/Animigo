// @ts-nocheck
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Marquer le transfert comme créé (virement vers annonceur initié)
 */
export const markTransferCreated = internalMutation({
  args: {
    missionId: v.id("missions"),
    transferId: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const mission = await ctx.db.get(args.missionId);
    if (!mission?.stripePaymentId) return;

    const now = Date.now();

    await ctx.db.patch(mission.stripePaymentId, {
      transferId: args.transferId,
      transferAmount: args.amount,
      transferCreatedAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(args.missionId, {
      announcerPaymentStatus: "pending",
      updatedAt: now,
    });
  },
});

/**
 * Mettre à jour le statut du compte Stripe Connect d'un annonceur
 */
export const updateConnectAccountStatus = internalMutation({
  args: {
    stripeAccountId: v.string(),
    chargesEnabled: v.boolean(),
    payoutsEnabled: v.boolean(),
    detailsSubmitted: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Trouver l'utilisateur avec ce compte Stripe
    const users = await ctx.db.query("users").collect();
    const user = users.find((u: any) => u.stripeAccountId === args.stripeAccountId);

    if (!user) {
      console.log("Utilisateur non trouvé pour compte Stripe:", args.stripeAccountId);
      return;
    }

    const now = Date.now();

    await ctx.db.patch(user._id, {
      stripeChargesEnabled: args.chargesEnabled,
      stripePayoutsEnabled: args.payoutsEnabled,
      stripeDetailsSubmitted: args.detailsSubmitted,
      stripeAccountUpdatedAt: now,
      updatedAt: now,
    });

    console.log(`Compte Connect ${args.stripeAccountId} mis à jour pour user ${user._id}`);
  },
});
