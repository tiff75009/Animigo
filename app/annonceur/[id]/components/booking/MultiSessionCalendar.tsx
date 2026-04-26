"use client";

import { useState, useMemo, useEffect, memo } from "react";
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

// Délai minimum de réservation (en heures) - 24h avant le début
const MIN_BOOKING_LEAD_TIME_HOURS = 24;

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

// Vérifier si un créneau est réservable (pas passé + délai minimum)
function isSlotBookable(dateStr: string, startTime: string): boolean {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // Date passée = non réservable
  if (dateStr < todayStr) return false;

  // Date future = réservable
  if (dateStr > todayStr) return true;

  // Date = aujourd'hui : vérifier l'heure avec délai minimum
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const slotMinutes = parseTimeToMinutes(startTime);
  const minBookableMinutes = currentMinutes + (MIN_BOOKING_LEAD_TIME_HOURS * 60);

  return slotMinutes >= minBookableMinutes;
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

export default memo(function MultiSessionCalendar({
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

  // Vue d'affichage : "list" (sélection rapide en liste) ou "calendar" (vue calendrier)
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  // Filtres optionnels pour la vue liste
  const [filterDayOfWeek, setFilterDayOfWeek] = useState<number | null>(null); // 0=dim … 6=sam
  const [weeksToShow, setWeeksToShow] = useState(4);

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
    // Vérifier d'abord si le créneau est réservable (pas passé + délai minimum 24h)
    if (!isSlotBookable(dateStr, startTime)) {
      return false;
    }

    // Si les données ne sont pas chargées, bloquer la sélection
    if (!availabilityCalendar) return false;
    const availability = availabilityCalendar.find((a) => a.date === dateStr);
    // Si pas d'entrée pour cette date, considérer comme indisponible
    if (!availability) return false;
    if (availability.status === "unavailable") return false;

    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = startMinutes + variantDuration;

    // IMPORTANT: Appliquer les buffers au NOUVEAU créneau aussi
    // Les bookedSlots du backend incluent déjà les buffers, donc pour une comparaison équitable,
    // on doit aussi appliquer les buffers au créneau qu'on vérifie
    const newSlotStartWithBuffer = Math.max(0, startMinutes - bufferBefore);
    const newSlotEndWithBuffer = endMinutes + bufferAfter;

    // Note: bookedSlots inclut déjà les créneaux collectifs ET les buffers sont déjà appliqués côté backend
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
    // Les bookedSlots du backend incluent DÉJÀ les buffers (temps de préparation)
    // On applique aussi les buffers au nouveau créneau pour une comparaison correcte
    const hasConflictWithBooked = bookedSlots.some((booked) => {
      const bookedStart = parseTimeToMinutes(booked.startTime);
      const bookedEnd = parseTimeToMinutes(booked.endTime);

      // Conflit si notre créneau (avec buffers) chevauche un créneau réservé (qui inclut déjà les buffers)
      return newSlotStartWithBuffer < bookedEnd && newSlotEndWithBuffer > bookedStart;
    });

    return !hasConflictWithBooked;
  };

  // Vérifier si un jour a des disponibilités
  const isDayAvailable = (dateStr: string): boolean => {
    if (dateStr < today) return false;
    // Si les données de calendrier ne sont pas encore chargées, bloquer la sélection
    if (!availabilityCalendar) return false;
    const availability = availabilityCalendar.find((a) => a.date === dateStr);
    // Si pas d'entrée pour cette date, considérer comme indisponible (pas comme disponible)
    if (!availability) return false;
    return availability.status !== "unavailable";
  };

  // Obtenir le statut de disponibilité d'un jour (pour les indicateurs colorés)
  const getDayAvailabilityStatus = (dateStr: string): "available" | "partial" | "unavailable" | "past" => {
    if (dateStr < today) return "past";
    // Si pas de données ou pas d'entrée, considérer comme indisponible
    if (!availabilityCalendar) return "unavailable";
    const availability = availabilityCalendar.find((a) => a.date === dateStr);
    if (!availability) return "unavailable";
    // Cast explicite car le type CalendarEntry.status est déjà bien typé
    const status = availability.status as "available" | "partial" | "unavailable" | "past";
    return status;
  };

  // Vérifier s'il reste des créneaux libres sur un jour
  const hasAvailableSlots = (dateStr: string): boolean => {
    // Si les données ne sont pas chargées, bloquer la sélection
    if (!availabilityCalendar) return false;
    const availability = availabilityCalendar.find((a) => a.date === dateStr);
    // Si pas d'entrée pour cette date, considérer comme sans créneaux libres
    if (!availability) return false;
    if (availability.status === "unavailable") return false;

    // Vérifier s'il y a au moins un créneau disponible
    const bookedSlots = availability.bookedSlots || [];
    if (bookedSlots.length === 0) return true;

    // Vérifier les créneaux disponibles (si partial)
    const availableTimeSlots = availability.timeSlots;

    // Tester chaque créneau horaire possible
    const slotInterval = 30; // Intervalle de 30 minutes
    const dayStart = parseTimeToMinutes(acceptReservationsFrom);
    const dayEnd = parseTimeToMinutes(acceptReservationsTo);

    for (let startMinutes = dayStart; startMinutes <= dayEnd - variantDuration; startMinutes += slotInterval) {
      const endMinutes = startMinutes + variantDuration;

      // IMPORTANT: Appliquer les buffers au nouveau créneau pour une comparaison correcte
      const newSlotStartWithBuffer = Math.max(0, startMinutes - bufferBefore);
      const newSlotEndWithBuffer = endMinutes + bufferAfter;

      // Vérifier si dans les créneaux disponibles (si partial)
      if (availableTimeSlots && availableTimeSlots.length > 0) {
        const isInAvailableSlot = availableTimeSlots.some((slot) => {
          const slotStart = parseTimeToMinutes(slot.startTime);
          const slotEnd = parseTimeToMinutes(slot.endTime);
          return startMinutes >= slotStart && endMinutes <= slotEnd;
        });
        if (!isInAvailableSlot) continue;
      }

      // Vérifier s'il y a conflit avec les créneaux réservés
      // Les bookedSlots incluent DÉJÀ les buffers côté backend
      // On applique aussi les buffers au nouveau créneau pour une comparaison correcte
      const hasConflict = bookedSlots.some((booked) => {
        const bookedStart = parseTimeToMinutes(booked.startTime);
        const bookedEnd = parseTimeToMinutes(booked.endTime);
        return newSlotStartWithBuffer < bookedEnd && newSlotEndWithBuffer > bookedStart;
      });

      // Si pas de conflit, le créneau est disponible
      if (!hasConflict) {
        // Vérifier aussi si c'est réservable (pas dans le passé)
        const time = minutesToTime(startMinutes);
        if (isSlotBookable(dateStr, time)) {
          return true;
        }
      }
    }

    return false;
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

    const existingIndex = selectedSessions.findIndex((s) => s.date === selectedDay);

    if (existingIndex >= 0) {
      // Modification de l'heure d'une séance existante
      const newSessions = [...selectedSessions];
      newSessions[existingIndex] = newSession;
      onSessionsChange(newSessions);
    } else {
      if (selectedSessions.length >= numberOfSessions) return;
      if (!checkInterval(selectedDates, selectedDay, sessionInterval)) {
        alert(`L'intervalle minimum entre les séances est de ${sessionInterval} jour(s).`);
        return;
      }
      // Ajouter la nouvelle séance — IMPORTANT : on ne ferme PAS la vue heure
      // (sinon l'utilisateur croit qu'il faut cliquer "Modifier" pour continuer)
      onSessionsChange([...selectedSessions, newSession]);
    }

    // S'assurer qu'on n'est pas en vue collapsed après une sélection
    setIsCollapsed(false);
    // La vue heure reste ouverte avec un récap visible.
    // L'utilisateur clique sur "Retour au calendrier" quand il veut un autre jour.
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

  // L'auto-collapse a été retiré pour ne pas masquer la sélection en cours.

  // ─── Génération de la liste plate de tous les créneaux disponibles ───
  // Pour chaque jour des N prochaines semaines, on liste tous les créneaux
  // horaires dispos. L'utilisateur peut cocher directement (1 clic = 1 séance).
  type AvailableSlot = {
    date: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    label: string; // ex. "lun. 27 avril · 09:00 → 11:00"
  };

  const availableSlots = useMemo<AvailableSlot[]>(() => {
    if (!availabilityCalendar) return [];
    const slots: AvailableSlot[] = [];
    // Étendre la fenêtre selon weeksToShow (4 par défaut, +4 sur demande)
    const fromDate = new Date(calendarMonth);
    fromDate.setHours(0, 0, 0, 0);

    // Toutes les dates de la fenêtre
    for (let d = 0; d < weeksToShow * 7; d++) {
      const cursor = new Date(fromDate);
      cursor.setDate(fromDate.getDate() + d);
      const dateStr = cursor.toISOString().split("T")[0];
      if (dateStr < today) continue;
      if (!isDayAvailable(dateStr)) continue;

      // Tester chaque créneau possible avec un step de 30 min
      const dayStart = parseTimeToMinutes(acceptReservationsFrom);
      const dayEnd = parseTimeToMinutes(acceptReservationsTo);
      for (let m = dayStart; m + variantDuration <= dayEnd; m += 30) {
        const time = minutesToTime(m);
        if (!isTimeSlotAvailable(dateStr, time)) continue;
        slots.push({
          date: dateStr,
          dayOfWeek: cursor.getDay(),
          startTime: time,
          endTime: minutesToTime(m + variantDuration),
          label: `${cursor.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} · ${time} → ${minutesToTime(m + variantDuration)}`,
        });
      }
    }
    return slots;
  }, [availabilityCalendar, calendarMonth, weeksToShow, today, variantDuration, acceptReservationsFrom, acceptReservationsTo]);

  // Filtrage par jour de la semaine
  const filteredSlots = useMemo(() => {
    if (filterDayOfWeek === null) return availableSlots;
    return availableSlots.filter((s) => s.dayOfWeek === filterDayOfWeek);
  }, [availableSlots, filterDayOfWeek]);

  // Vérifie si un créneau est sélectionné
  const isSlotSelected = (slot: AvailableSlot): boolean => {
    return selectedSessions.some(
      (s) => s.date === slot.date && s.startTime === slot.startTime
    );
  };

  // Toggle un créneau (ajoute ou retire)
  const toggleSlot = (slot: AvailableSlot) => {
    if (isSlotSelected(slot)) {
      // Retirer
      onSessionsChange(
        selectedSessions.filter(
          (s) => !(s.date === slot.date && s.startTime === slot.startTime)
        )
      );
      return;
    }
    // Vérifier qu'on peut encore ajouter
    if (selectedSessions.length >= numberOfSessions) return;
    // Vérifier l'intervalle minimum
    if (sessionInterval > 0) {
      const tooClose = selectedSessions.some((s) => {
        const diffDays = Math.abs(
          (new Date(slot.date).getTime() - new Date(s.date).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        return diffDays < sessionInterval && diffDays !== 0;
      });
      if (tooClose) {
        alert(
          `L'intervalle minimum entre 2 séances est de ${sessionInterval} jour${sessionInterval > 1 ? "s" : ""}.`
        );
        return;
      }
    }
    onSessionsChange([
      ...selectedSessions,
      { date: slot.date, startTime: slot.startTime, endTime: slot.endTime },
    ]);
  };

  // Sélection rapide : "Hebdo lundi 9h pendant N semaines"
  const quickSelectRecurring = (slot: AvailableSlot) => {
    const newSessions: SelectedSession[] = [];
    let cursor = new Date(slot.date);
    let safety = 0;
    while (newSessions.length < numberOfSessions && safety < 200) {
      const dateStr = cursor.toISOString().split("T")[0];
      if (
        dateStr >= today &&
        isDayAvailable(dateStr) &&
        isTimeSlotAvailable(dateStr, slot.startTime)
      ) {
        newSessions.push({
          date: dateStr,
          startTime: slot.startTime,
          endTime: slot.endTime,
        });
      }
      cursor.setDate(cursor.getDate() + 7); // +1 semaine
      safety++;
    }
    onSessionsChange(newSessions);
  };

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

  // Afficher la suggestion d'auto-remplissage après la première sélection
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
        className="space-y-3"
      >
        {/* Bandeau retour */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedDay(null)}
            className="flex-1 flex items-center gap-3 p-3 transition-colors hover:bg-[#f7f5ef]"
            style={{ borderRadius: 12, background: "#fff", border: "1px solid #ece9e1" }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "#f7f5ef" }}
            >
              <ArrowLeft className="w-3.5 h-3.5" style={{ color: "#1f1f1d" }} />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: "#9c9484" }}>
                Retour au calendrier
              </p>
              <p className="text-[14px] font-semibold text-[#1f1f1d] capitalize truncate tracking-[-0.01em]">
                {formatDateFull(selectedDay)}
              </p>
            </div>
          </button>
          {hasSelectedSession && (
            <button
              onClick={() => removeSession(selectedDay)}
              className="w-10 h-10 rounded-full inline-flex items-center justify-center transition-colors hover:bg-[rgba(196,86,86,0.1)] flex-shrink-0"
              style={{ border: "1px solid #f1cdcd", color: "#c45656" }}
              title="Supprimer cette séance"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {isPast ? (
          <div className="text-center py-8" style={{ borderRadius: 12, background: "#f7f5ef", border: "1px solid #ece9e1" }}>
            <Clock className="w-9 h-9 mx-auto mb-3" style={{ color: "#cdc9c0" }} />
            <p className="text-[13px] text-[#6d6d68]">Cette date est passée</p>
          </div>
        ) : availability?.status === "unavailable" ? (
          <div className="text-center py-8" style={{ borderRadius: 12, background: "#f7f5ef", border: "1px solid #ece9e1" }}>
            <Clock className="w-9 h-9 mx-auto mb-3" style={{ color: "#cdc9c0" }} />
            <p className="text-[13px] text-[#6d6d68]">Ce jour est indisponible</p>
          </div>
        ) : availableSlots.length === 0 ? (
          <div className="text-center py-8" style={{ borderRadius: 12, background: "#f7f5ef", border: "1px solid #ece9e1" }}>
            <Clock className="w-9 h-9 mx-auto mb-3" style={{ color: "#cdc9c0" }} />
            <p className="text-[13px] text-[#6d6d68]">Aucun créneau disponible ce jour</p>
          </div>
        ) : (
          <>
            {/* Info durée */}
            <div
              className="p-2.5 text-[12px] flex items-center gap-2"
              style={{
                borderRadius: 10,
                background: "#f7f5ef",
                border: "1px solid #ece9e1",
                color: "#3a3a38",
              }}
            >
              <Clock className="w-3.5 h-3.5" style={{ color: "#6d6d68" }} />
              <span>
                Durée de la séance :{" "}
                <span className="font-semibold text-[#1f1f1d]">
                  {variantDuration >= 60
                    ? `${Math.floor(variantDuration / 60)}h${variantDuration % 60 > 0 ? variantDuration % 60 : ""}`
                    : `${variantDuration}min`}
                </span>
              </span>
            </div>

            {/* Grille des créneaux pill style hôtel */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[320px] overflow-y-auto">
              {availableSlots.map((time) => {
                const endTime = calculateEndTime(time);
                const isSelected = currentSession?.startTime === time;

                return (
                  <button
                    key={time}
                    onClick={() => handleTimeSelect(time)}
                    className="p-2.5 text-center transition-all hover:bg-[#fafafa]"
                    style={{
                      borderRadius: 12,
                      border: `1px solid ${isSelected ? "#1f1f1d" : "#dfdcd4"}`,
                      background: isSelected ? "#1f1f1d" : "#fff",
                      color: isSelected ? "#fff" : "#1f1f1d",
                    }}
                  >
                    <p className="text-[13px]" style={{ fontWeight: isSelected ? 600 : 500 }}>
                      {time}
                    </p>
                    <p
                      className="text-[10px] mt-0.5"
                      style={{ color: isSelected ? "rgba(255,255,255,0.7)" : "#9c9484" }}
                    >
                      → {endTime}
                    </p>
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
            className="p-4"
            style={{ borderRadius: 12, background: "#f5f9f6", border: "1px solid #cfdbd3" }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "#fff", border: "1px solid #cfdbd3" }}
              >
                <Sparkles className="w-4 h-4" style={{ color: "#1f3a33" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-semibold text-[#1f1f1d] tracking-[-0.01em] mb-1">
                  Réserver les mêmes créneaux ?
                </p>
                <p className="text-[12px] text-[#3a3a38] leading-[1.5] mb-3">
                  Réserver les {numberOfSessions} séances tous les{" "}
                  <strong className="capitalize">{getDayName(selectedSessions[0].date)}s</strong> à{" "}
                  <strong>{selectedSessions[0].startTime}</strong> ?
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={applyAutoFill}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-medium transition-opacity hover:opacity-90"
                    style={{ background: "#1f3a33", color: "#f7f5ef" }}
                  >
                    <Repeat className="w-3.5 h-3.5" />
                    Oui, automatiquement
                  </button>
                  <button
                    onClick={() => {
                      setShowAutoFillSuggestion(false);
                      setSelectedDay(null);
                    }}
                    className="inline-flex items-center px-4 py-2 rounded-full text-[12px] font-medium transition-colors hover:bg-[#fafafa]"
                    style={{ background: "#fff", border: "1px solid #ece9e1", color: "#1f1f1d" }}
                  >
                    Non, manuellement
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Bouton séance suivante */}
        {hasSelectedSession && needsMoreSlots && !showAutoFillSuggestion && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-1"
          >
            <button
              onClick={() => setSelectedDay(null)}
              className="w-full py-2.5 px-4 rounded-full text-[13px] font-medium transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
              style={{ background: "#1f3a33", color: "#f7f5ef" }}
            >
              <Calendar className="w-3.5 h-3.5" />
              Sélectionner la séance {selectedSessions.length + 1}/{numberOfSessions}
            </button>
            <p className="text-[11px] text-center mt-2" style={{ color: "#9c9484" }}>
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
            className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-[#f7f5ef] transition-colors"
            aria-label="Période précédente"
          >
            <ChevronLeft className="w-4 h-4" style={{ color: "#1f1f1d" }} />
          </button>
          <div className="flex items-center gap-2">
            <h4 className="text-[14px] font-semibold text-[#1f1f1d] tracking-[-0.01em] capitalize">
              {getPeriodTitle()}
            </h4>
            <button
              onClick={goToToday}
              className="px-2 py-0.5 rounded-full text-[10px] font-medium hover:bg-[#f7f5ef] transition-colors"
              style={{ border: "1px solid #ece9e1", color: "#1f3a33" }}
            >
              Aujourd&apos;hui
            </button>
          </div>
          <button
            onClick={navigateNext}
            className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-[#f7f5ef] transition-colors"
            aria-label="Période suivante"
          >
            <ChevronRight className="w-4 h-4" style={{ color: "#1f1f1d" }} />
          </button>
        </div>

        {/* En-têtes jours */}
        <div className="grid grid-cols-7">
          {["L", "M", "M", "J", "V", "S", "D"].map((day, i) => (
            <div
              key={`${day}-${i}`}
              className="text-center py-2 text-[11px]"
              style={{ color: "#6d6d68", fontWeight: 500 }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grille des semaines (style hôtel) */}
        <div>
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7">
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

                const availabilityStatus = getDayAvailabilityStatus(dateStr);
                const hasFreeSlots = hasAvailableSlots(dateStr);

                const getIndicatorColor = (): string | null => {
                  if (isPast) return null;
                  if (hasSelected) return null;
                  if (availabilityStatus === "unavailable" || !hasFreeSlots) return "#c45656";
                  if (availabilityStatus === "partial") return "#c9a14a";
                  if (!canSelectDay) return "#cdc9c0";
                  return "#2f4a3f";
                };

                const indicatorColor = getIndicatorColor();
                const isClickable = dayAvailable && !isPast && hasFreeSlots;

                return (
                  <div key={dateStr} className="relative aspect-square">
                    <button
                      onClick={() => isClickable && setSelectedDay(dateStr)}
                      disabled={!isClickable}
                      className={cn(
                        "group relative w-full h-full flex flex-col items-center justify-center rounded-full transition-all",
                        isClickable && !hasSelected && "hover:bg-[#1f1f1d] hover:text-white cursor-pointer",
                        !isClickable && !isPast && "cursor-not-allowed"
                      )}
                      style={{
                        background: hasSelected ? "#1f1f1d" : "transparent",
                        color: hasSelected
                          ? "#fff"
                          : isPast
                            ? "#cdc9c0"
                            : !dayAvailable || !hasFreeSlots
                              ? "#cdc9c0"
                              : "#1f1f1d",
                        opacity: isPast ? 0.5 : 1,
                      }}
                    >
                      {isToday && !hasSelected && (
                        <div
                          className="absolute inset-0 rounded-full pointer-events-none"
                          style={{ border: "1px solid #1f1f1d" }}
                        />
                      )}
                      <span
                        className="text-[14px]"
                        style={{ fontWeight: hasSelected || isToday ? 600 : 400 }}
                      >
                        {new Date(dateStr).getDate()}
                      </span>

                      {hasSelected && session ? (
                        <span className="text-[9px] font-medium" style={{ color: "#fff" }}>
                          {session.startTime}
                        </span>
                      ) : indicatorColor ? (
                        <div
                          className="w-1 h-1 rounded-full mt-0.5 transition-opacity group-hover:opacity-0"
                          style={{ background: indicatorColor }}
                        />
                      ) : null}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Légende */}
        <div
          className="flex flex-wrap items-center justify-center gap-3 pt-3 mt-2"
          style={{ borderTop: "1px solid #f1ede3" }}
        >
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#2f4a3f" }} />
            <span className="text-[10px] font-medium" style={{ color: "#9c9484" }}>Libre</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#c9a14a" }} />
            <span className="text-[10px] font-medium" style={{ color: "#9c9484" }}>Partiel</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#c45656" }} />
            <span className="text-[10px] font-medium" style={{ color: "#9c9484" }}>Complet</span>
          </div>
          {sessionInterval > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#cdc9c0" }} />
              <span className="text-[10px] font-medium" style={{ color: "#9c9484" }}>
                Intervalle non respecté
              </span>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  // ─── Vue Liste : sélection rapide (1 clic = 1 séance) ───
  const renderQuickListView = () => {
    // Group slots par semaine (clé = lundi de la semaine en YYYY-MM-DD)
    const slotsByWeek = new Map<string, AvailableSlot[]>();
    filteredSlots.forEach((slot) => {
      const d = new Date(slot.date);
      const day = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((day + 6) % 7));
      const weekKey = monday.toISOString().split("T")[0];
      if (!slotsByWeek.has(weekKey)) slotsByWeek.set(weekKey, []);
      slotsByWeek.get(weekKey)!.push(slot);
    });

    const weekKeys = Array.from(slotsByWeek.keys()).sort();
    const dayLabels = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-3"
      >
        {/* Compteur + filtre par jour de la semaine */}
        <div
          className="p-3 flex flex-wrap items-center justify-between gap-2"
          style={{ borderRadius: 12, background: "#f5f9f6", border: "1px solid #cfdbd3" }}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" style={{ color: "#1f3a33" }} />
            <span className="text-[12.5px] font-semibold" style={{ color: "#1f3a33" }}>
              Cochez {numberOfSessions} créneaux
            </span>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={
                isComplete
                  ? { background: "#1f3a33", color: "#f7f5ef" }
                  : { background: "#fff", color: "#1f3a33", border: "1px solid #cfdbd3" }
              }
            >
              {selectedSessions.length}/{numberOfSessions}
            </span>
          </div>
          {sessionInterval > 0 && (
            <span className="text-[10.5px]" style={{ color: "#3a6052" }}>
              ≥ {sessionInterval}j entre 2 séances
            </span>
          )}
        </div>

        {/* Filtre par jour de la semaine */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setFilterDayOfWeek(null)}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors"
            style={
              filterDayOfWeek === null
                ? { background: "#1f3a33", color: "#f7f5ef", border: "1px solid #1f3a33" }
                : { background: "#fff", color: "#6d6d68", border: "1px solid #ece9e1" }
            }
          >
            Tous
          </button>
          {[1, 2, 3, 4, 5, 6, 0].map((d) => {
            const active = filterDayOfWeek === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setFilterDayOfWeek(active ? null : d)}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors"
                style={
                  active
                    ? { background: "#1f3a33", color: "#f7f5ef", border: "1px solid #1f3a33" }
                    : { background: "#fff", color: "#6d6d68", border: "1px solid #ece9e1" }
                }
              >
                {dayLabels[d]}
              </button>
            );
          })}
        </div>

        {/* Liste des créneaux groupés par semaine */}
        {filteredSlots.length === 0 ? (
          <div
            className="p-6 text-center"
            style={{ borderRadius: 12, background: "#fcfaf4", border: "1px solid #f1ede3" }}
          >
            <p className="text-[12.5px]" style={{ color: "#6d6d68" }}>
              Aucun créneau disponible avec ces filtres.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {weekKeys.map((weekKey) => {
              const weekSlots = slotsByWeek.get(weekKey) || [];
              const monday = new Date(weekKey);
              const sunday = new Date(monday);
              sunday.setDate(monday.getDate() + 6);
              const weekLabel = `Semaine du ${monday.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} au ${sunday.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`;

              return (
                <div key={weekKey}>
                  <div
                    className="text-[10px] font-medium uppercase tracking-[0.1em] mb-1.5 sticky top-0 py-1"
                    style={{ color: "#9c9484", background: "#fff" }}
                  >
                    {weekLabel}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {weekSlots.map((slot) => {
                      const selected = isSlotSelected(slot);
                      const disabled = !selected && selectedSessions.length >= numberOfSessions;
                      return (
                        <div key={`${slot.date}-${slot.startTime}`} className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleSlot(slot)}
                            disabled={disabled}
                            className={cn(
                              "flex-1 flex items-center justify-between gap-2 px-3 py-2 text-left transition-colors",
                              !disabled && "hover:bg-[#f7f5ef]"
                            )}
                            style={{
                              borderRadius: 10,
                              background: selected ? "#1f3a33" : "#fff",
                              border: `1px solid ${selected ? "#1f3a33" : "#dfdcd4"}`,
                              color: selected ? "#f7f5ef" : "#1f1f1d",
                              opacity: disabled ? 0.4 : 1,
                              cursor: disabled ? "not-allowed" : "pointer",
                            }}
                          >
                            <span className="flex items-center gap-1.5 min-w-0">
                              <span
                                className="w-4 h-4 rounded inline-flex items-center justify-center flex-shrink-0"
                                style={{
                                  background: selected ? "rgba(247,245,239,0.2)" : "#fff",
                                  border: `1px solid ${selected ? "#f7f5ef" : "#dfdcd4"}`,
                                }}
                              >
                                {selected && <Check className="w-2.5 h-2.5" />}
                              </span>
                              <span className="text-[12px] font-medium capitalize truncate">
                                {slot.label}
                              </span>
                            </span>
                          </button>
                          {/* Bouton "même heure pendant N semaines" — visible si rien encore sélectionné */}
                          {selectedSessions.length === 0 && (
                            <button
                              type="button"
                              onClick={() => quickSelectRecurring(slot)}
                              title={`Sélectionner ce créneau toutes les semaines (${numberOfSessions} fois)`}
                              className="p-1.5 rounded-full hover:bg-[#f5f9f6] transition-colors flex-shrink-0"
                              style={{ color: "#1f3a33" }}
                            >
                              <Repeat className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Charger plus de semaines */}
            {weeksToShow < 12 && (
              <button
                type="button"
                onClick={() => setWeeksToShow((n) => n + 4)}
                className="w-full py-2 rounded-full text-[12px] font-medium transition-colors hover:bg-[#fafafa]"
                style={{ background: "#fff", border: "1px solid #dfdcd4", color: "#1f3a33" }}
              >
                Voir 4 semaines de plus
              </button>
            )}
          </div>
        )}
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
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "#1f3a33" }}
          >
            <Check className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-0.5">
              Séances
            </div>
            <h3 className="text-[14px] font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
              {numberOfSessions} séance{numberOfSessions > 1 ? "s" : ""} confirmée{numberOfSessions > 1 ? "s" : ""}
            </h3>
          </div>
        </div>
        <button
          onClick={() => setIsCollapsed(false)}
          className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors hover:bg-[#f7f5ef] flex-shrink-0"
          style={{ color: "#1f3a33", border: "1px solid #1f3a33" }}
        >
          Modifier
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {selectedSessions
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((session, index) => (
            <div
              key={session.date}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11.5px]"
              style={{ borderRadius: 999, background: "#f5f9f6", border: "1px solid #cfdbd3" }}
            >
              <span
                className="w-4 h-4 rounded-full inline-flex items-center justify-center text-[10px] font-bold"
                style={{ background: "#1f3a33", color: "#fff" }}
              >
                {index + 1}
              </span>
              <span className="font-semibold text-[#1f1f1d] capitalize">
                {formatDateShort(session.date)}
              </span>
              <span style={{ color: "#6d6d68" }}>
                · {session.startTime}-{session.endTime}
              </span>
            </div>
          ))}
      </div>
    </motion.div>
  );

  return (
    <div
      className={cn("bg-white p-[18px]", className)}
      style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
    >
      {isCollapsed && isComplete ? (
        renderCollapsedView()
      ) : (
        <>
          {/* Header — eyebrow + titre */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-1">
                Étape · Séances
              </div>
              <h3 className="text-base font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
                Choisissez vos {numberOfSessions} séance{numberOfSessions > 1 ? "s" : ""}
              </h3>
              <p className="text-[12px] text-[#6d6d68] mt-1">
                Sélectionnez {numberOfSessions} créneau{numberOfSessions > 1 ? "x" : ""}
                {sessionInterval > 0 && ` avec au moins ${sessionInterval} jour${sessionInterval > 1 ? "s" : ""} d'intervalle`}.
              </p>
            </div>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 mt-1"
              style={
                isComplete
                  ? { border: "1px solid #cfdbd3", color: "#2f4a3f", background: "#fff" }
                  : { border: "1px solid #f4e6c1", color: "#7a5b1a", background: "#fff" }
              }
            >
              {selectedSessions.length}/{numberOfSessions}
            </span>
          </div>

          {sessionInterval > 0 && (
            <div
              className="flex items-start gap-2 p-3 text-[12px] mb-4"
              style={{
                borderRadius: 10,
                background: "#f7f5ef",
                border: "1px solid #ece9e1",
                color: "#3a3a38",
              }}
            >
              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#6d6d68" }} />
              <p className="leading-[1.5]">
                Les séances doivent être espacées d&apos;au moins{" "}
                <strong className="text-[#1f1f1d]">{sessionInterval} jour{sessionInterval > 1 ? "s" : ""}</strong>.
                Les créneaux trop proches seront grisés.
              </p>
            </div>
          )}

          {/* ─── Toggle vue Liste / Calendrier ─── */}
          {numberOfSessions > 1 && (
            <div className="flex items-center justify-between gap-2 mb-3">
              <div
                className="inline-flex items-center p-0.5"
                style={{ borderRadius: 999, background: "#fff", border: "1px solid #ece9e1" }}
              >
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors"
                  style={
                    viewMode === "list"
                      ? { background: "#1f3a33", color: "#f7f5ef" }
                      : { color: "#6d6d68" }
                  }
                >
                  <Sparkles className="w-3 h-3" />
                  Sélection rapide
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("calendar")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors"
                  style={
                    viewMode === "calendar"
                      ? { background: "#1f3a33", color: "#f7f5ef" }
                      : { color: "#6d6d68" }
                  }
                >
                  <Calendar className="w-3 h-3" />
                  Calendrier
                </button>
              </div>
              {selectedSessions.length > 0 && (
                <button
                  type="button"
                  onClick={() => onSessionsChange([])}
                  className="text-[11px] font-medium underline"
                  style={{ color: "#9c9484" }}
                >
                  Tout effacer
                </button>
              )}
            </div>
          )}

          {/* Vue Liste : sélection rapide en cochant les créneaux */}
          {viewMode === "list" && numberOfSessions > 1 ? (
            renderQuickListView()
          ) : (
            /* Vue Calendrier (existante) */
            <div>
              <AnimatePresence mode="wait">
                {selectedDay ? renderTimeView() : renderCalendarView()}
              </AnimatePresence>
            </div>
          )}

          {/* Pills séances sélectionnées */}
          {selectedSessions.length > 0 && !isComplete && (
            <div className="mt-4 pt-4" style={{ borderTop: "1px solid #f1ede3" }}>
              <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-2">
                Séances sélectionnées
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedSessions
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((session, index) => (
                    <div
                      key={session.date}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11.5px] group"
                      style={{
                        borderRadius: 999,
                        background: "#f5f9f6",
                        border: "1px solid #cfdbd3",
                      }}
                    >
                      <span
                        className="w-4 h-4 rounded-full inline-flex items-center justify-center text-[10px] font-bold"
                        style={{ background: "#1f3a33", color: "#fff" }}
                      >
                        {index + 1}
                      </span>
                      <span className="font-semibold text-[#1f1f1d] capitalize">
                        {formatDateShort(session.date)}
                      </span>
                      <span style={{ color: "#6d6d68" }}>· {session.startTime}</span>
                      <button
                        onClick={() => removeSession(session.date)}
                        className="p-0.5 rounded-full transition-colors hover:bg-[rgba(196,86,86,0.15)] opacity-60 hover:opacity-100"
                        style={{ color: "#c45656" }}
                      >
                        <X className="w-2.5 h-2.5" />
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
});
