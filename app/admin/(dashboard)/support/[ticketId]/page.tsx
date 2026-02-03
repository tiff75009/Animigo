"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Send,
  Loader2,
  User,
  Mail,
  Phone,
  Calendar,
  Tag,
  UserCheck,
  Clock,
  MessageSquare,
  CheckCircle2,
  Lock,
  AlertCircle,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

const categoryLabels: Record<string, string> = {
  paiement: "Paiement / Facturation",
  reservation: "Réservation / Mission",
  compte: "Mon compte",
  technique: "Problème technique",
  signalement: "Signalement",
  autre: "Autre",
};

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    open: { label: "Nouveau", className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
    in_progress: { label: "En cours", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    waiting_user: { label: "En attente", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    resolved: { label: "Résolu", className: "bg-green-500/20 text-green-400 border-green-500/30" },
    closed: { label: "Fermé", className: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
  };

  const config = statusConfig[status] || statusConfig.open;

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config.className}`}>
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

export default function AdminTicketDetailPage() {
  const params = useParams();
  const ticketId = params.ticketId as string;
  const { token } = useAdminAuth();

  const [newMessage, setNewMessage] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const data = useQuery(
    api.admin.support.getTicketDetailsAdmin,
    token ? { sessionToken: token, ticketId: ticketId as Id<"supportTickets"> } : "skip"
  );

  const adminsList = useQuery(
    api.admin.support.getAdminsList,
    token ? { sessionToken: token } : "skip"
  );

  const addMessage = useMutation(api.admin.support.addAdminMessage);
  const updateStatus = useMutation(api.admin.support.updateTicketStatus);
  const updatePriority = useMutation(api.admin.support.updateTicketPriority);
  const assignTicket = useMutation(api.admin.support.assignTicket);
  const resolveTicket = useMutation(api.admin.support.resolveTicket);

  const isLoading = data === undefined;
  const ticket = data?.success ? data.ticket : null;
  const user = data?.success ? data.user : null;
  const messages = data?.success ? data.messages : [];
  const assignedAdmin = data?.success ? data.assignedAdmin : null;
  const relatedMission = data?.success ? data.relatedMission : null;
  const admins = adminsList?.success ? adminsList.admins : [];

  // Scroll vers le bas quand nouveaux messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !token) return;

    setIsSending(true);
    try {
      await addMessage({
        sessionToken: token,
        ticketId: ticketId as Id<"supportTickets">,
        content: newMessage,
        isInternal,
      });
      setNewMessage("");
    } catch (error) {
      console.error("Erreur envoi message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!token) return;
    setIsUpdating(true);
    try {
      await updateStatus({
        sessionToken: token,
        ticketId: ticketId as Id<"supportTickets">,
        status: newStatus as any,
      });
    } catch (error) {
      console.error("Erreur changement statut:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    if (!token) return;
    setIsUpdating(true);
    try {
      await updatePriority({
        sessionToken: token,
        ticketId: ticketId as Id<"supportTickets">,
        priority: newPriority as any,
      });
    } catch (error) {
      console.error("Erreur changement priorité:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAssign = async (adminId: string) => {
    if (!token) return;
    setIsUpdating(true);
    try {
      await assignTicket({
        sessionToken: token,
        ticketId: ticketId as Id<"supportTickets">,
        adminId: adminId ? (adminId as Id<"users">) : undefined,
      });
    } catch (error) {
      console.error("Erreur assignation:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResolve = async () => {
    if (!token) return;
    setIsUpdating(true);
    try {
      await resolveTicket({
        sessionToken: token,
        ticketId: ticketId as Id<"supportTickets">,
      });
    } catch (error) {
      console.error("Erreur résolution:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/support"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Retour aux tickets
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : !ticket ? (
        <div className="text-center py-12 bg-slate-900 rounded-xl border border-slate-800">
          <p className="text-slate-400 mb-4">Ticket non trouvé</p>
          <Link href="/admin/support" className="text-blue-400 hover:underline">
            Retour aux tickets
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content - Messages */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ticket info */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-slate-500 font-mono text-sm mb-1">
                    {ticket.ticketNumber}
                  </p>
                  <h1 className="text-xl font-bold text-white">
                    {ticket.subject}
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={ticket.status} />
                  <PriorityBadge priority={ticket.priority} />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-4 h-4" />
                  {categoryLabels[ticket.category] || ticket.category}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {formatDate(ticket.createdAt)}
                </span>
                {assignedAdmin && (
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4" />
                    {assignedAdmin.firstName} {assignedAdmin.lastName}
                  </span>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-800">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Messages
                </h2>
              </div>

              <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
                {messages.map((message: any) => (
                  <div
                    key={message._id}
                    className={`${
                      message.isInternal
                        ? "bg-amber-500/10 border border-amber-500/30"
                        : message.senderType === "admin"
                        ? "bg-blue-500/10 border border-blue-500/30"
                        : "bg-slate-800 border border-slate-700"
                    } rounded-xl p-4`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {message.isInternal && (
                          <Lock className="w-4 h-4 text-amber-400" />
                        )}
                        <span
                          className={`font-medium text-sm ${
                            message.isInternal
                              ? "text-amber-400"
                              : message.senderType === "admin"
                              ? "text-blue-400"
                              : "text-white"
                          }`}
                        >
                          {message.senderName}
                        </span>
                        {message.isInternal && (
                          <span className="text-xs text-amber-400/70">
                            (Note interne)
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">
                        {formatDate(message.createdAt)}
                      </span>
                    </div>
                    <p className="text-slate-300 text-sm whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Réponse */}
              {ticket.status !== "closed" && (
                <div className="p-4 border-t border-slate-800">
                  <div className="mb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
                      />
                      <span className="text-sm text-slate-400 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" />
                        Note interne (non visible par l'utilisateur)
                      </span>
                    </label>
                  </div>
                  <div className="flex gap-3">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={isInternal ? "Note interne..." : "Votre réponse..."}
                      rows={3}
                      className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={isSending || !newMessage.trim()}
                      className="px-4 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
                    >
                      {isSending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
              <h3 className="font-semibold text-white mb-4">Actions</h3>

              <div className="space-y-4">
                {/* Statut */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Statut
                  </label>
                  <select
                    value={ticket.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={isUpdating}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="open">Nouveau</option>
                    <option value="in_progress">En cours</option>
                    <option value="waiting_user">En attente utilisateur</option>
                    <option value="resolved">Résolu</option>
                    <option value="closed">Fermé</option>
                  </select>
                </div>

                {/* Priorité */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Priorité
                  </label>
                  <select
                    value={ticket.priority}
                    onChange={(e) => handlePriorityChange(e.target.value)}
                    disabled={isUpdating}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="low">Basse</option>
                    <option value="medium">Moyenne</option>
                    <option value="high">Haute</option>
                  </select>
                </div>

                {/* Assignation */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Assigné à
                  </label>
                  <select
                    value={ticket.assignedAdminId || ""}
                    onChange={(e) => handleAssign(e.target.value)}
                    disabled={isUpdating}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="">Non assigné</option>
                    {admins.map((admin: any) => (
                      <option key={admin._id} value={admin._id}>
                        {admin.firstName} {admin.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bouton résoudre */}
                {ticket.status !== "resolved" && ticket.status !== "closed" && (
                  <button
                    onClick={handleResolve}
                    disabled={isUpdating}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                  >
                    {isUpdating ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5" />
                    )}
                    Marquer comme résolu
                  </button>
                )}
              </div>
            </div>

            {/* User info */}
            {user && (
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                <h3 className="font-semibold text-white mb-4">Utilisateur</h3>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-slate-500 text-xs">
                        {user.accountType === "utilisateur"
                          ? "Client"
                          : "Annonceur"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Mail className="w-4 h-4" />
                    <a href={`mailto:${user.email}`} className="hover:text-white">
                      {user.email}
                    </a>
                  </div>

                  {user.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Phone className="w-4 h-4" />
                      <a href={`tel:${user.phone}`} className="hover:text-white">
                        {user.phone}
                      </a>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Calendar className="w-4 h-4" />
                    Inscrit le {formatDate(user.createdAt)}
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <p className="text-slate-500 text-xs">
                      {data?.userTicketsCount || 0} ticket(s) au total
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Related mission */}
            {relatedMission && (
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                <h3 className="font-semibold text-white mb-4">
                  Réservation liée
                </h3>

                <div className="space-y-2 text-sm">
                  <p className="text-white font-medium">
                    {relatedMission.serviceName}
                  </p>
                  <p className="text-slate-400">
                    {relatedMission.startDate} - {relatedMission.endDate}
                  </p>
                  <p className="text-slate-500">
                    Client: {relatedMission.clientName}
                  </p>
                  {relatedMission.announcerName && (
                    <p className="text-slate-500">
                      Annonceur: {relatedMission.announcerName}
                    </p>
                  )}
                  <p className="text-slate-500">
                    Montant: {(relatedMission.amount / 100).toFixed(2)} €
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
