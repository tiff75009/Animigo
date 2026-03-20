"use client";

import { useState, useCallback, memo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Users,
  X as XIcon,
} from "lucide-react";
import { cn } from "@/app/lib/utils";

type AvailView = "3days" | "week" | "month";

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const shortDayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const fullDayNames = ["L", "M", "M", "J", "V", "S", "D"];
const monthNamesShort = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const monthNamesFull = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

// Couleurs des statuts de mission
const missionStatusColors: Record<string, string> = {
  completed: "bg-green-500",
  in_progress: "bg-blue-500",
  upcoming: "bg-purple",
  pending_acceptance: "bg-amber-500",
  pending_confirmation: "bg-orange-500",
  refused: "bg-red-400",
  cancelled: "bg-gray-400",
};

const missionStatusLabels: Record<string, string> = {
  completed: "Terminée",
  in_progress: "En cours",
  upcoming: "À venir",
  pending_acceptance: "À accepter",
  pending_confirmation: "À confirmer",
  refused: "Refusée",
  cancelled: "Annulée",
};

type DayStatus = "free" | "partial" | "full" | "unavailable" | "none";

const statusConfig: Record<DayStatus, { dot: string; bg: string; border: string; text: string; label: string }> = {
  free: { dot: "bg-emerald-400", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", label: "Libre" },
  partial: { dot: "bg-orange-400", bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", label: "Partiel" },
  full: { dot: "bg-red-400", bg: "bg-red-50", border: "border-red-200", text: "text-red-600", label: "Complet" },
  unavailable: { dot: "bg-gray-300", bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-400", label: "Indispo" },
  none: { dot: "bg-gray-200", bg: "", border: "border-gray-100", text: "text-gray-900", label: "—" },
};

interface DashboardAvailabilityCalendarProps {
  token: string | null;
}

const DashboardAvailabilityCalendar = memo(function DashboardAvailabilityCalendar({ token }: DashboardAvailabilityCalendarProps) {
  const [view, setView] = useState<AvailView>("3days");
  const [offset, setOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = formatDateKey(today);

  // Calcul des jours affichés selon la vue
  const { days, startDate, endDate, label } = (() => {
    if (view === "month") {
      const baseMonth = new Date(today.getFullYear(), today.getMonth() + offset, 1);
      const y = baseMonth.getFullYear();
      const m = baseMonth.getMonth();
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const allDays: Date[] = [];
      for (let i = 1; i <= daysInMonth; i++) allDays.push(new Date(y, m, i));
      return {
        days: allDays,
        startDate: formatDateKey(allDays[0]),
        endDate: formatDateKey(allDays[allDays.length - 1]),
        label: `${monthNamesFull[m]} ${y}`,
      };
    }
    const count = view === "3days" ? 3 : 7;
    const base = new Date(today);
    base.setDate(base.getDate() + offset * count);
    const allDays: Date[] = [];
    for (let i = 0; i < count; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      allDays.push(d);
    }
    const first = allDays[0];
    const last = allDays[allDays.length - 1];
    const lbl = first.getMonth() === last.getMonth()
      ? `${first.getDate()} – ${last.getDate()} ${monthNamesShort[first.getMonth()]}`
      : `${first.getDate()} ${monthNamesShort[first.getMonth()]} – ${last.getDate()} ${monthNamesShort[last.getMonth()]}`;
    return { days: allDays, startDate: formatDateKey(first), endDate: formatDateKey(last), label: lbl };
  })();

  // 3 queries dashboard (missions, availability, collectiveSlots)
  const availabilityData = useQuery(
    api.planning.availability.getAvailabilityByDateRange,
    token ? { token, startDate, endDate } : "skip"
  );

  const missionsData = useQuery(
    api.planning.missions.getMissionsByDateRange,
    token ? { token, startDate, endDate } : "skip"
  );

  const collectiveSlotsRaw = useQuery(
    api.planning.collectiveSlots.getSlotsByUser,
    token ? { token, startDate, endDate } : "skip"
  );

  // Statut du jour
  const getDayStatus = useCallback((dateKey: string): DayStatus => {
    const dayAvails = availabilityData?.filter((a: { date: string }) => a.date === dateKey) || [];
    const hasAvailable = dayAvails.some((a: { status: string }) => a.status === "available");
    const hasPartial = dayAvails.some((a: { status: string }) => a.status === "partial");
    const allUnavailable = dayAvails.length > 0 && dayAvails.every((a: { status: string }) => a.status === "unavailable");

    if (dayAvails.length === 0) return "none";
    if (allUnavailable) return "unavailable";

    const dayMissions = missionsData?.filter((m: { status: string; sessionType?: string; collectiveSlotDates?: string[]; sessions?: { date: string }[]; startDate: string; endDate: string }) => {
      if (m.status === "cancelled" || m.status === "refused") return false;
      if (m.sessionType === "collective" && m.collectiveSlotDates) return m.collectiveSlotDates.includes(dateKey);
      if (m.sessions && m.sessions.length > 0) return m.sessions.some((s: { date: string }) => s.date === dateKey);
      return m.startDate <= dateKey && m.endDate >= dateKey;
    }) || [];

    const daySlots = collectiveSlotsRaw?.filter(
      (s: { date: string; isCancelled: boolean; isActive: boolean }) =>
        s.date === dateKey && !s.isCancelled && s.isActive
    ) || [];

    const hasBookings = dayMissions.length > 0 || daySlots.some((s: { bookedAnimals: number }) => s.bookedAnimals > 0);

    if (!hasBookings) {
      if (hasAvailable) return "free";
      if (hasPartial) return "partial";
      return "none";
    }

    if (hasAvailable || hasPartial) return "partial";
    return "full";
  }, [availabilityData, missionsData, collectiveSlotsRaw]);

  // Missions par date
  const getMissionsForDate = useCallback((dateKey: string) => {
    if (!missionsData) return [];
    return missionsData.filter((m: { status: string; sessionType?: string; collectiveSlotDates?: string[]; sessions?: { date: string }[]; startDate: string; endDate: string }) => {
      if (m.status === "cancelled" || m.status === "refused") return false;
      if (m.sessionType === "collective" && m.collectiveSlotDates) return m.collectiveSlotDates.includes(dateKey);
      if (m.sessions && m.sessions.length > 0) return m.sessions.some((s) => s.date === dateKey);
      return m.startDate <= dateKey && m.endDate >= dateKey;
    });
  }, [missionsData]);

  // Créneaux collectifs par date
  const getSlotsForDate = useCallback((dateKey: string) => {
    if (!collectiveSlotsRaw) return [];
    return collectiveSlotsRaw.filter(
      (s: { date: string; isCancelled: boolean; isActive: boolean }) =>
        s.date === dateKey && !s.isCancelled && s.isActive
    );
  }, [collectiveSlotsRaw]);

  // Taux de remplissage
  const fillRate = (() => {
    if (!availabilityData) return null;
    const futureDays = days.filter(d => formatDateKey(d) >= todayKey);
    if (futureDays.length === 0) return null;
    const availCount = futureDays.filter(d => {
      const s = getDayStatus(formatDateKey(d));
      return s === "free" || s === "partial";
    }).length;
    return Math.round((availCount / futureDays.length) * 100);
  })();

  return (
    <div>
      {/* Tabs de vue */}
      <div className="flex items-center gap-1 p-0.5 bg-gray-100 rounded-xl mb-4">
        {([["3days", "3 jours"], ["week", "Semaine"], ["month", "Mois"]] as const).map(([key, lbl]) => (
          <button
            key={key}
            onClick={() => { setView(key); setOffset(0); setSelectedDate(null); }}
            className={cn(
              "flex-1 text-[11px] font-semibold py-1.5 rounded-lg transition-all",
              view === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* Navigation + taux de remplissage */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setOffset(o => o - 1)}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div className="text-center">
          <p className="text-xs font-semibold text-gray-900">{label}</p>
          {fillRate !== null && (
            <p className={cn("text-[10px] font-medium mt-0.5", fillRate >= 60 ? "text-emerald-600" : fillRate >= 30 ? "text-amber-600" : "text-gray-400")}>
              {fillRate}% disponible
            </p>
          )}
        </div>
        <button
          onClick={() => setOffset(o => o + 1)}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Message si aucune disponibilité */}
      {availabilityData && availabilityData.length > 0 && availabilityData.every((a: { status: string }) => a.status === "unavailable") && (!collectiveSlotsRaw || collectiveSlotsRaw.length === 0) && (
        <div className="text-center py-4 mb-3">
          <Calendar className="w-6 h-6 text-gray-300 mx-auto mb-1.5" />
          <p className="text-xs text-gray-500">Aucune disponibilité configurée</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Configurez vos disponibilités dans le planning</p>
        </div>
      )}

      {/* Vue 3 jours / Semaine */}
      {view !== "month" ? (
        <div className={cn("grid gap-1.5", view === "3days" ? "grid-cols-3" : "grid-cols-7")}>
          {days.map((day) => {
            const dateKey = formatDateKey(day);
            const isToday = dateKey === todayKey;
            const isPast = dateKey < todayKey;
            const status = getDayStatus(dateKey);
            const cfg = statusConfig[status];
            const slots = getSlotsForDate(dateKey);
            const missions = getMissionsForDate(dateKey);
            const nonCollectiveMissions = missions.filter((m: { sessionType?: string }) => m.sessionType !== "collective");

            const isClickable = !isPast && status !== "none";
            const isDateSelected = selectedDate === dateKey;

            return (
              <div
                key={dateKey}
                onClick={() => isClickable && setSelectedDate(isDateSelected ? null : dateKey)}
                className={cn(
                  "rounded-xl border p-2 transition-colors",
                  isPast ? "opacity-40 border-gray-100" : cfg.border,
                  isToday && !isDateSelected && "ring-1 ring-primary/40",
                  isClickable && "cursor-pointer hover:shadow-md",
                  isDateSelected && "ring-2 ring-primary border-primary/30 shadow-md"
                )}
              >
                <div className="text-center mb-1.5">
                  <p className={cn("text-[10px] font-medium", isPast ? "text-gray-400" : "text-gray-500")}>
                    {shortDayNames[day.getDay()]}
                  </p>
                  <p className={cn(
                    "text-lg font-bold leading-tight",
                    isDateSelected ? "text-primary" : isToday ? "text-primary" : isPast ? "text-gray-300" : "text-gray-900"
                  )}>
                    {day.getDate()}
                  </p>
                </div>
                {/* Badge statut */}
                <div className={cn("flex items-center justify-center gap-1 px-1.5 py-1 rounded-lg text-[10px] font-semibold", cfg.bg, cfg.text)}>
                  <div className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                  {cfg.label}
                </div>
                {/* Créneaux collectifs */}
                {slots.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    {slots.slice(0, view === "3days" ? 3 : 2).map((slot: { _id: string; bookedAnimals: number; maxAnimals: number; startTime?: string; endTime?: string }) => {
                      const placesLeft = slot.maxAnimals - slot.bookedAnimals;
                      const fillPct = slot.maxAnimals > 0 ? (slot.bookedAnimals / slot.maxAnimals) * 100 : 0;
                      return (
                        <div key={slot._id} className="bg-purple-50 rounded-md px-1.5 py-1 border border-purple-100">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-medium text-purple-700">
                              {slot.startTime && slot.endTime ? `${slot.startTime}–${slot.endTime}` : "Collectif"}
                            </span>
                            <span className={cn("text-[9px] font-bold", placesLeft > 0 ? "text-purple-600" : "text-gray-400")}>
                              {placesLeft > 0 ? `${placesLeft} pl.` : "Complet"}
                            </span>
                          </div>
                          <div className="h-1 bg-purple-100 rounded-full mt-0.5 overflow-hidden">
                            <div className={cn("h-full rounded-full", fillPct >= 100 ? "bg-gray-400" : "bg-purple-500")} style={{ width: `${Math.min(fillPct, 100)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    {slots.length > (view === "3days" ? 3 : 2) && (
                      <p className="text-[9px] text-purple-400 text-center">+{slots.length - (view === "3days" ? 3 : 2)}</p>
                    )}
                  </div>
                )}
                {/* Missions (vue 3 jours uniquement) */}
                {view === "3days" && nonCollectiveMissions.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    {nonCollectiveMissions.slice(0, 2).map((mission: { id: string; status: string; animal: { emoji: string; name: string }; animals?: { emoji: string; name: string }[] }) => (
                      <div
                        key={mission.id}
                        className={cn(
                          "h-4 rounded-md text-white text-[8px] leading-[16px] px-1.5 truncate",
                          missionStatusColors[mission.status] || "bg-gray-400"
                        )}
                      >
                        {mission.animals && mission.animals.length > 1
                          ? mission.animals.map((a) => a.emoji).join("")
                          : `${mission.animal.emoji} ${mission.animal.name}`
                        }
                      </div>
                    ))}
                    {nonCollectiveMissions.length > 2 && (
                      <p className="text-[8px] text-gray-400 text-center">+{nonCollectiveMissions.length - 2}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Vue Mois */
        (() => {
          const firstDay = days[0];
          const firstDowRaw = firstDay.getDay();
          const adjustedFirst = firstDowRaw === 0 ? 6 : firstDowRaw - 1;
          return (
            <>
              <div className="grid grid-cols-7 gap-0.5 mb-0.5">
                {fullDayNames.map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-medium text-gray-400 py-0.5">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: adjustedFirst }).map((_, i) => (
                  <div key={`e-${i}`} className="h-10" />
                ))}
                {days.map((day) => {
                  const dateKey = formatDateKey(day);
                  const isToday = dateKey === todayKey;
                  const isPast = dateKey < todayKey;
                  const status = getDayStatus(dateKey);
                  const cfg = statusConfig[status];
                  const slots = getSlotsForDate(dateKey);
                  const missions = getMissionsForDate(dateKey);
                  const nonCollectiveMissions = missions.filter((m: { sessionType?: string }) => m.sessionType !== "collective");
                  const totalEvents = nonCollectiveMissions.length + slots.length;

                  const isClickable = !isPast && status !== "none";
                  const isDateSelected = selectedDate === dateKey;

                  return (
                    <div
                      key={dateKey}
                      onClick={() => isClickable && setSelectedDate(isDateSelected ? null : dateKey)}
                      className={cn(
                        "h-10 rounded-lg border flex flex-col items-center justify-center transition-colors relative",
                        isPast ? "opacity-40 border-gray-50" : cfg.border,
                        isToday && !isDateSelected && "ring-1 ring-primary/40",
                        !isPast && status !== "none" && cfg.bg,
                        isClickable && "cursor-pointer hover:shadow-sm",
                        isDateSelected && "ring-2 ring-primary border-primary/30 shadow-sm"
                      )}
                    >
                      <span className={cn(
                        "text-[11px] font-semibold",
                        isDateSelected ? "text-primary" : isToday ? "text-primary" : isPast ? "text-gray-300" : cfg.text === "text-gray-900" ? "text-gray-900" : cfg.text
                      )}>
                        {day.getDate()}
                      </span>
                      {/* Indicateurs d'événements */}
                      {totalEvents > 0 && !isPast && (
                        <div className="flex gap-0.5 mt-0.5">
                          {slots.slice(0, 2).map((s: { _id: string; bookedAnimals: number; maxAnimals: number }) => (
                            <div key={s._id} className={cn("w-1 h-1 rounded-full", s.bookedAnimals >= s.maxAnimals ? "bg-gray-400" : "bg-purple-500")} />
                          ))}
                          {nonCollectiveMissions.slice(0, 3 - Math.min(slots.length, 2)).map((m: { id: string; status: string }) => (
                            <div key={m.id} className={cn("w-1 h-1 rounded-full", missionStatusColors[m.status]?.replace("bg-", "bg-") || "bg-gray-400")} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()
      )}

      {/* Détail du jour sélectionné */}
      <AnimatePresence>
        {selectedDate && (() => {
          const selDay = new Date(selectedDate + "T00:00:00");
          const status = getDayStatus(selectedDate);
          const cfg = statusConfig[status];
          const missions = getMissionsForDate(selectedDate);
          const nonCollectiveMissions = missions.filter((m: { sessionType?: string }) => m.sessionType !== "collective");
          const collectiveSlots = getSlotsForDate(selectedDate);
          const dayLabel = `${shortDayNames[selDay.getDay()]} ${selDay.getDate()} ${monthNamesShort[selDay.getMonth()]}`;

          return (
            <motion.div
              key={selectedDate}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                {/* En-tête du jour */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", cfg.dot)} />
                    <span className="text-xs font-bold text-gray-900">{dayLabel}</span>
                    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-md", cfg.bg, cfg.text)}>
                      {cfg.label}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="p-0.5 hover:bg-gray-200 rounded transition-colors"
                  >
                    <XIcon className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                </div>

                {/* Missions individuelles */}
                {nonCollectiveMissions.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Missions ({nonCollectiveMissions.length})
                    </p>
                    <div className="space-y-1">
                      {nonCollectiveMissions.map((mission: {
                        id: string;
                        status: string;
                        animal: { emoji: string; name: string };
                        animals?: { emoji: string; name: string }[];
                        serviceName?: string;
                        startTime?: string;
                        endTime?: string;
                      }) => (
                        <div key={mission.id} className="flex items-center gap-2 px-2.5 py-2 bg-white rounded-lg border border-gray-100">
                          <div className={cn("w-2 h-2 rounded-full flex-shrink-0", missionStatusColors[mission.status] || "bg-gray-400")} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-semibold text-gray-900 truncate">
                                {mission.animals && mission.animals.length > 1
                                  ? mission.animals.map((a) => `${a.emoji} ${a.name}`).join(", ")
                                  : `${mission.animal.emoji} ${mission.animal.name}`
                                }
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {mission.startTime && mission.endTime && (
                                <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" />
                                  {mission.startTime}–{mission.endTime}
                                </span>
                              )}
                              {mission.serviceName && (
                                <span className="text-[10px] text-gray-400 truncate">{mission.serviceName}</span>
                              )}
                            </div>
                          </div>
                          <span className={cn(
                            "text-[9px] font-semibold px-1.5 py-0.5 rounded",
                            missionStatusColors[mission.status]?.replace("bg-", "bg-") || "bg-gray-100",
                            "text-white"
                          )}>
                            {missionStatusLabels[mission.status] || mission.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Créneaux collectifs */}
                {collectiveSlots.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Séances collectives ({collectiveSlots.length})
                    </p>
                    <div className="space-y-1.5">
                      {collectiveSlots.map((slot: {
                        _id: string;
                        bookedAnimals: number;
                        maxAnimals: number;
                        startTime?: string;
                        endTime?: string;
                        variantName?: string;
                        bookings?: { animalEmoji: string; animalName: string; clientName: string }[];
                      }) => {
                        const placesLeft = slot.maxAnimals - slot.bookedAnimals;
                        const fillPct = slot.maxAnimals > 0 ? (slot.bookedAnimals / slot.maxAnimals) * 100 : 0;
                        return (
                          <div key={slot._id} className="px-2.5 py-2 bg-white rounded-lg border border-purple-100">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-purple-500" />
                                <span className="text-[11px] font-semibold text-purple-700">
                                  {slot.startTime && slot.endTime ? `${slot.startTime} – ${slot.endTime}` : "Collectif"}
                                </span>
                                {slot.variantName && (
                                  <span className="text-[9px] text-purple-400">{slot.variantName}</span>
                                )}
                              </div>
                              <span className={cn("text-[10px] font-bold", placesLeft > 0 ? "text-purple-600" : "text-gray-400")}>
                                {placesLeft > 0 ? `${placesLeft}/${slot.maxAnimals} pl.` : "Complet"}
                              </span>
                            </div>
                            <div className="h-1.5 bg-purple-100 rounded-full overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all", fillPct >= 100 ? "bg-gray-400" : "bg-purple-500")} style={{ width: `${Math.min(fillPct, 100)}%` }} />
                            </div>
                            {/* Participants */}
                            {slot.bookings && slot.bookings.length > 0 && (
                              <div className="flex items-center gap-1 mt-1.5">
                                <Users className="w-3 h-3 text-purple-400" />
                                <div className="flex flex-wrap gap-1">
                                  {slot.bookings.slice(0, 5).map((b, i) => (
                                    <span key={i} className="text-[9px] text-purple-600 bg-purple-50 px-1 py-0.5 rounded">
                                      {b.animalEmoji} {b.animalName}
                                    </span>
                                  ))}
                                  {slot.bookings.length > 5 && (
                                    <span className="text-[9px] text-purple-400">+{slot.bookings.length - 5}</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Message si aucun contenu */}
                {nonCollectiveMissions.length === 0 && collectiveSlots.length === 0 && (
                  <div className="text-center py-2">
                    <p className="text-xs text-gray-500">Aucune mission ou créneau pour ce jour</p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Légende compacte */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-3 pt-3 border-t border-gray-100">
        {([
          ["Libre", "bg-emerald-400"],
          ["Partiel", "bg-orange-400"],
          ["Complet", "bg-red-400"],
          ["Indispo", "bg-gray-300"],
        ] as const).map(([lbl, dot]) => (
          <div key={lbl} className="flex items-center gap-1">
            <div className={cn("w-2 h-2 rounded-full", dot)} />
            <span className="text-[10px] text-gray-500">{lbl}</span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-[10px] text-gray-500">Collectif</span>
        </div>
      </div>
    </div>
  );
});

export default DashboardAvailabilityCalendar;
