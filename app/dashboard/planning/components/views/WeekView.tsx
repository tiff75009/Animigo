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
import { CategoryType } from "@/app/hooks/usePlanning";

interface WeekViewProps {
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

const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8h - 20h

export function WeekView({
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
}: WeekViewProps) {
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
  const handleMouseDown = useCallback((dateStr: string) => {
    // Block selection on past dates
    if (isDateStrPast(dateStr)) return;

    setIsSelecting(true);
    setSelectionStart(dateStr);
    setSelectionEnd(dateStr);
  }, [isDateStrPast]);

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

  // Get all availabilities for a specific date
  const getAvailabilitiesForDate = (date: Date): Availability[] => {
    const dateStr = formatDateLocal(date);
    return availability.filter((a) => a.date === dateStr);
  };

  // Get background color class based on availabilities
  const getDayBackgroundClass = (dayAvailabilities: Availability[], inSelection: boolean): string => {
    if (inSelection) return "";

    // Si filtre par type actif
    if (selectedTypeId) {
      const typeAvail = dayAvailabilities.find((a) => a.categoryTypeId === selectedTypeId);
      if (!typeAvail) return ""; // Pas d'entrée = indisponible par défaut
      if (typeAvail.status === "available") return "bg-green-50";
      if (typeAvail.status === "partial") return "bg-orange-50";
      return "";
    }

    // Mode "tous" - afficher le statut global
    if (dayAvailabilities.length === 0) return "";

    const hasAvailable = dayAvailabilities.some((a) => a.status === "available");
    const hasPartial = dayAvailabilities.some((a) => a.status === "partial");

    if (hasAvailable) return "bg-green-50";
    if (hasPartial) return "bg-orange-50";
    return "";
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

  // Check if date is in the past (before today)
  const isPastDate = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
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
            const past = isPastDate(date);
            const dayAvailabilities = getAvailabilitiesForDate(date);
            const dateStr = formatDateLocal(date);
            const inSelection = isInSelectionRange(dateStr);
            const bgClass = getDayBackgroundClass(dayAvailabilities, inSelection);

            return (
              <div
                key={index}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleMouseDown(dateStr);
                }}
                onMouseEnter={() => handleMouseEnter(dateStr)}
                className={cn(
                  "text-center py-3 rounded-lg transition-colors border",
                  // Past dates styling
                  past
                    ? "bg-gray-50 border-gray-100 cursor-not-allowed opacity-60"
                    : "cursor-pointer border-gray-200 hover:border-gray-300",
                  // Today styling (only if not past)
                  !past && today && "bg-primary/10 border-primary",
                  // Availability colors (only if not past and not today)
                  !past && !today && !inSelection && bgClass,
                  // Selection styling (only if not past)
                  !past && inSelection && "bg-primary/20 border-primary ring-2 ring-primary"
                )}
              >
                <div className="flex items-center justify-between px-2">
                  <p className={cn(
                    "text-sm font-medium",
                    past ? "text-gray-400" : "text-text-light"
                  )}>
                    {dayNames[index]}
                  </p>
                  {/* Indicateurs de type de disponibilité */}
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
                </div>
                <p
                  className={cn(
                    "text-lg font-bold",
                    past && "text-gray-400",
                    !past && today && "text-primary",
                    !past && !today && "text-foreground",
                    !past && inSelection && "text-primary"
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
                const dayAvailabilities = getAvailabilitiesForDate(date);
                const past = isPastDate(date);
                const bgClass = getDayBackgroundClass(dayAvailabilities, false);

                return (
                  <div
                    key={dayIndex}
                    onClick={() => !past && onDayClick(dateStr)}
                    className={cn(
                      "border-r last:border-r-0 min-h-[48px] transition-colors relative",
                      past
                        ? "bg-gray-50/80 cursor-not-allowed"
                        : "cursor-pointer hover:bg-gray-100/50",
                      !past && bgClass
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
