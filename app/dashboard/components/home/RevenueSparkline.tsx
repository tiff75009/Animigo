"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MonthData {
  month: string;
  earnings: number;
  count: number;
}

interface RevenueSparklineProps {
  data: MonthData[];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

export function RevenueSparkline({ data }: RevenueSparklineProps) {
  if (!data) return null;
  const hasData = data.some((m) => m.earnings > 0);
  if (!hasData) return null;

  const maxEarnings = Math.max(...data.map((m) => m.earnings), 1);

  // Tendance : comparer le mois courant au précédent
  const current = data[data.length - 1];
  const previous = data[data.length - 2];
  const trend = previous && previous.earnings > 0
    ? Math.round(((current.earnings - previous.earnings) / previous.earnings) * 100)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="bg-white rounded-2xl p-5 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Revenus (6 mois)</h3>
        {trend !== null && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            trend > 0 ? "text-green-600" : trend < 0 ? "text-red-500" : "text-gray-500"
          }`}>
            {trend > 0 ? <TrendingUp className="w-3.5 h-3.5" /> :
             trend < 0 ? <TrendingDown className="w-3.5 h-3.5" /> :
             <Minus className="w-3.5 h-3.5" />}
            <span>{trend > 0 ? "+" : ""}{trend}%</span>
          </div>
        )}
      </div>

      {/* Barchart */}
      <div className="flex items-end gap-1.5" style={{ height: 80 }}>
        {data.map((month, i) => {
          const pct = (month.earnings / maxEarnings) * 100;
          const isLast = i === data.length - 1;
          return (
            <div key={month.month} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full relative group" style={{ height: 60 }}>
                <div
                  className={`absolute bottom-0 w-full rounded-t transition-all ${
                    isLast ? "bg-primary" : "bg-primary/30"
                  }`}
                  style={{ height: `${Math.max(pct, 4)}%` }}
                />
                {/* Tooltip au hover */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                  {formatCurrency(month.earnings)}
                </div>
              </div>
              <span className="text-[10px] text-text-light capitalize">{month.month}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
