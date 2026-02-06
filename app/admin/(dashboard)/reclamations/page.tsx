"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Lock,
  Unlock,
  MessageSquare,
  Send,
  Star,
  Euro,
  ArrowLeft,
  FileText,
  Settings,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

type StatusFilter = "all" | "open" | "investigating" | "resolved_client" | "resolved_announcer" | "closed";

type DisputeStatus = "open" | "investigating" | "resolved_client" | "resolved_announcer" | "closed";

interface EnrichedDispute {
  _id: Id<"disputes">;
  missionId: Id<"missions">;
  clientId: Id<"users">;
  announcerId: Id<"users">;
  reasonId: Id<"disputeReasons">;
  reasonLabel: string;
  description: string;
  status: DisputeStatus;
  paymentBlocked: boolean;
  assignedAdminId?: Id<"users">;
  adminNotes?: string;
  resolution?: string;
  resolvedAt?: number;
  createdAt: number;
  updatedAt: number;
  mission: {
    serviceName: string;
    startDate: string;
    endDate?: string;
    amount?: number;
    status: string;
  } | null;
  clientName: string;
  clientEmail?: string;
  announcerName: string;
  announcerEmail?: string;
  assignedAdminName: string | null;
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    open: {
      label: "Ouverte",
      className: "bg-orange-500/20 text-orange-400",
      icon: AlertTriangle,
    },
    investigating: {
      label: "Investigation",
      className: "bg-blue-500/20 text-blue-400",
      icon: Shield,
    },
    resolved_client: {
      label: "Résolu (client)",
      className: "bg-green-500/20 text-green-400",
      icon: CheckCircle2,
    },
    resolved_announcer: {
      label: "Résolu (annonceur)",
      className: "bg-emerald-500/20 text-emerald-400",
      icon: CheckCircle2,
    },
    closed: {
      label: "Fermée",
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

export default function AdminReclamationsPage() {
  const { token } = useAdminAuth();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedDisputeId, setSelectedDisputeId] = useState<Id<"disputes"> | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [resolution, setResolution] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Queries
  const disputes = useQuery(
    api.admin.disputes.getAllDisputes,
    token ? { token, statusFilter: statusFilter === "all" ? undefined : statusFilter } : "skip"
  );

  const selectedDetail = useQuery(
    api.admin.disputes.getDisputeDetail,
    token && selectedDisputeId ? { token, disputeId: selectedDisputeId } : "skip"
  );

  // Mutations
  const updateStatus = useMutation(api.admin.disputes.updateDisputeStatus);
  const addNote = useMutation(api.admin.disputes.addAdminNote);

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

  const handleStatusChange = async (disputeId: Id<"disputes">, newStatus: "investigating" | "resolved_client" | "resolved_announcer" | "closed") => {
    if (!token) return;
    setIsProcessing(true);
    try {
      await updateStatus({
        token,
        disputeId,
        status: newStatus,
        resolution: resolution || undefined,
        adminNotes: adminNote || undefined,
      });
      setResolution("");
      setAdminNote("");
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddNote = async () => {
    if (!token || !selectedDisputeId || !adminNote.trim()) return;
    setIsProcessing(true);
    try {
      await addNote({
        token,
        disputeId: selectedDisputeId,
        note: adminNote.trim(),
      });
      setAdminNote("");
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Stats
  const disputeList = disputes as EnrichedDispute[] | undefined;
  const stats = disputeList
    ? {
        total: disputeList.length,
        open: disputeList.filter((d) => d.status === "open").length,
        investigating: disputeList.filter((d) => d.status === "investigating").length,
        resolved: disputeList.filter((d) => d.status === "resolved_client" || d.status === "resolved_announcer").length,
        paymentBlocked: disputeList.filter((d) => d.paymentBlocked && d.status !== "resolved_announcer" && d.status !== "closed").length,
      }
    : null;

  // Vue détail
  if (selectedDisputeId && selectedDetail) {
    return (
      <div className="p-8">
        {/* Header retour */}
        <button
          onClick={() => setSelectedDisputeId(null)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour aux réclamations
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* En-tête réclamation */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <AlertTriangle className="w-7 h-7 text-amber-500" />
                    Réclamation
                  </h1>
                  <p className="text-slate-400 mt-1">
                    {selectedDetail.reasonLabel}
                  </p>
                </div>
                <StatusBadge status={selectedDetail.status} />
              </div>

              {/* Blocage paiement */}
              {selectedDetail.paymentBlocked && selectedDetail.status !== "resolved_announcer" && selectedDetail.status !== "closed" && (
                <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl mb-4">
                  <Lock className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-400">Paiement bloqué</p>
                    <p className="text-xs text-red-400/70">Le versement au prestataire est suspendu</p>
                  </div>
                </div>
              )}

              {/* Description client */}
              <div className="bg-slate-800/50 rounded-xl p-4">
                <p className="text-sm font-medium text-slate-300 mb-2">Description du client</p>
                <p className="text-slate-200 whitespace-pre-wrap">{selectedDetail.description}</p>
              </div>

              {/* Dates */}
              <div className="flex gap-4 mt-4 text-sm text-slate-500">
                <span>Créée le {formatDate(selectedDetail.createdAt)}</span>
                {selectedDetail.resolvedAt && (
                  <span>Résolue le {formatDate(selectedDetail.resolvedAt)}</span>
                )}
              </div>
            </div>

            {/* Mission */}
            {selectedDetail.mission && (
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  Mission concernée
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-400">Service</p>
                    <p className="text-white font-medium">{selectedDetail.mission.serviceName}</p>
                  </div>
                  {selectedDetail.mission.serviceCategory && (
                    <div>
                      <p className="text-sm text-slate-400">Catégorie</p>
                      <p className="text-white">{selectedDetail.mission.serviceCategory}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-slate-400">Date début</p>
                    <p className="text-white">{new Date(selectedDetail.mission.startDate).toLocaleDateString("fr-FR")}</p>
                  </div>
                  {selectedDetail.mission.endDate && (
                    <div>
                      <p className="text-sm text-slate-400">Date fin</p>
                      <p className="text-white">{new Date(selectedDetail.mission.endDate).toLocaleDateString("fr-FR")}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-slate-400">Montant</p>
                    <p className="text-white font-medium flex items-center gap-1">
                      <Euro className="w-4 h-4" />
                      {((selectedDetail.mission.amount || 0) / 100).toFixed(2).replace(".", ",")}€
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Paiement annonceur</p>
                    <p className="text-white capitalize">
                      {selectedDetail.mission.announcerPaymentStatus?.replace("_", " ") || "N/A"}
                    </p>
                  </div>
                  {selectedDetail.mission.animal && (
                    <div>
                      <p className="text-sm text-slate-400">Animal</p>
                      <p className="text-white">
                        {selectedDetail.mission.animal.name} ({selectedDetail.mission.animal.species})
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Motif détaillé */}
            {selectedDetail.reason && (
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Motif de réclamation</h3>
                <div className="space-y-2">
                  <p className="text-white font-medium">{selectedDetail.reason.label}</p>
                  {selectedDetail.reason.description && (
                    <p className="text-slate-400 text-sm">{selectedDetail.reason.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {selectedDetail.reason.blocksPayment ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
                        <Lock className="w-3 h-3" />
                        Bloque le paiement
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-500/20 text-slate-400 text-xs rounded-full">
                        <Unlock className="w-3 h-3" />
                        Ne bloque pas le paiement
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Avis existant */}
            {selectedDetail.review && (
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  Avis du client
                </h3>
                <div className="flex items-center gap-4 mb-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          s <= selectedDetail.review!.overallRating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-slate-600"
                        }`}
                      />
                    ))}
                    <span className="ml-1 text-white text-sm">{selectedDetail.review.overallRating}/5</span>
                  </div>
                  <span className="text-slate-500 text-sm">
                    {formatDate(selectedDetail.review.createdAt)}
                  </span>
                </div>
                {selectedDetail.review.comment && (
                  <p className="text-slate-300 text-sm">{selectedDetail.review.comment}</p>
                )}
              </div>
            )}

            {/* Notes admin */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-400" />
                Notes admin
              </h3>

              {selectedDetail.adminNotes ? (
                <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
                  <pre className="text-slate-300 text-sm whitespace-pre-wrap font-sans">{selectedDetail.adminNotes}</pre>
                </div>
              ) : (
                <p className="text-slate-500 text-sm mb-4">Aucune note pour le moment</p>
              )}

              {/* Ajouter une note */}
              {selectedDetail.status !== "closed" && (
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Ajouter une note..."
                    className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={!adminNote.trim() || isProcessing}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Ajouter
                  </button>
                </div>
              )}
            </div>

            {/* Résolution (si pas fermée) */}
            {selectedDetail.resolution && (
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Résolution</h3>
                <p className="text-slate-300">{selectedDetail.resolution}</p>
              </div>
            )}
          </div>

          {/* Colonne latérale */}
          <div className="space-y-6">
            {/* Infos client */}
            {selectedDetail.client && (
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                <h3 className="text-sm font-semibold text-slate-400 uppercase mb-3">Client</h3>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {selectedDetail.client.firstName} {selectedDetail.client.lastName}
                    </p>
                    <p className="text-slate-400 text-sm">{selectedDetail.client.email}</p>
                  </div>
                </div>
                {selectedDetail.client.phone && (
                  <p className="text-slate-400 text-sm">{selectedDetail.client.phone}</p>
                )}
              </div>
            )}

            {/* Infos annonceur */}
            {selectedDetail.announcer && (
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                <h3 className="text-sm font-semibold text-slate-400 uppercase mb-3">Prestataire</h3>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {selectedDetail.announcer.firstName} {selectedDetail.announcer.lastName}
                    </p>
                    <p className="text-slate-400 text-sm">{selectedDetail.announcer.email}</p>
                  </div>
                </div>
                {selectedDetail.announcer.phone && (
                  <p className="text-slate-400 text-sm">{selectedDetail.announcer.phone}</p>
                )}
              </div>
            )}

            {/* Admin assigné */}
            {selectedDetail.assignedAdminName && (
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                <h3 className="text-sm font-semibold text-slate-400 uppercase mb-3">Admin assigné</h3>
                <p className="text-white">{selectedDetail.assignedAdminName}</p>
              </div>
            )}

            {/* Actions */}
            {selectedDetail.status !== "closed" && (
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                <h3 className="text-sm font-semibold text-slate-400 uppercase mb-4">Actions</h3>

                {/* Champ résolution */}
                <div className="mb-4">
                  <label htmlFor="resolution-text" className="block text-sm text-slate-400 mb-1">
                    Message de résolution
                  </label>
                  <textarea
                    id="resolution-text"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder="Expliquez la décision..."
                    rows={3}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none placeholder-slate-500"
                  />
                </div>

                <div className="space-y-2">
                  {selectedDetail.status === "open" && (
                    <button
                      onClick={() => handleStatusChange(selectedDetail._id, "investigating")}
                      disabled={isProcessing}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                      Prendre en charge
                    </button>
                  )}

                  <button
                    onClick={() => handleStatusChange(selectedDetail._id, "resolved_client")}
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    Résoudre (client)
                  </button>

                  <button
                    onClick={() => handleStatusChange(selectedDetail._id, "resolved_announcer")}
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                    Résoudre (annonceur)
                    {selectedDetail.paymentBlocked && (
                      <span className="text-xs opacity-70">+ débloquer paiement</span>
                    )}
                  </button>

                  <button
                    onClick={() => handleStatusChange(selectedDetail._id, "closed")}
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 disabled:opacity-50 transition-colors"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Fermer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Vue liste
  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
            Réclamations
          </h1>
          <p className="text-slate-400 mt-1">
            Gestion des réclamations clients
          </p>
        </div>
        <Link
          href="/admin/reclamations/motifs"
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors border border-slate-700"
        >
          <Settings className="w-4 h-4" />
          Gérer les motifs
        </Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Total</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div
            onClick={() => setStatusFilter("open")}
            className={`bg-slate-900 border rounded-xl p-4 cursor-pointer transition-colors ${
              statusFilter === "open" ? "border-orange-500" : "border-slate-800 hover:border-slate-700"
            }`}
          >
            <p className="text-orange-400 text-sm">Ouvertes</p>
            <p className="text-2xl font-bold text-orange-400">{stats.open}</p>
          </div>
          <div
            onClick={() => setStatusFilter("investigating")}
            className={`bg-slate-900 border rounded-xl p-4 cursor-pointer transition-colors ${
              statusFilter === "investigating" ? "border-blue-500" : "border-slate-800 hover:border-slate-700"
            }`}
          >
            <p className="text-blue-400 text-sm">Investigation</p>
            <p className="text-2xl font-bold text-blue-400">{stats.investigating}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-green-400 text-sm">Résolues</p>
            <p className="text-2xl font-bold text-green-400">{stats.resolved}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-red-400 text-sm flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Paiement bloqué
            </p>
            <p className="text-2xl font-bold text-red-400">{stats.paymentBlocked}</p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {([
          { value: "all", label: "Toutes" },
          { value: "open", label: "Ouvertes" },
          { value: "investigating", label: "Investigation" },
          { value: "resolved_client", label: "Résolu (client)" },
          { value: "resolved_announcer", label: "Résolu (annonceur)" },
          { value: "closed", label: "Fermées" },
        ] as { value: StatusFilter; label: string }[]).map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              statusFilter === tab.value
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-4 text-slate-400 font-medium">Motif</th>
                <th className="text-left px-4 py-4 text-slate-400 font-medium">Client</th>
                <th className="text-left px-4 py-4 text-slate-400 font-medium">Prestataire</th>
                <th className="text-left px-4 py-4 text-slate-400 font-medium">Mission</th>
                <th className="text-left px-4 py-4 text-slate-400 font-medium">Statut</th>
                <th className="text-left px-4 py-4 text-slate-400 font-medium">Paiement</th>
                <th className="text-left px-4 py-4 text-slate-400 font-medium">Date</th>
                <th className="text-left px-4 py-4 text-slate-400 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {disputeList?.map((dispute: EnrichedDispute, index: number) => (
                <motion.tr
                  key={dispute._id}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => setSelectedDisputeId(dispute._id)}
                >
                  <td className="px-4 py-4">
                    <p className="text-white font-medium text-sm">{dispute.reasonLabel}</p>
                    <p className="text-slate-500 text-xs line-clamp-1">{dispute.description}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-white text-sm">{dispute.clientName}</p>
                    <p className="text-slate-500 text-xs">{dispute.clientEmail}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-white text-sm">{dispute.announcerName}</p>
                    <p className="text-slate-500 text-xs">{dispute.announcerEmail}</p>
                  </td>
                  <td className="px-4 py-4">
                    {dispute.mission && (
                      <div>
                        <p className="text-white text-sm">{dispute.mission.serviceName}</p>
                        <p className="text-slate-500 text-xs">
                          {((dispute.mission.amount || 0) / 100).toFixed(2).replace(".", ",")}€
                        </p>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={dispute.status} />
                  </td>
                  <td className="px-4 py-4">
                    {dispute.paymentBlocked ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
                        <Lock className="w-3 h-3" />
                        Bloqué
                      </span>
                    ) : (
                      <span className="text-slate-500 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-slate-400 text-sm">
                      {formatRelativeTime(dispute.createdAt)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <ChevronRight className="w-5 h-5 text-slate-600" />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {disputeList?.length === 0 && (
          <div className="text-center py-12">
            <ShieldCheck className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">Aucune réclamation</p>
            <p className="text-slate-500 text-sm">
              {statusFilter !== "all" ? "Aucune réclamation avec ce statut" : "Aucune réclamation pour le moment"}
            </p>
          </div>
        )}

        {/* Loading */}
        {!disputeList && (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-slate-600 mx-auto animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
