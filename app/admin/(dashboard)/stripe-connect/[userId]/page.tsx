"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  Landmark,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Wallet,
  Hourglass,
  Banknote,
  Calendar,
  Zap,
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  Hash,
  CreditCard,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  FileText,
  Trash2,
  Ban,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });
}

function formatDate(timestamp: number | string | null | undefined): string {
  if (!timestamp) return "—";
  const date = typeof timestamp === "string" ? new Date(timestamp) : new Date(timestamp);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

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

const payoutStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "text-amber-400" },
  processing: { label: "En cours", color: "text-blue-400" },
  completed: { label: "Complété", color: "text-emerald-400" },
  failed: { label: "Échoué", color: "text-red-400" },
};

const missionPaymentConfig: Record<string, { label: string; color: string }> = {
  not_due: { label: "Non dû", color: "text-slate-400" },
  pending: { label: "En attente", color: "text-amber-400" },
  paid: { label: "Versé", color: "text-emerald-400" },
};

export default function ConnectAccountDetailPage() {
  const params = useParams();
  const userId = params.userId as Id<"users">;
  const { token } = useAdminAuth();
  const [deleteModal, setDeleteModal] = useState(false);
  const [disableModal, setDisableModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  const data = useQuery(
    api.admin.stripeConnect.getConnectAccountDetails,
    token && userId ? { token, userId } : "skip"
  );

  const deleteAccount = useMutation(api.admin.stripeConnect.adminDeleteStripeAccount);
  const rejectAccount = useMutation(api.admin.stripeConnect.adminRejectStripeAccount);
  const deleteStripeAction = useAction(api.api.stripeConnect.deleteStripeAccount);

  const handleDelete = async () => {
    if (!token || !data?.stripe.stripeAccountId) return;
    setIsDeleting(true);
    try {
      await deleteStripeAction({ stripeAccountId: data.stripe.stripeAccountId });
      await deleteAccount({ token, userId });
      setDeleteModal(false);
    } catch (error) {
      console.error("Erreur suppression:", error);
      alert("Erreur lors de la suppression du compte Stripe.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDisable = async () => {
    if (!token) return;
    setIsDisabling(true);
    try {
      await rejectAccount({ token, userId });
      setDisableModal(false);
    } catch (error) {
      console.error("Erreur désactivation:", error);
      alert("Erreur lors de la désactivation.");
    } finally {
      setIsDisabling(false);
    }
  };

  if (!token || !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  const stripeStatus = statusConfig[data.stripe.stripeAccountStatus] || statusConfig.pending;
  const StripeStatusIcon = stripeStatus.icon;

  const accountTypeLabel =
    data.user.accountType === "annonceur_pro"
      ? "Professionnel"
      : data.user.accountType === "annonceur_particulier"
        ? "Particulier"
        : data.user.accountType;

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/admin/stripe-connect"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux comptes Connect
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Landmark className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {data.user.firstName} {data.user.lastName}
              </h1>
              <p className="text-slate-400 text-sm">{data.user.email}</p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${stripeStatus.bgColor} ${stripeStatus.color}`}
            >
              <StripeStatusIcon className="w-3.5 h-3.5" />
              {stripeStatus.label}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {data.stripe.stripeAccountStatus !== "disabled" && (
            <button
              onClick={() => setDisableModal(true)}
              className="px-4 py-2 text-sm font-medium text-orange-400 border border-orange-500/30 hover:bg-orange-500/10 rounded-lg transition-colors flex items-center gap-2"
            >
              <Ban className="w-4 h-4" />
              Désactiver
            </button>
          )}
          <button
            onClick={() => setDeleteModal(true)}
            className="px-4 py-2 text-sm font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Supprimer
          </button>
        </div>
      </div>

      {/* Cartes financières */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Gains du mois",
            value: formatCents(data.finances.monthEarnings),
            sub: `${data.stats.currentMonthMissions} mission${data.stats.currentMonthMissions > 1 ? "s" : ""}`,
            icon: TrendingUp,
            color: "text-cyan-400",
          },
          {
            label: "En attente de versement",
            value: formatCents(data.finances.pendingPayoutAmount),
            sub: `${data.finances.pendingPayoutCount} mission${data.finances.pendingPayoutCount > 1 ? "s" : ""}`,
            icon: Hourglass,
            color: "text-purple-400",
          },
          {
            label: "Déjà versé",
            value: formatCents(data.finances.paidAmount),
            sub: `${data.finances.paidCount} mission${data.finances.paidCount > 1 ? "s" : ""}`,
            icon: Banknote,
            color: "text-emerald-400",
          },
          {
            label: "Total tous temps",
            value: formatCents(data.finances.totalEarnings),
            sub: `${data.stats.completedMissions} mission${data.stats.completedMissions > 1 ? "s" : ""} terminée${data.stats.completedMissions > 1 ? "s" : ""}`,
            icon: Wallet,
            color: "text-white",
          },
        ].map((card) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800/50 border border-slate-700 rounded-xl p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`w-4 h-4 ${card.color}`} />
              <span className="text-xs text-slate-400">{card.label}</span>
            </div>
            <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-xs text-slate-500 mt-1">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche : Infos compte */}
        <div className="space-y-6">
          {/* Infos utilisateur */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" />
              Informations annonceur
            </h2>
            <div className="space-y-3">
              <InfoRow icon={Mail} label="Email" value={data.user.email} />
              <InfoRow icon={Phone} label="Téléphone" value={data.user.phone || "—"} />
              <InfoRow
                icon={Building}
                label="Type"
                value={accountTypeLabel}
              />
              {data.user.companyName && (
                <InfoRow icon={Building} label="Société" value={data.user.companyName} />
              )}
              {data.user.siret && (
                <InfoRow icon={Hash} label="SIRET" value={data.user.siret} />
              )}
              {data.profile?.city && (
                <InfoRow
                  icon={MapPin}
                  label="Ville"
                  value={`${data.profile.city}${data.profile.postalCode ? ` (${data.profile.postalCode})` : ""}`}
                />
              )}
              <InfoRow
                icon={Calendar}
                label="Inscrit le"
                value={formatDate(data.user.createdAt)}
              />
            </div>
          </div>

          {/* Infos Stripe */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-blue-400" />
              Compte Stripe
            </h2>
            <div className="space-y-3">
              <InfoRow
                icon={Hash}
                label="Account ID"
                value={data.stripe.stripeAccountId || "—"}
                mono
              />
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-slate-400 flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5" /> Charges
                </span>
                {data.stripe.stripeChargesEnabled ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-slate-400 flex items-center gap-2">
                  <Banknote className="w-3.5 h-3.5" /> Payouts
                </span>
                {data.stripe.stripePayoutsEnabled ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
              </div>
              <InfoRow
                icon={CreditCard}
                label="IBAN"
                value={data.stripe.ibanLast4 ? `****${data.stripe.ibanLast4}` : "—"}
                mono
              />
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-slate-400 flex items-center gap-2">
                  {data.stripe.payoutMode === "instant" ? (
                    <Zap className="w-3.5 h-3.5" />
                  ) : (
                    <Calendar className="w-3.5 h-3.5" />
                  )}
                  Mode versement
                </span>
                <span
                  className={`text-xs font-medium ${
                    data.stripe.payoutMode === "instant" ? "text-purple-400" : "text-slate-300"
                  }`}
                >
                  {data.stripe.payoutMode === "instant" ? "Instantané" : "Mensuel"}
                </span>
              </div>
              <InfoRow
                icon={Clock}
                label="Dernière MàJ"
                value={formatDate(data.stripe.stripeAccountUpdatedAt)}
              />
            </div>
          </div>

          {/* Stats missions */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              Statistiques missions
            </h2>
            <div className="space-y-2">
              <StatRow label="Total missions" value={data.stats.totalMissions} />
              <StatRow label="Terminées" value={data.stats.completedMissions} color="text-emerald-400" />
              <StatRow label="En cours" value={data.stats.inProgressMissions} color="text-blue-400" />
              <StatRow label="En attente" value={data.stats.pendingMissions} color="text-amber-400" />
              <StatRow label="Annulées/Refusées" value={data.stats.cancelledMissions} color="text-red-400" />
              {data.stats.disputesCount > 0 && (
                <StatRow
                  label={`Réclamations (${data.stats.openDisputes} ouvertes)`}
                  value={data.stats.disputesCount}
                  color="text-orange-400"
                />
              )}
            </div>
            {/* Répartition financière */}
            <div className="mt-5 pt-4 border-t border-slate-700 space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Répartition financière
              </h3>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Volume brut clients</span>
                <span className="text-sm font-semibold text-white">
                  {formatCents(data.finances.totalGross)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <ArrowDownRight className="w-3 h-3 text-emerald-400" /> Revenus annonceur
                </span>
                <span className="text-sm font-semibold text-emerald-400">
                  {formatCents(data.finances.totalEarnings)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3 text-blue-400" /> Commission plateforme
                </span>
                <span className="text-sm font-semibold text-blue-400">
                  {formatCents(data.finances.totalPlatformFees)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne droite : Missions et Virements */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dernières missions */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                Dernières missions terminées
              </h2>
            </div>
            {data.recentMissions.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucune mission terminée</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase">
                        Service
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase">
                        Date
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-slate-400 uppercase">
                        Montant client
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-slate-400 uppercase">
                        Gains annonceur
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-slate-400 uppercase">
                        Commission
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase">
                        Versement
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {data.recentMissions.map((mission) => {
                      const payStatus =
                        missionPaymentConfig[mission.announcerPaymentStatus] ||
                        missionPaymentConfig.not_due;
                      return (
                        <tr key={mission._id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-3">
                            <span className="text-sm text-white">
                              {mission.serviceName || "—"}
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            <span className="text-sm text-slate-400">
                              {formatDate(mission.startDate)}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <span className="text-sm text-white font-medium">
                              {formatCents(mission.amount)}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <span className="text-sm text-emerald-400 font-medium">
                              {formatCents(mission.announcerEarnings)}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <span className="text-sm text-blue-400">
                              {formatCents(mission.platformFee)}
                            </span>
                            {mission.commissionRate && (
                              <span className="text-xs text-slate-500 ml-1">
                                ({mission.commissionRate}%)
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-3">
                            <span className={`text-xs font-medium ${payStatus.color}`}>
                              {payStatus.label}
                            </span>
                            {mission.payoutScheduledFor && mission.announcerPaymentStatus !== "paid" && (
                              <p className="text-xs text-slate-500 mt-0.5">
                                Prévu le {formatDate(mission.payoutScheduledFor)}
                              </p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Historique des virements */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Banknote className="w-4 h-4 text-blue-400" />
                Historique des virements
              </h2>
            </div>
            {data.payouts.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Banknote className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucun virement effectué</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase">
                        Date
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-slate-400 uppercase">
                        Montant net
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-slate-400 uppercase">
                        Brut
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-slate-400 uppercase">
                        Commission
                      </th>
                      <th className="text-center px-6 py-3 text-xs font-semibold text-slate-400 uppercase">
                        Missions
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase">
                        Statut
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase">
                        Transfer ID
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {data.payouts.map((payout) => {
                      const payoutStatus =
                        payoutStatusConfig[payout.status] || payoutStatusConfig.pending;
                      return (
                        <tr
                          key={payout._id}
                          className="hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="px-6 py-3">
                            <span className="text-sm text-slate-300">
                              {formatDate(payout.processedAt || payout.createdAt)}
                            </span>
                            {payout.scheduledAt && payout.status === "pending" && (
                              <p className="text-xs text-slate-500">
                                Programmé : {formatDate(payout.scheduledAt)}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <span className="text-sm font-semibold text-emerald-400">
                              {formatCents(payout.amount)}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <span className="text-sm text-slate-300">
                              {payout.grossAmount ? formatCents(payout.grossAmount) : "—"}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <span className="text-sm text-blue-400">
                              {payout.commissionAmount
                                ? formatCents(payout.commissionAmount)
                                : "—"}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <span className="text-sm text-slate-300">
                              {payout.missionsCount}
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            <span className={`text-xs font-medium ${payoutStatus.color}`}>
                              {payoutStatus.label}
                            </span>
                            {payout.failureReason && (
                              <p className="text-xs text-red-400 mt-0.5">
                                {payout.failureReason}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-3">
                            {payout.stripeTransferId ? (
                              <span className="text-xs text-slate-400 font-mono">
                                {payout.stripeTransferId.slice(0, 18)}...
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal suppression */}
      <AnimatePresence>
        {deleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !isDeleting && setDeleteModal(false)}
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
                Supprimer le compte Stripe Connect de{" "}
                <span className="font-semibold text-white">
                  {data.user.firstName} {data.user.lastName}
                </span>
                .
              </p>
              {data.stripe.stripeAccountId && (
                <p className="text-sm text-slate-400 mb-1">
                  ID :{" "}
                  <code className="text-xs bg-slate-700 px-1.5 py-0.5 rounded">
                    {data.stripe.stripeAccountId}
                  </code>
                </p>
              )}
              <p className="text-sm text-red-400 mt-3 mb-6">
                Cette action est irréversible.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteModal(false)}
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
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Supprimer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal désactivation */}
      <AnimatePresence>
        {disableModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !isDisabling && setDisableModal(false)}
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
              <p className="text-sm text-slate-300 mb-6">
                L'annonceur ne pourra plus recevoir de paiements ni de virements.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDisableModal(false)}
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
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Ban className="w-4 h-4" />
                  )}
                  Désactiver
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-slate-400 flex items-center gap-2">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </span>
      <span
        className={`text-xs text-slate-300 ${mono ? "font-mono" : ""} max-w-[200px] truncate`}
      >
        {value}
      </span>
    </div>
  );
}

function StatRow({
  label,
  value,
  color = "text-slate-300",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  );
}
