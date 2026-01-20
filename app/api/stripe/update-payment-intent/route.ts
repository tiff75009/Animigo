import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { NextRequest, NextResponse } from "next/server";
import { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * API endpoint pour mettre à jour les détails du PaymentIntent
 * Appelé par l'action Stripe car ctx.scheduler.runAfter ne fonctionne pas sur Convex self-hosted
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { missionId, paymentIntentId, clientSecret, internalSecret } = body;

    // Vérifier le secret interne (sécurité basique)
    const expectedSecret = process.env.INTERNAL_API_SECRET;
    if (!expectedSecret || internalSecret !== expectedSecret) {
      console.error("Invalid internal secret");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Valider les champs requis
    if (!missionId || !paymentIntentId || !clientSecret) {
      return NextResponse.json(
        { error: "Champs obligatoires manquants" },
        { status: 400 }
      );
    }

    // Appeler la mutation Convex
    const result = await convex.mutation(api.api.stripeInternal.updatePaymentIntentDetailsPublic, {
      missionId: missionId as Id<"missions">,
      paymentIntentId,
      clientSecret,
      internalSecret,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Update payment intent error:", error);

    if (error && typeof error === "object" && "data" in error) {
      const convexError = error as { data: string };
      return NextResponse.json(
        { error: convexError.data },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du paiement" },
      { status: 500 }
    );
  }
}
