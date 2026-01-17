"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Calendar,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

type AccountTypeFilter = "all" | "annonceur_pro" | "annonceur_particulier" | "utilisateur";
type StatusFilter = "all" | "active" | "inactive";

export default function UtilisateursPage() {
  const { token } = useAdminAuth();
  const [search, setSearch] = useState("");
  const [accountTypeFilter, setAccountTypeFilter] = useState<AccountTypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const users = useQuery(
    api.admin.users.listUsers,
    token
      ? {
          token,
          search: search || undefined,
          accountType: accountTypeFilter === "all" ? undefined : accountTypeFilter,
          isActive: statusFilter === "all" ? undefined : statusFilter === "active",
          limit: pageSize,
          offset: page * pageSize,
        }
      : "skip"
  );

  const toggleActive = useMutation(api.admin.users.toggleUserActive);

  const handleToggleActive = async (userId: Id<"users">) => {
    if (!token) return;
    try {
      await toggleActive({ token, userId });
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getAccountTypeBadge = (type: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      annonceur_pro: {
        label: "Pro",
        className: "bg-purple-500/20 text-purple-400",
      },
      annonceur_particulier: {
        label: "Particulier",
        className: "bg-blue-500/20 text-blue-400",
      },
      utilisateur: {
        label: "Utilisateur",
        className: "bg-gray-500/20 text-gray-400",
      },
    };
    const badge = badges[type] || badges.utilisateur;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Utilisateurs</h1>
        <p className="text-slate-400 mt-1">
          Gérez tous les utilisateurs de la plateforme
        </p>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 mb-6">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="Rechercher par nom ou email..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Account Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={accountTypeFilter}
              onChange={(e) => {
                setAccountTypeFilter(e.target.value as AccountTypeFilter);
                setPage(0);
              }}
              className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">Tous les types</option>
              <option value="annonceur_pro">Annonceurs Pro</option>
              <option value="annonceur_particulier">Annonceurs Particulier</option>
              <option value="utilisateur">Utilisateurs</option>
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              setPage(0);
            }}
            className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-6 py-4 text-slate-400 font-medium">
                  Utilisateur
                </th>
                <th className="text-left px-6 py-4 text-slate-400 font-medium">
                  Type
                </th>
                <th className="text-left px-6 py-4 text-slate-400 font-medium">
                  Contact
                </th>
                <th className="text-left px-6 py-4 text-slate-400 font-medium">
                  Inscription
                </th>
                <th className="text-left px-6 py-4 text-slate-400 font-medium">
                  Statut
                </th>
                <th className="text-right px-6 py-4 text-slate-400 font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users?.users.map((user, index) => (
                <motion.tr
                  key={user._id}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white font-medium">
                        {user.firstName} {user.lastName}
                      </p>
                      {user.companyName && (
                        <p className="text-slate-400 text-sm">
                          {user.companyName}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getAccountTypeBadge(user.accountType)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-slate-300 text-sm">
                        <Mail className="w-4 h-4 text-slate-500" />
                        {user.email}
                        {user.emailVerified && (
                          <span className="text-green-400 text-xs">✓</span>
                        )}
                      </div>
                      {user.phone && (
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                          <Phone className="w-4 h-4 text-slate-500" />
                          {user.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <Calendar className="w-4 h-4" />
                      {formatDate(user.createdAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleActive(user._id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        user.isActive
                          ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                          : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      }`}
                    >
                      {user.isActive ? (
                        <>
                          <UserCheck className="w-4 h-4" />
                          Actif
                        </>
                      ) : (
                        <>
                          <UserX className="w-4 h-4" />
                          Inactif
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                      <MoreVertical className="w-5 h-5 text-slate-400" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {users?.users.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400">Aucun utilisateur trouvé</p>
          </div>
        )}

        {/* Pagination */}
        {users && users.total > pageSize && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800">
            <p className="text-slate-400 text-sm">
              {page * pageSize + 1} - {Math.min((page + 1) * pageSize, users.total)} sur{" "}
              {users.total} utilisateurs
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={(page + 1) * pageSize >= users.total}
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
