"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export type User = {
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
  role: "user" | "admin";
};

export type AuthState = {
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  user: User | null;
};

/**
 * Hook centralisé pour gérer l'état d'authentification
 * Vérifie le token en localStorage et valide côté Convex
 */
export function useAuthState() {
  const [token, setToken] = useState<string | null>(null);
  const [hasCheckedToken, setHasCheckedToken] = useState(false);

  // Vérifier le token au montage
  useEffect(() => {
    const authToken = localStorage.getItem("auth_token");
    const adminToken = localStorage.getItem("admin_token");
    setToken(authToken || adminToken || null);
    setHasCheckedToken(true);
  }, []);

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
    localStorage.removeItem("auth_token");
    localStorage.removeItem("admin_token");
    setToken(null);
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
  };
}
