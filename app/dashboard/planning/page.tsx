"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { usePlanning, ViewMode, Mission } from "@/app/hooks/usePlanning";
import { useAuth } from "@/app/hooks/useAuth";

// Components
import { MonthView } from "./components/views/MonthView";
import { WeekView } from "./components/views/WeekView";
import { DayView } from "./components/views/DayView";
import { YearView } from "./components/views/YearView";
import { AvailabilityModal } from "./components/availability/AvailabilityModal";
import { MissionDetailModal } from "./components/MissionDetailModal";
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

export default function PlanningPage() {
  const { token, isLoading: authLoading } = useAuth();
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [selectedStartDate, setSelectedStartDate] = useState<string | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(null);
  const [showListView, setShowListView] = useState(false);

  const {
    currentDate,
    viewMode,
    setViewMode,
    missions,
    availability,
    stats,
    isLoading,
    goToToday,
    goToNext,
    goToPrevious,
    goToDate,
    getViewTitle,
    getMissionsForDay,
    getAvailabilityForDay,
    acceptMission,
    refuseMission,
    cancelMission,
    completeMission,
    setDayAvailability,
    setRangeAvailability,
    clearDayAvailability,
    toggleDayAvailability,
    markWeekendsUnavailable,
  } = usePlanning({
    token,
    initialViewMode: "month",
  });

  // Handle day click in calendar (single day)
  const handleDayClick = (date: string) => {
    setSelectedStartDate(date);
    setSelectedEndDate(null);
  };

  // Handle range selection in calendar
  const handleRangeSelect = (startDate: string, endDate: string) => {
    setSelectedStartDate(startDate);
    setSelectedEndDate(endDate);
  };

  // Close modal
  const handleCloseModal = () => {
    setSelectedStartDate(null);
    setSelectedEndDate(null);
  };

  // Handle mission click
  const handleMissionClick = (mission: Mission) => {
    setSelectedMission(mission);
  };

  // Handle month click in year view
  const handleMonthClick = (month: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(month);
    goToDate(newDate);
    setViewMode("month");
  };

  // Handle availability save (single day)
  const handleAvailabilitySave = async (
    status: "available" | "partial" | "unavailable",
    options?: {
      timeSlots?: Array<{ startTime: string; endTime: string }>;
      reason?: string;
    }
  ) => {
    if (!selectedStartDate) return;
    await setDayAvailability(selectedStartDate, status, options);
  };

  // Handle availability save (range)
  const handleAvailabilitySaveRange = async (
    startDate: string,
    endDate: string,
    status: "available" | "partial" | "unavailable",
    options?: {
      timeSlots?: Array<{ startTime: string; endTime: string }>;
      reason?: string;
    }
  ) => {
    await setRangeAvailability(startDate, endDate, status, options);
  };

  // Handle availability clear
  const handleAvailabilityClear = async () => {
    if (!selectedStartDate) return;
    await clearDayAvailability(selectedStartDate);
  };

  // Loading state
  if (authLoading || (token && isLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
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
      </motion.div>

      {/* Month Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
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
      </motion.div>

      {/* Calendar Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl p-4 shadow-md"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <motion.button
              onClick={goToPrevious}
              className="p-2 hover:bg-gray-100 rounded-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </motion.button>
            <h2 className="text-xl font-bold text-foreground min-w-[200px] text-center capitalize">
              {getViewTitle()}
            </h2>
            <motion.button
              onClick={goToNext}
              className="p-2 hover:bg-gray-100 rounded-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronRight className="w-5 h-5 text-foreground" />
            </motion.button>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              onClick={goToToday}
              className="px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Aujourd&apos;hui
            </motion.button>
            <motion.button
              onClick={markWeekendsUnavailable}
              className="hidden md:flex items-center gap-1 px-4 py-2 border border-gray-200 text-text-light rounded-lg text-sm font-medium hover:border-gray-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <CalendarOff className="w-4 h-4" />
              Weekends indispo
            </motion.button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-4 pb-4 border-b border-gray-100">
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
            <div className="w-3 h-3 rounded bg-green-100 border border-green-200" />
            <span className="text-text-light">Disponible</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded bg-orange-100 border border-orange-200" />
            <span className="text-text-light">Partiel</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded bg-red-100 border border-red-200" />
            <span className="text-text-light">Indisponible</span>
          </div>
        </div>

        {/* Calendar View or List View */}
        {showListView && viewMode === "month" ? (
          <ListView
            missions={missions}
            onMissionClick={handleMissionClick}
          />
        ) : (
          <>
            {viewMode === "month" && (
              <MonthView
                currentDate={currentDate}
                missions={missions}
                availability={availability}
                onDayClick={handleDayClick}
                onRangeSelect={handleRangeSelect}
                onMissionClick={handleMissionClick}
              />
            )}
            {viewMode === "week" && (
              <WeekView
                currentDate={currentDate}
                missions={missions}
                availability={availability}
                onDayClick={handleDayClick}
                onRangeSelect={handleRangeSelect}
                onMissionClick={handleMissionClick}
              />
            )}
            {viewMode === "day" && (
              <DayView
                currentDate={currentDate}
                missions={missions}
                availability={availability}
                onMissionClick={handleMissionClick}
                onToggleAvailability={handleDayClick}
              />
            )}
            {viewMode === "year" && (
              <YearView
                currentDate={currentDate}
                missions={missions}
                availability={availability}
                onMonthClick={handleMonthClick}
              />
            )}
          </>
        )}
      </motion.div>

      {/* Quick info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3"
      >
        <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-blue-800">Gerer vos disponibilites</p>
          <p className="text-sm text-blue-700">
            Cliquez sur un jour du calendrier pour definir votre disponibilite.
            Les clients ne pourront pas reserver pendant vos periodes
            d&apos;indisponibilite.
          </p>
        </div>
      </motion.div>

      {/* Availability Modal */}
      <AvailabilityModal
        isOpen={!!selectedStartDate}
        onClose={handleCloseModal}
        startDate={selectedStartDate || ""}
        endDate={selectedEndDate || undefined}
        currentAvailability={
          selectedStartDate && !selectedEndDate
            ? getAvailabilityForDay(selectedStartDate)
            : null
        }
        onSave={handleAvailabilitySave}
        onSaveRange={handleAvailabilitySaveRange}
        onClear={handleAvailabilityClear}
      />

      {/* Mission Detail Modal */}
      <MissionDetailModal
        mission={selectedMission}
        onClose={() => setSelectedMission(null)}
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
    </div>
  );
}

// List View Component
function ListView({
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
}
