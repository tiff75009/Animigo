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

            return (
              <motion.div
                key={reservation.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Service & Status */}
                    <div className="flex items-center gap-3 mb-3">
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

                    {/* Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <User className="w-4 h-4 text-gray-400" />
                        {reservation.announcerName}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatDateRange(reservation.startDate, reservation.endDate)}
                      </div>
                      {reservation.startTime && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {reservation.startTime}
                          {reservation.endTime && ` - ${reservation.endTime}`}
                        </div>
                      )}
                      {reservation.location && (
                        <div className="flex items-center gap-2 text-gray-600 sm:col-span-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          {reservation.location}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Price & Action */}
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">
                      {(reservation.amount / 100).toFixed(2)} €
                    </p>
                    <button className="mt-2 flex items-center gap-1 text-primary text-sm font-medium hover:underline">
                      Détails
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
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

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const formatOptions: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
  };

  if (startDate === endDate) {
    return start.toLocaleDateString("fr-FR", { ...formatOptions, year: "numeric" });
  }

  return `${start.toLocaleDateString("fr-FR", formatOptions)} - ${end.toLocaleDateString("fr-FR", { ...formatOptions, year: "numeric" })}`;
}
