"use client";

import { useState, memo, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
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

// Components
import { MonthView } from "./components/views/MonthView";
import { WeekView } from "./components/views/WeekView";
import { DayView } from "./components/views/DayView";
import { YearView } from "./components/views/YearView";
import { AvailabilityModal } from "./components/availability/AvailabilityModal";
import { DuplicateWeekModal } from "./components/availability/DuplicateWeekModal";
import { MissionDetailModal } from "./components/MissionDetailModal";
import { CollectiveSlotModal } from "./components/CollectiveSlotModal";
import {
  statusColors,
  statusLabels,
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
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-purple/20 rounded-2xl">
          <Calendar className="w-6 h-6 text-purple" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Planning
          </h1>
          <p className="text-text-light">
            Gerez votre calendrier et vos disponibilites
          </p>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-2">
        <div className="hidden md:flex bg-gray-100 rounded-xl p-1">
          {(Object.keys(viewModeConfig) as ViewMode[]).map((mode) => {
            const { icon: Icon, label } = viewModeConfig[mode];
            return (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  viewMode === mode
                    ? "bg-white text-foreground shadow-sm"
                    : "text-text-light hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </div>

        {/* Mobile view toggle */}
        <div className="md:hidden flex bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setShowListView(false)}
            className={cn(
              "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              !showListView
                ? "bg-white text-foreground shadow-sm"
                : "text-text-light"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowListView(true)}
            className={cn(
              "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              showListView
                ? "bg-white text-foreground shadow-sm"
                : "text-text-light"
            )}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
});

// Stats mémorisées - ne re-render que si stats change
const PlanningStats = memo(function PlanningStats({ stats }: { stats: MissionStats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white rounded-2xl p-4 shadow-md">
        <p className="text-sm text-text-light">Missions</p>
        <p className="text-2xl font-bold text-foreground">{stats.total}</p>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-md">
        <p className="text-sm text-text-light">En cours</p>
        <p className="text-2xl font-bold text-blue-500">{stats.inProgress}</p>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-md">
        <p className="text-sm text-text-light">A venir</p>
        <p className="text-2xl font-bold text-purple">{stats.upcoming}</p>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-md">
        <p className="text-sm text-text-light">Revenus</p>
        <p className="text-2xl font-bold text-primary">
          {formatPrice(stats.revenue)}
        </p>
      </div>
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
  return (
    <div className="space-y-4 mb-4 pb-4 border-b border-gray-100">
      {/* Filtre par type de service */}
      {categoryTypes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-text-light mr-2">
            Filtrer par type:
          </span>
          <button
            onClick={() => onTypeChange(null)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              !selectedTypeId
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            Tous
          </button>
          {categoryTypes.map((type) => (
            <button
              key={type._id}
              onClick={() => onTypeChange(type._id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1",
                selectedTypeId === type._id
                  ? "text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
              style={{
                backgroundColor:
                  selectedTypeId === type._id ? type.color : undefined,
              }}
            >
              <span>{type.icon}</span>
              {type.name}
            </button>
          ))}
        </div>
      )}

      {/* Légende des statuts */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-text-light">En cours</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded-full bg-purple" />
          <span className="text-text-light">A venir</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-text-light">A accepter</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-text-light">Terminee</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span className="text-text-light">Collectif</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded bg-green-100 border border-green-200" />
          <span className="text-text-light">Disponible</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded bg-orange-100 border border-orange-200" />
          <span className="text-text-light">Partiel</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded bg-gray-200 border border-gray-300" />
          <span className="text-text-light">Indisponible (defaut)</span>
        </div>
      </div>
    </div>
  );
});

// Info box mémorisée
const QuickInfo = memo(function QuickInfo({ viewMode }: { viewMode: ViewMode }) {
  return (
    <div className="space-y-3">
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-blue-800">Gestion des disponibilites</p>
          <ul className="text-sm text-blue-700 space-y-1 mt-1">
            <li>• Par defaut, vous etes <strong>indisponible</strong> pour tous les types</li>
            <li>• Selectionnez un type puis cliquez sur un jour pour vous rendre disponible</li>
            <li>• Vous pouvez etre disponible pour &quot;Garde&quot; mais pas pour &quot;Services&quot; le meme jour</li>
            <li>• Les seances collectives se gerent dans &quot;Mes services&quot;</li>
          </ul>
        </div>
      </div>

      {/* Astuce pour la semaine type - visible uniquement en vue mois ou année */}
      {(viewMode === "month" || viewMode === "year") && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-start gap-3">
          <Copy className="w-5 h-5 text-purple flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-purple-800">Astuce : Creez une semaine type</p>
            <p className="text-sm text-purple-700 mt-1">
              Passez en <strong>vue Semaine</strong> pour configurer vos disponibilites puis dupliquez-les
              sur plusieurs semaines ou sur toute l&apos;annee en un clic.
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
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <motion.button
          onClick={onPrevious}
          className="p-2 hover:bg-gray-100 rounded-lg"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </motion.button>
        <h2 className="text-xl font-bold text-foreground min-w-[200px] text-center capitalize">
          {title}
        </h2>
        <motion.button
          onClick={onNext}
          className="p-2 hover:bg-gray-100 rounded-lg"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronRight className="w-5 h-5 text-foreground" />
        </motion.button>
      </div>

      <div className="flex items-center gap-2">
        <motion.button
          onClick={onToday}
          className="px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Aujourd&apos;hui
        </motion.button>
        {/* Bouton Semaine type - uniquement en vue semaine */}
        {viewMode === "week" && (
          <motion.button
            onClick={onDuplicateWeek}
            className="hidden md:flex items-center gap-1 px-4 py-2 bg-purple/10 text-purple rounded-lg text-sm font-medium hover:bg-purple/20"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Copy className="w-4 h-4" />
            Dupliquer cette semaine
          </motion.button>
        )}
        <motion.button
          onClick={onMarkWeekendsUnavailable}
          className="hidden md:flex items-center gap-1 px-4 py-2 border border-gray-200 text-text-light rounded-lg text-sm font-medium hover:border-gray-300"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <CalendarOff className="w-4 h-4" />
          Weekends indispo
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
      <div className="text-center py-12">
        <Calendar className="w-12 h-12 text-text-light mx-auto mb-3" />
        <p className="text-text-light">Aucune mission ce mois-ci</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {missions.map((mission) => (
        <motion.div
          key={mission.id}
          onClick={() => onMissionClick(mission)}
          className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
          whileHover={{ x: 4 }}
        >
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl shadow-sm">
            {mission.animal.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-foreground truncate">
                {mission.serviceName}
              </p>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs text-white flex-shrink-0",
                  statusColors[mission.status]
                )}
              >
                {statusLabels[mission.status]}
              </span>
            </div>
            <p className="text-sm text-text-light">
              {mission.animal.name} - {mission.clientName}
            </p>
            <p className="text-xs text-text-light mt-1">
              {new Date(mission.startDate).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
              })}{" "}
              -{" "}
              {new Date(mission.endDate).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
              })}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold text-primary">
              {formatPrice(mission.amount)}
            </p>
          </div>
          <Eye className="w-5 h-5 text-text-light" />
        </motion.div>
      ))}
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

  // Callbacks stables avec useCallback
  const handleDayClick = useCallback((date: string) => {
    setSelectedStartDate(date);
    setSelectedEndDate(null);
  }, []);

  const handleRangeSelect = useCallback((startDate: string, endDate: string) => {
    setSelectedStartDate(startDate);
    setSelectedEndDate(endDate);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedStartDate(null);
    setSelectedEndDate(null);
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

      {/* Calendar Card avec animation d'entrée */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl p-4 shadow-md"
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

      {/* Availability Modal */}
      <AvailabilityModal
        isOpen={!!selectedStartDate}
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
