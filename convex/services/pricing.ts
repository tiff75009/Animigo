import { query } from "../_generated/server";
import { v } from "convex/values";
import { getDefaultPricing } from "../utils/defaultPricing";

type PriceUnit = "hour" | "day" | "week" | "month" | "flat";
type ScopeUsed = "city" | "department" | "region" | "national" | "default";

interface PriceRecommendation {
  hasData: boolean;
  sampleSize: number;
  minPrice: number;      // en centimes
  maxPrice: number;      // en centimes
  avgPrice: number;      // en centimes
  recommendedRange: {
    low: number;         // P25 en centimes
    high: number;        // P75 en centimes
  };
  scopeUsed: ScopeUsed;
  message?: string;
  isDefaultPricing: boolean;
}

/**
 * Calcule les percentiles d'un tableau de prix
 */
function calculatePercentile(prices: number[], percentile: number): number {
  if (prices.length === 0) return 0;
  const sorted = [...prices].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Récupère les prix conseillés pour une catégorie de service
 */
export const getPriceRecommendation = query({
  args: {
    token: v.string(),
    category: v.string(),
    priceUnit: v.union(
      v.literal("hour"),
      v.literal("day"),
      v.literal("week"),
      v.literal("month"),
      v.literal("flat")
    ),
  },
  handler: async (ctx, args): Promise<PriceRecommendation> => {
    // Vérifier la session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      // Retourner les prix par défaut si session invalide
      return getDefaultRecommendation(args.category, args.priceUnit, "particulier");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      return getDefaultRecommendation(args.category, args.priceUnit, "particulier");
    }

    // Déterminer le type de compte pour le filtrage
    const isPro = user.accountType === "annonceur_pro";
    const accountTypeFilter = isPro ? "annonceur_pro" : "annonceur_particulier";

    // Récupérer le profil de l'utilisateur pour la localisation
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    // Normaliser le slug de catégorie
    const categorySlug = args.category.toLowerCase().replace(/[^a-z]/g, "");

    // Essayer de trouver des services avec fallback géographique
    let services: Array<{ price: number }> = [];
    let scopeUsed: ScopeUsed = "national";

    // 1. Essayer par département
    if (profile?.department) {
      const departmentServices = await getServicesByDepartment(
        ctx,
        categorySlug,
        args.priceUnit,
        accountTypeFilter,
        profile.department
      );
      if (departmentServices.length >= 5) {
        services = departmentServices;
        scopeUsed = "department";
      }
    }

    // 2. Fallback: par région
    if (services.length < 5 && profile?.region) {
      const regionServices = await getServicesByRegion(
        ctx,
        categorySlug,
        args.priceUnit,
        accountTypeFilter,
        profile.region
      );
      if (regionServices.length >= 5) {
        services = regionServices;
        scopeUsed = "region";
      }
    }

    // 3. Fallback: national
    if (services.length < 5) {
      services = await getServicesNational(
        ctx,
        categorySlug,
        args.priceUnit,
        accountTypeFilter
      );
      scopeUsed = "national";
    }

    // 4. Si pas assez de données, utiliser les prix par défaut
    if (services.length < 3) {
      return getDefaultRecommendation(
        args.category,
        args.priceUnit,
        isPro ? "pro" : "particulier"
      );
    }

    // Calculer les statistiques
    const prices = services.map((s) => s.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    const p25 = calculatePercentile(prices, 25);
    const p75 = calculatePercentile(prices, 75);

    return {
      hasData: true,
      sampleSize: services.length,
      minPrice,
      maxPrice,
      avgPrice,
      recommendedRange: {
        low: p25,
        high: p75,
      },
      scopeUsed,
      isDefaultPricing: false,
    };
  },
});

/**
 * Récupère les services par département
 */
async function getServicesByDepartment(
  ctx: { db: any },
  category: string,
  priceUnit: PriceUnit,
  accountType: string,
  department: string
): Promise<Array<{ price: number }>> {
  // Récupérer les profils du même département
  const profiles = await ctx.db
    .query("profiles")
    .withIndex("by_department", (q: any) => q.eq("department", department))
    .collect();

  if (profiles.length === 0) return [];

  const userIds = profiles.map((p: any) => p.userId);

  // Récupérer les services de ces utilisateurs
  const allServices = await ctx.db
    .query("services")
    .withIndex("by_category_active", (q: any) =>
      q.eq("category", category).eq("isActive", true)
    )
    .collect();

  // Filtrer par utilisateurs du département et type de compte
  const filteredServices: Array<{ price: number }> = [];
  for (const service of allServices) {
    if (service.priceUnit !== priceUnit) continue;
    if (!userIds.includes(service.userId)) continue;

    // Vérifier le type de compte
    const serviceUser = await ctx.db.get(service.userId);
    if (serviceUser && serviceUser.accountType === accountType) {
      filteredServices.push({ price: service.price });
    }
  }

  return filteredServices;
}

/**
 * Récupère les services par région
 */
async function getServicesByRegion(
  ctx: { db: any },
  category: string,
  priceUnit: PriceUnit,
  accountType: string,
  region: string
): Promise<Array<{ price: number }>> {
  // Récupérer tous les profils
  const allProfiles = await ctx.db.query("profiles").collect();

  // Filtrer par région
  const regionProfiles = allProfiles.filter((p: any) => p.region === region);
  if (regionProfiles.length === 0) return [];

  const userIds = regionProfiles.map((p: any) => p.userId);

  // Récupérer les services de cette catégorie
  const allServices = await ctx.db
    .query("services")
    .withIndex("by_category_active", (q: any) =>
      q.eq("category", category).eq("isActive", true)
    )
    .collect();

  // Filtrer par utilisateurs de la région et type de compte
  const filteredServices: Array<{ price: number }> = [];
  for (const service of allServices) {
    if (service.priceUnit !== priceUnit) continue;
    if (!userIds.includes(service.userId)) continue;

    const serviceUser = await ctx.db.get(service.userId);
    if (serviceUser && serviceUser.accountType === accountType) {
      filteredServices.push({ price: service.price });
    }
  }

  return filteredServices;
}

/**
 * Récupère les services au niveau national
 */
async function getServicesNational(
  ctx: { db: any },
  category: string,
  priceUnit: PriceUnit,
  accountType: string
): Promise<Array<{ price: number }>> {
  // Récupérer tous les services de cette catégorie
  const allServices = await ctx.db
    .query("services")
    .withIndex("by_category_active", (q: any) =>
      q.eq("category", category).eq("isActive", true)
    )
    .collect();

  // Filtrer par unité de prix et type de compte
  const filteredServices: Array<{ price: number }> = [];
  for (const service of allServices) {
    if (service.priceUnit !== priceUnit) continue;

    const serviceUser = await ctx.db.get(service.userId);
    if (serviceUser && serviceUser.accountType === accountType) {
      filteredServices.push({ price: service.price });
    }
  }

  return filteredServices;
}

/**
 * Retourne les prix par défaut quand pas assez de données
 */
function getDefaultRecommendation(
  category: string,
  priceUnit: PriceUnit,
  accountType: "particulier" | "pro"
): PriceRecommendation {
  const defaultPricing = getDefaultPricing(category, priceUnit, accountType);

  if (!defaultPricing) {
    // Fallback ultime: prix génériques
    return {
      hasData: false,
      sampleSize: 0,
      minPrice: 1500,
      maxPrice: 3000,
      avgPrice: 2000,
      recommendedRange: {
        low: 1500,
        high: 2500,
      },
      scopeUsed: "default",
      message: "Prix indicatifs (données insuffisantes)",
      isDefaultPricing: true,
    };
  }

  return {
    hasData: false,
    sampleSize: 0,
    minPrice: defaultPricing.min,
    maxPrice: defaultPricing.max,
    avgPrice: defaultPricing.avg,
    recommendedRange: {
      low: defaultPricing.min,
      high: defaultPricing.max,
    },
    scopeUsed: "default",
    message: "Prix indicatifs (référence marché)",
    isDefaultPricing: true,
  };
}
