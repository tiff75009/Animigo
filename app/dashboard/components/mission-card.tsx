"use client";

import { useState, useEffect } from "react";
import { cn } from "@/app/lib/utils";
import { motion } from "framer-motion";
import {
  Calendar,
  MapPin,
  Check,
  X,
  Clock,
  Eye,
  MessageSquare,
  Package,
  Euro,
  ChevronRight,
  Info,
  Navigation,
  Heart,
  AlertTriangle,
  Stethoscope,
  Sparkles,
  Users,
  Activity,
  Loader2,
  Repeat,
  CalendarDays,
  ShieldCheck,
  Star,
  Lock,
  ArrowLeft,
  PawPrint,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DeadlineCountdown } from "./deadline-countdown";

// Types pour les stats de confiance client
export interface ClientTrustStats {
  totalBookings: number;
  cancelled: number;
  notFinalized: number;
  completed: number;
  trustScore: number;
}

// Types pour les missions Convex
// Accepte à la fois Id<"missions"> (Convex) et string (données de test)
export interface ConvexMission {
  id: Id<"missions"> | string;
  clientId: Id<"users"> | string;
  clientName: string;
  clientPhone?: string;
  animal: {
    name: string;
    type: string;
    emoji: string;
  };
  animalId?: Id<"animals">;
  animalIds?: (Id<"animals"> | string)[];
  animals?: Array<{ name: string; type: string; emoji: string }>;
  serviceName: string;
  serviceCategory: string;
  variantId?: string;
  variantName?: string;
  optionIds?: string[];
  optionNames?: string[];
  basePrice?: number;
  optionsPrice?: number;
  platformFee?: number;
  announcerEarnings?: number;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  status: string;
  amount: number;
  paymentStatus: string;
  location?: string;
  city?: string;
  clientCoordinates?: { lat: number; lng: number };
  clientNotes?: string;
  announcerNotes?: string;
  // Type de formule
  sessionType?: "individual" | "collective";
  numberOfSessions?: number;
  // Créneaux collectifs
  collectiveSlotIds?: string[];
  collectiveSlotDates?: string[]; // Dates des créneaux pour l'affichage
  animalCount?: number;
  // Séances multi-sessions
  sessions?: Array<{
    date: string;
    startTime: string;
    endTime: string;
  }>;
  // Timestamp de réservation
  bookedAt?: number;
  // Stats de confiance du client
  clientTrustStats?: ClientTrustStats;
  // Délai d'acceptation
  acceptanceDeadline?: number;
  // Lieu de prestation
  serviceLocation?: "announcer_home" | "client_home";
  // Historique client avec cet annonceur
  clientHistory?: {
    previousMissionsCount: number;
    isNewClient: boolean;
  };
  // TVA
  vatRate?: number;
  isSapApplied?: boolean;
  isVatSubject?: boolean;
}

interface MissionCardProps {
  mission: ConvexMission;
  showActions?: boolean;
  showUpcomingActions?: boolean;
  onAccept?: (id: string) => void;
  onRefuse?: (id: string) => void;
  onCancel?: (id: string) => void;
  onContact?: (id: string) => void;
  onViewDetails?: () => void;
  announcerCoordinates?: { lat: number; lng: number } | null;
  token?: string | null;
}

// Types pour les traits d'animaux
const ANIMAL_TRAITS = {
  compatibility: {
    label: "Compatibilité",
    icon: Users,
    traits: {
      "good_with_dogs": "S'entend avec les chiens",
      "good_with_cats": "S'entend avec les chats",
      "good_with_children": "Aime les enfants",
      "good_with_strangers": "Sociable avec les inconnus",
      "prefers_alone": "Préfère être seul",
    },
  },
  behavior: {
    label: "Comportement",
    icon: Activity,
    traits: {
      "calm": "Calme",
      "energetic": "Énergique",
      "playful": "Joueur",
      "shy": "Timide",
      "independent": "Indépendant",
      "affectionate": "Câlin",
      "protective": "Protecteur",
      "anxious": "Anxieux",
    },
  },
  needs: {
    label: "Besoins",
    icon: Heart,
    traits: {
      "daily_walks": "Promenades quotidiennes",
      "regular_grooming": "Toilettage régulier",
      "special_diet": "Régime spécial",
      "medication": "Médicaments",
      "lots_of_attention": "Beaucoup d'attention",
      "quiet_environment": "Environnement calme",
    },
  },
};

// Style visuel par statut — palette sobre cohérente avec planning
interface StatusStyle {
  label: string;
  accent: string;       // couleur d'accent (border-left, dot, badge)
  pastelBg: string;     // fond pastel pour le badge
  pastelBorder: string; // bordure du badge
  textColor: string;    // texte du badge
}

const statusConfig: Record<string, StatusStyle> = {
  pending_acceptance: {
    label: "À accepter",
    accent: "#c9a14a",
    pastelBg: "#fdf8ec",
    pastelBorder: "#f4e6c1",
    textColor: "#7a5b1a",
  },
  pending_confirmation: {
    label: "En attente",
    accent: "#d97f3a",
    pastelBg: "#fdf0e6",
    pastelBorder: "#f4d6bc",
    textColor: "#7a4a1a",
  },
  upcoming: {
    label: "Confirmée",
    accent: "#1f3a33",
    pastelBg: "#f5f9f6",
    pastelBorder: "#cfdbd3",
    textColor: "#1f3a33",
  },
  in_progress: {
    label: "En cours",
    accent: "#3a72c4",
    pastelBg: "#eaf0fd",
    pastelBorder: "#c8d6f0",
    textColor: "#1e3f7a",
  },
  completed: {
    label: "Terminée",
    accent: "#5a8a6e",
    pastelBg: "#f0f5f0",
    pastelBorder: "#d3ddd3",
    textColor: "#3a5a48",
  },
  refused: {
    label: "Refusée",
    accent: "#c45656",
    pastelBg: "#fdf0f0",
    pastelBorder: "#f1cdcd",
    textColor: "#8a3a3a",
  },
  cancelled: {
    label: "Annulée",
    accent: "#9c9484",
    pastelBg: "#f7f5ef",
    pastelBorder: "#ece9e1",
    textColor: "#6d6d68",
  },
};

// Helper functions
function formatDateCompact(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

function formatDateRange(startDate: string, endDate: string): string {
  if (startDate === endDate) {
    return formatDateCompact(startDate);
  }
  return `${formatDateCompact(startDate)} → ${formatDateCompact(endDate)}`;
}

function formatTime(startTime?: string, endTime?: string): string {
  if (!startTime && !endTime) return "";
  if (startTime && endTime) return `${startTime} - ${endTime}`;
  if (startTime) return startTime;
  return "";
}

function formatPrice(amountInCents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountInCents / 100);
}

function getDaysDifference(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

// Extraire le prénom du nom complet
function getFirstName(fullName: string): string {
  return fullName.split(" ")[0];
}

// Extraire la ville d'une adresse (fallback si city n'est pas défini)
function extractCity(location?: string): string {
  if (!location) return "";
  // Essayer d'extraire la ville (souvent après le code postal ou à la fin)
  const parts = location.split(",").map((p) => p.trim());
  if (parts.length >= 2) {
    // Prendre l'avant-dernier élément (souvent la ville)
    return parts[parts.length - 2] || parts[parts.length - 1];
  }
  return location;
}

// Calcul de distance avec la prestation Haversine
export function calculateDistance(
  coord1: { lat: number; lng: number },
  coord2: { lat: number; lng: number }
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLng = toRad(coord2.lng - coord1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.lat)) *
      Math.cos(toRad(coord2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

// Helper pour obtenir la couleur du score de confiance
function getTrustScoreColor(score: number): { bg: string; text: string } {
  if (score >= 80) {
    return { bg: "bg-green-100", text: "text-green-700" };
  } else if (score >= 50) {
    return { bg: "bg-orange-100", text: "text-orange-700" };
  } else {
    return { bg: "bg-red-100", text: "text-red-700" };
  }
}

// Formate le temps écoulé depuis la réservation
// < 24h: "il y a 2h 30m 15s"
// >= 24h: "il y a 2j 5h"
function formatBookedAtElapsed(bookedAt: number): string {
  const now = Date.now();
  const diffMs = now - bookedAt;

  // En secondes
  const totalSeconds = Math.floor(diffMs / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  if (totalDays >= 1) {
    // Plus de 24h: afficher jours et heures
    const remainingHours = totalHours % 24;
    if (remainingHours > 0) {
      return `il y a ${totalDays}j ${remainingHours}h`;
    }
    return `il y a ${totalDays}j`;
  } else {
    // Moins de 24h: afficher heures, minutes, secondes
    const hours = totalHours;
    const minutes = totalMinutes % 60;
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `il y a ${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `il y a ${minutes}m ${seconds}s`;
    } else {
      return `il y a ${seconds}s`;
    }
  }
}

export function MissionCard({
  mission,
  showActions = false,
  showUpcomingActions = false,
  onAccept,
  onRefuse,
  onCancel,
  onContact,
  onViewDetails,
  announcerCoordinates,
  token,
}: MissionCardProps) {
  const [, setTick] = useState(0); // Force re-render pour mettre à jour le temps écoulé
  const status = statusConfig[mission.status] || statusConfig.pending_acceptance;
  // L'adresse exacte et le téléphone sont visibles uniquement après acceptation ET paiement
  // (status: upcoming, in_progress, completed)
  const canShowSensitiveInfo = ["upcoming", "in_progress", "completed"].includes(mission.status);
  const isAccepted = canShowSensitiveInfo;

  // Mise à jour automatique du temps écoulé avec intervalle adaptatif
  // > 1 jour : refresh toutes les 5 minutes
  // > 1 heure : refresh toutes les minutes
  // < 1 heure : refresh toutes les 10 secondes
  useEffect(() => {
    if (mission.bookedAt && mission.status === "pending_acceptance") {
      const getIntervalMs = (): number => {
        const diffMs = Date.now() - mission.bookedAt!;
        const totalHours = diffMs / (1000 * 60 * 60);
        const totalDays = totalHours / 24;

        if (totalDays >= 1) return 5 * 60 * 1000; // 5 minutes
        if (totalHours >= 1) return 60 * 1000; // 1 minute
        return 10 * 1000; // 10 secondes
      };

      let timeoutId: NodeJS.Timeout;

      const tick = () => {
        setTick((t) => t + 1);
        timeoutId = setTimeout(tick, getIntervalMs());
      };

      timeoutId = setTimeout(tick, getIntervalMs());

      return () => clearTimeout(timeoutId);
    }
  }, [mission.bookedAt, mission.status]);

  const days = getDaysDifference(mission.startDate, mission.endDate);
  const firstName = getFirstName(mission.clientName);
  const cityDisplay = mission.city || extractCity(mission.location);

  // Calcul de la distance
  const distance =
    announcerCoordinates && mission.clientCoordinates
      ? calculateDistance(announcerCoordinates, mission.clientCoordinates)
      : null;

  return (
    <>
      <motion.div
        className="bg-white overflow-hidden relative transition-shadow hover:shadow-[0_8px_24px_rgba(30,30,28,0.06)]"
        style={{
          borderRadius: 14,
          border: "1px solid #ece9e1",
          borderLeft: `3px solid ${status.accent}`,
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Bandeau décompte (esprit "alerte" au-dessus du contenu) */}
        {mission.acceptanceDeadline && mission.status === "pending_acceptance" && showActions && (
          <div
            className="px-2.5 py-1 flex items-center justify-between gap-2 group"
            style={{
              background: status.pastelBg,
              borderBottom: `1px solid ${status.pastelBorder}`,
            }}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="text-[10px] font-medium uppercase tracking-[0.05em]"
                style={{ color: status.textColor }}
              >
                Répondre sous
              </span>
              <DeadlineCountdown
                deadline={mission.acceptanceDeadline}
                bookedAt={mission.bookedAt}
                compact
              />
            </div>
            <div className="relative flex-shrink-0">
              <Info className="w-3 h-3 cursor-help" style={{ color: status.textColor }} />
              <div
                className="absolute top-full right-0 mt-1.5 w-56 p-2 text-[10px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none"
                style={{
                  borderRadius: 8,
                  background: "#1f1f1d",
                  color: "#f7f5ef",
                  boxShadow: "0 8px 24px rgba(30,30,28,0.18)",
                }}
              >
                <div
                  className="absolute top-0 right-2 -translate-y-1/2 rotate-45 w-2 h-2"
                  style={{ background: "#1f1f1d" }}
                />
                <p>
                  Si vous ne répondez pas avant la fin du délai, la demande sera{" "}
                  <strong>automatiquement refusée</strong> et votre{" "}
                  <strong>note de confiance</strong> pourrait baisser.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex">
          {/* Contenu principal */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="p-2.5 flex items-start gap-2.5">
              {/* Avatar animal */}
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "#f5f9f6", border: "1px solid #cfdbd3" }}
              >
                {mission.animals && mission.animals.length > 1 ? (
                  <div className="flex items-center">
                    {mission.animals.slice(0, 3).map((a, i) => (
                      <span
                        key={i}
                        className="text-[12px]"
                        style={{ marginLeft: i > 0 ? "-3px" : "0" }}
                      >
                        {a.emoji}
                      </span>
                    ))}
                    {mission.animals.length > 3 && (
                      <span
                        className="text-[9px] font-bold ml-0.5"
                        style={{ color: "#1f3a33" }}
                      >
                        +{mission.animals.length - 3}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[16px]">{mission.animal.emoji}</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <p
                    className="text-[13px] font-semibold tracking-[-0.01em] truncate m-0"
                    style={{ color: "#1f1f1d" }}
                  >
                    {firstName}
                  </p>
                  <span
                    className="inline-flex items-center px-1.5 py-px rounded-full text-[9.5px] font-medium uppercase tracking-[0.05em]"
                    style={{
                      background: status.pastelBg,
                      color: status.textColor,
                      border: `1px solid ${status.pastelBorder}`,
                    }}
                  >
                    {status.label}
                  </span>
                  {/* Trust */}
                  {mission.clientTrustStats && (
                    <span
                      className="inline-flex items-center gap-0.5 px-1 py-px rounded-full text-[9.5px] font-medium"
                      style={(() => {
                        const score = mission.clientTrustStats.trustScore;
                        const bg = score >= 80 ? "#f0f5f0" : score >= 50 ? "#fdf0e6" : "#fdf0f0";
                        const color = score >= 80 ? "#3a5a48" : score >= 50 ? "#7a4a1a" : "#8a3a3a";
                        return { background: bg, color, border: `1px solid ${color}33` };
                      })()}
                      title={`${mission.clientTrustStats.totalBookings} réservation${mission.clientTrustStats.totalBookings > 1 ? "s" : ""} · ${mission.clientTrustStats.completed} terminée${mission.clientTrustStats.completed > 1 ? "s" : ""}`}
                    >
                      <ShieldCheck className="w-2.5 h-2.5" />
                      {mission.clientTrustStats.trustScore}%
                    </span>
                  )}
                  {/* Historique */}
                  {mission.clientHistory &&
                    (mission.clientHistory.isNewClient ? (
                      <span
                        className="inline-flex items-center gap-0.5 px-1 py-px rounded-full text-[9.5px] font-medium"
                        style={{
                          background: "#fcfaf4",
                          color: "#7a5b1a",
                          border: "1px solid #f4e6c1",
                        }}
                      >
                        <Star className="w-2.5 h-2.5" />
                        Nouveau
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-0.5 px-1 py-px rounded-full text-[9.5px] font-medium"
                        style={{
                          background: "#f5f9f6",
                          color: "#2f4a3f",
                          border: "1px solid #cfdbd3",
                        }}
                        title={`${mission.clientHistory.previousMissionsCount} mission${mission.clientHistory.previousMissionsCount > 1 ? "s" : ""} terminée${mission.clientHistory.previousMissionsCount > 1 ? "s" : ""} ensemble`}
                      >
                        <Repeat className="w-2.5 h-2.5" />
                        Fidèle {mission.clientHistory.previousMissionsCount}×
                      </span>
                    ))}
                </div>
                <p
                  className="text-[11px] truncate mt-px leading-tight"
                  style={{ color: "#6d6d68" }}
                >
                  {mission.animals && mission.animals.length > 1
                    ? mission.animals.length <= 3
                      ? mission.animals.map((a) => a.name).join(" & ")
                      : `${mission.animals.length} animaux`
                    : mission.animal.name}
                  {" · "}
                  {mission.serviceName}
                </p>
                {/* Temps écoulé */}
                {mission.bookedAt && mission.status === "pending_acceptance" && (
                  <p
                    className="text-[10px] font-medium mt-0.5 flex items-center gap-0.5 leading-tight"
                    style={{ color: status.accent }}
                  >
                    <Clock className="w-2.5 h-2.5" />
                    Reçue {formatBookedAtElapsed(mission.bookedAt)}
                  </p>
                )}
              </div>

              {/* Revenu inline (à droite) */}
              <div className="text-right flex-shrink-0">
                <p
                  className="text-[9px] font-medium uppercase tracking-[0.08em] m-0 leading-tight"
                  style={{ color: "#9c9484" }}
                >
                  Revenu
                </p>
                <p
                  className="text-[15px] font-semibold tracking-[-0.02em] m-0 leading-tight"
                  style={{ color: "#1f3a33" }}
                >
                  {formatPrice(mission.announcerEarnings ?? mission.amount * 0.85)}
                </p>
              </div>
            </div>

            {/* Infos + badges sur une seule ligne */}
            <div className="px-2.5 pb-2 flex flex-wrap items-center gap-1 text-[10.5px]">
              <InfoChip
                icon={<Calendar className="w-2.5 h-2.5" />}
                label={
                  <>
                    {formatDateRange(mission.startDate, mission.endDate)}
                    {days > 1 &&
                      !mission.sessions &&
                      mission.sessionType !== "collective" && (
                        <span style={{ color: "#9c9484" }}> ({days}j)</span>
                      )}
                  </>
                }
              />
              {mission.startTime && (
                <InfoChip
                  icon={<Clock className="w-2.5 h-2.5" />}
                  label={formatTime(mission.startTime, mission.endTime)}
                />
              )}
              {mission.serviceLocation === "announcer_home" ? (
                <InfoChip
                  icon={<MapPin className="w-2.5 h-2.5" />}
                  label="Chez vous"
                  highlight
                />
              ) : (
                cityDisplay && (
                  <InfoChip
                    icon={<MapPin className="w-2.5 h-2.5" />}
                    label={cityDisplay}
                  />
                )
              )}
              {distance !== null && (
                <InfoChip
                  icon={<Navigation className="w-2.5 h-2.5" />}
                  label={formatDistance(distance)}
                />
              )}
              {/* Badges fusionnés dans la ligne d'infos */}
              {mission.isSapApplied && (
                <span
                  className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-px rounded-full"
                  style={{
                    background: "#f5f9f6",
                    color: "#2f4a3f",
                    border: "1px solid #cfdbd3",
                  }}
                >
                  <ShieldCheck className="w-2.5 h-2.5" />
                  SAP
                </span>
              )}
              {mission.sessionType === "collective" ? (
                <span
                  className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-px rounded-full"
                  style={{
                    background: "#f3eafa",
                    color: "#5e3a8a",
                    border: "1px solid #e0cef0",
                  }}
                >
                  <Users className="w-2.5 h-2.5" />
                  Collectif
                </span>
              ) : mission.sessions && mission.sessions.length > 1 ? (
                <span
                  className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-px rounded-full"
                  style={{
                    background: "#f5f9f6",
                    color: "#1f3a33",
                    border: "1px solid #cfdbd3",
                  }}
                >
                  <Repeat className="w-2.5 h-2.5" />
                  {mission.sessions.length}×
                </span>
              ) : null}
              {mission.variantName && (
                <span
                  className="text-[10px] font-medium px-1.5 py-px rounded-full truncate max-w-[140px]"
                  style={{
                    background: "#fcfaf4",
                    color: "#3a3a38",
                    border: "1px solid #ece9e1",
                  }}
                  title={mission.variantName}
                >
                  {mission.variantName}
                </span>
              )}
            </div>

            {/* Footer : voir détails (compact) */}
            <button
              className="w-full py-1.5 px-3 text-[11.5px] font-medium flex items-center justify-center gap-1 transition-colors hover:bg-[#f7f5ef]"
              style={{
                color: "#1f3a33",
                borderTop: "1px solid #f1ede3",
              }}
              onClick={onViewDetails}
            >
              <Eye className="w-3 h-3" />
              Voir les détails
              <ChevronRight className="w-3 h-3" />
            </button>

            {/* Actions upcoming/in_progress */}
            {(mission.status === "upcoming" || mission.status === "in_progress") && (
              <div
                className="px-2 py-1.5 flex gap-1.5"
                style={{ borderTop: "1px solid #f1ede3" }}
              >
                <motion.button
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-full text-[11.5px] font-semibold transition-opacity hover:opacity-90"
                  style={{ background: "#1f3a33", color: "#f7f5ef" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onContact?.(mission.id as string)}
                >
                  <MessageSquare className="w-3 h-3" />
                  Contacter
                </motion.button>
                {mission.status === "upcoming" && (
                  <motion.button
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-full text-[11.5px] font-medium transition-colors hover:bg-[#fafafa]"
                    style={{
                      background: "#fff",
                      color: "#1f1f1d",
                      border: "1px solid #dfdcd4",
                    }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onCancel?.(mission.id as string)}
                  >
                    <X className="w-3 h-3" />
                    Annuler
                  </motion.button>
                )}
              </div>
            )}
          </div>

          {/* Boutons Accepter/Refuser à droite */}
          {showActions && mission.status === "pending_acceptance" && (
            <div className="flex flex-col" style={{ borderLeft: "1px solid #f1ede3" }}>
              <motion.button
                className="flex-1 w-11 flex items-center justify-center transition-colors"
                style={{ background: "#f5f9f6", color: "#1f3a33" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onAccept?.(mission.id as string)}
                title="Accepter"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#1f3a33";
                  e.currentTarget.style.color = "#f7f5ef";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f5f9f6";
                  e.currentTarget.style.color = "#1f3a33";
                }}
              >
                <Check className="w-4 h-4" />
              </motion.button>
              <div className="h-px" style={{ background: "#f1ede3" }} />
              <motion.button
                className="flex-1 w-11 flex items-center justify-center transition-colors"
                style={{ background: "#fdf0f0", color: "#8a3a3a" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onRefuse?.(mission.id as string)}
                title="Refuser"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#c45656";
                  e.currentTarget.style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#fdf0f0";
                  e.currentTarget.style.color = "#8a3a3a";
                }}
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

// Sous-composant : pastille d'info compacte
function InfoChip({
  icon,
  label,
  highlight,
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-px rounded-full text-[10.5px]"
      style={{
        background: highlight ? "#f5f9f6" : "#fcfaf4",
        color: highlight ? "#1f3a33" : "#3a3a38",
        border: `1px solid ${highlight ? "#cfdbd3" : "#f1ede3"}`,
        fontWeight: highlight ? 600 : 500,
      }}
    >
      <span style={{ color: highlight ? "#1f3a33" : "#9c9484" }}>{icon}</span>
      {label}
    </span>
  );
}

// Vue split-screen inline : Détails + Fiches animaux
export interface MissionSplitViewProps {
  mission: ConvexMission;
  onClose: () => void;
  isAccepted: boolean;
  distance: number | null;
  token: string | null;
  isVatSubject?: boolean;
}

export function MissionSplitView({
  mission,
  onClose,
  isAccepted,
  distance,
  token,
  isVatSubject: isVatSubjectProp = false,
}: MissionSplitViewProps) {
  // Utiliser isVatSubject de la mission (vient de la query) OU du prop (fallback)
  const isVatSubject = mission.isVatSubject ?? isVatSubjectProp;
  const [activeTab, setActiveTab] = useState<"details" | "animals">("details");
  const [selectedAnimalIndex, setSelectedAnimalIndex] = useState(0);

  const days = getDaysDifference(mission.startDate, mission.endDate);
  const hasOptions = mission.optionNames && mission.optionNames.length > 0;
  const firstName = getFirstName(mission.clientName);
  const cityDisplay = mission.city || extractCity(mission.location);

  // Calcul des prix
  const totalAmount = mission.amount;
  const announcerEarnings = mission.announcerEarnings ?? Math.round(totalAmount * 0.85);
  const effectiveVatRate = mission.vatRate ?? (mission.isSapApplied ? 10 : 20);

  // Queries animaux
  const isMulti = mission.animals && mission.animals.length > 1;
  const allAnimalsData = useQuery(
    api.planning.missions.getMissionAnimalsDetails,
    isMulti && token ? { token, missionId: mission.id as Id<"missions"> } : "skip"
  );
  const singleAnimalData = useQuery(
    api.planning.missions.getMissionAnimalDetails,
    !isMulti && token ? { token, missionId: mission.id as Id<"missions"> } : "skip"
  );

  const animalData = isMulti
    ? (allAnimalsData ? allAnimalsData[selectedAnimalIndex] : undefined)
    : singleAnimalData;

  const currentEmoji = isMulti
    ? (mission.animals![selectedAnimalIndex]?.emoji || mission.animal.emoji)
    : mission.animal.emoji;

  // Helpers animaux
  const calculateAge = (birthDate?: string): string | null => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();
    if (years < 1) {
      const totalMonths = years * 12 + months;
      return totalMonths <= 0 ? "Moins d'un mois" : `${totalMonths} mois`;
    }
    return years === 1 ? "1 an" : `${years} ans`;
  };

  const getGenderLabel = (gender?: string): string => {
    switch (gender) {
      case "male": return "Mâle";
      case "female": return "Femelle";
      default: return "Non précisé";
    }
  };

  const getTraitLabel = (traitId: string, category: keyof typeof ANIMAL_TRAITS): string => {
    const traits = ANIMAL_TRAITS[category].traits as Record<string, string>;
    return traits[traitId] || traitId;
  };

  // ── Panneau gauche : Détails ──
  const detailsContent = (
    <div className="p-4 space-y-3">
      {/* Client et Animaux */}
      <div className="bg-slate-50 rounded-xl p-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center relative">
            {mission.animals && mission.animals.length > 1 ? (
              <div className="flex items-center">
                {mission.animals.slice(0, 3).map((a, i) => (
                  <span key={i} className="text-xl" style={{ marginLeft: i > 0 ? "-4px" : "0" }}>
                    {a.emoji}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-2xl">{mission.animal.emoji}</span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-foreground">{firstName}</p>
              {mission.clientHistory && (
                mission.clientHistory.isNewClient ? (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-purple/10 text-purple rounded-full text-[10px] font-medium">
                    <Star className="w-2.5 h-2.5" />
                    Nouveau client
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-medium">
                    <Repeat className="w-2.5 h-2.5" />
                    {mission.clientHistory.previousMissionsCount} mission{mission.clientHistory.previousMissionsCount > 1 ? "s" : ""} ensemble
                  </span>
                )
              )}
            </div>
            {mission.animals && mission.animals.length > 1 ? (
              <div className="flex flex-wrap gap-1 mt-0.5">
                {mission.animals.map((a, i) => (
                  <span key={i} className="text-xs text-text-light">
                    {a.emoji} {a.name}{i < mission.animals!.length - 1 ? " ·" : ""}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-light">
                {mission.animal.name} ({mission.animal.type})
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Service et Prestation */}
      <div className="bg-slate-50 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-4 h-4 text-foreground" />
          <span className="font-semibold text-foreground text-sm">Prestation</span>
        </div>
        <p className="font-medium text-foreground">{mission.serviceName}</p>
        {mission.variantName && (
          <p className="text-sm text-text-light mt-1">Prestation : {mission.variantName}</p>
        )}
        {hasOptions && (
          <div className="flex flex-wrap gap-1 mt-2">
            {mission.optionNames?.map((option, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-purple/10 text-purple text-xs rounded-full"
              >
                + {option}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Type de formule et créneaux */}
      {mission.sessionType === "collective" ? (
        <div className="bg-gradient-to-br from-blue-50 to-purple/5 rounded-xl p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-foreground text-sm">Formule collective</span>
            {mission.collectiveSlotDates && mission.collectiveSlotDates.length > 0 && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                {mission.collectiveSlotDates.length} séance{mission.collectiveSlotDates.length > 1 ? "s" : ""}
              </span>
            )}
            {mission.animalCount && mission.animalCount > 1 && (
              <span className="px-2 py-0.5 bg-purple/20 text-purple text-xs rounded-full">
                {mission.animalCount} animaux
              </span>
            )}
          </div>
          {mission.collectiveSlotDates && mission.collectiveSlotDates.length > 0 ? (
            <div className="space-y-2 pl-6 max-h-40 overflow-y-auto">
              {mission.collectiveSlotDates.map((date, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm">
                  <span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-medium">
                    {idx + 1}
                  </span>
                  <Calendar className="w-3.5 h-3.5 text-purple" />
                  <span className="text-foreground">
                    {new Date(date).toLocaleDateString("fr-FR", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  {mission.startTime && (
                    <>
                      <Clock className="w-3.5 h-3.5 text-accent" />
                      <span className="text-text-light">
                        {mission.startTime}
                        {mission.endTime && ` - ${mission.endTime}`}
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2 pl-6">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-purple" />
                <span className="text-sm text-foreground">
                  {formatDateRange(mission.startDate, mission.endDate)}
                </span>
              </div>
              {(mission.startTime || mission.endTime) && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-accent" />
                  <span className="text-sm text-foreground">
                    {mission.startTime}
                    {mission.endTime && ` - ${mission.endTime}`}
                  </span>
                </div>
              )}
            </div>
          )}
          <p className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
            Séance collective avec d'autres animaux
          </p>
        </div>
      ) : mission.sessions && mission.sessions.length > 1 ? (
        <div className="bg-gradient-to-br from-accent/10 to-secondary/5 rounded-xl p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-secondary" />
            <span className="font-semibold text-foreground text-sm">
              Formule multi-séances
            </span>
            <span className="px-2 py-0.5 bg-secondary/20 text-secondary text-xs rounded-full">
              {mission.sessions.length} séances
            </span>
          </div>
          <div className="space-y-2 pl-6 max-h-40 overflow-y-auto">
            {mission.sessions.map((session, idx) => (
              <div key={idx} className="flex items-center gap-3 text-sm">
                <span className="w-5 h-5 bg-secondary/20 text-secondary rounded-full flex items-center justify-center text-xs font-medium">
                  {idx + 1}
                </span>
                <Calendar className="w-3.5 h-3.5 text-purple" />
                <span className="text-foreground">
                  {new Date(session.date).toLocaleDateString("fr-FR", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <Clock className="w-3.5 h-3.5 text-accent" />
                <span className="text-text-light">
                  {session.startTime} - {session.endTime}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple" />
            <span className="text-sm text-foreground">
              {formatDateRange(mission.startDate, mission.endDate)}
              {days > 1 && <span className="text-text-light"> ({days} jours)</span>}
            </span>
          </div>
          {(mission.startTime || mission.endTime) && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent" />
              <span className="text-sm text-foreground">
                {mission.startTime}
                {mission.endTime && ` - ${mission.endTime}`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Lieu et Distance */}
      <div className="bg-slate-50 rounded-xl p-3 space-y-2">
        {mission.serviceLocation === "announcer_home" ? (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-secondary" />
            <span className="text-sm text-secondary font-medium">Chez vous</span>
          </div>
        ) : cityDisplay && (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-secondary" />
            {isAccepted ? (
              <span className="text-sm text-foreground">{mission.location}</span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">{cityDisplay}</span>
                <span className="flex items-center gap-1 text-[10px] text-text-light bg-slate-200 px-1.5 py-0.5 rounded-full">
                  <Lock className="w-3 h-3" />
                  Masquée
                </span>
              </div>
            )}
          </div>
        )}
        {distance !== null && mission.serviceLocation !== "announcer_home" && (
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-foreground">
              À {formatDistance(distance)} de chez vous
            </span>
          </div>
        )}
      </div>

      {/* Notes client */}
      {mission.clientNotes && (
        <div className="bg-slate-50 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-4 h-4 text-foreground" />
            <span className="font-semibold text-foreground text-sm">Message</span>
          </div>
          <p className="text-sm text-text-light">{mission.clientNotes}</p>
        </div>
      )}

      {/* Revenu annonceur */}
      <div className="bg-gradient-to-br from-secondary/5 to-primary/5 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <Euro className="w-4 h-4 text-foreground" />
          <span className="font-semibold text-foreground text-sm">Votre revenu</span>
        </div>
        <div className="space-y-1.5 text-sm">
          {isVatSubject ? (
            <>
              <div className="flex justify-between">
                <span className="text-text-light">Montant HT</span>
                <span className="text-foreground">
                  {formatPrice(Math.round(announcerEarnings / (1 + effectiveVatRate / 100)))}
                </span>
              </div>
              <div className="flex justify-between text-text-light text-xs">
                <span>TVA ({effectiveVatRate}%){mission.isSapApplied ? " — taux réduit SAP" : ""}</span>
                <span>
                  {formatPrice(announcerEarnings - Math.round(announcerEarnings / (1 + effectiveVatRate / 100)))}
                </span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-slate-200">
                <span className="font-semibold text-foreground">Montant TTC</span>
                <span className="text-lg font-bold text-secondary">{formatPrice(announcerEarnings)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between">
              <span className="font-semibold text-foreground">Montant perçu</span>
              <span className="text-lg font-bold text-secondary">{formatPrice(announcerEarnings)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      {!isAccepted && (
        <div className="flex items-start gap-2 p-2.5 bg-blue-50 rounded-lg">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800">
            L'adresse exacte et le téléphone du client seront visibles une fois la mission acceptée et le paiement effectué.
          </p>
        </div>
      )}
    </div>
  );

  // ── Panneau droit : Fiches animaux ──
  const animalsContent = (
    <div className="p-4">
      {/* Sélecteur d'animaux si multi */}
      {isMulti && (
        <div className="flex gap-2 overflow-x-auto pb-3 mb-3 border-b border-slate-100">
          {mission.animals!.map((a, i) => (
            <button
              key={i}
              onClick={() => setSelectedAnimalIndex(i)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                i === selectedAnimalIndex
                  ? "bg-purple text-white"
                  : "bg-slate-100 text-text-light hover:bg-slate-200"
              )}
            >
              <span>{a.emoji}</span>
              {a.name}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {!token ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-text-light" />
          </div>
          <p className="text-text-light text-sm">Les fiches animaux sont disponibles après acceptation de la mission.</p>
        </div>
      ) : animalData === undefined ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-purple animate-spin" />
        </div>
      ) : animalData === null ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-text-light" />
          </div>
          <p className="text-text-light">Impossible de charger les informations de l'animal.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Infos principales */}
          <div className="bg-gradient-to-br from-purple/5 to-primary/5 rounded-xl p-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-4xl shadow-sm">
                {currentEmoji}
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">{animalData.name}</h3>
                <p className="text-text-light capitalize">{animalData.type}</p>
                {animalData.breed && (
                  <p className="text-sm text-purple font-medium">{animalData.breed}</p>
                )}
              </div>
            </div>
          </div>

          {/* Genre / Âge */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-text-light mb-1">Genre</p>
              <p className="font-semibold text-foreground">{getGenderLabel(animalData.gender)}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-text-light mb-1">Âge</p>
              <p className="font-semibold text-foreground">
                {calculateAge(animalData.birthDate) || "Non précisé"}
              </p>
            </div>
          </div>

          {/* Description */}
          {animalData.description && (
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-purple" />
                <span className="font-semibold text-foreground text-sm">Description</span>
              </div>
              <p className="text-sm text-text-light">{animalData.description}</p>
            </div>
          )}

          {/* Compatibilité */}
          {animalData.compatibilityTraits && animalData.compatibilityTraits.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-secondary" />
                <span className="font-semibold text-foreground text-sm">Compatibilité</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {animalData.compatibilityTraits.map((trait: string) => (
                  <span key={trait} className="px-2 py-1 bg-secondary/10 text-secondary text-xs rounded-full">
                    {getTraitLabel(trait, "compatibility")}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Comportement */}
          {animalData.behaviorTraits && animalData.behaviorTraits.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground text-sm">Comportement</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {animalData.behaviorTraits.map((trait: string) => (
                  <span key={trait} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                    {getTraitLabel(trait, "behavior")}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Besoins */}
          {animalData.needsTraits && animalData.needsTraits.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-4 h-4 text-pink-500" />
                <span className="font-semibold text-foreground text-sm">Besoins particuliers</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {animalData.needsTraits.map((trait: string) => (
                  <span key={trait} className="px-2 py-1 bg-pink-100 text-pink-700 text-xs rounded-full">
                    {getTraitLabel(trait, "needs")}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Traits personnalisés */}
          {animalData.customTraits && animalData.customTraits.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="font-semibold text-foreground text-sm">Autres caractéristiques</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {animalData.customTraits.map((trait: string, idx: number) => (
                  <span key={idx} className="px-2 py-1 bg-accent/20 text-foreground text-xs rounded-full">
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Besoins spéciaux */}
          {animalData.specialNeeds && (
            <div className="bg-orange-50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span className="font-semibold text-foreground text-sm">Besoins spéciaux</span>
              </div>
              <p className="text-sm text-text-light">{animalData.specialNeeds}</p>
            </div>
          )}

          {/* Conditions médicales */}
          {animalData.medicalConditions && (
            <div className="bg-red-50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Stethoscope className="w-4 h-4 text-red-500" />
                <span className="font-semibold text-foreground text-sm">Conditions médicales</span>
              </div>
              <p className="text-sm text-text-light">{animalData.medicalConditions}</p>
            </div>
          )}

          {/* Message si données inline seulement */}
          {animalData.isInline && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800">
                Cette fiche contient uniquement les informations de base.
                Le propriétaire n'a pas encore créé de fiche détaillée pour cet animal.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Bouton retour */}
      <button
        onClick={onClose}
        className="flex items-center gap-2 text-sm text-text-light hover:text-foreground transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Retour aux réservations
      </button>

      {/* Header mission */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex items-center gap-3">
        <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center">
          {mission.animals && mission.animals.length > 1 ? (
            <div className="flex items-center">
              {mission.animals.slice(0, 3).map((a, i) => (
                <span key={i} className="text-lg" style={{ marginLeft: i > 0 ? "-4px" : "0" }}>
                  {a.emoji}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xl">{mission.animal.emoji}</span>
          )}
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground">{firstName} — {mission.serviceName}</h2>
          <p className="text-sm text-text-light">
            {mission.animals && mission.animals.length > 1
              ? mission.animals.map(a => a.name).join(", ")
              : mission.animal.name}
          </p>
        </div>
        <span className="text-xs font-mono text-text-light bg-slate-100 px-2 py-1 rounded-lg shrink-0">
          Réf: {String(mission.id).slice(-8).toUpperCase()}
        </span>
      </div>

      {/* MOBILE : onglets */}
      <div className="sm:hidden bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setActiveTab("details")}
            className={cn(
              "flex-1 py-2.5 text-sm font-medium text-center transition-colors relative",
              activeTab === "details"
                ? "text-foreground"
                : "text-text-light hover:text-foreground"
            )}
          >
            <span className="flex items-center justify-center gap-1.5">
              <Eye className="w-4 h-4" />
              Détails
            </span>
            {activeTab === "details" && (
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                layoutId="splitTabIndicator"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab("animals")}
            className={cn(
              "flex-1 py-2.5 text-sm font-medium text-center transition-colors relative",
              activeTab === "animals"
                ? "text-foreground"
                : "text-text-light hover:text-foreground"
            )}
          >
            <span className="flex items-center justify-center gap-1.5">
              <PawPrint className="w-4 h-4" />
              Animaux
            </span>
            {activeTab === "animals" && (
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple"
                layoutId="splitTabIndicator"
              />
            )}
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          {activeTab === "details" ? detailsContent : animalsContent}
        </div>
      </div>

      {/* DESKTOP : split 50/50 */}
      <div className="hidden sm:grid sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
              <Eye className="w-4 h-4 text-primary" />
              Détails de la mission
            </h3>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {detailsContent}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-purple/5 to-primary/5">
            <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
              <PawPrint className="w-4 h-4 text-purple" />
              {isMulti ? "Fiches animaux" : "Fiche de l'animal"}
            </h3>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {animalsContent}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Export du type Mission pour compatibilité
export type { ConvexMission as Mission };
