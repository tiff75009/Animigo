"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Star, CreditCard, ArrowLeft } from "lucide-react";
import { setAuthToken, setAdminToken } from "@/app/lib/authToken";
import { useConvexAction } from "@/app/hooks/useConvexAction";
import { useToast } from "@/app/components/ui/toast";

function SocialLoginButtons() {
  const toast = useToast();

  const handleSocial = (provider: string) => {
    toast.info(
      "Bientôt disponible",
      `La connexion avec ${provider} sera disponible prochainement.`
    );
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => handleSocial("Google")}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-foreground"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Continuer avec Google
      </button>

      <button
        type="button"
        onClick={() => handleSocial("Facebook")}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-foreground"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
        Continuer avec Facebook
      </button>

      <button
        type="button"
        onClick={() => handleSocial("Apple")}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-foreground"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </svg>
        Continuer avec Apple
      </button>
    </div>
  );
}

export default function ConnexionPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { execute: login, isLoading } = useConvexAction(api.auth.login.login, {
    successMessage: "Connexion réussie",
    redirectOnSessionExpired: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await login({ email, password });

    if (result?.success) {
      if (result.user.role === "admin") {
        await setAdminToken(result.token);
      } else {
        await setAuthToken(result.token);
      }
      router.push(result.redirectPath);
    }
  };

  return (
    <div>
      {/* Header mobile */}
      <div className="lg:hidden mb-8">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Accueil</span>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
              <span className="text-base">🐾</span>
            </div>
            <span className="text-lg font-extrabold">
              Anim<span className="text-primary">igo</span>
            </span>
          </Link>
        </div>
      </div>

      {/* Titre */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Connexion
        </h1>
        <p className="text-text-light">
          Connectez-vous pour accéder à votre espace
        </p>
      </motion.div>

      {/* Boutons sociaux */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <SocialLoginButtons />
      </motion.div>

      {/* Séparateur */}
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-sm text-text-light">ou</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Formulaire */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {/* Email */}
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="votre@email.com"
          label="Adresse email"
          icon={<Mail className="w-5 h-5" />}
          required
        />

        {/* Mot de passe */}
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <label className="text-sm font-medium text-foreground">
              Mot de passe
            </label>
            <Link
              href="/mot-de-passe-oublie"
              className="text-sm text-primary hover:underline"
            >
              Oublié ?
            </Link>
          </div>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Votre mot de passe"
              icon={<Lock className="w-5 h-5" />}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-light hover:text-foreground transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Bouton connexion */}
        <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
          {isLoading ? (
            <motion.div
              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          ) : (
            "Se connecter"
          )}
        </Button>
      </motion.form>

      {/* Bandeau de confiance */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mt-6 flex items-center justify-center gap-4 text-[11px] text-text-light"
      >
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-secondary" />
          Identités vérifiées
        </span>
        <span className="w-px h-3 bg-gray-200" />
        <span className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-yellow-400" />
          Avis certifiés
        </span>
        <span className="w-px h-3 bg-gray-200" />
        <span className="flex items-center gap-1">
          <CreditCard className="w-3.5 h-3.5 text-primary" />
          Paiement sécurisé
        </span>
      </motion.div>

      {/* Liens inscription */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-6 space-y-3"
      >
        <div className="text-center">
          <p className="text-text-light text-sm">
            Pas encore de compte ?
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/inscription?type=utilisateur"
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 hover:border-primary/30 hover:bg-primary/5 transition-colors text-sm font-medium text-foreground"
          >
            <span className="text-base">🐾</span>
            Propriétaire
          </Link>
          <Link
            href="/pro"
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 hover:border-secondary/30 hover:bg-secondary/5 transition-colors text-sm font-medium text-foreground"
          >
            <span className="text-base">💼</span>
            Pet-sitter
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
