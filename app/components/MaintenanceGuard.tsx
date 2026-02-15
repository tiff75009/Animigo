"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Paths exclus du mode maintenance (toujours accessibles)
const EXCLUDED_PATHS = ["/maintenance", "/admin", "/api"];

// Détecter si on est en environnement local
function isLocalhost(): boolean {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname.startsWith("192.168.") ||
    hostname === "::1"
  );
}

export default function MaintenanceGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    // Bypass total en dev local
    if (isLocalhost()) {
      setIsAllowed(true);
      setIsChecking(false);
      return;
    }

    // Vérifier si le path est exclu
    const isExcluded = EXCLUDED_PATHS.some(
      (excluded) =>
        pathname === excluded || pathname.startsWith(`${excluded}/`)
    );

    if (isExcluded) {
      setIsAllowed(true);
      setIsChecking(false);
      return;
    }

    // Reset l'état pour la nouvelle route (évite de montrer l'ancien contenu)
    setIsChecking(true);
    setIsAllowed(false);

    const checkAccess = async () => {
      try {
        // 0. Vérifier si l'accès a déjà été approuvé dans cette session
        if (typeof window !== "undefined" && sessionStorage.getItem("maintenance_approved") === "true") {
          setIsAllowed(true);
          setIsChecking(false);
          return;
        }

        // 1. Appel unique au status API — retourne maintenanceEnabled + isApproved (détection IP côté serveur)
        const response = await fetch("/api/maintenance/status");
        const data = await response.json();

        // Si maintenance désactivée ou IP approuvée → autoriser
        if (!data.maintenanceEnabled || data.isApproved) {
          setIsAllowed(true);
          // Mémoriser l'approbation pour éviter les re-vérifications réseau
          if (data.isApproved && typeof window !== "undefined") {
            sessionStorage.setItem("maintenance_approved", "true");
          }
        } else {
          // Maintenance ON et IP non approuvée → rediriger
          window.location.href = "/maintenance";
          return;
        }
      } catch (error) {
        // Fail-open en cas d'erreur
        console.error("MaintenanceGuard error:", error);
        setIsAllowed(true);
      } finally {
        setIsChecking(false);
      }
    };

    checkAccess();
  }, [pathname]);

  // Pendant la vérification, afficher un écran neutre (pas le contenu)
  if (isChecking) {
    return (
      <div className="min-h-screen bg-background" />
    );
  }

  if (!isAllowed) {
    return null;
  }

  return <>{children}</>;
}
