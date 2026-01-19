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
import { Calendar, Clock, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
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
}

// Créneaux horaires disponibles
const timeSlots = [
  { label: "Matin", slots: ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30"] },
  { label: "Après-midi", slots: ["12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"] },
  { label: "Soir", slots: ["18:00", "18:30", "19:00", "19:30", "20:00"] },
];

const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

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
}: DateSelectorProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const calendarRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);

  // Déterminer le mode
  const isRangeMode = billingType === "daily";

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

      {/* Sélecteur d'heure (uniquement pour hourly) */}
      {!isRangeMode && (
        <div className="relative" ref={timeRef}>
          <button
            type="button"
            onClick={() => {
              setIsTimeOpen(!isTimeOpen);
              setIsCalendarOpen(false);
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
              {time ?? "Heure"}
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
                <div className="space-y-4">
                  {timeSlots.map((group) => (
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

      {/* Bouton pour effacer */}
      {(date || startDate || time) && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          type="button"
          onClick={() => {
            onDateChange(null);
            onTimeChange(null);
            onDateRangeChange(null, null);
          }}
          className="px-4 py-3 text-sm font-medium text-foreground/60 hover:text-primary transition-colors"
        >
          Effacer
        </motion.button>
      )}
    </div>
  );
}
