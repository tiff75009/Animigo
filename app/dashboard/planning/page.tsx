"use client";

import { useState, memo, useCallback, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CalendarRange,
  LayoutGrid,
  List,
  Loader2,
  CalendarOff,
  Eye,
  Users,
  Copy,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { usePlanning, ViewMode, Mission, MissionStats, Availability, CollectiveSlot, CategoryType } from "@/app/hooks/usePlanning";
import { useAuth } from "@/app/hooks/useAuth";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// Components
import { MonthView } from "./components/views/MonthView";
import { WeekView } from "./components/views/WeekView";
import { DayView } from "./components/views/DayView";
import { YearView } from "./components/views/YearView";
import { AvailabilityModal } from "./components/availability/AvailabilityModal";
import { AvailabilityBrushBar, BRUSH_PRESETS, type BrushKind, type BrushMode, type PeriodKey } from "./components/availability/AvailabilityBrushBar";
import { DuplicateWeekModal } from "./components/availability/DuplicateWeekModal";
import { MissionDetailModal } from "./components/MissionDetailModal";
import { CollectiveSlotModal } from "./components/CollectiveSlotModal";
import {
  getMissionVisualStyle,
  formatPrice,
} from "./components/types";

const viewModeConfig: Record<
  ViewMode,
  { icon: typeof Calendar; label: string }
> = {
  day: { icon: CalendarDays, label: "Jour" },
  week: { icon: CalendarRange, label: "Semaine" },
  month: { icon: LayoutGrid, label: "Mois" },
  year: { icon: Calendar, label: "Annee" },
};

// Header mémorisé - ne re-render que si viewMode change
const PlanningHeader = memo(function PlanningHeader({
  viewMode,
  setViewMode,
  showListView,
  setShowListView,
}: {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  showListView: boolean;
  setShowListView: (show: boolean) => void;
}) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <div className="flex items-center justify-between mb-3 gap-2">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "#f5f9f6", border: "1px solid #cfdbd3" }}
        >
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: "#1f3a33" }} />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484]">
            Calendrier
          </div>
          <h1 className="text-[20px] sm:text-[24px] font-semibold text-[#1f1f1d] tracking-[-0.02em] truncate m-0">
            Planning
          </h1>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Desktop view toggle - pill bar */}
        <div
          className="hidden md:flex p-0.5"
          style={{ borderRadius: 999, background: "#fff", border: "1px solid #ece9e1" }}
        >
          {(Object.keys(viewModeConfig) as ViewMode[]).map((mode) => {
            const { icon: Icon, label } = viewModeConfig[mode];
            const isActive = viewMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors"
                style={
                  isActive
                    ? { background: "#1f3a33", color: "#f7f5ef" }
                    : { color: "#6d6d68" }
                }
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            );
          })}
        </div>

        {/* Mobile view menu */}
        <div className="md:hidden relative">
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium"
            style={{ background: "#fff", border: "1px solid #ece9e1", color: "#1f1f1d" }}
          >
            {(() => {
              const { icon: Icon, label } = viewModeConfig[viewMode];
              return (
                <>
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">{label}</span>
                </>
              );
            })()}
          </button>
          {showMobileMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMobileMenu(false)}
              />
              <div
                className="absolute right-0 top-full mt-1 bg-white z-50 overflow-hidden min-w-[140px]"
                style={{
                  borderRadius: 12,
                  border: "1px solid #ece9e1",
                  boxShadow: "0 10px 30px rgba(30,30,28,0.06)",
                }}
              >
                {(Object.keys(viewModeConfig) as ViewMode[]).map((mode) => {
                  const { icon: Icon, label } = viewModeConfig[mode];
                  const isActive = viewMode === mode;
                  return (
                    <button
                      key={mode}
                      onClick={() => {
                        setViewMode(mode);
                        setShowMobileMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[13px] transition-colors hover:bg-[#f7f5ef]"
                      style={
                        isActive
                          ? { background: "#f5f9f6", color: "#1f3a33", fontWeight: 600 }
                          : { color: "#1f1f1d" }
                      }
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Mobile list/grid toggle (only in month view) */}
        {viewMode === "month" && (
          <div
            className="md:hidden flex p-0.5"
            style={{ borderRadius: 999, background: "#fff", border: "1px solid #ece9e1" }}
          >
            <button
              onClick={() => setShowListView(false)}
              className="w-7 h-7 inline-flex items-center justify-center rounded-full transition-colors"
              style={
                !showListView
                  ? { background: "#1f3a33", color: "#f7f5ef" }
                  : { color: "#9c9484" }
              }
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowListView(true)}
              className="w-7 h-7 inline-flex items-center justify-center rounded-full transition-colors"
              style={
                showListView
                  ? { background: "#1f3a33", color: "#f7f5ef" }
                  : { color: "#9c9484" }
              }
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

// Stats mémorisées - cohérent avec dashboard home
const PlanningStats = memo(function PlanningStats({ stats }: { stats: MissionStats }) {
  const items = [
    { label: "Missions", value: stats.total.toString(), featured: false },
    { label: "En cours", value: stats.inProgress.toString(), featured: false },
    { label: "À venir", value: stats.upcoming.toString(), featured: false },
    { label: "Revenus", value: formatPrice(stats.revenue), featured: true },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="p-3 sm:p-4 transition-shadow"
          style={
            item.featured
              ? { borderRadius: 14, background: "#1f3a33", border: "1px solid #1f3a33" }
              : { borderRadius: 14, background: "#fff", border: "1px solid #ece9e1" }
          }
        >
          <div
            className="text-[10px] font-medium uppercase tracking-[0.1em] mb-0.5"
            style={{ color: item.featured ? "rgba(247,245,239,0.7)" : "#9c9484" }}
          >
            {item.label}
          </div>
          <p
            className="text-[20px] sm:text-[24px] font-semibold tracking-[-0.02em] leading-none m-0"
            style={{ color: item.featured ? "#f7f5ef" : "#1f1f1d" }}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
});

// Légende mémorisée avec sélecteur de type
const CalendarLegend = memo(function CalendarLegend({
  categoryTypes,
  selectedTypeId,
  onTypeChange,
}: {
  categoryTypes: CategoryType[];
  selectedTypeId: string | null;
  onTypeChange: (typeId: string | null) => void;
}) {
  const [showLegend, setShowLegend] = useState(false);

  return (
    <div className="space-y-3 mb-4 pb-4" style={{ borderBottom: "1px solid #f1ede3" }}>
      {/* Filtre par type de service */}
      {categoryTypes.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mr-1">
            Filtre
          </span>
          <button
            onClick={() => onTypeChange(null)}
            className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors"
            style={
              !selectedTypeId
                ? { background: "#1f3a33", color: "#f7f5ef", border: "1px solid #1f3a33" }
                : { background: "#fff", color: "#3a3a38", border: "1px solid #dfdcd4" }
            }
          >
            Tous
          </button>
          {categoryTypes.map((type) => (
            <button
              key={type._id}
              onClick={() => onTypeChange(type._id)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors"
              style={
                selectedTypeId === type._id
                  ? { background: "#1f3a33", color: "#f7f5ef", border: "1px solid #1f3a33" }
                  : { background: "#fff", color: "#3a3a38", border: "1px solid #dfdcd4" }
              }
            >
              <span>{type.icon}</span>
              <span className="hidden xs:inline">{type.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Légende des statuts - collapsible sur mobile */}
      <div>
        <button
          className="sm:hidden inline-flex items-center gap-1 text-[11px] mb-2"
          style={{ color: "#9c9484" }}
          onClick={() => setShowLegend(!showLegend)}
        >
          <Eye className="w-3 h-3" />
          {showLegend ? "Masquer" : "Voir"} la légende
        </button>
        <div className={cn(
          "flex flex-wrap gap-x-3 gap-y-1.5",
          !showLegend && "hidden sm:flex"
        )}>
          <LegendDot color="#1f3a33" label="En cours" />
          <LegendDot color="#7a5b1a" label="À venir" />
          <LegendDot color="#c9a14a" label="À accepter" />
          <LegendDot color="#2f4a3f" label="Terminée" />
          <LegendDot color="#1f1f1d" label="Collectif" />
          <LegendBlock bg="#f5f9f6" border="#cfdbd3" label="Dispo" />
          <LegendBlock bg="#fdf8ec" border="#f4e6c1" label="Partiel" />
          <LegendBlock bg="#f7f5ef" border="#ece9e1" label="Indispo" />
        </div>
      </div>
    </div>
  );
});

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      <span className="text-[10px] font-medium" style={{ color: "#9c9484" }}>{label}</span>
    </div>
  );
}

function LegendBlock({ bg, border, label }: { bg: string; border: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div
        className="w-2.5 h-2.5 rounded-sm"
        style={{ background: bg, border: `1px solid ${border}` }}
      />
      <span className="text-[10px] font-medium" style={{ color: "#9c9484" }}>{label}</span>
    </div>
  );
}

// Info box mémorisée
const QuickInfo = memo(function QuickInfo({ viewMode }: { viewMode: ViewMode }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-2">
      {/* Info principale - collapsible sur mobile */}
      <div
        className="p-3 sm:p-4"
        style={{ borderRadius: 12, background: "#fcfaf4", border: "1px solid #f1ede3" }}
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-start gap-2 sm:gap-3 text-left"
        >
          <Calendar className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#6d6d68" }} />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: "#9c9484" }}>
              Astuce
            </div>
            <p className="text-[13.5px] font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
              Gestion des disponibilités
            </p>
            <p className="text-[11px] sm:hidden mt-0.5" style={{ color: "#6d6d68" }}>
              {isExpanded ? "Masquer" : "Voir les instructions"}
            </p>
          </div>
        </button>
        <ul className={cn(
          "text-[12px] space-y-1 mt-2 ml-6",
          !isExpanded && "hidden sm:block"
        )} style={{ color: "#3a3a38" }}>
          <li>• Par défaut, vous êtes <strong className="text-[#1f1f1d]">indisponible</strong></li>
          <li>• Cliquez sur un jour pour vous rendre disponible</li>
          <li className="hidden sm:list-item">• Vous pouvez être disponible pour &quot;Garde&quot; mais pas pour &quot;Services&quot; le même jour</li>
          <li className="hidden sm:list-item">• Les séances collectives se gèrent dans &quot;Mes services&quot;</li>
        </ul>
      </div>

      {/* Astuce pour la semaine type - visible uniquement en vue mois ou année */}
      {(viewMode === "month" || viewMode === "year") && (
        <div
          className="p-3 sm:p-4 flex items-start gap-3"
          style={{ borderRadius: 12, background: "#f5f9f6", border: "1px solid #cfdbd3" }}
        >
          <Copy className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#1f3a33" }} />
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: "#9c9484" }}>
              Astuce
            </div>
            <p className="text-[13.5px] font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
              Semaine type
            </p>
            <p className="text-[12px] mt-0.5 leading-[1.5]" style={{ color: "#3a3a38" }}>
              Passez en <strong className="text-[#1f1f1d]">vue Semaine</strong> pour dupliquer vos disponibilités.
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

// Navigation du calendrier
const CalendarNavigation = memo(function CalendarNavigation({
  title,
  viewMode,
  onPrevious,
  onNext,
  onToday,
  onMarkWeekendsUnavailable,
  onDuplicateWeek,
}: {
  title: string;
  viewMode: ViewMode;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onMarkWeekendsUnavailable: () => void;
  onDuplicateWeek: () => void;
}) {
  return (
    <div className="space-y-3 mb-4">
      {/* Navigation principale */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <motion.button
            onClick={onPrevious}
            className="w-8 h-8 inline-flex items-center justify-center rounded-full transition-colors hover:bg-[#f7f5ef]"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronLeft className="w-4 h-4" style={{ color: "#1f1f1d" }} />
          </motion.button>
          <h2 className="text-[15px] sm:text-[17px] font-semibold text-[#1f1f1d] tracking-[-0.01em] min-w-[120px] sm:min-w-[180px] md:min-w-[200px] text-center capitalize">
            {title}
          </h2>
          <motion.button
            onClick={onNext}
            className="w-8 h-8 inline-flex items-center justify-center rounded-full transition-colors hover:bg-[#f7f5ef]"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronRight className="w-4 h-4" style={{ color: "#1f1f1d" }} />
          </motion.button>
        </div>

        <motion.button
          onClick={onToday}
          className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors hover:bg-[#f7f5ef]"
          style={{ background: "#fff", border: "1px solid #1f3a33", color: "#1f3a33" }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Aujourd&apos;hui
        </motion.button>
      </div>

      {/* Actions secondaires - responsive */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Bouton Semaine type - uniquement en vue semaine */}
        {viewMode === "week" && (
          <motion.button
            onClick={onDuplicateWeek}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-opacity hover:opacity-90"
            style={{ background: "#1f3a33", color: "#f7f5ef" }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Copy className="w-3.5 h-3.5" />
            Dupliquer la semaine
          </motion.button>
        )}
        <motion.button
          onClick={onMarkWeekendsUnavailable}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors hover:bg-[#f7f5ef]"
          style={{ background: "#fff", border: "1px solid #ece9e1", color: "#3a3a38" }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <CalendarOff className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Weekends indispo</span>
          <span className="sm:hidden">WE indispo</span>
        </motion.button>
      </div>
    </div>
  );
});

// Calendrier content mémorisé
const CalendarContent = memo(function CalendarContent({
  viewMode,
  showListView,
  currentDate,
  missions,
  availability,
  collectiveSlots,
  categoryTypes,
  selectedTypeId,
  dynamicSlots,
  onDayClick,
  onRangeSelect,
  onMissionClick,
  onSlotClick,
  onMonthClick,
  onToggleAvailability,
}: {
  viewMode: ViewMode;
  showListView: boolean;
  currentDate: Date;
  missions: Mission[];
  availability: Availability[];
  collectiveSlots: CollectiveSlot[];
  categoryTypes: CategoryType[];
  selectedTypeId: string | null;
  dynamicSlots?: {
    morning: { start: string; end: string } | null;
    afternoon: { start: string; end: string } | null;
    evening: { start: string; end: string } | null;
  };
  onDayClick: (date: string) => void;
  onRangeSelect: (startDate: string, endDate: string) => void;
  onMissionClick: (mission: Mission) => void;
  onSlotClick: (slot: CollectiveSlot) => void;
  onMonthClick: (month: number) => void;
  onToggleAvailability: (date: string) => void;
}) {
  if (showListView && viewMode === "month") {
    return <ListView missions={missions} onMissionClick={onMissionClick} />;
  }

  return (
    <>
      {viewMode === "month" && (
        <MonthView
          currentDate={currentDate}
          missions={missions}
          availability={availability}
          collectiveSlots={collectiveSlots}
          categoryTypes={categoryTypes}
          selectedTypeId={selectedTypeId}
          dynamicSlots={dynamicSlots}
          onDayClick={onDayClick}
          onRangeSelect={onRangeSelect}
          onMissionClick={onMissionClick}
          onSlotClick={onSlotClick}
        />
      )}
      {viewMode === "week" && (
        <WeekView
          currentDate={currentDate}
          missions={missions}
          availability={availability}
          collectiveSlots={collectiveSlots}
          categoryTypes={categoryTypes}
          selectedTypeId={selectedTypeId}
          dynamicSlots={dynamicSlots}
          onDayClick={onDayClick}
          onRangeSelect={onRangeSelect}
          onMissionClick={onMissionClick}
          onSlotClick={onSlotClick}
        />
      )}
      {viewMode === "day" && (
        <DayView
          currentDate={currentDate}
          missions={missions}
          availability={availability}
          collectiveSlots={collectiveSlots}
          dynamicSlots={dynamicSlots}
          onMissionClick={onMissionClick}
          onToggleAvailability={onToggleAvailability}
          onSlotClick={onSlotClick}
        />
      )}
      {viewMode === "year" && (
        <YearView
          currentDate={currentDate}
          missions={missions}
          availability={availability}
          onMonthClick={onMonthClick}
        />
      )}
    </>
  );
});

// List View Component mémorisé
const ListView = memo(function ListView({
  missions,
  onMissionClick,
}: {
  missions: Mission[];
  onMissionClick: (mission: Mission) => void;
}) {
  if (missions.length === 0) {
    return (
      <div
        className="text-center py-12"
        style={{ borderRadius: 12, background: "#fcfaf4", border: "1px solid #f1ede3" }}
      >
        <Calendar className="w-9 h-9 mx-auto mb-2" style={{ color: "#cdc9c0" }} />
        <p className="text-[13px] text-[#6d6d68]">Aucune mission ce mois-ci</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {missions.map((mission) => {
        const vs = getMissionVisualStyle(mission);
        return (
        <motion.div
          key={mission.id}
          onClick={() => onMissionClick(mission)}
          className="flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-[#f7f5ef]"
          style={{
            borderRadius: 12,
            background: vs.background,
            border: `1px solid ${vs.borderColor}`,
            borderLeft: `3px ${vs.borderStyle} ${vs.borderLeftColor}`,
          }}
          whileHover={{ x: 2 }}
        >
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-[22px] flex-shrink-0"
            style={{ background: "#fff", border: "1px solid #ece9e1" }}
          >
            {mission.animals && mission.animals.length > 1
              ? mission.animals.map((a: { emoji: string }) => a.emoji).join("")
              : mission.animal.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <p
                className="text-[14px] font-semibold tracking-[-0.01em] truncate m-0"
                style={{ color: vs.textColor }}
              >
                {mission.serviceName}
              </p>
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 uppercase tracking-[0.05em]"
                style={{
                  background: "rgba(255,255,255,0.7)",
                  color: vs.textColor,
                  border: `1px solid ${vs.borderLeftColor}`,
                }}
              >
                {vs.shortLabel}
              </span>
              {mission.isSapApplied && (
                <span
                  className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0"
                  style={{ border: "1px solid #cfdbd3", color: "#2f4a3f", background: "#fff" }}
                >
                  SAP
                </span>
              )}
            </div>
            <p className="text-[12px] text-[#6d6d68] truncate">
              {mission.animals && mission.animals.length > 1
                ? `${mission.animals.map((a: { name: string }) => a.name).join(", ")} · ${mission.clientName}`
                : `${mission.animal.name} · ${mission.clientName}`}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "#9c9484" }}>
              {new Date(mission.startDate).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
              })}{" "}
              →{" "}
              {new Date(mission.endDate).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
              })}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[16px] font-semibold text-[#1f3a33] tracking-[-0.01em]">
              {formatPrice(mission.serviceAmount ?? mission.amount)}
            </p>
          </div>
          <Eye className="w-4 h-4" style={{ color: "#9c9484" }} />
        </motion.div>
        );
      })}
    </div>
  );
});

export default function PlanningPage() {
  const { token, isLoading: authLoading } = useAuth();
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<CollectiveSlot | null>(null);
  const [selectedStartDate, setSelectedStartDate] = useState<string | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(null);
  const [showListView, setShowListView] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  // ── Pinceau (Phase 1 : peindre 1 click) ──────────────────────────
  const [brushKind, setBrushKind] = useState<BrushKind>("available");
  const [brushMode, setBrushMode] = useState<BrushMode>("paint");
  // Périodes activées pour combinaison (Matin + Soir, Aprem + Soir, etc.)
  const [activePeriods, setActivePeriods] = useState<Set<PeriodKey>>(new Set());
  // Types ciblés par le pinceau (vide = tous les types)
  const [brushTypeIds, setBrushTypeIds] = useState<string[]>([]);
  // Force l'ouverture explicite de la modal (mode "Personnalisé" ou Sélection)
  const [forceModal, setForceModal] = useState(false);

  // Wrapper du setter brushKind : reset les périodes si on choisit Dispo/Indispo
  const setBrushKindAndReset = useCallback((kind: BrushKind) => {
    setBrushKind(kind);
    if (kind === "available" || kind === "unavailable") {
      setActivePeriods(new Set());
    }
  }, []);

  // Toggle d'une période : ajoute/retire et passe automatiquement en mode "periods"
  const togglePeriod = useCallback((period: PeriodKey) => {
    setActivePeriods((prev) => {
      const next = new Set(prev);
      if (next.has(period)) {
        next.delete(period);
      } else {
        next.add(period);
      }
      return next;
    });
    // Activer le pinceau "periods" automatiquement
    setBrushKind("periods");
  }, []);

  // Toast Undo flottant après une action de pinceau
  const [lastBrushUndo, setLastBrushUndo] = useState<{
    date: string;
    typeIds: string[];
  } | null>(null);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Overlay local des créneaux en cours de modification (anti-stale state lors de clics rapides)
  // Clé : `${date}::${typeId}` → null = indispo, [] = à venir, sinon timeSlots
  const pendingSlotsRef = useRef<Map<string, Array<{ startTime: string; endTime: string }> | null>>(new Map());

  const {
    currentDate,
    viewMode,
    setViewMode,
    missions,
    availability,
    collectiveSlots,
    categoryTypes,
    stats,
    isLoading,
    goToToday,
    goToNext,
    goToPrevious,
    goToDate,
    getViewTitle,
    getAvailabilityForDay,
    getAvailabilityForDayByType,
    getAllAvailabilitiesForDay,
    acceptMission,
    refuseMission,
    cancelMission,
    completeMission,
    setDayAvailability,
    setRangeAvailability,
    clearDayAvailability,
    markWeekendsUnavailable,
  } = usePlanning({
    token,
    initialViewMode: "month",
  });

  // ── Préférences planning (depuis dashboard/parametres) ──────────
  const preferences = useQuery(
    api.services.preferences.getPreferences,
    token ? { token } : "skip"
  );
  const bufferSettings = useQuery(
    api.services.preferences.getBufferSettings,
    token ? { token } : "skip"
  );
  const updatePreferences = useMutation(api.services.preferences.updatePlanningPreferences);
  const updateBuffers = useMutation(api.services.preferences.updateBufferSettings);

  const acceptFrom = preferences?.acceptReservationsFrom ?? "08:00";
  const acceptTo = preferences?.acceptReservationsTo ?? "20:00";
  const bufferBefore = bufferSettings?.bufferBefore ?? 0;
  const bufferAfter = bufferSettings?.bufferAfter ?? 0;

  // Calcul dynamique des plages Matin/Aprem/Soir basé sur acceptFrom/acceptTo
  const dynamicBrushPresets = useMemo(() => {
    const parseHour = (t: string): number => {
      const [h] = t.split(":").map(Number);
      return h;
    };
    const startH = parseHour(acceptFrom);
    const endH = parseHour(acceptTo);
    const totalSpan = endH - startH;

    // Découpe en 3 zones égales si la plage de travail est définie
    if (totalSpan <= 6) {
      // Plage trop courte : Matin + Soir uniquement
      const mid = startH + Math.floor(totalSpan / 2);
      return {
        morning: { start: acceptFrom, end: `${String(mid).padStart(2, "0")}:00` },
        afternoon: null,
        evening: { start: `${String(mid).padStart(2, "0")}:00`, end: acceptTo },
      };
    }
    // Découpe classique en 3 (ex: 8-20 → matin 8-12, aprem 12-16, soir 16-20)
    const third = Math.floor(totalSpan / 3);
    const mid1 = startH + third;
    const mid2 = startH + 2 * third;
    return {
      morning: { start: acceptFrom, end: `${String(mid1).padStart(2, "0")}:00` },
      afternoon: { start: `${String(mid1).padStart(2, "0")}:00`, end: `${String(mid2).padStart(2, "0")}:00` },
      evening: { start: `${String(mid2).padStart(2, "0")}:00`, end: acceptTo },
    };
  }, [acceptFrom, acceptTo]);

  // Vérifier si une date est dans le passé
  const isPastDate = useCallback((dateStr: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(dateStr);
    return checkDate < today;
  }, []);

  // Appliquer le pinceau actuel à un jour donné (peinture instantanée)
  // Logique simplifiée : 1 click = applique l'état exact du pinceau (REMPLACE)
  const applyBrushToDay = useCallback(
    async (date: string) => {
      if (isPastDate(date)) return;
      if (brushKind === "custom") return; // géré par modal

      // Types ciblés par le pinceau : sélection multiple ou tous
      const typeIds = brushTypeIds.length > 0 ? brushTypeIds : categoryTypes.map((t) => t._id);
      if (typeIds.length === 0) return;

      // Snapshot pour Undo
      setLastBrushUndo({ date, typeIds });
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = setTimeout(() => setLastBrushUndo(null), 5000);

      // Cas 1 : pinceau "periods" (Matin + Aprem + Soir, etc.) → applique la combinaison
      if (brushKind === "periods") {
        if (activePeriods.size === 0) return; // Rien à appliquer
        const slots: Array<{ startTime: string; endTime: string }> = [];
        if (activePeriods.has("morning") && dynamicBrushPresets.morning) {
          slots.push({ startTime: dynamicBrushPresets.morning.start, endTime: dynamicBrushPresets.morning.end });
        }
        if (activePeriods.has("afternoon") && dynamicBrushPresets.afternoon) {
          slots.push({ startTime: dynamicBrushPresets.afternoon.start, endTime: dynamicBrushPresets.afternoon.end });
        }
        if (activePeriods.has("evening") && dynamicBrushPresets.evening) {
          slots.push({ startTime: dynamicBrushPresets.evening.start, endTime: dynamicBrushPresets.evening.end });
        }
        if (slots.length === 0) return;
        for (const typeId of typeIds) {
          await setDayAvailability(date, typeId, "partial", { timeSlots: slots });
        }
        return;
      }

      // Cas 2 : pinceau Dispo journée
      if (brushKind === "available") {
        for (const typeId of typeIds) {
          await setDayAvailability(date, typeId, "available");
        }
        return;
      }

      // Cas 3 : pinceau Indispo
      if (brushKind === "unavailable") {
        for (const typeId of typeIds) {
          await clearDayAvailability(date, typeId);
        }
        return;
      }

      // Cas legacy : ancien pinceau "morning"/"afternoon"/"evening" individuel (rétro-compat)
      const preset = BRUSH_PRESETS[brushKind as Exclude<BrushKind, "custom" | "periods">];
      if (preset) {
        for (const typeId of typeIds) {
          await setDayAvailability(date, typeId, preset.status, { timeSlots: preset.timeSlots });
        }
      }
    },
    [
      brushKind,
      brushTypeIds,
      activePeriods,
      categoryTypes,
      setDayAvailability,
      clearDayAvailability,
      isPastDate,
      dynamicBrushPresets,
    ]
  );

  // Click sur un jour : selon le mode, peindre directement OU ouvrir modal
  const handleDayClick = useCallback(
    (date: string) => {
      if (brushMode === "paint" && brushKind !== "custom") {
        // Mode peinture : applique le pinceau instantanément
        void applyBrushToDay(date);
      } else {
        // Mode sélection ou pinceau personnalisé : ouvre la modal détaillée
        setSelectedStartDate(date);
        setSelectedEndDate(null);
      }
    },
    [brushMode, brushKind, applyBrushToDay]
  );

  const handleRangeSelect = useCallback(
    async (startDate: string, endDate: string) => {
      // Drag-to-paint : applique le pinceau à toute la plage
      if (brushMode === "paint" && brushKind !== "custom") {
        if (isPastDate(startDate)) return;
        const typeIds = brushTypeIds.length > 0 ? brushTypeIds : categoryTypes.map((t) => t._id);
        if (typeIds.length === 0) return;

        // Itérer jour par jour pour appliquer la même logique que applyBrushToDay
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days: string[] = [];
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          days.push(`${y}-${m}-${day}`);
        }
        for (const date of days) {
          await applyBrushToDay(date);
        }
        return;
      }
      setSelectedStartDate(startDate);
      setSelectedEndDate(endDate);
    },
    [brushMode, brushKind, brushTypeIds, categoryTypes, isPastDate, applyBrushToDay]
  );

  const handleCloseModal = useCallback(() => {
    setSelectedStartDate(null);
    setSelectedEndDate(null);
    setForceModal(false);
  }, []);

  // Ouvrir explicitement la modal "Personnalisé" sur la dernière date sélectionnée
  const handleOpenAdvanced = useCallback(() => {
    setBrushKind("custom");
    if (!selectedStartDate) {
      // Si pas de jour sélectionné, on attend que l'utilisateur clique sur un jour
      // → le click ouvrira la modal car brushKind === "custom"
    } else {
      setForceModal(true);
    }
  }, [selectedStartDate]);

  // Raccourcis clavier
  // D = Dispo journée, I = Indispo (mutuellement exclusifs)
  // M / A / S = toggle périodes (combinables : Matin + Soir, etc.)
  // Refs pour garder les deps stables (évite le warning useEffect deps changeant)
  const brushKindResetRef = useRef(setBrushKindAndReset);
  const togglePeriodRef = useRef(togglePeriod);
  useEffect(() => {
    brushKindResetRef.current = setBrushKindAndReset;
    togglePeriodRef.current = togglePeriod;
  });
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === "d") {
        brushKindResetRef.current("available");
      } else if (key === "i") {
        brushKindResetRef.current("unavailable");
      } else if (key === "m") {
        togglePeriodRef.current("morning");
      } else if (key === "a") {
        togglePeriodRef.current("afternoon");
      } else if (key === "s") {
        togglePeriodRef.current("evening");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const handleMissionClick = useCallback((mission: Mission) => {
    setSelectedMission(mission);
  }, []);

  const handleSlotClick = useCallback((slot: CollectiveSlot) => {
    setSelectedSlot(slot);
  }, []);

  const handleCloseSlotModal = useCallback(() => {
    setSelectedSlot(null);
  }, []);

  const handleMonthClick = useCallback((month: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(month);
    goToDate(newDate);
    setViewMode("month");
  }, [currentDate, goToDate, setViewMode]);

  const handleAvailabilitySave = useCallback(async (
    categoryTypeId: string,
    status: "available" | "partial" | "unavailable",
    options?: {
      timeSlots?: Array<{ startTime: string; endTime: string }>;
      reason?: string;
    }
  ) => {
    if (!selectedStartDate) return;
    await setDayAvailability(selectedStartDate, categoryTypeId, status, options);
  }, [selectedStartDate, setDayAvailability]);

  const handleAvailabilitySaveRange = useCallback(async (
    startDate: string,
    endDate: string,
    categoryTypeId: string,
    status: "available" | "partial" | "unavailable",
    options?: {
      timeSlots?: Array<{ startTime: string; endTime: string }>;
      reason?: string;
    }
  ) => {
    await setRangeAvailability(startDate, endDate, categoryTypeId, status, options);
  }, [setRangeAvailability]);

  const handleAvailabilityClear = useCallback(async (categoryTypeId?: string) => {
    if (!selectedStartDate) return;
    await clearDayAvailability(selectedStartDate, categoryTypeId);
  }, [selectedStartDate, clearDayAvailability]);

  const handleTypeChange = useCallback((typeId: string | null) => {
    setSelectedTypeId(typeId);
  }, []);

  const handleCloseMissionModal = useCallback(() => {
    setSelectedMission(null);
  }, []);

  const handleOpenDuplicateModal = useCallback(() => {
    setShowDuplicateModal(true);
  }, []);

  const handleCloseDuplicateModal = useCallback(() => {
    setShowDuplicateModal(false);
  }, []);

  // Track si le premier chargement est terminé
  const hasInitiallyLoaded = useRef(false);

  useEffect(() => {
    if (!isLoading && !authLoading) {
      hasInitiallyLoaded.current = true;
    }
  }, [isLoading, authLoading]);

  // Loading state - SEULEMENT au tout premier chargement
  if (authLoading || (token && isLoading && !hasInitiallyLoaded.current)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const viewTitle = getViewTitle();

  return (
    <div className="space-y-6">
      {/* Header avec animation d'entrée */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <PlanningHeader
          viewMode={viewMode}
          setViewMode={setViewMode}
          showListView={showListView}
          setShowListView={setShowListView}
        />
      </motion.div>

      {/* Stats avec animation d'entrée */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <PlanningStats stats={stats} />
      </motion.div>

      {/* Toolbar Pinceau - Phase 1 amélioration UX */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
      >
        <AvailabilityBrushBar
          selectedBrush={brushKind}
          onBrushChange={setBrushKindAndReset}
          mode={brushMode}
          onModeChange={setBrushMode}
          onOpenAdvanced={handleOpenAdvanced}
          hasSelection={!!selectedStartDate}
          categoryTypes={categoryTypes}
          selectedTypeIds={brushTypeIds}
          onSelectedTypeIdsChange={setBrushTypeIds}
          dynamicSlots={dynamicBrushPresets}
          activePeriods={activePeriods}
          onTogglePeriod={togglePeriod}
          acceptFrom={acceptFrom}
          acceptTo={acceptTo}
          bufferBefore={bufferBefore}
          bufferAfter={bufferAfter}
          onSavePreferences={async (data) => {
            if (!token) return;
            await updatePreferences({
              token,
              acceptReservationsFrom: data.acceptFrom,
              acceptReservationsTo: data.acceptTo,
            });
            await updateBuffers({
              token,
              bufferBefore: data.bufferBefore,
              bufferAfter: data.bufferAfter,
            });
          }}
        />
      </motion.div>

      {/* Calendar Card avec animation d'entrée */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white p-4"
        style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
      >
        {/* Navigation - re-render quand le titre change */}
        <CalendarNavigation
          title={viewTitle}
          viewMode={viewMode}
          onPrevious={goToPrevious}
          onNext={goToNext}
          onToday={goToToday}
          onMarkWeekendsUnavailable={markWeekendsUnavailable}
          onDuplicateWeek={handleOpenDuplicateModal}
        />

        {/* Legend avec sélecteur de type */}
        <CalendarLegend
          categoryTypes={categoryTypes}
          selectedTypeId={selectedTypeId}
          onTypeChange={handleTypeChange}
        />

        {/* Calendar Content */}
        <CalendarContent
          viewMode={viewMode}
          showListView={showListView}
          currentDate={currentDate}
          missions={missions}
          availability={availability}
          collectiveSlots={collectiveSlots}
          categoryTypes={categoryTypes}
          selectedTypeId={selectedTypeId}
          dynamicSlots={dynamicBrushPresets}
          onDayClick={handleDayClick}
          onRangeSelect={handleRangeSelect}
          onMissionClick={handleMissionClick}
          onSlotClick={handleSlotClick}
          onMonthClick={handleMonthClick}
          onToggleAvailability={handleDayClick}
        />
      </motion.div>

      {/* Quick info avec animation d'entrée */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <QuickInfo viewMode={viewMode} />
      </motion.div>

      {/* Availability Modal — ouverte uniquement en mode "Sélection" / "Personnalisé" / range / forceModal */}
      <AvailabilityModal
        isOpen={
          !!selectedStartDate &&
          (brushMode === "select" || brushKind === "custom" || !!selectedEndDate || forceModal)
        }
        onClose={handleCloseModal}
        startDate={selectedStartDate || ""}
        endDate={selectedEndDate || undefined}
        categoryTypes={categoryTypes}
        selectedTypeId={selectedTypeId}
        currentAvailabilities={
          selectedStartDate && !selectedEndDate
            ? getAllAvailabilitiesForDay(selectedStartDate)
            : []
        }
        onSave={handleAvailabilitySave}
        onSaveRange={handleAvailabilitySaveRange}
        onClear={handleAvailabilityClear}
      />

      {/* Toast Undo flottant après peinture */}
      <AnimatePresence>
        {lastBrushUndo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 inline-flex items-center gap-3 px-4 py-2.5"
            style={{
              borderRadius: 999,
              background: "#1f1f1d",
              color: "#f7f5ef",
              boxShadow: "0 10px 30px rgba(30,30,28,0.18)",
            }}
          >
            <span className="text-[12px]">
              {BRUSH_PRESETS[brushKind as Exclude<BrushKind, "custom">]?.label ?? "Statut"} appliqué
            </span>
            <button
              onClick={async () => {
                if (!lastBrushUndo) return;
                for (const typeId of lastBrushUndo.typeIds) {
                  await clearDayAvailability(lastBrushUndo.date, typeId);
                }
                setLastBrushUndo(null);
                if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
              }}
              className="text-[12px] font-semibold underline hover:opacity-90"
              style={{ color: "#f7f5ef" }}
            >
              Annuler
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mission Detail Modal */}
      <MissionDetailModal
        mission={selectedMission}
        onClose={handleCloseMissionModal}
        onAccept={async (id) => {
          await acceptMission(id as any);
        }}
        onRefuse={async (id, reason) => {
          await refuseMission(id as any, reason);
        }}
        onCancel={async (id, reason) => {
          await cancelMission(id as any, reason);
        }}
        onComplete={async (id, notes) => {
          await completeMission(id as any, notes);
        }}
      />

      {/* Collective Slot Modal */}
      <CollectiveSlotModal
        slot={selectedSlot}
        token={token}
        onClose={handleCloseSlotModal}
      />

      {/* Duplicate Week Modal */}
      <DuplicateWeekModal
        isOpen={showDuplicateModal}
        onClose={handleCloseDuplicateModal}
        token={token}
        categoryTypes={categoryTypes}
      />
    </div>
  );
}
