"use client";

import { useMemo } from "react";
import { ArrowLeft, ArrowRight, Calendar, Clock, Moon, Sun, Users, Info, CalendarCheck, CalendarDays } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { motion } from "framer-motion";
import type { ServiceDetail, ServiceVariant } from "./FormulaStep";

// Type pour les séances multi-sessions
interface SelectedSession {
  date: string;
  startTime: string;
  endTime: string;
}

// Type pour les créneaux collectifs
interface CollectiveSlotInfo {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  availableSpots: number;
}

// Type pour les entrées du calendrier avec capacité
interface CalendarEntry {
  date: string;
  status: string;
  capacity?: {
    current: number;
    max: number;
    remaining: number;
  };
  timeSlots?: Array<{ startTime: string; endTime: string }>;
  bookedSlots?: Array<{ startTime: string; endTime: string }>;
}

interface DateTimeStepProps {
  selectedService: ServiceDetail;
  selectedVariant: ServiceVariant;
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
  // Informations de capacité (pour les catégories de garde)
  isCapacityBased?: boolean;
  maxAnimalsPerSlot?: number;
  // Blocage basé sur la durée (la fin est calculée automatiquement)
  enableDurationBasedBlocking?: boolean;
  // Temps de préparation de l'annonceur (en minutes)
  bufferBefore?: number;
  bufferAfter?: number;
  // Horaires de disponibilité de l'annonceur
  acceptReservationsFrom?: string; // "08:00"
  acceptReservationsTo?: string;   // "20:00"
  // Support pour les formules collectives
  isCollectiveFormula?: boolean;
  collectiveSlots?: CollectiveSlotInfo[]; // Créneaux disponibles pour formules collectives
  selectedSlotIds?: string[];
  onSlotsSelected?: (slotIds: string[]) => void;
  // Support pour les formules individuelles multi-séances
  isMultiSessionIndividual?: boolean;
  selectedSessions?: SelectedSession[];
  onSessionsChange?: (sessions: SelectedSession[]) => void;
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

// Générer des créneaux horaires par intervalles
function generateTimeSlots(
  startHour: number,
  endHour: number,
  intervalMinutes: number = 30,
  excludeLunchBreak: boolean = false
): string[] {
  const slots: string[] = [];
  let currentMinutes = startHour * 60;
  const endMinutes = endHour * 60;

  while (currentMinutes <= endMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const minutes = currentMinutes % 60;

    // Exclure la pause déjeuner (12:30-13:30) si demandé
    const isLunchBreak = excludeLunchBreak && hours === 12 && minutes === 30;
    const isAfterLunch = excludeLunchBreak && hours === 13 && minutes === 0;

    if (!isLunchBreak && !isAfterLunch) {
      slots.push(
        `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
      );
    }

    currentMinutes += intervalMinutes;
  }

  return slots;
}

// Helper pour parser une heure "HH:MM" en heures décimales
function parseTimeToHour(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours + minutes / 60;
}

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
  isCapacityBased,
  maxAnimalsPerSlot,
  enableDurationBasedBlocking,
  bufferBefore = 0,
  bufferAfter = 0,
  acceptReservationsFrom = "08:00",
  acceptReservationsTo = "20:00",
  // Formules collectives
  isCollectiveFormula = false,
  collectiveSlots = [],
  selectedSlotIds = [],
  onSlotsSelected,
  // Formules multi-séances
  isMultiSessionIndividual = false,
  selectedSessions = [],
  onSessionsChange,
  onDateSelect,
  onEndDateSelect,
  onTimeSelect,
  onEndTimeSelect,
  onOvernightChange,
  onMonthChange,
}: DateTimeStepProps) {
  // Déterminer le type de formule
  const isCollective = isCollectiveFormula || selectedVariant.sessionType === "collective";
  const isMultiSession = isMultiSessionIndividual || (!isCollective && (selectedVariant.numberOfSessions || 1) > 1);
  const numberOfSessions = selectedVariant.numberOfSessions || 1;
  const sessionInterval = selectedVariant.sessionInterval || 0;
  // Calculate end time based on variant duration (for duration-based blocking)
  const variantDuration = selectedVariant.duration || 60;
  const calculatedEndTime = selectedTime
    ? (() => {
        const [hours, minutes] = selectedTime.split(":").map(Number);
        const totalMinutes = hours * 60 + minutes + variantDuration;
        const endHours = Math.floor(totalMinutes / 60);
        const endMinutes = totalMinutes % 60;
        return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
      })()
    : null;

  // Générer les créneaux dynamiquement selon les horaires de l'annonceur
  const timeSlots = useMemo(() => {
    const startHour = parseTimeToHour(acceptReservationsFrom);
    const endHour = parseTimeToHour(acceptReservationsTo);
    // Pour l'heure de début, on termine 30 min avant la fin pour laisser de la place
    return generateTimeSlots(Math.floor(startHour), Math.floor(endHour), 30);
  }, [acceptReservationsFrom, acceptReservationsTo]);

  const extendedTimeSlots = useMemo(() => {
    const startHour = parseTimeToHour(acceptReservationsFrom);
    const endHour = parseTimeToHour(acceptReservationsTo);
    // Pour l'heure de fin, on va jusqu'à l'heure de fin configurée
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

  // Get available end time slots (after selected start time)
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

      // Capacité restante pour les catégories de garde
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

      // Pour les catégories capacity-based, le jour est disponible s'il reste de la capacité
      const isDisabled = status === "past" || (status === "unavailable" && (!hasCapacityInfo || remainingCapacity === 0));

      elements.push(
        <button
          key={dateStr}
          disabled={isDisabled}
          onClick={() => handleDateClick(dateStr)}
          className={cn(
            "aspect-square flex flex-col items-center justify-center text-sm rounded-lg transition-colors relative",
            status === "past" && "text-gray-300 cursor-not-allowed",
            status === "unavailable" && !hasCapacityInfo &&
              "text-gray-300 bg-gray-50 cursor-not-allowed",
            // Catégorie capacity-based avec capacité atteinte
            hasCapacityInfo && remainingCapacity === 0 &&
              "text-gray-300 bg-red-50 cursor-not-allowed",
            // Catégorie capacity-based avec capacité partielle
            hasCapacityInfo && remainingCapacity > 0 && remainingCapacity < (maxAnimalsPerSlot ?? 1) &&
              "text-emerald-700 bg-emerald-50 hover:bg-emerald-100",
            // Catégorie capacity-based avec capacité complète
            hasCapacityInfo && remainingCapacity === (maxAnimalsPerSlot ?? 1) &&
              "hover:bg-gray-100",
            // Mode standard: partial
            status === "partial" && !hasCapacityInfo && "text-amber-600 bg-amber-50",
            // Mode standard: available
            status === "available" && !hasCapacityInfo && "hover:bg-gray-100",
            (isSelected || isEndSelected) &&
              "bg-primary text-white hover:bg-primary",
            isInRange && "bg-primary/20"
          )}
        >
          <span className={cn(
            status === "unavailable" && !hasCapacityInfo && "line-through"
          )}>{d}</span>
          {/* Afficher la capacité restante pour les catégories de garde */}
          {hasCapacityInfo && remainingCapacity > 0 && !isSelected && !isEndSelected && (
            <span className={cn(
              "text-[10px] leading-none font-medium",
              remainingCapacity < (maxAnimalsPerSlot ?? 1) ? "text-emerald-600" : "text-gray-400"
            )}>
              {remainingCapacity} place{remainingCapacity > 1 ? "s" : ""}
            </span>
          )}
          {/* Afficher "Complet" si capacité atteinte */}
          {hasCapacityInfo && remainingCapacity === 0 && (
            <span className="text-[9px] leading-none text-red-400 font-medium">
              Complet
            </span>
          )}
          {/* Indicateur visuel pour jours indisponibles */}
          {status === "unavailable" && !hasCapacityInfo && (
            <span className="text-[8px] leading-none text-gray-400">
              indispo
            </span>
          )}
        </button>
      );
    }

    return elements;
  };

  // Déterminer le titre et le message d'aide selon le type
  const getStepInfo = () => {
    if (isCollective) {
      return {
        title: "Choisissez vos créneaux",
        icon: CalendarCheck,
        iconColor: "text-purple-600",
        bgColor: "bg-purple-50",
        borderColor: "border-purple-200",
        message: `Sélectionnez ${numberOfSessions} créneau${numberOfSessions > 1 ? "x" : ""} parmi les disponibilités proposées par le prestataire.`,
      };
    }
    if (isMultiSession) {
      return {
        title: "Planifiez vos séances",
        icon: CalendarDays,
        iconColor: "text-primary",
        bgColor: "bg-primary/5",
        borderColor: "border-primary/20",
        message: sessionInterval > 0
          ? `Sélectionnez ${numberOfSessions} dates pour vos séances (minimum ${sessionInterval} jour${sessionInterval > 1 ? "s" : ""} d'intervalle entre chaque).`
          : `Sélectionnez ${numberOfSessions} dates pour vos séances.`,
      };
    }
    return {
      title: isRangeMode ? "Choisissez vos dates" : "Choisissez votre créneau",
      icon: Calendar,
      iconColor: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      message: isRangeMode
        ? "Sélectionnez une période de garde pour votre animal."
        : "Choisissez une date et un horaire pour votre séance.",
    };
  };

  const stepInfo = getStepInfo();
  const StepIcon = stepInfo.icon;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      {/* En-tête contextuel selon le type de formule */}
      <div className="flex items-center gap-3 mb-4">
        <div className={cn("p-2 rounded-lg", stepInfo.bgColor)}>
          <StepIcon className={cn("w-5 h-5", stepInfo.iconColor)} />
        </div>
        <h2 className="text-lg font-bold text-foreground">
          {stepInfo.title}
        </h2>
      </div>

      {/* Message d'aide contextuel */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "mb-4 p-3 rounded-xl border flex items-start gap-2",
          stepInfo.bgColor,
          stepInfo.borderColor
        )}
      >
        <Info className={cn("w-4 h-4 mt-0.5 flex-shrink-0", stepInfo.iconColor)} />
        <p className="text-sm text-foreground">{stepInfo.message}</p>
      </motion.div>

      {/* Récap formule sélectionnée */}
      <div className="mb-4 p-3 bg-gray-50 rounded-xl">
        <p className="text-sm text-text-light">Prestation sélectionnée</p>
        <p className="font-semibold text-foreground">
          {selectedService.categoryIcon} {selectedService.categoryName} -{" "}
          {selectedVariant.name}
        </p>
        {isMultiSession && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
              {numberOfSessions} séances
            </span>
            {sessionInterval > 0 && (
              <span className="text-xs text-text-light">
                (intervalle min. {sessionInterval}j)
              </span>
            )}
          </div>
        )}
        {isCollective && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full flex items-center gap-1">
              <Users className="w-3 h-3" />
              Séance collective
            </span>
            <span className="text-xs text-text-light">
              {numberOfSessions} créneau{numberOfSessions > 1 ? "x" : ""} à choisir
            </span>
          </div>
        )}
      </div>

      {/* Progression de sélection pour multi-séances et collectives */}
      {(isMultiSession || isCollective) && (
        <div className="mb-4 p-3 bg-gray-50 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              {isCollective ? "Créneaux sélectionnés" : "Séances planifiées"}
            </span>
            <span className={cn(
              "text-sm font-bold",
              (isCollective ? selectedSlotIds.length : selectedSessions.length) >= numberOfSessions
                ? "text-green-600"
                : "text-primary"
            )}>
              {isCollective ? selectedSlotIds.length : selectedSessions.length} / {numberOfSessions}
            </span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: numberOfSessions }).map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex-1 h-2 rounded-full transition-colors",
                  idx < (isCollective ? selectedSlotIds.length : selectedSessions.length)
                    ? isCollective ? "bg-purple-500" : "bg-primary"
                    : "bg-gray-200"
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* Info capacité pour les catégories de garde */}
      {isCapacityBased && maxAnimalsPerSlot && (
        <div className="mb-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
          <div className="flex items-start gap-2">
            <Users className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-800">
                Service de garde - Capacité maximale : {maxAnimalsPerSlot} animaux
              </p>
              <p className="text-xs text-emerald-600 mt-1">
                Le calendrier indique le nombre de places disponibles pour chaque jour.
                Les jours avec des places restantes sont réservables même si d&apos;autres animaux sont déjà en garde.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Légende du calendrier */}
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
      {selectedDate && (() => {
        // Récupérer les infos de disponibilité pour la date sélectionnée
        const selectedDateAvailability = availabilityCalendar?.find(
          (a) => a.date === selectedDate
        );
        const bookedSlots = selectedDateAvailability?.bookedSlots || [];
        const availableTimeSlots = selectedDateAvailability?.timeSlots;

        // Fonction pour vérifier si un créneau est disponible
        // Prend en compte le temps de préparation (bufferBefore/bufferAfter)
        const isTimeSlotAvailable = (startTime: string, duration: number = variantDuration) => {
          const startMinutes = parseTimeToMinutes(startTime);
          const endMinutes = startMinutes + duration;

          // Pour le blocage basé sur la durée, ajouter les buffers au créneau
          // Le créneau effectivement bloqué sera: (start - bufferBefore) à (end + bufferAfter)
          const effectiveStartMinutes = enableDurationBasedBlocking
            ? startMinutes - bufferBefore
            : startMinutes;
          const effectiveEndMinutes = enableDurationBasedBlocking
            ? endMinutes + bufferAfter
            : endMinutes;

          // Vérifier si le créneau est dans les horaires disponibles (dispo partielle)
          if (availableTimeSlots && availableTimeSlots.length > 0) {
            const isInAvailableSlot = availableTimeSlots.some((slot) => {
              const slotStart = parseTimeToMinutes(slot.startTime);
              const slotEnd = parseTimeToMinutes(slot.endTime);
              // Pour dispo partielle, vérifier avec le créneau effectif (incluant buffers)
              return effectiveStartMinutes >= slotStart && effectiveEndMinutes <= slotEnd;
            });
            if (!isInAvailableSlot) return false;
          }

          // Vérifier si le créneau ne chevauche pas un créneau réservé
          // Les bookedSlots ont déjà les buffers appliqués côté backend
          const hasConflict = bookedSlots.some((booked) => {
            const bookedStart = parseTimeToMinutes(booked.startTime);
            const bookedEnd = parseTimeToMinutes(booked.endTime);
            // Conflit si les créneaux (avec buffers) se chevauchent
            return effectiveStartMinutes < bookedEnd && effectiveEndMinutes > bookedStart;
          });

          return !hasConflict;
        };

        // Filtrer les créneaux disponibles
        const availableStartTimes = timeSlots.filter((time) =>
          isTimeSlotAvailable(time)
        );

        return (
        <div className="space-y-4 mb-4">
          {/* Info for range mode */}
          {isRangeMode && (
            <p className="text-sm text-text-light">
              Optionnel : précisez les heures de début et fin de la prestation
            </p>
          )}

          {/* Légende si créneaux réservés */}
          {bookedSlots.length > 0 && (
            <div className="p-2 bg-gray-50 rounded-lg text-xs text-gray-600">
              <span className="font-medium">Créneaux déjà réservés : </span>
              {bookedSlots.map((slot, i) => (
                <span key={i} className="text-red-500">
                  {slot.startTime}-{slot.endTime}
                  {i < bookedSlots.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>
          )}

          {/* Info si disponibilité partielle */}
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
            <p className="text-sm font-medium text-foreground mb-2">
              Heure de début
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
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
                    onClick={() => onTimeSelect(time)}
                    className={cn(
                      "py-2 text-sm rounded-lg border transition-colors",
                      !isAvailable && "opacity-40 cursor-not-allowed bg-gray-100 text-gray-400",
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

          {/* End Time Selection - conditional based on duration-based blocking */}
          {selectedTime && enableDurationBasedBlocking && selectedVariant.duration ? (
            /* Duration-based blocking: show calculated end time (not editable) */
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="font-medium text-amber-800">
                  Durée de la prestation : {variantDuration >= 60
                    ? `${Math.floor(variantDuration / 60)}h${variantDuration % 60 > 0 ? variantDuration % 60 : ''}`
                    : `${variantDuration}min`}
                </span>
              </div>
              <p className="text-xs text-amber-600 mt-1">
                Créneau réservé : {selectedTime} → {calculatedEndTime}
              </p>
              {(bufferBefore > 0 || bufferAfter > 0) && (
                <p className="text-xs text-amber-500 mt-1">
                  Temps de préparation inclus : {bufferBefore > 0 && `${bufferBefore}min avant`}{bufferBefore > 0 && bufferAfter > 0 && " / "}{bufferAfter > 0 && `${bufferAfter}min après`}
                </p>
              )}
            </div>
          ) : selectedTime ? (
            /* Normal mode: show end time picker */
            <div>
              <p className="text-sm font-medium text-foreground mb-2">
                Heure de fin
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {getEndTimeSlots().map((time) => {
                  // Vérifier si l'heure de fin est disponible
                  const startMinutes = parseTimeToMinutes(selectedTime);
                  const endMinutes = parseTimeToMinutes(time);

                  // Vérifier conflit avec créneaux réservés
                  const hasConflict = bookedSlots.some((slot) => {
                    const bookedStart = parseTimeToMinutes(slot.startTime);
                    const bookedEnd = parseTimeToMinutes(slot.endTime);
                    return startMinutes < bookedEnd && endMinutes > bookedStart;
                  });

                  // Vérifier si dans les horaires disponibles (dispo partielle)
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
                        !isEndTimeAvailable && "opacity-40 cursor-not-allowed bg-gray-100 text-gray-400",
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

          {/* Duration Display - only for manual end time selection */}
          {selectedTime && selectedEndTime && !enableDurationBasedBlocking && (
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
        );
      })()}

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
