"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { motion } from "framer-motion";
import {
  Users,
  Briefcase,
  UserCheck,
  UserX,
  TrendingUp,
  Calendar,
  Code,
  Circle,
} from "lucide-react";
import Link from "next/link";

export default function AdminDashboardPage() {
  const { token } = useAdminAuth();
  const stats = useQuery(
    api.admin.stats.getDashboardStats,
    token ? { token } : "skip"
  );
  const onlineDevs = useQuery(
    api.admin.devPresence.getOnlineDevs,
    token ? { token } : "skip"
  );

  const formatDuration = (startTimestamp: number): string => {
    const diff = Date.now() - startTimestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}min`;
    return `${minutes}min`;
  };

  const statCards = [
    {
      label: "Utilisateurs totaux",
      value: stats?.totalUsers ?? "-",
      icon: Users,
      color: "bg-blue-500",
    },
    {
      label: "Annonceurs Pro",
      value: stats?.usersByType?.annonceur_pro ?? "-",
      icon: Briefcase,
      color: "bg-purple-500",
    },
    {
      label: "Annonceurs Particuliers",
      value: stats?.usersByType?.annonceur_particulier ?? "-",
      icon: UserCheck,
      color: "bg-green-500",
    },
    {
      label: "Utilisateurs simples",
      value: stats?.usersByType?.utilisateur ?? "-",
      icon: UserX,
      color: "bg-orange-500",
    },
    {
      label: "Nouveaux (7j)",
      value: stats?.recentSignups ?? "-",
      icon: TrendingUp,
      color: "bg-pink-500",
    },
    {
      label: "Admins",
      value: stats?.admins ?? "-",
      icon: Calendar,
      color: "bg-cyan-500",
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">
          Vue d&apos;ensemble de votre plateforme
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            className="bg-slate-900 rounded-xl p-6 border border-slate-800"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">{stat.label}</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {stat.value}
                </p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity Section */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Comptes actifs/inactifs */}
        <motion.div
          className="bg-slate-900 rounded-xl p-6 border border-slate-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h2 className="text-xl font-semibold text-white mb-4">
            État des comptes
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Comptes actifs</span>
              <span className="text-green-400 font-semibold">
                {stats?.activeUsers ?? "-"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Comptes inactifs</span>
              <span className="text-red-400 font-semibold">
                {stats?.inactiveUsers ?? "-"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Emails vérifiés</span>
              <span className="text-blue-400 font-semibold">
                {stats?.verifiedEmails ?? "-"}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Actions rapides */}
        <motion.div
          className="bg-slate-900 rounded-xl p-6 border border-slate-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <h2 className="text-xl font-semibold text-white mb-4">
            Actions rapides
          </h2>
          <div className="space-y-3">
            <a
              href="/admin/utilisateurs"
              className="block p-4 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-blue-400" />
                <span className="text-white">Gérer les utilisateurs</span>
              </div>
            </a>
            <a
              href="/admin/annonceurs"
              className="block p-4 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <Briefcase className="w-5 h-5 text-purple-400" />
                <span className="text-white">Gérer les annonceurs</span>
              </div>
            </a>
            <a
              href="/admin/integrations"
              className="block p-4 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <span className="text-white">Configurer les API</span>
              </div>
            </a>
          </div>
        </motion.div>
      </div>

      {/* Développeurs en ligne */}
      <motion.div
        className="mt-6 bg-slate-900 rounded-xl p-6 border border-slate-800"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Code className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">
              Développeurs
            </h2>
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
            onlineDevs.map((dev: { name: string; onlineSince: number }, index: number) => (
              <motion.div
                key={dev.name}
                className="flex items-center justify-between p-3 bg-slate-800 rounded-lg"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 + index * 0.1 }}
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
    </div>
  );
}
