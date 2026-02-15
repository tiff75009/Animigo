"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Clock, Calendar, PlayCircle, CheckCircle } from "lucide-react";

interface StatsCardsProps {
  pendingAcceptance: number;
  upcoming: number;
  inProgress: number;
  completed: number;
}

export function StatsCards({ pendingAcceptance, upcoming, inProgress, completed }: StatsCardsProps) {
  const stats = [
    {
      label: "En attente",
      value: pendingAcceptance,
      icon: Clock,
      href: "/client/reservations?status=pending_acceptance",
      bg: "bg-amber-100",
      color: "text-amber-600",
    },
    {
      label: "À venir",
      value: upcoming,
      icon: Calendar,
      href: "/client/reservations?status=upcoming",
      bg: "bg-purple-100",
      color: "text-purple-600",
    },
    {
      label: "En cours",
      value: inProgress,
      icon: PlayCircle,
      href: "/client/reservations?status=in_progress",
      bg: "bg-blue-100",
      color: "text-blue-600",
    },
    {
      label: "Terminées",
      value: completed,
      icon: CheckCircle,
      href: "/client/reservations?status=completed",
      bg: "bg-green-100",
      color: "text-green-600",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="grid grid-cols-2 md:grid-cols-4 gap-4"
    >
      {stats.map((stat) => (
        <Link
          key={stat.label}
          href={stat.href}
          className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <span className="text-sm font-medium text-gray-500">{stat.label}</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{stat.value}</p>
        </Link>
      ))}
    </motion.div>
  );
}
