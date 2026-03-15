import { Id } from "@/convex/_generated/dataModel";

// Emojis pour les types d'animaux
export const animalEmojis: Record<string, string> = {
  chien: "🐕",
  chat: "🐱",
  oiseau: "🐦",
  rongeur: "🐹",
  poisson: "🐠",
  reptile: "🦎",
  nac: "🐾",
};

// Labels pour le genre
export const genderLabels: Record<string, string> = {
  male: "Mâle",
  female: "Femelle",
  unknown: "Non précisé",
};

// Labels pour la taille
export const sizeLabels: Record<string, string> = {
  petit: "Petit",
  moyen: "Moyen",
  grand: "Grand",
  "très grand": "Très grand",
  tres_grand: "Très grand",
};

// Calculer l'âge à partir de la date de naissance
export function calculateAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age > 0 ? age : null;
}

// Type pour les animaux
export interface AnimalData {
  id: string;
  name: string;
  slug: string;
  type: string;
  breed?: string | null;
  gender?: string;
  birthDate?: string | null;
  weight?: number | null;
  size?: string | null;
  description?: string | null;
  profilePhoto?: string | null;
  galleryPhotos?: string[];
  goodWithChildren?: boolean | null;
  goodWithDogs?: boolean | null;
  goodWithCats?: boolean | null;
  goodWithOtherAnimals?: boolean | null;
  behaviorTraits?: string[];
}

// Type pour les avis
export interface ReviewData {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: number;
  reviewer: {
    firstName: string;
    lastName: string;
  };
}

// Type pour les formules
export interface FormuleData {
  id: string;
  name: string;
  description?: string | null;
  basePrice?: number | null;
  priceUnit?: string | null;
  pricePerHour?: number | null;
  pricePerHalfDay?: number | null;
  pricePerDay?: number | null;
  pricePerWeek?: number | null;
  pricePerMonth?: number | null;
  animalTypes?: string[];
  sessionType?: "individual" | "collective" | null;
  numberOfSessions?: number | null;
  maxAnimalsPerSession?: number | null;
  duration?: number | null;
}

// Type pour les services
export interface ServiceData {
  id: string;
  categoryName: string;
  categorySlug?: string;
  categoryIcon: string;
  animalTypes: string[];
  formules: FormuleData[];
}

// Type pour les créneaux collectifs
export interface CollectiveSlotData {
  id: string;
  variantId: string;
  date: string;
  startTime: string;
  endTime: string;
  maxAnimals: number;
  bookedAnimals: number;
}

// Pricing info
export interface PricingInfo {
  commissionRate: number;
  stripeFeeRate: number;
  vatRate: number;
  isVatApplicable: boolean;
}

// Helper: prix d'affichage d'une formule
export function getFormuleDisplayPrice(f: FormuleData): { price: number; unit: string } | null {
  if (f.pricePerDay && f.pricePerDay > 0) return { price: f.pricePerDay, unit: "/jour" };
  if (f.pricePerHour && f.pricePerHour > 0) return { price: f.pricePerHour, unit: "/h" };
  if (f.pricePerHalfDay && f.pricePerHalfDay > 0) return { price: f.pricePerHalfDay, unit: "/½j" };
  if (f.pricePerWeek && f.pricePerWeek > 0) return { price: f.pricePerWeek, unit: "/sem" };
  if (f.pricePerMonth && f.pricePerMonth > 0) return { price: f.pricePerMonth, unit: "/mois" };
  if (f.basePrice && f.basePrice > 0) {
    const unitLabel: Record<string, string> = { hour: "/h", half_day: "/½j", day: "/jour", week: "/sem", month: "/mois", flat: "" };
    return { price: f.basePrice, unit: unitLabel[f.priceUnit || ""] || "" };
  }
  return null;
}

// Formater un prix en centimes
export function formatPriceCents(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " €";
}

// Calculer le prix TTC client (service + TVA + commission + Stripe)
export function computeClientPrice(priceHT: number, pricing: PricingInfo): {
  priceTTC: number;
  commission: number;
  stripeFee: number;
  tva: number;
  total: number;
} {
  const tva = pricing.isVatApplicable ? Math.round(priceHT * pricing.vatRate / 100) : 0;
  const priceTTC = priceHT + tva;
  const commission = Math.round(priceHT * pricing.commissionRate / 100);
  const stripeFee = Math.round((priceHT + commission) * pricing.stripeFeeRate / 100);
  const total = priceTTC + commission + stripeFee;
  return { priceTTC, commission, stripeFee, tva, total };
}

// Type pour la formule sélectionnée
export interface SelectedFormule {
  formuleId: string;
  formuleName: string;
  serviceSlug: string;
  serviceName: string;
  serviceIcon: string;
  price: ReturnType<typeof getFormuleDisplayPrice>;
  duration?: number | null;
}
