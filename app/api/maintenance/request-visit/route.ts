import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// Client Convex
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Valider le format d'une adresse IP (IPv4 ou IPv6)
 */
function isValidIp(ip: string): boolean {
  // IPv4
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6 (simplifié)
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,7}:|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}$|^([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}$|^([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}$|^([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})$|^:((:[0-9a-fA-F]{1,4}){1,7}|:)$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * POST /api/maintenance/request-visit
 * Créer une demande de visite
 *
 * Body: { name: string, ipAddress: string }
 * L'IP est envoyée par le client (obtenue via ipify côté frontend)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, ipAddress } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Le nom est requis" },
        { status: 400 }
      );
    }

    if (!ipAddress || typeof ipAddress !== "string") {
      return NextResponse.json(
        { error: "L'adresse IP est requise" },
        { status: 400 }
      );
    }

    // Valider le format de l'IP
    if (!isValidIp(ipAddress)) {
      return NextResponse.json(
        { error: "Format d'adresse IP invalide" },
        { status: 400 }
      );
    }

    // Créer la demande via Convex
    const result = await convex.mutation(
      api.maintenance.visitRequests.createVisitRequest,
      {
        name: name.trim(),
        ipAddress: ipAddress.trim(),
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
