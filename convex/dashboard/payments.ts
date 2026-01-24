import { query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// Helper pour valider la session et obtenir l'utilisateur (annonceur)
async function validateAnnouncerSession(ctx: any, sessionToken: string) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", sessionToken))
    .first();

  if (!session || session.expiresAt < Date.now()) {
    throw new ConvexError("Session invalide ou expirée");
  }

  const user = await ctx.db.get(session.userId);
  if (!user || !user.isActive) {
    throw new ConvexError("Utilisateur non trouvé ou inactif");
  }

  // Vérifier que c'est un annonceur
  if (user.accountType !== "annonceur_pro" && user.accountType !== "annonceur_particulier") {
    throw new ConvexError("Accès réservé aux annonceurs");
  }

  return { user, session };
}

// Helper pour obtenir l'emoji de l'espèce animale
function getAnimalEmoji(species: string): string {
  const emojiMap: Record<string, string> = {
    chien: "🐕",
    chat: "🐈",
    lapin: "🐰",
    oiseau: "🦜",
    perruche: "🦜",
    perroquet: "🦜",
    rongeur: "🐹",
    hamster: "🐹",
    cobaye: "🐹",
    reptile: "🦎",
    poisson: "🐠",
    furet: "🦡",
    cheval: "🐴",
    poney: "🐴",
  };
  return emojiMap[species.toLowerCase()] || "🐾";
}

/**
 * Obtenir les missions terminées avec paiement en attente d'encaissement
 */
export const getAnnouncerPendingPayments = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const { user } = await validateAnnouncerSession(ctx, args.sessionToken);

    // Récupérer les missions de l'annonceur
    const missions = await ctx.db
      .query("missions")
      .withIndex("by_announcer", (q) => q.eq("announcerId", user._id))
      .collect();

    // Filtrer les missions completed avec paymentStatus = "pending"
    const pendingPayments = missions.filter(
      (m) => m.status === "completed" && m.paymentStatus === "pending"
    );

    // Enrichir avec infos client et service
    return Promise.all(
      pendingPayments.map(async (m) => {
        const client = await ctx.db.get(m.clientId);
        const service = m.serviceId ? await ctx.db.get(m.serviceId) : null;
        const animal = m.animalId ? await ctx.db.get(m.animalId) : null;

        return {
          id: m._id,
          clientId: m.clientId,
          clientName: client ? `${client.firstName} ${client.lastName}` : m.clientName,
          clientAvatar: "👤", // Placeholder
          animal: m.animal || (animal
            ? {
                name: animal.name,
                type: animal.type,
                emoji: getAnimalEmoji(animal.type),
              }
            : { name: "Animal", type: "inconnu", emoji: "🐾" }),
          service: m.serviceName,
          serviceName: m.serviceName,
          serviceCategory: m.serviceCategory,
          startDate: m.startDate,
          endDate: m.endDate,
          amount: Math.round((m.amount || 0) / 100), // Convertir centimes en euros
          paymentStatus: m.paymentStatus,
          location: m.location || "",
        };
      })
    );
  },
});

/**
 * Obtenir les statistiques de paiement de l'annonceur
 */
export const getAnnouncerPaymentStats = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const { user } = await validateAnnouncerSession(ctx, args.sessionToken);

    const missions = await ctx.db
      .query("missions")
      .withIndex("by_announcer", (q) => q.eq("announcerId", user._id))
      .collect();

    const completed = missions.filter((m) => m.status === "completed");
    const pending = completed.filter((m) => m.paymentStatus === "pending");
    const paid = completed.filter((m) => m.paymentStatus === "paid");

    return {
      // Montants en euros (conversion depuis centimes)
      totalPending: Math.round(pending.reduce((sum, m) => sum + (m.amount || 0), 0) / 100),
      totalCollected: Math.round(paid.reduce((sum, m) => sum + (m.amount || 0), 0) / 100),
      pendingCount: pending.length,
      paidCount: paid.length,
      // Total brut cumulé
      totalEarned: Math.round(
        completed.reduce((sum, m) => sum + (m.amount || 0), 0) / 100
      ),
    };
  },
});

/**
 * Obtenir l'historique des virements de l'annonceur
 */
export const getAnnouncerPayoutHistory = query({
  args: {
    sessionToken: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await validateAnnouncerSession(ctx, args.sessionToken);

    const payouts = await ctx.db
      .query("announcerPayouts")
      .withIndex("by_announcer", (q) => q.eq("announcerId", user._id))
      .order("desc")
      .take(args.limit || 10);

    return Promise.all(
      payouts.map(async (payout) => {
        // Récupérer les missions associées pour le détail
        const missionDetails = await Promise.all(
          payout.missions.map(async (mId) => {
            const m = await ctx.db.get(mId);
            if (!m) return null;
            const client = await ctx.db.get(m.clientId);
            return {
              serviceName: m.serviceName,
              clientName: client ? `${client.firstName} ${client.lastName}` : "Client",
            };
          })
        );

        return {
          id: payout._id,
          date: payout.processedAt || payout.createdAt,
          // Montant en euros
          amount: Math.round(payout.amount / 100),
          status: payout.status,
          missions: missionDetails.filter(Boolean).map((m) =>
            `${m!.serviceName} - ${m!.clientName}`
          ),
          missionsCount: payout.missions.length,
        };
      })
    );
  },
});

/**
 * Obtenir les missions complétées de l'annonceur avec tous les statuts de paiement
 */
export const getCompletedMissions = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const { user } = await validateAnnouncerSession(ctx, args.sessionToken);

    const missions = await ctx.db
      .query("missions")
      .withIndex("by_announcer", (q) => q.eq("announcerId", user._id))
      .order("desc")
      .collect();

    const completed = missions.filter((m) => m.status === "completed");

    return Promise.all(
      completed.map(async (m) => {
        const client = await ctx.db.get(m.clientId);

        return {
          id: m._id,
          clientName: client ? `${client.firstName} ${client.lastName}` : m.clientName,
          animal: m.animal || { name: "Animal", type: "inconnu", emoji: "🐾" },
          service: m.serviceName,
          startDate: m.startDate,
          endDate: m.endDate,
          amount: Math.round((m.amount || 0) / 100),
          paymentStatus: m.paymentStatus,
        };
      })
    );
  },
});
