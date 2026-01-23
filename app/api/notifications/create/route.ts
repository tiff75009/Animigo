import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

// Client Convex pour les mutations internes
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Receiver pour valider les signatures QStash
function getReceiver() {
  const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (!currentKey || !nextKey) {
    return null;
  }

  return new Receiver({
    currentSigningKey: currentKey,
    nextSigningKey: nextKey,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();

    // Valider la signature QStash (si les clés sont configurées)
    const receiver = getReceiver();
    if (receiver) {
      const signature = req.headers.get("upstash-signature");

      if (!signature) {
        console.error("Missing QStash signature");
        return NextResponse.json(
          { error: "Missing signature" },
          { status: 401 }
        );
      }

      try {
        const isValid = await receiver.verify({
          signature,
          body,
        });

        if (!isValid) {
          console.error("Invalid QStash signature");
          return NextResponse.json(
            { error: "Invalid signature" },
            { status: 401 }
          );
        }
      } catch (verifyError) {
        console.error("Signature verification error:", verifyError);
        return NextResponse.json(
          { error: "Signature verification failed" },
          { status: 401 }
        );
      }
    } else {
      // En développement, on peut accepter les requêtes sans signature
      console.warn("QStash signing keys not configured - skipping signature verification");
    }

    // Parser le payload
    const payload = JSON.parse(body);
    const {
      userId,
      type,
      title,
      message,
      linkType,
      linkId,
      linkUrl,
      metadata,
    } = payload;

    // Valider les champs requis
    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: "Missing required fields: userId, type, title, message" },
        { status: 400 }
      );
    }

    // Créer la notification via Convex
    const notificationId = await convex.mutation(
      api.notifications.mutations.createFromWebhook,
      {
        userId: userId as Id<"users">,
        type,
        title,
        message,
        linkType,
        linkId,
        linkUrl,
        metadata,
      }
    );

    return NextResponse.json({
      success: true,
      notificationId,
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
