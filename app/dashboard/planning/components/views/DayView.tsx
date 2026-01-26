"use client";

import { motion } from "framer-motion";
import { Clock, MapPin, Euro, User, Users } from "lucide-react";
import { cn } from "@/app/lib/utils";
import {
  Mission,
  Availability,
  CollectiveSlot,
  statusColors,
  statusLabels,
  availabilityColors,
  availabilityLabels,
  formatPrice,
  formatDateLocal,
} from "../types";

interface DayViewProps {
  currentDate: Date;
  missions: Mission[];
  availability: Availability[];
  collectiveSlots?: CollectiveSlot[];
  onMissionClick: (mission: Mission) => void;
  onToggleAvailability: (date: string) => void;
  onSlotClick?: (slot: CollectiveSlot) => void;
}

const hours = Array.from({ length: 24 }, (_, i) => i);

export function DayView({
  currentDate,
  missions,
  availability,
  collectiveSlots = [],
  onMissionClick,
  onToggleAvailability,
  onSlotClick,
}: DayViewProps) {
  const dateStr = formatDateLocal(currentDate);

  // Get day's missions
  const dayMissions = missions.filter((mission) => {
    return mission.startDate <= dateStr && mission.endDate >= dateStr;
  });

  // Get day's collective slots
  const daySlots = collectiveSlots.filter((slot) => slot.date === dateStr);

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
            {daySlots.length > 0 && (
              <span className="ml-2 text-purple-600">
                • {daySlots.length} créneau{daySlots.length > 1 ? "x" : ""} collectif{daySlots.length > 1 ? "s" : ""}
              </span>
            )}
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

          {/* Collective slot blocks */}
          {daySlots.map((slot, index) => {
            const startHour = parseTimeToHours(slot.startTime);
            const endHour = parseTimeToHours(slot.endTime);

            const top = startHour * 48;
            const height = Math.max((endHour - startHour) * 48, 60);

            const isFull = slot.bookedAnimals >= slot.maxAnimals;

            return (
              <motion.div
                key={slot._id}
                onClick={() => onSlotClick?.(slot)}
                className={cn(
                  "absolute left-2 right-2 rounded-xl p-3 text-white cursor-pointer overflow-hidden shadow-lg border-l-4",
                  isFull
                    ? "bg-purple-600 border-purple-800"
                    : "bg-purple-500 border-purple-700"
                )}
                style={{
                  top: `${top}px`,
                  height: `${height}px`,
                  zIndex: 20 + index,
                }}
                whileHover={{ scale: 1.01, zIndex: 50 }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-5 h-5" />
                      <span className="font-bold truncate">
                        {slot.variantName}
                      </span>
                    </div>
                    <p className="text-sm opacity-90 truncate">
                      {slot.serviceName}
                    </p>
                  </div>
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-full flex-shrink-0",
                    isFull ? "bg-white/30" : "bg-white/20"
                  )}>
                    {isFull ? "Complet" : `${slot.availableSpots} place${slot.availableSpots > 1 ? "s" : ""}`}
                  </span>
                </div>

                {height > 80 && (
                  <div className="mt-2 space-y-1 text-xs opacity-80">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{slot.startTime} - {slot.endTime}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{slot.bookedAnimals}/{slot.maxAnimals} réservés</span>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}

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
                  marginLeft: (daySlots.length + index) * 8, // Offset overlapping
                  zIndex: 10 + index,
                }}
                whileHover={{ scale: 1.01, zIndex: 50 }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (daySlots.length + index) * 0.1 }}
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
      {dayMissions.length === 0 && daySlots.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-text-light">Aucune mission ou créneau ce jour</p>
          <p className="text-sm text-text-light mt-1">
            Cliquez sur le bouton de disponibilité pour gérer vos créneaux
          </p>
        </div>
      )}
    </div>
  );
}
