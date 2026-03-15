"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/app/lib/utils";

// --- Fonctions utilitaires (hors composant pour éviter les recréations) ---

/** Formate une date en chaîne YYYY-MM-DD */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Vérifie si la date correspond à aujourd'hui */
function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

/** Vérifie si la date est dans le passé (avant aujourd'hui) */
function isPast(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

// --- Composant DatePickerDropdown ---

export function DatePickerDropdown({
  isOpen,
  mode,
  selectedDate,
  startDate,
  endDate,
  onDateSelect,
  onRangeSelect,
  onClose,
  accentColor = "primary",
}: {
  isOpen: boolean;
  mode: "single" | "range";
  selectedDate: string | null;
  startDate: string | null;
  endDate: string | null;
  onDateSelect: (date: string) => void;
  onRangeSelect: (start: string, end: string) => void;
  onClose: () => void;
  accentColor?: "primary" | "secondary";
}) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [rangeStart, setRangeStart] = useState<string | null>(startDate);
  const [rangeEnd, setRangeEnd] = useState<string | null>(endDate);
  const [selectingEnd, setSelectingEnd] = useState(false);

  // Détection mobile via vérification initiale uniquement (pas de listener resize)
  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 640;
  }, []);

  // Réinitialiser l'état de sélection quand le modal s'ouvre
  // pour permettre de resélectionner une nouvelle date de début
  useEffect(() => {
    if (isOpen) {
      setSelectingEnd(false);
      setRangeStart(startDate);
      setRangeEnd(endDate);
    }
  }, [isOpen, startDate, endDate]);

  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];
  const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  // Mémoisation des jours du mois courant
  const days = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const result: (Date | null)[] = [];

    // Jour de la semaine (0 = Dimanche, ajusté pour démarrer au Lundi)
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;

    // Cases vides avant le premier jour du mois
    for (let i = 0; i < startDay; i++) {
      result.push(null);
    }

    // Tous les jours du mois
    for (let i = 1; i <= lastDay.getDate(); i++) {
      result.push(new Date(year, month, i));
    }

    return result;
  }, [currentMonth]);

  const isSelected = (date: Date): boolean => {
    const dateStr = formatDate(date);
    if (mode === "single") {
      return dateStr === selectedDate;
    }
    return dateStr === rangeStart || dateStr === rangeEnd;
  };

  const isInRange = (date: Date): boolean => {
    if (mode !== "range" || !rangeStart || !rangeEnd) return false;
    const dateStr = formatDate(date);
    return dateStr > rangeStart && dateStr < rangeEnd;
  };

  const handleDayClick = (date: Date) => {
    if (isPast(date)) return;

    const dateStr = formatDate(date);

    if (mode === "single") {
      onDateSelect(dateStr);
    } else {
      // Mode plage de dates
      if (!rangeStart || selectingEnd === false) {
        setRangeStart(dateStr);
        setRangeEnd(null);
        setSelectingEnd(true);
      } else {
        if (dateStr < rangeStart) {
          // Si la date cliquée est avant le début, inverser
          setRangeEnd(rangeStart);
          setRangeStart(dateStr);
        } else {
          setRangeEnd(dateStr);
        }
        // Soumettre la plage
        const finalStart = dateStr < rangeStart ? dateStr : rangeStart;
        const finalEnd = dateStr < rangeStart ? rangeStart : dateStr;
        onRangeSelect(finalStart, finalEnd);
      }
    }
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const accentClasses = accentColor === "primary"
    ? "bg-primary text-white"
    : "bg-secondary text-white";
  const rangeClasses = accentColor === "primary"
    ? "bg-primary/10"
    : "bg-secondary/10";

  // Contenu du calendrier (partagé entre mobile et desktop)
  const calendarContent = (
    <div className="p-4 sm:p-5">
      {/* Header mobile avec titre et bouton fermer */}
      <div className="flex items-center justify-between mb-4 sm:hidden">
        <h3 className="font-semibold text-gray-900 text-lg">
          {mode === "range" ? "Sélectionner les dates" : "Sélectionner une date"}
        </h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Fermer"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Navigation mois */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors"
        >
          <ChevronDown className="w-5 h-5 rotate-90" />
        </button>
        <span className="font-semibold text-gray-900">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </span>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors"
        >
          <ChevronDown className="w-5 h-5 -rotate-90" />
        </button>
      </div>

      {/* Noms des jours */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Grille des jours */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const past = isPast(date);
          const today = isToday(date);
          const selected = isSelected(date);
          const inRange = isInRange(date);

          return (
            <button
              key={formatDate(date)}
              onClick={() => handleDayClick(date)}
              disabled={past}
              className={cn(
                "aspect-square flex items-center justify-center text-sm rounded-xl transition-all font-medium",
                past && "text-gray-300 cursor-not-allowed",
                !past && !selected && !inRange && "hover:bg-gray-100 active:bg-gray-200",
                today && !selected && "ring-2 ring-gray-300 ring-offset-1",
                selected && accentClasses,
                inRange && rangeClasses
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {/* Indication mode plage */}
      {mode === "range" && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            {!rangeStart
              ? "Sélectionnez la date de début"
              : !rangeEnd
              ? "Sélectionnez la date de fin"
              : "Plage sélectionnée"}
          </p>
          {rangeStart && rangeEnd && (
            <p className="text-sm font-medium text-center mt-1 text-gray-700">
              {new Date(rangeStart).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
              {" → "}
              {new Date(rangeEnd).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
            </p>
          )}
        </div>
      )}

      {/* Actions rapides */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
        <button
          onClick={() => {
            const today = new Date();
            const dateStr = formatDate(today);
            if (mode === "single") {
              onDateSelect(dateStr);
            } else {
              setRangeStart(dateStr);
              setSelectingEnd(true);
            }
          }}
          className="flex-1 px-3 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl transition-colors"
        >
          Aujourd&apos;hui
        </button>
        <button
          onClick={() => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dateStr = formatDate(tomorrow);
            if (mode === "single") {
              onDateSelect(dateStr);
            } else {
              setRangeStart(dateStr);
              setSelectingEnd(true);
            }
          }}
          className="flex-1 px-3 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl transition-colors"
        >
          Demain
        </button>
        {mode === "range" && (
          <button
            onClick={() => {
              const start = new Date();
              start.setDate(start.getDate() + 1);
              const end = new Date();
              end.setDate(end.getDate() + 7);
              onRangeSelect(formatDate(start), formatDate(end));
            }}
            className="flex-1 px-3 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl transition-colors"
          >
            Semaine
          </button>
        )}
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay - ferme au clic */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "fixed inset-0 z-[100]",
              isMobile ? "bg-black/40" : "bg-transparent"
            )}
            onClick={onClose}
          />

          {/* Mobile: Bottom Sheet */}
          {isMobile ? (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-[101] bg-white shadow-xl rounded-t-3xl max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Barre de poignée */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
              </div>
              {calendarContent}
            </motion.div>
          ) : (
            /* Desktop: Dropdown positionné */
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 mt-2 z-[101] bg-white shadow-2xl border border-gray-200 rounded-2xl w-[340px]"
              onClick={(e) => e.stopPropagation()}
            >
              {calendarContent}
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
