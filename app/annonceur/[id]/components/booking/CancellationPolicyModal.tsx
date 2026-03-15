"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, AlertTriangle, XCircle, ClipboardList, Calculator } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface CancellationPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceType: "uni_seance" | "garde" | "collectif" | "multi_seance";
  numberOfSessions?: number;
  totalPrice?: number;
  announcerPolicy?: {
    refundMode: "per_session" | "percentage_remaining";
    commissionPercent: number;
  } | null;
  clientInfo?: {
    cancellationCount: number;
    secondAnnouncerPercent: number;
  } | null;
}

function formatPriceCents(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " \u20ac";
}

export default function CancellationPolicyModal({
  isOpen,
  onClose,
  serviceType,
  numberOfSessions,
  totalPrice,
  announcerPolicy,
  clientInfo,
}: CancellationPolicyModalProps) {
  const isMultiOrCollectif = serviceType === "collectif" || serviceType === "multi_seance";

  // Calcul des montants pour l'exemple
  const sessions = numberOfSessions || 1;
  const pricePerSession = totalPrice && sessions > 0 ? Math.round(totalPrice / sessions) : 0;
  const exampleCompletedSessions = 1;
  const exampleRemainingSessions = Math.max(0, sessions - exampleCompletedSessions);
  const exampleRemainingAmount = pricePerSession * exampleRemainingSessions;

  const refundMode = announcerPolicy?.refundMode || "per_session";
  const commissionPercent = announcerPolicy?.commissionPercent || 0;

  // Montant retenu par l'annonceur (mode percentage_remaining)
  const announcerRetained = refundMode === "percentage_remaining"
    ? Math.round(exampleRemainingAmount * commissionPercent / 100)
    : 0;
  const exampleRefund = refundMode === "per_session"
    ? exampleRemainingAmount
    : exampleRemainingAmount - announcerRetained;

  // Portail pour éviter les problèmes de z-index dans les conteneurs sticky
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50"
            onClick={onClose}
          />

          {/* Bottom Sheet (mobile) / Modal centré (desktop) */}
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed z-50 bg-white shadow-xl",
              "inset-x-0 bottom-0 rounded-t-3xl max-h-[85vh] overflow-y-auto",
              "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:w-[400px] sm:max-h-[80vh]"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar (mobile only) */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Conditions d&apos;annulation
              </h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Fermer"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Contenu */}
            <div className="px-5 pb-6 space-y-3">
              {/* Encadré informatif - prochaine annulation */}
              {clientInfo && (
                <div className={cn(
                  "p-3 rounded-xl border",
                  clientInfo.cancellationCount === 0
                    ? "bg-green-50 border-green-200"
                    : clientInfo.cancellationCount === 1
                      ? "bg-amber-50 border-amber-200"
                      : "bg-red-50 border-red-200"
                )}>
                  <p className={cn(
                    "text-xs font-semibold uppercase tracking-wide mb-1",
                    clientInfo.cancellationCount === 0
                      ? "text-green-700"
                      : clientInfo.cancellationCount === 1
                        ? "text-amber-700"
                        : "text-red-700"
                  )}>
                    Votre situation
                  </p>
                  <p className="text-sm text-gray-700">
                    {clientInfo.cancellationCount === 0 ? (
                      <>Aucune annulation récente. Votre prochaine annulation sera <span className="font-semibold text-green-700">sans pénalité</span> (hors commission plateforme).</>
                    ) : clientInfo.cancellationCount === 1 ? (
                      <>Vous avez <span className="font-semibold">1 annulation</span> récente. En cas de nouvelle annulation à moins de 48h, l&apos;annonceur conservera <span className="font-semibold text-amber-700">{clientInfo.secondAnnouncerPercent}%</span> de ses gains.</>
                    ) : (
                      <>Vous avez <span className="font-semibold">{clientInfo.cancellationCount} annulations</span> récentes. Votre prochaine annulation à moins de 48h ne sera <span className="font-semibold text-red-700">pas remboursée</span>.</>
                    )}
                  </p>
                </div>
              )}

              {/* Règles communes */}
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl">
                <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">
                  Réservation <span className="font-semibold">de dernière minute</span> (moins de 24h avant le début) : <span className="text-red-600 font-semibold">non remboursable</span>
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">
                  Remboursement intégral dans les <span className="font-semibold">24h après paiement</span> (sauf réservation de dernière minute)
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">
                  Plus de <span className="font-semibold">48h avant le début</span> : remboursement total - commission plateforme
                </p>
              </div>

              {clientInfo ? (
                clientInfo.cancellationCount === 0 ? (
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">
                      Moins de <span className="font-semibold">48h avant le début</span> : remboursement total - commission plateforme <span className="text-green-600 font-semibold">(1ère annulation)</span>
                    </p>
                  </div>
                ) : clientInfo.cancellationCount === 1 ? (
                  <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">
                      Moins de <span className="font-semibold">48h avant le début</span> : l&apos;annonceur conserve {clientInfo.secondAnnouncerPercent}% de ses gains <span className="text-amber-600 font-semibold">(2ème annulation)</span>
                    </p>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl">
                    <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">
                      Moins de <span className="font-semibold">48h avant le début</span> : <span className="text-red-600 font-semibold">aucun remboursement</span> ({clientInfo.cancellationCount + 1}ème annulation)
                    </p>
                  </div>
                )
              ) : (
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">
                    Moins de <span className="font-semibold">48h avant le début</span> : remboursement total - commission plateforme <span className="text-green-600 font-semibold">(1ère annulation)</span>
                  </p>
                </div>
              )}

              {!isMultiOrCollectif && (
                <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl">
                  <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">
                    Non annulable une fois la prestation <span className="font-semibold">en cours</span>
                  </p>
                </div>
              )}

              {/* Règles spécifiques multi-séance / collectif */}
              {isMultiOrCollectif && (
                <div className="mt-2 pt-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    En cours de prestation
                  </p>
                  <div className="space-y-2">
                    {refundMode === "per_session" ? (
                      <>
                        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                          <ClipboardList className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-gray-700">
                            Les <span className="font-semibold">séances restantes</span> sont intégralement remboursées
                          </p>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                          <ClipboardList className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-gray-700">
                            Les séances déjà effectuées <span className="font-semibold">ne sont pas remboursables</span>
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                          <ClipboardList className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-gray-700">
                            L&apos;annonceur conserve <span className="font-semibold">{commissionPercent}%</span> du montant des séances restantes
                          </p>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                          <ClipboardList className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-gray-700">
                            Les séances déjà effectuées <span className="font-semibold">ne sont pas remboursables</span>
                          </p>
                        </div>
                      </>
                    )}

                    {/* Exemple chiffré si données disponibles */}
                    {totalPrice && totalPrice > 0 && sessions > 1 && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Calculator className="w-4 h-4 text-gray-600" />
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Exemple
                          </p>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {sessions} séances à {formatPriceCents(pricePerSession)}/séance, {exampleCompletedSessions} effectuée
                        </p>
                        {refundMode === "per_session" ? (
                          <p className="text-sm font-medium text-green-700">
                            → Vous récupérez {formatPriceCents(exampleRefund)}
                          </p>
                        ) : (
                          <div className="space-y-1 text-sm">
                            <p className="text-gray-600">
                              → Séances restantes : {formatPriceCents(exampleRemainingAmount)}
                            </p>
                            <p className="text-gray-600">
                              → Retenu par l&apos;annonceur ({commissionPercent}%) : {formatPriceCents(announcerRetained)}
                            </p>
                            <p className="font-medium text-green-700">
                              → Vous récupérez : {formatPriceCents(exampleRefund)}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Note informative */}
              <p className="text-xs text-gray-400 mt-4 pt-3 border-t border-gray-100">
                Ces conditions sont indicatives. Les modalités exactes dépendent de chaque situation et sont détaillées lors de la demande d&apos;annulation.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (!portalRoot) return null;
  return createPortal(modalContent, portalRoot);
}
