"use client";

import { useState } from "react";
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
  ArrowUpRight,
  Loader2,
  Users,
  CreditCard,
} from "lucide-react";

// Formater un montant en euros
const formatMoney = (cents: number) => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
};

// Formater une date
const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function FinancesPage() {
  const { token } = useAdminAuth();
  const now = new Date();
  const [period, setPeriod] = useState<"month" | "year">("month");
  const [selectedDate, setSelectedDate] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );

  // Statistiques des commissions
  const commissionStats = useQuery(
    api.admin.finances.getCommissionStats,
    token ? { token, period, date: selectedDate } : "skip"
  );

  // Statistiques des virements
  const payoutStats = useQuery(
    api.admin.finances.getPayoutStats,
    token ? { token, period, date: selectedDate } : "skip"
  );

  // Liste des virements programmés
  const payouts = useQuery(
    api.admin.finances.listPayouts,
    token ? { token, status: "pending", limit: 10 } : "skip"
  );

  // Stats des avoirs
  const creditStats = useQuery(
    api.admin.credits.getCreditStats,
    token ? { token } : "skip"
  );

  // Générer les options de date
  const generateDateOptions = () => {
    const options = [];
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (period === "month") {
      // 12 derniers mois
      for (let i = 0; i < 12; i++) {
        const date = new Date(currentYear, currentMonth - i, 1);
        const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const label = date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
        options.push({ value, label });
      }
    } else {
      // 5 dernières années
      for (let i = 0; i < 5; i++) {
        const year = currentYear - i;
        options.push({ value: String(year), label: String(year) });
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

  const isLoading = !commissionStats || !payoutStats;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Wallet className="w-8 h-8 text-primary" />
            Finances & Commissions
          </h1>
          <p className="text-slate-400 mt-1">
            Suivez les revenus de la plateforme et les virements annonceurs
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => handlePeriodChange("month")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                period === "month"
                  ? "bg-primary text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Mois
            </button>
            <button
              onClick={() => handlePeriodChange("year")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                period === "year"
                  ? "bg-primary text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Année
            </button>
          </div>

          <div className="relative">
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="appearance-none bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 pr-10 text-white focus:outline-none focus:border-primary"
            >
              {generateDateOptions().map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Commission Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <motion.div
              className="bg-slate-900 rounded-xl p-6 border border-slate-800"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-xs text-slate-500 uppercase">À venir</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {formatMoney(commissionStats?.upcoming || 0)}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Missions en attente/à venir
              </p>
            </motion.div>

            <motion.div
              className="bg-slate-900 rounded-xl p-6 border border-slate-800"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-amber-400" />
                </div>
                <span className="text-xs text-slate-500 uppercase">Validées</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {formatMoney(commissionStats?.validated || 0)}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Missions terminées, en attente capture
              </p>
            </motion.div>

            <motion.div
              className="bg-slate-900 rounded-xl p-6 border border-slate-800"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CircleDollarSign className="w-5 h-5 text-green-400" />
                </div>
                <span className="text-xs text-slate-500 uppercase">Encaissées</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {formatMoney(commissionStats?.paid || 0)}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Paiements capturés
              </p>
            </motion.div>

            <motion.div
              className="bg-slate-900 rounded-xl p-6 border border-primary/50"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs text-slate-500 uppercase">Total</span>
              </div>
              <p className="text-2xl font-bold text-primary">
                {formatMoney(commissionStats?.total || 0)}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Commissions de la période
              </p>
            </motion.div>
          </div>

          {/* Graphique annuel */}
          {period === "year" && commissionStats?.breakdown && (
            <motion.div
              className="bg-slate-900 rounded-xl p-6 border border-slate-800 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h3 className="text-lg font-semibold text-white mb-6">
                Évolution mensuelle
              </h3>
              <div className="flex items-end gap-2 h-48">
                {commissionStats.breakdown.map((month: { month: string; upcoming: number; validated: number; paid: number }, index: number) => {
                  const total = month.upcoming + month.validated + month.paid;
                  const maxTotal = Math.max(
                    ...commissionStats.breakdown!.map(
                      (m: { upcoming: number; validated: number; paid: number }) => m.upcoming + m.validated + m.paid
                    ),
                    1
                  );
                  const heightPercent = (total / maxTotal) * 100;

                  return (
                    <div
                      key={month.month}
                      className="flex-1 flex flex-col items-center gap-2"
                    >
                      <div
                        className="w-full bg-slate-700 rounded-t relative overflow-hidden"
                        style={{ height: `${Math.max(heightPercent, 4)}%` }}
                      >
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-green-500"
                          style={{
                            height: total > 0 ? `${(month.paid / total) * 100}%` : "0%",
                          }}
                        />
                        <div
                          className="absolute left-0 right-0 bg-amber-500"
                          style={{
                            bottom: total > 0 ? `${(month.paid / total) * 100}%` : "0%",
                            height: total > 0 ? `${(month.validated / total) * 100}%` : "0%",
                          }}
                        />
                        <div
                          className="absolute left-0 right-0 bg-blue-500"
                          style={{
                            bottom: total > 0 ? `${((month.paid + month.validated) / total) * 100}%` : "0%",
                            height: total > 0 ? `${(month.upcoming / total) * 100}%` : "0%",
                          }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 capitalize">
                        {month.month}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-6 mt-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded" />
                  <span className="text-sm text-slate-400">À venir</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-amber-500 rounded" />
                  <span className="text-sm text-slate-400">Validées</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded" />
                  <span className="text-sm text-slate-400">Encaissées</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Virements Annonceurs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Stats virements */}
            <motion.div
              className="bg-slate-900 rounded-xl p-6 border border-slate-800"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-slate-400" />
                Virements annonceurs
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-slate-800 rounded-lg text-center">
                  <p className="text-xs text-slate-500 uppercase mb-1">En attente</p>
                  <p className="text-xl font-bold text-amber-400">
                    {formatMoney(payoutStats?.pending || 0)}
                  </p>
                </div>
                <div className="p-4 bg-slate-800 rounded-lg text-center">
                  <p className="text-xs text-slate-500 uppercase mb-1">En cours</p>
                  <p className="text-xl font-bold text-blue-400">
                    {formatMoney(payoutStats?.processing || 0)}
                  </p>
                </div>
                <div className="p-4 bg-slate-800 rounded-lg text-center">
                  <p className="text-xs text-slate-500 uppercase mb-1">Effectués</p>
                  <p className="text-xl font-bold text-green-400">
                    {formatMoney(payoutStats?.completed || 0)}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Stats avoirs */}
            <motion.div
              className="bg-slate-900 rounded-xl p-6 border border-slate-800"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-400" />
                Avoirs clients
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-slate-800 rounded-lg text-center">
                  <p className="text-xs text-slate-500 uppercase mb-1">Actifs</p>
                  <p className="text-xl font-bold text-green-400">
                    {formatMoney(creditStats?.totalActive || 0)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {creditStats?.activeCount || 0} avoir(s)
                  </p>
                </div>
                <div className="p-4 bg-slate-800 rounded-lg text-center">
                  <p className="text-xs text-slate-500 uppercase mb-1">Utilisés</p>
                  <p className="text-xl font-bold text-blue-400">
                    {formatMoney(creditStats?.totalUsed || 0)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {creditStats?.usedCount || 0} avoir(s)
                  </p>
                </div>
                <div className="p-4 bg-slate-800 rounded-lg text-center">
                  <p className="text-xs text-slate-500 uppercase mb-1">Expirés</p>
                  <p className="text-xl font-bold text-slate-400">
                    {formatMoney(creditStats?.totalExpired || 0)}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Prochains virements programmés */}
          <motion.div
            className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <div className="p-6 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-400" />
                Virements en attente
              </h3>
            </div>

            {payouts?.payouts && payouts.payouts.length > 0 ? (
              <div className="divide-y divide-slate-800">
                {payouts.payouts.map((payout: { _id: string; announcerName: string; missionsCount: number; announcerEmail?: string; amount: number; scheduledAt?: number; status: string }) => (
                  <div
                    key={payout._id}
                    className="p-4 hover:bg-slate-800/50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-slate-800 rounded-lg">
                        <CreditCard className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {payout.announcerName}
                        </p>
                        <p className="text-sm text-slate-400">
                          {payout.missionsCount} mission(s) • {payout.announcerEmail}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold text-white">
                          {formatMoney(payout.amount)}
                        </p>
                        {payout.scheduledAt && (
                          <p className="text-xs text-slate-500">
                            Prévu le {formatDate(payout.scheduledAt)}
                          </p>
                        )}
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          payout.status === "pending"
                            ? "bg-amber-500/20 text-amber-400"
                            : payout.status === "processing"
                            ? "bg-blue-500/20 text-blue-400"
                            : payout.status === "completed"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {payout.status === "pending"
                          ? "En attente"
                          : payout.status === "processing"
                          ? "En cours"
                          : payout.status === "completed"
                          ? "Effectué"
                          : "Échoué"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <CreditCard className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Aucun virement en attente</p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}
