"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import type { MonthlyRevenueItem, UserInfo } from "../types";
import { formatPrice } from "../types";

interface MonthlyChartProps {
  monthlyRevenue: MonthlyRevenueItem[];
  userInfo: UserInfo;
  selectedYear: number;
}

export function MonthlyChart({
  monthlyRevenue,
  userInfo,
  selectedYear,
}: MonthlyChartProps) {
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
  const maxEarnings = Math.max(...monthlyRevenue.map((m) => m.earnings), 1);
  const isPro = userInfo.isVatSubject;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-2xl bg-white p-6 shadow-sm"
    >
      <div className="mb-5 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">
          Évolution CA mensuel — {selectedYear}
        </h2>
      </div>

      <div className="relative flex items-end gap-1.5 sm:gap-2" style={{ height: 160 }}>
        {monthlyRevenue.map((month, i) => {
          const height = maxEarnings > 0 ? (month.earnings / maxEarnings) * 100 : 0;
          const isHovered = hoveredMonth === i;

          return (
            <div
              key={i}
              className="group relative flex flex-1 flex-col items-center"
              onMouseEnter={() => setHoveredMonth(i)}
              onMouseLeave={() => setHoveredMonth(null)}
            >
              {/* Tooltip */}
              {isHovered && month.earnings > 0 && (
                <div className="absolute -top-20 left-1/2 z-10 w-max -translate-x-1/2 rounded-xl bg-gray-900 px-3 py-2 text-xs text-white shadow-lg">
                  <p className="font-semibold">{formatPrice(month.earnings)}</p>
                  {isPro && (
                    <p className="text-gray-300">
                      HT {formatPrice(month.earningsHT)}
                    </p>
                  )}
                  <p className="text-gray-400">
                    {month.missionsCount} mission{month.missionsCount > 1 ? "s" : ""}
                  </p>
                  <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-gray-900" />
                </div>
              )}

              {/* Barre */}
              <div className="flex w-full items-end" style={{ height: 130 }}>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(height, month.earnings > 0 ? 4 : 0)}%` }}
                  transition={{ delay: 0.2 + i * 0.03, duration: 0.4 }}
                  className={`w-full rounded-t transition-colors ${
                    isHovered ? "bg-primary" : "bg-primary/60"
                  } ${month.earnings === 0 ? "bg-gray-100" : ""}`}
                />
              </div>

              {/* Label mois */}
              <span className="mt-2 text-[10px] font-medium text-gray-400 sm:text-xs">
                {month.monthLabel}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
