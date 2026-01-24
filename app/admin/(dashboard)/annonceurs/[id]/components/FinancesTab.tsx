"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle2,
  CreditCard,
  Calendar,
  ChevronDown,
  Loader2,
  Plus,
  X,
} from "lucide-react";

interface FinancesTabProps {
  announcerId: Id<"users">;
}

const formatMoney = (cents: number) => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const payoutStatusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "amber" },
  processing: { label: "En cours", color: "blue" },
  completed: { label: "Effectué", color: "green" },
  failed: { label: "Échoué", color: "red" },
};

export function FinancesTab({ announcerId }: FinancesTabProps) {
  const { token } = useAdminAuth();
  const now = new Date();
  const [period, setPeriod] = useState<"month" | "year">("month");
  const [selectedDate, setSelectedDate] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );

  // Finances de l'annonceur
  const finances = useQuery(
    api.admin.announcers.getAnnouncerFinances,
    token
      ? {
          token,
          announcerId,
          period,
          date: selectedDate,
        }
      : "skip"
  );

  // Générer les options de date
  const generateDateOptions = () => {
    const options = [];
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (period === "month") {
      for (let i = 0; i < 12; i++) {
        const date = new Date(currentYear, currentMonth - i, 1);
        const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const label = date.toLocaleDateString("fr-FR", {
          month: "long",
          year: "numeric",
        });
        options.push({ value, label });
      }
    } else {
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
      setSelectedDate(
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
      );
    }
  };

  if (!finances) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      {/* Earnings Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          className="bg-slate-900 rounded-xl p-5 border border-slate-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <p className="text-slate-400 text-sm">En attente</p>
          <p className="text-2xl font-bold text-white">
            {formatMoney(finances.earnings.pending)}
          </p>
        </motion.div>

        <motion.div
          className="bg-slate-900 rounded-xl p-5 border border-slate-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <p className="text-slate-400 text-sm">Validé (à virer)</p>
          <p className="text-2xl font-bold text-white">
            {formatMoney(finances.earnings.completed)}
          </p>
        </motion.div>

        <motion.div
          className="bg-slate-900 rounded-xl p-5 border border-slate-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CreditCard className="w-5 h-5 text-green-400" />
            </div>
          </div>
          <p className="text-slate-400 text-sm">Viré</p>
          <p className="text-2xl font-bold text-green-400">
            {formatMoney(finances.earnings.paid)}
          </p>
        </motion.div>

        <motion.div
          className="bg-slate-900 rounded-xl p-5 border border-primary/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="text-slate-400 text-sm">Total période</p>
          <p className="text-2xl font-bold text-primary">
            {formatMoney(finances.earnings.total)}
          </p>
        </motion.div>
      </div>

      {/* Next Payout */}
      {finances.nextPayout && (
        <motion.div
          className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl p-6 border border-green-500/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-400 font-medium">Prochain virement prévu</p>
              <p className="text-sm text-green-400/70 flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4" />
                {formatDate(finances.nextPayout.date)}
              </p>
            </div>
            <p className="text-3xl font-bold text-green-400">
              {formatMoney(finances.nextPayout.estimatedAmount)}
            </p>
          </div>
        </motion.div>
      )}

      {/* Payouts History */}
      <motion.div
        className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-slate-400" />
            Historique des virements
          </h3>
        </div>

        {finances.payouts.length > 0 ? (
          <div className="divide-y divide-slate-800">
            {finances.payouts.map((payout: { id: string; amount: number; missionsCount: number; date: number; status: string }) => {
              const status = payoutStatusLabels[payout.status] || {
                label: payout.status,
                color: "slate",
              };

              return (
                <div
                  key={payout.id}
                  className="p-4 flex items-center justify-between hover:bg-slate-800/30"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-slate-800 rounded-lg">
                      <CreditCard className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {formatMoney(payout.amount)}
                      </p>
                      <p className="text-sm text-slate-400">
                        {payout.missionsCount} mission(s) • {formatDate(payout.date)}
                      </p>
                    </div>
                  </div>
                  <span
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor:
                        status.color === "amber"
                          ? "rgba(245, 158, 11, 0.2)"
                          : status.color === "blue"
                          ? "rgba(59, 130, 246, 0.2)"
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
                          : status.color === "green"
                          ? "rgb(74, 222, 128)"
                          : status.color === "red"
                          ? "rgb(248, 113, 113)"
                          : "rgb(148, 163, 184)",
                    }}
                  >
                    {status.label}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <CreditCard className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Aucun virement pour cette période</p>
          </div>
        )}
      </motion.div>

      {/* Deductions / Credits */}
      {finances.credits.length > 0 && (
        <motion.div
          className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-slate-400" />
              Déductions / Avoirs clients liés
            </h3>
          </div>

          <div className="divide-y divide-slate-800">
            {finances.credits.map((credit: { id: string; amount: number; reason: string; status: string; createdAt: number }) => (
              <div
                key={credit.id}
                className="p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-white">{credit.reason}</p>
                  <p className="text-sm text-slate-400">
                    {formatDate(credit.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-red-400 font-medium">
                    -{formatMoney(credit.amount)}
                  </p>
                  <p
                    className={`text-xs ${
                      credit.status === "active"
                        ? "text-green-400"
                        : "text-slate-400"
                    }`}
                  >
                    {credit.status === "active"
                      ? "Actif"
                      : credit.status === "used"
                      ? "Utilisé"
                      : "Annulé"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
