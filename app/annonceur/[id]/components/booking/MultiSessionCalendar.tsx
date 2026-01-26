"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  ArrowLeft,
  Repeat,
  Sparkles,
  AlertCircle,
  X,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import type { CalendarEntry } from "./types";
import MobileTimePicker from "./MobileTimePicker";

export interface SelectedSession {
  date: string;
  startTime: string;
  endTime: string;
}

interface MultiSessionCalendarProps {
  numberOfSessions: number;
  sessionInterval: number; // En jours minimum entre les séances
  selectedSessions: SelectedSession[];
  onSessionsChange: (sessions: SelectedSession[]) => void;
  calendarMonth: Date;
  availabilityCalendar: CalendarEntry[] | undefined;
  variantDuration: number; // Durée de la formule en minutes
  bufferBefore?: number;
  bufferAfter?: number;
  acceptReservationsFrom?: string;
  acceptReservationsTo?: string;
  onMonthChange: (date: Date) => void;
  className?: string;
}

// Helper functions
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function generateTimeSlots(startTime: string, endTime: string, intervalMinutes: number = 30): string[] {
  const slots: string[] = [];
  let currentMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  while (currentMinutes <= endMinutes) {
    slots.push(minutesToTime(currentMinutes));
    currentMinutes += intervalMinutes;
  }

  return slots;
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

// Formater la date courte
const formatDateShort = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
};

// Obtenir le jour de la semaine (0 = dimanche, 1 = lundi, etc.)
const getDayOfWeek = (dateStr: string): number => {
  return new Date(dateStr).getDay();
};

// Obtenir le nom du jour de la semaine
const getDayName = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString("fr-FR", { weekday: "long" });
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

// Générer plusieurs semaines à partir d'une date
const getWeeksFromDate = (startDate: Date, weeksCount: number = 4): { date: Date; dateStr: string }[][] => {
  const weeks: { date: Date; dateStr: string }[][] = [];
  const monday = getMonday(startDate);

  for (let w = 0; w < weeksCount; w++) {
    const weekMonday = new Date(monday);
    weekMonday.setDate(monday.getDate() + (w * 7));
    weeks.push(getWeekDays(weekMonday));
  }

  return weeks;
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

export default function MultiSessionCalendar({
  numberOfSessions,
  sessionInterval,
  selectedSessions,
  onSessionsChange,
  calendarMonth,
  availabilityCalendar,
  variantDuration,
  bufferBefore = 0,
  bufferAfter = 0,
  acceptReservationsFrom = "08:00",
  acceptReservationsTo = "20:00",
  onMonthChange,
  className,
}: MultiSessionCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showAutoFillSuggestion, setShowAutoFillSuggestion] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showMobileTimePicker, setShowMobileTimePicker] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  // Dates des séances sélectionnées
  const selectedDates = useMemo(() => {
    return selectedSessions.map((s) => s.date);
  }, [selectedSessions]);

  // Générer 4 semaines à partir du mois courant
  const weeks = useMemo(() => {
    return getWeeksFromDate(calendarMonth, 4);
  }, [calendarMonth]);

  // Générer les créneaux horaires
  const timeSlots = useMemo(() => {
    return generateTimeSlots(acceptReservationsFrom, acceptReservationsTo, 30);
  }, [acceptReservationsFrom, acceptReservationsTo]);

  // Calculer l'heure de fin basée sur la durée
  const calculateEndTime = (startTime: string): string => {
    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = startMinutes + variantDuration;
    return minutesToTime(endMinutes);
  };

  // Navigation
  const navigatePrev = () => {
    const newDate = new Date(calendarMonth);
    newDate.setDate(calendarMonth.getDate() - 28);
    onMonthChange(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(calendarMonth);
    newDate.setDate(calendarMonth.getDate() + 28);
    onMonthChange(newDate);
  };

  const goToToday = () => {
    onMonthChange(new Date());
  };

  // Vérifier si un créneau horaire est disponible
  const isTimeSlotAvailable = (dateStr: string, startTime: string): boolean => {
    const availability = availabilityCalendar?.find((a) => a.date === dateStr);
    if (!availability) return true;
    if (availability.status === "unavailable") return false;

    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = startMinutes + variantDuration;
    const bookedSlots = availability.bookedSlots || [];
    const availableTimeSlots = availability.timeSlots;

    // Vérifier si dans les créneaux disponibles (si partial)
    if (availableTimeSlots && availableTimeSlots.length > 0) {
      const isInAvailableSlot = availableTimeSlots.some((slot) => {
        const slotStart = parseTimeToMinutes(slot.startTime);
        const slotEnd = parseTimeToMinutes(slot.endTime);
        return startMinutes >= slotStart && endMinutes <= slotEnd;
      });
      if (!isInAvailableSlot) return false;
    }

    // Vérifier les conflits avec les créneaux réservés
    const hasConflict = bookedSlots.some((booked) => {
      const bookedStart = parseTimeToMinutes(booked.startTime);
      const bookedEnd = parseTimeToMinutes(booked.endTime);
      return startMinutes < bookedEnd && endMinutes > bookedStart;
    });

    return !hasConflict;
  };

  // Vérifier si un jour a des disponibilités
  const isDayAvailable = (dateStr: string): boolean => {
    if (dateStr < today) return false;
    const availability = availabilityCalendar?.find((a) => a.date === dateStr);
    if (!availability) return true;
    return availability.status !== "unavailable";
  };

  // Obtenir le statut de disponibilité d'un jour (pour les indicateurs colorés)
  const getDayAvailabilityStatus = (dateStr: string): "available" | "partial" | "unavailable" | "past" => {
    if (dateStr < today) return "past";
    const availability = availabilityCalendar?.find((a) => a.date === dateStr);
    if (!availability) return "available";
    // Cast explicite car le type CalendarEntry.status est déjà bien typé
    const status = availability.status as "available" | "partial" | "unavailable" | "past";
    return status;
  };

  // Vérifier s'il reste des créneaux libres sur un jour
  const hasAvailableSlots = (dateStr: string): boolean => {
    const availability = availabilityCalendar?.find((a) => a.date === dateStr);
    if (!availability) return true;
    if (availability.status === "unavailable") return false;

    // Vérifier s'il y a au moins un créneau disponible
    const bookedSlots = availability.bookedSlots || [];
    if (bookedSlots.length === 0) return true;

    // Vérifier si tous les créneaux de la journée sont bloqués
    const startMinutes = parseTimeToMinutes(acceptReservationsFrom);
    const endMinutes = parseTimeToMinutes(acceptReservationsTo);
    const totalMinutes = endMinutes - startMinutes;

    // Calculer le temps total bloqué
    let blockedMinutes = 0;
    for (const slot of bookedSlots) {
      const slotStart = parseTimeToMinutes(slot.startTime);
      const slotEnd = parseTimeToMinutes(slot.endTime);
      blockedMinutes += Math.min(slotEnd, endMinutes) - Math.max(slotStart, startMinutes);
    }

    // S'il reste au moins la durée d'une séance, il y a de la place
    return (totalMinutes - blockedMinutes) >= variantDuration;
  };

  // Gérer la sélection d'un créneau horaire
  const handleTimeSelect = (startTime: string) => {
    if (!selectedDay) return;

    const endTime = calculateEndTime(startTime);
    const newSession: SelectedSession = {
      date: selectedDay,
      startTime,
      endTime,
    };

    // Vérifier si ce jour est déjà sélectionné
    const existingIndex = selectedSessions.findIndex((s) => s.date === selectedDay);

    if (existingIndex >= 0) {
      // Mettre à jour la séance existante
      const newSessions = [...selectedSessions];
      newSessions[existingIndex] = newSession;
      onSessionsChange(newSessions);
    } else {
      // Vérifier si on peut encore ajouter
      if (selectedSessions.length >= numberOfSessions) {
        return;
      }
      // Vérifier l'intervalle
      if (!checkInterval(selectedDates, selectedDay, sessionInterval)) {
        alert(`L'intervalle minimum entre les séances est de ${sessionInterval} jour(s).`);
        return;
      }
      // Ajouter la nouvelle séance
      onSessionsChange([...selectedSessions, newSession]);
    }
  };

  // Supprimer une séance
  const removeSession = (date: string) => {
    onSessionsChange(selectedSessions.filter((s) => s.date !== date));
    setIsCollapsed(false);
  };

  // Obtenir le titre de la période affichée
  const getPeriodTitle = () => {
    if (weeks.length === 0) return "";
    const firstDay = weeks[0][0];
    const lastDay = weeks[weeks.length - 1][6];

    const firstMonth = new Date(firstDay.dateStr).toLocaleDateString("fr-FR", { month: "short" });
    const lastMonth = new Date(lastDay.dateStr).toLocaleDateString("fr-FR", { month: "short", year: "numeric" });

    return `${new Date(firstDay.dateStr).getDate()} ${firstMonth} - ${new Date(lastDay.dateStr).getDate()} ${lastMonth}`;
  };

  // Vérifier si on a sélectionné un créneau pour ce jour
  const hasSelectedSessionForDay = (day: string) => {
    return selectedSessions.some((s) => s.date === day);
  };

  // Obtenir la séance sélectionnée pour ce jour
  const getSessionForDay = (day: string) => {
    return selectedSessions.find((s) => s.date === day);
  };

  const isComplete = selectedSessions.length === numberOfSessions;

  // Auto-collapse when complete
  useEffect(() => {
    if (isComplete && selectedSessions.length > 0) {
      const timer = setTimeout(() => {
        setIsCollapsed(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isComplete, selectedSessions.length]);

  // Trouver les jours correspondants pour l'auto-fill (même jour de semaine)
  const findMatchingDays = useMemo(() => {
    if (selectedSessions.length !== 1) return [];

    const firstSession = selectedSessions[0];
    const targetDayOfWeek = getDayOfWeek(firstSession.date);
    const targetTime = firstSession.startTime;

    // Parcourir toutes les semaines et trouver les jours correspondants
    const matchingDays: { dateStr: string; available: boolean }[] = [];
    let lastDate = firstSession.date;

    for (const week of weeks) {
      for (const day of week) {
        if (day.dateStr === firstSession.date) continue;
        if (day.dateStr < today) continue;
        if (getDayOfWeek(day.dateStr) !== targetDayOfWeek) continue;

        // Vérifier l'intervalle
        const daysDiff = Math.abs(
          (new Date(day.dateStr).getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff >= sessionInterval) {
          const available = isDayAvailable(day.dateStr) && isTimeSlotAvailable(day.dateStr, targetTime);
          if (available) {
            matchingDays.push({ dateStr: day.dateStr, available });
            lastDate = day.dateStr;
          }
        }
      }
    }

    return matchingDays.slice(0, numberOfSessions - 1);
  }, [selectedSessions, weeks, numberOfSessions, sessionInterval, today]);

  const canAutoFill = selectedSessions.length === 1 &&
    findMatchingDays.length >= numberOfSessions - 1 &&
    numberOfSessions > 1;

  // Appliquer l'auto-fill
  const applyAutoFill = () => {
    if (!canAutoFill || selectedSessions.length !== 1) return;

    const firstSession = selectedSessions[0];
    const newSessions: SelectedSession[] = [firstSession];

    for (let i = 0; i < numberOfSessions - 1; i++) {
      const matchingDay = findMatchingDays[i];
      if (matchingDay) {
        newSessions.push({
          date: matchingDay.dateStr,
          startTime: firstSession.startTime,
          endTime: firstSession.endTime,
        });
      }
    }

    onSessionsChange(newSessions);
    setShowAutoFillSuggestion(false);
    setSelectedDay(null);
  };

  // Afficher la suggestion après la première sélection
  useEffect(() => {
    if (canAutoFill && selectedSessions.length === 1) {
      setShowAutoFillSuggestion(true);
    } else {
      setShowAutoFillSuggestion(false);
    }
  }, [canAutoFill, selectedSessions.length]);

  // Vue horaire pour un jour spécifique
  const renderTimeView = () => {
    if (!selectedDay) return null;

    const isPast = selectedDay < today;
    const availability = availabilityCalendar?.find((a) => a.date === selectedDay);
    const hasSelectedSession = hasSelectedSessionForDay(selectedDay);
    const currentSession = getSessionForDay(selectedDay);
    const needsMoreSlots = selectedSessions.length < numberOfSessions;

    // Filtrer les créneaux disponibles
    const availableSlots = timeSlots.filter((time) => {
      const endTime = calculateEndTime(time);
      const endMinutes = parseTimeToMinutes(endTime);
      const maxMinutes = parseTimeToMinutes(acceptReservationsTo);
      if (endMinutes > maxMinutes) return false;
      return isTimeSlotAvailable(selectedDay, time);
    });

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
              {availableSlots.length} créneau{availableSlots.length > 1 ? "x" : ""} disponible{availableSlots.length > 1 ? "s" : ""}
            </p>
          </div>
          {hasSelectedSession && (
            <button
              onClick={() => removeSession(selectedDay)}
              className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-500"
              title="Supprimer cette séance"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {isPast ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Cette date est passée</p>
          </div>
        ) : availability?.status === "unavailable" ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Ce jour est indisponible</p>
          </div>
        ) : availableSlots.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucun créneau disponible ce jour</p>
          </div>
        ) : (
          <>
            {/* Info durée */}
            <div className="p-3 bg-blue-50 rounded-xl text-sm text-blue-700 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Durée de la séance : {variantDuration >= 60
                ? `${Math.floor(variantDuration / 60)}h${variantDuration % 60 > 0 ? variantDuration % 60 : ""}`
                : `${variantDuration}min`}
              </span>
            </div>

            {/* Grille des créneaux */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[280px] overflow-y-auto">
              {availableSlots.map((time) => {
                const endTime = calculateEndTime(time);
                const isSelected = currentSession?.startTime === time;

                return (
                  <button
                    key={time}
                    onClick={() => handleTimeSelect(time)}
                    className={cn(
                      "p-3 rounded-xl border-2 transition-all text-center",
                      isSelected
                        ? "bg-primary/10 border-primary"
                        : "bg-white border-gray-200 hover:border-primary/50 hover:bg-gray-50"
                    )}
                  >
                    <p className={cn(
                      "font-semibold",
                      isSelected ? "text-primary" : "text-gray-900"
                    )}>
                      {time}
                    </p>
                    <p className="text-xs text-gray-500">
                      → {endTime}
                    </p>
                    {isSelected && (
                      <Check className="w-4 h-4 text-primary mx-auto mt-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Suggestion d'auto-remplissage */}
        {showAutoFillSuggestion && canAutoFill && selectedSessions.length === 1 && (
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
                  <strong className="capitalize">{getDayName(selectedSessions[0].date)}s</strong> à{" "}
                  <strong>{selectedSessions[0].startTime}</strong> ?
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

        {/* Bouton pour sélectionner la séance suivante */}
        {hasSelectedSession && needsMoreSlots && !showAutoFillSuggestion && (
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
              Sélectionner la séance {selectedSessions.length + 1}/{numberOfSessions}
            </button>
            <p className="text-xs text-center text-gray-500 mt-2">
              Choisissez un autre jour pour votre prochaine séance
            </p>
          </motion.div>
        )}
      </motion.div>
    );
  };

  // Vue calendrier
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

        {/* En-têtes des jours */}
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
                const dayAvailable = isDayAvailable(dateStr);
                const hasSelected = hasSelectedSessionForDay(dateStr);
                const session = getSessionForDay(dateStr);
                const canSelectDay = !isPast && dayAvailable && (
                  hasSelected ||
                  (selectedSessions.length < numberOfSessions &&
                    (checkInterval(selectedDates, dateStr, sessionInterval) || selectedSessions.length === 0))
                );

                // Déterminer le statut pour l'indicateur coloré
                const availabilityStatus = getDayAvailabilityStatus(dateStr);
                const hasFreeSlots = hasAvailableSlots(dateStr);

                // Déterminer la couleur de l'indicateur
                const getIndicatorColor = () => {
                  if (isPast) return null;
                  if (hasSelected) return "bg-primary";
                  if (availabilityStatus === "unavailable" || !hasFreeSlots) return "bg-red-500";
                  if (availabilityStatus === "partial") return "bg-amber-500";
                  if (!canSelectDay) return "bg-gray-300";
                  return "bg-green-500";
                };

                const indicatorColor = getIndicatorColor();

                return (
                  <button
                    key={dateStr}
                    onClick={() => dayAvailable && !isPast && hasFreeSlots && setSelectedDay(dateStr)}
                    disabled={isPast || !dayAvailable || !hasFreeSlots}
                    className={cn(
                      "relative aspect-square flex flex-col items-center justify-center rounded-xl transition-all",
                      isPast && "opacity-40 cursor-not-allowed",
                      isToday && "ring-2 ring-primary/50",
                      dayAvailable && hasFreeSlots && !isPast && "hover:bg-primary/10 cursor-pointer",
                      hasSelected && "bg-primary/15",
                      (!dayAvailable || !hasFreeSlots) && !isPast && "text-gray-400 bg-gray-50 cursor-not-allowed"
                    )}
                  >
                    <span className={cn(
                      "text-sm font-medium",
                      isToday && "text-primary font-bold",
                      hasSelected && "text-primary"
                    )}>
                      {new Date(dateStr).getDate()}
                    </span>

                    {/* Indicateur de disponibilité ou séance sélectionnée */}
                    {hasSelected ? (
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-[9px] text-primary font-medium">
                          {session?.startTime}
                        </span>
                      </div>
                    ) : indicatorColor ? (
                      <div className={cn("w-2 h-2 rounded-full mt-0.5", indicatorColor)} />
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Légende */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span>Libre</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Partiel</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>Complet</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span>Sélectionné</span>
          </div>
        </div>
      </motion.div>
    );
  };

  // Vue repliée avec résumé
  const renderCollapsedView = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-green-100 rounded-lg">
            <Check className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {numberOfSessions} séance{numberOfSessions > 1 ? "s" : ""} sélectionnée{numberOfSessions > 1 ? "s" : ""}
            </h3>
            <p className="text-sm text-gray-500">Créneaux confirmés</p>
          </div>
        </div>
        <button
          onClick={() => setIsCollapsed(false)}
          className="px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
        >
          Modifier
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {selectedSessions
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((session, index) => (
            <div
              key={session.date}
              className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-sm"
            >
              <span className="w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-medium">
                {index + 1}
              </span>
              <Calendar className="w-4 h-4 text-green-600" />
              <span className="font-medium text-gray-900 capitalize">
                {formatDateShort(session.date)}
              </span>
              <span className="text-gray-500">
                {session.startTime} - {session.endTime}
              </span>
            </div>
          ))}
      </div>
    </motion.div>
  );

  return (
    <div className={cn("bg-white rounded-2xl p-5 border border-gray-100", className)}>
      {/* Vue repliée si toutes les séances sont sélectionnées */}
      {isCollapsed && isComplete ? (
        renderCollapsedView()
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="w-5 h-5 text-primary" />
                </span>
                Choisissez vos créneaux
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Sélectionnez {numberOfSessions} créneau{numberOfSessions > 1 ? "x" : ""}
                {sessionInterval > 0 && ` avec au moins ${sessionInterval} jour${sessionInterval > 1 ? "s" : ""} d'intervalle`}
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
              {selectedSessions.length}/{numberOfSessions} sélectionné{selectedSessions.length > 1 ? "s" : ""}
            </div>
          </div>

          {/* Message si intervalle requis */}
          {sessionInterval > 0 && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl text-sm text-blue-700 mb-4">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>
                Les séances doivent être espacées d'au moins{" "}
                <strong>{sessionInterval} jour{sessionInterval > 1 ? "s" : ""}</strong>.
                Les créneaux trop proches de vos sélections seront grisés.
              </p>
            </div>
          )}

          {/* Calendrier ou vue horaire */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <AnimatePresence mode="wait">
              {selectedDay ? renderTimeView() : renderCalendarView()}
            </AnimatePresence>
          </div>

          {/* Liste des séances sélectionnées */}
          {selectedSessions.length > 0 && !isComplete && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Séances sélectionnées :
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedSessions
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((session, index) => (
                    <div
                      key={session.date}
                      className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-xl text-sm group"
                    >
                      <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center font-medium">
                        {index + 1}
                      </span>
                      <span className="font-medium text-gray-900 capitalize">
                        {formatDateShort(session.date)}
                      </span>
                      <span className="text-gray-600">
                        {session.startTime}
                      </span>
                      <button
                        onClick={() => removeSession(session.date)}
                        className="p-1 hover:bg-red-100 rounded-full text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
