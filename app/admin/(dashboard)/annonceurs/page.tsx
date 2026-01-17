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
  Building2,
  User,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

type AnnonceurFilter = "all" | "annonceur_pro" | "annonceur_particulier";
type StatusFilter = "all" | "active" | "inactive";

export default function AnnonceursPage() {
  const { token } = useAdminAuth();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AnnonceurFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const users = useQuery(
    api.admin.users.listUsers,
    token
      ? {
          token,
          search: search || undefined,
          accountType: typeFilter === "all" ? undefined : typeFilter,
          isActive: statusFilter === "all" ? undefined : statusFilter === "active",
          limit: pageSize,
          offset: page * pageSize,
        }
      : "skip"
  );

  // Filter only annonceurs
  const annonceurs = users?.users.filter(
    (u) => u.accountType === "annonceur_pro" || u.accountType === "annonceur_particulier"
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

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Annonceurs</h1>
        <p className="text-slate-400 mt-1">
          Gérez les pet-sitters professionnels et particuliers
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <motion.div
          className="bg-slate-900 rounded-xl p-4 border border-slate-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Building2 className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Professionnels</p>
              <p className="text-xl font-bold text-white">
                {users?.users.filter((u) => u.accountType === "annonceur_pro").length ?? 0}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-slate-900 rounded-xl p-4 border border-slate-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <User className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Particuliers</p>
              <p className="text-xl font-bold text-white">
                {users?.users.filter((u) => u.accountType === "annonceur_particulier").length ?? 0}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-slate-900 rounded-xl p-4 border border-slate-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <UserCheck className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Actifs</p>
              <p className="text-xl font-bold text-white">
                {users?.users.filter(
                  (u) =>
                    (u.accountType === "annonceur_pro" ||
                      u.accountType === "annonceur_particulier") &&
                    u.isActive
                ).length ?? 0}
              </p>
            </div>
          </div>
        </motion.div>
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
                placeholder="Rechercher par nom, email ou société..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as AnnonceurFilter);
                setPage(0);
              }}
              className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">Tous les types</option>
              <option value="annonceur_pro">Professionnels</option>
              <option value="annonceur_particulier">Particuliers</option>
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
                  Annonceur
                </th>
                <th className="text-left px-6 py-4 text-slate-400 font-medium">
                  Type
                </th>
                <th className="text-left px-6 py-4 text-slate-400 font-medium">
                  Contact
                </th>
                <th className="text-left px-6 py-4 text-slate-400 font-medium">
                  SIRET
                </th>
                <th className="text-left px-6 py-4 text-slate-400 font-medium">
                  Inscription
                </th>
                <th className="text-left px-6 py-4 text-slate-400 font-medium">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody>
              {annonceurs?.map((user, index) => (
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
                        <p className="text-slate-400 text-sm flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {user.companyName}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.accountType === "annonceur_pro" ? (
                      <span className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-full text-sm font-medium">
                        <Building2 className="w-4 h-4" />
                        Pro
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium">
                        <User className="w-4 h-4" />
                        Particulier
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-slate-300 text-sm">
                        <Mail className="w-4 h-4 text-slate-500" />
                        {user.email}
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
                    {user.siret ? (
                      <div className="flex items-center gap-2">
                        <code className="text-slate-300 text-sm bg-slate-800 px-2 py-1 rounded">
                          {user.siret}
                        </code>
                        <a
                          href={`https://www.societe.com/cgi-bin/search?champs=${user.siret}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    ) : (
                      <span className="text-slate-500 text-sm">-</span>
                    )}
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
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {annonceurs?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400">Aucun annonceur trouvé</p>
          </div>
        )}

        {/* Pagination */}
        {users && users.total > pageSize && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800">
            <p className="text-slate-400 text-sm">
              Page {page + 1}
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
