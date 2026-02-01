"use client";

import { useState } from "react";
import { Package, Users, Home, MapPin, X } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/app/lib/utils";
import { ServiceData, FormuleData } from "../../types";
import SelectableFormuleCard from "../SelectableFormuleCard";

// Labels pour les types d'animaux
const animalLabels: Record<string, string> = {
  chien: "🐕 Chien",
  chat: "🐈 Chat",
  lapin: "🐰 Lapin",
  rongeur: "🐹 Rongeur",
  oiseau: "🦜 Oiseau",
  poisson: "🐠 Poisson",
  reptile: "🦎 Reptile",
  nac: "🐾 NAC",
};

interface FormuleStepProps {
  service: ServiceData;
  selectedVariantId: string | null;
  isGarde: boolean;
  commissionRate: number;
  announcerFirstName?: string;
  onVariantSelect: (serviceId: string, variantId: string) => void;
  slideVariants: Record<string, { x: number; opacity: number }>;
  slideDirection: "left" | "right";
}

export default function FormuleStep({
  service,
  selectedVariantId,
  isGarde,
  commissionRate,
  announcerFirstName,
  onVariantSelect,
  slideVariants,
  slideDirection,
}: FormuleStepProps) {
  // États pour les filtres
  const [filterSessionType, setFilterSessionType] = useState<"all" | "individual" | "collective">("all");
  const [filterLocation, setFilterLocation] = useState<"all" | "announcer_home" | "client_home" | "both">("all");
  const [filterAnimal, setFilterAnimal] = useState<string>("all");

  const hasVariantSelected = !!selectedVariantId;

  // Tous les animaux disponibles dans les formules
  const allAnimalsInFormules = [...new Set(service.formules.flatMap(f => f.animalTypes || []))];

  // Filtrer les formules
  const filteredFormules = service.formules.filter((formule) => {
    if (filterSessionType !== "all") {
      if (formule.sessionType !== filterSessionType) return false;
    }
    if (filterLocation !== "all") {
      if (filterLocation === "both") {
        if (formule.serviceLocation !== "both") return false;
      } else {
        if (formule.serviceLocation !== filterLocation && formule.serviceLocation !== "both") return false;
      }
    }
    if (filterAnimal !== "all") {
      if (!formule.animalTypes || !formule.animalTypes.includes(filterAnimal)) return false;
    }
    return true;
  });

  const hasActiveFilters = filterSessionType !== "all" || filterLocation !== "all" || filterAnimal !== "all";

  const resetFilters = () => {
    setFilterSessionType("all");
    setFilterLocation("all");
    setFilterAnimal("all");
  };

  return (
    <motion.div
      key="formule"
      initial={slideDirection === "right" ? "enterFromRight" : "enterFromLeft"}
      animate="center"
      exit={slideDirection === "right" ? "exitToLeft" : "exitToRight"}
      variants={slideVariants}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {/* Titre section */}
      <div className="mb-5">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
          <span className="p-2.5 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl">
            <Package className="w-5 h-5 text-primary" />
          </span>
          Choisir une formule
        </h3>
        {!hasVariantSelected && (
          <p className="text-sm text-gray-500 mt-2 ml-12">
            Sélectionnez la formule qui correspond à vos besoins
          </p>
        )}
      </div>

      {/* Filtres */}
      {service.formules.length > 1 && (
        <div className="mb-5">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Filtre type de séance */}
            <button
              onClick={() => setFilterSessionType(filterSessionType === "individual" ? "all" : "individual")}
              className={cn(
                "inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-full border transition-all",
                filterSessionType === "individual"
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-gray-600 border-gray-200 hover:border-primary/50 hover:text-primary"
              )}
            >
              <Users className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              Individuel
            </button>
            <button
              onClick={() => setFilterSessionType(filterSessionType === "collective" ? "all" : "collective")}
              className={cn(
                "inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-full border transition-all",
                filterSessionType === "collective"
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-gray-600 border-gray-200 hover:border-primary/50 hover:text-primary"
              )}
            >
              <Users className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              Collectif
            </button>

            <span className="hidden sm:block w-px h-5 bg-gray-200 mx-1" />

            {/* Filtre lieu */}
            <button
              onClick={() => setFilterLocation(filterLocation === "announcer_home" ? "all" : "announcer_home")}
              className={cn(
                "inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-full border transition-all",
                filterLocation === "announcer_home"
                  ? "bg-secondary text-white border-secondary"
                  : "bg-white text-gray-600 border-gray-200 hover:border-secondary/50 hover:text-secondary"
              )}
            >
              <Home className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              <span className="hidden xs:inline">Chez le pro</span>
              <span className="xs:hidden">Pro</span>
            </button>
            <button
              onClick={() => setFilterLocation(filterLocation === "client_home" ? "all" : "client_home")}
              className={cn(
                "inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-full border transition-all",
                filterLocation === "client_home"
                  ? "bg-secondary text-white border-secondary"
                  : "bg-white text-gray-600 border-gray-200 hover:border-secondary/50 hover:text-secondary"
              )}
            >
              <MapPin className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              <span className="hidden xs:inline">À domicile</span>
              <span className="xs:hidden">Domicile</span>
            </button>

            {/* Filtre animaux si disponible */}
            {allAnimalsInFormules.length > 0 && (
              <>
                <span className="hidden sm:block w-px h-5 bg-gray-200 mx-1" />
                <select
                  value={filterAnimal}
                  onChange={(e) => setFilterAnimal(e.target.value)}
                  className={cn(
                    "px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-full border transition-all appearance-none pr-6 sm:pr-8 cursor-pointer",
                    filterAnimal !== "all"
                      ? "bg-amber-500 text-white border-amber-500"
                      : "bg-white text-gray-600 border-gray-200 hover:border-amber-500/50"
                  )}
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center", backgroundRepeat: "no-repeat", backgroundSize: "1.25em 1.25em" }}
                >
                  <option value="all">Animal</option>
                  {allAnimalsInFormules.map(animal => (
                    <option key={animal} value={animal}>{animalLabels[animal] || animal}</option>
                  ))}
                </select>
              </>
            )}

            {/* Bouton reset */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 hover:text-primary transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Effacer
              </button>
            )}
          </div>
        </div>
      )}

      {/* Liste des formules */}
      {filteredFormules.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center">
          <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-2">Aucune formule ne correspond aux filtres</p>
          <button onClick={resetFilters} className="text-sm text-primary hover:underline font-medium">
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFormules.map((formule, index) => (
            <SelectableFormuleCard
              key={formule.id.toString()}
              formule={formule}
              isSelected={selectedVariantId === formule.id.toString()}
              isGarde={isGarde}
              commissionRate={commissionRate}
              onSelect={() => onVariantSelect(service.id.toString(), formule.id.toString())}
              showAttentionPulse={!hasVariantSelected}
              animationDelay={index * 0.1}
              allowOvernightStay={service.allowOvernightStay}
              overnightPrice={service.overnightPrice}
              announcerFirstName={announcerFirstName}
              dogCategoryAcceptance={service.dogCategoryAcceptance}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
