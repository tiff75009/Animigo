// Constants for the platform

export const ANIMAL_TYPES = [
  { id: "chien", label: "Chien", emoji: "🐕" },
  { id: "chat", label: "Chat", emoji: "🐈" },
  { id: "oiseau", label: "Oiseau", emoji: "🦜" },
  { id: "rongeur", label: "Rongeur", emoji: "🐰" },
  { id: "poisson", label: "Poisson", emoji: "🐠" },
  { id: "reptile", label: "Reptile", emoji: "🦎" },
  { id: "nac", label: "NAC", emoji: "🐹" },
];

export const radiusOptions = [5, 10, 15, 20, 30, 50];

export const bookingTimeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00",
];

export const monthNames = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// Mock notifications data
export const mockNotifications = [
  {
    id: "1",
    type: "booking_confirmed" as const,
    title: "Réservation confirmée",
    message: "Marie a accepté votre demande de garde pour Milo",
    time: "Il y a 5 min",
    read: false,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
  },
  {
    id: "2",
    type: "new_message" as const,
    title: "Nouveau message",
    message: "Sophie vous a envoyé un message",
    time: "Il y a 30 min",
    read: false,
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100",
  },
  {
    id: "3",
    type: "promo" as const,
    title: "Offre spéciale",
    message: "-20% sur votre première réservation avec le code BIENVENUE",
    time: "Il y a 2h",
    read: true,
  },
  {
    id: "4",
    type: "reminder" as const,
    title: "Rappel",
    message: "N'oubliez pas votre garde demain à 14h avec Pierre",
    time: "Il y a 1 jour",
    read: true,
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100",
  },
];

export type NotificationType = "booking_confirmed" | "new_message" | "promo" | "reminder";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  avatar?: string;
}
