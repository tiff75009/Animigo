import { Id } from "@/convex/_generated/dataModel";

export interface AnnouncerData {
  id: Id<"users">;
  firstName: string;
  lastName: string;
  memberSince: string;
  verified: boolean;
  statusType: "professionnel" | "micro_entrepreneur" | "particulier";
  profileImage: string | null;
  coverImage: string | null;
  bio: string | null;
  location: string | null;
  coordinates: { lat: number; lng: number } | null;
  rating: number;
  reviewCount: number;
  responseTime: string;
  responseRate: number;
  acceptedAnimals: string[];
  equipment: {
    housingType: "house" | "apartment" | null;
    housingSize: number | null;
    hasGarden: boolean;
    gardenSize: string | null;
    hasVehicle: boolean;
    isSmoker: boolean | null;
    hasChildren: boolean;
    childrenAges: string[];
    providesFood: boolean | null;
  };
  ownAnimals: OwnAnimalData[];
  icadRegistered: boolean | null;
  gallery: string[];
  services: ServiceData[];
  activities: ActivityData[];
  reviews: ReviewData[];
  availability: {
    nextAvailable: string;
  };
  radius: number | null;
}

export interface ServiceData {
  id: Id<"services">;
  categoryId: Id<"serviceCategories"> | null;
  categoryName: string;
  categoryIcon: string;
  description: string;
  animalTypes: string[];
  formules: FormuleData[];
  options: OptionData[];
}

export interface FormuleData {
  id: Id<"serviceVariants">;
  name: string;
  description?: string;
  price: number; // en centimes
  duration?: number;
  unit?: string;
}

export interface OptionData {
  id: Id<"serviceOptions">;
  name: string;
  description?: string;
  price: number; // en centimes
}

export interface OwnAnimalData {
  id?: string;
  type: string;
  name: string;
  breed?: string;
  age?: number;
  gender?: "male" | "female" | "unknown" | null;
  weight?: number | null;
  size?: string | null;
  description?: string | null;
  profilePhoto?: string | null;
  galleryPhotos?: string[];
  // Compatibilité
  goodWithChildren?: boolean | null;
  goodWithDogs?: boolean | null;
  goodWithCats?: boolean | null;
  goodWithOtherAnimals?: boolean | null;
  // Caractère
  behaviorTraits?: string[];
}

export interface ActivityData {
  id: string;
  name: string;
  icon: string;
  customDescription?: string;
}

export interface ReviewData {
  id: string;
  author: string;
  avatar?: string;
  rating: number;
  date: string;
  animal: string;
  content: string;
}

// Emojis pour les types d'animaux
export const animalEmojis: Record<string, string> = {
  chien: "🐕",
  chat: "🐈",
  lapin: "🐰",
  rongeur: "🐹",
  oiseau: "🦜",
  poisson: "🐠",
  reptile: "🦎",
  nac: "🐾",
  autre: "🐾",
};
