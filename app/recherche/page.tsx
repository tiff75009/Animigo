"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Search,
  MapPin,
  ChevronDown,
  SlidersHorizontal,
  Calendar,
  X,
  Sparkles,
  LayoutGrid,
  List,
  Home,
  Scissors,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useServiceSearch, type ServiceResult } from "@/app/hooks/useSearch";
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
import { LocationSearchBar } from "@/app/components/search";
import FilterSidebar from "@/app/components/search/FilterSidebar";
import {
  SearchHeader,
  ServiceCardGrid,
  ServiceCardList,
  ANIMAL_TYPES,
  radiusOptions,
} from "@/app/components/platform";

export default function RecherchePage() {
  const {
    filters,
    advancedFilters,
    results,
    isLoading,
    setCategory,
    setAnimalType,
    setLocation,
    setRadius,
    setSearchMode,
    updateAdvancedFilters,
    resetAdvancedFilters,
    resetAllFilters,
  } = useServiceSearch();

  const categoriesData = useQuery(api.admin.serviceCategories.getActiveCategories) as CategoriesData | undefined;

  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const filtersRef = useRef<HTMLDivElement>(null);

  // Flatten categories from hierarchical structure
  const flattenedCategories: ServiceCategory[] = (() => {
    if (!categoriesData) return [];
    const result: ServiceCategory[] = [];

    // Add subcategories from each parent
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

    // Add root categories
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
  })();

  // Filter out "garde" category from services when in services mode
  const filteredCategories = flattenedCategories.filter((cat: ServiceCategory) =>
    filters.searchMode === "services" ? cat.slug !== "garde" : true
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasAdvancedFilters =
    advancedFilters.sortBy !== "relevance" ||
    advancedFilters.accountTypes.length > 0 ||
    advancedFilters.verifiedOnly ||
    advancedFilters.withPhotoOnly ||
    advancedFilters.hasGarden !== null ||
    advancedFilters.hasVehicle !== null ||
    advancedFilters.ownsAnimals.length > 0 ||
    advancedFilters.noAnimals ||
    advancedFilters.priceRange.min !== null ||
    advancedFilters.priceRange.max !== null;

  const hasAnyFilter =
    hasAdvancedFilters ||
    filters.category ||
    filters.animalType ||
    filters.date ||
    filters.startDate;

  const selectedAnimal = filters.animalType
    ? ANIMAL_TYPES.find((a) => a.id === filters.animalType)
    : null;

  const activeFiltersCount = [
    filters.category,
    filters.animalType,
    filters.date || filters.startDate,
    hasAdvancedFilters,
  ].filter(Boolean).length;


  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <SearchHeader
        onLocationClick={() => setShowLocationModal(true)}
        locationText={filters.location.text || undefined}
      />

      {/* Hero Section with Mode Toggle */}
      <section className="pt-20 sm:pt-24 pb-6 bg-gradient-to-b from-primary/5 via-background to-background relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Gradient orbs */}
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute -top-10 right-0 w-96 h-96 bg-gradient-to-bl from-secondary/15 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-gradient-to-tr from-purple/10 to-transparent rounded-full blur-2xl" />

          {/* Floating emojis - hidden on mobile */}
          <motion.span
            className="hidden md:block absolute top-24 left-[10%] text-3xl opacity-40"
            animate={{ y: [0, -10, 0], rotate: [0, 5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            🐕
          </motion.span>
          <motion.span
            className="hidden md:block absolute top-32 right-[15%] text-2xl opacity-30"
            animate={{ y: [0, -8, 0], rotate: [0, -5, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          >
            🐈
          </motion.span>
          <motion.span
            className="hidden lg:block absolute bottom-8 left-[20%] text-2xl opacity-25"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          >
            🐾
          </motion.span>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
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

            {/* Dynamic Title */}
            <motion.h1
              className="hidden sm:block text-xl md:text-2xl font-bold text-gray-900"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {filters.searchMode === "garde" ? (
                <>
                  Trouvez le{" "}
                  <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    garde parfait
                  </span>
                  {" "}pour votre compagnon
                </>
              ) : (
                <>
                  Des{" "}
                  <span className="bg-gradient-to-r from-secondary to-purple bg-clip-text text-transparent">
                    services de qualité
                  </span>
                  {" "}pour votre animal
                </>
              )}
            </motion.h1>
          </motion.div>
        </div>
      </section>

      {/* Filters Section - Mobile optimized */}
      <section className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm overflow-visible">
        <div ref={filtersRef} className="overflow-visible">
          {/* Animal Type Pills - Horizontal scroll on mobile */}
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-1 p-2 sm:p-3 sm:justify-center min-w-max sm:min-w-0">
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

          {/* Other Filters - Compact on mobile */}
          <div className="flex items-center gap-2 px-3 sm:px-4 pb-3 sm:justify-center overflow-visible">
            {/* Service Category - Only show in "services" mode */}
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

            {/* Radius Filter - Always visible but compact */}
            <FilterDropdown
              label={`${filters.radius} km`}
              icon={<MapPin className="w-3.5 h-3.5" />}
              isActive={false}
              isOpen={openDropdown === "radius"}
              onToggle={() => setOpenDropdown(openDropdown === "radius" ? null : "radius")}
              minWidth="min-w-[140px]"
            >
              {radiusOptions.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRadius(r);
                    setOpenDropdown(null);
                  }}
                  className={cn(
                    "w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors",
                    filters.radius === r && "bg-primary/5 text-primary font-medium"
                  )}
                >
                  {r} km
                </button>
              ))}
            </FilterDropdown>

            {/* Date Filter */}
            <button
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                filters.date || filters.startDate
                  ? filters.searchMode === "garde" ? "bg-primary text-white" : "bg-secondary text-white"
                  : "bg-gray-100 text-gray-700"
              )}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {filters.date
                  ? new Date(filters.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
                  : filters.startDate && filters.endDate
                  ? `${new Date(filters.startDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`
                  : "Dates"}
              </span>
            </button>

            {/* Main Filters Button - Opens drawer */}
            <button
              onClick={() => setShowFilters(true)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                hasAdvancedFilters
                  ? filters.searchMode === "garde" ? "bg-primary text-white" : "bg-secondary text-white"
                  : "bg-gray-100 text-gray-700"
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

            {hasAnyFilter && (
              <button
                onClick={resetAllFilters}
                className="flex items-center gap-1 px-2 py-1.5 text-sm font-medium text-gray-400 hover:text-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Results Header - Compact on mobile */}
          <div className="flex items-center justify-between gap-2 mb-4 sm:mb-8">
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
                {!isLoading && results.length > 0 && (
                  <p className="hidden sm:block text-sm text-gray-500 mt-0.5">
                    Services disponibles dans votre zone
                  </p>
                )}
              </div>
            </div>

            {/* View toggle - Hidden on mobile */}
            <div className="hidden sm:block">
              <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
            </div>
          </div>

          {/* Results Content */}
          {isLoading ? (
            <LoadingSkeletons viewMode={viewMode} />
          ) : results.length === 0 ? (
            <EmptyState onReset={resetAllFilters} />
          ) : viewMode === "grid" ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {results.map((service: ServiceResult, index: number) => (
                <ServiceCardGrid
                  key={`${service.announcerSlug}-${service.categorySlug}`}
                  service={service}
                  index={index}
                  onViewService={(announcerSlug, categorySlug) =>
                    router.push(`/annonceur/${announcerSlug}?service=${categorySlug}`)
                  }
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {results.map((service: ServiceResult, index: number) => (
                <ServiceCardList
                  key={`${service.announcerSlug}-${service.categorySlug}`}
                  service={service}
                  index={index}
                  onViewService={(announcerSlug, categorySlug) =>
                    router.push(`/annonceur/${announcerSlug}?service=${categorySlug}`)
                  }
                />
              ))}
            </motion.div>
          )}

          {/* Load more hint */}
          {!isLoading && results.length >= 8 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center mt-12"
            >
              <p className="text-sm text-gray-500 mb-4">
                Vous ne trouvez pas votre bonheur ?
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

      {/* Location Modal */}
      <AnimatePresence>
        {showLocationModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLocationModal(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg z-50"
            >
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-4">
                  <LocationSearchBar
                    value={filters.location}
                    onChange={(loc) => {
                      setLocation(loc);
                      setShowLocationModal(false);
                    }}
                    placeholder="Rechercher une ville..."
                  />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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

// Sub-components

function FilterDropdown({
  label,
  icon,
  isActive,
  isOpen,
  onToggle,
  minWidth = "min-w-[200px]",
  children,
}: {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  isOpen: boolean;
  onToggle: () => void;
  minWidth?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
          isActive
            ? "bg-primary text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        )}
      >
        <span className={cn(typeof icon === "string" ? "" : "")}>{icon}</span>
        <span>{label}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute top-full left-1/2 -translate-x-1/2 mt-2 py-2 bg-white rounded-xl shadow-xl border border-gray-200 z-[100]",
              minWidth
            )}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ViewModeToggle({
  viewMode,
  setViewMode,
}: {
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;
}) {
  return (
    <div className="flex items-center gap-1 p-1.5 bg-gray-100/80 rounded-xl border border-gray-200/50">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setViewMode("grid")}
        className={cn(
          "relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
          viewMode === "grid"
            ? "bg-white text-gray-900 shadow-md"
            : "text-gray-500 hover:text-gray-700"
        )}
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="hidden sm:inline">Grille</span>
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setViewMode("list")}
        className={cn(
          "relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
          viewMode === "list"
            ? "bg-white text-gray-900 shadow-md"
            : "text-gray-500 hover:text-gray-700"
        )}
      >
        <List className="w-4 h-4" />
        <span className="hidden sm:inline">Liste</span>
      </motion.button>
    </div>
  );
}

function LoadingSkeletons({ viewMode }: { viewMode: "grid" | "list" }) {
  if (viewMode === "grid") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100"
          >
            <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
            </div>
            <div className="p-5 space-y-3">
              <div className="h-5 bg-gray-200 rounded-lg w-2/3 animate-pulse" />
              <div className="h-4 bg-gray-100 rounded-lg w-1/2 animate-pulse" />
              <div className="flex gap-2">
                <div className="h-7 bg-gray-100 rounded-lg w-20 animate-pulse" />
                <div className="h-7 bg-gray-100 rounded-lg w-16 animate-pulse" />
              </div>
              <div className="h-12 bg-gradient-to-r from-primary/20 to-primary/10 rounded-xl animate-pulse" />
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex"
        >
          <div className="w-48 h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0 animate-pulse relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
          </div>
          <div className="flex-1 p-5 space-y-3">
            <div className="flex justify-between">
              <div className="h-6 bg-gray-200 rounded-lg w-1/3 animate-pulse" />
              <div className="h-6 bg-gray-100 rounded-lg w-20 animate-pulse" />
            </div>
            <div className="h-4 bg-gray-100 rounded-lg w-1/4 animate-pulse" />
            <div className="flex gap-2">
              <div className="h-7 bg-gray-100 rounded-lg w-16 animate-pulse" />
              <div className="h-7 bg-gray-100 rounded-lg w-20 animate-pulse" />
              <div className="h-7 bg-gray-100 rounded-lg w-24 animate-pulse" />
            </div>
            <div className="h-11 bg-gradient-to-r from-primary/20 to-primary/10 rounded-xl w-44 animate-pulse" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-16 px-4"
    >
      {/* Illustration */}
      <div className="relative w-32 h-32 mx-auto mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full animate-pulse" />
        <div className="absolute inset-2 bg-white rounded-full shadow-inner flex items-center justify-center">
          <div className="relative">
            <Search className="w-12 h-12 text-gray-300" />
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center">
              <span className="text-xs">?</span>
            </div>
          </div>
        </div>
        {/* Floating emojis */}
        <motion.span
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-2 -left-2 text-2xl"
        >
          🐕
        </motion.span>
        <motion.span
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          className="absolute -top-1 -right-3 text-2xl"
        >
          🐱
        </motion.span>
        <motion.span
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
          className="absolute -bottom-2 right-0 text-xl"
        >
          🐰
        </motion.span>
      </div>

      <h3 className="text-2xl font-bold text-gray-900 mb-3">
        Aucun prestataire trouvé
      </h3>
      <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
        Nous n&apos;avons pas trouvé de garde correspondant à vos critères.
        <br />
        Essayez d&apos;élargir votre recherche !
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onReset}
          className="px-6 py-3 bg-gradient-to-r from-primary to-primary/90 text-white font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Effacer tous les filtres
        </motion.button>
        <span className="text-gray-400 text-sm">ou</span>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors flex items-center gap-2"
        >
          <MapPin className="w-4 h-4" />
          Changer de localisation
        </motion.button>
      </div>
    </motion.div>
  );
}
