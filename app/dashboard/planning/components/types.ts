import { Id } from "@/convex/_generated/dataModel";

export type MissionStatus =
  | "pending_acceptance"
  | "pending_confirmation"
  | "upcoming"
  | "in_progress"
  | "completed"
  | "refused"
  | "cancelled";

export type AvailabilityStatus = "available" | "partial" | "unavailable";

export interface Mission {
  id: Id<"missions">;
  clientId: Id<"users">;
  clientName: string;
  clientPhone?: string;
  animal: {
    name: string;
    type: string;
    emoji: string;
  };
  serviceName: string;
  serviceCategory: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  status: MissionStatus;
  amount: number;
  paymentStatus: "not_due" | "pending" | "paid" | "refunded";
  location: string;
  clientNotes?: string;
  announcerNotes?: string;
  cancellationReason?: string;
  // Type de formule et données multi-séances/collectives
  sessionType?: "individual" | "collective";
  numberOfSessions?: number;
  sessions?: Array<{ date: string; startTime: string; endTime: string }>;
  collectiveSlotIds?: string[];
  collectiveSlotDates?: string[]; // Dates des créneaux pour les formules collectives
  animalCount?: number;
}

export interface Availability {
  id: Id<"availability">;
  date: string;
  categoryTypeId?: string;
  status: AvailabilityStatus;
  timeSlots?: Array<{
    startTime: string;
    endTime: string;
  }>;
  reason?: string;
}

// Status colors for calendar
export const statusColors: Record<MissionStatus, string> = {
  completed: "bg-green-500",
  in_progress: "bg-blue-500",
  upcoming: "bg-purple",
  pending_acceptance: "bg-amber-500",
  pending_confirmation: "bg-orange-500",
  refused: "bg-red-400",
  cancelled: "bg-gray-400",
};

export const statusLabels: Record<MissionStatus, string> = {
  completed: "Terminee",
  in_progress: "En cours",
  upcoming: "A venir",
  pending_acceptance: "A accepter",
  pending_confirmation: "En attente",
  refused: "Refusee",
  cancelled: "Annulee",
};

// Availability colors
export const availabilityColors: Record<AvailabilityStatus, string> = {
  available: "bg-green-100 text-green-800 border-green-200",
  partial: "bg-orange-100 text-orange-800 border-orange-200",
  unavailable: "bg-red-100 text-red-800 border-red-200",
};

export const availabilityLabels: Record<AvailabilityStatus, string> = {
  available: "Disponible",
  partial: "Partiel",
  unavailable: "Indisponible",
};

// Helpers

// Formate une date en YYYY-MM-DD sans conversion UTC (évite le décalage de fuseau horaire)
export function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  // Convert to Monday-first (0 = Monday, 6 = Sunday)
  return day === 0 ? 6 : day - 1;
}

export function formatDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// Type pour les réservations dans un créneau collectif
export interface SlotBooking {
  _id: string;
  missionId: string;
  clientId: string;
  clientName: string;
  animalName: string;
  animalEmoji: string;
  animalType: string;
  animalCount: number;
  sessionNumber: number;
  status: "booked" | "completed" | "cancelled" | "slot_cancelled";
  missionStatus?: string;
}

// Type pour les créneaux collectifs
export interface CollectiveSlot {
  _id: string;
  variantId: string;
  variantName: string;
  serviceName: string;
  date: string;
  startTime: string;
  endTime: string;
  maxAnimals: number;
  bookedAnimals: number;
  availableSpots: number;
  isActive: boolean;
  isCancelled: boolean;
  bookings?: SlotBooking[];
}

// Couleurs pour les créneaux collectifs
export const collectiveSlotColors = {
  available: "bg-purple-100 text-purple-800 border-purple-200",
  partial: "bg-purple-200 text-purple-900 border-purple-300",
  full: "bg-purple-400 text-white border-purple-500",
};

export const monthNames = [
  "Janvier",
  "Fevrier",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Aout",
  "Septembre",
  "Octobre",
  "Novembre",
  "Decembre",
];
