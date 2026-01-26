"use client";

import { useState, useCallback, useMemo } from "react";

// Type pour les créneaux collectifs transformés
export interface CollectiveSlot {
  _id: string;
  variantId: string;
  variantName: string;
  serviceName: string;
  date: string;
  startTime: string;
  endTime: string;
  maxAnimals: number;
  bookedAnimals: number;
  availableSpots: number;
  isActive: boolean;
  isCancelled: boolean;
}
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

// Formate une date en YYYY-MM-DD sans conversion UTC (évite le décalage de fuseau horaire)
function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export type ViewMode = "day" | "week" | "month" | "year";

export interface Mission {
  id: Id<"missions">;
  clientId: Id<"users">;
  clientName: string;
  clientPhone?: string;
  animal: {
    name: string;
    type: string;
    emoji: string;
  };
  serviceName: string;
  serviceCategory: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  status:
    | "pending_acceptance"
    | "pending_confirmation"
    | "upcoming"
    | "in_progress"
    | "completed"
    | "refused"
    | "cancelled";
  amount: number;
  paymentStatus: "not_due" | "pending" | "paid" | "refunded";
  location: string;
  clientNotes?: string;
  announcerNotes?: string;
  cancellationReason?: string;
}

export interface Availability {
  id: Id<"availability">;
  date: string;
  status: "available" | "partial" | "unavailable";
  timeSlots?: Array<{
    startTime: string;
    endTime: string;
  }>;
  reason?: string;
}

export interface MissionStats {
  total: number;
  pending: number;
  upcoming: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  revenue: number;
}

interface UsePlanningOptions {
  token: string | null;
  initialDate?: Date;
  initialViewMode?: ViewMode;
}

export function usePlanning({
  token,
  initialDate = new Date(),
  initialViewMode = "month",
}: UsePlanningOptions) {
  // State pour la navigation
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);

  // Calculer les dates de début et fin selon le mode de vue
  const { startDate, endDate } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const day = currentDate.getDate();

    let start: Date;
    let end: Date;

    switch (viewMode) {
      case "day":
        start = new Date(year, month, day);
        end = new Date(year, month, day);
        break;
      case "week":
        // Début de la semaine (lundi)
        const dayOfWeek = currentDate.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        start = new Date(year, month, day + mondayOffset);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
      case "month":
        start = new Date(year, month, 1);
        end = new Date(year, month + 1, 0);
        break;
      case "year":
        start = new Date(year, 0, 1);
        end = new Date(year, 11, 31);
        break;
      default:
        start = new Date(year, month, 1);
        end = new Date(year, month + 1, 0);
    }

    return {
      startDate: formatDateLocal(start),
      endDate: formatDateLocal(end),
    };
  }, [currentDate, viewMode]);

  // Queries Convex
  const missions = useQuery(
    api.planning.missions.getMissionsByDateRange,
    token ? { token, startDate, endDate } : "skip"
  );

  const availability = useQuery(
    api.planning.availability.getAvailabilityByDateRange,
    token ? { token, startDate, endDate } : "skip"
  );

  // Query pour les créneaux collectifs
  const collectiveSlotsRaw = useQuery(
    api.planning.collectiveSlots.getSlotsByUser,
    token ? { token, startDate, endDate } : "skip"
  );

  // Transformer les créneaux pour ajouter availableSpots et filtrer les annulés
  const collectiveSlots = useMemo(() => {
    if (!collectiveSlotsRaw) return [];
    return collectiveSlotsRaw
      .filter((slot) => !slot.isCancelled && slot.isActive)
      .map((slot) => ({
        ...slot,
        availableSpots: slot.maxAnimals - slot.bookedAnimals,
      }));
  }, [collectiveSlotsRaw]);

  const stats = useQuery(
    api.planning.missions.getMissionStats,
    token
      ? {
          token,
          month: currentDate.getMonth(),
          year: currentDate.getFullYear(),
        }
      : "skip"
  );

  // Mutations
  const acceptMissionMut = useMutation(api.planning.missions.acceptMission);
  const refuseMissionMut = useMutation(api.planning.missions.refuseMission);
  const cancelMissionMut = useMutation(api.planning.missions.cancelMission);
  const completeMissionMut = useMutation(api.planning.missions.completeMission);

  const setAvailabilityMut = useMutation(
    api.planning.availability.setAvailability
  );
  const setAvailabilityRangeMut = useMutation(
    api.planning.availability.setAvailabilityRange
  );
  const toggleAvailabilityMut = useMutation(
    api.planning.availability.toggleAvailability
  );
  const setWeekendsUnavailableMut = useMutation(
    api.planning.availability.setWeekendsUnavailable
  );
  const clearAvailabilityMut = useMutation(
    api.planning.availability.clearAvailability
  );

  // Navigation functions
  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const goToNext = useCallback(() => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      switch (viewMode) {
        case "day":
          newDate.setDate(newDate.getDate() + 1);
          break;
        case "week":
          newDate.setDate(newDate.getDate() + 7);
          break;
        case "month":
          newDate.setMonth(newDate.getMonth() + 1);
          break;
        case "year":
          newDate.setFullYear(newDate.getFullYear() + 1);
          break;
      }
      return newDate;
    });
  }, [viewMode]);

  const goToPrevious = useCallback(() => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      switch (viewMode) {
        case "day":
          newDate.setDate(newDate.getDate() - 1);
          break;
        case "week":
          newDate.setDate(newDate.getDate() - 7);
          break;
        case "month":
          newDate.setMonth(newDate.getMonth() - 1);
          break;
        case "year":
          newDate.setFullYear(newDate.getFullYear() - 1);
          break;
      }
      return newDate;
    });
  }, [viewMode]);

  const goToDate = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  // Mission actions
  const acceptMission = useCallback(
    async (missionId: Id<"missions">) => {
      if (!token) return;
      return acceptMissionMut({ token, missionId });
    },
    [token, acceptMissionMut]
  );

  const refuseMission = useCallback(
    async (missionId: Id<"missions">, reason?: string) => {
      if (!token) return;
      return refuseMissionMut({ token, missionId, reason });
    },
    [token, refuseMissionMut]
  );

  const cancelMission = useCallback(
    async (missionId: Id<"missions">, reason: string) => {
      if (!token) return;
      return cancelMissionMut({ token, missionId, reason });
    },
    [token, cancelMissionMut]
  );

  const completeMission = useCallback(
    async (missionId: Id<"missions">, notes?: string) => {
      if (!token) return;
      return completeMissionMut({ token, missionId, notes });
    },
    [token, completeMissionMut]
  );

  // Availability actions
  const setDayAvailability = useCallback(
    async (
      date: string,
      status: "available" | "partial" | "unavailable",
      options?: {
        timeSlots?: Array<{ startTime: string; endTime: string }>;
        reason?: string;
      }
    ) => {
      if (!token) return;
      return setAvailabilityMut({
        token,
        date,
        status,
        timeSlots: options?.timeSlots,
        reason: options?.reason,
      });
    },
    [token, setAvailabilityMut]
  );

  const setRangeAvailability = useCallback(
    async (
      rangeStartDate: string,
      rangeEndDate: string,
      status: "available" | "partial" | "unavailable",
      options?: {
        timeSlots?: Array<{ startTime: string; endTime: string }>;
        reason?: string;
      }
    ) => {
      if (!token) return;
      return setAvailabilityRangeMut({
        token,
        startDate: rangeStartDate,
        endDate: rangeEndDate,
        status,
        timeSlots: options?.timeSlots,
        reason: options?.reason,
      });
    },
    [token, setAvailabilityRangeMut]
  );

  const toggleDayAvailability = useCallback(
    async (date: string) => {
      if (!token) return;
      return toggleAvailabilityMut({ token, date });
    },
    [token, toggleAvailabilityMut]
  );

  const markWeekendsUnavailable = useCallback(async () => {
    if (!token) return;
    return setWeekendsUnavailableMut({
      token,
      month: currentDate.getMonth(),
      year: currentDate.getFullYear(),
    });
  }, [token, currentDate, setWeekendsUnavailableMut]);

  const clearDayAvailability = useCallback(
    async (date: string) => {
      if (!token) return;
      return clearAvailabilityMut({ token, date });
    },
    [token, clearAvailabilityMut]
  );

  // Helper pour obtenir les missions d'un jour spécifique
  const getMissionsForDay = useCallback(
    (date: string): Mission[] => {
      if (!missions) return [];
      return missions.filter((m: Mission) => m.startDate <= date && m.endDate >= date);
    },
    [missions]
  );

  // Helper pour obtenir le statut de disponibilité d'un jour
  const getAvailabilityForDay = useCallback(
    (date: string): Availability | null => {
      if (!availability) return null;
      return availability.find((a: Availability) => a.date === date) || null;
    },
    [availability]
  );

  // Helper pour obtenir les créneaux collectifs d'un jour
  const getCollectiveSlotsForDay = useCallback(
    (date: string): CollectiveSlot[] => {
      if (!collectiveSlots) return [];
      return collectiveSlots.filter((slot) => slot.date === date);
    },
    [collectiveSlots]
  );

  // Helper pour formater le titre selon la vue
  const getViewTitle = useCallback((): string => {
    const options: Intl.DateTimeFormatOptions = {};

    switch (viewMode) {
      case "day":
        return currentDate.toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      case "week": {
        const weekStart = new Date(startDate);
        const weekEnd = new Date(endDate);
        return `${weekStart.getDate()} - ${weekEnd.getDate()} ${weekEnd.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`;
      }
      case "month":
        return currentDate.toLocaleDateString("fr-FR", {
          month: "long",
          year: "numeric",
        });
      case "year":
        return currentDate.getFullYear().toString();
      default:
        return "";
    }
  }, [currentDate, viewMode, startDate, endDate]);

  return {
    // State
    currentDate,
    viewMode,
    startDate,
    endDate,

    // Data
    missions: missions || [],
    availability: availability || [],
    collectiveSlots: collectiveSlots || [],
    stats: stats || {
      total: 0,
      pending: 0,
      upcoming: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      revenue: 0,
    },
    isLoading: missions === undefined || availability === undefined,

    // Navigation
    setViewMode,
    goToToday,
    goToNext,
    goToPrevious,
    goToDate,
    getViewTitle,

    // Helpers
    getMissionsForDay,
    getAvailabilityForDay,
    getCollectiveSlotsForDay,

    // Mission actions
    acceptMission,
    refuseMission,
    cancelMission,
    completeMission,

    // Availability actions
    setDayAvailability,
    setRangeAvailability,
    toggleDayAvailability,
    markWeekendsUnavailable,
    clearDayAvailability,
  };
}
