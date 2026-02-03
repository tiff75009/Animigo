"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Home, Briefcase, Users, User, Dog, Cat, Bird, Rabbit, X, CalendarDays } from "lucide-react";
import { cn } from "@/app/lib/utils";

export type ServiceTypeFilter = "all" | "garde" | "service";
export type SessionTypeFilter = "all" | "individual" | "collective";
export type AnimalTypeFilter = string; // "all" ou le type d'animal
export type MonthFilter = string; // "all" ou "YYYY-MM"

interface MissionsFiltersProps {
  // Filtre type de service
  serviceType: ServiceTypeFilter;
  onServiceTypeChange: (type: ServiceTypeFilter) => void;
  // Filtre type de session (individuel/collectif)
  sessionType: SessionTypeFilter;
  onSessionTypeChange: (type: SessionTypeFilter) => void;
  // Filtre type d'animal
  animalType: AnimalTypeFilter;
  onAnimalTypeChange: (type: AnimalTypeFilter) => void;
  // Filtre par mois
  month: MonthFilter;
  onMonthChange: (month: MonthFilter) => void;
  // Types d'animaux disponibles dans les missions
  availableAnimalTypes: string[];
  // Mois disponibles dans les missions (format YYYY-MM)
  availableMonths: string[];
  // Compteurs pour les badges (optionnel)
  counts?: {
    garde?: number;
    service?: number;
    individual?: number;
    collective?: number;
    byAnimal?: Record<string, number>;
    byMonth?: Record<string, number>;
  };
}

// Helper pour obtenir l'emoji de l'animal
function getAnimalEmoji(type: string): string {
  const emojiMap: Record<string, string> = {
    chien: "🐕",
    chat: "🐱",
    oiseau: "🐦",
    lapin: "🐰",
    hamster: "🐹",
    poisson: "🐠",
    reptile: "🦎",
    furet: "🦡",
    cochon: "🐷",
    cheval: "🐴",
    nac: "🐾",
  };
  return emojiMap[type.toLowerCase()] || "🐾";
}

// Helper pour obtenir l'icône de l'animal
function getAnimalIcon(type: string) {
  const typeL = type.toLowerCase();
  if (typeL === "chien") return Dog;
  if (typeL === "chat") return Cat;
  if (typeL === "oiseau") return Bird;
  if (typeL === "lapin") return Rabbit;
  return Dog; // Défaut
}

// Helper pour formater le mois en français
function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
}

export function MissionsFilters({
  serviceType,
  onServiceTypeChange,
  sessionType,
  onSessionTypeChange,
  animalType,
  onAnimalTypeChange,
  month,
  onMonthChange,
  availableAnimalTypes,
  availableMonths,
  counts,
}: MissionsFiltersProps) {
  const hasActiveFilters = serviceType !== "all" || sessionType !== "all" || animalType !== "all" || month !== "all";

  const clearFilters = () => {
    onServiceTypeChange("all");
    onSessionTypeChange("all");
    onAnimalTypeChange("all");
    onMonthChange("all");
  };

  // Trier les mois par ordre chronologique
  const sortedMonths = useMemo(() => {
    return [...availableMonths].sort((a, b) => a.localeCompare(b));
  }, [availableMonths]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-4 shadow-sm space-y-4"
    >
      {/* Header avec bouton reset */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Filtres</h3>
        {hasActiveFilters && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
          >
            <X className="w-3 h-3" />
            Réinitialiser
          </motion.button>
        )}
      </div>

      {/* Filtre Type de service */}
      <div className="space-y-2">
        <p className="text-xs text-text-light font-medium">Type de service</p>
        <div className="flex flex-wrap gap-2">
          <FilterChip
            active={serviceType === "all"}
            onClick={() => onServiceTypeChange("all")}
            label="Tous"
          />
          <FilterChip
            active={serviceType === "garde"}
            onClick={() => onServiceTypeChange("garde")}
            icon={<Home className="w-3.5 h-3.5" />}
            label="Garde"
            count={counts?.garde}
            color="purple"
          />
          <FilterChip
            active={serviceType === "service"}
            onClick={() => onServiceTypeChange("service")}
            icon={<Briefcase className="w-3.5 h-3.5" />}
            label="Service"
            count={counts?.service}
            color="blue"
          />
        </div>
      </div>

      {/* Filtre Individuel/Collectif - visible seulement si service sélectionné */}
      {serviceType === "service" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-2"
        >
          <p className="text-xs text-text-light font-medium">Type de séance</p>
          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={sessionType === "all"}
              onClick={() => onSessionTypeChange("all")}
              label="Tous"
            />
            <FilterChip
              active={sessionType === "individual"}
              onClick={() => onSessionTypeChange("individual")}
              icon={<User className="w-3.5 h-3.5" />}
              label="Individuel"
              count={counts?.individual}
              color="green"
            />
            <FilterChip
              active={sessionType === "collective"}
              onClick={() => onSessionTypeChange("collective")}
              icon={<Users className="w-3.5 h-3.5" />}
              label="Collectif"
              count={counts?.collective}
              color="orange"
            />
          </div>
        </motion.div>
      )}

      {/* Filtre Type d'animal */}
      {availableAnimalTypes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-text-light font-medium">Type d'animal</p>
          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={animalType === "all"}
              onClick={() => onAnimalTypeChange("all")}
              label="Tous"
            />
            {availableAnimalTypes.map((type) => (
              <FilterChip
                key={type}
                active={animalType === type}
                onClick={() => onAnimalTypeChange(type)}
                emoji={getAnimalEmoji(type)}
                label={type.charAt(0).toUpperCase() + type.slice(1)}
                count={counts?.byAnimal?.[type]}
                color="slate"
              />
            ))}
          </div>
        </div>
      )}

      {/* Filtre par mois */}
      {sortedMonths.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-text-light font-medium">Période</p>
          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={month === "all"}
              onClick={() => onMonthChange("all")}
              label="Tous"
            />
            {sortedMonths.map((m) => (
              <FilterChip
                key={m}
                active={month === m}
                onClick={() => onMonthChange(m)}
                icon={<CalendarDays className="w-3.5 h-3.5" />}
                label={formatMonth(m)}
                count={counts?.byMonth?.[m]}
                color="purple"
              />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Composant Chip réutilisable
interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
  emoji?: string;
  count?: number;
  color?: "purple" | "blue" | "green" | "orange" | "slate";
}

function FilterChip({ active, onClick, label, icon, emoji, count, color = "slate" }: FilterChipProps) {
  const colorClasses = {
    purple: active ? "bg-purple text-white" : "bg-purple/10 text-purple hover:bg-purple/20",
    blue: active ? "bg-blue-500 text-white" : "bg-blue-100 text-blue-700 hover:bg-blue-200",
    green: active ? "bg-green-500 text-white" : "bg-green-100 text-green-700 hover:bg-green-200",
    orange: active ? "bg-orange-500 text-white" : "bg-orange-100 text-orange-700 hover:bg-orange-200",
    slate: active ? "bg-foreground text-white" : "bg-slate-100 text-foreground hover:bg-slate-200",
  };

  return (
    <motion.button
      onClick={onClick}
      aria-pressed={active}
      aria-label={`Filtre ${label}${count !== undefined && count > 0 ? `, ${count} résultat${count > 1 ? "s" : ""}` : ""}`}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
        active ? colorClasses[color].split(" ").slice(0, 2).join(" ") : colorClasses[color]
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {emoji && <span aria-hidden="true">{emoji}</span>}
      {icon && <span aria-hidden="true">{icon}</span>}
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span
          className={cn(
            "min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
            active ? "bg-white/20" : "bg-white"
          )}
          aria-hidden="true"
        >
          {count}
        </span>
      )}
    </motion.button>
  );
}
