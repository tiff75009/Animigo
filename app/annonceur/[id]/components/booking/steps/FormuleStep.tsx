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
  isAnnouncer?: boolean;
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
  isAnnouncer = false,
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
      {/* Titre section - eyebrow + titre fin */}
      <div className="mb-4">
        <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-1">
          Étape · Formule
        </div>
        <h3 className="text-base font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
          Choisir une formule
        </h3>
        {!hasVariantSelected && (
          <p className="text-[13px] text-[#6d6d68] leading-[1.5] mt-1">
            Sélectionnez la formule qui correspond à vos besoins.
          </p>
        )}
      </div>

      {/* Filtres - pills outline fines comme la card */}
      {service.formules.length > 1 && (
        <div className="mb-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Filtre type de séance */}
            <FilterPill
              active={filterSessionType === "individual"}
              onClick={() => setFilterSessionType(filterSessionType === "individual" ? "all" : "individual")}
              icon={<Users className="w-3 h-3" />}
            >
              Individuel
            </FilterPill>
            <FilterPill
              active={filterSessionType === "collective"}
              onClick={() => setFilterSessionType(filterSessionType === "collective" ? "all" : "collective")}
              icon={<Users className="w-3 h-3" />}
            >
              Collectif
            </FilterPill>

            <span className="hidden sm:block w-px h-4 mx-1" style={{ background: "#ece9e1" }} />

            {/* Filtre lieu */}
            <FilterPill
              active={filterLocation === "announcer_home"}
              onClick={() => setFilterLocation(filterLocation === "announcer_home" ? "all" : "announcer_home")}
              icon={<Home className="w-3 h-3" />}
            >
              Chez le pro
            </FilterPill>
            <FilterPill
              active={filterLocation === "client_home"}
              onClick={() => setFilterLocation(filterLocation === "client_home" ? "all" : "client_home")}
              icon={<MapPin className="w-3 h-3" />}
            >
              À domicile
            </FilterPill>

            {allAnimalsInFormules.length > 0 && (
              <>
                <span className="hidden sm:block w-px h-4 mx-1" style={{ background: "#ece9e1" }} />
                <select
                  value={filterAnimal}
                  onChange={(e) => setFilterAnimal(e.target.value)}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-medium rounded-full appearance-none pr-7 cursor-pointer transition-colors"
                  )}
                  style={{
                    border: filterAnimal !== "all" ? "1px solid #1f3a33" : "1px solid #dfdcd4",
                    background: filterAnimal !== "all" ? "#1f3a33" : "#fff",
                    color: filterAnimal !== "all" ? "#f7f5ef" : "#3a3a38",
                    backgroundImage: filterAnimal !== "all"
                      ? "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23f7f5ef' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")"
                      : "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239c9484' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")",
                    backgroundPosition: "right 0.5rem center",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "1em 1em",
                  }}
                >
                  <option value="all">Animal</option>
                  {allAnimalsInFormules.map(animal => (
                    <option key={animal} value={animal}>{animalLabels[animal] || animal}</option>
                  ))}
                </select>
              </>
            )}

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#9c9484] hover:text-[#1f1f1d] transition-colors"
              >
                <X className="w-3 h-3" />
                Effacer
              </button>
            )}
          </div>
        </div>
      )}

      {/* Liste des formules */}
      {filteredFormules.length === 0 ? (
        <div
          className="p-8 text-center"
          style={{
            background: "#f7f5ef",
            borderRadius: 14,
            border: "1px solid #ece9e1",
          }}
        >
          <Package className="w-9 h-9 mx-auto mb-3" style={{ color: "#cdc9c0" }} />
          <p className="text-[13px] text-[#6d6d68] mb-2">Aucune formule ne correspond aux filtres</p>
          <button onClick={resetFilters} className="text-[12px] font-medium text-[#1f3a33] hover:underline">
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
              isAnnouncer={isAnnouncer}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function FilterPill({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors"
      style={
        active
          ? { background: "#1f3a33", color: "#f7f5ef", border: "1px solid #1f3a33" }
          : { background: "#fff", color: "#3a3a38", border: "1px solid #dfdcd4" }
      }
    >
      {icon}
      {children}
    </button>
  );
}
