"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Calendar,
  MessageSquare,
  Briefcase,
  Euro,
  ClipboardList,
  User,
  Star,
  LifeBuoy,
} from "lucide-react";

const shortcuts = [
  { label: "Planning", href: "/dashboard/planning", icon: Calendar, bg: "bg-purple-50", color: "text-purple-600" },
  { label: "Messages", href: "/dashboard/messagerie", icon: MessageSquare, bg: "bg-blue-50", color: "text-blue-600" },
  { label: "Services", href: "/dashboard/services", icon: Briefcase, bg: "bg-green-50", color: "text-green-600" },
  { label: "Paiements", href: "/dashboard/paiements", icon: Euro, bg: "bg-amber-50", color: "text-amber-600" },
  { label: "Missions", href: "/dashboard/missions", icon: ClipboardList, bg: "bg-indigo-50", color: "text-indigo-600" },
  { label: "Profil", href: "/dashboard/profil", icon: User, bg: "bg-pink-50", color: "text-pink-600" },
  { label: "Avis", href: "/dashboard/avis", icon: Star, bg: "bg-yellow-50", color: "text-yellow-600" },
  { label: "Support", href: "/dashboard/tickets", icon: LifeBuoy, bg: "bg-red-50", color: "text-red-600" },
];

export function QuickShortcuts() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
    >
      <h3 className="text-lg font-semibold text-foreground mb-3">Accès rapides</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {shortcuts.map((shortcut) => (
          <Link
            key={shortcut.label}
            href={shortcut.href}
            className={`flex items-center gap-3 p-4 ${shortcut.bg} rounded-xl hover:opacity-80 transition-opacity`}
          >
            <shortcut.icon className={`w-5 h-5 ${shortcut.color}`} />
            <span className="font-medium text-sm text-foreground">{shortcut.label}</span>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
