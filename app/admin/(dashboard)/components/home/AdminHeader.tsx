"use client";

import { motion } from "framer-motion";

interface AdminHeaderProps {
  adminName: string;
}

export default function AdminHeader({ adminName }: AdminHeaderProps) {
  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <motion.div
      className="mb-6"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h1 className="text-3xl font-bold text-white">Dashboard</h1>
      <p className="text-slate-400 mt-1">
        Bonjour {adminName} — {today}
      </p>
    </motion.div>
  );
}
