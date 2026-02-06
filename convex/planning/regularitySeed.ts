// @ts-nocheck
/**
 * Script temporaire de seed pour tester le scoring de régularité.
 * À supprimer après les tests.
 */
import { mutation, internalMutation } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "../_generated/api";

/**
 * Étape 1 : Trouver l'annonceur par email et afficher ses infos
 */
export const findAnnouncer = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) return { error: "Utilisateur non trouvé" };

    // Compter ses missions existantes
    const missions = await ctx.db
      .query("missions")
      .withIndex("by_announcer", (q) => q.eq("announcerId", user._id))
      .collect();

    return {
      userId: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      accountType: user.accountType,
      missionsCount: missions.length,
      missionStatuses: missions.reduce((acc: Record<string, number>, m) => {
        acc[m.status] = (acc[m.status] || 0) + 1;
        return acc;
      }, {}),
    };
  },
});

/**
 * Étape 2 : Créer des missions fictives pour simuler une activité intense
 * - 6 missions "completed" ce mois (> seuil de 4)
 * - Revenus annuels > 3000€ (> seuil 300000 centimes)
 * - 4 mois consécutifs d'activité (> seuil de 3)
 * - 6 clients uniques (> seuil de 5)
 */
export const seedTestMissions = mutation({
  args: { announcerEmail: v.string() },
  handler: async (ctx, args) => {
    const announcer = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.announcerEmail))
      .first();

    if (!announcer) throw new ConvexError("Annonceur non trouvé");

    // Trouver des clients existants (utilisateurs de type "utilisateur")
    const clients = await ctx.db
      .query("users")
      .withIndex("by_account_type", (q) => q.eq("accountType", "utilisateur"))
      .collect();

    if (clients.length === 0) {
      throw new ConvexError("Aucun client trouvé dans la base. On va en créer des fictifs.");
    }

    // Prendre jusqu'à 6 clients uniques (ou dupliquer si pas assez)
    const clientPool = [];
    for (let i = 0; i < 6; i++) {
      clientPool.push(clients[i % clients.length]);
    }

    const now = Date.now();
    const currentDate = new Date(now);
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    const createdMissions: string[] = [];

    // --- MOIS EN COURS : 6 missions completed (seuil = 4) ---
    for (let i = 0; i < 6; i++) {
      const day = String(Math.min(i + 2, 28)).padStart(2, "0");
      const monthStr = String(currentMonth + 1).padStart(2, "0");
      const dateStr = `${currentYear}-${monthStr}-${day}`;
      const client = clientPool[i];
      const earnings = 8500 + i * 500; // ~85€ à ~110€ par mission

      const missionId = await ctx.db.insert("missions", {
        announcerId: announcer._id,
        clientId: client._id,
        clientName: `${client.firstName} ${client.lastName}`,
        clientPhone: client.phone,
        animal: { name: `Animal Test ${i + 1}`, type: "chien", emoji: "🐕" },
        serviceName: "Garde de chien (test)",
        serviceCategory: "garde",
        status: "completed",
        amount: earnings + 1500, // total incluant commission
        basePrice: earnings + 1500,
        platformFee: 1500,
        announcerEarnings: earnings,
        commissionRate: 15,
        paymentStatus: "paid",
        announcerPaymentStatus: "paid",
        startDate: dateStr,
        endDate: dateStr,
        startTime: "09:00",
        endTime: "18:00",
        location: "Paris, France",
        city: "Paris",
        postalCode: "75015",
        createdAt: now - (6 - i) * 86400000,
        updatedAt: now,
      });
      createdMissions.push(missionId);
    }

    // --- 3 MOIS PRÉCÉDENTS : 2 missions completed chacun (total 4 mois consécutifs > seuil 3) ---
    for (let monthBack = 1; monthBack <= 3; monthBack++) {
      let m = currentMonth - monthBack;
      let y = currentYear;
      if (m < 0) { m += 12; y--; }
      const monthStr = String(m + 1).padStart(2, "0");

      for (let i = 0; i < 2; i++) {
        const day = String(5 + i * 10).padStart(2, "0");
        const dateStr = `${y}-${monthStr}-${day}`;
        const client = clientPool[(monthBack * 2 + i) % clientPool.length];
        const earnings = 7500 + monthBack * 1000;

        const missionId = await ctx.db.insert("missions", {
          announcerId: announcer._id,
          clientId: client._id,
          clientName: `${client.firstName} ${client.lastName}`,
          clientPhone: client.phone,
          animal: { name: `Animal Hist ${monthBack}-${i}`, type: "chat", emoji: "🐱" },
          serviceName: "Garde de chat (test)",
          serviceCategory: "garde",
          status: "completed",
          amount: earnings + 1500,
          basePrice: earnings + 1500,
          platformFee: 1500,
          announcerEarnings: earnings,
          commissionRate: 15,
          paymentStatus: "paid",
          announcerPaymentStatus: "paid",
          startDate: dateStr,
          endDate: dateStr,
          startTime: "09:00",
          endTime: "18:00",
          location: "Paris, France",
          city: "Paris",
          postalCode: "75015",
          createdAt: now - monthBack * 30 * 86400000,
          updatedAt: now,
        });
        createdMissions.push(missionId);
      }
    }

    // Calculer les totaux pour vérification
    const allMissions = await ctx.db
      .query("missions")
      .withIndex("by_announcer", (q) => q.eq("announcerId", announcer._id))
      .collect();

    const yearStart = `${currentYear}-01-01`;
    const completedThisYear = allMissions.filter(
      (m) => m.status === "completed" && m.startDate >= yearStart
    );
    const totalEarnings = completedThisYear.reduce(
      (sum, m) => sum + (m.announcerEarnings || 0), 0
    );
    const uniqueClients = new Set(completedThisYear.map((m) => m.clientId.toString())).size;

    return {
      success: true,
      createdMissions: createdMissions.length,
      totalMissionsNow: allMissions.length,
      verification: {
        missionsThisMonth: allMissions.filter(m => {
          const monthStr = String(currentMonth + 1).padStart(2, "0");
          return m.startDate.startsWith(`${currentYear}-${monthStr}`) &&
            ["completed", "upcoming", "in_progress"].includes(m.status);
        }).length,
        annualRevenueCents: totalEarnings,
        annualRevenueEuros: (totalEarnings / 100).toFixed(2),
        uniqueClients,
        note: `Seuils: missions>4, revenus>3000€(300000c), mois>3, clients>5`,
      },
    };
  },
});

/**
 * Étape 3 : Calculer le score directement pour un utilisateur
 */
export const computeScoreForUser = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const currentDate = new Date(now);
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) throw new ConvexError("Utilisateur non trouvé");
    if (user.accountType !== "annonceur_particulier") {
      throw new ConvexError("Pas un annonceur particulier: " + user.accountType);
    }

    // Récupérer toutes les missions de cet annonceur
    const missions = await ctx.db
      .query("missions")
      .withIndex("by_announcer", (q) => q.eq("announcerId", user._id))
      .collect();

    // 1. Missions du mois en cours
    const monthStr = String(currentMonth + 1).padStart(2, "0");
    const currentMonthStart = `${currentYear}-${monthStr}-01`;
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const currentMonthEnd = `${nextMonthYear}-${String(nextMonth + 1).padStart(2, "0")}-01`;

    const monthlyMissions = missions.filter(
      (m) =>
        m.startDate >= currentMonthStart &&
        m.startDate < currentMonthEnd &&
        ["completed", "upcoming", "in_progress"].includes(m.status)
    ).length;

    // 2. Revenus annuels
    const yearStart = `${currentYear}-01-01`;
    const yearEnd = `${currentYear + 1}-01-01`;
    const annualRevenue = missions
      .filter(
        (m) =>
          m.status === "completed" &&
          m.startDate >= yearStart &&
          m.startDate < yearEnd
      )
      .reduce((sum, m) => sum + (m.announcerEarnings || 0), 0);

    // 3. Mois consécutifs
    let consecutiveActiveMonths = 0;
    let checkMonth = currentMonth;
    let checkYear = currentYear;

    for (let i = 0; i < 24; i++) {
      const mStart = `${checkYear}-${String(checkMonth + 1).padStart(2, "0")}-01`;
      const nMonth = checkMonth === 11 ? 0 : checkMonth + 1;
      const nYear = checkMonth === 11 ? checkYear + 1 : checkYear;
      const mEnd = `${nYear}-${String(nMonth + 1).padStart(2, "0")}-01`;

      const hasCompleted = missions.some(
        (m) => m.status === "completed" && m.startDate >= mStart && m.startDate < mEnd
      );

      if (hasCompleted) {
        consecutiveActiveMonths++;
      } else {
        break;
      }

      checkMonth--;
      if (checkMonth < 0) { checkMonth = 11; checkYear--; }
    }

    // 4. Clients uniques
    const uniqueClients = new Set(
      missions
        .filter((m) => m.status === "completed" && m.startDate >= yearStart && m.startDate < yearEnd)
        .map((m) => m.clientId.toString())
    ).size;

    // Calculer score
    let score = 0;
    if (monthlyMissions > 4) score += 1;
    if (annualRevenue > 300000) score += 1;
    if (consecutiveActiveMonths > 3) score += 1;
    if (uniqueClients > 5) score += 1;

    const alertLevel = score <= 1 ? "ok" : score === 2 ? "attention" : score === 3 ? "warning" : "critical";

    // Blocage
    const existingScore = await ctx.db
      .query("regularityScores")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    let isBlocked = false;
    let criticalSince = existingScore?.criticalSince;
    let graceDeadline = existingScore?.graceDeadline;

    if (alertLevel === "critical") {
      if (!criticalSince) {
        criticalSince = now;
        graceDeadline = now + 30 * 24 * 60 * 60 * 1000;
      }
      if (graceDeadline && now >= graceDeadline) {
        isBlocked = true;
      }
    }

    // Upsert
    if (existingScore) {
      await ctx.db.patch(existingScore._id, {
        monthlyMissions,
        annualRevenue,
        consecutiveActiveMonths,
        uniqueClients,
        score,
        alertLevel,
        isBlocked,
        criticalSince,
        graceDeadline,
        lastCalculatedAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("regularityScores", {
        userId: user._id,
        monthlyMissions,
        annualRevenue,
        consecutiveActiveMonths,
        uniqueClients,
        score,
        alertLevel,
        isBlocked,
        criticalSince,
        graceDeadline,
        lastNotifiedLevel: undefined,
        lastNotifiedAt: undefined,
        lastEmailSentLevel: undefined,
        lastEmailSentAt: undefined,
        bannerDismissedAt: undefined,
        bannerDismissedForLevel: undefined,
        lastCalculatedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      success: true,
      metrics: { monthlyMissions, annualRevenue, annualRevenueEuros: (annualRevenue / 100).toFixed(2), consecutiveActiveMonths, uniqueClients },
      score,
      alertLevel,
      isBlocked,
      criticalSince: criticalSince ? new Date(criticalSince).toISOString() : null,
      graceDeadline: graceDeadline ? new Date(graceDeadline).toISOString() : null,
      thresholds: { missions: ">4", revenue: ">300000c (3000€)", months: ">3", clients: ">5" },
    };
  },
});

/**
 * Étape 4 : Vérifier le score calculé
 */
export const checkScore = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) return { error: "Utilisateur non trouvé" };

    const score = await ctx.db
      .query("regularityScores")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!score) return { error: "Aucun score calculé pour cet utilisateur", userId: user._id, accountType: user.accountType };

    return {
      userId: user._id,
      accountType: user.accountType,
      score: score.score,
      alertLevel: score.alertLevel,
      monthlyMissions: score.monthlyMissions,
      annualRevenue: score.annualRevenue,
      annualRevenueEuros: (score.annualRevenue / 100).toFixed(2),
      consecutiveActiveMonths: score.consecutiveActiveMonths,
      uniqueClients: score.uniqueClients,
      isBlocked: score.isBlocked,
      criticalSince: score.criticalSince ? new Date(score.criticalSince).toISOString() : null,
      graceDeadline: score.graceDeadline ? new Date(score.graceDeadline).toISOString() : null,
      lastCalculatedAt: new Date(score.lastCalculatedAt).toISOString(),
    };
  },
});

/**
 * Nettoyage : Supprimer les missions de test
 */
export const cleanupTestMissions = mutation({
  args: { announcerEmail: v.string() },
  handler: async (ctx, args) => {
    const announcer = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.announcerEmail))
      .first();

    if (!announcer) throw new ConvexError("Annonceur non trouvé");

    const missions = await ctx.db
      .query("missions")
      .withIndex("by_announcer", (q) => q.eq("announcerId", announcer._id))
      .collect();

    // Supprimer uniquement les missions de test (celles avec "(test)" dans le nom)
    let deleted = 0;
    for (const m of missions) {
      if (m.serviceName.includes("(test)")) {
        await ctx.db.delete(m._id);
        deleted++;
      }
    }

    // Supprimer aussi le score de régularité
    const score = await ctx.db
      .query("regularityScores")
      .withIndex("by_user", (q) => q.eq("userId", announcer._id))
      .first();
    if (score) {
      await ctx.db.delete(score._id);
    }

    return { deleted, scoreDeleted: !!score };
  },
});
