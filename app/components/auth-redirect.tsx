"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthState } from "@/app/hooks/useAuthState";

interface AuthRedirectProps {
  children: React.ReactNode;
}

/**
 * Composant guard pour rediriger les utilisateurs déjà connectés
 * Utilisé sur les pages /connexion et /inscription
 */
export function AuthRedirect({ children }: AuthRedirectProps) {
  const { isLoading, isAuthenticated, isAdmin, user } = useAuthState();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // Admin va vers /admin
      if (isAdmin) {
        router.replace("/admin");
        return;
      }

      // Utilisateurs normaux (recherche d'animaux) vont vers /recherche
      if (user?.accountType === "utilisateur") {
        router.replace("/recherche");
        return;
      }

      // Annonceurs (pro ou particulier) vont vers /dashboard
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, isAdmin, user, router]);

  // Afficher un loader pendant la vérification
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Si authentifié, ne pas afficher le contenu (la redirection est en cours)
  if (isAuthenticated) {
    return <LoadingSpinner message="Redirection..." />;
  }

  // Afficher le contenu si non authentifié
  return <>{children}</>;
}

function LoadingSpinner({ message = "Chargement..." }: { message?: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        {/* Spinner animé */}
        <motion.div
          className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <motion.p
          className="text-foreground/60 font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {message}
        </motion.p>
        {/* Petit animal animé */}
        <motion.span
          className="text-3xl"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          🐾
        </motion.span>
      </motion.div>
    </div>
  );
}
