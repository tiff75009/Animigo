"use client";

import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Calendar, Clock, Moon, Sun, Users, ChevronRight, Check, Pencil, X } from "lucide-react";
import { cn } from "@/app/lib/utils";
import type { CalendarEntry } from "./types";
import { formatDateDisplay } from "./pricing";
import MobileTimePicker from "./MobileTimePicker";

// Types pour le flux en étapes du mode garde
type RangeStep = "start_date" | "start_time" | "end_date" | "end_time" | "complete";

interface BookingCalendarProps {
  selectedDate: string | null;
  selectedEndDate: string | null;
  selectedTime: string | null;
  selectedEndTime: string | null;
  includeOvernightStay: boolean;
  calendarMonth: Date;
  availabilityCalendar: CalendarEntry[] | undefined;
  isRangeMode: boolean;
  days: number;
  nights: number;
  isCapacityBased?: boolean;
  maxAnimalsPerSlot?: number;
  enableDurationBasedBlocking?: boolean;
  variantDuration?: number;
  bufferBefore?: number;
  bufferAfter?: number;
  acceptReservationsFrom?: string;
  acceptReservationsTo?: string;
  allowOvernightStay?: boolean;
  overnightPrice?: number;
  dayStartTime?: string;
  dayEndTime?: string;
  // Billing info pour affichage jours/demi-journées
  billingInfo?: {
    billingUnit?: string;
    fullDays: number;
    halfDays: number;
    firstDayIsHalfDay?: boolean;
    lastDayIsHalfDay?: boolean;
  };
  clientBillingMode?: "exact_hourly" | "round_half_day" | "round_full_day";
  minimumBookingAdvanceHours?: number;
  onDateSelect: (date: string) => void;
  onEndDateSelect: (date: string | null) => void;
  onTimeSelect: (time: string) => void;
  onEndTimeSelect: (time: string) => void;
  onOvernightChange: (include: boolean) => void;
  onMonthChange: (date: Date) => void;
}

// Délai minimum de réservation par défaut (en heures)
// Sera écrasé par la prop minimumBookingAdvanceHours si fournie
const DEFAULT_MIN_BOOKING_LEAD_TIME_HOURS = 24;

// Helper functions
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// Vérifier si un créneau est réservable (pas passé + délai minimum)
function isSlotBookable(dateStr: string, startTime: string, leadTimeHours: number = DEFAULT_MIN_BOOKING_LEAD_TIME_HOURS): boolean {
  const now = new Date();

  // Calculer la date/heure minimum réservable
  const minBookableMs = now.getTime() + leadTimeHours * 60 * 60 * 1000;

  // Parser la date et l'heure du créneau
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = startTime.split(":").map(Number);
  const slotDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

  return slotDate.getTime() >= minBookableMs;
}

// Vérifier si une date a au moins un créneau réservable
function isDateBookable(dateStr: string, acceptReservationsTo: string, leadTimeHours: number = DEFAULT_MIN_BOOKING_LEAD_TIME_HOURS): boolean {
  const now = new Date();
  const minBookableMs = now.getTime() + leadTimeHours * 60 * 60 * 1000;

  // Vérifier si le dernier créneau possible de la journée est réservable
  const [year, month, day] = dateStr.split("-").map(Number);
  const [endH, endM] = acceptReservationsTo.split(":").map(Number);
  const lastSlotDate = new Date(year, month - 1, day, endH, endM, 0, 0);

  return lastSlotDate.getTime() >= minBookableMs;
}

function calculateDuration(startTime: string, endTime: string): string {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  const durationMinutes = endMinutes - startMinutes;

  if (durationMinutes < 60) {
    return `${durationMinutes}min`;
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h${minutes}`;
}

function generateTimeSlots(
  startHour: number,
  endHour: number,
  intervalMinutes: number = 30
): string[] {
  const slots: string[] = [];
  let currentMinutes = startHour * 60;
  const endMinutes = endHour * 60;

  while (currentMinutes <= endMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const minutes = currentMinutes % 60;
    slots.push(
      `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
    );
    currentMinutes += intervalMinutes;
  }

  return slots;
}

function parseTimeToHour(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours + minutes / 60;
}

function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

export default function BookingCalendar({
  selectedDate,
  selectedEndDate,
  selectedTime,
  selectedEndTime,
  includeOvernightStay,
  calendarMonth,
  availabilityCalendar,
  isRangeMode,
  days,
  nights,
  isCapacityBased,
  maxAnimalsPerSlot,
  enableDurationBasedBlocking,
  variantDuration = 60,
  bufferBefore = 0,
  bufferAfter = 0,
  acceptReservationsFrom = "08:00",
  acceptReservationsTo = "20:00",
  allowOvernightStay,
  overnightPrice,
  dayStartTime,
  dayEndTime,
  billingInfo,
  clientBillingMode,
  minimumBookingAdvanceHours = DEFAULT_MIN_BOOKING_LEAD_TIME_HOURS,
  onDateSelect,
  onEndDateSelect,
  onTimeSelect,
  onEndTimeSelect,
  onOvernightChange,
  onMonthChange,
}: BookingCalendarProps) {
  // State for mobile time pickers
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // State pour le flux en étapes du mode garde
  const [rangeStep, setRangeStep] = useState<RangeStep>("start_date");

  // État pour la vue repliée en mode non-garde
  const [isNonRangeCollapsed, setIsNonRangeCollapsed] = useState(false);

  // État pour la transition calendrier/créneaux en mode non-garde
  const [nonRangeView, setNonRangeView] = useState<"calendar" | "time">("calendar");

  // Déterminer si la sélection est complète en mode non-garde
  const isNonRangeComplete = selectedDate && selectedTime && (enableDurationBasedBlocking || selectedEndTime);

  // Reset rangeStep quand on change de mode ou reset les dates
  useEffect(() => {
    if (!isRangeMode) return;
    if (!selectedDate) {
      setRangeStep("start_date");
    } else if (!selectedTime) {
      setRangeStep("start_time");
    } else if (!selectedEndDate) {
      setRangeStep("end_date");
    } else if (!selectedEndTime) {
      setRangeStep("end_time");
    } else {
      setRangeStep("complete");
    }
  }, [isRangeMode, selectedDate, selectedTime, selectedEndDate, selectedEndTime]);

  // Auto-collapse quand la sélection est complète en mode non-garde
  useEffect(() => {
    if (!isRangeMode && isNonRangeComplete) {
      const timer = setTimeout(() => {
        setIsNonRangeCollapsed(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isRangeMode, isNonRangeComplete]);

  // Reset collapsed state when selection changes
  useEffect(() => {
    if (!isRangeMode && !isNonRangeComplete) {
      setIsNonRangeCollapsed(false);
    }
  }, [isRangeMode, isNonRangeComplete]);

  // Reset nonRangeView when date is cleared
  useEffect(() => {
    if (!isRangeMode && !selectedDate) {
      setNonRangeView("calendar");
    }
  }, [isRangeMode, selectedDate]);

  // Calculate end time based on variant duration
  const calculateEndTimeForDuration = (startTime: string): string => {
    const [hours, minutes] = startTime.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes + variantDuration;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
  };

  const calculatedEndTime = selectedTime ? calculateEndTimeForDuration(selectedTime) : null;

  // Handle time selection - automatically set end time for duration-based services
  const handleTimeSelect = (time: string) => {
    onTimeSelect(time);
    if (enableDurationBasedBlocking && variantDuration) {
      const endTime = calculateEndTimeForDuration(time);
      onEndTimeSelect(endTime);
    }
  };

  // Generate time slots based on announcer's availability
  const timeSlots = useMemo(() => {
    const startHour = parseTimeToHour(acceptReservationsFrom);
    const endHour = parseTimeToHour(acceptReservationsTo);
    return generateTimeSlots(Math.floor(startHour), Math.floor(endHour), 30);
  }, [acceptReservationsFrom, acceptReservationsTo]);

  const extendedTimeSlots = useMemo(() => {
    const startHour = parseTimeToHour(acceptReservationsFrom);
    const endHour = parseTimeToHour(acceptReservationsTo);
    return generateTimeSlots(Math.floor(startHour), Math.floor(endHour), 30);
  }, [acceptReservationsFrom, acceptReservationsTo]);

  // Handle date click pour le flux en étapes
  const handleDateClick = (dateStr: string) => {
    if (isRangeMode) {
      if (rangeStep === "start_date") {
        // Étape 1: sélection de la date de début
        onDateSelect(dateStr);
        onEndDateSelect(null);
        onTimeSelect("");
        onEndTimeSelect("");
        setRangeStep("start_time");
      } else if (rangeStep === "end_date") {
        // Étape 3: sélection de la date de fin
        if (dateStr >= selectedDate!) {
          onEndDateSelect(dateStr);
          setRangeStep("end_time");
        } else {
          // Si date avant date de début, recommencer
          onDateSelect(dateStr);
          onEndDateSelect(null);
          onTimeSelect("");
          onEndTimeSelect("");
          setRangeStep("start_time");
        }
      }
    } else {
      onDateSelect(dateStr);
      onEndDateSelect(null);
      // Passer à la vue créneaux horaires
      setNonRangeView("time");
    }
  };

  // Handle start time selection en mode garde
  const handleRangeStartTimeSelect = (time: string) => {
    onTimeSelect(time);
    setRangeStep("end_date");
  };

  // Handle end time selection en mode garde
  const handleRangeEndTimeSelect = (time: string) => {
    onEndTimeSelect(time);
    setRangeStep("complete");
  };

  // Revenir à une étape précédente
  const goBackToStep = (step: RangeStep) => {
    if (step === "start_date") {
      onDateSelect("");
      onEndDateSelect(null);
      onTimeSelect("");
      onEndTimeSelect("");
    } else if (step === "start_time") {
      onTimeSelect("");
      onEndTimeSelect("");
      onEndDateSelect(null);
    } else if (step === "end_date") {
      onEndDateSelect(null);
      onEndTimeSelect("");
    } else if (step === "end_time") {
      onEndTimeSelect("");
    }
    setRangeStep(step);
  };

  // Get available end time slots
  const getEndTimeSlots = () => {
    if (!selectedTime) return [];
    const startMinutes = parseTimeToMinutes(selectedTime);
    return extendedTimeSlots.filter((time) => {
      const timeMinutes = parseTimeToMinutes(time);
      return timeMinutes > startMinutes;
    });
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const firstDay = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      1
    );
    const lastDay = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth() + 1,
      0
    );
    const startPadding = (firstDay.getDay() + 6) % 7;
    const elements = [];

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // Padding
    for (let i = 0; i < startPadding; i++) {
      elements.push(<div key={`pad-${i}`} />);
    }

    // Days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${calendarMonth.getFullYear()}-${String(
        calendarMonth.getMonth() + 1
      ).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isPast = dateStr < todayStr;
      const availability = availabilityCalendar?.find((a) => a.date === dateStr);
      // Si pas de données de calendrier ou pas d'entrée, considérer comme indisponible
      const rawStatus = isPast ? "past" : (!availabilityCalendar || !availability) ? "unavailable" : availability.status;
      // Vérifier si la date est réservable en tenant compte du délai minimum
      const isTooSoon = !isPast && rawStatus !== "unavailable" && !isDateBookable(dateStr, acceptReservationsTo, minimumBookingAdvanceHours);
      const status = isTooSoon ? "past" as const : rawStatus;

      const capacity = availability?.capacity;
      const hasCapacityInfo = isCapacityBased && capacity;
      const remainingCapacity = capacity?.remaining ?? maxAnimalsPerSlot ?? 0;

      const isSelected = selectedDate === dateStr;
      const isEndSelected = selectedEndDate === dateStr;
      const isInRange =
        isRangeMode &&
        selectedDate &&
        selectedEndDate &&
        dateStr > selectedDate &&
        dateStr < selectedEndDate;

      const isDisabled =
        status === "past" ||
        (status === "unavailable" && (!hasCapacityInfo || remainingCapacity === 0));

      // Déterminer la couleur du point pour les services de garde (capacity-based)
      const getCapacityDotColor = () => {
        if (!hasCapacityInfo) return null;
        if (remainingCapacity === 0) return "bg-red-500";
        if (remainingCapacity < (maxAnimalsPerSlot ?? 1)) return "bg-amber-500";
        return "bg-emerald-500";
      };
      const capacityDotColor = getCapacityDotColor();

      elements.push(
        <button
          key={dateStr}
          disabled={isDisabled}
          onClick={() => handleDateClick(dateStr)}
          className={cn(
            "aspect-square flex flex-col items-center justify-center text-sm rounded-lg transition-colors relative",
            status === "past" && "text-gray-300 cursor-not-allowed",
            status === "unavailable" &&
              !hasCapacityInfo &&
              "text-gray-300 bg-gray-50 cursor-not-allowed",
            // Mode garde: styles basés sur la capacité
            hasCapacityInfo &&
              remainingCapacity === 0 &&
              "text-gray-400 cursor-not-allowed",
            hasCapacityInfo &&
              remainingCapacity > 0 &&
              "hover:bg-gray-100",
            // Mode standard
            status === "partial" && !hasCapacityInfo && "text-amber-600 bg-amber-50",
            status === "available" && !hasCapacityInfo && "hover:bg-gray-100",
            (isSelected || isEndSelected) && "bg-primary text-white hover:bg-primary",
            isInRange && "bg-primary/20"
          )}
        >
          {/* Numéro du jour */}
          <span className={cn(
            status === "unavailable" && !hasCapacityInfo && "line-through",
            hasCapacityInfo && remainingCapacity === 0 && "text-gray-400"
          )}>
            {d}
          </span>

          {/* Point coloré pour le mode garde (capacity-based) */}
          {hasCapacityInfo && !isSelected && !isEndSelected && !isInRange && status !== "past" && (
            <div className={cn(
              "w-1.5 h-1.5 rounded-full mt-0.5",
              capacityDotColor
            )} />
          )}

          {/* Affichage du nombre de places restantes en mode garde */}
          {hasCapacityInfo && remainingCapacity > 0 && !isSelected && !isEndSelected && (
            <span
              className={cn(
                "text-[9px] leading-none font-medium mt-0.5",
                remainingCapacity < (maxAnimalsPerSlot ?? 1)
                  ? "text-amber-600"
                  : "text-emerald-600"
              )}
            >
              {remainingCapacity}
            </span>
          )}

          {/* Mode standard: indicateur indispo */}
          {status === "unavailable" && !hasCapacityInfo && (
            <span className="text-[8px] leading-none text-gray-400">indispo</span>
          )}
        </button>
      );
    }

    return elements;
  };

  // Get availability info for selected date
  const selectedDateAvailability = selectedDate
    ? availabilityCalendar?.find((a) => a.date === selectedDate)
    : undefined;
  const bookedSlots = selectedDateAvailability?.bookedSlots || [];
  const availableTimeSlots = selectedDateAvailability?.timeSlots;

  // Check if a time slot is available
  const isTimeSlotAvailable = (startTime: string, duration: number = variantDuration) => {
    // Vérifier d'abord si le créneau est réservable (pas passé + délai minimum)
    if (selectedDate && !isSlotBookable(selectedDate, startTime, minimumBookingAdvanceHours)) {
      return false;
    }

    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = startMinutes + duration;

    const effectiveStartMinutes = enableDurationBasedBlocking
      ? startMinutes - bufferBefore
      : startMinutes;
    const effectiveEndMinutes = enableDurationBasedBlocking
      ? endMinutes + bufferAfter
      : endMinutes;

    if (availableTimeSlots && availableTimeSlots.length > 0) {
      const isInAvailableSlot = availableTimeSlots.some((slot) => {
        const slotStart = parseTimeToMinutes(slot.startTime);
        const slotEnd = parseTimeToMinutes(slot.endTime);
        return effectiveStartMinutes >= slotStart && effectiveEndMinutes <= slotEnd;
      });
      if (!isInAvailableSlot) return false;
    }

    const hasConflict = bookedSlots.some((booked) => {
      const bookedStart = parseTimeToMinutes(booked.startTime);
      const bookedEnd = parseTimeToMinutes(booked.endTime);
      return effectiveStartMinutes < bookedEnd && effectiveEndMinutes > bookedStart;
    });

    return !hasConflict;
  };

  // ============================================
  // RENDU POUR MODE NON-GARDE (calendrier classique)
  // ============================================

  // Formater la date pour l'affichage
  const formatDateFull = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  // Obtenir le statut de disponibilité d'un jour
  const getDayAvailabilityStatus = (dateStr: string): "available" | "partial" | "unavailable" | "past" => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    if (dateStr < todayStr) return "past";
    if (!availabilityCalendar) return "unavailable";
    const availability = availabilityCalendar.find((a) => a.date === dateStr);
    if (!availability) return "unavailable";
    return availability.status as "available" | "partial" | "unavailable" | "past";
  };

  // Générer les jours du calendrier avec indicateurs colorés
  const generateCalendarDaysEnhanced = () => {
    const firstDay = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      1
    );
    const lastDay = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth() + 1,
      0
    );
    const startPadding = (firstDay.getDay() + 6) % 7;
    const elements = [];

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // Padding
    for (let i = 0; i < startPadding; i++) {
      elements.push(<div key={`pad-${i}`} />);
    }

    // Days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${calendarMonth.getFullYear()}-${String(
        calendarMonth.getMonth() + 1
      ).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isPast = dateStr < todayStr;
      const isToday = dateStr === todayStr;
      const availability = availabilityCalendar?.find((a) => a.date === dateStr);
      const rawStatus = isPast ? "past" : (!availabilityCalendar || !availability) ? "unavailable" : availability.status;
      // Vérifier si la date est réservable en tenant compte du délai minimum
      const isTooSoonEnhanced = !isPast && rawStatus !== "unavailable" && !isDateBookable(dateStr, acceptReservationsTo, minimumBookingAdvanceHours);
      const status = isTooSoonEnhanced ? "past" as const : rawStatus;
      const isSelected = selectedDate === dateStr;
      const isDisabled = status === "past" || status === "unavailable";

      // Déterminer la couleur du point indicateur
      const getIndicatorColor = () => {
        if (isPast) return null;
        if (isSelected) return "bg-primary";
        if (status === "unavailable") return "bg-red-500";
        if (status === "partial") return "bg-amber-500";
        return "bg-green-500";
      };
      const indicatorColor = getIndicatorColor();

      elements.push(
        <button
          key={dateStr}
          disabled={isDisabled}
          onClick={() => handleDateClick(dateStr)}
          className={cn(
            "relative aspect-square flex flex-col items-center justify-center rounded-xl transition-all",
            isPast && "opacity-40 cursor-not-allowed",
            isToday && "ring-2 ring-primary/50",
            !isDisabled && "hover:bg-primary/10 cursor-pointer",
            isSelected && "bg-primary/15",
            status === "unavailable" && !isPast && "text-gray-400 bg-gray-50 cursor-not-allowed"
          )}
        >
          <span className={cn(
            "text-sm font-medium",
            isToday && "text-primary font-bold",
            isSelected && "text-primary"
          )}>
            {d}
          </span>

          {/* Indicateur de disponibilité */}
          {indicatorColor && !isPast && (
            <div className={cn("w-2 h-2 rounded-full mt-0.5", indicatorColor)} />
          )}
        </button>
      );
    }

    return elements;
  };

  if (!isRangeMode) {
    // Vue repliée quand la sélection est complète
    if (isNonRangeCollapsed && isNonRangeComplete) {
      return (
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Créneau sélectionné</h3>
                  <p className="text-sm text-gray-500">Réservation confirmée</p>
                </div>
              </div>
              <button
                onClick={() => setIsNonRangeCollapsed(false)}
                className="px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
              >
                Modifier
              </button>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-sm">
              <Calendar className="w-4 h-4 text-green-600" />
              <span className="font-medium text-gray-900 capitalize">
                {formatDateFull(selectedDate!)}
              </span>
              <span className="text-gray-500">
                {selectedTime} - {enableDurationBasedBlocking ? calculatedEndTime : selectedEndTime}
              </span>
            </div>
          </div>
        </div>
      );
    }

    // Fonction pour revenir à la vue calendrier
    const handleBackToCalendar = () => {
      setNonRangeView("calendar");
      onDateSelect("");
      onTimeSelect("");
      onEndTimeSelect("");
    };

    return (
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="p-2 bg-primary/10 rounded-lg">
                {nonRangeView === "calendar" ? (
                  <Calendar className="w-5 h-5 text-primary" />
                ) : (
                  <Clock className="w-5 h-5 text-primary" />
                )}
              </span>
              {nonRangeView === "calendar" ? "Choisissez une date" : "Choisissez un horaire"}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {nonRangeView === "calendar"
                ? "Sélectionnez une date disponible"
                : `Pour le ${formatDateFull(selectedDate!)}`}
            </p>
          </div>
          <div
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium",
              isNonRangeComplete
                ? "bg-green-100 text-green-700"
                : selectedDate
                ? "bg-amber-100 text-amber-700"
                : "bg-gray-100 text-gray-600"
            )}
          >
            {isNonRangeComplete ? "Complet" : selectedDate ? "Étape 2/2" : "Étape 1/2"}
          </div>
        </div>

        {/* Contenu avec transition */}
        <AnimatePresence mode="wait">
          {nonRangeView === "calendar" ? (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Calendar in gray background */}
              <div className="bg-gray-50 rounded-2xl p-4">
                {/* Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => onMonthChange(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                    className="p-2 hover:bg-white rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <span className="font-semibold text-gray-900 capitalize">
                    {calendarMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                  </span>
                  <button
                    onClick={() => onMonthChange(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                    className="p-2 hover:bg-white rounded-lg transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Days header */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                  {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
                    <div key={d} className="py-2 text-gray-500 font-medium">{d}</div>
                  ))}
                </div>

                {/* Days grid */}
                <div className="grid grid-cols-7 gap-1">{generateCalendarDaysEnhanced()}</div>

                {/* Légende */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-3 mt-3 border-t border-gray-200 text-xs text-gray-500">
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
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="time"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Bouton retour + date sélectionnée */}
              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl">
                <button
                  onClick={handleBackToCalendar}
                  className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 text-primary" />
                </button>
                <div className="flex items-center gap-2 flex-1">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-gray-900 capitalize">{formatDateFull(selectedDate!)}</span>
                </div>
                <button
                  onClick={handleBackToCalendar}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Changer
                </button>
              </div>

              {bookedSlots.length > 0 && (
                <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-600">
                  <span className="font-medium">Créneaux réservés : </span>
                  {bookedSlots.map((slot, i) => (
                    <span key={i} className="text-red-500 font-medium">
                      {slot.startTime}-{slot.endTime}{i < bookedSlots.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </div>
              )}

              {/* Duration info */}
              {enableDurationBasedBlocking && variantDuration && (
                <div className="p-3 bg-blue-50 rounded-xl text-sm text-blue-700 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Durée de la séance : {variantDuration >= 60
                    ? `${Math.floor(variantDuration / 60)}h${variantDuration % 60 > 0 ? variantDuration % 60 : ""}`
                    : `${variantDuration}min`}
                  </span>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-gray-900 mb-3">Heure de début</p>

                {/* Mobile button */}
                <button
                  onClick={() => setShowStartTimePicker(true)}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 transition-colors flex items-center justify-between sm:hidden",
                    selectedTime ? "border-primary bg-primary/5" : "border-gray-200 bg-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", selectedTime ? "bg-primary/10" : "bg-gray-100")}>
                      <Clock className={cn("w-5 h-5", selectedTime ? "text-primary" : "text-gray-400")} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-gray-500">Heure de début</p>
                      <p className={cn("text-lg font-semibold", selectedTime ? "text-primary" : "text-gray-400")}>
                        {selectedTime || "Sélectionner"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>

                {/* Desktop grid */}
                <div className="hidden sm:grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {timeSlots.map((time) => {
                    const isAvailable = isTimeSlotAvailable(time);
                    const isSelected = selectedTime === time;
                    return (
                      <button
                        key={time}
                        disabled={!isAvailable}
                        onClick={() => handleTimeSelect(time)}
                        className={cn(
                          "py-3 text-sm rounded-xl border-2 transition-all font-medium",
                          !isAvailable && "opacity-40 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-100",
                          isAvailable && isSelected
                            ? "border-primary bg-primary text-white"
                            : isAvailable && "border-gray-200 hover:border-primary hover:bg-primary/5"
                        )}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedTime && enableDurationBasedBlocking && variantDuration ? (
                <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Check className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-green-800">Créneau confirmé</p>
                      <p className="text-sm text-green-600">{selectedTime} → {calculatedEndTime}</p>
                    </div>
                  </div>
                </div>
              ) : selectedTime ? (
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-3">Heure de fin</p>

                  {/* Mobile button */}
                  <button
                    onClick={() => setShowEndTimePicker(true)}
                    className={cn(
                      "w-full p-4 rounded-xl border-2 transition-colors flex items-center justify-between sm:hidden",
                      selectedEndTime ? "border-secondary bg-secondary/5" : "border-gray-200 bg-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg", selectedEndTime ? "bg-secondary/10" : "bg-gray-100")}>
                        <Clock className={cn("w-5 h-5", selectedEndTime ? "text-secondary" : "text-gray-400")} />
                      </div>
                      <div className="text-left">
                        <p className="text-xs text-gray-500">Heure de fin</p>
                        <p className={cn("text-lg font-semibold", selectedEndTime ? "text-secondary" : "text-gray-400")}>
                          {selectedEndTime || "Sélectionner"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>

                  {/* Desktop grid */}
                  <div className="hidden sm:grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {getEndTimeSlots().map((time) => {
                      const startMinutes = parseTimeToMinutes(selectedTime);
                      const endMinutes = parseTimeToMinutes(time);
                      const effectiveStart = enableDurationBasedBlocking ? startMinutes - bufferBefore : startMinutes;
                      const effectiveEnd = enableDurationBasedBlocking ? endMinutes + bufferAfter : endMinutes;
                      const hasConflict = bookedSlots.some((slot) => {
                        const bookedStart = parseTimeToMinutes(slot.startTime);
                        const bookedEnd = parseTimeToMinutes(slot.endTime);
                        return effectiveStart < bookedEnd && effectiveEnd > bookedStart;
                      });
                      const isEndTimeAvailable = !hasConflict;
                      const isSelected = selectedEndTime === time;
                      return (
                        <button
                          key={time}
                          disabled={!isEndTimeAvailable}
                          onClick={() => onEndTimeSelect(time)}
                          className={cn(
                            "py-3 text-sm rounded-xl border-2 transition-all font-medium",
                            !isEndTimeAvailable && "opacity-40 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-100",
                            isEndTimeAvailable && isSelected
                              ? "border-secondary bg-secondary text-white"
                              : isEndTimeAvailable && "border-gray-200 hover:border-secondary hover:bg-secondary/5"
                          )}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {selectedTime && selectedEndTime && !enableDurationBasedBlocking && (
                <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Check className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-green-800">Créneau confirmé</p>
                      <p className="text-sm text-green-600">
                        {selectedTime} → {selectedEndTime} ({calculateDuration(selectedTime, selectedEndTime)})
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Time Pickers */}
        {typeof document !== "undefined" && createPortal(
          <>
            <MobileTimePicker
              isOpen={showStartTimePicker}
              onClose={() => setShowStartTimePicker(false)}
              onSelect={(time) => { handleTimeSelect(time); setShowStartTimePicker(false); }}
              selectedTime={selectedTime}
              availableTimes={timeSlots}
              disabledTimes={timeSlots.filter((time) => !isTimeSlotAvailable(time))}
              title="Heure de début"
              accentColor="primary"
            />
            {selectedTime && !enableDurationBasedBlocking && (
              <MobileTimePicker
                isOpen={showEndTimePicker}
                onClose={() => setShowEndTimePicker(false)}
                onSelect={(time) => { onEndTimeSelect(time); setShowEndTimePicker(false); }}
                selectedTime={selectedEndTime}
                availableTimes={getEndTimeSlots()}
                disabledTimes={[]}
                title="Heure de fin"
                accentColor="secondary"
              />
            )}
          </>,
          document.body
        )}
      </div>
    );
  }

  // ============================================
  // RENDU POUR MODE GARDE - FLUX EN ÉTAPES
  // ============================================

  // Helper pour le titre de l'étape
  const getStepTitle = () => {
    switch (rangeStep) {
      case "start_date": return "Date de début";
      case "start_time": return "Heure de début";
      case "end_date": return "Date de fin";
      case "end_time": return "Heure de fin";
      case "complete": return "Récapitulatif";
    }
  };

  // Helper pour le numéro d'étape
  const getStepNumber = () => {
    switch (rangeStep) {
      case "start_date": return 1;
      case "start_time": return 2;
      case "end_date": return 3;
      case "end_time": return 4;
      case "complete": return 5;
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100">
      {/* Header avec indicateur d'étapes */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            {rangeStep === "start_date" || rangeStep === "end_date" ? (
              <Calendar className="w-5 h-5 text-primary" />
            ) : (
              <Clock className="w-5 h-5 text-primary" />
            )}
            {getStepTitle()}
          </h3>
          <span className="text-xs text-gray-400">Étape {getStepNumber()}/4</span>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                step <= getStepNumber() ? "bg-primary" : "bg-gray-200"
              )}
            />
          ))}
        </div>
      </div>

      {/* Capacity info */}
      {isCapacityBased && maxAnimalsPerSlot && (rangeStep === "start_date" || rangeStep === "end_date") && (
        <div className="mb-3 px-3 py-2 bg-emerald-50/50 rounded-lg border border-emerald-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <p className="text-xs text-emerald-700">
            Jusqu'à <span className="font-semibold">{maxAnimalsPerSlot}</span> animaux par jour
          </p>
        </div>
      )}

      {/* Résumé des sélections précédentes (cliquable pour modifier) */}
      {rangeStep !== "start_date" && (
        <div className="mb-4 space-y-2">
          {/* Date de début */}
          <button
            onClick={() => goBackToStep("start_date")}
            className="w-full flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-left hover:bg-gray-100 transition-colors"
          >
            <Check className="w-4 h-4 text-emerald-500" />
            <span className="text-sm text-gray-600">Début :</span>
            <span className="text-sm font-medium text-gray-900">{formatDateDisplay(selectedDate!)}</span>
            {selectedTime && rangeStep !== "start_time" && (
              <span className="text-sm text-gray-900">à {selectedTime}</span>
            )}
          </button>

          {/* Date de fin (si sélectionnée) */}
          {selectedEndDate && rangeStep !== "end_date" && rangeStep !== "start_time" && (
            <button
              onClick={() => goBackToStep("end_date")}
              className="w-full flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-left hover:bg-gray-100 transition-colors"
            >
              <Check className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-gray-600">Fin :</span>
              <span className="text-sm font-medium text-gray-900">{formatDateDisplay(selectedEndDate)}</span>
              {selectedEndTime && rangeStep === "complete" && (
                <span className="text-sm text-gray-900">à {selectedEndTime}</span>
              )}
            </button>
          )}
        </div>
      )}

      {/* VUE CALENDRIER (étapes 1 et 3) */}
      {(rangeStep === "start_date" || rangeStep === "end_date") && (
        <div className="mb-4">
          {/* Légende compacte avec points colorés pour mode garde */}
          <div className="flex items-center justify-end gap-3 text-[10px] mb-3">
            {isCapacityBased ? (
              <>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-gray-500">Libre</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-gray-500">Partiel</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-gray-500">Complet</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-sm bg-gray-200" />
                  <span className="text-gray-400">Indispo</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-sm bg-white border border-gray-300" />
                  <span className="text-gray-400">Dispo</span>
                </div>
              </>
            )}
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => onMonthChange(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-gray-900 capitalize">
              {calendarMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
            </span>
            <button
              onClick={() => onMonthChange(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days Header */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
              <div key={d} className="py-2 text-gray-500 font-medium">{d}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">{generateCalendarDays()}</div>
        </div>
      )}

      {/* VUE SÉLECTION HEURE (étapes 2 et 4) */}
      {(rangeStep === "start_time" || rangeStep === "end_time") && (
        <div className="space-y-4">
          {/* Info créneaux réservés */}
          {bookedSlots.length > 0 && (
            <div className="p-2 bg-gray-50 rounded-lg text-xs text-gray-600">
              <span className="font-medium">Créneaux réservés : </span>
              {bookedSlots.map((slot, i) => (
                <span key={i} className="text-red-500">
                  {slot.startTime}-{slot.endTime}{i < bookedSlots.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>
          )}

          {/* Grille d'heures */}
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {timeSlots.map((time) => {
              const isAvailable = isTimeSlotAvailable(time);
              const isSelected = rangeStep === "start_time"
                ? selectedTime === time
                : selectedEndTime === time;

              return (
                <button
                  key={time}
                  disabled={!isAvailable}
                  onClick={() => {
                    if (rangeStep === "start_time") {
                      handleRangeStartTimeSelect(time);
                    } else {
                      handleRangeEndTimeSelect(time);
                    }
                  }}
                  className={cn(
                    "py-3 text-sm rounded-xl border-2 transition-all font-medium",
                    !isAvailable && "opacity-40 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-100",
                    isAvailable && isSelected
                      ? "border-primary bg-primary text-white"
                      : isAvailable && "border-gray-200 hover:border-primary hover:bg-primary/5"
                  )}
                >
                  {time}
                </button>
              );
            })}
          </div>

          {/* Bouton passer (optionnel) */}
          <button
            onClick={() => {
              if (rangeStep === "start_time") {
                setRangeStep("end_date");
              } else {
                setRangeStep("complete");
              }
            }}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Passer cette étape →
          </button>
        </div>
      )}

      {/* VUE RÉCAPITULATIF (étape 5) */}
      {rangeStep === "complete" && (
        <div className="space-y-4">
          {/* Résumé final */}
          <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">Période sélectionnée</p>
                  <button
                    onClick={() => goBackToStep("start_date")}
                    className="text-xs text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3" />
                    Modifier
                  </button>
                </div>
                <p className="font-semibold text-gray-900">
                  {formatDateDisplay(selectedDate!)} {selectedTime && `à ${selectedTime}`}
                  <ArrowRight className="w-4 h-4 inline mx-2 text-gray-400" />
                  {formatDateDisplay(selectedEndDate!)} {selectedEndTime && `à ${selectedEndTime}`}
                </p>
              </div>
            </div>
            {days >= 1 && (
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full font-medium">
                  {(() => {
                    // Si on a des infos de facturation avec demi-journées
                    const isHalfDayBilling = billingInfo?.billingUnit === "half_day" || billingInfo?.billingUnit === "day" ||
                      billingInfo?.firstDayIsHalfDay || billingInfo?.lastDayIsHalfDay ||
                      clientBillingMode === "round_half_day";

                    if (isHalfDayBilling && billingInfo) {
                      const fullDays = billingInfo.fullDays ?? 0;
                      const halfDays = billingInfo.halfDays ?? 0;

                      const parts: string[] = [];
                      if (fullDays > 0) {
                        parts.push(`${fullDays} journée${fullDays > 1 ? "s" : ""}`);
                      }
                      if (halfDays > 0) {
                        parts.push(`${halfDays} demi-journée${halfDays > 1 ? "s" : ""}`);
                      }

                      return parts.length > 0 ? parts.join(" + ") : `${days} jour${days > 1 ? "s" : ""}`;
                    }

                    // Affichage par défaut en jours
                    return `${days} jour${days > 1 ? "s" : ""}`;
                  })()}
                </span>
                {nights > 0 && includeOvernightStay && (
                  <span className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-full font-medium">
                    {nights} nuit{nights > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Option garde de nuit */}
          {days > 1 && allowOvernightStay && overnightPrice && (
            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={includeOvernightStay}
                onChange={(e) => onOvernightChange(e.target.checked)}
                className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
              />
              <Moon className="w-4 h-4 text-indigo-500" />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">Garde de nuit</span>
                <span className="ml-2 text-xs text-gray-500">
                  {nights} nuit{nights > 1 ? "s" : ""} · {formatPrice(overnightPrice)}/nuit
                </span>
              </div>
            </label>
          )}

        </div>
      )}

      {/* Mobile Time Pickers (pour le mode non-garde uniquement, gardé pour compatibilité) */}
      {typeof document !== "undefined" && createPortal(
        <>
          <MobileTimePicker
            isOpen={showStartTimePicker}
            onClose={() => setShowStartTimePicker(false)}
            onSelect={(time) => { handleTimeSelect(time); setShowStartTimePicker(false); }}
            selectedTime={selectedTime}
            availableTimes={timeSlots}
            disabledTimes={timeSlots.filter((t) => !isTimeSlotAvailable(t))}
            title="Heure de début"
            accentColor="primary"
          />
          {selectedTime && !enableDurationBasedBlocking && (
            <MobileTimePicker
              isOpen={showEndTimePicker}
              onClose={() => setShowEndTimePicker(false)}
              onSelect={(time) => { onEndTimeSelect(time); setShowEndTimePicker(false); }}
              selectedTime={selectedEndTime}
              availableTimes={getEndTimeSlots()}
              disabledTimes={[]}
              title="Heure de fin"
              accentColor="secondary"
            />
          )}
        </>,
        document.body
      )}
    </div>
  );
}
