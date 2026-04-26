"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/app/lib/utils";
import { Users } from "lucide-react";
import {
  Mission,
  Availability,
  CollectiveSlot,
  availabilityColors,
  dayNames,
  formatDateLocal,
  getMissionVisualStyle,
} from "../types";
import { CategoryType } from "@/app/hooks/usePlanning";

interface WeekViewProps {
  currentDate: Date;
  missions: Mission[];
  availability: Availability[];
  collectiveSlots?: CollectiveSlot[];
  categoryTypes?: CategoryType[];
  selectedTypeId?: string | null;
  dynamicSlots?: {
    morning: { start: string; end: string } | null;
    afternoon: { start: string; end: string } | null;
    evening: { start: string; end: string } | null;
  };
  onDayClick: (date: string) => void;
  onRangeSelect?: (startDate: string, endDate: string) => void;
  onMissionClick: (mission: Mission) => void;
  onSlotClick?: (slot: CollectiveSlot) => void;
}

const HOUR_HEIGHT = 56;

export function WeekView({
  currentDate,
  missions,
  availability,
  collectiveSlots = [],
  categoryTypes = [],
  selectedTypeId,
  dynamicSlots,
  onDayClick,
  onRangeSelect,
  onMissionClick,
  onSlotClick,
}: WeekViewProps) {
  // Plages de travail dynamiques (depuis paramètres)
  const parseHour = (t: string): number => parseInt(t.split(":")[0] ?? "0", 10);
  const workingStart = dynamicSlots?.morning ? parseHour(dynamicSlots.morning.start) : 8;
  const workingEnd = dynamicSlots?.evening
    ? parseHour(dynamicSlots.evening.end)
    : dynamicSlots?.afternoon
      ? parseHour(dynamicSlots.afternoon.end)
      : 20;
  const displayStart = Math.max(0, workingStart - 1);
  const displayEnd = Math.min(24, workingEnd + 1);
  const hours = useMemo(
    () => Array.from({ length: displayEnd - displayStart }, (_, i) => i + displayStart),
    [displayStart, displayEnd]
  );

  // Current time line
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(i);
  }, []);

  // Auto-scroll au current time
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollContainerRef.current) {
      const top = (now.getHours() - displayStart) * HOUR_HEIGHT - 200;
      scrollContainerRef.current.scrollTop = Math.max(0, top);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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

  // Détermine si une heure (entière) est dispo pour un jour donné
  const isHourAvailable = (date: Date, hour: number): "full" | "none" => {
    const avs = getAvailabilitiesForDate(date);
    if (avs.some((a) => a.status === "available")) return "full";
    const partials = avs.filter((a) => a.status === "partial");
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

  const nowFractionalHour = now.getHours() + now.getMinutes() / 60;
  const todayIndex = weekDates.findIndex((d) => isToday(d));

  // Détection mobile : sur mobile on bascule en vue Agenda (style Google Calendar)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ──────────────────────────────────────────────────────────────────
  // VUE MOBILE — Barre de jours horizontale + liste verticale
  // (style Google Calendar mobile classique)
  // ──────────────────────────────────────────────────────────────────
  // Index du jour sélectionné dans la semaine (par défaut today si dans la semaine, sinon 0)
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(() => {
    const idx = weekDates.findIndex((d) => isToday(d));
    return idx >= 0 ? idx : 0;
  });

  // Resync si la semaine change (navigation Prev/Next)
  useEffect(() => {
    if (!isMobile) return;
    const todayIdx = weekDates.findIndex((d) => isToday(d));
    setSelectedDayIndex(todayIdx >= 0 ? todayIdx : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate.getTime(), isMobile]);

  if (isMobile) {
    const selectedDate = weekDates[selectedDayIndex] ?? weekDates[0];
    const selectedDateStr = formatDateLocal(selectedDate);
    const selectedPast = isPastDate(selectedDate);
    const selectedAvs = getAvailabilitiesForDate(selectedDate);
    const selectedSlots = getSlotsForDate(selectedDate);
    const selectedMissions = getMissionsForDate(selectedDate).filter(
      (m) => m.sessionType !== "collective"
    );
    const hasContent = selectedSlots.length > 0 || selectedMissions.length > 0;

    // Statut dispo global du jour sélectionné
    let dispoLabel = "Indispo";
    let dispoStyle: React.CSSProperties = {
      background: "#fcfaf4",
      color: "#9c9484",
      border: "1px solid #ece9e1",
    };
    if (selectedAvs.some((a) => a.status === "available")) {
      dispoLabel = "Dispo journée";
      dispoStyle = { background: "#f5f9f6", color: "#2f4a3f", border: "1px solid #cfdbd3" };
    } else if (selectedAvs.some((a) => a.status === "partial")) {
      dispoLabel = "Dispo partielle";
      dispoStyle = { background: "#fdf8ec", color: "#7a5b1a", border: "1px solid #f4e6c1" };
    }

    return (
      <div className="space-y-3">
        {/* Barre horizontale des 7 jours (sticky) */}
        <div
          className="bg-white p-1.5 sticky top-0 z-20"
          style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
        >
          <div className="grid grid-cols-7 gap-0.5">
            {weekDates.map((date, idx) => {
              const dateStr = formatDateLocal(date);
              const past = isPastDate(date);
              const todayDay = isToday(date);
              const isSelected = idx === selectedDayIndex;
              const dayAvs = getAvailabilitiesForDate(date);
              const daySlots = getSlotsForDate(date);
              const dayMissions = getMissionsForDate(date).filter(
                (m) => m.sessionType !== "collective"
              );
              const eventCount = daySlots.length + dayMissions.length;

              // Statut dispo bref pour micro-indicateur
              const hasAvailable = dayAvs.some((a) => a.status === "available");
              const hasPartial = dayAvs.some((a) => a.status === "partial");
              const dotColor = hasAvailable
                ? "#2f4a3f"
                : hasPartial
                  ? "#c9a14a"
                  : null;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDayIndex(idx);
                  }}
                  onDoubleClick={() => onDayClick(dateStr)}
                  className="flex flex-col items-center justify-center py-2 px-1 transition-all"
                  style={{
                    borderRadius: 10,
                    background: isSelected
                      ? "#1f3a33"
                      : todayDay
                        ? "#f5f9f6"
                        : "transparent",
                    border: `1px solid ${
                      isSelected
                        ? "#1f3a33"
                        : todayDay
                          ? "#cfdbd3"
                          : "transparent"
                    }`,
                    opacity: past ? 0.5 : 1,
                  }}
                >
                  <span
                    className="text-[9px] font-medium uppercase tracking-[0.05em]"
                    style={{
                      color: isSelected
                        ? "rgba(247,245,239,0.8)"
                        : todayDay
                          ? "#1f3a33"
                          : "#9c9484",
                    }}
                  >
                    {dayNames[idx].slice(0, 3)}
                  </span>
                  <span
                    className="text-[16px] font-bold tracking-[-0.02em] leading-none mt-0.5"
                    style={{
                      color: isSelected
                        ? "#f7f5ef"
                        : todayDay
                          ? "#1f3a33"
                          : past
                            ? "#cdc9c0"
                            : "#1f1f1d",
                    }}
                  >
                    {date.getDate()}
                  </span>
                  {/* Indicateur événements */}
                  <div className="flex items-center gap-0.5 mt-1 h-1.5">
                    {eventCount > 0 && (
                      <span
                        className="w-1 h-1 rounded-full"
                        style={{ background: isSelected ? "#f7f5ef" : "#1f3a33" }}
                      />
                    )}
                    {dotColor && eventCount === 0 && !past && (
                      <span
                        className="w-1 h-1 rounded-full"
                        style={{ background: isSelected ? "#f7f5ef" : dotColor }}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Détail du jour sélectionné */}
        <div
          className="bg-white p-3"
          style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
        >
          {/* Header jour */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <div className="text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: "#9c9484" }}>
                {isToday(selectedDate) ? "Aujourd'hui" : ""}
              </div>
              <h3 className="text-[15px] font-semibold text-[#1f1f1d] tracking-[-0.01em] capitalize m-0">
                {selectedDate.toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </h3>
            </div>
            <div className="flex flex-col items-end gap-1">
              {!selectedPast && (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={dispoStyle}
                >
                  {dispoLabel}
                </span>
              )}
              {!selectedPast && (
                <button
                  type="button"
                  onClick={() => onDayClick(selectedDateStr)}
                  className="text-[11px] font-medium underline"
                  style={{ color: "#1f3a33" }}
                >
                  Modifier dispo
                </button>
              )}
            </div>
          </div>

          {/* Liste événements */}
          {hasContent ? (
            <div className="space-y-1.5">
              {selectedSlots.map((slot) => {
                const hasBookings = slot.bookings && slot.bookings.length > 0;
                return (
                  <button
                    key={slot._id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSlotClick?.(slot);
                    }}
                    className="w-full flex items-center gap-2 p-2.5 text-left transition-colors hover:bg-[#f7f5ef]"
                    style={{
                      borderRadius: 10,
                      background: hasBookings ? "#f5f9f6" : "#fcfaf4",
                      border: `1px solid ${hasBookings ? "#cfdbd3" : "#f1ede3"}`,
                      borderLeft: `3px solid #1f3a33`,
                    }}
                  >
                    <Users className="w-4 h-4 flex-shrink-0" style={{ color: "#1f3a33" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#1f1f1d] tracking-[-0.01em] truncate">
                        {slot.variantName}
                      </p>
                      <p className="text-[11px]" style={{ color: "#6d6d68" }}>
                        {slot.startTime} – {slot.endTime}
                      </p>
                    </div>
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0"
                      style={{ background: "#1f3a33", color: "#f7f5ef" }}
                    >
                      {hasBookings
                        ? `${slot.bookings![0].animalEmoji} ${slot.bookings!.length}`
                        : `${slot.bookedAnimals}/${slot.maxAnimals}`}
                    </span>
                  </button>
                );
              })}
              {selectedMissions.map((mission) => {
                const vs = getMissionVisualStyle(mission);
                return (
                  <button
                    key={mission.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMissionClick(mission);
                    }}
                    className="w-full flex items-center gap-2 p-2.5 text-left transition-colors hover:brightness-95"
                    style={{
                      borderRadius: 10,
                      background: vs.background,
                      border: `1px solid ${vs.borderColor}`,
                      borderLeft: `3px ${vs.borderStyle} ${vs.borderLeftColor}`,
                      color: vs.textColor,
                    }}
                  >
                    <span className="text-[18px] flex-shrink-0">
                      {mission.animals && mission.animals.length > 1
                        ? mission.animals.map((a) => a.emoji).join("")
                        : mission.animal.emoji}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[13px] font-semibold tracking-[-0.01em] truncate"
                        style={{ color: vs.textColor }}
                      >
                        {mission.animals && mission.animals.length > 1
                          ? mission.animals.map((a) => a.name).join(", ")
                          : mission.animal.name}
                      </p>
                      <p
                        className="text-[11px] truncate"
                        style={{ color: vs.subTextColor }}
                      >
                        {mission.startTime || "09:00"} – {mission.endTime || "18:00"} · {mission.serviceName}
                      </p>
                    </div>
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium flex-shrink-0 uppercase tracking-[0.05em]"
                      style={{
                        background: "rgba(255,255,255,0.7)",
                        color: vs.textColor,
                        border: `1px solid ${vs.borderLeftColor}`,
                      }}
                    >
                      {vs.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div
              className="text-center py-6"
              style={{ borderRadius: 10, background: "#fcfaf4", border: "1px solid #f1ede3" }}
            >
              <p className="text-[12px]" style={{ color: "#9c9484" }}>
                {selectedPast ? "Pas d'événement ce jour" : "Aucun événement prévu"}
              </p>
              {!selectedPast && (
                <p className="text-[11px] mt-1" style={{ color: "#cdc9c0" }}>
                  Cliquez sur &quot;Modifier dispo&quot; pour gérer ce jour
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // VUE GRILLE DESKTOP (≥ md)
  // ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="overflow-x-auto select-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="min-w-[800px]">
        {/* Header with days */}
        <div
          className="grid gap-1 mb-2"
          style={{ gridTemplateColumns: "64px repeat(7, minmax(0, 1fr))" }}
        >
          {/* Empty cell for time column */}
          <div />
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
                className="text-center py-3 transition-colors"
                style={{
                  borderRadius: 12,
                  border: `1px solid ${
                    past
                      ? "#f1ede3"
                      : inSelection
                        ? "#1f3a33"
                        : today
                          ? "#1f3a33"
                          : "#ece9e1"
                  }`,
                  background: past
                    ? "#fcfaf4"
                    : inSelection
                      ? "#f5f9f6"
                      : today
                        ? "#f5f9f6"
                        : !inSelection && bgClass.includes("green")
                          ? "#f5f9f6"
                          : !inSelection && bgClass.includes("orange")
                            ? "#fdf8ec"
                            : "#fff",
                  cursor: past ? "not-allowed" : "pointer",
                  opacity: past ? 0.6 : 1,
                }}
              >
                <div className="flex items-center justify-between px-2">
                  <p
                    className="text-[10px] font-medium uppercase tracking-[0.1em]"
                    style={{ color: past ? "#cdc9c0" : "#9c9484" }}
                  >
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
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: type.color }}
                            title={`${type.name}: ${typeAvail.status === "available" ? "Disponible" : "Partiel"}`}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
                <p
                  className="text-[18px] font-semibold tracking-[-0.02em]"
                  style={{
                    color: past
                      ? "#cdc9c0"
                      : today || inSelection
                        ? "#1f3a33"
                        : "#1f1f1d",
                  }}
                >
                  {date.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        {/* Time grid (style Google Calendar : current time line + layer dispo) */}
        <div
          ref={scrollContainerRef}
          className="relative overflow-auto max-h-[640px]"
          style={{ borderRadius: 14, border: "1px solid #ece9e1", background: "#fff" }}
        >
          {/* Hour rows */}
          {hours.map((hour) => (
            <div
              key={hour}
              className="grid relative"
              style={{
                gridTemplateColumns: "64px repeat(7, minmax(0, 1fr))",
                borderBottom: "1px solid #f7f5ef",
                height: HOUR_HEIGHT,
              }}
            >
              {/* Time label */}
              <div
                className="px-2 text-[10px] font-medium pt-1 sticky left-0 z-10"
                style={{ color: "#9c9484", background: "#fcfaf4", borderRight: "1px solid #f1ede3" }}
              >
                {hour}h
              </div>
              {/* Day cells avec layer dispo */}
              {weekDates.map((date, dayIndex) => {
                const dateStr = formatDateLocal(date);
                const past = isPastDate(date);
                const todayDay = isToday(date);
                const availStatus = isHourAvailable(date, hour);
                const isWorkingHour = hour >= workingStart && hour < workingEnd;

                return (
                  <div
                    key={dayIndex}
                    onClick={() => !past && onDayClick(dateStr)}
                    className={cn(
                      "transition-colors relative",
                      past ? "cursor-not-allowed" : "cursor-pointer hover:bg-[#f7f5ef]"
                    )}
                    style={{
                      borderRight: dayIndex < 6 ? "1px solid #f7f5ef" : "none",
                      background: past
                        ? "#fcfaf4"
                        : availStatus === "full"
                          ? "rgba(245,249,246,0.5)"
                          : isWorkingHour
                            ? todayDay
                              ? "rgba(31,58,51,0.02)"
                              : "#fff"
                            : "#fcfaf4",
                    }}
                  >
                    {/* 30-min subdivision */}
                    <div
                      className="absolute left-0 right-0 pointer-events-none"
                      style={{
                        top: HOUR_HEIGHT / 2,
                        borderTop: "1px dashed #f7f5ef",
                      }}
                    />
                    {/* Diagonal stripes pour heures non-dispo dans heures de travail */}
                    {availStatus === "none" && isWorkingHour && !past && (
                      <div
                        className="absolute inset-0 opacity-40 pointer-events-none"
                        style={{
                          background:
                            "repeating-linear-gradient(45deg, transparent, transparent 6px, #f1ede3 6px, #f1ede3 7px)",
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Current time line (rouge style Google) — uniquement sur la colonne d'aujourd'hui */}
          {todayIndex >= 0 &&
            nowFractionalHour >= displayStart &&
            nowFractionalHour <= displayEnd && (
              <div
                className="absolute pointer-events-none"
                style={{
                  top: (nowFractionalHour - displayStart) * HOUR_HEIGHT,
                  left: `calc(64px + ${todayIndex} * ((100% - 64px) / 7))`,
                  width: `calc((100% - 64px) / 7)`,
                  zIndex: 30,
                }}
              >
                <div className="relative">
                  <div
                    className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full"
                    style={{ background: "#c45656" }}
                  />
                  <div className="h-px" style={{ background: "#c45656" }} />
                </div>
              </div>
            )}

          {/* Collective slot overlays */}
          {weekDates.map((date, dayIndex) => {
            const daySlots = getSlotsForDate(date);

            return daySlots.map((slot, slotIndex) => {
              const startHour = parseTimeToHours(slot.startTime);
              const endHour = parseTimeToHours(slot.endTime);

              const top = (startHour - displayStart) * HOUR_HEIGHT;
              const height = Math.max((endHour - startHour) * HOUR_HEIGHT - 2, 36);
              const hasBookings = slot.bookings && slot.bookings.length > 0;

              return (
                <motion.div
                  key={`slot-${slot._id}-${dayIndex}`}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSlotClick?.(slot);
                  }}
                  className="absolute p-2 text-[11px] cursor-pointer overflow-hidden"
                  style={{
                    borderRadius: 8,
                    background: hasBookings ? "#1f3a33" : "#fff",
                    color: hasBookings ? "#f7f5ef" : "#1f3a33",
                    border: `1px solid ${hasBookings ? "#1f3a33" : "#cfdbd3"}`,
                    borderLeft: `3px solid #1f3a33`,
                    top: `${top}px`,
                    left: `calc(64px + ${dayIndex} * ((100% - 64px) / 7) + 2px)`,
                    width: `calc((100% - 64px) / 7 - 4px)`,
                    height: `${height}px`,
                    zIndex: hasBookings ? 20 + slotIndex : 15 + slotIndex,
                  }}
                  whileHover={{ scale: 1.02, zIndex: 50 }}
                >
                  <div className="flex items-center gap-1 font-semibold truncate tracking-[-0.01em]">
                    <Users className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{slot.variantName}</span>
                  </div>
                  <div className="truncate opacity-90 text-[10px]">
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

              const top = (startHour - displayStart) * HOUR_HEIGHT;
              const height = Math.max((endHour - startHour) * HOUR_HEIGHT - 2, 36);
              const vs = getMissionVisualStyle(mission);

              return (
                <motion.div
                  key={`${mission.id}-${dayIndex}`}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMissionClick(mission);
                  }}
                  className="absolute p-2 text-[11px] cursor-pointer overflow-hidden"
                  style={{
                    borderRadius: 8,
                    background: vs.background,
                    color: vs.textColor,
                    border: `1px solid ${vs.borderColor}`,
                    borderLeft: `3px ${vs.borderStyle} ${vs.borderLeftColor}`,
                    top: `${top}px`,
                    left: `calc(64px + ${dayIndex} * ((100% - 64px) / 7) + 2px)`,
                    width: `calc((100% - 64px) / 7 - 4px)`,
                    height: `${Math.max(height, 32)}px`,
                    marginLeft: slotOffset + missionIndex * 4,
                    zIndex: 10 + missionIndex,
                  }}
                  whileHover={{ scale: 1.02, zIndex: 50 }}
                >
                  <div
                    className="font-semibold truncate tracking-[-0.01em]"
                    style={{ color: vs.textColor }}
                  >
                    {mission.animals && mission.animals.length > 1
                      ? `${mission.animals.map((a) => a.emoji).join("")} ${mission.animals.map((a) => a.name).join(", ")}`
                      : `${mission.animal.emoji} ${mission.animal.name}`}
                  </div>
                  <div
                    className="truncate text-[10px]"
                    style={{ color: vs.subTextColor }}
                  >
                    {mission.serviceName}
                  </div>
                </motion.div>
              );
            });
          })}
        </div>
      </div>
    </div>
  );
}
