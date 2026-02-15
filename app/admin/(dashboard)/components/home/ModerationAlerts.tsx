"use client";

import { motion } from "framer-motion";
import { AlertTriangle, FileCheck, Shield, Scale, ClipboardList } from "lucide-react";
import Link from "next/link";

interface ModerationAlertsProps {
  moderation: {
    pendingServices: number;
    pendingVerifications: number;
    pendingSapDeclarations: number;
    openDisputes: number;
    total: number;
  };
}

export default function ModerationAlerts({ moderation }: ModerationAlertsProps) {
  if (moderation.total === 0) return null;

  const items = [
    {
      label: "Services en attente",
      count: moderation.pendingServices,
      href: "/admin/moderation/services",
      icon: ClipboardList,
    },
    {
      label: "Vérifications",
      count: moderation.pendingVerifications,
      href: "/admin/verifications",
      icon: FileCheck,
    },
    {
      label: "Déclarations SAP",
      count: moderation.pendingSapDeclarations,
      href: "/admin/sap",
      icon: Shield,
    },
    {
      label: "Réclamations",
      count: moderation.openDisputes,
      href: "/admin/reclamations",
      icon: Scale,
    },
  ].filter((item) => item.count > 0);

  return (
    <motion.div
      className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className="flex items-center gap-3 mb-3">
        <AlertTriangle className="w-5 h-5 text-amber-400" />
        <span className="text-amber-400 font-semibold text-sm">
          Modération — {moderation.total} élément{moderation.total > 1 ? "s" : ""} en attente
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors text-sm"
          >
            <item.icon className="w-4 h-4 text-amber-400" />
            <span className="text-slate-300">{item.label}</span>
            <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-semibold rounded">
              {item.count}
            </span>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
