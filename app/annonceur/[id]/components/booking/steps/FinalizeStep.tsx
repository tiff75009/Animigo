"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  User,
  Mail,
  Phone,
  Lock,
  AlertCircle,
  FileText,
  Sparkles,
  Loader2,
  Check,
  ShieldCheck,
} from "lucide-react";
import StepNav from "./StepNav";

const INPUT_BASE: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid #dfdcd4",
  background: "#fff",
  color: "#1f1f1d",
};
const INPUT_ERROR: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid #c45656",
  background: "#fdf0f0",
  color: "#1f1f1d",
};
const inputStyle = (hasError: boolean): React.CSSProperties =>
  hasError ? INPUT_ERROR : INPUT_BASE;

export interface GuestSignupData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface FinalizeStepProps {
  isLoggedIn: boolean;
  // Données guest
  guestData: GuestSignupData;
  onGuestDataChange: (data: GuestSignupData) => void;
  // Notes complémentaires
  notes: string;
  onNotesChange: (notes: string) => void;
  // Acceptations
  acceptedCGV: boolean;
  onAcceptCGV: (v: boolean) => void;
  acceptedPrivacy: boolean;
  onAcceptPrivacy: (v: boolean) => void;
  acceptedCancellation: boolean;
  onAcceptCancellation: (v: boolean) => void;
  // Login inline
  showLoginForm: boolean;
  onShowLoginForm: (v: boolean) => void;
  loginEmail: string;
  loginPassword: string;
  onLoginEmailChange: (v: string) => void;
  onLoginPasswordChange: (v: string) => void;
  onLogin: (e: React.FormEvent) => void | Promise<void>;
  loginError: string | null;
  isLoggingIn: boolean;
  // Submission
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: () => void | Promise<void>;
  fieldErrors: Record<string, string>;
  // Navigation
  onPrevStep: () => void;
  slideVariants: Record<string, { x: number; opacity: number }>;
  slideDirection: "left" | "right";
}

export default function FinalizeStep({
  isLoggedIn,
  guestData,
  onGuestDataChange,
  notes,
  onNotesChange,
  acceptedCGV,
  onAcceptCGV,
  acceptedPrivacy,
  onAcceptPrivacy,
  acceptedCancellation,
  onAcceptCancellation,
  showLoginForm,
  onShowLoginForm,
  loginEmail,
  loginPassword,
  onLoginEmailChange,
  onLoginPasswordChange,
  onLogin,
  loginError,
  isLoggingIn,
  isSubmitting,
  submitError,
  onSubmit,
  fieldErrors,
  onPrevStep,
  slideVariants,
  slideDirection,
}: FinalizeStepProps) {
  const canSubmit =
    acceptedCGV &&
    acceptedPrivacy &&
    acceptedCancellation &&
    !isSubmitting;

  return (
    <motion.div
      key="finalize"
      initial={slideDirection === "right" ? "enterFromRight" : "enterFromLeft"}
      animate="center"
      exit={slideDirection === "right" ? "exitToLeft" : "exitToRight"}
      variants={slideVariants}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="space-y-3"
    >
      {/* ─── Section Identité (guest only) ─── */}
      {!isLoggedIn && (
        <div
          className="bg-white p-[18px]"
          style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
        >
          <div className="mb-4 flex items-start gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "#f5f9f6", border: "1px solid #cfdbd3" }}
            >
              <User className="w-4 h-4" style={{ color: "#1f3a33" }} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484]">
                Section · Identité
              </div>
              <h3 className="text-base font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
                Vos informations
              </h3>
            </div>
          </div>

          {showLoginForm ? (
            <form onSubmit={onLogin} className="space-y-3">
              <FieldLabel label="Email" />
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "#9c9484" }}
                />
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => onLoginEmailChange(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-[13px] focus:outline-none transition-all"
                  style={inputStyle(false)}
                  placeholder="votre@email.com"
                />
              </div>

              <FieldLabel label="Mot de passe" />
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "#9c9484" }}
                />
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => onLoginPasswordChange(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-[13px] focus:outline-none transition-all"
                  style={inputStyle(false)}
                  placeholder="••••••••"
                />
              </div>

              {loginError && (
                <p
                  className="text-[12px] flex items-center gap-1.5 p-2"
                  style={{
                    borderRadius: 8,
                    background: "#fdf0f0",
                    color: "#8a3a3a",
                    border: "1px solid #f1cdcd",
                  }}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  {loginError}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onShowLoginForm(false)}
                  className="flex-1 py-2.5 font-medium rounded-full transition-colors text-[13px] hover:bg-[#fafafa]"
                  style={{ background: "#fff", color: "#1f1f1d", border: "1px solid #dfdcd4" }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="flex-1 py-2.5 font-semibold rounded-full transition-opacity text-[13px] hover:opacity-90 inline-flex items-center justify-center gap-1.5"
                  style={{
                    background: isLoggingIn ? "#dfdcd4" : "#1f3a33",
                    color: isLoggingIn ? "#9c9484" : "#f7f5ef",
                  }}
                >
                  {isLoggingIn && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Se connecter
                </button>
              </div>
            </form>
          ) : (
            <>
              <button
                onClick={() => onShowLoginForm(true)}
                className="w-full py-2.5 font-semibold rounded-full transition-colors mb-5 text-[13px] hover:bg-[#f5f9f6]"
                style={{ background: "#fff", color: "#1f3a33", border: "1px solid #1f3a33" }}
              >
                J&apos;ai déjà un compte
              </button>

              <div className="relative mb-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full" style={{ borderTop: "1px solid #f1ede3" }} />
                </div>
                <div className="relative flex justify-center">
                  <span
                    className="px-3 text-[10px] font-medium uppercase tracking-[0.1em]"
                    style={{ background: "#fff", color: "#9c9484" }}
                  >
                    ou créez un compte
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Prénom" required error={fieldErrors.firstName}>
                    <input
                      type="text"
                      value={guestData.firstName}
                      onChange={(e) =>
                        onGuestDataChange({ ...guestData, firstName: e.target.value })
                      }
                      className="w-full px-3 py-2.5 text-[13px] focus:outline-none"
                      style={inputStyle(!!fieldErrors.firstName)}
                      placeholder="Jean"
                    />
                  </Field>
                  <Field label="Nom" required error={fieldErrors.lastName}>
                    <input
                      type="text"
                      value={guestData.lastName}
                      onChange={(e) =>
                        onGuestDataChange({ ...guestData, lastName: e.target.value })
                      }
                      className="w-full px-3 py-2.5 text-[13px] focus:outline-none"
                      style={inputStyle(!!fieldErrors.lastName)}
                      placeholder="Dupont"
                    />
                  </Field>
                </div>

                <Field label="Email" required error={fieldErrors.email}>
                  <div className="relative">
                    <Mail
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                      style={{ color: "#9c9484" }}
                    />
                    <input
                      type="email"
                      value={guestData.email}
                      onChange={(e) =>
                        onGuestDataChange({ ...guestData, email: e.target.value })
                      }
                      className="w-full pl-10 pr-3 py-2.5 text-[13px] focus:outline-none"
                      style={inputStyle(!!fieldErrors.email)}
                      placeholder="votre@email.com"
                    />
                  </div>
                </Field>

                <Field label="Téléphone" required error={fieldErrors.phone}>
                  <div className="relative">
                    <Phone
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                      style={{ color: "#9c9484" }}
                    />
                    <input
                      type="tel"
                      value={guestData.phone}
                      onChange={(e) =>
                        onGuestDataChange({ ...guestData, phone: e.target.value })
                      }
                      className="w-full pl-10 pr-3 py-2.5 text-[13px] focus:outline-none"
                      style={inputStyle(!!fieldErrors.phone)}
                      placeholder="06 12 34 56 78"
                    />
                  </div>
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Mot de passe" required error={fieldErrors.password}>
                    <div className="relative">
                      <Lock
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                        style={{ color: "#9c9484" }}
                      />
                      <input
                        type="password"
                        value={guestData.password}
                        onChange={(e) =>
                          onGuestDataChange({ ...guestData, password: e.target.value })
                        }
                        className="w-full pl-10 pr-3 py-2.5 text-[13px] focus:outline-none"
                        style={inputStyle(!!fieldErrors.password)}
                        placeholder="••••••••"
                      />
                    </div>
                  </Field>
                  <Field label="Confirmer" required error={fieldErrors.confirmPassword}>
                    <input
                      type="password"
                      value={guestData.confirmPassword}
                      onChange={(e) =>
                        onGuestDataChange({
                          ...guestData,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 text-[13px] focus:outline-none"
                      style={inputStyle(
                        !!fieldErrors.confirmPassword ||
                          (!!guestData.confirmPassword &&
                            guestData.password !== guestData.confirmPassword)
                      )}
                      placeholder="••••••••"
                    />
                  </Field>
                </div>
                {guestData.password.length > 0 &&
                  guestData.password.length < 6 &&
                  !fieldErrors.password && (
                    <p
                      className="text-[11px] flex items-center gap-1.5"
                      style={{ color: "#7a5b1a" }}
                    >
                      <AlertCircle className="w-3 h-3" />
                      Le mot de passe doit contenir au moins 6 caractères.
                    </p>
                  )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── Notes complémentaires ─── */}
      <div
        className="bg-white p-[18px]"
        style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
      >
        <div className="mb-3 flex items-start gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "#fcfaf4", border: "1px solid #ece9e1" }}
          >
            <FileText className="w-4 h-4" style={{ color: "#1f3a33" }} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484]">
              Section · Notes (optionnel)
            </div>
            <h3 className="text-base font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
              Informations complémentaires
            </h3>
          </div>
        </div>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={3}
          placeholder="Code d'accès, instructions particulières, allergies..."
          className="w-full px-4 py-3 text-[13px] focus:outline-none resize-none"
          style={{
            borderRadius: 12,
            border: "1px solid #dfdcd4",
            background: "#fff",
            color: "#1f1f1d",
          }}
        />
      </div>

      {/* ─── Acceptations ─── */}
      <div
        className="bg-white p-[18px]"
        style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
      >
        <div className="mb-3 flex items-start gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "#f5f9f6", border: "1px solid #cfdbd3" }}
          >
            <ShieldCheck className="w-4 h-4" style={{ color: "#1f3a33" }} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484]">
              Section · Conditions
            </div>
            <h3 className="text-base font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
              Acceptations requises
            </h3>
          </div>
        </div>

        <div className="space-y-2">
          <CheckboxRow
            checked={acceptedCGV}
            onChange={onAcceptCGV}
            required
            label={
              <>
                J&apos;accepte les{" "}
                <a
                  href="/cgv"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline underline-offset-2 hover:opacity-80"
                  style={{ color: "#1f3a33" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  Conditions Générales de Vente
                </a>
              </>
            }
          />
          <CheckboxRow
            checked={acceptedPrivacy}
            onChange={onAcceptPrivacy}
            required
            label={
              <>
                J&apos;accepte la{" "}
                <a
                  href="/confidentialite"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline underline-offset-2 hover:opacity-80"
                  style={{ color: "#1f3a33" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  Politique de Confidentialité
                </a>
              </>
            }
          />
          <CheckboxRow
            checked={acceptedCancellation}
            onChange={onAcceptCancellation}
            required
            label="J'accepte la politique d'annulation et le mode de paiement (paiement après acceptation par l'annonceur)"
          />
        </div>

        {!canSubmit && (
          <p
            className="text-[11.5px] mt-3 flex items-center gap-1.5"
            style={{ color: "#7a5b1a" }}
          >
            <AlertCircle className="w-3 h-3" />
            Cochez toutes les conditions obligatoires pour confirmer.
          </p>
        )}
      </div>

      {/* ─── Erreur globale ─── */}
      {submitError && (
        <div
          className="p-3 flex items-start gap-2"
          style={{
            borderRadius: 12,
            background: "#fdf0f0",
            border: "1px solid #f1cdcd",
            color: "#8a3a3a",
          }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="text-[12px]">
            <p className="font-semibold m-0">{submitError}</p>
          </div>
        </div>
      )}

      {/* ─── Footer : Retour + Confirmer ─── */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onPrevStep}
          disabled={isSubmitting}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium hover:bg-[#f7f5ef] transition-colors"
          style={{ color: "#6d6d68", border: "1px solid #ece9e1" }}
        >
          Retour
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-[13px] font-semibold transition-opacity"
          style={
            canSubmit
              ? { background: "#1f3a33", color: "#f7f5ef" }
              : { background: "#dfdcd4", color: "#9c9484", cursor: "not-allowed" }
          }
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Réservation en cours...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Confirmer la réservation
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <div
      className="text-[10px] font-medium uppercase tracking-[0.1em] mb-1.5 flex items-center gap-1"
      style={{ color: "#9c9484" }}
    >
      {label}
      {required && <span style={{ color: "#c45656" }}>*</span>}
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <FieldLabel label={label} required={required} />
      {children}
      {error && (
        <p
          className="mt-1 text-[11px] flex items-center gap-1"
          style={{ color: "#c45656" }}
        >
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

function CheckboxRow({
  checked,
  onChange,
  label,
  required,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
  required?: boolean;
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
        style={{ color: "#3a3a38" }}
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
