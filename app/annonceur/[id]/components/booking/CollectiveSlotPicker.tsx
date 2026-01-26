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
  ArrowLeft,
  Repeat,
  Sparkles,
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

// Formater la date complète
const formatDateFull = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
};

// Formater le jour de la semaine court
const formatWeekday = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
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

// Générer plusieurs semaines à partir d'une date
const getWeeksFromDate = (startDate: Date, weeksCount: number = 4): { date: Date; dateStr: string }[][] => {
  const weeks = [];
  const monday = getMonday(startDate);

  for (let w = 0; w < weeksCount; w++) {
    const weekMonday = new Date(monday);
    weekMonday.setDate(monday.getDate() + (w * 7));
    weeks.push(getWeekDays(weekMonday));
  }

  return weeks;
};

// Obtenir le jour de la semaine (0 = dimanche, 1 = lundi, etc.)
const getDayOfWeek = (dateStr: string): number => {
  return new Date(dateStr).getDay();
};

// Obtenir le nom du jour de la semaine
const getDayName = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString("fr-FR", { weekday: "long" });
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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedSlotIds);
  const [selectedDay, setSelectedDay] = useState<string | null>(null); // Pour la vue horaire
  const [showAutoFillSuggestion, setShowAutoFillSuggestion] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false); // État replié quand tous les créneaux sont sélectionnés

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
    map.forEach((slots) => {
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

  // Générer 4 semaines à partir de la date courante
  const weeks = useMemo(() => {
    return getWeeksFromDate(currentDate, 4);
  }, [currentDate]);

  const today = new Date().toISOString().split("T")[0];

  // Navigation
  const navigatePrev = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 28); // 4 semaines
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 28); // 4 semaines
    setCurrentDate(newDate);
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

  // Auto-collapse when all slots are selected
  useEffect(() => {
    if (isComplete && localSelectedIds.length > 0) {
      // Petit délai pour laisser voir la sélection avant de replier
      const timer = setTimeout(() => {
        setIsCollapsed(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isComplete, localSelectedIds.length]);

  // Récupérer les détails des créneaux sélectionnés pour le résumé
  const selectedSlotsDetails = useMemo(() => {
    return localSelectedIds
      .map((id) => availableSlots.find((s: CollectiveSlot) => s._id === id))
      .filter((s): s is CollectiveSlot => s !== undefined)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [localSelectedIds, availableSlots]);

  // Trouver les créneaux correspondants pour l'auto-fill (même jour de semaine, même heure)
  const findMatchingSlots = useMemo(() => {
    if (localSelectedIds.length !== 1) return [];

    const firstSlot = availableSlots.find((s: CollectiveSlot) => s._id === localSelectedIds[0]);
    if (!firstSlot) return [];

    const targetDayOfWeek = getDayOfWeek(firstSlot.date);
    const targetTime = firstSlot.startTime;

    // Trouver tous les créneaux au même jour de semaine et même heure
    const matchingSlots = availableSlots
      .filter((slot: CollectiveSlot) => {
        if (slot._id === firstSlot._id) return false; // Exclure le premier
        if (slot.date < today) return false; // Exclure les dates passées
        if (getDayOfWeek(slot.date) !== targetDayOfWeek) return false;
        if (slot.startTime !== targetTime) return false;
        return true;
      })
      .sort((a: CollectiveSlot, b: CollectiveSlot) => a.date.localeCompare(b.date));

    // Sélectionner les créneaux en respectant l'intervalle
    const result: CollectiveSlot[] = [];
    let lastDate = firstSlot.date;

    for (const slot of matchingSlots) {
      if (result.length >= numberOfSessions - 1) break; // On a assez de créneaux

      const daysDiff = Math.abs(
        (new Date(slot.date).getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff >= sessionInterval) {
        result.push(slot);
        lastDate = slot.date;
      }
    }

    return result;
  }, [localSelectedIds, availableSlots, numberOfSessions, sessionInterval, today]);

  // Peut-on proposer l'auto-fill ?
  const canAutoFill = localSelectedIds.length === 1 &&
    findMatchingSlots.length >= numberOfSessions - 1 &&
    numberOfSessions > 1;

  // Appliquer l'auto-fill
  const applyAutoFill = () => {
    if (!canAutoFill) return;

    const slotsToSelect = findMatchingSlots.slice(0, numberOfSessions - 1);
    const newIds = [...localSelectedIds, ...slotsToSelect.map((s) => s._id)];
    setLocalSelectedIds(newIds);
    onSlotsSelected(newIds);
    setShowAutoFillSuggestion(false);
    setSelectedDay(null); // Revenir au calendrier
  };

  // Afficher la suggestion après la première sélection
  useEffect(() => {
    if (canAutoFill && localSelectedIds.length === 1) {
      setShowAutoFillSuggestion(true);
    } else {
      setShowAutoFillSuggestion(false);
    }
  }, [canAutoFill, localSelectedIds.length]);

  // Infos sur le premier créneau sélectionné pour l'auto-fill
  const firstSelectedSlot = localSelectedIds.length > 0
    ? availableSlots.find((s: CollectiveSlot) => s._id === localSelectedIds[0])
    : null;

  // Obtenir le titre de la période affichée
  const getPeriodTitle = () => {
    if (weeks.length === 0) return "";
    const firstDay = weeks[0][0];
    const lastDay = weeks[weeks.length - 1][6];

    const firstMonth = new Date(firstDay.dateStr).toLocaleDateString("fr-FR", { month: "short" });
    const lastMonth = new Date(lastDay.dateStr).toLocaleDateString("fr-FR", { month: "short", year: "numeric" });

    if (firstMonth === lastMonth.split(" ")[0]) {
      return `${formatDayNumber(firstDay.dateStr)} - ${formatDayNumber(lastDay.dateStr)} ${lastMonth}`;
    }
    return `${formatDayNumber(firstDay.dateStr)} ${firstMonth} - ${formatDayNumber(lastDay.dateStr)} ${lastMonth}`;
  };

  // Vérifier si on a sélectionné un créneau pour ce jour
  const hasSelectedSlotForDay = (day: string) => {
    const daySlots = slotsByDate.get(day) || [];
    return daySlots.some((s) => localSelectedIds.includes(s._id));
  };

  // Rendu de la vue horaire pour un jour spécifique
  const renderTimeView = () => {
    if (!selectedDay) return null;

    const daySlots = slotsByDate.get(selectedDay) || [];
    const isPast = selectedDay < today;
    const hasSelectedThisDay = hasSelectedSlotForDay(selectedDay);
    const needsMoreSlots = localSelectedIds.length < numberOfSessions;

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-4"
      >
        {/* Header avec flèche retour */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedDay(null)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-gray-900 capitalize">
              {formatDateFull(selectedDay)}
            </h4>
            <p className="text-sm text-gray-500">
              {daySlots.length} créneau{daySlots.length > 1 ? "x" : ""} disponible{daySlots.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {isPast ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Cette date est passée</p>
          </div>
        ) : daySlots.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucun créneau disponible ce jour</p>
          </div>
        ) : (
          <div className="grid gap-2 max-h-[280px] overflow-y-auto">
            {daySlots.map((slot) => {
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
                    "w-full p-4 rounded-xl border-2 transition-all text-left",
                    isSelected
                      ? "bg-primary/10 border-primary"
                      : canSelect
                      ? "bg-white border-gray-200 hover:border-primary/50 hover:bg-gray-50"
                      : "bg-gray-50 border-gray-100 cursor-not-allowed opacity-60"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        isSelected ? "bg-primary/20" : "bg-gray-100"
                      )}>
                        <Clock className={cn(
                          "w-5 h-5",
                          isSelected ? "text-primary" : "text-gray-500"
                        )} />
                      </div>
                      <div>
                        <p className={cn(
                          "font-semibold text-lg",
                          isSelected ? "text-primary" : "text-gray-900"
                        )}>
                          {slot.startTime} - {slot.endTime}
                        </p>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Users className="w-4 h-4" />
                          <span>{slot.availableSpots} place{slot.availableSpots > 1 ? "s" : ""} disponible{slot.availableSpots > 1 ? "s" : ""}</span>
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Suggestion d'auto-remplissage */}
        {showAutoFillSuggestion && canAutoFill && firstSelectedSlot && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-gradient-to-r from-secondary/10 to-primary/10 border-2 border-secondary/30 rounded-xl"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-secondary/20 rounded-lg flex-shrink-0">
                <Sparkles className="w-5 h-5 text-secondary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 mb-1">
                  Réserver les mêmes créneaux ?
                </p>
                <p className="text-sm text-gray-600 mb-3">
                  Voulez-vous réserver les {numberOfSessions} séances tous les{" "}
                  <strong className="capitalize">{getDayName(firstSelectedSlot.date)}s</strong> à{" "}
                  <strong>{firstSelectedSlot.startTime}</strong> ?
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={applyAutoFill}
                    className="flex-1 sm:flex-none px-4 py-2 bg-secondary text-white font-medium rounded-lg hover:bg-secondary/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <Repeat className="w-4 h-4" />
                    Oui, réserver automatiquement
                  </button>
                  <button
                    onClick={() => {
                      setShowAutoFillSuggestion(false);
                      setSelectedDay(null);
                    }}
                    className="flex-1 sm:flex-none px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Non, choisir manuellement
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Bouton pour sélectionner le créneau suivant (quand auto-fill n'est pas disponible ou refusé) */}
        {hasSelectedThisDay && needsMoreSlots && !showAutoFillSuggestion && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-2"
          >
            <button
              onClick={() => setSelectedDay(null)}
              className="w-full py-3 px-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              <Calendar className="w-5 h-5" />
              Sélectionner la séance {localSelectedIds.length + 1}/{numberOfSessions}
            </button>
            <p className="text-xs text-center text-gray-500 mt-2">
              Choisissez un autre jour pour votre prochaine séance
            </p>
          </motion.div>
        )}
      </motion.div>
    );
  };

  // Rendu de la vue calendrier
  const renderCalendarView = () => {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="space-y-3"
      >
        {/* Navigation */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={navigatePrev}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <h4 className="text-base font-semibold text-gray-900">
              {getPeriodTitle()}
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

        {/* En-têtes des jours de la semaine */}
        <div className="grid grid-cols-7 gap-1">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-gray-500 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grille des semaines */}
        <div className="space-y-1">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-1">
              {week.map(({ dateStr }) => {
                const isPast = dateStr < today;
                const isToday = dateStr === today;
                const hasSlots = slotsByDate.has(dateStr) && !isPast;
                const daySlots = slotsByDate.get(dateStr) || [];
                const slotsCount = daySlots.length;
                const hasSelectedSlot = daySlots.some((s) => localSelectedIds.includes(s._id));
                const canSelectDay = hasSlots && (
                  hasSelectedSlot ||
                  localSelectedIds.length < numberOfSessions &&
                  (checkInterval(selectedDates, dateStr, sessionInterval) || localSelectedIds.length === 0)
                );

                return (
                  <button
                    key={dateStr}
                    onClick={() => hasSlots && setSelectedDay(dateStr)}
                    disabled={!hasSlots}
                    className={cn(
                      "relative aspect-square flex flex-col items-center justify-center rounded-xl transition-all",
                      isPast && "opacity-40 cursor-not-allowed",
                      isToday && "ring-2 ring-primary/50",
                      hasSlots && !isPast && "hover:bg-primary/10 cursor-pointer",
                      hasSelectedSlot && "bg-primary/15",
                      !hasSlots && !isPast && "text-gray-400"
                    )}
                  >
                    <span className={cn(
                      "text-sm font-medium",
                      isToday && "text-primary font-bold",
                      hasSelectedSlot && "text-primary"
                    )}>
                      {formatDayNumber(dateStr)}
                    </span>

                    {/* Indicateur de créneaux disponibles */}
                    {hasSlots && !isPast && (
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {hasSelectedSlot ? (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        ) : canSelectDay ? (
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-gray-300" />
                        )}
                        {slotsCount > 1 && (
                          <span className="text-[10px] text-gray-500">+{slotsCount - 1}</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Légende */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span>Disponible</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span>Sélectionné</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
            <span>Intervalle non respecté</span>
          </div>
        </div>
      </motion.div>
    );
  };

  // Vue repliée avec résumé des séances sélectionnées
  const renderCollapsedView = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      {/* Header avec bouton modifier */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-green-100 rounded-lg">
            <Check className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {numberOfSessions} séance{numberOfSessions > 1 ? "s" : ""} sélectionnée{numberOfSessions > 1 ? "s" : ""}
            </h3>
            <p className="text-sm text-gray-500">
              Créneaux confirmés
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsCollapsed(false)}
          className="px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
        >
          Modifier
        </button>
      </div>

      {/* Liste des séances */}
      <div className="flex flex-wrap gap-2">
        {selectedSlotsDetails.map((slot) => {
          const date = new Date(slot.date);
          const dayName = date.toLocaleDateString("fr-FR", { weekday: "short" });
          const dayNum = date.getDate();
          const month = date.toLocaleDateString("fr-FR", { month: "short" });
          return (
            <div
              key={slot._id}
              className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-sm"
            >
              <Calendar className="w-4 h-4 text-green-600" />
              <span className="font-medium text-gray-900 capitalize">
                {dayName} {dayNum} {month}
              </span>
              <span className="text-gray-500">
                {slot.startTime} - {slot.endTime}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Vue repliée si tous les créneaux sont sélectionnés */}
      {isCollapsed && isComplete ? (
        renderCollapsedView()
      ) : (
        <>
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

          {/* Calendrier ou vue horaire */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <AnimatePresence mode="wait">
              {selectedDay ? renderTimeView() : renderCalendarView()}
            </AnimatePresence>
          </div>

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
        </>
      )}
    </div>
  );
}
