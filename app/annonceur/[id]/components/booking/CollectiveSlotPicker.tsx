"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Calendar,
  Clock,
  Users,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Info,
  CalendarDays,
  CalendarRange,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/app/lib/utils";

interface CollectiveSlot {
  _id: Id<"collectiveSlots">;
  date: string;
  startTime: string;
  endTime: string;
  availableSpots: number;
  maxAnimals: number;
}

interface CollectiveSlotPickerProps {
  variantId: Id<"serviceVariants"> | string;
  numberOfSessions: number;
  sessionInterval: number; // En jours
  animalCount: number;
  animalType: string;
  onSlotsSelected: (slotIds: string[]) => void;
  selectedSlotIds?: string[];
  className?: string;
}

type ViewMode = "month" | "week" | "day";

// Formater la date
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
};

// Formater la date courte
const formatDateShort = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
};

// Formater le jour de la semaine
const formatWeekday = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
  });
};

// Formater le jour du mois
const formatDayNumber = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.getDate().toString();
};

// Vérifier l'intervalle entre les dates
const checkInterval = (
  selectedDates: string[],
  newDate: string,
  minInterval: number
): boolean => {
  if (selectedDates.length === 0) return true;

  const newDateObj = new Date(newDate);

  for (const date of selectedDates) {
    const dateObj = new Date(date);
    const diffDays = Math.abs(
      (newDateObj.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays < minInterval) {
      return false;
    }
  }

  return true;
};

// Obtenir le lundi de la semaine
const getMonday = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

// Obtenir les jours de la semaine
const getWeekDays = (monday: Date): { date: Date; dateStr: string }[] => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    days.push({
      date,
      dateStr: date.toISOString().split("T")[0],
    });
  }
  return days;
};

export default function CollectiveSlotPicker({
  variantId,
  numberOfSessions,
  sessionInterval,
  animalCount,
  animalType,
  onSlotsSelected,
  selectedSlotIds = [],
  className,
}: CollectiveSlotPickerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedSlotIds);

  // Query pour récupérer les créneaux disponibles
  const availableSlotsQuery = useQuery(
    api.planning.collectiveSlots.getAvailableSlots,
    {
      variantId: variantId as Id<"serviceVariants">,
      animalCount,
      animalType,
    }
  );

  const availableSlots = availableSlotsQuery || [];

  // Grouper les créneaux par date
  const slotsByDate = useMemo(() => {
    const map = new Map<string, CollectiveSlot[]>();
    for (const slot of availableSlots) {
      const existing = map.get(slot.date) || [];
      existing.push(slot as CollectiveSlot);
      map.set(slot.date, existing);
    }
    // Trier les créneaux par heure pour chaque date
    map.forEach((slots, date) => {
      slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    return map;
  }, [availableSlots]);

  // Dates des créneaux sélectionnés
  const selectedDates = useMemo(() => {
    return localSelectedIds
      .map((id) => {
        const slot = availableSlots.find((s: CollectiveSlot) => s._id === id);
        return slot?.date;
      })
      .filter((d): d is string => !!d);
  }, [localSelectedIds, availableSlots]);

  // Jours de la semaine courante
  const weekDays = useMemo(() => {
    const monday = getMonday(currentDate);
    return getWeekDays(monday);
  }, [currentDate]);

  // Générer les jours du mois courant
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: { date: Date; dateStr: string; isCurrentMonth: boolean }[] = [];

    // Jours du mois précédent
    const startDayOfWeek = firstDay.getDay() || 7;
    for (let i = startDayOfWeek - 1; i > 0; i--) {
      const date = new Date(year, month, 1 - i);
      days.push({
        date,
        dateStr: date.toISOString().split("T")[0],
        isCurrentMonth: false,
      });
    }

    // Jours du mois courant
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      days.push({
        date,
        dateStr: date.toISOString().split("T")[0],
        isCurrentMonth: true,
      });
    }

    // Compléter la dernière semaine
    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let i = 1; i <= remainingDays; i++) {
        const date = new Date(year, month + 1, i);
        days.push({
          date,
          dateStr: date.toISOString().split("T")[0],
          isCurrentMonth: false,
        });
      }
    }

    return days;
  }, [currentDate]);

  const today = new Date().toISOString().split("T")[0];
  const currentDateStr = currentDate.toISOString().split("T")[0];

  // Navigation
  const navigatePrev = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (viewMode === "week") {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 7);
      setCurrentDate(newDate);
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 1);
      setCurrentDate(newDate);
    }
  };

  const navigateNext = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (viewMode === "week") {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 7);
      setCurrentDate(newDate);
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 1);
      setCurrentDate(newDate);
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Gérer la sélection d'un créneau
  const handleSlotSelect = (slotId: string) => {
    const slot = availableSlots.find((s: CollectiveSlot) => s._id === slotId);
    if (!slot) return;

    const isSelected = localSelectedIds.includes(slotId);

    if (isSelected) {
      // Désélectionner
      const newIds = localSelectedIds.filter((id) => id !== slotId);
      setLocalSelectedIds(newIds);
      onSlotsSelected(newIds);
    } else {
      // Vérifier si on peut encore sélectionner
      if (localSelectedIds.length >= numberOfSessions) {
        return;
      }

      // Vérifier l'intervalle
      if (!checkInterval(selectedDates, slot.date, sessionInterval)) {
        alert(
          `L'intervalle minimum entre les séances est de ${sessionInterval} jour(s).`
        );
        return;
      }

      // Sélectionner
      const newIds = [...localSelectedIds, slotId];
      setLocalSelectedIds(newIds);
      onSlotsSelected(newIds);
    }
  };

  // Mettre à jour si selectedSlotIds change de l'extérieur
  useEffect(() => {
    setLocalSelectedIds(selectedSlotIds);
  }, [selectedSlotIds]);

  const isComplete = localSelectedIds.length === numberOfSessions;

  // Rendu d'un créneau
  const renderSlot = (slot: CollectiveSlot, compact: boolean = false) => {
    const isSelected = localSelectedIds.includes(slot._id);
    const canSelect =
      isSelected ||
      (localSelectedIds.length < numberOfSessions &&
        (checkInterval(selectedDates, slot.date, sessionInterval) ||
          localSelectedIds.length === 0));

    return (
      <button
        key={slot._id}
        onClick={() => canSelect && handleSlotSelect(slot._id)}
        disabled={!canSelect}
        className={cn(
          "rounded-lg transition-all text-left",
          compact ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm",
          isSelected
            ? "bg-primary text-white shadow-md"
            : canSelect
            ? "bg-primary/10 text-primary hover:bg-primary/20 hover:shadow-sm"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Clock className={cn("flex-shrink-0", compact ? "w-3 h-3" : "w-4 h-4")} />
            <span className="font-medium">{slot.startTime}</span>
            <span className="opacity-70">-</span>
            <span>{slot.endTime}</span>
          </div>
          {isSelected && <Check className={compact ? "w-3 h-3" : "w-4 h-4"} />}
        </div>
        {!compact && (
          <div className="flex items-center gap-1 mt-1 text-xs opacity-80">
            <Users className="w-3 h-3" />
            <span>{slot.availableSpots} place{slot.availableSpots > 1 ? "s" : ""}</span>
          </div>
        )}
      </button>
    );
  };

  // Rendu de la vue jour
  const renderDayView = () => {
    const daySlots = slotsByDate.get(currentDateStr) || [];
    const isPast = currentDateStr < today;

    return (
      <div className="space-y-4">
        <div className="text-center">
          <h4 className="text-lg font-semibold text-gray-900 capitalize">
            {formatDate(currentDateStr)}
          </h4>
          {isPast && (
            <p className="text-sm text-gray-500 mt-1">Cette date est passée</p>
          )}
        </div>

        {daySlots.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucun créneau disponible ce jour</p>
          </div>
        ) : (
          <div className="grid gap-2 max-h-[400px] overflow-y-auto">
            {daySlots.map((slot) => renderSlot(slot, false))}
          </div>
        )}
      </div>
    );
  };

  // Rendu de la vue semaine
  const renderWeekView = () => {
    return (
      <div className="space-y-3">
        {/* En-tête des jours */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map(({ date, dateStr }) => {
            const isPast = dateStr < today;
            const isToday = dateStr === today;
            const hasSlots = slotsByDate.has(dateStr);
            const daySlots = slotsByDate.get(dateStr) || [];
            const hasSelectedSlot = daySlots.some((s) => localSelectedIds.includes(s._id));

            return (
              <div
                key={dateStr}
                className={cn(
                  "text-center p-2 rounded-lg",
                  isToday && "bg-primary/10 ring-2 ring-primary/30",
                  hasSelectedSlot && "bg-primary/5"
                )}
              >
                <div className={cn(
                  "text-xs font-medium uppercase",
                  isPast ? "text-gray-400" : "text-gray-600"
                )}>
                  {formatWeekday(dateStr)}
                </div>
                <div className={cn(
                  "text-lg font-bold",
                  isPast ? "text-gray-400" : isToday ? "text-primary" : "text-gray-900"
                )}>
                  {formatDayNumber(dateStr)}
                </div>
                {hasSlots && !isPast && (
                  <div className={cn(
                    "w-2 h-2 rounded-full mx-auto mt-1",
                    hasSelectedSlot ? "bg-primary" : "bg-green-500"
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* Créneaux par jour */}
        <div className="grid grid-cols-7 gap-1 min-h-[200px]">
          {weekDays.map(({ dateStr }) => {
            const daySlots = slotsByDate.get(dateStr) || [];
            const isPast = dateStr < today;

            return (
              <div
                key={dateStr}
                className={cn(
                  "p-1 rounded-lg space-y-1 max-h-[250px] overflow-y-auto",
                  isPast ? "bg-gray-50 opacity-50" : "bg-gray-50"
                )}
              >
                {!isPast && daySlots.map((slot) => renderSlot(slot, true))}
                {!isPast && daySlots.length === 0 && (
                  <div className="text-xs text-gray-400 text-center py-4">
                    -
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Rendu de la vue mois
  const renderMonthView = () => {
    return (
      <>
        {/* Jours de la semaine */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-gray-500 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grille du calendrier */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map(({ date, dateStr, isCurrentMonth }) => {
            const daySlots = slotsByDate.get(dateStr) || [];
            const isPast = dateStr < today;
            const isToday = dateStr === today;

            // Vérifier si un des créneaux du jour est sélectionné
            const hasSelectedSlot = daySlots.some((s) =>
              localSelectedIds.includes(s._id)
            );

            // Vérifier si le jour respecte l'intervalle
            const respectsInterval = checkInterval(
              selectedDates,
              dateStr,
              sessionInterval
            );

            return (
              <div
                key={dateStr}
                className={cn(
                  "min-h-[60px] p-1 rounded-lg transition-colors",
                  isCurrentMonth ? "bg-white" : "bg-gray-100/50",
                  isPast && "opacity-50",
                  isToday && "ring-2 ring-primary/50"
                )}
              >
                <div
                  className={cn(
                    "text-xs font-medium mb-1",
                    isCurrentMonth ? "text-gray-700" : "text-gray-400"
                  )}
                >
                  {date.getDate()}
                </div>

                {/* Créneaux du jour */}
                {!isPast && isCurrentMonth && (
                  <div className="space-y-1">
                    {daySlots.slice(0, 2).map((slot) => {
                      const isSelected = localSelectedIds.includes(slot._id);
                      const canSelect =
                        isSelected ||
                        (localSelectedIds.length < numberOfSessions &&
                          (checkInterval(selectedDates, dateStr, sessionInterval) ||
                            localSelectedIds.length === 0));

                      return (
                        <button
                          key={slot._id}
                          onClick={() => canSelect && handleSlotSelect(slot._id)}
                          disabled={!canSelect}
                          className={cn(
                            "w-full text-xs px-1 py-1 rounded transition-all",
                            isSelected
                              ? "bg-primary text-white shadow-sm"
                              : canSelect
                              ? "bg-primary/10 text-primary hover:bg-primary/20"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span>{slot.startTime}</span>
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                        </button>
                      );
                    })}
                    {daySlots.length > 2 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{daySlots.length - 2}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  // Titre de la navigation
  const getNavigationTitle = () => {
    if (viewMode === "month") {
      return currentDate.toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
      });
    } else if (viewMode === "week") {
      const monday = weekDays[0];
      const sunday = weekDays[6];
      return `${formatDayNumber(monday.dateStr)} - ${formatDayNumber(sunday.dateStr)} ${currentDate.toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}`;
    } else {
      return formatDate(currentDateStr);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Choisissez vos créneaux
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Sélectionnez {numberOfSessions} créneau
            {numberOfSessions > 1 ? "x" : ""} avec au moins {sessionInterval} jour
            {sessionInterval > 1 ? "s" : ""} d'intervalle
          </p>
        </div>
        <div
          className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium",
            isComplete
              ? "bg-green-100 text-green-700"
              : "bg-amber-100 text-amber-700"
          )}
        >
          {localSelectedIds.length}/{numberOfSessions} sélectionné
          {localSelectedIds.length > 1 ? "s" : ""}
        </div>
      </div>

      {/* Message si intervalle requis */}
      {sessionInterval > 1 && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl text-sm text-blue-700">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            Les séances doivent être espacées d'au moins{" "}
            <strong>{sessionInterval} jours</strong>. Les créneaux trop proches
            de vos sélections seront grisés.
          </p>
        </div>
      )}

      {/* Sélecteur de vue */}
      <div className="flex items-center justify-center gap-1 p-1 bg-gray-100 rounded-xl">
        <button
          onClick={() => setViewMode("day")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
            viewMode === "day"
              ? "bg-white text-primary shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          <CalendarDays className="w-4 h-4" />
          Jour
        </button>
        <button
          onClick={() => setViewMode("week")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
            viewMode === "week"
              ? "bg-white text-primary shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          <CalendarRange className="w-4 h-4" />
          Semaine
        </button>
        <button
          onClick={() => setViewMode("month")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
            viewMode === "month"
              ? "bg-white text-primary shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          <LayoutGrid className="w-4 h-4" />
          Mois
        </button>
      </div>

      {/* Calendrier */}
      <div className="bg-gray-50 rounded-2xl p-4">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={navigatePrev}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <h4 className="text-lg font-semibold text-gray-900 capitalize">
              {getNavigationTitle()}
            </h4>
            <button
              onClick={goToToday}
              className="px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              Aujourd'hui
            </button>
          </div>
          <button
            onClick={navigateNext}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Contenu selon la vue */}
        {viewMode === "day" && renderDayView()}
        {viewMode === "week" && renderWeekView()}
        {viewMode === "month" && renderMonthView()}
      </div>

      {/* Liste des créneaux sélectionnés */}
      {localSelectedIds.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900 text-sm">
            Séances sélectionnées
          </h4>
          <div className="grid gap-2">
            {localSelectedIds.map((slotId, index) => {
              const slot = availableSlots.find((s: CollectiveSlot) => s._id === slotId);
              if (!slot) return null;

              return (
                <motion.div
                  key={slotId}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {formatDateShort(slot.date)}
                      </p>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {slot.startTime} - {slot.endTime}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSlotSelect(slotId)}
                    className="text-sm text-red-500 hover:text-red-700 hover:underline"
                  >
                    Retirer
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Message si pas assez de créneaux */}
      {availableSlots.length < numberOfSessions && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl text-sm text-amber-700">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            Il n'y a que {availableSlots.length} créneau
            {availableSlots.length > 1 ? "x" : ""} disponible
            {availableSlots.length > 1 ? "s" : ""}, mais la formule en requiert{" "}
            {numberOfSessions}. Contactez l'annonceur pour plus de créneaux.
          </p>
        </div>
      )}

      {/* Légende */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-primary/20" />
          <span>Disponible</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-primary" />
          <span>Sélectionné</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gray-200" />
          <span>Intervalle non respecté</span>
        </div>
      </div>
    </div>
  );
}
