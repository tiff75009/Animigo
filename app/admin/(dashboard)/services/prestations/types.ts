import { Id } from "@/convex/_generated/dataModel";

// Prestation (sous-catégorie) avec infos enrichies
export interface Prestation {
  id: Id<"serviceCategories">;
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  imageUrl?: string | null;
  order: number;
  isActive: boolean;
  // Parent info
  parentCategoryId: Id<"serviceCategories"> | null;
  parentName: string | null;
  parentIcon?: string | null;
  // Type info (hérité du parent)
  typeId: Id<"categoryTypes"> | null;
  typeName: string | null;
  typeIcon: string | null;
  typeColor: string | null;
  // Business fields
  billingType?: "hourly" | "daily" | "flexible";
  allowRangeBooking?: boolean;
  allowOvernightStay?: boolean;
  enableDurationBasedBlocking?: boolean;
  // Configuration tarification avancée
  announcerPriceMode?: "manual" | "automatic";
  clientBillingMode?: "exact_hourly" | "round_half_day" | "round_full_day";
  hourlyBillingSurchargePercent?: number;
  displayPriceUnit?: "hour" | "half_day" | "day" | "week" | "month";
  defaultHourlyPrice?: number; // Prix conseillé en centimes
  defaultNightlyPrice?: number; // Prix supplément nuit conseillé en centimes
  createdAt: number;
  updatedAt: number;
}

// Type simplifié pour le dropdown
export interface TypeOption {
  id: Id<"categoryTypes">;
  slug: string;
  name: string;
  icon?: string;
  color?: string;
}

// Catégorie parente simplifiée pour le dropdown
export interface ParentOption {
  id: Id<"serviceCategories">;
  slug: string;
  name: string;
  icon?: string;
  typeId: Id<"categoryTypes"> | null;
}

// Labels pour les types de facturation
export const BILLING_TYPE_LABELS: Record<string, string> = {
  hourly: "Horaire",
  daily: "Journalier",
  flexible: "Flexible",
};

// Options pour le mode de saisie des prix (annonceur)
export const ANNOUNCER_PRICE_MODE_OPTIONS = [
  { value: "manual", label: "Manuel", icon: "✏️", description: "L'annonceur saisit chaque tarif" },
  { value: "automatic", label: "Automatique", icon: "🔄", description: "Calcul depuis le prix journée" },
] as const;

// Options pour le mode de facturation client
export const CLIENT_BILLING_MODE_OPTIONS = [
  {
    value: "exact_hourly",
    label: "Facturation horaire exacte",
    icon: "⏱️",
    description: "Heures exactes avec surcharge/remise",
    example: "2h = (jour/8) × 2 × (1 + X%)"
  },
  {
    value: "round_half_day",
    label: "Arrondi demi-journée",
    icon: "🌗",
    description: "Toute durée arrondie à la demi-journée",
    example: "2h → demi-journée, 5h → journée"
  },
  {
    value: "round_full_day",
    label: "Arrondi journée",
    icon: "📅",
    description: "Toute durée = journée complète",
    example: "2h → journée"
  },
] as const;

// Options pour l'unité d'affichage du prix
export const DISPLAY_PRICE_UNIT_OPTIONS = [
  { value: "hour", label: "Heure", display: "À partir de X€/h" },
  { value: "half_day", label: "Demi-journée", display: "À partir de X€/demi-j" },
  { value: "day", label: "Jour", display: "À partir de X€/jour" },
  { value: "week", label: "Semaine", display: "À partir de X€/sem" },
  { value: "month", label: "Mois", display: "À partir de X€/mois" },
] as const;
