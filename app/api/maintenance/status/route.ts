import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// Client Convex
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Cache en mémoire pour éviter de surcharger Convex
let cache: {
  maintenanceEnabled: boolean;
  approvedIps: string[];
  timestamp: number;
} | null = null;

const CACHE_TTL = 5000; // 5 secondes

/**
 * Normaliser l'IP (enlever le préfixe IPv6-mapped)
 */
function normalizeIp(ip: string): string {
  // Enlever le préfixe ::ffff: des IPs IPv6-mapped
  if (ip.startsWith("::ffff:")) {
    return ip.substring(7);
  }
  return ip;
}

/**
 * Récupérer l'IP du client
 */
function getClientIp(req: NextRequest): string {
  // x-forwarded-for peut contenir plusieurs IPs séparées par des virgules
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return normalizeIp(forwardedFor.split(",")[0].trim());
  }

  // x-real-ip (utilisé par certains proxies)
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return normalizeIp(realIp);
  }

  return "unknown";
}

/**
 * GET /api/maintenance/status
 * Vérifie le statut du mode maintenance et si l'IP est approuvée
 */
export async function GET(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);

    // Vérifier le cache
    const now = Date.now();
    if (cache && now - cache.timestamp < CACHE_TTL) {
      const isApproved = cache.approvedIps.includes(clientIp);
      return NextResponse.json({
        maintenanceEnabled: cache.maintenanceEnabled,
        isApproved,
        ip: clientIp,
      });
    }

    // Récupérer les données depuis Convex
    const [maintenanceEnabled, approvedIps] = await Promise.all([
      convex.query(api.admin.config.isMaintenanceModeEnabled, {}),
      convex.query(api.maintenance.visitRequests.getApprovedIps, {}),
    ]);

    // Mettre à jour le cache
    cache = {
      maintenanceEnabled,
      approvedIps,
      timestamp: now,
    };

    const isApproved = approvedIps.includes(clientIp);

    return NextResponse.json({
      maintenanceEnabled,
      isApproved,
      ip: clientIp,
    });
  } catch (error) {
    console.error("Error checking maintenance status:", error);
    // En cas d'erreur, on laisse passer (fail-open)
    return NextResponse.json({
      maintenanceEnabled: false,
      isApproved: true,
      error: "Failed to check maintenance status",
    });
  }
}
