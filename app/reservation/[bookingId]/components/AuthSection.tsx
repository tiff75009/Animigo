"use client";

import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Lock,
  AlertCircle,
} from "lucide-react";
import type { GuestData } from "../types";

interface AuthSectionProps {
  isLoggedIn: boolean;
  token: string | null;
  showLoginForm: boolean;
  setShowLoginForm: (show: boolean) => void;
  loginEmail: string;
  setLoginEmail: (email: string) => void;
  loginPassword: string;
  setLoginPassword: (password: string) => void;
  handleLogin: (e: React.FormEvent) => void;
  guestData: GuestData;
  setGuestData: (data: GuestData) => void;
  fieldErrors: Record<string, string>;
}

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

function inputStyle(hasError: boolean): React.CSSProperties {
  return hasError ? INPUT_ERROR : INPUT_BASE;
}

export default function AuthSection({
  isLoggedIn,
  showLoginForm,
  setShowLoginForm,
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  handleLogin,
  guestData,
  setGuestData,
  fieldErrors,
}: AuthSectionProps) {
  if (isLoggedIn) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-[18px]"
      style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
    >
      {/* Header */}
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
          <h2 className="text-base font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
            Vos informations
          </h2>
        </div>
      </div>

      <div>
        {showLoginForm ? (
          <form onSubmit={handleLogin} className="space-y-3">
            <FieldLabel label="Email" />
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: "#9c9484" }}
              />
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
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
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-[13px] focus:outline-none transition-all"
                style={inputStyle(false)}
                placeholder="••••••••"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowLoginForm(false)}
                className="flex-1 py-2.5 font-medium rounded-full transition-colors text-[13px] hover:bg-[#fafafa]"
                style={{ background: "#fff", color: "#1f1f1d", border: "1px solid #dfdcd4" }}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 font-semibold rounded-full transition-opacity text-[13px] hover:opacity-90"
                style={{ background: "#1f3a33", color: "#f7f5ef" }}
              >
                Se connecter
              </button>
            </div>
          </form>
        ) : (
          <>
            <button
              onClick={() => setShowLoginForm(true)}
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
                    onChange={(e) => setGuestData({ ...guestData, firstName: e.target.value })}
                    className="w-full px-3 py-2.5 text-[13px] focus:outline-none transition-all"
                    style={inputStyle(!!fieldErrors.firstName)}
                    placeholder="Jean"
                  />
                </Field>
                <Field label="Nom" required error={fieldErrors.lastName}>
                  <input
                    type="text"
                    value={guestData.lastName}
                    onChange={(e) => setGuestData({ ...guestData, lastName: e.target.value })}
                    className="w-full px-3 py-2.5 text-[13px] focus:outline-none transition-all"
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
                    onChange={(e) => setGuestData({ ...guestData, email: e.target.value })}
                    className="w-full pl-10 pr-3 py-2.5 text-[13px] focus:outline-none transition-all"
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
                    onChange={(e) => setGuestData({ ...guestData, phone: e.target.value })}
                    className="w-full pl-10 pr-3 py-2.5 text-[13px] focus:outline-none transition-all"
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
                        setGuestData({ ...guestData, password: e.target.value })
                      }
                      className="w-full pl-10 pr-3 py-2.5 text-[13px] focus:outline-none transition-all"
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
                      setGuestData({ ...guestData, confirmPassword: e.target.value })
                    }
                    className="w-full px-3 py-2.5 text-[13px] focus:outline-none transition-all"
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
    </motion.div>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <div className="text-[10px] font-medium uppercase tracking-[0.1em] mb-1.5 flex items-center gap-1" style={{ color: "#9c9484" }}>
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
        <p className="mt-1 text-[11px] flex items-center gap-1" style={{ color: "#c45656" }}>
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}
