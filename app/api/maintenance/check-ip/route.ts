import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// Client Convex
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * GET /api/maintenance/check-ip?ip=xxx.xxx.xxx.xxx
 * Vérifie si une IP est approuvée
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ip = searchParams.get("ip");

    if (!ip) {
      return NextResponse.json(
        { error: "IP manquante", isApproved: false },
        { status: 400 }
      );
    }

    // Vérifier si l'IP est approuvée via Convex
    const isApproved = await convex.query(
      api.maintenance.visitRequests.isIpApproved,
      { ipAddress: ip }
    );

    return NextResponse.json({ isApproved, ip });
  } catch (error) {
    console.error("Error checking IP:", error);
    return NextResponse.json(
      { error: "Erreur lors de la vérification", isApproved: false },
      { status: 500 }
    );
  }
}
