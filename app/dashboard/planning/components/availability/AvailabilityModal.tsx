"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Clock, Plus, Trash2, CalendarRange } from "lucide-react";
import { cn } from "@/app/lib/utils";
import {
  Availability,
  AvailabilityStatus,
  availabilityColors,
  availabilityLabels,
} from "../types";

interface TimeSlot {
  startTime: string;
  endTime: string;
}

interface AvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: string;
  endDate?: string; // If provided, it's a range selection
  currentAvailability?: Availability | null;
  onSave: (
    status: AvailabilityStatus,
    options?: { timeSlots?: TimeSlot[]; reason?: string }
  ) => Promise<void>;
  onSaveRange?: (
    startDate: string,
    endDate: string,
    status: AvailabilityStatus,
    options?: { timeSlots?: TimeSlot[]; reason?: string }
  ) => Promise<void>;
  onClear: () => Promise<void>;
}

export function AvailabilityModal({
  isOpen,
  onClose,
  startDate,
  endDate,
  currentAvailability,
  onSave,
  onSaveRange,
  onClear,
}: AvailabilityModalProps) {
  const [status, setStatus] = useState<AvailabilityStatus>(
    currentAvailability?.status || "unavailable"
  );
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(
    currentAvailability?.timeSlots || []
  );
  const [reason, setReason] = useState(currentAvailability?.reason || "");
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStatus(currentAvailability?.status || "unavailable");
      setTimeSlots(currentAvailability?.timeSlots || []);
      setReason(currentAvailability?.reason || "");
    }
  }, [isOpen, currentAvailability]);

  const isRange = endDate && endDate !== startDate;

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

  const handleSave = async () => {
    setIsLoading(true);
    try {
      if (isRange && onSaveRange) {
        await onSaveRange(startDate, endDate, status, {
          timeSlots: status === "partial" ? timeSlots : undefined,
          reason: reason || undefined,
        });
      } else {
        await onSave(status, {
          timeSlots: status === "partial" ? timeSlots : undefined,
          reason: reason || undefined,
        });
      }
      onClose();
    } catch (error) {
      console.error("Error saving availability:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    setIsLoading(true);
    try {
      await onClear();
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

          {/* Status selection */}
          <div className="space-y-3 mb-6">
            <label className="text-sm font-medium text-foreground">
              Statut
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

          {/* Time slots (for partial availability) */}
          {status === "partial" && (
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
          {status === "unavailable" && (
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
            {currentAvailability && !isRange && (
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
                  : "Enregistrer"}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
