"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  Trash2,
  AlertTriangle,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock4,
  PlayCircle,
  PawPrint,
  CreditCard,
  RefreshCw,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

type StatusFilter = "all" | "pending_acceptance" | "pending_confirmation" | "upcoming" | "in_progress" | "completed" | "cancelled" | "refused";

interface Reservation {
  _id: Id<"missions">;
  clientId: Id<"users">;
  clientName: string;
  clientEmail?: string;
  announcerId: Id<"users">;
  announcerName: string;
  announcerEmail?: string;
  animal?: { name: string; type: string; emoji?: string };
  serviceName: string;
  serviceCategory?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  status: string;
  amount: number;
  paymentStatus?: string;
  stripePaymentStatus?: string;
  location?: string;
  city?: string;
  createdAt: number;
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    pending_acceptance: {
      label: "En attente",
      className: "bg-yellow-500/20 text-yellow-400",
      icon: Clock4,
    },
    pending_confirmation: {
      label: "Paiement attendu",
      className: "bg-orange-500/20 text-orange-400",
      icon: CreditCard,
    },
    upcoming: {
      label: "Confirmée",
      className: "bg-blue-500/20 text-blue-400",
      icon: Calendar,
    },
    in_progress: {
      label: "En cours",
      className: "bg-purple-500/20 text-purple-400",
      icon: PlayCircle,
    },
    completed: {
      label: "Terminée",
      className: "bg-green-500/20 text-green-400",
      icon: CheckCircle2,
    },
    cancelled: {
      label: "Annulée",
      className: "bg-red-500/20 text-red-400",
      icon: XCircle,
    },
    refused: {
      label: "Refusée",
      className: "bg-red-500/20 text-red-400",
      icon: XCircle,
    },
  };

  const config = statusConfig[status] || statusConfig.pending_acceptance;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}

// Delete Confirmation Modal
function DeleteModal({
  isOpen,
  reservation,
  onClose,
  onConfirm,
  isDeleting,
}: {
  isOpen: boolean;
  reservation: Reservation | null;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  if (!isOpen || !reservation) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  Supprimer la réservation
                </h3>
                <p className="text-slate-400 text-sm">
                  Cette action est irréversible
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Reservation info */}
          <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
            <p className="text-white font-medium">{reservation.serviceName}</p>
            <p className="text-slate-400 text-sm">
              Client: {reservation.clientName}
            </p>
            <p className="text-slate-400 text-sm">
              Annonceur: {reservation.announcerName}
            </p>
            <p className="text-slate-500 text-sm mt-1">
              {reservation.startDate} - {reservation.endDate}
            </p>
          </div>

          {/* Warning */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
            <p className="text-red-400 text-sm">
              <strong>Attention :</strong> Cette suppression entraînera aussi la
              suppression du paiement associé si présent.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="w-5 h-5" />
                  Supprimer
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function ReservationsPage() {
  const { token } = useAdminAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);
  const pageSize = 15;

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [reservationToDelete, setReservationToDelete] = useState<Reservation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Selection state for bulk delete
  const [selectedIds, setSelectedIds] = useState<Set<Id<"missions">>>(new Set());

  const reservations = useQuery(
    api.admin.reservations.listReservations,
    token
      ? {
          token,
          search: search || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
          limit: pageSize,
          offset: page * pageSize,
        }
      : "skip"
  );

  const stats = useQuery(
    api.admin.reservations.getReservationStats,
    token ? { token } : "skip"
  );

  const deleteReservation = useMutation(api.admin.reservations.deleteReservation);
  const deleteMultiple = useMutation(api.admin.reservations.deleteMultipleReservations);

  const handleDeleteClick = (reservation: Reservation) => {
    setReservationToDelete(reservation);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!token || !reservationToDelete) return;

    setIsDeleting(true);
    try {
      await deleteReservation({ token, missionId: reservationToDelete._id });
      setDeleteModalOpen(false);
      setReservationToDelete(null);
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      alert("Erreur lors de la suppression de la réservation");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!token || selectedIds.size === 0) return;

    if (!confirm(`Supprimer ${selectedIds.size} réservation(s) ?`)) return;

    setIsDeleting(true);
    try {
      const result = await deleteMultiple({
        token,
        missionIds: Array.from(selectedIds),
      });
      setSelectedIds(new Set());
      alert(`${result.deleted} réservation(s) supprimée(s)`);
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      alert("Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelection = (id: Id<"missions">) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (!reservations?.reservations) return;

    if (selectedIds.size === reservations.reservations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(reservations.reservations.map((r: Reservation) => r._id)));
    }
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2).replace(".", ",") + " €";
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Réservations</h1>
        <p className="text-slate-400 mt-1">
          Gérez toutes les réservations de la plateforme (mode développement)
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Total</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-yellow-400 text-sm">En attente</p>
            <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-blue-400 text-sm">Confirmées</p>
            <p className="text-2xl font-bold text-blue-400">{stats.upcoming}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-purple-400 text-sm">En cours</p>
            <p className="text-2xl font-bold text-purple-400">{stats.inProgress}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-green-400 text-sm">Terminées</p>
            <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-red-400 text-sm">Annulées</p>
            <p className="text-2xl font-bold text-red-400">{stats.cancelled}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="Rechercher par client, service ou animal..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                setPage(0);
              }}
              className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending_acceptance">En attente d'acceptation</option>
              <option value="pending_confirmation">Paiement attendu</option>
              <option value="upcoming">Confirmées</option>
              <option value="in_progress">En cours</option>
              <option value="completed">Terminées</option>
              <option value="cancelled">Annulées</option>
              <option value="refused">Refusées</option>
            </select>
          </div>

          {/* Bulk delete button */}
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isDeleting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
              Supprimer ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-4">
                  <input
                    type="checkbox"
                    checked={
                      !!(reservations?.reservations &&
                      reservations.reservations.length > 0 &&
                      selectedIds.size === reservations.reservations.length)
                    }
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                  />
                </th>
                <th className="text-left px-4 py-4 text-slate-400 font-medium">
                  Service
                </th>
                <th className="text-left px-4 py-4 text-slate-400 font-medium">
                  Client
                </th>
                <th className="text-left px-4 py-4 text-slate-400 font-medium">
                  Annonceur
                </th>
                <th className="text-left px-4 py-4 text-slate-400 font-medium">
                  Dates
                </th>
                <th className="text-left px-4 py-4 text-slate-400 font-medium">
                  Montant
                </th>
                <th className="text-left px-4 py-4 text-slate-400 font-medium">
                  Statut
                </th>
                <th className="text-right px-4 py-4 text-slate-400 font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {reservations?.reservations.map((reservation: Reservation, index: number) => (
                <motion.tr
                  key={reservation._id}
                  className={`border-b border-slate-800/50 hover:bg-slate-800/30 ${
                    selectedIds.has(reservation._id) ? "bg-blue-500/10" : ""
                  }`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(reservation._id)}
                      onChange={() => toggleSelection(reservation._id)}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-xl">
                        {reservation.animal?.emoji || <PawPrint className="w-5 h-5 text-slate-500" />}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">
                          {reservation.serviceName}
                        </p>
                        {reservation.animal && (
                          <p className="text-slate-500 text-xs">
                            {reservation.animal.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-white text-sm">{reservation.clientName}</p>
                    {reservation.clientEmail && (
                      <p className="text-slate-500 text-xs">{reservation.clientEmail}</p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-white text-sm">{reservation.announcerName}</p>
                    {reservation.announcerEmail && (
                      <p className="text-slate-500 text-xs">{reservation.announcerEmail}</p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {formatDate(reservation.startDate)}
                        {reservation.startDate !== reservation.endDate && (
                          <span className="text-slate-500">
                            → {formatDate(reservation.endDate)}
                          </span>
                        )}
                      </div>
                      {reservation.startTime && (
                        <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-1">
                          <Clock className="w-3 h-3" />
                          {reservation.startTime}
                          {reservation.endTime && ` - ${reservation.endTime}`}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-white font-medium text-sm">
                      {formatPrice(reservation.amount)}
                    </p>
                    {reservation.stripePaymentStatus && (
                      <p className="text-slate-500 text-xs">
                        Stripe: {reservation.stripePaymentStatus}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={reservation.status} />
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      onClick={() => handleDeleteClick(reservation)}
                      className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {reservations?.reservations.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Aucune réservation trouvée</p>
          </div>
        )}

        {/* Pagination */}
        {reservations && reservations.total > pageSize && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800">
            <p className="text-slate-400 text-sm">
              {page * pageSize + 1} - {Math.min((page + 1) * pageSize, reservations.total)} sur{" "}
              {reservations.total} réservations
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={(page + 1) * pageSize >= reservations.total}
                className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      <DeleteModal
        isOpen={deleteModalOpen}
        reservation={reservationToDelete}
        onClose={() => {
          setDeleteModalOpen(false);
          setReservationToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
}
