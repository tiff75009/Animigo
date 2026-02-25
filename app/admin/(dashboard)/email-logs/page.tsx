"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { motion } from "framer-motion";
import {
  Mail,
  CheckCircle,
  XCircle,
  Eye,
  MousePointer,
  AlertTriangle,
  Ban,
  Clock,
  Search,
  Filter,
  TrendingUp,
  Send,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Mail }> = {
  sent: { label: "Envoyé", color: "bg-blue-500/20 text-blue-400", icon: Send },
  delivered: { label: "Délivré", color: "bg-green-500/20 text-green-400", icon: CheckCircle },
  opened: { label: "Ouvert", color: "bg-emerald-500/20 text-emerald-400", icon: Eye },
  clicked: { label: "Cliqué", color: "bg-cyan-500/20 text-cyan-400", icon: MousePointer },
  bounced: { label: "Rebond", color: "bg-orange-500/20 text-orange-400", icon: AlertTriangle },
  complained: { label: "Plainte", color: "bg-red-500/20 text-red-400", icon: XCircle },
  blocked: { label: "Bloqué", color: "bg-red-600/20 text-red-500", icon: Ban },
  failed: { label: "Échoué", color: "bg-red-500/20 text-red-400", icon: XCircle },
  pending: { label: "En attente", color: "bg-yellow-500/20 text-yellow-400", icon: Clock },
};

export default function EmailLogsPage() {
  const { token } = useAdminAuth();
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [searchEmail, setSearchEmail] = useState("");

  const stats = useQuery(api.admin.emailLogs.getEmailLogStats, token ? { token } : "skip");
  const logs = useQuery(
    api.admin.emailLogs.listEmailLogs,
    token
      ? {
          token,
          limit: 100,
          statusFilter: statusFilter !== "all" ? statusFilter : undefined,
          providerFilter: providerFilter !== "all" ? providerFilter : undefined,
          searchEmail: searchEmail || undefined,
        }
      : "skip"
  );

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Logs Email</h1>
        <p className="text-slate-400 mt-1">Suivi des emails envoyés par la plateforme</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { label: "Total (30j)", value: stats.total, icon: Mail, color: "text-slate-300" },
            { label: "Délivrés", value: stats.delivered, icon: CheckCircle, color: "text-green-400" },
            { label: "Ouverts", value: stats.opened, icon: Eye, color: "text-emerald-400" },
            { label: "Rebonds", value: stats.bounced, icon: AlertTriangle, color: "text-orange-400" },
            { label: "Taux délivrabilité", value: `${stats.deliveryRate}%`, icon: TrendingUp, color: "text-green-400" },
            { label: "Taux ouverture", value: `${stats.openRate}%`, icon: Eye, color: "text-cyan-400" },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800/50 border border-slate-700 rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs text-slate-500">{stat.label}</span>
              </div>
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher par email..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="all">Tous les statuts</option>
            <option value="sent">Envoyé</option>
            <option value="delivered">Délivré</option>
            <option value="opened">Ouvert</option>
            <option value="clicked">Cliqué</option>
            <option value="bounced">Rebond</option>
            <option value="complained">Plainte</option>
            <option value="failed">Échoué</option>
            <option value="blocked">Bloqué</option>
          </select>
        </div>

        <select
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="all">Tous les providers</option>
          <option value="resend">Resend</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400">
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Destinataire</th>
                <th className="text-left px-4 py-3 font-medium">Template</th>
                <th className="text-left px-4 py-3 font-medium">Statut</th>
                <th className="text-left px-4 py-3 font-medium">Provider</th>
                <th className="text-left px-4 py-3 font-medium">Sujet</th>
              </tr>
            </thead>
            <tbody>
              {logs?.map((log) => {
                const config = STATUS_CONFIG[log.status] || STATUS_CONFIG.pending;
                const StatusIcon = config.icon;
                return (
                  <tr key={log._id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-white font-mono text-xs">
                      {log.to}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                        {log.template}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${config.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {log.provider ? (
                        <span className="text-xs text-purple-400">
                          {log.provider}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400 max-w-[200px] truncate">
                      {log.subject}
                    </td>
                  </tr>
                );
              })}
              {logs?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    Aucun log email trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
