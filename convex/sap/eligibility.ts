// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { ConvexError } from "convex/values";

// ============================================
// HELPERS
// ============================================

async function validateSession(ctx: any, token: string) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();

  if (!session || session.expiresAt < Date.now()) {
    throw new ConvexError("Session invalide ou expirée");
  }

  const user = await ctx.db.get(session.userId);
  if (!user || !user.isActive) {
    throw new ConvexError("Utilisateur non trouvé ou inactif");
  }

  return { session, user };
}

// ============================================
// QUERIES
// ============================================

// Récupérer l'éligibilité SAP du client connecté
export const getClientSapEligibility = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    const clientProfile = await ctx.db
      .query("clientProfiles")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    if (!clientProfile) {
      return {
        sapEligibility: "none" as const,
        sapEligibilityAttested: false,
        sapEligibilityUpdatedAt: null,
      };
    }

    return {
      sapEligibility: clientProfile.sapEligibility ?? "none",
      sapEligibilityAttested: clientProfile.sapEligibilityAttested ?? false,
      sapEligibilityUpdatedAt: clientProfile.sapEligibilityUpdatedAt ?? null,
    };
  },
});

// Calculer le taux de TVA à appliquer pour une réservation
// Retourne 10 si SAP applicable, 20 sinon
// Utilise sessionToken pour identifier le client
export const computeSapVatRate = query({
  args: {
    sessionToken: v.string(),
    announcerId: v.id("users"),
    serviceCategorySlug: v.string(),
    serviceId: v.optional(v.id("services")),
    variantId: v.optional(v.id("serviceVariants")),
  },
  handler: async (ctx, args) => {
    // Résoudre le client via la session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return { vatRate: 20, isSapApplied: false };
    }

    // 1. Vérifier si la formule, le service ou la catégorie est éligible SAP
    let isEligible = false;

    // Vérifier au niveau de la formule d'abord
    if (args.variantId) {
      const variant = await ctx.db.get(args.variantId);
      if (variant?.isSapEligible) {
        isEligible = true;
      }
    }

    // Sinon vérifier au niveau du service
    if (!isEligible && args.serviceId) {
      const service = await ctx.db.get(args.serviceId);
      if (service?.isSapEligible) {
        isEligible = true;
      }
    }

    // Sinon vérifier au niveau de la catégorie
    if (!isEligible) {
      const category = await ctx.db
        .query("serviceCategories")
        .withIndex("by_slug", (q) => q.eq("slug", args.serviceCategorySlug))
        .first();
      if (category?.isSapEligible) {
        isEligible = true;
      }
    }

    if (!isEligible) {
      return { vatRate: 20, isSapApplied: false };
    }

    // 2. Vérifier si l'annonceur est approuvé SAP
    const announcerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.announcerId))
      .first();

    if (!announcerProfile?.isSapApproved) {
      return { vatRate: 20, isSapApplied: false };
    }

    // 3. Vérifier si le client est éligible SAP
    const clientProfile = await ctx.db
      .query("clientProfiles")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    if (
      !clientProfile?.sapEligibility ||
      clientProfile.sapEligibility === "none" ||
      !clientProfile.sapEligibilityAttested
    ) {
      return { vatRate: 20, isSapApplied: false };
    }

    // Les 3 conditions sont remplies → TVA réduite à 10%
    return { vatRate: 10, isSapApplied: true };
  },
});

// ============================================
// MUTATIONS
// ============================================

// Client : mettre à jour son éligibilité SAP
export const updateClientSapEligibility = mutation({
  args: {
    sessionToken: v.string(),
    sapEligibility: v.union(
      v.literal("none"),
      v.literal("elderly_dependent"),
      v.literal("disabled")
    ),
    sapEligibilityAttested: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { session } = await validateSession(ctx, args.sessionToken);

    const now = Date.now();

    // Trouver ou créer le profil client
    let clientProfile = await ctx.db
      .query("clientProfiles")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    if (clientProfile) {
      await ctx.db.patch(clientProfile._id, {
        sapEligibility: args.sapEligibility,
        sapEligibilityAttested: args.sapEligibility !== "none" ? args.sapEligibilityAttested : false,
        sapEligibilityUpdatedAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("clientProfiles", {
        userId: session.userId,
        sapEligibility: args.sapEligibility,
        sapEligibilityAttested: args.sapEligibility !== "none" ? args.sapEligibilityAttested : false,
        sapEligibilityUpdatedAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});
