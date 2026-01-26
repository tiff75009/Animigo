"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Calendar, Clock, Moon, Sun, Users, ChevronRight } from "lucide-react";
import { cn } from "@/app/lib/utils";
import type { CalendarEntry } from "./types";
import { formatDateDisplay } from "./pricing";
import MobileTimePicker from "./MobileTimePicker";

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

  // Handle date click
  const handleDateClick = (dateStr: string) => {
    if (isRangeMode) {
      if (!selectedDate || selectedEndDate) {
        onDateSelect(dateStr);
        onEndDateSelect(null);
      } else if (dateStr > selectedDate) {
        onEndDateSelect(dateStr);
      } else {
        onDateSelect(dateStr);
        onEndDateSelect(null);
      }
    } else {
      onDateSelect(dateStr);
      onEndDateSelect(null);
    }
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
            hasCapacityInfo &&
              remainingCapacity === 0 &&
              "text-gray-300 bg-red-50 cursor-not-allowed",
            hasCapacityInfo &&
              remainingCapacity > 0 &&
              remainingCapacity < (maxAnimalsPerSlot ?? 1) &&
              "text-emerald-700 bg-emerald-50 hover:bg-emerald-100",
            hasCapacityInfo &&
              remainingCapacity === (maxAnimalsPerSlot ?? 1) &&
              "hover:bg-gray-100",
            status === "partial" && !hasCapacityInfo && "text-amber-600 bg-amber-50",
            status === "available" && !hasCapacityInfo && "hover:bg-gray-100",
            (isSelected || isEndSelected) && "bg-primary text-white hover:bg-primary",
            isInRange && "bg-primary/20"
          )}
        >
          <span className={cn(status === "unavailable" && !hasCapacityInfo && "line-through")}>
            {d}
          </span>
          {hasCapacityInfo && remainingCapacity > 0 && !isSelected && !isEndSelected && (
            <span
              className={cn(
                "text-[10px] leading-none font-medium",
                remainingCapacity < (maxAnimalsPerSlot ?? 1)
                  ? "text-emerald-600"
                  : "text-gray-400"
              )}
            >
              {remainingCapacity} place{remainingCapacity > 1 ? "s" : ""}
            </span>
          )}
          {hasCapacityInfo && remainingCapacity === 0 && (
            <span className="text-[9px] leading-none text-red-400 font-medium">Complet</span>
          )}
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

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span className="p-2 bg-primary/10 rounded-lg">
          <Calendar className="w-5 h-5 text-primary" />
        </span>
        {isRangeMode ? "Choisissez vos dates" : "Choisissez votre créneau"}
      </h3>

      {/* Capacity info for garde services */}
      {isCapacityBased && maxAnimalsPerSlot && (
        <div className="mb-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
          <div className="flex items-start gap-2">
            <Users className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-800">
                Capacité maximale : {maxAnimalsPerSlot} animaux
              </p>
              <p className="text-xs text-emerald-600 mt-1">
                Le calendrier indique les places disponibles pour chaque jour.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Legend */}
      <div className="mb-4 flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-gray-100 border border-gray-200" />
          <span className="text-gray-500">Indisponible</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-amber-50 border border-amber-200" />
          <span className="text-gray-500">Partiel</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-white border border-gray-200" />
          <span className="text-gray-500">Disponible</span>
        </div>
      </div>

      {/* Calendar */}
      <div className="mb-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() =>
              onMonthChange(
                new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1)
              )
            }
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-gray-900 capitalize">
            {calendarMonth.toLocaleDateString("fr-FR", {
              month: "long",
              year: "numeric",
            })}
          </span>
          <button
            onClick={() =>
              onMonthChange(
                new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1)
              )
            }
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
            <div key={d} className="py-2 text-gray-500 font-medium">
              {d}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1">{generateCalendarDays()}</div>
      </div>

      {/* Selected Dates Display */}
      {selectedDate && (
        <div className="p-3 bg-gray-50 rounded-xl mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-gray-900 font-medium">
              {formatDateDisplay(selectedDate)}
              {selectedEndDate && selectedEndDate !== selectedDate && (
                <> → {formatDateDisplay(selectedEndDate)}</>
              )}
            </span>
            {isRangeMode && days > 1 && (
              <span className="text-gray-500">({days} jours)</span>
            )}
          </div>
        </div>
      )}

      {/* Time Selection */}
      {selectedDate && (
        <div className="space-y-4 mb-4">
          {isRangeMode && (
            <p className="text-sm text-gray-500">
              Optionnel : précisez les heures de début et fin
            </p>
          )}

          {/* Booked slots info */}
          {bookedSlots.length > 0 && (
            <div className="p-2 bg-gray-50 rounded-lg text-xs text-gray-600">
              <span className="font-medium">Créneaux réservés : </span>
              {bookedSlots.map((slot, i) => (
                <span key={i} className="text-red-500">
                  {slot.startTime}-{slot.endTime}
                  {i < bookedSlots.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>
          )}

          {/* Partial availability info */}
          {availableTimeSlots && availableTimeSlots.length > 0 && (
            <div className="p-2 bg-amber-50 rounded-lg text-xs text-amber-700">
              <span className="font-medium">Disponible uniquement : </span>
              {availableTimeSlots.map((slot, i) => (
                <span key={i}>
                  {slot.startTime}-{slot.endTime}
                  {i < availableTimeSlots.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>
          )}

          {/* Start Time */}
          <div>
            <p className="text-sm font-medium text-gray-900 mb-2">Heure de début</p>
            {/* Mobile: tap to open wheel picker */}
            <button
              onClick={() => setShowStartTimePicker(true)}
              className={cn(
                "w-full p-4 rounded-xl border-2 transition-colors flex items-center justify-between sm:hidden",
                selectedTime
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 bg-white"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  selectedTime ? "bg-primary/10" : "bg-gray-100"
                )}>
                  <Clock className={cn(
                    "w-5 h-5",
                    selectedTime ? "text-primary" : "text-gray-400"
                  )} />
                </div>
                <div className="text-left">
                  <p className="text-xs text-gray-500">Heure de début</p>
                  <p className={cn(
                    "text-lg font-semibold",
                    selectedTime ? "text-primary" : "text-gray-400"
                  )}>
                    {selectedTime || "Sélectionner"}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            {/* Desktop: grid */}
            <div className="hidden sm:grid grid-cols-6 gap-2">
              {timeSlots.map((time) => {
                const isAvailable = isTimeSlotAvailable(time);
                const isBooked = bookedSlots.some((slot) => {
                  const slotStart = parseTimeToMinutes(slot.startTime);
                  const slotEnd = parseTimeToMinutes(slot.endTime);
                  const timeMin = parseTimeToMinutes(time);
                  return timeMin >= slotStart && timeMin < slotEnd;
                });

                return (
                  <button
                    key={time}
                    disabled={!isAvailable}
                    onClick={() => handleTimeSelect(time)}
                    className={cn(
                      "py-2 text-sm rounded-lg border transition-colors",
                      !isAvailable &&
                        "opacity-40 cursor-not-allowed bg-gray-100 text-gray-400",
                      isBooked && "line-through bg-red-50 border-red-200 text-red-400",
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

          {/* End Time Selection */}
          {selectedTime && enableDurationBasedBlocking && variantDuration ? (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex items-center gap-2 text-sm text-gray-900">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="font-medium text-amber-800">
                  Durée : {variantDuration >= 60
                    ? `${Math.floor(variantDuration / 60)}h${variantDuration % 60 > 0 ? variantDuration % 60 : ""}`
                    : `${variantDuration}min`}
                </span>
              </div>
              <p className="text-xs text-amber-600 mt-1">
                Créneau : {selectedTime} → {calculatedEndTime}
              </p>
            </div>
          ) : selectedTime ? (
            <div>
              <p className="text-sm font-medium text-gray-900 mb-2">Heure de fin</p>
              {/* Mobile: tap to open wheel picker */}
              <button
                onClick={() => setShowEndTimePicker(true)}
                className={cn(
                  "w-full p-4 rounded-xl border-2 transition-colors flex items-center justify-between sm:hidden",
                  selectedEndTime
                    ? "border-secondary bg-secondary/5"
                    : "border-gray-200 bg-white"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    selectedEndTime ? "bg-secondary/10" : "bg-gray-100"
                  )}>
                    <Clock className={cn(
                      "w-5 h-5",
                      selectedEndTime ? "text-secondary" : "text-gray-400"
                    )} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-gray-500">Heure de fin</p>
                    <p className={cn(
                      "text-lg font-semibold",
                      selectedEndTime ? "text-secondary" : "text-gray-400"
                    )}>
                      {selectedEndTime || "Sélectionner"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
              {/* Desktop: grid */}
              <div className="hidden sm:grid grid-cols-6 gap-2">
                {getEndTimeSlots().map((time) => {
                  const startMinutes = parseTimeToMinutes(selectedTime);
                  const endMinutes = parseTimeToMinutes(time);

                  const hasConflict = bookedSlots.some((slot) => {
                    const bookedStart = parseTimeToMinutes(slot.startTime);
                    const bookedEnd = parseTimeToMinutes(slot.endTime);
                    return startMinutes < bookedEnd && endMinutes > bookedStart;
                  });

                  let isInAvailableRange = true;
                  if (availableTimeSlots && availableTimeSlots.length > 0) {
                    isInAvailableRange = availableTimeSlots.some((slot) => {
                      const slotStart = parseTimeToMinutes(slot.startTime);
                      const slotEnd = parseTimeToMinutes(slot.endTime);
                      return startMinutes >= slotStart && endMinutes <= slotEnd;
                    });
                  }

                  const isEndTimeAvailable = !hasConflict && isInAvailableRange;

                  return (
                    <button
                      key={time}
                      disabled={!isEndTimeAvailable}
                      onClick={() => onEndTimeSelect(time)}
                      className={cn(
                        "py-2 text-sm rounded-lg border transition-colors",
                        !isEndTimeAvailable &&
                          "opacity-40 cursor-not-allowed bg-gray-100 text-gray-400",
                        hasConflict && "line-through bg-red-50 border-red-200",
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

          {/* Duration Display */}
          {selectedTime && selectedEndTime && !enableDurationBasedBlocking && (
            <div className="p-3 bg-primary/5 rounded-xl">
              <div className="flex items-center gap-2 text-sm text-gray-900">
                <Clock className="w-4 h-4 text-primary" />
                <span className="font-medium">
                  Durée: {calculateDuration(selectedTime, selectedEndTime)}
                </span>
                <span className="text-gray-500">
                  ({selectedTime} → {selectedEndTime})
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overnight Stay Option */}
      {isRangeMode && days > 1 && allowOvernightStay && overnightPrice && (
        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeOvernightStay}
              onChange={(e) => onOvernightChange(e.target.checked)}
              className="mt-1 w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
            />
            <div>
              <p className="font-medium text-indigo-800 flex items-center gap-2">
                <Moon className="w-4 h-4" />
                Inclure la garde de nuit
              </p>
              <p className="text-sm text-indigo-600 mt-1">
                {nights} nuit{nights > 1 ? "s" : ""} × {formatPrice(overnightPrice)}
              </p>
              {dayStartTime && dayEndTime && (
                <p className="text-xs text-indigo-500 mt-1 flex items-center gap-1">
                  <Sun className="w-3 h-3" />
                  Journées: {dayStartTime} - {dayEndTime}
                </p>
              )}
            </div>
          </label>
        </div>
      )}

      {/* Mobile Time Pickers (Wheel Style) */}
      {typeof document !== "undefined" && createPortal(
        <>
          {/* Start Time Picker */}
          <MobileTimePicker
            isOpen={showStartTimePicker}
            onClose={() => setShowStartTimePicker(false)}
            onSelect={(time) => {
              handleTimeSelect(time);
              setShowStartTimePicker(false);
            }}
            selectedTime={selectedTime}
            availableTimes={timeSlots}
            disabledTimes={timeSlots.filter((time) => !isTimeSlotAvailable(time))}
            title="Heure de début"
            accentColor="primary"
          />

          {/* End Time Picker */}
          {selectedTime && !enableDurationBasedBlocking && (
            <MobileTimePicker
              isOpen={showEndTimePicker}
              onClose={() => setShowEndTimePicker(false)}
              onSelect={(time) => {
                onEndTimeSelect(time);
                setShowEndTimePicker(false);
              }}
              selectedTime={selectedEndTime}
              availableTimes={getEndTimeSlots()}
              disabledTimes={getEndTimeSlots().filter((time) => {
                const startMinutes = parseTimeToMinutes(selectedTime);
                const endMinutes = parseTimeToMinutes(time);
                const hasConflict = bookedSlots.some((slot) => {
                  const bookedStart = parseTimeToMinutes(slot.startTime);
                  const bookedEnd = parseTimeToMinutes(slot.endTime);
                  return startMinutes < bookedEnd && endMinutes > bookedStart;
                });
                return hasConflict;
              })}
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
