"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Bell, MessageSquare } from "lucide-react";

interface WelcomeHeaderProps {
  displayName: string;
  pendingAcceptance: number;
  totalUnread: number;
}

export function WelcomeHeader({ displayName, pendingAcceptance, totalUnread }: WelcomeHeaderProps) {
  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
    >
      <div>
        <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] capitalize mb-1">
          {today}
        </div>
        <h1 className="text-[24px] md:text-[28px] font-semibold text-[#1f1f1d] tracking-[-0.02em] m-0">
          Bonjour {displayName}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        {pendingAcceptance > 0 && (
          <Link
            href="/dashboard/missions?tab=pending_acceptance"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors hover:bg-[#fdf8ec]"
            style={{ background: "#fff", border: "1px solid #f4e6c1", color: "#7a5b1a" }}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>{pendingAcceptance} à accepter</span>
          </Link>
        )}
        {totalUnread > 0 && (
          <Link
            href="/dashboard/messagerie"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-opacity hover:opacity-90"
            style={{ background: "#1f3a33", color: "#f7f5ef" }}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{totalUnread} message{totalUnread > 1 ? "s" : ""}</span>
          </Link>
        )}
      </div>
    </motion.div>
  );
}
