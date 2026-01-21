import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

// Query interne pour récupérer les configs email
export const getEmailConfigs = internalQuery({
  args: {},
  handler: async (ctx) => {
    const apiKeyConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "resend_api_key"))
      .first();

    const fromEmailConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "resend_from_email"))
      .first();

    const fromNameConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "resend_from_name"))
      .first();

    return {
      apiKey: apiKeyConfig?.value || null,
      fromEmail: fromEmailConfig?.value || null,
      fromName: fromNameConfig?.value || null,
    };
  },
});

// Query interne pour récupérer un template email
export const getEmailTemplate = internalQuery({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const template = await ctx.db
      .query("emailTemplates")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    return template;
  },
});

// Mutation interne pour enregistrer les logs d'emails
export const logEmail = internalMutation({
  args: {
    to: v.string(),
    from: v.string(),
    subject: v.string(),
    template: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed"), v.literal("pending")),
    resendId: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("emailLogs", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// Query interne pour récupérer un utilisateur par email
export const getUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

// Mutation interne pour créer un token de vérification
export const createVerificationToken = internalMutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
    context: v.optional(v.union(v.literal("registration"), v.literal("reservation"))),
    pendingBookingId: v.optional(v.id("pendingBookings")),
  },
  handler: async (ctx, args) => {
    // Supprimer les anciens tokens pour cet utilisateur
    const oldTokens = await ctx.db
      .query("emailVerificationTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const token of oldTokens) {
      await ctx.db.delete(token._id);
    }

    // Générer un nouveau token (64 chars hex)
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Créer le token (expire dans 24h)
    await ctx.db.insert("emailVerificationTokens", {
      userId: args.userId,
      token,
      email: args.email,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      createdAt: Date.now(),
      context: args.context || "registration",
      pendingBookingId: args.pendingBookingId,
    });

    return token;
  },
});

// Query interne pour récupérer les détails d'une pending booking
export const getPendingBookingDetails = internalQuery({
  args: { pendingBookingId: v.id("pendingBookings") },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.pendingBookingId);
    if (!booking) return null;

    // Récupérer les infos de l'annonceur
    const announcer = await ctx.db.get(booking.announcerId);

    // Récupérer le service
    const service = await ctx.db.get(booking.serviceId);

    // Récupérer la variante
    let variant = null;
    if (booking.variantId) {
      variant = await ctx.db.get(booking.variantId as Id<"serviceVariants">);
    }

    return {
      booking,
      announcer: announcer ? {
        firstName: announcer.firstName,
        lastName: announcer.lastName,
        email: announcer.email,
      } : null,
      service: service ? {
        category: service.category,
        name: service.name,
      } : null,
      variant,
    };
  },
});

// Mutation interne pour valider le token et gérer la réservation
export const verifyEmailToken = internalMutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const tokenDoc = await ctx.db
      .query("emailVerificationTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!tokenDoc) {
      return { success: false, error: "Token invalide" };
    }

    if (tokenDoc.expiresAt < Date.now()) {
      return { success: false, error: "Le lien a expiré. Veuillez demander un nouveau lien." };
    }

    if (tokenDoc.usedAt) {
      return { success: false, error: "Ce lien a déjà été utilisé" };
    }

    // Récupérer l'utilisateur
    const user = await ctx.db.get(tokenDoc.userId);
    if (!user) {
      return { success: false, error: "Utilisateur non trouvé" };
    }

    // Marquer l'email comme vérifié ET activer le compte
    await ctx.db.patch(tokenDoc.userId, {
      emailVerified: true,
      isActive: true,
      updatedAt: Date.now(),
    });

    // Marquer le token comme utilisé
    await ctx.db.patch(tokenDoc._id, {
      usedAt: Date.now(),
    });

    // Si c'est une réservation, convertir la pending booking en mission
    let reservationData = null;
    if (tokenDoc.context === "reservation" && tokenDoc.pendingBookingId) {
      const pendingBooking = await ctx.db.get(tokenDoc.pendingBookingId);

      if (pendingBooking && pendingBooking.status === "awaiting_email_verification") {
        // Récupérer les infos nécessaires
        const announcer = await ctx.db.get(pendingBooking.announcerId);
        const service = await ctx.db.get(pendingBooking.serviceId);

        let serviceName = "Service";
        let serviceCategory = "";
        if (service) {
          serviceName = service.name || service.category;
          serviceCategory = service.category;
        }

        // Récupérer l'animal créé pour cet utilisateur
        // L'animal a été créé dans finalizeBookingAsGuest avec toutes ses données
        const userAnimal = await ctx.db
          .query("animals")
          .withIndex("by_user", (q) => q.eq("userId", tokenDoc.userId))
          .filter((q) => q.eq(q.field("name"), pendingBooking.clientData?.animalName || ""))
          .first();

        // Calculer la commission
        // serviceAmount = pendingBooking.calculatedAmount (prix du service, ce que l'annonceur reçoit)
        const serviceAmount = pendingBooking.calculatedAmount;

        // Déterminer le type de commission basé sur le type d'annonceur
        let commissionType: "particulier" | "micro_entrepreneur" | "professionnel" = "particulier";
        if (announcer?.accountType === "annonceur_pro") {
          if (announcer.companyType === "micro_enterprise") {
            commissionType = "micro_entrepreneur";
          } else {
            commissionType = "professionnel";
          }
        }

        // Récupérer le taux de commission depuis la config
        const commissionConfig = await ctx.db
          .query("systemConfig")
          .withIndex("by_key", (q) => q.eq("key", `commission_${commissionType}`))
          .first();

        // Taux par défaut si non configuré
        const defaultRates = { particulier: 15, micro_entrepreneur: 12, professionnel: 10 };
        const commissionRate = commissionConfig
          ? parseFloat(commissionConfig.value)
          : defaultRates[commissionType];

        // Calculer les montants
        // platformFee = commission (ce que la plateforme garde)
        // announcerEarnings = serviceAmount (ce que l'annonceur reçoit)
        // totalAmount = serviceAmount + platformFee (ce que le client paie)
        const platformFee = Math.round((serviceAmount * commissionRate) / 100);
        const announcerEarnings = serviceAmount;
        const totalAmount = serviceAmount + platformFee;

        // Créer la mission
        const missionId = await ctx.db.insert("missions", {
          announcerId: pendingBooking.announcerId,
          clientId: tokenDoc.userId,
          serviceId: pendingBooking.serviceId,
          clientName: `${pendingBooking.clientData?.firstName || user.firstName} ${pendingBooking.clientData?.lastName || user.lastName}`,
          clientPhone: pendingBooking.clientData?.phone || user.phone,
          animalId: userAnimal?._id,
          animal: {
            name: pendingBooking.clientData?.animalName || "Animal",
            type: pendingBooking.clientData?.animalType || "autre",
            emoji: getAnimalEmoji(pendingBooking.clientData?.animalType || "autre"),
          },
          serviceName,
          serviceCategory,
          startDate: pendingBooking.startDate,
          endDate: pendingBooking.endDate,
          startTime: pendingBooking.startTime,
          endTime: pendingBooking.endTime,
          status: "pending_acceptance", // En attente d'acceptation par l'annonceur
          amount: totalAmount, // Montant total que le client paie (service + commission)
          platformFee, // Commission de la plateforme
          announcerEarnings, // Ce que l'annonceur reçoit (prix du service)
          paymentStatus: "not_due",
          location: pendingBooking.location || "",
          clientNotes: pendingBooking.clientData?.notes,
          // Garde de nuit
          includeOvernightStay: pendingBooking.includeOvernightStay,
          overnightNights: pendingBooking.overnightNights,
          overnightAmount: pendingBooking.overnightAmount,
          dayStartTime: service?.dayStartTime,
          dayEndTime: service?.dayEndTime,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Mettre à jour la pending booking
        await ctx.db.patch(pendingBooking._id, {
          status: "completed",
        });

        // Envoyer l'email de notification à l'annonceur
        if (announcer) {
          // Récupérer la config email depuis la DB
          const apiKeyConfig = await ctx.db
            .query("systemConfig")
            .withIndex("by_key", (q) => q.eq("key", "resend_api_key"))
            .first();
          const fromEmailConfig = await ctx.db
            .query("systemConfig")
            .withIndex("by_key", (q) => q.eq("key", "resend_from_email"))
            .first();
          const fromNameConfig = await ctx.db
            .query("systemConfig")
            .withIndex("by_key", (q) => q.eq("key", "resend_from_name"))
            .first();
          const appUrlConfig = await ctx.db
            .query("systemConfig")
            .withIndex("by_key", (q) => q.eq("key", "app_url"))
            .first();

          await ctx.scheduler.runAfter(0, internal.api.email.sendNewReservationRequestEmail, {
            announcerEmail: announcer.email,
            announcerFirstName: announcer.firstName,
            clientName: `${pendingBooking.clientData?.firstName || user.firstName} ${pendingBooking.clientData?.lastName || user.lastName}`,
            reservation: {
              serviceName,
              startDate: pendingBooking.startDate,
              endDate: pendingBooking.endDate,
              startTime: pendingBooking.startTime,
              endTime: pendingBooking.endTime,
              animalName: pendingBooking.clientData?.animalName || "Animal",
              animalType: pendingBooking.clientData?.animalType || "",
              location: pendingBooking.location || "",
              includeOvernightStay: pendingBooking.includeOvernightStay,
              overnightNights: pendingBooking.overnightNights,
              totalAmount: totalAmount,
            },
            emailConfig: apiKeyConfig?.value ? {
              apiKey: apiKeyConfig.value,
              fromEmail: fromEmailConfig?.value,
              fromName: fromNameConfig?.value,
            } : undefined,
            appUrl: appUrlConfig?.value || undefined,
          });
        }

        // Préparer les données pour l'email de confirmation
        reservationData = {
          missionId,
          serviceName,
          serviceCategory,
          announcerName: announcer ? `${announcer.firstName} ${announcer.lastName.charAt(0)}.` : "Annonceur",
          announcerEmail: announcer?.email,
          startDate: pendingBooking.startDate,
          endDate: pendingBooking.endDate,
          startTime: pendingBooking.startTime,
          animalName: pendingBooking.clientData?.animalName,
          animalType: pendingBooking.clientData?.animalType,
          location: pendingBooking.location,
          totalAmount: totalAmount,
        };
      }
    }

    return {
      success: true,
      context: tokenDoc.context || "registration",
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
      },
      reservation: reservationData,
    };
  },
});

// Helper pour obtenir l'emoji d'un animal
function getAnimalEmoji(type: string): string {
  const emojis: Record<string, string> = {
    chien: "🐕",
    chat: "🐱",
    oiseau: "🐦",
    rongeur: "🐹",
    reptile: "🦎",
    poisson: "🐠",
    cheval: "🐴",
    nac: "🐾",
    autre: "🐾",
  };
  return emojis[type.toLowerCase()] || "🐾";
}

// Query interne pour récupérer un utilisateur par ID
export const getUserById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});
