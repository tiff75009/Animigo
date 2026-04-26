"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Home, Briefcase, Users, User, Dog, Cat, Bird, Rabbit, X, CalendarDays, SlidersHorizontal } from "lucide-react";

export type ServiceTypeFilter = "all" | "garde" | "service";
export type SessionTypeFilter = "all" | "individual" | "collective";
export type AnimalTypeFilter = string;
export type MonthFilter = string;

interface MissionsFiltersProps {
  serviceType: ServiceTypeFilter;
  onServiceTypeChange: (type: ServiceTypeFilter) => void;
  sessionType: SessionTypeFilter;
  onSessionTypeChange: (type: SessionTypeFilter) => void;
  animalType: AnimalTypeFilter;
  onAnimalTypeChange: (type: AnimalTypeFilter) => void;
  month: MonthFilter;
  onMonthChange: (month: MonthFilter) => void;
  availableAnimalTypes: string[];
  availableMonths: string[];
  counts?: {
    garde?: number;
    service?: number;
    individual?: number;
    collective?: number;
    byAnimal?: Record<string, number>;
    byMonth?: Record<string, number>;
  };
}

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
  const hasActiveFilters =
    serviceType !== "all" || sessionType !== "all" || animalType !== "all" || month !== "all";

  const clearFilters = () => {
    onServiceTypeChange("all");
    onSessionTypeChange("all");
    onAnimalTypeChange("all");
    onMonthChange("all");
  };

  const sortedMonths = useMemo(() => {
    return [...availableMonths].sort((a, b) => a.localeCompare(b));
  }, [availableMonths]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-[18px] space-y-4"
      style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5" style={{ color: "#1f3a33" }} />
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484]">
              Filtres
            </div>
            <h3 className="text-[14px] font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
              Affiner la liste
            </h3>
          </div>
        </div>
        {hasActiveFilters && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={clearFilters}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors hover:bg-[#f7f5ef]"
            style={{ color: "#1f3a33", border: "1px solid #ece9e1" }}
          >
            <X className="w-3 h-3" />
            Réinitialiser
          </motion.button>
        )}
      </div>

      {/* Type de service */}
      <FilterGroup label="Type de service">
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
        />
        <FilterChip
          active={serviceType === "service"}
          onClick={() => onServiceTypeChange("service")}
          icon={<Briefcase className="w-3.5 h-3.5" />}
          label="Service"
          count={counts?.service}
        />
      </FilterGroup>

      {/* Individuel/Collectif */}
      {serviceType === "service" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          <FilterGroup label="Type de séance">
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
            />
            <FilterChip
              active={sessionType === "collective"}
              onClick={() => onSessionTypeChange("collective")}
              icon={<Users className="w-3.5 h-3.5" />}
              label="Collectif"
              count={counts?.collective}
            />
          </FilterGroup>
        </motion.div>
      )}

      {/* Type d'animal */}
      {availableAnimalTypes.length > 0 && (
        <FilterGroup label="Type d'animal">
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
            />
          ))}
        </FilterGroup>
      )}

      {/* Mois */}
      {sortedMonths.length > 0 && (
        <FilterGroup label="Période">
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
            />
          ))}
        </FilterGroup>
      )}
    </motion.div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: "#9c9484" }}>
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
  emoji?: string;
  count?: number;
}

function FilterChip({ active, onClick, label, icon, emoji, count }: FilterChipProps) {
  return (
    <motion.button
      onClick={onClick}
      aria-pressed={active}
      aria-label={`Filtre ${label}${count !== undefined && count > 0 ? `, ${count} résultat${count > 1 ? "s" : ""}` : ""}`}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11.5px] font-medium transition-colors capitalize"
      style={{
        background: active ? "#1f3a33" : "#fff",
        color: active ? "#f7f5ef" : "#1f1f1d",
        border: `1px solid ${active ? "#1f3a33" : "#dfdcd4"}`,
      }}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
    >
      {emoji && <span aria-hidden="true">{emoji}</span>}
      {icon && (
        <span aria-hidden="true" style={{ color: active ? "#f7f5ef" : "#9c9484" }}>
          {icon}
        </span>
      )}
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span
          className="min-w-[16px] h-[16px] px-1 rounded-full text-[9.5px] font-bold flex items-center justify-center"
          style={{
            background: active ? "rgba(247,245,239,0.2)" : "#f7f5ef",
            color: active ? "#f7f5ef" : "#6d6d68",
          }}
          aria-hidden="true"
        >
          {count}
        </span>
      )}
    </motion.button>
  );
}
