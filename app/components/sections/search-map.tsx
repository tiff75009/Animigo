"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  MapPin,
  Home,
  Scissors,
  ChevronDown,
  SlidersHorizontal,
  X,
  Target,
  Star,
  Navigation,
  ArrowRight,
  Heart,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useAuth } from "@/app/hooks/useAuth";
import { LocationSearchBar, DateSelector } from "@/app/components/search";
import type { ServiceSearchResult } from "@/app/components/platform/ServiceCard";

// Types
interface CategoriesData {
  parentCategories: Array<{
    id: string;
    slug: string;
    name: string;
    icon?: string;
    subcategories: Array<{
      id: string;
      slug: string;
      name: string;
      icon?: string;
      billingType?: string;
      allowRangeBooking?: boolean;
    }>;
  }>;
  rootCategories: Array<{
    id: string;
    slug: string;
    name: string;
    icon?: string;
    billingType?: string;
    allowRangeBooking?: boolean;
  }>;
}

interface LocationData {
  text: string;
  coordinates?: { lat: number; lng: number };
}

// Dynamically import the map component
const MapComponent = dynamic(() => import("./map-component"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 rounded-2xl flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
        <p className="text-text-light">Chargement de la carte...</p>
      </div>
    </div>
  ),
});

// Constants
const ANIMAL_TYPES = [
  { id: "chien", label: "Chiens", emoji: "🐕" },
  { id: "chat", label: "Chats", emoji: "🐈" },
  { id: "oiseau", label: "Oiseaux", emoji: "🦜" },
  { id: "rongeur", label: "Rongeurs", emoji: "🐹" },
  { id: "poisson", label: "Poissons", emoji: "🐠" },
  { id: "reptile", label: "Reptiles", emoji: "🦎" },
  { id: "nac", label: "NAC", emoji: "🐾" },
];

const radiusOptions = [5, 10, 15, 20, 30, 50];

const priceUnitLabels: Record<string, string> = {
  hour: "/h",
  day: "/j",
  week: "/sem",
  month: "/mois",
  flat: "",
};

// Helpers
function formatPrice(cents: number): string {
  return (cents / 100).toFixed(0) + "€";
}

function extractCity(location: string): string {
  const parts = location.split(",").map((p) => p.trim());
  const lastPart = parts[parts.length - 1];
  if (/^\d/.test(lastPart)) {
    const cityMatch = lastPart.match(/\d+\s+(.+)/);
    return cityMatch ? cityMatch[1] : lastPart;
  }
  return lastPart;
}

function formatDistance(distance?: number): string | null {
  if (distance === undefined) return null;
  if (distance < 1) return `${Math.round(distance * 1000)}m`;
  return `${distance.toFixed(1)} km`;
}

// Commission rate (15%)
const COMMISSION_RATE = 15;
function calculatePriceWithCommission(basePriceCents: number): number {
  const commission = Math.round((basePriceCents * COMMISSION_RATE) / 100);
  return basePriceCents + commission;
}

// =============================================
// SUB-COMPONENTS
// =============================================

// Mode selector (Garde vs Services)
function ModeSelector({
  mode,
  onModeChange,
}: {
  mode: "garde" | "services";
  onModeChange: (mode: "garde" | "services") => void;
}) {
  return (
    <div className="inline-flex bg-white rounded-2xl p-1.5 shadow-lg shadow-primary/10 border border-foreground/5">
      <button
        onClick={() => onModeChange("garde")}
        className={cn(
          "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all",
          mode === "garde"
            ? "bg-primary text-white shadow-md"
            : "text-foreground/70 hover:text-foreground hover:bg-gray-50"
        )}
      >
        <Home className="w-5 h-5" />
        <span>Garde</span>
      </button>
      <button
        onClick={() => onModeChange("services")}
        className={cn(
          "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all",
          mode === "services"
            ? "bg-primary text-white shadow-md"
            : "text-foreground/70 hover:text-foreground hover:bg-gray-50"
        )}
      >
        <Scissors className="w-5 h-5" />
        <span>Services</span>
      </button>
    </div>
  );
}

// Service category dropdown
function ServiceCategorySelector({
  categories,
  selectedCategory,
  onSelect,
}: {
  categories: Array<{ slug: string; name: string; icon?: string }>;
  selectedCategory: string | null;
  onSelect: (slug: string | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = categories.find(c => c.slug === selectedCategory);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-3 bg-white rounded-xl border-2 border-foreground/10 hover:border-foreground/20 transition-all min-w-[180px]"
      >
        {selected ? (
          <>
            <span className="text-lg">{selected.icon || "📋"}</span>
            <span className="font-medium text-foreground">{selected.name}</span>
          </>
        ) : (
          <>
            <Scissors className="w-5 h-5 text-primary" />
            <span className="text-foreground/70">Type de service</span>
          </>
        )}
        <ChevronDown className={cn("w-4 h-4 ml-auto transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-foreground/10 z-50 overflow-hidden max-h-80 overflow-y-auto"
          >
            <button
              onClick={() => { onSelect(null); setIsOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors",
                !selectedCategory && "bg-primary/5 text-primary"
              )}
            >
              <span className="text-lg">✨</span>
              <span className="font-medium">Tous les services</span>
            </button>
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => { onSelect(cat.slug); setIsOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors",
                  selectedCategory === cat.slug && "bg-primary/5 text-primary"
                )}
              >
                <span className="text-lg">{cat.icon || "📋"}</span>
                <span className="font-medium">{cat.name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Animal chips
function AnimalChips({
  selectedAnimal,
  onSelect,
}: {
  selectedAnimal: string | null;
  onSelect: (animal: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all font-medium",
          !selectedAnimal
            ? "border-primary bg-primary text-white"
            : "border-foreground/10 bg-white text-foreground hover:border-foreground/20"
        )}
      >
        <span>🐾</span>
        <span>Tous</span>
      </button>
      {ANIMAL_TYPES.slice(0, 5).map((animal) => (
        <button
          key={animal.id}
          onClick={() => onSelect(selectedAnimal === animal.id ? null : animal.id)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all font-medium",
            selectedAnimal === animal.id
              ? "border-primary bg-primary text-white"
              : "border-foreground/10 bg-white text-foreground hover:border-foreground/20"
          )}
        >
          <span>{animal.emoji}</span>
          <span className="hidden sm:inline">{animal.label}</span>
        </button>
      ))}
    </div>
  );
}

// Service card for homepage (simpler than ServiceCardGrid)
function HomeServiceCard({
  service,
  onSelect,
  isSelected,
  index,
}: {
  service: ServiceSearchResult;
  onSelect: () => void;
  isSelected: boolean;
  index: number;
}) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(false);
  const priceWithCommission = calculatePriceWithCommission(service.basePrice);
  const city = extractCity(service.location);
  const distanceText = formatDistance(service.distance);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onSelect}
      className={cn(
        "bg-white rounded-2xl p-4 cursor-pointer transition-all border-2",
        isSelected
          ? "border-primary shadow-lg shadow-primary/20"
          : "border-transparent hover:border-primary/30 hover:shadow-md"
      )}
    >
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary/10 to-secondary/10">
          {service.profileImage ? (
            <Image
              src={service.profileImage}
              alt={service.firstName}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-3xl">{service.categoryIcon}</span>
            </div>
          )}
          {service.isIdentityVerified && (
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow">
              <ShieldCheck className="w-4 h-4 text-secondary" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-foreground truncate">
                {service.firstName} {service.lastName.charAt(0)}.
              </h3>
              <div className="flex items-center gap-2 text-sm text-text-light">
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate">{city}</span>
                {distanceText && (
                  <span className="text-primary font-medium flex items-center gap-1">
                    <Navigation className="w-3 h-3" />
                    {distanceText}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setIsFavorite(!isFavorite); }}
              className={cn(
                "p-1.5 rounded-full transition-all",
                isFavorite ? "text-red-500" : "text-gray-300 hover:text-red-400"
              )}
            >
              <Heart className={cn("w-5 h-5", isFavorite && "fill-current")} />
            </button>
          </div>

          {/* Service badge */}
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-lg">
              {service.categoryIcon} {service.categoryName}
            </span>
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span className="text-sm font-semibold">{service.rating.toFixed(1)}</span>
              <span className="text-xs text-text-light">({service.reviewCount})</span>
            </div>
          </div>

          {/* Animals & Price */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1">
              {service.animalTypes?.slice(0, 4).map((animal, i) => {
                const info = ANIMAL_TYPES.find(a => a.id === animal);
                return <span key={i} className="text-sm" title={info?.label}>{info?.emoji || "🐾"}</span>;
              })}
              {(service.animalTypes?.length || 0) > 4 && (
                <span className="text-xs text-text-light">+{service.animalTypes!.length - 4}</span>
              )}
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-primary">{formatPrice(priceWithCommission)}</span>
              <span className="text-sm text-text-light">{priceUnitLabels[service.basePriceUnit] || ""}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA (shown when selected) */}
      {isSelected && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-4 pt-4 border-t border-gray-100"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/annonceur/${service.announcerSlug}?service=${service.categorySlug}`);
            }}
            className="w-full py-2.5 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <span>Voir la prestation</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </motion.article>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

export function SearchMapSection() {
  const router = useRouter();
  const { token } = useAuth();

  // State
  const [searchMode, setSearchMode] = useState<"garde" | "services">("garde");
  const [selectedAnimal, setSelectedAnimal] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationData>({ text: "" });
  const [radius, setRadius] = useState(10);
  const [date, setDate] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceSearchResult | null>(null);

  // Fetch categories
  const categoriesData = useQuery(api.admin.serviceCategories.getActiveCategories) as CategoriesData | undefined;

  // Get client location
  const clientLocation = useQuery(
    api.client.profile.getClientCoordinates,
    token ? { token } : "skip"
  );

  // Build service categories list (excluding garde)
  const serviceCategories = useMemo(() => {
    if (!categoriesData) return [];
    const categories: Array<{ slug: string; name: string; icon?: string }> = [];
    for (const parent of categoriesData.parentCategories) {
      for (const sub of parent.subcategories) {
        if (sub.slug !== "garde") {
          categories.push({ slug: sub.slug, name: sub.name, icon: sub.icon });
        }
      }
    }
    for (const cat of categoriesData.rootCategories) {
      if (cat.slug !== "garde") {
        categories.push({ slug: cat.slug, name: cat.name, icon: cat.icon });
      }
    }
    return categories;
  }, [categoriesData]);

  // Build query args
  const queryArgs = useMemo(() => {
    const args: {
      categorySlug?: string;
      excludeCategory?: string;
      animalType?: string;
      coordinates?: { lat: number; lng: number };
      radiusKm?: number;
      date?: string;
      startDate?: string;
      endDate?: string;
    } = {};

    if (searchMode === "garde") {
      args.categorySlug = "garde";
    } else {
      if (selectedCategory) {
        args.categorySlug = selectedCategory;
      } else {
        args.excludeCategory = "garde";
      }
    }

    if (selectedAnimal) {
      args.animalType = selectedAnimal;
    }

    if (location.coordinates) {
      args.coordinates = location.coordinates;
      args.radiusKm = radius;
    } else if (clientLocation?.coordinates) {
      args.coordinates = clientLocation.coordinates;
      args.radiusKm = radius;
    }

    if (date) args.date = date;
    if (startDate && endDate) {
      args.startDate = startDate;
      args.endDate = endDate;
    }

    return args;
  }, [searchMode, selectedCategory, selectedAnimal, location, clientLocation, radius, date, startDate, endDate]);

  // Fetch services
  const results = useQuery(api.public.search.searchServices, queryArgs);

  // Handlers
  const handleModeChange = useCallback((mode: "garde" | "services") => {
    setSearchMode(mode);
    setSelectedCategory(null);
    setDate(null);
    setStartDate(null);
    setEndDate(null);
    setSelectedService(null);
  }, []);

  const handleDateChange = useCallback((d: string | null) => {
    setDate(d);
    setStartDate(null);
    setEndDate(null);
  }, []);

  const handleDateRangeChange = useCallback((start: string | null, end: string | null) => {
    setStartDate(start);
    setEndDate(end);
    setDate(null);
  }, []);

  const resetFilters = useCallback(() => {
    setSelectedAnimal(null);
    setSelectedCategory(null);
    setLocation({ text: "" });
    setRadius(10);
    setDate(null);
    setStartDate(null);
    setEndDate(null);
    setSelectedService(null);
  }, []);

  const hasActiveFilters = selectedAnimal || selectedCategory || location.text || date || startDate;
  const isLoading = results === undefined;
  const services = (results ?? []) as ServiceSearchResult[];

  // Map data - convert services to map markers format
  const mapSitters = useMemo(() => {
    return services
      .filter((s) => s.distance !== undefined && s.coordinates)
      .map((s) => ({
        id: s.serviceId as string,
        firstName: s.firstName,
        lastName: s.lastName,
        avatar: "👤",
        profileImage: s.profileImage,
        location: s.location,
        coordinates: s.coordinates!,
        services: [s.categoryName],
        rating: s.rating,
        reviewCount: s.reviewCount,
        hourlyRate: s.basePrice / 100,
        verified: s.verified,
        available: s.availability.status === "available",
        acceptedAnimals: s.animalTypes,
        distance: s.distance,
        statusType: s.statusType,
        basePrice: s.basePrice,
      }));
  }, [services]);

  // Search center for map
  const searchCenter = location.coordinates || clientLocation?.coordinates || null;

  return (
    <section id="recherche" className="pt-28 pb-20 bg-gradient-to-b from-primary/5 via-background to-background relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 text-6xl opacity-20 animate-float">🐕</div>
        <div className="absolute top-40 right-20 text-5xl opacity-20 animate-float" style={{ animationDelay: "0.5s" }}>🐈</div>
        <div className="absolute bottom-40 left-20 text-4xl opacity-20 animate-float" style={{ animationDelay: "1s" }}>🐰</div>
        <div className="absolute bottom-20 right-10 text-5xl opacity-20 animate-float" style={{ animationDelay: "1.5s" }}>🦜</div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="inline-block mb-4"
          >
            <span className="text-6xl">🐾</span>
          </motion.div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4">
            {searchMode === "garde" ? (
              <>Faites garder votre <span className="text-primary">compagnon</span></>
            ) : (
              <>Des services <span className="text-primary">sur mesure</span> pour votre animal</>
            )}
          </h1>
          <p className="text-text-light text-lg md:text-xl max-w-2xl mx-auto">
            {searchMode === "garde"
              ? "Trouvez un gardien de confiance près de chez vous"
              : "Toilettage, dressage, promenade... Tous les services pour votre compagnon"}
          </p>
        </motion.div>

        {/* Mode Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center mb-6"
        >
          <ModeSelector mode={searchMode} onModeChange={handleModeChange} />
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl shadow-xl shadow-primary/5 border border-foreground/5 p-6 mb-8"
        >
          {/* Main row */}
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
            {searchMode === "services" && (
              <ServiceCategorySelector
                categories={serviceCategories}
                selectedCategory={selectedCategory}
                onSelect={setSelectedCategory}
              />
            )}

            <div className="flex-1">
              <LocationSearchBar
                value={location}
                onChange={setLocation}
                placeholder="Ville, code postal..."
              />
            </div>

            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl">
              <Target className="w-5 h-5 text-primary" />
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="bg-transparent text-foreground font-medium focus:outline-none cursor-pointer"
              >
                {radiusOptions.map((r) => (
                  <option key={r} value={r}>{r} km</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all font-medium",
                showAdvancedFilters
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-foreground/10 bg-white text-foreground hover:border-foreground/20"
              )}
            >
              <SlidersHorizontal className="w-5 h-5" />
              <span className="hidden sm:inline">Filtres</span>
            </button>
          </div>

          {/* Animal chips */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-sm font-medium text-foreground/70 mb-3 text-center">Quel animal avez-vous ?</p>
            <AnimalChips selectedAnimal={selectedAnimal} onSelect={setSelectedAnimal} />
          </div>

          {/* Advanced filters */}
          <AnimatePresence>
            {showAdvancedFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-6 pt-6 border-t border-gray-100 flex flex-wrap gap-4 justify-center">
                  <DateSelector
                    billingType={searchMode === "garde" ? "daily" : "hourly"}
                    date={date}
                    time={null}
                    onDateChange={handleDateChange}
                    onTimeChange={() => {}}
                    startDate={startDate}
                    endDate={endDate}
                    onDateRangeChange={handleDateRangeChange}
                    allowRangeBooking={searchMode === "garde"}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {hasActiveFilters && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={resetFilters}
                className="flex items-center gap-2 px-4 py-2 text-sm text-primary hover:bg-primary/5 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
                Réinitialiser
              </button>
            </div>
          )}
        </motion.div>

        {/* Results count */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                <p className="text-text-light">Recherche en cours...</p>
              </div>
            ) : (
              <p className="text-foreground">
                <span className="font-bold text-2xl text-primary">{services.length}</span>{" "}
                <span className="text-text-light">
                  {searchMode === "garde" ? "gardien" : "service"}{services.length > 1 ? "s" : ""} trouvé{services.length > 1 ? "s" : ""}
                </span>
              </p>
            )}
          </div>

          <button
            onClick={() => router.push(`/recherche?mode=${searchMode}${selectedAnimal ? `&animal=${selectedAnimal}` : ""}${selectedCategory ? `&category=${selectedCategory}` : ""}`)}
            className="flex items-center gap-2 px-4 py-2 text-primary font-medium hover:bg-primary/5 rounded-xl transition-colors"
          >
            <span>Voir tout</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>

        {/* Map and Results Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Results List */}
          <div className="order-2 lg:order-1">
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
              {services.length === 0 && !isLoading ? (
                <div className="bg-white rounded-2xl p-8 text-center shadow-md">
                  <div className="text-5xl mb-4">🔍</div>
                  <h4 className="font-semibold text-foreground mb-2">Aucun résultat</h4>
                  <p className="text-text-light mb-4">
                    {hasActiveFilters ? "Essayez de modifier vos critères" : "Aucun prestataire disponible"}
                  </p>
                  {hasActiveFilters && (
                    <button
                      onClick={resetFilters}
                      className="px-4 py-2 bg-primary text-white rounded-xl font-medium hover:bg-primary/90"
                    >
                      Réinitialiser
                    </button>
                  )}
                </div>
              ) : (
                services.slice(0, 8).map((service, index) => (
                  <HomeServiceCard
                    key={`${service.serviceId}-${index}`}
                    service={service}
                    onSelect={() => setSelectedService(
                      selectedService?.serviceId === service.serviceId ? null : service
                    )}
                    isSelected={selectedService?.serviceId === service.serviceId}
                    index={index}
                  />
                ))
              )}

              {services.length > 8 && (
                <button
                  onClick={() => router.push(`/recherche?mode=${searchMode}`)}
                  className="w-full py-4 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-2xl shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  <span>Voir les {services.length - 8} autres résultats</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Map */}
          <div className="order-1 lg:order-2">
            <div className="h-[400px] lg:h-[600px] rounded-2xl overflow-hidden shadow-lg sticky top-24">
              <MapComponent
                sitters={mapSitters as any}
                selectedSitter={selectedService && selectedService.coordinates ? {
                  id: selectedService.serviceId as string,
                  firstName: selectedService.firstName,
                  lastName: selectedService.lastName,
                  avatar: "👤",
                  profileImage: selectedService.profileImage,
                  location: selectedService.location,
                  coordinates: selectedService.coordinates,
                  services: [selectedService.categoryName],
                  rating: selectedService.rating,
                  reviewCount: selectedService.reviewCount,
                  hourlyRate: selectedService.basePrice / 100,
                  verified: selectedService.verified,
                  available: selectedService.availability.status === "available",
                  acceptedAnimals: selectedService.animalTypes,
                  distance: selectedService.distance,
                  statusType: selectedService.statusType,
                  basePrice: selectedService.basePrice,
                } as any : null}
                onSitterSelect={(sitter: any) => {
                  const found = services.find(s => s.serviceId === sitter.id);
                  if (found) setSelectedService(found);
                }}
                searchCenter={searchCenter}
                searchRadius={radius}
                mapStyle="plan"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
