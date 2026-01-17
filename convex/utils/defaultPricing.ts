/**
 * Prix de référence par défaut pour les catégories de services
 * Utilisés quand il n'y a pas assez de données dans la base
 * Prix en centimes
 */

type PriceUnit = "hour" | "day" | "week" | "month" | "flat";

interface PriceRange {
  min: number;  // Prix minimum en centimes
  max: number;  // Prix maximum en centimes
  avg: number;  // Prix moyen en centimes
}

type CategoryPricing = Partial<Record<PriceUnit, PriceRange>>;

interface DefaultPricing {
  particulier: CategoryPricing;
  pro: CategoryPricing;
}

// Prix de référence par catégorie
// Source: estimation marché français 2024
const DEFAULT_PRICES: Record<string, DefaultPricing> = {
  garde: {
    particulier: {
      hour: { min: 800, max: 1500, avg: 1200 },
      day: { min: 2000, max: 3500, avg: 2500 },
      week: { min: 12000, max: 20000, avg: 15000 },
    },
    pro: {
      hour: { min: 1200, max: 2500, avg: 1800 },
      day: { min: 3000, max: 5000, avg: 4000 },
      week: { min: 18000, max: 30000, avg: 24000 },
    },
  },

  promenade: {
    particulier: {
      hour: { min: 800, max: 1500, avg: 1000 },
    },
    pro: {
      hour: { min: 1200, max: 2000, avg: 1500 },
    },
  },

  toilettage: {
    particulier: {
      hour: { min: 1500, max: 3000, avg: 2000 },
      flat: { min: 2500, max: 6000, avg: 4000 },
    },
    pro: {
      hour: { min: 2500, max: 5000, avg: 3500 },
      flat: { min: 3500, max: 8000, avg: 5500 },
    },
  },

  dressage: {
    particulier: {
      hour: { min: 2000, max: 4000, avg: 3000 },
    },
    pro: {
      hour: { min: 3500, max: 7000, avg: 5000 },
    },
  },

  agilite: {
    particulier: {
      hour: { min: 1500, max: 3000, avg: 2000 },
    },
    pro: {
      hour: { min: 2500, max: 4500, avg: 3500 },
    },
  },

  transport: {
    particulier: {
      hour: { min: 1000, max: 2000, avg: 1500 },
    },
    pro: {
      hour: { min: 1500, max: 3000, avg: 2000 },
    },
  },

  pension: {
    particulier: {
      day: { min: 1500, max: 3000, avg: 2000 },
      week: { min: 10000, max: 18000, avg: 13000 },
      month: { min: 35000, max: 60000, avg: 45000 },
    },
    pro: {
      day: { min: 2500, max: 4500, avg: 3500 },
      week: { min: 15000, max: 28000, avg: 22000 },
      month: { min: 50000, max: 90000, avg: 70000 },
    },
  },

  visite: {
    particulier: {
      hour: { min: 800, max: 1500, avg: 1000 },
    },
    pro: {
      hour: { min: 1200, max: 2000, avg: 1500 },
    },
  },

  medical: {
    particulier: {
      hour: { min: 1500, max: 3000, avg: 2000 },
    },
    pro: {
      hour: { min: 2500, max: 5000, avg: 3500 },
    },
  },

  autre: {
    particulier: {
      hour: { min: 1000, max: 2000, avg: 1500 },
      day: { min: 2000, max: 4000, avg: 3000 },
    },
    pro: {
      hour: { min: 1500, max: 3000, avg: 2000 },
      day: { min: 3000, max: 6000, avg: 4500 },
    },
  },
};

// Valeurs par défaut génériques si catégorie non trouvée
const GENERIC_PRICING: DefaultPricing = {
  particulier: {
    hour: { min: 1000, max: 2000, avg: 1500 },
    day: { min: 2000, max: 4000, avg: 3000 },
    week: { min: 12000, max: 24000, avg: 18000 },
    month: { min: 40000, max: 80000, avg: 60000 },
  },
  pro: {
    hour: { min: 1500, max: 3000, avg: 2000 },
    day: { min: 3000, max: 6000, avg: 4500 },
    week: { min: 18000, max: 36000, avg: 27000 },
    month: { min: 60000, max: 120000, avg: 90000 },
  },
};

/**
 * Récupère les prix de référence pour une catégorie et un type de compte
 */
export function getDefaultPricing(
  category: string,
  priceUnit: PriceUnit,
  accountType: "particulier" | "pro"
): PriceRange | null {
  // Normaliser le slug de catégorie
  const categorySlug = category.toLowerCase().replace(/[^a-z]/g, "");

  // Chercher dans les prix par défaut
  const categoryPricing = DEFAULT_PRICES[categorySlug] || GENERIC_PRICING;
  const typePricing = categoryPricing[accountType] || GENERIC_PRICING[accountType];

  if (!typePricing) return null;

  // Retourner les prix pour l'unité demandée
  const unitPricing = typePricing[priceUnit];

  if (unitPricing) {
    return unitPricing;
  }

  // Fallback: essayer de convertir depuis une autre unité
  // Si on demande "day" et qu'on a "hour", multiplier par 8
  if (priceUnit === "day" && typePricing.hour) {
    return {
      min: typePricing.hour.min * 8,
      max: typePricing.hour.max * 8,
      avg: typePricing.hour.avg * 8,
    };
  }

  // Si on demande "week" et qu'on a "day", multiplier par 7
  if (priceUnit === "week" && typePricing.day) {
    return {
      min: typePricing.day.min * 7,
      max: typePricing.day.max * 7,
      avg: typePricing.day.avg * 7,
    };
  }

  // Si on demande "month" et qu'on a "week", multiplier par 4
  if (priceUnit === "month" && typePricing.week) {
    return {
      min: typePricing.week.min * 4,
      max: typePricing.week.max * 4,
      avg: typePricing.week.avg * 4,
    };
  }

  // Fallback final: utiliser les prix génériques
  const genericUnit = GENERIC_PRICING[accountType]?.[priceUnit];
  return genericUnit || null;
}

/**
 * Vérifie si une catégorie a des prix de référence définis
 */
export function hasDefaultPricing(category: string): boolean {
  const categorySlug = category.toLowerCase().replace(/[^a-z]/g, "");
  return categorySlug in DEFAULT_PRICES;
}

/**
 * Récupère toutes les unités de prix disponibles pour une catégorie
 */
export function getAvailablePriceUnits(
  category: string,
  accountType: "particulier" | "pro"
): PriceUnit[] {
  const categorySlug = category.toLowerCase().replace(/[^a-z]/g, "");
  const categoryPricing = DEFAULT_PRICES[categorySlug] || GENERIC_PRICING;
  const typePricing = categoryPricing[accountType] || {};

  return Object.keys(typePricing) as PriceUnit[];
}
