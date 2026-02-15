"use client";

import { motion } from "framer-motion";
import { Wallet, Users, Briefcase, Ticket, TrendingUp, TrendingDown } from "lucide-react";

interface KpiCardsProps {
  kpis: {
    monthRevenue: number;
    revenueVariation: number;
    totalUsers: number;
    newUsersWeek: number;
    activeMissions: number;
    openTickets: number;
  };
}

export default function KpiCards({ kpis }: KpiCardsProps) {
  const cards = [
    {
      label: "Revenus du mois",
      value: `${(kpis.monthRevenue / 100).toFixed(2)} €`,
      badge: kpis.revenueVariation !== 0
        ? `${kpis.revenueVariation > 0 ? "+" : ""}${kpis.revenueVariation}%`
        : null,
      badgePositive: kpis.revenueVariation >= 0,
      icon: Wallet,
      iconBg: "bg-emerald-500/20",
      iconColor: "text-emerald-400",
    },
    {
      label: "Utilisateurs",
      value: kpis.totalUsers.toLocaleString("fr-FR"),
      badge: kpis.newUsersWeek > 0 ? `+${kpis.newUsersWeek} cette semaine` : null,
      badgePositive: true,
      icon: Users,
      iconBg: "bg-blue-500/20",
      iconColor: "text-blue-400",
    },
    {
      label: "Missions actives",
      value: kpis.activeMissions.toLocaleString("fr-FR"),
      badge: null,
      badgePositive: true,
      icon: Briefcase,
      iconBg: "bg-purple-500/20",
      iconColor: "text-purple-400",
    },
    {
      label: "Tickets ouverts",
      value: kpis.openTickets.toLocaleString("fr-FR"),
      badge: null,
      badgePositive: true,
      icon: Ticket,
      iconBg: "bg-amber-500/20",
      iconColor: "text-amber-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.label}
          className="bg-slate-900 rounded-xl p-6 border border-slate-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.08 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">{card.label}</p>
              <p className="text-2xl font-bold text-white mt-1">{card.value}</p>
              {card.badge && (
                <div className="flex items-center gap-1 mt-1">
                  {card.badgePositive ? (
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-400" />
                  )}
                  <span
                    className={`text-xs font-medium ${
                      card.badgePositive ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {card.badge}
                  </span>
                </div>
              )}
            </div>
            <div className={`${card.iconBg} p-3 rounded-lg`}>
              <card.icon className={`w-6 h-6 ${card.iconColor}`} />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
