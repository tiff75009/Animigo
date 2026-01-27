import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { Id } from "../_generated/dataModel";

// ============================================
// HELPERS
// ============================================

// Valider la session et récupérer l'utilisateur
async function validateSession(ctx: any, token: string) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();

  if (!session || session.expiresAt < Date.now()) {
    throw new ConvexError("Session invalide ou expirée");
  }

  const user = await ctx.db.get(session.userId);
  if (!user) {
    throw new ConvexError("Utilisateur non trouvé");
  }

  return { session, user };
}

// Vérifier que l'utilisateur possède la variante
async function verifyVariantOwnership(
  ctx: any,
  variantId: Id<"serviceVariants">,
  userId: Id<"users">
) {
  const variant = await ctx.db.get(variantId);
  if (!variant) {
    throw new ConvexError("Formule non trouvée");
  }

  const service = await ctx.db.get(variant.serviceId);
  if (!service) {
    throw new ConvexError("Service non trouvé");
  }

  if (service.userId !== userId) {
    throw new ConvexError("Vous n'êtes pas autorisé à modifier cette formule");
  }

  return { variant, service };
}

// Calculer l'heure de fin basée sur startTime et duration
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
}

// Générer un ID unique pour la récurrence
function generateRecurrenceId(): string {
  return `rec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Calculer les dates de récurrence
function generateRecurrenceDates(
  startDate: string,
  endDate: string,
  pattern: "daily" | "weekly" | "biweekly" | "monthly"
): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  let current = new Date(start);

  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);

    switch (pattern) {
      case "daily":
        current.setDate(current.getDate() + 1);
        break;
      case "weekly":
        current.setDate(current.getDate() + 7);
        break;
      case "biweekly":
        current.setDate(current.getDate() + 14);
        break;
      case "monthly":
        current.setMonth(current.getMonth() + 1);
        break;
    }
  }

  return dates;
}

// Mettre à jour le compteur de créneaux et l'état de la formule
async function updateVariantSlotStatus(ctx: any, variantId: Id<"serviceVariants">) {
  const today = new Date().toISOString().split("T")[0];

  // Compter les créneaux futurs actifs
  const slots = await ctx.db
    .query("collectiveSlots")
    .withIndex("by_variant", (q: any) => q.eq("variantId", variantId))
    .collect();

  const activeSlots = slots.filter(
    (s: any) => s.date >= today && s.isActive && !s.isCancelled
  );

  const slotsCount = activeSlots.length;
  const hasSlots = slotsCount > 0;

  // Mettre à jour la formule
  await ctx.db.patch(variantId, {
    slotsCount,
    needsSlotConfiguration: !hasSlots,
    // Activer automatiquement si des créneaux sont ajoutés, désactiver si plus aucun
    isActive: hasSlots,
    updatedAt: Date.now(),
  });

  return { slotsCount, hasSlots };
}

// ============================================
// QUERIES
// ============================================

/**
 * Récupérer les créneaux d'une formule
 */
export const getSlotsByVariant = query({
  args: {
    token: v.string(),
    variantId: v.id("serviceVariants"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await validateSession(ctx, args.token);

    let slots = await ctx.db
      .query("collectiveSlots")
      .withIndex("by_variant", (q) => q.eq("variantId", args.variantId))
      .collect();

    // Filtrer par dates si spécifiées
    if (args.startDate) {
      slots = slots.filter((s) => s.date >= args.startDate!);
    }
    if (args.endDate) {
      slots = slots.filter((s) => s.date <= args.endDate!);
    }

    // Trier par date et heure
    slots.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });

    return slots;
  },
});

/**
 * Récupérer les créneaux d'un annonceur (pour le planning)
 */
export const getSlotsByUser = query({
  args: {
    token: v.string(),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await validateSession(ctx, args.token);

    const slots = await ctx.db
      .query("collectiveSlots")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Filtrer par dates
    const filteredSlots = slots.filter(
      (s) => s.date >= args.startDate && s.date <= args.endDate
    );

    // Récupérer toutes les missions collectives de l'annonceur
    const allMissions = await ctx.db
      .query("missions")
      .withIndex("by_announcer", (q) => q.eq("announcerId", user._id))
      .collect();

    // Filtrer les missions collectives avec des créneaux
    const collectiveMissions = allMissions.filter(
      (m) => m.sessionType === "collective" && m.collectiveSlotIds && m.collectiveSlotIds.length > 0
    );

    // Enrichir avec les infos de la formule et les réservations
    const enrichedSlots = await Promise.all(
      filteredSlots.map(async (slot) => {
        const variant = await ctx.db.get(slot.variantId);
        const service = await ctx.db.get(slot.serviceId);

        // Trouver les missions qui ont réservé ce créneau
        const missionsForSlot = collectiveMissions.filter((m) => {
          return m.collectiveSlotIds?.some((id) => String(id) === String(slot._id));
        });

        // Créer les bookings à partir des missions
        const bookingsFromMissions = await Promise.all(
          missionsForSlot.map(async (mission) => {
            const client = await ctx.db.get(mission.clientId);
            const animal = mission.animalId
              ? await ctx.db.get(mission.animalId)
              : null;

            // Trouver le numéro de séance pour ce créneau
            const sessionNumber = mission.collectiveSlotIds
              ? mission.collectiveSlotIds.indexOf(slot._id) + 1
              : 1;

            return {
              _id: mission._id,
              missionId: mission._id,
              clientId: mission.clientId,
              clientName: client
                ? `${client.firstName} ${client.lastName.charAt(0)}.`
                : "Client inconnu",
              animalName: animal?.name || mission.animal?.name || "Animal",
              animalEmoji: mission.animal?.emoji || "🐾",
              animalType: animal?.type || mission.animal?.type || "",
              animalCount: mission.animalCount || 1,
              sessionNumber,
              status: "booked" as const,
              missionStatus: mission.status,
            };
          })
        );

        // Ne garder que les missions actives (pas annulées/refusées)
        const activeBookings = bookingsFromMissions.filter(
          (b) => b.missionStatus !== "cancelled" && b.missionStatus !== "refused"
        );

        return {
          ...slot,
          variantName: variant?.name || "Formule inconnue",
          serviceName: service?.name || service?.category || "Service inconnu",
          bookings: activeBookings,
        };
      })
    );

    // Trier par date et heure
    enrichedSlots.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });

    return enrichedSlots;
  },
});

/**
 * Récupérer les créneaux disponibles pour une formule (côté client)
 * Filtre les créneaux passés et ceux qui commencent dans moins de 2h
 */
export const getAvailableSlots = query({
  args: {
    variantId: v.id("serviceVariants"),
    animalCount: v.number(),
    animalType: v.string(),
    startDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const startDate = args.startDate || today;

    // Délai minimum de réservation (en heures)
    const MIN_BOOKING_LEAD_TIME_HOURS = 2;
    const currentMinutesOfDay = now.getHours() * 60 + now.getMinutes();
    const minBookableMinutes = currentMinutesOfDay + (MIN_BOOKING_LEAD_TIME_HOURS * 60);

    const slots = await ctx.db
      .query("collectiveSlots")
      .withIndex("by_variant_date", (q) =>
        q.eq("variantId", args.variantId)
      )
      .collect();

    // Filtrer les créneaux disponibles
    const availableSlots = slots.filter((slot) => {
      // Doit être actif et non annulé
      if (!slot.isActive || slot.isCancelled) return false;

      // Doit être dans le futur (pas de dates passées)
      if (slot.date < startDate) return false;

      // Pour les créneaux d'aujourd'hui, vérifier le délai minimum de 2h
      if (slot.date === today) {
        const [slotHours, slotMinutes] = slot.startTime.split(":").map(Number);
        const slotMinutesOfDay = slotHours * 60 + slotMinutes;

        // Créneau trop proche (moins de 2h) = non disponible
        if (slotMinutesOfDay < minBookableMinutes) return false;
      }

      // Doit avoir assez de places
      if (slot.bookedAnimals + args.animalCount > slot.maxAnimals) return false;

      // Doit accepter le type d'animal
      if (!slot.acceptedAnimalTypes.includes(args.animalType)) return false;

      return true;
    });

    // Trier par date et heure
    availableSlots.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });

    return availableSlots.map((slot) => ({
      _id: slot._id,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      availableSpots: slot.maxAnimals - slot.bookedAnimals,
      maxAnimals: slot.maxAnimals,
    }));
  },
});

/**
 * Récupérer les détails de créneaux par leurs IDs (pour le résumé de réservation)
 */
export const getSlotsByIds = query({
  args: {
    slotIds: v.array(v.id("collectiveSlots")),
  },
  handler: async (ctx, args) => {
    if (args.slotIds.length === 0) {
      return [];
    }

    const slots = await Promise.all(
      args.slotIds.map((id) => ctx.db.get(id))
    );

    return slots
      .filter((slot): slot is NonNullable<typeof slot> => slot !== null)
      .map((slot) => ({
        _id: slot._id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        availableSpots: slot.maxAnimals - slot.bookedAnimals,
      }));
  },
});

/**
 * Récupérer les réservations sur un créneau
 */
export const getSlotBookings = query({
  args: {
    token: v.string(),
    slotId: v.id("collectiveSlots"),
  },
  handler: async (ctx, args) => {
    const { user } = await validateSession(ctx, args.token);

    const slot = await ctx.db.get(args.slotId);
    if (!slot) {
      throw new ConvexError("Créneau non trouvé");
    }

    // Vérifier que l'annonceur possède ce créneau
    if (slot.userId !== user._id) {
      throw new ConvexError("Accès non autorisé");
    }

    const bookings = await ctx.db
      .query("collectiveSlotBookings")
      .withIndex("by_slot", (q) => q.eq("slotId", args.slotId))
      .collect();

    // Enrichir avec les infos client et animal
    const enrichedBookings = await Promise.all(
      bookings.map(async (booking) => {
        const client = await ctx.db.get(booking.clientId);
        const animal = booking.animalId
          ? await ctx.db.get(booking.animalId)
          : null;
        const mission = await ctx.db.get(booking.missionId);

        return {
          ...booking,
          clientName: client
            ? `${client.firstName} ${client.lastName}`
            : "Client inconnu",
          clientEmail: client?.email,
          animalName: animal?.name || mission?.animal?.name || "Animal inconnu",
          animalType: animal?.type || mission?.animal?.type || "",
        };
      })
    );

    return enrichedBookings;
  },
});

/**
 * Vérifier si une formule a assez de créneaux configurés
 */
export const validateVariantSlots = query({
  args: {
    token: v.string(),
    variantId: v.id("serviceVariants"),
  },
  handler: async (ctx, args) => {
    await validateSession(ctx, args.token);

    const variant = await ctx.db.get(args.variantId);
    if (!variant) {
      return { isValid: false, message: "Formule non trouvée" };
    }

    // Si ce n'est pas une formule collective, pas besoin de créneaux
    if (variant.sessionType !== "collective") {
      return { isValid: true, message: "Formule non collective" };
    }

    const today = new Date().toISOString().split("T")[0];

    // Récupérer les créneaux futurs actifs
    const slots = await ctx.db
      .query("collectiveSlots")
      .withIndex("by_variant", (q) => q.eq("variantId", args.variantId))
      .collect();

    const futureActiveSlots = slots.filter(
      (s) => s.date >= today && s.isActive && !s.isCancelled
    );

    if (futureActiveSlots.length === 0) {
      return {
        isValid: false,
        message: "Aucun créneau configuré pour cette formule collective",
        slotsCount: 0,
      };
    }

    // Vérifier qu'il y a au moins 1 créneau par semaine pour les 4 prochaines semaines
    const weeksToCheck = 4;
    const missingWeeks: string[] = [];

    for (let i = 0; i < weeksToCheck; i++) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() + i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weekStartStr = weekStart.toISOString().split("T")[0];
      const weekEndStr = weekEnd.toISOString().split("T")[0];

      const slotsInWeek = futureActiveSlots.filter(
        (s) => s.date >= weekStartStr && s.date <= weekEndStr
      );

      if (slotsInWeek.length === 0) {
        missingWeeks.push(`Semaine du ${weekStartStr}`);
      }
    }

    return {
      isValid: missingWeeks.length === 0,
      message:
        missingWeeks.length > 0
          ? `Créneaux manquants pour: ${missingWeeks.join(", ")}`
          : "Configuration valide",
      slotsCount: futureActiveSlots.length,
      missingWeeks,
    };
  },
});

// ============================================
// MUTATIONS
// ============================================

// Helper: Vérifier si deux créneaux horaires se chevauchent
function timeSlotsOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  return start1 < end2 && end1 > start2;
}

// Helper: Vérifier conflit avec disponibilité individuelle
async function checkIndividualAvailabilityConflict(
  ctx: any,
  userId: Id<"users">,
  serviceId: Id<"services">,
  date: string,
  startTime: string,
  endTime: string
): Promise<{ hasConflict: boolean; message?: string }> {
  // 1. Récupérer la catégorie du service
  const service = await ctx.db.get(serviceId);
  if (!service) {
    return { hasConflict: false };
  }

  // 2. Récupérer la catégorie parente pour obtenir le typeId
  const category = await ctx.db
    .query("serviceCategories")
    .withIndex("by_slug", (q: any) => q.eq("slug", service.category))
    .first();

  if (!category) {
    return { hasConflict: false };
  }

  // Si c'est une sous-catégorie, récupérer la catégorie parente
  let typeId = category.typeId;
  if (!typeId && category.parentCategoryId) {
    const parentCategory = await ctx.db.get(category.parentCategoryId);
    typeId = parentCategory?.typeId;
  }

  if (!typeId) {
    return { hasConflict: false };
  }

  // 3. Vérifier s'il y a une disponibilité individuelle pour ce type ce jour
  const availability = await ctx.db
    .query("availability")
    .withIndex("by_user_date_type", (q: any) =>
      q.eq("userId", userId).eq("date", date).eq("categoryTypeId", typeId)
    )
    .first();

  // Pas de dispo = pas d'entrée = indisponible par défaut = pas de conflit (car indisponible)
  if (!availability) {
    return { hasConflict: false };
  }

  // Si unavailable, pas de conflit
  if (availability.status === "unavailable") {
    return { hasConflict: false };
  }

  // Si available sans timeSlots (toute la journée), conflit
  if (availability.status === "available" && (!availability.timeSlots || availability.timeSlots.length === 0)) {
    return {
      hasConflict: true,
      message: `Vous êtes marqué disponible pour des services individuels le ${date}. Modifiez d'abord votre disponibilité.`,
    };
  }

  // Si partial ou available avec timeSlots, vérifier chevauchement
  if (availability.timeSlots && availability.timeSlots.length > 0) {
    const hasOverlap = availability.timeSlots.some((ts: { startTime: string; endTime: string }) =>
      timeSlotsOverlap(startTime, endTime, ts.startTime, ts.endTime)
    );

    if (hasOverlap) {
      return {
        hasConflict: true,
        message: `Vous êtes marqué disponible pour des services individuels sur ce créneau horaire le ${date}. Modifiez d'abord votre disponibilité.`,
      };
    }
  }

  return { hasConflict: false };
}

/**
 * Créer un créneau collectif (avec support récurrence)
 * Vérifie l'exclusivité avec les disponibilités individuelles
 */
export const addCollectiveSlot = mutation({
  args: {
    token: v.string(),
    variantId: v.id("serviceVariants"),
    date: v.string(), // "YYYY-MM-DD"
    startTime: v.string(), // "HH:MM"
    // Récurrence optionnelle
    recurrence: v.optional(
      v.object({
        pattern: v.union(
          v.literal("daily"),
          v.literal("weekly"),
          v.literal("biweekly"),
          v.literal("monthly")
        ),
        endDate: v.string(), // "YYYY-MM-DD"
      })
    ),
  },
  handler: async (ctx, args) => {
    const { user } = await validateSession(ctx, args.token);
    const { variant, service } = await verifyVariantOwnership(
      ctx,
      args.variantId,
      user._id
    );

    // Vérifier que c'est une formule collective
    if (variant.sessionType !== "collective") {
      throw new ConvexError(
        "Cette formule n'est pas de type collective"
      );
    }

    // Calculer l'heure de fin basée sur la durée de la formule
    const duration = variant.duration || 60; // Par défaut 60 minutes
    const endTime = calculateEndTime(args.startTime, duration);

    // Vérifier l'exclusivité avec les disponibilités individuelles
    const datesToCheck = args.recurrence
      ? generateRecurrenceDates(args.date, args.recurrence.endDate, args.recurrence.pattern)
      : [args.date];

    for (const date of datesToCheck) {
      const conflict = await checkIndividualAvailabilityConflict(
        ctx,
        user._id,
        variant.serviceId,
        date,
        args.startTime,
        endTime
      );

      if (conflict.hasConflict) {
        throw new ConvexError(conflict.message || "Conflit avec disponibilité individuelle");
      }
    }

    const now = Date.now();
    const baseSlot = {
      variantId: args.variantId,
      userId: user._id,
      serviceId: variant.serviceId,
      startTime: args.startTime,
      endTime,
      maxAnimals: variant.maxAnimalsPerSession || 5,
      bookedAnimals: 0,
      acceptedAnimalTypes: variant.animalTypes || service.animalTypes || [],
      isActive: true,
      isCancelled: false,
      createdAt: now,
      updatedAt: now,
    };

    const createdSlotIds: Id<"collectiveSlots">[] = [];

    if (args.recurrence) {
      // Créer les créneaux récurrents
      const recurrenceId = generateRecurrenceId();
      const dates = generateRecurrenceDates(
        args.date,
        args.recurrence.endDate,
        args.recurrence.pattern
      );

      for (const date of dates) {
        const slotId = await ctx.db.insert("collectiveSlots", {
          ...baseSlot,
          date,
          recurrenceId,
          recurrencePattern: args.recurrence.pattern,
          recurrenceEndDate: args.recurrence.endDate,
        });
        createdSlotIds.push(slotId);
      }
    } else {
      // Créer un créneau unique
      const slotId = await ctx.db.insert("collectiveSlots", {
        ...baseSlot,
        date: args.date,
      });
      createdSlotIds.push(slotId);
    }

    // Mettre à jour le statut de la formule (activer si des créneaux existent)
    await updateVariantSlotStatus(ctx, args.variantId);

    return {
      success: true,
      slotIds: createdSlotIds,
      count: createdSlotIds.length,
    };
  },
});

/**
 * Modifier un créneau collectif
 * Si le créneau est partiellement réservé, notifier les clients
 */
export const updateCollectiveSlot = mutation({
  args: {
    token: v.string(),
    slotId: v.id("collectiveSlots"),
    date: v.optional(v.string()),
    startTime: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    reason: v.optional(v.string()),
    // Option pour appliquer aux créneaux récurrents futurs
    applyToFuture: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { user } = await validateSession(ctx, args.token);

    const slot = await ctx.db.get(args.slotId);
    if (!slot) {
      throw new ConvexError("Créneau non trouvé");
    }

    if (slot.userId !== user._id) {
      throw new ConvexError("Accès non autorisé");
    }

    const variant = await ctx.db.get(slot.variantId);
    const duration = variant?.duration || 60;

    const now = Date.now();
    const updates: Record<string, any> = { updatedAt: now };

    // Détecter le type de changement
    let changeType: "time_changed" | "date_changed" | null = null;

    if (args.date !== undefined && args.date !== slot.date) {
      updates.date = args.date;
      changeType = "date_changed";
    }

    if (args.startTime !== undefined && args.startTime !== slot.startTime) {
      updates.startTime = args.startTime;
      updates.endTime = calculateEndTime(args.startTime, duration);
      changeType = changeType || "time_changed";
    }

    if (args.isActive !== undefined) {
      updates.isActive = args.isActive;
    }

    // Vérifier s'il y a des réservations actives
    const bookings = await ctx.db
      .query("collectiveSlotBookings")
      .withIndex("by_slot_status", (q) =>
        q.eq("slotId", args.slotId).eq("status", "booked")
      )
      .collect();

    // Si changement d'horaire/date et réservations existantes, créer des notifications
    if (changeType && bookings.length > 0) {
      for (const booking of bookings) {
        await ctx.db.insert("slotChangeNotifications", {
          slotId: args.slotId,
          bookingId: booking._id,
          clientId: booking.clientId,
          missionId: booking.missionId,
          changeType,
          previousDate: slot.date,
          previousStartTime: slot.startTime,
          previousEndTime: slot.endTime,
          newDate: args.date || slot.date,
          newStartTime: args.startTime || slot.startTime,
          newEndTime: updates.endTime || slot.endTime,
          reason: args.reason,
          status: "pending",
          createdAt: now,
          expiresAt: now + 48 * 60 * 60 * 1000, // 48h pour répondre
        });

        // Créer une notification in-app pour le client
        await ctx.db.insert("notifications", {
          userId: booking.clientId,
          type: "system",
          title: "Modification de créneau",
          message: `L'annonceur a modifié votre créneau du ${slot.date} à ${slot.startTime}. Veuillez confirmer ou choisir un autre créneau.`,
          linkType: "mission",
          linkId: booking.missionId,
          isRead: false,
          createdAt: now,
          expiresAt: now + 30 * 24 * 60 * 60 * 1000, // 30 jours
        });
      }
    }

    // Mettre à jour le créneau
    await ctx.db.patch(args.slotId, updates);

    // Si applyToFuture et récurrence, mettre à jour les futurs créneaux
    if (args.applyToFuture && slot.recurrenceId) {
      const futureSlots = await ctx.db
        .query("collectiveSlots")
        .withIndex("by_recurrence", (q) =>
          q.eq("recurrenceId", slot.recurrenceId!)
        )
        .collect();

      const today = new Date().toISOString().split("T")[0];

      for (const futureSlot of futureSlots) {
        if (futureSlot._id !== args.slotId && futureSlot.date > today) {
          const futureUpdates: Record<string, any> = { updatedAt: now };

          if (args.startTime !== undefined) {
            futureUpdates.startTime = args.startTime;
            futureUpdates.endTime = calculateEndTime(args.startTime, duration);
          }

          if (args.isActive !== undefined) {
            futureUpdates.isActive = args.isActive;
          }

          await ctx.db.patch(futureSlot._id, futureUpdates);
        }
      }
    }

    return {
      success: true,
      notifiedClients: bookings.length,
    };
  },
});

/**
 * Annuler un créneau collectif
 * Notifier tous les clients qui ont réservé
 */
export const cancelCollectiveSlot = mutation({
  args: {
    token: v.string(),
    slotId: v.id("collectiveSlots"),
    reason: v.string(),
    // Option pour annuler les créneaux récurrents futurs
    cancelFuture: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { user } = await validateSession(ctx, args.token);

    const slot = await ctx.db.get(args.slotId);
    if (!slot) {
      throw new ConvexError("Créneau non trouvé");
    }

    if (slot.userId !== user._id) {
      throw new ConvexError("Accès non autorisé");
    }

    const now = Date.now();

    // Récupérer les réservations actives
    const bookings = await ctx.db
      .query("collectiveSlotBookings")
      .withIndex("by_slot_status", (q) =>
        q.eq("slotId", args.slotId).eq("status", "booked")
      )
      .collect();

    // Créer des notifications pour chaque client
    for (const booking of bookings) {
      // Marquer la réservation comme annulée par l'annonceur
      await ctx.db.patch(booking._id, {
        status: "slot_cancelled",
        cancelledAt: now,
        updatedAt: now,
      });

      // Mettre à jour le compteur
      await ctx.db.patch(args.slotId, {
        bookedAnimals: Math.max(0, slot.bookedAnimals - booking.animalCount),
      });

      // Créer la notification de changement
      await ctx.db.insert("slotChangeNotifications", {
        slotId: args.slotId,
        bookingId: booking._id,
        clientId: booking.clientId,
        missionId: booking.missionId,
        changeType: "cancelled",
        previousDate: slot.date,
        previousStartTime: slot.startTime,
        previousEndTime: slot.endTime,
        reason: args.reason,
        status: "pending",
        createdAt: now,
        expiresAt: now + 48 * 60 * 60 * 1000,
      });

      // Notification in-app
      await ctx.db.insert("notifications", {
        userId: booking.clientId,
        type: "mission_cancelled",
        title: "Créneau annulé",
        message: `L'annonceur a annulé le créneau du ${slot.date} à ${slot.startTime}. Raison: ${args.reason}. Veuillez choisir un autre créneau.`,
        linkType: "mission",
        linkId: booking.missionId,
        isRead: false,
        createdAt: now,
        expiresAt: now + 30 * 24 * 60 * 60 * 1000,
      });
    }

    // Marquer le créneau comme annulé
    await ctx.db.patch(args.slotId, {
      isCancelled: true,
      isActive: false,
      cancellationReason: args.reason,
      updatedAt: now,
    });

    // Si cancelFuture et récurrence
    if (args.cancelFuture && slot.recurrenceId) {
      const futureSlots = await ctx.db
        .query("collectiveSlots")
        .withIndex("by_recurrence", (q) =>
          q.eq("recurrenceId", slot.recurrenceId!)
        )
        .collect();

      const today = new Date().toISOString().split("T")[0];

      for (const futureSlot of futureSlots) {
        if (futureSlot._id !== args.slotId && futureSlot.date > today) {
          await ctx.db.patch(futureSlot._id, {
            isCancelled: true,
            isActive: false,
            cancellationReason: args.reason,
            updatedAt: now,
          });
        }
      }
    }

    // Mettre à jour le statut de la formule
    await updateVariantSlotStatus(ctx, slot.variantId);

    return {
      success: true,
      notifiedClients: bookings.length,
    };
  },
});

/**
 * Supprimer un créneau collectif
 * Uniquement si aucune réservation
 */
export const deleteCollectiveSlot = mutation({
  args: {
    token: v.string(),
    slotId: v.id("collectiveSlots"),
    // Option pour supprimer les créneaux récurrents futurs
    deleteFuture: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { user } = await validateSession(ctx, args.token);

    const slot = await ctx.db.get(args.slotId);
    if (!slot) {
      throw new ConvexError("Créneau non trouvé");
    }

    if (slot.userId !== user._id) {
      throw new ConvexError("Accès non autorisé");
    }

    // Vérifier qu'il n'y a pas de réservations
    if (slot.bookedAnimals > 0) {
      throw new ConvexError(
        "Impossible de supprimer un créneau avec des réservations. Utilisez l'annulation à la place."
      );
    }

    // Supprimer le créneau
    await ctx.db.delete(args.slotId);

    // Si deleteFuture et récurrence
    if (args.deleteFuture && slot.recurrenceId) {
      const futureSlots = await ctx.db
        .query("collectiveSlots")
        .withIndex("by_recurrence", (q) =>
          q.eq("recurrenceId", slot.recurrenceId!)
        )
        .collect();

      const today = new Date().toISOString().split("T")[0];

      for (const futureSlot of futureSlots) {
        if (futureSlot._id !== args.slotId && futureSlot.date > today) {
          // Vérifier pas de réservations
          if (futureSlot.bookedAnimals === 0) {
            await ctx.db.delete(futureSlot._id);
          }
        }
      }
    }

    // Mettre à jour le statut de la formule
    await updateVariantSlotStatus(ctx, slot.variantId);

    return { success: true };
  },
});

/**
 * Réserver des créneaux pour une mission (appelé lors de la création de mission)
 */
export const bookSlots = mutation({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
    slotIds: v.array(v.id("collectiveSlots")),
    animalCount: v.number(),
    animalId: v.optional(v.id("animals")),
  },
  handler: async (ctx, args) => {
    const { user } = await validateSession(ctx, args.token);

    const mission = await ctx.db.get(args.missionId);
    if (!mission) {
      throw new ConvexError("Mission non trouvée");
    }

    // Vérifier que l'utilisateur est le client
    if (mission.clientId !== user._id) {
      throw new ConvexError("Accès non autorisé");
    }

    const now = Date.now();
    const createdBookingIds: Id<"collectiveSlotBookings">[] = [];

    for (let i = 0; i < args.slotIds.length; i++) {
      const slotId = args.slotIds[i];
      const slot = await ctx.db.get(slotId);

      if (!slot) {
        throw new ConvexError(`Créneau ${slotId} non trouvé`);
      }

      if (!slot.isActive || slot.isCancelled) {
        throw new ConvexError(`Le créneau du ${slot.date} n'est plus disponible`);
      }

      if (slot.bookedAnimals + args.animalCount > slot.maxAnimals) {
        throw new ConvexError(
          `Plus assez de places disponibles pour le créneau du ${slot.date}`
        );
      }

      // Créer la réservation
      const bookingId = await ctx.db.insert("collectiveSlotBookings", {
        slotId,
        missionId: args.missionId,
        clientId: user._id,
        animalId: args.animalId,
        animalCount: args.animalCount,
        sessionNumber: i + 1,
        status: "booked",
        createdAt: now,
        updatedAt: now,
      });

      createdBookingIds.push(bookingId);

      // Mettre à jour le compteur du créneau
      await ctx.db.patch(slotId, {
        bookedAnimals: slot.bookedAnimals + args.animalCount,
        updatedAt: now,
      });
    }

    return {
      success: true,
      bookingIds: createdBookingIds,
    };
  },
});

/**
 * Annuler une réservation sur un créneau
 * Gère la logique de remboursement selon si les séances ont commencé
 */
export const cancelSlotBooking = mutation({
  args: {
    token: v.string(),
    bookingId: v.id("collectiveSlotBookings"),
  },
  handler: async (ctx, args) => {
    const { user } = await validateSession(ctx, args.token);

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      throw new ConvexError("Réservation non trouvée");
    }

    if (booking.clientId !== user._id) {
      throw new ConvexError("Accès non autorisé");
    }

    if (booking.status !== "booked") {
      throw new ConvexError("Cette réservation ne peut pas être annulée");
    }

    const slot = await ctx.db.get(booking.slotId);
    if (!slot) {
      throw new ConvexError("Créneau non trouvé");
    }

    const now = Date.now();

    // Vérifier si des séances ont déjà été effectuées pour cette mission
    const allBookings = await ctx.db
      .query("collectiveSlotBookings")
      .withIndex("by_mission", (q) => q.eq("missionId", booking.missionId))
      .collect();

    const completedSessions = allBookings.filter(
      (b) => b.status === "completed"
    ).length;

    // Marquer la réservation comme annulée
    await ctx.db.patch(args.bookingId, {
      status: "cancelled",
      cancelledAt: now,
      updatedAt: now,
    });

    // Libérer les places dans le créneau
    await ctx.db.patch(booking.slotId, {
      bookedAnimals: Math.max(0, slot.bookedAnimals - booking.animalCount),
      updatedAt: now,
    });

    // Déterminer le remboursement
    let refundEligible = false;
    let refundMessage = "";

    if (completedSessions > 0) {
      // Des séances ont déjà eu lieu - pas de remboursement
      refundEligible = false;
      refundMessage =
        "Aucun remboursement car des séances ont déjà été effectuées.";
    } else {
      // Aucune séance effectuée - remboursement possible
      refundEligible = true;
      refundMessage = "Remboursement à traiter.";
    }

    return {
      success: true,
      completedSessions,
      refundEligible,
      refundMessage,
    };
  },
});

/**
 * Répondre à une notification de changement de créneau
 */
export const respondToSlotChange = mutation({
  args: {
    token: v.string(),
    notificationId: v.id("slotChangeNotifications"),
    response: v.union(
      v.literal("accept_change"),
      v.literal("reschedule"),
      v.literal("cancel")
    ),
    newSlotId: v.optional(v.id("collectiveSlots")), // Si reschedule
  },
  handler: async (ctx, args) => {
    const { user } = await validateSession(ctx, args.token);

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new ConvexError("Notification non trouvée");
    }

    if (notification.clientId !== user._id) {
      throw new ConvexError("Accès non autorisé");
    }

    if (notification.status !== "pending") {
      throw new ConvexError("Cette notification a déjà été traitée");
    }

    const now = Date.now();
    const booking = await ctx.db.get(notification.bookingId);

    if (args.response === "accept_change") {
      // Le client accepte la modification
      await ctx.db.patch(args.notificationId, {
        status: "acknowledged",
        clientResponse: "accept_change",
        clientResponseAt: now,
      });
    } else if (args.response === "reschedule") {
      // Le client veut changer de créneau
      if (!args.newSlotId) {
        throw new ConvexError("Veuillez sélectionner un nouveau créneau");
      }

      const newSlot = await ctx.db.get(args.newSlotId);
      if (!newSlot) {
        throw new ConvexError("Nouveau créneau non trouvé");
      }

      if (
        !newSlot.isActive ||
        newSlot.isCancelled ||
        newSlot.bookedAnimals + (booking?.animalCount || 1) > newSlot.maxAnimals
      ) {
        throw new ConvexError("Ce créneau n'est plus disponible");
      }

      // Libérer l'ancien créneau si pas annulé
      if (notification.changeType !== "cancelled" && booking) {
        const oldSlot = await ctx.db.get(notification.slotId);
        if (oldSlot) {
          await ctx.db.patch(notification.slotId, {
            bookedAnimals: Math.max(
              0,
              oldSlot.bookedAnimals - booking.animalCount
            ),
            updatedAt: now,
          });
        }
      }

      // Mettre à jour la réservation
      if (booking) {
        await ctx.db.patch(notification.bookingId, {
          slotId: args.newSlotId,
          status: "booked",
          newSlotId: args.newSlotId,
          updatedAt: now,
        });

        // Réserver le nouveau créneau
        await ctx.db.patch(args.newSlotId, {
          bookedAnimals: newSlot.bookedAnimals + booking.animalCount,
          updatedAt: now,
        });
      }

      await ctx.db.patch(args.notificationId, {
        status: "rescheduled",
        clientResponse: "reschedule",
        clientResponseAt: now,
        newSelectedSlotId: args.newSlotId,
      });
    } else if (args.response === "cancel") {
      // Le client veut annuler et être remboursé
      // Vérifier si des séances ont déjà eu lieu
      const allBookings = await ctx.db
        .query("collectiveSlotBookings")
        .withIndex("by_mission", (q) => q.eq("missionId", notification.missionId))
        .collect();

      const completedSessions = allBookings.filter(
        (b) => b.status === "completed"
      ).length;

      if (booking) {
        await ctx.db.patch(notification.bookingId, {
          status: "cancelled",
          cancelledAt: now,
          updatedAt: now,
        });

        // Libérer les places si le créneau n'est pas déjà annulé
        if (notification.changeType !== "cancelled") {
          const slot = await ctx.db.get(notification.slotId);
          if (slot) {
            await ctx.db.patch(notification.slotId, {
              bookedAnimals: Math.max(0, slot.bookedAnimals - booking.animalCount),
              updatedAt: now,
            });
          }
        }
      }

      await ctx.db.patch(args.notificationId, {
        status: completedSessions > 0 ? "acknowledged" : "refunded",
        clientResponse: "cancel",
        clientResponseAt: now,
      });

      return {
        success: true,
        refundEligible: completedSessions === 0,
        completedSessions,
        message:
          completedSessions > 0
            ? "Annulation enregistrée. Pas de remboursement car des séances ont déjà été effectuées."
            : "Annulation enregistrée. Remboursement à traiter.",
      };
    }

    return { success: true };
  },
});

/**
 * Marquer une séance comme effectuée
 */
export const completeSlotBooking = mutation({
  args: {
    token: v.string(),
    bookingId: v.id("collectiveSlotBookings"),
  },
  handler: async (ctx, args) => {
    const { user } = await validateSession(ctx, args.token);

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      throw new ConvexError("Réservation non trouvée");
    }

    const slot = await ctx.db.get(booking.slotId);
    if (!slot || slot.userId !== user._id) {
      throw new ConvexError("Accès non autorisé");
    }

    if (booking.status !== "booked") {
      throw new ConvexError("Cette réservation ne peut pas être marquée comme effectuée");
    }

    const now = Date.now();

    await ctx.db.patch(args.bookingId, {
      status: "completed",
      completedAt: now,
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Récupérer les notifications de changement en attente pour un client
 */
export const getPendingSlotChangeNotifications = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await validateSession(ctx, args.token);

    const notifications = await ctx.db
      .query("slotChangeNotifications")
      .withIndex("by_client", (q) => q.eq("clientId", user._id))
      .collect();

    const pendingNotifications = notifications.filter(
      (n) => n.status === "pending"
    );

    // Enrichir avec les infos du créneau et de la mission
    const enrichedNotifications = await Promise.all(
      pendingNotifications.map(async (notification) => {
        const slot = await ctx.db.get(notification.slotId);
        const mission = await ctx.db.get(notification.missionId);
        const variant = slot ? await ctx.db.get(slot.variantId) : null;

        return {
          ...notification,
          variantName: variant?.name || "Formule inconnue",
          serviceName: mission?.serviceName || "Service inconnu",
        };
      })
    );

    return enrichedNotifications;
  },
});
