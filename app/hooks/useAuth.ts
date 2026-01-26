"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  accountType: "annonceur_pro" | "annonceur_particulier" | "utilisateur";
  phone: string;
  siret?: string;
  companyName?: string;
  emailVerified: boolean;
  createdAt: number;
}

export function useAuth() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Charger le token au montage
  useEffect(() => {
    const storedToken = localStorage.getItem("auth_token");
    setToken(storedToken);
    setIsInitialized(true);
  }, []);

  // Query pour vérifier la session
  const sessionData = useQuery(
    api.auth.session.getSession,
    token ? { token } : "skip"
  );

  const logoutMutation = useMutation(api.auth.session.logout);
  const logoutAllMutation = useMutation(api.auth.session.logoutAll);
  const refreshMutation = useMutation(api.auth.session.refreshSession);

  // Déduire l'état d'authentification
  const isLoading = !isInitialized || (token !== null && sessionData === undefined);
  const isAuthenticated = !!sessionData?.user;
  const user = sessionData?.user as User | null;

  // Gérer la déconnexion si session invalide
  useEffect(() => {
    if (isInitialized && token && sessionData === null) {
      // Session invalide, nettoyer
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      setToken(null);

      // Rediriger si sur une page protégée
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/dashboard")) {
        router.push("/connexion");
      }
    }
  }, [isInitialized, token, sessionData, router]);

  // Rafraîchir périodiquement la session
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(async () => {
      try {
        await refreshMutation({ token });
      } catch {
        // Session expirée
        localStorage.removeItem("auth_token");
        setToken(null);
      }
    }, 30 * 60 * 1000); // Toutes les 30 minutes

    return () => clearInterval(interval);
  }, [token, refreshMutation]);

  const logout = useCallback(async () => {
    if (!token) return;

    try {
      await logoutMutation({ token });
    } catch {
      // Ignorer les erreurs
    }

    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    setToken(null);
    router.push("/connexion");
  }, [token, logoutMutation, router]);

  const logoutAllDevices = useCallback(async () => {
    if (!token) return;

    try {
      await logoutAllMutation({ token });
    } catch {
      // Ignorer les erreurs
    }

    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    setToken(null);
    router.push("/connexion");
  }, [token, logoutAllMutation, router]);

  // Fonction pour rafraîchir le token depuis le localStorage
  // Utile après une connexion inline (sans rechargement de page)
  const refreshToken = useCallback(() => {
    const storedToken = localStorage.getItem("auth_token");
    setToken(storedToken);
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated,
    logout,
    logoutAllDevices,
    token,
    refreshToken,
  };
}
