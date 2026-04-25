"use client";

import { useMemo, useState, useEffect, memo } from "react";
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

export default memo(function BookingCalendar({
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

  // État pour le hover preview du range (style hôtel)
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

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

  // Handle date click — logique range Airbnb (un seul calendrier)
  const handleDateClick = (dateStr: string) => {
    if (isRangeMode) {
      // Cas 1 : pas de date de début → on définit le début
      if (!selectedDate) {
        onDateSelect(dateStr);
        onEndDateSelect(null);
        return;
      }

      // Cas 2 : date de début seulement, click >= début → on définit la fin
      if (selectedDate && !selectedEndDate && dateStr >= selectedDate) {
        onEndDateSelect(dateStr);
        return;
      }

      // Cas 3 : date de début seulement, click < début → on redéfinit le début
      if (selectedDate && !selectedEndDate && dateStr < selectedDate) {
        onDateSelect(dateStr);
        onEndDateSelect(null);
        return;
      }

      // Cas 4 : plage complète, on reset et on définit un nouveau début
      if (selectedDate && selectedEndDate) {
        onDateSelect(dateStr);
        onEndDateSelect(null);
        onTimeSelect("");
        onEndTimeSelect("");
        return;
      }
    } else {
      // Mode services : changement de date → reset des heures si date différente
      if (selectedDate !== dateStr) {
        onTimeSelect("");
        onEndTimeSelect("");
      }
      onDateSelect(dateStr);
      onEndDateSelect(null);
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
  const generateCalendarDays = (monthOverride?: Date) => {
    const month = monthOverride ?? calendarMonth;
    const firstDay = new Date(
      month.getFullYear(),
      month.getMonth(),
      1
    );
    const lastDay = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
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
      const dateStr = `${month.getFullYear()}-${String(
        month.getMonth() + 1
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
      // Hover preview : quand on a une date d'arrivée mais pas de départ, surligner la plage potentielle
      const isInHoverPreview =
        isRangeMode &&
        selectedDate &&
        !selectedEndDate &&
        hoveredDate &&
        hoveredDate > selectedDate &&
        dateStr > selectedDate &&
        dateStr < hoveredDate;
      const isHoveredEnd =
        isRangeMode &&
        selectedDate &&
        !selectedEndDate &&
        hoveredDate === dateStr &&
        dateStr > selectedDate;

      const isDisabled =
        status === "past" ||
        (status === "unavailable" && (!hasCapacityInfo || remainingCapacity === 0));

      // Couleur indicateur palette sobre
      const getCapacityDotColor = (): string | null => {
        if (!hasCapacityInfo) return null;
        if (remainingCapacity === 0) return "#c45656";
        if (remainingCapacity < (maxAnimalsPerSlot ?? 1)) return "#c9a14a";
        return "#2f4a3f";
      };
      const capacityDotColor = getCapacityDotColor();
      const isHighlighted = isSelected || isEndSelected;
      const isToday = dateStr === todayStr;

      // Style hôtel : noir avec opacité sur la plage, noir plein sur les extrémités
      const RANGE_BG = "rgba(31,31,29,0.10)";
      const ENDPOINT_BG = "#1f1f1d";

      // Range visuel = plage confirmée OU hover preview (style hôtel)
      const isRangeVisible = isInRange || isInHoverPreview;
      // Bandeaux étendus pour la continuité visuelle
      const showRightBandFromStart =
        isSelected && (selectedEndDate || (hoveredDate && hoveredDate > dateStr));
      const showLeftBandToEnd =
        (isEndSelected && selectedDate && selectedDate !== dateStr) ||
        (isHoveredEnd && selectedDate && selectedDate !== dateStr);

      elements.push(
        <div
          key={dateStr}
          className="relative aspect-square"
          onMouseEnter={() => !isDisabled && setHoveredDate(dateStr)}
          onMouseLeave={() => setHoveredDate(null)}
        >
          {/* Plage : fond noir 10% (confirmée ou hover preview) */}
          {isRangeVisible && (
            <div className="absolute inset-0" style={{ background: RANGE_BG }} />
          )}
          {/* Bandeau partant de la date d'arrivée vers la droite */}
          {showRightBandFromStart && (
            <div
              className="absolute inset-y-0 right-0 w-1/2"
              style={{ background: RANGE_BG }}
            />
          )}
          {/* Bandeau venant de la gauche jusqu'à la date de départ */}
          {showLeftBandToEnd && (
            <div
              className="absolute inset-y-0 left-0 w-1/2"
              style={{ background: RANGE_BG }}
            />
          )}

          <button
            disabled={isDisabled}
            onClick={() => handleDateClick(dateStr)}
            className={cn(
              "group relative w-full h-full flex flex-col items-center justify-center rounded-full transition-all",
              !isDisabled && !isHighlighted && !isRangeVisible && !isHoveredEnd && "hover:bg-[#1f1f1d] hover:text-white",
              !isDisabled && isRangeVisible && "hover:bg-[rgba(31,31,29,0.20)]"
            )}
            style={{
              background: isHighlighted || isHoveredEnd ? ENDPOINT_BG : "transparent",
              color: isHighlighted || isHoveredEnd
                ? "#fff"
                : status === "past"
                  ? "#cdc9c0"
                  : (status === "unavailable" && !hasCapacityInfo) ||
                      (hasCapacityInfo && remainingCapacity === 0)
                    ? "#cdc9c0"
                    : "#1f1f1d",
              cursor: isDisabled ? "not-allowed" : "pointer",
              textDecoration:
                status === "unavailable" && !hasCapacityInfo && !isHighlighted
                  ? "line-through"
                  : "none",
            }}
          >
            {isToday && !isHighlighted && (
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{ border: "1px solid #1f1f1d" }}
              />
            )}
            <span
              className="text-[14px]"
              style={{ fontWeight: isHighlighted ? 600 : isToday ? 600 : 400 }}
            >
              {d}
            </span>

            {hasCapacityInfo && !isHighlighted && status !== "past" && (
              <div
                className="w-1 h-1 rounded-full mt-0.5 transition-opacity group-hover:opacity-0"
                style={{ background: capacityDotColor || "transparent" }}
              />
            )}

            {hasCapacityInfo && remainingCapacity > 0 && !isHighlighted && (
              <span
                className="text-[9px] leading-none font-semibold transition-opacity group-hover:opacity-0"
                style={{
                  color: remainingCapacity < (maxAnimalsPerSlot ?? 1) ? "#c9a14a" : "#2f4a3f",
                }}
              >
                {remainingCapacity}
              </span>
            )}
          </button>
        </div>
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

      // Couleur de l'indicateur (palette sobre alignée cards)
      const getIndicatorColor = (): string | null => {
        if (isPast) return null;
        if (isSelected) return null;
        if (status === "unavailable") return "#c45656";
        if (status === "partial") return "#c9a14a";
        return "#2f4a3f";
      };
      const indicatorColor = getIndicatorColor();

      elements.push(
        <button
          key={dateStr}
          disabled={isDisabled}
          onClick={() => handleDateClick(dateStr)}
          className={cn(
            "group relative aspect-square flex flex-col items-center justify-center rounded-full transition-all",
            !isDisabled && !isSelected && "hover:bg-[#1f1f1d] hover:text-white",
            !isDisabled && "cursor-pointer"
          )}
          style={{
            background: isSelected ? "#1f1f1d" : "transparent",
            color: isSelected
              ? "#fff"
              : isPast
                ? "#cdc9c0"
                : status === "unavailable"
                  ? "#cdc9c0"
                  : "#1f1f1d",
            cursor: isDisabled ? "not-allowed" : "pointer",
            textDecoration: status === "unavailable" && !isPast && !isSelected ? "line-through" : "none",
          }}
        >
          {isToday && !isSelected && (
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ border: "1px solid #1f1f1d" }}
            />
          )}
          <span
            className="text-[14px]"
            style={{ fontWeight: isSelected ? 600 : isToday ? 600 : 400 }}
          >
            {d}
          </span>

          {indicatorColor && !isPast && (
            <div
              className="w-1 h-1 rounded-full mt-0.5 transition-opacity group-hover:opacity-0"
              style={{ background: indicatorColor }}
            />
          )}
        </button>
      );
    }

    return elements;
  };

  if (!isRangeMode) {
    // Sous-titre dynamique selon l'état
    const headerSubtitle = (() => {
      if (!selectedDate) return "Sélectionnez une date disponible";
      if (!selectedTime) return `Date choisie · ${formatDateFull(selectedDate)} — sélectionnez une heure`;
      if (!enableDurationBasedBlocking && !selectedEndTime) return `Sélectionnez une heure de fin`;
      return `${formatDateFull(selectedDate)} — créneau complet`;
    })();

    // Réinitialiser complètement
    const handleResetSelection = () => {
      onDateSelect("");
      onTimeSelect("");
      onEndTimeSelect("");
    };

    return (
      <div
        className="bg-white p-[18px]"
        style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-1">
              Étape · Date &amp; heure
            </div>
            <h3 className="text-base font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
              Choisissez votre créneau
            </h3>
            <p className="text-[12px] text-[#6d6d68] mt-1">{headerSubtitle}</p>
          </div>
          {(selectedDate || selectedTime) && (
            <button
              onClick={handleResetSelection}
              className="text-[11px] font-medium hover:underline inline-flex items-center gap-1 flex-shrink-0 mt-1"
              style={{ color: "#1f3a33" }}
            >
              <X className="w-3 h-3" />
              Effacer
            </button>
          )}
        </div>

        {/* Pavé Date sélectionnée (style Airbnb) - cliquable pour reset */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => {
              if (selectedDate) {
                onDateSelect("");
                onTimeSelect("");
                onEndTimeSelect("");
              }
            }}
            className="w-full text-left p-3 transition-all hover:bg-[#fafafa]"
            style={{
              borderRadius: 12,
              border: `1px solid ${!selectedDate ? "#1f1f1d" : selectedDate ? "#dfdcd4" : "#ece9e1"}`,
              background: "#fff",
            }}
          >
            <div
              className="text-[10px] font-medium uppercase tracking-[0.1em] mb-0.5"
              style={{ color: !selectedDate ? "#1f1f1d" : "#9c9484" }}
            >
              Date
            </div>
            <div
              className="text-[13.5px] font-semibold tracking-[-0.01em]"
              style={{ color: selectedDate ? "#1f1f1d" : "#cdc9c0" }}
            >
              {selectedDate ? formatDateFull(selectedDate) : "Choisissez une date dans le calendrier"}
            </div>
          </button>
        </div>

        {/* Calendrier - toujours visible */}
        <div className="bg-white mb-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => onMonthChange(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
              className="w-8 h-8 inline-flex items-center justify-center rounded-full transition-colors hover:bg-[#f7f5ef]"
              aria-label="Mois précédent"
            >
              <ArrowLeft className="w-4 h-4" style={{ color: "#1f1f1d" }} />
            </button>
            <span className="text-[15px] font-semibold capitalize tracking-[-0.01em] text-[#1f1f1d]">
              {calendarMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
            </span>
            <button
              onClick={() => onMonthChange(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
              className="w-8 h-8 inline-flex items-center justify-center rounded-full transition-colors hover:bg-[#f7f5ef]"
              aria-label="Mois suivant"
            >
              <ArrowRight className="w-4 h-4" style={{ color: "#1f1f1d" }} />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
              <div
                key={`${d}-${i}`}
                className="py-2 text-center text-[11px]"
                style={{ color: "#6d6d68", fontWeight: 500 }}
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">{generateCalendarDaysEnhanced()}</div>

          {/* Légende */}
          <div
            className="flex flex-wrap items-center justify-center gap-3 pt-4 mt-2"
            style={{ borderTop: "1px solid #f1ede3" }}
          >
            <LegendItem color="#2f4a3f" label="Libre" />
            <LegendItem color="#c9a14a" label="Partiel" />
            <LegendItem color="#c45656" label="Complet" />
          </div>
        </div>

        {/* SECTION HORAIRES — visible uniquement si date sélectionnée */}
        {selectedDate && (
          <div
            className="mt-5 pt-5 space-y-3"
            style={{ borderTop: "1px solid #f1ede3" }}
          >
            <div className="mb-1">
              <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-1">
                Horaires
              </div>
              <h4 className="text-[14px] font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
                {enableDurationBasedBlocking
                  ? "Heure de début"
                  : "Heures de début et de fin"}
              </h4>
            </div>

            {bookedSlots.length > 0 && (
              <div
                className="p-2.5 text-[12px]"
                style={{
                  borderRadius: 10,
                  background: "#f7f5ef",
                  border: "1px solid #ece9e1",
                  color: "#3a3a38",
                }}
              >
                <span className="font-medium text-[#1f1f1d]">Créneaux réservés : </span>
                {bookedSlots.map((slot, i) => (
                  <span key={i} className="font-medium" style={{ color: "#c45656" }}>
                    {slot.startTime}-{slot.endTime}{i < bookedSlots.length - 1 ? ", " : ""}
                  </span>
                ))}
              </div>
            )}

            {enableDurationBasedBlocking && variantDuration && (
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
            )}

            {/* Heure de début + (heure de fin si non duration-based) */}
            {enableDurationBasedBlocking ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: "#9c9484" }}>
                    Début
                  </div>
                  {selectedTime && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{ background: "#1f1f1d", color: "#fff" }}
                    >
                      {selectedTime}
                    </span>
                  )}
                </div>

                {/* Mobile button */}
                <button
                  onClick={() => setShowStartTimePicker(true)}
                  className="w-full p-3 transition-colors flex items-center justify-between sm:hidden hover:bg-[#fafafa]"
                  style={{
                    borderRadius: 12,
                    border: `1px solid ${selectedTime ? "#1f1f1d" : "#dfdcd4"}`,
                    background: "#fff",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4" style={{ color: selectedTime ? "#1f1f1d" : "#9c9484" }} />
                    <span
                      className="text-[14px] font-semibold tracking-[-0.01em]"
                      style={{ color: selectedTime ? "#1f1f1d" : "#9c9484" }}
                    >
                      {selectedTime || "Sélectionner une heure"}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4" style={{ color: "#9c9484" }} />
                </button>

                <div className="hidden sm:block">
                  <TimeGrid
                    times={timeSlots}
                    isAvailable={isTimeSlotAvailable}
                    selectedTime={selectedTime}
                    onSelect={handleTimeSelect}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Heure de début */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: "#9c9484" }}>
                      Début
                    </div>
                    {selectedTime && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{ background: "#1f1f1d", color: "#fff" }}
                      >
                        {selectedTime}
                      </span>
                    )}
                  </div>
                  {/* Mobile button */}
                  <button
                    onClick={() => setShowStartTimePicker(true)}
                    className="w-full p-3 transition-colors flex items-center justify-between sm:hidden hover:bg-[#fafafa]"
                    style={{
                      borderRadius: 12,
                      border: `1px solid ${selectedTime ? "#1f1f1d" : "#dfdcd4"}`,
                      background: "#fff",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4" style={{ color: selectedTime ? "#1f1f1d" : "#9c9484" }} />
                      <span
                        className="text-[14px] font-semibold tracking-[-0.01em]"
                        style={{ color: selectedTime ? "#1f1f1d" : "#9c9484" }}
                      >
                        {selectedTime || "Sélectionner"}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4" style={{ color: "#9c9484" }} />
                  </button>
                  <div className="hidden sm:block">
                    <TimeGrid
                      times={timeSlots}
                      isAvailable={isTimeSlotAvailable}
                      selectedTime={selectedTime}
                      onSelect={handleTimeSelect}
                    />
                  </div>
                </div>

                {/* Heure de fin */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: "#9c9484" }}>
                      Fin
                    </div>
                    {selectedEndTime && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{ background: "#1f1f1d", color: "#fff" }}
                      >
                        {selectedEndTime}
                      </span>
                    )}
                  </div>
                  {/* Mobile button */}
                  <button
                    onClick={() => selectedTime && setShowEndTimePicker(true)}
                    disabled={!selectedTime}
                    className="w-full p-3 transition-colors flex items-center justify-between sm:hidden hover:bg-[#fafafa] disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      borderRadius: 12,
                      border: `1px solid ${selectedEndTime ? "#1f1f1d" : "#dfdcd4"}`,
                      background: "#fff",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4" style={{ color: selectedEndTime ? "#1f1f1d" : "#9c9484" }} />
                      <span
                        className="text-[14px] font-semibold tracking-[-0.01em]"
                        style={{ color: selectedEndTime ? "#1f1f1d" : "#9c9484" }}
                      >
                        {selectedEndTime || (selectedTime ? "Sélectionner" : "Choisir début d'abord")}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4" style={{ color: "#9c9484" }} />
                  </button>
                  <div className="hidden sm:block">
                    {selectedTime ? (
                      <TimeGrid
                        times={getEndTimeSlots()}
                        isAvailable={(time) => {
                          const startMinutes = parseTimeToMinutes(selectedTime);
                          const endMinutes = parseTimeToMinutes(time);
                          const effectiveStart = enableDurationBasedBlocking ? startMinutes - bufferBefore : startMinutes;
                          const effectiveEnd = enableDurationBasedBlocking ? endMinutes + bufferAfter : endMinutes;
                          const hasConflict = bookedSlots.some((slot) => {
                            const bookedStart = parseTimeToMinutes(slot.startTime);
                            const bookedEnd = parseTimeToMinutes(slot.endTime);
                            return effectiveStart < bookedEnd && effectiveEnd > bookedStart;
                          });
                          return !hasConflict;
                        }}
                        selectedTime={selectedEndTime}
                        onSelect={onEndTimeSelect}
                      />
                    ) : (
                      <p className="text-[12px] text-[#9c9484] py-3 text-center">
                        Choisissez une heure de début pour voir les heures de fin disponibles
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Confirmation finale */}
            {selectedTime && enableDurationBasedBlocking && variantDuration && (
              <ConfirmedSlot label="Créneau confirmé" value={`${selectedTime} → ${calculatedEndTime}`} />
            )}
            {selectedTime && selectedEndTime && !enableDurationBasedBlocking && (
              <ConfirmedSlot
                label="Créneau confirmé"
                value={`${selectedTime} → ${selectedEndTime} (${calculateDuration(selectedTime, selectedEndTime)})`}
              />
            )}
          </div>
        )}

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

  // Sous-titre dynamique selon l'état
  const headerSubtitle = (() => {
    if (!selectedDate) return "Sélectionnez votre date d'arrivée";
    if (selectedDate && !selectedEndDate) return "Sélectionnez votre date de départ";
    return "Définissez vos horaires d'arrivée et de départ";
  })();

  // Réinitialiser entièrement la sélection plage
  const resetRange = () => {
    onDateSelect("");
    onEndDateSelect(null);
    onTimeSelect("");
    onEndTimeSelect("");
  };

  return (
    <div
      className="bg-white p-[18px]"
      style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-1">
            Étape · Garde
          </div>
          <h3 className="text-base font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
            Dates &amp; horaires
          </h3>
          <p className="text-[12px] text-[#6d6d68] mt-1">{headerSubtitle}</p>
        </div>
        {(selectedDate || selectedEndDate) && (
          <button
            onClick={resetRange}
            className="text-[11px] font-medium hover:underline inline-flex items-center gap-1 flex-shrink-0 mt-1"
            style={{ color: "#1f3a33" }}
          >
            <X className="w-3 h-3" />
            Effacer
          </button>
        )}
      </div>

      {/* Récap dates style Airbnb : deux pavés Arrivée / Départ */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <DateSummaryPill
          label="Arrivée"
          date={selectedDate ? formatDateDisplay(selectedDate) : null}
          time={selectedTime || null}
          isActive={!selectedDate}
          onClick={() => {
            // Reset pour permettre de re-sélectionner
            onDateSelect("");
            onEndDateSelect(null);
          }}
        />
        <DateSummaryPill
          label="Départ"
          date={selectedEndDate ? formatDateDisplay(selectedEndDate) : null}
          time={selectedEndTime || null}
          isActive={Boolean(selectedDate) && !selectedEndDate}
          onClick={() => {
            if (selectedDate) onEndDateSelect(null);
          }}
        />
      </div>

      {/* Capacity info */}
      {isCapacityBased && maxAnimalsPerSlot && (
        <div
          className="mb-3 px-3 py-2 flex items-center gap-2"
          style={{ borderRadius: 10, background: "#eaf0ed", border: "1px solid #cfdbd3" }}
        >
          <Users className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#2f4a3f" }} />
          <p className="text-[12px]" style={{ color: "#2f4a3f" }}>
            Jusqu&apos;à <span className="font-semibold">{maxAnimalsPerSlot}</span> animaux par jour
          </p>
        </div>
      )}

      {/* CALENDRIER unifié (range picker style hôtel) */}
      <div className="bg-white mb-4">
        {/* Navigation entre mois (commune aux 2 calendriers) */}
        <div className="flex items-center justify-between mb-4 relative">
          <button
            onClick={() => onMonthChange(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
            className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-[#f7f5ef] transition-colors"
            aria-label="Mois précédent"
          >
            <ArrowLeft className="w-4 h-4" style={{ color: "#1f1f1d" }} />
          </button>
          {/* Titres mois (1 sur mobile, 2 sur desktop) */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <span className="text-[15px] font-semibold capitalize tracking-[-0.01em] text-[#1f1f1d] text-center">
              {calendarMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
            </span>
            <span className="hidden lg:block text-[15px] font-semibold capitalize tracking-[-0.01em] text-[#1f1f1d] text-center">
              {new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
            </span>
          </div>
          <button
            onClick={() => onMonthChange(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
            className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-[#f7f5ef] transition-colors"
            aria-label="Mois suivant"
          >
            <ArrowRight className="w-4 h-4" style={{ color: "#1f1f1d" }} />
          </button>
        </div>

        {/* 2 calendriers côte-à-côte sur desktop, 1 seul sur mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mois courant */}
          <div>
            <div className="grid grid-cols-7 mb-2">
              {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                <div
                  key={`${d}-${i}-1`}
                  className="py-2 text-center text-[11px]"
                  style={{ color: "#6d6d68", fontWeight: 500 }}
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">{generateCalendarDays()}</div>
          </div>

          {/* Mois suivant (desktop uniquement) */}
          <div className="hidden lg:block">
            <div className="grid grid-cols-7 mb-2">
              {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                <div
                  key={`${d}-${i}-2`}
                  className="py-2 text-center text-[11px]"
                  style={{ color: "#6d6d68", fontWeight: 500 }}
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {generateCalendarDays(
                new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1)
              )}
            </div>
          </div>
        </div>

        {/* Légende */}
        <div
          className="flex flex-wrap items-center justify-center gap-3 pt-4 mt-4"
          style={{ borderTop: "1px solid #f1ede3" }}
        >
          {isCapacityBased ? (
            <>
              <LegendItem color="#2f4a3f" label="Libre" />
              <LegendItem color="#c9a14a" label="Partiel" />
              <LegendItem color="#c45656" label="Complet" />
            </>
          ) : (
            <>
              <LegendCellSample variant="available" label="Disponible" />
              <LegendCellSample variant="unavailable" label="Indisponible" />
            </>
          )}
        </div>
      </div>

      {/* SECTION HORAIRES — visible uniquement si plage sélectionnée */}
      {selectedDate && selectedEndDate && (
        <div
          className="mt-5 pt-5"
          style={{ borderTop: "1px solid #f1ede3" }}
        >
          <div className="mb-3">
            <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-1">
              Horaires
            </div>
            <h4 className="text-[14px] font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
              Heures d&apos;arrivée et de départ
            </h4>
          </div>

          {/* Bandeau créneaux réservés */}
          {bookedSlots.length > 0 && (
            <div
              className="p-2.5 text-[12px] mb-3"
              style={{
                borderRadius: 10,
                background: "#f7f5ef",
                border: "1px solid #ece9e1",
                color: "#3a3a38",
              }}
            >
              <span className="font-medium text-[#1f1f1d]">Créneaux réservés : </span>
              {bookedSlots.map((slot, i) => (
                <span key={i} style={{ color: "#c45656" }} className="font-medium">
                  {slot.startTime}-{slot.endTime}{i < bookedSlots.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>
          )}

          {/* Deux blocs heure côte-à-côte */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Heure d'arrivée */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: "#9c9484" }}>
                  Arrivée
                </div>
                {selectedTime && (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{ background: "#1f1f1d", color: "#fff" }}
                  >
                    {selectedTime}
                  </span>
                )}
              </div>
              <TimeGrid
                times={timeSlots}
                isAvailable={isTimeSlotAvailable}
                selectedTime={selectedTime}
                onSelect={handleRangeStartTimeSelect}
              />
            </div>

            {/* Heure de départ */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: "#9c9484" }}>
                  Départ
                </div>
                {selectedEndTime && (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{ background: "#1f1f1d", color: "#fff" }}
                  >
                    {selectedEndTime}
                  </span>
                )}
              </div>
              <TimeGrid
                times={timeSlots}
                isAvailable={isTimeSlotAvailable}
                selectedTime={selectedEndTime}
                onSelect={handleRangeEndTimeSelect}
              />
            </div>
          </div>
        </div>
      )}

      {/* RÉCAPITULATIF — visible quand tout est sélectionné */}
      {selectedDate && selectedEndDate && selectedTime && selectedEndTime && (
        <div className="space-y-3 mt-5 pt-5" style={{ borderTop: "1px solid #f1ede3" }}>
          <div
            className="p-4"
            style={{ borderRadius: 12, background: "#f5f9f6", border: "1px solid #cfdbd3" }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "#fff", border: "1px solid #cfdbd3" }}
              >
                <Calendar className="w-4 h-4" style={{ color: "#1f3a33" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484]">
                  Période sélectionnée
                </div>
                <p className="text-[13.5px] font-semibold text-[#1f1f1d] mt-0.5 tracking-[-0.01em]">
                  {formatDateDisplay(selectedDate)} à {selectedTime}
                  <ArrowRight className="w-3.5 h-3.5 inline mx-2" style={{ color: "#9c9484" }} />
                  {formatDateDisplay(selectedEndDate)} à {selectedEndTime}
                </p>
              </div>
            </div>
            {days >= 1 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ border: "1px solid #cfdbd3", color: "#2f4a3f", background: "#fff" }}
                >
                  {(() => {
                    const isHalfDayBilling = billingInfo?.billingUnit === "half_day" || billingInfo?.billingUnit === "day" ||
                      billingInfo?.firstDayIsHalfDay || billingInfo?.lastDayIsHalfDay ||
                      clientBillingMode === "round_half_day";

                    if (isHalfDayBilling && billingInfo) {
                      const fullDays = billingInfo.fullDays ?? 0;
                      const halfDays = billingInfo.halfDays ?? 0;
                      const parts: string[] = [];
                      if (fullDays > 0) parts.push(`${fullDays} journée${fullDays > 1 ? "s" : ""}`);
                      if (halfDays > 0) parts.push(`${halfDays} demi-journée${halfDays > 1 ? "s" : ""}`);
                      return parts.length > 0 ? parts.join(" + ") : `${days} jour${days > 1 ? "s" : ""}`;
                    }
                    return `${days} jour${days > 1 ? "s" : ""}`;
                  })()}
                </span>
                {nights > 0 && includeOvernightStay && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{ border: "1px solid #dfdcd4", color: "#3a3a38", background: "#fff" }}
                  >
                    <Moon className="w-2.5 h-2.5" />
                    {nights} nuit{nights > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Option garde de nuit */}
          {days > 1 && allowOvernightStay && overnightPrice && (
            <label
              className="flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-[#f7f5ef]"
              style={{ borderRadius: 12, background: "#fff", border: "1px solid #ece9e1" }}
            >
              <input
                type="checkbox"
                checked={includeOvernightStay}
                onChange={(e) => onOvernightChange(e.target.checked)}
                className="w-4 h-4 rounded border-[#dfdcd4]"
                style={{ accentColor: "#1f3a33" }}
              />
              <Moon className="w-4 h-4" style={{ color: "#6d6d68" }} />
              <div className="flex-1">
                <span className="text-[13.5px] font-semibold text-[#1f1f1d] tracking-[-0.01em]">
                  Garde de nuit
                </span>
                <span className="ml-2 text-[11px] text-[#6d6d68]">
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
});

// ──────────────────────────────────────────────────────────────────
// Sous-composants UI raffinés (palette cards de recherche)
// ──────────────────────────────────────────────────────────────────

/**
 * Pavé "Arrivée" / "Départ" en haut du calendrier (style Airbnb).
 * Affiche label, date et heure si disponibles. Sinon placeholder.
 * Cliquable pour repositionner le focus.
 */
function DateSummaryPill({
  label,
  date,
  time,
  isActive,
  onClick,
}: {
  label: string;
  date: string | null;
  time: string | null;
  isActive: boolean;
  onClick: () => void;
}) {
  const filled = Boolean(date);
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left p-3 transition-all hover:bg-[#fafafa]"
      style={{
        borderRadius: 12,
        border: `1px solid ${isActive ? "#1f1f1d" : filled ? "#dfdcd4" : "#ece9e1"}`,
        background: "#fff",
      }}
    >
      <div
        className="text-[10px] font-medium uppercase tracking-[0.1em] mb-0.5"
        style={{ color: isActive ? "#1f1f1d" : "#9c9484" }}
      >
        {label}
      </div>
      <div
        className="text-[13.5px] font-semibold tracking-[-0.01em] truncate"
        style={{ color: filled ? "#1f1f1d" : "#cdc9c0" }}
      >
        {date || "Ajouter une date"}
      </div>
      {time && (
        <div className="text-[11px] mt-0.5" style={{ color: "#6d6d68" }}>
          à {time}
        </div>
      )}
    </button>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      <span className="text-[10px] font-medium" style={{ color: "#9c9484" }}>
        {label}
      </span>
    </div>
  );
}

/**
 * Échantillon de cellule pour la légende — reproduit fidèlement le rendu d'une case du calendrier.
 * Utilisé pour les modes sans dots (calendrier non-capacity).
 */
function LegendCellSample({
  variant,
  label,
}: {
  variant: "available" | "unavailable";
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-medium"
        style={{
          background: "transparent",
          color: variant === "available" ? "#1f1f1d" : "#cdc9c0",
          textDecoration: variant === "unavailable" ? "line-through" : "none",
        }}
      >
        15
      </div>
      <span className="text-[10px] font-medium" style={{ color: "#9c9484" }}>
        {label}
      </span>
    </div>
  );
}

/**
 * Grille horaire sectionnée (Matin · Après-midi · Soir) — cohérence avec la vue jours.
 * Chaque section a son eyebrow et un mini séparateur, comme une "ligne" du calendrier.
 */
function TimeGrid({
  times,
  isAvailable,
  selectedTime,
  onSelect,
}: {
  times: string[];
  isAvailable: (time: string) => boolean;
  selectedTime: string | null;
  onSelect: (time: string) => void;
}) {
  // Sectionner par tranche horaire
  const sections: Array<{ label: string; times: string[] }> = [
    { label: "Matin", times: [] },
    { label: "Après-midi", times: [] },
    { label: "Soir", times: [] },
  ];

  for (const t of times) {
    const h = parseInt(t.split(":")[0] ?? "0", 10);
    if (h < 12) sections[0].times.push(t);
    else if (h < 18) sections[1].times.push(t);
    else sections[2].times.push(t);
  }

  return (
    <div className="space-y-3">
      {sections.map((section) => {
        if (section.times.length === 0) return null;
        return (
          <div key={section.label}>
            <div
              className="flex items-center gap-2 mb-2"
              aria-label={section.label}
            >
              <span
                className="text-[10px] font-medium uppercase tracking-[0.1em]"
                style={{ color: "#9c9484" }}
              >
                {section.label}
              </span>
              <div className="flex-1 h-px" style={{ background: "#f1ede3" }} />
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
              {section.times.map((time) => (
                <TimeSlotButton
                  key={time}
                  time={time}
                  isAvailable={isAvailable(time)}
                  isSelected={selectedTime === time}
                  onSelect={() => onSelect(time)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TimeSlotButton({
  time,
  isAvailable,
  isSelected,
  onSelect,
}: {
  time: string;
  isAvailable: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!isAvailable}
      onClick={onSelect}
      className={cn(
        "py-2.5 text-[13px] rounded-full transition-all",
        isAvailable && !isSelected && "hover:border-[#1f1f1d] hover:bg-[#fafafa]"
      )}
      style={{
        border: `1px solid ${
          isSelected ? "#1f1f1d" : !isAvailable ? "#f1ede3" : "#dfdcd4"
        }`,
        background: isSelected ? "#1f1f1d" : "#fff",
        color: isSelected ? "#fff" : !isAvailable ? "#cdc9c0" : "#1f1f1d",
        fontWeight: isSelected ? 600 : 500,
        cursor: !isAvailable ? "not-allowed" : "pointer",
        textDecoration: !isAvailable ? "line-through" : "none",
        opacity: !isAvailable ? 0.5 : 1,
      }}
    >
      {time}
    </button>
  );
}

function ConfirmedSlot({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="p-3 flex items-center gap-3"
      style={{ borderRadius: 12, background: "#f5f9f6", border: "1px solid #cfdbd3" }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: "#1f3a33" }}
      >
        <Check className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: "#9c9484" }}>
          {label}
        </p>
        <p className="text-[13.5px] font-semibold text-[#1f1f1d] tracking-[-0.01em]">
          {value}
        </p>
      </div>
    </div>
  );
}
