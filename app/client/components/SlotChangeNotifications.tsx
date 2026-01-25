"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  AlertTriangle,
  Calendar,
  Clock,
  Check,
  X,
  RefreshCw,
  ArrowRight,
  Bell,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useAuth } from "@/app/hooks/useAuth";

interface Notification {
  _id: Id<"slotChangeNotifications">;
  slotId: Id<"collectiveSlots">;
  bookingId: Id<"collectiveSlotBookings">;
  clientId: Id<"users">;
  missionId: Id<"missions">;
  changeType: "time_changed" | "date_changed" | "cancelled";
  previousDate?: string;
  previousStartTime?: string;
  previousEndTime?: string;
  newDate?: string;
  newStartTime?: string;
  newEndTime?: string;
  reason?: string;
  status: "pending" | "acknowledged" | "rescheduled" | "refunded" | "expired";
  createdAt: number;
  expiresAt: number;
  variantName?: string;
  serviceName?: string;
}

interface SlotChangeNotificationsProps {
  className?: string;
}

// Helper pour formater la date
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
};

// Helper pour le temps restant
const getTimeRemaining = (expiresAt: number): string => {
  const now = Date.now();
  const diff = expiresAt - now;
  if (diff <= 0) return "Expiré";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) {
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes} min restantes`;
  }
  return `${hours}h restantes`;
};

export default function SlotChangeNotifications({
  className,
}: SlotChangeNotificationsProps) {
  const { token } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [showSlotPicker, setShowSlotPicker] = useState<string | null>(null);

  // Query pour les notifications en attente
  const notificationsQuery = useQuery(
    api.planning.collectiveSlots.getPendingSlotChangeNotifications,
    token ? { token } : "skip"
  );

  // Mutation pour répondre
  const respondMutation = useMutation(
    api.planning.collectiveSlots.respondToSlotChange
  );

  const notifications = (notificationsQuery || []) as Notification[];

  if (notifications.length === 0) {
    return null;
  }

  const handleRespond = async (
    notificationId: Id<"slotChangeNotifications">,
    response: "accept_change" | "reschedule" | "cancel",
    newSlotId?: Id<"collectiveSlots">
  ) => {
    if (!token) return;

    setRespondingId(notificationId);
    try {
      const result = await respondMutation({
        token,
        notificationId,
        response,
        newSlotId,
      });

      if (response === "cancel" && result && "message" in result) {
        alert(result.message);
      }
    } catch (error) {
      console.error("Erreur lors de la réponse:", error);
      alert("Une erreur est survenue");
    } finally {
      setRespondingId(null);
      setShowSlotPicker(null);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 text-amber-600">
        <Bell className="w-5 h-5" />
        <h3 className="font-semibold">
          {notifications.length} modification
          {notifications.length > 1 ? "s" : ""} de créneau
          {notifications.length > 1 ? "x" : ""}
        </h3>
      </div>

      {/* Liste des notifications */}
      <div className="space-y-3">
        {notifications.map((notification) => {
          const isExpanded = expandedId === notification._id;
          const isResponding = respondingId === notification._id;
          const timeRemaining = getTimeRemaining(notification.expiresAt);

          return (
            <motion.div
              key={notification._id}
              layout
              className="bg-white border border-amber-200 rounded-2xl overflow-hidden shadow-sm"
            >
              {/* Header de la notification */}
              <button
                onClick={() =>
                  setExpandedId(isExpanded ? null : notification._id)
                }
                className="w-full p-4 flex items-start justify-between text-left hover:bg-amber-50/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                      notification.changeType === "cancelled"
                        ? "bg-red-100 text-red-600"
                        : "bg-amber-100 text-amber-600"
                    )}
                  >
                    {notification.changeType === "cancelled" ? (
                      <X className="w-5 h-5" />
                    ) : (
                      <RefreshCw className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {notification.changeType === "cancelled"
                        ? "Créneau annulé"
                        : notification.changeType === "date_changed"
                        ? "Date modifiée"
                        : "Horaire modifié"}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {notification.serviceName} • {notification.variantName}
                    </p>
                    <p className="text-xs text-amber-600 mt-1">{timeRemaining}</p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {/* Détails */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-amber-100"
                  >
                    <div className="p-4 space-y-4">
                      {/* Changement */}
                      <div className="flex items-center gap-4">
                        {/* Avant */}
                        <div className="flex-1 p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs text-gray-500 mb-1">Avant</p>
                          {notification.previousDate && (
                            <p className="font-medium text-gray-900">
                              {formatDate(notification.previousDate)}
                            </p>
                          )}
                          {notification.previousStartTime && (
                            <p className="text-sm text-gray-600">
                              {notification.previousStartTime} -{" "}
                              {notification.previousEndTime}
                            </p>
                          )}
                        </div>

                        <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />

                        {/* Après */}
                        <div
                          className={cn(
                            "flex-1 p-3 rounded-xl",
                            notification.changeType === "cancelled"
                              ? "bg-red-50"
                              : "bg-amber-50"
                          )}
                        >
                          <p className="text-xs text-gray-500 mb-1">Après</p>
                          {notification.changeType === "cancelled" ? (
                            <p className="font-medium text-red-600">Annulé</p>
                          ) : (
                            <>
                              {notification.newDate && (
                                <p className="font-medium text-gray-900">
                                  {formatDate(notification.newDate)}
                                </p>
                              )}
                              {notification.newStartTime && (
                                <p className="text-sm text-gray-600">
                                  {notification.newStartTime} -{" "}
                                  {notification.newEndTime}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Raison */}
                      {notification.reason && (
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs text-gray-500 mb-1">
                            Raison du changement
                          </p>
                          <p className="text-sm text-gray-700">
                            {notification.reason}
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row gap-2 pt-2">
                        {notification.changeType !== "cancelled" && (
                          <button
                            onClick={() =>
                              handleRespond(notification._id, "accept_change")
                            }
                            disabled={isResponding}
                            className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            <Check className="w-4 h-4" />
                            Accepter le changement
                          </button>
                        )}

                        <button
                          onClick={() => setShowSlotPicker(notification._id)}
                          disabled={isResponding}
                          className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <Calendar className="w-4 h-4" />
                          Choisir un autre créneau
                        </button>

                        <button
                          onClick={() =>
                            handleRespond(notification._id, "cancel")
                          }
                          disabled={isResponding}
                          className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Annuler et rembourser
                        </button>
                      </div>

                      {/* Note sur le remboursement */}
                      <p className="text-xs text-gray-500 text-center">
                        Le remboursement n'est possible que si aucune séance n'a
                        encore été effectuée.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* TODO: Modal pour choisir un nouveau créneau */}
      {/* Ce composant nécessiterait d'afficher CollectiveSlotPicker avec les créneaux disponibles */}
    </div>
  );
}
