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
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem("admin_token");
    setToken(storedToken);
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
      localStorage.removeItem("admin_token");
      setToken(null);
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
      localStorage.removeItem("admin_token");
      setToken(null);
      router.push("/admin/connexion");
    }
  }, [isInitialized, token, sessionData, pathname, router]);

  const logout = useCallback(async () => {
    if (!token) return;
    try {
      await logoutMutation({ token });
    } catch {
      // Ignorer les erreurs
    }
    localStorage.removeItem("admin_token");
    setToken(null);
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
