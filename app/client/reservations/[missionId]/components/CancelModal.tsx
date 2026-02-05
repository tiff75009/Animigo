"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, Loader2, Info } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

function formatPrice(cents: number): string {
  const euros = Math.round(cents) / 100;
  return euros.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface CancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  missionId: string;
  serviceName: string;
  animalName: string;
  announcerName: string;
  startDate: string;
  endDate: string;
  token: string;
}

export function CancelModal({
  isOpen,
  onClose,
  onConfirm,
  missionId,
  serviceName,
  animalName,
  announcerName,
  startDate,
  endDate,
  token,
}: CancelModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const preview = useQuery(
    api.planning.cancellation.getCancellationPreview,
    isOpen && token
      ? { token, missionId: missionId as Id<"missions"> }
      : "skip"
  );

  const handleConfirm = async () => {
    if (!reason.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm(reason.trim());
      setReason("");
      onClose();
    } catch (error) {
      console.error("Erreur lors de l'annulation:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateShort = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        >
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Annuler ma réservation</h2>
                  <p className="text-xs text-gray-500">Cette action est irréversible</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Récap réservation */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="font-medium text-gray-900">{serviceName}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {animalName} &bull; {announcerName}
                </p>
                <p className="text-sm text-gray-500">
                  {formatDateShort(startDate)} - {formatDateShort(endDate)}
                </p>
              </div>

              {/* Détail séances (multi-séance uniquement) */}
              {preview?.sessionBreakdown && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-2">
                  <p className="font-medium text-amber-900 text-sm">Détail des séances</p>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Séances effectuées (non remboursables)</span>
                    <span className="font-medium text-gray-900">
                      {preview.sessionBreakdown.pastSessions} / {preview.sessionBreakdown.totalSessions}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Montant des séances passées</span>
                    <span className="font-medium text-gray-500">
                      {formatPrice(preview.sessionBreakdown.pastSessionsAmount)}
                    </span>
                  </div>

                  <div className="border-t border-amber-200 pt-2 mt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Séances restantes</span>
                      <span className="font-medium text-amber-700">
                        {preview.sessionBreakdown.remainingSessions} x {formatPrice(preview.sessionBreakdown.amountPerSession)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Récap remboursement */}
              {preview === undefined ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : preview && !preview.canCancel ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-red-700 font-medium text-sm">{preview.reason}</p>
                </div>
              ) : preview ? (
                <>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="w-4 h-4 text-blue-600" />
                      <p className="font-medium text-blue-900 text-sm">Récapitulatif remboursement</p>
                    </div>

                    {preview.totalPaid > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Montant payé</span>
                        <span className="font-medium">{formatPrice(preview.totalPaid)}</span>
                      </div>
                    )}

                    {preview.platformFeeRetained > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Commission plateforme</span>
                        <span className="text-red-600">-{formatPrice(preview.platformFeeRetained)}</span>
                      </div>
                    )}

                    {preview.announcerRetained > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Retenu par l&apos;annonceur</span>
                        <span className="text-red-600">-{formatPrice(preview.announcerRetained)}</span>
                      </div>
                    )}

                    <div className="border-t border-blue-200 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-900">Remboursement</span>
                        <span className={`font-bold ${preview.refundAmount > 0 ? "text-green-600" : "text-red-600"}`}>
                          {preview.refundAmount > 0
                            ? formatPrice(preview.refundAmount)
                            : "Aucun remboursement"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 italic">{preview.reason}</p>

                  {preview.cancellationCount > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-amber-800">
                        Vous avez déjà {preview.cancellationCount} annulation{preview.cancellationCount > 1 ? "s" : ""} sur les 12 derniers mois. Les conditions de remboursement sont moins favorables.
                      </p>
                    </div>
                  )}
                </>
              ) : null}

              {/* Raison */}
              {preview?.canCancel !== false && (
                <div>
                  <label htmlFor="cancel-reason" className="block text-sm font-medium text-gray-700 mb-2">
                    Raison de l&apos;annulation <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="cancel-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Expliquez pourquoi vous souhaitez annuler..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 text-center bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Retour
              </button>
              {preview?.canCancel !== false && (
                <button
                  onClick={handleConfirm}
                  disabled={!reason.trim() || isSubmitting || !preview}
                  className="flex-1 py-3 text-center bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  {isSubmitting ? "Annulation..." : "Confirmer l'annulation"}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
