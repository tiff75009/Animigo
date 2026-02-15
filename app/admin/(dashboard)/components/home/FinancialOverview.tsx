"use client";

import { motion } from "framer-motion";
import {
  Wallet,
  Receipt,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";

interface FinancialOverviewProps {
  financial: {
    thisMonthRevenue: number;
    lastMonthRevenue: number;
    revenueVariation: number;
    thisMonthMissions: number;
    pendingPayouts: number;
    pendingPayoutsCount: number;
  };
}

export default function FinancialOverview({ financial }: FinancialOverviewProps) {
  const metrics = [
    {
      label: "Commissions du mois",
      value: `${(financial.thisMonthRevenue / 100).toFixed(2)} €`,
      variation: financial.revenueVariation,
      icon: Wallet,
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/20",
    },
    {
      label: "Missions payées",
      value: financial.thisMonthMissions.toString(),
      icon: Receipt,
      iconColor: "text-blue-400",
      iconBg: "bg-blue-500/20",
    },
    {
      label: "Virements en attente",
      value: `${(financial.pendingPayouts / 100).toFixed(2)} €`,
      subtitle: financial.pendingPayoutsCount > 0
        ? `${financial.pendingPayoutsCount} virement${financial.pendingPayoutsCount > 1 ? "s" : ""}`
        : undefined,
      icon: ArrowUpRight,
      iconColor: "text-orange-400",
      iconBg: "bg-orange-500/20",
    },
  ];

  return (
    <motion.div
      className="bg-slate-900 rounded-xl p-6 border border-slate-800"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Finances</h2>
        <Link
          href="/admin/finances"
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          Voir tout
        </Link>
      </div>
      <div className="space-y-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className={`${metric.iconBg} p-2 rounded-lg`}>
                <metric.icon className={`w-4 h-4 ${metric.iconColor}`} />
              </div>
              <div>
                <p className="text-sm text-slate-400">{metric.label}</p>
                {"subtitle" in metric && metric.subtitle && (
                  <p className="text-xs text-slate-500">{metric.subtitle}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-white font-semibold">{metric.value}</p>
              {"variation" in metric && metric.variation !== undefined && metric.variation !== 0 && (
                <div className="flex items-center justify-end gap-1">
                  {metric.variation >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-400" />
                  )}
                  <span
                    className={`text-xs ${
                      metric.variation >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {metric.variation > 0 ? "+" : ""}
                    {metric.variation}%
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
