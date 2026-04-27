"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { initAuthTokens, clearAuthTokens, getAuthToken, getAdminToken } from "@/app/lib/authToken";

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username?: string;
  accountType: "annonceur_pro" | "annonceur_particulier" | "utilisateur";
  phone: string;
  siret?: string;
  companyName?: string;
  emailVerified: boolean;
  createdAt: number;
  role: "user" | "admin";
};

export type AuthState = {
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  user: User | null;
  token: string | null;
};

/**
 * Hook centralisé pour gérer l'état d'authentification
 * Vérifie le token en localStorage et valide côté Convex
 */
export function useAuthState() {
  // Lecture synchrone du cache mémoire (déjà rempli après le 1er init de la session)
  // → pas de flash "déconnecté" lors des navigations entre pages.
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return getAuthToken() || getAdminToken() || null;
  });
  const [hasCheckedToken, setHasCheckedToken] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return (getAuthToken() || getAdminToken()) !== null;
  });

  // Si le cache est vide (1er chargement après refresh), aller chercher le cookie httpOnly
  useEffect(() => {
    if (hasCheckedToken) return;
    let cancelled = false;
    initAuthTokens().then(({ authToken, adminToken }) => {
      if (cancelled) return;
      setToken(authToken || adminToken || null);
      setHasCheckedToken(true);
    });
    return () => {
      cancelled = true;
    };
  }, [hasCheckedToken]);

  // Query Convex pour valider la session
  const sessionData = useQuery(
    api.auth.session.getSession,
    token ? { token } : "skip"
  );

  const logoutMutation = useMutation(api.auth.session.logout);

  // Déconnexion
  const logout = useCallback(async () => {
    if (token) {
      try {
        await logoutMutation({ token });
      } catch (e) {
        console.error("Erreur lors de la déconnexion:", e);
      }
    }
    await clearAuthTokens("all");
    setToken(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("user_avatar_url");
    }
    // Forcer le rechargement pour nettoyer l'état
    window.location.href = "/";
  }, [token, logoutMutation]);

  // Déterminer l'état d'authentification
  const isLoading = !hasCheckedToken || (token !== null && sessionData === undefined);
  const isAuthenticated = !isLoading && sessionData !== null && sessionData !== undefined;
  const isAdmin = isAuthenticated && sessionData?.user?.role === "admin";

  const user: User | null = sessionData?.user
    ? {
        id: sessionData.user.id as string,
        email: sessionData.user.email,
        firstName: sessionData.user.firstName,
        lastName: sessionData.user.lastName,
        accountType: sessionData.user.accountType,
        phone: sessionData.user.phone,
        siret: sessionData.user.siret ?? undefined,
        companyName: sessionData.user.companyName ?? undefined,
        emailVerified: sessionData.user.emailVerified,
        username: sessionData.user.username ?? undefined,
        createdAt: sessionData.user.createdAt,
        role: (sessionData.user.role as "user" | "admin") ?? "user",
      }
    : null;

  return {
    isLoading,
    isAuthenticated,
    isAdmin,
    user,
    logout,
    token,
  };
}
