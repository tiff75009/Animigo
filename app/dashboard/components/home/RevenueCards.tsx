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
      iconBg: "#f7f5ef",
      iconBorder: "#ece9e1",
      iconColor: "#1f1f1d",
      featured: false,
    },
    {
      label: "Encaissé",
      value: completedRevenue,
      icon: CheckCircle,
      iconBg: "#f5f9f6",
      iconBorder: "#cfdbd3",
      iconColor: "#1f3a33",
      featured: false,
    },
    {
      label: "Total",
      value: total,
      icon: TrendingUp,
      iconBg: "rgba(247,245,239,0.25)",
      iconBorder: "rgba(247,245,239,0.4)",
      iconColor: "#f7f5ef",
      featured: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.05 }}
          className="p-4 transition-all hover:shadow-[0_10px_30px_rgba(30,30,28,0.06)]"
          style={
            card.featured
              ? { borderRadius: 14, background: "#1f3a33", border: "1px solid #1f3a33" }
              : { borderRadius: 14, background: "#fff", border: "1px solid #ece9e1" }
          }
        >
          <div className="flex items-center justify-between mb-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: card.iconBg, border: `1px solid ${card.iconBorder}` }}
            >
              <card.icon className="w-4 h-4" style={{ color: card.iconColor }} />
            </div>
          </div>
          <div
            className="text-[10px] font-medium uppercase tracking-[0.1em] mb-1"
            style={{ color: card.featured ? "rgba(247,245,239,0.7)" : "#9c9484" }}
          >
            {card.label}
          </div>
          <p
            className="text-[24px] font-semibold tracking-[-0.02em] leading-none"
            style={{ color: card.featured ? "#f7f5ef" : "#1f1f1d" }}
          >
            {formatCurrency(card.value)}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
