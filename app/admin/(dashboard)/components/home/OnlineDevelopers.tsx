"use client";

import { motion } from "framer-motion";
import { Code, Circle } from "lucide-react";
import Link from "next/link";

interface OnlineDevelopersProps {
  onlineDevs: { name: string; onlineSince: number }[] | undefined;
}

function formatDuration(startTimestamp: number): string {
  const diff = Date.now() - startTimestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}min`;
  return `${minutes}min`;
}

export default function OnlineDevelopers({ onlineDevs }: OnlineDevelopersProps) {
  return (
    <motion.div
      className="bg-slate-900 rounded-xl p-6 border border-slate-800"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <Code className="w-5 h-5 text-emerald-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Développeurs</h2>
          {onlineDevs && onlineDevs.length > 0 && (
            <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full">
              {onlineDevs.length} en ligne
            </span>
          )}
        </div>
        <Link
          href="/admin/dev-keys"
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          Gérer les clés
        </Link>
      </div>
      <div className="space-y-3">
        {onlineDevs && onlineDevs.length > 0 ? (
          onlineDevs.map((dev, index) => (
            <motion.div
              key={dev.name}
              className="flex items-center justify-between p-3 bg-slate-800 rounded-lg"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + index * 0.1 }}
            >
              <div className="flex items-center gap-3">
                <Circle className="w-2 h-2 fill-emerald-400 text-emerald-400 animate-pulse" />
                <span className="text-white font-medium">{dev.name}</span>
              </div>
              <span className="text-xs text-slate-400">
                En ligne depuis {formatDuration(dev.onlineSince)}
              </span>
            </motion.div>
          ))
        ) : (
          <p className="text-slate-500 text-sm py-2">
            Aucun développeur en ligne actuellement
          </p>
        )}
      </div>
    </motion.div>
  );
}
