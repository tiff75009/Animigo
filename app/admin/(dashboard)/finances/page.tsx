"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { motion } from "framer-motion";
import {
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle2,
  CircleDollarSign,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Users,
  CreditCard,
  Banknote,
  BarChart3,
  Percent,
  Hourglass,
  Receipt,
  FileText,
  ShoppingCart,
  Target,
  Award,
  CheckCircle,
  Search,
  X,
} from "lucide-react";

const formatMoney = (cents: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

const formatDateStr = (str: string) =>
  new Date(str).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

export default function FinancesPage() {
  const { token } = useAdminAuth();
  const now = new Date();
  const [period, setPeriod] = useState<"month" | "year">("month");
  const [selectedDate, setSelectedDate] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );

  const data = useQuery(
    api.admin.finances.getFinanceDashboard,
    token ? { token, period, date: selectedDate } : "skip"
  );

  const generateDateOptions = () => {
    const options = [];
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    if (period === "month") {
      for (let i = 0; i < 12; i++) {
        const date = new Date(currentYear, currentMonth - i, 1);
        const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const label = date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
        options.push({ value, label });
      }
    } else {
      for (let i = 0; i < 5; i++) {
        const y = currentYear - i;
        options.push({ value: String(y), label: String(y) });
      }
    }
    return options;
  };

  const handlePeriodChange = (newPeriod: "month" | "year") => {
    setPeriod(newPeriod);
    if (newPeriod === "year") {
      setSelectedDate(String(now.getFullYear()));
    } else {
      setSelectedDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
    }
  };

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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Finances</h1>
          </div>
          <p className="text-slate-400">Vue d'ensemble des revenus, commissions et versements</p>
        </div>
        <PeriodSelector
          period={period}
          selectedDate={selectedDate}
          dateOptions={generateDateOptions()}
          onPeriodChange={handlePeriodChange}
          onDateChange={setSelectedDate}
        />
      </div>

      {!data ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      ) : (
        <>
          <KpiSection kpis={data.kpis} />
          <SecondaryStats kpis={data.kpis} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CommissionPipeline commissions={data.commissions} />
            <MissionPipeline missions={data.missions} />
          </div>

          {period === "year" && data.monthlyBreakdown && (
            <MonthlyChart breakdown={data.monthlyBreakdown} />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PayoutsCard payouts={data.payouts} />
            <CreditsCard credits={data.credits} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopAnnouncers announcers={data.topAnnouncers} />
            <PendingPayoutsList payouts={data.pendingPayoutsList} />
          </div>

          <TransactionsTable transactions={data.recentTransactions} />
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Composants extraits
   ═══════════════════════════════════════════════════ */

function PeriodSelector({
  period,
  selectedDate,
  dateOptions,
  onPeriodChange,
  onDateChange,
}: {
  period: "month" | "year";
  selectedDate: string;
  dateOptions: { value: string; label: string }[];
  onPeriodChange: (p: "month" | "year") => void;
  onDateChange: (d: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex bg-slate-800 rounded-lg p-1">
        <button
          onClick={() => onPeriodChange("month")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            period === "month" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
          }`}
        >
          Mois
        </button>
        <button
          onClick={() => onPeriodChange("year")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            period === "year" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
          }`}
        >
          Année
        </button>
      </div>
      <div className="relative">
        <select
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="appearance-none bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 pr-10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {dateOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}

function KpiSection({ kpis }: { kpis: any }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <KpiCard label="Volume brut" value={formatMoney(kpis.gross)} variation={kpis.grossVariation} icon={ShoppingCart} color="text-white" />
      <KpiCard label="Commissions" value={formatMoney(kpis.revenue)} variation={kpis.revenueVariation} icon={Percent} color="text-blue-400" highlight />
      <KpiCard label="Revenus annonceurs" value={formatMoney(kpis.announcerEarnings)} icon={Banknote} color="text-emerald-400" />
      <KpiCard label="Missions payées" value={String(kpis.missionsCount)} variation={kpis.missionsVariation} icon={CheckCircle2} color="text-cyan-400" />
      <KpiCard label="Panier moyen" value={formatMoney(kpis.avgBasket)} icon={Target} color="text-amber-400" />
    </div>
  );
}

function SecondaryStats({ kpis }: { kpis: any }) {
  // Revenus plateforme = commissions + frais de gestion (tous deux TTC)
  const totalPlatformRevenueTTC = kpis.revenue + kpis.stripeFees;
  // TVA totale = TVA sur commissions + TVA sur frais de gestion
  const totalVat = kpis.vatOnCommission + (kpis.vatOnStripeFees || 0);
  // Marge nette = revenus plateforme HT
  const netMargin = totalPlatformRevenueTTC - totalVat;

  return (
    <div className="space-y-3">
      {/* Taux configurés */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg px-4 py-2.5">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Taux commission</p>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span>Part. <strong className="text-white">{kpis.commissionRates?.particulier ?? 15}%</strong></span>
            <span className="text-slate-600">|</span>
            <span>Micro <strong className="text-white">{kpis.commissionRates?.micro_entrepreneur ?? 12}%</strong></span>
            <span className="text-slate-600">|</span>
            <span>Pro <strong className="text-white">{kpis.commissionRates?.professionnel ?? 10}%</strong></span>
          </div>
        </div>
        <SmallStat label={`Frais de gestion (${kpis.stripeFeeRate ?? 3}%)`} value={formatMoney(kpis.stripeFees)} icon={CreditCard} color="text-slate-400" />
        <SmallStat label={`TVA plateforme (${kpis.vatRate}%)`} value={formatMoney(totalVat)} icon={Receipt} color="text-slate-400" />
        <SmallStat label="Taux comm. moyen" value={`${kpis.avgCommissionRate}%`} icon={Percent} color="text-slate-400" />
      </div>
      {/* Montants nets */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <SmallStat label="Commissions HT" value={formatMoney(kpis.revenue - kpis.vatOnCommission)} icon={CircleDollarSign} color="text-blue-400" />
        <SmallStat label="Frais gestion HT" value={formatMoney(kpis.stripeFees - (kpis.vatOnStripeFees || 0))} icon={CreditCard} color="text-blue-400" />
        <SmallStat label="Revenus nets plateforme" value={formatMoney(netMargin)} icon={TrendingUp} color="text-emerald-400" />
      </div>
    </div>
  );
}

function CommissionPipeline({ commissions }: { commissions: any }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
      <h2 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-blue-400" />
        Pipeline commissions
      </h2>
      <div className="space-y-4">
        <PipelineRow label="A venir" sub="Missions confirmées / à venir / en cours" value={formatMoney(commissions.upcoming)} color="bg-blue-500" percent={commissions.total > 0 ? (commissions.upcoming / commissions.total) * 100 : 0} />
        <PipelineRow label="Validées" sub="Terminées, paiement en attente" value={formatMoney(commissions.validated)} color="bg-amber-500" percent={commissions.total > 0 ? (commissions.validated / commissions.total) * 100 : 0} />
        <PipelineRow label="Encaissées" sub="Paiements capturés" value={formatMoney(commissions.paid)} color="bg-emerald-500" percent={commissions.total > 0 ? (commissions.paid / commissions.total) * 100 : 0} />
        <div className="pt-3 border-t border-slate-700 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-300">Total période</span>
          <span className="text-lg font-bold text-white">{formatMoney(commissions.total)}</span>
        </div>
      </div>
    </motion.div>
  );
}

function MissionPipeline({ missions }: { missions: any }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
      <h2 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
        <FileText className="w-4 h-4 text-blue-400" />
        Répartition des missions ({missions.total})
      </h2>
      <div className="space-y-3">
        <MissionStatusRow label="En attente d'acceptation" count={missions.pending_acceptance} color="text-slate-400" />
        <MissionStatusRow label="En attente de confirmation" count={missions.pending_confirmation} color="text-amber-400" />
        <MissionStatusRow label="A venir" count={missions.upcoming} color="text-blue-400" />
        <MissionStatusRow label="En cours" count={missions.in_progress} color="text-cyan-400" />
        <MissionStatusRow label="Terminées" count={missions.completed} color="text-emerald-400" />
        <MissionStatusRow label="Annulées" count={missions.cancelled} color="text-red-400" />
        <MissionStatusRow label="Refusées" count={missions.refused} color="text-orange-400" />
      </div>
      {missions.total > 0 && (
        <div className="mt-5 flex h-3 rounded-full overflow-hidden bg-slate-700">
          {missions.completed > 0 && <div className="bg-emerald-500" style={{ width: `${(missions.completed / missions.total) * 100}%` }} />}
          {missions.in_progress > 0 && <div className="bg-cyan-500" style={{ width: `${(missions.in_progress / missions.total) * 100}%` }} />}
          {missions.upcoming > 0 && <div className="bg-blue-500" style={{ width: `${(missions.upcoming / missions.total) * 100}%` }} />}
          {(missions.pending_acceptance + missions.pending_confirmation) > 0 && <div className="bg-amber-500" style={{ width: `${((missions.pending_acceptance + missions.pending_confirmation) / missions.total) * 100}%` }} />}
          {(missions.cancelled + missions.refused) > 0 && <div className="bg-red-500" style={{ width: `${((missions.cancelled + missions.refused) / missions.total) * 100}%` }} />}
        </div>
      )}
    </motion.div>
  );
}

function MonthlyChart({ breakdown }: { breakdown: any[] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
      <h2 className="text-sm font-semibold text-white mb-6 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-blue-400" />
        Évolution mensuelle
      </h2>
      <div className="flex items-end gap-2 h-52">
        {breakdown.map((month) => {
          const maxGross = Math.max(...breakdown.map((m) => m.gross), 1);
          const heightPercent = (month.gross / maxGross) * 100;
          const revenuePercent = month.gross > 0 ? (month.revenue / month.gross) * 100 : 0;
          return (
            <div key={month.month} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-slate-700 rounded-lg px-3 py-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                <p className="text-white font-medium">{formatMoney(month.gross)}</p>
                <p className="text-blue-400">Comm. {formatMoney(month.revenue)}</p>
                <p className="text-slate-400">{month.missionsCount} missions</p>
              </div>
              <div className="w-full rounded-t relative overflow-hidden bg-slate-700/50 group-hover:bg-slate-700 transition-colors" style={{ height: `${Math.max(heightPercent, 4)}%` }}>
                <div className="absolute bottom-0 left-0 right-0 bg-blue-500/80" style={{ height: `${revenuePercent}%` }} />
                <div className="absolute left-0 right-0 bg-emerald-500/50" style={{ bottom: `${revenuePercent}%`, height: `${100 - revenuePercent}%` }} />
              </div>
              <span className="text-xs text-slate-500 capitalize">{month.month}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-emerald-500/50 rounded" />
          <span className="text-xs text-slate-400">Revenus annonceurs</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500/80 rounded" />
          <span className="text-xs text-slate-400">Commissions plateforme</span>
        </div>
      </div>
    </motion.div>
  );
}

function PayoutsCard({ payouts }: { payouts: any }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
      <h2 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
        <Banknote className="w-4 h-4 text-blue-400" />
        Versements annonceurs
      </h2>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Hourglass className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs text-slate-400">Prêt à verser</span>
          </div>
          <p className="text-lg font-bold text-purple-400">{formatMoney(payouts.pendingPayoutAmount)}</p>
          <p className="text-xs text-slate-500">{payouts.pendingPayoutMissions} missions</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-slate-400">Déjà versé</span>
          </div>
          <p className="text-lg font-bold text-emerald-400">{formatMoney(payouts.paidOutAmount)}</p>
          <p className="text-xs text-slate-500">{payouts.paidOutMissions} missions</p>
        </div>
      </div>
      <div className="space-y-2">
        <PayoutStatusRow label="En attente" count={payouts.byStatusCount.pending} amount={payouts.byStatus.pending} color="text-amber-400" />
        <PayoutStatusRow label="En cours" count={payouts.byStatusCount.processing} amount={payouts.byStatus.processing} color="text-blue-400" />
        <PayoutStatusRow label="Complétés" count={payouts.byStatusCount.completed} amount={payouts.byStatus.completed} color="text-emerald-400" />
        {payouts.byStatusCount.failed > 0 && (
          <PayoutStatusRow label="Échoués" count={payouts.byStatusCount.failed} amount={payouts.byStatus.failed} color="text-red-400" />
        )}
      </div>
    </motion.div>
  );
}

function CreditsCard({ credits }: { credits: any }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
      <h2 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
        <Users className="w-4 h-4 text-blue-400" />
        Avoirs clients
      </h2>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800 rounded-lg p-4 text-center">
          <p className="text-xs text-slate-400 mb-1">Actifs</p>
          <p className="text-lg font-bold text-emerald-400">{formatMoney(credits.active)}</p>
          <p className="text-xs text-slate-500">{credits.activeCount} avoir{credits.activeCount > 1 ? "s" : ""}</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 text-center">
          <p className="text-xs text-slate-400 mb-1">Utilisés</p>
          <p className="text-lg font-bold text-blue-400">{formatMoney(credits.used)}</p>
          <p className="text-xs text-slate-500">{credits.usedCount} avoir{credits.usedCount > 1 ? "s" : ""}</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 text-center">
          <p className="text-xs text-slate-400 mb-1">Expirés</p>
          <p className="text-lg font-bold text-slate-400">{formatMoney(credits.expired)}</p>
        </div>
      </div>
    </motion.div>
  );
}

function TopAnnouncers({ announcers }: { announcers: any[] }) {
  const rankColors = ["text-amber-400", "text-slate-300", "text-orange-400", "text-slate-500", "text-slate-500"];
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-blue-400" />
          Top annonceurs de la période
        </h2>
      </div>
      {announcers.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          <Award className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucune donnée pour cette période</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-700/50">
          {announcers.map((a, i) => (
            <div key={a.userId} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-800/30 transition-colors">
              <span className={`text-sm font-bold w-6 text-center ${rankColors[i] || "text-slate-500"}`}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{a.name}</p>
                <p className="text-xs text-slate-500">{a.missions} missions</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-emerald-400">{formatMoney(a.earnings)}</p>
                <p className="text-xs text-blue-400">Comm. {formatMoney(a.fees)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function PendingPayoutsList({ payouts }: { payouts: any[] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-400" />
          Virements en attente
        </h2>
      </div>
      {payouts.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucun virement en attente</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-700/50">
          {payouts.map((p) => (
            <div key={p._id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-800/30 transition-colors">
              <div>
                <p className="text-sm font-medium text-white">{p.announcerName}</p>
                <p className="text-xs text-slate-500">
                  {p.missionsCount} mission{p.missionsCount > 1 ? "s" : ""}
                  {p.scheduledAt && ` — Prévu le ${formatDate(p.scheduledAt)}`}
                </p>
              </div>
              <span className="text-sm font-semibold text-amber-400">{formatMoney(p.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function TransactionsTable({ transactions }: { transactions: any[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  const filtered = useMemo(() => {
    if (!searchQuery) return transactions;
    const q = searchQuery.toLowerCase();
    return transactions.filter(
      (t) =>
        t.reference.toLowerCase().includes(q) ||
        t.clientName.toLowerCase().includes(q) ||
        t.announcerName.toLowerCase().includes(q) ||
        (t.serviceName && t.serviceName.toLowerCase().includes(q))
    );
  }, [transactions, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safeCurrentPage - 1) * perPage, safeCurrentPage * perPage);

  // Reset page quand la recherche change
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Receipt className="w-4 h-4 text-blue-400" />
          Transactions payées
          <span className="text-xs text-slate-500 font-normal ml-1">({filtered.length})</span>
        </h2>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par réf., client, annonceur..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button onClick={() => handleSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {paginated.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{searchQuery ? "Aucune transaction trouvée" : "Aucune transaction pour cette période"}</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase">Réf.</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase">Service</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase">Client</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase">Annonceur</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase">Date</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-400 uppercase">Montant</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-400 uppercase">Commission</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-400 uppercase">Annonceur</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase">Versement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {paginated.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-3">
                      <span className="text-xs font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                        {t.reference}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-white">{t.serviceName || "—"}</td>
                    <td className="px-6 py-3 text-sm text-slate-300">{t.clientName}</td>
                    <td className="px-6 py-3 text-sm text-slate-300">{t.announcerName}</td>
                    <td className="px-6 py-3 text-sm text-slate-400">{formatDateStr(t.startDate)}</td>
                    <td className="px-6 py-3 text-sm text-white font-medium text-right">{formatMoney(t.amount)}</td>
                    <td className="px-6 py-3 text-right">
                      <span className="text-sm text-blue-400 font-medium">{formatMoney(t.platformFee)}</span>
                      {t.commissionRate && <span className="text-xs text-slate-500 ml-1">({t.commissionRate}%)</span>}
                    </td>
                    <td className="px-6 py-3 text-sm text-emerald-400 font-medium text-right">{formatMoney(t.announcerEarnings)}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs font-medium ${
                        t.announcerPaymentStatus === "paid" ? "text-emerald-400" : t.announcerPaymentStatus === "pending" ? "text-amber-400" : "text-slate-500"
                      }`}>
                        {t.announcerPaymentStatus === "paid" ? "Versé" : t.announcerPaymentStatus === "pending" ? "En attente" : "Non dû"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-3 border-t border-slate-700 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                {(safeCurrentPage - 1) * perPage + 1}–{Math.min(safeCurrentPage * perPage, filtered.length)} sur {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (safeCurrentPage <= 3) {
                    page = i + 1;
                  } else if (safeCurrentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = safeCurrentPage - 2 + i;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                        safeCurrentPage === page ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-700"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

/* ═══ Composants atomiques ═══ */

function KpiCard({ label, value, variation, sub, icon: Icon, color, highlight }: {
  label: string; value: string; variation?: number; sub?: string; icon: React.ElementType; color: string; highlight?: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`bg-slate-800/50 border rounded-xl p-5 ${highlight ? "border-blue-500/40" : "border-slate-700"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${highlight ? "bg-blue-500/20" : "bg-slate-800"}`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        {variation !== undefined && variation !== 0 && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${variation > 0 ? "text-emerald-400" : "text-red-400"}`}>
            {variation > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(variation)}%
          </span>
        )}
      </div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-1">{sub || label}</p>
    </motion.div>
  );
}

function SmallStat({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg px-4 py-3 flex items-center justify-between">
      <span className="text-xs text-slate-400 flex items-center gap-1.5">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        {label}
      </span>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  );
}

function PipelineRow({ label, sub, value, color, percent }: { label: string; sub: string; value: string; color: string; percent: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div>
          <span className="text-sm text-white font-medium">{label}</span>
          <p className="text-xs text-slate-500">{sub}</p>
        </div>
        <span className="text-sm font-semibold text-white">{value}</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(percent, 1)}%` }} />
      </div>
    </div>
  );
}

function MissionStatusRow({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{count}</span>
    </div>
  );
}

function PayoutStatusRow({ label, count, amount, color }: { label: string; count: number; amount: number; color: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-slate-400">{label} <span className="text-slate-500">({count})</span></span>
      <span className={`text-sm font-semibold ${color}`}>{formatMoney(amount)}</span>
    </div>
  );
}
