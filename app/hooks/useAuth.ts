"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import {
  initAuthTokens,
  getAuthToken,
  clearAuthTokens,
} from "@/app/lib/authToken";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username?: string;
  accountType: "annonceur_pro" | "annonceur_particulier" | "utilisateur";
  phone: string;
  phoneVerified: boolean;
  siret?: string;
  companyName?: string;
  companyType?: "micro_enterprise" | "regular_company" | "unknown";
  isVatSubject?: boolean;
  legalForm?: string;
  emailVerified: boolean;
  createdAt: number;
}

export function useAuth() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Charger le token depuis le cookie httpOnly
  useEffect(() => {
    initAuthTokens().then(({ authToken }) => {
      setToken(authToken);
      setIsInitialized(true);
    });
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
      clearAuthTokens("auth");
      setToken(null);

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
        clearAuthTokens("auth");
        setToken(null);
      }
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [token, refreshMutation]);

  const logout = useCallback(async () => {
    if (!token) return;

    try {
      await logoutMutation({ token });
    } catch {
      // Ignorer les erreurs
    }

    await clearAuthTokens("all");
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

    await clearAuthTokens("all");
    setToken(null);
    router.push("/connexion");
  }, [token, logoutAllMutation, router]);

  // Rafraîchir le token depuis le cookie httpOnly
  const refreshToken = useCallback(() => {
    const cachedToken = getAuthToken();
    setToken(cachedToken);
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
