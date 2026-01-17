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
} from "lucide-react";

export default function AdminDashboardPage() {
  const { token } = useAdminAuth();
  const stats = useQuery(
    api.admin.stats.getDashboardStats,
    token ? { token } : "skip"
  );

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
    </div>
  );
}
