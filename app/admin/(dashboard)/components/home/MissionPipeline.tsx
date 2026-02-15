"use client";

import { motion } from "framer-motion";
import Link from "next/link";

interface MissionPipelineProps {
  missions: {
    pending_acceptance: number;
    pending_confirmation: number;
    upcoming: number;
    in_progress: number;
    completed: number;
    refused: number;
    cancelled: number;
  };
}

const statusConfig: {
  key: keyof MissionPipelineProps["missions"];
  label: string;
  color: string;
  barColor: string;
}[] = [
  { key: "pending_acceptance", label: "En attente d'acceptation", color: "text-amber-400", barColor: "bg-amber-400" },
  { key: "pending_confirmation", label: "En attente de confirmation", color: "text-orange-400", barColor: "bg-orange-400" },
  { key: "upcoming", label: "À venir", color: "text-blue-400", barColor: "bg-blue-400" },
  { key: "in_progress", label: "En cours", color: "text-purple-400", barColor: "bg-purple-400" },
  { key: "completed", label: "Terminées", color: "text-emerald-400", barColor: "bg-emerald-400" },
  { key: "refused", label: "Refusées", color: "text-red-400", barColor: "bg-red-400" },
  { key: "cancelled", label: "Annulées", color: "text-slate-400", barColor: "bg-slate-500" },
];

export default function MissionPipeline({ missions }: MissionPipelineProps) {
  const total = Object.values(missions).reduce((a, b) => a + b, 0);
  const maxCount = Math.max(...Object.values(missions), 1);

  return (
    <motion.div
      className="bg-slate-900 rounded-xl p-6 border border-slate-800"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">
          Pipeline missions
          <span className="text-slate-500 text-sm font-normal ml-2">({total})</span>
        </h2>
        <Link
          href="/admin/reservations"
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          Voir tout
        </Link>
      </div>
      <div className="space-y-3">
        {statusConfig.map((status) => {
          const count = missions[status.key];
          const percentage = (count / maxCount) * 100;
          return (
            <div key={status.key} className="flex items-center gap-3">
              <span className={`text-xs w-44 truncate ${status.color}`}>
                {status.label}
              </span>
              <div className="flex-1 h-5 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${status.barColor} rounded-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                />
              </div>
              <span className="text-sm text-white font-medium w-8 text-right">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
