"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter, usePathname } from "next/navigation";

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "admin";
}

export function useAdminAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const [token, setToken] = useState<string | null>(null);
  const [tokenSource, setTokenSource] = useState<"admin" | "auth" | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Vérifier d'abord admin_token, puis auth_token (pour les admins connectés via /connexion)
    const adminToken = localStorage.getItem("admin_token");
    const authToken = localStorage.getItem("auth_token");

    if (adminToken) {
      setToken(adminToken);
      setTokenSource("admin");
    } else if (authToken) {
      setToken(authToken);
      setTokenSource("auth");
    }
    setIsInitialized(true);
  }, []);

  const sessionData = useQuery(
    api.auth.session.getSession,
    token ? { token } : "skip"
  );

  const logoutMutation = useMutation(api.auth.session.logout);

  const isLoading =
    !isInitialized || (token !== null && sessionData === undefined);
  const isAdmin = sessionData?.user?.role === "admin";
  const user = isAdmin ? (sessionData?.user as unknown as AdminUser) : null;

  useEffect(() => {
    if (isInitialized && token && sessionData === null) {
      // Session invalide - nettoyer le token approprié
      if (tokenSource === "admin") {
        localStorage.removeItem("admin_token");
      } else if (tokenSource === "auth") {
        localStorage.removeItem("auth_token");
      }
      setToken(null);
      setTokenSource(null);
      if (pathname.startsWith("/admin") && pathname !== "/admin/connexion") {
        router.push("/admin/connexion");
      }
    }

    // Rediriger si pas admin
    if (
      isInitialized &&
      sessionData?.user &&
      sessionData.user.role !== "admin"
    ) {
      // L'utilisateur n'est pas admin - ne pas supprimer auth_token
      // car c'est peut-être un utilisateur normal connecté
      if (tokenSource === "admin") {
        localStorage.removeItem("admin_token");
      }
      setToken(null);
      setTokenSource(null);
      router.push("/admin/connexion");
    }
  }, [isInitialized, token, tokenSource, sessionData, pathname, router]);

  const logout = useCallback(async () => {
    if (!token) return;
    try {
      await logoutMutation({ token });
    } catch {
      // Ignorer les erreurs
    }
    // Nettoyer les deux tokens pour une déconnexion complète de l'admin
    localStorage.removeItem("admin_token");
    localStorage.removeItem("auth_token");
    setToken(null);
    setTokenSource(null);
    router.push("/admin/connexion");
  }, [token, logoutMutation, router]);

  return {
    user,
    isLoading,
    isAdmin,
    logout,
    token,
  };
}
