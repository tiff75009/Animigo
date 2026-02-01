import { useMemo } from "react";
import type { ServiceTypeFilter, SessionTypeFilter, AnimalTypeFilter, MonthFilter } from "./MissionsFilters";

interface Mission {
  serviceCategory?: string;
  sessionType?: "individual" | "collective";
  startDate?: string;
  animal?: {
    type?: string;
  };
  // Champs supplémentaires pour la compatibilité
  amount?: number;
  announcerEarnings?: number;
  paymentStatus?: string;
  endDate?: string;
}

// Helper pour extraire le mois d'une date (format YYYY-MM)
function getMonthFromDate(dateStr?: string): string | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    return `${year}-${month}`;
  } catch {
    return null;
  }
}

export function filterMissions<T extends Mission>(
  missions: T[],
  serviceType: ServiceTypeFilter,
  sessionType: SessionTypeFilter,
  animalType: AnimalTypeFilter,
  month: MonthFilter = "all"
): T[] {
  return missions.filter((mission) => {
    // Filtre par type de service
    if (serviceType !== "all") {
      const isGarde =
        mission.serviceCategory === "garde" ||
        mission.serviceCategory === "hébergement";
      if (serviceType === "garde" && !isGarde) return false;
      if (serviceType === "service" && isGarde) return false;
    }

    // Filtre par type de session (seulement pour les services)
    if (sessionType !== "all") {
      const missionSessionType = mission.sessionType || "individual";
      if (sessionType !== missionSessionType) return false;
    }

    // Filtre par type d'animal
    if (animalType !== "all") {
      const missionAnimalType = mission.animal?.type?.toLowerCase();
      if (missionAnimalType !== animalType.toLowerCase()) return false;
    }

    // Filtre par mois
    if (month !== "all") {
      const missionMonth = getMonthFromDate(mission.startDate);
      if (missionMonth !== month) return false;
    }

    return true;
  });
}

export function useMissionFilters<T extends Mission>(
  missions: T[] | undefined,
  serviceType: ServiceTypeFilter,
  sessionType: SessionTypeFilter,
  animalType: AnimalTypeFilter,
  month: MonthFilter = "all"
): T[] {
  return useMemo(() => {
    if (!missions) return [];
    return filterMissions(missions, serviceType, sessionType, animalType, month);
  }, [missions, serviceType, sessionType, animalType, month]);
}
