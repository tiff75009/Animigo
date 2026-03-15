"use client";

import { useState, memo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  X as XIcon,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { type CollectiveSlotData } from "./types";

type AvailView = "3days" | "week" | "month";

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const shortDayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const fullDayNames = ["L", "M", "M", "J", "V", "S", "D"];
const monthNamesShort = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const monthNamesFull = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

type DayStatus = "available" | "partial" | "unavailable" | "booked_partial" | "booked_full" | "none";

const statusConfig: Record<DayStatus, { dot: string; bg: string; border: string; text: string; label: string }> = {
  available: { dot: "bg-emerald-400", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", label: "Dispo" },
  partial: { dot: "bg-amber-400", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", label: "Partiel" },
  booked_partial: { dot: "bg-orange-400", bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", label: "Occupé" },
  booked_full: { dot: "bg-red-400", bg: "bg-red-50", border: "border-red-200", text: "text-red-600", label: "Complet" },
  unavailable: { dot: "bg-gray-300", bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-400", label: "Indispo" },
  none: { dot: "bg-gray-200", bg: "", border: "border-gray-100", text: "text-gray-900", label: "—" },
};

interface PublicAvailabilityCalendarProps {
  slug: string;
  selectedFormuleId?: string | null;
  selectedFormuleDuration?: number | null;
}

const PublicAvailabilityCalendar = memo(function PublicAvailabilityCalendar({
  slug,
  selectedFormuleId,
  selectedFormuleDuration,
}: PublicAvailabilityCalendarProps) {
  const [view, setView] = useState<AvailView>("3days");
  const [offset, setOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = formatDateKey(today);

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

  const data = useQuery(api.public.profile.getPublicAvailability, { slug, startDate, endDate });

  const getDayStatus = (dateKey: string): DayStatus => {
    if (!data) return "none";
    const dayEntry = data.availability.find((a: any) => a.date === dateKey);
    if (!dayEntry) return "none";
    return dayEntry.status as DayStatus;
  };

  const getDayInfo = (dateKey: string) => {
    if (!data) return null;
    return data.availability.find((a: any) => a.date === dateKey) || null;
  };

  const getSlotsForDate = (dateKey: string): CollectiveSlotData[] => {
    if (!data) return [];
    const slots = data.collectiveSlots.filter((s: any) => s.date === dateKey) as CollectiveSlotData[];
    if (selectedFormuleId) return slots.filter((s) => s.variantId === selectedFormuleId);
    return slots;
  };

  const toMinutes = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const fromMinutes = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

  const getTimeSlotsForDate = (dateKey: string): { startTime: string; endTime: string }[] => {
    if (!data) return [];
    const dayEntry = data.availability.find((a: any) => a.date === dateKey);
    if (!dayEntry || (dayEntry.status !== "available" && dayEntry.status !== "partial" && dayEntry.status !== "booked_partial")) return [];

    const settings = (data as any).bookingSettings;
    const acceptFrom = settings?.acceptFrom ?? "08:00";
    const acceptTo = settings?.acceptTo ?? "20:00";
    const bufferBefore = settings?.bufferBefore ?? 0;
    const bufferAfter = settings?.bufferAfter ?? 0;

    const duration = selectedFormuleDuration ?? 60;
    const step = 30;

    const availWindows: { start: number; end: number }[] = [];
    if (dayEntry.timeSlots && dayEntry.timeSlots.length > 0) {
      for (const ts of dayEntry.timeSlots) {
        availWindows.push({ start: toMinutes(ts.startTime), end: toMinutes(ts.endTime) });
      }
    } else {
      availWindows.push({ start: toMinutes(acceptFrom), end: toMinutes(acceptTo) });
    }

    const booked: { start: number; end: number }[] = (dayEntry.bookedSlots || []).map((s: any) => ({
      start: toMinutes(s.startTime),
      end: toMinutes(s.endTime),
    }));

    const slots: { startTime: string; endTime: string }[] = [];
    for (const window of availWindows) {
      for (let t = window.start; t + duration <= window.end; t += step) {
        const slotStart = t;
        const slotEnd = t + duration;
        const effectiveStart = slotStart - bufferBefore;
        const effectiveEnd = slotEnd + bufferAfter;
        const hasConflict = booked.some((b) => effectiveStart < b.end && effectiveEnd > b.start);
        if (!hasConflict) {
          slots.push({ startTime: fromMinutes(slotStart), endTime: fromMinutes(slotEnd) });
        }
      }
    }

    return slots;
  };

  const fillRate = (() => {
    if (!data) return null;
    const futureDays = days.filter(d => formatDateKey(d) >= todayKey);
    if (futureDays.length === 0) return null;
    const availCount = futureDays.filter(d => {
      const s = getDayStatus(formatDateKey(d));
      return s === "available" || s === "partial" || s === "booked_partial";
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
            onClick={() => { setView(key); setOffset(0); }}
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
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
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
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Message si aucune disponibilité configurée */}
      {data && data.availability.length > 0 && data.availability.every((a: any) => a.status === "unavailable") && data.collectiveSlots.length === 0 && (
        <div className="text-center py-4 mb-3">
          <Calendar className="w-6 h-6 text-gray-300 mx-auto mb-1.5" />
          <p className="text-xs text-gray-500">Aucune disponibilité configurée</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Contactez l&apos;annonceur pour connaître ses créneaux</p>
        </div>
      )}

      {/* Formule sélectionnée indicator */}
      {selectedFormuleId && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 mb-3 bg-primary/5 border border-primary/15 rounded-lg">
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="text-[10px] text-primary font-medium">Filtré par formule sélectionnée</span>
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

            const isClickable = !isPast && status !== "unavailable" && status !== "none";
            const isDateSelected = selectedDate === dateKey;

            return (
              <div
                key={dateKey}
                onClick={() => isClickable && setSelectedDate(isDateSelected ? null : dateKey)}
                className={cn(
                  "rounded-xl border p-2 transition-colors",
                  isPast ? "opacity-40 border-gray-100" : `${cfg.border}`,
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
                <div className={cn("flex items-center justify-center gap-1 px-1.5 py-1 rounded-lg text-[10px] font-semibold", cfg.bg, cfg.text)}>
                  <div className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                  {cfg.label}
                </div>
                {slots.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    {slots.slice(0, view === "3days" ? 3 : 2).map((slot) => {
                      const placesLeft = slot.maxAnimals - slot.bookedAnimals;
                      const fillPct = slot.maxAnimals > 0 ? (slot.bookedAnimals / slot.maxAnimals) * 100 : 0;
                      return (
                        <div key={slot.id} className="bg-purple-50 rounded-md px-1.5 py-1 border border-purple-100">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-medium text-purple-700">{slot.startTime}–{slot.endTime}</span>
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
              </div>
            );
          })}
        </div>
      ) : (
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
                  const isClickable = !isPast && status !== "unavailable" && status !== "none";
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
                      {slots.length > 0 && !isPast && (
                        <div className="flex gap-0.5 mt-0.5">
                          {slots.slice(0, 3).map((s) => (
                            <div key={s.id} className={cn("w-1 h-1 rounded-full", s.bookedAnimals >= s.maxAnimals ? "bg-gray-400" : "bg-purple-500")} />
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
          const timeSlots = getTimeSlotsForDate(selectedDate);
          const collectiveSlots = getSlotsForDate(selectedDate);
          const dayInfo = getDayInfo(selectedDate);
          const bookedCount = (dayInfo as any)?.bookedCount ?? 0;
          const maxCapacity = (dayInfo as any)?.maxCapacity ?? 1;
          const remainingPlaces = Math.max(0, maxCapacity - bookedCount);
          const hasContent = timeSlots.length > 0 || collectiveSlots.length > 0 || bookedCount > 0;
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

                {bookedCount > 0 && (
                  <div className="flex items-center gap-2 px-2.5 py-2 mb-2 bg-white rounded-lg border border-gray-100">
                    <Users className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-600">{bookedCount} réservation{bookedCount > 1 ? "s" : ""}</span>
                        <span className={cn("text-[11px] font-bold", remainingPlaces > 0 ? "text-emerald-600" : "text-red-500")}>
                          {remainingPlaces > 0 ? `${remainingPlaces} place${remainingPlaces > 1 ? "s" : ""} restante${remainingPlaces > 1 ? "s" : ""}` : "Complet"}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", bookedCount >= maxCapacity ? "bg-red-400" : "bg-orange-400")}
                          style={{ width: `${Math.min((bookedCount / maxCapacity) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {hasContent || timeSlots.length > 0 ? (
                  <div className="space-y-2">
                    {timeSlots.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                          Créneaux disponibles{selectedFormuleDuration ? ` (${selectedFormuleDuration} min)` : ""}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {timeSlots.map((slot, i) => (
                            <div key={i} className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                              <Clock className="w-3 h-3 text-emerald-600" />
                              <span className="text-[11px] font-semibold text-emerald-700">{slot.startTime} – {slot.endTime}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {timeSlots.length === 0 && (status === "available" || status === "partial" || status === "booked_partial") && (
                      <div className="text-center py-2">
                        <p className="text-xs text-gray-500">
                          {selectedFormuleDuration
                            ? `Aucun créneau de ${selectedFormuleDuration} min disponible`
                            : "Sélectionnez une formule pour voir les créneaux"}
                        </p>
                      </div>
                    )}

                    {collectiveSlots.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Séances collectives</p>
                        <div className="space-y-1.5">
                          {collectiveSlots.map((slot) => {
                            const placesLeft = slot.maxAnimals - slot.bookedAnimals;
                            const fillPct = slot.maxAnimals > 0 ? (slot.bookedAnimals / slot.maxAnimals) * 100 : 0;
                            return (
                              <div key={slot.id} className="flex items-center gap-2.5 px-2.5 py-2 bg-white rounded-lg border border-purple-100">
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <Clock className="w-3 h-3 text-purple-500" />
                                  <span className="text-[11px] font-semibold text-purple-700">{slot.startTime} – {slot.endTime}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="h-1.5 bg-purple-100 rounded-full overflow-hidden">
                                    <div className={cn("h-full rounded-full transition-all", fillPct >= 100 ? "bg-gray-400" : "bg-purple-500")} style={{ width: `${Math.min(fillPct, 100)}%` }} />
                                  </div>
                                </div>
                                <span className={cn("text-[10px] font-bold flex-shrink-0", placesLeft > 0 ? "text-purple-600" : "text-gray-400")}>
                                  {placesLeft > 0 ? `${placesLeft}/${slot.maxAnimals} pl.` : "Complet"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-xs text-gray-500">
                      {selectedFormuleDuration
                        ? "Aucun créneau disponible pour cette durée"
                        : "Sélectionnez une formule pour voir les créneaux"}
                    </p>
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
          ["Dispo", "bg-emerald-400"],
          ["Occupé", "bg-orange-400"],
          ["Complet", "bg-red-400"],
          ["Indispo", "bg-gray-300"],
        ] as const).map(([lbl, dot]) => (
          <div key={lbl} className="flex items-center gap-1">
            <div className={cn("w-2 h-2 rounded-full", dot)} />
            <span className="text-[10px] text-gray-500">{lbl}</span>
          </div>
        ))}
        {data && data.collectiveSlots.length > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-[10px] text-gray-500">Collectif</span>
          </div>
        )}
      </div>
    </div>
  );
});

export default PublicAvailabilityCalendar;
