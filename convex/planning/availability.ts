// @ts-nocheck
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { Id } from "../_generated/dataModel";

// Types pour les disponibilités
export type AvailabilityStatus = "available" | "partial" | "unavailable";

export interface TimeSlot {
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
}

// Helper: Vérifier si deux créneaux horaires se chevauchent
function timeSlotsOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  return start1 < end2 && end1 > start2;
}

// Helper: Vérifier les conflits avec les créneaux collectifs
async function checkCollectiveSlotsConflict(
  ctx: any,
  userId: Id<"users">,
  categoryTypeId: Id<"categoryTypes">,
  date: string,
  timeSlots?: Array<{ startTime: string; endTime: string }>
): Promise<{ hasConflict: boolean; conflictingSlots: any[] }> {
  // 1. Trouver les catégories de ce type
  const categoriesOfType = await ctx.db
    .query("serviceCategories")
    .filter((q: any) => q.eq(q.field("typeId"), categoryTypeId))
    .collect();

  const categoryIds = categoriesOfType.map((c: any) => c._id);

  if (categoryIds.length === 0) {
    return { hasConflict: false, conflictingSlots: [] };
  }

  // 2. Trouver les services de l'annonceur dans ces catégories
  const services = await ctx.db
    .query("services")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();

  const relevantServiceIds = services
    .filter((s: any) => categoryIds.some((catId: any) => String(catId) === String(s.categoryId)))
    .map((s: any) => s._id);

  if (relevantServiceIds.length === 0) {
    return { hasConflict: false, conflictingSlots: [] };
  }

  // 3. Trouver les créneaux collectifs de ce jour
  const collectiveSlots = await ctx.db
    .query("collectiveSlots")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();

  const slotsOnDate = collectiveSlots.filter(
    (slot: any) =>
      slot.date === date &&
      slot.isActive === true &&
      slot.isCancelled !== true &&
      relevantServiceIds.some((sid: any) => String(sid) === String(slot.serviceId))
  );

  if (slotsOnDate.length === 0) {
    return { hasConflict: false, conflictingSlots: [] };
  }

  // 4. Si timeSlots fournis, vérifier le chevauchement horaire
  if (timeSlots && timeSlots.length > 0) {
    const conflicting = slotsOnDate.filter((slot: any) =>
      timeSlots.some((ts) =>
        timeSlotsOverlap(ts.startTime, ts.endTime, slot.startTime, slot.endTime)
      )
    );
    return { hasConflict: conflicting.length > 0, conflictingSlots: conflicting };
  }

  // 5. Si pas de timeSlots (dispo toute la journée), tout créneau est en conflit
  return { hasConflict: slotsOnDate.length > 0, conflictingSlots: slotsOnDate };
}

/**
 * Récupère les disponibilités pour une plage de dates
 * NOTE: Par défaut, l'annonceur est INDISPONIBLE. Une entrée avec status "available"
 * ou "partial" indique une disponibilité explicite.
 */
export const getAvailabilityByDateRange = query({
  args: {
    token: v.string(),
    startDate: v.string(), // "YYYY-MM-DD"
    endDate: v.string(), // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return [];
    }

    // Récupérer toutes les disponibilités de l'utilisateur
    const availabilities = await ctx.db
      .query("availability")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .collect();

    // Filtrer par plage de dates
    const filteredAvailabilities = availabilities.filter((a) => {
      return a.date >= args.startDate && a.date <= args.endDate;
    });

    return filteredAvailabilities.map((a) => ({
      id: a._id,
      date: a.date,
      categoryTypeId: a.categoryTypeId,
      status: a.status,
      timeSlots: a.timeSlots,
      reason: a.reason,
    }));
  },
});

/**
 * Récupère la disponibilité pour une date spécifique
 */
export const getAvailabilityByDate = query({
  args: {
    token: v.string(),
    date: v.string(), // "YYYY-MM-DD"
    categoryTypeId: v.optional(v.id("categoryTypes")),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    // Si categoryTypeId fourni, chercher par type
    if (args.categoryTypeId) {
      const availability = await ctx.db
        .query("availability")
        .withIndex("by_user_date_type", (q) =>
          q.eq("userId", session.userId)
           .eq("date", args.date)
           .eq("categoryTypeId", args.categoryTypeId)
        )
        .first();

      if (!availability) {
        return null;
      }

      return {
        id: availability._id,
        date: availability.date,
        categoryTypeId: availability.categoryTypeId,
        status: availability.status,
        timeSlots: availability.timeSlots,
        reason: availability.reason,
      };
    }

    // Sinon chercher par date uniquement (compatibilité)
    const availability = await ctx.db
      .query("availability")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", session.userId).eq("date", args.date)
      )
      .first();

    if (!availability) {
      return null;
    }

    return {
      id: availability._id,
      date: availability.date,
      categoryTypeId: availability.categoryTypeId,
      status: availability.status,
      timeSlots: availability.timeSlots,
      reason: availability.reason,
    };
  },
});

/**
 * Définir la disponibilité pour une date et un type de catégorie
 * Par défaut indisponible = pas d'entrée ou status "unavailable"
 */
export const setAvailability = mutation({
  args: {
    token: v.string(),
    date: v.string(), // "YYYY-MM-DD"
    categoryTypeId: v.id("categoryTypes"), // Type de catégorie obligatoire
    status: v.union(
      v.literal("available"),
      v.literal("partial"),
      v.literal("unavailable")
    ),
    timeSlots: v.optional(
      v.array(
        v.object({
          startTime: v.string(),
          endTime: v.string(),
        })
      )
    ),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const now = Date.now();

    // Vérifier qu'il n'y a pas de créneau collectif qui chevauche (si on rend disponible)
    if (args.status === "available" || args.status === "partial") {
      const conflict = await checkCollectiveSlotsConflict(
        ctx,
        session.userId,
        args.categoryTypeId,
        args.date,
        args.timeSlots
      );

      if (conflict.hasConflict) {
        throw new ConvexError(
          "Vous avez des créneaux collectifs ce jour. Annulez-les avant de vous rendre disponible pour des services individuels."
        );
      }
    }

    // Vérifier si une disponibilité existe déjà pour cette date et ce type
    const existing = await ctx.db
      .query("availability")
      .withIndex("by_user_date_type", (q) =>
        q.eq("userId", session.userId)
         .eq("date", args.date)
         .eq("categoryTypeId", args.categoryTypeId)
      )
      .first();

    if (existing) {
      // Mettre à jour l'existante
      await ctx.db.patch(existing._id, {
        status: args.status,
        timeSlots: args.timeSlots,
        reason: args.reason,
        updatedAt: now,
      });
      return { success: true, id: existing._id };
    } else {
      // Créer une nouvelle entrée
      const id = await ctx.db.insert("availability", {
        userId: session.userId,
        date: args.date,
        categoryTypeId: args.categoryTypeId,
        status: args.status,
        timeSlots: args.timeSlots,
        reason: args.reason,
        createdAt: now,
        updatedAt: now,
      });
      return { success: true, id };
    }
  },
});

/**
 * Définir la disponibilité pour une plage de dates et un type de catégorie
 */
export const setAvailabilityRange = mutation({
  args: {
    token: v.string(),
    startDate: v.string(), // "YYYY-MM-DD"
    endDate: v.string(), // "YYYY-MM-DD"
    categoryTypeId: v.id("categoryTypes"), // Type de catégorie obligatoire
    status: v.union(
      v.literal("available"),
      v.literal("partial"),
      v.literal("unavailable")
    ),
    timeSlots: v.optional(
      v.array(
        v.object({
          startTime: v.string(),
          endTime: v.string(),
        })
      )
    ),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const now = Date.now();

    // Générer toutes les dates de la plage
    const [startYear, startMonth, startDay] = args.startDate.split("-").map(Number);
    const [endYear, endMonth, endDay] = args.endDate.split("-").map(Number);

    const dates: string[] = [];
    const currentDate = new Date(startYear, startMonth - 1, startDay);
    const endDate = new Date(endYear, endMonth - 1, endDay);

    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, "0");
      const day = String(currentDate.getDate()).padStart(2, "0");
      dates.push(`${year}-${month}-${day}`);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Vérifier les conflits avec créneaux collectifs pour chaque date (si on rend disponible)
    if (args.status === "available" || args.status === "partial") {
      for (const date of dates) {
        const conflict = await checkCollectiveSlotsConflict(
          ctx,
          session.userId,
          args.categoryTypeId,
          date,
          args.timeSlots
        );

        if (conflict.hasConflict) {
          throw new ConvexError(
            `Vous avez des créneaux collectifs le ${date}. Annulez-les avant de vous rendre disponible pour des services individuels.`
          );
        }
      }
    }

    // Pour chaque date, créer ou mettre à jour
    for (const date of dates) {
      const existing = await ctx.db
        .query("availability")
        .withIndex("by_user_date_type", (q) =>
          q.eq("userId", session.userId)
           .eq("date", date)
           .eq("categoryTypeId", args.categoryTypeId)
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          status: args.status,
          timeSlots: args.timeSlots,
          reason: args.reason,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("availability", {
          userId: session.userId,
          date,
          categoryTypeId: args.categoryTypeId,
          status: args.status,
          timeSlots: args.timeSlots,
          reason: args.reason,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return { success: true, datesUpdated: dates.length };
  },
});

/**
 * Supprimer une disponibilité pour un type (revenir au statut par défaut = INDISPONIBLE)
 */
export const clearAvailability = mutation({
  args: {
    token: v.string(),
    date: v.string(), // "YYYY-MM-DD"
    categoryTypeId: v.optional(v.id("categoryTypes")),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    if (args.categoryTypeId) {
      // Supprimer pour un type spécifique
      const existing = await ctx.db
        .query("availability")
        .withIndex("by_user_date_type", (q) =>
          q.eq("userId", session.userId)
           .eq("date", args.date)
           .eq("categoryTypeId", args.categoryTypeId)
        )
        .first();

      if (existing) {
        await ctx.db.delete(existing._id);
      }
    } else {
      // Supprimer toutes les entrées pour cette date (compatibilité)
      const existingAll = await ctx.db
        .query("availability")
        .withIndex("by_user_date", (q) =>
          q.eq("userId", session.userId).eq("date", args.date)
        )
        .collect();

      for (const existing of existingAll) {
        await ctx.db.delete(existing._id);
      }
    }

    return { success: true };
  },
});

/**
 * Supprimer les disponibilités pour une plage de dates
 */
export const clearAvailabilityRange = mutation({
  args: {
    token: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    categoryTypeId: v.optional(v.id("categoryTypes")),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    // Récupérer toutes les disponibilités de l'utilisateur dans la plage
    const availabilities = await ctx.db
      .query("availability")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .collect();

    let toDelete = availabilities.filter((a) => {
      return a.date >= args.startDate && a.date <= args.endDate;
    });

    // Filtrer par type si spécifié
    if (args.categoryTypeId) {
      toDelete = toDelete.filter(
        (a) => String(a.categoryTypeId) === String(args.categoryTypeId)
      );
    }

    for (const availability of toDelete) {
      await ctx.db.delete(availability._id);
    }

    return { success: true, deletedCount: toDelete.length };
  },
});

/**
 * Toggle rapide de disponibilité pour un type
 * Par défaut = INDISPONIBLE (pas d'entrée)
 * Si pas d'entrée -> créer "available"
 * Si "available"/"partial" -> supprimer (revenir à indisponible par défaut)
 * Si "unavailable" explicite -> supprimer (revenir à indisponible par défaut)
 */
export const toggleAvailability = mutation({
  args: {
    token: v.string(),
    date: v.string(), // "YYYY-MM-DD"
    categoryTypeId: v.id("categoryTypes"), // Type de catégorie obligatoire
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const now = Date.now();

    const existing = await ctx.db
      .query("availability")
      .withIndex("by_user_date_type", (q) =>
        q.eq("userId", session.userId)
         .eq("date", args.date)
         .eq("categoryTypeId", args.categoryTypeId)
      )
      .first();

    if (existing) {
      if (existing.status === "available" || existing.status === "partial") {
        // Disponible -> supprimer (retour à indisponible par défaut)
        await ctx.db.delete(existing._id);
        return { success: true, newStatus: "unavailable" as const };
      } else {
        // Indisponible explicite -> rendre disponible
        // Vérifier d'abord les conflits avec collectiveSlots
        const conflict = await checkCollectiveSlotsConflict(
          ctx,
          session.userId,
          args.categoryTypeId,
          args.date,
          undefined
        );

        if (conflict.hasConflict) {
          throw new ConvexError(
            "Vous avez des créneaux collectifs ce jour. Annulez-les avant de vous rendre disponible."
          );
        }

        await ctx.db.patch(existing._id, {
          status: "available",
          timeSlots: undefined,
          reason: undefined,
          updatedAt: now,
        });
        return { success: true, newStatus: "available" as const };
      }
    } else {
      // Pas d'entrée = indisponible par défaut -> créer entrée "available"
      // Vérifier d'abord les conflits avec collectiveSlots
      const conflict = await checkCollectiveSlotsConflict(
        ctx,
        session.userId,
        args.categoryTypeId,
        args.date,
        undefined
      );

      if (conflict.hasConflict) {
        throw new ConvexError(
          "Vous avez des créneaux collectifs ce jour. Annulez-les avant de vous rendre disponible."
        );
      }

      await ctx.db.insert("availability", {
        userId: session.userId,
        date: args.date,
        categoryTypeId: args.categoryTypeId,
        status: "available",
        createdAt: now,
        updatedAt: now,
      });
      return { success: true, newStatus: "available" as const };
    }
  },
});

/**
 * Actions rapides : marquer les weekends comme indisponibles pour un type
 * Note: Avec le nouveau système, les weekends sont indisponibles par défaut
 * Cette mutation peut être utilisée pour marquer explicitement
 */
export const setWeekendsUnavailable = mutation({
  args: {
    token: v.string(),
    month: v.number(), // 0-11
    year: v.number(),
    categoryTypeId: v.optional(v.id("categoryTypes")),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const now = Date.now();

    // Trouver tous les weekends du mois
    const firstDay = new Date(args.year, args.month, 1);
    const lastDay = new Date(args.year, args.month + 1, 0);
    const weekendDates: string[] = [];

    const currentDate = new Date(firstDay);
    while (currentDate <= lastDay) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, "0");
        const day = String(currentDate.getDate()).padStart(2, "0");
        weekendDates.push(`${year}-${month}-${day}`);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Si categoryTypeId fourni, supprimer les entrées "available" pour ce type
    // (car par défaut = indisponible, donc supprimer = indisponible)
    if (args.categoryTypeId) {
      for (const date of weekendDates) {
        const existing = await ctx.db
          .query("availability")
          .withIndex("by_user_date_type", (q) =>
            q.eq("userId", session.userId)
             .eq("date", date)
             .eq("categoryTypeId", args.categoryTypeId)
          )
          .first();

        if (existing && (existing.status === "available" || existing.status === "partial")) {
          // Supprimer pour revenir à indisponible par défaut
          await ctx.db.delete(existing._id);
        }
      }
    } else {
      // Compatibilité: marquer explicitement comme indisponible
      for (const date of weekendDates) {
        const existing = await ctx.db
          .query("availability")
          .withIndex("by_user_date", (q) =>
            q.eq("userId", session.userId).eq("date", date)
          )
          .first();

        if (existing) {
          await ctx.db.patch(existing._id, {
            status: "unavailable",
            reason: "Weekend",
            updatedAt: now,
          });
        } else {
          await ctx.db.insert("availability", {
            userId: session.userId,
            date,
            status: "unavailable",
            reason: "Weekend",
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }

    return { success: true, datesUpdated: weekendDates.length };
  },
});

/**
 * Admin: Supprimer une entrée de disponibilité pour un utilisateur spécifique
 */
export const adminClearAvailability = mutation({
  args: {
    adminToken: v.string(),
    userId: v.id("users"),
    date: v.string(), // "YYYY-MM-DD"
    categoryTypeId: v.optional(v.id("categoryTypes")),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.adminToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const admin = await ctx.db.get(session.userId);
    if (!admin || admin.role !== "admin") {
      throw new ConvexError("Accès non autorisé");
    }

    if (args.categoryTypeId) {
      const existing = await ctx.db
        .query("availability")
        .withIndex("by_user_date_type", (q) =>
          q.eq("userId", args.userId)
           .eq("date", args.date)
           .eq("categoryTypeId", args.categoryTypeId)
        )
        .first();

      if (existing) {
        await ctx.db.delete(existing._id);
        return { success: true, deleted: true, previousStatus: existing.status };
      }
    } else {
      const existing = await ctx.db
        .query("availability")
        .withIndex("by_user_date", (q) =>
          q.eq("userId", args.userId).eq("date", args.date)
        )
        .first();

      if (existing) {
        await ctx.db.delete(existing._id);
        return { success: true, deleted: true, previousStatus: existing.status };
      }
    }

    return { success: true, deleted: false, message: "Aucune entrée trouvée pour cette date" };
  },
});

/**
 * Helper: Calculer le jour de la semaine à partir d'une date string "YYYY-MM-DD"
 * Évite les problèmes de timezone en parsant manuellement
 */
function getDayOfWeekFromDateString(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  // Créer la date en local (pas UTC) pour éviter le décalage de timezone
  const date = new Date(year, month - 1, day);
  return date.getDay(); // 0=Dimanche, 1=Lundi, etc.
}

/**
 * Helper: Créer une date locale à partir d'une string "YYYY-MM-DD"
 */
function parseDateStringToLocal(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Dupliquer une semaine type sur une plage de dates
 * Copie les disponibilités d'une semaine source vers toutes les semaines de la plage cible
 */
export const duplicateWeekAvailability = mutation({
  args: {
    token: v.string(),
    sourceWeekStart: v.string(), // "YYYY-MM-DD" - Lundi de la semaine source
    targetStartDate: v.string(), // "YYYY-MM-DD" - Date de début cible
    targetEndDate: v.string(), // "YYYY-MM-DD" - Date de fin cible
    overwriteExisting: v.optional(v.boolean()), // Écraser les entrées existantes
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const now = Date.now();
    const overwrite = args.overwriteExisting ?? true;

    // 1. Récupérer les disponibilités de la semaine source (7 jours)
    const sourceStart = parseDateStringToLocal(args.sourceWeekStart);
    const sourceEnd = new Date(sourceStart);
    sourceEnd.setDate(sourceEnd.getDate() + 6);

    const sourceDates: string[] = [];
    const currentSource = new Date(sourceStart);
    while (currentSource <= sourceEnd) {
      const year = currentSource.getFullYear();
      const month = String(currentSource.getMonth() + 1).padStart(2, "0");
      const day = String(currentSource.getDate()).padStart(2, "0");
      sourceDates.push(`${year}-${month}-${day}`);
      currentSource.setDate(currentSource.getDate() + 1);
    }

    // Récupérer les disponibilités de la semaine source
    const sourceAvailabilities = await ctx.db
      .query("availability")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .collect();

    const sourceByDayOfWeek = new Map<number, typeof sourceAvailabilities>();

    for (const avail of sourceAvailabilities) {
      if (sourceDates.includes(avail.date)) {
        // Utiliser le helper pour éviter les problèmes de timezone
        const dayOfWeek = getDayOfWeekFromDateString(avail.date);
        if (!sourceByDayOfWeek.has(dayOfWeek)) {
          sourceByDayOfWeek.set(dayOfWeek, []);
        }
        sourceByDayOfWeek.get(dayOfWeek)!.push(avail);
      }
    }

    // 2. Générer toutes les dates cibles
    const targetStart = parseDateStringToLocal(args.targetStartDate);
    const targetEnd = parseDateStringToLocal(args.targetEndDate);

    // Vérifier que la période n'est pas trop longue (max 1 an)
    const diffDays = Math.ceil(
      (targetEnd.getTime() - targetStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays > 366) {
      throw new ConvexError("La période cible ne peut pas dépasser 1 an");
    }

    // Exclure les dates passées
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDates: Array<{ date: string; dayOfWeek: number }> = [];
    const currentTarget = new Date(targetStart);

    while (currentTarget <= targetEnd) {
      if (currentTarget >= today) {
        const year = currentTarget.getFullYear();
        const month = String(currentTarget.getMonth() + 1).padStart(2, "0");
        const day = String(currentTarget.getDate()).padStart(2, "0");
        const dateStr = `${year}-${month}-${day}`;
        // Utiliser le helper pour éviter les problèmes de timezone
        const dayOfWeek = getDayOfWeekFromDateString(dateStr);

        // Ne pas inclure les dates de la semaine source
        if (!sourceDates.includes(dateStr)) {
          targetDates.push({ date: dateStr, dayOfWeek });
        }
      }
      currentTarget.setDate(currentTarget.getDate() + 1);
    }

    // 3. Appliquer les disponibilités de la semaine source aux dates cibles
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const { date, dayOfWeek } of targetDates) {
      const sourceForDay = sourceByDayOfWeek.get(dayOfWeek) || [];

      // Si pas de source pour ce jour, supprimer les entrées existantes (retour à indisponible par défaut)
      if (sourceForDay.length === 0) {
        if (overwrite) {
          const existingEntries = await ctx.db
            .query("availability")
            .withIndex("by_user_date", (q) =>
              q.eq("userId", session.userId).eq("date", date)
            )
            .collect();

          for (const entry of existingEntries) {
            await ctx.db.delete(entry._id);
          }
        }
        continue;
      }

      // Appliquer chaque disponibilité source
      for (const sourceAvail of sourceForDay) {
        // Vérifier si une entrée existe déjà pour cette date et ce type
        const existing = sourceAvail.categoryTypeId
          ? await ctx.db
              .query("availability")
              .withIndex("by_user_date_type", (q) =>
                q
                  .eq("userId", session.userId)
                  .eq("date", date)
                  .eq("categoryTypeId", sourceAvail.categoryTypeId)
              )
              .first()
          : await ctx.db
              .query("availability")
              .withIndex("by_user_date", (q) =>
                q.eq("userId", session.userId).eq("date", date)
              )
              .first();

        if (existing) {
          if (overwrite) {
            await ctx.db.patch(existing._id, {
              status: sourceAvail.status,
              timeSlots: sourceAvail.timeSlots,
              reason: sourceAvail.reason,
              updatedAt: now,
            });
            updatedCount++;
          } else {
            skippedCount++;
          }
        } else {
          await ctx.db.insert("availability", {
            userId: session.userId,
            date,
            categoryTypeId: sourceAvail.categoryTypeId,
            status: sourceAvail.status,
            timeSlots: sourceAvail.timeSlots,
            reason: sourceAvail.reason,
            createdAt: now,
            updatedAt: now,
          });
          createdCount++;
        }
      }
    }

    return {
      success: true,
      created: createdCount,
      updated: updatedCount,
      skipped: skippedCount,
      totalDays: targetDates.length,
    };
  },
});

/**
 * Récupérer les disponibilités d'une semaine spécifique (pour aperçu)
 */
export const getWeekAvailability = query({
  args: {
    token: v.string(),
    weekStartDate: v.string(), // "YYYY-MM-DD" - Lundi de la semaine
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return [];
    }

    // Générer les 7 jours de la semaine (utiliser parsing local pour éviter les problèmes de timezone)
    const [startYear, startMonth, startDay] = args.weekStartDate.split("-").map(Number);
    const weekStart = new Date(startYear, startMonth - 1, startDay);
    const weekDates: string[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      weekDates.push(`${year}-${month}-${day}`);
    }

    // Récupérer les disponibilités
    const availabilities = await ctx.db
      .query("availability")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .collect();

    const weekAvailabilities = availabilities.filter((a) =>
      weekDates.includes(a.date)
    );

    return weekAvailabilities.map((a) => ({
      id: a._id,
      date: a.date,
      dayOfWeek: getDayOfWeekFromDateString(a.date),
      categoryTypeId: a.categoryTypeId,
      status: a.status,
      timeSlots: a.timeSlots,
      reason: a.reason,
    }));
  },
});

/**
 * Admin: Lister les disponibilités d'un utilisateur
 */
export const adminGetUserAvailability = query({
  args: {
    adminToken: v.string(),
    userId: v.id("users"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.adminToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return [];
    }

    const admin = await ctx.db.get(session.userId);
    if (!admin || admin.role !== "admin") {
      return [];
    }

    const availabilities = await ctx.db
      .query("availability")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    let filtered = availabilities;
    if (args.startDate || args.endDate) {
      filtered = availabilities.filter((a) => {
        if (args.startDate && a.date < args.startDate) return false;
        if (args.endDate && a.date > args.endDate) return false;
        return true;
      });
    }

    return filtered.map((a) => ({
      id: a._id,
      date: a.date,
      categoryTypeId: a.categoryTypeId,
      status: a.status,
      reason: a.reason,
      timeSlots: a.timeSlots,
    }));
  },
});
