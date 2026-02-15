"use client";

import { motion } from "framer-motion";
import { UserPlus, ClipboardList } from "lucide-react";

interface RecentActivityProps {
  recentActivity: {
    latestSignups: {
      name: string;
      accountType: string;
      createdAt: number;
    }[];
    latestMissions: {
      clientName: string;
      serviceName: string;
      status: string;
      amount: number;
      createdAt: number;
    }[];
  };
}

const accountTypeLabels: Record<string, { label: string; color: string }> = {
  annonceur_pro: { label: "Pro", color: "bg-purple-500/20 text-purple-400" },
  annonceur_particulier: { label: "Particulier", color: "bg-blue-500/20 text-blue-400" },
  utilisateur: { label: "Client", color: "bg-emerald-500/20 text-emerald-400" },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending_acceptance: { label: "En attente", color: "bg-amber-500/20 text-amber-400" },
  pending_confirmation: { label: "À confirmer", color: "bg-orange-500/20 text-orange-400" },
  upcoming: { label: "À venir", color: "bg-blue-500/20 text-blue-400" },
  in_progress: { label: "En cours", color: "bg-purple-500/20 text-purple-400" },
  completed: { label: "Terminée", color: "bg-emerald-500/20 text-emerald-400" },
  refused: { label: "Refusée", color: "bg-red-500/20 text-red-400" },
  cancelled: { label: "Annulée", color: "bg-slate-500/20 text-slate-400" },
};

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days}j`;
  return `il y a ${Math.floor(days / 7)}sem`;
}

export default function RecentActivity({ recentActivity }: RecentActivityProps) {
  return (
    <motion.div
      className="bg-slate-900 rounded-xl p-6 border border-slate-800"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
    >
      <h2 className="text-lg font-semibold text-white mb-4">Activité récente</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Derniers inscrits */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <UserPlus className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-medium text-slate-400">Derniers inscrits</h3>
          </div>
          <div className="space-y-2">
            {recentActivity.latestSignups.map((signup, i) => {
              const typeInfo = accountTypeLabels[signup.accountType] ?? {
                label: signup.accountType,
                color: "bg-slate-500/20 text-slate-400",
              };
              return (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 bg-slate-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm text-white truncate">{signup.name}</span>
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${typeInfo.color}`}
                    >
                      {typeInfo.label}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 shrink-0 ml-2">
                    {timeAgo(signup.createdAt)}
                  </span>
                </div>
              );
            })}
            {recentActivity.latestSignups.length === 0 && (
              <p className="text-sm text-slate-500 py-2">Aucune inscription récente</p>
            )}
          </div>
        </div>

        {/* Dernières missions */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-medium text-slate-400">Dernières missions</h3>
          </div>
          <div className="space-y-2">
            {recentActivity.latestMissions.map((mission, i) => {
              const statusInfo = statusLabels[mission.status] ?? {
                label: mission.status,
                color: "bg-slate-500/20 text-slate-400",
              };
              return (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 bg-slate-800/50 rounded-lg"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white truncate">
                        {mission.serviceName}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-medium rounded shrink-0 ${statusInfo.color}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {mission.clientName} · {(mission.amount / 100).toFixed(0)} €
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 shrink-0 ml-2">
                    {timeAgo(mission.createdAt)}
                  </span>
                </div>
              );
            })}
            {recentActivity.latestMissions.length === 0 && (
              <p className="text-sm text-slate-500 py-2">Aucune mission récente</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
