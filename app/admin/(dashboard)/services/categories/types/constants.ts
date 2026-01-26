import type { BillingType, PriceUnit, DisplayFormat, CategoryFormData } from "./category.types";

// ============================================
// BILLING TYPES
// ============================================

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

// ============================================
// PRICE UNITS
// ============================================

export const PRICE_UNITS: {
  value: PriceUnit;
  label: string;
  description: string;
}[] = [
  { value: "hour", label: "Horaire", description: "Prix à l'heure" },
  { value: "half_day", label: "Demi-journée", description: "Prix à la demi-journée" },
  { value: "day", label: "Journalier", description: "Prix à la journée" },
  { value: "week", label: "Hebdomadaire", description: "Prix à la semaine" },
  { value: "month", label: "Mensuel", description: "Prix au mois" },
];

// ============================================
// DISPLAY FORMATS
// ============================================

export const DISPLAY_FORMATS: {
  value: DisplayFormat;
  label: string;
  example: string;
  description: string;
}[] = [
  {
    value: "subcategory",
    label: "Prestation seule",
    example: "Garde standard",
    description: "Affiche uniquement le nom de la prestation",
  },
  {
    value: "hierarchy",
    label: "Hiérarchie complète",
    example: "Garde > Garde standard",
    description: "Affiche le parent et la prestation",
  },
  {
    value: "badge",
    label: "Badge parent",
    example: "[Garde] Garde standard",
    description: "Affiche un badge pour le parent",
  },
];

// ============================================
// COLORS
// ============================================

export const CATEGORY_COLORS: { value: string; label: string }[] = [
  { value: "#FF6B6B", label: "Corail" },
  { value: "#4ECDC4", label: "Turquoise" },
  { value: "#45B7D1", label: "Bleu ciel" },
  { value: "#96CEB4", label: "Menthe" },
  { value: "#FFEAA7", label: "Jaune" },
  { value: "#DDA0DD", label: "Lavande" },
  { value: "#98D8C8", label: "Vert d'eau" },
  { value: "#F7DC6F", label: "Or" },
  { value: "#BB8FCE", label: "Violet" },
  { value: "#85C1E9", label: "Bleu clair" },
  { value: "#F8B500", label: "Orange" },
  { value: "#58D68D", label: "Vert" },
];

// ============================================
// DEFAULT VALUES
// ============================================

export const DEFAULT_FORM_DATA: CategoryFormData = {
  slug: "",
  name: "",
  description: "",
  icon: "",
  color: "#FF6B6B",
  typeId: null,
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
