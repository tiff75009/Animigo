import { Id } from "@/convex/_generated/dataModel";

export interface AnnouncerData {
  id: Id<"users">;
  firstName: string;
  lastName: string;
  memberSince: string;
  verified: boolean;
  isIdentityVerified: boolean;
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
  id: Id<"services"> | string;
  categoryId: Id<"serviceCategories"> | string;
  categorySlug?: string;
  categoryName: string;
  categoryIcon: string;
  description: string;
  animalTypes: string[];
  formules: FormuleData[];
  options: OptionData[];
  // Booking settings
  serviceLocation?: "announcer_home" | "client_home" | "both";
  allowOvernightStay?: boolean;
  overnightPrice?: number;
  dayStartTime?: string;
  dayEndTime?: string;
  enableDurationBasedBlocking?: boolean;
}

export interface FormuleData {
  id: Id<"serviceVariants"> | string;
  name: string;
  description?: string;
  objectives?: { icon: string; text: string }[];
  numberOfSessions?: number;
  sessionInterval?: number; // Délai en jours entre chaque séance
  sessionType?: "individual" | "collective"; // Type de séance
  maxAnimalsPerSession?: number; // Nombre max d'animaux si collective
  serviceLocation?: "announcer_home" | "client_home" | "both"; // Lieu de prestation
  animalTypes?: string[]; // Animaux acceptés pour cette formule
  includedFeatures?: string[];
  price: number; // en centimes
  duration?: number;
  unit?: string;
  pricing?: {
    hourly?: number;  // Prix à l'heure en centimes
    daily?: number;   // Prix à la journée en centimes
    weekly?: number;  // Prix à la semaine en centimes
    monthly?: number; // Prix au mois en centimes
  } | null;
}

export interface OptionData {
  id: Id<"serviceOptions"> | string;
  name: string;
  description?: string;
  price: number; // en centimes
}

export interface OwnAnimalData {
  id?: string | null;
  type: string;
  name: string;
  breed?: string | null;
  age?: number | null;
  gender?: "male" | "female" | "unknown" | string | null;
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
