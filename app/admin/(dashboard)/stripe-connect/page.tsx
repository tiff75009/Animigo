"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Landmark,
  Loader2,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Trash2,
  Ban,
  Search,
  X,
  Calendar,
  Zap,
  Eye,
  TrendingUp,
  Wallet,
  Hourglass,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

type StatusFilter = "all" | "verified" | "pending" | "restricted" | "disabled";

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });
}

export default function StripeConnectPage() {
  const { token } = useAdminAuth();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteModal, setDeleteModal] = useState<{
    userId: Id<"users">;
    name: string;
    stripeAccountId: string;
  } | null>(null);
  const [disableModal, setDisableModal] = useState<{
    userId: Id<"users">;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  const accounts = useQuery(
    api.admin.stripeConnect.listConnectAccounts,
    token ? { token } : "skip"
  );

  const deleteAccount = useMutation(api.admin.stripeConnect.adminDeleteStripeAccount);
  const rejectAccount = useMutation(api.admin.stripeConnect.adminRejectStripeAccount);
  const deleteStripeAction = useAction(api.api.stripeConnect.deleteStripeAccount);

  // Filtrage
  const filteredAccounts = accounts
    ?.filter((a) => {
      if (statusFilter !== "all" && a.stripeAccountStatus !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          a.firstName.toLowerCase().includes(q) ||
          a.lastName.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          a.stripeAccountId.toLowerCase().includes(q)
        );
      }
      return true;
    })
    ?.sort((a, b) => (b.stripeAccountUpdatedAt || 0) - (a.stripeAccountUpdatedAt || 0));

  // Stats
  const stats = accounts
    ? {
        total: accounts.length,
        verified: accounts.filter((a) => a.stripeAccountStatus === "verified").length,
        pending: accounts.filter((a) => a.stripeAccountStatus === "pending").length,
        restricted: accounts.filter((a) => a.stripeAccountStatus === "restricted").length,
        disabled: accounts.filter((a) => a.stripeAccountStatus === "disabled").length,
        totalMonthEarnings: accounts.reduce((s, a) => s + a.monthEarnings, 0),
        totalPendingPayout: accounts.reduce((s, a) => s + a.pendingPayout, 0),
      }
    : null;

  const handleDelete = async () => {
    if (!deleteModal || !token) return;
    setIsDeleting(true);
    try {
      await deleteStripeAction({ stripeAccountId: deleteModal.stripeAccountId });
      await deleteAccount({ token, userId: deleteModal.userId });
      setDeleteModal(null);
    } catch (error) {
      console.error("Erreur suppression:", error);
      alert("Erreur lors de la suppression du compte Stripe.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDisable = async () => {
    if (!disableModal || !token) return;
    setIsDisabling(true);
    try {
      await rejectAccount({ token, userId: disableModal.userId });
      setDisableModal(null);
    } catch (error) {
      console.error("Erreur désactivation:", error);
      alert("Erreur lors de la désactivation du compte.");
    } finally {
      setIsDisabling(false);
    }
  };

  const statusConfig: Record<
    string,
    { label: string; color: string; bgColor: string; icon: React.ElementType }
  > = {
    verified: {
      label: "Vérifié",
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10 border-emerald-500/20",
      icon: CheckCircle,
    },
    pending: {
      label: "En attente",
      color: "text-amber-400",
      bgColor: "bg-amber-500/10 border-amber-500/20",
      icon: Clock,
    },
    restricted: {
      label: "Restreint",
      color: "text-orange-400",
      bgColor: "bg-orange-500/10 border-orange-500/20",
      icon: AlertTriangle,
    },
    disabled: {
      label: "Désactivé",
      color: "text-red-400",
      bgColor: "bg-red-500/10 border-red-500/20",
      icon: XCircle,
    },
  };

  const filterButtons: { value: StatusFilter; label: string; count?: number }[] = [
    { value: "all", label: "Tous", count: stats?.total },
    { value: "verified", label: "Vérifiés", count: stats?.verified },
    { value: "pending", label: "En attente", count: stats?.pending },
    { value: "restricted", label: "Restreints", count: stats?.restricted },
    { value: "disabled", label: "Désactivés", count: stats?.disabled },
  ];

  if (!token) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Landmark className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Comptes Stripe Connect</h1>
        </div>
        <p className="text-slate-400">
          Gérer les comptes Stripe Connect des annonceurs
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {[
            { label: "Total", value: String(stats.total), icon: Landmark, color: "text-blue-400" },
            { label: "Vérifiés", value: String(stats.verified), icon: CheckCircle, color: "text-emerald-400" },
            { label: "En attente", value: String(stats.pending), icon: Clock, color: "text-amber-400" },
            { label: "Restreints", value: String(stats.restricted), icon: AlertTriangle, color: "text-orange-400" },
            { label: "Désactivés", value: String(stats.disabled), icon: XCircle, color: "text-red-400" },
            {
              label: "Gains du mois",
              value: formatCents(stats.totalMonthEarnings),
              icon: TrendingUp,
              color: "text-cyan-400",
            },
            {
              label: "En attente versement",
              value: formatCents(stats.totalPendingPayout),
              icon: Hourglass,
              color: "text-purple-400",
            },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800/50 border border-slate-700 rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs text-slate-400">{stat.label}</span>
              </div>
              <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Filtres et recherche */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2 flex-wrap">
          {filterButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setStatusFilter(btn.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === btn.value
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              {btn.label}
              {btn.count !== undefined && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-slate-700/50">
                  {btn.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, email, ID Stripe..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tableau */}
      {!accounts ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      ) : filteredAccounts && filteredAccounts.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Landmark className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Aucun compte trouvé</p>
          <p className="text-sm mt-1">
            {statusFilter !== "all"
              ? "Essayez un autre filtre de statut"
              : "Aucun annonceur n'a encore créé de compte Stripe Connect"}
          </p>
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Annonceur
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Gains du mois
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    En attente
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Total gagné
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Versement
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Dernière MàJ
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredAccounts?.map((account) => {
                  const status = statusConfig[account.stripeAccountStatus] || statusConfig.pending;
                  const StatusIcon = status.icon;
                  return (
                    <motion.tr
                      key={account.userId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Annonceur */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-white">
                            {account.firstName} {account.lastName}
                          </p>
                          <p className="text-xs text-slate-400">{account.email}</p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            {account.stripeAccountId}
                          </p>
                        </div>
                      </td>
                      {/* Statut */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${status.bgColor} ${status.color}`}
                        >
                          <StatusIcon className="w-3.5 h-3.5" />
                          {status.label}
                        </span>
                      </td>
                      {/* Gains du mois */}
                      <td className="px-6 py-4 text-right">
                        <span className={`text-sm font-semibold ${account.monthEarnings > 0 ? "text-cyan-400" : "text-slate-500"}`}>
                          {formatCents(account.monthEarnings)}
                        </span>
                      </td>
                      {/* En attente versement */}
                      <td className="px-6 py-4 text-right">
                        <span className={`text-sm font-semibold ${account.pendingPayout > 0 ? "text-purple-400" : "text-slate-500"}`}>
                          {formatCents(account.pendingPayout)}
                        </span>
                      </td>
                      {/* Total gagné */}
                      <td className="px-6 py-4 text-right">
                        <div>
                          <span className="text-sm font-semibold text-white">
                            {formatCents(account.totalEarnings)}
                          </span>
                          <p className="text-xs text-slate-500">
                            {account.totalMissions} mission{account.totalMissions > 1 ? "s" : ""}
                          </p>
                        </div>
                      </td>
                      {/* Mode versement */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            account.payoutMode === "instant"
                              ? "text-purple-400"
                              : "text-slate-400"
                          }`}
                        >
                          {account.payoutMode === "instant" ? (
                            <Zap className="w-3.5 h-3.5" />
                          ) : (
                            <Calendar className="w-3.5 h-3.5" />
                          )}
                          {account.payoutMode === "instant" ? "Instantané" : "Mensuel"}
                        </span>
                      </td>
                      {/* Dernière MàJ */}
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-400">
                          {account.stripeAccountUpdatedAt
                            ? new Date(account.stripeAccountUpdatedAt).toLocaleDateString(
                                "fr-FR",
                                { day: "2-digit", month: "short", year: "numeric" }
                              )
                            : "—"}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/stripe-connect/${account.userId}`}
                            className="p-2 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors"
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {account.stripeAccountStatus !== "disabled" && (
                            <button
                              onClick={() =>
                                setDisableModal({
                                  userId: account.userId,
                                  name: `${account.firstName} ${account.lastName}`,
                                })
                              }
                              className="p-2 rounded-lg text-orange-400 hover:bg-orange-500/10 transition-colors"
                              title="Désactiver"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() =>
                              setDeleteModal({
                                userId: account.userId,
                                name: `${account.firstName} ${account.lastName}`,
                                stripeAccountId: account.stripeAccountId,
                              })
                            }
                            className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de suppression */}
      <AnimatePresence>
        {deleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !isDeleting && setDeleteModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Supprimer le compte Stripe</h3>
              </div>
              <p className="text-sm text-slate-300 mb-2">
                Vous allez supprimer le compte Stripe Connect de{" "}
                <span className="font-semibold text-white">{deleteModal.name}</span>.
              </p>
              <p className="text-sm text-slate-400 mb-1">
                ID :{" "}
                <code className="text-xs bg-slate-700 px-1.5 py-0.5 rounded">
                  {deleteModal.stripeAccountId}
                </code>
              </p>
              <p className="text-sm text-red-400 mt-3 mb-6">
                Cette action est irréversible. Le compte sera supprimé sur Stripe et toutes les
                données associées seront effacées.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteModal(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Suppression...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de désactivation */}
      <AnimatePresence>
        {disableModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !isDisabling && setDisableModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-500/10 rounded-full flex items-center justify-center">
                  <Ban className="w-5 h-5 text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Désactiver le compte</h3>
              </div>
              <p className="text-sm text-slate-300 mb-2">
                Vous allez désactiver le compte Stripe Connect de{" "}
                <span className="font-semibold text-white">{disableModal.name}</span>.
              </p>
              <p className="text-sm text-slate-400 mb-6">
                L'annonceur ne pourra plus recevoir de paiements ni de virements tant que le compte
                reste désactivé.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDisableModal(null)}
                  disabled={isDisabling}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDisable}
                  disabled={isDisabling}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isDisabling ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Désactivation...
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4" />
                      Désactiver
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
