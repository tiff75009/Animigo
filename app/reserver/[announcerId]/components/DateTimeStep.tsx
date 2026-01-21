"use client";

import { ArrowLeft, ArrowRight, Calendar, Clock, Moon, Sun } from "lucide-react";
import { cn } from "@/app/lib/utils";
import type { ServiceDetail, ServiceVariant } from "./FormulaStep";

interface DateTimeStepProps {
  selectedService: ServiceDetail;
  selectedVariant: ServiceVariant;
  selectedDate: string | null;
  selectedEndDate: string | null;
  selectedTime: string | null;
  selectedEndTime: string | null;
  includeOvernightStay: boolean;
  calendarMonth: Date;
  availabilityCalendar: Array<{ date: string; status: string }> | undefined;
  isRangeMode: boolean;
  days: number;
  nights: number;
  onDateSelect: (date: string) => void;
  onEndDateSelect: (date: string | null) => void;
  onTimeSelect: (time: string) => void;
  onEndTimeSelect: (time: string) => void;
  onOvernightChange: (include: boolean) => void;
  onMonthChange: (date: Date) => void;
}

// Helper functions
function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// Parse time string to minutes for comparison
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// Calculate duration between two times
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

// Available time slots for start time
const TIME_SLOTS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
];

// Extended time slots for end time (includes later hours)
const EXTENDED_TIME_SLOTS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
];

export default function DateTimeStep({
  selectedService,
  selectedVariant,
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
  onDateSelect,
  onEndDateSelect,
  onTimeSelect,
  onEndTimeSelect,
  onOvernightChange,
  onMonthChange,
}: DateTimeStepProps) {
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

  // Get available end time slots (after selected start time)
  const getEndTimeSlots = () => {
    if (!selectedTime) return [];
    const startMinutes = parseTimeToMinutes(selectedTime);
    return EXTENDED_TIME_SLOTS.filter((time) => {
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

    // Get today's date string in YYYY-MM-DD format (local timezone)
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
      // Compare date strings directly to avoid timezone issues
      const isPast = dateStr < todayStr;
      const availability = availabilityCalendar?.find(
        (a) => a.date === dateStr
      );
      const status = isPast
        ? "past"
        : availability?.status || "available";

      const isSelected = selectedDate === dateStr;
      const isEndSelected = selectedEndDate === dateStr;
      const isInRange =
        isRangeMode &&
        selectedDate &&
        selectedEndDate &&
        dateStr > selectedDate &&
        dateStr < selectedEndDate;

      elements.push(
        <button
          key={dateStr}
          disabled={status === "past" || status === "unavailable"}
          onClick={() => handleDateClick(dateStr)}
          className={cn(
            "aspect-square flex items-center justify-center text-sm rounded-lg transition-colors",
            status === "past" && "text-gray-300 cursor-not-allowed",
            status === "unavailable" &&
              "text-gray-300 bg-gray-50 cursor-not-allowed",
            status === "partial" && "text-amber-600 bg-amber-50",
            status === "available" && "hover:bg-gray-100",
            (isSelected || isEndSelected) &&
              "bg-primary text-white hover:bg-primary",
            isInRange && "bg-primary/20"
          )}
        >
          {d}
        </button>
      );
    }

    return elements;
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <h2 className="text-lg font-bold text-foreground mb-4">
        {isRangeMode ? "Choisissez vos dates" : "Choisissez votre créneau"}
      </h2>

      {/* Selected Formula Recap */}
      <div className="mb-4 p-3 bg-primary/5 rounded-xl">
        <p className="text-sm text-text-light">Prestation sélectionnée</p>
        <p className="font-semibold text-foreground">
          {selectedService.categoryIcon} {selectedService.categoryName} -{" "}
          {selectedVariant.name}
        </p>
      </div>

      {/* Calendar */}
      <div className="mb-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() =>
              onMonthChange(
                new Date(
                  calendarMonth.getFullYear(),
                  calendarMonth.getMonth() - 1
                )
              )
            }
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-foreground capitalize">
            {calendarMonth.toLocaleDateString("fr-FR", {
              month: "long",
              year: "numeric",
            })}
          </span>
          <button
            onClick={() =>
              onMonthChange(
                new Date(
                  calendarMonth.getFullYear(),
                  calendarMonth.getMonth() + 1
                )
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
            <div key={d} className="py-2 text-text-light font-medium">
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
            <span className="text-foreground font-medium">
              {formatDate(selectedDate)}
              {selectedEndDate && selectedEndDate !== selectedDate && (
                <> → {formatDate(selectedEndDate)}</>
              )}
            </span>
            {isRangeMode && days > 1 && (
              <span className="text-text-light">({days} jours)</span>
            )}
          </div>
        </div>
      )}

      {/* Time Selection - always available when date is selected */}
      {selectedDate && (
        <div className="space-y-4 mb-4">
          {/* Info for range mode */}
          {isRangeMode && (
            <p className="text-sm text-text-light">
              Optionnel : précisez les heures de début et fin de la prestation
            </p>
          )}

          {/* Start Time */}
          <div>
            <p className="text-sm font-medium text-foreground mb-2">
              Heure de début
            </p>
            <div className="grid grid-cols-5 gap-2">
              {TIME_SLOTS.map((time) => (
                <button
                  key={time}
                  onClick={() => onTimeSelect(time)}
                  className={cn(
                    "py-2 text-sm rounded-lg border transition-colors",
                    selectedTime === time
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* End Time (appears after start time is selected) */}
          {selectedTime && (
            <div>
              <p className="text-sm font-medium text-foreground mb-2">
                Heure de fin
              </p>
              <div className="grid grid-cols-5 gap-2">
                {getEndTimeSlots().map((time) => (
                  <button
                    key={time}
                    onClick={() => onEndTimeSelect(time)}
                    className={cn(
                      "py-2 text-sm rounded-lg border transition-colors",
                      selectedEndTime === time
                        ? "border-secondary bg-secondary/10 text-secondary font-medium"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Duration Display */}
          {selectedTime && selectedEndTime && (
            <div className="p-3 bg-primary/5 rounded-xl">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Clock className="w-4 h-4 text-primary" />
                <span className="font-medium">
                  Durée: {calculateDuration(selectedTime, selectedEndTime)}
                </span>
                <span className="text-text-light">
                  ({selectedTime} → {selectedEndTime})
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overnight Stay Option */}
      {isRangeMode && days > 1 && selectedService.allowOvernightStay && (
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
                {nights} nuit{nights > 1 ? "s" : ""} ×{" "}
                {formatPrice(
                  selectedVariant.pricing?.nightly ||
                    selectedService.overnightPrice ||
                    0
                )}
              </p>
              {selectedService.dayStartTime && selectedService.dayEndTime && (
                <p className="text-xs text-indigo-500 mt-1 flex items-center gap-1">
                  <Sun className="w-3 h-3" />
                  Journées: {selectedService.dayStartTime} -{" "}
                  {selectedService.dayEndTime}
                </p>
              )}
            </div>
          </label>
        </div>
      )}
    </div>
  );
}
