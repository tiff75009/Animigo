import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// Client Convex
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

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
 * POST /api/maintenance/request-visit
 * Créer une demande de visite
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Le nom est requis" },
        { status: 400 }
      );
    }

    const clientIp = getClientIp(req);

    if (clientIp === "unknown") {
      return NextResponse.json(
        { error: "Impossible de déterminer votre adresse IP" },
        { status: 400 }
      );
    }

    // Créer la demande via Convex
    const result = await convex.mutation(
      api.maintenance.visitRequests.createVisitRequest,
      {
        name: name.trim(),
        ipAddress: clientIp,
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating visit request:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
