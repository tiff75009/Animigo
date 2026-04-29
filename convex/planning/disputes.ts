// @ts-nocheck
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { notifySystem } from "../lib/notificationTemplates";

/**
 * Liste des motifs de réclamation actifs (pour le client)
 */
export const getDisputeReasons = query({
  args: {},
  handler: async (ctx) => {
    const reasons = await ctx.db
      .query("disputeReasons")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    return reasons
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((r) => ({
        _id: r._id,
        label: r.label,
        slug: r.slug,
        description: r.description,
        blocksPayment: r.blocksPayment,
        // Helper affiché au client quand il choisit ce motif
        clientHelperMessage: r.clientHelperMessage,
      }));
  },
});

/**
 * Client ouvre une réclamation
 */
export const submitDispute = mutation({
  args: {
    sessionToken: v.string(),
    missionId: v.id("missions"),
    reasonId: v.id("disputeReasons"),
    description: v.string(),
    // Pièces jointes (photos animal blessé, factures véto…)
    attachments: v.optional(
      v.array(
        v.object({
          url: v.string(),
          type: v.string(),
          name: v.optional(v.string()),
          size: v.optional(v.number()),
        })
      )
    ),
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
    if (!mission) throw new ConvexError("Mission non trouvée");

    if (mission.clientId !== session.userId) {
      throw new ConvexError("Vous n'êtes pas le client de cette mission");
    }

    if (mission.status !== "completed") {
      throw new ConvexError("La mission n'est pas terminée");
    }

    // Vérifier que la mission n'est pas déjà confirmée
    if (mission.clientConfirmedAt || mission.autoConfirmedAt) {
      throw new ConvexError("Impossible de signaler : la mission a déjà été confirmée");
    }

    // Vérifier pas de dispute existante
    const existingDispute = await ctx.db
      .query("disputes")
      .withIndex("by_mission", (q) => q.eq("missionId", args.missionId))
      .first();

    if (existingDispute) {
      throw new ConvexError("Une réclamation existe déjà pour cette mission");
    }

    if (args.description.length < 20) {
      throw new ConvexError("La description doit contenir au moins 20 caractères");
    }

    // Récupérer le motif
    const reason = await ctx.db.get(args.reasonId);
    if (!reason || !reason.isActive) {
      throw new ConvexError("Motif de réclamation invalide");
    }

    const now = Date.now();

    // Snapshot : le payout annonceur est-il DÉJÀ parti ?
    // Si oui, on ne peut plus le retenir → admin devra faire un
    // reversal manuel chez Stripe. On flag pour signaler ce cas.
    const payoutAlreadyDone =
      mission.announcerPaymentStatus === "paid" ||
      mission.announcerPaymentStatus === "transferred";

    // Créer la réclamation
    const disputeId = await ctx.db.insert("disputes", {
      missionId: args.missionId,
      clientId: session.userId,
      announcerId: mission.announcerId,
      reasonId: args.reasonId,
      reasonLabel: reason.label,
      description: args.description,
      attachments: args.attachments,
      status: "open",
      paymentBlocked: reason.blocksPayment,
      payoutAlreadyDoneAtCreation: payoutAlreadyDone,
      createdAt: now,
      updatedAt: now,
    });

    // Si blocage paiement, empêcher le versement
    const missionPatch: Record<string, unknown> = {
      hasDispute: true,
      disputeId,
      updatedAt: now,
    };

    if (reason.blocksPayment) {
      missionPatch.readyForPayout = false;
      missionPatch.announcerPaymentStatus = "not_due";
    }

    await ctx.db.patch(args.missionId, missionPatch);

    // Notification annonceur
    const client = await ctx.db.get(session.userId);
    const clientName = client ? `${client.firstName} ${client.lastName.charAt(0)}.` : "Un client";

    await notifySystem({
      userId: mission.announcerId,
      title: "Réclamation ouverte",
      message: `${clientName} a ouvert une réclamation pour "${mission.serviceName}" : ${reason.label}`,
      linkUrl: `/dashboard/reclamations`,
    });

    // ⚠️ Alerte admin si payout déjà parti : reversal Stripe manuel requis
    if (payoutAlreadyDone) {
      const admins = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("accountType"), "admin"))
        .collect();
      for (const admin of admins) {
        await notifySystem({
          userId: admin._id,
          title: "⚠️ Réclamation post-payout",
          message: `Le versement annonceur de "${mission.serviceName}" a déjà été effectué AVANT cette réclamation. Reversal Stripe manuel requis si remboursement client.`,
          linkUrl: `/admin/reclamations?id=${disputeId}`,
        });
      }
    }

    return {
      success: true,
      disputeId,
      paymentBlocked: reason.blocksPayment,
      payoutAlreadyDone,
    };
  },
});

/**
 * Récupérer la réclamation d'une mission
 */
export const getDisputeByMission = query({
  args: {
    sessionToken: v.string(),
    missionId: v.id("missions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) return null;

    return await ctx.db
      .query("disputes")
      .withIndex("by_mission", (q) => q.eq("missionId", args.missionId))
      .first();
  },
});

/**
 * Annonceur soumet sa version des faits sur une réclamation.
 * Seul l'annonceur concerné peut répondre, et une seule fois.
 */
export const submitAnnouncerResponse = mutation({
  args: {
    sessionToken: v.string(),
    disputeId: v.id("disputes"),
    response: v.string(),
    attachments: v.optional(
      v.array(
        v.object({
          url: v.string(),
          type: v.string(),
          name: v.optional(v.string()),
          size: v.optional(v.number()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();
    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const dispute = await ctx.db.get(args.disputeId);
    if (!dispute) throw new ConvexError("Réclamation introuvable");

    if (dispute.announcerId !== session.userId) {
      throw new ConvexError("Vous n'êtes pas l'annonceur concerné par cette réclamation");
    }

    if (dispute.announcerResponse) {
      throw new ConvexError("Vous avez déjà répondu à cette réclamation");
    }

    if (dispute.status === "closed") {
      throw new ConvexError("Cette réclamation est clôturée");
    }

    if (args.response.trim().length < 20) {
      throw new ConvexError("Votre réponse doit contenir au moins 20 caractères");
    }

    const now = Date.now();
    await ctx.db.patch(args.disputeId, {
      announcerResponse: args.response.trim(),
      announcerRespondedAt: now,
      announcerResponseAttachments: args.attachments,
      // Passer en "investigating" : l'admin a maintenant les 2 versions
      status: dispute.status === "open" ? "investigating" : dispute.status,
      updatedAt: now,
    });

    // Notifier le client
    const announcer = await ctx.db.get(session.userId);
    const announcerName = announcer
      ? `${announcer.firstName} ${announcer.lastName.charAt(0)}.`
      : "L'annonceur";
    await notifySystem({
      userId: dispute.clientId,
      title: "Réponse à votre réclamation",
      message: `${announcerName} a répondu à votre réclamation. Le service support va examiner les deux versions.`,
      linkUrl: `/client/reservations/${dispute.missionId}`,
    });

    // Notifier le(s) admin(s)
    const admins = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("accountType"), "admin"))
      .collect();
    for (const admin of admins) {
      await notifySystem({
        userId: admin._id,
        title: "Nouvelle réponse annonceur",
        message: `${announcerName} a répondu à la réclamation ${dispute.reasonLabel}.`,
        linkUrl: `/admin/reclamations?id=${args.disputeId}`,
      });
    }

    return { success: true };
  },
});

/**
 * Liste des réclamations OUVERTES PAR le client courant.
 * (Pour l'écran "Mes réclamations" côté client.)
 */
export const getMyClientDisputes = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();
    if (!session || session.expiresAt < Date.now()) return [];

    const disputes = await ctx.db
      .query("disputes")
      .withIndex("by_client", (q) => q.eq("clientId", session.userId))
      .collect();

    const enriched = await Promise.all(
      disputes
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(async (d) => {
          const mission = await ctx.db.get(d.missionId);
          const announcer = await ctx.db.get(d.announcerId);
          return {
            _id: d._id,
            missionId: d.missionId,
            reasonLabel: d.reasonLabel,
            description: d.description,
            attachments: d.attachments,
            status: d.status,
            paymentBlocked: d.paymentBlocked,
            announcerResponse: d.announcerResponse,
            announcerRespondedAt: d.announcerRespondedAt,
            announcerResponseAttachments: d.announcerResponseAttachments,
            resolution: d.resolution,
            resolvedAt: d.resolvedAt,
            createdAt: d.createdAt,
            announcerName: announcer
              ? `${announcer.firstName} ${announcer.lastName.charAt(0)}.`
              : "Annonceur",
            serviceName: mission?.serviceName ?? "Prestation",
            startDate: mission?.startDate,
            missionAmount: mission?.amount,
            refundAmount: mission?.refundAmount,
          };
        })
    );

    return enriched;
  },
});

/**
 * Compteur des réclamations actives du client/annonceur (pour badge sidebar).
 * Léger : pas d'enrichissement.
 */
export const countMyActiveDisputes = query({
  args: {
    sessionToken: v.string(),
    role: v.union(v.literal("client"), v.literal("announcer")),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();
    if (!session || session.expiresAt < Date.now()) return 0;

    const disputes = await ctx.db
      .query("disputes")
      .withIndex(
        args.role === "client" ? "by_client" : "by_announcer",
        (q: any) =>
          q.eq(
            args.role === "client" ? "clientId" : "announcerId",
            session.userId
          )
      )
      .collect();

    // "Actives" = pas encore clôturées définitivement
    return disputes.filter(
      (d) => d.status === "open" || d.status === "investigating"
    ).length;
  },
});

/**
 * Liste des réclamations concernant l'annonceur courant.
 * (Pour l'écran "Mes réclamations" côté annonceur.)
 */
export const getMyAnnouncerDisputes = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();
    if (!session || session.expiresAt < Date.now()) return [];

    const disputes = await ctx.db
      .query("disputes")
      .withIndex("by_announcer", (q) => q.eq("announcerId", session.userId))
      .collect();

    // Enrichissement minimal : nom client + service
    const enriched = await Promise.all(
      disputes
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(async (d) => {
          const mission = await ctx.db.get(d.missionId);
          const client = await ctx.db.get(d.clientId);
          return {
            _id: d._id,
            missionId: d.missionId,
            reasonLabel: d.reasonLabel,
            description: d.description,
            status: d.status,
            paymentBlocked: d.paymentBlocked,
            announcerResponse: d.announcerResponse,
            announcerRespondedAt: d.announcerRespondedAt,
            createdAt: d.createdAt,
            clientName: client
              ? `${client.firstName} ${client.lastName.charAt(0)}.`
              : "Client",
            serviceName: mission?.serviceName ?? "Prestation",
            startDate: mission?.startDate,
          };
        })
    );

    return enriched;
  },
});
