import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { NextRequest, NextResponse } from "next/server";
import { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      token,
      announcerId,
      serviceId,
      variantId,
      optionIds,
      startDate,
      endDate,
      startTime,
      animal,
      location,
      notes,
    } = body;

    // Validate required fields
    if (!token || !announcerId || !serviceId || !variantId || !startDate || !animal || !location) {
      return NextResponse.json(
        { error: "Champs obligatoires manquants" },
        { status: 400 }
      );
    }

    // Call the Convex mutation
    const result = await convex.mutation(api.public.search.createBookingRequest, {
      token,
      announcerId: announcerId as Id<"users">,
      serviceId: serviceId as Id<"services">,
      variantId,
      optionIds: optionIds ?? [],
      startDate,
      endDate: endDate ?? startDate,
      startTime,
      animal: {
        name: animal.name,
        type: animal.type,
        emoji: animal.emoji,
      },
      location,
      notes,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Booking error:", error);

    // Handle ConvexError
    if (error && typeof error === "object" && "data" in error) {
      const convexError = error as { data: string };
      return NextResponse.json(
        { error: convexError.data },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Une erreur est survenue lors de la réservation" },
      { status: 500 }
    );
  }
}
