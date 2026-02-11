"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  Archive,
  ArchiveRestore,
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
  Banknote,
  Eye,
  ArrowLeft,
  User,
  Briefcase,
  DollarSign,
  FileText,
  MessageSquare,
  RotateCcw,
  ExternalLink,
  Info,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  hasDispute?: boolean;
  disputeId?: Id<"disputes"> | null;
  isArchived?: boolean;
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

// Payment status badge
function PaymentStatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: "En attente", className: "bg-yellow-500/20 text-yellow-400" },
    paid: { label: "Payé", className: "bg-green-500/20 text-green-400" },
    captured: { label: "Capturé", className: "bg-green-500/20 text-green-400" },
    refunded: { label: "Remboursé", className: "bg-red-500/20 text-red-400" },
    failed: { label: "Échoué", className: "bg-red-500/20 text-red-400" },
  };
  const c = config[status] || { label: status, className: "bg-slate-500/20 text-slate-400" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.className}`}>
      {c.label}
    </span>
  );
}

// Dispute status badge
function DisputeStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    open: { label: "Ouverte", className: "bg-orange-500/20 text-orange-400" },
    investigating: { label: "Investigation", className: "bg-blue-500/20 text-blue-400" },
    resolved_client: { label: "Résolu (client)", className: "bg-green-500/20 text-green-400" },
    resolved_announcer: { label: "Résolu (annonceur)", className: "bg-emerald-500/20 text-emerald-400" },
    closed: { label: "Fermée", className: "bg-slate-500/20 text-slate-400" },
  };
  const c = config[status] || { label: status, className: "bg-slate-500/20 text-slate-400" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.className}`}>
      {c.label}
    </span>
  );
}

// Archive Confirmation Modal
function ArchiveModal({
  isOpen,
  reservation,
  onClose,
  onConfirm,
  isArchiving,
}: {
  isOpen: boolean;
  reservation: Reservation | null;
  onClose: () => void;
  onConfirm: () => void;
  isArchiving: boolean;
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
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-slate-700/50 rounded-full flex items-center justify-center">
                <Archive className="w-6 h-6 text-slate-300" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  Archiver la réservation
                </h3>
                <p className="text-slate-400 text-sm">
                  Masquer de la liste principale
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

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
            <p className="text-blue-400 text-sm">
              Cette réservation sera masquée de la liste. Vous pourrez la restaurer à tout moment.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isArchiving}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              disabled={isArchiving}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              {isArchiving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Archivage...
                </>
              ) : (
                <>
                  <Archive className="w-5 h-5" />
                  Archiver
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Refund Confirmation Modal
function RefundModal({
  isOpen,
  onClose,
  onConfirm,
  isRefunding,
  refundType,
  refundAmount,
  totalAmount,
  reason,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isRefunding: boolean;
  refundType: "total" | "partial";
  refundAmount: number;
  totalAmount: number;
  reason: string;
}) {
  if (!isOpen) return null;

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
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                <RotateCcw className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  Confirmer le remboursement
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

          <div className="space-y-3 mb-6">
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-400 text-sm">Type</span>
                <span className="text-white font-medium">
                  {refundType === "total" ? "Remboursement total" : "Remboursement partiel"}
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-400 text-sm">Montant à rembourser</span>
                <span className="text-orange-400 font-bold text-lg">
                  {(refundAmount / 100).toFixed(2).replace(".", ",")} €
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Sur un total de</span>
                <span className="text-slate-300">
                  {(totalAmount / 100).toFixed(2).replace(".", ",")} €
                </span>
              </div>
            </div>

            {refundType === "total" && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-400 text-sm">
                  <strong>Impact :</strong> Le paiement à l'annonceur sera bloqué et le statut du paiement passera en "remboursé".
                </p>
              </div>
            )}

            {reason && (
              <div className="bg-slate-800/50 rounded-xl p-4">
                <p className="text-slate-400 text-sm mb-1">Raison</p>
                <p className="text-white text-sm">{reason}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isRefunding}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              disabled={isRefunding}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              {isRefunding ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Remboursement...
                </>
              ) : (
                <>
                  <RotateCcw className="w-5 h-5" />
                  Confirmer
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Detail View Component
function ReservationDetailView({
  missionId,
  token,
  onBack,
  formatDate,
  formatPrice,
  formatTimestamp,
  onTransfer,
  transferringMissionId,
  onArchive,
  onUnarchive,
  isUnarchiving,
}: {
  missionId: Id<"missions">;
  token: string;
  onBack: () => void;
  formatDate: (d: string) => string;
  formatPrice: (c: number) => string;
  formatTimestamp: (t: number) => string;
  onTransfer: (id: Id<"missions">) => void;
  transferringMissionId: Id<"missions"> | null;
  onArchive: (r: Reservation) => void;
  onUnarchive: (id: Id<"missions">) => void;
  isUnarchiving: boolean;
}) {
  const detail = useQuery(
    api.admin.reservations.getReservationDetail,
    { token, missionId }
  );

  const adminRefund = useAction(api.admin.reservations.adminRefundMission);

  // Refund form state
  const [refundType, setRefundType] = useState<"total" | "partial">("total");
  const [partialMode, setPartialMode] = useState<"amount" | "percent">("amount");
  const [partialAmountInput, setPartialAmountInput] = useState("");
  const [partialPercentInput, setPartialPercentInput] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);

  if (detail === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (detail === null) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">Réservation introuvable</p>
        <button onClick={onBack} className="mt-4 text-blue-400 hover:text-blue-300">
          Retour à la liste
        </button>
      </div>
    );
  }

  const computedRefundAmount = (): number => {
    if (refundType === "total") return detail.amount;
    if (partialMode === "percent") {
      const pct = parseFloat(partialPercentInput);
      if (isNaN(pct) || pct <= 0) return 0;
      return Math.round(detail.amount * pct / 100);
    }
    const amt = parseFloat(partialAmountInput);
    if (isNaN(amt) || amt <= 0) return 0;
    return Math.round(amt * 100);
  };

  const handleRefundSubmit = () => {
    const amount = computedRefundAmount();
    if (amount <= 0) return;
    setShowRefundModal(true);
  };

  const handleRefundConfirm = async () => {
    setIsRefunding(true);
    try {
      const args: {
        token: string;
        missionId: Id<"missions">;
        refundType: "total" | "partial";
        partialAmount?: number;
        partialPercent?: number;
        reason?: string;
      } = {
        token,
        missionId,
        refundType,
      };

      if (refundType === "partial") {
        if (partialMode === "percent") {
          args.partialPercent = parseFloat(partialPercentInput);
        } else {
          args.partialAmount = Math.round(parseFloat(partialAmountInput) * 100);
        }
      }

      if (refundReason.trim()) {
        args.reason = refundReason.trim();
      }

      await adminRefund(args);
      setShowRefundModal(false);
      setRefundReason("");
      setPartialAmountInput("");
      setPartialPercentInput("");
      alert("Remboursement effectué avec succès !");
    } catch (error) {
      console.error("Erreur remboursement:", error);
      const msg = error instanceof Error ? error.message : "Erreur lors du remboursement";
      alert(msg);
    } finally {
      setIsRefunding(false);
    }
  };

  const applyQuickDeduction = (type: "commission" | "stripe" | "both") => {
    setRefundType("partial");
    setPartialMode("amount");
    let deduction = 0;
    if (type === "commission" || type === "both") {
      deduction += detail.platformFee || 0;
    }
    if (type === "stripe" || type === "both") {
      deduction += detail.stripeFee || 0;
    }
    const refundAmt = Math.max(0, detail.amount - deduction);
    setPartialAmountInput((refundAmt / 100).toFixed(2));
  };

  const canTransfer = detail.status === "upcoming" || detail.status === "in_progress" || detail.status === "completed" || detail.paymentStatus === "paid";
  const isFullyRefunded = detail.paymentStatus === "refunded" || (detail.refundAmount != null && detail.refundAmount > 0 && detail.refundAmount >= detail.amount);
  const isPartiallyRefunded = !isFullyRefunded && detail.refundAmount != null && detail.refundAmount > 0;
  const canRefund = !isFullyRefunded && detail.payment?.paymentIntentId;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Réservation</h1>
            <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-xs font-mono rounded">
              {String(detail._id).slice(-8)}
            </span>
            <StatusBadge status={detail.status} />
            {detail.paymentStatus === "refunded" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded-full font-medium">
                <RotateCcw className="w-3 h-3" />
                Remboursée
              </span>
            )}
            {detail.isArchived && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-500/20 text-slate-400 text-xs rounded-full font-medium">
                <Archive className="w-3 h-3" />
                Archivée
              </span>
            )}
            {detail.hasDispute && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                Réclamation
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Carte service */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <PawPrint className="w-5 h-5 text-blue-400" />
              Service
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-slate-500 text-xs mb-1">Nom du service</p>
                <p className="text-white font-medium">{detail.serviceName}</p>
              </div>
              {detail.serviceCategory && (
                <div>
                  <p className="text-slate-500 text-xs mb-1">Catégorie</p>
                  <p className="text-slate-300">{detail.serviceCategory}</p>
                </div>
              )}
              {detail.variantName && (
                <div>
                  <p className="text-slate-500 text-xs mb-1">Variante</p>
                  <p className="text-slate-300">{detail.variantName}</p>
                </div>
              )}
              {detail.sessionType && (
                <div>
                  <p className="text-slate-500 text-xs mb-1">Type de session</p>
                  <p className="text-slate-300 capitalize">{detail.sessionType}</p>
                </div>
              )}
              {detail.numberOfSessions && (
                <div>
                  <p className="text-slate-500 text-xs mb-1">Nombre de sessions</p>
                  <p className="text-slate-300">{detail.numberOfSessions}</p>
                </div>
              )}
              {detail.optionNames && detail.optionNames.length > 0 && (
                <div className="col-span-2">
                  <p className="text-slate-500 text-xs mb-1">Options</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.optionNames.map((opt: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-800 text-slate-300 text-xs rounded-full">
                        {opt}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Animal(aux) */}
            {(detail.animal || (detail.animals && detail.animals.length > 0)) && (() => {
              const allAnimals: { name: string; type: string; emoji?: string }[] = [];
              if (detail.animals && detail.animals.length > 0) {
                allAnimals.push(...detail.animals);
              } else if (detail.animal) {
                allAnimals.push(detail.animal);
              }
              const isMultiple = allAnimals.length > 1;
              return (
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <p className="text-slate-500 text-xs mb-2">{isMultiple ? "Animaux" : "Animal"}</p>
                  <div className="flex flex-wrap gap-2">
                    {allAnimals.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg">
                        <span className="text-lg">{a.emoji || "🐾"}</span>
                        <span className="text-white text-sm font-medium">{a.name}</span>
                        <span className="text-slate-400 text-xs">({a.type})</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Dates et lieu */}
            <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 gap-4">
              <div>
                <p className="text-slate-500 text-xs mb-1">Dates</p>
                <div className="flex items-center gap-1.5 text-white">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  {formatDate(detail.startDate)}
                  {detail.startDate !== detail.endDate && (
                    <span className="text-slate-500"> → {formatDate(detail.endDate)}</span>
                  )}
                </div>
              </div>
              {detail.startTime && (
                <div>
                  <p className="text-slate-500 text-xs mb-1">Horaires</p>
                  <div className="flex items-center gap-1.5 text-white">
                    <Clock className="w-4 h-4 text-slate-500" />
                    {detail.startTime}
                    {detail.endTime && ` - ${detail.endTime}`}
                  </div>
                </div>
              )}
              {(detail.location || detail.city) && (
                <div className="col-span-2">
                  <p className="text-slate-500 text-xs mb-1">Lieu</p>
                  <div className="flex items-center gap-1.5 text-white">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span>{detail.location || detail.city}</span>
                    {(detail.city || detail.postalCode) && detail.location && (
                      <span className="text-slate-400 text-sm">
                        — {[detail.postalCode, detail.city].filter(Boolean).join(" ")}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Carte paiement */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              Paiement
            </h2>
            <div className="space-y-2">
              {detail.basePrice != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Prix de base</span>
                  <span className="text-white">{formatPrice(detail.basePrice)}</span>
                </div>
              )}
              {detail.optionsPrice != null && detail.optionsPrice > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Options</span>
                  <span className="text-white">+ {formatPrice(detail.optionsPrice)}</span>
                </div>
              )}
              {detail.platformFee != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">
                    Commission plateforme
                    {detail.commissionRate ? ` (${detail.commissionRate}%)` : ""}
                  </span>
                  <span className="text-yellow-400">+ {formatPrice(detail.platformFee)}</span>
                </div>
              )}
              {detail.stripeFee != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">
                    Frais Stripe
                    {detail.stripeFeeRate ? ` (${detail.stripeFeeRate}%)` : ""}
                  </span>
                  <span className="text-slate-400">+ {formatPrice(detail.stripeFee)}</span>
                </div>
              )}
              {detail.vatRate != null && detail.vatRate > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">TVA ({detail.vatRate}%)</span>
                  <span className="text-slate-400">incluse</span>
                </div>
              )}
              <div className="border-t border-slate-800 pt-2 flex justify-between font-semibold">
                <span className="text-white">Total facturé</span>
                <span className="text-white">{formatPrice(detail.amount)}</span>
              </div>
              {detail.announcerEarnings != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Revenus annonceur</span>
                  <span className="text-emerald-400">{formatPrice(detail.announcerEarnings)}</span>
                </div>
              )}
              {detail.isSapApplied && (
                <div className="mt-2">
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                    SAP appliqué
                  </span>
                </div>
              )}
            </div>

            {/* Statuts paiement */}
            <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap gap-3">
              <div>
                <p className="text-slate-500 text-xs mb-1">Paiement client</p>
                <PaymentStatusBadge status={detail.paymentStatus} />
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1">Paiement annonceur</p>
                <PaymentStatusBadge status={detail.announcerPaymentStatus} />
              </div>
              {detail.readyForPayout != null && (
                <div>
                  <p className="text-slate-500 text-xs mb-1">Prêt pour transfert</p>
                  <span className={`text-xs font-medium ${detail.readyForPayout ? "text-green-400" : "text-slate-500"}`}>
                    {detail.readyForPayout ? "Oui" : "Non"}
                  </span>
                </div>
              )}
            </div>

            {/* Infos Stripe */}
            {detail.payment && (
              <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                <p className="text-slate-500 text-xs font-semibold uppercase">Stripe</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {detail.payment.paymentIntentId && (
                    <div>
                      <p className="text-slate-500 text-xs">PaymentIntent</p>
                      <p className="text-slate-300 font-mono text-xs truncate">{detail.payment.paymentIntentId}</p>
                    </div>
                  )}
                  {detail.payment.transferId && (
                    <div>
                      <p className="text-slate-500 text-xs">Transfer ID</p>
                      <p className="text-slate-300 font-mono text-xs truncate">{detail.payment.transferId}</p>
                    </div>
                  )}
                  {detail.payment.receiptUrl && (
                    <div className="col-span-2">
                      <a
                        href={detail.payment.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Voir le reçu Stripe
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Infos remboursement existant */}
            {detail.refundAmount != null && detail.refundAmount > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                  <p className="text-orange-400 font-medium text-sm mb-2">Remboursement effectué</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Montant remboursé</span>
                      <span className="text-orange-400 font-semibold">{formatPrice(detail.refundAmount)}</span>
                    </div>
                    {detail.announcerRetainedAmount != null && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Retenu pour l'annonceur</span>
                        <span className="text-slate-300">{formatPrice(detail.announcerRetainedAmount)}</span>
                      </div>
                    )}
                    {detail.refundStripeId && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Refund ID</span>
                        <span className="text-slate-300 font-mono text-xs">{detail.refundStripeId}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Carte annulation */}
          {(detail.status === "cancelled" || detail.status === "refused") && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-slate-900 border border-red-500/30 rounded-2xl p-6"
            >
              <h2 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                Annulation
              </h2>
              <div className="space-y-3">
                {detail.cancellationReason && (
                  <div>
                    <p className="text-slate-500 text-xs mb-1">Raison</p>
                    <p className="text-white">{detail.cancellationReason}</p>
                  </div>
                )}
                {detail.cancelledBy && (
                  <div>
                    <p className="text-slate-500 text-xs mb-1">Annulé par</p>
                    <p className="text-slate-300 capitalize">{detail.cancelledBy}</p>
                  </div>
                )}
                {detail.cancelledAt && (
                  <div>
                    <p className="text-slate-500 text-xs mb-1">Date d'annulation</p>
                    <p className="text-slate-300">{formatTimestamp(detail.cancelledAt)}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Carte réclamation */}
          {detail.dispute && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6"
            >
              <h2 className="text-lg font-semibold text-amber-400 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Réclamation
              </h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <DisputeStatusBadge status={detail.dispute.status} />
                  {detail.dispute.paymentBlocked && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                      Paiement bloqué
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-slate-500 text-xs mb-1">Motif</p>
                  <p className="text-white">{detail.dispute.reasonLabel}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs mb-1">Description</p>
                  <p className="text-slate-300 text-sm">{detail.dispute.description}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs mb-1">Ouverte le</p>
                  <p className="text-slate-300 text-sm">{formatTimestamp(detail.dispute.createdAt)}</p>
                </div>
                <Link
                  href="/admin/reclamations"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-sm font-medium transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Voir la réclamation
                </Link>
              </div>
            </motion.div>
          )}

          {/* Carte notes */}
          {(detail.clientNotes || detail.announcerNotes) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6"
            >
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-400" />
                Notes
              </h2>
              <div className="space-y-4">
                {detail.clientNotes && (
                  <div>
                    <p className="text-slate-500 text-xs mb-1">Notes du client</p>
                    <p className="text-slate-300 text-sm bg-slate-800/50 rounded-lg p-3">{detail.clientNotes}</p>
                  </div>
                )}
                {detail.announcerNotes && (
                  <div>
                    <p className="text-slate-500 text-xs mb-1">Notes de l'annonceur</p>
                    <p className="text-slate-300 text-sm bg-slate-800/50 rounded-lg p-3">{detail.announcerNotes}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Colonne latérale (1/3) */}
        <div className="space-y-6">
          {/* Carte client */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6"
          >
            <h2 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Client
            </h2>
            {detail.client ? (
              <div className="space-y-2">
                <p className="text-white font-medium">
                  {detail.client.firstName} {detail.client.lastName}
                </p>
                {detail.client.email && (
                  <p className="text-slate-400 text-sm">{detail.client.email}</p>
                )}
                {detail.client.phone && (
                  <p className="text-slate-400 text-sm">{detail.client.phone}</p>
                )}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">Client inconnu</p>
            )}
          </motion.div>

          {/* Carte annonceur */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6"
          >
            <h2 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Annonceur
            </h2>
            {detail.announcer ? (
              <div className="space-y-2">
                <p className="text-white font-medium">
                  {detail.announcer.firstName} {detail.announcer.lastName}
                </p>
                {detail.announcer.companyName && (
                  <p className="text-blue-400 text-sm">{detail.announcer.companyName}</p>
                )}
                {detail.announcer.email && (
                  <p className="text-slate-400 text-sm">{detail.announcer.email}</p>
                )}
                {detail.announcer.phone && (
                  <p className="text-slate-400 text-sm">{detail.announcer.phone}</p>
                )}
                {detail.announcer.stripeAccountId && (
                  <div className="mt-2 pt-2 border-t border-slate-800">
                    <p className="text-slate-500 text-xs mb-1">Stripe Connect</p>
                    <p className="text-slate-400 font-mono text-xs truncate">
                      {detail.announcer.stripeAccountId}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">Annonceur inconnu</p>
            )}
          </motion.div>

          {/* Carte chronologie */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6"
          >
            <h2 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Chronologie
            </h2>
            <div className="space-y-3">
              {detail.createdAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-1.5 bg-slate-600 rounded-full shrink-0" />
                  <div>
                    <p className="text-slate-400 text-xs">Créée</p>
                    <p className="text-white text-sm">{formatTimestamp(detail.createdAt)}</p>
                  </div>
                </div>
              )}
              {detail.bookedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-1.5 bg-blue-500 rounded-full shrink-0" />
                  <div>
                    <p className="text-slate-400 text-xs">Réservée par le client</p>
                    <p className="text-white text-sm">{formatTimestamp(detail.bookedAt)}</p>
                  </div>
                </div>
              )}
              {detail.acceptedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-1.5 bg-teal-500 rounded-full shrink-0" />
                  <div>
                    <p className="text-slate-400 text-xs">Acceptée par l'annonceur</p>
                    <p className="text-white text-sm">{formatTimestamp(detail.acceptedAt)}</p>
                  </div>
                </div>
              )}
              {detail.payment?.paidAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-1.5 bg-green-500 rounded-full shrink-0" />
                  <div>
                    <p className="text-slate-400 text-xs">Payée par le client</p>
                    <p className="text-white text-sm">{formatTimestamp(detail.payment.paidAt)}</p>
                  </div>
                </div>
              )}
              {detail.payment?.capturedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-1.5 bg-green-600 rounded-full shrink-0" />
                  <div>
                    <p className="text-slate-400 text-xs">Paiement capturé</p>
                    <p className="text-white text-sm">{formatTimestamp(detail.payment.capturedAt)}</p>
                  </div>
                </div>
              )}
              {detail.clientConfirmedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-1.5 bg-emerald-500 rounded-full shrink-0" />
                  <div>
                    <p className="text-slate-400 text-xs">Mission confirmée (client)</p>
                    <p className="text-white text-sm">{formatTimestamp(detail.clientConfirmedAt)}</p>
                  </div>
                </div>
              )}
              {detail.autoConfirmedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-1.5 bg-purple-500 rounded-full shrink-0" />
                  <div>
                    <p className="text-slate-400 text-xs">Auto-confirmée</p>
                    <p className="text-white text-sm">{formatTimestamp(detail.autoConfirmedAt)}</p>
                  </div>
                </div>
              )}
              {detail.cancelledAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-1.5 bg-red-500 rounded-full shrink-0" />
                  <div>
                    <p className="text-slate-400 text-xs">
                      Annulée{detail.cancelledBy === "client" ? " par le client" : detail.cancelledBy === "announcer" ? " par l'annonceur" : detail.cancelledBy === "system" ? " automatiquement" : ""}
                    </p>
                    <p className="text-white text-sm">{formatTimestamp(detail.cancelledAt)}</p>
                    {detail.cancellationReason && (
                      <p className="text-slate-500 text-xs mt-0.5">{detail.cancellationReason}</p>
                    )}
                  </div>
                </div>
              )}
              {detail.payment?.refundedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-1.5 bg-orange-500 rounded-full shrink-0" />
                  <div>
                    <p className="text-slate-400 text-xs">Remboursée</p>
                    <p className="text-white text-sm">{formatTimestamp(detail.payment.refundedAt)}</p>
                    {detail.refundAmount != null && detail.refundAmount > 0 && (
                      <div className="mt-1 space-y-0.5">
                        <p className="text-orange-400 text-xs font-medium">
                          {formatPrice(detail.refundAmount)} remboursé{detail.refundAmount < detail.amount ? ` sur ${formatPrice(detail.amount)}` : " (intégral)"}
                        </p>
                        {detail.announcerRetainedAmount != null && detail.announcerRetainedAmount > 0 && (
                          <p className="text-slate-500 text-xs">
                            {formatPrice(detail.announcerRetainedAmount)} conservé par l'annonceur
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Carte actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6"
          >
            <h2 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Actions
            </h2>
            <div className="space-y-3">
              {/* Transfert annonceur */}
              {canTransfer && (
                <button
                  onClick={() => onTransfer(missionId)}
                  disabled={transferringMissionId === missionId}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
                >
                  {transferringMissionId === missionId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Banknote className="w-4 h-4" />
                  )}
                  Transférer à l'annonceur
                </button>
              )}

              {/* Statut remboursement */}
              {isFullyRefunded && (
                <div className="border-t border-slate-800 pt-3">
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 text-center">
                    <RotateCcw className="w-6 h-6 text-orange-400 mx-auto mb-2" />
                    <p className="text-orange-400 font-semibold text-sm">Remboursement intégral</p>
                    <p className="text-orange-300 text-lg font-bold mt-1">
                      {formatPrice(detail.refundAmount || detail.amount)}
                    </p>
                    {detail.payment?.refundedAt && (
                      <p className="text-slate-500 text-xs mt-2">
                        le {formatTimestamp(detail.payment.refundedAt)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Formulaire remboursement */}
              {canRefund && (
                <div className="border-t border-slate-800 pt-3">
                  <p className="text-slate-400 text-xs font-semibold uppercase mb-3">
                    {isPartiallyRefunded ? "Remboursement complémentaire" : "Remboursement"}
                  </p>

                  {isPartiallyRefunded && (
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mb-3">
                      <p className="text-orange-400 text-xs">
                        Déjà remboursé : <span className="font-semibold">{formatPrice(detail.refundAmount!)}</span> sur {formatPrice(detail.amount)}
                      </p>
                    </div>
                  )}

                  {/* Toggle total/partiel */}
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setRefundType("total")}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        refundType === "total"
                          ? "bg-orange-500/20 text-orange-400 border border-orange-500/50"
                          : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
                      }`}
                    >
                      Total
                    </button>
                    <button
                      onClick={() => setRefundType("partial")}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        refundType === "partial"
                          ? "bg-orange-500/20 text-orange-400 border border-orange-500/50"
                          : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
                      }`}
                    >
                      Partiel
                    </button>
                  </div>

                  {/* Formulaire partiel */}
                  {refundType === "partial" && (
                    <div className="space-y-3 mb-3">
                      {/* Mode */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPartialMode("amount")}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            partialMode === "amount"
                              ? "bg-slate-700 text-white"
                              : "bg-slate-800 text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          Montant fixe
                        </button>
                        <button
                          onClick={() => setPartialMode("percent")}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            partialMode === "percent"
                              ? "bg-slate-700 text-white"
                              : "bg-slate-800 text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          Pourcentage
                        </button>
                      </div>

                      {partialMode === "amount" ? (
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={(detail.amount / 100).toFixed(2)}
                            value={partialAmountInput}
                            onChange={(e) => setPartialAmountInput(e.target.value)}
                            placeholder="Montant en €"
                            className="w-full px-3 py-2 pr-8 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-orange-500"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">€</span>
                        </div>
                      ) : (
                        <div className="relative">
                          <input
                            type="number"
                            step="1"
                            min="1"
                            max="100"
                            value={partialPercentInput}
                            onChange={(e) => setPartialPercentInput(e.target.value)}
                            placeholder="Pourcentage"
                            className="w-full px-3 py-2 pr-8 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-orange-500"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">%</span>
                        </div>
                      )}

                      {/* Déductions rapides */}
                      <div>
                        <p className="text-slate-500 text-xs mb-1.5">Déductions rapides</p>
                        <div className="flex flex-wrap gap-1.5">
                          {detail.platformFee != null && detail.platformFee > 0 && (
                            <button
                              onClick={() => applyQuickDeduction("commission")}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
                            >
                              - Commission ({formatPrice(detail.platformFee)})
                            </button>
                          )}
                          {detail.stripeFee != null && detail.stripeFee > 0 && (
                            <button
                              onClick={() => applyQuickDeduction("stripe")}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
                            >
                              - Stripe ({formatPrice(detail.stripeFee)})
                            </button>
                          )}
                          {detail.platformFee != null && detail.stripeFee != null && detail.platformFee > 0 && detail.stripeFee > 0 && (
                            <button
                              onClick={() => applyQuickDeduction("both")}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
                            >
                              - Comm. + Stripe ({formatPrice((detail.platformFee || 0) + (detail.stripeFee || 0))})
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Aperçu montant */}
                      {computedRefundAmount() > 0 && (
                        <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                          <p className="text-slate-500 text-xs">Montant à rembourser</p>
                          <p className="text-orange-400 font-bold">
                            {formatPrice(computedRefundAmount())}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Raison */}
                  <textarea
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="Raison du remboursement (optionnel)"
                    rows={2}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none mb-3"
                  />

                  {/* Bouton remboursement */}
                  <button
                    onClick={handleRefundSubmit}
                    disabled={refundType === "partial" && computedRefundAmount() <= 0}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {refundType === "total" ? "Rembourser intégralement" : "Rembourser partiellement"}
                  </button>
                </div>
              )}

              {/* Archiver / Désarchiver */}
              {detail.isArchived ? (
                <button
                  onClick={() => onUnarchive(detail._id)}
                  disabled={isUnarchiving}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
                >
                  {isUnarchiving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArchiveRestore className="w-4 h-4" />
                  )}
                  Désarchiver la réservation
                </button>
              ) : (
                <button
                  onClick={() => {
                    onArchive({
                      _id: detail._id,
                      clientId: detail.client?._id || ("" as Id<"users">),
                      clientName: detail.client ? `${detail.client.firstName} ${detail.client.lastName}` : "Inconnu",
                      announcerId: detail.announcer?._id || ("" as Id<"users">),
                      announcerName: detail.announcer ? `${detail.announcer.firstName} ${detail.announcer.lastName}` : "Inconnu",
                      serviceName: detail.serviceName,
                      startDate: detail.startDate,
                      endDate: detail.endDate,
                      status: detail.status,
                      amount: detail.amount,
                      createdAt: detail.createdAt,
                    } as Reservation);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-xl font-medium text-sm transition-colors"
                >
                  <Archive className="w-4 h-4" />
                  Archiver la réservation
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Refund Modal */}
      <RefundModal
        isOpen={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        onConfirm={handleRefundConfirm}
        isRefunding={isRefunding}
        refundType={refundType}
        refundAmount={computedRefundAmount()}
        totalAmount={detail.amount}
        reason={refundReason}
      />
    </div>
  );
}

export default function ReservationsPage() {
  const { token } = useAdminAuth();
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);
  const pageSize = 15;

  // Archive modal state
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [reservationToArchive, setReservationToArchive] = useState<Reservation | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isUnarchiving, setIsUnarchiving] = useState(false);

  // Selection state for bulk archive
  const [selectedIds, setSelectedIds] = useState<Set<Id<"missions">>>(new Set());

  // Show archived filter
  const [showArchived, setShowArchived] = useState(false);

  // Detail view state
  const [selectedMissionId, setSelectedMissionId] = useState<Id<"missions"> | null>(null);

  // Revenir à la liste quand on clique sur le lien "Réservations" dans la sidebar
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href="/admin/reservations"]');
      if (link && selectedMissionId) {
        setSelectedMissionId(null);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [selectedMissionId]);

  const reservations = useQuery(
    api.admin.reservations.listReservations,
    token
      ? {
          token,
          search: search || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
          showArchived: showArchived || undefined,
          limit: pageSize,
          offset: page * pageSize,
        }
      : "skip"
  );

  const stats = useQuery(
    api.admin.reservations.getReservationStats,
    token ? { token } : "skip"
  );

  const archiveReservation = useMutation(api.admin.reservations.archiveReservation);
  const archiveMultiple = useMutation(api.admin.reservations.archiveMultipleReservations);
  const unarchiveReservation = useMutation(api.admin.reservations.unarchiveReservation);
  const recalculateSlotCounts = useMutation(api.admin.reservations.recalculateSlotCounts);
  const triggerTransfer = useAction(api.admin.transfers.triggerManualTransfer);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [transferringMissionId, setTransferringMissionId] = useState<Id<"missions"> | null>(null);

  const handleArchiveClick = (reservation: Reservation) => {
    setReservationToArchive(reservation);
    setArchiveModalOpen(true);
  };

  const handleArchiveConfirm = async () => {
    if (!token || !reservationToArchive) return;

    setIsArchiving(true);
    try {
      await archiveReservation({ token, missionId: reservationToArchive._id });
      setArchiveModalOpen(false);
      setReservationToArchive(null);
    } catch (error) {
      console.error("Erreur lors de l'archivage:", error);
      alert("Erreur lors de l'archivage de la réservation");
    } finally {
      setIsArchiving(false);
    }
  };

  const handleUnarchive = async (missionId: Id<"missions">) => {
    if (!token) return;

    setIsUnarchiving(true);
    try {
      await unarchiveReservation({ token, missionId });
    } catch (error) {
      console.error("Erreur lors du désarchivage:", error);
      alert("Erreur lors du désarchivage de la réservation");
    } finally {
      setIsUnarchiving(false);
    }
  };

  const handleBulkArchive = async () => {
    if (!token || selectedIds.size === 0) return;

    if (!confirm(`Archiver ${selectedIds.size} réservation(s) ?`)) return;

    setIsArchiving(true);
    try {
      const result = await archiveMultiple({
        token,
        missionIds: Array.from(selectedIds),
      });
      setSelectedIds(new Set());
      alert(`${result.archived} réservation(s) archivée(s)`);
    } catch (error) {
      console.error("Erreur lors de l'archivage:", error);
      alert("Erreur lors de l'archivage");
    } finally {
      setIsArchiving(false);
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

  const handleRecalculateSlots = async () => {
    if (!token) return;

    setIsRecalculating(true);
    try {
      const result = await recalculateSlotCounts({ token });
      alert(`${result.slotsUpdated} créneau(x) mis à jour sur ${result.totalSlots} total`);
    } catch (error) {
      console.error("Erreur lors du recalcul:", error);
      alert("Erreur lors du recalcul des créneaux");
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleManualTransfer = async (missionId: Id<"missions">) => {
    if (!token) return;

    if (!confirm("Êtes-vous sûr de vouloir déclencher le transfert vers l'annonceur pour cette mission ?")) {
      return;
    }

    setTransferringMissionId(missionId);
    try {
      const result = await triggerTransfer({ token, missionId });
      alert(result.message);
    } catch (error) {
      console.error("Erreur lors du transfert:", error);
      const message = error instanceof Error ? error.message : "Erreur lors du transfert";
      alert(message);
    } finally {
      setTransferringMissionId(null);
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

  // Si une réservation est sélectionnée, afficher la vue détail
  if (selectedMissionId && token) {
    return (
      <div className="p-8">
        <ReservationDetailView
          missionId={selectedMissionId}
          token={token}
          onBack={() => setSelectedMissionId(null)}
          formatDate={formatDate}
          formatPrice={formatPrice}
          formatTimestamp={formatTimestamp}
          onTransfer={handleManualTransfer}
          transferringMissionId={transferringMissionId}
          onArchive={handleArchiveClick}
          onUnarchive={handleUnarchive}
          isUnarchiving={isUnarchiving}
        />

        {/* Archive Modal (aussi disponible dans la vue détail) */}
        <ArchiveModal
          isOpen={archiveModalOpen}
          reservation={reservationToArchive}
          onClose={() => {
            setArchiveModalOpen(false);
            setReservationToArchive(null);
          }}
          onConfirm={handleArchiveConfirm}
          isArchiving={isArchiving}
        />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Réservations</h1>
        <p className="text-slate-400 mt-1">
          Gérez toutes les réservations de la plateforme
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

          {/* Show archived toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => {
                setShowArchived(e.target.checked);
                setPage(0);
              }}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
            />
            <span className="text-slate-400 text-sm">Afficher archivées</span>
          </label>

          {/* Bulk archive button */}
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkArchive}
              disabled={isArchiving}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isArchiving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Archive className="w-5 h-5" />
              )}
              Archiver ({selectedIds.size})
            </button>
          )}

          {/* Recalculate slot counts button */}
          <button
            onClick={handleRecalculateSlots}
            disabled={isRecalculating}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            title="Recalculer les compteurs des créneaux collectifs"
          >
            {isRecalculating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}
            Recalculer créneaux
          </button>
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
                  className={`border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer ${
                    selectedIds.has(reservation._id) ? "bg-blue-500/10" : ""
                  }`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => setSelectedMissionId(reservation._id)}
                >
                  <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
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
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={reservation.status} />
                      {reservation.isArchived && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-500/20 text-slate-400 text-xs rounded-full w-fit">
                          <Archive className="w-3 h-3" />
                          Archivée
                        </span>
                      )}
                      {reservation.hasDispute && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full w-fit">
                          Réclamation
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {/* Bouton voir détail */}
                      <button
                        onClick={() => setSelectedMissionId(reservation._id)}
                        className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                        title="Voir le détail"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      {/* Bouton transfert manuel */}
                      {(reservation.status === "upcoming" || reservation.status === "in_progress" || reservation.status === "completed" || reservation.paymentStatus === "paid" || reservation.stripePaymentStatus === "captured") && (
                        <button
                          onClick={() => handleManualTransfer(reservation._id)}
                          disabled={transferringMissionId === reservation._id}
                          className="p-2 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors disabled:opacity-50"
                          title="Transférer à l'annonceur"
                        >
                          {transferringMissionId === reservation._id ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Banknote className="w-5 h-5" />
                          )}
                        </button>
                      )}
                      {reservation.isArchived ? (
                        <button
                          onClick={() => handleUnarchive(reservation._id)}
                          className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                          title="Désarchiver"
                        >
                          <ArchiveRestore className="w-5 h-5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleArchiveClick(reservation)}
                          className="p-2 hover:bg-slate-500/20 text-slate-400 rounded-lg transition-colors"
                          title="Archiver"
                        >
                          <Archive className="w-5 h-5" />
                        </button>
                      )}
                    </div>
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

      {/* Archive Modal */}
      <ArchiveModal
        isOpen={archiveModalOpen}
        reservation={reservationToArchive}
        onClose={() => {
          setArchiveModalOpen(false);
          setReservationToArchive(null);
        }}
        onConfirm={handleArchiveConfirm}
        isArchiving={isArchiving}
      />
    </div>
  );
}
