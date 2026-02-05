"use client";

import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Lock,
  AlertCircle,
  Info,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { AnimalSelector, GuestAnimalForm, type GuestAnimalData } from "@/app/components/animals";
import CollectiveAnimalSelector from "./CollectiveAnimalSelector";
import type { GuestData, CollectiveSlotData } from "../types";

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
      className="bg-white rounded-2xl shadow-sm overflow-hidden"
    >
      <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <User className="w-5 h-5" />
          Vos informations
        </h2>
      </div>
      <div className="p-6">
        {showLoginForm ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="votre@email.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLoginForm(false)}
                className="flex-1 py-3 border border-gray-200 text-foreground font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors"
              >
                Se connecter
              </button>
            </div>
          </form>
        ) : (
          <>
            <button
              onClick={() => setShowLoginForm(true)}
              className="w-full py-3 border-2 border-primary text-primary font-semibold rounded-xl hover:bg-primary/5 transition-colors mb-6"
            >
              J&apos;ai déjà un compte
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-4 text-sm text-text-light">
                  ou créez un compte
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Prénom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={guestData.firstName}
                    onChange={(e) =>
                      setGuestData({ ...guestData, firstName: e.target.value })
                    }
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                      fieldErrors.firstName ? "border-red-500 bg-red-50" : "border-gray-200"
                    }`}
                    placeholder="Jean"
                  />
                  {fieldErrors.firstName && (
                    <p className="mt-1 text-sm text-red-500">{fieldErrors.firstName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={guestData.lastName}
                    onChange={(e) =>
                      setGuestData({ ...guestData, lastName: e.target.value })
                    }
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                      fieldErrors.lastName ? "border-red-500 bg-red-50" : "border-gray-200"
                    }`}
                    placeholder="Dupont"
                  />
                  {fieldErrors.lastName && (
                    <p className="mt-1 text-sm text-red-500">{fieldErrors.lastName}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={guestData.email}
                    onChange={(e) =>
                      setGuestData({ ...guestData, email: e.target.value })
                    }
                    className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                      fieldErrors.email ? "border-red-500 bg-red-50" : "border-gray-200"
                    }`}
                    placeholder="votre@email.com"
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-1 text-sm text-red-500">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Téléphone <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={guestData.phone}
                    onChange={(e) =>
                      setGuestData({ ...guestData, phone: e.target.value })
                    }
                    className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                      fieldErrors.phone ? "border-red-500 bg-red-50" : "border-gray-200"
                    }`}
                    placeholder="06 12 34 56 78"
                  />
                </div>
                {fieldErrors.phone && (
                  <p className="mt-1 text-sm text-red-500">{fieldErrors.phone}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Mot de passe <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={guestData.password}
                      onChange={(e) =>
                        setGuestData({ ...guestData, password: e.target.value })
                      }
                      className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                        fieldErrors.password ? "border-red-500 bg-red-50" : "border-gray-200"
                      }`}
                      placeholder="••••••••"
                    />
                  </div>
                  {fieldErrors.password && (
                    <p className="mt-1 text-sm text-red-500">{fieldErrors.password}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Confirmer <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={guestData.confirmPassword}
                    onChange={(e) =>
                      setGuestData({ ...guestData, confirmPassword: e.target.value })
                    }
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                      fieldErrors.confirmPassword ||
                      (guestData.confirmPassword &&
                      guestData.password !== guestData.confirmPassword)
                        ? "border-red-500 bg-red-50"
                        : "border-gray-200"
                    }`}
                    placeholder="••••••••"
                  />
                  {fieldErrors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-500">{fieldErrors.confirmPassword}</p>
                  )}
                </div>
              </div>
              {guestData.password.length > 0 && guestData.password.length < 6 && !fieldErrors.password && (
                <p className="text-sm text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Le mot de passe doit contenir au moins 6 caractères
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
