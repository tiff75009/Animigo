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
  dayNames,
  formatDateLocal,
} from "../types";

interface WeekViewProps {
  currentDate: Date;
  missions: Mission[];
  availability: Availability[];
  collectiveSlots?: CollectiveSlot[];
  onDayClick: (date: string) => void;
  onRangeSelect?: (startDate: string, endDate: string) => void;
  onMissionClick: (mission: Mission) => void;
  onSlotClick?: (slot: CollectiveSlot) => void;
}

const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8h - 20h

export function WeekView({
  currentDate,
  missions,
  availability,
  collectiveSlots = [],
  onDayClick,
  onRangeSelect,
  onMissionClick,
  onSlotClick,
}: WeekViewProps) {
  // Range selection state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<string | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<string | null>(null);

  // Handle mouse down on a day
  const handleMouseDown = useCallback((dateStr: string) => {
    setIsSelecting(true);
    setSelectionStart(dateStr);
    setSelectionEnd(dateStr);
  }, []);

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
      const start = selectionStart < selectionEnd ? selectionStart : selectionEnd;
      const end = selectionStart < selectionEnd ? selectionEnd : selectionStart;

      if (start === end) {
        onDayClick(start);
      } else if (onRangeSelect) {
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

  // Calculate week dates (Monday to Sunday)
  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    const dayOfWeek = currentDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(currentDate);
    monday.setDate(currentDate.getDate() + mondayOffset);

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [currentDate]);

  // Get missions for a specific date
  const getMissionsForDate = (date: Date): Mission[] => {
    const dateStr = formatDateLocal(date);
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
  const getAvailabilityForDate = (date: Date): Availability | null => {
    const dateStr = formatDateLocal(date);
    return availability.find((a) => a.date === dateStr) || null;
  };

  // Get collective slots for a specific date (prioriser ceux avec réservations)
  const getSlotsForDate = (date: Date): CollectiveSlot[] => {
    const dateStr = formatDateLocal(date);
    const daySlots = collectiveSlots.filter((slot) => slot.date === dateStr);
    // Trier les créneaux: ceux avec réservations en premier
    return daySlots.sort((a, b) => {
      const aHasBookings = a.bookings && a.bookings.length > 0 ? 1 : 0;
      const bHasBookings = b.bookings && b.bookings.length > 0 ? 1 : 0;
      return bHasBookings - aHasBookings;
    });
  };

  // Check if date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Parse time to hours (e.g., "09:30" -> 9.5)
  const parseTimeToHours = (time: string): number => {
    const [h, m] = time.split(":").map(Number);
    return h + m / 60;
  };

  return (
    <div
      className="overflow-x-auto select-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="min-w-[800px]">
        {/* Header with days */}
        <div className="grid grid-cols-8 gap-1 mb-2">
          {/* Empty cell for time column */}
          <div className="w-16" />
          {weekDates.map((date, index) => {
            const today = isToday(date);
            const dayAvailability = getAvailabilityForDate(date);
            const dateStr = formatDateLocal(date);
            const inSelection = isInSelectionRange(dateStr);

            return (
              <div
                key={index}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleMouseDown(dateStr);
                }}
                onMouseEnter={() => handleMouseEnter(dateStr)}
                className={cn(
                  "text-center py-3 rounded-lg cursor-pointer transition-colors",
                  today && "bg-primary/10",
                  !inSelection &&
                    dayAvailability &&
                    availabilityColors[dayAvailability.status],
                  inSelection && "bg-primary/20 ring-2 ring-primary"
                )}
              >
                <p className="text-sm font-medium text-text-light">
                  {dayNames[index]}
                </p>
                <p
                  className={cn(
                    "text-lg font-bold",
                    today ? "text-primary" : "text-foreground",
                    inSelection && "text-primary"
                  )}
                >
                  {date.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="relative border rounded-xl overflow-hidden">
          {/* Hour rows */}
          {hours.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b last:border-b-0">
              {/* Time label */}
              <div className="w-16 py-6 px-2 text-xs text-text-light border-r bg-gray-50">
                {hour}:00
              </div>
              {/* Day cells */}
              {weekDates.map((date, dayIndex) => {
                const dateStr = formatDateLocal(date);
                const dayAvailability = getAvailabilityForDate(date);

                return (
                  <div
                    key={dayIndex}
                    onClick={() => onDayClick(dateStr)}
                    className={cn(
                      "border-r last:border-r-0 min-h-[48px] cursor-pointer hover:bg-gray-50 transition-colors relative",
                      dayAvailability?.status === "unavailable" &&
                        "bg-red-50/50"
                    )}
                  />
                );
              })}
            </div>
          ))}

          {/* Collective slot overlays */}
          {weekDates.map((date, dayIndex) => {
            const daySlots = getSlotsForDate(date);

            return daySlots.map((slot, slotIndex) => {
              const startHour = parseTimeToHours(slot.startTime);
              const endHour = parseTimeToHours(slot.endTime);

              const top = (startHour - 8) * 48;
              const height = Math.max((endHour - startHour) * 48, 32);
              const hasBookings = slot.bookings && slot.bookings.length > 0;

              return (
                <motion.div
                  key={`slot-${slot._id}-${dayIndex}`}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSlotClick?.(slot);
                  }}
                  className={cn(
                    "absolute rounded-lg p-2 text-white text-xs cursor-pointer overflow-hidden border-l-4",
                    hasBookings
                      ? "bg-purple-600 border-purple-800"
                      : "bg-purple-400 border-purple-600"
                  )}
                  style={{
                    top: `${top}px`,
                    left: `calc(64px + ${dayIndex * ((100 - 8) / 7)}% + 2px)`,
                    width: `calc(${(100 - 8) / 7}% - 4px)`,
                    height: `${height}px`,
                    zIndex: hasBookings ? 20 + slotIndex : 15 + slotIndex,
                  }}
                  whileHover={{ scale: 1.02, zIndex: 50 }}
                >
                  <div className="flex items-center gap-1 font-medium truncate">
                    <Users className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{slot.variantName}</span>
                  </div>
                  <div className="truncate opacity-90">
                    {hasBookings
                      ? `${slot.bookings![0].animalEmoji} ${slot.bookings!.length} résa`
                      : `${slot.bookedAnimals}/${slot.maxAnimals}`
                    }
                  </div>
                </motion.div>
              );
            });
          })}

          {/* Mission overlays (filtrer les missions collectives) */}
          {weekDates.map((date, dayIndex) => {
            const dayMissions = getMissionsForDate(date).filter(
              (m) => m.sessionType !== "collective"
            );
            const daySlots = getSlotsForDate(date);
            const slotOffset = daySlots.length * 4;

            return dayMissions.map((mission, missionIndex) => {
              const startHour = mission.startTime
                ? parseTimeToHours(mission.startTime)
                : 9;
              const endHour = mission.endTime
                ? parseTimeToHours(mission.endTime)
                : 18;

              const top = (startHour - 8) * 48; // 48px per hour
              const height = (endHour - startHour) * 48;

              return (
                <motion.div
                  key={`${mission.id}-${dayIndex}`}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMissionClick(mission);
                  }}
                  className={cn(
                    "absolute rounded-lg p-2 text-white text-xs cursor-pointer overflow-hidden",
                    statusColors[mission.status]
                  )}
                  style={{
                    top: `${top}px`,
                    left: `calc(64px + ${dayIndex * ((100 - 8) / 7)}% + 2px)`,
                    width: `calc(${(100 - 8) / 7}% - 4px)`,
                    height: `${Math.max(height, 32)}px`,
                    marginLeft: slotOffset + missionIndex * 4, // Offset overlapping missions
                    zIndex: 10 + missionIndex,
                  }}
                  whileHover={{ scale: 1.02, zIndex: 50 }}
                >
                  <div className="font-medium truncate">
                    {mission.animal.emoji} {mission.animal.name}
                  </div>
                  <div className="truncate opacity-80">{mission.serviceName}</div>
                </motion.div>
              );
            });
          })}
        </div>
      </div>
    </div>
  );
}
