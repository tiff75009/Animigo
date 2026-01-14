// Types for search and map data
export type ServiceType =
  | "garde"
  | "promenade"
  | "visite"
  | "dressage"
  | "toilettage"
  | "agilite"
  | "pension"
  | "transport";

export interface ServiceInfo {
  id: ServiceType;
  label: string;
  emoji: string;
  description: string;
}

export interface SitterLocation {
  id: string;
  firstName: string;
  lastName: string;
  avatar: string;
  profileImage: string;
  location: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  services: ServiceType[];
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  verified: boolean;
  description: string;
  acceptedAnimals: string[];
  responseTime: string;
  available: boolean;
}

// Service types available
export const serviceTypes: ServiceInfo[] = [
  {
    id: "garde",
    label: "Garde",
    emoji: "🏠",
    description: "Garde à domicile de votre animal",
  },
  {
    id: "promenade",
    label: "Promenade",
    emoji: "🚶",
    description: "Promenades et balades",
  },
  {
    id: "visite",
    label: "Visite",
    emoji: "👀",
    description: "Visites à domicile",
  },
  {
    id: "dressage",
    label: "Dressage",
    emoji: "🎓",
    description: "Éducation et dressage",
  },
  {
    id: "toilettage",
    label: "Toilettage",
    emoji: "✂️",
    description: "Toilettage et soins",
  },
  {
    id: "agilite",
    label: "Agilité",
    emoji: "🏃",
    description: "Entraînement agility",
  },
  {
    id: "pension",
    label: "Pension",
    emoji: "🛏️",
    description: "Pension complète",
  },
  {
    id: "transport",
    label: "Transport",
    emoji: "🚗",
    description: "Transport animalier",
  },
];

// Mock sitters data with Paris locations
export const mockSitters: SitterLocation[] = [
  {
    id: "s1",
    firstName: "Jean",
    lastName: "Dupont",
    avatar: "👨‍🦱",
    profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
    location: "Paris 11e",
    coordinates: { lat: 48.8598, lng: 2.3794 },
    services: ["garde", "promenade", "visite"],
    rating: 4.9,
    reviewCount: 47,
    hourlyRate: 15,
    verified: true,
    description: "Passionné par les animaux depuis toujours, je prends soin de vos compagnons comme s'ils étaient les miens.",
    acceptedAnimals: ["Chien", "Chat", "Lapin"],
    responseTime: "< 1h",
    available: true,
  },
  {
    id: "s2",
    firstName: "Marie",
    lastName: "Laurent",
    avatar: "👩",
    profileImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face",
    location: "Paris 15e",
    coordinates: { lat: 48.8421, lng: 2.2922 },
    services: ["garde", "toilettage", "pension"],
    rating: 4.8,
    reviewCount: 62,
    hourlyRate: 18,
    verified: true,
    description: "Toiletteuse professionnelle avec 10 ans d'expérience. Spécialisée dans les soins et le bien-être animal.",
    acceptedAnimals: ["Chien", "Chat"],
    responseTime: "< 2h",
    available: true,
  },
  {
    id: "s3",
    firstName: "Lucas",
    lastName: "Martin",
    avatar: "👨",
    profileImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face",
    location: "Paris 20e",
    coordinates: { lat: 48.8634, lng: 2.3988 },
    services: ["dressage", "agilite", "promenade"],
    rating: 4.9,
    reviewCount: 89,
    hourlyRate: 25,
    verified: true,
    description: "Éducateur canin certifié. Spécialiste en comportement animal et champion régional d'agility.",
    acceptedAnimals: ["Chien"],
    responseTime: "< 1h",
    available: true,
  },
  {
    id: "s4",
    firstName: "Sophie",
    lastName: "Bernard",
    avatar: "👩‍🦰",
    profileImage: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face",
    location: "Paris 12e",
    coordinates: { lat: 48.8396, lng: 2.3876 },
    services: ["garde", "visite", "transport"],
    rating: 4.7,
    reviewCount: 34,
    hourlyRate: 14,
    verified: true,
    description: "Grande maison avec jardin, idéale pour accueillir vos animaux. Proche du bois de Vincennes.",
    acceptedAnimals: ["Chien", "Chat", "Lapin", "Oiseau"],
    responseTime: "< 3h",
    available: true,
  },
  {
    id: "s5",
    firstName: "Thomas",
    lastName: "Petit",
    avatar: "👨‍🦱",
    profileImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
    location: "Paris 18e",
    coordinates: { lat: 48.8925, lng: 2.3444 },
    services: ["promenade", "garde", "agilite"],
    rating: 4.6,
    reviewCount: 28,
    hourlyRate: 12,
    verified: false,
    description: "Étudiant vétérinaire, je propose des services de garde et promenade avec beaucoup d'amour.",
    acceptedAnimals: ["Chien", "Chat"],
    responseTime: "< 2h",
    available: true,
  },
  {
    id: "s6",
    firstName: "Emma",
    lastName: "Rousseau",
    avatar: "👩‍🦳",
    profileImage: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face",
    location: "Paris 9e",
    coordinates: { lat: 48.8765, lng: 2.3372 },
    services: ["garde", "visite", "pension"],
    rating: 5.0,
    reviewCount: 156,
    hourlyRate: 20,
    verified: true,
    description: "Top garde ! 10 ans d'expérience, appartement spacieux, disponible 7j/7.",
    acceptedAnimals: ["Chien", "Chat", "Rongeur", "Oiseau"],
    responseTime: "< 30min",
    available: true,
  },
  {
    id: "s7",
    firstName: "Antoine",
    lastName: "Leroy",
    avatar: "👨",
    profileImage: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face",
    location: "Paris 14e",
    coordinates: { lat: 48.8331, lng: 2.3264 },
    services: ["dressage", "promenade", "transport"],
    rating: 4.8,
    reviewCount: 73,
    hourlyRate: 22,
    verified: true,
    description: "Comportementaliste animalier. Aide à résoudre les problèmes de comportement de vos compagnons.",
    acceptedAnimals: ["Chien", "Chat"],
    responseTime: "< 1h",
    available: false,
  },
  {
    id: "s8",
    firstName: "Léa",
    lastName: "Moreau",
    avatar: "👩",
    profileImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face",
    location: "Paris 5e",
    coordinates: { lat: 48.8462, lng: 2.3471 },
    services: ["garde", "toilettage", "visite"],
    rating: 4.9,
    reviewCount: 41,
    hourlyRate: 16,
    verified: true,
    description: "Proche du Jardin des Plantes, j'accueille vos animaux dans un environnement calme et verdoyant.",
    acceptedAnimals: ["Chien", "Chat", "Lapin"],
    responseTime: "< 2h",
    available: true,
  },
  {
    id: "s9",
    firstName: "Pierre",
    lastName: "Girard",
    avatar: "👨‍🦲",
    profileImage: "https://images.unsplash.com/photo-1552058544-f2b08422138a?w=400&h=400&fit=crop&crop=face",
    location: "Paris 16e",
    coordinates: { lat: 48.8637, lng: 2.2769 },
    services: ["pension", "garde", "transport"],
    rating: 4.7,
    reviewCount: 52,
    hourlyRate: 25,
    verified: true,
    description: "Villa avec grand jardin clôturé. Service premium pour vos animaux près du Bois de Boulogne.",
    acceptedAnimals: ["Chien", "Chat"],
    responseTime: "< 1h",
    available: true,
  },
  {
    id: "s10",
    firstName: "Claire",
    lastName: "Dumont",
    avatar: "👩‍🦰",
    profileImage: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face",
    location: "Paris 17e",
    coordinates: { lat: 48.8867, lng: 2.3167 },
    services: ["agilite", "dressage", "promenade"],
    rating: 4.9,
    reviewCount: 98,
    hourlyRate: 28,
    verified: true,
    description: "Coach agility certifiée. Entraînement personnalisé pour tous niveaux. Résultats garantis !",
    acceptedAnimals: ["Chien"],
    responseTime: "< 1h",
    available: true,
  },
  {
    id: "s11",
    firstName: "Hugo",
    lastName: "Faure",
    avatar: "👨‍🦱",
    profileImage: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&crop=face",
    location: "Paris 19e",
    coordinates: { lat: 48.8816, lng: 2.3822 },
    services: ["garde", "promenade", "visite"],
    rating: 4.5,
    reviewCount: 19,
    hourlyRate: 13,
    verified: false,
    description: "Proche du parc des Buttes-Chaumont, idéal pour les longues promenades avec votre chien.",
    acceptedAnimals: ["Chien", "Chat"],
    responseTime: "< 4h",
    available: true,
  },
  {
    id: "s12",
    firstName: "Julie",
    lastName: "Blanc",
    avatar: "👩",
    profileImage: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=400&fit=crop&crop=face",
    location: "Paris 10e",
    coordinates: { lat: 48.8719, lng: 2.3599 },
    services: ["toilettage", "garde", "pension"],
    rating: 4.8,
    reviewCount: 67,
    hourlyRate: 17,
    verified: true,
    description: "Salon de toilettage à domicile. Je me déplace chez vous pour le confort de votre animal.",
    acceptedAnimals: ["Chien", "Chat"],
    responseTime: "< 2h",
    available: true,
  },
];

// Paris center coordinates for default map view
export const PARIS_CENTER = {
  lat: 48.8566,
  lng: 2.3522,
};

// Helper function to filter sitters
export function filterSitters(
  sitters: SitterLocation[],
  filters: {
    services?: ServiceType[];
    location?: string;
    minRating?: number;
    verifiedOnly?: boolean;
    availableOnly?: boolean;
  }
): SitterLocation[] {
  return sitters.filter((sitter) => {
    // Filter by services
    if (filters.services && filters.services.length > 0) {
      const hasService = filters.services.some((service) =>
        sitter.services.includes(service)
      );
      if (!hasService) return false;
    }

    // Filter by location (simple text match)
    if (filters.location && filters.location.trim() !== "") {
      const locationLower = sitter.location.toLowerCase();
      const searchLower = filters.location.toLowerCase();
      if (!locationLower.includes(searchLower)) return false;
    }

    // Filter by minimum rating
    if (filters.minRating && sitter.rating < filters.minRating) {
      return false;
    }

    // Filter by verified status
    if (filters.verifiedOnly && !sitter.verified) {
      return false;
    }

    // Filter by availability
    if (filters.availableOnly && !sitter.available) {
      return false;
    }

    return true;
  });
}

// Get service info by id
export function getServiceInfo(serviceId: ServiceType): ServiceInfo | undefined {
  return serviceTypes.find((s) => s.id === serviceId);
}
