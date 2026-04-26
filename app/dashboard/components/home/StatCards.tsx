"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { HelpCircle, Clock, Calendar, CheckCircle } from "lucide-react";

interface StatCardsProps {
  pendingAcceptance: number;
  inProgress: number;
  upcoming: number;
  completed: number;
}

export function StatCards({ pendingAcceptance, inProgress, upcoming, completed }: StatCardsProps) {
  const stats = [
    {
      label: "À accepter",
      value: pendingAcceptance,
      icon: HelpCircle,
      href: "/dashboard/missions?tab=pending_acceptance",
      iconBg: "#fdf8ec",
      iconBorder: "#f4e6c1",
      iconColor: "#7a5b1a",
    },
    {
      label: "En cours",
      value: inProgress,
      icon: Clock,
      href: "/dashboard/missions?tab=in_progress",
      iconBg: "#f7f5ef",
      iconBorder: "#ece9e1",
      iconColor: "#1f1f1d",
    },
    {
      label: "À venir",
      value: upcoming,
      icon: Calendar,
      href: "/dashboard/missions?tab=upcoming",
      iconBg: "#fcfaf4",
      iconBorder: "#f1ede3",
      iconColor: "#3a3a38",
    },
    {
      label: "Terminées",
      value: completed,
      icon: CheckCircle,
      href: "/dashboard/missions?tab=completed",
      iconBg: "#f5f9f6",
      iconBorder: "#cfdbd3",
      iconColor: "#1f3a33",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="grid grid-cols-2 md:grid-cols-4 gap-3"
    >
      {stats.map((stat) => (
        <Link
          key={stat.label}
          href={stat.href}
          className="bg-white p-4 transition-all hover:shadow-[0_10px_30px_rgba(30,30,28,0.06)] hover:-translate-y-0.5"
          style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: stat.iconBg, border: `1px solid ${stat.iconBorder}` }}
            >
              <stat.icon className="w-4 h-4" style={{ color: stat.iconColor }} />
            </div>
          </div>
          <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-0.5">
            {stat.label}
          </div>
          <p className="text-[28px] font-semibold text-[#1f1f1d] tracking-[-0.02em] leading-none">
            {stat.value}
          </p>
        </Link>
      ))}
    </motion.div>
  );
}
