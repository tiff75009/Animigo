"use client";

import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useSearch, type AnnouncerResult } from "@/app/hooks/useSearch";
import { LocationSearchBar } from "@/app/components/search";
import FilterSidebar from "@/app/components/search/FilterSidebar";
import {
  SearchHeader,
  AnnouncerCardGrid,
  AnnouncerCardList,
  FormulasModal,
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
    updateAdvancedFilters,
    resetAdvancedFilters,
    resetAllFilters,
  } = useSearch();

  const categories = useQuery(api.admin.serviceCategories.getActiveCategories);

  const [showFilters, setShowFilters] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [formulasModalAnnouncer, setFormulasModalAnnouncer] = useState<AnnouncerResult | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const filtersRef = useRef<HTMLDivElement>(null);

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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <SearchHeader
        onLocationClick={() => setShowLocationModal(true)}
        locationText={filters.location.text || undefined}
      />

      {/* Hero Section */}
      <section className="pt-24 pb-6 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Trouvez le <span className="text-primary">garde idéal</span> pour votre animal
            </h1>
            <p className="text-gray-500">
              {isLoading ? "Recherche en cours..." : `${results.length} prestataires disponibles près de chez vous`}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filters Section */}
      <section className="sticky top-16 z-30 bg-white/80 backdrop-blur-md border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-4 overflow-visible">
          <div ref={filtersRef} className="flex items-center gap-3 flex-wrap">
            {/* Category Filter */}
            <FilterDropdown
              label={filters.category?.name || "Type de service"}
              icon={filters.category?.icon || "🔍"}
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
                  "w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-gray-50 transition-colors",
                  !filters.category && "bg-primary/5 text-primary"
                )}
              >
                <span>🔍</span>
                <span>Tous les services</span>
              </button>
              {categories?.map((cat) => (
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
                    "w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-gray-50 transition-colors",
                    filters.category?.slug === cat.slug && "bg-primary/5 text-primary"
                  )}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </FilterDropdown>

            {/* Animal Type Filter */}
            <FilterDropdown
              label={selectedAnimal?.label || "Type d'animal"}
              icon={selectedAnimal?.emoji || "🐾"}
              isActive={!!filters.animalType}
              isOpen={openDropdown === "animal"}
              onToggle={() => setOpenDropdown(openDropdown === "animal" ? null : "animal")}
            >
              <button
                onClick={() => {
                  setAnimalType(null);
                  setOpenDropdown(null);
                }}
                className={cn(
                  "w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-gray-50 transition-colors",
                  !filters.animalType && "bg-primary/5 text-primary"
                )}
              >
                <span>🐾</span>
                <span>Tous les animaux</span>
              </button>
              {ANIMAL_TYPES.map((animal) => (
                <button
                  key={animal.id}
                  onClick={() => {
                    setAnimalType(animal.id);
                    setOpenDropdown(null);
                  }}
                  className={cn(
                    "w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-gray-50 transition-colors",
                    filters.animalType === animal.id && "bg-primary/5 text-primary"
                  )}
                >
                  <span>{animal.emoji}</span>
                  <span>{animal.label}</span>
                </button>
              ))}
            </FilterDropdown>

            {/* Radius Filter */}
            <FilterDropdown
              label={`${filters.radius} km`}
              icon={<MapPin className="w-4 h-4" />}
              isActive={false}
              isOpen={openDropdown === "radius"}
              onToggle={() => setOpenDropdown(openDropdown === "radius" ? null : "radius")}
              minWidth="min-w-[120px]"
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
                    filters.radius === r && "bg-primary/5 text-primary"
                  )}
                >
                  {r} km
                </button>
              ))}
            </FilterDropdown>

            {/* Date Filter */}
            <button
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                filters.date || filters.startDate
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              <Calendar className="w-4 h-4" />
              <span>
                {filters.date
                  ? new Date(filters.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
                  : filters.startDate && filters.endDate
                  ? `${new Date(filters.startDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} - ${new Date(filters.endDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`
                  : "Dates"}
              </span>
            </button>

            {/* Advanced Filters */}
            <button
              onClick={() => setShowFilters(true)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                hasAdvancedFilters
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Plus de filtres</span>
              {hasAdvancedFilters && (
                <span className="w-5 h-5 bg-white/20 rounded-full text-xs flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <div className="flex-1" />

            {hasAnyFilter && (
              <button
                onClick={resetAllFilters}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/5 rounded-xl transition-colors whitespace-nowrap"
              >
                <X className="w-4 h-4" />
                <span>Effacer tout</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-gray-900">
                {isLoading ? "Recherche en cours..." : `${results.length} prestataire${results.length > 1 ? "s" : ""} trouvé${results.length > 1 ? "s" : ""}`}
              </h2>
            </div>

            <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
          </div>

          {isLoading ? (
            <LoadingSkeletons viewMode={viewMode} />
          ) : results.length === 0 ? (
            <EmptyState onReset={resetAllFilters} />
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {results.map((announcer, index) => (
                <AnnouncerCardGrid
                  key={announcer.id}
                  announcer={announcer}
                  index={index}
                  onShowFormulas={() => setFormulasModalAnnouncer(announcer)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((announcer, index) => (
                <AnnouncerCardList
                  key={announcer.id}
                  announcer={announcer}
                  index={index}
                  onShowFormulas={() => setFormulasModalAnnouncer(announcer)}
                />
              ))}
            </div>
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

      {/* Formulas Modal */}
      {formulasModalAnnouncer && (
        <FormulasModal
          isOpen={!!formulasModalAnnouncer}
          onClose={() => setFormulasModalAnnouncer(null)}
          announcer={formulasModalAnnouncer}
          searchFilters={{
            category: filters.category ? { slug: filters.category.slug, name: filters.category.name } : null,
            date: filters.date,
            time: filters.time,
            startDate: filters.startDate,
            endDate: filters.endDate,
          }}
        />
      )}
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
  minWidth = "min-w-[180px]",
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
          "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
          isActive
            ? "bg-primary text-white shadow-md shadow-primary/20"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        )}
      >
        <span>{icon}</span>
        <span>{label}</span>
        <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className={cn("absolute top-full left-0 mt-2 py-2 bg-white rounded-xl shadow-xl border border-gray-100 z-[100]", minWidth)}
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
    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setViewMode("grid")}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
          viewMode === "grid"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        )}
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="hidden sm:inline">Grille</span>
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setViewMode("list")}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
          viewMode === "list"
            ? "bg-white text-gray-900 shadow-sm"
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
          <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
            <div className="aspect-[4/3] bg-gray-200" />
            <div className="p-5 space-y-3">
              <div className="h-5 bg-gray-200 rounded w-2/3" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="flex gap-2">
                <div className="h-6 bg-gray-200 rounded-lg w-20" />
                <div className="h-6 bg-gray-200 rounded-lg w-16" />
              </div>
              <div className="h-11 bg-gray-200 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse flex">
          <div className="w-48 h-40 bg-gray-200 flex-shrink-0" />
          <div className="flex-1 p-5 space-y-3">
            <div className="flex justify-between">
              <div className="h-6 bg-gray-200 rounded w-1/3" />
              <div className="h-6 bg-gray-200 rounded w-20" />
            </div>
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            <div className="flex gap-2">
              <div className="h-6 bg-gray-200 rounded-lg w-16" />
              <div className="h-6 bg-gray-200 rounded-lg w-20" />
              <div className="h-6 bg-gray-200 rounded-lg w-24" />
            </div>
            <div className="h-10 bg-gray-200 rounded-xl w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-16"
    >
      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Search className="w-10 h-10 text-gray-300" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        Aucun résultat trouvé
      </h3>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        Essayez de modifier vos critères de recherche ou d&apos;élargir votre zone géographique
      </p>
      <button
        onClick={onReset}
        className="px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors"
      >
        Réinitialiser les filtres
      </button>
    </motion.div>
  );
}
