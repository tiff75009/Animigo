"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CheckCircle,
  Mail,
  CreditCard,
  Shield,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Bell,
  Lock,
  Calendar,
} from "lucide-react";
import Link from "next/link";

interface CancellationPolicyInfo {
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

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  isGuest: boolean; // Si l'utilisateur crée un compte
  userEmail?: string;
  cancellationPolicy?: CancellationPolicyInfo;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  isGuest,
  userEmail,
  cancellationPolicy: cpInfo,
}: ConfirmationModalProps) {
  const [acceptCGV, setAcceptCGV] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptMarketing, setAcceptMarketing] = useState(false);
  const [showCancellationPolicy, setShowCancellationPolicy] = useState(false);

  const canConfirm = acceptCGV && acceptPrivacy;

  const handleConfirm = () => {
    if (canConfirm) {
      onConfirm();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Confirmer votre réservation
                </h2>
                <button
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Informations importantes */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-primary" />
                    Informations importantes
                  </h3>

                  {/* Email de confirmation */}
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                    <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        Confirmation par email requise
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        Pour que votre réservation soit 100% confirmée, vous devrez valider
                        votre adresse email en cliquant sur le lien que nous vous enverrons
                        {userEmail && (
                          <span className="font-medium"> à {userEmail}</span>
                        )}
                        .
                      </p>
                    </div>
                  </div>

                  {/* Identifiants de connexion (pour les invités) */}
                  {isGuest && (
                    <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-xl">
                      <Lock className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-purple-900">
                          Vos identifiants de connexion
                        </p>
                        <p className="text-xs text-purple-700 mt-1">
                          L&apos;adresse email et le mot de passe que vous avez saisis seront
                          vos identifiants pour vous connecter à votre espace client Animigo.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Paiement */}
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl">
                    <CreditCard className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-900">
                        Paiement après acceptation
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        Le paiement sera effectué uniquement lorsque l&apos;annonceur aura
                        accepté votre réservation. Vous recevrez un email et un SMS avec
                        un lien de paiement sécurisé.
                      </p>
                    </div>
                  </div>

                  {/* Notifications */}
                  <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl">
                    <Bell className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-900">
                        Suivi de votre réservation
                      </p>
                      <p className="text-xs text-amber-700 mt-1">
                        Vous serez notifié par email et SMS à chaque étape : acceptation,
                        rappels, et finalisation de la prestation.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Politique d'annulation */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowCancellationPolicy(!showCancellationPolicy)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Calendar className="w-4 h-4 text-primary" />
                      Conditions d&apos;annulation
                    </span>
                    {showCancellationPolicy ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  <AnimatePresence>
                    {showCancellationPolicy && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 text-xs text-text-light space-y-2 border-t border-gray-100 pt-3">
                          <ul className="space-y-1.5">
                            <li className="flex items-start gap-2">
                              <span className="text-green-600 mt-0.5">✓</span>
                              <span>Remboursement intégral dans les <span className="font-medium text-foreground">24h après paiement</span></span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-green-600 mt-0.5">✓</span>
                              <span>Plus de <span className="font-medium text-foreground">48h avant le début</span> : remboursement total - commission plateforme</span>
                            </li>
                            {/* Palier moins de 48h - basé sur l'historique réel */}
                            {cpInfo?.clientInfo ? (
                              cpInfo.clientInfo.cancellationCount === 0 ? (
                                <li className="flex items-start gap-2">
                                  <span className="text-green-600 mt-0.5">✓</span>
                                  <span>Moins de <span className="font-medium text-foreground">48h avant le début</span> : remboursement total - commission plateforme <span className="text-green-600 font-medium">(1ère annulation)</span></span>
                                </li>
                              ) : cpInfo.clientInfo.cancellationCount === 1 ? (
                                <li className="flex items-start gap-2">
                                  <span className="text-amber-600 mt-0.5">!</span>
                                  <span>Moins de <span className="font-medium text-foreground">48h avant le début</span> : l&apos;annonceur conserve {cpInfo.clientInfo.secondAnnouncerPercent}% de ses gains <span className="text-amber-600 font-medium">(2ème annulation)</span></span>
                                </li>
                              ) : (
                                <li className="flex items-start gap-2">
                                  <span className="text-red-500 mt-0.5">✗</span>
                                  <span>Moins de <span className="font-medium text-foreground">48h avant le début</span> : <span className="text-red-600 font-medium">aucun remboursement</span> ({cpInfo.clientInfo.cancellationCount + 1}ème annulation)</span>
                                </li>
                              )
                            ) : (
                              <li className="flex items-start gap-2">
                                <span className="text-green-600 mt-0.5">✓</span>
                                <span>Moins de <span className="font-medium text-foreground">48h avant le début</span> : remboursement total - commission plateforme <span className="text-green-600 font-medium">(1ère annulation)</span></span>
                              </li>
                            )}
                            {cpInfo && (cpInfo.serviceType === "uni_seance" || cpInfo.serviceType === "garde") && (
                              <li className="flex items-start gap-2">
                                <span className="text-red-500 mt-0.5">✗</span>
                                <span>Non annulable une fois la prestation <span className="font-medium text-foreground">en cours</span></span>
                              </li>
                            )}
                          </ul>

                          {/* Règles multi-séance / collectif */}
                          {cpInfo && (cpInfo.serviceType === "collectif" || cpInfo.serviceType === "multi_seance") && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              <p className="font-medium text-foreground mb-1.5">En cours de prestation :</p>
                              {cpInfo.announcerPolicy?.refundMode === "percentage_remaining" ? (
                                <ul className="space-y-1">
                                  <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-0.5">•</span>
                                    <span>L&apos;annonceur conserve <span className="font-medium text-foreground">{cpInfo.announcerPolicy.commissionPercent}%</span> du montant des séances restantes</span>
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-0.5">•</span>
                                    <span>Les séances déjà effectuées <span className="font-medium text-foreground">ne sont pas remboursables</span></span>
                                  </li>
                                </ul>
                              ) : (
                                <ul className="space-y-1">
                                  <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-0.5">•</span>
                                    <span>Les <span className="font-medium text-foreground">séances restantes</span> sont intégralement remboursées</span>
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-0.5">•</span>
                                    <span>Les séances déjà effectuées <span className="font-medium text-foreground">ne sont pas remboursables</span></span>
                                  </li>
                                </ul>
                              )}
                            </div>
                          )}

                          <p className="mt-2 text-text-light">
                            En cas d&apos;annulation par l&apos;annonceur, vous serez intégralement
                            remboursé quelle que soit la date.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Checkboxes */}
                <div className="space-y-3 pt-2">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Acceptations requises
                  </h3>

                  {/* CGV */}
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex-shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={acceptCGV}
                        onChange={(e) => setAcceptCGV(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-md peer-checked:border-primary peer-checked:bg-primary transition-all flex items-center justify-center group-hover:border-primary/50">
                        {acceptCGV && (
                          <motion.svg
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-3 h-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </motion.svg>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-foreground">
                      J&apos;accepte les{" "}
                      <Link
                        href="/cgv"
                        target="_blank"
                        className="text-primary hover:underline font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Conditions Générales de Vente
                      </Link>{" "}
                      <span className="text-red-500">*</span>
                    </span>
                  </label>

                  {/* Politique de confidentialité */}
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex-shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={acceptPrivacy}
                        onChange={(e) => setAcceptPrivacy(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-md peer-checked:border-primary peer-checked:bg-primary transition-all flex items-center justify-center group-hover:border-primary/50">
                        {acceptPrivacy && (
                          <motion.svg
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-3 h-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </motion.svg>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-foreground">
                      J&apos;accepte la{" "}
                      <Link
                        href="/confidentialite"
                        target="_blank"
                        className="text-primary hover:underline font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Politique de Confidentialité
                      </Link>{" "}
                      <span className="text-red-500">*</span>
                    </span>
                  </label>

                  {/* Marketing (optionnel) */}
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex-shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={acceptMarketing}
                        onChange={(e) => setAcceptMarketing(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-md peer-checked:border-primary peer-checked:bg-primary transition-all flex items-center justify-center group-hover:border-primary/50">
                        {acceptMarketing && (
                          <motion.svg
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-3 h-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </motion.svg>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-text-light">
                      J&apos;accepte de recevoir les offres et actualités Animigo par email
                      <span className="text-xs ml-1">(optionnel)</span>
                    </span>
                  </label>
                </div>

                {!canConfirm && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Veuillez accepter les conditions obligatoires pour continuer
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 py-3 border border-gray-200 text-foreground font-medium rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!canConfirm || isSubmitting}
                  className="flex-1 py-3 bg-gradient-to-r from-primary to-primary/90 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      />
                      Confirmation...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Confirmer
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
