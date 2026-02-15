"use client";

import { motion } from "framer-motion";
import { Headphones, Scale } from "lucide-react";
import Link from "next/link";

interface SupportSummaryProps {
  support: {
    openTickets: number;
    inProgressTickets: number;
  };
  openDisputes: number;
}

export default function SupportSummary({ support, openDisputes }: SupportSummaryProps) {
  const rows = [
    {
      label: "Tickets ouverts",
      value: support.openTickets,
      icon: Headphones,
      iconColor: "text-amber-400",
      href: "/admin/support",
    },
    {
      label: "Tickets en cours",
      value: support.inProgressTickets,
      icon: Headphones,
      iconColor: "text-blue-400",
      href: "/admin/support",
    },
    {
      label: "Réclamations ouvertes",
      value: openDisputes,
      icon: Scale,
      iconColor: "text-red-400",
      href: "/admin/reclamations",
    },
  ];

  return (
    <motion.div
      className="bg-slate-900 rounded-xl p-6 border border-slate-800"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Support</h2>
        <Link
          href="/admin/support"
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          Voir tout
        </Link>
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <Link
            key={row.label}
            href={row.href}
            className="flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <row.icon className={`w-4 h-4 ${row.iconColor}`} />
              <span className="text-sm text-slate-300">{row.label}</span>
            </div>
            <span className="text-white font-semibold">{row.value}</span>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
