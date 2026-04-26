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
  animals?: Array<{
    name: string;
    type: string;
    emoji: string;
  }>;
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
  city?: string;
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
  serviceAmount?: number;
  isSapApplied?: boolean;
  // Lieu de prestation
  serviceLocation?: "announcer_home" | "client_home";
  // Historique client avec cet annonceur
  clientHistory?: {
    previousMissionsCount: number;
    isNewClient: boolean;
  };
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

// Style visuel par statut — palette sobre cohérente avec le design system
// Distingue clairement les 3 grandes étapes du tunnel :
// • À accepter (action requise annonceur)
// • Acceptée mais en attente de paiement client
// • Payée par le client (confirmée)
export interface MissionVisualStyle {
  background: string;       // fond du bloc événement
  borderColor: string;      // bordure complète
  borderLeftColor: string;  // bordure gauche d'accent (la plus visible)
  borderStyle: "solid" | "dashed";
  textColor: string;
  subTextColor: string;
  dotColor: string;         // pour pastilles compactes (mois)
  shortLabel: string;       // label court (badges)
}

export const missionVisualStyles: Record<MissionStatus, MissionVisualStyle> = {
  // À accepter : jaune pastel + bordure pointillée jaune (action requise)
  pending_acceptance: {
    background: "#fdf8ec",
    borderColor: "#f4e6c1",
    borderLeftColor: "#c9a14a",
    borderStyle: "dashed",
    textColor: "#7a5b1a",
    subTextColor: "#a08247",
    dotColor: "#c9a14a",
    shortLabel: "À accepter",
  },
  // Acceptée mais en attente paiement client : orange clair + bordure orange
  pending_confirmation: {
    background: "#fdf0e6",
    borderColor: "#f4d6bc",
    borderLeftColor: "#d97f3a",
    borderStyle: "solid",
    textColor: "#7a4a1a",
    subTextColor: "#a36e3a",
    dotColor: "#d97f3a",
    shortLabel: "Attente paiement",
  },
  // Payée par client → confirmée : vert pastel + bordure vert foncé (le statut "réussi")
  upcoming: {
    background: "#f5f9f6",
    borderColor: "#cfdbd3",
    borderLeftColor: "#1f3a33",
    borderStyle: "solid",
    textColor: "#1f3a33",
    subTextColor: "#3a6052",
    dotColor: "#1f3a33",
    shortLabel: "Confirmée",
  },
  // En cours : bleu pastel
  in_progress: {
    background: "#eaf0fd",
    borderColor: "#c8d6f0",
    borderLeftColor: "#3a72c4",
    borderStyle: "solid",
    textColor: "#1e3f7a",
    subTextColor: "#3a5a96",
    dotColor: "#3a72c4",
    shortLabel: "En cours",
  },
  // Terminée : vert sourd (déjà passée, moins saillante)
  completed: {
    background: "#f0f5f0",
    borderColor: "#d3ddd3",
    borderLeftColor: "#5a8a6e",
    borderStyle: "solid",
    textColor: "#3a5a48",
    subTextColor: "#6d8a78",
    dotColor: "#5a8a6e",
    shortLabel: "Terminée",
  },
  // Refusée : rouge pastel
  refused: {
    background: "#fdf0f0",
    borderColor: "#f1cdcd",
    borderLeftColor: "#c45656",
    borderStyle: "solid",
    textColor: "#8a3a3a",
    subTextColor: "#a35858",
    dotColor: "#c45656",
    shortLabel: "Refusée",
  },
  // Annulée : gris sourd
  cancelled: {
    background: "#f7f5ef",
    borderColor: "#ece9e1",
    borderLeftColor: "#9c9484",
    borderStyle: "solid",
    textColor: "#6d6d68",
    subTextColor: "#9c9484",
    dotColor: "#9c9484",
    shortLabel: "Annulée",
  },
};

// Helper : retourne le style visuel.
// Si le client a payé (paymentStatus === "paid") et que le statut est "upcoming",
// on garde le style "Confirmée". Si paid + status pending_confirmation,
// on bascule vers "Confirmée" (le client a payé donc c'est validé).
export function getMissionVisualStyle(mission: Mission): MissionVisualStyle {
  if (mission.paymentStatus === "paid" && mission.status === "pending_confirmation") {
    return missionVisualStyles.upcoming;
  }
  return missionVisualStyles[mission.status];
}

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
