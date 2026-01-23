// @ts-nocheck
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// Types pour les disponibilités
export type AvailabilityStatus = "available" | "partial" | "unavailable";

export interface TimeSlot {
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
}

/**
 * Récupère les disponibilités pour une plage de dates
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
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

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
      status: availability.status,
      timeSlots: availability.timeSlots,
      reason: availability.reason,
    };
  },
});

/**
 * Définir la disponibilité pour une date
 */
export const setAvailability = mutation({
  args: {
    token: v.string(),
    date: v.string(), // "YYYY-MM-DD"
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

    // Vérifier si une disponibilité existe déjà pour cette date
    const existing = await ctx.db
      .query("availability")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", session.userId).eq("date", args.date)
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
 * Définir la disponibilité pour une plage de dates
 */
export const setAvailabilityRange = mutation({
  args: {
    token: v.string(),
    startDate: v.string(), // "YYYY-MM-DD"
    endDate: v.string(), // "YYYY-MM-DD"
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
    // Parser les dates manuellement pour éviter les problèmes de fuseau horaire
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

    // Pour chaque date, créer ou mettre à jour
    for (const date of dates) {
      const existing = await ctx.db
        .query("availability")
        .withIndex("by_user_date", (q) =>
          q.eq("userId", session.userId).eq("date", date)
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
 * Supprimer une disponibilité (revenir au statut par défaut = disponible)
 */
export const clearAvailability = mutation({
  args: {
    token: v.string(),
    date: v.string(), // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const existing = await ctx.db
      .query("availability")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", session.userId).eq("date", args.date)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
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

    const toDelete = availabilities.filter((a) => {
      return a.date >= args.startDate && a.date <= args.endDate;
    });

    for (const availability of toDelete) {
      await ctx.db.delete(availability._id);
    }

    return { success: true, deletedCount: toDelete.length };
  },
});

/**
 * Toggle rapide de disponibilité (disponible <-> indisponible)
 */
export const toggleAvailability = mutation({
  args: {
    token: v.string(),
    date: v.string(), // "YYYY-MM-DD"
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
      .withIndex("by_user_date", (q) =>
        q.eq("userId", session.userId).eq("date", args.date)
      )
      .first();

    if (existing) {
      if (existing.status === "unavailable") {
        // Si indisponible, supprimer (revenir à disponible par défaut)
        await ctx.db.delete(existing._id);
        return { success: true, newStatus: "available" as const };
      } else {
        // Si disponible ou partiel, passer à indisponible
        await ctx.db.patch(existing._id, {
          status: "unavailable",
          timeSlots: undefined,
          updatedAt: now,
        });
        return { success: true, newStatus: "unavailable" as const };
      }
    } else {
      // Pas d'entrée = disponible par défaut, créer une entrée indisponible
      await ctx.db.insert("availability", {
        userId: session.userId,
        date: args.date,
        status: "unavailable",
        createdAt: now,
        updatedAt: now,
      });
      return { success: true, newStatus: "unavailable" as const };
    }
  },
});

/**
 * Actions rapides : marquer les weekends comme indisponibles
 */
export const setWeekendsUnavailable = mutation({
  args: {
    token: v.string(),
    month: v.number(), // 0-11
    year: v.number(),
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
        // Dimanche ou Samedi - Formater sans toISOString()
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, "0");
        const day = String(currentDate.getDate()).padStart(2, "0");
        weekendDates.push(`${year}-${month}-${day}`);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Marquer chaque weekend comme indisponible
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

    return { success: true, datesUpdated: weekendDates.length };
  },
});

/**
 * Admin: Supprimer une entrée de disponibilité pour un utilisateur spécifique
 * (Utile pour déboguer/corriger les problèmes de disponibilité)
 */
export const adminClearAvailability = mutation({
  args: {
    adminToken: v.string(),
    userId: v.id("users"),
    date: v.string(), // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    // Vérifier que c'est un admin
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

    // Supprimer l'entrée de disponibilité
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

    return { success: true, deleted: false, message: "Aucune entrée trouvée pour cette date" };
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
    // Vérifier que c'est un admin
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

    // Récupérer les disponibilités
    const availabilities = await ctx.db
      .query("availability")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Filtrer par plage de dates si spécifié
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
      status: a.status,
      reason: a.reason,
      timeSlots: a.timeSlots,
    }));
  },
});
