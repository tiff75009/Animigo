"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useAction } from "convex/react";
import { useQueryStates, parseAsString, parseAsInteger, parseAsStringLiteral } from "nuqs";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/app/hooks/useAuth";
import { useGeolocation } from "@/app/hooks/useGeolocation";
import {
  ChevronDown,
  SlidersHorizontal,
  Calendar,
  X,
  Sparkles,
  Layers,
  Home,
  Scissors,
  Minus,
  Plus,
  PawPrint,
  ChevronRight,
  LayoutGrid,
  List,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { DatePickerDropdown } from "./components/DatePickerDropdown";
import { useFormuleSearch, type FormuleResult } from "@/app/hooks/useSearch";
import { Id } from "@/convex/_generated/dataModel";

// Type for main search mode
type SearchMode = "garde" | "services";

interface ServiceCategory {
  id: Id<"serviceCategories">;
  slug: string;
  name: string;
  icon: string;
  imageUrl?: string;
  billingType?: "hourly" | "daily" | "flexible";
}

// Types pour la structure hiérarchique retournée par getActiveCategories
interface SubcategoryData {
  id: Id<"serviceCategories">;
  slug: string;
  name: string;
  icon?: string;
  imageUrl?: string | null;
  billingType?: string;
}

interface ParentCategoryData {
  id: Id<"serviceCategories">;
  slug: string;
  name: string;
  icon?: string;
  imageUrl?: string | null;
  subcategories: SubcategoryData[];
}

interface CategoriesData {
  parentCategories: ParentCategoryData[];
  rootCategories: SubcategoryData[];
}
import { Navbar } from "@/app/components/navbar";
import FilterSidebar from "@/app/components/search/FilterSidebar";
import { ANIMAL_TYPES } from "@/app/components/platform";
import { FormuleCardGrid, FormuleCardList, AnnouncerCarouselCard, type AnnouncerGroup, type SearchDates, computeTotalPrice, getPriceWithCommission } from "@/app/components/platform/FormuleCard";
import { formatPrice } from "@/app/components/platform/helpers";
import PawLoader from "@/app/components/ui/PawLoader";
import { FilterDropdown, ViewModeToggle, EmptyState } from "./components/SearchComponents";
import { LocationBar } from "./components/LocationBar";

// Résumé prix minimum pour la garde
function SearchSummary({ results, searchDates }: { results: FormuleResult[]; searchDates: SearchDates }) {
  const summary = useMemo(() => {
    if (results.length === 0) return null;

    const hasDateRange = !!(searchDates?.startDate && searchDates?.endDate);

    let minPrice = Infinity;
    let minLabel = "";

    for (const f of results) {
      if (hasDateRange) {
        // Prix total multi-jours via computeTotalPrice
        const estimate = computeTotalPrice(f, searchDates);
        if (estimate && estimate.total < minPrice) {
          minPrice = estimate.total;
          minLabel = estimate.label;
        }
      } else {
        // Prix unitaire avec commission
        const price = getPriceWithCommission(f.price, f.announcerStatusType);
        if (price < minPrice) {
          minPrice = price;
          const unit = f.priceUnit === "hour" ? "heure" : f.priceUnit === "half_day" ? "demi-journée" : f.priceUnit === "day" ? "jour" : f.priceUnit;
          minLabel = unit;
        }
      }
    }

    return { minPrice, minLabel, count: results.length, hasDateRange };
  }, [results, searchDates]);

  if (!summary || summary.minPrice === Infinity) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-2xl border border-primary/10"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
          <Home className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">
            Garde à partir de{" "}
            <span className="text-primary">{formatPrice(summary.minPrice)}</span>
            {summary.hasDateRange ? (
              <span className="text-gray-500 font-normal"> · {summary.minLabel}</span>
            ) : (
              <span className="text-gray-500 font-normal">/{summary.minLabel}</span>
            )}
          </p>
          <p className="text-xs text-gray-500">
            {summary.count} prestation{summary.count > 1 ? "s" : ""} disponible{summary.count > 1 ? "s" : ""}
            {searchDates?.startDate && searchDates?.endDate && (
              <> · {new Date(searchDates.startDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} → {new Date(searchDates.endDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</>
            )}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// Créneaux horaires par tranche de 30 minutes
const TIME_SLOTS = Array.from({ length: 36 }, (_, i) => {
  const hour = Math.floor(i / 2) + 6; // De 06:00 à 23:30
  const min = i % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, "0")}:${min}`;
});

// Nuqs parsers for URL state
const searchParamsParsers = {
  mode: parseAsStringLiteral(["garde", "services"] as const).withDefault("garde"),
  animal: parseAsString,
  category: parseAsString,
  radius: parseAsInteger.withDefault(50),
  date: parseAsString,
  startDate: parseAsString,
  endDate: parseAsString,
  startTime: parseAsString,
  endTime: parseAsString,
  animals: parseAsInteger.withDefault(1),
  view: parseAsStringLiteral(["grid", "list"] as const).withDefault("grid"),
};

export default function RecherchePage() {
  // Auth pour récupérer l'adresse du profil
  const { token, isAuthenticated, user: authUser } = useAuth();
  const isAnnouncer = authUser?.accountType === "annonceur_pro" || authUser?.accountType === "annonceur_particulier";

  // Géolocalisation
  const { coordinates: geoCoords, isLoading: isGeoLoading, error: geoError, requestLocation } = useGeolocation();
  const reverseGeocode = useAction(api.api.googleMaps.reverseGeocode);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // URL state with nuqs
  const [urlParams, setUrlParams] = useQueryStates(searchParamsParsers, {
    history: "push",
    shallow: false,
  });

  // Hook de recherche par formule
  const {
    filters,
    advancedFilters,
    results,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    setLocation,
    setSearchMode: setHookSearchMode,
    setAnimalType: setHookAnimalType,
    setCategory: setHookCategory,
    setRadius: setHookRadius,
    setDate: setHookDate,
    setDateRange: setHookDateRange,
    setGardeTimes: setHookGardeTimes,
    setNumberOfAnimals: setHookNumberOfAnimals,
    updateAdvancedFilters,
    resetAdvancedFilters,
    resetAllFilters: resetHookFilters,
  } = useFormuleSearch();

  // Pattern anti-rejeu animations : une fois les résultats chargés, on désactive les initial
  const hasLoadedRef = useRef(false);
  if (results && results.length > 0 && !hasLoadedRef.current) {
    hasLoadedRef.current = true;
  }
  const animInitial = hasLoadedRef.current ? false : { opacity: 0, y: 20 };

  // Récupérer les coordonnées du profil utilisateur (client ou annonceur)
  const userLocation = useQuery(
    api.client.profile.getClientCoordinates,
    token ? { token } : "skip"
  );

  // Récupérer les animaux de l'utilisateur connecté
  const userAnimals = useQuery(
    api.animals.getUserAnimals,
    token ? { token } : "skip"
  );

  // Animaux sélectionnés par l'utilisateur dans la barre de recherche
  const [selectedAnimalIds, setSelectedAnimalIds] = useState<string[]>([]);

  // Dériver les types d'animaux sélectionnés pour le filtre de recherche
  const selectedAnimalTypes = useMemo(() => {
    if (!userAnimals || selectedAnimalIds.length === 0) return null;
    const types = new Set<string>();
    for (const animal of userAnimals) {
      if (selectedAnimalIds.includes(animal.id)) {
        types.add(animal.type);
      }
    }
    return types.size > 0 ? Array.from(types) : null;
  }, [userAnimals, selectedAnimalIds]);

  // State pour savoir si on a déjà initialisé la localisation depuis le profil
  const [hasInitializedFromProfile, setHasInitializedFromProfile] = useState(false);

  // Initialiser la localisation depuis le profil utilisateur
  useEffect(() => {
    if (
      !hasInitializedFromProfile &&
      userLocation?.coordinates &&
      userLocation?.city &&
      !filters.location.text // Ne pas écraser si l'utilisateur a déjà saisi une adresse
    ) {
      setLocation({
        text: userLocation.location || userLocation.city,
        coordinates: userLocation.coordinates,
      });
      setHasInitializedFromProfile(true);
    }
  }, [userLocation, hasInitializedFromProfile, filters.location.text, setLocation]);

  // Sync URL params with hook state
  useEffect(() => {
    setHookSearchMode(urlParams.mode);
    setHookAnimalType(urlParams.animal);
    setHookRadius(urlParams.radius);
    setHookDate(urlParams.date);
    setHookDateRange(urlParams.startDate, urlParams.endDate);
    setHookGardeTimes(urlParams.startTime, urlParams.endTime);
    setHookNumberOfAnimals(urlParams.animals);
  }, [urlParams.mode, urlParams.animal, urlParams.radius, urlParams.date, urlParams.startDate, urlParams.endDate, urlParams.startTime, urlParams.endTime, urlParams.animals, setHookSearchMode, setHookAnimalType, setHookRadius, setHookDate, setHookDateRange, setHookGardeTimes, setHookNumberOfAnimals]);

  // Synchroniser le filtre animalType quand des animaux sont sélectionnés
  useEffect(() => {
    if (selectedAnimalIds.length === 0) {
      // Aucun animal sélectionné : retirer le filtre par type
      setHookAnimalType(null);
      setUrlParams({ animal: null });
    } else if (selectedAnimalTypes && selectedAnimalTypes.length === 1) {
      // Un seul type d'animal sélectionné : appliquer le filtre
      setHookAnimalType(selectedAnimalTypes[0]);
      setUrlParams({ animal: selectedAnimalTypes[0] });
    } else if (selectedAnimalTypes && selectedAnimalTypes.length > 1) {
      // Plusieurs types différents : ne pas filtrer par type
      setHookAnimalType(null);
      setUrlParams({ animal: null });
    }
  }, [selectedAnimalTypes, selectedAnimalIds.length, setHookAnimalType, setUrlParams]);

  // URL setters
  const setSearchMode = useCallback((mode: "garde" | "services") => {
    setUrlParams({
      mode,
      category: null,
      // Reset les filtres garde quand on passe en mode services
      ...(mode === "services" ? {
        startDate: null,
        endDate: null,
        startTime: null,
        endTime: null,
        date: null,
        animals: 1,
      } : {}),
    });
  }, [setUrlParams]);

  const setAnimalType = useCallback((animal: string | null) => {
    setUrlParams({ animal });
  }, [setUrlParams]);

  const setCategory = useCallback((category: ServiceCategory | null) => {
    setUrlParams({
      category: category?.slug ?? null,
      date: null,
      startDate: null,
      endDate: null,
    });
  }, [setUrlParams]);

  const setRadius = useCallback((radius: number) => {
    setUrlParams({ radius });
  }, [setUrlParams]);

  const setDate = useCallback((date: string | null) => {
    setUrlParams({ date, startDate: null, endDate: null });
  }, [setUrlParams]);

  const setDateRange = useCallback((start: string | null, end: string | null) => {
    setUrlParams({ startDate: start, endDate: end, date: null });
  }, [setUrlParams]);

  const setNumberOfAnimals = useCallback((n: number) => {
    setUrlParams({ animals: n });
  }, [setUrlParams]);

  const resetDateFilters = useCallback(() => {
    setUrlParams({ date: null, startDate: null, endDate: null, startTime: null, endTime: null });
  }, [setUrlParams]);

  const resetAllFilters = useCallback(() => {
    setUrlParams({
      mode: "garde",
      animal: null,
      category: null,
      radius: 50,
      date: null,
      startDate: null,
      endDate: null,
      startTime: null,
      endTime: null,
      animals: 1,
    });
    resetHookFilters();
  }, [setUrlParams, resetHookFilters]);

  const setViewMode = useCallback((view: "grid" | "list") => {
    setUrlParams({ view });
  }, [setUrlParams]);

  const viewMode = urlParams.view;

  const categoriesData = useQuery(api.admin.serviceCategories.getActiveCategories) as CategoriesData | undefined;

  // Sync category from URL with hook (after categoriesData is declared)
  useEffect(() => {
    if (!categoriesData) return;

    if (!urlParams.category) {
      setHookCategory(null);
      return;
    }

    // Find category in subcategories
    for (const parent of categoriesData.parentCategories) {
      const found = parent.subcategories.find((sub) => sub.slug === urlParams.category);
      if (found) {
        setHookCategory({
          id: found.id,
          slug: found.slug,
          name: found.name,
          icon: found.icon || "📋",
          billingType: found.billingType as "hourly" | "daily" | "flexible" | undefined,
        });
        return;
      }
    }

    // Check in root categories
    const rootFound = categoriesData.rootCategories.find((cat) => cat.slug === urlParams.category);
    if (rootFound) {
      setHookCategory({
        id: rootFound.id,
        slug: rootFound.slug,
        name: rootFound.name,
        icon: rootFound.icon || "📋",
        billingType: rootFound.billingType as "hourly" | "daily" | "flexible" | undefined,
      });
    }
  }, [urlParams.category, categoriesData, setHookCategory]);

  const router = useRouter();

  // Favoris
  const favoriteIds = useQuery(
    api.client.favorites.getFavoriteIds,
    token ? { token } : "skip"
  ) as string[] | undefined;
  const toggleFavorite = useMutation(api.client.favorites.toggle);
  const [togglingFavoriteId, setTogglingFavoriteId] = useState<string | null>(null);

  const handleToggleFavorite = useCallback(async (formuleId: string) => {
    if (!token) {
      router.push("/connexion?redirect=/recherche");
      return;
    }

    setTogglingFavoriteId(formuleId);
    try {
      await toggleFavorite({
        token,
        formuleId: formuleId as Id<"serviceVariants">,
      });
    } catch (error) {
      console.error("Erreur lors du toggle favori:", error);
    } finally {
      setTogglingFavoriteId(null);
    }
  }, [token, router, toggleFavorite]);

  // Regroupement par annonceur
  const [isGrouped, setIsGrouped] = useState(false);

  const [showFilters, setShowFilters] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const heroSearchRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Détecter quand la barre de recherche hero sort de la vue
  useEffect(() => {
    const target = heroSearchRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsScrolled(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-80px 0px 0px 0px" }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  // Flatten categories from hierarchical structure
  const flattenedCategories = useMemo<ServiceCategory[]>(() => {
    if (!categoriesData) return [];
    const result: ServiceCategory[] = [];

    categoriesData.parentCategories.forEach((parent) => {
      parent.subcategories.forEach((sub) => {
        result.push({
          id: sub.id,
          slug: sub.slug,
          name: sub.name,
          icon: sub.icon || "📋",
          imageUrl: sub.imageUrl ?? undefined,
          billingType: sub.billingType as "hourly" | "daily" | "flexible" | undefined,
        });
      });
    });

    categoriesData.rootCategories.forEach((cat) => {
      result.push({
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
        icon: cat.icon || "📋",
        imageUrl: cat.imageUrl ?? undefined,
        billingType: cat.billingType as "hourly" | "daily" | "flexible" | undefined,
      });
    });

    return result;
  }, [categoriesData]);

  // Filter out "garde" category from services when in services mode
  const filteredCategories = useMemo(() =>
    flattenedCategories.filter((cat: ServiceCategory) =>
      filters.searchMode === "services" ? cat.slug !== "garde" : true
    ), [flattenedCategories, filters.searchMode]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasAdvancedFilters = useMemo(() =>
    advancedFilters.sortBy !== "relevance" ||
    advancedFilters.accountTypes.length > 0 ||
    advancedFilters.verifiedOnly ||
    advancedFilters.withPhotoOnly ||
    advancedFilters.hasGarden !== null ||
    advancedFilters.hasVehicle !== null ||
    advancedFilters.ownsAnimals.length > 0 ||
    advancedFilters.noAnimals ||
    advancedFilters.priceRange.min !== null ||
    advancedFilters.priceRange.max !== null,
  [advancedFilters]);

  const hasAnyFilter = useMemo(() =>
    hasAdvancedFilters ||
    !!filters.category ||
    !!filters.animalType ||
    !!filters.date ||
    !!filters.startDate,
  [hasAdvancedFilters, filters.category, filters.animalType, filters.date, filters.startDate]);

  const activeFiltersCount = useMemo(() => [
    filters.category,
    filters.animalType,
    filters.date || filters.startDate,
    hasAdvancedFilters,
  ].filter(Boolean).length, [filters.category, filters.animalType, filters.date, filters.startDate, hasAdvancedFilters]);


  // Infos de dates pour le calcul du prix total dans les cartes
  const searchDates = useMemo<SearchDates>(() => ({
    startDate: urlParams.startDate,
    endDate: urlParams.endDate,
    startTime: urlParams.startTime,
    endTime: urlParams.endTime,
    numberOfAnimals: urlParams.animals,
  }), [urlParams.startDate, urlParams.endDate, urlParams.startTime, urlParams.endTime, urlParams.animals]);

  // Re-tri client-side pour les recherches multi-jours (le backend trie par prix unitaire)
  const sortedResults = useMemo(() => {
    const hasDateRange = !!(searchDates?.startDate && searchDates?.endDate);
    const sortBy = advancedFilters.sortBy;

    if (!hasDateRange || (sortBy !== "price_asc" && sortBy !== "price_desc")) {
      return results;
    }

    // Calculer le prix total pour chaque résultat et trier
    const withTotal = results.map((f) => {
      const estimate = computeTotalPrice(f, searchDates);
      return { formule: f, total: estimate?.total ?? getPriceWithCommission(f.price, f.announcerStatusType) };
    });

    withTotal.sort((a, b) =>
      sortBy === "price_asc" ? a.total - b.total : b.total - a.total
    );

    return withTotal.map((w) => w.formule);
  }, [results, searchDates, advancedFilters.sortBy]);

  const groupedResults = useMemo<AnnouncerGroup[]>(() => {
    if (!isGrouped) return [];
    const map = new Map<string, AnnouncerGroup>();
    for (const f of sortedResults) {
      let group = map.get(f.announcerId);
      if (!group) {
        group = {
          announcerId: f.announcerId,
          announcerFirstName: f.announcerFirstName,
          announcerLastName: f.announcerLastName,
          announcerSlug: f.announcerSlug,
          announcerProfileImage: f.announcerProfileImage,
          announcerIsDisplayingLogo: f.announcerIsDisplayingLogo,
          announcerRating: f.announcerRating,
          announcerReviewCount: f.announcerReviewCount,
          announcerLocation: f.announcerLocation,
          announcerDistance: f.announcerDistance,
          announcerVerified: f.announcerVerified,
          announcerStatusType: f.announcerStatusType,
          formules: [],
        };
        map.set(f.announcerId, group);
      }
      group.formules.push(f);
    }
    return Array.from(map.values());
  }, [sortedResults, isGrouped]);

  // Géolocalisation : handler pour le bouton "Me localiser"
  const handleGeolocate = useCallback(async () => {
    await requestLocation();
  }, [requestLocation]);

  // Reverse geocode quand on obtient les coordonnées GPS
  useEffect(() => {
    if (geoCoords && !geoError && !isReverseGeocoding) {
      setIsReverseGeocoding(true);
      reverseGeocode({ lat: geoCoords.lat, lng: geoCoords.lng })
        .then((result) => {
          const addressText = result.success && result.address ? result.address : "Ma position";
          setLocation({ text: addressText, coordinates: geoCoords });
        })
        .catch(() => {
          setLocation({ text: "Ma position", coordinates: geoCoords });
        })
        .finally(() => setIsReverseGeocoding(false));
    }
  }, [geoCoords, geoError]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Navbar identique à l'accueil */}
      <Navbar />

      {/* Hero Section with Mode Toggle */}
      <section className="pt-3 sm:pt-4 pb-4 sm:pb-6 bg-gradient-to-b from-primary/5 via-background to-background relative">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Gradient orbs */}
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute -top-10 right-0 w-96 h-96 bg-gradient-to-bl from-secondary/15 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-gradient-to-tr from-purple/10 to-transparent rounded-full blur-2xl" />

          {/* Emojis décoratifs statiques */}
          <span className="hidden md:block absolute top-24 left-[10%] text-3xl opacity-20">🐕</span>
          <span className="hidden md:block absolute top-32 right-[15%] text-2xl opacity-15">🐈</span>
          <span className="hidden lg:block absolute bottom-8 left-[20%] text-2xl opacity-10">🐾</span>
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            {/* Mode Toggle - Main choice */}
            <div className="flex justify-center mb-4 sm:mb-6">
              <motion.div
                className="inline-flex items-center p-1 sm:p-1.5 bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-gray-200/50 border border-white/50"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <motion.button
                  onClick={() => setSearchMode("garde")}
                  className={cn(
                    "relative flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-2 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-all",
                    filters.searchMode === "garde"
                      ? "bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg shadow-primary/25"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  )}
                  whileHover={{ scale: filters.searchMode !== "garde" ? 1.02 : 1 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl transition-colors",
                    filters.searchMode === "garde"
                      ? "bg-white/20"
                      : "bg-gray-100"
                  )}>
                    <Home className={cn(
                      "w-4 h-4 sm:w-5 sm:h-5",
                      filters.searchMode === "garde" ? "text-white" : "text-gray-500"
                    )} />
                  </div>
                  <div className="text-left">
                    <span className="block">Faire garder</span>
                    <span className={cn(
                      "hidden sm:block text-[10px] sm:text-xs font-normal",
                      filters.searchMode === "garde" ? "text-white/70" : "text-gray-400"
                    )}>
                      Garde à domicile ou pension
                    </span>
                  </div>
                </motion.button>

                <motion.button
                  onClick={() => setSearchMode("services")}
                  className={cn(
                    "relative flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-2 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-all",
                    filters.searchMode === "services"
                      ? "bg-gradient-to-r from-secondary to-secondary/90 text-white shadow-lg shadow-secondary/25"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  )}
                  whileHover={{ scale: filters.searchMode !== "services" ? 1.02 : 1 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl transition-colors",
                    filters.searchMode === "services"
                      ? "bg-white/20"
                      : "bg-gray-100"
                  )}>
                    <Scissors className={cn(
                      "w-4 h-4 sm:w-5 sm:h-5",
                      filters.searchMode === "services" ? "text-white" : "text-gray-500"
                    )} />
                  </div>
                  <div className="text-left">
                    <span className="block">Services</span>
                    <span className={cn(
                      "hidden sm:block text-[10px] sm:text-xs font-normal",
                      filters.searchMode === "services" ? "text-white/70" : "text-gray-400"
                    )}>
                      Toilettage, promenade, soins...
                    </span>
                  </div>
                </motion.button>
              </motion.div>
            </div>

            {/* Barre de recherche unifiée style booking */}
            <motion.div
              ref={heroSearchRef}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-3 sm:mt-6 max-w-4xl mx-auto px-0 sm:px-0 relative z-40"
            >
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 p-1.5 sm:p-3">
                {/* Ligne 1 : Ville + Géolocalisation + Rayon */}
                <div className="mb-1.5 sm:mb-2">
                  <LocationBar
                    location={filters.location}
                    onLocationChange={setLocation}
                    radius={filters.radius}
                    onRadiusChange={setRadius}
                    onGeolocate={handleGeolocate}
                    isGeoLoading={isGeoLoading}
                    isReverseGeocoding={isReverseGeocoding}
                    openDropdown={openDropdown}
                    dropdownId="radius"
                    onToggleDropdown={setOpenDropdown}
                    variant="hero"
                  />
                </div>

                {/* Ligne 2 (mode garde) : Dates + Heures début/fin + Nombre d'animaux */}
                {filters.searchMode === "garde" && (
                  <div className="pt-2 sm:pt-3 border-t border-gray-100">
                    {/* Mobile layout */}
                    <div className="sm:hidden space-y-1.5">
                      {/* Bloc Début : date + heure sur une ligne */}
                      <div>
                        <label className="flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-wider mb-1 px-0.5">
                          <Calendar className="w-2.5 h-2.5" />
                          Début de garde
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="date"
                            value={urlParams.startDate || ""}
                            min={new Date().toISOString().split("T")[0]}
                            onChange={(e) => setDateRange(e.target.value || null, urlParams.endDate)}
                            className={cn(
                              "flex-1 min-w-0 px-2 py-2 rounded-lg text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary/30",
                              urlParams.startDate
                                ? "bg-primary/5 border-2 border-primary/30 text-gray-900"
                                : "bg-gray-50 border border-gray-200 text-gray-500"
                            )}
                          />
                          <select
                            value={urlParams.startTime || ""}
                            onChange={(e) => setUrlParams({ startTime: e.target.value || null })}
                            className={cn(
                              "w-[80px] px-1.5 py-2 rounded-lg text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none cursor-pointer",
                              urlParams.startTime
                                ? "bg-primary/5 border-2 border-primary/30 text-gray-900"
                                : "bg-gray-50 border border-gray-200 text-gray-400"
                            )}
                          >
                            <option value="">Heure</option>
                            {TIME_SLOTS.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Bloc Fin : date + heure sur une ligne */}
                      <div>
                        <label className="flex items-center gap-1 text-[10px] font-bold text-secondary uppercase tracking-wider mb-1 px-0.5">
                          <Calendar className="w-2.5 h-2.5" />
                          Fin de garde
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="date"
                            value={urlParams.endDate || ""}
                            min={urlParams.startDate || new Date().toISOString().split("T")[0]}
                            onChange={(e) => setDateRange(urlParams.startDate, e.target.value || null)}
                            className={cn(
                              "flex-1 min-w-0 px-2 py-2 rounded-lg text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-secondary/30",
                              urlParams.endDate
                                ? "bg-secondary/5 border-2 border-secondary/30 text-gray-900"
                                : "bg-gray-50 border border-gray-200 text-gray-500"
                            )}
                          />
                          <select
                            value={urlParams.endTime || ""}
                            onChange={(e) => setUrlParams({ endTime: e.target.value || null })}
                            className={cn(
                              "w-[80px] px-1.5 py-2 rounded-lg text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-secondary/30 appearance-none cursor-pointer",
                              urlParams.endTime
                                ? "bg-secondary/5 border-2 border-secondary/30 text-gray-900"
                                : "bg-gray-50 border border-gray-200 text-gray-400"
                            )}
                          >
                            <option value="">Heure</option>
                            {TIME_SLOTS.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Animaux + Effacer — même style que les blocs date */}
                      <div>
                        <label className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-0.5">
                          <PawPrint className="w-2.5 h-2.5" />
                          Animaux
                        </label>
                        <div className="flex gap-1.5">
                          <div className="relative flex-1 min-w-0">
                            {token && userAnimals && userAnimals.length > 0 ? (
                              <>
                                <button
                                  onClick={() => setOpenDropdown(openDropdown === "animals" ? null : "animals")}
                                  className={cn(
                                    "w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                                    selectedAnimalIds.length > 0
                                      ? "bg-primary/5 border-2 border-primary/30 text-gray-900"
                                      : "bg-gray-50 border border-gray-200 text-gray-500"
                                  )}
                                >
                                  {selectedAnimalIds.length > 0 ? (
                                    <>
                                      <span className="flex -space-x-1">
                                        {userAnimals
                                          .filter((a) => selectedAnimalIds.includes(a.id))
                                          .slice(0, 3)
                                          .map((a) => (
                                            <span key={a.id} className="text-sm">{a.emoji || "🐾"}</span>
                                          ))}
                                      </span>
                                      <span className="font-bold text-primary">{selectedAnimalIds.length} animal{selectedAnimalIds.length > 1 ? "x" : ""}</span>
                                    </>
                                  ) : (
                                    <>
                                      <PawPrint className="w-3.5 h-3.5 text-gray-400" />
                                      <span>Choisir mes animaux</span>
                                    </>
                                  )}
                                  <ChevronDown className={cn("w-3 h-3 text-gray-400 transition-transform ml-auto", openDropdown === "animals" && "rotate-180")} />
                                </button>
                                <AnimatePresence>
                                  {openDropdown === "animals" && (
                                    <motion.div
                                      initial={{ opacity: 0, y: 4 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: 4 }}
                                      transition={{ duration: 0.15 }}
                                      className="absolute top-full left-0 right-0 mt-2 py-2 bg-white rounded-xl shadow-xl border border-gray-200 z-[100]"
                                    >
                                      <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                        Mes animaux
                                      </div>
                                      {userAnimals.map((animal) => {
                                        const isSelected = selectedAnimalIds.includes(animal.id);
                                        return (
                                          <button
                                            key={animal.id}
                                            onClick={() => {
                                              const newIds = isSelected
                                                ? selectedAnimalIds.filter((id) => id !== animal.id)
                                                : [...selectedAnimalIds, animal.id];
                                              setSelectedAnimalIds(newIds);
                                              setNumberOfAnimals(Math.max(1, newIds.length));
                                            }}
                                            className={cn(
                                              "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors",
                                              isSelected && "bg-primary/5"
                                            )}
                                          >
                                            <span className="text-lg">{animal.emoji || "🐾"}</span>
                                            <div className="flex-1 min-w-0">
                                              <span className={cn(
                                                "block text-sm font-medium truncate",
                                                isSelected ? "text-primary" : "text-gray-700"
                                              )}>
                                                {animal.name}
                                              </span>
                                              <span className="block text-[11px] text-gray-400 capitalize">{animal.type}</span>
                                            </div>
                                            <div className={cn(
                                              "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors",
                                              isSelected
                                                ? "bg-primary border-primary text-white"
                                                : "border-gray-300"
                                            )}>
                                              {isSelected && (
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                              )}
                                            </div>
                                          </button>
                                        );
                                      })}
                                      {selectedAnimalIds.length > 0 && (
                                        <div className="border-t border-gray-100 mt-1 pt-1 px-3">
                                          <button
                                            onClick={() => {
                                              setSelectedAnimalIds([]);
                                              setNumberOfAnimals(1);
                                            }}
                                            className="w-full py-1.5 text-xs text-gray-400 hover:text-primary transition-colors text-center"
                                          >
                                            Tout désélectionner
                                          </button>
                                        </div>
                                      )}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </>
                            ) : (
                              <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg">
                                <button
                                  onClick={() => setNumberOfAnimals(Math.max(1, urlParams.animals - 1))}
                                  disabled={urlParams.animals <= 1}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:border-primary hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                  aria-label="Moins d'animaux"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-sm font-bold text-gray-800 min-w-[1.5rem] text-center">
                                  {urlParams.animals}
                                </span>
                                <button
                                  onClick={() => setNumberOfAnimals(Math.min(10, urlParams.animals + 1))}
                                  disabled={urlParams.animals >= 10}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:border-primary hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                  aria-label="Plus d'animaux"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                          {(urlParams.startDate || urlParams.endDate) && (
                            <button
                              onClick={resetDateFilters}
                              className="self-center p-2 text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors rounded-lg"
                              title="Effacer les dates"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Desktop layout */}
                    <div className="hidden sm:grid sm:grid-cols-[1fr_auto_1fr_auto_auto_auto] gap-2">
                      {/* Bloc Début */}
                      <div className="min-w-0">
                        <label className="flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-wider mb-1 px-1">
                          <Calendar className="w-3 h-3" />
                          Début de garde
                        </label>
                        <div className="flex gap-1.5">
                          <div className="relative flex-1">
                            <input
                              type="date"
                              value={urlParams.startDate || ""}
                              min={new Date().toISOString().split("T")[0]}
                              onChange={(e) => setDateRange(e.target.value || null, urlParams.endDate)}
                              className={cn(
                                "w-full px-3 py-2 rounded-xl text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary/30",
                                urlParams.startDate
                                  ? "bg-primary/5 border-2 border-primary/30 text-gray-900"
                                  : "bg-gray-50 border border-gray-200 text-gray-500"
                              )}
                            />
                          </div>
                          <select
                            value={urlParams.startTime || ""}
                            onChange={(e) => setUrlParams({ startTime: e.target.value || null })}
                            className={cn(
                              "w-[85px] px-2 py-2 rounded-xl text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none cursor-pointer",
                              urlParams.startTime
                                ? "bg-primary/5 border-2 border-primary/30 text-gray-900"
                                : "bg-gray-50 border border-gray-200 text-gray-500"
                            )}
                          >
                            <option value="">Heure</option>
                            {TIME_SLOTS.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Flèche séparateur */}
                      <div className="flex items-end pb-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <ChevronRight className="w-4 h-4 text-primary" />
                        </div>
                      </div>

                      {/* Bloc Fin */}
                      <div className="min-w-0">
                        <label className="flex items-center gap-1 text-[10px] font-bold text-secondary uppercase tracking-wider mb-1 px-1">
                          <Calendar className="w-3 h-3" />
                          Fin de garde
                        </label>
                        <div className="flex gap-1.5">
                          <div className="relative flex-1">
                            <input
                              type="date"
                              value={urlParams.endDate || ""}
                              min={urlParams.startDate || new Date().toISOString().split("T")[0]}
                              onChange={(e) => setDateRange(urlParams.startDate, e.target.value || null)}
                              className={cn(
                                "w-full px-3 py-2 rounded-xl text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-secondary/30",
                                urlParams.endDate
                                  ? "bg-secondary/5 border-2 border-secondary/30 text-gray-900"
                                  : "bg-gray-50 border border-gray-200 text-gray-500"
                              )}
                            />
                          </div>
                          <select
                            value={urlParams.endTime || ""}
                            onChange={(e) => setUrlParams({ endTime: e.target.value || null })}
                            className={cn(
                              "w-[85px] px-2 py-2 rounded-xl text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-secondary/30 appearance-none cursor-pointer",
                              urlParams.endTime
                                ? "bg-secondary/5 border-2 border-secondary/30 text-gray-900"
                                : "bg-gray-50 border border-gray-200 text-gray-500"
                            )}
                          >
                            <option value="">Heure</option>
                            {TIME_SLOTS.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Séparateur vertical */}
                      <div className="flex items-end pb-2">
                        <div className="h-9 w-px bg-gray-200" />
                      </div>

                      {/* Animaux — dropdown avec sélection */}
                      <div className="flex-shrink-0 relative">
                        <label className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">
                          <PawPrint className="w-3 h-3" />
                          Animaux
                        </label>
                        {token && userAnimals && userAnimals.length > 0 ? (
                          <>
                            <button
                              onClick={() => setOpenDropdown(openDropdown === "animals" ? null : "animals")}
                              className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all h-[38px] whitespace-nowrap",
                                selectedAnimalIds.length > 0
                                  ? "bg-primary/5 border-2 border-primary/30 text-gray-900"
                                  : "bg-gray-50 border border-gray-200 text-gray-500 hover:border-gray-300"
                              )}
                            >
                              {selectedAnimalIds.length > 0 ? (
                                <>
                                  <span className="flex -space-x-1">
                                    {userAnimals
                                      .filter((a) => selectedAnimalIds.includes(a.id))
                                      .slice(0, 3)
                                      .map((a) => (
                                        <span key={a.id} className="text-sm">{a.emoji || "🐾"}</span>
                                      ))}
                                  </span>
                                  <span className="font-bold text-primary">{selectedAnimalIds.length}</span>
                                </>
                              ) : (
                                <>
                                  <PawPrint className="w-4 h-4 text-gray-400" />
                                  <span>Choisir</span>
                                </>
                              )}
                              <ChevronDown className={cn("w-3 h-3 text-gray-400 transition-transform", openDropdown === "animals" && "rotate-180")} />
                            </button>
                            <AnimatePresence>
                              {openDropdown === "animals" && (
                                <motion.div
                                  initial={{ opacity: 0, y: 4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 4 }}
                                  transition={{ duration: 0.15 }}
                                  className="absolute top-full right-0 mt-2 py-2 bg-white rounded-xl shadow-xl border border-gray-200 z-[100] min-w-[220px]"
                                >
                                  <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    Mes animaux
                                  </div>
                                  {userAnimals.map((animal) => {
                                    const isSelected = selectedAnimalIds.includes(animal.id);
                                    return (
                                      <button
                                        key={animal.id}
                                        onClick={() => {
                                          const newIds = isSelected
                                            ? selectedAnimalIds.filter((id) => id !== animal.id)
                                            : [...selectedAnimalIds, animal.id];
                                          setSelectedAnimalIds(newIds);
                                          setNumberOfAnimals(Math.max(1, newIds.length));
                                        }}
                                        className={cn(
                                          "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors",
                                          isSelected && "bg-primary/5"
                                        )}
                                      >
                                        <span className="text-lg">{animal.emoji || "🐾"}</span>
                                        <div className="flex-1 min-w-0">
                                          <span className={cn(
                                            "block text-sm font-medium truncate",
                                            isSelected ? "text-primary" : "text-gray-700"
                                          )}>
                                            {animal.name}
                                          </span>
                                          <span className="block text-[11px] text-gray-400 capitalize">{animal.type}</span>
                                        </div>
                                        <div className={cn(
                                          "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors",
                                          isSelected
                                            ? "bg-primary border-primary text-white"
                                            : "border-gray-300"
                                        )}>
                                          {isSelected && (
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                          )}
                                        </div>
                                      </button>
                                    );
                                  })}
                                  {selectedAnimalIds.length > 0 && (
                                    <div className="border-t border-gray-100 mt-1 pt-1 px-3">
                                      <button
                                        onClick={() => {
                                          setSelectedAnimalIds([]);
                                          setNumberOfAnimals(1);
                                        }}
                                        className="w-full py-1.5 text-xs text-gray-400 hover:text-primary transition-colors text-center"
                                      >
                                        Tout désélectionner
                                      </button>
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </>
                        ) : (
                          <div className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl h-[38px]">
                            <button
                              onClick={() => setNumberOfAnimals(Math.max(1, urlParams.animals - 1))}
                              disabled={urlParams.animals <= 1}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:border-primary hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              aria-label="Moins d'animaux"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-base font-bold text-gray-800 min-w-[1.5rem] text-center">
                              {urlParams.animals}
                            </span>
                            <button
                              onClick={() => setNumberOfAnimals(Math.min(10, urlParams.animals + 1))}
                              disabled={urlParams.animals >= 10}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:border-primary hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              aria-label="Plus d'animaux"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Bouton effacer */}
                      {(urlParams.startDate || urlParams.endDate) && (
                        <div className="flex items-end pb-1.5">
                          <button
                            onClick={resetDateFilters}
                            className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors rounded-xl"
                            title="Effacer les dates"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Sticky bar : recherche compacte (au scroll) + types d'animaux + catégorie */}
      <section className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        {/* Barre de recherche compacte visible au scroll - transition CSS fluide */}
        <div
          className={cn(
            "grid transition-all duration-200 ease-out border-b border-gray-100",
            isScrolled ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          )}
        >
          <div className="overflow-hidden">
            <div className="max-w-2xl mx-auto px-3 py-2">
              <LocationBar
                location={filters.location}
                onLocationChange={setLocation}
                radius={filters.radius}
                onRadiusChange={setRadius}
                onGeolocate={handleGeolocate}
                isGeoLoading={isGeoLoading}
                isReverseGeocoding={isReverseGeocoding}
                openDropdown={openDropdown}
                dropdownId="radius-sticky"
                onToggleDropdown={setOpenDropdown}
                variant="sticky"
              />
            </div>
          </div>
        </div>

        {/* Ligne animaux + catégorie + reset */}
        <div className="flex items-center gap-1 px-2 py-1.5 sm:p-3">
          {/* Pilules animaux - scrollable */}
          <div className="overflow-x-auto scrollbar-hide flex-1">
            <div className="flex items-center gap-1 min-w-max sm:min-w-0 sm:justify-center">
              <button
                onClick={() => setAnimalType(null)}
                className={cn(
                  "flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                  !filters.animalType
                    ? filters.searchMode === "garde" ? "bg-primary text-white" : "bg-secondary text-white"
                    : "bg-gray-100 text-gray-700"
                )}
              >
                <span>🐾</span>
                <span>Tous</span>
              </button>
              {ANIMAL_TYPES.slice(0, 6).map((animal) => (
                <button
                  key={animal.id}
                  onClick={() => setAnimalType(animal.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                    filters.animalType === animal.id
                      ? filters.searchMode === "garde" ? "bg-primary text-white" : "bg-secondary text-white"
                      : "bg-gray-100 text-gray-700"
                  )}
                >
                  <span>{animal.emoji}</span>
                  <span className="hidden sm:inline">{animal.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Catégorie de service - EN DEHORS de overflow pour que le dropdown ne soit pas coupé */}
          {filters.searchMode === "services" && (
            <FilterDropdown
              label={filters.category?.name || "Type de service"}
              icon={filters.category?.icon || "✨"}
              isActive={!!filters.category}
              isOpen={openDropdown === "category"}
              onToggle={() => setOpenDropdown(openDropdown === "category" ? null : "category")}
            >
              <button
                onClick={() => {
                  setCategory(null);
                  setOpenDropdown(null);
                }}
                className={cn(
                  "w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-gray-50 transition-colors rounded-lg",
                  !filters.category && "bg-secondary/5 text-secondary font-medium"
                )}
              >
                <span>✨</span>
                <span>Tous les services</span>
              </button>
              <div className="h-px bg-gray-100 my-1" />
              {filteredCategories?.map((cat: ServiceCategory) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setCategory({
                      id: cat.id,
                      slug: cat.slug,
                      name: cat.name,
                      icon: cat.icon,
                      imageUrl: cat.imageUrl,
                      billingType: cat.billingType as "hourly" | "daily" | "flexible" | undefined,
                    });
                    setOpenDropdown(null);
                  }}
                  className={cn(
                    "w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-gray-50 transition-colors rounded-lg",
                    filters.category?.slug === cat.slug && "bg-secondary/5 text-secondary font-medium"
                  )}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </FilterDropdown>
          )}

          {hasAnyFilter && (
            <button
              onClick={resetAllFilters}
              className="flex items-center gap-1 px-2 py-1.5 text-sm font-medium text-gray-400 hover:text-primary transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </section>

      {/* Results Section */}
      <section className="py-3 sm:py-8 px-3 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Results Header avec filtres Date + Filtres avancés */}
          <div className="flex flex-col gap-2 sm:gap-3 mb-3 sm:mb-6">
            {/* Ligne 1 : compteur + vue */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className={cn(
                  "hidden sm:flex p-2.5 rounded-xl",
                  filters.searchMode === "garde"
                    ? "bg-gradient-to-br from-primary/10 to-secondary/10"
                    : "bg-gradient-to-br from-secondary/10 to-purple/10"
                )}>
                  <Sparkles className={cn("w-5 h-5", filters.searchMode === "garde" ? "text-primary" : "text-secondary")} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-xl font-bold text-gray-900 truncate">
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className={cn(
                          "w-3 h-3 sm:w-4 sm:h-4 border-2 border-t-transparent rounded-full animate-spin",
                          filters.searchMode === "garde" ? "border-primary" : "border-secondary"
                        )} />
                        <span className="sm:hidden">Recherche...</span>
                        <span className="hidden sm:inline">Recherche en cours...</span>
                      </span>
                    ) : (
                      <>
                        <span className="sm:hidden">{results.length} prestation{results.length > 1 ? "s" : ""}</span>
                        <span className="hidden sm:inline">
                          {results.length} prestation{results.length > 1 ? "s" : ""}
                          <span className="text-gray-400 font-normal"> disponible{results.length > 1 ? "s" : ""}</span>
                        </span>
                      </>
                    )}
                  </h2>
                </div>
              </div>

              {/* View toggle + Group toggle */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Mobile: compact icons only */}
                <div className="flex sm:hidden items-center gap-1 p-1 bg-gray-100/80 rounded-lg border border-gray-200/50">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "p-1.5 rounded-md transition-all",
                      viewMode === "grid" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                    )}
                    aria-label="Vue grille"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "p-1.5 rounded-md transition-all",
                      viewMode === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                    )}
                    aria-label="Vue liste"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => setIsGrouped(!isGrouped)}
                  className={cn(
                    "sm:hidden p-1.5 rounded-lg transition-all border",
                    isGrouped
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "bg-gray-100/80 text-gray-500 border-gray-200/50"
                  )}
                  aria-label="Regrouper"
                >
                  <Layers className="w-4 h-4" />
                </button>
                {/* Desktop: full buttons */}
                <div className="hidden sm:flex items-center gap-2">
                  <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
                  <button
                    onClick={() => setIsGrouped(!isGrouped)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border",
                      isGrouped
                        ? "bg-primary/10 text-primary border-primary/30 shadow-sm"
                        : "bg-gray-100/80 text-gray-600 border-gray-200/50 hover:bg-gray-200/80 hover:text-gray-800"
                    )}
                  >
                    <Layers className="w-4 h-4" />
                    <span>Regrouper</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Ligne 2 : Date (garde uniquement) + Filtres avancés */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Date Filter — uniquement en mode garde */}
              {filters.searchMode === "garde" && (
                <div className="relative" ref={datePickerRef}>
                  <button
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                      filters.date || filters.startDate
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {filters.date
                        ? new Date(filters.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
                        : filters.startDate && filters.endDate
                        ? `${new Date(filters.startDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} - ${new Date(filters.endDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`
                        : "Dates"}
                    </span>
                    {(filters.date || filters.startDate) && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          resetDateFilters();
                        }}
                        className="ml-1 p-0.5 hover:bg-white/20 rounded-full cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    )}
                    <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showDatePicker && "rotate-180")} />
                  </button>

                  <DatePickerDropdown
                    isOpen={showDatePicker}
                    mode="range"
                    selectedDate={filters.date}
                    startDate={filters.startDate}
                    endDate={filters.endDate}
                    onDateSelect={(date) => {
                      setDate(date);
                      setShowDatePicker(false);
                    }}
                    onRangeSelect={(start, end) => {
                      setDateRange(start, end);
                      setShowDatePicker(false);
                    }}
                    onClose={() => setShowDatePicker(false)}
                    accentColor="primary"
                  />
                </div>
              )}

              {/* Main Filters Button */}
              <button
                onClick={() => setShowFilters(true)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                  hasAdvancedFilters
                    ? filters.searchMode === "garde" ? "bg-primary text-white" : "bg-secondary text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filtres</span>
                {activeFiltersCount > 0 && (
                  <span className="w-5 h-5 bg-white/20 rounded-full text-xs flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Résumé prix minimum garde */}
          {!isLoading && results.length > 0 && filters.searchMode === "garde" && (
            <SearchSummary results={sortedResults} searchDates={searchDates} />
          )}

          {/* Results Content */}
          {isLoading ? (
            <PawLoader
              message="Recherche des prestations..."
              submessage="Nous trouvons les meilleurs services pour votre compagnon"
            />
          ) : results.length === 0 ? (
            <EmptyState onReset={resetAllFilters} />
          ) : isGrouped ? (
            <motion.div
              initial={hasLoadedRef.current ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {groupedResults.map((group: AnnouncerGroup, index: number) => (
                <AnnouncerCarouselCard
                  key={group.announcerId}
                  group={group}
                  index={index}
                  isAnnouncer={isAnnouncer}
                  favoriteFormuleIds={favoriteIds as string[] | undefined}
                  onToggleFavorite={handleToggleFavorite}
                  togglingFavoriteId={togglingFavoriteId}
                  searchDates={searchDates}
                  selectedAnimalIds={selectedAnimalIds}
                />
              ))}
            </motion.div>
          ) : viewMode === "grid" ? (
            <motion.div
              initial={hasLoadedRef.current ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6"
            >
              {sortedResults.map((formule: FormuleResult, index: number) => (
                <FormuleCardGrid
                  key={`${formule.announcerId}-${formule.formuleId}`}
                  formule={formule}
                  index={index}
                  isFavorite={favoriteIds?.includes(formule.formuleId) ?? false}
                  onToggleFavorite={handleToggleFavorite}
                  isTogglingFavorite={togglingFavoriteId === formule.formuleId}
                  isAnnouncer={isAnnouncer}
                  searchDates={searchDates}
                  selectedAnimalIds={selectedAnimalIds}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={hasLoadedRef.current ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-3 sm:space-y-4"
            >
              {sortedResults.map((formule: FormuleResult, index: number) => (
                <FormuleCardList
                  key={`${formule.announcerId}-${formule.formuleId}`}
                  formule={formule}
                  index={index}
                  isFavorite={favoriteIds?.includes(formule.formuleId) ?? false}
                  onToggleFavorite={handleToggleFavorite}
                  isTogglingFavorite={togglingFavoriteId === formule.formuleId}
                  isAnnouncer={isAnnouncer}
                  searchDates={searchDates}
                  selectedAnimalIds={selectedAnimalIds}
                />
              ))}
            </motion.div>
          )}

          {/* Load more button */}
          {!isLoading && hasMore && results.length > 0 && (
            <motion.div
              initial={animInitial}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center mt-8"
            >
              <button
                onClick={loadMore}
                disabled={isLoadingMore}
                className="inline-flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingMore ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Chargement...
                  </>
                ) : (
                  "Voir plus de résultats"
                )}
              </button>
            </motion.div>
          )}

          {/* No more results hint */}
          {!isLoading && !hasMore && results.length > 0 && (
            <motion.div
              initial={animInitial}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center mt-8"
            >
              <p className="text-sm text-gray-500 mb-4">
                Vous avez vu tous les résultats
              </p>
              <button
                onClick={() => setShowFilters(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Affiner ma recherche
              </button>
            </motion.div>
          )}
        </div>
      </section>

      {/* Filter Drawer */}
      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setShowFilters(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 shadow-xl overflow-y-auto"
            >
              <FilterSidebar
                filters={advancedFilters}
                onFilterChange={updateAdvancedFilters}
                onReset={resetAdvancedFilters}
                categorySlug={filters.category?.slug ?? null}
                isMobile
                onClose={() => setShowFilters(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}

