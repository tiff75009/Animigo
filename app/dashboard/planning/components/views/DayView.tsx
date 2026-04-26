"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Clock, MapPin, Euro, User, Users, CalendarOff } from "lucide-react";
import { cn } from "@/app/lib/utils";
import {
  Mission,
  Availability,
  CollectiveSlot,
  formatPrice,
  formatDateLocal,
  getMissionVisualStyle,
} from "../types";

interface DayViewProps {
  currentDate: Date;
  missions: Mission[];
  availability: Availability[];
  collectiveSlots?: CollectiveSlot[];
  dynamicSlots?: {
    morning: { start: string; end: string } | null;
    afternoon: { start: string; end: string } | null;
    evening: { start: string; end: string } | null;
  };
  onMissionClick: (mission: Mission) => void;
  onToggleAvailability: (date: string) => void;
  onSlotClick?: (slot: CollectiveSlot) => void;
}

const HOUR_HEIGHT_DESKTOP = 56;
const HOUR_HEIGHT_MOBILE = 48;
const TIME_COL_DESKTOP = 60;
const TIME_COL_MOBILE = 44;

// Parse HH:MM to fractional hours (e.g. "09:30" → 9.5)
const parseTimeToHours = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return h + m / 60;
};

export function DayView({
  currentDate,
  missions,
  availability,
  collectiveSlots = [],
  dynamicSlots,
  onMissionClick,
  onToggleAvailability,
  onSlotClick,
}: DayViewProps) {
  const dateStr = formatDateLocal(currentDate);

  // Plages horaires de travail (depuis paramètres planning)
  const workingStart = useMemo(() => {
    if (dynamicSlots?.morning) return parseTimeToHours(dynamicSlots.morning.start);
    return 8;
  }, [dynamicSlots]);

  const workingEnd = useMemo(() => {
    if (dynamicSlots?.evening) return parseTimeToHours(dynamicSlots.evening.end);
    if (dynamicSlots?.afternoon) return parseTimeToHours(dynamicSlots.afternoon.end);
    return 20;
  }, [dynamicSlots]);

  // Plage affichée : 1h avant working start → 1h après working end
  const displayStart = Math.max(0, Math.floor(workingStart) - 1);
  const displayEnd = Math.min(24, Math.ceil(workingEnd) + 1);
  const visibleHours = useMemo(
    () => Array.from({ length: displayEnd - displayStart }, (_, i) => i + displayStart),
    [displayStart, displayEnd]
  );

  const isPastDate = (): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(currentDate);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  const isToday = (): boolean => {
    const today = new Date();
    return (
      currentDate.getDate() === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const past = isPastDate();
  const today = isToday();

  // Détection mobile (≤ 640px) pour adapter densité
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  const HOUR_HEIGHT = isMobile ? HOUR_HEIGHT_MOBILE : HOUR_HEIGHT_DESKTOP;
  const TIME_COL = isMobile ? TIME_COL_MOBILE : TIME_COL_DESKTOP;

  // Current time pour la barre rouge
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    if (!today) return;
    const interval = setInterval(() => setNow(new Date()), 60_000); // refresh chaque minute
    return () => clearInterval(interval);
  }, [today]);

  const nowFractionalHour = now.getHours() + now.getMinutes() / 60;
  const currentTimeTop = (nowFractionalHour - displayStart) * HOUR_HEIGHT;
  const showCurrentTime = today && nowFractionalHour >= displayStart && nowFractionalHour <= displayEnd;

  // Auto-scroll au current time au mount
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (today && scrollContainerRef.current) {
      const target = Math.max(0, currentTimeTop - 200);
      scrollContainerRef.current.scrollTop = target;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  // Day's missions (filtrer collectives)
  const dayMissions = missions.filter((mission) => {
    if (mission.sessionType === "collective") return false;
    if (mission.sessions && mission.sessions.length > 0) {
      return mission.sessions.some((s) => s.date === dateStr);
    }
    return mission.startDate <= dateStr && mission.endDate >= dateStr;
  });

  const daySlots = collectiveSlots
    .filter((slot) => slot.date === dateStr)
    .sort((a, b) => {
      const aHas = a.bookings && a.bookings.length > 0 ? 1 : 0;
      const bHas = b.bookings && b.bookings.length > 0 ? 1 : 0;
      return bHas - aHas;
    });

  // Disponibilités du jour (toutes confondues)
  const dayAvailabilities = availability.filter((a) => a.date === dateStr);

  // Détermine si une heure (fractionnaire) est dans une plage de dispo
  const isHourAvailable = (hour: number): "full" | "partial" | "none" => {
    // S'il y a au moins une dispo "available" → full
    if (dayAvailabilities.some((a) => a.status === "available")) return "full";

    // Pour partial : vérifier les timeSlots
    const partials = dayAvailabilities.filter((a) => a.status === "partial");
    if (partials.length === 0) return "none";

    for (const a of partials) {
      if (!a.timeSlots) continue;
      for (const slot of a.timeSlots) {
        const start = parseTimeToHours(slot.startTime);
        const end = parseTimeToHours(slot.endTime);
        if (hour >= start && hour < end) return "full";
      }
    }
    return "none";
  };

  const formatDateDisplay = (date: Date): string => {
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const totalHeight = visibleHours.length * HOUR_HEIGHT;

  return (
    <div className="space-y-3">
      {/* Day header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3 sm:p-4"
        style={{ borderRadius: 14, background: "#fff", border: "1px solid #ece9e1" }}
      >
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-0.5">
            Aujourd&apos;hui
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-[#1f1f1d] tracking-[-0.01em] capitalize truncate m-0">
            {formatDateDisplay(currentDate)}
          </h3>
          <p className="text-[12px] text-[#6d6d68] mt-0.5">
            {dayMissions.length} mission{dayMissions.length > 1 ? "s" : ""}
            {daySlots.length > 0 && (
              <span className="ml-1.5" style={{ color: "#1f3a33" }}>
                · {daySlots.length} créneau{daySlots.length > 1 ? "x" : ""} collectif{daySlots.length > 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>

        <button
          onClick={() => !past && onToggleAvailability(dateStr)}
          disabled={past}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors flex-shrink-0",
            past && "cursor-not-allowed"
          )}
          style={
            past
              ? { background: "#fcfaf4", color: "#cdc9c0", border: "1px solid #f1ede3" }
              : { background: "#1f3a33", color: "#f7f5ef", border: "1px solid #1f3a33" }
          }
        >
          {past ? "Passé" : "Modifier ma dispo"}
        </button>
      </div>

      {/* Timeline grid (style Google Calendar) */}
      <div
        ref={scrollContainerRef}
        className="overflow-auto max-h-[640px]"
        style={{ borderRadius: 14, border: "1px solid #ece9e1", background: "#fff" }}
      >
        <div className="flex" style={{ minHeight: totalHeight }}>
          {/* Time column */}
          <div
            className="flex-shrink-0 sticky left-0 z-10"
            style={{ width: TIME_COL, background: "#fcfaf4", borderRight: "1px solid #f1ede3" }}
          >
            {visibleHours.map((hour) => (
              <div
                key={hour}
                className="flex items-start justify-end pr-2 text-[10px] font-medium pt-1"
                style={{ height: HOUR_HEIGHT, color: "#9c9484" }}
              >
                {hour}h
              </div>
            ))}
          </div>

          {/* Events column */}
          <div className="flex-1 relative">
            {/* Background availability layer (working hours = white, indispo = greyed pattern) */}
            {visibleHours.map((hour, idx) => {
              const availStatus = isHourAvailable(hour);
              const isWorkingHour = hour >= workingStart && hour < workingEnd;
              return (
                <div
                  key={hour}
                  className="relative"
                  style={{
                    height: HOUR_HEIGHT,
                    borderBottom: "1px solid #f7f5ef",
                    background:
                      availStatus === "full"
                        ? "rgba(245,249,246,0.5)"
                        : isWorkingHour
                          ? "#fff"
                          : "#fcfaf4",
                  }}
                >
                  {/* 30-min subdivision */}
                  <div
                    className="absolute left-0 right-0"
                    style={{
                      top: HOUR_HEIGHT / 2,
                      borderTop: "1px dashed #f1ede3",
                    }}
                  />
                  {/* Diagonal stripes pour les heures non-dispo */}
                  {availStatus === "none" && isWorkingHour && (
                    <div
                      className="absolute inset-0 opacity-50 pointer-events-none"
                      style={{
                        background:
                          "repeating-linear-gradient(45deg, transparent, transparent 8px, #f1ede3 8px, #f1ede3 9px)",
                      }}
                    />
                  )}
                </div>
              );
            })}

            {/* Current time line (rouge style Google) */}
            {showCurrentTime && (
              <div
                className="absolute left-0 right-0 pointer-events-none"
                style={{
                  top: currentTimeTop,
                  zIndex: 30,
                }}
              >
                <div className="relative">
                  <div
                    className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full"
                    style={{ background: "#c45656" }}
                  />
                  <div
                    className="h-px"
                    style={{ background: "#c45656" }}
                  />
                </div>
              </div>
            )}

            {/* Collective slot blocks */}
            {daySlots.map((slot, index) => {
              const startHour = parseTimeToHours(slot.startTime);
              const endHour = parseTimeToHours(slot.endTime);
              const top = (startHour - displayStart) * HOUR_HEIGHT;
              const height = Math.max((endHour - startHour) * HOUR_HEIGHT - 2, 36);
              const hasBookings = slot.bookings && slot.bookings.length > 0;
              const isFull = slot.bookedAnimals >= slot.maxAnimals;

              return (
                <motion.div
                  key={slot._id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSlotClick?.(slot);
                  }}
                  className="absolute left-2 right-2 p-2 cursor-pointer overflow-hidden"
                  style={{
                    borderRadius: 10,
                    background: hasBookings ? "#1f3a33" : "#fff",
                    color: hasBookings ? "#f7f5ef" : "#1f3a33",
                    border: `1px solid ${hasBookings ? "#1f3a33" : "#cfdbd3"}`,
                    borderLeft: `3px solid #1f3a33`,
                    top,
                    height,
                    zIndex: 20 + index,
                    boxShadow: hasBookings ? "0 4px 12px rgba(31,58,51,0.15)" : "none",
                  }}
                  whileHover={{ scale: 1.005, zIndex: 50 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Users className="w-3 h-3 flex-shrink-0" />
                        <span className="font-semibold tracking-[-0.01em] truncate text-[12px]">
                          {slot.variantName}
                        </span>
                      </div>
                      <p className="text-[10px] opacity-80 truncate">{slot.serviceName}</p>
                    </div>
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0"
                      style={{
                        background: hasBookings ? "rgba(247,245,239,0.2)" : "#f5f9f6",
                        border: hasBookings ? "none" : "1px solid #cfdbd3",
                      }}
                    >
                      {hasBookings
                        ? `${slot.bookings![0].animalEmoji} ${slot.bookings!.length}`
                        : isFull
                          ? "Complet"
                          : `${slot.availableSpots} pl.`}
                    </span>
                  </div>
                  {height > 60 && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] opacity-70">
                      <Clock className="w-2.5 h-2.5" />
                      <span>
                        {slot.startTime} – {slot.endTime}
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}

            {/* Mission blocks */}
            {dayMissions.map((mission, index) => {
              const startHour = mission.startTime ? parseTimeToHours(mission.startTime) : 9;
              const endHour = mission.endTime ? parseTimeToHours(mission.endTime) : 18;
              const top = (startHour - displayStart) * HOUR_HEIGHT;
              const height = Math.max((endHour - startHour) * HOUR_HEIGHT - 2, 36);
              const vs = getMissionVisualStyle(mission);

              return (
                <motion.div
                  key={mission.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMissionClick(mission);
                  }}
                  className="absolute left-2 right-2 p-2 cursor-pointer overflow-hidden"
                  style={{
                    borderRadius: 10,
                    top,
                    height,
                    marginLeft: (daySlots.length + index) * 6,
                    zIndex: 10 + index,
                    boxShadow: "0 4px 12px rgba(30,30,28,0.06)",
                    background: vs.background,
                    color: vs.textColor,
                    border: `1px solid ${vs.borderColor}`,
                    borderLeft: `3px ${vs.borderStyle} ${vs.borderLeftColor}`,
                  }}
                  whileHover={{ scale: 1.005, zIndex: 50 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[14px]">
                          {mission.animals && mission.animals.length > 1
                            ? mission.animals.map((a) => a.emoji).join("")
                            : mission.animal.emoji}
                        </span>
                        <span
                          className="font-semibold tracking-[-0.01em] truncate text-[12px]"
                          style={{ color: vs.textColor }}
                        >
                          {mission.animals && mission.animals.length > 1
                            ? mission.animals.map((a) => a.name).join(", ")
                            : mission.animal.name}
                        </span>
                      </div>
                      <p
                        className="text-[10px] truncate"
                        style={{ color: vs.subTextColor }}
                      >
                        {mission.serviceName}
                      </p>
                    </div>
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium uppercase tracking-[0.05em]"
                      style={{
                        background: "rgba(255,255,255,0.7)",
                        color: vs.textColor,
                        border: `1px solid ${vs.borderLeftColor}`,
                      }}
                    >
                      {vs.shortLabel}
                    </span>
                  </div>
                  {height > 80 && (
                    <div
                      className="mt-1.5 space-y-0.5 text-[10px]"
                      style={{ color: vs.subTextColor }}
                    >
                      <div className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>
                          {mission.startTime || "09:00"} – {mission.endTime || "18:00"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-2.5 h-2.5" />
                        <span>{mission.clientName}</span>
                      </div>
                      {height > 120 && (
                        <>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" />
                            <span className="truncate">{mission.location}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Euro className="w-2.5 h-2.5" />
                            <span>{formatPrice(mission.serviceAmount ?? mission.amount)}</span>
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
      </div>

      {/* Empty state */}
      {dayMissions.length === 0 && daySlots.length === 0 && (
        <div
          className="text-center py-8"
          style={{ borderRadius: 12, background: "#fcfaf4", border: "1px solid #f1ede3" }}
        >
          <CalendarOff className="w-9 h-9 mx-auto mb-2" style={{ color: "#cdc9c0" }} />
          <p className="text-[13px] text-[#6d6d68]">Aucune mission ou créneau ce jour</p>
          <p className="text-[11px] mt-1" style={{ color: "#9c9484" }}>
            Cliquez sur &quot;Modifier ma dispo&quot; pour gérer vos créneaux
          </p>
        </div>
      )}
    </div>
  );
}
