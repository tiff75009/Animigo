"use client";

import { motion } from "framer-motion";
import {
  Shield,
  Users,
  Wallet,
  Calendar,
  Megaphone,
  Headphones,
  Settings,
  Key,
} from "lucide-react";
import Link from "next/link";

const actions = [
  { label: "Modérer", href: "/admin/moderation/services", icon: Shield, color: "text-amber-400" },
  { label: "Utilisateurs", href: "/admin/utilisateurs", icon: Users, color: "text-blue-400" },
  { label: "Finances", href: "/admin/finances", icon: Wallet, color: "text-emerald-400" },
  { label: "Réservations", href: "/admin/reservations", icon: Calendar, color: "text-purple-400" },
  { label: "Annonceurs", href: "/admin/annonceurs", icon: Megaphone, color: "text-pink-400" },
  { label: "Support", href: "/admin/support", icon: Headphones, color: "text-cyan-400" },
  { label: "Paramètres", href: "/admin/parametres", icon: Settings, color: "text-slate-400" },
  { label: "Clés dev", href: "/admin/dev-keys", icon: Key, color: "text-orange-400" },
];

export default function AdminQuickActions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
    >
      <h2 className="text-lg font-semibold text-white mb-3">Actions rapides</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex flex-col items-center gap-2 p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors"
          >
            <action.icon className={`w-5 h-5 ${action.color}`} />
            <span className="text-xs text-slate-300 text-center">{action.label}</span>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
