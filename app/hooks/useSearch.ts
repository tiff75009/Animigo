"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

// Types
export interface ServiceCategory {
  id: Id<"serviceCategories">;
  slug: string;
  name: string;
  icon?: string;
  imageUrl?: string | null;
  billingType?: "hourly" | "daily" | "flexible";
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
  // Pour services hourly
  date: string | null; // "YYYY-MM-DD"
  time: string | null; // "HH:MM"
  // Pour services daily
  startDate: string | null; // "YYYY-MM-DD"
  endDate: string | null; // "YYYY-MM-DD"
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
  date: null,
  time: null,
  startDate: null,
  endDate: null,
  includeUnavailable: false,
};

export function useSearch() {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);

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
    } = {};

    if (filters.category) {
      args.categorySlug = filters.category.slug;
    }

    if (filters.animalType) {
      args.animalType = filters.animalType;
    }

    if (filters.location.coordinates) {
      args.coordinates = filters.location.coordinates;
      args.radiusKm = 20;
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

    return args;
  }, [filters]);

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
    }));
  }, []);

  const setAnimalType = useCallback((animalType: string | null) => {
    setFilters((prev) => ({ ...prev, animalType }));
  }, []);

  const setLocation = useCallback((location: LocationData) => {
    setFilters((prev) => ({ ...prev, location }));
  }, []);

  const setDate = useCallback((date: string | null) => {
    setFilters((prev) => ({ ...prev, date }));
  }, []);

  const setTime = useCallback((time: string | null) => {
    setFilters((prev) => ({ ...prev, time }));
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

  return {
    // State
    filters,
    results: results ?? [],
    isLoading: results === undefined,

    // Actions
    setCategory,
    setAnimalType,
    setLocation,
    setDate,
    setTime,
    setDateRange,
    setIncludeUnavailable,
    resetFilters,
  };
}
