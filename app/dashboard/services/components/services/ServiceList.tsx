"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, Plus, Filter, X, Layers, Dog, Cat, Bird, Rabbit, Star, LayoutGrid, List } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import ServiceCard from "./ServiceCard";
import EmptyState from "../shared/EmptyState";
import { cn } from "@/app/lib/utils";

interface ServiceCategory {
  slug: string;
  name: string;
  icon?: string;
  billingType?: "hourly" | "daily" | "flexible";
  allowedPriceUnits?: ("hour" | "half_day" | "day" | "week" | "month")[];
  allowOvernightStay?: boolean;
  allowRangeBooking?: boolean;
  announcerPriceMode?: "manual" | "automatic";
  defaultNightlyPrice?: number;
  displayPriceUnit?: "hour" | "half_day" | "day" | "week" | "month";
}

type PriceUnit = "hour" | "half_day" | "day" | "week" | "month" | "flat";
type ServiceLocation = "announcer_home" | "client_home" | "both";

interface Variant {
  id: Id<"serviceVariants">;
  name: string;
  description?: string;
  price: number;
  priceUnit: PriceUnit;
  duration?: number;
  includedFeatures?: string[];
  order: number;
  isActive: boolean;
  animalTypes?: string[];
  serviceLocation?: ServiceLocation;
  sessionType?: "individual" | "collective";
}

interface Service {
  id: Id<"services">;
  category: string;
  animalTypes: string[];
  isActive: boolean;
  basePrice?: number;
  moderationStatus?: string;
  variants?: Variant[];
  options?: Array<{
    id: Id<"serviceOptions">;
    name: string;
    description?: string;
    price: number;
    priceType: "flat" | "per_day" | "per_unit";
    unitLabel?: string;
    maxQuantity?: number;
    order: number;
    isActive: boolean;
  }>;
}

interface ServiceListProps {
  services: Service[];
  categories: ServiceCategory[];
  token: string;
  onAddService: () => void;
  onEditService: (serviceId: Id<"services">) => void;
  onToggleService: (serviceId: Id<"services">, isActive: boolean) => void;
  onDeleteService: (serviceId: Id<"services">) => void;
  phoneVerified?: boolean;
}

const animalIcons: Record<string, React.ElementType> = {
  chien: Dog,
  chat: Cat,
  oiseau: Bird,
  rongeur: Rabbit,
  lapin: Rabbit,
};

const animalLabels: Record<string, string> = {
  chien: "Chien",
  chat: "Chat",
  oiseau: "Oiseau",
  rongeur: "Rongeur",
  lapin: "Lapin",
  reptile: "Reptile",
  nac: "NAC",
};

export default function ServiceList({
  services,
  categories,
  token,
  onAddService,
  onEditService,
  onToggleService,
  onDeleteService,
  phoneVerified,
}: ServiceListProps) {
  // Filtres
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterAnimal, setFilterAnimal] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  // Vue grille ou liste
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const getCategoryData = (slug: string) => {
    return categories.find((c) => c.slug === slug);
  };

  // Collecter toutes les catégories utilisées
  const usedCategories = useMemo(() => {
    const cats = new Set<string>();
    services.forEach(s => cats.add(s.category));
    return Array.from(cats).map(slug => ({
      slug,
      ...getCategoryData(slug),
    }));
  }, [services, categories]);

  // Collecter tous les animaux de toutes les services
  const allAnimals = useMemo(() => {
    const animals = new Set<string>();
    services.forEach(service => {
      service.variants?.forEach(variant => {
        variant.animalTypes?.forEach(animal => animals.add(animal));
      });
    });
    return Array.from(animals);
  }, [services]);

  // Filtrer les services et leurs services
  const filteredServices = useMemo(() => {
    return services
      .filter(service => {
        // Filtre par catégorie
        if (filterCategory !== "all" && service.category !== filterCategory) {
          return false;
        }
        // Filtre par animal (au moins une service doit avoir cet animal)
        if (filterAnimal !== "all") {
          const hasAnimal = service.variants?.some(v =>
            v.animalTypes?.includes(filterAnimal)
          );
          if (!hasAnimal) return false;
        }
        return true;
      })
      .map(service => {
        // Si filtre animal actif, filtrer aussi les variants à afficher
        if (filterAnimal !== "all") {
          return {
            ...service,
            filteredVariants: service.variants?.filter(v =>
              v.animalTypes?.includes(filterAnimal)
            ),
          };
        }
        return { ...service, filteredVariants: service.variants };
      });
  }, [services, filterCategory, filterAnimal]);

  // Compter les services totales
  const totalVariants = useMemo(() => {
    return filteredServices.reduce((acc, s) => acc + (s.filteredVariants?.length || 0), 0);
  }, [filteredServices]);

  const hasActiveFilters = filterCategory !== "all" || filterAnimal !== "all";

  const resetFilters = () => {
    setFilterCategory("all");
    setFilterAnimal("all");
  };

  if (services.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="Aucun service"
        description="Créez votre premier service pour commencer à recevoir des demandes de garde."
        action={{
          label: "Créer un service",
          onClick: onAddService,
          icon: Plus,
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header avec stats et filtres */}
      <div className="bg-white rounded-2xl border border-foreground/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Mes services</h3>
              <p className="text-sm text-text-light">
                {totalVariants} service{totalVariants > 1 ? "s" : ""} dans {filteredServices.length} catégorie{filteredServices.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Toggle vue grille/liste */}
            <div className="flex items-center bg-foreground/5 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  viewMode === "grid"
                    ? "bg-white text-primary shadow-sm"
                    : "text-text-light hover:text-foreground"
                )}
                title="Vue grille"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  viewMode === "list"
                    ? "bg-white text-primary shadow-sm"
                    : "text-text-light hover:text-foreground"
                )}
                title="Vue liste"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
                showFilters || hasActiveFilters
                  ? "bg-primary text-white"
                  : "bg-foreground/5 text-foreground hover:bg-foreground/10"
              )}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filtrer</span>
              {hasActiveFilters && (
                <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">
                  {(filterCategory !== "all" ? 1 : 0) + (filterAnimal !== "all" ? 1 : 0)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filtres */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-3 border-t border-foreground/10 space-y-3">
                {/* Filtre par type de service */}
                <div>
                  <label className="block text-xs font-medium text-text-light mb-2">
                    Type de service
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setFilterCategory("all")}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                        filterCategory === "all"
                          ? "bg-primary text-white"
                          : "bg-foreground/5 text-foreground hover:bg-foreground/10"
                      )}
                    >
                      Tous
                    </button>
                    {usedCategories.map(cat => (
                      <button
                        key={cat.slug}
                        onClick={() => setFilterCategory(cat.slug)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                          filterCategory === cat.slug
                            ? "bg-primary text-white"
                            : "bg-foreground/5 text-foreground hover:bg-foreground/10"
                        )}
                      >
                        <span>{cat.icon || "✨"}</span>
                        {cat.name || cat.slug}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filtre par animal */}
                {allAnimals.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-text-light mb-2">
                      Type d&apos;animal
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setFilterAnimal("all")}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                          filterAnimal === "all"
                            ? "bg-secondary text-white"
                            : "bg-foreground/5 text-foreground hover:bg-foreground/10"
                        )}
                      >
                        Tous
                      </button>
                      {allAnimals.map(animal => {
                        const Icon = animalIcons[animal] || Star;
                        return (
                          <button
                            key={animal}
                            onClick={() => setFilterAnimal(animal)}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                              filterAnimal === animal
                                ? "bg-secondary text-white"
                                : "bg-foreground/5 text-foreground hover:bg-foreground/10"
                            )}
                          >
                            <Icon className="w-4 h-4" />
                            {animalLabels[animal] || animal}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Reset */}
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <X className="w-3.5 h-3.5" />
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Liste des services avec leurs services */}
      <AnimatePresence mode="popLayout">
        {filteredServices.map((service) => (
          <motion.div
            key={service.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            layout
          >
            <ServiceCard
              service={service}
              filteredVariants={service.filteredVariants}
              categoryData={getCategoryData(service.category)}
              token={token}
              viewMode={viewMode}
              onEdit={() => onEditService(service.id)}
              onToggle={() => onToggleService(service.id, service.isActive)}
              onDelete={() => onDeleteService(service.id)}
              phoneVerified={phoneVerified}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Message si aucun résultat */}
      {filteredServices.length === 0 && hasActiveFilters && (
        <div className="text-center py-8">
          <p className="text-text-light mb-2">Aucune service ne correspond aux filtres sélectionnés</p>
          <button
            onClick={resetFilters}
            className="text-primary hover:underline text-sm"
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}
    </div>
  );
}
