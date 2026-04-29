// @ts-nocheck
/**
 * Queries publiques pour aider l'UI client à éviter les conflits de booking.
 *
 * - getMyAnimalBookedDates(animalIds) : retourne tous les créneaux déjà réservés
 *   (missions actives + pendingBookings) pour les animaux donnés. Utilisé par les
 *   calendriers de réservation pour griser les dates indisponibles avant le POST.
 */

import { query } from "../_generated/server";
import { v } from "convex/values";

export const getMyAnimalBookedDates = query({
  args: {
    token: v.string(),
    animalIds: v.array(v.id("animals")),
  },
  handler: async (ctx, args) => {
    if (args.animalIds.length === 0) return [];

    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) return [];

    const animalIdsSet = new Set(args.animalIds.map(String));

    // 1. Missions actives du client
    const missions = await ctx.db
      .query("missions")
      .withIndex("by_client", (q: any) => q.eq("clientId", session.userId))
      .filter((q: any) =>
        q.and(
          q.neq(q.field("status"), "cancelled"),
          q.neq(q.field("status"), "refused"),
          q.neq(q.field("status"), "completed"),
        )
      )
      .collect();

    type BookedSlot = {
      date: string;
      startTime?: string;
      endTime?: string;
      animalId: string;
      source: "mission" | "pending";
      missionId?: string;
      pendingBookingId?: string;
      isMultiDay: boolean;
      endDate?: string;
      serviceName?: string;
    };
    const result: BookedSlot[] = [];

    for (const m of missions) {
      const mAnimalIds: string[] = m.animalIds
        ? m.animalIds.map(String)
        : m.animalId
          ? [String(m.animalId)]
          : [];
      // Garde uniquement les animaux concernés par la requête
      const matchingAnimals = mAnimalIds.filter((aid) => animalIdsSet.has(aid));
      if (matchingAnimals.length === 0) continue;

      // Construire les créneaux selon le type de mission
      const slots: Array<{ date: string; endDate?: string; startTime?: string; endTime?: string }> = [];
      if (m.sessions && m.sessions.length > 0) {
        for (const s of m.sessions) {
          slots.push({ date: s.date, startTime: s.startTime, endTime: s.endTime });
        }
      } else if (m.collectiveSlotIds && m.collectiveSlotIds.length > 0) {
        for (const slotId of m.collectiveSlotIds) {
          const slot = await ctx.db.get(slotId);
          if (slot) slots.push({ date: slot.date, startTime: slot.startTime, endTime: slot.endTime });
        }
      } else {
        const isMultiDay = m.startDate !== m.endDate && !!m.endDate;
        slots.push({
          date: m.startDate,
          endDate: isMultiDay ? m.endDate : undefined,
          startTime: m.startTime,
          endTime: m.endTime,
        });
      }

      // Émettre un BookedSlot par (animal × créneau)
      for (const aid of matchingAnimals) {
        for (const s of slots) {
          result.push({
            date: s.date,
            endDate: s.endDate,
            startTime: s.startTime,
            endTime: s.endTime,
            animalId: aid,
            source: "mission",
            missionId: m._id,
            isMultiDay: !!s.endDate && s.endDate !== s.date,
            serviceName: m.serviceName,
          });
        }
      }
    }

    // 2. PendingBookings non expirés du client
    const now = Date.now();
    const pendingBookings = await ctx.db
      .query("pendingBookings")
      .filter((q: any) => q.eq(q.field("userId"), session.userId))
      .collect();
    const activePending = pendingBookings.filter(
      (pb: any) => (pb.expiresAt || 0) > now && pb.status !== "completed"
    );

    for (const pb of activePending) {
      const pbAnimalIds: string[] = (pb.selectedAnimalIds || []).map(String);
      const matchingAnimals = pbAnimalIds.filter((aid) => animalIdsSet.has(aid));
      if (matchingAnimals.length === 0) continue;

      const slots: Array<{ date: string; endDate?: string; startTime?: string; endTime?: string }> = [];
      if (pb.sessions && pb.sessions.length > 0) {
        for (const s of pb.sessions) {
          slots.push({ date: s.date, startTime: s.startTime, endTime: s.endTime });
        }
      } else if (pb.collectiveSlotIds && pb.collectiveSlotIds.length > 0) {
        for (const slotId of pb.collectiveSlotIds) {
          const slot = await ctx.db.get(slotId);
          if (slot) slots.push({ date: slot.date, startTime: slot.startTime, endTime: slot.endTime });
        }
      } else {
        const isMultiDay = pb.startDate !== pb.endDate && !!pb.endDate;
        slots.push({
          date: pb.startDate,
          endDate: isMultiDay ? pb.endDate : undefined,
          startTime: pb.startTime,
          endTime: pb.endTime,
        });
      }

      for (const aid of matchingAnimals) {
        for (const s of slots) {
          result.push({
            date: s.date,
            endDate: s.endDate,
            startTime: s.startTime,
            endTime: s.endTime,
            animalId: aid,
            source: "pending",
            pendingBookingId: pb._id,
            isMultiDay: !!s.endDate && s.endDate !== s.date,
          });
        }
      }
    }

    return result;
  },
});
