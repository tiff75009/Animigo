import { Id } from "@/convex/_generated/dataModel";

// ============================================
// ENUMS & LITERAL TYPES
// ============================================

export type BillingType = "hourly" | "daily" | "flexible";
export type PriceUnit = "hour" | "half_day" | "day" | "week" | "month";
export type DisplayFormat = "hierarchy" | "subcategory" | "badge";

// ============================================
// DOMAIN ENTITIES
// ============================================

/**
 * Variante de prestation par défaut
 * Représente une option de service proposée par l'annonceur
 */
export interface DefaultVariant {
  name: string;
  description?: string;
  suggestedDuration?: number; // en minutes
  includedFeatures?: string[];
}

/**
 * Catégorie complète retournée par l'API
 * Peut être une catégorie parente ou une prestation (sous-catégorie)
 */
export interface Category {
  id: Id<"serviceCategories">;
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  imageUrl?: string | null;
  order: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;

  // Hiérarchie
  parentCategoryId?: Id<"serviceCategories">;
  parentName?: string;
  isParent?: boolean;

  // Type de catégorie (hérité du parent pour les prestations)
  typeId?: Id<"categoryTypes"> | null;
  typeName?: string | null;
  typeIcon?: string | null;
  typeColor?: string | null;

  // Paramètres catégorie parente
  displayFormat?: DisplayFormat;
  isCapacityBased?: boolean;

  // Paramètres prestation
  billingType?: BillingType;
  defaultHourlyPrice?: number;
  allowRangeBooking?: boolean;
  allowOvernightStay?: boolean;
  allowedPriceUnits?: PriceUnit[];
  defaultVariants?: DefaultVariant[];
  allowCustomVariants?: boolean;
  enableDurationBasedBlocking?: boolean;
}

/**
 * Catégorie parente simplifiée (pour les dropdowns)
 */
export interface ParentCategory {
  id: Id<"serviceCategories">;
  slug: string;
  name: string;
  icon?: string;
  imageUrl?: string | null;
  isCapacityBased?: boolean;
  typeId?: Id<"categoryTypes"> | null;
  typeName?: string | null;
  typeIcon?: string | null;
  typeColor?: string | null;
}

/**
 * Type de catégorie (pour les dropdowns)
 */
export interface CategoryTypeOption {
  id: Id<"categoryTypes">;
  slug: string;
  name: string;
  icon?: string;
  color?: string;
}

// ============================================
// FORM TYPES
// ============================================

/**
 * Données du formulaire de création/édition
 */
export interface CategoryFormData {
  // Informations de base
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;

  // Hiérarchie et type
  typeId: Id<"categoryTypes"> | null;
  parentCategoryId: Id<"serviceCategories"> | null;

  // Paramètres catégorie parente
  displayFormat: DisplayFormat;
  isCapacityBased: boolean;

  // Paramètres prestation
  billingType: BillingType;
  defaultHourlyPrice: number;
  allowRangeBooking: boolean;
  allowOvernightStay: boolean;
  allowedPriceUnits: PriceUnit[];
  defaultVariants: DefaultVariant[];
  allowCustomVariants: boolean;
  enableDurationBasedBlocking: boolean;
}

/**
 * Mode du formulaire
 */
export type FormMode = "closed" | "add" | "edit";
