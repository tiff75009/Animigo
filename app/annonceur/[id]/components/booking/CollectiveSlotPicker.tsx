"use client";

import { useState, useMemo, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Calendar,
  Clock,
  Users,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  Info,
  ArrowLeft,
  Repeat,
  Sparkles,
} from "lucide-react";
import { cn } from "@/app/lib/utils";

interface CollectiveSlot {
  _id: Id<"collectiveSlots">;
  date: string;
  startTime: string;
  endTime: string;
  availableSpots: number;
  maxAnimals: number;
}

interface CollectiveSlotPickerProps {
  variantId: Id<"serviceVariants"> | string;
  numberOfSessions: number;
  sessionInterval: number; // En jours
  animalCount: number;
  animalType: string;
  onSlotsSelected: (slotIds: string[]) => void;
  selectedSlotIds?: string[];
  className?: string;
}

// Délai minimum de réservation (en heures)
const MIN_BOOKING_LEAD_TIME_HOURS = 2;

// Vérifier si un créneau est réservable (pas passé + délai minimum 2h)
function isSlotBookable(dateStr: string, startTime: string): boolean {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // Date passée = non réservable
  if (dateStr < todayStr) return false;

  // Date future = réservable
  if (dateStr > todayStr) return true;

  // Date = aujourd'hui : vérifier l'heure avec délai minimum
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [hours, minutes] = startTime.split(":").map(Number);
  const slotMinutes = hours * 60 + minutes;
  const minBookableMinutes = currentMinutes + (MIN_BOOKING_LEAD_TIME_HOURS * 60);

  return slotMinutes >= minBookableMinutes;
}

// Formater la date complète
const formatDateFull = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
};

// Formater le jour de la semaine court
const formatWeekday = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
  });
};

// Formater la date courte
const formatDateShort = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
};

// Formater le jour du mois
const formatDayNumber = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.getDate().toString();
};

// Vérifier l'intervalle entre les dates
const checkInterval = (
  selectedDates: string[],
  newDate: string,
  minInterval: number
): boolean => {
  if (selectedDates.length === 0) return true;

  const newDateObj = new Date(newDate);

  for (const date of selectedDates) {
    const dateObj = new Date(date);
    const diffDays = Math.abs(
      (newDateObj.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays < minInterval) {
      return false;
    }
  }

  return true;
};

// Obtenir le lundi de la semaine
const getMonday = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

// Obtenir les jours de la semaine
const getWeekDays = (monday: Date): { date: Date; dateStr: string }[] => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    days.push({
      date,
      dateStr: date.toISOString().split("T")[0],
    });
  }
  return days;
};

// Générer plusieurs semaines à partir d'une date
const getWeeksFromDate = (startDate: Date, weeksCount: number = 4): { date: Date; dateStr: string }[][] => {
  const weeks = [];
  const monday = getMonday(startDate);

  for (let w = 0; w < weeksCount; w++) {
    const weekMonday = new Date(monday);
    weekMonday.setDate(monday.getDate() + (w * 7));
    weeks.push(getWeekDays(weekMonday));
  }

  return weeks;
};

// Obtenir le jour de la semaine (0 = dimanche, 1 = lundi, etc.)
const getDayOfWeek = (dateStr: string): number => {
  return new Date(dateStr).getDay();
};

// Obtenir le nom du jour de la semaine
const getDayName = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString("fr-FR", { weekday: "long" });
};

export default memo(function CollectiveSlotPicker({
  variantId,
  numberOfSessions,
  sessionInterval,
  animalCount,
  animalType,
  onSlotsSelected,
  selectedSlotIds = [],
  className,
}: CollectiveSlotPickerProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedSlotIds);
  const [selectedDay, setSelectedDay] = useState<string | null>(null); // Pour la vue horaire
  const [showAutoFillSuggestion, setShowAutoFillSuggestion] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false); // État replié quand tous les créneaux sont sélectionnés

  // Query pour récupérer les créneaux disponibles
  const availableSlotsQuery = useQuery(
    api.planning.collectiveSlots.getAvailableSlots,
    {
      variantId: variantId as Id<"serviceVariants">,
      animalCount,
      animalType,
    }
  );

  const availableSlots = availableSlotsQuery || [];

  // Grouper les créneaux par date (avec filtrage des créneaux non réservables)
  const slotsByDate = useMemo(() => {
    const map = new Map<string, CollectiveSlot[]>();
    for (const slot of availableSlots) {
      // Filtrer les créneaux passés ou trop proches (moins de 2h)
      if (!isSlotBookable(slot.date, slot.startTime)) continue;

      const existing = map.get(slot.date) || [];
      existing.push(slot as CollectiveSlot);
      map.set(slot.date, existing);
    }
    // Trier les créneaux par heure pour chaque date
    map.forEach((slots) => {
      slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    return map;
  }, [availableSlots]);

  // Dates des créneaux sélectionnés
  const selectedDates = useMemo(() => {
    return localSelectedIds
      .map((id) => {
        const slot = availableSlots.find((s: CollectiveSlot) => s._id === id);
        return slot?.date;
      })
      .filter((d): d is string => !!d);
  }, [localSelectedIds, availableSlots]);

  // Générer 4 semaines à partir de la date courante
  const weeks = useMemo(() => {
    return getWeeksFromDate(currentDate, 4);
  }, [currentDate]);

  const today = new Date().toISOString().split("T")[0];

  // Navigation
  const navigatePrev = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 28); // 4 semaines
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 28); // 4 semaines
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Gérer la sélection d'un créneau
  // Règle : exactement `numberOfSessions` séances doivent être sélectionnées
  // — ni plus, ni moins. La désélection reste toujours autorisée.
  const handleSlotSelect = (slotId: string) => {
    const slot = availableSlots.find((s: CollectiveSlot) => s._id === slotId);
    if (!slot) return;

    const isSelected = localSelectedIds.includes(slotId);

    if (isSelected) {
      // Désélection toujours autorisée
      const newIds = localSelectedIds.filter((id) => id !== slotId);
      setLocalSelectedIds(newIds);
      onSlotsSelected(newIds);
    } else {
      // Limite haute : refuser l'ajout si déjà au quota
      if (localSelectedIds.length >= numberOfSessions) {
        alert(
          `Vous avez déjà sélectionné les ${numberOfSessions} séance${numberOfSessions > 1 ? "s" : ""} requise${numberOfSessions > 1 ? "s" : ""}. Décochez une séance pour en choisir une autre.`
        );
        return;
      }
      // Intervalle minimum
      if (!checkInterval(selectedDates, slot.date, sessionInterval)) {
        alert(
          `L'intervalle minimum entre les séances est de ${sessionInterval} jour(s).`
        );
        return;
      }

      const newIds = [...localSelectedIds, slotId];
      setLocalSelectedIds(newIds);
      onSlotsSelected(newIds);
      setSelectedDay(null);
      setIsCollapsed(false);
    }
  };

  // Mettre à jour si selectedSlotIds change de l'extérieur
  useEffect(() => {
    setLocalSelectedIds(selectedSlotIds);
  }, [selectedSlotIds]);

  const isComplete = localSelectedIds.length >= numberOfSessions;

  // Auto-collapse retiré : il fermait prématurément la vue après chaque
  // sélection, obligeant à cliquer "Modifier" pour continuer. L'utilisateur
  // replie manuellement quand il est satisfait.

  // Récupérer les détails des créneaux sélectionnés pour le résumé
  const selectedSlotsDetails = useMemo(() => {
    return localSelectedIds
      .map((id) => availableSlots.find((s: CollectiveSlot) => s._id === id))
      .filter((s): s is CollectiveSlot => s !== undefined)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [localSelectedIds, availableSlots]);

  // ─── Auto-fill récurrent avec détection des semaines indispos ───
  // Pour chaque semaine attendue (1 à N-1 après la 1re séance), on cherche
  // un créneau au MÊME jour de la semaine et à la MÊME heure.
  // Statut "ok" = créneau dispo · "unavailable" = aucun créneau ce jour/heure
  type AutoFillEntry = {
    weekIndex: number; // 1, 2, 3, …
    targetDate: string; // date attendue
    slot: CollectiveSlot | null; // null si indispo
    status: "ok" | "unavailable";
  };

  const autoFillPlan = useMemo<AutoFillEntry[]>(() => {
    if (localSelectedIds.length !== 1) return [];

    const firstSlot = availableSlots.find(
      (s: CollectiveSlot) => s._id === localSelectedIds[0]
    );
    if (!firstSlot) return [];

    const targetTime = firstSlot.startTime;
    const firstDate = new Date(firstSlot.date);
    const sessionsToFill = numberOfSessions - 1;
    const result: AutoFillEntry[] = [];

    for (let i = 1; i <= sessionsToFill; i++) {
      const targetDateObj = new Date(firstDate);
      targetDateObj.setDate(firstDate.getDate() + 7 * i);
      const targetDateStr = targetDateObj.toISOString().split("T")[0];

      // Chercher un créneau au même jour/heure
      const candidate = availableSlots.find(
        (s: CollectiveSlot) =>
          s.date === targetDateStr &&
          s.startTime === targetTime &&
          s._id !== firstSlot._id
      );

      result.push({
        weekIndex: i,
        targetDate: targetDateStr,
        slot: (candidate as CollectiveSlot) ?? null,
        status: candidate ? "ok" : "unavailable",
      });
    }
    return result;
  }, [localSelectedIds, availableSlots, numberOfSessions]);

  const autoFillOkCount = autoFillPlan.filter((e) => e.status === "ok").length;
  const autoFillUnavailableCount = autoFillPlan.filter(
    (e) => e.status === "unavailable"
  ).length;

  const canAutoFill = localSelectedIds.length === 1 && autoFillOkCount > 0;

  // Applique l'auto-fill : sélectionne uniquement les créneaux dispo (ok),
  // ignore les semaines indispos (l'utilisateur les complétera manuellement).
  const applyAutoFill = () => {
    if (!canAutoFill) return;
    const okIds = autoFillPlan
      .filter((e) => e.status === "ok" && e.slot)
      .map((e) => e.slot!._id);
    const newIds = Array.from(new Set([...localSelectedIds, ...okIds]));
    setLocalSelectedIds(newIds);
    onSlotsSelected(newIds);
    setShowAutoFillSuggestion(false);
    setSelectedDay(null);
  };

  // Afficher la suggestion après la première sélection
  useEffect(() => {
    if (canAutoFill && localSelectedIds.length === 1) {
      setShowAutoFillSuggestion(true);
    } else {
      setShowAutoFillSuggestion(false);
    }
  }, [canAutoFill, localSelectedIds.length]);

  // Format "Lundi 27 avr."
  const formatShortDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "short",
    });
  };

  // Nom du jour de la semaine de la première séance
  const recurringDayName = useMemo(() => {
    if (localSelectedIds.length !== 1) return null;
    const firstSlot = availableSlots.find(
      (s: CollectiveSlot) => s._id === localSelectedIds[0]
    );
    if (!firstSlot) return null;
    return new Date(firstSlot.date).toLocaleDateString("fr-FR", {
      weekday: "long",
    });
  }, [localSelectedIds, availableSlots]);

  const recurringTime = useMemo(() => {
    if (localSelectedIds.length !== 1) return null;
    const firstSlot = availableSlots.find(
      (s: CollectiveSlot) => s._id === localSelectedIds[0]
    );
    return firstSlot?.startTime ?? null;
  }, [localSelectedIds, availableSlots]);

  // Infos sur le premier créneau sélectionné pour l'auto-fill
  const firstSelectedSlot = localSelectedIds.length > 0
    ? availableSlots.find((s: CollectiveSlot) => s._id === localSelectedIds[0])
    : null;

  // Obtenir le titre de la période affichée
  const getPeriodTitle = () => {
    if (weeks.length === 0) return "";
    const firstDay = weeks[0][0];
    const lastDay = weeks[weeks.length - 1][6];

    const firstMonth = new Date(firstDay.dateStr).toLocaleDateString("fr-FR", { month: "short" });
    const lastMonth = new Date(lastDay.dateStr).toLocaleDateString("fr-FR", { month: "short", year: "numeric" });

    if (firstMonth === lastMonth.split(" ")[0]) {
      return `${formatDayNumber(firstDay.dateStr)} - ${formatDayNumber(lastDay.dateStr)} ${lastMonth}`;
    }
    return `${formatDayNumber(firstDay.dateStr)} ${firstMonth} - ${formatDayNumber(lastDay.dateStr)} ${lastMonth}`;
  };

  // Vérifier si on a sélectionné un créneau pour ce jour
  const hasSelectedSlotForDay = (day: string) => {
    const daySlots = slotsByDate.get(day) || [];
    return daySlots.some((s) => localSelectedIds.includes(s._id));
  };

  // Rendu de la vue horaire pour un jour spécifique
  const renderTimeView = () => {
    if (!selectedDay) return null;

    const daySlots = slotsByDate.get(selectedDay) || [];
    const isPast = selectedDay < today;
    const hasSelectedThisDay = hasSelectedSlotForDay(selectedDay);

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-3"
      >
        {/* Bandeau retour - style cohérent */}
        <button
          onClick={() => setSelectedDay(null)}
          className="w-full flex items-center gap-3 p-3 transition-colors hover:bg-[#f7f5ef]"
          style={{ borderRadius: 12, background: "#fff", border: "1px solid #ece9e1" }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "#f7f5ef" }}
          >
            <ArrowLeft className="w-3.5 h-3.5" style={{ color: "#1f1f1d" }} />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: "#9c9484" }}>
              Retour au calendrier
            </p>
            <p className="text-[14px] font-semibold text-[#1f1f1d] capitalize truncate tracking-[-0.01em]">
              {formatDateFull(selectedDay)}
            </p>
          </div>
          <span className="text-[11px] flex-shrink-0" style={{ color: "#9c9484" }}>
            {daySlots.length} créneau{daySlots.length > 1 ? "x" : ""}
          </span>
        </button>

        {isPast ? (
          <div
            className="text-center py-8"
            style={{ borderRadius: 12, background: "#f7f5ef", border: "1px solid #ece9e1" }}
          >
            <Clock className="w-9 h-9 mx-auto mb-3" style={{ color: "#cdc9c0" }} />
            <p className="text-[13px] text-[#6d6d68]">Cette date est passée</p>
          </div>
        ) : daySlots.length === 0 ? (
          <div
            className="text-center py-8"
            style={{ borderRadius: 12, background: "#f7f5ef", border: "1px solid #ece9e1" }}
          >
            <Clock className="w-9 h-9 mx-auto mb-3" style={{ color: "#cdc9c0" }} />
            <p className="text-[13px] text-[#6d6d68]">Aucun créneau disponible ce jour</p>
          </div>
        ) : (
          <div className="grid gap-2 max-h-[320px] overflow-y-auto">
            {daySlots.map((slot) => {
              const isSelected = localSelectedIds.includes(slot._id);
              const reachedLimit = localSelectedIds.length >= numberOfSessions;
              const canSelect =
                isSelected ||
                (!reachedLimit &&
                  (checkInterval(selectedDates, slot.date, sessionInterval) ||
                    localSelectedIds.length === 0));

              return (
                <button
                  key={slot._id}
                  onClick={() => canSelect && handleSlotSelect(slot._id)}
                  disabled={!canSelect}
                  className="w-full p-3 text-left transition-all hover:bg-[#fafafa]"
                  style={{
                    borderRadius: 12,
                    border: `1px solid ${
                      isSelected ? "#1f3a33" : !canSelect ? "#f1ede3" : "#ece9e1"
                    }`,
                    background: isSelected ? "#f5f9f6" : "#fff",
                    opacity: !canSelect && !isSelected ? 0.5 : 1,
                    cursor: !canSelect ? "not-allowed" : "pointer",
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Clock
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: isSelected ? "#1f3a33" : "#6d6d68" }}
                      />
                      <div className="min-w-0">
                        <p
                          className="text-[14px] font-semibold tracking-[-0.01em]"
                          style={{ color: isSelected ? "#1f3a33" : "#1f1f1d" }}
                        >
                          {slot.startTime} — {slot.endTime}
                        </p>
                        <div className="flex items-center gap-1 text-[11px] text-[#6d6d68] mt-0.5">
                          <Users className="w-3 h-3" />
                          <span>
                            {slot.availableSpots} place{slot.availableSpots > 1 ? "s" : ""} disponible{slot.availableSpots > 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: "#1f3a33" }}
                      >
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Suggestion d'auto-remplissage avec preview détaillé semaine par semaine */}
        {showAutoFillSuggestion && canAutoFill && firstSelectedSlot && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4"
            style={{ borderRadius: 12, background: "#f5f9f6", border: "1px solid #cfdbd3" }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "#fff", border: "1px solid #cfdbd3" }}
              >
                <Sparkles className="w-4 h-4" style={{ color: "#1f3a33" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-semibold text-[#1f1f1d] tracking-[-0.01em] mb-0.5">
                  Réserver les {numberOfSessions - 1} séances suivantes ?
                </p>
                <p className="text-[12px] text-[#3a3a38] leading-[1.5]">
                  Tous les <strong className="capitalize">{recurringDayName}s</strong> à{" "}
                  <strong>{recurringTime}</strong>
                </p>
              </div>
            </div>

            {/* Preview détaillé : statut OK ou indispo pour chaque semaine */}
            <div
              className="space-y-1 mb-3 p-2"
              style={{ borderRadius: 10, background: "#fff", border: "1px solid #cfdbd3" }}
            >
              {autoFillPlan.map((entry) => (
                <div
                  key={entry.weekIndex}
                  className="flex items-center justify-between gap-2 text-[11.5px]"
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    {entry.status === "ok" ? (
                      <Check className="w-3 h-3 flex-shrink-0" style={{ color: "#1f3a33" }} />
                    ) : (
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" style={{ color: "#d97f3a" }} />
                    )}
                    <span className="capitalize truncate" style={{ color: "#1f1f1d" }}>
                      Séance {entry.weekIndex + 1} · {formatShortDate(entry.targetDate)}
                    </span>
                  </span>
                  <span
                    className="text-[10px] font-medium uppercase tracking-[0.05em] flex-shrink-0"
                    style={{
                      color: entry.status === "ok" ? "#3a6052" : "#7a4a1a",
                    }}
                  >
                    {entry.status === "ok" ? "Dispo" : "Plus de place"}
                  </span>
                </div>
              ))}
            </div>

            {/* Avertissement si des semaines sont indispos */}
            {autoFillUnavailableCount > 0 && (
              <div
                className="flex items-start gap-2 p-2 mb-3"
                style={{
                  borderRadius: 8,
                  background: "#fdf0e6",
                  border: "1px solid #f4d6bc",
                }}
              >
                <AlertTriangle
                  className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
                  style={{ color: "#d97f3a" }}
                />
                <p className="text-[11px] leading-[1.4]" style={{ color: "#7a4a1a" }}>
                  <strong>
                    {autoFillUnavailableCount} séance{autoFillUnavailableCount > 1 ? "s" : ""} indisponible{autoFillUnavailableCount > 1 ? "s" : ""}
                  </strong>{" "}
                  sur le créneau habituel. Vous devrez les sélectionner manuellement (autre jour ou autre heure).
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                onClick={applyAutoFill}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-medium transition-opacity hover:opacity-90"
                style={{ background: "#1f3a33", color: "#f7f5ef" }}
              >
                <Repeat className="w-3.5 h-3.5" />
                {autoFillUnavailableCount > 0
                  ? `Ajouter les ${autoFillOkCount} dispos`
                  : "Oui, tout automatiser"}
              </button>
              <button
                onClick={() => {
                  setShowAutoFillSuggestion(false);
                  setSelectedDay(null);
                }}
                className="inline-flex items-center px-4 py-2 rounded-full text-[12px] font-medium transition-colors hover:bg-[#fafafa]"
                style={{ background: "#fff", border: "1px solid #ece9e1", color: "#1f1f1d" }}
              >
                Choisir manuellement
              </button>
            </div>
          </motion.div>
        )}

        {/* Bouton pour ajouter un autre créneau */}
        {hasSelectedThisDay && !showAutoFillSuggestion && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-1"
          >
            <button
              onClick={() => setSelectedDay(null)}
              className="w-full py-2.5 px-4 rounded-full text-[13px] font-medium transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
              style={{ background: "#1f3a33", color: "#f7f5ef" }}
            >
              <Calendar className="w-3.5 h-3.5" />
              Ajouter un autre créneau
            </button>
            <p className="text-[11px] text-center mt-2" style={{ color: "#9c9484" }}>
              Choisissez un autre jour pour ajouter une séance
            </p>
          </motion.div>
        )}
      </motion.div>
    );
  };

  // Rendu de la vue calendrier
  const renderCalendarView = () => {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="space-y-3"
      >
        {/* Navigation */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={navigatePrev}
            className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-[#f7f5ef] transition-colors"
            aria-label="Période précédente"
          >
            <ChevronLeft className="w-4 h-4" style={{ color: "#1f1f1d" }} />
          </button>
          <div className="flex items-center gap-2">
            <h4 className="text-[14px] font-semibold text-[#1f1f1d] tracking-[-0.01em] capitalize">
              {getPeriodTitle()}
            </h4>
            <button
              onClick={goToToday}
              className="px-2 py-0.5 rounded-full text-[10px] font-medium hover:bg-[#f7f5ef] transition-colors"
              style={{ border: "1px solid #ece9e1", color: "#1f3a33" }}
            >
              Aujourd&apos;hui
            </button>
          </div>
          <button
            onClick={navigateNext}
            className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-[#f7f5ef] transition-colors"
            aria-label="Période suivante"
          >
            <ChevronRight className="w-4 h-4" style={{ color: "#1f1f1d" }} />
          </button>
        </div>

        {/* En-têtes jours */}
        <div className="grid grid-cols-7">
          {["L", "M", "M", "J", "V", "S", "D"].map((day, i) => (
            <div
              key={`${day}-${i}`}
              className="text-center py-2 text-[11px]"
              style={{ color: "#6d6d68", fontWeight: 500 }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grille des semaines (style Airbnb) */}
        <div>
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7">
              {week.map(({ dateStr }) => {
                const isPast = dateStr < today;
                const isToday = dateStr === today;
                const hasSlots = slotsByDate.has(dateStr) && !isPast;
                const daySlots = slotsByDate.get(dateStr) || [];
                const slotsCount = daySlots.length;
                const hasSelectedSlot = daySlots.some((s) => localSelectedIds.includes(s._id));
                const reachedLimit = localSelectedIds.length >= numberOfSessions;
                const canSelectDay = hasSlots && (
                  hasSelectedSlot ||
                  (!reachedLimit &&
                    (checkInterval(selectedDates, dateStr, sessionInterval) || localSelectedIds.length === 0))
                );

                return (
                  <div key={dateStr} className="relative aspect-square">
                    <button
                      onClick={() => canSelectDay && setSelectedDay(dateStr)}
                      disabled={!canSelectDay}
                      title={
                        !hasSelectedSlot && reachedLimit
                          ? `Vous avez déjà sélectionné les ${numberOfSessions} séances. Décochez-en une pour modifier.`
                          : undefined
                      }
                      className={cn(
                        "group relative w-full h-full flex flex-col items-center justify-center rounded-full transition-all",
                        canSelectDay && !hasSelectedSlot && "hover:bg-[#1f1f1d] hover:text-white cursor-pointer",
                        !canSelectDay && !isPast && "cursor-not-allowed"
                      )}
                      style={{
                        background: hasSelectedSlot ? "#1f1f1d" : "transparent",
                        color: hasSelectedSlot
                          ? "#fff"
                          : isPast
                            ? "#cdc9c0"
                            : !hasSlots
                              ? "#cdc9c0"
                              : !canSelectDay
                                ? "#cdc9c0"
                                : "#1f1f1d",
                        opacity: isPast ? 0.5 : !canSelectDay && !isPast ? 0.4 : 1,
                      }}
                    >
                      {isToday && !hasSelectedSlot && (
                        <div
                          className="absolute inset-0 rounded-full pointer-events-none"
                          style={{ border: "1px solid #1f1f1d" }}
                        />
                      )}
                      <span
                        className="text-[14px]"
                        style={{ fontWeight: hasSelectedSlot || isToday ? 600 : 400 }}
                      >
                        {formatDayNumber(dateStr)}
                      </span>

                      {hasSlots && !isPast && !hasSelectedSlot && (
                        <div className="flex items-center gap-0.5 mt-0.5 transition-opacity group-hover:opacity-0">
                          <div
                            className="w-1 h-1 rounded-full"
                            style={{ background: canSelectDay ? "#2f4a3f" : "#c9a14a" }}
                          />
                          {slotsCount > 1 && (
                            <span className="text-[9px]" style={{ color: "#9c9484" }}>
                              +{slotsCount - 1}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Légende */}
        <div
          className="flex flex-wrap items-center justify-center gap-3 pt-3 mt-2"
          style={{ borderTop: "1px solid #f1ede3" }}
        >
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#2f4a3f" }} />
            <span className="text-[10px] font-medium" style={{ color: "#9c9484" }}>Disponible</span>
          </div>
          {sessionInterval > 1 && (
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#c9a14a" }} />
              <span className="text-[10px] font-medium" style={{ color: "#9c9484" }}>
                Intervalle non respecté
              </span>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  // Vue repliée avec résumé des séances sélectionnées
  const renderCollapsedView = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      {/* Header avec bouton modifier */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "#1f3a33" }}
          >
            <Check className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-0.5">
              Créneaux
            </div>
            <h3 className="text-[14px] font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
              {localSelectedIds.length} séance{localSelectedIds.length > 1 ? "s" : ""} confirmée{localSelectedIds.length > 1 ? "s" : ""}
            </h3>
          </div>
        </div>
        <button
          onClick={() => setIsCollapsed(false)}
          className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors hover:bg-[#f7f5ef] flex-shrink-0"
          style={{ color: "#1f3a33", border: "1px solid #1f3a33" }}
        >
          Modifier
        </button>
      </div>

      {/* Liste des séances en pills */}
      <div className="flex flex-wrap gap-1.5">
        {selectedSlotsDetails.map((slot) => {
          const date = new Date(slot.date);
          const dayName = date.toLocaleDateString("fr-FR", { weekday: "short" });
          const dayNum = date.getDate();
          const month = date.toLocaleDateString("fr-FR", { month: "short" });
          return (
            <div
              key={slot._id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11.5px]"
              style={{
                borderRadius: 999,
                background: "#f5f9f6",
                border: "1px solid #cfdbd3",
              }}
            >
              <Calendar className="w-3 h-3" style={{ color: "#1f3a33" }} />
              <span className="font-semibold text-[#1f1f1d] capitalize">
                {dayName} {dayNum} {month}
              </span>
              <span style={{ color: "#6d6d68" }}>
                · {slot.startTime}-{slot.endTime}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );

  return (
    <div className={cn("space-y-4", className)}>
      {isCollapsed && isComplete ? (
        renderCollapsedView()
      ) : (
        <>
          {/* Header — eyebrow + titre + compteur visuel */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-1">
                Étape · Créneaux
              </div>
              <h3 className="text-base font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
                Choisissez vos {numberOfSessions} créneaux
              </h3>
              <p className="text-[12px] text-[#6d6d68] mt-1">
                Sélectionnez un ou plusieurs créneaux
                {sessionInterval > 1 && (
                  <> avec au moins {sessionInterval} jour{sessionInterval > 1 ? "s" : ""} d&apos;intervalle</>
                )}
              </p>
            </div>
            {/* Compteur visuel sticky : X / N séances */}
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0 mt-1"
              style={
                isComplete
                  ? { background: "#1f3a33", color: "#f7f5ef", border: "1px solid #1f3a33" }
                  : localSelectedIds.length > 0
                    ? { background: "#f5f9f6", color: "#1f3a33", border: "1px solid #cfdbd3" }
                    : { background: "#fff", color: "#9c9484", border: "1px solid #ece9e1" }
              }
            >
              {isComplete && <Check className="w-3 h-3" />}
              <span className="text-[12px] font-semibold tracking-[-0.01em] tabular-nums">
                {localSelectedIds.length} / {numberOfSessions}
              </span>
              <span className="text-[10px] uppercase tracking-[0.05em] font-medium opacity-80">
                séances
              </span>
            </div>
          </div>

          {/* Barre de progression visuelle */}
          {numberOfSessions > 1 && (
            <div
              className="h-1 w-full overflow-hidden mt-3"
              style={{ background: "#ece9e1", borderRadius: 999 }}
            >
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, (localSelectedIds.length / numberOfSessions) * 100)}%`,
                  background: isComplete ? "#1f3a33" : "#cfdbd3",
                }}
              />
            </div>
          )}

          {/* Bandeau "Encore N séances à choisir" — visible si incomplet */}
          {!isComplete && localSelectedIds.length > 0 && (
            <div
              className="flex items-center gap-2 p-2.5 mt-3"
              style={{
                borderRadius: 10,
                background: "#fdf8ec",
                border: "1px solid #f4e6c1",
              }}
            >
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#c9a14a" }} />
              <p className="text-[11.5px] m-0" style={{ color: "#7a5b1a" }}>
                Encore <strong>{numberOfSessions - localSelectedIds.length} séance{numberOfSessions - localSelectedIds.length > 1 ? "s" : ""}</strong> à sélectionner pour valider votre réservation.
              </p>
            </div>
          )}

          {/* Confirmation "Toutes les séances sélectionnées" */}
          {isComplete && (
            <div
              className="flex items-center gap-2 p-2.5 mt-3"
              style={{
                borderRadius: 10,
                background: "#f5f9f6",
                border: "1px solid #cfdbd3",
              }}
            >
              <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#1f3a33" }} />
              <p className="text-[11.5px] m-0" style={{ color: "#3a6052" }}>
                <strong>Parfait !</strong> Toutes vos {numberOfSessions} séances sont sélectionnées.
              </p>
            </div>
          )}

          {/* Message intervalle */}
          {sessionInterval > 1 && (
            <div
              className="flex items-start gap-2 p-3 text-[12px]"
              style={{
                borderRadius: 10,
                background: "#f7f5ef",
                border: "1px solid #ece9e1",
                color: "#3a3a38",
              }}
            >
              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#6d6d68" }} />
              <p className="leading-[1.5]">
                Les séances doivent être espacées d&apos;au moins{" "}
                <strong className="text-[#1f1f1d]">{sessionInterval} jours</strong>. Les créneaux
                trop proches de vos sélections seront grisés.
              </p>
            </div>
          )}

          {/* Calendrier ou vue horaire — sans wrapper coloré */}
          <div>
            <AnimatePresence mode="wait">
              {selectedDay ? renderTimeView() : renderCalendarView()}
            </AnimatePresence>
          </div>

          {availableSlots.length === 0 && (
            <div
              className="flex items-start gap-2 p-3 text-[12px]"
              style={{
                borderRadius: 10,
                background: "#fdf8ec",
                border: "1px solid #f4e6c1",
                color: "#7a5b1a",
              }}
            >
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <p className="leading-[1.5]">
                Aucun créneau disponible pour le moment. Contactez l&apos;annonceur pour plus de créneaux.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
});
