"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Loader2,
  LayoutGrid,
  List,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  X,
  ArrowUpDown,
  Wallet,
  Star,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/app/components/ui/toast";
import {
  ReservationsFilters,
  type StatusFilter,
  type ServiceTypeFilter,
  type SessionTypeFilter,
} from "./components/ReservationsFilters";
import { ReservationCard, type EnrichedReservation } from "./components/ReservationCard";
import { getAuthToken } from "@/app/lib/authToken";

const STORAGE_KEY = "reservations_active_tab";
const validStatusFilters: StatusFilter[] = [
  "all", "pending_acceptance", "pending_payment", "upcoming", "in_progress", "completed", "cancelled",
];

function getSavedTab(): StatusFilter {
  if (typeof window === "undefined") return "all";
  const saved = sessionStorage.getItem(STORAGE_KEY);
  return saved && validStatusFilters.includes(saved as StatusFilter) ? (saved as StatusFilter) : "all";
}

export default function ReservationsPage() {
  const token = getAuthToken();
  const router = useRouter();
  const { error: toastError } = useToast();

  const [statusFilter, setStatusFilterState] = useState<StatusFilter>(getSavedTab);
  const [serviceTypeFilter, setServiceTypeFilter] = useState<ServiceTypeFilter>("all");
  const [sessionTypeFilter, setSessionTypeFilter] = useState<SessionTypeFilter>("all");
  const [isContacting, setIsContacting] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [searchQuery, setSearchQuery] = useState("");
  type SortMode = "date_desc" | "date_asc" | "price_desc" | "price_asc";
  const [sortMode, setSortMode] = useState<SortMode>("date_desc");

  const setStatusFilter = useCallback((filter: StatusFilter) => {
    setStatusFilterState(filter);
    sessionStorage.setItem(STORAGE_KEY, filter);
  }, []);

  const reservations = useQuery(
    api.planning.missions.getClientMissions,
    token ? { token } : "skip"
  ) as EnrichedReservation[] | undefined;

  const getOrCreateConversation = useMutation(api.messaging.mutations.getOrCreateConversation);
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

  const counts = useMemo(() => {
    if (!reservations) return {
      all: 0, pendingAcceptance: 0, pendingPayment: 0, upcoming: 0, inProgress: 0, completed: 0, cancelled: 0,
      garde: 0, service: 0, individual: 0, collective: 0,
    };
    return {
      all: reservations.length,
      pendingAcceptance: reservations.filter(r => r.status === "pending_acceptance").length,
      pendingPayment: reservations.filter(r => r.status === "pending_confirmation").length,
      upcoming: reservations.filter(r => r.status === "upcoming").length,
      inProgress: reservations.filter(r => r.status === "in_progress").length,
      completed: reservations.filter(r => r.status === "completed").length,
      cancelled: reservations.filter(r => ["refused", "cancelled"].includes(r.status)).length,
      garde: reservations.filter(r => r.serviceTypeSlug === "garde").length,
      service: reservations.filter(r => r.serviceTypeSlug === "service").length,
      individual: reservations.filter(r => !r.sessionType || r.sessionType === "individual").length,
      collective: reservations.filter(r => r.sessionType === "collective").length,
    };
  }, [reservations]);

  const filteredReservations = useMemo(() => {
    if (!reservations) return [];
    const q = searchQuery.trim().toLowerCase();
    let list = reservations.filter(r => {
      if (statusFilter === "pending_acceptance" && r.status !== "pending_acceptance") return false;
      if (statusFilter === "pending_payment" && r.status !== "pending_confirmation") return false;
      if (statusFilter === "upcoming" && r.status !== "upcoming") return false;
      if (statusFilter === "in_progress" && r.status !== "in_progress") return false;
      if (statusFilter === "completed" && r.status !== "completed") return false;
      if (statusFilter === "cancelled" && !["refused", "cancelled"].includes(r.status)) return false;
      if (serviceTypeFilter === "garde" && r.serviceTypeSlug !== "garde") return false;
      if (serviceTypeFilter === "service" && r.serviceTypeSlug !== "service") return false;
      if (sessionTypeFilter !== "all" && (r.sessionType || "individual") !== sessionTypeFilter) return false;
      // Recherche texte (service, annonceur, animal, ville)
      if (q) {
        const haystack = [
          r.serviceName,
          r.announcerName,
          r.serviceCategory,
          r.city,
          r.location,
          r.animal?.name,
          ...(r.animals?.map((a) => a.name) || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    // Tri
    list = [...list].sort((a, b) => {
      switch (sortMode) {
        case "date_asc":
          return (a.createdAt ?? 0) - (b.createdAt ?? 0);
        case "price_desc":
          return (b.amount ?? 0) - (a.amount ?? 0);
        case "price_asc":
          return (a.amount ?? 0) - (b.amount ?? 0);
        case "date_desc":
        default:
          return (b.createdAt ?? 0) - (a.createdAt ?? 0);
      }
    });
    return list;
  }, [reservations, statusFilter, serviceTypeFilter, sessionTypeFilter, searchQuery, sortMode]);

  // Récap top-page : statistiques globales (remboursements + avis en attente)
  const stats = useMemo(() => {
    if (!reservations) {
      return { refundedCount: 0, refundedAmount: 0, awaitingReview: 0, openDisputes: 0 };
    }
    let refundedCount = 0;
    let refundedAmount = 0;
    let awaitingReview = 0;
    let openDisputes = 0;
    for (const r of reservations) {
      if ((r.refundAmount ?? 0) > 0) {
        refundedCount++;
        refundedAmount += r.refundAmount ?? 0;
      }
      if (r.status === "completed" && !r.hasReview) awaitingReview++;
      if (
        r.disputeStatus &&
        r.disputeStatus !== "closed" &&
        r.disputeStatus !== "resolved_announcer"
      ) {
        openDisputes++;
      }
    }
    return { refundedCount, refundedAmount, awaitingReview, openDisputes };
  }, [reservations]);

  const noFilters = statusFilter === "all" && serviceTypeFilter === "all" && sessionTypeFilter === "all";

  // Missions terminées en attente de validation par le client.
  // ⚠️ On exclut les missions ayant une dispute (peu importe son statut) :
  //   - dispute en cours → la validation est bloquée jusqu'à résolution
  //   - dispute résolue → la résolution remplace la validation manuelle,
  //     le paiement a déjà été tranché par l'admin
  const pendingValidation = useMemo(() => {
    if (!reservations) return [];
    return reservations.filter(
      (r) =>
        r.status === "completed" &&
        !r.clientConfirmedAt &&
        !r.autoConfirmedAt &&
        !r.hasDispute
    );
  }, [reservations]);

  return (
    <div className="space-y-6">
      {/* Bannière : missions à valider */}
      {pendingValidation.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-5 text-white shadow-lg shadow-orange-500/20"
        >
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold mb-1">
                {pendingValidation.length === 1
                  ? "Garde terminée — validez la fin de mission"
                  : `${pendingValidation.length} gardes terminées — à valider`}
              </h2>
              <p className="text-white/85 text-sm mb-4">
                {pendingValidation.length === 1
                  ? `La garde "${pendingValidation[0].serviceName}" avec ${pendingValidation[0].announcerName} est terminée. Confirmez que tout s'est bien passé pour finaliser le paiement du pet-sitter.`
                  : "Vos gardes sont terminées. Confirmez que tout s'est bien passé pour finaliser le paiement des pet-sitters."}
              </p>
              <div className="flex flex-wrap gap-2">
                {pendingValidation.slice(0, 3).map((r) => (
                  <Link
                    key={r.id}
                    href={`/client/reservations/${r.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white text-orange-600 rounded-xl font-semibold text-sm hover:bg-white/90 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {r.serviceName}
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </Link>
                ))}
                {pendingValidation.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter("completed")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/20 text-white rounded-xl font-semibold text-sm hover:bg-white/30 transition-colors"
                  >
                    +{pendingValidation.length - 3} autres
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mes réservations</h1>
          <p className="text-gray-500 mt-1">Suivez l'état de vos demandes de garde</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center bg-gray-100 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-white text-foreground shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
              aria-label="Vue liste"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-white text-foreground shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
              aria-label="Vue grille"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <Link
            href="/recherche"
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-medium shadow-lg shadow-primary/25"
          >
            <Search className="w-5 h-5" />
            <span className="hidden sm:inline">Nouvelle réservation</span>
          </Link>
        </div>
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

      {/* Récap top-page : remboursements et avis en attente */}
      {(stats.refundedCount > 0 || stats.awaitingReview > 0 || stats.openDisputes > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {stats.refundedCount > 0 && (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <Wallet className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-emerald-800">
                  {stats.refundedCount} remboursement{stats.refundedCount > 1 ? "s" : ""}
                </p>
                <p className="text-emerald-600">
                  {(stats.refundedAmount / 100).toFixed(2).replace(".", ",")} € au total
                </p>
              </div>
            </div>
          )}
          {stats.openDisputes > 0 && (
            <button
              onClick={() => setStatusFilter("completed")}
              className="flex items-center gap-2.5 px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors text-left"
            >
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-amber-800">
                  {stats.openDisputes} réclamation{stats.openDisputes > 1 ? "s" : ""} en cours
                </p>
                <p className="text-amber-600">Suivez l&apos;avancement</p>
              </div>
            </button>
          )}
          {stats.awaitingReview > 0 && (
            <button
              onClick={() => setStatusFilter("completed")}
              className="flex items-center gap-2.5 px-3.5 py-2.5 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors text-left"
            >
              <Star className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-blue-800">
                  {stats.awaitingReview} avis à laisser
                </p>
                <p className="text-blue-600">Aidez les futurs clients</p>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Barre recherche + tri */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par service, annonceur, animal ou ville…"
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              aria-label="Effacer la recherche"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="relative">
          <ArrowUpDown className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="appearance-none pl-10 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent cursor-pointer"
          >
            <option value="date_desc">Plus récent d&apos;abord</option>
            <option value="date_asc">Plus ancien d&apos;abord</option>
            <option value="price_desc">Prix décroissant</option>
            <option value="price_asc">Prix croissant</option>
          </select>
          <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
        </div>
      </div>

      {/* Reservations list */}
      {filteredReservations.length > 0 ? (
        <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "space-y-3"}>
          {filteredReservations.map((reservation, index) => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
              index={index}
              isContacting={isContacting}
              onContact={handleContact}
              variant={viewMode}
            />
          ))}
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
            {noFilters ? "Aucune réservation" : "Aucun résultat"}
          </h3>
          <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
            {noFilters
              ? "Vous n'avez pas encore de réservation. Trouvez le pet-sitter idéal pour prendre soin de votre compagnon !"
              : "Aucune réservation ne correspond à vos filtres. Essayez de modifier vos critères de recherche."}
          </p>
          {noFilters ? (
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
