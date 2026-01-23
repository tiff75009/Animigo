import { Id } from "@/convex/_generated/dataModel";

// Types de facturation
export type BillingType = "hourly" | "daily" | "flexible";

// Unités de prix
export type PriceUnit = "hour" | "day" | "week" | "month";

// Format d'affichage des catégories
export type DisplayFormat = "hierarchy" | "subcategory" | "badge";

// Prestation par défaut
export interface DefaultVariant {
  name: string;
  description?: string;
  suggestedDuration?: number;
  includedFeatures?: string[];
}

// Données du formulaire
export interface CategoryFormData {
  slug: string;
  name: string;
  description: string;
  icon: string;
  parentCategoryId: Id<"serviceCategories"> | null;
  billingType: BillingType;
  defaultHourlyPrice: number;
  allowRangeBooking: boolean;
  allowedPriceUnits: PriceUnit[];
  defaultVariants: DefaultVariant[];
  allowCustomVariants: boolean;
  allowOvernightStay: boolean;
  displayFormat: DisplayFormat;
  // Pour les catégories parentes : indique que les réservations sont gérées par capacité
  // (nombre max d'animaux simultanés) au lieu de bloquer le créneau
  isCapacityBased: boolean;
  // Pour les sous-catégories : blocage basé sur la durée du service
  // créneau bloqué = startTime + durée_variant + bufferAfter
  enableDurationBasedBlocking: boolean;
}

// Catégorie complète (depuis l'API)
export interface Category {
  id: Id<"serviceCategories">;
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  imageUrl?: string | null;
  parentCategoryId?: Id<"serviceCategories">;
  parentName?: string;
  isParent?: boolean;
  billingType?: BillingType;
  defaultHourlyPrice?: number;
  allowRangeBooking?: boolean;
  allowOvernightStay?: boolean;
  allowedPriceUnits?: PriceUnit[];
  defaultVariants?: DefaultVariant[];
  allowCustomVariants?: boolean;
  displayFormat?: DisplayFormat;
  isCapacityBased?: boolean;
  enableDurationBasedBlocking?: boolean;
  isActive: boolean;
  order: number;
  createdAt: number;
  updatedAt: number;
}

// Catégorie parente simplifiée (pour dropdown)
export interface ParentCategory {
  id: Id<"serviceCategories">;
  slug: string;
  name: string;
  icon?: string;
  imageUrl?: string | null;
}

// Props communes pour les sélecteurs
export interface SelectorProps<T> {
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

// Configuration des unités de prix
export const PRICE_UNITS: {
  value: PriceUnit;
  label: string;
  description: string;
}[] = [
  { value: "hour", label: "Horaire", description: "Prix à l'heure" },
  { value: "day", label: "Journalier", description: "Prix à la journée" },
  { value: "week", label: "Hebdomadaire", description: "Prix à la semaine" },
  { value: "month", label: "Mensuel", description: "Prix au mois" },
];

// Configuration des types de facturation
export const BILLING_TYPES: {
  value: BillingType;
  label: string;
  emoji: string;
  description: string;
}[] = [
  {
    value: "hourly",
    label: "Horaire",
    emoji: "⏱️",
    description: "Facturation à l'heure",
  },
  {
    value: "daily",
    label: "Journalier",
    emoji: "📅",
    description: "Facturation à la journée",
  },
  {
    value: "flexible",
    label: "Flexible",
    emoji: "🔄",
    description: "L'annonceur choisit",
  },
];

// Configuration des formats d'affichage
export const DISPLAY_FORMATS: {
  value: DisplayFormat;
  label: string;
  example: string;
  description: string;
}[] = [
  {
    value: "subcategory",
    label: "Sous-catégorie seule",
    example: "Garde standard",
    description: "Affiche uniquement le nom de la sous-catégorie",
  },
  {
    value: "hierarchy",
    label: "Hiérarchie complète",
    example: "Garde > Garde standard",
    description: "Affiche le parent et la sous-catégorie",
  },
  {
    value: "badge",
    label: "Badge parent",
    example: "[Garde] Garde standard",
    description: "Affiche un badge pour le parent",
  },
];

// Valeurs par défaut du formulaire
export const DEFAULT_FORM_DATA: CategoryFormData = {
  slug: "",
  name: "",
  description: "",
  icon: "",
  parentCategoryId: null,
  billingType: "hourly",
  defaultHourlyPrice: 0,
  allowRangeBooking: false,
  allowedPriceUnits: ["hour"],
  defaultVariants: [],
  allowCustomVariants: true,
  allowOvernightStay: false,
  displayFormat: "subcategory",
  isCapacityBased: false,
  enableDurationBasedBlocking: false,
};

// Helper pour convertir une catégorie en données de formulaire
export function categoryToFormData(category: Category): CategoryFormData {
  return {
    slug: category.slug,
    name: category.name,
    description: category.description || "",
    icon: category.icon || "",
    parentCategoryId: category.parentCategoryId || null,
    billingType: category.billingType || "hourly",
    defaultHourlyPrice: category.defaultHourlyPrice
      ? category.defaultHourlyPrice / 100
      : 0,
    allowRangeBooking: category.allowRangeBooking || false,
    allowedPriceUnits: (category.allowedPriceUnits as PriceUnit[]) || ["hour"],
    defaultVariants: (category.defaultVariants as DefaultVariant[]) || [],
    allowCustomVariants: category.allowCustomVariants !== false,
    allowOvernightStay: category.allowOvernightStay || false,
    displayFormat: category.displayFormat || "subcategory",
    isCapacityBased: category.isCapacityBased || false,
    enableDurationBasedBlocking: category.enableDurationBasedBlocking || false,
  };
}

// Helper pour générer un slug depuis un nom
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
