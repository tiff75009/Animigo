"use client";

/**
 * Composant partagé pour afficher la liste des réclamations,
 * adaptable selon le rôle (client vs annonceur).
 *
 * - Client : voit les disputes qu'il a ouvertes, peut suivre la résolution.
 * - Annonceur : voit les disputes le concernant, peut donner sa version.
 */

import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCloudinary } from "@/app/hooks/useCloudinary";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Loader2,
  Lock,
  MessageSquare,
  Paperclip,
  Send,
  Wallet,
  X,
} from "lucide-react";

// ─── Types unifiés (intersection des champs client / annonceur) ───
export interface DisputeItem {
  _id: Id<"disputes">;
  missionId: Id<"missions">;
  reasonLabel: string;
  description: string;
  attachments?: Array<{
    url: string;
    type: string;
    name?: string;
    size?: number;
  }>;
  status:
    | "open"
    | "investigating"
    | "resolved_client"
    | "resolved_announcer"
    | "closed";
  paymentBlocked: boolean;
  announcerResponse?: string;
  announcerRespondedAt?: number;
  announcerResponseAttachments?: Array<{
    url: string;
    type: string;
    name?: string;
    size?: number;
  }>;
  resolution?: string;
  resolvedAt?: number;
  createdAt: number;

  // Différent selon le rôle
  serviceName: string;
  startDate?: string;
  missionAmount?: number;
  refundAmount?: number;
  // Côté client : nom de l'annonceur ; côté annonceur : nom du client
  announcerName?: string;
  clientName?: string;
}

interface AttachmentDraft {
  url: string;
  type: string;
  name?: string;
  size?: number;
}

const STATUS_LABEL: Record<
  string,
  { label: string; cls: string; tone: "red" | "amber" | "emerald" | "slate" }
> = {
  open: {
    label: "Ouverte",
    cls: "bg-red-100 text-red-700 border border-red-200",
    tone: "red",
  },
  investigating: {
    label: "En investigation",
    cls: "bg-amber-100 text-amber-700 border border-amber-200",
    tone: "amber",
  },
  resolved_client: {
    label: "Résolue (client)",
    cls: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    tone: "emerald",
  },
  resolved_announcer: {
    label: "Résolue (annonceur)",
    cls: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    tone: "emerald",
  },
  closed: {
    label: "Clôturée",
    cls: "bg-slate-100 text-slate-700 border border-slate-200",
    tone: "slate",
  },
};

const formatDateLong = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatDateShort = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatPrice = (cents: number) =>
  `${(cents / 100).toFixed(2).replace(".", ",")} €`;

// ─── Vue tableau (liste) ─────────────────────────────────────────────
interface DisputeListPanelProps {
  disputes: DisputeItem[];
  role: "client" | "announcer";
  token: string;
  // Filtres optionnels (UI gérée à l'intérieur du composant)
  showFilters?: boolean;
}

export function DisputeListPanel({
  disputes,
  role,
  token,
  showFilters = true,
}: DisputeListPanelProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = disputes.filter((d) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active") {
      return d.status === "open" || d.status === "investigating";
    }
    if (statusFilter === "resolved") {
      return d.status === "resolved_client" || d.status === "resolved_announcer";
    }
    if (statusFilter === "closed") return d.status === "closed";
    return true;
  });

  const counts = {
    all: disputes.length,
    active: disputes.filter(
      (d) => d.status === "open" || d.status === "investigating"
    ).length,
    resolved: disputes.filter(
      (d) =>
        d.status === "resolved_client" || d.status === "resolved_announcer"
    ).length,
    closed: disputes.filter((d) => d.status === "closed").length,
  };

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: "all", label: "Toutes", count: counts.all },
              { value: "active", label: "En cours", count: counts.active },
              { value: "resolved", label: "Résolues", count: counts.resolved },
              { value: "closed", label: "Clôturées", count: counts.closed },
            ] as const
          ).map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                statusFilter === tab.value
                  ? "bg-foreground text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  statusFilter === tab.value
                    ? "bg-white/20 text-white"
                    : "bg-white text-gray-500"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div
          className="text-center py-12 rounded-2xl"
          style={{ background: "#fff", border: "1px solid #ece9e1" }}
        >
          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-500" />
          <p className="text-gray-700 font-medium text-sm">
            {statusFilter === "all"
              ? "Aucune réclamation"
              : "Aucune réclamation dans cette catégorie"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <DisputeCard key={d._id} dispute={d} role={role} token={token} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Card dépliable ──────────────────────────────────────────────────
function DisputeCard({
  dispute,
  role,
  token,
}: {
  dispute: DisputeItem;
  role: "client" | "announcer";
  token: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submitResponse = useMutation(
    api.planning.disputes.submitAnnouncerResponse
  );
  const { uploadImage, isConfigured: cloudinaryReady } = useCloudinary();

  const status = STATUS_LABEL[dispute.status] ?? STATUS_LABEL.open;
  const isInProgress =
    dispute.status === "open" || dispute.status === "investigating";
  const paymentSuspended =
    dispute.paymentBlocked &&
    dispute.status !== "resolved_announcer" &&
    dispute.status !== "closed";

  // Annonceur seulement : peut répondre une fois, et uniquement si pas clos
  const canRespond =
    role === "announcer" &&
    !dispute.announcerResponse &&
    dispute.status !== "closed";

  const peerName =
    role === "client" ? dispute.announcerName : dispute.clientName;
  const peerLabel = role === "client" ? "avec" : "par";

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!cloudinaryReady) {
      setError("Service d'upload non disponible");
      return;
    }
    setError(null);
    setIsUploading(true);
    try {
      const remaining = 5 - attachments.length;
      const list: AttachmentDraft[] = [];
      for (const f of Array.from(files).slice(0, remaining)) {
        if (f.size > 5 * 1024 * 1024) {
          setError(`${f.name} dépasse 5 Mo`);
          continue;
        }
        const url = await uploadImage(f, "disputes");
        if (url) list.push({ url, type: f.type, name: f.name, size: f.size });
      }
      if (list.length > 0) setAttachments((p) => [...p, ...list]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur upload");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (responseText.trim().length < 20 || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await submitResponse({
        sessionToken: token,
        disputeId: dispute._id,
        response: responseText.trim(),
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      setExpanded(false);
      setResponseText("");
      setAttachments([]);
    } catch (e) {
      let msg = "Erreur lors de l'envoi";
      if (typeof e === "object" && e !== null && "data" in e) {
        const cv = e as { data?: string | { message?: string } };
        if (typeof cv.data === "string") msg = cv.data;
        else if (cv.data?.message) msg = cv.data.message;
      } else if (e instanceof Error) {
        msg = e.message;
      }
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id={`dispute-${dispute._id}`}
      className="rounded-2xl overflow-hidden"
      style={{ background: "#fff", border: "1px solid #ece9e1" }}
    >
      {/* Header cliquable */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left p-4 sm:p-5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center"
            style={{ background: "#fdf3f3" }}
          >
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${status.cls}`}
              >
                {status.label}
              </span>
              {paymentSuspended && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                  <Lock className="w-2.5 h-2.5" />
                  {role === "announcer"
                    ? "Votre versement suspendu"
                    : "Versement suspendu"}
                </span>
              )}
              {role === "announcer" && dispute.announcerResponse && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Vous avez répondu
                </span>
              )}
              {role === "announcer" &&
                isInProgress &&
                !dispute.announcerResponse && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white animate-pulse">
                    <AlertCircle className="w-2.5 h-2.5" />
                    Action requise
                  </span>
                )}
              {role === "client" &&
                dispute.status === "resolved_client" &&
                (dispute.refundAmount ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Wallet className="w-2.5 h-2.5" />
                    Remboursement : {formatPrice(dispute.refundAmount!)}
                  </span>
                )}
            </div>
            <p className="text-sm font-semibold text-foreground">
              {dispute.reasonLabel}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>Mission : {dispute.serviceName}</span>
              {dispute.startDate && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDateShort(dispute.startDate)}
                  </span>
                </>
              )}
              {peerName && (
                <>
                  <span>•</span>
                  <span>
                    {peerLabel} {peerName}
                  </span>
                </>
              )}
              {dispute.missionAmount && (
                <>
                  <span>•</span>
                  <span>{formatPrice(dispute.missionAmount)}</span>
                </>
              )}
            </p>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-gray-100"
          >
            <div className="p-4 sm:p-5 space-y-4">
              {/* Bandeau "versement suspendu" — annonceur uniquement */}
              {role === "announcer" && paymentSuspended && (
                <div
                  className="flex items-start gap-2.5 p-3 rounded-xl"
                  style={{ background: "#fef2f2", border: "1px solid #fecaca" }}
                >
                  <Lock className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
                  <div className="text-xs leading-relaxed text-red-800">
                    <p className="font-semibold mb-0.5">
                      Votre versement est suspendu
                    </p>
                    <p>
                      Tant que cette réclamation n&apos;est pas résolue, le
                      paiement de cette mission ne sera pas versé sur votre
                      compte.
                    </p>
                  </div>
                </div>
              )}

              {/* Description client (vue par les 2 rôles) */}
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    {role === "client"
                      ? "Votre description"
                      : "Description du client"}
                  </p>
                  <span className="text-[11px] text-gray-400">
                    <Clock className="inline w-3 h-3 mr-1" />
                    {formatDateLong(dispute.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {dispute.description}
                </p>
                {dispute.attachments && dispute.attachments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-[11px] font-medium text-gray-500 mb-1.5">
                      Pièces jointes ({dispute.attachments.length})
                    </p>
                    <AttachmentList attachments={dispute.attachments} />
                  </div>
                )}
              </div>

              {/* Réponse annonceur (vue par les 2 rôles) */}
              {dispute.announcerResponse && (
                <div
                  className="rounded-xl p-3"
                  style={{ background: "#f0f9ff", border: "1px solid #bae6fd" }}
                >
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {role === "announcer"
                      ? "Votre réponse"
                      : "Réponse de l'annonceur"}
                    {dispute.announcerRespondedAt && (
                      <span className="text-[11px] font-normal text-blue-500 normal-case ml-1">
                        · {formatDateLong(dispute.announcerRespondedAt)}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-blue-900 whitespace-pre-wrap">
                    {dispute.announcerResponse}
                  </p>
                  {dispute.announcerResponseAttachments &&
                    dispute.announcerResponseAttachments.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-blue-200/60">
                        <p className="text-[11px] font-medium text-blue-600 mb-1.5">
                          Pièces jointes (
                          {dispute.announcerResponseAttachments.length})
                        </p>
                        <AttachmentList
                          attachments={dispute.announcerResponseAttachments}
                        />
                      </div>
                    )}
                </div>
              )}

              {/* Résolution admin (vue par les 2 rôles) */}
              {dispute.resolution && (
                <div
                  className="rounded-xl p-3"
                  style={{ background: "#f5f3ff", border: "1px solid #ddd6fe" }}
                >
                  <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Message de l&apos;équipe Animigo
                    {dispute.resolvedAt && (
                      <span className="text-[11px] font-normal text-violet-500 normal-case ml-1">
                        · {formatDateLong(dispute.resolvedAt)}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-violet-900 whitespace-pre-wrap">
                    {dispute.resolution}
                  </p>
                </div>
              )}

              {/* Formulaire réponse annonceur */}
              {canRespond ? (
                <div>
                  <label
                    htmlFor={`resp-${dispute._id}`}
                    className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1.5 mb-2"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Votre version des faits
                  </label>
                  <textarea
                    id={`resp-${dispute._id}`}
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    rows={5}
                    placeholder="Décrivez ce qui s'est réellement passé. Cette réponse sera envoyée à l'admin et au client (min. 20 caractères)."
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
                  />
                  <p
                    className={`text-[11px] mt-1 ${
                      responseText.length < 20 ? "text-red-500" : "text-gray-400"
                    }`}
                  >
                    {responseText.length}/20 caractères minimum
                  </p>

                  <div className="mt-3">
                    {attachments.length > 0 && (
                      <div className="space-y-2 mb-2">
                        {attachments.map((att, idx) => (
                          <div
                            key={`${att.url}-${idx}`}
                            className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            {att.type.startsWith("image/") ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={att.url}
                                alt={att.name ?? ""}
                                className="w-10 h-10 rounded object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center flex-shrink-0">
                                <FileText className="w-5 h-5 text-gray-500" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">
                                {att.name ?? `Fichier ${idx + 1}`}
                              </p>
                              {att.size && (
                                <p className="text-[11px] text-gray-400">
                                  {Math.round(att.size / 1024)} Ko
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setAttachments((p) =>
                                  p.filter((_, i) => i !== idx)
                                )
                              }
                              className="p-1.5 text-gray-400 hover:text-red-500"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {attachments.length < 5 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl text-xs text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-60"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Upload…
                          </>
                        ) : (
                          <>
                            <Paperclip className="w-3.5 h-3.5" />
                            Ajouter une preuve (photo, facture)
                          </>
                        )}
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFiles(e.target.files)}
                      className="hidden"
                    />
                  </div>

                  {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

                  <div className="flex justify-end mt-3">
                    <button
                      onClick={handleSubmit}
                      disabled={
                        responseText.trim().length < 20 ||
                        isSubmitting ||
                        isUploading
                      }
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          Envoyer ma réponse
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Composant pièces jointes ────────────────────────────────────────
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
            className="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-gray-200 hover:border-primary/40 rounded-lg transition-colors"
            title={niceName}
          >
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={att.url}
                alt={niceName}
                className="w-9 h-9 rounded object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded bg-gray-100 flex items-center justify-center">
                <FileText className="w-4 h-4 text-gray-500" />
              </div>
            )}
            <div className="text-left min-w-0 max-w-[140px]">
              <p className="text-[11px] text-gray-700 truncate">{niceName}</p>
              {sizeKb && (
                <p className="text-[10px] text-gray-400">{sizeKb} Ko</p>
              )}
            </div>
          </a>
        );
      })}
    </div>
  );
}
