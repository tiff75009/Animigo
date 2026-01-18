"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useConvexAction } from "@/app/hooks/useConvexAction";

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
      // Stocker le token
      localStorage.setItem("auth_token", result.token);

      // Si c'est un admin, stocker aussi dans admin_token pour la compatibilité
      if (result.user.role === "admin") {
        localStorage.setItem("admin_token", result.token);
      }

      // Stocker les infos utilisateur
      localStorage.setItem("user", JSON.stringify(result.user));

      // Rediriger selon le type de compte
      router.push(result.redirectPath);
    }
  };

  return (
    <div>
      {/* Header mobile */}
      <div className="lg:hidden text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
            <span className="text-xl">🐾</span>
          </div>
          <span className="text-2xl font-extrabold">
            Anim<span className="text-primary">igo</span>
          </span>
        </Link>
      </div>

      {/* Titre */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Content de vous revoir ! 👋
        </h1>
        <p className="text-text-light">
          Connectez-vous pour accéder à votre espace
        </p>
      </motion.div>

      {/* Formulaire */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSubmit}
        className="space-y-6"
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
              Mot de passe oublié ?
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

      {/* Lien inscription */}
      <div className="mt-8 text-center">
        <p className="text-text-light">
          Pas encore de compte ?{" "}
          <Link
            href="/inscription"
            className="text-primary font-semibold hover:underline"
          >
            S&apos;inscrire
          </Link>
        </p>
      </div>
    </div>
  );
}
