"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Search,
  MessageSquare,
  Calendar,
  PawPrint,
  FileText,
  Heart,
  Settings,
  LifeBuoy,
} from "lucide-react";

const shortcuts = [
  { label: "Rechercher", href: "/recherche", icon: Search, bg: "bg-primary/10", color: "text-primary" },
  { label: "Messages", href: "/client/messagerie", icon: MessageSquare, bg: "bg-blue-50", color: "text-blue-600" },
  { label: "Réservations", href: "/client/reservations", icon: Calendar, bg: "bg-purple-50", color: "text-purple-600" },
  { label: "Mes animaux", href: "/client/mes-animaux", icon: PawPrint, bg: "bg-secondary/10", color: "text-secondary" },
  { label: "Factures", href: "/client/factures", icon: FileText, bg: "bg-amber-50", color: "text-amber-600" },
  { label: "Favoris", href: "/client/favoris", icon: Heart, bg: "bg-pink-50", color: "text-pink-600" },
  { label: "Paramètres", href: "/client/parametres", icon: Settings, bg: "bg-gray-100", color: "text-gray-600" },
  { label: "Support", href: "/client/tickets", icon: LifeBuoy, bg: "bg-red-50", color: "text-red-600" },
];

export function QuickActions() {
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
