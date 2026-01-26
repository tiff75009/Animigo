import { Id } from "@/convex/_generated/dataModel";

// Type de catégorie
export interface CategoryType {
  id: Id<"categoryTypes">;
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  order: number;
  isActive: boolean;
  categoriesCount: number;
  createdAt: number;
  updatedAt: number;
}

// Données du formulaire
export interface TypeFormData {
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

// Couleurs prédéfinies pour les types
export const TYPE_COLORS = [
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

// Emojis suggérés pour les types
export const SUGGESTED_ICONS = [
  "🏠", "✨", "💊", "🐾", "🎓", "🚗", "🏃", "🛁", "👋", "🏨",
  "💉", "❤️", "🌟", "📋", "🔧", "🎯", "🔬", "🩺", "🐶", "🐱",
];

// Valeurs par défaut du formulaire
export const DEFAULT_TYPE_FORM_DATA: TypeFormData = {
  slug: "",
  name: "",
  description: "",
  icon: "📁",
  color: "#6B7280",
};

// Helper pour générer un slug depuis un nom
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
