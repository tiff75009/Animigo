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
      // Pour les missions collectives, utiliser les dates des créneaux réservés
      if (mission.sessionType === "collective" && mission.collectiveSlotDates) {
        mission.collectiveSlotDates.forEach((dateStr) => {
          const date = new Date(dateStr);
          if (date.getFullYear() === year) {
            counts[date.getMonth()]++;
          }
        });
        return;
      }

      // Pour les missions multi-séances, utiliser les dates des séances
      if (mission.sessions && mission.sessions.length > 0) {
        mission.sessions.forEach((session) => {
          const date = new Date(session.date);
          if (date.getFullYear() === year) {
            counts[date.getMonth()]++;
          }
        });
        return;
      }

      // Pour les missions standard (uni-séance), utiliser la plage startDate-endDate
      const startDate = new Date(mission.startDate);
      const endDate = new Date(mission.endDate);

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
      return missions.some((m) => {
        // Pour les missions collectives, utiliser les dates des créneaux réservés
        if (m.sessionType === "collective" && m.collectiveSlotDates) {
          return m.collectiveSlotDates.includes(dateStr);
        }

        // Pour les missions multi-séances, utiliser les dates des séances
        if (m.sessions && m.sessions.length > 0) {
          return m.sessions.some((s) => s.date === dateStr);
        }

        // Pour les missions standard (uni-séance), utiliser la plage startDate-endDate
        return m.startDate <= dateStr && m.endDate >= dateStr;
      });
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
        className="p-3 cursor-pointer transition-all hover:shadow-[0_10px_30px_rgba(30,30,28,0.06)] hover:-translate-y-0.5"
        style={{
          borderRadius: 14,
          background: "#fff",
          border: `1px solid ${isCurrentMonth ? "#1f3a33" : "#ece9e1"}`,
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: month * 0.04 }}
      >
        {/* Month name + badges */}
        <div className="flex items-center justify-between mb-2">
          <div className="min-w-0">
            <div className="text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: "#9c9484" }}>
              {isCurrentMonth ? "Mois en cours" : ""}
            </div>
            <h3
              className="text-[14px] font-semibold tracking-[-0.01em] capitalize"
              style={{ color: isCurrentMonth ? "#1f3a33" : "#1f1f1d" }}
            >
              {monthNames[month]}
            </h3>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {missionCount > 0 && (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                style={{ border: "1px solid #cfdbd3", color: "#2f4a3f", background: "#fff" }}
                title={`${missionCount} mission${missionCount > 1 ? "s" : ""}`}
              >
                {missionCount}
              </span>
            )}
            {unavailableCount > 0 && (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                style={{ border: "1px solid #f1cdcd", color: "#8a3a3a", background: "#fff" }}
                title={`${unavailableCount} jour${unavailableCount > 1 ? "s" : ""} indispo`}
              >
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
              className="text-[9px] text-center font-medium pb-0.5"
              style={{ color: "#cdc9c0" }}
            >
              {d}
            </div>
          ))}

          {/* Days */}
          {days.map((day, i) => {
            if (day === null) {
              return <div key={i} className="w-5 h-5" />;
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
                className="w-5 h-5 flex items-center justify-center text-[9px] rounded-full"
                style={
                  isTodayDate
                    ? { background: "#1f3a33", color: "#f7f5ef", fontWeight: 700 }
                    : hasMissionToday
                      ? { background: "#f5f9f6", color: "#1f3a33", fontWeight: 600 }
                      : isUnavailableToday
                        ? { background: "#fdf0f0", color: "#8a3a3a" }
                        : { color: "#9c9484" }
                }
              >
                {day}
              </div>
            );
          })}
        </div>

        {/* Légende compacte au-dessous (visible si données) */}
        {(missionCount > 0 || unavailableCount > 0) && (
          <div className="flex items-center justify-center gap-2 mt-2 pt-2" style={{ borderTop: "1px solid #f7f5ef" }}>
            {missionCount > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#1f3a33" }} />
                <span className="text-[9px]" style={{ color: "#9c9484" }}>Mission</span>
              </div>
            )}
            {unavailableCount > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#8a3a3a" }} />
                <span className="text-[9px]" style={{ color: "#9c9484" }}>Indispo</span>
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: 12 }, (_, i) => (
        <MiniMonth key={i} month={i} />
      ))}
    </div>
  );
}
