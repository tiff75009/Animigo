import { query } from "../_generated/server";
import { v } from "convex/values";
import { getDefaultPricing } from "../utils/defaultPricing";

type PriceUnit = "hour" | "half_day" | "day" | "week" | "month" | "flat";
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
 * Utilise les prix horaires des variantes des autres utilisateurs
 * Fallback: prix par défaut défini par l'admin dans la catégorie
 */
export const getPriceRecommendation = query({
  args: {
    token: v.string(),
    category: v.string(),
    priceUnit: v.union(
      v.literal("hour"),
      v.literal("half_day"),
      v.literal("day"),
      v.literal("week"),
      v.literal("month"),
      v.literal("flat")
    ),
  },
  handler: async (ctx, args): Promise<PriceRecommendation> => {
    // Récupérer la catégorie pour le prix par défaut admin
    const categoryData = await ctx.db
      .query("serviceCategories")
      .withIndex("by_slug", (q) => q.eq("slug", args.category))
      .first();

    // Vérifier la session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      // Retourner les prix par défaut si session invalide
      return getDefaultRecommendation(args.category, args.priceUnit, "particulier", categoryData?.defaultHourlyPrice);
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      return getDefaultRecommendation(args.category, args.priceUnit, "particulier", categoryData?.defaultHourlyPrice);
    }

    // Déterminer le type de compte pour le filtrage
    const isPro = user.accountType === "annonceur_pro";

    // Récupérer le profil de l'utilisateur pour la localisation
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    // Récupérer les prix horaires des variantes des autres utilisateurs
    let hourlyRates: number[] = [];
    let scopeUsed: ScopeUsed = "national";

    // 1. Récupérer tous les services de cette catégorie (sauf ceux de l'utilisateur actuel)
    const services = await ctx.db
      .query("services")
      .withIndex("by_category_active", (q) =>
        q.eq("category", args.category).eq("isActive", true)
      )
      .collect();

    // Filtrer pour exclure les services de l'utilisateur actuel
    const otherServices = services.filter(s => s.userId !== user._id);

    // 2. Pour chaque service, récupérer les variantes et leurs prix horaires
    for (const service of otherServices) {
      const variants = await ctx.db
        .query("serviceVariants")
        .withIndex("by_service_active", (q: any) =>
          q.eq("serviceId", service._id).eq("isActive", true)
        )
        .collect();

      // Collecter les prix horaires
      for (const variant of variants) {
        if (variant.price > 0) {
          hourlyRates.push(variant.price);
        }
      }
    }

    // 3. Si pas assez de données, utiliser le prix par défaut admin ou fallback
    if (hourlyRates.length < 3) {
      return getDefaultRecommendation(
        args.category,
        args.priceUnit,
        isPro ? "pro" : "particulier",
        categoryData?.defaultHourlyPrice
      );
    }

    // Calculer les statistiques
    const minPrice = Math.min(...hourlyRates);
    const maxPrice = Math.max(...hourlyRates);
    const avgPrice = Math.round(hourlyRates.reduce((a, b) => a + b, 0) / hourlyRates.length);
    const p25 = calculatePercentile(hourlyRates, 25);
    const p75 = calculatePercentile(hourlyRates, 75);

    return {
      hasData: true,
      sampleSize: hourlyRates.length,
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
 * Priorité: 1. Prix admin de la catégorie, 2. Prix par défaut codés en dur, 3. Fallback générique
 */
function getDefaultRecommendation(
  category: string,
  priceUnit: PriceUnit,
  accountType: "particulier" | "pro",
  adminDefaultPrice?: number // Prix horaire par défaut défini par l'admin (en centimes)
): PriceRecommendation {
  // 1. Si l'admin a défini un prix par défaut pour cette catégorie, l'utiliser
  if (adminDefaultPrice && adminDefaultPrice > 0) {
    // Créer une fourchette autour du prix admin (-20% / +20%)
    const lowPrice = Math.round(adminDefaultPrice * 0.8);
    const highPrice = Math.round(adminDefaultPrice * 1.2);

    return {
      hasData: false,
      sampleSize: 0,
      minPrice: lowPrice,
      maxPrice: highPrice,
      avgPrice: adminDefaultPrice,
      recommendedRange: {
        low: lowPrice,
        high: highPrice,
      },
      scopeUsed: "default",
      message: "Prix conseillé par la plateforme",
      isDefaultPricing: true,
    };
  }

  // 2. Sinon, utiliser les prix par défaut codés en dur
  const defaultPricing = getDefaultPricing(category, priceUnit, accountType);

  if (!defaultPricing) {
    // 3. Fallback ultime: prix génériques
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
