"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  AdvancedFilters,
  defaultAdvancedFilters,
} from "@/app/components/search/FilterSidebar";
import {
  generateCacheKey,
  getFromCache,
  setInCache,
} from "./useSearchCache";

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
  coordinates: { lat: number; lng: number } | null;
  distance?: number;
  rating: number;
  reviewCount: number;
  verified: boolean;
  isIdentityVerified: boolean;
  statusType: "particulier" | "micro_entrepreneur" | "professionnel";
  categorySlug: string;
  categoryName: string;
  categoryIcon: string;
  basePrice: number;
  basePriceUnit: "hour" | "day" | "week" | "month" | "flat";
  animalTypes: string[];
  serviceLocation?: "announcer_home" | "client_home" | "both";
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

export interface NextSlot {
  date: string;
  startTime: string;
  endTime?: string;
}

export interface CollectiveSlotInfo {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  spotsLeft: number;
  formule: string;
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
    nextSlot?: NextSlot;
    collectiveSlots?: CollectiveSlotInfo[];
    availableSlots?: Array<{ startTime: string; endTime: string }>;
  };
  accountType: string;
  companyType?: string;
  statusType: "particulier" | "micro_entrepreneur" | "professionnel";
}

// Type pour les résultats de recherche par formule
export interface FormuleResult {
  formuleId: string;
  formuleName: string;
  formuleDescription?: string;
  price: number;
  priceUnit: string;
  duration?: number;
  sessionType: "individual" | "collective";
  serviceLocation?: "announcer_home" | "client_home" | "both";
  numberOfSessions?: number;
  serviceId: string;
  categorySlug: string;
  categoryName: string;
  categoryIcon?: string;
  animalTypes: string[];
  announcerId: string;
  announcerSlug?: string;
  announcerFirstName: string;
  announcerLastName: string;
  announcerProfileImage?: string | null;
  announcerRating: number;
  announcerReviewCount: number;
  announcerLocation: string;
  announcerDistance?: number;
  announcerVerified: boolean;
  announcerStatusType: "particulier" | "micro_entrepreneur" | "professionnel";
  nextSlot?: NextSlot;
  collectiveSlots?: CollectiveSlotInfo[];
  spotsLeft?: number;
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

// Taille de page commune pour tous les hooks
const PAGE_SIZE = 20;

export function useSearch() {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(defaultAdvancedFilters);
  const [results, setResults] = useState<AnnouncerResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  // Action Redis pour la recherche
  const searchAction = useAction(api.public.searchWithRedis.searchAnnouncersAction);
  const lastArgsRef = useRef<string>("");

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

  // Exécuter l'action quand les args changent (reset pagination)
  useEffect(() => {
    const argsKey = JSON.stringify(queryArgs);
    if (argsKey === lastArgsRef.current) return;
    lastArgsRef.current = argsKey;

    // Reset pagination when filters change
    setOffset(0);
    setHasMore(true);

    // Vérifier le cache d'abord
    const cacheKey = generateCacheKey("announcers", { ...queryArgs, offset: 0 });
    const cached = getFromCache<AnnouncerResult[]>(cacheKey);

    if (cached) {
      setResults(cached);
      setHasMore(cached.length === PAGE_SIZE);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    searchAction({ ...queryArgs, limit: PAGE_SIZE, offset: 0 })
      .then((data) => {
        const newResults = data as AnnouncerResult[];
        setResults(newResults);
        setHasMore(newResults.length === PAGE_SIZE);
        // Mettre en cache
        setInCache(cacheKey, newResults);
      })
      .catch((err) => {
        console.error("[useSearch] Action error:", err);
        setResults([]);
        setHasMore(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [queryArgs, searchAction]);

  // Charger plus de résultats
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;

    const newOffset = offset + PAGE_SIZE;

    // Vérifier le cache d'abord
    const cacheKey = generateCacheKey("announcers", { ...queryArgs, offset: newOffset });
    const cached = getFromCache<AnnouncerResult[]>(cacheKey);

    if (cached) {
      setResults((prev) => [...prev, ...cached]);
      setOffset(newOffset);
      setHasMore(cached.length === PAGE_SIZE);
      return;
    }

    setIsLoadingMore(true);

    searchAction({ ...queryArgs, limit: PAGE_SIZE, offset: newOffset })
      .then((data) => {
        const newResults = data as AnnouncerResult[];
        setResults((prev) => [...prev, ...newResults]);
        setOffset(newOffset);
        setHasMore(newResults.length === PAGE_SIZE);
        // Mettre en cache
        setInCache(cacheKey, newResults);
      })
      .catch((err) => {
        console.error("[useSearch] LoadMore error:", err);
      })
      .finally(() => {
        setIsLoadingMore(false);
      });
  }, [queryArgs, searchAction, offset, isLoadingMore, hasMore]);

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
    results,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,

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
  const [results, setResults] = useState<ServiceResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  // Action Redis pour la recherche
  const searchAction = useAction(api.public.searchWithRedis.searchServicesAction);
  const lastArgsRef = useRef<string>("");

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
      serviceLocation?: ("announcer_home" | "client_home")[];
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
    if (advancedFilters.serviceLocation && advancedFilters.serviceLocation.length > 0) {
      args.serviceLocation = advancedFilters.serviceLocation;
    }

    return args;
  }, [filters, advancedFilters, clientLocation]);

  // Exécuter l'action quand les args changent (reset pagination)
  useEffect(() => {
    const argsKey = JSON.stringify(queryArgs);
    if (argsKey === lastArgsRef.current) return;
    lastArgsRef.current = argsKey;

    // Reset pagination when filters change
    setOffset(0);
    setHasMore(true);

    // Vérifier le cache d'abord
    const cacheKey = generateCacheKey("services", { ...queryArgs, offset: 0 });
    const cached = getFromCache<ServiceResult[]>(cacheKey);

    if (cached) {
      setResults(cached);
      setHasMore(cached.length === PAGE_SIZE);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    searchAction({ ...queryArgs, limit: PAGE_SIZE, offset: 0 })
      .then((data) => {
        const newResults = data as ServiceResult[];
        setResults(newResults);
        setHasMore(newResults.length === PAGE_SIZE);
        // Mettre en cache
        setInCache(cacheKey, newResults);
      })
      .catch((err) => {
        console.error("[useServiceSearch] Action error:", err);
        setResults([]);
        setHasMore(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [queryArgs, searchAction]);

  // Charger plus de résultats
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;

    const newOffset = offset + PAGE_SIZE;

    // Vérifier le cache d'abord
    const cacheKey = generateCacheKey("services", { ...queryArgs, offset: newOffset });
    const cached = getFromCache<ServiceResult[]>(cacheKey);

    if (cached) {
      setResults((prev) => [...prev, ...cached]);
      setOffset(newOffset);
      setHasMore(cached.length === PAGE_SIZE);
      return;
    }

    setIsLoadingMore(true);

    searchAction({ ...queryArgs, limit: PAGE_SIZE, offset: newOffset })
      .then((data) => {
        const newResults = data as ServiceResult[];
        setResults((prev) => [...prev, ...newResults]);
        setOffset(newOffset);
        setHasMore(newResults.length === PAGE_SIZE);
        // Mettre en cache
        setInCache(cacheKey, newResults);
      })
      .catch((err) => {
        console.error("[useServiceSearch] LoadMore error:", err);
      })
      .finally(() => {
        setIsLoadingMore(false);
      });
  }, [queryArgs, searchAction, offset, isLoadingMore, hasMore]);

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
    results,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
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
  const [results, setResults] = useState<ServiceResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  // Action Redis pour la recherche
  const searchAction = useAction(api.public.searchWithRedis.searchServicesAction);
  const lastArgsRef = useRef<string>("");

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
      serviceLocation?: ("announcer_home" | "client_home")[];
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
    if (advancedFilters.serviceLocation && advancedFilters.serviceLocation.length > 0) {
      args.serviceLocation = advancedFilters.serviceLocation;
    }

    return args;
  }, [urlParams, location, clientLocation, advancedFilters]);

  // Exécuter l'action quand les args changent (reset pagination)
  useEffect(() => {
    const argsKey = JSON.stringify(queryArgs);
    if (argsKey === lastArgsRef.current) return;
    lastArgsRef.current = argsKey;

    // Reset pagination when filters change
    setOffset(0);
    setHasMore(true);

    // Vérifier le cache d'abord
    const cacheKey = generateCacheKey("servicesWithParams", { ...queryArgs, offset: 0 });
    const cached = getFromCache<ServiceResult[]>(cacheKey);

    if (cached) {
      setResults(cached);
      setHasMore(cached.length === PAGE_SIZE);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    searchAction({ ...queryArgs, limit: PAGE_SIZE, offset: 0 })
      .then((data) => {
        const newResults = data as ServiceResult[];
        setResults(newResults);
        setHasMore(newResults.length === PAGE_SIZE);
        // Mettre en cache
        setInCache(cacheKey, newResults);
      })
      .catch((err) => {
        console.error("[useServiceSearchWithParams] Action error:", err);
        setResults([]);
        setHasMore(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [queryArgs, searchAction]);

  // Charger plus de résultats
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;

    const newOffset = offset + PAGE_SIZE;

    // Vérifier le cache d'abord
    const cacheKey = generateCacheKey("servicesWithParams", { ...queryArgs, offset: newOffset });
    const cached = getFromCache<ServiceResult[]>(cacheKey);

    if (cached) {
      setResults((prev) => [...prev, ...cached]);
      setOffset(newOffset);
      setHasMore(cached.length === PAGE_SIZE);
      return;
    }

    setIsLoadingMore(true);

    searchAction({ ...queryArgs, limit: PAGE_SIZE, offset: newOffset })
      .then((data) => {
        const newResults = data as ServiceResult[];
        setResults((prev) => [...prev, ...newResults]);
        setOffset(newOffset);
        setHasMore(newResults.length === PAGE_SIZE);
        // Mettre en cache
        setInCache(cacheKey, newResults);
      })
      .catch((err) => {
        console.error("[useServiceSearchWithParams] LoadMore error:", err);
      })
      .finally(() => {
        setIsLoadingMore(false);
      });
  }, [queryArgs, searchAction, offset, isLoadingMore, hasMore]);

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
    results,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    clientLocation: clientLocation ?? null,
    setLocation,
    updateAdvancedFilters,
    resetAdvancedFilters,
  };
}

// Hook pour la recherche par formule (affiche les formules au lieu des annonceurs)
export function useFormuleSearch() {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(defaultAdvancedFilters);
  const [results, setResults] = useState<FormuleResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  // Action Redis pour la recherche
  const searchAction = useAction(api.public.searchWithRedis.searchFormulesAction);
  const lastArgsRef = useRef<string>("");

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
      sessionType?: "individual" | "collective";
      serviceLocation?: ("announcer_home" | "client_home")[];
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

    if (filters.location.coordinates) {
      args.coordinates = filters.location.coordinates;
      args.radiusKm = filters.radius;
    }

    if (filters.date) {
      args.date = filters.date;
      if (filters.time) {
        args.time = filters.time;
      }
    }

    // Filtres avancés
    if (advancedFilters.priceRange.min !== null) {
      args.priceMin = advancedFilters.priceRange.min;
    }
    if (advancedFilters.priceRange.max !== null) {
      args.priceMax = advancedFilters.priceRange.max;
    }
    if (advancedFilters.sortBy !== "relevance") {
      args.sortBy = advancedFilters.sortBy;
    }
    if (advancedFilters.serviceLocation && advancedFilters.serviceLocation.length > 0) {
      args.serviceLocation = advancedFilters.serviceLocation;
    }

    return args;
  }, [filters, advancedFilters]);

  // Exécuter l'action quand les args changent (reset pagination)
  useEffect(() => {
    const argsKey = JSON.stringify(queryArgs);
    if (argsKey === lastArgsRef.current) return;
    lastArgsRef.current = argsKey;

    // Reset pagination when filters change
    setOffset(0);
    setHasMore(true);

    // Vérifier le cache d'abord
    const cacheKey = generateCacheKey("formules", { ...queryArgs, offset: 0 });
    const cached = getFromCache<FormuleResult[]>(cacheKey);

    if (cached) {
      setResults(cached);
      setHasMore(cached.length === PAGE_SIZE);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    searchAction({ ...queryArgs, limit: PAGE_SIZE, offset: 0 })
      .then((data) => {
        const newResults = data as FormuleResult[];
        setResults(newResults);
        setHasMore(newResults.length === PAGE_SIZE);
        // Mettre en cache
        setInCache(cacheKey, newResults);
      })
      .catch((err) => {
        console.error("[useFormuleSearch] Action error:", err);
        setResults([]);
        setHasMore(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [queryArgs, searchAction]);

  // Charger plus de résultats
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;

    const newOffset = offset + PAGE_SIZE;

    // Vérifier le cache d'abord
    const cacheKey = generateCacheKey("formules", { ...queryArgs, offset: newOffset });
    const cached = getFromCache<FormuleResult[]>(cacheKey);

    if (cached) {
      setResults((prev) => [...prev, ...cached]);
      setOffset(newOffset);
      setHasMore(cached.length === PAGE_SIZE);
      return;
    }

    setIsLoadingMore(true);

    searchAction({ ...queryArgs, limit: PAGE_SIZE, offset: newOffset })
      .then((data) => {
        const newResults = data as FormuleResult[];
        setResults((prev) => [...prev, ...newResults]);
        setOffset(newOffset);
        setHasMore(newResults.length === PAGE_SIZE);
        // Mettre en cache
        setInCache(cacheKey, newResults);
      })
      .catch((err) => {
        console.error("[useFormuleSearch] LoadMore error:", err);
      })
      .finally(() => {
        setIsLoadingMore(false);
      });
  }, [queryArgs, searchAction, offset, isLoadingMore, hasMore]);

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

  return {
    filters,
    advancedFilters,
    results,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    setCategory,
    setAnimalType,
    setLocation,
    setRadius,
    setDate,
    setTime,
    setSearchMode,
    resetFilters,
    updateAdvancedFilters,
    resetAdvancedFilters,
    resetAllFilters,
  };
}

// Re-export des types pour faciliter l'utilisation
export type { AdvancedFilters };

// Re-export des utilitaires de cache pour permettre l'invalidation manuelle
export {
  clearCache as clearSearchCache,
  invalidateCacheByPrefix,
  getCacheStats,
} from "./useSearchCache";
