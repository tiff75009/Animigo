"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Clock, Plus, Trash2, CalendarRange, Info, Check } from "lucide-react";
import { cn } from "@/app/lib/utils";
import {
  Availability,
  AvailabilityStatus,
  availabilityColors,
  availabilityLabels,
} from "../types";
import { CategoryType } from "@/app/hooks/usePlanning";

interface TimeSlot {
  startTime: string;
  endTime: string;
}

interface AvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: string;
  endDate?: string; // If provided, it's a range selection
  categoryTypes: CategoryType[];
  selectedTypeId: string | null;
  currentAvailabilities: Availability[];
  onSave: (
    categoryTypeId: string,
    status: AvailabilityStatus,
    options?: { timeSlots?: TimeSlot[]; reason?: string }
  ) => Promise<void>;
  onSaveRange?: (
    startDate: string,
    endDate: string,
    categoryTypeId: string,
    status: AvailabilityStatus,
    options?: { timeSlots?: TimeSlot[]; reason?: string }
  ) => Promise<void>;
  onClear: (categoryTypeId?: string) => Promise<void>;
}

export function AvailabilityModal({
  isOpen,
  onClose,
  startDate,
  endDate,
  categoryTypes,
  selectedTypeId,
  currentAvailabilities,
  onSave,
  onSaveRange,
  onClear,
}: AvailabilityModalProps) {
  // Multi-select mode: array of selected type IDs
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [status, setStatus] = useState<AvailabilityStatus>("available");
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      // Pre-select the type from the filter, or none
      if (selectedTypeId) {
        setSelectedTypes([selectedTypeId]);
      } else {
        setSelectedTypes([]);
      }
      setStatus("available");
      setTimeSlots([]);
      setReason("");
    }
  }, [isOpen, selectedTypeId]);

  const isRange = endDate && endDate !== startDate;

  // Check if the start date is in the past
  const isPastDate = (dateStr: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(dateStr);
    return checkDate < today;
  };

  const isPast = startDate ? isPastDate(startDate) : false;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatShortDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
  };

  // Calculate number of days in range
  const getDaysCount = () => {
    if (!isRange) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  // Toggle type selection
  const toggleType = (typeId: string) => {
    setSelectedTypes((prev) =>
      prev.includes(typeId)
        ? prev.filter((id) => id !== typeId)
        : [...prev, typeId]
    );
  };

  // Select/deselect all types
  const toggleAllTypes = () => {
    if (selectedTypes.length === categoryTypes.length) {
      setSelectedTypes([]);
    } else {
      setSelectedTypes(categoryTypes.map((t) => t._id));
    }
  };

  const handleSave = async () => {
    if (selectedTypes.length === 0) return;

    setIsLoading(true);
    try {
      // Save for each selected type
      for (const typeId of selectedTypes) {
        if (isRange && onSaveRange) {
          await onSaveRange(startDate, endDate, typeId, status, {
            timeSlots: status === "partial" ? timeSlots : undefined,
            reason: reason || undefined,
          });
        } else {
          await onSave(typeId, status, {
            timeSlots: status === "partial" ? timeSlots : undefined,
            reason: reason || undefined,
          });
        }
      }
      onClose();
    } catch (error) {
      console.error("Error saving availability:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    if (selectedTypes.length === 0) return;

    setIsLoading(true);
    try {
      // Clear for each selected type
      for (const typeId of selectedTypes) {
        await onClear(typeId);
      }
      onClose();
    } catch (error) {
      console.error("Error clearing availability:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addTimeSlot = () => {
    setTimeSlots([...timeSlots, { startTime: "09:00", endTime: "12:00" }]);
  };

  const removeTimeSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  };

  const updateTimeSlot = (
    index: number,
    field: "startTime" | "endTime",
    value: string
  ) => {
    setTimeSlots(
      timeSlots.map((slot, i) =>
        i === index ? { ...slot, [field]: value } : slot
      )
    );
  };

  // Get display status for a type
  const getTypeStatus = (typeId: string): AvailabilityStatus | "default" => {
    const avail = currentAvailabilities.find((a) => a.categoryTypeId === typeId);
    if (!avail) return "default"; // No entry = unavailable by default
    return avail.status;
  };

  // Check if at least one selected type has an existing availability
  const hasExistingAvailability = selectedTypes.some((typeId) =>
    currentAvailabilities.some((a) => a.categoryTypeId === typeId)
  );

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
          className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                {isRange ? (
                  <CalendarRange className="w-5 h-5 text-primary" />
                ) : (
                  <Calendar className="w-5 h-5 text-primary" />
                )}
              </div>
              <div>
                <h2 className="font-bold text-foreground">
                  {isRange ? "Disponibilite - Selection" : "Disponibilite"}
                </h2>
                {isRange ? (
                  <p className="text-sm text-text-light">
                    Du {formatShortDate(startDate)} au {formatShortDate(endDate)}{" "}
                    <span className="text-primary font-medium">
                      ({getDaysCount()} jours)
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-text-light capitalize">
                    {formatDate(startDate)}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-text-light" />
            </button>
          </div>

          {/* Info banner */}
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-800">Services individuels uniquement</p>
                <p className="text-amber-600 text-xs mt-1">
                  Pour les seances collectives, creez des creneaux dans &quot;Mes services&quot;.
                  Un creneau individuel et collectif ne peuvent pas se chevaucher.
                </p>
              </div>
            </div>
          </div>

          {/* Past date warning */}
          {isPast && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm text-amber-800 font-medium">
                Cette date est passee
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Vous ne pouvez pas modifier la disponibilite des jours passes.
              </p>
            </div>
          )}

          {/* Type selection - Multi-select */}
          {!isPast && categoryTypes.length > 0 && (
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  Types de service
                </label>
                <button
                  onClick={toggleAllTypes}
                  className="text-xs text-primary hover:underline"
                >
                  {selectedTypes.length === categoryTypes.length
                    ? "Tout deselectionner"
                    : "Tout selectionner"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {categoryTypes.map((type) => {
                  const typeStatus = getTypeStatus(type._id);
                  const isUnavailable = typeStatus === "default" || typeStatus === "unavailable";
                  const isSelected = selectedTypes.includes(type._id);
                  return (
                    <button
                      key={type._id}
                      onClick={() => toggleType(type._id)}
                      className={cn(
                        "py-3 px-3 rounded-xl text-sm font-medium border-2 transition-all flex items-center gap-2 relative",
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      {/* Checkbox indicator */}
                      <div
                        className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                          isSelected
                            ? "bg-primary border-primary"
                            : "border-gray-300"
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span>{type.icon}</span>
                      <span className="flex-1 text-left text-foreground">{type.name}</span>
                      {/* Status indicator */}
                      <span
                        className={cn(
                          "w-2.5 h-2.5 rounded-full",
                          isUnavailable
                            ? "bg-gray-300"
                            : typeStatus === "available"
                              ? "bg-green-500"
                              : "bg-orange-500"
                        )}
                        title={
                          isUnavailable
                            ? "Indisponible"
                            : typeStatus === "available"
                              ? "Disponible"
                              : "Partiel"
                        }
                      />
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-text-light">
                • Vert = disponible • Orange = partiel • Gris = indisponible (defaut)
              </p>
            </div>
          )}

          {/* Status selection */}
          {!isPast && selectedTypes.length > 0 && (
            <div className="space-y-3 mb-6">
              <label className="text-sm font-medium text-foreground">
                Statut a appliquer ({selectedTypes.length} type{selectedTypes.length > 1 ? "s" : ""})
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  ["available", "partial", "unavailable"] as AvailabilityStatus[]
                ).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={cn(
                      "py-3 px-2 rounded-xl text-sm font-medium border-2 transition-all",
                      status === s
                        ? cn(availabilityColors[s], "border-current")
                        : "border-gray-200 text-text-light hover:border-gray-300"
                    )}
                  >
                    {availabilityLabels[s]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Time slots (for partial availability) */}
          {!isPast && selectedTypes.length > 0 && status === "partial" && (
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-text-light" />
                  Creneaux disponibles
                </label>
                <button
                  onClick={addTimeSlot}
                  className="text-primary text-sm font-medium flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter
                </button>
              </div>

              {timeSlots.length === 0 ? (
                <p className="text-sm text-text-light bg-gray-50 p-3 rounded-lg">
                  Ajoutez des creneaux horaires pendant lesquels vous etes
                  disponible.
                </p>
              ) : (
                <div className="space-y-2">
                  {timeSlots.map((slot, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg"
                    >
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) =>
                          updateTimeSlot(index, "startTime", e.target.value)
                        }
                        className="px-2 py-1 border rounded-lg text-sm"
                      />
                      <span className="text-text-light">a</span>
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) =>
                          updateTimeSlot(index, "endTime", e.target.value)
                        }
                        className="px-2 py-1 border rounded-lg text-sm"
                      />
                      <button
                        onClick={() => removeTimeSlot(index)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reason (for unavailable) */}
          {!isPast && selectedTypes.length > 0 && status === "unavailable" && (
            <div className="space-y-2 mb-6">
              <label className="text-sm font-medium text-foreground">
                Raison (optionnel)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Vacances, RDV medical..."
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {isPast ? (
              <motion.button
                onClick={onClose}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                Fermer
              </motion.button>
            ) : selectedTypes.length === 0 ? (
              <motion.button
                onClick={onClose}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                Annuler
              </motion.button>
            ) : (
              <>
                {hasExistingAvailability && !isRange && (
                  <motion.button
                    onClick={handleClear}
                    disabled={isLoading}
                    className="flex-1 py-3 border border-gray-200 text-text-light rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    Reinitialiser
                  </motion.button>
                )}
                <motion.button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold disabled:opacity-50"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {isLoading
                    ? "Enregistrement..."
                    : isRange
                      ? `Appliquer a ${getDaysCount()} jours`
                      : `Enregistrer (${selectedTypes.length} type${selectedTypes.length > 1 ? "s" : ""})`}
                </motion.button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
