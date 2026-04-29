// @ts-nocheck
/**
 * Vérification d'adresse côté serveur (anti-falsification de coordonnées).
 *
 * Flux :
 * 1. Le client appelle `verifyGuestAddress` avec une adresse texte.
 * 2. L'action géocode via Google côté serveur, stocke les vraies
 *    coordonnées dans la table `addressVerifications` avec un token.
 * 3. Le client transmet ce token à `createPendingBooking`.
 * 4. La mutation lit la table et utilise les coordonnées AUTHENTIQUES
 *    (jamais celles fournies par le client).
 *
 * Le token est :
 *  - Unique (UUID v4)
 *  - À usage limité (30 minutes de TTL)
 *  - Marqué comme consommé après usage (anti-replay)
 */

import { action, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

// TTL d'un token de vérification : 30 minutes
const VERIFICATION_TTL_MS = 30 * 60 * 1000;

// Génère un token aléatoire 256 bits encodé hex
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Mutations / Queries internes ────────────────────────────────────

export const insertVerification = internalMutation({
  args: {
    token: v.string(),
    address: v.string(),
    lat: v.number(),
    lng: v.number(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("addressVerifications", {
      token: args.token,
      address: args.address,
      lat: args.lat,
      lng: args.lng,
      expiresAt: args.expiresAt,
      createdAt: Date.now(),
    });
  },
});

export const getApiKeyInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query("systemConfig")
      .filter((q) => q.eq(q.field("key"), "google_maps_api_key"))
      .first();
    return config?.value || null;
  },
});

// ─── Action publique ─────────────────────────────────────────────────

export const verifyGuestAddress = action({
  args: {
    address: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    token?: string;
    coordinates?: { lat: number; lng: number };
    formattedAddress?: string;
    error?: string;
  }> => {
    if (!args.address || args.address.trim().length < 3) {
      return { success: false, error: "Adresse trop courte" };
    }

    const apiKey: string | null = await ctx.runQuery(
      internal.api.addressVerification.getApiKeyInternal
    );
    if (!apiKey) {
      return { success: false, error: "API Google Maps non configurée" };
    }

    try {
      const params = new URLSearchParams({
        address: args.address,
        key: apiKey,
        components: "country:FR",
        language: "fr",
      });

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`
      );

      if (!response.ok) {
        return {
          success: false,
          error: `Erreur API Geocoding (${response.status})`,
        };
      }

      const data = await response.json();
      if (data.status !== "OK" || !data.results?.length) {
        return { success: false, error: "Adresse non trouvée" };
      }

      const result = data.results[0];
      const lat: number = result.geometry?.location?.lat;
      const lng: number = result.geometry?.location?.lng;
      const formattedAddress: string = result.formatted_address ?? args.address;

      if (typeof lat !== "number" || typeof lng !== "number") {
        return { success: false, error: "Coordonnées invalides" };
      }

      const token = generateToken();
      const expiresAt = Date.now() + VERIFICATION_TTL_MS;

      await ctx.runMutation(
        internal.api.addressVerification.insertVerification,
        {
          token,
          address: formattedAddress,
          lat,
          lng,
          expiresAt,
        }
      );

      return {
        success: true,
        token,
        coordinates: { lat, lng },
        formattedAddress,
      };
    } catch (error) {
      console.error("[verifyGuestAddress] Erreur:", error);
      return {
        success: false,
        error: "Impossible de vérifier l'adresse",
      };
    }
  },
});
