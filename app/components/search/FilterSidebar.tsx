"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/app/lib/utils";
import {
  Filter,
  ChevronDown,
  RotateCcw,
  ArrowUpDown,
  User,
  ShieldCheck,
  Camera,
  Home,
  Car,
  Dog,
  Cat,
  Euro,
  X,
  MapPin,
} from "lucide-react";

// Types pour les filtres avancés
export interface AdvancedFilters {
  sortBy: "relevance" | "price_asc" | "price_desc" | "rating" | "distance";
  accountTypes: ("particulier" | "micro_entrepreneur" | "pro")[];
  verifiedOnly: boolean;
  withPhotoOnly: boolean;
  hasGarden: boolean | null;
  hasVehicle: boolean | null;
  ownsAnimals: string[];
  noAnimals: boolean;
  priceRange: { min: number | null; max: number | null };
  serviceLocation: ("announcer_home" | "client_home")[];
}

export const defaultAdvancedFilters: AdvancedFilters = {
  sortBy: "relevance",
  accountTypes: [],
  verifiedOnly: false,
  withPhotoOnly: false,
  hasGarden: null,
  hasVehicle: null,
  ownsAnimals: [],
  noAnimals: false,
  priceRange: { min: null, max: null },
  serviceLocation: [],
};

interface FilterSidebarProps {
  filters: AdvancedFilters;
  onFilterChange: (filters: AdvancedFilters) => void;
  onReset: () => void;
  categorySlug: string | null;
  className?: string;
  isMobile?: boolean;
  onClose?: () => void;
}

// Filtres contextuels par catégorie
const getFiltersForCategory = (categorySlug: string | null): string[] => {
  const baseFilters = ["sortBy", "accountTypes", "verified", "withPhoto", "priceRange", "serviceLocation"];

  if (!categorySlug) return baseFilters;

  const categoryFilters: Record<string, string[]> = {
    garde: [...baseFilters, "hasGarden", "ownsAnimals"],
    pension: [...baseFilters, "hasGarden", "ownsAnimals"],
    promenade: [...baseFilters, "hasVehicle"],
    transport: [...baseFilters, "hasVehicle"],
    toilettage: baseFilters,
    dressage: baseFilters,
    visite: baseFilters,
    medical: baseFilters,
  };

  return categoryFilters[categorySlug] || baseFilters;
};

// Section dépliable
function FilterSection({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-foreground/10 last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 px-1 text-left hover:bg-foreground/5 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <span className="font-medium text-foreground">{title}</span>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-foreground/50 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pb-4 px-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Checkbox personnalisée
function FilterCheckbox({
  label,
  checked,
  onChange,
  icon,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-3 py-1.5 cursor-pointer group">
      <div
        className={cn(
          "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
          checked
            ? "bg-primary border-primary"
            : "border-foreground/20 group-hover:border-foreground/40"
        )}
      >
        {checked && (
          <motion.svg
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-3 h-3 text-white"
            viewBox="0 0 12 12"
          >
            <path
              fill="currentColor"
              d="M10.28 2.28L4.5 8.06L1.72 5.28a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l6.5-6.5a.75.75 0 0 0-1.06-1.06z"
            />
          </motion.svg>
        )}
      </div>
      {icon}
      <span className="text-sm text-foreground/80">{label}</span>
    </label>
  );
}

// Radio personnalisé
function FilterRadio({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-3 py-1.5 cursor-pointer group">
      <div
        className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
          checked
            ? "border-primary"
            : "border-foreground/20 group-hover:border-foreground/40"
        )}
      >
        {checked && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-2.5 h-2.5 rounded-full bg-primary"
          />
        )}
      </div>
      <span className="text-sm text-foreground/80">{label}</span>
    </label>
  );
}

export default function FilterSidebar({
  filters,
  onFilterChange,
  onReset,
  categorySlug,
  className,
  isMobile = false,
  onClose,
}: FilterSidebarProps) {
  const availableFilters = getFiltersForCategory(categorySlug);

  const updateFilter = <K extends keyof AdvancedFilters>(
    key: K,
    value: AdvancedFilters[K]
  ) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const toggleAccountType = (type: "particulier" | "micro_entrepreneur" | "pro") => {
    const newTypes = filters.accountTypes.includes(type)
      ? filters.accountTypes.filter((t) => t !== type)
      : [...filters.accountTypes, type];
    updateFilter("accountTypes", newTypes);
  };

  const toggleOwnedAnimal = (animal: string) => {
    const newAnimals = filters.ownsAnimals.includes(animal)
      ? filters.ownsAnimals.filter((a) => a !== animal)
      : [...filters.ownsAnimals, animal];
    updateFilter("ownsAnimals", newAnimals);
  };

  const toggleServiceLocation = (location: "announcer_home" | "client_home") => {
    const newLocations = filters.serviceLocation.includes(location)
      ? filters.serviceLocation.filter((l) => l !== location)
      : [...filters.serviceLocation, location];
    updateFilter("serviceLocation", newLocations);
  };

  const hasActiveFilters =
    filters.sortBy !== "relevance" ||
    filters.accountTypes.length > 0 ||
    filters.verifiedOnly ||
    filters.withPhotoOnly ||
    filters.hasGarden !== null ||
    filters.hasVehicle !== null ||
    filters.ownsAnimals.length > 0 ||
    filters.noAnimals ||
    filters.priceRange.min !== null ||
    filters.priceRange.max !== null ||
    filters.serviceLocation.length > 0;

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-foreground/10 shadow-sm",
        isMobile ? "h-full" : "sticky top-24",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-foreground/10">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Filtres</h3>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
              Actifs
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <motion.button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1 px-2 py-1 text-xs text-foreground/60 hover:text-primary transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RotateCcw className="w-3 h-3" />
              Réinitialiser
            </motion.button>
          )}
          {isMobile && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-foreground/60 hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Tri */}
        {availableFilters.includes("sortBy") && (
          <FilterSection title="Trier par" icon={ArrowUpDown}>
            <div className="space-y-1">
              <FilterRadio
                label="Pertinence"
                checked={filters.sortBy === "relevance"}
                onChange={() => updateFilter("sortBy", "relevance")}
              />
              <FilterRadio
                label="Prix croissant"
                checked={filters.sortBy === "price_asc"}
                onChange={() => updateFilter("sortBy", "price_asc")}
              />
              <FilterRadio
                label="Prix décroissant"
                checked={filters.sortBy === "price_desc"}
                onChange={() => updateFilter("sortBy", "price_desc")}
              />
              <FilterRadio
                label="Mieux notés"
                checked={filters.sortBy === "rating"}
                onChange={() => updateFilter("sortBy", "rating")}
              />
              <FilterRadio
                label="Plus proches"
                checked={filters.sortBy === "distance"}
                onChange={() => updateFilter("sortBy", "distance")}
              />
            </div>
          </FilterSection>
        )}

        {/* Type d'annonceur */}
        {availableFilters.includes("accountTypes") && (
          <FilterSection title="Type d'annonceur" icon={User}>
            <div className="space-y-1">
              <FilterCheckbox
                label="Particulier"
                checked={filters.accountTypes.includes("particulier")}
                onChange={() => toggleAccountType("particulier")}
              />
              <FilterCheckbox
                label="Micro-entrepreneur"
                checked={filters.accountTypes.includes("micro_entrepreneur")}
                onChange={() => toggleAccountType("micro_entrepreneur")}
              />
              <FilterCheckbox
                label="Professionnel"
                checked={filters.accountTypes.includes("pro")}
                onChange={() => toggleAccountType("pro")}
              />
            </div>
          </FilterSection>
        )}

        {/* Profil */}
        {(availableFilters.includes("verified") ||
          availableFilters.includes("withPhoto")) && (
          <FilterSection title="Profil" icon={ShieldCheck}>
            <div className="space-y-1">
              {availableFilters.includes("verified") && (
                <FilterCheckbox
                  label="Profil vérifié"
                  checked={filters.verifiedOnly}
                  onChange={(checked) => updateFilter("verifiedOnly", checked)}
                  icon={<ShieldCheck className="w-4 h-4 text-green-500" />}
                />
              )}
              {availableFilters.includes("withPhoto") && (
                <FilterCheckbox
                  label="Avec photo"
                  checked={filters.withPhotoOnly}
                  onChange={(checked) => updateFilter("withPhotoOnly", checked)}
                  icon={<Camera className="w-4 h-4 text-blue-500" />}
                />
              )}
            </div>
          </FilterSection>
        )}

        {/* Équipements */}
        {(availableFilters.includes("hasGarden") ||
          availableFilters.includes("hasVehicle")) && (
          <FilterSection title="Équipements" icon={Home}>
            <div className="space-y-1">
              {availableFilters.includes("hasGarden") && (
                <FilterCheckbox
                  label="Dispose d'un jardin"
                  checked={filters.hasGarden === true}
                  onChange={(checked) =>
                    updateFilter("hasGarden", checked ? true : null)
                  }
                  icon={<Home className="w-4 h-4 text-green-600" />}
                />
              )}
              {availableFilters.includes("hasVehicle") && (
                <FilterCheckbox
                  label="Dispose d'un véhicule"
                  checked={filters.hasVehicle === true}
                  onChange={(checked) =>
                    updateFilter("hasVehicle", checked ? true : null)
                  }
                  icon={<Car className="w-4 h-4 text-blue-600" />}
                />
              )}
            </div>
          </FilterSection>
        )}

        {/* Animaux du pet-sitter */}
        {availableFilters.includes("ownsAnimals") && (
          <FilterSection title="Animaux du pet-sitter" icon={Dog}>
            <div className="space-y-1">
              <FilterCheckbox
                label="A un chien"
                checked={filters.ownsAnimals.includes("chien")}
                onChange={() => toggleOwnedAnimal("chien")}
                icon={<Dog className="w-4 h-4 text-amber-600" />}
              />
              <FilterCheckbox
                label="A un chat"
                checked={filters.ownsAnimals.includes("chat")}
                onChange={() => toggleOwnedAnimal("chat")}
                icon={<Cat className="w-4 h-4 text-orange-500" />}
              />
              <FilterCheckbox
                label="A d'autres animaux"
                checked={filters.ownsAnimals.includes("autre")}
                onChange={() => toggleOwnedAnimal("autre")}
              />
              <FilterCheckbox
                label="Aucun animal"
                checked={filters.noAnimals}
                onChange={(checked) => updateFilter("noAnimals", checked)}
              />
            </div>
          </FilterSection>
        )}

        {/* Lieu de prestation */}
        {availableFilters.includes("serviceLocation") && (
          <FilterSection title="Lieu de prestation" icon={Home}>
            <div className="space-y-1">
              <FilterCheckbox
                label="À domicile"
                checked={filters.serviceLocation.includes("client_home")}
                onChange={() => toggleServiceLocation("client_home")}
                icon={<Home className="w-4 h-4 text-primary" />}
              />
              <FilterCheckbox
                label="Chez le pet-sitter"
                checked={filters.serviceLocation.includes("announcer_home")}
                onChange={() => toggleServiceLocation("announcer_home")}
                icon={<MapPin className="w-4 h-4 text-secondary" />}
              />
            </div>
          </FilterSection>
        )}

        {/* Budget */}
        {availableFilters.includes("priceRange") && (
          <FilterSection title="Budget" icon={Euro}>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-xs text-foreground/60 mb-1 block">
                    Min (€)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={filters.priceRange.min ?? ""}
                    onChange={(e) =>
                      updateFilter("priceRange", {
                        ...filters.priceRange,
                        min: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-foreground/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <span className="text-foreground/40 mt-5">-</span>
                <div className="flex-1">
                  <label className="text-xs text-foreground/60 mb-1 block">
                    Max (€)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="∞"
                    value={filters.priceRange.max ?? ""}
                    onChange={(e) =>
                      updateFilter("priceRange", {
                        ...filters.priceRange,
                        max: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-foreground/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              <p className="text-xs text-foreground/50">
                Prix de base par service
              </p>
            </div>
          </FilterSection>
        )}
      </div>
    </div>
  );
}
