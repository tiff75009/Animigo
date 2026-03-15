"use client";

import { useMemo } from "react";
import { X, Users, Home, MapPin } from "lucide-react";
import { cn } from "@/app/lib/utils";
import type { ServiceData, FormuleData } from "../types";

const ANIMAL_LABELS: Record<string, string> = {
  chien: "Chien",
  chat: "Chat",
  oiseau: "Oiseau",
  rongeur: "Rongeur",
  reptile: "Reptile",
  poisson: "Poisson",
  nac: "NAC",
};

interface FormuleFiltersProps {
  services: ServiceData[];
  filterSessionType: "all" | "individual" | "collective";
  filterLocation: "all" | "announcer_home" | "client_home" | "both";
  filterAnimal: string;
  onFilterSessionTypeChange: (value: "all" | "individual" | "collective") => void;
  onFilterLocationChange: (value: "all" | "announcer_home" | "client_home" | "both") => void;
  onFilterAnimalChange: (value: string) => void;
  onReset: () => void;
}

export default function FormuleFilters({
  services,
  filterSessionType,
  filterLocation,
  filterAnimal,
  onFilterSessionTypeChange,
  onFilterLocationChange,
  onFilterAnimalChange,
  onReset,
}: FormuleFiltersProps) {
  const allAnimalsInFormules = useMemo(() => {
    const animals = new Set<string>();
    services.forEach((service) => {
      service.formules.forEach((formule) => {
        formule.animalTypes?.forEach((type: string) => animals.add(type));
      });
    });
    return Array.from(animals);
  }, [services]);

  const hasActiveFilters =
    filterSessionType !== "all" || filterLocation !== "all" || filterAnimal !== "all";

  if (!services.some((s) => s.formules.length > 1)) return null;

  return (
    <div className="flex flex-wrap gap-2 pb-3 border-b border-gray-100">
      {/* Type de séance */}
      <button
        onClick={() =>
          onFilterSessionTypeChange(filterSessionType === "individual" ? "all" : "individual")
        }
        className={cn(
          "inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition-all",
          filterSessionType === "individual"
            ? "bg-primary text-white border-primary"
            : "bg-white text-gray-600 border-gray-200"
        )}
      >
        <Users className="w-3 h-3" />
        Individuel
      </button>
      <button
        onClick={() =>
          onFilterSessionTypeChange(filterSessionType === "collective" ? "all" : "collective")
        }
        className={cn(
          "inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition-all",
          filterSessionType === "collective"
            ? "bg-primary text-white border-primary"
            : "bg-white text-gray-600 border-gray-200"
        )}
      >
        <Users className="w-3 h-3" />
        Collectif
      </button>

      <span className="w-px h-5 bg-gray-200" />

      {/* Lieu */}
      <button
        onClick={() =>
          onFilterLocationChange(filterLocation === "announcer_home" ? "all" : "announcer_home")
        }
        className={cn(
          "inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition-all",
          filterLocation === "announcer_home"
            ? "bg-secondary text-white border-secondary"
            : "bg-white text-gray-600 border-gray-200"
        )}
      >
        <Home className="w-3 h-3" />
        Chez le pro
      </button>
      <button
        onClick={() =>
          onFilterLocationChange(filterLocation === "client_home" ? "all" : "client_home")
        }
        className={cn(
          "inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition-all",
          filterLocation === "client_home"
            ? "bg-secondary text-white border-secondary"
            : "bg-white text-gray-600 border-gray-200"
        )}
      >
        <MapPin className="w-3 h-3" />
        À domicile
      </button>

      {/* Animal */}
      {allAnimalsInFormules.length > 0 && (
        <>
          <span className="w-px h-5 bg-gray-200" />
          <select
            value={filterAnimal}
            onChange={(e) => onFilterAnimalChange(e.target.value)}
            className={cn(
              "px-2.5 py-1 text-xs rounded-full border transition-all appearance-none pr-6 cursor-pointer",
              filterAnimal !== "all"
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-white text-gray-600 border-gray-200"
            )}
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")",
              backgroundPosition: "right 0.25rem center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "1em 1em",
            }}
          >
            <option value="all">Animal</option>
            {allAnimalsInFormules.map((animal) => (
              <option key={animal} value={animal}>
                {ANIMAL_LABELS[animal] || animal}
              </option>
            ))}
          </select>
        </>
      )}

      {/* Reset */}
      {hasActiveFilters && (
        <button
          onClick={onReset}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-primary transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

/** Helper partagé pour filtrer les formules */
export function getFilteredFormules(
  formules: FormuleData[],
  filterSessionType: "all" | "individual" | "collective",
  filterLocation: "all" | "announcer_home" | "client_home" | "both",
  filterAnimal: string
): FormuleData[] {
  return formules.filter((formule) => {
    if (filterSessionType !== "all") {
      const isCollective = formule.sessionType === "collective";
      if (filterSessionType === "collective" && !isCollective) return false;
      if (filterSessionType === "individual" && isCollective) return false;
    }
    if (filterLocation !== "all") {
      const formuleLocation = formule.serviceLocation || "both";
      if (filterLocation !== "both" && formuleLocation !== "both" && formuleLocation !== filterLocation)
        return false;
    }
    if (filterAnimal !== "all") {
      const formuleAnimals = formule.animalTypes || [];
      if (formuleAnimals.length > 0 && !formuleAnimals.includes(filterAnimal)) return false;
    }
    return true;
  });
}
