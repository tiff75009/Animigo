"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { motion, AnimatePresence } from "framer-motion";
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
  Trash2,
  AlertTriangle,
  X,
  Loader2,
  Send,
  ShieldCheck,
  KeyRound,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

type AccountTypeFilter = "all" | "annonceur_pro" | "annonceur_particulier" | "utilisateur";
type StatusFilter = "all" | "active" | "inactive";

interface User {
  _id: Id<"users">;
  email: string;
  firstName: string;
  lastName: string;
  accountType: string;
  phone?: string;
  companyName?: string;
  isActive: boolean;
  emailVerified?: boolean;
  createdAt: number;
  role?: string;
}

// Dropdown Menu Component
function ActionMenu({
  user,
  onDelete,
  onActivate,
  onResendEmail,
  onSendPasswordReset,
  isActivating,
  isResending,
  isSendingPasswordReset,
}: {
  user: User;
  onDelete: (user: User) => void;
  onActivate: (user: User) => void;
  onResendEmail: (user: User) => void;
  onSendPasswordReset: (user: User) => void;
  isActivating: boolean;
  isResending: boolean;
  isSendingPasswordReset: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isAdmin = user.role === "admin";
  const canActivate = !isAdmin && !user.emailVerified;
  const canResendEmail = !isAdmin && !user.emailVerified;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
      >
        <MoreVertical className="w-5 h-5 text-slate-400" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute right-0 top-full mt-1 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden"
          >
            {/* Activer manuellement */}
            <button
              onClick={() => {
                if (canActivate && !isActivating) {
                  onActivate(user);
                }
                setIsOpen(false);
              }}
              disabled={!canActivate || isActivating}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                !canActivate || isActivating
                  ? "text-slate-500 cursor-not-allowed"
                  : "text-green-400 hover:bg-green-500/10"
              }`}
            >
              {isActivating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              <span>Activer manuellement</span>
            </button>

            {/* Renvoyer email de confirmation */}
            <button
              onClick={() => {
                if (canResendEmail && !isResending) {
                  onResendEmail(user);
                }
                setIsOpen(false);
              }}
              disabled={!canResendEmail || isResending}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                !canResendEmail || isResending
                  ? "text-slate-500 cursor-not-allowed"
                  : "text-blue-400 hover:bg-blue-500/10"
              }`}
            >
              {isResending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>Renvoyer email confirmation</span>
            </button>

            {/* Envoyer lien réinitialisation mot de passe */}
            <button
              onClick={() => {
                if (!isAdmin && !isSendingPasswordReset) {
                  onSendPasswordReset(user);
                }
                setIsOpen(false);
              }}
              disabled={isAdmin || isSendingPasswordReset}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                isAdmin || isSendingPasswordReset
                  ? "text-slate-500 cursor-not-allowed"
                  : "text-amber-400 hover:bg-amber-500/10"
              }`}
            >
              {isSendingPasswordReset ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
              <span>Réinitialiser mot de passe</span>
            </button>

            {/* Séparateur */}
            <div className="border-t border-slate-700 my-1" />

            {/* Supprimer */}
            <button
              onClick={() => {
                if (!isAdmin) {
                  onDelete(user);
                }
                setIsOpen(false);
              }}
              disabled={isAdmin}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                isAdmin
                  ? "text-slate-500 cursor-not-allowed"
                  : "text-red-400 hover:bg-red-500/10"
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>Supprimer le compte</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Delete Confirmation Modal
function DeleteModal({
  isOpen,
  user,
  onClose,
  onConfirm,
  isDeleting,
}: {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  if (!isOpen || !user) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  Supprimer le compte
                </h3>
                <p className="text-slate-400 text-sm">
                  Cette action est irréversible
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* User info */}
          <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
            <p className="text-white font-medium">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-slate-400 text-sm">{user.email}</p>
            {user.companyName && (
              <p className="text-slate-500 text-sm mt-1">{user.companyName}</p>
            )}
          </div>

          {/* Warning */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
            <p className="text-red-400 text-sm">
              <strong>Attention :</strong> La suppression de ce compte entraînera
              la suppression définitive de :
            </p>
            <ul className="text-red-400/80 text-sm mt-2 space-y-1 ml-4 list-disc">
              <li>Toutes les sessions actives</li>
              <li>Les animaux enregistrés</li>
              <li>Les réservations en attente</li>
              <li>Les disponibilités (si annonceur)</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="w-5 h-5" />
                  Supprimer
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function UtilisateursPage() {
  const { token } = useAdminAuth();
  const [search, setSearch] = useState("");
  const [accountTypeFilter, setAccountTypeFilter] = useState<AccountTypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);
  const pageSize = 10;

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Action states
  const [activatingUserId, setActivatingUserId] = useState<Id<"users"> | null>(null);
  const [resendingUserId, setResendingUserId] = useState<Id<"users"> | null>(null);
  const [passwordResetUserId, setPasswordResetUserId] = useState<Id<"users"> | null>(null);

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
  const deleteUser = useMutation(api.admin.users.deleteUser);
  const activateUserManually = useMutation(api.admin.users.activateUserManually);
  const resendVerificationEmail = useMutation(api.admin.users.adminResendVerificationEmail);
  const sendPasswordResetEmail = useMutation(api.admin.users.adminSendPasswordResetEmail);

  const handleToggleActive = async (userId: Id<"users">) => {
    if (!token) return;
    try {
      await toggleActive({ token, userId });
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const handleActivateUser = async (user: User) => {
    if (!token) return;
    setActivatingUserId(user._id);
    try {
      await activateUserManually({ token, userId: user._id });
    } catch (error) {
      console.error("Erreur lors de l'activation:", error);
      alert("Erreur lors de l'activation de l'utilisateur");
    } finally {
      setActivatingUserId(null);
    }
  };

  const handleResendEmail = async (user: User) => {
    if (!token) return;
    setResendingUserId(user._id);
    try {
      await resendVerificationEmail({ token, userId: user._id });
      alert("Email de confirmation envoyé avec succès");
    } catch (error) {
      console.error("Erreur lors de l'envoi:", error);
      alert("Erreur lors de l'envoi de l'email");
    } finally {
      setResendingUserId(null);
    }
  };

  const handleSendPasswordReset = async (user: User) => {
    if (!token) return;
    setPasswordResetUserId(user._id);
    try {
      await sendPasswordResetEmail({ token, userId: user._id });
      alert("Email de réinitialisation de mot de passe envoyé avec succès");
    } catch (error) {
      console.error("Erreur lors de l'envoi:", error);
      alert("Erreur lors de l'envoi de l'email de réinitialisation");
    } finally {
      setPasswordResetUserId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!token || !userToDelete) return;

    setIsDeleting(true);
    try {
      await deleteUser({ token, userId: userToDelete._id });
      setDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      alert("Erreur lors de la suppression du compte");
    } finally {
      setIsDeleting(false);
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
              {users?.users.map((user: User, index: number) => (
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
                        {user.role === "admin" && (
                          <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                            Admin
                          </span>
                        )}
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
                      disabled={user.role === "admin"}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        user.role === "admin"
                          ? "bg-slate-700/50 text-slate-500 cursor-not-allowed"
                          : user.isActive
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
                    <ActionMenu
                      user={user}
                      onDelete={handleDeleteClick}
                      onActivate={handleActivateUser}
                      onResendEmail={handleResendEmail}
                      onSendPasswordReset={handleSendPasswordReset}
                      isActivating={activatingUserId === user._id}
                      isResending={resendingUserId === user._id}
                      isSendingPasswordReset={passwordResetUserId === user._id}
                    />
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

      {/* Delete Modal */}
      <DeleteModal
        isOpen={deleteModalOpen}
        user={userToDelete}
        onClose={() => {
          setDeleteModalOpen(false);
          setUserToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
}
