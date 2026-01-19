"use client";

import { useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/app/lib/utils";
import {
  Mission,
  Availability,
  statusColors,
  availabilityColors,
  dayNames,
  formatDateLocal,
} from "../types";

interface WeekViewProps {
  currentDate: Date;
  missions: Mission[];
  availability: Availability[];
  onDayClick: (date: string) => void;
  onRangeSelect?: (startDate: string, endDate: string) => void;
  onMissionClick: (mission: Mission) => void;
}

const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8h - 20h

export function WeekView({
  currentDate,
  missions,
  availability,
  onDayClick,
  onRangeSelect,
  onMissionClick,
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
      return mission.startDate <= dateStr && mission.endDate >= dateStr;
    });
  };

  // Get availability for a specific date
  const getAvailabilityForDate = (date: Date): Availability | null => {
    const dateStr = formatDateLocal(date);
    return availability.find((a) => a.date === dateStr) || null;
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

          {/* Mission overlays */}
          {weekDates.map((date, dayIndex) => {
            const dayMissions = getMissionsForDate(date);

            return dayMissions.map((mission, missionIndex) => {
              const startHour = mission.startTime
                ? parseTimeToHours(mission.startTime)
                : 9;
              const endHour = mission.endTime
                ? parseTimeToHours(mission.endTime)
                : 18;

              const top = (startHour - 8) * 48; // 48px per hour
              const height = (endHour - startHour) * 48;

              // Calculate left position (skip time column)
              const left = `calc(${12.5 * (dayIndex + 1)}% + 64px - ${12.5 * (dayIndex + 1)}%)`;
              const width = "calc(12.5% - 4px)";

              return (
                <motion.div
                  key={`${mission.id}-${dayIndex}`}
                  onClick={() => onMissionClick(mission)}
                  className={cn(
                    "absolute rounded-lg p-2 text-white text-xs cursor-pointer overflow-hidden",
                    statusColors[mission.status]
                  )}
                  style={{
                    top: `${top}px`,
                    left: `calc(64px + ${dayIndex * ((100 - 8) / 7)}% + 2px)`,
                    width: `calc(${(100 - 8) / 7}% - 4px)`,
                    height: `${Math.max(height, 32)}px`,
                    marginLeft: missionIndex * 4, // Offset overlapping missions
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
