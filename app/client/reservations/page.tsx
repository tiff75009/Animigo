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
  Users,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  MessageSquare,
  Lock,
  CalendarDays,
  CreditCard,
  Home,
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

// Calculer le temps restant avant le début (format J-X)
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
    return { text: "Début aujourd'hui", color: "text-primary" };
  } else if (diffDays <= 3) {
    return { text: `Début J-${diffDays}`, color: "text-orange-600" };
  } else if (diffDays <= 7) {
    return { text: `Début J-${diffDays}`, color: "text-blue-600" };
  } else if (diffDays <= 30) {
    return { text: `Début J-${diffDays}`, color: "text-text-light" };
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
  animals?: Array<{ name: string; type: string; emoji: string }>;
  animalCount?: number;
  // Nouveaux champs
  sessionType?: "individual" | "collective";
  numberOfSessions?: number;
  sessions?: Array<{ date: string; startTime: string; endTime: string }>;
  serviceTypeSlug?: string;
  serviceLocation?: "announcer_home" | "client_home";
  paymentDeadline?: number;
  paymentStatus?: string;
  refundAmount?: number;
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
      all: 0, pendingAcceptance: 0, pendingPayment: 0, upcoming: 0, completed: 0, cancelled: 0,
      garde: 0, service: 0, individual: 0, collective: 0,
    };

    return {
      all: reservations.length,
      pendingAcceptance: reservations.filter(r => r.status === "pending_acceptance").length,
      pendingPayment: reservations.filter(r => r.status === "pending_confirmation").length,
      upcoming: reservations.filter(r =>
        ["upcoming", "in_progress"].includes(r.status)
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
      if (statusFilter === "pending_acceptance") {
        if (r.status !== "pending_acceptance") return false;
      } else if (statusFilter === "pending_payment") {
        if (r.status !== "pending_confirmation") return false;
      } else if (statusFilter === "upcoming") {
        if (!["upcoming", "in_progress"].includes(r.status)) {
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
        <div className="space-y-4">
          {filteredReservations.map((reservation, index) => {
            const status = statusConfig[reservation.status] || statusConfig.pending_acceptance;
            const isConfirmed = canContactStatuses.includes(reservation.status);
            const isMultiSession = (reservation.sessions && reservation.sessions.length > 1) ||
                                   (reservation.numberOfSessions && reservation.numberOfSessions > 1);
            const isPendingPayment = reservation.status === "pending_confirmation";
            const isPendingAcceptance = reservation.status === "pending_acceptance";
            const isCompleted = reservation.status === "completed";
            const isCancelled = ["refused", "cancelled"].includes(reservation.status);

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
                  <div className={cn(
                    "bg-white rounded-2xl overflow-hidden transition-all duration-300",
                    "shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.12)]",
                    isPendingPayment && "ring-2 ring-orange-200 ring-offset-1",
                    isPendingAcceptance && "ring-1 ring-yellow-200",
                    isCancelled && "opacity-75"
                  )}>
                    {/* Bannière paiement urgent */}
                    {isPendingPayment && reservation.paymentDeadline && (
                      <div className="px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                              <CreditCard className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-sm font-semibold text-white">
                              Paiement requis
                            </span>
                          </div>
                          <div className="bg-white/20 backdrop-blur px-3 py-1 rounded-full">
                            <PaymentCountdown deadline={reservation.paymentDeadline} />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-4">
                      {/* En-tête : Animal + Service + Prix */}
                      <div className="flex items-start gap-4 mb-4">
                        {/* Avatar animal avec badge statut */}
                        <div className="relative flex-shrink-0">
                          <div className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center",
                            "bg-gradient-to-br from-primary/5 to-primary/15",
                            "ring-2 ring-white shadow-sm",
                            reservation.animals && reservation.animals.length > 1 ? "text-lg gap-0.5" : "text-2xl"
                          )}>
                            {reservation.animals && reservation.animals.length > 1
                              ? reservation.animals.slice(0, 3).map((a, i) => (
                                  <span key={i}>{a.emoji}</span>
                                ))
                              : (reservation.animal?.emoji || "🐾")
                            }
                          </div>
                          {/* Mini badge statut sur l'avatar */}
                          <div className={cn(
                            "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center",
                            "ring-2 ring-white",
                            status.bgColor
                          )}>
                            <span className={cn("scale-75", status.color)}>
                              {status.icon}
                            </span>
                          </div>
                        </div>

                        {/* Infos service */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="font-bold text-foreground truncate text-base">
                                {reservation.serviceName}
                              </h3>
                              <p className="text-sm text-text-light mt-0.5">
                                {reservation.animals && reservation.animals.length > 1
                                  ? `${reservation.animals.map(a => a.name).join(", ")} (${reservation.animals.length})`
                                  : (reservation.animal?.name || "Votre animal")
                                }
                                {" "}• {reservation.announcerName}
                              </p>
                            </div>
                            {/* Prix */}
                            <div className="text-right flex-shrink-0">
                              <p className="text-xl font-bold text-foreground">
                                {Math.floor(reservation.amount / 100)}<span className="text-sm font-semibold text-gray-400">,{(reservation.amount % 100).toString().padStart(2, '0')}€</span>
                              </p>
                            </div>
                          </div>

                          {/* Badge statut texte (visible sur mobile) */}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <div className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                              status.bgColor,
                              status.color
                            )}>
                              {status.icon}
                              {status.label}
                            </div>
                            {/* Badge remboursement pour missions annulées */}
                            {isCancelled && reservation.refundAmount != null && reservation.refundAmount > 0 && (
                              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">
                                <CheckCircle className="w-3 h-3" />
                                Remboursé {(reservation.refundAmount / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                              </div>
                            )}
                            {isCancelled && (reservation.refundAmount == null || reservation.refundAmount === 0) && reservation.paymentStatus === "paid" && (
                              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                                Non remboursé
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Ligne d'infos : Date + Lieu + Type */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 px-3 -mx-1 bg-gray-50/80 rounded-xl mb-4">
                        {/* Date avec J-X */}
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                            <Calendar className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Dates</p>
                            <p className="text-sm font-semibold text-foreground">
                              {formatDatesDisplay(reservation)}
                            </p>
                          </div>
                        </div>

                        {/* Séparateur vertical */}
                        <div className="hidden sm:block w-px h-8 bg-gray-200" />

                        {/* Lieu */}
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shadow-sm",
                            reservation.serviceLocation === "client_home"
                              ? "bg-teal-50"
                              : "bg-indigo-50"
                          )}>
                            {reservation.serviceLocation === "client_home" ? (
                              <Home className="w-4 h-4 text-teal-600" />
                            ) : (
                              <MapPin className="w-4 h-4 text-indigo-600" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Lieu</p>
                            <p className="text-sm font-semibold text-foreground">
                              {reservation.serviceLocation === "client_home" ? "À domicile" : "Pet-sitter"}
                            </p>
                          </div>
                        </div>

                        {/* Séparateur vertical */}
                        <div className="hidden sm:block w-px h-8 bg-gray-200" />

                        {/* Type de séance */}
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shadow-sm",
                            reservation.sessionType === "collective"
                              ? "bg-blue-50"
                              : "bg-amber-50"
                          )}>
                            {reservation.sessionType === "collective" ? (
                              <Users className="w-4 h-4 text-blue-600" />
                            ) : (
                              <User className="w-4 h-4 text-amber-600" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Format</p>
                            <p className="text-sm font-semibold text-foreground">
                              {reservation.sessionType === "collective" ? "Collectif" : "Individuel"}
                              {isMultiSession && ` • ${reservation.sessions?.length || reservation.numberOfSessions} séances`}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Badge J-X en évidence si proche */}
                      {timeUntil && (
                        <div className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-xl mb-4",
                          timeUntil.color === "text-primary"
                            ? "bg-primary/10 border border-primary/20"
                            : timeUntil.color === "text-orange-600"
                              ? "bg-orange-50 border border-orange-200"
                              : timeUntil.color === "text-blue-600"
                                ? "bg-blue-50 border border-blue-200"
                                : "bg-gray-50 border border-gray-200"
                        )}>
                          <Clock className={cn(
                            "w-4 h-4",
                            timeUntil.color === "text-primary"
                              ? "text-primary"
                              : timeUntil.color === "text-orange-600"
                                ? "text-orange-500"
                                : timeUntil.color === "text-blue-600"
                                  ? "text-blue-500"
                                  : "text-gray-500"
                          )} />
                          <span className={cn(
                            "text-sm font-semibold",
                            timeUntil.color === "text-primary"
                              ? "text-primary"
                              : timeUntil.color === "text-orange-600"
                                ? "text-orange-700"
                                : timeUntil.color === "text-blue-600"
                                  ? "text-blue-700"
                                  : "text-gray-600"
                          )}>
                            {timeUntil.text}
                          </span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {isPendingPayment && (
                          <motion.div
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-primary to-primary/90 text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/30"
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                          >
                            <CreditCard className="w-4 h-4" />
                            Payer maintenant
                          </motion.div>
                        )}
                        {isConfirmed && (
                          <motion.button
                            onClick={(e) => handleContact(e, reservation.id)}
                            disabled={isContacting === reservation.id}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-secondary hover:bg-secondary/90 text-white rounded-xl text-sm font-bold shadow-lg shadow-secondary/30 transition-all disabled:opacity-50"
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                          >
                            {isContacting === reservation.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <MessageSquare className="w-4 h-4" />
                            )}
                            Contacter
                          </motion.button>
                        )}
                        <motion.div
                          className={cn(
                            "flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
                            isPendingPayment || isConfirmed
                              ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              : "flex-1 bg-primary/10 text-primary hover:bg-primary/20"
                          )}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                        >
                          Voir détails
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </motion.div>
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-white to-gray-50/50 rounded-3xl p-10 text-center shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)]"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            <span className="text-5xl">🐾</span>
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-3">
            {statusFilter === "all" && serviceTypeFilter === "all" && sessionTypeFilter === "all"
              ? "Aucune réservation"
              : "Aucun résultat"
            }
          </h3>
          <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
            {statusFilter === "all" && serviceTypeFilter === "all" && sessionTypeFilter === "all"
              ? "Vous n'avez pas encore de réservation. Trouvez le pet-sitter idéal pour prendre soin de votre compagnon !"
              : "Aucune réservation ne correspond à vos filtres. Essayez de modifier vos critères de recherche."
            }
          </p>
          {statusFilter === "all" && serviceTypeFilter === "all" && sessionTypeFilter === "all" ? (
            <Link
              href="/recherche"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary to-primary/90 text-white rounded-2xl font-bold text-lg shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all hover:scale-[1.02]"
            >
              <Search className="w-5 h-5" />
              Trouver un pet-sitter
            </Link>
          ) : (
            <button
              onClick={() => {
                setStatusFilter("all");
                setServiceTypeFilter("all");
                setSessionTypeFilter("all");
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
            >
              Réinitialiser les filtres
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}
