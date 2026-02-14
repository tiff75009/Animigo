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
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Bonjour {displayName} !
        </h1>
        <p className="text-text-light mt-0.5 capitalize">{today}</p>
      </div>
      <div className="flex items-center gap-2">
        {pendingAcceptance > 0 && (
          <Link
            href="/dashboard/missions?tab=pending_acceptance"
            className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 rounded-xl hover:bg-amber-100 transition-colors text-sm font-medium"
          >
            <Bell className="w-4 h-4" />
            <span>{pendingAcceptance} à accepter</span>
          </Link>
        )}
        {totalUnread > 0 && (
          <Link
            href="/dashboard/messagerie"
            className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors text-sm font-medium"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{totalUnread} message{totalUnread > 1 ? "s" : ""}</span>
          </Link>
        )}
      </div>
    </motion.div>
  );
}
