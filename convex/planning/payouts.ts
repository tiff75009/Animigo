// @ts-nocheck
import { internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { ConvexError } from "convex/values";
import { notifyMissionValidatedByClient, notifyMissionAutoValidated } from "../lib/notificationTemplates";
import { getEmailConfigFromDb } from "../api/emailInternal";


/**
 * Gestion des versements aux annonceurs
 *
 * Deux modes de versement :
 * 1. scheduled (ponctuel) : virement groupé le Xème jour du mois (gratuit)
 * 2. instant : virement immédiat après confirmation (avec frais %)
 */

// ============================================
// CONFIRMATION DE FIN DE MISSION
// ============================================

/**
 * Client confirme la fin de mission (bouton)
 * Déclenche le processus de versement
 */
export const confirmMissionEnd = mutation({
  args: {
    sessionToken: v.string(),
    missionId: v.id("missions"),
  },
  handler: async (ctx, args) => {
    // Valider la session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const mission = await ctx.db.get(args.missionId);
    if (!mission) {
      throw new ConvexError("Mission non trouvée");
    }

    // Vérifier que l'utilisateur est bien le client de la mission
    if (mission.clientId !== session.userId) {
      throw new ConvexError("Vous n'êtes pas le client de cette mission");
    }

    // Vérifier que la mission est complétée
    if (mission.status !== "completed") {
      throw new ConvexError("La mission n'est pas terminée");
    }

    // Vérifier que le paiement a été effectué (accepte "paid" et "pending" pour encaissement immédiat)
    if (mission.paymentStatus !== "paid" && mission.paymentStatus !== "pending") {
      throw new ConvexError("Le paiement n'a pas été effectué");
    }

    // Vérifier que la mission n'est pas déjà confirmée
    if (mission.clientConfirmedAt || mission.autoConfirmedAt) {
      throw new ConvexError("La mission est déjà confirmée");
    }

    // Vérifier s'il y a une réclamation ouverte avec blocage paiement
    let hasActiveDispute = false;
    if (mission.hasDispute && mission.disputeId) {
      const existingDispute = await ctx.db.get(mission.disputeId);
      if (existingDispute && (existingDispute.status === "open" || existingDispute.status === "investigating")) {
        if (existingDispute.paymentBlocked) {
          // Dispute avec blocage → on confirme mais on ne déclenche pas le paiement
          hasActiveDispute = true;
        } else {
          // Dispute ouverte sans blocage → empêcher la confirmation
          throw new ConvexError("Impossible de confirmer : une réclamation est en cours de traitement");
        }
      }
    }

    const now = Date.now();

    // Récupérer l'annonceur pour connaître son mode de versement
    const announcer = await ctx.db.get(mission.announcerId);
    if (!announcer) {
      throw new ConvexError("Annonceur non trouvé");
    }

    const payoutMode = announcer.payoutMode || "scheduled";

    // Calculer la date de versement prévu si mode scheduled
    let payoutScheduledFor: string | undefined;
    if (payoutMode === "scheduled") {
      // Récupérer le jour de versement configuré
      const payoutDayConfig = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", (q) => q.eq("key", "payout_scheduled_day"))
        .first();

      const payoutDay = parseInt(payoutDayConfig?.value || "25");

      // Calculer la prochaine date de versement
      const today = new Date();
      let payoutDate = new Date(today.getFullYear(), today.getMonth(), payoutDay);

      // Si on a dépassé le jour de versement ce mois-ci, prendre le mois prochain
      if (today.getDate() >= payoutDay) {
        payoutDate = new Date(today.getFullYear(), today.getMonth() + 1, payoutDay);
      }

      payoutScheduledFor = payoutDate.toISOString().split("T")[0];
    }

    // Marquer la mission comme confirmée et prête pour versement
    // (sauf si une dispute avec blocage est en cours)
    await ctx.db.patch(args.missionId, {
      clientConfirmedAt: now,
      readyForPayout: !hasActiveDispute,
      payoutScheduledFor: hasActiveDispute ? undefined : payoutScheduledFor,
      updatedAt: now,
    });

    // Auto-génération facture/reçu
    await ctx.scheduler.runAfter(0, internal.services.invoiceHelpers.autoGenerateInvoice, {
      missionId: args.missionId,
    });

    // Notification annonceur (push)
    const client = await ctx.db.get(session.userId);
    const clientName = client ? `${client.firstName} ${client.lastName.charAt(0)}.` : "Un client";
    await notifyMissionValidatedByClient({
      announcerId: mission.announcerId,
      clientName,
      serviceName: mission.serviceName,
      missionId: args.missionId,
    });

    // Email annonceur
    const { emailConfig, appUrl } = await getEmailConfigFromDb(ctx.db);
    if (emailConfig) {
      const animalName = mission.animals?.length
        ? mission.animals.map((a: any) => a.name).join(", ")
        : mission.animal?.name || "Animal";

      await ctx.scheduler.runAfter(0, internal.api.email.sendMissionValidatedByClientEmail, {
        announcerEmail: announcer.email,
        announcerName: announcer.firstName,
        clientName,
        serviceName: mission.serviceName,
        animalName,
        startDate: mission.startDate,
        endDate: mission.endDate,
        emailConfig,
        appUrl,
      });
    }

    // Si mode instantané et pas de blocage, déclencher le versement immédiat
    if (payoutMode === "instant" && announcer.stripeAccountId && !hasActiveDispute) {
      // Récupérer la clé Stripe
      const stripeSecretKeyConfig = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", (q) => q.eq("key", "stripe_secret_key"))
        .first();

      // Récupérer le taux de frais instantané
      const instantFeeConfig = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", (q) => q.eq("key", "payout_instant_fee_percent"))
        .first();

      const instantFeePercent = parseFloat(instantFeeConfig?.value || "2");

      if (stripeSecretKeyConfig?.value) {
        // Calculer le montant après frais
        const earnings = mission.announcerEarnings || mission.amount;
        const fee = Math.round(earnings * instantFeePercent / 100);
        const amountToTransfer = earnings - fee;

        // Planifier le versement instantané
        await ctx.scheduler.runAfter(0, internal.planning.payouts.processInstantPayoutAction, {
          missionId: args.missionId,
          announcerId: mission.announcerId,
          stripeAccountId: announcer.stripeAccountId,
          amount: amountToTransfer,
          fee: fee,
          stripeSecretKey: stripeSecretKeyConfig.value,
        });
      }
    }

    return {
      success: true,
      payoutMode,
      payoutScheduledFor,
    };
  },
});

/**
 * Auto-confirmation des missions après délai (appelé par cron)
 */
export const autoConfirmMissions = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("=== autoConfirmMissions START ===");
    const now = Date.now();

    // Récupérer le délai de confirmation
    const confirmationHoursConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "mission_confirmation_hours"))
      .first();

    const confirmationHours = parseInt(confirmationHoursConfig?.value || "48");
    const confirmationDelayMs = confirmationHours * 60 * 60 * 1000;

    // Récupérer les missions complétées non confirmées
    const missions = await ctx.db.query("missions").collect();

    const eligibleMissions = missions.filter((m) =>
      m.status === "completed" &&
      (m.paymentStatus === "paid" || m.paymentStatus === "pending") &&
      !m.clientConfirmedAt &&
      !m.autoConfirmedAt &&
      m.updatedAt && // Date de passage en "completed"
      (now - m.updatedAt) >= confirmationDelayMs
    );

    console.log(`Auto-confirm: ${eligibleMissions.length} missions à confirmer`);

    let confirmed = 0;
    for (const mission of eligibleMissions) {
      try {
        // Récupérer l'annonceur
        const announcer = await ctx.db.get(mission.announcerId);
        const payoutMode = announcer?.payoutMode || "scheduled";

        // Calculer la date de versement si mode scheduled
        let payoutScheduledFor: string | undefined;
        if (payoutMode === "scheduled") {
          const payoutDayConfig = await ctx.db
            .query("systemConfig")
            .withIndex("by_key", (q) => q.eq("key", "payout_scheduled_day"))
            .first();

          const payoutDay = parseInt(payoutDayConfig?.value || "25");
          const today = new Date();
          let payoutDate = new Date(today.getFullYear(), today.getMonth(), payoutDay);

          if (today.getDate() >= payoutDay) {
            payoutDate = new Date(today.getFullYear(), today.getMonth() + 1, payoutDay);
          }

          payoutScheduledFor = payoutDate.toISOString().split("T")[0];
        }

        // Vérifier s'il y a une dispute ouverte avec blocage paiement
        const dispute = mission.hasDispute && mission.disputeId
          ? await ctx.db.get(mission.disputeId)
          : null;
        const isPaymentBlocked = dispute?.paymentBlocked && (dispute.status === "open" || dispute.status === "investigating");

        // Marquer comme auto-confirmé
        await ctx.db.patch(mission._id, {
          autoConfirmedAt: now,
          readyForPayout: !isPaymentBlocked,
          payoutScheduledFor: isPaymentBlocked ? undefined : payoutScheduledFor,
          updatedAt: now,
        });

        // Auto-génération facture/reçu
        await ctx.scheduler.runAfter(0, internal.services.invoiceHelpers.autoGenerateInvoice, {
          missionId: mission._id,
        });

        // Notifications auto-validation
        await notifyMissionAutoValidated({
          announcerId: mission.announcerId,
          clientId: mission.clientId,
          serviceName: mission.serviceName,
          missionId: mission._id,
        });

        // Si mode instant et pas de blocage, planifier le versement
        if (payoutMode === "instant" && announcer?.stripeAccountId && !isPaymentBlocked) {
          const stripeSecretKeyConfig = await ctx.db
            .query("systemConfig")
            .withIndex("by_key", (q) => q.eq("key", "stripe_secret_key"))
            .first();

          const instantFeeConfig = await ctx.db
            .query("systemConfig")
            .withIndex("by_key", (q) => q.eq("key", "payout_instant_fee_percent"))
            .first();

          const instantFeePercent = parseFloat(instantFeeConfig?.value || "2");

          if (stripeSecretKeyConfig?.value) {
            const earnings = mission.announcerEarnings || mission.amount;
            const fee = Math.round(earnings * instantFeePercent / 100);
            const amountToTransfer = earnings - fee;

            await ctx.scheduler.runAfter(0, internal.planning.payouts.processInstantPayoutAction, {
              missionId: mission._id,
              announcerId: mission.announcerId,
              stripeAccountId: announcer.stripeAccountId,
              amount: amountToTransfer,
              fee: fee,
              stripeSecretKey: stripeSecretKeyConfig.value,
            });
          }
        }

        confirmed++;
      } catch (error) {
        console.error(`Erreur auto-confirm mission ${mission._id}:`, error);
      }
    }

    console.log(`Auto-confirm terminé: ${confirmed} missions confirmées`);
    return { confirmed, total: eligibleMissions.length };
  },
});

// ============================================
// VERSEMENTS
// ============================================

/**
 * Traiter un versement instantané (action Stripe)
 * Avec les destination charges, le transfert vers le compte Connect est automatique.
 * Il suffit de déclencher le payout (versement vers le compte bancaire de l'annonceur).
 */
export const processInstantPayoutAction = internalAction({
  args: {
    missionId: v.id("missions"),
    announcerId: v.id("users"),
    stripeAccountId: v.string(),
    amount: v.number(), // Montant après frais en centimes
    fee: v.number(), // Frais prélevés en centimes
    stripeSecretKey: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("=== processInstantPayoutAction START ===");
    console.log("Mission:", args.missionId, "Amount:", args.amount);

    try {
      // Avec destination charges, le transfert est déjà fait par Stripe au moment du paiement.
      // On déclenche uniquement le payout instantané vers le compte bancaire de l'annonceur.
      const payoutResult = await ctx.runAction(internal.api.stripeConnect.createInstantPayout, {
        stripeAccountId: args.stripeAccountId,
        amount: args.amount,
        stripeSecretKey: args.stripeSecretKey,
      });

      // Mettre à jour la mission
      await ctx.runMutation(internal.planning.payouts.markMissionPaidOut, {
        missionId: args.missionId,
        transferId: payoutResult.success ? payoutResult.payoutId || "auto" : "auto",
        payoutId: payoutResult.success ? payoutResult.payoutId : undefined,
        amount: args.amount,
        fee: args.fee,
      });

      return { success: true };
    } catch (error) {
      console.error("Erreur versement instantané:", error);

      // Marquer l'erreur
      await ctx.runMutation(internal.planning.payouts.markPayoutFailed, {
        missionId: args.missionId,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      });

      throw error;
    }
  },
});

/**
 * Traiter les versements mensuels programmés (appelé par cron le jour configuré)
 */
export const processScheduledPayouts = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("=== processScheduledPayouts START ===");
    const now = Date.now();
    const today = new Date().toISOString().split("T")[0];

    // Récupérer la clé Stripe
    const stripeSecretKeyConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "stripe_secret_key"))
      .first();

    if (!stripeSecretKeyConfig?.value) {
      console.log("Stripe non configuré");
      return { processed: 0 };
    }

    // Récupérer les missions prêtes pour versement avec date = aujourd'hui
    const missions = await ctx.db.query("missions").collect();

    const eligibleMissions = missions.filter((m) =>
      m.readyForPayout === true &&
      m.payoutScheduledFor === today &&
      m.announcerPaymentStatus !== "paid"
    );

    console.log(`Versements programmés: ${eligibleMissions.length} missions à traiter`);

    // Grouper par annonceur
    const missionsByAnnouncer: Record<string, typeof eligibleMissions> = {};
    for (const mission of eligibleMissions) {
      const announcerId = mission.announcerId.toString();
      if (!missionsByAnnouncer[announcerId]) {
        missionsByAnnouncer[announcerId] = [];
      }
      missionsByAnnouncer[announcerId].push(mission);
    }

    let processed = 0;

    // Traiter chaque annonceur
    for (const [announcerId, announcerMissions] of Object.entries(missionsByAnnouncer)) {
      try {
        const announcer = await ctx.db.get(announcerMissions[0].announcerId);

        if (!announcer?.stripeAccountId) {
          console.log(`Annonceur ${announcerId} sans compte Stripe`);
          continue;
        }

        // Calculer le montant total NET (annonceur) et BRUT (client)
        const totalAmount = announcerMissions.reduce(
          (sum, m) => sum + (m.announcerEarnings || m.amount),
          0
        );
        const totalGross = announcerMissions.reduce(
          (sum, m) => sum + (m.amount || 0),
          0
        );

        // Créer un payout groupé
        await ctx.scheduler.runAfter(0, internal.planning.payouts.processScheduledPayoutAction, {
          announcerId: announcerMissions[0].announcerId,
          stripeAccountId: announcer.stripeAccountId,
          missionIds: announcerMissions.map((m) => m._id),
          totalAmount,
          totalGross,
          stripeSecretKey: stripeSecretKeyConfig.value,
        });

        processed++;
      } catch (error) {
        console.error(`Erreur traitement annonceur ${announcerId}:`, error);
      }
    }

    return { processed, announcers: Object.keys(missionsByAnnouncer).length };
  },
});

/**
 * Action pour traiter un versement programmé groupé
 * Avec les destination charges, les transferts vers le compte Connect sont déjà faits
 * automatiquement par Stripe au moment du paiement client.
 * Cette action déclenche le payout (versement vers le compte bancaire de l'annonceur).
 */
export const processScheduledPayoutAction = internalAction({
  args: {
    announcerId: v.id("users"),
    stripeAccountId: v.string(),
    missionIds: v.array(v.id("missions")),
    totalAmount: v.number(),
    totalGross: v.optional(v.number()),
    stripeSecretKey: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("=== processScheduledPayoutAction START ===");
    console.log("Announcer:", args.announcerId, "Amount:", args.totalAmount);

    try {
      // Créer un enregistrement de payout
      const grossAmount = args.totalGross || args.totalAmount;
      const commissionAmount = grossAmount - args.totalAmount;
      const payoutId = await ctx.runMutation(internal.planning.payouts.createPayoutRecord, {
        announcerId: args.announcerId,
        missionIds: args.missionIds,
        amount: args.totalAmount,
        grossAmount,
        commissionAmount,
      });

      // Avec destination charges, le transfert est déjà fait par Stripe
      // au moment du paiement client. Les fonds sont déjà sur le compte Connect.
      // On crée un payout standard pour virer vers le compte bancaire de l'annonceur.
      const payoutResult = await ctx.runAction(internal.api.stripeConnect.createStandardPayout, {
        stripeAccountId: args.stripeAccountId,
        amount: args.totalAmount,
        description: `Virement mensuel - ${args.missionIds.length} mission(s)`,
        stripeSecretKey: args.stripeSecretKey,
      });

      if (!payoutResult.success) {
        throw new Error("Échec du payout");
      }

      console.log("Payout programmé créé:", payoutResult.payoutId);

      // Mettre à jour les missions et le payout
      await ctx.runMutation(internal.planning.payouts.markScheduledPayoutComplete, {
        payoutId,
        missionIds: args.missionIds,
        transferId: payoutResult.payoutId,
      });

      return { success: true };
    } catch (error) {
      console.error("Erreur versement programmé:", error);
      throw error;
    }
  },
});

// ============================================
// MUTATIONS INTERNES
// ============================================

/**
 * Créer un enregistrement de payout
 */
export const createPayoutRecord = internalMutation({
  args: {
    announcerId: v.id("users"),
    missionIds: v.array(v.id("missions")),
    amount: v.number(),
    grossAmount: v.optional(v.number()),
    commissionAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const payoutId = await ctx.db.insert("announcerPayouts", {
      announcerId: args.announcerId,
      amount: args.amount,
      grossAmount: args.grossAmount,
      commissionAmount: args.commissionAmount,
      missions: args.missionIds,
      status: "processing",
      scheduledAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return payoutId;
  },
});

/**
 * Marquer une mission comme versée
 */
export const markMissionPaidOut = internalMutation({
  args: {
    missionId: v.id("missions"),
    transferId: v.string(),
    payoutId: v.optional(v.string()),
    amount: v.number(),
    fee: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const mission = await ctx.db.get(args.missionId);
    if (!mission) return;

    // Mettre à jour la mission
    await ctx.db.patch(args.missionId, {
      announcerPaymentStatus: "paid",
      updatedAt: now,
    });

    // Mettre à jour le paiement Stripe si existant
    if (mission.stripePaymentId) {
      await ctx.db.patch(mission.stripePaymentId, {
        transferId: args.transferId,
        transferAmount: args.amount,
        transferCreatedAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Marquer un versement programmé comme terminé
 */
export const markScheduledPayoutComplete = internalMutation({
  args: {
    payoutId: v.id("announcerPayouts"),
    missionIds: v.array(v.id("missions")),
    transferId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Mettre à jour le payout
    await ctx.db.patch(args.payoutId, {
      status: "completed",
      stripeTransferId: args.transferId,
      processedAt: now,
      updatedAt: now,
    });

    // Mettre à jour toutes les missions
    for (const missionId of args.missionIds) {
      await ctx.db.patch(missionId, {
        announcerPaymentStatus: "paid",
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Marquer un versement comme échoué
 */
export const markPayoutFailed = internalMutation({
  args: {
    missionId: v.id("missions"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // On ne change pas announcerPaymentStatus pour permettre une nouvelle tentative
    // Juste log l'erreur
    console.error(`Payout failed for mission ${args.missionId}: ${args.error}`);

    return { success: false };
  },
});

// ============================================
// QUERIES
// ============================================

/**
 * Récupérer les missions prêtes pour versement d'un annonceur
 */
export const getAnnouncerPendingPayouts = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return [];
    }

    const missions = await ctx.db
      .query("missions")
      .withIndex("by_announcer", (q) => q.eq("announcerId", session.userId))
      .collect();

    const pendingPayouts = missions.filter(
      (m) =>
        m.readyForPayout === true &&
        m.announcerPaymentStatus !== "paid"
    );

    return pendingPayouts.map((m) => ({
      id: m._id,
      serviceName: m.serviceName,
      amount: m.announcerEarnings || m.amount,
      confirmedAt: m.clientConfirmedAt || m.autoConfirmedAt,
      payoutScheduledFor: m.payoutScheduledFor,
      isAutoConfirmed: !!m.autoConfirmedAt,
    }));
  },
});

/**
 * Calculer les frais de versement instantané
 */
export const calculateInstantPayoutFee = query({
  args: {
    amount: v.number(), // Montant en centimes
  },
  handler: async (ctx, args) => {
    // Récupérer le taux de frais
    const feeConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "payout_instant_fee_percent"))
      .first();

    const feePercent = parseFloat(feeConfig?.value || "2");
    const fee = Math.round(args.amount * feePercent / 100);
    const netAmount = args.amount - fee;

    return {
      grossAmount: args.amount,
      feePercent,
      fee,
      netAmount,
    };
  },
});
