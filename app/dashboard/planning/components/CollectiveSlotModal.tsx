"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  X,
  Users,
  Clock,
  Calendar,
  PawPrint,
  Mail,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import Link from "next/link";

interface SlotBooking {
  _id: string;
  clientName: string;
  clientEmail?: string;
  animalName: string;
  animalEmoji?: string;
  animalType?: string;
  animalCount?: number;
  sessionNumber?: number;
  status?: string;
}

interface CollectiveSlotModalProps {
  slot: {
    _id: string;
    variantId: string;
    variantName: string;
    serviceName: string;
    date: string;
    startTime: string;
    endTime: string;
    maxAnimals: number;
    bookedAnimals: number;
    availableSpots: number;
  } | null;
  token: string | null;
  onClose: () => void;
}

export function CollectiveSlotModal({
  slot,
  token,
  onClose,
}: CollectiveSlotModalProps) {
  const [isClosing, setIsClosing] = useState(false);

  // Reset isClosing when slot changes (new modal opens)
  useEffect(() => {
    if (slot) {
      setIsClosing(false);
    }
  }, [slot]);

  // Fetch bookings for this slot
  const bookings = useQuery(
    api.planning.collectiveSlots.getSlotBookings,
    slot && token
      ? { token, slotId: slot._id as Id<"collectiveSlots"> }
      : "skip"
  );

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 200);
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  if (!slot) return null;

  const isFull = slot.bookedAnimals >= slot.maxAnimals;
  const fillPercentage = (slot.bookedAnimals / slot.maxAnimals) * 100;

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isClosing ? 0 : 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{
            scale: isClosing ? 0.95 : 1,
            opacity: isClosing ? 0 : 1,
            y: isClosing ? 20 : 0,
          }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-purple-500 text-white p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{slot.variantName}</h2>
                  <p className="text-purple-100">{slot.serviceName}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span>Places réservées</span>
                <span className="font-bold">
                  {slot.bookedAnimals}/{slot.maxAnimals}
                </span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${fillPercentage}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={cn(
                    "h-full rounded-full",
                    isFull ? "bg-white" : "bg-purple-200"
                  )}
                />
              </div>
              <p className="text-sm text-purple-100 mt-1">
                {isFull
                  ? "Complet"
                  : `${slot.availableSpots} place${slot.availableSpots > 1 ? "s" : ""} disponible${slot.availableSpots > 1 ? "s" : ""}`}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[50vh]">
            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Calendar className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-xs text-text-light">Date</p>
                  <p className="font-medium capitalize">{formatDate(slot.date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Clock className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-xs text-text-light">Horaire</p>
                  <p className="font-medium">
                    {slot.startTime} - {slot.endTime}
                  </p>
                </div>
              </div>
            </div>

            {/* Bookings list */}
            <div>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <PawPrint className="w-4 h-4 text-purple-500" />
                Réservations ({bookings?.length || 0})
              </h3>

              {bookings === undefined ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <Users className="w-8 h-8 text-text-light mx-auto mb-2" />
                  <p className="text-text-light">Aucune réservation</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {bookings.map((booking: SlotBooking) => (
                    <motion.div
                      key={booking._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <PawPrint className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {booking.animalName}
                          </p>
                          <p className="text-sm text-text-light">
                            {booking.clientName}
                          </p>
                        </div>
                      </div>
                      {booking.clientEmail && (
                        <a
                          href={`mailto:${booking.clientEmail}`}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                          title="Envoyer un email"
                        >
                          <Mail className="w-4 h-4 text-text-light" />
                        </a>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 flex gap-3">
            <Link
              href={`/dashboard/services?variant=${slot.variantId}`}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-xl font-medium hover:bg-purple-200 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Gérer les créneaux
            </Link>
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-gray-200 rounded-xl font-medium text-text-light hover:bg-gray-50 transition-colors"
            >
              Fermer
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
