"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  Ticket,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  User,
  Loader2,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

type StatusFilter = "all" | "open" | "in_progress" | "waiting_user" | "resolved" | "closed";
type PriorityFilter = "all" | "low" | "medium" | "high";

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    open: {
      label: "Nouveau",
      className: "bg-orange-500/20 text-orange-400",
      icon: AlertCircle,
    },
    in_progress: {
      label: "En cours",
      className: "bg-blue-500/20 text-blue-400",
      icon: Clock,
    },
    waiting_user: {
      label: "En attente",
      className: "bg-yellow-500/20 text-yellow-400",
      icon: Clock,
    },
    resolved: {
      label: "Résolu",
      className: "bg-green-500/20 text-green-400",
      icon: CheckCircle2,
    },
    closed: {
      label: "Fermé",
      className: "bg-slate-500/20 text-slate-400",
      icon: XCircle,
    },
  };

  const config = statusConfig[status] || statusConfig.open;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}

// Priority badge
function PriorityBadge({ priority }: { priority: string }) {
  const priorityConfig: Record<string, { label: string; className: string }> = {
    low: { label: "Basse", className: "bg-slate-500/20 text-slate-400" },
    medium: { label: "Moyenne", className: "bg-yellow-500/20 text-yellow-400" },
    high: { label: "Haute", className: "bg-red-500/20 text-red-400" },
  };

  const config = priorityConfig[priority] || priorityConfig.medium;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

const categoryLabels: Record<string, string> = {
  paiement: "Paiement",
  reservation: "Réservation",
  compte: "Compte",
  technique: "Technique",
  signalement: "Signalement",
  autre: "Autre",
};

export default function AdminSupportPage() {
  const { token } = useAdminAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const ticketsData = useQuery(
    api.admin.support.getAllTickets,
    token
      ? {
          sessionToken: token,
          status: statusFilter === "all" ? undefined : statusFilter,
          priority: priorityFilter === "all" ? undefined : priorityFilter,
          assignedToMe: assignedToMe || undefined,
          search: search || undefined,
          page,
          pageSize,
        }
      : "skip"
  );

  const statsData = useQuery(
    api.admin.support.getTicketStats,
    token ? { sessionToken: token } : "skip"
  );

  const stats = statsData?.success ? statsData.stats : null;
  const tickets = ticketsData?.success ? ticketsData.tickets : [];
  const totalPages = ticketsData?.success ? ticketsData.totalPages : 1;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return "Il y a moins d'1h";
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return formatDate(timestamp);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Support</h1>
        <p className="text-slate-400 mt-1">
          Gestion des tickets de support
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Total</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-orange-400 text-sm">Ouverts</p>
            <p className="text-2xl font-bold text-orange-400">{stats.open}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-blue-400 text-sm">En cours</p>
            <p className="text-2xl font-bold text-blue-400">{stats.inProgress}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-red-400 text-sm">Priorité haute</p>
            <p className="text-2xl font-bold text-red-400">{stats.highPriority}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-green-400 text-sm">Résolus aujourd'hui</p>
            <p className="text-2xl font-bold text-green-400">{stats.resolvedToday}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Rechercher par numéro ou sujet..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                setPage(1);
              }}
              className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="open">Nouveaux</option>
              <option value="in_progress">En cours</option>
              <option value="waiting_user">En attente</option>
              <option value="resolved">Résolus</option>
              <option value="closed">Fermés</option>
            </select>
          </div>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value as PriorityFilter);
              setPage(1);
            }}
            className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">Toutes priorités</option>
            <option value="high">Haute</option>
            <option value="medium">Moyenne</option>
            <option value="low">Basse</option>
          </select>

          {/* Assigned to me */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={assignedToMe}
              onChange={(e) => {
                setAssignedToMe(e.target.checked);
                setPage(1);
              }}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-slate-300 text-sm">Mes tickets</span>
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-4 text-slate-400 font-medium">
                  Ticket
                </th>
                <th className="text-left px-4 py-4 text-slate-400 font-medium">
                  Utilisateur
                </th>
                <th className="text-left px-4 py-4 text-slate-400 font-medium">
                  Catégorie
                </th>
                <th className="text-left px-4 py-4 text-slate-400 font-medium">
                  Statut
                </th>
                <th className="text-left px-4 py-4 text-slate-400 font-medium">
                  Priorité
                </th>
                <th className="text-left px-4 py-4 text-slate-400 font-medium">
                  Assigné à
                </th>
                <th className="text-left px-4 py-4 text-slate-400 font-medium">
                  Mise à jour
                </th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket: any, index: number) => (
                <motion.tr
                  key={ticket._id}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => window.location.href = `/admin/support/${ticket._id}`}
                >
                  <td className="px-4 py-4">
                    <div>
                      <p className="text-slate-500 text-xs font-mono">
                        {ticket.ticketNumber}
                      </p>
                      <p className="text-white font-medium text-sm line-clamp-1">
                        {ticket.subject}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-white text-sm">{ticket.userName}</p>
                        <p className="text-slate-500 text-xs">{ticket.userEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-slate-300 text-sm">
                      {categoryLabels[ticket.category] || ticket.category}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={ticket.status} />
                  </td>
                  <td className="px-4 py-4">
                    <PriorityBadge priority={ticket.priority} />
                  </td>
                  <td className="px-4 py-4">
                    {ticket.assignedAdminName ? (
                      <span className="text-slate-300 text-sm">
                        {ticket.assignedAdminName}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-sm">Non assigné</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-slate-400 text-sm">
                      {formatRelativeTime(ticket.updatedAt)}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {tickets.length === 0 && (
          <div className="text-center py-12">
            <Ticket className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Aucun ticket trouvé</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800">
            <p className="text-slate-400 text-sm">
              Page {page} sur {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
