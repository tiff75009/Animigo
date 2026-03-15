"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter, usePathname } from "next/navigation";
import {
  initAuthTokens,
  clearAuthTokens,
} from "@/app/lib/authToken";

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
    initAuthTokens().then(({ authToken, adminToken }) => {
      if (adminToken) {
        setToken(adminToken);
        setTokenSource("admin");
      } else if (authToken) {
        setToken(authToken);
        setTokenSource("auth");
      }
      setIsInitialized(true);
    });
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
      if (tokenSource === "admin") {
        clearAuthTokens("admin");
      } else if (tokenSource === "auth") {
        clearAuthTokens("auth");
      }
      setToken(null);
      setTokenSource(null);
      if (pathname.startsWith("/admin") && pathname !== "/admin/connexion") {
        router.push("/admin/connexion");
      }
    }

    if (
      isInitialized &&
      sessionData?.user &&
      sessionData.user.role !== "admin"
    ) {
      if (tokenSource === "admin") {
        clearAuthTokens("admin");
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
    await clearAuthTokens("all");
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
