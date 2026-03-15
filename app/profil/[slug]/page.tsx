"use client";

import { useState, useRef, useMemo, useCallback, memo } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Calendar,
  User,
  Star,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Share2,
  Home,
  Building2,
  Trees,
  Car,
  Baby,
  CigaretteOff,
  Utensils,
  Shield,
  ShieldCheck,
  ImageIcon,
  PawPrint,
  Heart,
  Check,
  X as XIcon,
  Camera,
  ExternalLink,
  Pencil,
  Navigation,
  Clock,
  Euro,
  Users,
  ThumbsUp,
  MessageSquarePlus,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Navbar } from "@/app/components/navbar";
import ImageLightbox from "@/app/components/ui/ImageLightbox";
import { useAuth } from "@/app/hooks/useAuth";
import { getAuthToken } from "@/app/lib/authToken";
import ShareModal from "./components/ShareModal";
import {
  animalEmojis,
  calculateAge,
  type AnimalData,
  type ReviewData,
  type FormuleData,
  type ServiceData,
  type PricingInfo,
  type SelectedFormule,
  type CollectiveSlotData,
  getFormuleDisplayPrice,
  formatPriceCents,
  computeClientPrice,
} from "./components/types";

// ──────────────────────────────────────────────────────
// Calendrier public des disponibilités — vues 3j / semaine / mois
// ──────────────────────────────────────────────────────
type AvailView = "3days" | "week" | "month";

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const shortDayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const fullDayNames = ["L", "M", "M", "J", "V", "S", "D"];
const monthNamesShort = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const monthNamesFull = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const PublicAvailabilityCalendar = memo(function PublicAvailabilityCalendar({ slug, selectedFormuleId, selectedFormuleDuration }: { slug: string; selectedFormuleId?: string | null; selectedFormuleDuration?: number | null }) {
  const [view, setView] = useState<AvailView>("3days");
  const [offset, setOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = formatDateKey(today);

  // Calculer la plage de dates selon la vue
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

  // Helpers
  type DayStatus = "available" | "partial" | "unavailable" | "booked_partial" | "booked_full" | "none";
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

  // Helper: convertir "HH:MM" en minutes
  const toMinutes = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const fromMinutes = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

  // Générer les créneaux disponibles basés sur la durée de la formule
  const getTimeSlotsForDate = (dateKey: string): { startTime: string; endTime: string }[] => {
    if (!data) return [];
    const dayEntry = data.availability.find((a: any) => a.date === dateKey);
    if (!dayEntry || (dayEntry.status !== "available" && dayEntry.status !== "partial" && dayEntry.status !== "booked_partial")) return [];

    const settings = (data as any).bookingSettings;
    const acceptFrom = settings?.acceptFrom ?? "08:00";
    const acceptTo = settings?.acceptTo ?? "20:00";
    const bufferBefore = settings?.bufferBefore ?? 0;
    const bufferAfter = settings?.bufferAfter ?? 0;

    const duration = selectedFormuleDuration ?? 60; // Défaut 60 min
    const step = 30; // Pas de 30 minutes

    // Plages disponibles de la journée
    const availWindows: { start: number; end: number }[] = [];
    if (dayEntry.timeSlots && dayEntry.timeSlots.length > 0) {
      for (const ts of dayEntry.timeSlots) {
        availWindows.push({ start: toMinutes(ts.startTime), end: toMinutes(ts.endTime) });
      }
    } else {
      // Jour entièrement dispo → utiliser les horaires d'acceptation
      availWindows.push({ start: toMinutes(acceptFrom), end: toMinutes(acceptTo) });
    }

    // Créneaux réservés (avec buffers déjà appliqués côté backend)
    const booked: { start: number; end: number }[] = (dayEntry.bookedSlots || []).map((s: any) => ({
      start: toMinutes(s.startTime),
      end: toMinutes(s.endTime),
    }));

    // Générer les créneaux par pas de 30 min
    const slots: { startTime: string; endTime: string }[] = [];
    for (const window of availWindows) {
      for (let t = window.start; t + duration <= window.end; t += step) {
        const slotStart = t;
        const slotEnd = t + duration;
        // Vérifier que le créneau + buffers ne chevauche aucun créneau réservé
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

  // Taux de remplissage (jours avec au moins une place dispo)
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

  const statusConfig: Record<DayStatus, { dot: string; bg: string; border: string; text: string; label: string }> = {
    available: { dot: "bg-emerald-400", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", label: "Dispo" },
    partial: { dot: "bg-amber-400", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", label: "Partiel" },
    booked_partial: { dot: "bg-orange-400", bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", label: "Occupé" },
    booked_full: { dot: "bg-red-400", bg: "bg-red-50", border: "border-red-200", text: "text-red-600", label: "Complet" },
    unavailable: { dot: "bg-gray-300", bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-400", label: "Indispo" },
    none: { dot: "bg-gray-200", bg: "", border: "border-gray-100", text: "text-gray-900", label: "—" },
  };

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
                {/* Jour */}
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
                {/* Statut */}
                <div className={cn("flex items-center justify-center gap-1 px-1.5 py-1 rounded-lg text-[10px] font-semibold", cfg.bg, cfg.text)}>
                  <div className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                  {cfg.label}
                </div>
                {/* Créneaux collectifs */}
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
                {/* Header */}
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

                {/* Capacité */}
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
                    {/* Créneaux horaires disponibles */}
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

                    {/* Message si aucun créneau disponible pour cette durée */}
                    {timeSlots.length === 0 && (status === "available" || status === "partial" || status === "booked_partial") && (
                      <div className="text-center py-2">
                        <p className="text-xs text-gray-500">
                          {selectedFormuleDuration
                            ? `Aucun créneau de ${selectedFormuleDuration} min disponible`
                            : "Sélectionnez une formule pour voir les créneaux"}
                        </p>
                      </div>
                    )}

                    {/* Créneaux collectifs */}
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

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { user: authUser } = useAuth();

  // Détecte si l'utilisateur connecté consulte son propre profil
  const isOwnProfile = authUser?.username ? authUser.username.toLowerCase() === slug.toLowerCase() : false;

  // États
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [galleryLightboxIndex, setGalleryLightboxIndex] = useState<number | null>(null);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [togglingFavoriteId, setTogglingFavoriteId] = useState<string | null>(null);
  const [selectedFormule, setSelectedFormule] = useState<SelectedFormule | null>(null);
  const reviewsRef = useRef<HTMLDivElement>(null);

  // Auth
  const token = getAuthToken();
  const isClient = authUser?.accountType === "utilisateur";

  // Favoris
  const favoriteIds = useQuery(
    api.client.favorites.getFavoriteIds,
    token ? { token } : "skip"
  );
  const toggleFavorite = useMutation(api.client.favorites.toggle);

  const handleToggleFavorite = useCallback(async (formuleId: string) => {
    if (!token) return;
    setTogglingFavoriteId(formuleId);
    try {
      await toggleFavorite({ token, formuleId: formuleId as Id<"serviceVariants"> });
    } catch {
      // silently fail
    } finally {
      setTogglingFavoriteId(null);
    }
  }, [token, toggleFavorite]);

  // Récupérer les données du profil
  const profileData = useQuery(api.public.profile.getPublicProfileBySlug, { slug });

  // Track si les données ont déjà été chargées (évite de rejouer les animations)
  const hasLoadedRef = useRef(false);
  if (profileData && !hasLoadedRef.current) {
    hasLoadedRef.current = true;
  }
  // Désactiver les animations initiales après le premier chargement
  const animInitial = hasLoadedRef.current ? false : { opacity: 0, y: 20 };

  // Loading — Skeleton
  if (profileData === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar hideSpacers />
        <section className="pt-16 pb-8">
          {/* Cover skeleton */}
          <div className="relative h-48 sm:h-64 md:h-80 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 animate-pulse" />

          {/* Profile card skeleton */}
          <div className="max-w-6xl mx-auto px-4 -mt-20 relative z-10">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100/80 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row gap-5 sm:gap-6">
                {/* Avatar skeleton */}
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gray-200 animate-pulse mx-auto sm:mx-0 flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="h-8 bg-gray-200 rounded-xl w-48 animate-pulse mx-auto sm:mx-0" />
                  <div className="h-4 bg-gray-100 rounded-lg w-32 animate-pulse mx-auto sm:mx-0" />
                  <div className="flex flex-wrap gap-3 justify-center sm:justify-start mt-3">
                    <div className="h-8 bg-gray-100 rounded-xl w-24 animate-pulse" />
                    <div className="h-8 bg-gray-100 rounded-xl w-32 animate-pulse" />
                    <div className="h-8 bg-gray-100 rounded-xl w-28 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Content skeleton */}
        <div className="max-w-6xl mx-auto px-4 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-gray-100 space-y-4">
                <div className="h-6 bg-gray-200 rounded-lg w-32 animate-pulse" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-gray-100 space-y-4">
                <div className="h-6 bg-gray-200 rounded-lg w-24 animate-pulse" />
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-5 shadow-lg border border-gray-100 h-72 animate-pulse" />
              <div className="bg-white rounded-3xl p-5 shadow-lg border border-gray-100 h-48 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Profil non trouvé
  if (profileData === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Profil introuvable
          </h1>
          <p className="text-gray-500 mb-6">
            Ce profil n&apos;existe pas ou n&apos;est plus disponible.
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors"
          >
            Retour à l&apos;accueil
          </button>
        </div>
      </div>
    );
  }

  const getStatusLabel = () => {
    switch (profileData.statusType) {
      case "professionnel":
        return "Pro";
      case "particulier":
        return "Particulier";
      default:
        return "Membre";
    }
  };

  const getStatusColor = () => {
    switch (profileData.statusType) {
      case "professionnel":
        return "bg-gradient-to-r from-blue-500 to-blue-600 text-white";
      case "particulier":
        return "bg-gradient-to-r from-primary to-primary/80 text-white";
      default:
        return "bg-gradient-to-r from-secondary to-secondary/80 text-white";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar hideSpacers />

      {/* Hero Section */}
      <section className="pt-16 pb-8">
        {/* Cover Image */}
        <div className="relative h-48 sm:h-64 md:h-80 bg-gradient-to-br from-primary/30 via-secondary/20 to-purple-500/20">
          {profileData.coverImage ? (
            <Image
              src={profileData.coverImage}
              alt="Couverture"
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-[url('/patterns/paws.svg')] opacity-10" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

          {/* Action Bar */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.back()}
              className="p-2.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </motion.button>

            <div className="flex items-center gap-2">
              {isOwnProfile && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push("/dashboard/profil")}
                  className="flex items-center gap-2 px-3.5 py-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors"
                >
                  <Pencil className="w-4 h-4 text-gray-700" />
                  <span className="text-sm font-medium text-gray-700 hidden sm:inline">Modifier mon profil</span>
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowShareModal(true)}
                className="p-2.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors"
              >
                <Share2 className="w-5 h-5 text-gray-700" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Profile Card */}
        <div className="max-w-6xl mx-auto px-4 -mt-20 relative z-10">
          <motion.div
            initial={animInitial}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-xl border border-gray-100/80"
          >
            {/* Top section */}
            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row gap-5 sm:gap-6">
                {/* Avatar */}
                <div className="relative mx-auto sm:mx-0 flex-shrink-0">
                  <div className={cn("w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden ring-4 ring-white shadow-2xl", profileData.isDisplayingLogo ? "bg-white" : "bg-gray-100")}>
                    {profileData.profileImage ? (
                      <Image
                        src={profileData.profileImage}
                        alt={profileData.firstName}
                        width={128}
                        height={128}
                        className={cn("w-full h-full", profileData.isDisplayingLogo ? "object-contain p-2" : "object-cover")}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                        <User className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                  {/* Status badge */}
                  <div className={cn(
                    "absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold shadow-lg",
                    getStatusColor()
                  )}>
                    {getStatusLabel()}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                        {profileData.firstName} {profileData.lastName.charAt(0)}.
                      </h1>
                      {/* Ville uniquement (pas l'adresse exacte) */}
                      {(profileData.city || profileData.location) && (
                        <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1 text-gray-500">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span>{profileData.city || profileData.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap justify-center sm:justify-end gap-2">
                      {profileData.isIdentityVerified && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-secondary/10 text-secondary">
                          <ShieldCheck className="w-4 h-4" />
                          Vérifié
                        </span>
                      )}
                      {profileData.isSapApproved && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-600">
                          <Shield className="w-4 h-4" />
                          Déclaré SAP
                        </span>
                      )}
                      {profileData.icadRegistered && (
                        <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-600">
                          I-CAD
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-4">
                    {/* Note moyenne — toujours affiché */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 rounded-xl">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="text-sm font-bold text-gray-900">
                          {profileData.reviewCount > 0 ? profileData.rating.toFixed(1) : "—"}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {profileData.reviewCount > 0
                          ? `(${profileData.reviewCount} avis)`
                          : "Pas encore d'avis"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">Membre depuis {profileData.memberSince}</span>
                    </div>

                    {profileData.animals.length > 0 && (
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <PawPrint className="w-4 h-4" />
                        <span className="text-sm">
                          {profileData.animals.length} compagnon{profileData.animals.length > 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* SIRET pour les pros */}
                  {profileData.siret && (
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-3 text-xs text-gray-400">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>SIRET : {profileData.siret}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bio/Description section */}
            {profileData.bio && (
              <>
                <div className="border-t border-gray-100" />
                <div className="px-6 sm:px-8 py-5 bg-gradient-to-br from-gray-50/50 to-white rounded-b-3xl">
                  <p className={cn(
                    "text-gray-600 leading-relaxed",
                    !isBioExpanded && "line-clamp-3"
                  )}>
                    {profileData.bio}
                  </p>
                  {profileData.bio.length > 200 && (
                    <button
                      onClick={() => setIsBioExpanded(!isBioExpanded)}
                      className="mt-2 text-sm font-medium text-primary flex items-center gap-1 hover:underline"
                    >
                      <span>{isBioExpanded ? "Voir moins" : "Voir plus"}</span>
                      <motion.div
                        animate={{ rotate: isBioExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </motion.div>
                    </button>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* Main Content — 2 colonnes sur desktop */}
      <main className={cn("max-w-6xl mx-auto px-4 pb-12", profileData.isAnnouncer && isClient && !isOwnProfile && "pb-24")}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ═══ COLONNE GAUCHE (2/3) ═══ */}
          <div className="lg:col-span-2 space-y-6">

            {/* À propos — Équipement + Zone d'intervention */}
            {profileData.isAnnouncer && (
              <motion.section
                initial={animInitial}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-gray-100 space-y-6"
              >
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-3">
                  <span className="p-2 bg-gradient-to-br from-secondary/20 to-secondary/10 rounded-xl">
                    <User className="w-5 h-5 text-secondary" />
                  </span>
                  À propos
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {profileData.equipment.housingType && (
                    <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                      <div className="p-1.5 bg-primary/10 rounded-lg">
                        {profileData.equipment.housingType === "house" ? <Home className="w-4 h-4 text-primary" /> : <Building2 className="w-4 h-4 text-primary" />}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900">{profileData.equipment.housingType === "house" ? "Maison" : "Appartement"}</p>
                        {profileData.equipment.housingSize && <p className="text-[10px] text-gray-500">{profileData.equipment.housingSize} m²</p>}
                      </div>
                    </div>
                  )}
                  {profileData.equipment.hasGarden && (
                    <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                      <div className="p-1.5 bg-green-100 rounded-lg"><Trees className="w-4 h-4 text-green-600" /></div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900">Jardin</p>
                        {profileData.equipment.gardenSize && <p className="text-[10px] text-gray-500">{profileData.equipment.gardenSize === "petit" ? "Petit" : profileData.equipment.gardenSize === "moyen" ? "Moyen" : "Grand"}</p>}
                      </div>
                    </div>
                  )}
                  {profileData.equipment.hasVehicle && (
                    <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                      <div className="p-1.5 bg-blue-100 rounded-lg"><Car className="w-4 h-4 text-blue-600" /></div>
                      <p className="text-xs font-semibold text-gray-900">Véhicule</p>
                    </div>
                  )}
                  {profileData.equipment.isSmoker === false && (
                    <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                      <div className="p-1.5 bg-emerald-100 rounded-lg"><CigaretteOff className="w-4 h-4 text-emerald-600" /></div>
                      <p className="text-xs font-semibold text-gray-900">Non-fumeur</p>
                    </div>
                  )}
                  {profileData.equipment.hasChildren && (
                    <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                      <div className="p-1.5 bg-pink-100 rounded-lg"><Baby className="w-4 h-4 text-pink-600" /></div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900">Enfants</p>
                        {profileData.equipment.childrenAges?.length > 0 && (
                          <p className="text-[10px] text-gray-500">{profileData.equipment.childrenAges.map((a: string) => a === "0-3" ? "0-3 ans" : a === "4-10" ? "4-10 ans" : "11-17 ans").join(", ")}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {profileData.equipment.providesFood && (
                    <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                      <div className="p-1.5 bg-orange-100 rounded-lg"><Utensils className="w-4 h-4 text-orange-600" /></div>
                      <p className="text-xs font-semibold text-gray-900">Alimentation fournie</p>
                    </div>
                  )}
                  {profileData.icadRegistered && (
                    <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                      <div className="p-1.5 bg-emerald-100 rounded-lg"><Shield className="w-4 h-4 text-emerald-600" /></div>
                      <p className="text-xs font-semibold text-gray-900">I-CAD inscrit</p>
                    </div>
                  )}
                </div>

                {/* Zone d'intervention */}
                {profileData.radius && profileData.radius > 0 && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl border border-primary/10">
                    <Navigation className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm text-gray-700">
                      {profileData.city || profileData.location || "Zone non précisée"} — rayon de <span className="font-semibold text-gray-900">{profileData.radius} km</span>
                    </span>
                  </div>
                )}
              </motion.section>
            )}

            {/* Types d'animaux acceptés */}
            {profileData.isAnnouncer && profileData.services && profileData.services.length > 0 && (() => {
              const allAnimalTypes = Array.from(new Set(
                (profileData.services as ServiceData[]).flatMap(s => s.animalTypes)
              ));
              if (allAnimalTypes.length === 0) return null;
              return (
                <motion.section
                  initial={animInitial}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 }}
                  className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-gray-100"
                >
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <span className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl">
                      <PawPrint className="w-5 h-5 text-amber-600" />
                    </span>
                    Animaux acceptés
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {allAnimalTypes.map((type) => (
                      <span
                        key={type}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-xl text-sm font-medium text-gray-800"
                      >
                        <span className="text-lg">{animalEmojis[type.toLowerCase()] || "🐾"}</span>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </span>
                    ))}
                  </div>
                </motion.section>
              );
            })()}

            {/* Tarifs */}
            {profileData.isAnnouncer && profileData.services && profileData.services.length > 0 && (
              <motion.section
                initial={animInitial}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-gray-100"
              >
                <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-3">
                  <span className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl">
                    <Euro className="w-5 h-5 text-primary" />
                  </span>
                  Tarifs
                </h2>

                <div className="space-y-3">
                  {(profileData.services as ServiceData[]).map((service) => (
                    <div key={service.id} className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gray-100 to-gray-50">
                        <span className="text-lg">{service.categoryIcon}</span>
                        <span className="text-sm font-bold text-gray-900">{service.categoryName}</span>
                        <span className="ml-auto text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">{service.formules.length} formule{service.formules.length > 1 ? "s" : ""}</span>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {service.formules.map((formule: FormuleData) => {
                          const displayPrice = getFormuleDisplayPrice(formule);
                          const isFav = favoriteIds?.includes(formule.id as Id<"serviceVariants">);
                          const isSelected = selectedFormule?.formuleId === formule.id;
                          return (
                            <button
                              key={formule.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedFormule(null);
                                } else {
                                  setSelectedFormule({
                                    formuleId: formule.id,
                                    formuleName: formule.name,
                                    serviceSlug: service.categorySlug || "",
                                    serviceName: service.categoryName,
                                    serviceIcon: service.categoryIcon,
                                    price: displayPrice,
                                    duration: formule.duration,
                                  });
                                }
                              }}
                              className={cn(
                                "w-full text-left px-4 py-3 transition-colors cursor-pointer",
                                isSelected
                                  ? "bg-primary/5 ring-1 ring-inset ring-primary/30"
                                  : "hover:bg-gray-50"
                              )}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className={cn("text-sm font-medium", isSelected ? "text-primary" : "text-gray-900")}>{formule.name}</p>
                                    {formule.sessionType === "collective" && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded">Collectif</span>}
                                    {(formule.numberOfSessions ?? 0) > 1 && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded">{formule.numberOfSessions} séances</span>}
                                  </div>
                                  {formule.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{formule.description}</p>}
                                  {formule.animalTypes && formule.animalTypes.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {formule.animalTypes.map((type) => (
                                        <span key={type} className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded-full">
                                          {animalEmojis[type.toLowerCase()] || "🐾"} {type}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {displayPrice && (() => {
                                    const pricingData = (profileData as any).pricing as PricingInfo | undefined;
                                    const clientPrice = pricingData ? computeClientPrice(displayPrice.price, pricingData) : null;
                                    return (
                                      <div className="text-right flex-shrink-0">
                                        {clientPrice && clientPrice.tva > 0 ? (
                                          <>
                                            <span className="text-[10px] text-gray-400 line-through block">{formatPriceCents(displayPrice.price)} HT</span>
                                            <span className="text-sm font-bold text-primary">{formatPriceCents(clientPrice.total)}{displayPrice.unit}</span>
                                            <span className="text-[9px] text-gray-400 block">TTC · frais inclus</span>
                                          </>
                                        ) : clientPrice ? (
                                          <>
                                            <span className="text-sm font-bold text-primary">{formatPriceCents(clientPrice.total)}{displayPrice.unit}</span>
                                            <span className="text-[9px] text-gray-400 block">frais inclus</span>
                                          </>
                                        ) : (
                                          <span className="text-sm font-bold text-primary">{formatPriceCents(displayPrice.price)}{displayPrice.unit}</span>
                                        )}
                                      </div>
                                    );
                                  })()}
                                  {token && (
                                    <span
                                      role="button"
                                      tabIndex={0}
                                      onClick={(e) => { e.stopPropagation(); handleToggleFavorite(formule.id); }}
                                      onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); handleToggleFavorite(formule.id); } }}
                                      className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                                      aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
                                    >
                                      <Heart className={cn("w-4 h-4 transition-colors", isFav ? "fill-red-500 text-red-500" : "text-gray-300 hover:text-red-400")} />
                                    </span>
                                  )}
                                  {isSelected && (
                                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                      <Check className="w-3 h-3 text-white" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Animaux de compagnie */}
            {profileData.animals.length > 0 && (
              <motion.section
                initial={animInitial}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-gray-100"
              >
                <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-3">
                  <span className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl">
                    <PawPrint className="w-5 h-5 text-amber-600" />
                  </span>
                  Les compagnons de {profileData.firstName}
                  <span className="text-sm font-normal text-gray-400 ml-auto">{profileData.animals.length}</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {profileData.animals.map((animal: AnimalData, index: number) => {
                    const age = calculateAge(animal.birthDate);
                    return (
                      <Link key={animal.id} href={`/profil/${slug}/animaux/${animal.slug}`}>
                        <motion.div
                          initial={animInitial}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + index * 0.05 }}
                          whileHover={{ scale: 1.02, y: -2 }}
                          className="group bg-gradient-to-br from-gray-50 to-white rounded-2xl p-3.5 border border-gray-100 hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative flex-shrink-0">
                              {animal.profilePhoto ? (
                                <div className="w-16 h-16 rounded-xl overflow-hidden ring-2 ring-white shadow-md">
                                  <Image src={animal.profilePhoto} alt={animal.name} width={64} height={64} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                                </div>
                              ) : (
                                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center ring-2 ring-white shadow-md">
                                  <span className="text-2xl">{animalEmojis[animal.type.toLowerCase()] || "🐾"}</span>
                                </div>
                              )}
                              {(animal.galleryPhotos?.length ?? 0) > 0 && (
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-md">
                                  <Camera className="w-2.5 h-2.5 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h3 className="font-bold text-sm text-gray-900 truncate group-hover:text-primary transition-colors">{animal.name}</h3>
                                {animal.gender && animal.gender !== "unknown" && (
                                  <span className={cn("text-[10px] px-1 py-0.5 rounded-full font-medium", animal.gender === "male" ? "bg-blue-100 text-blue-600" : "bg-pink-100 text-pink-600")}>{animal.gender === "male" ? "♂" : "♀"}</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">{animal.breed || animal.type}{age && ` • ${age} an${age > 1 ? "s" : ""}`}</p>
                              {animal.behaviorTraits && animal.behaviorTraits.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {animal.behaviorTraits.slice(0, 2).map((trait, i) => (
                                    <span key={i} className="px-1.5 py-0.5 bg-secondary/10 text-secondary rounded-full text-[10px] font-medium">{trait}</span>
                                  ))}
                                  {animal.behaviorTraits.length > 2 && <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[10px]">+{animal.behaviorTraits.length - 2}</span>}
                                </div>
                              )}
                            </div>
                            <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors flex-shrink-0" />
                          </div>
                        </motion.div>
                      </Link>
                    );
                  })}
                </div>
              </motion.section>
            )}

            {/* Galerie photos */}
            {profileData.gallery.filter((p: string) => p && typeof p === "string" && p.trim() !== "").length > 0 && (
              <motion.section
                initial={animInitial}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-gray-100"
              >
                <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-3">
                  <span className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl">
                    <ImageIcon className="w-5 h-5 text-primary" />
                  </span>
                  Galerie photos
                  <span className="text-sm font-normal text-gray-400 ml-auto">{profileData.gallery.filter((p: string) => p && typeof p === "string" && p.trim() !== "").length}</span>
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {profileData.gallery.filter((p: string) => p && typeof p === "string" && p.trim() !== "").slice(0, 6).map((photo: string, index: number) => (
                    <motion.button
                      key={index}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setGalleryLightboxIndex(index)}
                      className={cn("relative aspect-square rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow", index === 0 && "sm:col-span-2 sm:row-span-2")}
                    >
                      <Image src={photo} alt={`Photo ${index + 1}`} fill sizes="(max-width: 640px) 50vw, 33vw" className="object-cover hover:scale-105 transition-transform duration-300" />
                      {index === 5 && profileData.gallery.length > 6 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-white font-bold text-xl">+{profileData.gallery.length - 6}</span>
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </motion.section>
            )}
          </div>

          {/* ═══ COLONNE DROITE (1/3) ═══ */}
          <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">

            {/* Disponibilités */}
            {profileData.isAnnouncer && (
              <motion.section
                initial={animInitial}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white rounded-3xl p-5 shadow-lg border border-gray-100"
              >
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-3">
                  <span className="p-2 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-xl">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                  </span>
                  Disponibilités
                </h2>
                <PublicAvailabilityCalendar slug={slug} selectedFormuleId={selectedFormule?.formuleId} selectedFormuleDuration={selectedFormule?.duration} />
              </motion.section>
            )}

            {/* Avis & Recommandation */}
            <motion.section
              initial={animInitial}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-3xl p-5 shadow-lg border border-gray-100"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-3">
                <span className="p-2 bg-gradient-to-br from-amber-100 to-yellow-100 rounded-xl">
                  <Star className="w-5 h-5 text-amber-500" />
                </span>
                Avis
              </h2>

              {/* Taux de recommandation + Note moyenne */}
              <div className="flex items-stretch gap-3 mb-5">
                {/* Note moyenne */}
                <div className="flex-1 p-4 bg-gradient-to-br from-amber-50 to-white rounded-2xl border border-amber-100 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={cn("w-4 h-4", i < Math.round(profileData.rating) ? "fill-amber-400 text-amber-400" : "text-gray-200")} />
                    ))}
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {profileData.reviewCount > 0 ? profileData.rating.toFixed(1) : "—"}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {profileData.reviewCount > 0 ? `${profileData.reviewCount} avis` : "Aucun avis"}
                  </p>
                </div>

                {/* Taux de recommandation */}
                <div className="flex-1 p-4 bg-gradient-to-br from-emerald-50 to-white rounded-2xl border border-emerald-100 text-center">
                  <div className="flex items-center justify-center mb-1">
                    <ThumbsUp className="w-5 h-5 text-emerald-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {profileData.reviewCount > 0
                      ? `${Math.round((profileData.reviews.filter((r: ReviewData) => r.rating >= 4).length / profileData.reviewCount) * 100)}%`
                      : "—"}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Recommandé</p>
                </div>
              </div>

              {/* Répartition par étoiles */}
              {profileData.reviewCount > 0 && (
                <div className="space-y-1.5 mb-4">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const count = profileData.reviews.filter((r: ReviewData) => r.rating === stars).length;
                    const pct = profileData.reviewCount > 0 ? (count / profileData.reviewCount) * 100 : 0;
                    return (
                      <div key={stars} className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-500 w-4 text-right">{stars}</span>
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-gray-400 w-6">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Derniers avis */}
              {profileData.reviews.length > 0 ? (
                <div className="space-y-3" ref={reviewsRef}>
                  {profileData.reviews.slice(0, showAllReviews ? undefined : 3).map((review: ReviewData) => (
                    <div key={review.id} className="p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-bold text-gray-600">{review.reviewer.firstName.charAt(0)}</span>
                          </div>
                          <p className="text-xs font-semibold text-gray-900">{review.reviewer.firstName}</p>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={cn("w-3 h-3", i < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-200")} />
                          ))}
                        </div>
                      </div>
                      {review.comment && <p className="text-xs text-gray-600 line-clamp-2">{review.comment}</p>}
                      <p className="text-[10px] text-gray-400 mt-1.5">
                        {new Date(review.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  ))}
                  {profileData.reviews.length > 3 && (
                    <button
                      onClick={() => setShowAllReviews(!showAllReviews)}
                      className="w-full py-2.5 text-sm text-primary font-medium hover:bg-primary/5 rounded-xl transition-colors"
                    >
                      {showAllReviews ? "Voir moins" : `Voir les ${profileData.reviewCount} avis`}
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <MessageSquarePlus className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Pas encore d&apos;avis</p>
                  <p className="text-xs text-gray-400 mt-1">Soyez le premier à donner votre avis !</p>
                </div>
              )}
            </motion.section>
          </div>

        </div>
      </main>

      {/* Gallery Lightbox */}
      <ImageLightbox
        images={profileData.gallery.filter((p: string) => p && typeof p === "string" && p.trim() !== "")}
        currentIndex={galleryLightboxIndex ?? 0}
        isOpen={galleryLightboxIndex !== null}
        onClose={() => setGalleryLightboxIndex(null)}
        onNavigate={setGalleryLightboxIndex}
        altPrefix={`Photo de ${profileData.firstName}`}
      />

      {/* CTA Sticky — dynamique selon la formule sélectionnée */}
      {profileData.isAnnouncer && isClient && !isOwnProfile && (
        <AnimatePresence>
          {selectedFormule ? (
            <motion.div
              key="selected"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-2xl safe-bottom"
            >
              <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg flex-shrink-0">{selectedFormule.serviceIcon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{selectedFormule.formuleName}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {selectedFormule.serviceName}
                      {selectedFormule.price && (() => {
                        const pricingData = (profileData as any).pricing as PricingInfo | undefined;
                        const clientPrice = pricingData ? computeClientPrice(selectedFormule.price.price, pricingData) : null;
                        return <> · <span className="font-semibold text-primary">{formatPriceCents(clientPrice?.total ?? selectedFormule.price.price)}{selectedFormule.price.unit}</span>{clientPrice && <span className="text-[10px] text-gray-400 ml-1">{clientPrice.tva > 0 ? "TTC" : ""} frais inclus</span>}</>;
                      })()}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/annonceur/${profileData.username || profileData.slug}?formule=${selectedFormule.formuleId}`}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-semibold rounded-full hover:bg-primary/90 transition-colors shadow-lg whitespace-nowrap"
                >
                  Réserver
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          ) : profileData.services && profileData.services.length > 0 ? (
            <motion.div
              key="default"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-2xl safe-bottom"
            >
              <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {profileData.profileImage && (
                    <Image
                      src={profileData.profileImage}
                      alt={profileData.firstName}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{profileData.firstName} {profileData.lastName.charAt(0)}.</p>
                    {(() => {
                      const cheapest = (profileData.services as ServiceData[])
                        .flatMap(s => s.formules)
                        .map(f => getFormuleDisplayPrice(f))
                        .filter(Boolean)
                        .sort((a, b) => a!.price - b!.price)[0];
                      return cheapest ? (
                        <p className="text-xs text-gray-500">À partir de {formatPriceCents(cheapest.price)}{cheapest.unit}</p>
                      ) : null;
                    })()}
                  </div>
                </div>
                <Link
                  href={`/annonceur/${profileData.username || profileData.slug}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white font-semibold rounded-full hover:bg-gray-800 transition-colors shadow-lg whitespace-nowrap text-sm"
                >
                  Voir les prestations
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      )}

      {/* Modale de partage */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        profileName={profileData.firstName}
        profileLastInitial={profileData.lastName?.charAt(0) || ""}
        profileImage={profileData.profileImage}
        location={profileData.location}
      />
    </div>
  );
}
