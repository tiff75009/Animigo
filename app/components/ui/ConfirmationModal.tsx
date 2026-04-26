"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CheckCircle,
  Mail,
  CreditCard,
  Shield,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Bell,
  Lock,
  Calendar,
  Check,
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
  isGuest: boolean;
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
            className="fixed inset-0 z-50"
            style={{ background: "rgba(31,31,29,0.45)", backdropFilter: "blur(4px)" }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Confirmer votre réservation"
              className="bg-white max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
              style={{ borderRadius: 18, border: "1px solid #ece9e1" }}
            >
              {/* Header */}
              <div
                className="px-5 py-4 flex items-start justify-between gap-3"
                style={{ borderBottom: "1px solid #f1ede3", background: "#fff" }}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "#f5f9f6", border: "1px solid #cfdbd3" }}
                  >
                    <CheckCircle className="w-4 h-4" style={{ color: "#1f3a33" }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484]">
                      Dernière étape
                    </div>
                    <h2 className="text-base font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
                      Confirmer votre réservation
                    </h2>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  disabled={isSubmitting}
                  aria-label="Fermer la fenêtre"
                  className="w-8 h-8 inline-flex items-center justify-center rounded-full transition-colors hover:bg-[#f7f5ef] flex-shrink-0 disabled:opacity-50"
                  style={{ color: "#1f1f1d", border: "1px solid #ece9e1" }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Content */}
              <div
                className="flex-1 overflow-y-auto p-5 space-y-5"
                style={{ background: "#fcfaf4" }}
              >
                {/* Bloc Informations importantes */}
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-2 flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3" />
                    Informations importantes
                  </div>

                  <div className="space-y-2">
                    <InfoCard
                      icon={<Mail className="w-3.5 h-3.5" />}
                      title="Confirmation par email requise"
                      description={
                        <>
                          Pour que votre réservation soit 100 % confirmée, validez votre adresse
                          email en cliquant sur le lien que nous vous enverrons
                          {userEmail && (
                            <>
                              {" "}
                              à <strong className="text-[#1f1f1d]">{userEmail}</strong>
                            </>
                          )}
                          .
                        </>
                      }
                    />

                    {isGuest && (
                      <InfoCard
                        icon={<Lock className="w-3.5 h-3.5" />}
                        title="Vos identifiants de connexion"
                        description={
                          <>
                            L&apos;email et le mot de passe que vous avez saisis seront vos
                            identifiants pour vous connecter à votre espace client Animigo.
                          </>
                        }
                      />
                    )}

                    <InfoCard
                      icon={<CreditCard className="w-3.5 h-3.5" />}
                      title="Paiement après acceptation"
                      description={
                        <>
                          Le paiement sera effectué uniquement lorsque l&apos;annonceur aura accepté
                          votre réservation. Vous recevrez un email et un SMS avec un lien de
                          paiement sécurisé.
                        </>
                      }
                    />

                    <InfoCard
                      icon={<Bell className="w-3.5 h-3.5" />}
                      title="Suivi de votre réservation"
                      description={
                        <>
                          Vous serez notifié par email et SMS à chaque étape : acceptation,
                          rappels et finalisation de la prestation.
                        </>
                      }
                    />
                  </div>
                </div>

                {/* Politique d'annulation - accordéon */}
                <div
                  className="overflow-hidden bg-white"
                  style={{ borderRadius: 12, border: "1px solid #ece9e1" }}
                >
                  <button
                    type="button"
                    onClick={() => setShowCancellationPolicy(!showCancellationPolicy)}
                    className="w-full flex items-center justify-between p-3.5 transition-colors hover:bg-[#fafafa]"
                  >
                    <span className="flex items-center gap-2 text-[13px] font-semibold text-[#1f1f1d] tracking-[-0.01em]">
                      <Calendar className="w-3.5 h-3.5" style={{ color: "#1f3a33" }} />
                      Conditions d&apos;annulation
                    </span>
                    {showCancellationPolicy ? (
                      <ChevronUp className="w-4 h-4" style={{ color: "#9c9484" }} />
                    ) : (
                      <ChevronDown className="w-4 h-4" style={{ color: "#9c9484" }} />
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
                        <div
                          className="px-3.5 pb-3.5 text-[12px] space-y-2 pt-3"
                          style={{ borderTop: "1px solid #f1ede3", color: "#3a3a38" }}
                        >
                          <ul className="space-y-1.5">
                            <PolicyItem tone="ok">
                              Remboursement intégral dans les{" "}
                              <strong className="text-[#1f1f1d]">24h après paiement</strong>
                            </PolicyItem>
                            <PolicyItem tone="ok">
                              Plus de <strong className="text-[#1f1f1d]">48h avant le début</strong>{" "}
                              : remboursement total – commission plateforme
                            </PolicyItem>

                            {cpInfo?.clientInfo ? (
                              cpInfo.clientInfo.cancellationCount === 0 ? (
                                <PolicyItem tone="ok">
                                  Moins de{" "}
                                  <strong className="text-[#1f1f1d]">48h avant le début</strong> :
                                  remboursement total – commission plateforme{" "}
                                  <span className="font-semibold" style={{ color: "#2f4a3f" }}>
                                    (1ère annulation)
                                  </span>
                                </PolicyItem>
                              ) : cpInfo.clientInfo.cancellationCount === 1 ? (
                                <PolicyItem tone="warn">
                                  Moins de{" "}
                                  <strong className="text-[#1f1f1d]">48h avant le début</strong> :
                                  l&apos;annonceur conserve {cpInfo.clientInfo.secondAnnouncerPercent}
                                  % de ses gains{" "}
                                  <span className="font-semibold" style={{ color: "#7a5b1a" }}>
                                    (2ème annulation)
                                  </span>
                                </PolicyItem>
                              ) : (
                                <PolicyItem tone="ko">
                                  Moins de{" "}
                                  <strong className="text-[#1f1f1d]">48h avant le début</strong> :{" "}
                                  <strong style={{ color: "#8a3a3a" }}>aucun remboursement</strong>{" "}
                                  ({cpInfo.clientInfo.cancellationCount + 1}ème annulation)
                                </PolicyItem>
                              )
                            ) : (
                              <PolicyItem tone="ok">
                                Moins de{" "}
                                <strong className="text-[#1f1f1d]">48h avant le début</strong> :
                                remboursement total – commission plateforme{" "}
                                <span className="font-semibold" style={{ color: "#2f4a3f" }}>
                                  (1ère annulation)
                                </span>
                              </PolicyItem>
                            )}

                            {cpInfo &&
                              (cpInfo.serviceType === "uni_seance" ||
                                cpInfo.serviceType === "garde") && (
                                <PolicyItem tone="ko">
                                  Non annulable une fois la prestation{" "}
                                  <strong className="text-[#1f1f1d]">en cours</strong>
                                </PolicyItem>
                              )}
                          </ul>

                          {cpInfo &&
                            (cpInfo.serviceType === "collectif" ||
                              cpInfo.serviceType === "multi_seance") && (
                              <div
                                className="mt-2 pt-2"
                                style={{ borderTop: "1px solid #f1ede3" }}
                              >
                                <p className="text-[11px] font-semibold text-[#1f1f1d] tracking-[-0.01em] mb-1.5 uppercase">
                                  En cours de prestation
                                </p>
                                {cpInfo.announcerPolicy?.refundMode === "percentage_remaining" ? (
                                  <ul className="space-y-1">
                                    <PolicyItem tone="info">
                                      L&apos;annonceur conserve{" "}
                                      <strong className="text-[#1f1f1d]">
                                        {cpInfo.announcerPolicy.commissionPercent}%
                                      </strong>{" "}
                                      du montant des séances restantes
                                    </PolicyItem>
                                    <PolicyItem tone="info">
                                      Les séances déjà effectuées{" "}
                                      <strong className="text-[#1f1f1d]">
                                        ne sont pas remboursables
                                      </strong>
                                    </PolicyItem>
                                  </ul>
                                ) : (
                                  <ul className="space-y-1">
                                    <PolicyItem tone="info">
                                      Les{" "}
                                      <strong className="text-[#1f1f1d]">
                                        séances restantes
                                      </strong>{" "}
                                      sont intégralement remboursées
                                    </PolicyItem>
                                    <PolicyItem tone="info">
                                      Les séances déjà effectuées{" "}
                                      <strong className="text-[#1f1f1d]">
                                        ne sont pas remboursables
                                      </strong>
                                    </PolicyItem>
                                  </ul>
                                )}
                              </div>
                            )}

                          <p className="mt-2 text-[11.5px] italic" style={{ color: "#6d6d68" }}>
                            En cas d&apos;annulation par l&apos;annonceur, vous serez intégralement
                            remboursé quelle que soit la date.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Acceptations */}
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-2 flex items-center gap-1.5">
                    <Shield className="w-3 h-3" />
                    Acceptations requises
                  </div>

                  <div className="space-y-2">
                    <CheckboxRow
                      checked={acceptCGV}
                      onChange={setAcceptCGV}
                      required
                      label={
                        <>
                          J&apos;accepte les{" "}
                          <Link
                            href="/cgv"
                            target="_blank"
                            className="font-semibold underline underline-offset-2 hover:opacity-80"
                            style={{ color: "#1f3a33" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Conditions Générales de Vente
                          </Link>
                        </>
                      }
                    />
                    <CheckboxRow
                      checked={acceptPrivacy}
                      onChange={setAcceptPrivacy}
                      required
                      label={
                        <>
                          J&apos;accepte la{" "}
                          <Link
                            href="/confidentialite"
                            target="_blank"
                            className="font-semibold underline underline-offset-2 hover:opacity-80"
                            style={{ color: "#1f3a33" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Politique de Confidentialité
                          </Link>
                        </>
                      }
                    />
                    <CheckboxRow
                      checked={acceptMarketing}
                      onChange={setAcceptMarketing}
                      muted
                      label={
                        <>
                          J&apos;accepte de recevoir les offres et actualités Animigo par email{" "}
                          <span className="text-[10px]" style={{ color: "#9c9484" }}>
                            (optionnel)
                          </span>
                        </>
                      }
                    />
                  </div>
                </div>

                {!canConfirm && (
                  <p
                    className="text-[11.5px] flex items-center gap-1.5"
                    style={{ color: "#7a5b1a" }}
                  >
                    <AlertCircle className="w-3 h-3" />
                    Veuillez accepter les conditions obligatoires pour continuer.
                  </p>
                )}
              </div>

              {/* Footer */}
              <div
                className="px-5 py-3.5 flex gap-2"
                style={{ borderTop: "1px solid #f1ede3", background: "#fff" }}
              >
                <button
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 font-medium rounded-full transition-colors text-[13px] hover:bg-[#fafafa] disabled:opacity-50"
                  style={{ background: "#fff", color: "#1f1f1d", border: "1px solid #dfdcd4" }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!canConfirm || isSubmitting}
                  className="flex-1 py-2.5 font-semibold rounded-full transition-opacity text-[13px] flex items-center justify-center gap-2"
                  style={{
                    background: !canConfirm || isSubmitting ? "#dfdcd4" : "#1f3a33",
                    color: !canConfirm || isSubmitting ? "#9c9484" : "#f7f5ef",
                    cursor: !canConfirm || isSubmitting ? "not-allowed" : "pointer",
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 rounded-full"
                        style={{
                          border: "2px solid rgba(247,245,239,0.3)",
                          borderTopColor: "#f7f5ef",
                        }}
                      />
                      Confirmation...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
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

// ──────────────────────────────────────────────────────────────────
// Sous-composants
// ──────────────────────────────────────────────────────────────────

function InfoCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
}) {
  return (
    <div
      className="flex items-start gap-3 p-3 bg-white"
      style={{ borderRadius: 12, border: "1px solid #ece9e1" }}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: "#f5f9f6", color: "#1f3a33", border: "1px solid #cfdbd3" }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
          {title}
        </p>
        <p className="text-[11.5px] mt-0.5 leading-[1.5]" style={{ color: "#6d6d68" }}>
          {description}
        </p>
      </div>
    </div>
  );
}

function PolicyItem({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "ko" | "info";
  children: React.ReactNode;
}) {
  const dot =
    tone === "ok"
      ? "#2f4a3f"
      : tone === "warn"
        ? "#c9a14a"
        : tone === "ko"
          ? "#c45656"
          : "#1f3a33";
  return (
    <li className="flex items-start gap-2">
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
        style={{ background: dot }}
      />
      <span>{children}</span>
    </li>
  );
}

function CheckboxRow({
  checked,
  onChange,
  label,
  required,
  muted,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
  required?: boolean;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full flex items-start gap-2.5 p-3 text-left transition-colors hover:bg-[#fafafa]"
      style={{
        borderRadius: 12,
        background: "#fff",
        border: `1px solid ${checked ? "#1f3a33" : "#ece9e1"}`,
      }}
    >
      <div
        className="rounded flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{
          width: 18,
          height: 18,
          background: checked ? "#1f3a33" : "#fff",
          border: `1px solid ${checked ? "#1f3a33" : "#dfdcd4"}`,
        }}
      >
        {checked && <Check className="w-3 h-3 text-white" />}
      </div>
      <span
        className="text-[12.5px] flex-1 leading-[1.4]"
        style={{ color: muted ? "#6d6d68" : "#3a3a38" }}
      >
        {label}
        {required && (
          <span className="ml-0.5" style={{ color: "#c45656" }}>
            *
          </span>
        )}
      </span>
    </button>
  );
}
