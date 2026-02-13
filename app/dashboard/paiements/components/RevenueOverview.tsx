"use client";

import { motion } from "framer-motion";
import { TrendingUp, CheckCircle, Banknote } from "lucide-react";
import { formatPrice, type PaymentStats } from "../types";
import type { AuthorizedPayment } from "../types";

export function RevenueOverview({
  stats,
  authorizedPayments,
}: {
  stats: PaymentStats;
  authorizedPayments: AuthorizedPayment[];
}) {
  // Prévisionnel = upcoming + in_progress (earnings nets)
  const forecastAmount = authorizedPayments
    .filter((m) => m.status === "upcoming" || m.status === "in_progress")
    .reduce((sum, m) => sum + m.announcerEarnings, 0);

  // Validé = completed en attente de versement
  const validatedAmount = authorizedPayments
    .filter((m) => m.status === "completed")
    .reduce((sum, m) => sum + m.announcerEarnings, 0);

  // Encaissé = total virements reçus
  const collectedAmount = stats.totalCollected;

  const cards = [
    {
      label: "Pr\u00E9visionnel",
      description: "Missions \u00E0 venir et en cours",
      amount: forecastAmount,
      icon: TrendingUp,
      gradient: "from-primary/10 to-primary/5",
      iconBg: "bg-primary/15",
      iconColor: "text-primary",
      valueColor: "text-primary",
    },
    {
      label: "Valid\u00E9",
      description: "En attente de versement",
      amount: validatedAmount,
      icon: CheckCircle,
      gradient: "from-purple-100/60 to-purple-50/40",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      valueColor: "text-purple-600",
    },
    {
      label: "Encaiss\u00E9",
      description: "Virements re\u00E7us",
      amount: collectedAmount,
      icon: Banknote,
      gradient: "from-green-100/60 to-green-50/40",
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      valueColor: "text-green-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ y: -4 }}
          className={`rounded-2xl bg-gradient-to-br ${card.gradient} bg-white p-6 shadow-lg transition-shadow hover:shadow-xl`}
        >
          <div className="mb-3 flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.iconBg}`}
            >
              <card.icon className={`h-5 w-5 ${card.iconColor}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {card.label}
              </p>
              <p className="text-xs text-text-light">{card.description}</p>
            </div>
          </div>
          <p className={`text-3xl font-bold ${card.valueColor}`}>
            {formatPrice(card.amount)}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
