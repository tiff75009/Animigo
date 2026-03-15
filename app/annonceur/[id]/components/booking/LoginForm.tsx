"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Mail, Lock, Loader2, LogIn } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { setAuthToken as storeAuthToken } from "@/app/lib/authToken";

interface LoginFormProps {
  onLoginSuccess?: (token: string) => void;
  onClose?: () => void;
  className?: string;
}

export default function LoginForm({ onLoginSuccess, onClose, className }: LoginFormProps) {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const loginMutation = useMutation(api.auth.login.login);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setLoginError("Veuillez remplir tous les champs");
      return;
    }
    setIsLoggingIn(true);
    setLoginError("");
    try {
      const result = await loginMutation({
        email: loginEmail.toLowerCase().trim(),
        password: loginPassword,
      });
      if (result.success && result.token) {
        await storeAuthToken(result.token);
        onLoginSuccess?.(result.token);
        onClose?.();
        setLoginEmail("");
        setLoginPassword("");
      } else {
        setLoginError(result.error || "Erreur de connexion");
      }
    } catch {
      setLoginError("Une erreur est survenue");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className={className}>
      <form onSubmit={handleLogin} className="space-y-4">
        <p className="text-sm text-gray-500">
          Connectez-vous pour accéder à toutes les fonctionnalités et réserver plus facilement.
        </p>

        {loginError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {loginError}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label htmlFor="login-form-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="login-form-email"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="votre@email.com"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                autoComplete="email"
              />
            </div>
          </div>
          <div>
            <label htmlFor="login-form-password" className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="login-form-password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                autoComplete="current-password"
              />
            </div>
          </div>
        </div>
      </form>

      <div className="mt-4 space-y-3">
        <button
          type="submit"
          onClick={handleLogin}
          disabled={isLoggingIn}
          className={cn(
            "w-full py-3.5 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors",
            isLoggingIn
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg shadow-primary/25"
          )}
        >
          {isLoggingIn ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Connexion...
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              Se connecter
            </>
          )}
        </button>
        <p className="text-center text-sm text-gray-500">
          Pas encore de compte ?{" "}
          <a href="/inscription" className="text-primary font-medium">
            Inscrivez-vous
          </a>
        </p>
      </div>
    </div>
  );
}
