"use client";

import { useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/app/lib/utils";
import { Users } from "lucide-react";
import {
  Mission,
  Availability,
  CollectiveSlot,
  statusColors,
  getDaysInMonth,
  getFirstDayOfMonth,
  formatDateStr,
  dayNames,
} from "../types";
import { CategoryType } from "@/app/hooks/usePlanning";

interface MonthViewProps {
  currentDate: Date;
  missions: Mission[];
  availability: Availability[];
  collectiveSlots?: CollectiveSlot[];
  categoryTypes?: CategoryType[];
  selectedTypeId?: string | null;
  onDayClick: (date: string) => void;
  onRangeSelect?: (startDate: string, endDate: string) => void;
  onMissionClick: (mission: Mission) => void;
  onSlotClick?: (slot: CollectiveSlot) => void;
}

export function MonthView({
  currentDate,
  missions,
  availability,
  collectiveSlots = [],
  categoryTypes = [],
  selectedTypeId,
  onDayClick,
  onRangeSelect,
  onMissionClick,
  onSlotClick,
}: MonthViewProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonth = getFirstDayOfMonth(year, month);

  // Range selection state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<string | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<string | null>(null);

  // Check if a date string is in the past
  const isDateStrPast = useCallback((dateStr: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(dateStr);
    return checkDate < today;
  }, []);

  // Handle mouse down on a day
  const handleMouseDown = useCallback(
    (dateStr: string) => {
      // Block selection on past dates
      if (isDateStrPast(dateStr)) return;

      setIsSelecting(true);
      setSelectionStart(dateStr);
      setSelectionEnd(dateStr);
    },
    [isDateStrPast]
  );

  // Handle mouse enter while selecting
  const handleMouseEnter = useCallback(
    (dateStr: string) => {
      if (isSelecting) {
        setSelectionEnd(dateStr);
      }
    },
    [isSelecting]
  );

  // Handle mouse up to finish selection
  const handleMouseUp = useCallback(() => {
    if (isSelecting && selectionStart && selectionEnd) {
      // Ensure start is before end
      const start = selectionStart < selectionEnd ? selectionStart : selectionEnd;
      const end = selectionStart < selectionEnd ? selectionEnd : selectionStart;

      if (start === end) {
        // Single day click
        onDayClick(start);
      } else if (onRangeSelect) {
        // Range selection
        onRangeSelect(start, end);
      }
    }
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  }, [isSelecting, selectionStart, selectionEnd, onDayClick, onRangeSelect]);

  // Check if a date is in the current selection range
  const isInSelectionRange = useCallback(
    (dateStr: string): boolean => {
      if (!isSelecting || !selectionStart || !selectionEnd) return false;
      const start = selectionStart < selectionEnd ? selectionStart : selectionEnd;
      const end = selectionStart < selectionEnd ? selectionEnd : selectionStart;
      return dateStr >= start && dateStr <= end;
    },
    [isSelecting, selectionStart, selectionEnd]
  );

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ day: 0, isCurrentMonth: false });
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ day, isCurrentMonth: true });
    }

    return days;
  }, [firstDayOfMonth, daysInMonth]);

  // Get missions for a specific date
  const getMissionsForDate = (day: number): Mission[] => {
    const dateStr = formatDateStr(year, month, day);
    return missions.filter((mission) => {
      // Pour les missions collectives, utiliser les dates des créneaux réservés
      if (mission.sessionType === "collective" && mission.collectiveSlotDates) {
        return mission.collectiveSlotDates.includes(dateStr);
      }

      // Pour les missions multi-séances, utiliser les dates des séances
      if (mission.sessions && mission.sessions.length > 0) {
        return mission.sessions.some((s) => s.date === dateStr);
      }

      // Pour les missions standard (uni-séance), utiliser la plage startDate-endDate
      return mission.startDate <= dateStr && mission.endDate >= dateStr;
    });
  };

  // Get all availabilities for a specific date
  const getAvailabilitiesForDate = (day: number): Availability[] => {
    const dateStr = formatDateStr(year, month, day);
    return availability.filter((a) => a.date === dateStr);
  };

  // Get collective slots for a specific date
  const getSlotsForDate = (day: number): CollectiveSlot[] => {
    const dateStr = formatDateStr(year, month, day);
    return collectiveSlots.filter((slot) => slot.date === dateStr);
  };

  // Check if date is today
  const isToday = (day: number): boolean => {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  // Check if date is in the past (before today)
  const isPastDate = (day: number): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(year, month, day);
    return checkDate < today;
  };

  // Get background color based on availabilities
  const getDayBackgroundClass = (dayAvailabilities: Availability[], inSelection: boolean): string => {
    if (inSelection) return "";

    // Si filtre par type actif
    if (selectedTypeId) {
      const typeAvail = dayAvailabilities.find((a) => a.categoryTypeId === selectedTypeId);
      if (!typeAvail) return ""; // Pas d'entrée = indisponible par défaut = gris clair
      if (typeAvail.status === "available") return "bg-green-50 border-green-200";
      if (typeAvail.status === "partial") return "bg-orange-50 border-orange-200";
      return ""; // unavailable
    }

    // Mode "tous" - afficher le statut global
    if (dayAvailabilities.length === 0) return ""; // Pas d'entrée = indisponible par défaut

    const hasAvailable = dayAvailabilities.some((a) => a.status === "available");
    const hasPartial = dayAvailabilities.some((a) => a.status === "partial");

    if (hasAvailable) return "bg-green-50 border-green-200";
    if (hasPartial) return "bg-orange-50 border-orange-200";
    return "";
  };

  return (
    <div
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="select-none"
    >
      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-text-light py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Selection hint */}
      {onRangeSelect && (
        <p className="text-xs text-text-light mb-2 text-center">
          Cliquez et glissez pour selectionner plusieurs jours
        </p>
      )}

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((item, index) => {
          if (!item.isCurrentMonth) {
            return <div key={index} className="h-24 md:h-28" />;
          }

          const dayMissions = getMissionsForDate(item.day);
          const dayAvailabilities = getAvailabilitiesForDate(item.day);
          const daySlots = getSlotsForDate(item.day);
          const today = isToday(item.day);
          const past = isPastDate(item.day);
          const dateStr = formatDateStr(year, month, item.day);
          const inSelection = isInSelectionRange(dateStr);
          const bgClass = getDayBackgroundClass(dayAvailabilities, inSelection);

          return (
            <motion.div
              key={index}
              onMouseDown={(e) => {
                e.preventDefault();
                handleMouseDown(dateStr);
              }}
              onMouseEnter={() => handleMouseEnter(dateStr)}
              className={cn(
                "h-24 md:h-28 p-1 rounded-lg border transition-colors",
                // Past dates styling
                past
                  ? "bg-gray-50 border-gray-100 cursor-not-allowed opacity-60"
                  : "cursor-pointer",
                // Today styling (only if not past)
                !past && today && "border-primary bg-primary/5",
                // Normal day styling (only if not past and not today)
                !past && !today && !bgClass && "border-gray-100 hover:border-gray-200 hover:bg-gray-50",
                // Availability background colors (only if not past)
                !past && !today && bgClass,
                // Selection styling (only if not past)
                !past && inSelection && "bg-primary/20 border-primary"
              )}
              animate={!past && inSelection ? { scale: 1.02 } : { scale: 1 }}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "text-sm font-medium",
                    past && "text-gray-400",
                    !past && today && "text-primary",
                    !past && !today && "text-foreground",
                    !past && inSelection && "text-primary font-bold"
                  )}
                >
                  {item.day}
                </span>

                {/* Indicateurs de disponibilite par type */}
                {!past && !inSelection && dayAvailabilities.length > 0 && categoryTypes.length > 0 && (
                  <div className="flex gap-0.5">
                    {categoryTypes.map((type) => {
                      const typeAvail = dayAvailabilities.find(
                        (a) => a.categoryTypeId === type._id
                      );
                      if (!typeAvail || typeAvail.status === "unavailable") {
                        return null;
                      }
                      return (
                        <span
                          key={type._id}
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: type.color }}
                          title={`${type.name}: ${typeAvail.status === "available" ? "Disponible" : "Partiel"}`}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Indicateur si aucune dispo (tous types indisponibles) */}
                {!past && !inSelection && dayAvailabilities.length === 0 && categoryTypes.length > 0 && (
                  <span className="text-[10px] text-gray-400">-</span>
                )}
              </div>

              {/* Missions et créneaux collectifs */}
              <div className="space-y-0.5 overflow-hidden">
                {/* Créneaux collectifs - n'afficher que ceux avec réservations, sinon 1 seul */}
                {(() => {
                  // Séparer les créneaux avec et sans réservations
                  const slotsWithBookings = daySlots.filter((s) => s.bookings && s.bookings.length > 0);
                  const slotsWithoutBookings = daySlots.filter((s) => !s.bookings || s.bookings.length === 0);

                  // Afficher tous les créneaux avec réservations (max 2), sinon 1 créneau vide
                  const slotsToShow = slotsWithBookings.length > 0
                    ? slotsWithBookings.slice(0, 2)
                    : slotsWithoutBookings.slice(0, 1);

                  return slotsToShow.map((slot) => (
                    <motion.div
                      key={slot._id}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSlotClick?.(slot);
                      }}
                      className={cn(
                        "text-[10px] md:text-xs text-white px-1.5 py-0.5 rounded truncate flex items-center gap-0.5 cursor-pointer",
                        slot.bookings && slot.bookings.length > 0
                          ? "bg-purple-600"
                          : "bg-purple-400"
                      )}
                      whileHover={{ scale: 1.05 }}
                    >
                      <Users className="w-2.5 h-2.5" />
                      <span className="truncate">
                        {slot.bookings && slot.bookings.length > 0
                          ? `${slot.bookings[0].animalEmoji} ${slot.bookings.length} résa`
                          : `${slot.bookedAnimals}/${slot.maxAnimals}`
                        }
                      </span>
                    </motion.div>
                  ));
                })()}
                {/* Missions (filtrer les missions collectives qui sont déjà affichées dans les créneaux) */}
                {(() => {
                  const slotsWithBookings = daySlots.filter((s) => s.bookings && s.bookings.length > 0);
                  const displayedSlots = slotsWithBookings.length > 0
                    ? Math.min(slotsWithBookings.length, 2)
                    : daySlots.length > 0 ? 1 : 0;
                  const maxMissions = Math.max(0, 2 - displayedSlots);

                  return dayMissions
                    .filter((m) => m.sessionType !== "collective")
                    .slice(0, maxMissions)
                    .map((mission) => (
                      <motion.div
                        key={mission.id}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onMissionClick(mission);
                        }}
                        className={cn(
                          "text-[10px] md:text-xs text-white px-1.5 py-0.5 rounded truncate cursor-pointer",
                          statusColors[mission.status]
                        )}
                        whileHover={{ scale: 1.05 }}
                      >
                        {mission.animal.emoji} {mission.animal.name}
                      </motion.div>
                    ));
                })()}
                {(() => {
                  const slotsWithBookings = daySlots.filter((s) => s.bookings && s.bookings.length > 0);
                  const nonCollectiveMissions = dayMissions.filter((m) => m.sessionType !== "collective");

                  const displayedSlots = slotsWithBookings.length > 0
                    ? Math.min(slotsWithBookings.length, 2)
                    : daySlots.length > 0 ? 1 : 0;
                  const displayedMissions = Math.min(nonCollectiveMissions.length, Math.max(0, 2 - displayedSlots));

                  // Compter les items non affichés
                  const remainingSlots = slotsWithBookings.length > 2 ? slotsWithBookings.length - 2 : 0;
                  const remainingMissions = nonCollectiveMissions.length - displayedMissions;
                  const remaining = remainingSlots + remainingMissions;

                  return remaining > 0 ? (
                    <p className="text-[10px] text-text-light">
                      +{remaining} autre{remaining > 1 ? "s" : ""}
                    </p>
                  ) : null;
                })()}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
