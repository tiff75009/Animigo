"use client";

import { motion } from "framer-motion";
import { Receipt } from "lucide-react";
import type { PaymentStats, MonthlyRevenueItem } from "../types";
import { formatPrice } from "../types";

interface ProVatSummaryProps {
  stats: PaymentStats;
  monthlyRevenue: MonthlyRevenueItem[];
  currentMonth: number;
}

export function ProVatSummary({
  stats,
  monthlyRevenue,
  currentMonth,
}: ProVatSummaryProps) {
  const currentMonthData = monthlyRevenue[currentMonth];

  const items = [
    {
      label: "TVA collectée (mois)",
      value: currentMonthData?.vatAmount || 0,
    },
    {
      label: "TVA cumulée (année)",
      value: stats.totalVatCollected,
    },
    {
      label: "TVA sur commissions (mois)",
      value: currentMonthData?.vatOnCommission || 0,
    },
    {
      label: "Total à déclarer",
      value: stats.totalVatCollected + stats.totalVatOnCommission,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 p-5 shadow-sm"
    >
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-xl bg-indigo-100 p-2">
          <Receipt className="h-5 w-5 text-indigo-600" />
        </div>
        <h2 className="text-sm font-semibold text-indigo-900">
          Récapitulatif TVA
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl bg-white/70 p-3">
            <p className="text-[11px] font-medium text-indigo-600/70">
              {item.label}
            </p>
            <p className="mt-1 text-lg font-bold text-indigo-900">
              {formatPrice(item.value)}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
