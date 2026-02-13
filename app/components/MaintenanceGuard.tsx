"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

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
  const router = useRouter();
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

    const checkAccess = async () => {
      try {
        // 1. Vérifier d'abord si la maintenance est activée (appel léger)
        const maintenanceResponse = await fetch("/api/maintenance/status");
        const maintenanceData = await maintenanceResponse.json();

        // Si maintenance désactivée → autoriser directement
        if (!maintenanceData.maintenanceEnabled) {
          setIsAllowed(true);
          setIsChecking(false);
          return;
        }

        // 2. Maintenance activée → vérifier l'IP
        const ipResponse = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipResponse.json();
        const clientIp = ipData.ip;

        const statusResponse = await fetch(
          `/api/maintenance/check-ip?ip=${clientIp}`
        );
        const statusData = await statusResponse.json();

        if (statusData.isApproved) {
          setIsAllowed(true);
        } else {
          router.replace("/maintenance");
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
  }, [pathname, router]);

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
