"use client";

import { motion } from "framer-motion";
import { Clock, MapPin, Euro, User } from "lucide-react";
import { cn } from "@/app/lib/utils";
import {
  Mission,
  Availability,
  statusColors,
  statusLabels,
  availabilityColors,
  availabilityLabels,
  formatPrice,
} from "../types";

interface DayViewProps {
  currentDate: Date;
  missions: Mission[];
  availability: Availability[];
  onMissionClick: (mission: Mission) => void;
  onToggleAvailability: (date: string) => void;
}

const hours = Array.from({ length: 24 }, (_, i) => i);

export function DayView({
  currentDate,
  missions,
  availability,
  onMissionClick,
  onToggleAvailability,
}: DayViewProps) {
  const dateStr = currentDate.toISOString().split("T")[0];

  // Get day's missions
  const dayMissions = missions.filter((mission) => {
    return mission.startDate <= dateStr && mission.endDate >= dateStr;
  });

  // Get day's availability
  const dayAvailability = availability.find((a) => a.date === dateStr);

  // Parse time to hours
  const parseTimeToHours = (time: string): number => {
    const [h, m] = time.split(":").map(Number);
    return h + m / 60;
  };

  // Format date for display
  const formatDateDisplay = (date: Date): string => {
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Day header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
        <div>
          <h3 className="text-lg font-bold text-foreground capitalize">
            {formatDateDisplay(currentDate)}
          </h3>
          <p className="text-sm text-text-light">
            {dayMissions.length} mission{dayMissions.length > 1 ? "s" : ""}
          </p>
        </div>

        {/* Availability toggle */}
        <button
          onClick={() => onToggleAvailability(dateStr)}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
            dayAvailability
              ? availabilityColors[dayAvailability.status]
              : "bg-green-100 text-green-800 border-green-200"
          )}
        >
          {dayAvailability
            ? availabilityLabels[dayAvailability.status]
            : "Disponible"}
        </button>
      </div>

      {/* Timeline */}
      <div className="flex gap-4">
        {/* Time column */}
        <div className="w-16 flex-shrink-0">
          {hours.map((hour) => (
            <div
              key={hour}
              className="h-12 flex items-start justify-end pr-2 text-xs text-text-light"
            >
              {hour.toString().padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {/* Events column */}
        <div className="flex-1 relative border-l border-gray-200">
          {/* Hour lines */}
          {hours.map((hour) => (
            <div
              key={hour}
              className={cn(
                "h-12 border-b border-gray-100",
                dayAvailability?.status === "unavailable" && "bg-red-50/30"
              )}
            />
          ))}

          {/* Mission blocks */}
          {dayMissions.map((mission, index) => {
            const startHour = mission.startTime
              ? parseTimeToHours(mission.startTime)
              : 9;
            const endHour = mission.endTime
              ? parseTimeToHours(mission.endTime)
              : 18;

            const top = startHour * 48; // 48px per hour (h-12)
            const height = Math.max((endHour - startHour) * 48, 60);

            return (
              <motion.div
                key={mission.id}
                onClick={() => onMissionClick(mission)}
                className={cn(
                  "absolute left-2 right-2 rounded-xl p-3 text-white cursor-pointer overflow-hidden shadow-lg",
                  statusColors[mission.status]
                )}
                style={{
                  top: `${top}px`,
                  height: `${height}px`,
                  marginLeft: index * 8, // Offset overlapping
                  zIndex: 10 + index,
                }}
                whileHover={{ scale: 1.01, zIndex: 50 }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{mission.animal.emoji}</span>
                      <span className="font-bold truncate">
                        {mission.animal.name}
                      </span>
                    </div>
                    <p className="text-sm opacity-90 truncate">
                      {mission.serviceName}
                    </p>
                  </div>
                  <span className="text-xs bg-white/20 px-2 py-1 rounded-full flex-shrink-0">
                    {statusLabels[mission.status]}
                  </span>
                </div>

                {height > 80 && (
                  <div className="mt-2 space-y-1 text-xs opacity-80">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>
                        {mission.startTime || "09:00"} -{" "}
                        {mission.endTime || "18:00"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{mission.clientName}</span>
                    </div>
                    {height > 120 && (
                      <>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{mission.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Euro className="w-3 h-3" />
                          <span>{formatPrice(mission.amount)}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Empty state */}
      {dayMissions.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-text-light">Aucune mission ce jour</p>
          <p className="text-sm text-text-light mt-1">
            Cliquez sur le bouton de disponibilite pour gerer vos creneaux
          </p>
        </div>
      )}
    </div>
  );
}
