"use client";

import { useState, useMemo, Suspense } from "react";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Eye, EyeOff, Loader2, AlertCircle, CheckCircle, KeyRound } from "lucide-react";
import Link from "next/link";
import { useConvexAction } from "@/app/hooks/useConvexAction";

function InscriptionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token");

  // States
  const [token, setToken] = useState(tokenFromUrl || "");
  const [manuallyConfirmed, setManuallyConfirmed] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation du token
  const tokenValidation = useQuery(
    api.admin.invitations.validateInvitationToken,
    token && token.length === 64 ? { invitationToken: token } : "skip"
  );

  // Mutation d'inscription
  const { execute: register, isLoading: isRegistering } = useConvexAction(
    api.admin.invitations.registerWithInvitation,
    {
      successMessage: "Inscription réussie ! Bienvenue dans l'administration.",
      redirectOnSessionExpired: false,
    }
  );

  // Token validé si:
  // - Token depuis URL + query valide (auto-validation)
  // - OU confirmation manuelle
  const isTokenValid = tokenValidation?.success && tokenValidation.valid;
  const tokenValidated = (tokenFromUrl && isTokenValid) || manuallyConfirmed;

  // Validation du mot de passe (calculé, pas d'effet)
  const passwordErrors = useMemo(() => {
    const errors: string[] = [];
    if (password) {
      if (password.length < 8) {
        errors.push("Au moins 8 caractères");
      }
      if (!/[A-Z]/.test(password)) {
        errors.push("Au moins une majuscule");
      }
      if (!/[a-z]/.test(password)) {
        errors.push("Au moins une minuscule");
      }
      if (!/\d/.test(password)) {
        errors.push("Au moins un chiffre");
      }
    }
    return errors;
  }, [password]);

  const handleValidateToken = () => {
    if (token.length !== 64) return;
    if (isTokenValid) {
      setManuallyConfirmed(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      return;
    }

    if (passwordErrors.length > 0) {
      return;
    }

    const result = await register({
      invitationToken: token,
      email,
      password,
      firstName,
      lastName,
    });

    if (result?.success) {
      localStorage.setItem("admin_token", result.token);
      router.push("/admin");
    }
  };

  // États de validation du token
  const isTokenLoading = token.length === 64 && tokenValidation === undefined;
  const tokenError = tokenValidation?.success && !tokenValidation.valid ? tokenValidation.error : null;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <Shield className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white">Inscription Admin</h1>
          <p className="text-slate-400 mt-1">
            {tokenValidated
              ? "Créez votre compte administrateur"
              : "Entrez votre token d'invitation"}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!tokenValidated ? (
            /* Formulaire de saisie du token */
            <motion.div
              key="token-form"
              className="bg-slate-900 rounded-2xl p-8 border border-slate-800"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Token d&apos;invitation
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <KeyRound className="w-5 h-5 text-slate-500" />
                    </div>
                    <input
                      type="text"
                      value={token}
                      onChange={(e) => setToken(e.target.value.trim())}
                      className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors font-mono text-sm"
                      placeholder="Collez votre token ici..."
                      autoComplete="off"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Le token fait 64 caractères et vous a été fourni par un administrateur.
                  </p>
                </div>

                {/* État du token */}
                {token.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-3 rounded-lg"
                  >
                    {isTokenLoading && (
                      <div className="flex items-center gap-2 text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Vérification du token...</span>
                      </div>
                    )}
                    {tokenError && (
                      <div className="flex items-center gap-2 text-red-400 bg-red-500/10 p-3 rounded-lg">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">{tokenError}</span>
                      </div>
                    )}
                    {isTokenValid && (
                      <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 p-3 rounded-lg">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">Token valide !</span>
                      </div>
                    )}
                    {token.length > 0 && token.length !== 64 && (
                      <div className="flex items-center gap-2 text-amber-400 bg-amber-500/10 p-3 rounded-lg">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">
                          Le token doit contenir 64 caractères ({token.length}/64)
                        </span>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              <motion.button
                type="button"
                onClick={handleValidateToken}
                disabled={!isTokenValid}
                className="w-full mt-6 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                whileHover={{ scale: isTokenValid ? 1.02 : 1 }}
                whileTap={{ scale: isTokenValid ? 0.98 : 1 }}
              >
                Continuer
              </motion.button>
            </motion.div>
          ) : (
            /* Formulaire d'inscription */
            <motion.form
              key="register-form"
              onSubmit={handleSubmit}
              className="bg-slate-900 rounded-2xl p-8 border border-slate-800"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="space-y-4">
                {/* Prénom et Nom */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Prénom
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                      placeholder="Jean"
                      required
                      autoComplete="given-name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Nom
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                      placeholder="Dupont"
                      required
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    placeholder="admin@exemple.fr"
                    required
                    autoComplete="email"
                  />
                </div>

                {/* Mot de passe */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {/* Indicateurs de force */}
                  {password && (
                    <div className="mt-2 space-y-1">
                      {["Au moins 8 caractères", "Au moins une majuscule", "Au moins une minuscule", "Au moins un chiffre"].map(
                        (rule) => {
                          const isValid = !passwordErrors.includes(rule);
                          return (
                            <div
                              key={rule}
                              className={`flex items-center gap-2 text-xs ${isValid ? "text-emerald-400" : "text-slate-500"}`}
                            >
                              <CheckCircle className={`w-3 h-3 ${isValid ? "" : "opacity-50"}`} />
                              <span>{rule}</span>
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>

                {/* Confirmation mot de passe */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full px-4 py-3 pr-12 bg-slate-800 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition-colors ${
                        confirmPassword && confirmPassword !== password
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                          : "border-slate-700 focus:border-emerald-500 focus:ring-emerald-500"
                      }`}
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {confirmPassword && confirmPassword !== password && (
                    <p className="text-red-400 text-xs mt-1">Les mots de passe ne correspondent pas</p>
                  )}
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={
                  isRegistering ||
                  !email ||
                  !password ||
                  !confirmPassword ||
                  !firstName ||
                  !lastName ||
                  password !== confirmPassword ||
                  passwordErrors.length > 0
                }
                className="w-full mt-6 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Inscription en cours...
                  </>
                ) : (
                  "Créer mon compte admin"
                )}
              </motion.button>

              <button
                type="button"
                onClick={() => setManuallyConfirmed(false)}
                className="w-full mt-3 text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                Utiliser un autre token
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Lien connexion */}
        <p className="text-center mt-6 text-slate-500 text-sm">
          Déjà un compte ?{" "}
          <Link href="/admin/connexion" className="text-emerald-400 hover:text-emerald-300 transition-colors">
            Se connecter
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function AdminInscriptionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      }
    >
      <InscriptionContent />
    </Suspense>
  );
}
