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
  { label: "Planning", href: "/dashboard/planning", icon: Calendar },
  { label: "Messages", href: "/dashboard/messagerie", icon: MessageSquare },
  { label: "Services", href: "/dashboard/services", icon: Briefcase },
  { label: "Paiements", href: "/dashboard/paiements", icon: Euro },
  { label: "Missions", href: "/dashboard/missions", icon: ClipboardList },
  { label: "Profil", href: "/dashboard/profil", icon: User },
  { label: "Avis", href: "/dashboard/avis", icon: Star },
  { label: "Support", href: "/dashboard/tickets", icon: LifeBuoy },
];

export function QuickShortcuts() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
    >
      <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-1">
        Navigation
      </div>
      <h3 className="text-base font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0 mb-3">
        Accès rapides
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {shortcuts.map((shortcut) => (
          <Link
            key={shortcut.label}
            href={shortcut.href}
            className="flex items-center gap-2.5 p-3 transition-all hover:bg-[#fafafa] hover:-translate-y-0.5"
            style={{
              borderRadius: 12,
              background: "#fff",
              border: "1px solid #ece9e1",
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "#f5f9f6", border: "1px solid #cfdbd3" }}
            >
              <shortcut.icon className="w-3.5 h-3.5" style={{ color: "#1f3a33" }} />
            </div>
            <span className="text-[13px] font-semibold text-[#1f1f1d] tracking-[-0.01em]">
              {shortcut.label}
            </span>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
