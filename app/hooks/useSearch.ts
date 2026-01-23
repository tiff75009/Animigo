"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  AdvancedFilters,
  defaultAdvancedFilters,
} from "@/app/components/search/FilterSidebar";

// Type pour les résultats de recherche par service
export interface ServiceResult {
  serviceId: Id<"services">;
  announcerId: Id<"users">;
  announcerSlug: string;
  firstName: string;
  lastName: string;
  profileImage: string | null;
  coverImage: string | null;
  location: string;
  distance?: number;
  rating: number;
  reviewCount: number;
  verified: boolean;
  statusType: "particulier" | "micro_entrepreneur" | "professionnel";
  categorySlug: string;
  categoryName: string;
  categoryIcon: string;
  basePrice: number;
  basePriceUnit: "hour" | "day" | "week" | "month" | "flat";
  animalTypes: string[];
  variants: Array<{
    id: string;
    name: string;
    price: number;
    unit: string;
  }>;
  availability: {
    status: "available" | "partial" | "unavailable";
    nextAvailable?: string;
  };
  // Capacity info for garde categories (when dates are selected)
  capacityInfo?: {
    isCapacityBased: boolean;
    currentCount: number;
    maxCapacity: number;
    remainingCapacity: number;
  };
}

// Types
export interface ServiceCategory {
  id: Id<"serviceCategories">;
  slug: string;
  name: string;
  icon?: string;
  imageUrl?: string | null;
  // Hiérarchie
  parentCategoryId?: Id<"serviceCategories">;
  parentName?: string;
  isParent?: boolean;
  // Métier (uniquement pour les sous-catégories)
  billingType?: "hourly" | "daily" | "flexible";
  allowRangeBooking?: boolean;
  allowOvernightStay?: boolean;
  allowedPriceUnits?: ("hour" | "day" | "week" | "month")[];
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
  // Mode de recherche
  searchMode: "garde" | "services" | null;
}

export interface AnnouncerResult {
  id: Id<"users">;
  firstName: string;
  lastName: string;
  profileImage?: string | null; // Avatar
  coverImage?: string | null; // Photo de couverture
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
  searchMode: "garde", // Par défaut en mode garde
};

export function useSearch() {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(defaultAdvancedFilters);

  // Préparer les arguments pour la query
  const queryArgs = useMemo(() => {
    const args: {
      categorySlug?: string;
      excludeCategory?: string;
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

    // Appliquer le mode de recherche
    if (filters.searchMode === "garde") {
      // Mode garde: filtrer uniquement les gardes
      args.categorySlug = "garde";
    } else if (filters.searchMode === "services") {
      // Mode services: exclure les gardes, ou filtrer par catégorie spécifique
      if (filters.category) {
        args.categorySlug = filters.category.slug;
      } else {
        args.excludeCategory = "garde";
      }
    } else if (filters.category) {
      // Mode null ou pas de mode: utiliser la catégorie sélectionnée
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

  const setSearchMode = useCallback((mode: "garde" | "services" | null) => {
    setFilters((prev) => ({
      ...prev,
      searchMode: mode,
      // Reset la catégorie quand on change de mode
      category: null,
    }));
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
    setSearchMode,
    resetFilters,

    // Actions filtres avancés
    updateAdvancedFilters,
    resetAdvancedFilters,
    resetAllFilters,
  };
}

// Hook pour la recherche par service (1 carte par service)
export function useServiceSearch(token?: string | null) {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(defaultAdvancedFilters);

  // Récupérer les coordonnées du profil client (si connecté)
  const clientLocation = useQuery(
    api.client.profile.getClientCoordinates,
    token ? { token } : "skip"
  );

  // Préparer les arguments pour la query
  const queryArgs = useMemo(() => {
    const args: {
      categorySlug?: string;
      excludeCategory?: string;
      animalType?: string;
      coordinates?: Coordinates;
      radiusKm?: number;
      date?: string;
      time?: string;
      startDate?: string;
      endDate?: string;
      includeUnavailable?: boolean;
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

    // Appliquer le mode de recherche
    if (filters.searchMode === "garde") {
      args.categorySlug = "garde";
    } else if (filters.searchMode === "services") {
      if (filters.category) {
        args.categorySlug = filters.category.slug;
      } else {
        args.excludeCategory = "garde";
      }
    } else if (filters.category) {
      args.categorySlug = filters.category.slug;
    }

    if (filters.animalType) {
      args.animalType = filters.animalType;
    }

    // Utiliser les coordonnées manuelles OU celles du profil client
    if (filters.location.coordinates) {
      args.coordinates = filters.location.coordinates;
      args.radiusKm = filters.radius;
    } else if (clientLocation?.coordinates) {
      // Fallback: utiliser les coordonnées du profil client
      args.coordinates = clientLocation.coordinates;
      args.radiusKm = filters.radius;
    }

    if (filters.date) {
      args.date = filters.date;
      if (filters.time) {
        args.time = filters.time;
      }
    }

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
  }, [filters, advancedFilters, clientLocation]);

  // Query Convex - utiliser searchServices au lieu de searchAnnouncers
  const results = useQuery(api.public.search.searchServices, queryArgs);

  // Actions
  const setCategory = useCallback((category: ServiceCategory | null) => {
    setFilters((prev) => ({
      ...prev,
      category,
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

  const setSearchMode = useCallback((mode: "garde" | "services" | null) => {
    setFilters((prev) => ({
      ...prev,
      searchMode: mode,
      category: null,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

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

  // Reset date filters
  const resetDateFilters = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      date: null,
      time: null,
      startDate: null,
      endDate: null,
      endTime: null,
    }));
  }, []);

  return {
    filters,
    advancedFilters,
    results: (results ?? []) as ServiceResult[],
    isLoading: results === undefined,
    // Coordonnées client (pour afficher l'adresse par défaut)
    clientLocation: clientLocation ?? null,
    setCategory,
    setAnimalType,
    setLocation,
    setRadius,
    setDate,
    setTime,
    setEndTime,
    setDateRange,
    setIncludeUnavailable,
    setSearchMode,
    resetFilters,
    resetDateFilters,
    updateAdvancedFilters,
    resetAdvancedFilters,
    resetAllFilters,
  };
}

// Hook pour la recherche avec params URL (nuqs)
export interface UrlSearchParams {
  searchMode: "garde" | "services";
  animalType: string | null;
  categorySlug: string | null;
  radius: number;
  date: string | null;
  startDate: string | null;
  endDate: string | null;
}

export function useServiceSearchWithParams(token: string | null | undefined, urlParams: UrlSearchParams) {
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(defaultAdvancedFilters);
  const [location, setLocationState] = useState<LocationData>({ text: "" });

  // Récupérer les coordonnées du profil client (si connecté)
  const clientLocation = useQuery(
    api.client.profile.getClientCoordinates,
    token ? { token } : "skip"
  );

  // Récupérer la catégorie complète à partir du slug
  const categoriesData = useQuery(api.admin.serviceCategories.getActiveCategories);

  // Find category from slug
  const category = useMemo(() => {
    if (!urlParams.categorySlug || !categoriesData) return null;

    // Check in parent categories' subcategories
    for (const parent of categoriesData.parentCategories) {
      const found = parent.subcategories.find((sub: { slug: string }) => sub.slug === urlParams.categorySlug);
      if (found) {
        return {
          id: found.id,
          slug: found.slug,
          name: found.name,
          icon: found.icon || "📋",
          imageUrl: found.imageUrl ?? undefined,
          billingType: found.billingType as "hourly" | "daily" | "flexible" | undefined,
        };
      }
    }

    // Check in root categories
    const rootFound = categoriesData.rootCategories.find((cat: { slug: string }) => cat.slug === urlParams.categorySlug);
    if (rootFound) {
      return {
        id: rootFound.id,
        slug: rootFound.slug,
        name: rootFound.name,
        icon: rootFound.icon || "📋",
        imageUrl: rootFound.imageUrl ?? undefined,
        billingType: rootFound.billingType as "hourly" | "daily" | "flexible" | undefined,
      };
    }

    return null;
  }, [urlParams.categorySlug, categoriesData]);

  // Build filters object from URL params
  const filters: SearchFilters = useMemo(() => ({
    category,
    animalType: urlParams.animalType,
    location,
    radius: urlParams.radius,
    date: urlParams.date,
    time: null,
    startDate: urlParams.startDate,
    endDate: urlParams.endDate,
    endTime: null,
    includeUnavailable: false,
    searchMode: urlParams.searchMode,
  }), [category, urlParams, location]);

  // Préparer les arguments pour la query
  const queryArgs = useMemo(() => {
    const args: {
      categorySlug?: string;
      excludeCategory?: string;
      animalType?: string;
      coordinates?: Coordinates;
      radiusKm?: number;
      date?: string;
      time?: string;
      startDate?: string;
      endDate?: string;
      includeUnavailable?: boolean;
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

    // Appliquer le mode de recherche
    if (urlParams.searchMode === "garde") {
      args.categorySlug = "garde";
    } else if (urlParams.searchMode === "services") {
      if (urlParams.categorySlug) {
        args.categorySlug = urlParams.categorySlug;
      } else {
        args.excludeCategory = "garde";
      }
    }

    if (urlParams.animalType) {
      args.animalType = urlParams.animalType;
    }

    // Utiliser les coordonnées manuelles OU celles du profil client
    if (location.coordinates) {
      args.coordinates = location.coordinates;
      args.radiusKm = urlParams.radius;
    } else if (clientLocation?.coordinates) {
      args.coordinates = clientLocation.coordinates;
      args.radiusKm = urlParams.radius;
    }

    if (urlParams.date) {
      args.date = urlParams.date;
    }

    if (urlParams.startDate && urlParams.endDate) {
      args.startDate = urlParams.startDate;
      args.endDate = urlParams.endDate;
    }

    args.includeUnavailable = false;

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
  }, [urlParams, location, clientLocation, advancedFilters]);

  // Query Convex
  const results = useQuery(api.public.search.searchServices, queryArgs);

  // Actions
  const setLocation = useCallback((loc: LocationData) => {
    setLocationState(loc);
  }, []);

  const updateAdvancedFilters = useCallback((newFilters: AdvancedFilters) => {
    setAdvancedFilters(newFilters);
  }, []);

  const resetAdvancedFilters = useCallback(() => {
    setAdvancedFilters(defaultAdvancedFilters);
  }, []);

  return {
    filters,
    advancedFilters,
    results: (results ?? []) as ServiceResult[],
    isLoading: results === undefined,
    clientLocation: clientLocation ?? null,
    setLocation,
    updateAdvancedFilters,
    resetAdvancedFilters,
  };
}

// Re-export des types pour faciliter l'utilisation
export type { AdvancedFilters };
