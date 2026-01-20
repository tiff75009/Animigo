"use client";

import { useAuth } from "@/app/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedTypes?: ("annonceur_pro" | "annonceur_particulier" | "utilisateur")[];
  fallback?: React.ReactNode;
}

export function AuthGuard({
  children,
  allowedTypes,
  fallback,
}: AuthGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/connexion");
    }

    // Vérifier le type de compte si spécifié
    if (
      !isLoading &&
      user &&
      allowedTypes &&
      !allowedTypes.includes(user.accountType)
    ) {
      // Rediriger vers la bonne page
      if (user.accountType === "utilisateur") {
        router.push("/client");
      } else {
        router.push("/dashboard");
      }
    }
  }, [isLoading, isAuthenticated, user, allowedTypes, router]);

  if (isLoading) {
    return fallback || <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (allowedTypes && user && !allowedTypes.includes(user.accountType)) {
    return null;
  }

  return <>{children}</>;
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <p className="text-text-light">Chargement...</p>
      </motion.div>
    </div>
  );
}
