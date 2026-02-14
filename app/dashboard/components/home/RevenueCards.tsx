"use client";

import { motion } from "framer-motion";
import { Clock, CheckCircle, TrendingUp } from "lucide-react";

interface RevenueCardsProps {
  upcomingRevenue: number;
  completedRevenue: number;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

export function RevenueCards({ upcomingRevenue, completedRevenue }: RevenueCardsProps) {
  const total = upcomingRevenue + completedRevenue;

  const cards = [
    {
      label: "À venir",
      value: upcomingRevenue,
      icon: Clock,
      bg: "bg-secondary/10",
      iconBg: "bg-secondary/20",
      iconColor: "text-secondary",
      valueColor: "text-secondary",
    },
    {
      label: "Encaissé",
      value: completedRevenue,
      icon: CheckCircle,
      bg: "bg-green-50",
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      valueColor: "text-green-700",
    },
    {
      label: "Total",
      value: total,
      icon: TrendingUp,
      bg: "bg-gradient-to-br from-primary/10 to-primary/5",
      iconBg: "bg-primary/20",
      iconColor: "text-primary",
      valueColor: "text-primary",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.05 }}
          className={`rounded-2xl p-5 shadow-sm ${card.bg}`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 ${card.iconBg} rounded-xl flex items-center justify-center`}>
              <card.icon className={`w-5 h-5 ${card.iconColor}`} />
            </div>
            <span className="text-sm font-medium text-text-light">{card.label}</span>
          </div>
          <p className={`text-2xl font-bold ${card.valueColor}`}>
            {formatCurrency(card.value)}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
