import { Id } from "@/convex/_generated/dataModel";

export interface GuestAddress {
  address: string;
  city: string | null;
  postalCode: string | null;
  coordinates: { lat: number; lng: number } | null;
}

export interface BookingSelection {
  selectedServiceId: string | null;
  selectedVariantId: string | null;
  selectedOptionIds: string[];
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  includeOvernightStay: boolean;
  serviceLocation: "announcer_home" | "client_home" | null;
  selectedAddressId: string | null; // ID de l'adresse client sélectionnée (utilisateur connecté)
  guestAddress: GuestAddress | null; // Adresse saisie par un invité
  // Créneaux collectifs
  selectedSlotIds: string[]; // IDs des créneaux sélectionnés pour les formules collectives
  animalCount: number; // Nombre d'animaux pour les séances collectives
  selectedAnimalType: string; // Type d'animal sélectionné
}

export interface ClientAddress {
  _id: Id<"clientAddresses">;
  userId: Id<"users">;
  label: string;
  address: string;
  city?: string;
  postalCode?: string;
  country?: string;
  coordinates?: { lat: number; lng: number };
  additionalInfo?: string;
  isDefault: boolean;
}

export interface PriceBreakdown {
  baseAmount: number;
  firstDayAmount: number;
  firstDayHours: number;
  firstDayIsFullDay: boolean;
  fullDays: number;
  fullDaysAmount: number;
  lastDayAmount: number;
  lastDayHours: number;
  lastDayIsFullDay: boolean;
  nightsAmount: number;
  nights: number;
  optionsAmount: number;
  subtotal: number;
  commission: number;
  total: number;
  daysCount: number;
  hoursCount: number;
  hourlyRate: number;
  dailyRate: number;
  nightlyRate: number;
}

export interface CalendarEntry {
  date: string;
  status: string;
  capacity?: {
    current: number;
    max: number;
    remaining: number;
  };
  timeSlots?: Array<{ startTime: string; endTime: string }>;
  bookedSlots?: Array<{ startTime: string; endTime: string }>;
}

export const DEFAULT_BOOKING_SELECTION: BookingSelection = {
  selectedServiceId: null,
  selectedVariantId: null,
  selectedOptionIds: [],
  startDate: null,
  endDate: null,
  startTime: null,
  endTime: null,
  includeOvernightStay: false,
  serviceLocation: null,
  selectedAddressId: null,
  guestAddress: null,
  // Créneaux collectifs
  selectedSlotIds: [],
  animalCount: 1,
  selectedAnimalType: "chien",
};
