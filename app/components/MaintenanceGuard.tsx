"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

// Paths exclus du mode maintenance (toujours accessibles)
const EXCLUDED_PATHS = [
  "/maintenance",
  "/admin",
  "/api",
];

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
        // 1. Obtenir l'IP publique via ipify
        const ipResponse = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipResponse.json();
        const clientIp = ipData.ip;

        // 2. Vérifier le statut maintenance et si l'IP est approuvée
        const statusResponse = await fetch(
          `/api/maintenance/check-ip?ip=${clientIp}`
        );
        const statusData = await statusResponse.json();

        // 3. Vérifier si le mode maintenance est activé
        const maintenanceResponse = await fetch("/api/maintenance/status");
        const maintenanceData = await maintenanceResponse.json();

        // Si maintenance désactivée OU IP approuvée → autoriser
        if (!maintenanceData.maintenanceEnabled || statusData.isApproved) {
          setIsAllowed(true);
        } else {
          // Rediriger vers /maintenance
          router.replace("/maintenance");
          return;
        }
      } catch (error) {
        // En cas d'erreur, autoriser (fail-open)
        console.error("MaintenanceGuard error:", error);
        setIsAllowed(true);
      } finally {
        setIsChecking(false);
      }
    };

    checkAccess();
  }, [pathname, router]);

  // Pendant la vérification, on peut afficher un loader ou rien
  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAllowed) {
    return null;
  }

  return <>{children}</>;
}
