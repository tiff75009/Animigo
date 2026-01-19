import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

// Taux de commission de la plateforme (en pourcentage)
const PLATFORM_COMMISSION_RATE = 15; // 15%

// Mutation publique pour vérifier un email avec le token
// Note: Converti en mutation (au lieu d'action) car ctx.runMutation/ctx.runQuery échouent dans les actions sur Convex self-hosted
export const verifyEmail = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Rechercher le token directement
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

        // Récupérer la formule (variant)
        let variantName = "";
        let basePrice = 0;
        if (pendingBooking.variantId) {
          const variant = await ctx.db.get(pendingBooking.variantId as Id<"serviceVariants">);
          if (variant) {
            variantName = variant.name;
            basePrice = variant.price;
          }
        }

        // Récupérer les options
        let optionNames: string[] = [];
        let optionsPrice = 0;
        if (pendingBooking.optionIds && pendingBooking.optionIds.length > 0) {
          for (const optionId of pendingBooking.optionIds) {
            const option = await ctx.db.get(optionId as Id<"serviceOptions">);
            if (option) {
              optionNames.push(option.name);
              optionsPrice += option.price;
            }
          }
        }

        // Calculer la commission et les revenus annonceur
        const totalAmount = pendingBooking.calculatedAmount;
        const platformFee = Math.round(totalAmount * PLATFORM_COMMISSION_RATE / 100);
        const announcerEarnings = totalAmount - platformFee;

        // Helper pour obtenir l'emoji d'un animal
        const getAnimalEmoji = (type: string): string => {
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
        };

        // Récupérer l'animal créé pour cet utilisateur
        // L'animal a été créé dans finalizeBookingAsGuest avec toutes ses données
        const userAnimal = await ctx.db
          .query("animals")
          .withIndex("by_user", (q) => q.eq("userId", tokenDoc.userId))
          .filter((q) => q.eq(q.field("name"), pendingBooking.clientData?.animalName || ""))
          .first();

        // Créer la mission avec toutes les infos
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
          variantId: pendingBooking.variantId,
          variantName,
          optionIds: pendingBooking.optionIds,
          optionNames: optionNames.length > 0 ? optionNames : undefined,
          basePrice,
          optionsPrice: optionsPrice > 0 ? optionsPrice : undefined,
          platformFee,
          announcerEarnings,
          startDate: pendingBooking.startDate,
          endDate: pendingBooking.endDate,
          startTime: pendingBooking.startTime,
          endTime: pendingBooking.endTime,
          status: "pending_acceptance",
          amount: totalAmount,
          paymentStatus: "not_due",
          location: pendingBooking.location || "",
          city: pendingBooking.city,
          clientCoordinates: pendingBooking.coordinates,
          clientNotes: pendingBooking.clientData?.notes,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Mettre à jour la pending booking
        await ctx.db.patch(pendingBooking._id, {
          status: "completed",
        });

        reservationData = {
          missionId,
          serviceName,
          serviceCategory,
          announcerName: announcer ? `${announcer.firstName} ${announcer.lastName.charAt(0)}.` : "Annonceur",
          announcerEmail: announcer?.email,
          startDate: pendingBooking.startDate,
          endDate: pendingBooking.endDate,
          startTime: pendingBooking.startTime,
          endTime: pendingBooking.endTime,
          animalName: pendingBooking.clientData?.animalName,
          animalType: pendingBooking.clientData?.animalType,
          location: pendingBooking.location,
          totalAmount: pendingBooking.calculatedAmount,
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
