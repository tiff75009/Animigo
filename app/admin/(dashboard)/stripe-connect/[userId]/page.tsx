"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  Landmark,
  Loader2,
  CheckCircle,
  XCircle,
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
  FileText,
  Trash2,
  Ban,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import {
  formatCents,
  formatDate,
  formatTimestamp,
  statusConfig,
  payoutStatusConfig,
  missionPaymentConfig,
} from "../shared";
import { ConfirmModal } from "../confirm-modal";

export default function ConnectAccountDetailPage() {
  const params = useParams();
  const userId = params.userId as Id<"users">;
  const { token } = useAdminAuth();
  const [deleteModal, setDeleteModal] = useState(false);
  const [disableModal, setDisableModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [activeTab, setActiveTab] = useState<"completed" | "upcoming" | "cancelled" | "payouts" | "disputed">("completed");

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

  return (
    <div className="p-8 space-y-8">
      <DetailHeader
        data={data}
        onDisable={() => setDisableModal(true)}
        onDelete={() => setDeleteModal(true)}
      />
      <FinanceCards data={data} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <UserInfoCard data={data} />
          <StripeInfoCard data={data} />
          <MissionStatsCard data={data} />
        </div>

        <div className="lg:col-span-2 space-y-0">
          <MissionsTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={{
              completed: data.recentMissions.length,
              upcoming: data.upcomingMissions.length,
              cancelled: data.cancelledMissions.length,
              payouts: data.payouts.length,
              disputed: data.disputedMissions.length,
            }}
          />
          {activeTab === "completed" && (
            <MissionsTable missions={data.recentMissions} />
          )}
          {activeTab === "upcoming" && (
            <UpcomingMissionsTable missions={data.upcomingMissions} />
          )}
          {activeTab === "cancelled" && (
            <CancelledMissionsTable
              missions={data.cancelledMissions}
              cancellationPolicy={data.cancellationPolicy}
            />
          )}
          {activeTab === "payouts" && (
            <PayoutsTable payouts={data.payouts} />
          )}
          {activeTab === "disputed" && (
            <DisputedMissionsTable missions={data.disputedMissions} />
          )}
        </div>
      </div>

      <ConfirmModal
        open={deleteModal}
        onClose={() => !isDeleting && setDeleteModal(false)}
        onConfirm={handleDelete}
        loading={isDeleting}
        icon={Trash2}
        iconBg="bg-red-500/10"
        iconColor="text-red-400"
        btnColor="bg-red-600 hover:bg-red-700"
        title="Supprimer le compte Stripe"
      >
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
        <p className="text-sm text-red-400 mt-3">Cette action est irréversible.</p>
      </ConfirmModal>

      <ConfirmModal
        open={disableModal}
        onClose={() => !isDisabling && setDisableModal(false)}
        onConfirm={handleDisable}
        loading={isDisabling}
        icon={Ban}
        iconBg="bg-orange-500/10"
        iconColor="text-orange-400"
        btnColor="bg-orange-600 hover:bg-orange-700"
        title="Désactiver le compte"
        confirmLabel="Désactiver"
      >
        <p className="text-sm text-slate-300 mb-6">
          L&apos;annonceur ne pourra plus recevoir de paiements ni de virements.
        </p>
      </ConfirmModal>
    </div>
  );
}

/* ═══ Composants extraits ═══ */

function DetailHeader({
  data,
  onDisable,
  onDelete,
}: {
  data: any;
  onDisable: () => void;
  onDelete: () => void;
}) {
  const stripeStatus = statusConfig[data.stripe.stripeAccountStatus] || statusConfig.pending;
  const StripeStatusIcon = stripeStatus.icon;

  return (
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
            onClick={onDisable}
            className="px-4 py-2 text-sm font-medium text-orange-400 border border-orange-500/30 hover:bg-orange-500/10 rounded-lg transition-colors flex items-center gap-2"
          >
            <Ban className="w-4 h-4" />
            Désactiver
          </button>
        )}
        <button
          onClick={onDelete}
          className="px-4 py-2 text-sm font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Supprimer
        </button>
      </div>
    </div>
  );
}

function FinanceCards({ data }: { data: any }) {
  const cards = [
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
  ];

  if (data.finances.disputedCount > 0) {
    cards.push({
      label: "Paiement bloqué",
      value: formatCents(data.finances.disputedAmount),
      sub: `${data.finances.disputedCount} réclamation${data.finances.disputedCount > 1 ? "s" : ""}`,
      icon: AlertTriangle,
      color: "text-amber-400",
    });
  }

  return (
    <div className={`grid grid-cols-2 ${cards.length > 4 ? "md:grid-cols-5" : "md:grid-cols-4"} gap-4`}>
      {cards.map((card) => (
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
  );
}

function UserInfoCard({ data }: { data: any }) {
  const accountTypeLabel =
    data.user.accountType === "annonceur_pro"
      ? "Professionnel"
      : data.user.accountType === "annonceur_particulier"
        ? "Particulier"
        : data.user.accountType;

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
      <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <User className="w-4 h-4 text-blue-400" />
        Informations annonceur
      </h2>
      <div className="space-y-3">
        <InfoRow icon={Mail} label="Email" value={data.user.email} />
        <InfoRow icon={Phone} label="Téléphone" value={data.user.phone || "—"} />
        <InfoRow icon={Building} label="Type" value={accountTypeLabel} />
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
        <InfoRow icon={Calendar} label="Inscrit le" value={formatDate(data.user.createdAt)} />
      </div>
    </div>
  );
}

function StripeInfoCard({ data }: { data: any }) {
  return (
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
        <BooleanRow
          icon={CreditCard}
          label="Charges"
          enabled={data.stripe.stripeChargesEnabled}
        />
        <BooleanRow
          icon={Banknote}
          label="Payouts"
          enabled={data.stripe.stripePayoutsEnabled}
        />
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
  );
}

function MissionStatsCard({ data }: { data: any }) {
  return (
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
  );
}

type TabKey = "completed" | "upcoming" | "cancelled" | "payouts" | "disputed";

const tabsConfig: { key: TabKey; label: string; icon: React.ElementType; color: string }[] = [
  { key: "completed", label: "Terminées", icon: FileText, color: "text-emerald-400 border-emerald-400" },
  { key: "upcoming", label: "À venir", icon: Calendar, color: "text-cyan-400 border-cyan-400" },
  { key: "cancelled", label: "Annulées", icon: XCircle, color: "text-red-400 border-red-400" },
  { key: "disputed", label: "Contestées", icon: AlertTriangle, color: "text-amber-400 border-amber-400" },
  { key: "payouts", label: "Virements", icon: Banknote, color: "text-blue-400 border-blue-400" },
];

function MissionsTabs({
  activeTab,
  onTabChange,
  counts,
}: {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  counts: Record<TabKey, number>;
}) {
  return (
    <div className="flex border-b border-slate-700 bg-slate-800/30 rounded-t-xl overflow-x-auto">
      {tabsConfig.map((tab) => {
        const isActive = activeTab === tab.key;
        const TabIcon = tab.icon;
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
              isActive
                ? `${tab.color} bg-slate-800/50`
                : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/30"
            }`}
          >
            <TabIcon className="w-4 h-4" />
            {tab.label}
            {counts[tab.key] > 0 && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? "bg-white/10"
                    : "bg-slate-700 text-slate-400"
                }`}
              >
                {counts[tab.key]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function MissionsTable({ missions }: { missions: any[] }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 border-t-0 rounded-b-xl overflow-hidden">
      {missions.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucune mission terminée</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                {["Service", "Date", "Montant client", "Gains annonceur", "Commission", "Versement"].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`${i >= 2 && i <= 4 ? "text-right" : "text-left"} px-6 py-3 text-xs font-semibold text-slate-400 uppercase`}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {missions.map((mission) => (
                <MissionRow key={mission._id} mission={mission} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MissionRow({ mission }: { mission: any }) {
  const payStatus =
    missionPaymentConfig[mission.announcerPaymentStatus] || missionPaymentConfig.not_due;

  return (
    <tr className="hover:bg-slate-800/30 transition-colors">
      <td className="px-6 py-3">
        <span className="text-sm text-white">{mission.serviceName || "—"}</span>
      </td>
      <td className="px-6 py-3">
        <span className="text-sm text-slate-400">{formatDate(mission.startDate)}</span>
      </td>
      <td className="px-6 py-3 text-right">
        <span className="text-sm text-white font-medium">{formatCents(mission.amount)}</span>
      </td>
      <td className="px-6 py-3 text-right">
        <span className="text-sm text-emerald-400 font-medium">
          {formatCents(mission.announcerEarnings)}
        </span>
      </td>
      <td className="px-6 py-3 text-right">
        <span className="text-sm text-blue-400">{formatCents(mission.platformFee)}</span>
        {mission.commissionRate && (
          <span className="text-xs text-slate-500 ml-1">({mission.commissionRate}%)</span>
        )}
      </td>
      <td className="px-6 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`text-xs font-medium ${payStatus.color}`}>{payStatus.label}</span>
          {mission.hasDispute && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-full">
              <AlertTriangle className="w-3 h-3" /> Contestée
            </span>
          )}
        </div>
        {mission.payoutScheduledFor && mission.announcerPaymentStatus !== "paid" && (
          <p className="text-xs text-slate-500 mt-0.5">
            Prévu le {formatDate(mission.payoutScheduledFor)}
          </p>
        )}
      </td>
    </tr>
  );
}

function UpcomingMissionsTable({ missions }: { missions: any[] }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 border-t-0 rounded-b-xl overflow-hidden">
      {missions.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucune mission à venir</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                {["Service", "Client", "Date", "Montant client", "Gains annonceur", "Séances"].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`${i >= 3 ? "text-right" : "text-left"} px-6 py-3 text-xs font-semibold text-slate-400 uppercase`}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {missions.map((mission) => (
                <UpcomingMissionRow key={mission._id} mission={mission} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UpcomingMissionRow({ mission }: { mission: any }) {
  return (
    <tr className="hover:bg-slate-800/30 transition-colors">
      <td className="px-6 py-3">
        <span className="text-sm text-white">{mission.serviceName || "—"}</span>
      </td>
      <td className="px-6 py-3">
        <span className="text-sm text-slate-300">{mission.clientName || "—"}</span>
      </td>
      <td className="px-6 py-3">
        <span className="text-sm text-slate-400">{formatDate(mission.startDate)}</span>
        {mission.startTime && (
          <span className="text-xs text-slate-500 ml-1">{mission.startTime}</span>
        )}
      </td>
      <td className="px-6 py-3 text-right">
        <span className="text-sm text-white font-medium">{formatCents(mission.amount)}</span>
      </td>
      <td className="px-6 py-3 text-right">
        <span className="text-sm text-cyan-400 font-medium">
          {formatCents(mission.announcerEarnings)}
        </span>
      </td>
      <td className="px-6 py-3 text-right">
        {mission.numberOfSessions > 1 ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 border border-purple-500/20 text-purple-400">
            {mission.numberOfSessions} séances
          </span>
        ) : (
          <span className="text-sm text-slate-400">1</span>
        )}
      </td>
    </tr>
  );
}

function CancelledMissionsTable({
  missions,
  cancellationPolicy,
}: {
  missions: any[];
  cancellationPolicy: { refundMode: string; defaultCommissionPercent: number; isActive: boolean } | null;
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 border-t-0 rounded-b-xl overflow-hidden">
      {cancellationPolicy?.isActive && (
        <div className="px-6 py-3 border-b border-slate-700/50">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-700/50 border border-slate-600 text-slate-300">
            Politique annonceur :{" "}
            {cancellationPolicy.refundMode === "per_session"
              ? "Par séance"
              : `${cancellationPolicy.defaultCommissionPercent}% retenu`}
          </span>
        </div>
      )}
      {missions.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          <XCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucune mission annulée</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                {[
                  "Service",
                  "Client",
                  "Annulée par",
                  "Date annulation",
                  "Montant initial",
                  "Remboursé",
                  "Retenu annonceur",
                ].map((h, i) => (
                  <th
                    key={h}
                    className={`${i >= 4 ? "text-right" : "text-left"} px-6 py-3 text-xs font-semibold text-slate-400 uppercase`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {missions.map((mission) => (
                <CancelledMissionRow key={mission._id} mission={mission} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CancelledMissionRow({ mission }: { mission: any }) {
  const cancelledByConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    client: { label: "Client", color: "text-amber-400", bgColor: "bg-amber-500/10 border-amber-500/20" },
    announcer: { label: "Annonceur", color: "text-orange-400", bgColor: "bg-orange-500/10 border-orange-500/20" },
    system: { label: "Système", color: "text-slate-400", bgColor: "bg-slate-500/10 border-slate-500/20" },
  };
  const cancelledBy = cancelledByConfig[mission.cancelledBy] || cancelledByConfig.system;

  return (
    <tr className="hover:bg-slate-800/30 transition-colors">
      <td className="px-6 py-3">
        <span className="text-sm text-white">{mission.serviceName || "—"}</span>
        {mission.cancellationReason && (
          <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[180px]" title={mission.cancellationReason}>
            {mission.cancellationReason}
          </p>
        )}
      </td>
      <td className="px-6 py-3">
        <span className="text-sm text-slate-300">{mission.clientName || "—"}</span>
      </td>
      <td className="px-6 py-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cancelledBy.bgColor} ${cancelledBy.color}`}
        >
          {cancelledBy.label}
        </span>
      </td>
      <td className="px-6 py-3">
        <span className="text-sm text-slate-400">{formatTimestamp(mission.cancelledAt)}</span>
      </td>
      <td className="px-6 py-3 text-right">
        <span className="text-sm text-white font-medium">{formatCents(mission.amount)}</span>
        {mission.numberOfSessions > 1 && (
          <span className="text-xs text-purple-400 ml-1">({mission.numberOfSessions}s)</span>
        )}
      </td>
      <td className="px-6 py-3 text-right">
        {mission.refundAmount > 0 ? (
          <span className="text-sm text-amber-400 font-medium">
            -{formatCents(mission.refundAmount)}
          </span>
        ) : (
          <span className="text-sm text-slate-500">—</span>
        )}
      </td>
      <td className="px-6 py-3 text-right">
        {mission.announcerRetainedAmount > 0 ? (
          <span className="text-sm text-emerald-400 font-medium">
            +{formatCents(mission.announcerRetainedAmount)}
          </span>
        ) : (
          <span className="text-sm text-slate-500">—</span>
        )}
      </td>
    </tr>
  );
}

function DisputedMissionsTable({ missions }: { missions: any[] }) {
  const disputeStatusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    open: { label: "Ouverte", color: "text-orange-400", bgColor: "bg-orange-500/10 border-orange-500/20" },
    investigating: { label: "Investigation", color: "text-blue-400", bgColor: "bg-blue-500/10 border-blue-500/20" },
    resolved_client: { label: "Résolu (client)", color: "text-green-400", bgColor: "bg-green-500/10 border-green-500/20" },
    resolved_announcer: { label: "Résolu (annonceur)", color: "text-emerald-400", bgColor: "bg-emerald-500/10 border-emerald-500/20" },
    closed: { label: "Fermée", color: "text-slate-400", bgColor: "bg-slate-500/10 border-slate-500/20" },
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 border-t-0 rounded-b-xl overflow-hidden">
      {missions.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucune mission contestée</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                {["Service", "Client", "Date", "Montant", "Motif", "Paiement", "Statut réclamation"].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`${i === 3 ? "text-right" : "text-left"} px-6 py-3 text-xs font-semibold text-slate-400 uppercase`}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {missions.map((mission) => {
                const disputeStatus = disputeStatusConfig[mission.disputeStatus] || disputeStatusConfig.open;
                return (
                  <tr key={mission._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-3">
                      <span className="text-sm text-white">{mission.serviceName || "—"}</span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-sm text-slate-300">{mission.clientName || "—"}</span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-sm text-slate-400">{formatDate(mission.startDate)}</span>
                      {mission.disputeCreatedAt && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          Réclamation le {formatTimestamp(mission.disputeCreatedAt)}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span className="text-sm text-white font-medium">{formatCents(mission.amount)}</span>
                      <p className="text-xs text-emerald-400">{formatCents(mission.announcerEarnings)}</p>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-sm text-slate-300">{mission.disputeReason || "—"}</span>
                    </td>
                    <td className="px-6 py-3">
                      {mission.disputePaymentBlocked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-full font-medium">
                          Bloqué
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-full font-medium">
                          Non bloqué
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${disputeStatus.bgColor} ${disputeStatus.color}`}
                      >
                        {disputeStatus.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PayoutsTable({ payouts }: { payouts: any[] }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 border-t-0 rounded-b-xl overflow-hidden">
      {payouts.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          <Banknote className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucun virement effectué</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                {["Date", "Montant net", "Brut", "Commission", "Missions", "Statut", "Transfer ID"].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`${i >= 1 && i <= 3 ? "text-right" : i === 4 ? "text-center" : "text-left"} px-6 py-3 text-xs font-semibold text-slate-400 uppercase`}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {payouts.map((payout) => (
                <PayoutRow key={payout._id} payout={payout} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PayoutRow({ payout }: { payout: any }) {
  const payoutStatus = payoutStatusConfig[payout.status] || payoutStatusConfig.pending;

  return (
    <tr className="hover:bg-slate-800/30 transition-colors">
      <td className="px-6 py-3">
        <span className="text-sm text-slate-300">
          {formatDate(payout.processedAt || payout.createdAt)}
        </span>
        {payout.scheduledAt && payout.status === "pending" && (
          <p className="text-xs text-slate-500">Programmé : {formatDate(payout.scheduledAt)}</p>
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
          {payout.commissionAmount ? formatCents(payout.commissionAmount) : "—"}
        </span>
      </td>
      <td className="px-6 py-3 text-center">
        <span className="text-sm text-slate-300">{payout.missionsCount}</span>
      </td>
      <td className="px-6 py-3">
        <span className={`text-xs font-medium ${payoutStatus.color}`}>
          {payoutStatus.label}
        </span>
        {payout.failureReason && (
          <p className="text-xs text-red-400 mt-0.5">{payout.failureReason}</p>
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
}

/* ═══ Composants utilitaires ═══ */

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

function BooleanRow({
  icon: Icon,
  label,
  enabled,
}: {
  icon: React.ElementType;
  label: string;
  enabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-slate-400 flex items-center gap-2">
        <Icon className="w-3.5 h-3.5" /> {label}
      </span>
      {enabled ? (
        <CheckCircle className="w-4 h-4 text-emerald-400" />
      ) : (
        <XCircle className="w-4 h-4 text-red-400" />
      )}
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
