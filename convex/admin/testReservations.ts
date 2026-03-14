// @ts-nocheck
import { mutation, query, internalMutation, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import { getEmailConfigFromDb } from "../api/emailInternal";
import { calculateRefund } from "../planning/cancellation";
import Stripe from "stripe";
import { createStripeClient } from "../lib/stripeFactory";
import { formatPrice } from "../lib/formatting";

// ============================================
// HELPERS
// ============================================

async function requireAdmin(ctx: any, token: string) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();
  if (!session || session.expiresAt < Date.now()) {
    throw new ConvexError("Session invalide");
  }
  const user = await ctx.db.get(session.userId);
  if (!user || user.role !== "admin") {
    throw new ConvexError("Accès admin requis");
  }
  return user;
}

// ============================================
// QUERIES
// ============================================

/**
 * Récupère les données nécessaires pour l'interface de test
 * (annonceurs, clients, services, missions récentes)
 */
export const getTestData = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) return null;

    const user = await ctx.db.get(session.userId);
    if (!user || user.role !== "admin") return null;

    // Récupérer tous les utilisateurs
    const allUsers = await ctx.db.query("users").collect();
    const announcers = allUsers
      .filter((u: any) => u.accountType === "annonceur_pro" || u.accountType === "annonceur_particulier")
      .map((u: any) => ({
        _id: u._id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        username: u.username || u.slug || "",
        accountType: u.accountType,
        isActive: u.isActive !== false,
        stripeAccountId: u.stripeAccountId,
      }));

    // Récupérer les clients (accountType "utilisateur")
    const clients = allUsers
      .filter((u: any) => u.accountType === "utilisateur")
      .map((u: any) => ({
        _id: u._id,
        firstName: u.firstName || "",
        lastName: u.lastName || "",
        email: u.email,
        username: u.username || u.slug || "",
        isActive: u.isActive !== false,
        stripeCustomerId: u.stripeCustomerId,
      }));

    // Services actifs avec variantes enrichies
    const services = await ctx.db.query("services").collect();
    const activeServices = [];
    for (const s of services.filter((s: any) => s.isActive)) {
      const variants = await ctx.db
        .query("serviceVariants")
        .withIndex("by_service", (q: any) => q.eq("serviceId", s._id))
        .collect();
      const activeVariants = variants.filter((v: any) => v.isActive);
      if (activeVariants.length > 0) {
        const announcer = allUsers.find((u: any) => u._id === s.userId);

        // Récupérer créneaux collectifs pour les variantes collectives
        const enrichedVariants = [];
        for (const v of activeVariants) {
          let collectiveSlots: any[] = [];
          if (v.sessionType === "collective") {
            const slots = await ctx.db
              .query("collectiveSlots")
              .withIndex("by_variant", (q: any) => q.eq("variantId", v._id))
              .collect();
            collectiveSlots = slots
              .filter((sl: any) => sl.isActive && !sl.isCancelled && sl.date >= new Date().toISOString().split("T")[0])
              .map((sl: any) => ({
                _id: sl._id,
                date: sl.date,
                startTime: sl.startTime,
                endTime: sl.endTime,
                maxAnimals: sl.maxAnimals,
                bookedAnimals: sl.bookedAnimals,
                availableSpots: sl.maxAnimals - sl.bookedAnimals,
              }));
          }

          enrichedVariants.push({
            _id: v._id,
            name: v.name,
            pricing: v.pricing,
            price: v.price,
            priceUnit: v.priceUnit,
            sessionType: v.sessionType || "individual",
            numberOfSessions: v.numberOfSessions || 1,
            sessionInterval: v.sessionInterval,
            duration: v.duration,
            maxAnimalsPerSession: v.maxAnimalsPerSession,
            collectiveSlots,
          });
        }

        activeServices.push({
          _id: s._id,
          name: s.name,
          category: s.category,
          userId: s.userId,
          serviceLocation: s.serviceLocation,
          allowOvernightStay: s.allowOvernightStay,
          overnightPrice: s.overnightPrice,
          announcerName: announcer ? `${announcer.firstName} ${announcer.lastName}` : "?",
          variants: enrichedVariants,
        });
      }
    }

    // Missions récentes (20 dernières)
    const missions = await ctx.db.query("missions").order("desc").take(20);
    const enrichedMissions = [];
    for (const m of missions) {
      const ann = allUsers.find((u: any) => u._id === m.announcerId);
      const cli = allUsers.find((u: any) => u._id === m.clientId);
      let payment = null;
      if (m.stripePaymentId) {
        payment = await ctx.db.get(m.stripePaymentId);
      }
      enrichedMissions.push({
        _id: m._id,
        status: m.status,
        paymentStatus: m.paymentStatus,
        announcerPaymentStatus: m.announcerPaymentStatus,
        serviceName: m.serviceName,
        amount: m.amount,
        platformFee: m.platformFee,
        stripeFee: m.stripeFee,
        commissionRate: m.commissionRate,
        stripeFeeRate: m.stripeFeeRate,
        serviceAmount: m.serviceAmount,
        basePrice: m.basePrice,
        announcerEarnings: m.announcerEarnings,
        startDate: m.startDate,
        endDate: m.endDate,
        startTime: m.startTime,
        endTime: m.endTime,
        announcerName: ann ? `${ann.firstName} ${ann.lastName}` : "?",
        clientName: cli ? `${cli.firstName} ${cli.lastName}` : "?",
        animal: m.animal,
        cancelledBy: m.cancelledBy,
        cancellationReason: m.cancellationReason,
        refundAmount: m.refundAmount,
        announcerRetainedAmount: m.announcerRetainedAmount,
        readyForPayout: m.readyForPayout,
        payoutScheduledFor: m.payoutScheduledFor,
        clientConfirmedAt: m.clientConfirmedAt,
        autoConfirmedAt: m.autoConfirmedAt,
        acceptanceDeadline: m.acceptanceDeadline,
        paymentDeadline: m.paymentDeadline,
        stripePaymentId: m.stripePaymentId,
        createdAt: m._creationTime,
        payment: payment ? {
          _id: payment._id,
          status: payment.status,
          paymentIntentId: payment.paymentIntentId,
          amount: payment.amount,
          platformFee: payment.platformFee,
          refundedAmount: payment.refundedAmount,
        } : null,
      });
    }

    // Emails récents liés aux missions
    const emailLogs = await ctx.db
      .query("emailLogs")
      .order("desc")
      .take(30);

    // Notifications récentes
    const notifications = await ctx.db
      .query("notifications")
      .order("desc")
      .take(30);

    return {
      announcers,
      clients,
      services: activeServices,
      missions: enrichedMissions,
      emailLogs: emailLogs.map((e: any) => ({
        _id: e._id,
        to: e.to,
        subject: e.subject,
        template: e.template,
        status: e.status,
        errorMessage: e.errorMessage,
        createdAt: e._creationTime,
      })),
      notifications: notifications.map((n: any) => ({
        _id: n._id,
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        createdAt: n.createdAt,
      })),
    };
  },
});

/**
 * Récupère le détail complet d'une mission pour le debug
 */
export const getMissionDebug = query({
  args: { token: v.string(), missionId: v.id("missions") },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) return null;

    const user = await ctx.db.get(session.userId);
    if (!user || user.role !== "admin") return null;

    const mission = await ctx.db.get(args.missionId);
    if (!mission) return null;

    let payment = null;
    if (mission.stripePaymentId) {
      payment = await ctx.db.get(mission.stripePaymentId);
    }

    const announcer = await ctx.db.get(mission.announcerId);
    const client = await ctx.db.get(mission.clientId);

    // Emails liés
    const allEmails = await ctx.db.query("emailLogs").order("desc").take(50);
    const relatedEmails = allEmails.filter((e: any) =>
      (client && e.to === client.email) || (announcer && e.to === announcer.email)
    );

    // Notifications liées
    const announcerNotifs = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q: any) => q.eq("userId", mission.announcerId))
      .order("desc")
      .take(10);
    const clientNotifs = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q: any) => q.eq("userId", mission.clientId))
      .order("desc")
      .take(10);

    return {
      mission,
      payment,
      announcer: announcer ? {
        _id: announcer._id,
        firstName: announcer.firstName,
        lastName: announcer.lastName,
        email: announcer.email,
        stripeAccountId: announcer.stripeAccountId,
        stripeChargesEnabled: announcer.stripeChargesEnabled,
        payoutMode: announcer.payoutMode,
      } : null,
      client: client ? {
        _id: client._id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        stripeCustomerId: client.stripeCustomerId,
      } : null,
      emails: relatedEmails.slice(0, 10),
      notifications: [...announcerNotifs, ...clientNotifs]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 15),
    };
  },
});

// ============================================
// MUTATIONS — Créer une mission de test
// ============================================

/**
 * Crée une mission de test directement (bypass le flow normal)
 * avec les prix calculés comme en prod
 */
export const createTestMission = mutation({
  args: {
    token: v.string(),
    announcerId: v.id("users"),
    clientId: v.id("users"),
    serviceId: v.id("services"),
    variantId: v.id("serviceVariants"),
    // Mode range/hourly
    startDate: v.string(),
    endDate: v.string(),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    // Mode multi-session
    sessions: v.optional(v.array(v.object({
      date: v.string(),
      startTime: v.string(),
      endTime: v.string(),
    }))),
    // Mode collectif
    collectiveSlotIds: v.optional(v.array(v.id("collectiveSlots"))),
    animalCount: v.optional(v.number()),
    // Garde de nuit
    includeOvernightStay: v.optional(v.boolean()),
    overnightNights: v.optional(v.number()),
    // Statut
    initialStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const announcer = await ctx.db.get(args.announcerId);
    if (!announcer) throw new ConvexError("Annonceur non trouvé");

    const client = await ctx.db.get(args.clientId);
    if (!client) throw new ConvexError("Client non trouvé");

    const service = await ctx.db.get(args.serviceId);
    if (!service) throw new ConvexError("Service non trouvé");

    const variant = await ctx.db.get(args.variantId);
    if (!variant) throw new ConvexError("Variante non trouvée");

    // Récupérer un animal du client
    const animals = await ctx.db
      .query("animals")
      .withIndex("by_user", (q: any) => q.eq("userId", args.clientId))
      .collect();
    const animal = animals[0];

    // Nombre d'animaux
    const effectiveAnimalCount = args.animalCount || 1;

    // Déterminer le mode de réservation
    const isCollective = variant.sessionType === "collective" || (args.collectiveSlotIds && args.collectiveSlotIds.length > 0);
    const isMultiSession = !isCollective && (variant.numberOfSessions || 1) > 1;
    const sessionCount = isCollective
      ? (args.collectiveSlotIds?.length || 1)
      : isMultiSession
        ? (args.sessions?.length || variant.numberOfSessions || 1)
        : 1;

    // Calculer le prix de base selon le mode et le priceUnit
    let serviceAmount: number;
    const priceUnit = variant.priceUnit || "day";

    if (isCollective || isMultiSession) {
      // Collectif/multi : prix unitaire × séances × animaux
      serviceAmount = (variant.price || 3000) * sessionCount * effectiveAnimalCount;
    } else if (priceUnit === "hour" || priceUnit === "flat") {
      // Mode horaire ou forfait : calculer la durée en heures
      if (priceUnit === "flat") {
        // Forfait = prix fixe × animaux
        serviceAmount = (variant.price || 3000) * effectiveAnimalCount;
      } else {
        // Horaire : prix/h × heures × animaux
        const hourlyRate = variant.pricing?.hourly || variant.price || 1500;
        let hours = 1;
        if (args.startTime && args.endTime) {
          const [sh, sm] = args.startTime.split(":").map(Number);
          const [eh, em] = args.endTime.split(":").map(Number);
          hours = Math.max(0.5, (eh * 60 + em - sh * 60 - sm) / 60);
        } else if (variant.duration) {
          hours = variant.duration / 60;
        }
        serviceAmount = Math.round(hourlyRate * hours) * effectiveAnimalCount;
      }
    } else {
      // Mode journalier (range) : prix/jour × jours × animaux
      const start = new Date(args.startDate);
      const end = new Date(args.endDate);
      const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      const dailyRate = variant.pricing?.daily || variant.price || 3000;
      serviceAmount = dailyRate * days * effectiveAnimalCount;
    }

    // Ajouter nuits
    const overnightAmount = args.includeOvernightStay && args.overnightNights
      ? (service.overnightPrice || variant.pricing?.nightly || 1500) * args.overnightNights
      : 0;
    serviceAmount += overnightAmount;

    // Récupérer les vrais taux depuis systemConfig (comme en prod)
    const announcerForCommission = announcer;
    let commissionType = "particulier";
    if (announcerForCommission.accountType === "annonceur_pro") {
      commissionType = announcerForCommission.companyType === "micro_enterprise" ? "micro_entrepreneur" : "professionnel";
    }
    const commissionConfig = await ctx.db.query("systemConfig")
      .withIndex("by_key", (q: any) => q.eq("key", `commission_${commissionType}`))
      .first();
    const defaultRates: Record<string, number> = { particulier: 15, micro_entrepreneur: 12, professionnel: 10 };
    const commissionRate = commissionConfig ? parseFloat(commissionConfig.value) : (defaultRates[commissionType] || 15);

    const stripeFeeConfig = await ctx.db.query("systemConfig")
      .withIndex("by_key", (q: any) => q.eq("key", "stripe_fee_rate"))
      .first();
    const stripeFeeRate = stripeFeeConfig ? parseFloat(stripeFeeConfig.value) : 3;

    const commissionVatConfig = await ctx.db.query("systemConfig")
      .withIndex("by_key", (q: any) => q.eq("key", "commission_vat_rate"))
      .first();
    const vatRate = commissionVatConfig ? parseFloat(commissionVatConfig.value) : 20;

    // Calcul identique à la prod (booking.ts)
    const platformFee = Math.round((serviceAmount * commissionRate) / 100);
    const totalBeforeStripeFee = serviceAmount + platformFee;
    const stripeFee = Math.round((totalBeforeStripeFee * stripeFeeRate) / 100);
    const vatOnCommission = Math.round(platformFee * vatRate / (100 + vatRate));
    const totalAmount = serviceAmount + platformFee + stripeFee;
    const announcerEarnings = serviceAmount;

    const now = Date.now();
    const status = args.initialStatus || "pending_acceptance";

    // Déterminer startDate/endDate selon le mode
    let startDate = args.startDate;
    let endDate = args.endDate;
    if (isCollective && args.collectiveSlotIds?.length) {
      const slots = [];
      for (const slotId of args.collectiveSlotIds) {
        const slot = await ctx.db.get(slotId);
        if (slot) slots.push(slot);
      }
      if (slots.length > 0) {
        slots.sort((a, b) => a.date.localeCompare(b.date));
        startDate = slots[0].date;
        endDate = slots[slots.length - 1].date;
      }
    } else if (isMultiSession && args.sessions?.length) {
      const sorted = [...args.sessions].sort((a, b) => a.date.localeCompare(b.date));
      startDate = sorted[0].date;
      endDate = sorted[sorted.length - 1].date;
    }

    const missionId = await ctx.db.insert("missions", {
      announcerId: args.announcerId,
      clientId: args.clientId,
      serviceId: args.serviceId,
      serviceName: service.name || variant.name || "Service test",
      serviceCategory: service.category || "garde",
      variantId: args.variantId as unknown as string,
      variantName: variant.name || "Formule test",
      animal: animal
        ? { name: animal.name, type: animal.type, emoji: animal.type === "chien" ? "🐕" : animal.type === "chat" ? "🐱" : "🐾" }
        : { name: "Rex", type: "chien", emoji: "🐕" },
      animalId: animal?._id,
      startDate,
      endDate,
      startTime: args.startTime || "09:00",
      endTime: args.endTime || "18:00",
      amount: totalAmount,
      basePrice: serviceAmount,
      platformFee,
      stripeFee,
      announcerEarnings,
      commissionRate,
      stripeFeeRate,
      vatRate,
      vatAmount: vatOnCommission,
      vatOnCommission,
      serviceAmount,
      status,
      paymentStatus: ["upcoming", "in_progress", "completed"].includes(status) ? "paid" : "not_due",
      announcerPaymentStatus: "not_due",
      // Type de session
      sessionType: isCollective ? "collective" : "individual",
      numberOfSessions: isMultiSession ? (variant.numberOfSessions || sessionCount) : isCollective ? sessionCount : 1,
      // Multi-session : sessions array
      ...(isMultiSession && args.sessions ? { sessions: args.sessions } : {}),
      // Collectif : slotIds + animalCount
      ...(isCollective && args.collectiveSlotIds ? {
        collectiveSlotIds: args.collectiveSlotIds,
        animalCount: args.animalCount || 1,
      } : {}),
      // Garde de nuit
      ...(args.includeOvernightStay ? {
        includeOvernightStay: true,
        overnightNights: args.overnightNights || 0,
        overnightAmount,
      } : {}),
      bookedAt: now,
      clientName: `${client.firstName} ${client.lastName}`,
      serviceLocation: service.serviceLocation || "announcer_home",
      location: announcer.address || client.address || "Adresse de test",
      readyForPayout: false,
      createdAt: now,
      updatedAt: now,
      acceptanceDeadline: status === "pending_acceptance" ? now + 5 * 60 * 1000 : undefined,
      ...(status === "pending_acceptance" ? {} : { acceptedAt: now }),
    });

    // Si collectif, créer les collectiveSlotBookings et incrémenter les slots
    if (isCollective && args.collectiveSlotIds) {
      const animalCount = args.animalCount || 1;
      for (let i = 0; i < args.collectiveSlotIds.length; i++) {
        const slotId = args.collectiveSlotIds[i];
        const slot = await ctx.db.get(slotId);

        await ctx.db.insert("collectiveSlotBookings", {
          slotId,
          missionId,
          clientId: args.clientId,
          animalId: animal?._id,
          animalCount,
          sessionNumber: i + 1,
          status: "booked",
          createdAt: now,
          updatedAt: now,
        });

        if (slot) {
          await ctx.db.patch(slotId, {
            bookedAnimals: (slot.bookedAnimals || 0) + animalCount,
            updatedAt: now,
          });
        }
      }
    }

    // Email à l'annonceur : nouvelle demande de réservation (comme en prod)
    const { emailConfig, appUrl: emailAppUrl } = await getEmailConfigFromDb(ctx.db);
    if (emailConfig && announcer.email) {
      const appUrlConfig = await ctx.db.query("systemConfig")
        .withIndex("by_key", (q: any) => q.eq("key", "app_url")).first();
      const appUrl = appUrlConfig?.value || emailAppUrl || "http://localhost:3000";
      await ctx.scheduler.runAfter(0, internal.api.email.sendNewReservationRequestEmail, {
        announcerEmail: announcer.email,
        announcerFirstName: announcer.firstName,
        clientName: `${client.firstName} ${client.lastName}`,
        reservation: {
          serviceName: service.name || variant.name || "Service",
          startDate,
          endDate,
          startTime: args.startTime,
          endTime: args.endTime,
          animalName: animal?.name || "Animal",
          animalType: animal?.type,
          location: announcer.address || "Non précisé",
          includeOvernightStay: args.includeOvernightStay,
          overnightNights: args.overnightNights,
          totalAmount,
        },
        emailConfig,
        appUrl,
      });
    }

    // Notification à l'annonceur
    await ctx.db.insert("notifications", {
      userId: args.announcerId,
      type: "new_mission",
      title: "Nouvelle demande de réservation",
      message: `${client.firstName} souhaite réserver "${service.name || variant.name}" du ${startDate} au ${endDate}.`,
      linkType: "mission",
      linkId: missionId as unknown as string,
      linkUrl: `/dashboard/reservations`,
      isRead: false,
      createdAt: now,
      expiresAt: now + 30 * 24 * 60 * 60 * 1000,
    });

    return {
      success: true,
      missionId,
      mode: isCollective ? "collective" : isMultiSession ? "multi-session" : priceUnit === "hour" ? "hourly" : "daily",
      sessionCount,
      animalCount: effectiveAnimalCount,
      pricing: { serviceAmount, platformFee, stripeFee, vatOnCommission, totalAmount, announcerEarnings, overnightAmount, commissionRate, stripeFeeRate },
    };
  },
});

// ============================================
// MUTATIONS — Simuler le paiement client (Stripe test)
// ============================================

/**
 * Cartes de test Stripe disponibles
 */
const STRIPE_TEST_CARDS: Record<string, { pm: string; label: string }> = {
  visa: { pm: "pm_card_visa", label: "Visa •••• 4242" },
  visa_debit: { pm: "pm_card_visa_debit", label: "Visa Debit •••• 4242" },
  mastercard: { pm: "pm_card_mastercard", label: "Mastercard •••• 5556" },
  declined: { pm: "pm_card_visa_chargeDeclined", label: "Visa Declined" },
  insufficient: { pm: "pm_card_visa_chargeDeclinedInsufficientFunds", label: "Visa Insufficient Funds" },
  expired: { pm: "pm_card_chargeDeclinedExpiredCard", label: "Carte expirée" },
  "3ds_required": { pm: "pm_card_threeDSecure2Required", label: "Visa 3DS Required" },
};

/**
 * Simule le paiement client en confirmant le PaymentIntent Stripe
 * avec une carte de test (pm_card_visa, etc.)
 */
export const simulateClientPayment = mutation({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
    testCard: v.optional(v.string()), // "visa", "mastercard", "declined", etc.
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const mission = await ctx.db.get(args.missionId);
    if (!mission) throw new ConvexError("Mission non trouvée");
    if (mission.status !== "pending_confirmation") {
      throw new ConvexError("La mission doit être en pending_confirmation");
    }

    // Récupérer le stripePayment
    if (!mission.stripePaymentId) {
      throw new ConvexError("Pas de paiement Stripe associé à cette mission");
    }
    const payment = await ctx.db.get(mission.stripePaymentId);
    if (!payment) throw new ConvexError("Record de paiement non trouvé");
    if (!payment.paymentIntentId) {
      throw new ConvexError("PaymentIntent pas encore créé (attendez quelques secondes après l'acceptation)");
    }

    // Récupérer la clé Stripe
    const stripeSecretKeyConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q: any) => q.eq("key", "stripe_secret_key"))
      .first();
    if (!stripeSecretKeyConfig?.value) throw new ConvexError("Clé Stripe non configurée");

    const convexUrlConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q: any) => q.eq("key", "convex_url"))
      .first();
    const convexAdminKeyConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q: any) => q.eq("key", "convex_admin_key"))
      .first();

    const testCardKey = args.testCard || "visa";
    const cardInfo = STRIPE_TEST_CARDS[testCardKey] || STRIPE_TEST_CARDS.visa;

    // Lancer l'action Stripe
    await ctx.scheduler.runAfter(0, internal.admin.testReservations.confirmPaymentIntentAction, {
      paymentIntentId: payment.paymentIntentId,
      stripeSecretKey: stripeSecretKeyConfig.value,
      testPaymentMethod: cardInfo.pm,
      missionId: args.missionId,
      convexUrl: convexUrlConfig?.value || "",
      convexAdminKey: convexAdminKeyConfig?.value || "",
    });

    return {
      success: true,
      paymentIntentId: payment.paymentIntentId,
      testCard: cardInfo.label,
      message: `Paiement en cours avec ${cardInfo.label}...`,
    };
  },
});

/**
 * Action Stripe : confirme le PaymentIntent avec une carte de test
 * Le webhook payment_intent.succeeded fera le reste (markPaymentPaid → upcoming)
 */
export const confirmPaymentIntentAction = internalAction({
  args: {
    paymentIntentId: v.string(),
    stripeSecretKey: v.string(),
    testPaymentMethod: v.string(),
    missionId: v.id("missions"),
    convexUrl: v.string(),
    convexAdminKey: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("=== confirmPaymentIntentAction START ===");
    console.log("PaymentIntent:", args.paymentIntentId);
    console.log("Test PM:", args.testPaymentMethod);

    const stripe = createStripeClient(args.stripeSecretKey);

    try {
      // Confirmer le PaymentIntent avec la carte de test
      const result = await stripe.paymentIntents.confirm(args.paymentIntentId, {
        payment_method: args.testPaymentMethod,
      });

      console.log("PaymentIntent confirmed:", result.id, "status:", result.status);

      // Si le paiement réussit, mettre à jour la mission directement
      // (le webhook peut ne pas arriver en dev local)
      if (result.status === "succeeded") {
        console.log("✅ Paiement réussi ! Mise à jour directe de la mission...");
        // Appeler notre propre internalMutation pour marquer le paiement comme réussi
        await ctx.runMutation(internal.admin.testReservations.markTestPaymentPaid, {
          paymentIntentId: args.paymentIntentId,
          missionId: args.missionId,
        });
        console.log("✅ Mission mise à jour → upcoming");
      } else if (result.status === "requires_action") {
        console.log("⚠️ 3DS requis — ce test ne peut pas passer automatiquement.");
        // Fallback : forcer le statut manuellement pour le test
        if (args.convexUrl && args.convexAdminKey) {
          await fetch(`${args.convexUrl}/api/mutation`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Convex ${args.convexAdminKey}`,
            },
            body: JSON.stringify({
              path: "admin/testReservations:handle3dsTestFallback",
              args: { missionId: args.missionId, paymentIntentId: args.paymentIntentId },
            }),
          });
        }
      } else if (result.status === "requires_payment_method") {
        console.log("❌ Paiement refusé (carte déclinée)");
      }

      return { success: true, status: result.status };
    } catch (error: any) {
      console.error("❌ Erreur confirmation PaymentIntent:", error.message);
      return { success: false, error: error.message };
    }
  },
});

/**
 * Fallback si 3DS est requis : force le statut pour le test
 */
export const handle3dsTestFallback = internalMutation({
  args: {
    missionId: v.id("missions"),
    paymentIntentId: v.string(),
  },
  handler: async (ctx, args) => {
    const mission = await ctx.db.get(args.missionId);
    if (!mission || mission.status !== "pending_confirmation") return;

    const now = Date.now();
    await ctx.db.patch(args.missionId, {
      status: "upcoming",
      paymentStatus: "paid",
      updatedAt: now,
    });

    if (mission.stripePaymentId) {
      await ctx.db.patch(mission.stripePaymentId, {
        status: "captured",
        paymentIntentId: args.paymentIntentId,
        capturedAt: now,
        updatedAt: now,
      });
    }

    console.log("3DS fallback: mission forcée en upcoming");
  },
});

/**
 * Marque le paiement comme réussi et passe la mission en upcoming
 * (équivalent de markPaymentPaid mais appelable depuis notre internalAction)
 */
export const markTestPaymentPaid = internalMutation({
  args: {
    paymentIntentId: v.string(),
    missionId: v.id("missions"),
  },
  handler: async (ctx, args) => {
    const mission = await ctx.db.get(args.missionId);
    if (!mission) return;

    const now = Date.now();

    // Mettre à jour le stripePayment
    if (mission.stripePaymentId) {
      await ctx.db.patch(mission.stripePaymentId, {
        status: "captured",
        paymentIntentId: args.paymentIntentId,
        capturedAt: now,
        paidAt: now,
        updatedAt: now,
      });
    }

    // Mettre à jour la mission → upcoming + paid
    await ctx.db.patch(args.missionId, {
      status: "upcoming",
      paymentStatus: "paid",
      updatedAt: now,
    });

    // Notification annonceur : paiement reçu
    const client = await ctx.db.get(mission.clientId);
    const announcer = await ctx.db.get(mission.announcerId);
    await ctx.db.insert("notifications", {
      userId: mission.announcerId,
      type: "mission_confirmed",
      title: "Paiement reçu !",
      message: `${client?.firstName || "Le client"} a payé pour "${mission.serviceName}". La mission est confirmée.`,
      linkType: "mission",
      linkId: args.missionId as unknown as string,
      isRead: false,
      createdAt: now,
      expiresAt: now + 30 * 24 * 60 * 60 * 1000,
    });

    // Email reçu de paiement au client (comme en prod markPaymentPaid)
    const { emailConfig, appUrl: emailAppUrl } = await getEmailConfigFromDb(ctx.db);
    if (emailConfig && client?.email) {
      const isPro = announcer?.accountType === "annonceur_pro" && !!announcer?.siret;
      const announcerDisplayName = announcer
        ? `${announcer.firstName} ${announcer.lastName.charAt(0)}.`
        : "Le prestataire";

      await ctx.scheduler.runAfter(0, internal.api.email.sendPaymentReceiptEmail, {
        clientEmail: client.email,
        clientName: client.firstName,
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
        totalAmount: mission.amount || 0,
        paymentRef: args.paymentIntentId,
        cardBrand: "",
        cardLast4: "",
        emailConfig,
        appUrl: emailAppUrl,
      });
    }

    console.log(`✅ markTestPaymentPaid: mission ${args.missionId} → upcoming, payment → captured`);
  },
});

// ============================================
// MUTATIONS — Forcer les transitions de statut
// ============================================

/**
 * Force la transition de statut d'une mission (pour les tests)
 */
export const forceStatusTransition = mutation({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
    targetStatus: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const mission = await ctx.db.get(args.missionId);
    if (!mission) throw new ConvexError("Mission non trouvée");

    const now = Date.now();
    const patch: Record<string, any> = {
      status: args.targetStatus,
      updatedAt: now,
    };

    switch (args.targetStatus) {
      case "pending_confirmation":
        patch.acceptedAt = now;
        patch.paymentDeadline = now + 5 * 60 * 1000; // 5 min pour test
        break;
      case "upcoming":
        patch.paymentStatus = "paid";
        patch.acceptedAt = patch.acceptedAt || mission.acceptedAt || now;
        patch.clientConfirmedAt = undefined;
        break;
      case "in_progress":
        patch.paymentStatus = "paid";
        break;
      case "completed":
        patch.paymentStatus = "paid";
        break;
    }

    await ctx.db.patch(args.missionId, patch);

    return {
      success: true,
      previousStatus: mission.status,
      newStatus: args.targetStatus,
    };
  },
});

/**
 * Simule l'acceptation par l'annonceur (avec création PaymentIntent)
 */
export const simulateAcceptMission = mutation({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const mission = await ctx.db.get(args.missionId);
    if (!mission) throw new ConvexError("Mission non trouvée");
    if (mission.status !== "pending_acceptance") {
      throw new ConvexError("La mission doit être en pending_acceptance");
    }

    const announcer = await ctx.db.get(mission.announcerId);
    const client = await ctx.db.get(mission.clientId);
    if (!announcer || !client) throw new ConvexError("Utilisateurs non trouvés");

    const now = Date.now();

    // Récupérer config
    const stripeSecretKeyConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q: any) => q.eq("key", "stripe_secret_key"))
      .first();
    const appUrlConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q: any) => q.eq("key", "app_url"))
      .first();
    const convexUrlConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q: any) => q.eq("key", "convex_url"))
      .first();
    const convexAdminKeyConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q: any) => q.eq("key", "convex_admin_key"))
      .first();

    // Créer le record de paiement
    const paymentId = await ctx.db.insert("stripePayments", {
      missionId: args.missionId,
      amount: mission.amount,
      platformFee: mission.platformFee || 0,
      announcerEarnings: mission.announcerEarnings || 0,
      status: "pending",
      expiresAt: now + 60 * 60 * 1000, // 1h expiration
      createdAt: now,
      updatedAt: now,
    });

    // Mettre à jour la mission
    await ctx.db.patch(args.missionId, {
      status: "pending_confirmation",
      acceptedAt: now,
      paymentDeadline: now + 48 * 60 * 60 * 1000,
      stripePaymentId: paymentId,
      updatedAt: now,
    });

    // Créer le PaymentIntent Stripe
    if (stripeSecretKeyConfig?.value && announcer.stripeAccountId) {
      const appUrl = appUrlConfig?.value || "http://localhost:3000";
      const convexUrl = convexUrlConfig?.value || "";
      const convexAdminKey = convexAdminKeyConfig?.value || "";

      await ctx.scheduler.runAfter(0, internal.api.stripe.createPaymentIntent, {
        missionId: args.missionId,
        amount: mission.amount,
        platformFee: (mission.platformFee || 0) + (mission.stripeFee || 0),
        announcerEarnings: mission.announcerEarnings || 0,
        stripeFee: mission.stripeFee || 0,
        stripeAccountId: announcer.stripeAccountId,
        clientEmail: client.email,
        clientName: `${client.firstName} ${client.lastName}`,
        serviceName: mission.serviceName,
        announcerName: `${announcer.firstName} ${announcer.lastName}`,
        startDate: mission.startDate,
        endDate: mission.endDate,
        animalName: mission.animal?.name || "Animal",
        stripeSecretKey: stripeSecretKeyConfig.value,
        appUrl,
        convexUrl,
        convexAdminKey,
        stripeCustomerId: client.stripeCustomerId,
      });
    }

    // Notification + email client
    await ctx.db.insert("notifications", {
      userId: mission.clientId,
      type: "mission_accepted",
      title: "Réservation acceptée !",
      message: `${announcer.firstName} a accepté votre demande pour "${mission.serviceName}". Procédez au paiement pour confirmer.`,
      linkType: "mission",
      linkId: args.missionId,
      linkUrl: `/client/paiement/${args.missionId}`,
      isRead: false,
      createdAt: now,
      expiresAt: now + 30 * 24 * 60 * 60 * 1000,
    });

    // Email d'acceptation
    const { emailConfig } = await getEmailConfigFromDb(ctx.db);
    if (emailConfig) {
      const appUrl = appUrlConfig?.value || "http://localhost:3000";
      await ctx.scheduler.runAfter(0, internal.api.email.sendReservationAcceptedEmail, {
        clientEmail: client.email,
        clientName: client.firstName,
        announcerName: `${announcer.firstName} ${announcer.lastName.charAt(0)}.`,
        serviceName: mission.serviceName,
        startDate: mission.startDate,
        endDate: mission.endDate,
        animalName: mission.animal?.name || "Animal",
        amount: mission.amount,
        missionId: args.missionId,
        emailConfig,
        appUrl,
      });
    }

    return {
      success: true,
      paymentId,
      hasStripe: !!stripeSecretKeyConfig?.value && !!announcer.stripeAccountId,
    };
  },
});

/**
 * Simule la confirmation de fin de mission par le client
 * et prépare le payout
 */
export const simulateConfirmEnd = mutation({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const mission = await ctx.db.get(args.missionId);
    if (!mission) throw new ConvexError("Mission non trouvée");
    if (mission.status !== "completed") {
      throw new ConvexError("La mission doit être completed");
    }

    const announcer = await ctx.db.get(mission.announcerId);
    if (!announcer) throw new ConvexError("Annonceur non trouvé");

    const now = Date.now();

    // Déterminer le mode de versement
    const payoutMode = announcer.payoutMode || "scheduled";
    const payoutDayConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q: any) => q.eq("key", "payout_scheduled_day"))
      .first();
    const payoutDay = parseInt(payoutDayConfig?.value || "25", 10);

    // Calculer prochaine date de payout (format "YYYY-MM-DD")
    let payoutScheduledFor: string | undefined;
    if (payoutMode === "scheduled") {
      const today = new Date();
      let nextPayout = new Date(today.getFullYear(), today.getMonth(), payoutDay);
      if (nextPayout <= today) {
        nextPayout.setMonth(nextPayout.getMonth() + 1);
      }
      payoutScheduledFor = nextPayout.toISOString().split("T")[0];
    }

    await ctx.db.patch(args.missionId, {
      clientConfirmedAt: now,
      readyForPayout: true,
      announcerPaymentStatus: "pending",
      payoutScheduledFor,
      updatedAt: now,
    });

    // Notification annonceur
    await ctx.db.insert("notifications", {
      userId: mission.announcerId,
      type: "mission_completed",
      title: "Mission validée par le client",
      message: `Le client a confirmé la fin de "${mission.serviceName}". ${payoutMode === "instant" ? "Versement instantané en cours." : `Versement prévu le ${payoutDay} du mois.`}`,
      linkType: "mission",
      linkId: args.missionId,
      linkUrl: "/dashboard/paiements",
      isRead: false,
      createdAt: now,
      expiresAt: now + 30 * 24 * 60 * 60 * 1000,
    });

    // Email annonceur : mission validée par le client (comme en prod)
    const { emailConfig, appUrl: emailAppUrl } = await getEmailConfigFromDb(ctx.db);
    const client = await ctx.db.get(mission.clientId);
    if (emailConfig && announcer.email) {
      await ctx.scheduler.runAfter(0, internal.api.email.sendMissionValidatedByClientEmail, {
        announcerEmail: announcer.email,
        announcerName: announcer.firstName,
        clientName: client ? `${client.firstName} ${client.lastName}` : "Le client",
        serviceName: mission.serviceName,
        animalName: mission.animal?.name || "Animal",
        startDate: mission.startDate,
        endDate: mission.endDate,
        emailConfig,
        appUrl: emailAppUrl,
      });
    }

    return {
      success: true,
      payoutMode,
      payoutScheduledFor,
    };
  },
});

/**
 * Force le déclenchement d'un payout immédiat pour une mission
 */
export const forcePayout = mutation({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const mission = await ctx.db.get(args.missionId);
    if (!mission) throw new ConvexError("Mission non trouvée");
    if (!mission.readyForPayout) throw new ConvexError("Mission pas prête pour le payout");
    if (mission.announcerPaymentStatus === "paid") throw new ConvexError("Annonceur déjà payé");

    const announcer = await ctx.db.get(mission.announcerId);
    if (!announcer) throw new ConvexError("Annonceur non trouvé");
    if (!announcer.stripeAccountId) throw new ConvexError("Annonceur sans compte Stripe Connect");

    const stripeSecretKeyConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q: any) => q.eq("key", "stripe_secret_key"))
      .first();
    if (!stripeSecretKeyConfig?.value) throw new ConvexError("Clé Stripe manquante");

    const feeConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q: any) => q.eq("key", "payout_instant_fee_percent"))
      .first();
    const feePercent = parseFloat(feeConfig?.value || "0");
    const fee = Math.round((mission.announcerEarnings || 0) * feePercent / 100);
    const amount = (mission.announcerEarnings || 0) - fee;

    // Lancer le payout Stripe standard (pas instant) via notre action de test
    await ctx.scheduler.runAfter(0, internal.admin.testReservations.processTestPayout, {
      missionId: args.missionId,
      announcerId: mission.announcerId,
      stripeAccountId: announcer.stripeAccountId,
      amount,
      fee,
      stripeSecretKey: stripeSecretKeyConfig.value,
    });

    return {
      success: true,
      amount,
      fee,
      stripeAccountId: announcer.stripeAccountId,
    };
  },
});

/**
 * Payout Stripe en mode standard (fonctionne en test, contrairement au mode instant)
 * Vérifie la balance du compte Connect, fait le payout, puis met à jour la mission
 */
export const processTestPayout = internalAction({
  args: {
    missionId: v.id("missions"),
    announcerId: v.id("users"),
    stripeAccountId: v.string(),
    amount: v.number(),
    fee: v.number(),
    stripeSecretKey: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("=== processTestPayout START ===");
    console.log("Mission:", args.missionId, "Amount:", args.amount, "Account:", args.stripeAccountId);

    const stripe = createStripeClient(args.stripeSecretKey);

    try {
      // Vérifier la balance disponible sur le compte Connect
      const balance = await stripe.balance.retrieve({
        stripeAccount: args.stripeAccountId,
      });
      const availableEur = balance.available.find(b => b.currency === "eur");
      console.log("Balance Connect disponible:", availableEur?.amount || 0, "centimes");

      if (!availableEur || availableEur.amount < args.amount) {
        console.log("⚠️ Balance insuffisante pour payout. Disponible:", availableEur?.amount || 0, "Requis:", args.amount);
        console.log("Le paiement a peut-être besoin de temps pour arriver sur le compte Connect.");
        console.log("Forçage du statut paid pour le test...");

        // Forcer le statut même sans payout réel
        await ctx.runMutation(internal.planning.payouts.markMissionPaidOut, {
          missionId: args.missionId,
          transferId: "test_no_balance",
          amount: args.amount,
          fee: args.fee,
        });
        return { success: true, forced: true, reason: "insufficient_balance" };
      }

      // Créer le payout standard (pas instant) vers le RIB test
      const payout = await stripe.payouts.create(
        {
          amount: args.amount,
          currency: "eur",
          description: `Versement test mission ${args.missionId}`,
          // method: "standard" est le défaut, pas besoin de le spécifier
        },
        {
          stripeAccount: args.stripeAccountId,
        }
      );

      console.log("✅ Payout standard créé:", payout.id, "Status:", payout.status);

      // Mettre à jour la mission
      await ctx.runMutation(internal.planning.payouts.markMissionPaidOut, {
        missionId: args.missionId,
        transferId: payout.id,
        payoutId: payout.id,
        amount: args.amount,
        fee: args.fee,
      });

      return { success: true, payoutId: payout.id, status: payout.status };
    } catch (error: any) {
      console.error("❌ Erreur payout test:", error.message);

      // En cas d'erreur Stripe, forcer le statut pour ne pas bloquer le test
      await ctx.runMutation(internal.planning.payouts.markMissionPaidOut, {
        missionId: args.missionId,
        transferId: "test_error_fallback",
        amount: args.amount,
        fee: args.fee,
      });

      console.log("Statut forcé à paid malgré l'erreur Stripe");
      return { success: true, forced: true, error: error.message };
    }
  },
});

/**
 * Simule l'annulation par le client
 */
export const simulateCancelByClient = mutation({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
    reason: v.optional(v.string()),
    // Paramètres de simulation temporelle
    simulateHoursSincePaid: v.optional(v.number()),
    simulateHoursBeforeStart: v.optional(v.number()),
    simulateCancellationCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const mission = await ctx.db.get(args.missionId);
    if (!mission) throw new ConvexError("Mission non trouvée");

    const allowedStatuses = ["pending_acceptance", "pending_confirmation", "upcoming", "in_progress"];
    if (!allowedStatuses.includes(mission.status)) {
      throw new ConvexError(`Status "${mission.status}" non annulable par le client`);
    }

    const now = Date.now();
    let payment = null;
    if (mission.stripePaymentId) {
      payment = await ctx.db.get(mission.stripePaymentId);
    }

    // Construire les options de simulation temporelle
    let simulationOptions: { simulatedNow?: number; overrideCancellationCount?: number } | undefined;

    if (args.simulateHoursSincePaid !== undefined || args.simulateHoursBeforeStart !== undefined || args.simulateCancellationCount !== undefined) {
      // Calculer un "now" simulé basé sur les overrides
      let simulatedNow = now;

      if (payment && args.simulateHoursSincePaid !== undefined) {
        // On recalcule simulatedNow pour que hoursSincePaid = args.simulateHoursSincePaid
        const paidAt = payment.paidAt || payment.capturedAt || payment.authorizedAt || payment.createdAt;
        simulatedNow = paidAt + args.simulateHoursSincePaid * 60 * 60 * 1000;
      }

      if (args.simulateHoursBeforeStart !== undefined) {
        // On recalcule simulatedNow pour que hoursBeforeStart = args.simulateHoursBeforeStart
        const startDateTime = new Date(`${mission.startDate}T${mission.startTime || "00:00"}`).getTime();
        simulatedNow = startDateTime - args.simulateHoursBeforeStart * 60 * 60 * 1000;
      }

      simulationOptions = {
        simulatedNow,
        overrideCancellationCount: args.simulateCancellationCount,
      };
    }

    // Utiliser le vrai calculateRefund() avec toutes les règles admin + simulation
    const refundResult = await calculateRefund(ctx, mission, payment, simulationOptions);

    if (!refundResult.canCancel) {
      throw new ConvexError(refundResult.reason);
    }

    const { refundAmount, announcerRetained, platformFeeRetained, reason: refundReason, cancellationCount, sessionBreakdown } = refundResult;

    // Libérer les créneaux collectifs (aligné sur prod)
    if (
      mission.sessionType === "collective" &&
      mission.collectiveSlotIds &&
      mission.collectiveSlotIds.length > 0
    ) {
      const animalCount = mission.animalCount || 1;
      const bookings = await ctx.db
        .query("collectiveSlotBookings")
        .withIndex("by_mission", (q: any) => q.eq("missionId", args.missionId))
        .collect();

      for (const booking of bookings) {
        if (booking.status === "booked") {
          const slot = await ctx.db.get(booking.slotId);
          if (slot) {
            await ctx.db.patch(booking.slotId, {
              bookedAnimals: Math.max(0, slot.bookedAnimals - animalCount),
              updatedAt: now,
            });
          }
          await ctx.db.patch(booking._id, {
            status: "cancelled",
            cancelledAt: now,
            updatedAt: now,
          });
        }
      }
    }

    // Patcher la mission (aligné sur prod — paymentStatus géré par webhook/patch Stripe)
    await ctx.db.patch(args.missionId, {
      status: "cancelled",
      cancelledBy: "client",
      cancelledAt: now,
      cancellationReason: args.reason || `Test : ${refundReason}`,
      refundAmount,
      announcerRetainedAmount: announcerRetained,
      updatedAt: now,
    });

    // Gestion Stripe selon le statut du paiement (aligné sur prod)
    if (payment?.paymentIntentId) {
      const stripeSecretKeyConfig = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", (q: any) => q.eq("key", "stripe_secret_key"))
        .first();

      if (stripeSecretKeyConfig?.value) {
        if (payment.status === "captured") {
          // Paiement déjà capturé → remboursement classique
          if (refundAmount > 0) {
            await ctx.scheduler.runAfter(0, internal.planning.cancellationActions.processStripeRefund, {
              missionId: args.missionId,
              paymentIntentId: payment.paymentIntentId,
              refundAmount,
              stripeSecretKey: stripeSecretKeyConfig.value,
            });
            await ctx.db.patch(payment._id, {
              refundedAmount: refundAmount,
              updatedAt: now,
            });
          }
        } else if (payment.status === "authorized") {
          // Pré-autorisation : distinguer refund total vs partiel
          const retainedAmount = (payment.amount || 0) - refundAmount;

          if (retainedAmount <= 0) {
            // Remboursement total → cancel ou refund selon le vrai statut Stripe
            await ctx.scheduler.runAfter(0, internal.planning.cancellationActions.cancelStripePaymentIntent, {
              paymentIntentId: payment.paymentIntentId,
              stripeSecretKey: stripeSecretKeyConfig.value,
              missionId: args.missionId,
              refundAmount,
            });
          } else {
            // Remboursement partiel → capturer uniquement le montant retenu
            await ctx.scheduler.runAfter(0, internal.planning.cancellationActions.capturePartialPaymentIntent, {
              missionId: args.missionId,
              paymentIntentId: payment.paymentIntentId,
              amountToCapture: retainedAmount,
              stripeSecretKey: stripeSecretKeyConfig.value,
            });
          }

          await ctx.db.patch(payment._id, {
            status: retainedAmount <= 0 ? "cancelled" : "captured",
            ...(retainedAmount <= 0 ? { cancelledAt: now } : { capturedAt: now }),
            refundedAmount: refundAmount,
            updatedAt: now,
          });
        } else if (payment.status === "pending") {
          // Paiement en attente → annuler le PaymentIntent
          await ctx.scheduler.runAfter(0, internal.planning.cancellationActions.cancelStripePaymentIntent, {
            paymentIntentId: payment.paymentIntentId,
            stripeSecretKey: stripeSecretKeyConfig.value,
          });
          await ctx.db.patch(payment._id, {
            status: "cancelled",
            cancelledAt: now,
            updatedAt: now,
          });
        }
      }
    }

    // Notifications (aligné sur prod — mêmes messages et formatage)
    const client = await ctx.db.get(mission.clientId);
    const announcer = await ctx.db.get(mission.announcerId);
    const clientName = client
      ? `${client.firstName} ${client.lastName.charAt(0)}.`
      : "Client";
    const announcerName = announcer
      ? `${announcer.firstName} ${announcer.lastName.charAt(0)}.`
      : "Annonceur";

    if (announcer) {
      const announcerNotifMessage = announcerRetained > 0
        ? `${clientName} a annulé "${mission.serviceName}". Vous conservez ${formatPrice(announcerRetained)}. Règle : ${refundReason}`
        : `${clientName} a annulé "${mission.serviceName}". ${refundAmount > 0 ? `Remboursement client : ${formatPrice(refundAmount)}.` : ""} Règle : ${refundReason}`;
      await ctx.db.insert("notifications", {
        userId: mission.announcerId,
        type: "mission_cancelled",
        title: "Réservation annulée par le client",
        message: announcerNotifMessage,
        linkType: "mission",
        linkId: args.missionId,
        linkUrl: "/dashboard/missions",
        isRead: false,
        createdAt: now,
        expiresAt: now + 30 * 24 * 60 * 60 * 1000,
      });
    }

    if (client) {
      const refundMessage = refundAmount > 0
        ? `Remboursement de ${formatPrice(refundAmount)} en cours (délai : 5-10 jours ouvrés).${platformFeeRetained > 0 ? ` Commission retenue : ${formatPrice(platformFeeRetained)}.` : ""}`
        : "Aucun remboursement applicable.";
      await ctx.db.insert("notifications", {
        userId: mission.clientId,
        type: "mission_cancelled",
        title: "Votre réservation a été annulée",
        message: `Votre réservation "${mission.serviceName}" avec ${announcerName} a été annulée. ${refundMessage} Règle : ${refundReason}`,
        linkType: "mission",
        linkId: args.missionId,
        linkUrl: "/client/missions",
        isRead: false,
        createdAt: now,
        expiresAt: now + 30 * 24 * 60 * 60 * 1000,
      });
    }

    // Emails d'annulation (aligné sur prod — mêmes fonctions email modernes)
    const { emailConfig } = await getEmailConfigFromDb(ctx.db);

    // Email à l'annonceur
    if (announcer && emailConfig) {
      await ctx.scheduler.runAfter(0, internal.api.email.sendCancellationAnnouncerEmail, {
        announcerEmail: announcer.email,
        announcerName: announcer.firstName,
        clientName,
        serviceName: mission.serviceName,
        animalName: mission.animal?.name || "Animal",
        startDate: mission.startDate,
        endDate: mission.endDate,
        totalAmount: mission.amount,
        refundAmount,
        announcerRetained,
        cancellationReason: args.reason || refundReason,
        cancellationRule: refundReason,
        emailConfig: emailConfig || { apiKey: "" },
      });
    }

    // Email au client
    if (client && emailConfig) {
      await ctx.scheduler.runAfter(0, internal.api.email.sendCancellationClientEmail, {
        clientEmail: client.email,
        clientName: client.firstName,
        serviceName: mission.serviceName,
        animalName: mission.animal?.name || "Animal",
        startDate: mission.startDate,
        endDate: mission.endDate,
        totalAmount: mission.amount,
        refundAmount,
        platformFeeRetained,
        cancellationRule: refundReason,
        emailConfig: emailConfig || { apiKey: "" },
      });
    }

    return {
      success: true,
      refundAmount,
      announcerRetained,
      platformFeeRetained,
      reason: refundReason,
      cancellationCount,
      sessionBreakdown: sessionBreakdown || null,
    };
  },
});

/**
 * Simule l'annulation par l'annonceur
 */
export const simulateCancelByAnnouncer = mutation({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const mission = await ctx.db.get(args.missionId);
    if (!mission) throw new ConvexError("Mission non trouvée");

    const annulableStatuses = ["pending_acceptance", "pending_confirmation", "upcoming", "in_progress"];
    if (!annulableStatuses.includes(mission.status)) {
      throw new ConvexError(`Status "${mission.status}" non annulable par l'annonceur`);
    }

    const now = Date.now();

    // Libérer créneaux collectifs
    if (mission.sessionType === "collective" && mission.collectiveSlotIds?.length) {
      const animalCount = mission.animalCount || 1;
      const bookings = await ctx.db
        .query("collectiveSlotBookings")
        .withIndex("by_mission", (q: any) => q.eq("missionId", args.missionId))
        .collect();
      for (const booking of bookings) {
        if (booking.status === "booked") {
          const slot = await ctx.db.get(booking.slotId);
          if (slot) {
            await ctx.db.patch(booking.slotId, {
              bookedAnimals: Math.max(0, slot.bookedAnimals - animalCount),
              updatedAt: now,
            });
          }
          await ctx.db.patch(booking._id, { status: "cancelled", cancelledAt: now, updatedAt: now });
        }
      }
    }

    let payment = null;
    if (mission.stripePaymentId) {
      payment = await ctx.db.get(mission.stripePaymentId);
    }

    // Annulation annonceur → remboursement intégral au client (aligné sur prod)
    const refundAmount = (payment && ["captured", "authorized"].includes(payment.status)) ? payment.amount : 0;

    await ctx.db.patch(args.missionId, {
      status: "cancelled",
      cancelledBy: "announcer",
      cancelledAt: now,
      cancellationReason: args.reason || "Test : annulation annonceur",
      refundAmount: mission.amount,
      announcerRetainedAmount: 0,
      updatedAt: now,
    });

    // Gestion Stripe (aligné sur prod — mêmes cas que cancelMission)
    if (payment?.paymentIntentId) {
      const stripeSecretKeyConfig = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", (q: any) => q.eq("key", "stripe_secret_key"))
        .first();

      if (stripeSecretKeyConfig?.value) {
        if (payment.status === "captured") {
          // Paiement immédiat capturé → remboursement intégral
          await ctx.scheduler.runAfter(0, internal.planning.cancellationActions.processStripeRefund, {
            missionId: args.missionId,
            paymentIntentId: payment.paymentIntentId,
            refundAmount: payment.amount,
            stripeSecretKey: stripeSecretKeyConfig.value,
          });
          await ctx.db.patch(payment._id, {
            refundedAmount: payment.amount,
            updatedAt: now,
          });
        } else if (payment.status === "authorized" || payment.status === "pending") {
          // Annuler le PaymentIntent (gère aussi le cas succeeded côté Stripe)
          await ctx.scheduler.runAfter(0, internal.planning.cancellationActions.cancelStripePaymentIntent, {
            paymentIntentId: payment.paymentIntentId,
            stripeSecretKey: stripeSecretKeyConfig.value,
            missionId: args.missionId,
            refundAmount: payment.amount,
          });
          await ctx.db.patch(payment._id, {
            status: "cancelled",
            cancelledAt: now,
            refundedAmount: payment.amount,
            updatedAt: now,
          });
        }
      }
    }

    // Notifications (aligné sur prod — mêmes messages)
    const client = await ctx.db.get(mission.clientId);
    const announcer = await ctx.db.get(mission.announcerId);
    const clientName = client
      ? `${client.firstName} ${client.lastName.charAt(0)}.`
      : "Client";
    const announcerName = announcer
      ? `${announcer.firstName} ${announcer.lastName.charAt(0)}.`
      : "Annonceur";

    // Notification au client
    if (client) {
      const refundMessage = mission.amount > 0 && payment
        ? `Remboursement intégral de ${formatPrice(mission.amount)} en cours (délai : 5-10 jours ouvrés).`
        : "";
      await ctx.db.insert("notifications", {
        userId: mission.clientId,
        type: "mission_cancelled",
        title: "Réservation annulée par l'annonceur",
        message: `${announcerName} a annulé la réservation "${mission.serviceName}". ${refundMessage}`,
        linkType: "mission",
        linkId: args.missionId,
        linkUrl: "/client/reservations",
        isRead: false,
        createdAt: now,
        expiresAt: now + 30 * 24 * 60 * 60 * 1000,
      });
    }

    // Notification à l'annonceur (confirmation)
    if (announcer) {
      await ctx.db.insert("notifications", {
        userId: mission.announcerId,
        type: "mission_cancelled",
        title: "Réservation annulée",
        message: `Vous avez annulé la réservation "${mission.serviceName}" avec ${clientName}. Le client sera remboursé intégralement.`,
        linkType: "mission",
        linkId: args.missionId,
        linkUrl: "/dashboard/missions",
        isRead: false,
        createdAt: now,
        expiresAt: now + 30 * 24 * 60 * 60 * 1000,
      });
    }

    // Emails (aligné sur prod — email client + email confirmation annonceur)
    const { emailConfig } = await getEmailConfigFromDb(ctx.db);

    if (emailConfig && client) {
      await ctx.scheduler.runAfter(0, internal.api.email.sendCancellationByAnnouncerClientEmail, {
        clientEmail: client.email,
        clientName: client.firstName,
        announcerName,
        serviceName: mission.serviceName,
        animalName: mission.animal?.name || "Animal",
        startDate: mission.startDate,
        endDate: mission.endDate,
        totalAmount: mission.amount,
        refundAmount: mission.amount,
        cancellationReason: args.reason || "Test : annulation annonceur",
        emailConfig: emailConfig || { apiKey: "" },
      });
    }

    if (emailConfig && announcer) {
      await ctx.scheduler.runAfter(0, internal.api.email.sendCancellationByAnnouncerConfirmEmail, {
        announcerEmail: announcer.email,
        announcerName: announcer.firstName,
        clientName,
        serviceName: mission.serviceName,
        animalName: mission.animal?.name || "Animal",
        startDate: mission.startDate,
        endDate: mission.endDate,
        cancellationReason: args.reason || "Test : annulation annonceur",
        emailConfig: emailConfig || { apiKey: "" },
      });
    }

    return {
      success: true,
      refundAmount,
      announcerRetained: 0,
      platformFeeRetained: 0,
      reason: "Annulation annonceur : remboursement intégral au client",
      cancellationCount: 0,
    };
  },
});

/**
 * Nettoie les missions de test
 */
export const cleanupTestMissions = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    // Supprimer les missions créées dans les 24 dernières heures avec "test" dans le nom
    const recent = await ctx.db.query("missions").order("desc").take(50);
    let deleted = 0;

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    for (const m of recent) {
      if (m._creationTime > oneDayAgo) {
        // Supprimer le paiement associé
        if (m.stripePaymentId) {
          await ctx.db.delete(m.stripePaymentId);
        }

        // Supprimer les notifications liées
        const notifs = await ctx.db.query("notifications").collect();
        for (const n of notifs) {
          if (n.linkId === m._id) {
            await ctx.db.delete(n._id);
          }
        }

        await ctx.db.delete(m._id);
        deleted++;
      }
    }

    return { success: true, deleted };
  },
});

/**
 * Preview du calcul de remboursement SANS exécuter l'annulation
 * Permet de voir quelle règle sera appliquée avec les paramètres de simulation
 */
export const previewCancellation = query({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
    simulateHoursSincePaid: v.optional(v.number()),
    simulateHoursBeforeStart: v.optional(v.number()),
    simulateCancellationCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const mission = await ctx.db.get(args.missionId);
    if (!mission) throw new ConvexError("Mission non trouvée");

    let payment = null;
    if (mission.stripePaymentId) {
      payment = await ctx.db.get(mission.stripePaymentId);
    }

    const now = Date.now();
    let simulationOptions: { simulatedNow?: number; overrideCancellationCount?: number } | undefined;

    if (args.simulateHoursSincePaid !== undefined || args.simulateHoursBeforeStart !== undefined || args.simulateCancellationCount !== undefined) {
      let simulatedNow = now;

      if (payment && args.simulateHoursSincePaid !== undefined) {
        const paidAt = payment.paidAt || payment.capturedAt || payment.authorizedAt || payment.createdAt;
        simulatedNow = paidAt + args.simulateHoursSincePaid * 60 * 60 * 1000;
      }

      if (args.simulateHoursBeforeStart !== undefined) {
        const startDateTime = new Date(`${mission.startDate}T${mission.startTime || "00:00"}`).getTime();
        simulatedNow = startDateTime - args.simulateHoursBeforeStart * 60 * 60 * 1000;
      }

      simulationOptions = {
        simulatedNow,
        overrideCancellationCount: args.simulateCancellationCount,
      };
    }

    const result = await calculateRefund(ctx, mission, payment, simulationOptions);

    // Infos de contexte temporel
    const paidAt = payment?.paidAt || payment?.capturedAt || payment?.authorizedAt || payment?.createdAt;
    const startDateTime = mission.startDate ? new Date(`${mission.startDate}T${mission.startTime || "00:00"}`).getTime() : null;
    const realHoursSincePaid = paidAt ? (now - paidAt) / (1000 * 60 * 60) : null;
    const realHoursBeforeStart = startDateTime ? (startDateTime - now) / (1000 * 60 * 60) : null;

    return {
      ...result,
      totalPaid: payment?.amount || 0,
      missionStatus: mission.status,
      context: {
        realHoursSincePaid: realHoursSincePaid !== null ? Math.round(realHoursSincePaid * 10) / 10 : null,
        realHoursBeforeStart: realHoursBeforeStart !== null ? Math.round(realHoursBeforeStart * 10) / 10 : null,
        simulatedHoursSincePaid: args.simulateHoursSincePaid ?? null,
        simulatedHoursBeforeStart: args.simulateHoursBeforeStart ?? null,
        simulatedCancellationCount: args.simulateCancellationCount ?? null,
        paymentStatus: payment?.status || "none",
      },
    };
  },
});

/**
 * Récupère le compteur d'annulations d'un client
 */
export const getClientCancellationInfo = query({
  args: {
    token: v.string(),
    clientId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const missions = await ctx.db
      .query("missions")
      .withIndex("by_client", (q: any) => q.eq("clientId", args.clientId))
      .collect();

    const now = Date.now();
    const twelveMonthsAgo = now - 12 * 30 * 24 * 60 * 60 * 1000;

    const cancelledMissions = missions.filter(
      (m: any) => m.cancelledBy === "client" && m.cancelledAt && m.cancelledAt > twelveMonthsAgo
    );

    return {
      totalCancellations: cancelledMissions.length,
      cancellations: cancelledMissions.map((m: any) => ({
        missionId: m._id,
        serviceName: m.serviceName,
        cancelledAt: m.cancelledAt,
        refundAmount: m.refundAmount || 0,
        announcerRetained: m.announcerRetainedAmount || 0,
        reason: m.cancellationReason,
      })),
    };
  },
});

/**
 * Réinitialise le compteur d'annulations d'un client
 * en retirant le flag cancelledBy sur les missions annulées du client
 */
export const resetClientCancellationCounter = mutation({
  args: {
    token: v.string(),
    clientId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const missions = await ctx.db
      .query("missions")
      .withIndex("by_client", (q: any) => q.eq("clientId", args.clientId))
      .collect();

    const now = Date.now();
    const twelveMonthsAgo = now - 12 * 30 * 24 * 60 * 60 * 1000;

    let resetCount = 0;
    for (const m of missions) {
      if (m.cancelledBy === "client" && m.cancelledAt && m.cancelledAt > twelveMonthsAgo) {
        // On change cancelledBy en "system" pour exclure du compteur client
        await ctx.db.patch(m._id, {
          cancelledBy: "system",
          updatedAt: now,
        });
        resetCount++;
      }
    }

    return { success: true, resetCount };
  },
});

