"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  AdvancedFilters,
  defaultAdvancedFilters,
} from "@/app/components/search/FilterSidebar";

// Types
export interface ServiceCategory {
  id: Id<"serviceCategories">;
  slug: string;
  name: string;
  icon?: string;
  imageUrl?: string | null;
  billingType?: "hourly" | "daily" | "flexible";
  allowRangeBooking?: boolean;
  allowOvernightStay?: boolean;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationData {
  text: string;
  coordinates?: Coordinates;
}

export interface SearchFilters {
  category: ServiceCategory | null;
  animalType: string | null;
  location: LocationData;
  radius: number; // Rayon de recherche en km
  // Pour services hourly
  date: string | null; // "YYYY-MM-DD"
  time: string | null; // "HH:MM"
  // Pour services daily
  startDate: string | null; // "YYYY-MM-DD"
  endDate: string | null; // "YYYY-MM-DD"
  // Pour plage horaire (allowRangeBooking + même jour)
  endTime: string | null; // "HH:MM"
  // Options
  includeUnavailable: boolean;
}

export interface AnnouncerResult {
  id: Id<"users">;
  firstName: string;
  lastName: string;
  profileImage?: string | null;
  location: string;
  coordinates?: Coordinates;
  distance?: number;
  rating: number;
  reviewCount: number;
  basePrice?: number;
  verified: boolean;
  acceptedAnimals: string[];
  services: string[];
  availability: {
    status: "available" | "partial" | "unavailable";
    nextAvailable?: string;
    availableSlots?: Array<{ startTime: string; endTime: string }>;
  };
  accountType: string;
  companyType?: string;
  statusType: "particulier" | "micro_entrepreneur" | "professionnel";
}

const initialFilters: SearchFilters = {
  category: null,
  animalType: null,
  location: { text: "" },
  radius: 10, // 10km par défaut
  date: null,
  time: null,
  startDate: null,
  endDate: null,
  endTime: null,
  includeUnavailable: false,
};

export function useSearch() {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(defaultAdvancedFilters);

  // Préparer les arguments pour la query
  const queryArgs = useMemo(() => {
    const args: {
      categorySlug?: string;
      animalType?: string;
      coordinates?: Coordinates;
      radiusKm?: number;
      date?: string;
      time?: string;
      startDate?: string;
      endDate?: string;
      includeUnavailable?: boolean;
      // Filtres avancés
      accountTypes?: string[];
      verifiedOnly?: boolean;
      withPhotoOnly?: boolean;
      hasGarden?: boolean;
      hasVehicle?: boolean;
      ownsAnimals?: string[];
      noAnimals?: boolean;
      priceMin?: number;
      priceMax?: number;
      sortBy?: string;
    } = {};

    if (filters.category) {
      args.categorySlug = filters.category.slug;
    }

    if (filters.animalType) {
      args.animalType = filters.animalType;
    }

    if (filters.location.coordinates) {
      args.coordinates = filters.location.coordinates;
      args.radiusKm = filters.radius;
    }

    // Date unique (hourly)
    if (filters.date) {
      args.date = filters.date;
      if (filters.time) {
        args.time = filters.time;
      }
    }

    // Plage de dates (daily)
    if (filters.startDate && filters.endDate) {
      args.startDate = filters.startDate;
      args.endDate = filters.endDate;
    }

    args.includeUnavailable = filters.includeUnavailable;

    // Filtres avancés
    if (advancedFilters.accountTypes.length > 0) {
      args.accountTypes = advancedFilters.accountTypes;
    }
    if (advancedFilters.verifiedOnly) {
      args.verifiedOnly = true;
    }
    if (advancedFilters.withPhotoOnly) {
      args.withPhotoOnly = true;
    }
    if (advancedFilters.hasGarden !== null) {
      args.hasGarden = advancedFilters.hasGarden;
    }
    if (advancedFilters.hasVehicle !== null) {
      args.hasVehicle = advancedFilters.hasVehicle;
    }
    if (advancedFilters.ownsAnimals.length > 0) {
      args.ownsAnimals = advancedFilters.ownsAnimals;
    }
    if (advancedFilters.noAnimals) {
      args.noAnimals = true;
    }
    if (advancedFilters.priceRange.min !== null) {
      args.priceMin = advancedFilters.priceRange.min;
    }
    if (advancedFilters.priceRange.max !== null) {
      args.priceMax = advancedFilters.priceRange.max;
    }
    if (advancedFilters.sortBy !== "relevance") {
      args.sortBy = advancedFilters.sortBy;
    }

    return args;
  }, [filters, advancedFilters]);

  // Query Convex
  const results = useQuery(api.public.search.searchAnnouncers, queryArgs);

  // Actions
  const setCategory = useCallback((category: ServiceCategory | null) => {
    setFilters((prev) => ({
      ...prev,
      category,
      // Reset les dates quand on change de catégorie
      date: null,
      time: null,
      startDate: null,
      endDate: null,
      endTime: null,
    }));
  }, []);

  const setAnimalType = useCallback((animalType: string | null) => {
    setFilters((prev) => ({ ...prev, animalType }));
  }, []);

  const setLocation = useCallback((location: LocationData) => {
    setFilters((prev) => ({ ...prev, location }));
  }, []);

  const setRadius = useCallback((radius: number) => {
    setFilters((prev) => ({ ...prev, radius }));
  }, []);

  const setDate = useCallback((date: string | null) => {
    setFilters((prev) => ({ ...prev, date }));
  }, []);

  const setTime = useCallback((time: string | null) => {
    setFilters((prev) => ({ ...prev, time }));
  }, []);

  const setEndTime = useCallback((endTime: string | null) => {
    setFilters((prev) => ({ ...prev, endTime }));
  }, []);

  const setDateRange = useCallback(
    (startDate: string | null, endDate: string | null) => {
      setFilters((prev) => ({ ...prev, startDate, endDate }));
    },
    []
  );

  const setIncludeUnavailable = useCallback((include: boolean) => {
    setFilters((prev) => ({ ...prev, includeUnavailable: include }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  // Actions pour filtres avancés
  const updateAdvancedFilters = useCallback((newFilters: AdvancedFilters) => {
    setAdvancedFilters(newFilters);
  }, []);

  const resetAdvancedFilters = useCallback(() => {
    setAdvancedFilters(defaultAdvancedFilters);
  }, []);

  const resetAllFilters = useCallback(() => {
    setFilters(initialFilters);
    setAdvancedFilters(defaultAdvancedFilters);
  }, []);

  return {
    // State
    filters,
    advancedFilters,
    results: results ?? [],
    isLoading: results === undefined,

    // Actions basiques
    setCategory,
    setAnimalType,
    setLocation,
    setRadius,
    setDate,
    setTime,
    setEndTime,
    setDateRange,
    setIncludeUnavailable,
    resetFilters,

    // Actions filtres avancés
    updateAdvancedFilters,
    resetAdvancedFilters,
    resetAllFilters,
  };
}

// Re-export des types pour faciliter l'utilisation
export type { AdvancedFilters };
