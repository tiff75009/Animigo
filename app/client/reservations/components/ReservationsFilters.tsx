"use client";

import { motion } from "framer-motion";
import { Home, Briefcase, Users, User, X, CreditCard, Clock, Play } from "lucide-react";
import { cn } from "@/app/lib/utils";

export type StatusFilter = "all" | "pending_acceptance" | "pending_payment" | "upcoming" | "in_progress" | "completed" | "cancelled";
export type ServiceTypeFilter = "all" | "garde" | "service";
export type SessionTypeFilter = "all" | "individual" | "collective";

interface ReservationsFiltersProps {
  // Filtre statut
  statusFilter: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  // Filtre type de service
  serviceTypeFilter: ServiceTypeFilter;
  onServiceTypeChange: (type: ServiceTypeFilter) => void;
  // Filtre type de session (individuel/collectif)
  sessionTypeFilter: SessionTypeFilter;
  onSessionTypeChange: (type: SessionTypeFilter) => void;
  // Compteurs pour les badges
  counts: {
    all: number;
    pendingAcceptance: number;
    pendingPayment: number;
    upcoming: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    garde: number;
    service: number;
    individual: number;
    collective: number;
  };
}

export function ReservationsFilters({
  statusFilter,
  onStatusChange,
  serviceTypeFilter,
  onServiceTypeChange,
  sessionTypeFilter,
  onSessionTypeChange,
  counts,
}: ReservationsFiltersProps) {
  const hasActiveFilters = serviceTypeFilter !== "all" || sessionTypeFilter !== "all";

  const clearFilters = () => {
    onServiceTypeChange("all");
    onSessionTypeChange("all");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Filtres par statut - Ligne principale */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        <FilterChip
          active={statusFilter === "all"}
          onClick={() => onStatusChange("all")}
          label="Toutes"
          count={counts.all}
        />
        <FilterChip
          active={statusFilter === "pending_acceptance"}
          onClick={() => onStatusChange("pending_acceptance")}
          label="En attente"
          icon={<Clock className="w-3.5 h-3.5" />}
          count={counts.pendingAcceptance}
          color="purple"
        />
        <FilterChip
          active={statusFilter === "pending_payment"}
          onClick={() => onStatusChange("pending_payment")}
          label="À payer"
          icon={<CreditCard className="w-3.5 h-3.5" />}
          count={counts.pendingPayment}
          color="orange"
        />
        <FilterChip
          active={statusFilter === "upcoming"}
          onClick={() => onStatusChange("upcoming")}
          label="À venir"
          count={counts.upcoming}
          color="green"
        />
        <FilterChip
          active={statusFilter === "in_progress"}
          onClick={() => onStatusChange("in_progress")}
          label="En cours"
          icon={<Play className="w-3.5 h-3.5" />}
          count={counts.inProgress}
          color="blue"
        />
        <FilterChip
          active={statusFilter === "completed"}
          onClick={() => onStatusChange("completed")}
          label="Terminées"
          count={counts.completed}
          color="slate"
        />
        <FilterChip
          active={statusFilter === "cancelled"}
          onClick={() => onStatusChange("cancelled")}
          label="Annulées"
          count={counts.cancelled}
          color="red"
        />
      </div>

      {/* Filtres avancés - Type et Format */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Type de service */}
        <FilterChip
          active={serviceTypeFilter === "garde"}
          onClick={() => onServiceTypeChange(serviceTypeFilter === "garde" ? "all" : "garde")}
          icon={<Home className="w-3.5 h-3.5" />}
          label="Garde"
          count={counts.garde}
          color="purple"
          toggleable
        />
        <FilterChip
          active={serviceTypeFilter === "service"}
          onClick={() => onServiceTypeChange(serviceTypeFilter === "service" ? "all" : "service")}
          icon={<Briefcase className="w-3.5 h-3.5" />}
          label="Service"
          count={counts.service}
          color="blue"
          toggleable
        />

        {/* Séparateur */}
        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* Format de séance */}
        <FilterChip
          active={sessionTypeFilter === "individual"}
          onClick={() => onSessionTypeChange(sessionTypeFilter === "individual" ? "all" : "individual")}
          icon={<User className="w-3.5 h-3.5" />}
          label="Individuel"
          count={counts.individual}
          color="green"
          toggleable
        />
        <FilterChip
          active={sessionTypeFilter === "collective"}
          onClick={() => onSessionTypeChange(sessionTypeFilter === "collective" ? "all" : "collective")}
          icon={<Users className="w-3.5 h-3.5" />}
          label="Collectif"
          count={counts.collective}
          color="orange"
          toggleable
        />

        {/* Bouton reset si filtres actifs */}
        {hasActiveFilters && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={clearFilters}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 font-medium"
          >
            <X className="w-3 h-3" />
            Effacer
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// Composant Chip réutilisable
interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
  count?: number;
  color?: "primary" | "purple" | "blue" | "green" | "orange" | "red" | "slate";
  toggleable?: boolean;
}

function FilterChip({
  active,
  onClick,
  label,
  icon,
  count,
  color = "primary",
  toggleable = false
}: FilterChipProps) {
  const colorClasses = {
    primary: active
      ? "bg-primary text-white"
      : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200",
    purple: active
      ? "bg-purple-500 text-white"
      : toggleable
        ? "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
        : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200",
    blue: active
      ? "bg-blue-500 text-white"
      : toggleable
        ? "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
        : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200",
    green: active
      ? "bg-green-500 text-white"
      : toggleable
        ? "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
        : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200",
    orange: active
      ? "bg-orange-500 text-white"
      : toggleable
        ? "bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200"
        : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200",
    red: active
      ? "bg-red-500 text-white"
      : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200",
    slate: active
      ? "bg-gray-500 text-white"
      : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200",
  };

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
        colorClasses[color]
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {icon && icon}
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className={cn(
          "px-2 py-0.5 rounded-full text-xs",
          active ? "bg-white/20" : "bg-gray-100"
        )}>
          {count}
        </span>
      )}
    </motion.button>
  );
}
