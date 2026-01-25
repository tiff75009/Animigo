"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Plus,
  Trash2,
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  Info,
  ChevronLeft,
  ChevronRight,
  Repeat,
  X,
  Check,
  Edit3,
  Ban,
  Eye,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useAuth } from "@/app/hooks/useAuth";

interface CollectiveSlotsManagerProps {
  variantId: Id<"serviceVariants">;
  variantName: string;
  duration: number; // Durée en minutes
  maxAnimalsPerSession: number;
  animalTypes: string[];
  onClose: () => void;
}

interface Slot {
  _id: Id<"collectiveSlots">;
  date: string;
  startTime: string;
  endTime: string;
  maxAnimals: number;
  bookedAnimals: number;
  isActive: boolean;
  isCancelled: boolean;
  recurrenceId?: string;
  recurrencePattern?: "daily" | "weekly" | "biweekly" | "monthly";
}

// Helper pour formater la date
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
};

// Helper pour formater les animaux
const ANIMAL_EMOJIS: Record<string, string> = {
  chien: "🐕",
  chat: "🐱",
  oiseau: "🐦",
  rongeur: "🐹",
  reptile: "🦎",
  poisson: "🐟",
  furet: "🦡",
  lapin: "🐰",
  nac: "🦔",
};

export default function CollectiveSlotsManager({
  variantId,
  variantName,
  duration,
  maxAnimalsPerSession,
  animalTypes,
  onClose,
}: CollectiveSlotsManagerProps) {
  const { token } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBookingsModal, setShowBookingsModal] = useState<Id<"collectiveSlots"> | null>(null);
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Queries
  const slotsQuery = useQuery(
    api.planning.collectiveSlots.getSlotsByVariant,
    token ? { token, variantId } : "skip"
  );

  const validationQuery = useQuery(
    api.planning.collectiveSlots.validateVariantSlots,
    token ? { token, variantId } : "skip"
  );

  // Mutations
  const addSlot = useMutation(api.planning.collectiveSlots.addCollectiveSlot);
  const updateSlot = useMutation(api.planning.collectiveSlots.updateCollectiveSlot);
  const cancelSlot = useMutation(api.planning.collectiveSlots.cancelCollectiveSlot);
  const deleteSlot = useMutation(api.planning.collectiveSlots.deleteCollectiveSlot);

  const slots = slotsQuery || [];

  // Grouper les créneaux par date pour le calendrier
  const slotsByDate = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const slot of slots) {
      const existing = map.get(slot.date) || [];
      existing.push(slot as Slot);
      map.set(slot.date, existing);
    }
    return map;
  }, [slots]);

  // Générer les jours du mois courant
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: { date: Date; dateStr: string; isCurrentMonth: boolean }[] = [];

    // Ajouter les jours du mois précédent pour compléter la semaine
    const startDayOfWeek = firstDay.getDay() || 7; // Lundi = 1
    for (let i = startDayOfWeek - 1; i > 0; i--) {
      const date = new Date(year, month, 1 - i);
      days.push({
        date,
        dateStr: date.toISOString().split("T")[0],
        isCurrentMonth: false,
      });
    }

    // Ajouter les jours du mois courant
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      days.push({
        date,
        dateStr: date.toISOString().split("T")[0],
        isCurrentMonth: true,
      });
    }

    // Compléter la dernière semaine
    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let i = 1; i <= remainingDays; i++) {
        const date = new Date(year, month + 1, i);
        days.push({
          date,
          dateStr: date.toISOString().split("T")[0],
          isCurrentMonth: false,
        });
      }
    }

    return days;
  }, [currentMonth]);

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Gérer les créneaux collectifs
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {variantName} • {duration} min • {maxAnimalsPerSession} places max
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Validation status */}
        {validationQuery && (
          <div
            className={cn(
              "mx-6 mt-4 px-4 py-3 rounded-xl flex items-start gap-3",
              validationQuery.isValid
                ? "bg-green-50 text-green-800"
                : "bg-amber-50 text-amber-800"
            )}
          >
            {validationQuery.isValid ? (
              <Check className="w-5 h-5 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <p className="font-medium">{validationQuery.message}</p>
              {validationQuery.slotsCount !== undefined && (
                <p className="text-sm mt-1 opacity-80">
                  {validationQuery.slotsCount} créneau(x) configuré(s)
                </p>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Calendrier */}
          <div className="bg-gray-50 rounded-2xl p-4">
            {/* Navigation mois */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() =>
                  setCurrentMonth(
                    new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
                  )
                }
                className="p-2 hover:bg-white rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-semibold text-gray-900">
                {currentMonth.toLocaleDateString("fr-FR", {
                  month: "long",
                  year: "numeric",
                })}
              </h3>
              <button
                onClick={() =>
                  setCurrentMonth(
                    new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
                  )
                }
                className="p-2 hover:bg-white rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Jours de la semaine */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-gray-500 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Grille du calendrier */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(({ date, dateStr, isCurrentMonth }) => {
                const daySlots = slotsByDate.get(dateStr) || [];
                const activeSlots = daySlots.filter((s: Slot) => s.isActive && !s.isCancelled);
                const hasSlots = activeSlots.length > 0;
                const isPast = dateStr < today;
                const isToday = dateStr === today;

                return (
                  <div
                    key={dateStr}
                    className={cn(
                      "min-h-[80px] p-1 rounded-lg border transition-colors",
                      isCurrentMonth ? "bg-white" : "bg-gray-100/50",
                      isPast && "opacity-50",
                      isToday && "ring-2 ring-primary/50",
                      hasSlots ? "border-primary/30" : "border-transparent"
                    )}
                  >
                    <div
                      className={cn(
                        "text-xs font-medium mb-1",
                        isCurrentMonth ? "text-gray-700" : "text-gray-400"
                      )}
                    >
                      {date.getDate()}
                    </div>

                    {/* Créneaux du jour */}
                    <div className="space-y-1">
                      {activeSlots.slice(0, 2).map((slot) => (
                        <button
                          key={slot._id}
                          onClick={() => setEditingSlot(slot)}
                          className={cn(
                            "w-full text-xs px-1.5 py-1 rounded text-left transition-colors truncate",
                            slot.bookedAnimals > 0
                              ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                              : "bg-primary/10 text-primary hover:bg-primary/20"
                          )}
                        >
                          {slot.startTime} ({slot.bookedAnimals}/{slot.maxAnimals})
                        </button>
                      ))}
                      {activeSlots.length > 2 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{activeSlots.length - 2}
                        </div>
                      )}
                    </div>

                    {/* Bouton ajouter si jour futur */}
                    {!isPast && isCurrentMonth && activeSlots.length === 0 && (
                      <button
                        onClick={() => {
                          setShowAddModal(true);
                          // TODO: Pré-remplir la date
                        }}
                        className="w-full mt-1 text-xs text-gray-400 hover:text-primary transition-colors flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Légende */}
          <div className="flex items-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-primary/20" />
              <span className="text-gray-600">Créneau disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-200" />
              <span className="text-gray-600">Partiellement réservé</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-500">
                Animaux: {animalTypes.map((t) => ANIMAL_EMOJIS[t] || t).join(" ")}
              </div>
            </div>
          </div>

          {/* Liste des créneaux à venir */}
          <div className="mt-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Prochains créneaux
            </h3>

            <div className="space-y-2">
              {slots
                .filter((s: Slot) => s.date >= today && s.isActive && !s.isCancelled)
                .slice(0, 10)
                .map((slot: Slot) => (
                  <div
                    key={slot._id}
                    className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-xs text-gray-500 uppercase">
                          {new Date(slot.date).toLocaleDateString("fr-FR", {
                            weekday: "short",
                          })}
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {new Date(slot.date).getDate()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(slot.date).toLocaleDateString("fr-FR", {
                            month: "short",
                          })}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 text-gray-900">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {slot.startTime} - {slot.endTime}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                          <Users className="w-4 h-4" />
                          {slot.bookedAnimals}/{slot.maxAnimals} places réservées
                          {slot.recurrencePattern && (
                            <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded-full text-xs flex items-center gap-1">
                              <Repeat className="w-3 h-3" />
                              {slot.recurrencePattern === "weekly"
                                ? "Hebdo"
                                : slot.recurrencePattern === "daily"
                                ? "Quotidien"
                                : slot.recurrencePattern === "biweekly"
                                ? "Bi-hebdo"
                                : "Mensuel"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {slot.bookedAnimals > 0 && (
                        <button
                          onClick={() => setShowBookingsModal(slot._id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
                          title="Voir les réservations"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setEditingSlot(slot as Slot)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
                        title="Modifier"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {slot.bookedAnimals === 0 ? (
                        <button
                          onClick={async () => {
                            if (
                              token &&
                              confirm("Supprimer ce créneau ?")
                            ) {
                              await deleteSlot({ token, slotId: slot._id });
                            }
                          }}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-500"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            const reason = prompt(
                              "Raison de l'annulation (les clients seront notifiés) :"
                            );
                            if (token && reason) {
                              await cancelSlot({
                                token,
                                slotId: slot._id,
                                reason,
                              });
                            }
                          }}
                          className="p-2 hover:bg-amber-50 rounded-lg transition-colors text-amber-500"
                          title="Annuler"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

              {slots.filter((s: Slot) => s.date >= today && s.isActive && !s.isCancelled)
                .length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucun créneau configuré</p>
                  <p className="text-sm mt-1">
                    Ajoutez des créneaux pour que les clients puissent réserver
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Fermer
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Ajouter un créneau
          </button>
        </div>

        {/* Modal ajout créneau */}
        <AnimatePresence>
          {showAddModal && (
            <AddSlotModal
              variantId={variantId}
              duration={duration}
              maxAnimalsPerSession={maxAnimalsPerSession}
              token={token || ""}
              onClose={() => setShowAddModal(false)}
              onAdd={addSlot}
            />
          )}
        </AnimatePresence>

        {/* Modal édition créneau */}
        <AnimatePresence>
          {editingSlot && (
            <EditSlotModal
              slot={editingSlot}
              duration={duration}
              token={token || ""}
              onClose={() => setEditingSlot(null)}
              onUpdate={updateSlot}
              onCancel={cancelSlot}
            />
          )}
        </AnimatePresence>

        {/* Modal voir réservations */}
        <AnimatePresence>
          {showBookingsModal && (
            <BookingsModal
              slotId={showBookingsModal}
              token={token || ""}
              onClose={() => setShowBookingsModal(null)}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ============================================
// Modal Ajout Créneau
// ============================================

interface AddSlotModalProps {
  variantId: Id<"serviceVariants">;
  duration: number;
  maxAnimalsPerSession: number;
  token: string;
  onClose: () => void;
  onAdd: any;
}

function AddSlotModal({
  variantId,
  duration,
  maxAnimalsPerSession,
  token,
  onClose,
  onAdd,
}: AddSlotModalProps) {
  const [date, setDate] = useState("");
  const [mode, setMode] = useState<"single" | "range">("single"); // Mode simple ou plage horaire
  const [startTime, setStartTime] = useState("09:00");
  const [dayEndTime, setDayEndTime] = useState("18:00"); // Heure de fin de la journée pour le mode range
  const [breakStart, setBreakStart] = useState(""); // Pause (optionnel)
  const [breakEnd, setBreakEnd] = useState("");
  const [useRecurrence, setUseRecurrence] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<
    "daily" | "weekly" | "biweekly" | "monthly"
  >("weekly");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculer l'heure de fin pour un seul créneau
  const singleSlotEndTime = useMemo(() => {
    if (!startTime) return "";
    const [hours, minutes] = startTime.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
  }, [startTime, duration]);

  // Calculer les créneaux générés pour le mode range
  const generatedSlots = useMemo(() => {
    if (mode !== "range" || !startTime || !dayEndTime) return [];

    const slots: { startTime: string; endTime: string }[] = [];
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = dayEndTime.split(":").map(Number);
    const dayEndMinutes = endH * 60 + endM;

    // Parse break times if provided
    let breakStartMinutes = -1;
    let breakEndMinutes = -1;
    if (breakStart && breakEnd) {
      const [bsH, bsM] = breakStart.split(":").map(Number);
      const [beH, beM] = breakEnd.split(":").map(Number);
      breakStartMinutes = bsH * 60 + bsM;
      breakEndMinutes = beH * 60 + beM;
    }

    let currentMinutes = startH * 60 + startM;

    while (currentMinutes + duration <= dayEndMinutes) {
      const slotEndMinutes = currentMinutes + duration;

      // Check if slot overlaps with break
      const overlapsBreak = breakStartMinutes >= 0 &&
        !(slotEndMinutes <= breakStartMinutes || currentMinutes >= breakEndMinutes);

      if (!overlapsBreak) {
        const slotStartH = Math.floor(currentMinutes / 60);
        const slotStartM = currentMinutes % 60;
        const slotEndH = Math.floor(slotEndMinutes / 60);
        const slotEndM = slotEndMinutes % 60;

        slots.push({
          startTime: `${String(slotStartH).padStart(2, "0")}:${String(slotStartM).padStart(2, "0")}`,
          endTime: `${String(slotEndH).padStart(2, "0")}:${String(slotEndM).padStart(2, "0")}`,
        });
      }

      currentMinutes += duration;

      // Skip over break if we're at the start of it
      if (breakStartMinutes >= 0 && currentMinutes >= breakStartMinutes && currentMinutes < breakEndMinutes) {
        currentMinutes = breakEndMinutes;
      }
    }

    return slots;
  }, [mode, startTime, dayEndTime, duration, breakStart, breakEnd]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;

    if (mode === "single" && !startTime) return;
    if (mode === "range" && generatedSlots.length === 0) return;

    setIsSubmitting(true);
    try {
      if (mode === "single") {
        // Mode créneau unique
        await onAdd({
          token,
          variantId,
          date,
          startTime,
          recurrence: useRecurrence
            ? { pattern: recurrencePattern, endDate: recurrenceEndDate }
            : undefined,
        });
      } else {
        // Mode plage horaire - créer plusieurs créneaux
        for (const slot of generatedSlots) {
          await onAdd({
            token,
            variantId,
            date,
            startTime: slot.startTime,
            recurrence: useRecurrence
              ? { pattern: recurrencePattern, endDate: recurrenceEndDate }
              : undefined,
          });
        }
      }
      onClose();
    } catch (error) {
      console.error("Erreur lors de l'ajout du créneau:", error);
      alert("Erreur lors de l'ajout du créneau");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col"
      >
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 h-full">
          {/* Header fixe */}
          <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
            <h3 className="text-lg font-semibold text-gray-900">
              Ajouter des créneaux
            </h3>
          </div>

          {/* Contenu scrollable */}
          <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
            {/* Mode de création */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mode de création
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode("single")}
                  className={cn(
                    "flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors border-2",
                    mode === "single"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  )}
                >
                  Créneau unique
                </button>
                <button
                  type="button"
                  onClick={() => setMode("range")}
                  className={cn(
                    "flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors border-2",
                    mode === "range"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  )}
                >
                  Plage horaire
                </button>
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
              />
            </div>

            {mode === "single" ? (
              <>
                {/* Mode créneau unique */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Heure de début
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    required
                  />
                </div>

                {/* Preview créneau unique */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Durée</span>
                    <span className="font-medium">{duration} min</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-600">Heure de fin</span>
                    <span className="font-medium">{singleSlotEndTime || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-600">Places</span>
                    <span className="font-medium">{maxAnimalsPerSession} animaux max</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Mode plage horaire */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Début journée
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fin journée
                    </label>
                    <input
                      type="time"
                      value={dayEndTime}
                      onChange={(e) => setDayEndTime(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      required
                    />
                  </div>
                </div>

                {/* Pause (optionnel) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pause déjeuner (optionnel)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="time"
                      value={breakStart}
                      onChange={(e) => setBreakStart(e.target.value)}
                      placeholder="Début pause"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <input
                      type="time"
                      value={breakEnd}
                      onChange={(e) => setBreakEnd(e.target.value)}
                      placeholder="Fin pause"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Ex: 12:00 - 14:00 pour exclure la pause déjeuner
                  </p>
                </div>

                {/* Preview créneaux générés */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="text-gray-600">Durée par créneau</span>
                    <span className="font-medium">{duration} min</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="text-gray-600">Créneaux générés</span>
                    <span className="font-bold text-primary">{generatedSlots.length}</span>
                  </div>

                  {generatedSlots.length > 0 && (
                    <div className="border-t border-gray-200 pt-3 mt-3">
                      <p className="text-xs text-gray-500 mb-2">Aperçu des créneaux :</p>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-auto">
                        {generatedSlots.map((slot, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-lg"
                          >
                            {slot.startTime}-{slot.endTime}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Récurrence */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useRecurrence}
                  onChange={(e) => setUseRecurrence(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-gray-700">
                  Créer une récurrence
                </span>
              </label>

              {useRecurrence && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 space-y-4 pl-6 border-l-2 border-primary/20"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fréquence
                    </label>
                    <select
                      value={recurrencePattern}
                      onChange={(e) =>
                        setRecurrencePattern(
                          e.target.value as "daily" | "weekly" | "biweekly" | "monthly"
                        )
                      }
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="daily">Tous les jours</option>
                      <option value="weekly">Toutes les semaines</option>
                      <option value="biweekly">Toutes les 2 semaines</option>
                      <option value="monthly">Tous les mois</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Jusqu'au
                    </label>
                    <input
                      type="date"
                      value={recurrenceEndDate}
                      onChange={(e) => setRecurrenceEndDate(e.target.value)}
                      min={date}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      required={useRecurrence}
                    />
                  </div>

                  {mode === "range" && generatedSlots.length > 0 && useRecurrence && recurrenceEndDate && (
                    <div className="p-3 bg-amber-50 rounded-xl text-sm text-amber-700">
                      <strong>Attention :</strong> Cela créera {generatedSlots.length} créneaux par jour, soit potentiellement beaucoup de créneaux sur la période.
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </div>

          {/* Footer fixe */}
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !date || (mode === "single" && !startTime) || (mode === "range" && generatedSlots.length === 0)}
              className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Création...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  {mode === "range"
                    ? `Créer ${generatedSlots.length} créneau${generatedSlots.length > 1 ? 'x' : ''}`
                    : useRecurrence
                      ? "Créer les créneaux"
                      : "Créer le créneau"
                  }
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ============================================
// Modal Édition Créneau
// ============================================

interface EditSlotModalProps {
  slot: Slot;
  duration: number;
  token: string;
  onClose: () => void;
  onUpdate: any;
  onCancel: any;
}

function EditSlotModal({
  slot,
  duration,
  token,
  onClose,
  onUpdate,
  onCancel,
}: EditSlotModalProps) {
  const [date, setDate] = useState(slot.date);
  const [startTime, setStartTime] = useState(slot.startTime);
  const [applyToFuture, setApplyToFuture] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const endTime = useMemo(() => {
    if (!startTime) return "";
    const [hours, minutes] = startTime.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
  }, [startTime, duration]);

  const hasChanges = date !== slot.date || startTime !== slot.startTime;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdate({
        token,
        slotId: slot._id,
        date: date !== slot.date ? date : undefined,
        startTime: startTime !== slot.startTime ? startTime : undefined,
        applyToFuture: slot.recurrenceId ? applyToFuture : undefined,
      });
      onClose();
    } catch (error) {
      console.error("Erreur lors de la modification:", error);
      alert("Erreur lors de la modification");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md"
      >
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">
              Modifier le créneau
            </h3>
            {slot.bookedAnimals > 0 && (
              <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                {slot.bookedAnimals} réservation(s) - Les clients seront notifiés
              </p>
            )}
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Heure de début
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Heure de fin</span>
                <span className="font-medium">{endTime}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-600">Réservations</span>
                <span className="font-medium">
                  {slot.bookedAnimals}/{slot.maxAnimals}
                </span>
              </div>
            </div>

            {slot.recurrenceId && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyToFuture}
                  onChange={(e) => setApplyToFuture(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">
                  Appliquer aux créneaux récurrents futurs
                </span>
              </label>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !hasChanges}
              className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ============================================
// Modal Voir Réservations
// ============================================

interface BookingsModalProps {
  slotId: Id<"collectiveSlots">;
  token: string;
  onClose: () => void;
}

function BookingsModal({ slotId, token, onClose }: BookingsModalProps) {
  const bookingsQuery = useQuery(
    api.planning.collectiveSlots.getSlotBookings,
    token ? { token, slotId } : "skip"
  );

  const bookings = bookingsQuery || [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md"
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Réservations ({bookings.length})
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 max-h-[400px] overflow-auto">
          {bookings.length === 0 ? (
            <p className="text-center text-gray-500 py-4">Aucune réservation</p>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking: any) => (
                <div
                  key={booking._id}
                  className="p-3 bg-gray-50 rounded-xl"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {booking.clientName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {booking.animalName} ({booking.animalType})
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-xs px-2 py-1 rounded-full",
                        booking.status === "booked"
                          ? "bg-blue-100 text-blue-700"
                          : booking.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      )}
                    >
                      {booking.status === "booked"
                        ? "Réservé"
                        : booking.status === "completed"
                        ? "Effectué"
                        : booking.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Séance {booking.sessionNumber} •{" "}
                    {booking.animalCount} animal(aux)
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Fermer
          </button>
        </div>
      </motion.div>
    </div>
  );
}
