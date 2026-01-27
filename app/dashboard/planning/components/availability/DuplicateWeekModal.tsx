"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Calendar, ChevronLeft, ChevronRight, Check, AlertCircle } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CategoryType } from "@/app/hooks/usePlanning";

// Type pour une entrée de disponibilité retournée par la query
interface WeekAvailabilityItem {
  id: string;
  date: string;
  dayOfWeek: number;
  categoryTypeId?: string;
  status: "available" | "partial" | "unavailable";
  timeSlots?: Array<{ startTime: string; endTime: string }>;
  reason?: string;
}

interface DuplicateWeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  categoryTypes: CategoryType[];
}

const dayNamesShort = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const dayNamesFull = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

// Helper pour formater une date en YYYY-MM-DD
function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper pour obtenir le lundi d'une semaine
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + diff);
  return d;
}

// Helper pour formater une date en format lisible
function formatDateReadable(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export function DuplicateWeekModal({
  isOpen,
  onClose,
  token,
  categoryTypes,
}: DuplicateWeekModalProps) {
  // State
  const [sourceWeekStart, setSourceWeekStart] = useState<string>(() => {
    const monday = getMondayOfWeek(new Date());
    return formatDateLocal(monday);
  });
  const [targetMode, setTargetMode] = useState<"range" | "year">("range");
  const [targetStartDate, setTargetStartDate] = useState<string>(() => {
    const nextMonday = getMondayOfWeek(new Date());
    nextMonday.setDate(nextMonday.getDate() + 7);
    return formatDateLocal(nextMonday);
  });
  const [targetEndDate, setTargetEndDate] = useState<string>(() => {
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3);
    return formatDateLocal(endDate);
  });
  const [overwriteExisting, setOverwriteExisting] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    created: number;
    updated: number;
    skipped: number;
  } | null>(null);

  // Query pour preview de la semaine source
  const weekAvailability = useQuery(
    api.planning.availability.getWeekAvailability,
    token ? { token, weekStartDate: sourceWeekStart } : "skip"
  );

  // Mutation
  const duplicateWeekMut = useMutation(api.planning.availability.duplicateWeekAvailability);

  // Calculer les dates de la semaine source
  const sourceWeekDates = useMemo(() => {
    const dates: string[] = [];
    const start = new Date(sourceWeekStart);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push(formatDateLocal(d));
    }
    return dates;
  }, [sourceWeekStart]);

  // Grouper les disponibilités par jour
  const availabilityByDay = useMemo(() => {
    const byDay = new Map<number, WeekAvailabilityItem[]>();
    if (!weekAvailability) return byDay;

    for (const avail of weekAvailability) {
      const dayOfWeek = avail.dayOfWeek;
      if (!byDay.has(dayOfWeek)) {
        byDay.set(dayOfWeek, []);
      }
      byDay.get(dayOfWeek)!.push(avail as WeekAvailabilityItem);
    }
    return byDay;
  }, [weekAvailability]);

  // Naviguer entre les semaines
  const goToPreviousWeek = () => {
    const current = new Date(sourceWeekStart);
    current.setDate(current.getDate() - 7);
    setSourceWeekStart(formatDateLocal(current));
    setResult(null);
  };

  const goToNextWeek = () => {
    const current = new Date(sourceWeekStart);
    current.setDate(current.getDate() + 7);
    setSourceWeekStart(formatDateLocal(current));
    setResult(null);
  };

  // Calculer les dates cibles pour le mode "année"
  const getYearTargetDates = (): { start: string; end: string } => {
    const today = new Date();
    const endOfYear = new Date(today.getFullYear(), 11, 31);
    return {
      start: formatDateLocal(today),
      end: formatDateLocal(endOfYear),
    };
  };

  // Calculer le nombre de semaines qui seront affectées
  const getWeeksCount = (): number => {
    const start = targetMode === "year" ? new Date() : new Date(targetStartDate);
    const end = targetMode === "year" ? new Date(new Date().getFullYear(), 11, 31) : new Date(targetEndDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.ceil(diffDays / 7);
  };

  // Soumettre
  const handleSubmit = async () => {
    if (!token) return;

    setIsLoading(true);
    setResult(null);

    try {
      const targets = targetMode === "year"
        ? getYearTargetDates()
        : { start: targetStartDate, end: targetEndDate };

      const res = await duplicateWeekMut({
        token,
        sourceWeekStart,
        targetStartDate: targets.start,
        targetEndDate: targets.end,
        overwriteExisting,
      });

      setResult({
        success: res.success,
        created: res.created,
        updated: res.updated,
        skipped: res.skipped,
      });
    } catch (error) {
      console.error("Error duplicating week:", error);
      setResult({
        success: false,
        created: 0,
        updated: 0,
        skipped: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple/10 rounded-xl">
                <Copy className="w-5 h-5 text-purple" />
              </div>
              <div>
                <h2 className="font-bold text-foreground">Dupliquer une semaine type</h2>
                <p className="text-sm text-text-light">
                  Copiez vos disponibilites sur plusieurs semaines
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-text-light" />
            </button>
          </div>

          {/* Étape 1: Sélection de la semaine source */}
          <div className="mb-6">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center">
                1
              </span>
              Selectionnez la semaine modele
            </h3>

            {/* Navigation semaine */}
            <div className="flex items-center justify-between mb-4 bg-gray-50 rounded-xl p-3">
              <button
                onClick={goToPreviousWeek}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-center">
                <p className="font-medium text-foreground">
                  Semaine du {formatDateReadable(sourceWeekStart)}
                </p>
                <p className="text-xs text-text-light">
                  au {formatDateReadable(sourceWeekDates[6])}
                </p>
              </div>
              <button
                onClick={goToNextWeek}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Aperçu de la semaine */}
            <div className="grid grid-cols-7 gap-1">
              {[1, 2, 3, 4, 5, 6, 0].map((dayIndex) => {
                const dayAvailabilities = availabilityByDay.get(dayIndex) || [];
                const hasAvailability = dayAvailabilities.length > 0;
                const hasAvailable = dayAvailabilities.some((a) => a.status === "available");
                const hasPartial = dayAvailabilities.some((a) => a.status === "partial");

                return (
                  <div
                    key={dayIndex}
                    className={cn(
                      "p-2 rounded-lg border text-center",
                      hasAvailable
                        ? "bg-green-50 border-green-200"
                        : hasPartial
                          ? "bg-orange-50 border-orange-200"
                          : "bg-gray-50 border-gray-200"
                    )}
                  >
                    <p className="text-xs font-medium text-foreground">
                      {dayNamesShort[dayIndex]}
                    </p>
                    {hasAvailability && (
                      <div className="flex justify-center gap-0.5 mt-1">
                        {categoryTypes.map((type) => {
                          const typeAvail = dayAvailabilities.find(
                            (a) => a.categoryTypeId === type._id
                          );
                          if (!typeAvail || typeAvail.status === "unavailable") return null;
                          return (
                            <span
                              key={type._id}
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: type.color }}
                              title={type.name}
                            />
                          );
                        })}
                      </div>
                    )}
                    {!hasAvailability && (
                      <p className="text-[10px] text-gray-400 mt-1">-</p>
                    )}
                  </div>
                );
              })}
            </div>

            {weekAvailability && weekAvailability.length === 0 && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800">
                  Cette semaine n&apos;a aucune disponibilite definie. Configurez d&apos;abord vos
                  disponibilites pour cette semaine.
                </p>
              </div>
            )}
          </div>

          {/* Étape 2: Période cible */}
          <div className="mb-6">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center">
                2
              </span>
              Choisissez la periode cible
            </h3>

            {/* Mode selection */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => setTargetMode("range")}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all text-left",
                  targetMode === "range"
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <Calendar className="w-5 h-5 text-primary mb-2" />
                <p className="font-medium text-foreground">Periode personnalisee</p>
                <p className="text-xs text-text-light">
                  De telle date a telle date
                </p>
              </button>
              <button
                onClick={() => setTargetMode("year")}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all text-left",
                  targetMode === "year"
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <Calendar className="w-5 h-5 text-purple mb-2" />
                <p className="font-medium text-foreground">Reste de l&apos;annee</p>
                <p className="text-xs text-text-light">
                  Jusqu&apos;au 31 decembre {new Date().getFullYear()}
                </p>
              </button>
            </div>

            {/* Date inputs pour mode "range" */}
            {targetMode === "range" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">
                    Du
                  </label>
                  <input
                    type="date"
                    value={targetStartDate}
                    onChange={(e) => setTargetStartDate(e.target.value)}
                    min={formatDateLocal(new Date())}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">
                    Au
                  </label>
                  <input
                    type="date"
                    value={targetEndDate}
                    onChange={(e) => setTargetEndDate(e.target.value)}
                    min={targetStartDate}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            )}

            {/* Info sur le nombre de semaines */}
            <p className="text-sm text-text-light mt-3">
              Environ <strong>{getWeeksCount()}</strong> semaines seront affectees
            </p>
          </div>

          {/* Étape 3: Options */}
          <div className="mb-6">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center">
                3
              </span>
              Options
            </h3>

            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={overwriteExisting}
                onChange={(e) => setOverwriteExisting(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <div>
                <p className="font-medium text-foreground">Ecraser les disponibilites existantes</p>
                <p className="text-xs text-text-light">
                  Si decoche, les jours deja configures seront ignores
                </p>
              </div>
            </label>
          </div>

          {/* Résultat */}
          {result && (
            <div
              className={cn(
                "mb-6 p-4 rounded-xl",
                result.success
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              )}
            >
              {result.success ? (
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800">Duplication terminee</p>
                    <p className="text-sm text-green-700 mt-1">
                      {result.created} entrees creees, {result.updated} mises a jour
                      {result.skipped > 0 && `, ${result.skipped} ignorees`}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Erreur lors de la duplication</p>
                    <p className="text-sm text-red-700 mt-1">
                      Veuillez reessayer ou contacter le support
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <motion.button
              onClick={onClose}
              className="flex-1 py-3 border border-gray-200 text-text-light rounded-xl font-medium hover:bg-gray-50 transition-colors"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              Fermer
            </motion.button>
            <motion.button
              onClick={handleSubmit}
              disabled={isLoading || !weekAvailability || weekAvailability.length === 0}
              className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Duplication en cours...
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Dupliquer la semaine
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
