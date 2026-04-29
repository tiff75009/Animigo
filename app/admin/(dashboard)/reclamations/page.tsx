"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  UserX,
  Ban,
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
  payoutAlreadyDoneAtCreation?: boolean;
  attachments?: Array<{ url: string; type: string; name?: string; size?: number }>;
  announcerResponse?: string;
  announcerRespondedAt?: number;
  announcerResponseAttachments?: Array<{ url: string; type: string; name?: string; size?: number }>;
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
  const [suspendAnnouncer, setSuspendAnnouncer] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [closeMission, setCloseMission] = useState(false);
  const [refundClient, setRefundClient] = useState(false);
  const [refundAmountEuros, setRefundAmountEuros] = useState("");
  // Filtre additionnel : par état du paiement
  type PaymentFilter = "all" | "blocked" | "not_blocked" | "payout_done";
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");

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
  const resolveWithActions = useMutation(api.admin.disputes.resolveDisputeWithActions);
  const addNote = useMutation(api.admin.disputes.addAdminNote);

  /**
   * Remplace dynamiquement les balises connues d'un template de résolution
   * par les vraies valeurs de la réclamation/mission.
   *
   * Balises supportées (insensibles aux espaces, accolades simples) :
   *   {service}        → nom du service
   *   {date}           → date de début de mission (format long FR)
   *   {date_courte}    → date courte (jj/mm/aaaa)
   *   {montant}        → montant total mission (en €, ex "45,00")
   *   {client_name}    → prénom + initiale nom du client
   *   {client_prenom}  → prénom seul du client
   *   {announcer_name} → prénom + initiale nom de l'annonceur
   *   {motif}          → libellé du motif de réclamation
   *
   * Les balises avec choix multiples ("{a / b / c}") sont laissées
   * intactes — c'est à l'admin de choisir / supprimer.
   */
  const interpolateResolutionTemplate = useCallback(
    (tpl: string, detail: NonNullable<typeof selectedDetail>): string => {
      const m = detail.mission;
      const c = detail.client;
      const a = detail.announcer;

      const formatLongDate = (dateStr?: string) => {
        if (!dateStr) return "—";
        const [y, mo, d] = dateStr.split("-").map(Number);
        if (!y || !mo || !d) return dateStr;
        return new Date(y, mo - 1, d).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      };
      const formatShortDate = (dateStr?: string) => {
        if (!dateStr) return "—";
        const [y, mo, d] = dateStr.split("-").map(Number);
        if (!y || !mo || !d) return dateStr;
        return `${String(d).padStart(2, "0")}/${String(mo).padStart(2, "0")}/${y}`;
      };
      const euros = (cents?: number) =>
        ((cents ?? 0) / 100).toFixed(2).replace(".", ",");

      const replacements: Record<string, string> = {
        service: m?.serviceName ?? "votre prestation",
        date: formatLongDate(m?.startDate),
        date_courte: formatShortDate(m?.startDate),
        montant: euros(m?.amount),
        client_name: c
          ? `${c.firstName ?? ""} ${c.lastName ? c.lastName.charAt(0) + "." : ""}`.trim()
          : "le client",
        client_prenom: c?.firstName ?? "le client",
        announcer_name: a
          ? `${a.firstName ?? ""} ${a.lastName ? a.lastName.charAt(0) + "." : ""}`.trim()
          : "le prestataire",
        motif: detail.reasonLabel ?? "—",
      };

      // Regex matche {clé} avec espaces optionnels et SANS slash interne
      // (pour ne pas toucher aux balises de choix "{a / b}")
      return tpl.replace(/\{\s*([a-z_]+)\s*\}/g, (match, key: string) => {
        const value = replacements[key.toLowerCase()];
        return value !== undefined ? value : match;
      });
    },
    []
  );

  // Pré-remplissage de la résolution depuis le template du motif sélectionné.
  // ⚠️ On ne pré-remplit qu'une seule fois par dispute (évite d'écraser ce
  //    que l'admin tape). Quand on change de dispute, on autorise un nouveau remplissage.
  const lastPrefilledDisputeIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedDetail) return;
    const did = String(selectedDetail._id);
    if (lastPrefilledDisputeIdRef.current === did) return;
    lastPrefilledDisputeIdRef.current = did;
    const tpl = selectedDetail.reason?.resolutionTemplate;
    if (tpl && resolution.trim() === "") {
      setResolution(interpolateResolutionTemplate(tpl, selectedDetail));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDetail?._id, selectedDetail?.reason?.resolutionTemplate]);

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
      const wantsRefund = newStatus === "resolved_client" && refundClient;
      const refundAmountCents = wantsRefund && refundAmountEuros.trim()
        ? Math.round(parseFloat(refundAmountEuros.replace(",", ".")) * 100)
        : undefined;
      if (suspendAnnouncer || closeMission || wantsRefund) {
        await resolveWithActions({
          token,
          disputeId,
          status: newStatus,
          resolution: resolution || undefined,
          adminNotes: adminNote || undefined,
          suspendAnnouncer: suspendAnnouncer || undefined,
          suspendReason: suspendReason || undefined,
          closeMission: closeMission || undefined,
          refundClient: wantsRefund || undefined,
          refundAmount: refundAmountCents,
        });
      } else {
        await updateStatus({
          token,
          disputeId,
          status: newStatus,
          resolution: resolution || undefined,
          adminNotes: adminNote || undefined,
        });
      }
      setResolution("");
      setAdminNote("");
      setSuspendAnnouncer(false);
      setSuspendReason("");
      setCloseMission(false);
      setRefundClient(false);
      setRefundAmountEuros("");
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
  const allDisputes = disputes as EnrichedDispute[] | undefined;
  // Application du filtre paiement (côté client puisque la query backend ne le supporte pas)
  const disputeList = (allDisputes ?? []).filter((d) => {
    switch (paymentFilter) {
      case "blocked":
        return (
          d.paymentBlocked &&
          d.status !== "resolved_announcer" &&
          d.status !== "closed"
        );
      case "not_blocked":
        return !d.paymentBlocked;
      case "payout_done":
        return d.payoutAlreadyDoneAtCreation === true;
      case "all":
      default:
        return true;
    }
  }) as EnrichedDispute[];
  const stats = allDisputes
    ? {
        total: allDisputes.length,
        open: allDisputes.filter((d) => d.status === "open").length,
        investigating: allDisputes.filter((d) => d.status === "investigating").length,
        resolved: allDisputes.filter((d) => d.status === "resolved_client" || d.status === "resolved_announcer").length,
        paymentBlocked: allDisputes.filter((d) => d.paymentBlocked && d.status !== "resolved_announcer" && d.status !== "closed").length,
        announcerResponded: allDisputes.filter(
          (d) => d.announcerResponse && d.status === "investigating"
        ).length,
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

              {/* ⚠️ Payout déjà parti AVANT ouverture de la dispute → reversal manuel */}
              {selectedDetail.payoutAlreadyDoneAtCreation && (
                <div className="flex items-start gap-3 p-3 bg-orange-500/10 border border-orange-500/40 rounded-xl mb-4">
                  <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-orange-300">
                      Versement annonceur déjà effectué avant la réclamation
                    </p>
                    <p className="text-xs text-orange-300/80 mt-0.5">
                      Cette réclamation a été ouverte APRÈS le versement
                      annonceur. En cas de remboursement client, un reversal
                      manuel devra être initié sur le tableau de bord Stripe
                      (ou le solde plateforme avancera pour absorber le
                      remboursement).
                    </p>
                  </div>
                </div>
              )}

              {/* Description client */}
              <div className="bg-slate-800/50 rounded-xl p-4">
                <p className="text-sm font-medium text-slate-300 mb-2">Description du client</p>
                <p className="text-slate-200 whitespace-pre-wrap">{selectedDetail.description}</p>

                {/* Pièces jointes client */}
                {selectedDetail.attachments && selectedDetail.attachments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-700/50">
                    <p className="text-xs font-medium text-slate-400 mb-2">
                      Pièces jointes ({selectedDetail.attachments.length})
                    </p>
                    <AttachmentList attachments={selectedDetail.attachments} />
                  </div>
                )}
              </div>

              {/* Réponse de l'annonceur */}
              {selectedDetail.announcerResponse && (
                <div className="bg-amber-500/5 rounded-xl p-4 border border-amber-500/20 mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-amber-300">
                      Réponse de l&apos;annonceur
                    </p>
                    {selectedDetail.announcerRespondedAt && (
                      <span className="text-xs text-slate-500">
                        {formatDate(selectedDetail.announcerRespondedAt)}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-200 whitespace-pre-wrap text-sm">
                    {selectedDetail.announcerResponse}
                  </p>
                  {selectedDetail.announcerResponseAttachments &&
                    selectedDetail.announcerResponseAttachments.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-amber-500/15">
                        <p className="text-xs font-medium text-slate-400 mb-2">
                          Pièces jointes annonceur (
                          {selectedDetail.announcerResponseAttachments.length})
                        </p>
                        <AttachmentList
                          attachments={selectedDetail.announcerResponseAttachments}
                        />
                      </div>
                    )}
                </div>
              )}

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

                {/* Options de clôture */}
                <div className="mb-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700 space-y-3">
                  <p className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-slate-400" />
                    Options de clôture
                  </p>

                  {/* Suspendre l'annonceur */}
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={suspendAnnouncer}
                      onChange={(e) => setSuspendAnnouncer(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-700 text-red-500 focus:ring-red-500 focus:ring-offset-0"
                    />
                    <div>
                      <span className="text-sm text-white flex items-center gap-1.5 group-hover:text-red-400 transition-colors">
                        <UserX className="w-3.5 h-3.5" />
                        Suspendre le compte annonceur
                      </span>
                      <span className="text-xs text-slate-500">
                        Le prestataire sera déconnecté et ne pourra plus accéder à son espace
                      </span>
                    </div>
                  </label>

                  {/* Raison de suspension (conditionnelle) */}
                  {suspendAnnouncer && (
                    <div className="ml-7">
                      <input
                        type="text"
                        value={suspendReason}
                        onChange={(e) => setSuspendReason(e.target.value)}
                        placeholder="Raison de la suspension..."
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                      />
                    </div>
                  )}

                  {/* Clôturer la réservation */}
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={closeMission}
                      onChange={(e) => setCloseMission(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
                    />
                    <div>
                      <span className="text-sm text-white flex items-center gap-1.5 group-hover:text-amber-400 transition-colors">
                        <Ban className="w-3.5 h-3.5" />
                        Clôturer la réservation
                      </span>
                      <span className="text-xs text-slate-500">
                        La mission sera marquée comme annulée par le système
                      </span>
                    </div>
                  </label>

                  {/* Remboursement client (n'apparaît que si pas déjà remboursé) */}
                  {selectedDetail.mission?.paymentStatus !== "refunded" && (
                    <>
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={refundClient}
                          onChange={(e) => setRefundClient(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                        />
                        <div>
                          <span className="text-sm text-white flex items-center gap-1.5 group-hover:text-emerald-400 transition-colors">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Rembourser le client
                          </span>
                          <span className="text-xs text-slate-500">
                            Déclenche un refund Stripe + met à jour la mission
                            (uniquement si statut « Résolu en faveur du client »)
                          </span>
                        </div>
                      </label>

                      {refundClient && (() => {
                        // Calcul du remboursement maxi : prix service uniquement
                        // (commission plateforme + frais Stripe sont conservés)
                        const total = selectedDetail.mission?.amount ?? 0;
                        const platformFee = selectedDetail.mission?.platformFee ?? 0;
                        const stripeFee = selectedDetail.mission?.stripeFee ?? 0;
                        const maxRefundable = Math.max(0, total - platformFee - stripeFee);
                        const totalEuros = (total / 100).toFixed(2).replace(".", ",");
                        const platformEuros = (platformFee / 100).toFixed(2).replace(".", ",");
                        const stripeEuros = (stripeFee / 100).toFixed(2).replace(".", ",");
                        const maxEuros = (maxRefundable / 100).toFixed(2).replace(".", ",");
                        return (
                          <div className="ml-7 space-y-2">
                            {/* Breakdown : commission/frais retenus */}
                            <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/50 text-[11px] space-y-0.5">
                              <p className="font-semibold text-slate-300 mb-1">
                                Décomposition du paiement
                              </p>
                              <div className="flex justify-between text-slate-400">
                                <span>Total payé par le client</span>
                                <span className="text-slate-200">{totalEuros} €</span>
                              </div>
                              <div className="flex justify-between text-slate-500">
                                <span>− Commission plateforme (retenue)</span>
                                <span>− {platformEuros} €</span>
                              </div>
                              <div className="flex justify-between text-slate-500">
                                <span>− Frais Stripe (retenus)</span>
                                <span>− {stripeEuros} €</span>
                              </div>
                              <div className="flex justify-between pt-1 mt-1 border-t border-slate-700/50">
                                <span className="font-semibold text-emerald-300">
                                  Max remboursable au client
                                </span>
                                <span className="font-bold text-emerald-300">
                                  {maxEuros} €
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max={maxRefundable / 100}
                                value={refundAmountEuros}
                                onChange={(e) => setRefundAmountEuros(e.target.value)}
                                placeholder={`Max : ${maxEuros}`}
                                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                              />
                              <span className="text-sm text-slate-400">€</span>
                              <button
                                type="button"
                                onClick={() => setRefundAmountEuros(maxEuros)}
                                className="text-xs text-emerald-400 hover:text-emerald-300 underline whitespace-nowrap"
                              >
                                Max
                              </button>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              Laisser vide pour rembourser la totalité du service
                              ({maxEuros} €) automatiquement. Les frais Stripe et
                              la commission ne sont jamais remboursés.
                            </p>
                          </div>
                        );
                      })()}
                    </>
                  )}

                  {selectedDetail.mission?.paymentStatus === "refunded" && (
                    <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                      Mission déjà remboursée
                      {selectedDetail.mission?.refundAmount && (
                        <span className="ml-auto font-semibold">
                          {(selectedDetail.mission.refundAmount / 100).toFixed(2)}€
                        </span>
                      )}
                    </div>
                  )}
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

      {/* Alerte top : nouvelles réponses annonceur à examiner */}
      {stats && stats.announcerResponded > 0 && (
        <div
          className="mb-4 p-4 rounded-xl border-2 border-blue-500/50 bg-blue-500/10 flex items-start gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">💬</span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-blue-300">
              {stats.announcerResponded} réponse
              {stats.announcerResponded > 1 ? "s" : ""} d&apos;annonceur
              {stats.announcerResponded > 1 ? "s" : ""} à examiner
            </p>
            <p className="text-sm text-blue-200/80 mt-0.5">
              {stats.announcerResponded > 1
                ? "Les annonceurs ont apporté leur version des faits sur ces réclamations. Examinez les deux côtés pour trancher."
                : "L'annonceur a apporté sa version des faits sur cette réclamation. Examinez les deux côtés pour trancher."}
            </p>
          </div>
          <button
            onClick={() => setStatusFilter("investigating")}
            className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors flex-shrink-0"
          >
            Voir
          </button>
        </div>
      )}

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

      {/* Filter tabs (statut) */}
      <div className="flex gap-2 mb-3 flex-wrap">
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

      {/* Filter tabs (paiement) — second niveau */}
      <div className="flex gap-2 mb-6 flex-wrap items-center">
        <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">
          Paiement :
        </span>
        {([
          { value: "all", label: "Tous", icon: null },
          { value: "blocked", label: "Bloqués", icon: <Lock className="w-3 h-3" /> },
          { value: "not_blocked", label: "Non bloquants", icon: <Unlock className="w-3 h-3" /> },
          { value: "payout_done", label: "Payout déjà parti", icon: <AlertTriangle className="w-3 h-3" /> },
        ] as { value: PaymentFilter; label: string; icon: React.ReactNode }[]).map((tab) => (
          <button
            key={tab.value}
            onClick={() => setPaymentFilter(tab.value)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors ${
              paymentFilter === tab.value
                ? tab.value === "payout_done"
                  ? "bg-orange-600 text-white"
                  : tab.value === "blocked"
                    ? "bg-red-600 text-white"
                    : "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            {tab.icon}
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
                    <div className="flex items-start gap-2">
                      {/* Pastille d'alerte si l'annonceur vient de répondre */}
                      {dispute.announcerResponse &&
                        dispute.status === "investigating" && (
                          <div
                            className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0 animate-pulse"
                            title="Nouvelle réponse de l'annonceur"
                          />
                        )}
                      <div className="min-w-0">
                        <p className="text-white font-medium text-sm">
                          {dispute.reasonLabel}
                        </p>
                        <p className="text-slate-500 text-xs line-clamp-1">
                          {dispute.description}
                        </p>
                        {dispute.announcerResponse &&
                          dispute.status === "investigating" && (
                            <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              💬 Réponse annonceur — à examiner
                            </span>
                          )}
                      </div>
                    </div>
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
                    <div className="flex flex-col gap-1 items-start">
                      {dispute.paymentBlocked &&
                      dispute.status !== "resolved_announcer" &&
                      dispute.status !== "closed" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
                          <Lock className="w-3 h-3" />
                          Bloqué
                        </span>
                      ) : !dispute.paymentBlocked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-500/20 text-slate-400 text-xs rounded-full">
                          <Unlock className="w-3 h-3" />
                          Non bloquant
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">—</span>
                      )}
                      {dispute.payoutAlreadyDoneAtCreation && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500/20 text-orange-400 text-[10px] rounded-full"
                          title="Versement annonceur déjà parti — reversal Stripe manuel requis"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          Payout parti
                        </span>
                      )}
                    </div>
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

// ────────────────────────────────────────────────────────────────────
// Composant : liste de pièces jointes (vignettes pour images, lien sinon)
// ────────────────────────────────────────────────────────────────────
function AttachmentList({
  attachments,
}: {
  attachments: Array<{ url: string; type: string; name?: string; size?: number }>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {attachments.map((att, i) => {
        const isImage = att.type.startsWith("image/");
        const niceName = att.name ?? `Pièce jointe ${i + 1}`;
        const sizeKb = att.size ? Math.round(att.size / 1024) : null;
        return (
          <a
            key={`${att.url}-${i}`}
            href={att.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex items-center gap-2 px-2.5 py-1.5 bg-slate-900/60 border border-slate-700 hover:border-blue-500/50 rounded-lg transition-colors"
            title={niceName}
          >
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={att.url}
                alt={niceName}
                className="w-10 h-10 rounded object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded bg-slate-700/50 flex items-center justify-center text-[10px] text-slate-400 uppercase font-bold">
                {att.type.split("/").pop()?.slice(0, 4) ?? "FILE"}
              </div>
            )}
            <div className="text-left min-w-0 max-w-[160px]">
              <p className="text-xs text-slate-200 truncate">{niceName}</p>
              {sizeKb && (
                <p className="text-[10px] text-slate-500">{sizeKb} Ko</p>
              )}
            </div>
          </a>
        );
      })}
    </div>
  );
}
