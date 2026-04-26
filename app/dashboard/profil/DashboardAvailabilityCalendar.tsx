"use client";

import { useState, useMemo, useCallback, memo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  Users,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/app/lib/utils";

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const fullDayNames = ["L", "M", "M", "J", "V", "S", "D"];
const monthNamesShort = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const monthNamesFull = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

// Couleurs des statuts de mission (palette sobre)
const missionStatusDot: Record<string, string> = {
  completed: "#10b981",
  in_progress: "#0ea5e9",
  upcoming: "#1f3a33",
  pending_acceptance: "#f59e0b",
  pending_confirmation: "#f97316",
  refused: "#fb7185",
  cancelled: "#a8a29e",
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

interface DashboardAvailabilityCalendarProps {
  token: string | null;
}

const DashboardAvailabilityCalendar = memo(function DashboardAvailabilityCalendar({ token }: DashboardAvailabilityCalendarProps) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const todayKey = formatDateKey(today);

  // Mois affiché — on charge AUSSI les 30 jours suivants pour la liste "À venir"
  const { days, monthStart, monthEnd, futureWindowEnd, label } = useMemo(() => {
    const baseMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const y = baseMonth.getFullYear();
    const m = baseMonth.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const allDays: Date[] = [];
    for (let i = 1; i <= daysInMonth; i++) allDays.push(new Date(y, m, i));

    // Étendre la fenêtre de recherche pour la liste "À venir" : aujourd'hui + 30j
    const futureEnd = new Date(today);
    futureEnd.setDate(futureEnd.getDate() + 30);

    const start = formatDateKey(allDays[0]);
    const end = formatDateKey(allDays[allDays.length - 1]);
    const wEnd = formatDateKey(futureEnd) > end ? formatDateKey(futureEnd) : end;

    return {
      days: allDays,
      monthStart: start,
      monthEnd: end,
      futureWindowEnd: wEnd,
      label: `${monthNamesFull[m]} ${y}`,
    };
  }, [monthOffset, today]);

  // 3 queries — fenêtre élargie pour englober "À venir"
  const queryStart = monthStart < todayKey ? monthStart : todayKey;
  const availabilityData = useQuery(
    api.planning.availability.getAvailabilityByDateRange,
    token ? { token, startDate: queryStart, endDate: futureWindowEnd } : "skip"
  );
  const missionsData = useQuery(
    api.planning.missions.getMissionsByDateRange,
    token ? { token, startDate: queryStart, endDate: futureWindowEnd } : "skip"
  );
  const collectiveSlotsRaw = useQuery(
    api.planning.collectiveSlots.getSlotsByUser,
    token ? { token, startDate: queryStart, endDate: futureWindowEnd } : "skip"
  );

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

  const getMissionsForDate = useCallback((dateKey: string) => {
    if (!missionsData) return [];
    return missionsData.filter((m: { status: string; sessionType?: string; collectiveSlotDates?: string[]; sessions?: { date: string }[]; startDate: string; endDate: string }) => {
      if (m.status === "cancelled" || m.status === "refused") return false;
      if (m.sessionType === "collective" && m.collectiveSlotDates) return m.collectiveSlotDates.includes(dateKey);
      if (m.sessions && m.sessions.length > 0) return m.sessions.some((s) => s.date === dateKey);
      return m.startDate <= dateKey && m.endDate >= dateKey;
    });
  }, [missionsData]);

  const getSlotsForDate = useCallback((dateKey: string) => {
    if (!collectiveSlotsRaw) return [];
    return collectiveSlotsRaw.filter(
      (s: { date: string; isCancelled: boolean; isActive: boolean }) =>
        s.date === dateKey && !s.isCancelled && s.isActive
    );
  }, [collectiveSlotsRaw]);

  // Stats compactes : libres ce mois, missions à venir
  const stats = useMemo(() => {
    const futureMonthDays = days.filter((d) => formatDateKey(d) >= todayKey);
    const freeCount = futureMonthDays.filter((d) => {
      const s = getDayStatus(formatDateKey(d));
      return s === "free" || s === "partial";
    }).length;

    // Missions à venir (max 30 jours)
    const upcomingMissions = (missionsData || []).filter((m: { status: string; startDate: string }) => {
      return (
        m.status !== "cancelled" &&
        m.status !== "refused" &&
        m.startDate >= todayKey &&
        m.startDate <= futureWindowEnd
      );
    });
    return { freeCount, upcomingCount: upcomingMissions.length };
  }, [days, todayKey, futureWindowEnd, missionsData, getDayStatus]);

  // Liste compacte des prochains événements (5 max)
  const upcomingEvents = useMemo(() => {
    type Evt = {
      key: string;
      date: string;
      time?: string;
      label: string;
      type: "mission" | "collective";
      status?: string;
      emoji?: string;
    };
    const events: Evt[] = [];
    if (missionsData) {
      for (const m of missionsData as Array<{
        id: string;
        status: string;
        startDate: string;
        startTime?: string;
        animal: { emoji: string; name: string };
        animals?: { emoji: string; name: string }[];
        serviceName?: string;
      }>) {
        if (m.status === "cancelled" || m.status === "refused") continue;
        if (m.startDate < todayKey || m.startDate > futureWindowEnd) continue;
        const animLabel =
          m.animals && m.animals.length > 1
            ? m.animals.map((a) => a.name).join(", ")
            : `${m.animal.name}`;
        const emoji =
          m.animals && m.animals.length > 1 ? m.animals[0].emoji : m.animal.emoji;
        events.push({
          key: `m-${m.id}`,
          date: m.startDate,
          time: m.startTime,
          label: `${animLabel}${m.serviceName ? ` · ${m.serviceName}` : ""}`,
          type: "mission",
          status: m.status,
          emoji,
        });
      }
    }
    if (collectiveSlotsRaw) {
      for (const s of collectiveSlotsRaw as Array<{
        _id: string;
        date: string;
        startTime?: string;
        endTime?: string;
        bookedAnimals: number;
        maxAnimals: number;
        isCancelled: boolean;
        isActive: boolean;
      }>) {
        if (s.isCancelled || !s.isActive) continue;
        if (s.date < todayKey || s.date > futureWindowEnd) continue;
        if (s.bookedAnimals === 0) continue; // ne lister que ceux qui ont des inscrits
        events.push({
          key: `s-${s._id}`,
          date: s.date,
          time: s.startTime,
          label: `Séance collective · ${s.bookedAnimals}/${s.maxAnimals} inscrits`,
          type: "collective",
        });
      }
    }
    events.sort((a, b) => {
      const c = a.date.localeCompare(b.date);
      if (c !== 0) return c;
      return (a.time || "").localeCompare(b.time || "");
    });
    return events.slice(0, 5);
  }, [missionsData, collectiveSlotsRaw, todayKey, futureWindowEnd]);

  // Premier jour aligné lundi
  const firstDow = (() => {
    const d = days[0]?.getDay() ?? 0;
    return d === 0 ? 6 : d - 1;
  })();

  // Helper : dot couleur selon status
  const statusDotColor = (s: DayStatus): string => {
    if (s === "free") return "#1f3a33";
    if (s === "partial") return "#f59e0b";
    if (s === "full") return "#fb7185";
    if (s === "unavailable") return "#cdc9c0";
    return "transparent";
  };

  return (
    <div className="space-y-3.5">
      {/* ─── Header widget : nom du mois + nav ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMonthOffset((o) => o - 1)}
            className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-[#f7f5ef]"
            aria-label="Mois précédent"
          >
            <ChevronLeft className="w-3.5 h-3.5" style={{ color: "#1f1f1d" }} />
          </button>
          <button
            onClick={() => setMonthOffset((o) => o + 1)}
            className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-[#f7f5ef]"
            aria-label="Mois suivant"
          >
            <ChevronRight className="w-3.5 h-3.5" style={{ color: "#1f1f1d" }} />
          </button>
        </div>
        <span className="text-[13px] font-semibold tracking-[-0.01em]" style={{ color: "#1f1f1d" }}>
          {label}
        </span>
        {monthOffset !== 0 ? (
          <button
            onClick={() => { setMonthOffset(0); setSelectedDate(null); }}
            className="px-2.5 py-1 rounded-full text-[10.5px] font-semibold transition-colors hover:bg-[#f7f5ef]"
            style={{ color: "#1f3a33", border: "1px solid #cfdbd3", background: "#f5f9f6" }}
          >
            Aujourd&apos;hui
          </button>
        ) : (
          <span className="w-[68px]" />
        )}
      </div>

      {/* ─── Mini calendrier mensuel ─── */}
      <div>
        {/* En-tête jours */}
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {fullDayNames.map((d, i) => (
            <div
              key={i}
              className="text-center text-[10px] font-medium py-0.5"
              style={{ color: "#9c9484" }}
            >
              {d}
            </div>
          ))}
        </div>
        {/* Cellules jours */}
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={`e-${i}`} className="aspect-square" />
          ))}
          {days.map((day) => {
            const dateKey = formatDateKey(day);
            const isToday = dateKey === todayKey;
            const isPast = dateKey < todayKey;
            const status = getDayStatus(dateKey);
            const slots = getSlotsForDate(dateKey);
            const missions = getMissionsForDate(dateKey);
            const totalEvents = missions.length + slots.length;
            const isClickable = !isPast && status !== "none";
            const isSelected = selectedDate === dateKey;

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => isClickable && setSelectedDate(isSelected ? null : dateKey)}
                disabled={!isClickable}
                className={cn(
                  "aspect-square flex flex-col items-center justify-center relative transition-all",
                  isPast && "opacity-40 cursor-default",
                  isClickable && "hover:bg-[#f7f5ef] cursor-pointer"
                )}
                style={{
                  borderRadius: 8,
                  background: isSelected ? "#1f3a33" : isToday ? "#f5f9f6" : "transparent",
                  border: isToday && !isSelected ? "1px solid #cfdbd3" : "1px solid transparent",
                }}
              >
                <span
                  className="text-[12px] font-semibold leading-none"
                  style={{
                    color: isSelected
                      ? "#f7f5ef"
                      : isToday
                      ? "#1f3a33"
                      : isPast
                      ? "#cdc9c0"
                      : "#1f1f1d",
                  }}
                >
                  {day.getDate()}
                </span>
                {/* Pastille de couleur (1 seule, le statut le plus important) */}
                {!isPast && status !== "none" && (
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-0.5"
                    style={{
                      background: isSelected ? "#f7f5ef" : statusDotColor(status),
                    }}
                  />
                )}
                {/* Badge nombre d'événements (si > 0 et pas dans le passé)
                    Couleur inversée si la cellule est sélectionnée (sinon
                    badge invisible : même fond #1f3a33 que la cellule active) */}
                {totalEvents > 0 && !isPast && (
                  <div
                    className="absolute top-0.5 right-0.5 min-w-[12px] h-[12px] px-0.5 flex items-center justify-center text-[8px] font-bold rounded-full leading-none"
                    style={
                      isSelected
                        ? { background: "#f7f5ef", color: "#1f3a33" }
                        : { background: "#1f3a33", color: "#f7f5ef" }
                    }
                  >
                    {totalEvents}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Stats compactes ─── */}
      <div className="grid grid-cols-2 gap-2">
        <div
          className="px-2.5 py-2 flex items-center gap-2"
          style={{ background: "#f5f9f6", borderRadius: 10, border: "1px solid #cfdbd3" }}
        >
          <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#1f3a33" }} />
          <div className="min-w-0">
            <div className="text-[14px] font-bold leading-none" style={{ color: "#1f3a33" }}>
              {stats.freeCount}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: "#1f3a33", opacity: 0.7 }}>
              jour{stats.freeCount > 1 ? "s" : ""} libre{stats.freeCount > 1 ? "s" : ""}
            </div>
          </div>
        </div>
        <div
          className="px-2.5 py-2 flex items-center gap-2"
          style={{ background: "#fcfaf4", borderRadius: 10, border: "1px solid #ece9e1" }}
        >
          <Users className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#6d6d68" }} />
          <div className="min-w-0">
            <div className="text-[14px] font-bold leading-none" style={{ color: "#1f1f1d" }}>
              {stats.upcomingCount}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: "#6d6d68" }}>
              mission{stats.upcomingCount > 1 ? "s" : ""} à venir
            </div>
          </div>
        </div>
      </div>

      {/* ─── Détail jour sélectionné OU liste "Prochains événements" ─── */}
      <AnimatePresence mode="wait">
        {selectedDate ? (
          (() => {
            const selDay = new Date(selectedDate + "T00:00:00");
            const dayMissions = getMissionsForDate(selectedDate);
            const daySlots = getSlotsForDate(selectedDate);
            const hasContent = dayMissions.length > 0 || daySlots.length > 0;
            return (
              <motion.div
                key={`day-${selectedDate}`}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: "#9c9484" }}>
                    {selDay.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                  </p>
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="text-[10.5px] font-semibold transition-colors hover:opacity-80"
                    style={{ color: "#6d6d68" }}
                  >
                    Voir tout
                  </button>
                </div>
                {hasContent ? (
                  <div className="space-y-1.5">
                    {dayMissions.slice(0, 4).map((m: {
                      id: string;
                      status: string;
                      startTime?: string;
                      endTime?: string;
                      animal: { emoji: string; name: string };
                      animals?: { emoji: string; name: string }[];
                      serviceName?: string;
                    }) => (
                      <EventRow
                        key={m.id}
                        emoji={m.animals?.[0]?.emoji || m.animal.emoji}
                        title={
                          m.animals && m.animals.length > 1
                            ? m.animals.map((a) => a.name).join(", ")
                            : m.animal.name
                        }
                        subtitle={m.serviceName}
                        time={m.startTime}
                        statusDot={missionStatusDot[m.status] || "#a8a29e"}
                        statusLabel={missionStatusLabels[m.status]}
                      />
                    ))}
                    {daySlots.slice(0, 4).map((s: {
                      _id: string;
                      bookedAnimals: number;
                      maxAnimals: number;
                      startTime?: string;
                      endTime?: string;
                    }) => (
                      <EventRow
                        key={s._id}
                        emoji="👥"
                        title="Séance collective"
                        subtitle={`${s.bookedAnimals}/${s.maxAnimals} inscrits`}
                        time={s.startTime}
                        statusDot="#1f3a33"
                        statusLabel="Collectif"
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] py-3 text-center" style={{ color: "#9c9484" }}>
                    Aucun événement ce jour
                  </p>
                )}
              </motion.div>
            );
          })()
        ) : (
          <motion.div
            key="upcoming"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] mb-2" style={{ color: "#9c9484" }}>
              Prochains événements
            </p>
            {upcomingEvents.length === 0 ? (
              <div
                className="text-center py-4"
                style={{ background: "#fcfaf4", borderRadius: 10, border: "1px dashed #ece9e1" }}
              >
                <p className="text-[12px] m-0" style={{ color: "#6d6d68" }}>
                  Aucun événement à venir
                </p>
                <p className="text-[10.5px] mt-0.5 m-0" style={{ color: "#9c9484" }}>
                  Configurez vos disponibilités dans le planning
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {upcomingEvents.map((evt) => {
                  const evtDate = new Date(evt.date + "T00:00:00");
                  const isTomorrow = (() => {
                    const t = new Date(today);
                    t.setDate(t.getDate() + 1);
                    return formatDateKey(t) === evt.date;
                  })();
                  const dateLabel = evt.date === todayKey
                    ? "Aujourd'hui"
                    : isTomorrow
                    ? "Demain"
                    : evtDate.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
                  return (
                    <EventRow
                      key={evt.key}
                      emoji={evt.emoji}
                      title={evt.label}
                      subtitle={dateLabel}
                      time={evt.time}
                      statusDot={evt.status ? missionStatusDot[evt.status] : "#1f3a33"}
                      statusLabel={evt.status ? missionStatusLabels[evt.status] : "Collectif"}
                    />
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Lien vers planning complet ─── */}
      <Link
        href="/dashboard/planning"
        className="flex items-center justify-center gap-1.5 py-2 rounded-full text-[12px] font-semibold transition-colors hover:bg-[#f7f5ef]"
        style={{ color: "#1f3a33", border: "1px solid #ece9e1" }}
      >
        Voir le planning complet
        <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
});

// ───────────────────────────────────────────────────────────────────
// Sous-composant : ligne d'événement compacte (style row Google Calendar)
// ───────────────────────────────────────────────────────────────────
function EventRow({
  emoji,
  title,
  subtitle,
  time,
  statusDot,
  statusLabel,
}: {
  emoji?: string;
  title: string;
  subtitle?: string;
  time?: string;
  statusDot: string;
  statusLabel?: string;
}) {
  return (
    <div
      className="flex items-center gap-2.5 px-2.5 py-2 transition-colors hover:bg-[#fcfaf4]"
      style={{ borderRadius: 10, border: "1px solid #f1ede3", background: "#fff" }}
    >
      {/* Pastille statut */}
      <div
        className="w-1.5 h-7 rounded-full flex-shrink-0"
        style={{ background: statusDot }}
      />
      {/* Emoji animal */}
      {emoji && (
        <span className="text-[16px] leading-none flex-shrink-0">{emoji}</span>
      )}
      {/* Titre + sous-titre */}
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-semibold truncate m-0" style={{ color: "#1f1f1d" }}>
          {title}
        </p>
        {subtitle && (
          <p className="text-[10.5px] truncate m-0 mt-0.5" style={{ color: "#6d6d68" }}>
            {subtitle}
            {statusLabel && (
              <>
                {" · "}
                <span style={{ color: statusDot, fontWeight: 600 }}>{statusLabel}</span>
              </>
            )}
          </p>
        )}
      </div>
      {/* Heure */}
      {time && (
        <div className="flex items-center gap-0.5 flex-shrink-0 text-[11px] font-medium tabular-nums" style={{ color: "#6d6d68" }}>
          <Clock className="w-2.5 h-2.5" />
          {time}
        </div>
      )}
    </div>
  );
}

export default DashboardAvailabilityCalendar;
