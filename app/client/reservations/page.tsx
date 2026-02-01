"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  MessageSquare,
  Lock,
  CalendarDays,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/app/lib/utils";
import { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/app/components/ui/toast";
import {
  ReservationsFilters,
  type StatusFilter,
  type ServiceTypeFilter,
  type SessionTypeFilter,
} from "./components/ReservationsFilters";
import { PaymentCountdown } from "./components/PaymentCountdown";

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  pending_acceptance: { label: "En attente", color: "text-yellow-700", bgColor: "bg-yellow-100", icon: <Loader2 className="w-3.5 h-3.5 animate-spin" /> },
  pending_confirmation: { label: "À confirmer", color: "text-orange-700", bgColor: "bg-orange-100", icon: <AlertCircle className="w-3.5 h-3.5" /> },
  upcoming: { label: "Confirmée", color: "text-green-700", bgColor: "bg-green-100", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  in_progress: { label: "En cours", color: "text-blue-700", bgColor: "bg-blue-100", icon: <Clock className="w-3.5 h-3.5" /> },
  completed: { label: "Terminée", color: "text-gray-600", bgColor: "bg-gray-100", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  refused: { label: "Refusée", color: "text-red-700", bgColor: "bg-red-100", icon: <XCircle className="w-3.5 h-3.5" /> },
  cancelled: { label: "Annulée", color: "text-red-700", bgColor: "bg-red-100", icon: <XCircle className="w-3.5 h-3.5" /> },
};

// Extraire code postal + ville d'une adresse complète (ex: "123 rue des fleurs, 75001 Paris" -> "75001 Paris")
function extractCityAndPostalCode(fullAddress: string): string {
  // Chercher le pattern code postal (5 chiffres) suivi de la ville
  // Gère les formats: "75001 Paris", "75001 Paris, France", etc.
  const match = fullAddress.match(/(\d{5})\s+([A-Za-zÀ-ÿ\s-]+)/);
  if (match) {
    // Retourne "75001 Paris" (code postal + ville sans le reste)
    return `${match[1]} ${match[2].split(",")[0].trim()}`;
  }

  // Sinon prendre la dernière partie après la virgule (souvent "75001 Paris" ou "Paris")
  const parts = fullAddress.split(",");
  if (parts.length > 1) {
    // Chercher la partie avec le code postal
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i].trim();
      if (/\d{5}/.test(part)) {
        return part;
      }
    }
    // Sinon retourner la dernière partie
    return parts[parts.length - 1].trim();
  }

  return fullAddress;
}

// Calculer le temps restant avant le début
function getTimeUntilStart(startDate: string): { text: string; color: string } | null {
  const start = new Date(startDate);
  const now = new Date();

  // Reset les heures pour comparer les jours
  start.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  const diffTime = start.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return null; // Déjà passé
  } else if (diffDays === 0) {
    return { text: "Aujourd'hui", color: "text-primary" };
  } else if (diffDays === 1) {
    return { text: "Demain", color: "text-orange-600" };
  } else if (diffDays <= 7) {
    return { text: `Dans ${diffDays} jours`, color: "text-blue-600" };
  } else if (diffDays <= 30) {
    const weeks = Math.floor(diffDays / 7);
    return { text: `Dans ${weeks} sem.`, color: "text-text-light" };
  }

  return null; // Trop loin, pas besoin d'afficher
}

// Formater l'affichage des dates selon le type de réservation
function formatDatesDisplay(reservation: {
  startDate: string;
  endDate: string;
  sessions?: Array<{ date: string; startTime: string; endTime: string }>;
  numberOfSessions?: number;
}): string {
  const { startDate, endDate, sessions, numberOfSessions } = reservation;

  // Multi-séances : afficher le nombre de séances
  if (sessions && sessions.length > 1) {
    return `${sessions.length} séances`;
  }
  if (numberOfSessions && numberOfSessions > 1) {
    return `${numberOfSessions} séances`;
  }

  // Séance unique ou garde : format classique
  return formatDateRange(startDate, endDate);
}

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = start.toLocaleDateString("fr-FR", { month: "short" });
  const endMonth = end.toLocaleDateString("fr-FR", { month: "short" });

  // Même jour
  if (startDate === endDate) {
    return `${startDay} ${startMonth}`;
  }

  // Même mois
  if (startMonth === endMonth) {
    return `${startDay} - ${endDay} ${startMonth}`;
  }

  // Mois différents
  return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
}

// Type pour les réservations enrichies
interface EnrichedReservation {
  id: string;
  serviceName: string;
  announcerName: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  city?: string;
  status: string;
  amount: number;
  animal?: { name: string; emoji: string };
  // Nouveaux champs
  sessionType?: "individual" | "collective";
  numberOfSessions?: number;
  sessions?: Array<{ date: string; startTime: string; endTime: string }>;
  serviceTypeSlug?: string;
  paymentDeadline?: number;
}

export default function ReservationsPage() {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const router = useRouter();
  const { error: toastError } = useToast();

  // États des filtres
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState<ServiceTypeFilter>("all");
  const [sessionTypeFilter, setSessionTypeFilter] = useState<SessionTypeFilter>("all");
  const [isContacting, setIsContacting] = useState<string | null>(null);

  const reservations = useQuery(
    api.planning.missions.getClientMissions,
    token ? { token } : "skip"
  ) as EnrichedReservation[] | undefined;

  // Mutation pour obtenir ou créer une conversation
  const getOrCreateConversation = useMutation(api.messaging.mutations.getOrCreateConversation);

  // Statuts qui permettent le contact (paiement confirmé)
  const canContactStatuses = ["upcoming", "in_progress", "completed"];

  const handleContact = async (e: React.MouseEvent, missionId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!token || isContacting) return;

    setIsContacting(missionId);
    try {
      const result = await getOrCreateConversation({
        token,
        missionId: missionId as Id<"missions">,
      });

      if (result?.conversationId) {
        router.push(`/client/messagerie?conversation=${result.conversationId}`);
      }
    } catch (error) {
      console.error("Erreur lors de l'ouverture de la conversation:", error);
      toastError("Impossible d'ouvrir la conversation");
    } finally {
      setIsContacting(null);
    }
  };

  // Calculer les compteurs pour les filtres
  const counts = useMemo(() => {
    if (!reservations) return {
      all: 0, upcoming: 0, completed: 0, cancelled: 0,
      garde: 0, service: 0, individual: 0, collective: 0,
    };

    return {
      all: reservations.length,
      upcoming: reservations.filter(r =>
        ["pending_acceptance", "pending_confirmation", "upcoming", "in_progress"].includes(r.status)
      ).length,
      completed: reservations.filter(r => r.status === "completed").length,
      cancelled: reservations.filter(r => ["refused", "cancelled"].includes(r.status)).length,
      garde: reservations.filter(r => r.serviceTypeSlug === "garde").length,
      service: reservations.filter(r => r.serviceTypeSlug === "service").length,
      individual: reservations.filter(r => !r.sessionType || r.sessionType === "individual").length,
      collective: reservations.filter(r => r.sessionType === "collective").length,
    };
  }, [reservations]);

  // Filtrage des réservations
  const filteredReservations = useMemo(() => {
    if (!reservations) return [];

    return reservations.filter(r => {
      // Filtre statut
      if (statusFilter === "upcoming") {
        if (!["pending_acceptance", "pending_confirmation", "upcoming", "in_progress"].includes(r.status)) {
          return false;
        }
      } else if (statusFilter === "completed") {
        if (r.status !== "completed") return false;
      } else if (statusFilter === "cancelled") {
        if (!["refused", "cancelled"].includes(r.status)) return false;
      }

      // Filtre type (garde/service)
      if (serviceTypeFilter !== "all") {
        if (serviceTypeFilter === "garde" && r.serviceTypeSlug !== "garde") return false;
        if (serviceTypeFilter === "service" && r.serviceTypeSlug !== "service") return false;
      }

      // Filtre format (individuel/collectif)
      if (sessionTypeFilter !== "all") {
        const type = r.sessionType || "individual";
        if (type !== sessionTypeFilter) return false;
      }

      return true;
    });
  }, [reservations, statusFilter, serviceTypeFilter, sessionTypeFilter]);

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
      <ReservationsFilters
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        serviceTypeFilter={serviceTypeFilter}
        onServiceTypeChange={setServiceTypeFilter}
        sessionTypeFilter={sessionTypeFilter}
        onSessionTypeChange={setSessionTypeFilter}
        counts={counts}
      />

      {/* Reservations list */}
      {filteredReservations.length > 0 ? (
        <div className="space-y-3">
          {filteredReservations.map((reservation, index) => {
            const status = statusConfig[reservation.status] || statusConfig.pending_acceptance;
            const isConfirmed = canContactStatuses.includes(reservation.status);
            const isMultiSession = (reservation.sessions && reservation.sessions.length > 1) ||
                                   (reservation.numberOfSessions && reservation.numberOfSessions > 1);

            // Temps restant avant le début (seulement pour les réservations à venir)
            const timeUntil = ["pending_acceptance", "pending_confirmation", "upcoming"].includes(reservation.status)
              ? getTimeUntilStart(reservation.startDate)
              : null;

            return (
              <motion.div
                key={reservation.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Link href={`/client/reservations/${reservation.id}`} className="block group">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:border-primary/20 transition-all">
                    {/* Header avec statut, countdown et prix */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50/50 border-b border-gray-100">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                          status.bgColor,
                          status.color
                        )}>
                          {status.icon}
                          {status.label}
                        </div>
                        {timeUntil && (
                          <span className={cn("text-xs font-medium", timeUntil.color)}>
                            • {timeUntil.text}
                          </span>
                        )}
                        {/* Countdown paiement pour pending_confirmation */}
                        {reservation.status === "pending_confirmation" && reservation.paymentDeadline && (
                          <PaymentCountdown deadline={reservation.paymentDeadline} />
                        )}
                      </div>
                      <p className="text-lg font-bold text-foreground">
                        {(reservation.amount / 100).toFixed(2).replace(".", ",")} €
                      </p>
                    </div>

                    {/* Contenu principal */}
                    <div className="p-4">
                      {/* Service et animal */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                          {reservation.animal?.emoji || "🐾"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground truncate">
                              {reservation.serviceName}
                            </h3>
                            {/* Badge multi-séances */}
                            {isMultiSession && (
                              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full flex items-center gap-1">
                                <CalendarDays className="w-3 h-3" />
                                {reservation.sessions?.length || reservation.numberOfSessions} séances
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-text-light">
                            {reservation.animal?.name || "Votre animal"}
                          </p>
                        </div>
                      </div>

                      {/* Infos en grille */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {/* Dates */}
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-text-light">Dates</p>
                            <p className="text-sm font-medium text-foreground truncate">
                              {formatDatesDisplay(reservation)}
                            </p>
                          </div>
                        </div>

                        {/* Pet-sitter */}
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-secondary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-text-light">Pet-sitter</p>
                            <p className="text-sm font-medium text-foreground truncate">
                              {reservation.announcerName}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Localisation */}
                      {reservation.location && (
                        <div className="flex items-center gap-2 text-sm text-text-light mb-4">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          {isConfirmed ? (
                            <span className="truncate">{reservation.location}</span>
                          ) : (
                            <span className="text-gray-400 text-xs flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              Adresse visible après paiement
                            </span>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                        {isConfirmed && (
                          <motion.button
                            onClick={(e) => handleContact(e, reservation.id)}
                            disabled={isContacting === reservation.id}
                            className="flex items-center gap-2 px-4 py-2.5 bg-secondary hover:bg-secondary/90 text-white rounded-xl text-sm font-semibold shadow-md shadow-secondary/25 transition-all disabled:opacity-50"
                            whileHover={{ scale: 1.03, y: -1 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            {isContacting === reservation.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <MessageSquare className="w-4 h-4" />
                            )}
                            Contacter
                          </motion.button>
                        )}
                        <div className="flex-1 flex items-center justify-end gap-1 text-primary text-sm font-medium group-hover:gap-2 transition-all">
                          Voir détails
                          <ChevronRight className="w-4 h-4" />
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
            {statusFilter === "all" && serviceTypeFilter === "all" && sessionTypeFilter === "all"
              ? "Aucune réservation"
              : "Aucune réservation correspondante"
            }
          </h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            {statusFilter === "all" && serviceTypeFilter === "all" && sessionTypeFilter === "all"
              ? "Trouvez le pet-sitter idéal pour votre compagnon"
              : "Aucune réservation ne correspond à ces filtres"
            }
          </p>
          {statusFilter === "all" && serviceTypeFilter === "all" && sessionTypeFilter === "all" && (
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
