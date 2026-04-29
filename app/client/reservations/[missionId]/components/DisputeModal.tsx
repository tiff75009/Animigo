"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  AlertTriangle,
  Send,
  Loader2,
  ShieldAlert,
  Paperclip,
  Info,
  FileText,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/app/lib/utils";
import { getAuthToken } from "@/app/lib/authToken";
import { useCloudinary } from "@/app/hooks/useCloudinary";

interface DisputeReasonItem {
  _id: Id<"disputeReasons">;
  label: string;
  slug: string;
  description?: string;
  blocksPayment: boolean;
  clientHelperMessage?: string;
}

interface AttachmentDraft {
  url: string;
  type: string;
  name?: string;
  size?: number;
}

export function DisputeModal({
  isOpen,
  onClose,
  missionId,
  serviceName,
}: {
  isOpen: boolean;
  onClose: () => void;
  missionId: string;
  serviceName: string;
}) {
  const [selectedReasonId, setSelectedReasonId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reasons = useQuery(api.planning.disputes.getDisputeReasons);
  const submitDispute = useMutation(api.planning.disputes.submitDispute);
  const { uploadImage, isConfigured: cloudinaryReady } = useCloudinary();

  const token = getAuthToken();

  const selectedReason = (reasons as DisputeReasonItem[] | undefined)?.find((r) => r._id === selectedReasonId);
  const canSubmit =
    selectedReasonId && description.length >= 20 && !isSubmitting && !isUploading;

  // Upload pièces jointes (max 5, 5 Mo chacune)
  const MAX_ATTACHMENTS = 5;
  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    if (!cloudinaryReady) {
      setUploadError("Service de upload non disponible");
      return;
    }
    const remaining = MAX_ATTACHMENTS - attachments.length;
    const toUpload = Array.from(files).slice(0, remaining);

    setIsUploading(true);
    try {
      const newAttachments: AttachmentDraft[] = [];
      for (const file of toUpload) {
        if (file.size > MAX_FILE_SIZE) {
          setUploadError(`${file.name} dépasse 5 Mo`);
          continue;
        }
        const url = await uploadImage(file, "disputes");
        if (url) {
          newAttachments.push({
            url,
            type: file.type,
            name: file.name,
            size: file.size,
          });
        }
      }
      if (newAttachments.length > 0) {
        setAttachments((prev) => [...prev, ...newAttachments]);
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Erreur upload");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!canSubmit || !token) return;

    setIsSubmitting(true);
    try {
      await submitDispute({
        sessionToken: token,
        missionId: missionId as Id<"missions">,
        reasonId: selectedReasonId as Id<"disputeReasons">,
        description: description.trim(),
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setSelectedReasonId("");
        setDescription("");
        setAttachments([]);
      }, 3000);
    } catch (error) {
      console.error("Erreur soumission réclamation:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {submitted ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">📨</div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                Réclamation envoyée
              </h3>
              <p className="text-gray-500">
                Notre équipe examinera votre demande dans les plus brefs délais.
                {selectedReason?.blocksPayment && (
                  <span className="block mt-2 text-amber-600 font-medium">
                    Le versement au prestataire est suspendu en attendant la
                    résolution.
                  </span>
                )}
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">
                      Signaler un problème
                    </h3>
                    <p className="text-sm text-gray-500">{serviceName}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-5">
                {/* Motif */}
                <div>
                  <label
                    htmlFor="dispute-reason"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Motif de la réclamation
                  </label>
                  <select
                    id="dispute-reason"
                    value={selectedReasonId}
                    onChange={(e) => setSelectedReasonId(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground appearance-none"
                  >
                    <option value="">Sélectionnez un motif...</option>
                    {(reasons as DisputeReasonItem[] | undefined)?.map((reason) => (
                      <option key={reason._id} value={reason._id}>
                        {reason.label}
                      </option>
                    ))}
                  </select>
                  {selectedReason?.description && (
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedReason.description}
                    </p>
                  )}
                </div>

                {/* Helper du motif (instructions admin pour ce motif) */}
                {selectedReason?.clientHelperMessage && (
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-blue-900 mb-1">
                        Pour ce motif
                      </p>
                      <p className="text-xs text-blue-800 whitespace-pre-wrap leading-relaxed">
                        {selectedReason.clientHelperMessage}
                      </p>
                    </div>
                  </div>
                )}

                {/* Conséquence du motif sur le paiement (toujours visible
                    une fois un motif sélectionné, pour clarifier l'impact) */}
                {selectedReason && (
                  selectedReason.blocksPayment ? (
                    <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                      <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">
                          Paiement suspendu
                        </p>
                        <p className="text-xs text-amber-600 mt-0.5">
                          Ce motif entraîne la suspension du versement au
                          prestataire en attendant la résolution.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                      <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">
                          Le paiement continue son cours
                        </p>
                        <p className="text-xs text-blue-700 mt-0.5">
                          Ce motif ne suspend pas le versement au prestataire.
                          Si la résolution vous est favorable, un remboursement
                          sera traité ensuite.
                        </p>
                      </div>
                    </div>
                  )
                )}

                {/* Description */}
                <div>
                  <label
                    htmlFor="dispute-description"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Décrivez le problème
                  </label>
                  <textarea
                    id="dispute-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Expliquez en détail ce qui s'est passé (min. 20 caractères)..."
                    className="w-full px-4 py-3 bg-gray-100 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground min-h-[120px]"
                  />
                  <p
                    className={cn(
                      "text-xs mt-1",
                      description.length < 20
                        ? "text-red-500"
                        : "text-gray-400"
                    )}
                  >
                    {description.length}/20 caractères minimum
                  </p>
                </div>

                {/* Pièces jointes */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Pièces jointes
                    <span className="text-xs text-gray-400 font-normal ml-1">
                      (photos, factures — max 5 fichiers de 5 Mo)
                    </span>
                  </label>

                  {/* Liste des attachments uploadés */}
                  {attachments.length > 0 && (
                    <div className="space-y-2 mb-2">
                      {attachments.map((att, idx) => {
                        const isImg = att.type.startsWith("image/");
                        return (
                          <div
                            key={`${att.url}-${idx}`}
                            className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            {isImg ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={att.url}
                                alt={att.name ?? "Pièce jointe"}
                                className="w-10 h-10 rounded object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center flex-shrink-0">
                                <FileText className="w-5 h-5 text-gray-500" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground truncate">
                                {att.name ?? `Fichier ${idx + 1}`}
                              </p>
                              {att.size && (
                                <p className="text-xs text-gray-400">
                                  {Math.round(att.size / 1024)} Ko
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeAttachment(idx)}
                              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Bouton ajouter */}
                  {attachments.length < MAX_ATTACHMENTS && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-100 hover:border-gray-400 transition-colors disabled:opacity-60"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Upload en cours…
                        </>
                      ) : (
                        <>
                          <Paperclip className="w-4 h-4" />
                          Ajouter une pièce jointe
                        </>
                      )}
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFilesSelected(e.target.files)}
                    className="hidden"
                  />
                  {uploadError && (
                    <p className="text-xs text-red-500 mt-1.5">{uploadError}</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-gray-200 text-foreground rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Envoyer
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
