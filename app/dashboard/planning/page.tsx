"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Euro,
  Eye,
  X,
  CheckCircle,
  AlertCircle,
  Pause,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import {
  mockMissions,
  mockUserProfile,
  type Mission,
  type MissionStatus,
} from "@/app/lib/dashboard-data";

// Status colors for calendar
const statusColors: Record<MissionStatus, string> = {
  completed: "bg-green-500",
  in_progress: "bg-blue-500",
  upcoming: "bg-purple",
  pending_acceptance: "bg-amber-500",
  pending_confirmation: "bg-orange-500",
  refused: "bg-red-400",
  cancelled: "bg-gray-400",
};

const statusLabels: Record<MissionStatus, string> = {
  completed: "Terminée",
  in_progress: "En cours",
  upcoming: "À venir",
  pending_acceptance: "À accepter",
  pending_confirmation: "En attente",
  refused: "Refusée",
  cancelled: "Annulée",
};

// Availability colors
const availabilityColors = {
  available: "bg-green-100 text-green-800 border-green-200",
  partial: "bg-orange-100 text-orange-800 border-orange-200",
  unavailable: "bg-red-100 text-red-800 border-red-200",
};

const availabilityLabels = {
  available: "Disponible",
  partial: "Partiel",
  unavailable: "Indisponible",
};

// Helper to get days in month
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

// Helper to get first day of month (0 = Sunday, 1 = Monday, etc.)
function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  // Convert to Monday-first (0 = Monday, 6 = Sunday)
  return day === 0 ? 6 : day - 1;
}

// Mission Detail Modal
function MissionDetailModal({
  mission,
  onClose,
}: {
  mission: Mission | null;
  onClose: () => void;
}) {
  if (!mission) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl p-6 max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-2xl">
                {mission.animal.emoji}
              </div>
              <div>
                <h3 className="font-bold text-foreground">{mission.service}</h3>
                <p className="text-sm text-text-light">{mission.animal.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5 text-text-light" />
            </button>
          </div>

          {/* Status */}
          <div className="mb-4">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium text-white",
                statusColors[mission.status]
              )}
            >
              {mission.status === "in_progress" && <Clock className="w-3.5 h-3.5" />}
              {mission.status === "completed" && <CheckCircle className="w-3.5 h-3.5" />}
              {mission.status === "pending_acceptance" && <AlertCircle className="w-3.5 h-3.5" />}
              {statusLabels[mission.status]}
            </span>
          </div>

          {/* Details */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-text-light" />
              <div>
                <p className="text-foreground font-medium">
                  {formatDate(mission.startDate)}
                </p>
                <p className="text-text-light">
                  au {formatDate(mission.endDate)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <MapPin className="w-4 h-4 text-text-light" />
              <span className="text-foreground">{mission.location}</span>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Euro className="w-4 h-4 text-text-light" />
              <span className="text-foreground font-semibold">
                {mission.amount}€ TTC
              </span>
            </div>
          </div>

          {/* Client */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-text-light mb-2">Client</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-xl">
                {mission.clientAvatar}
              </div>
              <p className="font-medium text-foreground">{mission.clientName}</p>
            </div>
          </div>

          {/* Action */}
          <motion.button
            onClick={onClose}
            className="w-full mt-4 py-3 bg-primary text-white rounded-xl font-semibold"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            Fermer
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function PlanningPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2024, 0, 1)); // January 2024
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [viewMode, setViewMode] = useState<"month" | "list">("month");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonth = getFirstDayOfMonth(year, month);

  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  // Get missions for a specific date
  const getMissionsForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return mockMissions.filter((mission) => {
      const start = new Date(mission.startDate);
      const end = new Date(mission.endDate);
      const current = new Date(dateStr);
      return current >= start && current <= end;
    });
  };

  // Get availability for a specific date
  const getAvailabilityForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return mockUserProfile.availability[dateStr] || null;
  };

  // Navigate months
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date(2024, 0, 15)); // Simulated "today" in January 2024
  };

  // Get all missions for the current month (for list view)
  const monthMissions = useMemo(() => {
    return mockMissions
      .filter((mission) => {
        const start = new Date(mission.startDate);
        const end = new Date(mission.endDate);
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        return start <= monthEnd && end >= monthStart;
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [year, month]);

  // Stats for the month
  const monthStats = useMemo(() => {
    const missions = monthMissions;
    return {
      total: missions.length,
      inProgress: missions.filter((m) => m.status === "in_progress").length,
      upcoming: missions.filter((m) => m.status === "upcoming").length,
      pending: missions.filter((m) => m.status === "pending_acceptance" || m.status === "pending_confirmation").length,
      revenue: missions
        .filter((m) => ["completed", "in_progress", "upcoming"].includes(m.status))
        .reduce((sum, m) => sum + m.amount, 0),
    };
  }, [monthMissions]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ day: 0, isCurrentMonth: false });
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ day, isCurrentMonth: true });
    }

    return days;
  }, [firstDayOfMonth, daysInMonth]);

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
                Gérez votre calendrier et vos disponibilités
              </p>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode("month")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                viewMode === "month"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-text-light hover:text-foreground"
              )}
            >
              Mois
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                viewMode === "list"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-text-light hover:text-foreground"
              )}
            >
              Liste
            </button>
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
          <p className="text-2xl font-bold text-foreground">{monthStats.total}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-md">
          <p className="text-sm text-text-light">En cours</p>
          <p className="text-2xl font-bold text-blue-500">{monthStats.inProgress}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-md">
          <p className="text-sm text-text-light">À venir</p>
          <p className="text-2xl font-bold text-purple">{monthStats.upcoming}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-md">
          <p className="text-sm text-text-light">Revenus prévus</p>
          <p className="text-2xl font-bold text-primary">{monthStats.revenue}€</p>
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
              onClick={prevMonth}
              className="p-2 hover:bg-gray-100 rounded-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </motion.button>
            <h2 className="text-xl font-bold text-foreground min-w-[200px] text-center">
              {monthNames[month]} {year}
            </h2>
            <motion.button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronRight className="w-5 h-5 text-foreground" />
            </motion.button>
          </div>

          <motion.button
            onClick={goToToday}
            className="px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Aujourd&apos;hui
          </motion.button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-text-light">En cours</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-purple" />
            <span className="text-text-light">À venir</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-text-light">À accepter</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-text-light">Terminée</span>
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

        {viewMode === "month" ? (
          <>
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-text-light py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((item, index) => {
                if (!item.isCurrentMonth) {
                  return <div key={index} className="h-24 md:h-28" />;
                }

                const missions = getMissionsForDate(item.day);
                const availability = getAvailabilityForDate(item.day);
                const isToday = item.day === 15 && month === 0 && year === 2024; // Simulated today

                return (
                  <motion.div
                    key={index}
                    className={cn(
                      "h-24 md:h-28 p-1 rounded-lg border transition-colors cursor-pointer",
                      isToday
                        ? "border-primary bg-primary/5"
                        : "border-gray-100 hover:border-gray-200 hover:bg-gray-50",
                      availability && !missions.length && availabilityColors[availability]
                    )}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          isToday ? "text-primary" : "text-foreground"
                        )}
                      >
                        {item.day}
                      </span>
                      {availability && !missions.length && (
                        <span className="text-[10px]">
                          {availability === "available" && "✓"}
                          {availability === "partial" && "~"}
                          {availability === "unavailable" && "✗"}
                        </span>
                      )}
                    </div>

                    {/* Missions */}
                    <div className="space-y-0.5 overflow-hidden">
                      {missions.slice(0, 2).map((mission) => (
                        <motion.div
                          key={mission.id}
                          onClick={() => setSelectedMission(mission)}
                          className={cn(
                            "text-[10px] md:text-xs text-white px-1.5 py-0.5 rounded truncate",
                            statusColors[mission.status]
                          )}
                          whileHover={{ scale: 1.05 }}
                        >
                          {mission.animal.emoji} {mission.animal.name}
                        </motion.div>
                      ))}
                      {missions.length > 2 && (
                        <p className="text-[10px] text-text-light">
                          +{missions.length - 2} autres
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        ) : (
          /* List View */
          <div className="space-y-3">
            {monthMissions.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-text-light mx-auto mb-3" />
                <p className="text-text-light">Aucune mission ce mois-ci</p>
              </div>
            ) : (
              monthMissions.map((mission) => (
                <motion.div
                  key={mission.id}
                  onClick={() => setSelectedMission(mission)}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
                  whileHover={{ x: 4 }}
                >
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl shadow-sm">
                    {mission.animal.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-foreground truncate">
                        {mission.service}
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
                      {mission.animal.name} • {mission.clientName}
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
                    <p className="text-lg font-bold text-primary">{mission.amount}€</p>
                    <p className="text-xs text-text-light">TTC</p>
                  </div>
                  <Eye className="w-5 h-5 text-text-light" />
                </motion.div>
              ))
            )}
          </div>
        )}
      </motion.div>

      {/* Availability Quick Edit Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3"
      >
        <Pause className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-blue-800">Gérer vos disponibilités</p>
          <p className="text-sm text-blue-700">
            Pour modifier vos disponibilités, rendez-vous dans votre{" "}
            <a href="/dashboard/profil" className="underline font-medium">
              profil
            </a>{" "}
            et mettez à jour votre calendrier de disponibilités.
          </p>
        </div>
      </motion.div>

      {/* Mission Detail Modal */}
      <MissionDetailModal
        mission={selectedMission}
        onClose={() => setSelectedMission(null)}
      />
    </div>
  );
}
