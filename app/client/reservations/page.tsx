"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Search,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  Moon,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/app/lib/utils";

type FilterType = "all" | "upcoming" | "completed" | "cancelled";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending_acceptance: { label: "En attente", color: "bg-yellow-100 text-yellow-700", icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  pending_confirmation: { label: "À confirmer", color: "bg-orange-100 text-orange-700", icon: <AlertCircle className="w-4 h-4" /> },
  upcoming: { label: "Confirmée", color: "bg-green-100 text-green-700", icon: <CheckCircle className="w-4 h-4" /> },
  in_progress: { label: "En cours", color: "bg-blue-100 text-blue-700", icon: <Clock className="w-4 h-4" /> },
  completed: { label: "Terminée", color: "bg-gray-100 text-gray-700", icon: <CheckCircle className="w-4 h-4" /> },
  refused: { label: "Refusée", color: "bg-red-100 text-red-700", icon: <XCircle className="w-4 h-4" /> },
  cancelled: { label: "Annulée", color: "bg-red-100 text-red-700", icon: <XCircle className="w-4 h-4" /> },
};

export default function ReservationsPage() {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const [filter, setFilter] = useState<FilterType>("all");

  const reservations = useQuery(
    api.planning.missions.getClientMissions,
    token ? { token } : "skip"
  );

  const filteredReservations = reservations?.filter((r: { status: string }) => {
    if (filter === "all") return true;
    if (filter === "upcoming") return ["pending_acceptance", "pending_confirmation", "upcoming", "in_progress"].includes(r.status);
    if (filter === "completed") return r.status === "completed";
    if (filter === "cancelled") return ["refused", "cancelled"].includes(r.status);
    return true;
  }) || [];

  const filters: { id: FilterType; label: string; count: number }[] = [
    { id: "all", label: "Toutes", count: reservations?.length || 0 },
    {
      id: "upcoming",
      label: "À venir",
      count: reservations?.filter((r: { status: string }) =>
        ["pending_acceptance", "pending_confirmation", "upcoming", "in_progress"].includes(r.status)
      ).length || 0
    },
    {
      id: "completed",
      label: "Terminées",
      count: reservations?.filter((r: { status: string }) => r.status === "completed").length || 0
    },
    {
      id: "cancelled",
      label: "Annulées",
      count: reservations?.filter((r: { status: string }) =>
        ["refused", "cancelled"].includes(r.status)
      ).length || 0
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mes réservations</h1>
          <p className="text-gray-500 mt-1">Suivez l'état de vos demandes de garde</p>
        </div>
        <Link
          href="/recherche"
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-medium shadow-lg shadow-primary/25"
        >
          <Search className="w-5 h-5" />
          Nouvelle réservation
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all whitespace-nowrap",
              filter === f.id
                ? "bg-primary text-white"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
            )}
          >
            {f.label}
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs",
              filter === f.id ? "bg-white/20" : "bg-gray-100"
            )}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Reservations list */}
      {filteredReservations.length > 0 ? (
        <div className="space-y-4">
          {filteredReservations.map((reservation: {
            id: string;
            serviceName: string;
            announcerName: string;
            startDate: string;
            endDate: string;
            startTime?: string;
            endTime?: string;
            location?: string;
            status: string;
            amount: number;
            animal?: { name: string; emoji: string };
          }) => {
            const status = statusConfig[reservation.status] || statusConfig.pending_acceptance;
            const duration = calculateDuration(reservation.startDate, reservation.endDate, reservation.startTime, reservation.endTime);

            return (
              <motion.div
                key={reservation.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Link href={`/client/reservations/${reservation.id}`} className="block">
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-primary/20 transition-all cursor-pointer">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {/* Service & Status */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-2xl">
                          {reservation.animal?.emoji || "🐾"}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">{reservation.serviceName}</h3>
                          <p className="text-sm text-gray-500">
                            Pour {reservation.animal?.name || "votre animal"}
                          </p>
                        </div>
                        <div className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
                          status.color
                        )}>
                          {status.icon}
                          {status.label}
                        </div>
                      </div>

                      {/* Date & Time Details */}
                      <div className="bg-gray-50 rounded-xl p-3 mb-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Start */}
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                              <Calendar className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Début</p>
                              <p className="text-sm font-medium text-foreground">
                                {formatDateShort(reservation.startDate)}
                                {reservation.startTime && <span className="text-primary ml-1">{reservation.startTime}</span>}
                              </p>
                            </div>
                          </div>
                          {/* End */}
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                              <Moon className="w-4 h-4 text-red-600" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Fin</p>
                              <p className="text-sm font-medium text-foreground">
                                {formatDateShort(reservation.endDate)}
                                {reservation.endTime && <span className="text-primary ml-1">{reservation.endTime}</span>}
                              </p>
                            </div>
                          </div>
                        </div>
                        {/* Duration */}
                        <div className="mt-2 pt-2 border-t border-gray-200 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium text-primary">{duration}</span>
                        </div>
                      </div>

                      {/* Announcer & Location */}
                      <div className="flex flex-wrap gap-3 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <User className="w-4 h-4 text-gray-400" />
                          {reservation.announcerName}
                        </div>
                        {reservation.location && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            {reservation.location.length > 30
                              ? reservation.location.substring(0, 30) + "..."
                              : reservation.location}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Price & Action */}
                    <div className="text-right flex flex-col items-end justify-between h-full">
                      <p className="text-lg font-bold text-foreground">
                        {(reservation.amount / 100).toFixed(2).replace(".", ",")} €
                      </p>
                      <div className="mt-3 flex items-center gap-1 text-primary text-sm font-medium">
                        Voir détails
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-2xl p-12 text-center"
        >
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Calendar className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {filter === "all" ? "Aucune réservation" : `Aucune réservation ${filters.find(f => f.id === filter)?.label.toLowerCase()}`}
          </h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            {filter === "all"
              ? "Trouvez le pet-sitter idéal pour votre compagnon"
              : "Aucune réservation ne correspond à ce filtre"
            }
          </p>
          {filter === "all" && (
            <Link
              href="/recherche"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              <Search className="w-5 h-5" />
              Trouver un pet-sitter
            </Link>
          )}
        </motion.div>
      )}
    </div>
  );
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

function calculateDuration(
  startDate: string,
  endDate: string,
  startTime?: string,
  endTime?: string
): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  // If same day with times, calculate hours
  if (startDate === endDate && startTime && endTime) {
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    const hours = endH - startH + (endM - startM) / 60;

    if (hours < 1) {
      return `${Math.round(hours * 60)} minutes`;
    }
    return `${hours.toFixed(1).replace(".0", "")} heure${hours > 1 ? "s" : ""}`;
  }

  // Multi-day
  if (diffDays === 1) {
    return "1 journée";
  }
  return `${diffDays} jours`;
}
