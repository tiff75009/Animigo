"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fr } from "date-fns/locale";
import {
  format,
  parse,
  isValid,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isAfter,
  isBefore,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { Calendar, Clock, ChevronDown, ChevronLeft, ChevronRight, Moon, Sun } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface DateSelectorProps {
  billingType: "hourly" | "daily" | "flexible" | undefined;
  // Pour hourly
  date: string | null;
  time: string | null;
  onDateChange: (date: string | null) => void;
  onTimeChange: (time: string | null) => void;
  // Pour daily
  startDate: string | null;
  endDate: string | null;
  onDateRangeChange: (start: string | null, end: string | null) => void;
  className?: string;
  // Pour réservation par plage
  allowRangeBooking?: boolean;
  endTime?: string | null;
  onEndTimeChange?: (time: string | null) => void;
  announcerAvailability?: {
    acceptFrom: string; // "08:00"
    acceptTo: string;   // "20:00"
  };
  // Garde de nuit
  allowOvernightStay?: boolean;
  includeOvernightStay?: boolean;
  onOvernightChange?: (include: boolean) => void;
  dayStartTime?: string;  // Horaire début journée annonceur (ex: "08:00")
  dayEndTime?: string;    // Horaire fin journée annonceur (ex: "20:00")
}

// Créneaux horaires disponibles
const timeSlots = [
  { label: "Matin", slots: ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30"] },
  { label: "Après-midi", slots: ["12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"] },
  { label: "Soir", slots: ["18:00", "18:30", "19:00", "19:30", "20:00"] },
];

const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// Générer les créneaux horaires filtrés selon les disponibilités
const generateTimeSlots = (acceptFrom?: string, acceptTo?: string) => {
  const allSlots = [
    { label: "Matin", slots: ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30"] },
    { label: "Après-midi", slots: ["12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"] },
    { label: "Soir", slots: ["18:00", "18:30", "19:00", "19:30", "20:00"] },
  ];

  if (!acceptFrom || !acceptTo) return allSlots;

  // Filtrer les créneaux selon les disponibilités
  return allSlots.map(group => ({
    ...group,
    slots: group.slots.filter(slot => {
      return slot >= acceptFrom && slot <= acceptTo;
    })
  })).filter(group => group.slots.length > 0);
};

export default function DateSelector({
  billingType,
  date,
  time,
  onDateChange,
  onTimeChange,
  startDate,
  endDate,
  onDateRangeChange,
  className,
  allowRangeBooking,
  endTime,
  onEndTimeChange,
  announcerAvailability,
  // Garde de nuit
  allowOvernightStay,
  includeOvernightStay,
  onOvernightChange,
  dayStartTime = "08:00",
  dayEndTime = "20:00",
}: DateSelectorProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const [isEndTimeOpen, setIsEndTimeOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const calendarRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);
  const endTimeRef = useRef<HTMLDivElement>(null);

  // Déterminer le mode
  const isRangeMode = billingType === "daily" || allowRangeBooking;

  // Mode plage horaire : quand allowRangeBooking ET même jour sélectionné
  const isSameDayRange = allowRangeBooking && startDate && endDate && startDate === endDate;

  // Calculer le nombre de jours et nuits pour la garde de nuit
  const calculateDaysAndNights = () => {
    if (!startDate || !endDate) return { days: 0, nights: 0 };
    const start = parse(startDate, "yyyy-MM-dd", new Date());
    const end = parse(endDate, "yyyy-MM-dd", new Date());
    const diffTime = end.getTime() - start.getTime();
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 car inclusif
    const nights = includeOvernightStay ? Math.max(0, days - 1) : 0;
    return { days, nights };
  };

  const { days: totalDays, nights: totalNights } = calculateDaysAndNights();

  // Afficher l'option garde de nuit si : multi-jours, allowOvernightStay, et différents jours
  const showOvernightOption = allowOvernightStay && startDate && endDate && startDate !== endDate && totalDays >= 2;

  // Créneaux filtrés selon disponibilités annonceur
  const filteredTimeSlots = generateTimeSlots(
    announcerAvailability?.acceptFrom,
    announcerAvailability?.acceptTo
  );

  // Parser les dates
  const selectedDate = date ? parse(date, "yyyy-MM-dd", new Date()) : undefined;
  const rangeStart = startDate ? parse(startDate, "yyyy-MM-dd", new Date()) : undefined;
  const rangeEnd = endDate ? parse(endDate, "yyyy-MM-dd", new Date()) : undefined;

  // Formater pour affichage
  const displayDate = selectedDate
    ? format(selectedDate, "EEE d MMM", { locale: fr })
    : "Date";

  const displayRange =
    rangeStart && rangeEnd
      ? `${format(rangeStart, "d MMM", { locale: fr })} → ${format(rangeEnd, "d MMM", { locale: fr })}`
      : rangeStart
        ? `${format(rangeStart, "d MMM", { locale: fr })} → ...`
        : "Dates";

  // Fermer au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
      if (timeRef.current && !timeRef.current.contains(event.target as Node)) {
        setIsTimeOpen(false);
      }
      if (endTimeRef.current && !endTimeRef.current.contains(event.target as Node)) {
        setIsEndTimeOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Générer les jours du mois
  const generateCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  };

  const calendarDays = generateCalendarDays();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Handlers
  const handleSingleDateSelect = (day: Date) => {
    if (isBefore(day, today)) return;
    onDateChange(format(day, "yyyy-MM-dd"));
    setIsCalendarOpen(false);
  };

  const handleRangeDateSelect = (day: Date) => {
    if (isBefore(day, today)) return;

    if (!rangeStart || (rangeStart && rangeEnd)) {
      // Début d'une nouvelle sélection
      onDateRangeChange(format(day, "yyyy-MM-dd"), null);
    } else {
      // Fin de la sélection
      if (isBefore(day, rangeStart)) {
        // Si la date de fin est avant le début, inverser
        onDateRangeChange(format(day, "yyyy-MM-dd"), format(rangeStart, "yyyy-MM-dd"));
      } else {
        onDateRangeChange(format(rangeStart, "yyyy-MM-dd"), format(day, "yyyy-MM-dd"));
      }
      setIsCalendarOpen(false);
    }
  };

  const handleTimeSelect = (selectedTime: string) => {
    onTimeChange(selectedTime);
    setIsTimeOpen(false);
  };

  const handleEndTimeSelect = (selectedEndTime: string) => {
    if (onEndTimeChange) {
      onEndTimeChange(selectedEndTime);
    }
    setIsEndTimeOpen(false);
  };

  // Filtrer les créneaux de fin pour qu'ils soient après l'heure de début
  const getAvailableEndTimeSlots = () => {
    if (!time) return filteredTimeSlots;
    return filteredTimeSlots.map(group => ({
      ...group,
      slots: group.slots.filter(slot => slot > time)
    })).filter(group => group.slots.length > 0);
  };

  const isInRange = (day: Date) => {
    if (!rangeStart || !rangeEnd) return false;
    return isAfter(day, rangeStart) && isBefore(day, rangeEnd);
  };

  const isRangeStart = (day: Date) => rangeStart && isSameDay(day, rangeStart);
  const isRangeEnd = (day: Date) => rangeEnd && isSameDay(day, rangeEnd);

  if (!billingType) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-3 justify-center", className)}>
      {/* Sélecteur de date */}
      <div className="relative" ref={calendarRef}>
        <button
          type="button"
          onClick={() => {
            setIsCalendarOpen(!isCalendarOpen);
            setIsTimeOpen(false);
          }}
          className={cn(
            "flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all bg-white shadow-sm",
            (date || startDate)
              ? "border-primary text-primary"
              : "border-foreground/10 text-foreground hover:border-primary/50"
          )}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-sm font-medium">
            {isRangeMode ? displayRange : displayDate}
          </span>
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform ml-1",
              isCalendarOpen && "rotate-180"
            )}
          />
        </button>

        <AnimatePresence>
          {isCalendarOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-white rounded-2xl shadow-xl border border-foreground/10 p-4 min-w-[320px]"
            >
              {/* Header du calendrier */}
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-2 hover:bg-foreground/5 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-foreground/70" />
                </button>
                <h3 className="text-base font-semibold text-foreground capitalize">
                  {format(currentMonth, "MMMM yyyy", { locale: fr })}
                </h3>
                <button
                  type="button"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-2 hover:bg-foreground/5 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-foreground/70" />
                </button>
              </div>

              {/* Jours de la semaine */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-medium text-foreground/50 py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Grille des jours */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isDisabled = isBefore(day, today);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, new Date());
                  const inRange = isInRange(day);
                  const isStart = isRangeStart(day);
                  const isEnd = isRangeEnd(day);

                  return (
                    <button
                      key={index}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        if (isRangeMode) {
                          handleRangeDateSelect(day);
                        } else {
                          handleSingleDateSelect(day);
                        }
                      }}
                      className={cn(
                        "relative h-10 w-10 text-sm font-medium rounded-lg transition-all",
                        !isCurrentMonth && "text-foreground/30",
                        isCurrentMonth && !isDisabled && "text-foreground hover:bg-primary/10",
                        isDisabled && "text-foreground/20 cursor-not-allowed",
                        isToday && !isSelected && !isStart && !isEnd && "ring-2 ring-primary/30",
                        isSelected && "bg-primary text-white hover:bg-primary",
                        isStart && "bg-primary text-white rounded-r-none",
                        isEnd && "bg-primary text-white rounded-l-none",
                        inRange && "bg-primary/20 rounded-none",
                        (isStart && isEnd) && "rounded-lg"
                      )}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>

              {/* Indication pour la plage */}
              {isRangeMode && rangeStart && !rangeEnd && (
                <p className="text-xs text-center text-foreground/60 mt-3 pt-3 border-t border-foreground/10">
                  Sélectionnez la date de fin
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sélecteur d'heure de début (pour hourly OU plage même jour) */}
      {(!isRangeMode || isSameDayRange) && (
        <div className="relative" ref={timeRef}>
          <button
            type="button"
            onClick={() => {
              setIsTimeOpen(!isTimeOpen);
              setIsCalendarOpen(false);
              setIsEndTimeOpen(false);
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all bg-white shadow-sm",
              time
                ? "border-primary text-primary"
                : "border-foreground/10 text-foreground hover:border-primary/50"
            )}
          >
            <Clock className="w-5 h-5" />
            <span className="text-sm font-medium">
              {isSameDayRange ? (time ? `De ${time}` : "De...") : (time ?? "Heure")}
            </span>
            <ChevronDown
              className={cn(
                "w-4 h-4 transition-transform ml-1",
                isTimeOpen && "rotate-180"
              )}
            />
          </button>

          <AnimatePresence>
            {isTimeOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-white rounded-2xl shadow-xl border border-foreground/10 p-4 min-w-[280px]"
              >
                {announcerAvailability && (
                  <p className="text-xs text-foreground/60 mb-3 pb-3 border-b border-foreground/10 text-center">
                    Disponible de {announcerAvailability.acceptFrom} à {announcerAvailability.acceptTo}
                  </p>
                )}
                <div className="space-y-4">
                  {filteredTimeSlots.map((group) => (
                    <div key={group.label}>
                      <h4 className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2">
                        {group.label}
                      </h4>
                      <div className="grid grid-cols-4 gap-1.5">
                        {group.slots.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => handleTimeSelect(slot)}
                            className={cn(
                              "px-2 py-2 text-sm font-medium rounded-lg transition-all",
                              time === slot
                                ? "bg-primary text-white shadow-sm"
                                : "bg-foreground/5 text-foreground hover:bg-primary/10 hover:text-primary"
                            )}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Sélecteur d'heure de fin (pour plage même jour uniquement) */}
      {isSameDayRange && (
        <div className="relative" ref={endTimeRef}>
          <button
            type="button"
            onClick={() => {
              setIsEndTimeOpen(!isEndTimeOpen);
              setIsCalendarOpen(false);
              setIsTimeOpen(false);
            }}
            disabled={!time}
            className={cn(
              "flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all bg-white shadow-sm",
              endTime
                ? "border-primary text-primary"
                : "border-foreground/10 text-foreground hover:border-primary/50",
              !time && "opacity-50 cursor-not-allowed"
            )}
          >
            <Clock className="w-5 h-5" />
            <span className="text-sm font-medium">
              {endTime ? `À ${endTime}` : "À..."}
            </span>
            <ChevronDown
              className={cn(
                "w-4 h-4 transition-transform ml-1",
                isEndTimeOpen && "rotate-180"
              )}
            />
          </button>

          <AnimatePresence>
            {isEndTimeOpen && time && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-white rounded-2xl shadow-xl border border-foreground/10 p-4 min-w-[280px]"
              >
                <p className="text-xs text-foreground/60 mb-3 pb-3 border-b border-foreground/10 text-center">
                  Sélectionnez l&apos;heure de fin (après {time})
                </p>
                <div className="space-y-4">
                  {getAvailableEndTimeSlots().map((group) => (
                    <div key={group.label}>
                      <h4 className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2">
                        {group.label}
                      </h4>
                      <div className="grid grid-cols-4 gap-1.5">
                        {group.slots.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => handleEndTimeSelect(slot)}
                            className={cn(
                              "px-2 py-2 text-sm font-medium rounded-lg transition-all",
                              endTime === slot
                                ? "bg-primary text-white shadow-sm"
                                : "bg-foreground/5 text-foreground hover:bg-primary/10 hover:text-primary"
                            )}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Option garde de nuit */}
      <AnimatePresence>
        {showOvernightOption && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full mt-4 pt-4 border-t border-foreground/10"
          >
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4">
              {/* Checkbox garde de nuit */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={includeOvernightStay ?? false}
                    onChange={(e) => onOvernightChange?.(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={cn(
                    "w-5 h-5 rounded border-2 transition-all flex items-center justify-center",
                    includeOvernightStay
                      ? "bg-indigo-600 border-indigo-600"
                      : "border-foreground/20 group-hover:border-indigo-400"
                  )}>
                    {includeOvernightStay && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-indigo-600" />
                    <span className="font-medium text-foreground">Garde de nuit incluse</span>
                  </div>
                  <p className="text-xs text-foreground/60 mt-0.5">
                    L&apos;animal reste la nuit chez l&apos;annonceur
                  </p>
                </div>
              </label>

              {/* Planning détaillé */}
              <AnimatePresence>
                {includeOvernightStay && totalDays > 1 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 pt-4 border-t border-indigo-200/50"
                  >
                    <p className="text-xs font-medium text-foreground/70 mb-2">Planning prévu :</p>
                    <div className="space-y-1.5 text-xs">
                      {Array.from({ length: totalDays }).map((_, index) => {
                        const currentDate = parse(startDate!, "yyyy-MM-dd", new Date());
                        currentDate.setDate(currentDate.getDate() + index);
                        const dateStr = format(currentDate, "EEE d MMM", { locale: fr });
                        const isLastDay = index === totalDays - 1;

                        return (
                          <div key={index} className="space-y-1">
                            {/* Journée */}
                            <div className="flex items-center gap-2 text-foreground/80">
                              <Sun className="w-3.5 h-3.5 text-amber-500" />
                              <span className="capitalize">{dateStr}</span>
                              <span className="text-foreground/50">{dayStartTime} - {dayEndTime}</span>
                            </div>
                            {/* Nuit (sauf dernier jour) */}
                            {!isLastDay && (
                              <div className="flex items-center gap-2 text-indigo-600 pl-5">
                                <Moon className="w-3.5 h-3.5" />
                                <span>Nuit {index + 1}</span>
                                <span className="text-indigo-400">{dayEndTime} → {dayStartTime}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 pt-3 border-t border-indigo-200/50 flex items-center justify-between text-xs">
                      <span className="text-foreground/60">Total</span>
                      <span className="font-medium text-foreground">
                        {totalDays} jour{totalDays > 1 ? "s" : ""} + {totalNights} nuit{totalNights > 1 ? "s" : ""}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bouton pour effacer */}
      {(date || startDate || time || endTime) && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          type="button"
          onClick={() => {
            onDateChange(null);
            onTimeChange(null);
            onDateRangeChange(null, null);
            if (onEndTimeChange) onEndTimeChange(null);
            if (onOvernightChange) onOvernightChange(false);
          }}
          className="px-4 py-3 text-sm font-medium text-foreground/60 hover:text-primary transition-colors"
        >
          Effacer
        </motion.button>
      )}
    </div>
  );
}
