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
