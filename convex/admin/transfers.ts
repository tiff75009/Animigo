// @ts-nocheck
import { action } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdminAction } from "./utils";
import { internal } from "../_generated/api";

// Action: Déclencher manuellement un transfert vers l'annonceur
export const triggerManualTransfer = action({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
  },
  handler: async (ctx, args) => {
    // Valider l'admin
    await requireAdminAction(ctx, args.token);

    // Récupérer la mission
    const mission = await ctx.runQuery(internal.admin.financesInternal.getMissionForTransfer, {
      missionId: args.missionId,
    });

    if (!mission) {
      throw new ConvexError("Mission non trouvée");
    }

    // Vérifications - Le paiement est considéré comme effectué si:
    // 1. paymentStatus === "paid" OU
    // 2. stripePaymentStatus === "captured" OU
    // 3. Le statut de la mission est "upcoming", "in_progress" ou "completed" (qui implique un paiement confirmé)
    const paymentConfirmed =
      mission.paymentStatus === "paid" ||
      mission.stripePaymentStatus === "captured" ||
      ["upcoming", "in_progress", "completed"].includes(mission.status);

    if (!paymentConfirmed) {
      throw new ConvexError("Le paiement client n'a pas été effectué pour cette mission");
    }

    if (mission.announcerPaymentStatus === "paid") {
      throw new ConvexError("Le transfert a déjà été effectué pour cette mission");
    }

    if (!mission.announcerStripeAccountId) {
      throw new ConvexError("L'annonceur n'a pas de compte Stripe Connect configuré");
    }

    // Récupérer la clé Stripe
    const stripeSecretKey = await ctx.runQuery(internal.admin.financesInternal.getStripeSecretKey, {});

    if (!stripeSecretKey) {
      throw new ConvexError("Clé Stripe non configurée");
    }

    // Calculer le montant à transférer (earnings annonceur)
    const amount = mission.announcerEarnings || 0;

    if (amount <= 0) {
      throw new ConvexError("Montant du transfert invalide");
    }

    // Créer le transfert Stripe
    const transferResult = await ctx.runAction(internal.api.stripeConnect.createTransfer, {
      stripeAccountId: mission.announcerStripeAccountId,
      amount: amount,
      missionId: args.missionId,
      description: `Transfert manuel - Mission ${mission.serviceName || ""}`,
      stripeSecretKey: stripeSecretKey,
    });

    if (!transferResult.success) {
      throw new ConvexError("Échec de la création du transfert Stripe");
    }

    // Mettre à jour la mission
    await ctx.runMutation(internal.admin.financesInternal.markMissionTransferCompleted, {
      missionId: args.missionId,
      transferId: transferResult.transferId,
    });

    return {
      success: true,
      transferId: transferResult.transferId,
      amount: amount,
      message: `Transfert de ${(amount / 100).toFixed(2)}€ effectué avec succès`,
    };
  },
});
