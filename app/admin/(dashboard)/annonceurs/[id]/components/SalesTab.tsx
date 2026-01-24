"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Calendar,
  User,
  Mail,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  CreditCard,
  FileText,
  RefreshCw,
  Loader2,
} from "lucide-react";

interface SalesTabProps {
  announcerId: Id<"users">;
}

interface MissionItem {
  _id: string;
  status: string;
  amount: number;
  platformFee?: number;
  announcerEarnings?: number;
  paymentStatus: string;
  announcerPaymentStatus?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  serviceName: string;
  variantName?: string;
  serviceCategory: string;
  animal: { name: string; type: string; emoji: string };
  location: string;
  city?: string;
  client: { id: string; name: string; email: string; phone?: string } | null;
  createdAt: number;
}

interface CreditItem {
  id: string;
  amount: number;
  originalAmount: number;
  reason: string;
  status: string;
  createdAt: number;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending_acceptance: { label: "En attente d'acceptation", color: "amber" },
  pending_confirmation: { label: "En attente de confirmation", color: "blue" },
  upcoming: { label: "À venir", color: "purple" },
  in_progress: { label: "En cours", color: "cyan" },
  completed: { label: "Terminée", color: "green" },
  refused: { label: "Refusée", color: "red" },
  cancelled: { label: "Annulée", color: "slate" },
};

const paymentStatusLabels: Record<string, { label: string; color: string }> = {
  not_due: { label: "Non due", color: "slate" },
  pending: { label: "En attente", color: "amber" },
  paid: { label: "Payé", color: "green" },
  refunded: { label: "Remboursé", color: "red" },
};

const formatMoney = (cents: number) => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export function SalesTab({ announcerId }: SalesTabProps) {
  const { token } = useAdminAuth();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedMission, setSelectedMission] = useState<string | null>(null);
  const pageSize = 10;

  // Missions de l'annonceur
  const missions = useQuery(
    api.admin.announcers.getAnnouncerMissions,
    token
      ? {
          token,
          announcerId,
          status: statusFilter || undefined,
          limit: pageSize,
          offset: page * pageSize,
        }
      : "skip"
  );

  // Détails de la mission sélectionnée
  const missionDetails = useQuery(
    api.admin.finances.getMissionFinanceDetails,
    token && selectedMission
      ? { token, missionId: selectedMission as Id<"missions"> }
      : "skip"
  );

  if (!missions) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      {/* Filtres */}
      <div className="flex items-center gap-4 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(statusLabels).map(([key, { label }]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        <p className="text-slate-400 text-sm ml-auto">
          {missions.total} mission(s) au total
        </p>
      </div>

      {/* Liste des missions */}
      {missions.missions.length === 0 ? (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-12 text-center">
          <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Aucune vente</h3>
          <p className="text-slate-400">
            {statusFilter
              ? "Aucune mission avec ce statut"
              : "Cet annonceur n'a pas encore de missions"}
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-sm">
                    Mission
                  </th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-sm">
                    Client
                  </th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-sm">
                    Dates
                  </th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-sm">
                    Montant
                  </th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-sm">
                    Statut
                  </th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-sm">
                    Paiement
                  </th>
                </tr>
              </thead>
              <tbody>
                {missions.missions.map((mission: MissionItem) => {
                  const status = statusLabels[mission.status] || {
                    label: mission.status,
                    color: "slate",
                  };
                  const payment = paymentStatusLabels[mission.paymentStatus] || {
                    label: mission.paymentStatus,
                    color: "slate",
                  };

                  return (
                    <tr
                      key={mission._id}
                      className="border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer"
                      onClick={() => setSelectedMission(mission._id)}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-white font-medium">
                            {mission.serviceName}
                          </p>
                          <p className="text-sm text-slate-400">
                            {mission.variantName || mission.serviceCategory}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {mission.client ? (
                          <div>
                            <p className="text-white">{mission.client.name}</p>
                            <p className="text-sm text-slate-400">
                              {mission.client.email}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-slate-300">
                          <Calendar className="w-4 h-4 text-slate-500" />
                          {formatDate(mission.startDate)}
                          {mission.startDate !== mission.endDate && (
                            <span className="text-slate-500">
                              → {formatDate(mission.endDate)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">
                          {formatMoney(mission.amount)}
                        </p>
                        {mission.announcerEarnings && (
                          <p className="text-xs text-green-400">
                            Net: {formatMoney(mission.announcerEarnings)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium bg-${status.color}-500/20 text-${status.color}-400`}
                          style={{
                            backgroundColor:
                              status.color === "amber"
                                ? "rgba(245, 158, 11, 0.2)"
                                : status.color === "blue"
                                ? "rgba(59, 130, 246, 0.2)"
                                : status.color === "purple"
                                ? "rgba(168, 85, 247, 0.2)"
                                : status.color === "cyan"
                                ? "rgba(6, 182, 212, 0.2)"
                                : status.color === "green"
                                ? "rgba(34, 197, 94, 0.2)"
                                : status.color === "red"
                                ? "rgba(239, 68, 68, 0.2)"
                                : "rgba(100, 116, 139, 0.2)",
                            color:
                              status.color === "amber"
                                ? "rgb(251, 191, 36)"
                                : status.color === "blue"
                                ? "rgb(96, 165, 250)"
                                : status.color === "purple"
                                ? "rgb(192, 132, 252)"
                                : status.color === "cyan"
                                ? "rgb(34, 211, 238)"
                                : status.color === "green"
                                ? "rgb(74, 222, 128)"
                                : status.color === "red"
                                ? "rgb(248, 113, 113)"
                                : "rgb(148, 163, 184)",
                          }}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium`}
                          style={{
                            backgroundColor:
                              payment.color === "amber"
                                ? "rgba(245, 158, 11, 0.2)"
                                : payment.color === "green"
                                ? "rgba(34, 197, 94, 0.2)"
                                : payment.color === "red"
                                ? "rgba(239, 68, 68, 0.2)"
                                : "rgba(100, 116, 139, 0.2)",
                            color:
                              payment.color === "amber"
                                ? "rgb(251, 191, 36)"
                                : payment.color === "green"
                                ? "rgb(74, 222, 128)"
                                : payment.color === "red"
                                ? "rgb(248, 113, 113)"
                                : "rgb(148, 163, 184)",
                          }}
                        >
                          {payment.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {missions.total > pageSize && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
              <p className="text-slate-400 text-sm">
                Page {page + 1} sur {Math.ceil(missions.total / pageSize)}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={(page + 1) * pageSize >= missions.total}
                  className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal détail mission */}
      <AnimatePresence>
        {selectedMission && missionDetails && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedMission(null)}
          >
            <motion.div
              className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Détails de la mission
                  </h3>
                  <p className="text-sm text-slate-400">
                    {missionDetails.mission.serviceName}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedMission(null)}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Service Info */}
                <div>
                  <h4 className="text-sm font-medium text-slate-400 mb-3">
                    Service
                  </h4>
                  <div className="p-4 bg-slate-800 rounded-lg">
                    <p className="text-white font-medium">
                      {missionDetails.mission.serviceName}
                    </p>
                    {missionDetails.mission.variantName && (
                      <p className="text-sm text-slate-400">
                        Formule: {missionDetails.mission.variantName}
                      </p>
                    )}
                    <p className="text-sm text-slate-400 mt-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {formatDate(missionDetails.mission.startDate)}
                      {missionDetails.mission.startDate !==
                        missionDetails.mission.endDate && (
                        <span>→ {formatDate(missionDetails.mission.endDate)}</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Client Info */}
                {missionDetails.client && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-400 mb-3">
                      Client
                    </h4>
                    <div className="p-4 bg-slate-800 rounded-lg space-y-2">
                      <p className="text-white font-medium flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-500" />
                        {missionDetails.client.name}
                      </p>
                      <p className="text-slate-300 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-500" />
                        {missionDetails.client.email}
                      </p>
                      {missionDetails.client.phone && (
                        <p className="text-slate-300 flex items-center gap-2">
                          <Phone className="w-4 h-4 text-slate-500" />
                          {missionDetails.client.phone}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Financial Details */}
                <div>
                  <h4 className="text-sm font-medium text-slate-400 mb-3">
                    Détails financiers
                  </h4>
                  <div className="p-4 bg-slate-800 rounded-lg space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Prix service</span>
                      <span className="text-white font-medium">
                        {formatMoney(missionDetails.mission.basePrice || 0)}
                      </span>
                    </div>
                    {(missionDetails.mission.optionsPrice || 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Options</span>
                        <span className="text-white">
                          {formatMoney(missionDetails.mission.optionsPrice || 0)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-400">Commission plateforme</span>
                      <span className="text-primary">
                        -{formatMoney(missionDetails.mission.platformFee || 0)}
                      </span>
                    </div>
                    <div className="border-t border-slate-700 pt-3 flex justify-between">
                      <span className="text-white font-medium">Total client</span>
                      <span className="text-white font-bold">
                        {formatMoney(missionDetails.mission.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-green-400">
                      <span>Revenu annonceur</span>
                      <span className="font-bold">
                        {formatMoney(missionDetails.mission.announcerEarnings || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Status */}
                <div>
                  <h4 className="text-sm font-medium text-slate-400 mb-3">
                    Statut paiement
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-800 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Paiement client</p>
                      <p
                        className={`font-medium ${
                          missionDetails.mission.paymentStatus === "paid"
                            ? "text-green-400"
                            : missionDetails.mission.paymentStatus === "pending"
                            ? "text-amber-400"
                            : "text-slate-400"
                        }`}
                      >
                        {paymentStatusLabels[missionDetails.mission.paymentStatus]
                          ?.label || missionDetails.mission.paymentStatus}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-800 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">
                        Virement annonceur
                      </p>
                      <p
                        className={`font-medium ${
                          missionDetails.mission.announcerPaymentStatus === "paid"
                            ? "text-green-400"
                            : missionDetails.mission.announcerPaymentStatus ===
                              "pending"
                            ? "text-amber-400"
                            : "text-slate-400"
                        }`}
                      >
                        {missionDetails.mission.announcerPaymentStatus === "paid"
                          ? "Viré"
                          : missionDetails.mission.announcerPaymentStatus ===
                            "pending"
                          ? "En attente"
                          : "Non dû"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stripe Info */}
                {missionDetails.payment && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-400 mb-3">
                      Informations Stripe
                    </h4>
                    <div className="p-4 bg-slate-800 rounded-lg space-y-2 text-sm">
                      {missionDetails.payment.stripePaymentIntentId && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Payment Intent</span>
                          <code className="text-xs text-white bg-slate-700 px-2 py-0.5 rounded">
                            {missionDetails.payment.stripePaymentIntentId}
                          </code>
                        </div>
                      )}
                      {missionDetails.payment.authorizedAt && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Autorisé le</span>
                          <span className="text-white">
                            {new Date(
                              missionDetails.payment.authorizedAt
                            ).toLocaleString("fr-FR")}
                          </span>
                        </div>
                      )}
                      {missionDetails.payment.capturedAt && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Capturé le</span>
                          <span className="text-green-400">
                            {new Date(
                              missionDetails.payment.capturedAt
                            ).toLocaleString("fr-FR")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Credits */}
                {missionDetails.credits && missionDetails.credits.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-400 mb-3">
                      Avoirs associés
                    </h4>
                    <div className="space-y-2">
                      {missionDetails.credits.map((credit: CreditItem) => (
                        <div
                          key={credit.id}
                          className="p-3 bg-slate-800 rounded-lg flex justify-between items-center"
                        >
                          <div>
                            <p className="text-white text-sm">{credit.reason}</p>
                            <p className="text-xs text-slate-400">
                              {new Date(credit.createdAt).toLocaleDateString(
                                "fr-FR"
                              )}
                            </p>
                          </div>
                          <span className="text-primary font-medium">
                            {formatMoney(credit.originalAmount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
