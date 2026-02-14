"use client";

import { motion } from "framer-motion";
import {
  CalendarDays,
  TrendingUp,
  Clock,
  CircleCheckBig,
} from "lucide-react";
import type {
  PaymentStats,
  MonthlyRevenueItem,
  AnnualRevenueItem,
  UserInfo,
} from "../types";
import { formatPrice } from "../types";

interface RevenueCardsProps {
  stats: PaymentStats;
  monthlyRevenue: MonthlyRevenueItem[];
  annualRevenue: { currentYear: AnnualRevenueItem };
  currentMonth: number;
  userInfo: UserInfo;
}

const cards = [
  {
    key: "monthly",
    label: "CA du mois",
    icon: CalendarDays,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    key: "annual",
    label: "CA annuel",
    icon: TrendingUp,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    key: "pending",
    label: "À encaisser",
    icon: Clock,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    key: "collected",
    label: "Encaissé",
    icon: CircleCheckBig,
    color: "text-green-600",
    bg: "bg-green-50",
  },
] as const;

export function RevenueCards({
  stats,
  monthlyRevenue,
  annualRevenue,
  currentMonth,
  userInfo,
}: RevenueCardsProps) {
  const currentMonthData = monthlyRevenue[currentMonth];
  const isPro = userInfo.isVatSubject;

  const values: Record<string, { main: number; sub?: string }> = {
    monthly: {
      main: currentMonthData?.earnings || 0,
      sub:
        isPro && currentMonthData
          ? `HT ${formatPrice(currentMonthData.earningsHT)} · TVA ${formatPrice(currentMonthData.vatAmount)}`
          : undefined,
    },
    annual: {
      main: annualRevenue.currentYear.total,
      sub: isPro
        ? `HT ${formatPrice(annualRevenue.currentYear.totalHT)} · TVA ${formatPrice(annualRevenue.currentYear.vat)}`
        : undefined,
    },
    pending: {
      main: stats.totalPending,
      sub:
        stats.pendingCount > 0
          ? `${stats.pendingCount} mission${stats.pendingCount > 1 ? "s" : ""}`
          : undefined,
    },
    collected: {
      main: stats.totalCollected,
      sub:
        stats.collectedCount > 0
          ? `${stats.collectedCount} mission${stats.collectedCount > 1 ? "s" : ""}`
          : undefined,
    },
  };

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        const data = values[card.key];
        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl bg-white p-4 shadow-sm"
          >
            <div className={`mb-2 inline-flex rounded-xl ${card.bg} p-2`}>
              <Icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <p className="text-xs font-medium text-gray-500">{card.label}</p>
            <p className="mt-0.5 text-xl font-bold text-foreground">
              {formatPrice(data.main)}
            </p>
            {data.sub && (
              <p className="mt-0.5 text-[11px] text-gray-400">{data.sub}</p>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
