"use client";

import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Calendar, Clock, Moon, Sun, Users, ChevronRight, Check } from "lucide-react";
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
  onDateSelect: (date: string) => void;
  onEndDateSelect: (date: string | null) => void;
  onTimeSelect: (time: string) => void;
  onEndTimeSelect: (time: string) => void;
  onOvernightChange: (include: boolean) => void;
  onMonthChange: (date: Date) => void;
}

// Délai minimum de réservation (en heures)
const MIN_BOOKING_LEAD_TIME_HOURS = 2;

// Helper functions
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
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
      const status = isPast ? "past" : availability?.status || "available";

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
    // Vérifier d'abord si le créneau est réservable (pas passé + délai minimum 2h)
    if (selectedDate && !isSlotBookable(selectedDate, startTime)) {
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
  if (!isRangeMode) {
    return (
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Créneau
          </h3>
          <div className="flex items-center gap-2 text-[10px]">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-gray-200" />
              <span className="text-gray-400">Indispo</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-white border border-gray-300" />
              <span className="text-gray-400">Dispo</span>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="mb-4">
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
          <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
              <div key={d} className="py-2 text-gray-500 font-medium">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">{generateCalendarDays()}</div>
        </div>

        {/* Time Selection for non-range mode */}
        {selectedDate && (
          <div className="space-y-4">
            <div className="mb-4 flex items-center gap-2 text-sm">
              <span className="text-gray-900 font-medium">{formatDateDisplay(selectedDate)}</span>
            </div>

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

            <div>
              <p className="text-sm font-medium text-gray-900 mb-2">Heure de début</p>
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
              <div className="hidden sm:grid grid-cols-6 gap-2">
                {timeSlots.map((time) => {
                  const isAvailable = isTimeSlotAvailable(time);
                  return (
                    <button
                      key={time}
                      disabled={!isAvailable}
                      onClick={() => handleTimeSelect(time)}
                      className={cn(
                        "py-2 text-sm rounded-lg border transition-colors",
                        !isAvailable && "opacity-40 cursor-not-allowed bg-gray-100 text-gray-400",
                        isAvailable && selectedTime === time
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : isAvailable && "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedTime && enableDurationBasedBlocking && variantDuration ? (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span className="font-medium text-amber-800">
                    Durée : {variantDuration >= 60 ? `${Math.floor(variantDuration / 60)}h${variantDuration % 60 > 0 ? variantDuration % 60 : ""}` : `${variantDuration}min`}
                  </span>
                </div>
                <p className="text-xs text-amber-600 mt-1">Créneau : {selectedTime} → {calculatedEndTime}</p>
              </div>
            ) : selectedTime ? (
              <div>
                <p className="text-sm font-medium text-gray-900 mb-2">Heure de fin</p>
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
                <div className="hidden sm:grid grid-cols-6 gap-2">
                  {getEndTimeSlots().map((time) => {
                    const startMinutes = parseTimeToMinutes(selectedTime);
                    const endMinutes = parseTimeToMinutes(time);
                    const hasConflict = bookedSlots.some((slot) => {
                      const bookedStart = parseTimeToMinutes(slot.startTime);
                      const bookedEnd = parseTimeToMinutes(slot.endTime);
                      return startMinutes < bookedEnd && endMinutes > bookedStart;
                    });
                    const isEndTimeAvailable = !hasConflict;
                    return (
                      <button
                        key={time}
                        disabled={!isEndTimeAvailable}
                        onClick={() => onEndTimeSelect(time)}
                        className={cn(
                          "py-2 text-sm rounded-lg border transition-colors",
                          !isEndTimeAvailable && "opacity-40 cursor-not-allowed bg-gray-100 text-gray-400",
                          isEndTimeAvailable && selectedEndTime === time
                            ? "border-secondary bg-secondary/10 text-secondary font-medium"
                            : isEndTimeAvailable && "border-gray-200 hover:border-gray-300"
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
              <div className="p-3 bg-primary/5 rounded-xl">
                <div className="flex items-center gap-2 text-sm text-gray-900">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="font-medium">Durée: {calculateDuration(selectedTime, selectedEndTime)}</span>
                  <span className="text-gray-500">({selectedTime} → {selectedEndTime})</span>
                </div>
              </div>
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
              <div>
                <p className="text-sm text-gray-600">Période sélectionnée</p>
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

          {/* Bouton modifier */}
          <button
            onClick={() => goBackToStep("start_date")}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Modifier les dates
          </button>
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
