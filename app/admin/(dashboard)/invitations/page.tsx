"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  Plus,
  Copy,
  Check,
  Link2,
  Ban,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

type InvitationStatus = "pending" | "used" | "expired" | "revoked" | "all";

const statusConfig: Record<
  Exclude<InvitationStatus, "all">,
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  pending: {
    label: "En attente",
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    icon: Clock,
  },
  used: {
    label: "Utilisée",
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    icon: CheckCircle,
  },
  expired: {
    label: "Expirée",
    color: "text-red-400",
    bgColor: "bg-red-400/10",
    icon: XCircle,
  },
  revoked: {
    label: "Révoquée",
    color: "text-red-400",
    bgColor: "bg-red-400/10",
    icon: Ban,
  },
};

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = timestamp - now;

  if (diff < 0) return "Expiré";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

export default function InvitationsPage() {
  const { token } = useAdminAuth();
  const [note, setNote] = useState("");
  const [newInvitation, setNewInvitation] = useState<{
    token: string;
    url: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<"url" | "token" | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<InvitationStatus>("all");
  const [page, setPage] = useState(0);
  const limit = 10;

  // Queries
  const stats = useQuery(
    api.admin.invitations.getInvitationStats,
    token ? { token } : "skip"
  );

  const invitations = useQuery(
    api.admin.invitations.listInvitations,
    token
      ? {
          token,
          status: statusFilter,
          limit,
          offset: page * limit,
        }
      : "skip"
  );

  // Mutations
  const createInvitation = useMutation(api.admin.invitations.createInvitation);
  const revokeInvitation = useMutation(api.admin.invitations.revokeInvitation);

  const handleCreate = async () => {
    if (!token) return;
    setIsCreating(true);
    try {
      const result = await createInvitation({
        token,
        note: note.trim() || undefined,
      });
      if (result.success) {
        setNewInvitation({
          token: result.token,
          url: `${window.location.origin}${result.url}`,
        });
        setNote("");
      }
    } catch (error) {
      console.error("Erreur création invitation:", error);
    }
    setIsCreating(false);
  };

  const handleCopy = async (type: "url" | "token") => {
    if (!newInvitation) return;
    const text = type === "url" ? newInvitation.url : newInvitation.token;
    await navigator.clipboard.writeText(text);
    setCopiedField(type);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleRevoke = async (invitationId: Id<"adminInvitations">) => {
    if (!token) return;
    if (confirm("Voulez-vous révoquer cette invitation ? Elle ne pourra plus être utilisée.")) {
      await revokeInvitation({ token, invitationId });
    }
  };

  const totalPages = invitations?.success
    ? Math.ceil(invitations.total / limit)
    : 0;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <UserPlus className="w-6 h-6 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Invitations Admin</h1>
        </div>
        <p className="text-slate-400">
          Invitez de nouveaux administrateurs via des tokens sécurisés
        </p>
      </div>

      {/* Stats */}
      {stats?.success && stats.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            className="bg-slate-900 rounded-xl p-5 border border-slate-800"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-slate-400 text-sm">En attente</p>
            <p className="text-2xl font-bold text-amber-400">{stats.stats.pending}</p>
          </motion.div>
          <motion.div
            className="bg-slate-900 rounded-xl p-5 border border-slate-800"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <p className="text-slate-400 text-sm">Utilisées</p>
            <p className="text-2xl font-bold text-emerald-400">{stats.stats.used}</p>
          </motion.div>
          <motion.div
            className="bg-slate-900 rounded-xl p-5 border border-slate-800"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-slate-400 text-sm">Expirées</p>
            <p className="text-2xl font-bold text-red-400">{stats.stats.expired}</p>
          </motion.div>
          <motion.div
            className="bg-slate-900 rounded-xl p-5 border border-slate-800"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-slate-400 text-sm">Total</p>
            <p className="text-2xl font-bold text-white">{stats.stats.total}</p>
          </motion.div>
        </div>
      )}

      {/* Formulaire création */}
      <motion.div
        className="bg-slate-900 rounded-xl p-6 border border-slate-800 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-blue-400" />
          Créer une invitation
        </h2>
        <div className="flex gap-4">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note optionnelle (ex: Nouveau dev, Support...)"
            className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
          />
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 transition-colors font-medium"
          >
            <UserPlus className="w-4 h-4" />
            {isCreating ? "Création..." : "Générer l'invitation"}
          </button>
        </div>

        {/* Affichage de l'invitation créée */}
        <AnimatePresence>
          {newInvitation && (
            <motion.div
              className="mt-4 p-4 bg-blue-900/30 border border-blue-700/50 rounded-lg"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <p className="text-blue-400 text-sm mb-3 font-medium">
                Invitation créée ! Partagez l&apos;URL ou le token avec le nouvel admin.
              </p>

              {/* URL */}
              <div className="mb-3">
                <label className="text-xs text-slate-400 mb-1 block">URL d&apos;inscription</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 bg-slate-800 rounded-lg text-sm text-white font-mono break-all border border-slate-700 overflow-x-auto">
                    {newInvitation.url}
                  </code>
                  <button
                    onClick={() => handleCopy("url")}
                    className="p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors flex-shrink-0"
                    title="Copier l'URL"
                  >
                    {copiedField === "url" ? (
                      <Check className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Link2 className="w-5 h-5 text-white" />
                    )}
                  </button>
                </div>
              </div>

              {/* Token seul */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Token uniquement</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 bg-slate-800 rounded-lg text-sm text-white font-mono break-all border border-slate-700 overflow-x-auto">
                    {newInvitation.token}
                  </code>
                  <button
                    onClick={() => handleCopy("token")}
                    className="p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors flex-shrink-0"
                    title="Copier le token"
                  >
                    {copiedField === "token" ? (
                      <Check className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Copy className="w-5 h-5 text-white" />
                    )}
                  </button>
                </div>
              </div>

              <p className="text-slate-400 text-xs mt-3">
                Cette invitation expire dans 24 heures et ne peut être utilisée qu&apos;une seule fois.
              </p>

              <button
                onClick={() => setNewInvitation(null)}
                className="mt-3 text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                Fermer
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Filtres */}
      <motion.div
        className="flex items-center gap-4 mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center gap-2 text-slate-400">
          <Filter className="w-4 h-4" />
          <span className="text-sm">Filtrer :</span>
        </div>
        <div className="flex gap-2">
          {(["all", "pending", "used", "expired", "revoked"] as const).map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setPage(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {status === "all" ? "Tous" : statusConfig[status].label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Liste des invitations */}
      <motion.div
        className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">
            Historique des invitations
            {invitations?.success && (
              <span className="text-slate-500 font-normal ml-2">({invitations.total})</span>
            )}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Note
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Créée par
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Date / Expiration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Utilisée par
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {invitations?.success && invitations.invitations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    {statusFilter === "all"
                      ? "Aucune invitation créée. Générez une première invitation pour commencer."
                      : `Aucune invitation "${statusConfig[statusFilter as Exclude<InvitationStatus, "all">]?.label || statusFilter}".`}
                  </td>
                </tr>
              )}
              {invitations?.success &&
                invitations.invitations.map((inv: {
                  id: Id<"adminInvitations">;
                  status: string;
                  note?: string;
                  token: string;
                  createdAt: number;
                  expiresAt: number;
                  usedAt?: number;
                  revokedAt?: number;
                  createdBy?: { firstName: string; lastName: string } | null;
                  usedBy?: { firstName: string; lastName: string; email: string } | null;
                }) => {
                  const config = statusConfig[inv.status as Exclude<InvitationStatus, "all">];
                  const StatusIcon = config?.icon || Clock;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full ${config?.bgColor}`}>
                          <StatusIcon className={`w-3.5 h-3.5 ${config?.color}`} />
                          <span className={`text-sm font-medium ${config?.color}`}>
                            {config?.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white text-sm">
                          {inv.note || <span className="text-slate-500 italic">-</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {inv.createdBy ? (
                          <span className="text-slate-300 text-sm">
                            {inv.createdBy.firstName} {inv.createdBy.lastName}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="text-slate-300">{formatDate(inv.createdAt)}</p>
                          {inv.status === "pending" && (
                            <p className="text-xs text-amber-400">
                              Expire dans {formatRelativeTime(inv.expiresAt)}
                            </p>
                          )}
                          {inv.status === "used" && inv.usedAt && (
                            <p className="text-xs text-emerald-400">
                              Utilisée le {formatDate(inv.usedAt)}
                            </p>
                          )}
                          {inv.status === "revoked" && inv.revokedAt && (
                            <p className="text-xs text-red-400">
                              Révoquée le {formatDate(inv.revokedAt)}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {inv.usedBy ? (
                          <div className="text-sm">
                            <p className="text-white font-medium">
                              {inv.usedBy.firstName} {inv.usedBy.lastName}
                            </p>
                            <p className="text-slate-400 text-xs">{inv.usedBy.email}</p>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {inv.status === "pending" && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={async () => {
                                await navigator.clipboard.writeText(
                                  `${window.location.origin}/admin/inscription?token=${inv.token}`
                                );
                              }}
                              className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                              title="Copier l'URL"
                            >
                              <Link2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={async () => {
                                await navigator.clipboard.writeText(inv.token);
                              }}
                              className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                              title="Copier le token"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRevoke(inv.id)}
                              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                              title="Révoquer"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {invitations?.success && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Page {page + 1} sur {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Instructions */}
      <motion.div
        className="mt-6 p-4 bg-blue-900/20 border border-blue-700/30 rounded-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <h3 className="text-blue-400 font-medium mb-2">Comment ça marche ?</h3>
        <ol className="text-slate-400 text-sm space-y-1 list-decimal list-inside">
          <li>Créez une invitation (avec une note optionnelle pour l&apos;identifier)</li>
          <li>Partagez l&apos;URL ou le token avec le nouvel administrateur</li>
          <li>Le destinataire s&apos;inscrit via l&apos;URL ou en saisissant le token sur <code className="text-blue-400 bg-slate-800 px-1 rounded">/admin/inscription</code></li>
          <li>L&apos;invitation expire après 24 heures ou après une utilisation</li>
        </ol>
      </motion.div>
    </div>
  );
}
