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
  availabilityColors,
  getDaysInMonth,
  getFirstDayOfMonth,
  formatDateStr,
  dayNames,
} from "../types";

interface MonthViewProps {
  currentDate: Date;
  missions: Mission[];
  availability: Availability[];
  collectiveSlots?: CollectiveSlot[];
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

  // Handle mouse down on a day
  const handleMouseDown = useCallback(
    (dateStr: string) => {
      setIsSelecting(true);
      setSelectionStart(dateStr);
      setSelectionEnd(dateStr);
    },
    []
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

  // Get availability for a specific date
  const getAvailabilityForDate = (day: number): Availability | null => {
    const dateStr = formatDateStr(year, month, day);
    return availability.find((a) => a.date === dateStr) || null;
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
          const dayAvailability = getAvailabilityForDate(item.day);
          const daySlots = getSlotsForDate(item.day);
          const today = isToday(item.day);
          const dateStr = formatDateStr(year, month, item.day);
          const inSelection = isInSelectionRange(dateStr);

          return (
            <motion.div
              key={index}
              onMouseDown={(e) => {
                e.preventDefault();
                handleMouseDown(dateStr);
              }}
              onMouseEnter={() => handleMouseEnter(dateStr)}
              className={cn(
                "h-24 md:h-28 p-1 rounded-lg border transition-colors cursor-pointer",
                today
                  ? "border-primary bg-primary/5"
                  : "border-gray-100 hover:border-gray-200 hover:bg-gray-50",
                dayAvailability &&
                  !dayMissions.length &&
                  !inSelection &&
                  availabilityColors[dayAvailability.status],
                inSelection && "bg-primary/20 border-primary"
              )}
              animate={inSelection ? { scale: 1.02 } : { scale: 1 }}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "text-sm font-medium",
                    today ? "text-primary" : "text-foreground",
                    inSelection && "text-primary font-bold"
                  )}
                >
                  {item.day}
                </span>
                {dayAvailability && !dayMissions.length && !inSelection && (
                  <span className="text-[10px]">
                    {dayAvailability.status === "available" && "ok"}
                    {dayAvailability.status === "partial" && "~"}
                    {dayAvailability.status === "unavailable" && "x"}
                  </span>
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
