"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/app/lib/utils";
import {
  Mission,
  Availability,
  getDaysInMonth,
  getFirstDayOfMonth,
  formatDateStr,
  monthNames,
} from "../types";

interface YearViewProps {
  currentDate: Date;
  missions: Mission[];
  availability: Availability[];
  onMonthClick: (month: number) => void;
}

export function YearView({
  currentDate,
  missions,
  availability,
  onMonthClick,
}: YearViewProps) {
  const year = currentDate.getFullYear();

  // Get missions count per month
  const missionsByMonth = useMemo(() => {
    const counts: number[] = Array(12).fill(0);

    missions.forEach((mission) => {
      const startDate = new Date(mission.startDate);
      const endDate = new Date(mission.endDate);

      // Count mission in each month it spans
      for (let m = 0; m < 12; m++) {
        const monthStart = new Date(year, m, 1);
        const monthEnd = new Date(year, m + 1, 0);

        if (startDate <= monthEnd && endDate >= monthStart) {
          counts[m]++;
        }
      }
    });

    return counts;
  }, [missions, year]);

  // Get unavailable days count per month
  const unavailableByMonth = useMemo(() => {
    const counts: number[] = Array(12).fill(0);

    availability
      .filter((a) => a.status === "unavailable")
      .forEach((a) => {
        const date = new Date(a.date);
        if (date.getFullYear() === year) {
          counts[date.getMonth()]++;
        }
      });

    return counts;
  }, [availability, year]);

  // Mini calendar for a month
  const MiniMonth = ({ month }: { month: number }) => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const missionCount = missionsByMonth[month];
    const unavailableCount = unavailableByMonth[month];

    // Generate mini calendar grid
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }

    // Check if a day has missions
    const hasMission = (day: number): boolean => {
      const dateStr = formatDateStr(year, month, day);
      return missions.some((m) => m.startDate <= dateStr && m.endDate >= dateStr);
    };

    // Check if a day is unavailable
    const isUnavailable = (day: number): boolean => {
      const dateStr = formatDateStr(year, month, day);
      return availability.some(
        (a) => a.date === dateStr && a.status === "unavailable"
      );
    };

    // Check if it's current month
    const today = new Date();
    const isCurrentMonth =
      month === today.getMonth() && year === today.getFullYear();

    return (
      <motion.div
        onClick={() => onMonthClick(month)}
        className={cn(
          "bg-white rounded-xl p-3 cursor-pointer border transition-all",
          isCurrentMonth
            ? "border-primary shadow-md"
            : "border-gray-100 hover:border-gray-200 hover:shadow-sm"
        )}
        whileHover={{ scale: 1.02, y: -2 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: month * 0.05 }}
      >
        {/* Month name */}
        <div className="flex items-center justify-between mb-2">
          <h3
            className={cn(
              "font-bold text-sm",
              isCurrentMonth ? "text-primary" : "text-foreground"
            )}
          >
            {monthNames[month]}
          </h3>
          <div className="flex gap-1">
            {missionCount > 0 && (
              <span className="text-[10px] bg-purple/10 text-purple px-1.5 py-0.5 rounded-full font-medium">
                {missionCount}
              </span>
            )}
            {unavailableCount > 0 && (
              <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
                {unavailableCount}
              </span>
            )}
          </div>
        </div>

        {/* Mini calendar grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {/* Day headers */}
          {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
            <div
              key={i}
              className="text-[8px] text-text-light text-center font-medium"
            >
              {d}
            </div>
          ))}

          {/* Days */}
          {days.map((day, i) => {
            if (day === null) {
              return <div key={i} className="w-4 h-4" />;
            }

            const hasMissionToday = hasMission(day);
            const isUnavailableToday = isUnavailable(day);
            const isTodayDate =
              day === today.getDate() &&
              month === today.getMonth() &&
              year === today.getFullYear();

            return (
              <div
                key={i}
                className={cn(
                  "w-4 h-4 flex items-center justify-center text-[8px] rounded-sm",
                  isTodayDate && "bg-primary text-white font-bold",
                  !isTodayDate && hasMissionToday && "bg-purple/30",
                  !isTodayDate && isUnavailableToday && "bg-red-200",
                  !isTodayDate &&
                    !hasMissionToday &&
                    !isUnavailableToday &&
                    "text-text-light"
                )}
              >
                {day}
              </div>
            );
          })}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 12 }, (_, i) => (
        <MiniMonth key={i} month={i} />
      ))}
    </div>
  );
}
