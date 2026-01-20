"use client";

import { useState, useEffect } from "react";
import { cn } from "@/app/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

// Types pour les missions Convex
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
}

interface MissionCardProps {
  mission: ConvexMission;
  showActions?: boolean;
  onAccept?: (id: string) => void;
  onRefuse?: (id: string) => void;
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

const statusConfig: Record<string, { label: string; color: string }> = {
  completed: { label: "Terminée", color: "bg-green-100 text-green-700" },
  in_progress: { label: "En cours", color: "bg-blue-100 text-blue-700" },
  upcoming: { label: "À venir", color: "bg-purple/20 text-purple" },
  pending_acceptance: { label: "À accepter", color: "bg-accent/30 text-foreground" },
  pending_confirmation: { label: "En attente", color: "bg-orange-100 text-orange-700" },
  refused: { label: "Refusée", color: "bg-red-100 text-red-700" },
  cancelled: { label: "Annulée", color: "bg-gray-100 text-gray-700" },
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
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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

// Calcul de distance avec la formule Haversine
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

export function MissionCard({
  mission,
  showActions = false,
  onAccept,
  onRefuse,
  announcerCoordinates,
  token,
}: MissionCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showAnimalModal, setShowAnimalModal] = useState(false);
  const status = statusConfig[mission.status] || statusConfig.pending_acceptance;
  const isAccepted = mission.status !== "pending_acceptance" && mission.status !== "pending_confirmation";

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
        className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-slate-100"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header compact */}
        <div className="p-3 flex items-center gap-3">
          <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
            {mission.animal.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground truncate">{firstName}</p>
              <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", status.color)}>
                {status.label}
              </span>
            </div>
            <p className="text-xs text-text-light truncate">
              {mission.animal.name} • {mission.serviceName}
            </p>
          </div>
        </div>

        {/* Infos principales - compact */}
        <div className="px-3 pb-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
          <span className="flex items-center gap-1 text-foreground">
            <Calendar className="w-3.5 h-3.5 text-purple" />
            {formatDateRange(mission.startDate, mission.endDate)}
            {days > 1 && <span className="text-text-light">({days}j)</span>}
          </span>
          {mission.startTime && (
            <span className="flex items-center gap-1 text-foreground">
              <Clock className="w-3.5 h-3.5 text-accent" />
              {formatTime(mission.startTime, mission.endTime)}
            </span>
          )}
          {cityDisplay && (
            <span className="flex items-center gap-1 text-text-light">
              <MapPin className="w-3.5 h-3.5 text-secondary" />
              {cityDisplay}
            </span>
          )}
          {distance !== null && (
            <span className="flex items-center gap-1 text-text-light">
              <Navigation className="w-3.5 h-3.5 text-blue-500" />
              {formatDistance(distance)}
            </span>
          )}
        </div>

        {/* Prix et revenus - compact */}
        <div className="mx-3 mb-2 bg-gradient-to-r from-secondary/5 to-primary/5 rounded-lg p-2 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-text-light">Votre revenu</p>
            <p className="text-base font-bold text-secondary">
              {formatPrice(mission.announcerEarnings ?? mission.amount * 0.85)}
            </p>
          </div>
          {mission.variantName && (
            <span className="text-xs bg-white/80 px-2 py-1 rounded-md text-foreground">
              {mission.variantName}
            </span>
          )}
        </div>

        {/* Bouton voir détails */}
        <button
          className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 text-sm text-foreground flex items-center justify-center gap-1.5 transition-colors"
          onClick={() => setShowDetails(true)}
        >
          <Eye className="w-4 h-4" />
          Voir les détails
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Actions - seulement si showActions */}
        {showActions && mission.status === "pending_acceptance" && (
          <div className="p-2 border-t border-slate-100 flex gap-2">
            <motion.button
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-secondary hover:bg-secondary/90 text-white rounded-lg text-sm font-semibold"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onAccept?.(mission.id as string)}
            >
              <Check className="w-4 h-4" />
              Accepter
            </motion.button>
            <motion.button
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onRefuse?.(mission.id as string)}
            >
              <X className="w-4 h-4" />
              Refuser
            </motion.button>
          </div>
        )}
      </motion.div>

      {/* Modal de détails */}
      <AnimatePresence>
        {showDetails && (
          <MissionDetailsModal
            mission={mission}
            onClose={() => setShowDetails(false)}
            onViewAnimal={() => setShowAnimalModal(true)}
            isAccepted={isAccepted}
            distance={distance}
          />
        )}
      </AnimatePresence>

      {/* Modal fiche animal */}
      <AnimatePresence>
        {showAnimalModal && token && (
          <AnimalDetailsModal
            missionId={mission.id}
            token={token}
            animalEmoji={mission.animal.emoji}
            onClose={() => setShowAnimalModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// Modal des détails de la mission
interface MissionDetailsModalProps {
  mission: ConvexMission;
  onClose: () => void;
  onViewAnimal?: () => void;
  isAccepted: boolean;
  distance: number | null;
}

function MissionDetailsModal({
  mission,
  onClose,
  onViewAnimal,
  isAccepted,
  distance,
}: MissionDetailsModalProps) {
  const days = getDaysDifference(mission.startDate, mission.endDate);
  const hasOptions = mission.optionNames && mission.optionNames.length > 0;
  const firstName = getFirstName(mission.clientName);
  const cityDisplay = mission.city || extractCity(mission.location);

  // Calcul des prix
  const totalAmount = mission.amount;
  const platformFee = mission.platformFee ?? Math.round(totalAmount * 0.15);
  const announcerEarnings = mission.announcerEarnings ?? totalAmount - platformFee;

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Détails de la mission</h2>
          <motion.button
            className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center"
            onClick={onClose}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="w-4 h-4 text-foreground" />
          </motion.button>
        </div>

        <div className="p-4 space-y-3">
          {/* Client et Animal */}
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-2xl">
                {mission.animal.emoji}
              </div>
              <div className="flex-1">
                <p className="font-bold text-foreground">{firstName}</p>
                <p className="text-sm text-text-light">
                  {mission.animal.name} ({mission.animal.type})
                </p>
              </div>
              {onViewAnimal && (
                <motion.button
                  className="px-2.5 py-1.5 bg-purple/10 text-purple rounded-lg text-xs font-medium flex items-center gap-1"
                  onClick={onViewAnimal}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Fiche
                </motion.button>
              )}
            </div>
          </div>

          {/* Service et Formule */}
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-foreground" />
              <span className="font-semibold text-foreground text-sm">Prestation</span>
            </div>
            <p className="font-medium text-foreground">{mission.serviceName}</p>
            {mission.variantName && (
              <p className="text-sm text-text-light mt-1">Formule : {mission.variantName}</p>
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

          {/* Dates, Lieu et Distance */}
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
            {cityDisplay && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-secondary" />
                <span className="text-sm text-foreground">
                  {isAccepted ? mission.location : cityDisplay}
                </span>
              </div>
            )}
            {distance !== null && (
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

          {/* Détail des prix */}
          <div className="bg-gradient-to-br from-secondary/5 to-primary/5 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <Euro className="w-4 h-4 text-foreground" />
              <span className="font-semibold text-foreground text-sm">Tarification</span>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-text-light">Prix client</span>
                <span className="text-foreground">{formatPrice(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-primary text-xs">
                <span>Commission (15%)</span>
                <span>-{formatPrice(platformFee)}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-slate-200">
                <span className="font-semibold text-foreground">Votre revenu</span>
                <span className="text-lg font-bold text-secondary">{formatPrice(announcerEarnings)}</span>
              </div>
            </div>
          </div>

          {/* Info */}
          {!isAccepted && (
            <div className="flex items-start gap-2 p-2.5 bg-blue-50 rounded-lg">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800">
                L'adresse exacte et le téléphone seront visibles après acceptation de la mission.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white p-3 border-t border-slate-100">
          <button
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-foreground rounded-xl font-medium text-sm"
            onClick={onClose}
          >
            Fermer
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Modal de la fiche animal
interface AnimalDetailsModalProps {
  missionId: Id<"missions"> | string;
  token: string;
  animalEmoji: string;
  onClose: () => void;
}

function AnimalDetailsModal({
  missionId,
  token,
  animalEmoji,
  onClose,
}: AnimalDetailsModalProps) {
  const animalData = useQuery(
    api.planning.missions.getMissionAnimalDetails,
    { token, missionId }
  );

  // Helper pour calculer l'âge
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

  // Helper pour traduire le genre
  const getGenderLabel = (gender?: string): string => {
    switch (gender) {
      case "male": return "Mâle";
      case "female": return "Femelle";
      default: return "Non précisé";
    }
  };

  // Helper pour traduire un trait
  const getTraitLabel = (traitId: string, category: keyof typeof ANIMAL_TRAITS): string => {
    const traits = ANIMAL_TRAITS[category].traits as Record<string, string>;
    return traits[traitId] || traitId;
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple/90 to-primary/90 px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-2xl">{animalEmoji}</span>
            Fiche de l'animal
          </h2>
          <motion.button
            className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"
            onClick={onClose}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="w-4 h-4 text-white" />
          </motion.button>
        </div>

        <div className="p-4">
          {/* Loading state */}
          {animalData === undefined && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-purple animate-spin" />
            </div>
          )}

          {/* Error state */}
          {animalData === null && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-text-light" />
              </div>
              <p className="text-text-light">Impossible de charger les informations de l'animal.</p>
            </div>
          )}

          {/* Animal data */}
          {animalData && (
            <div className="space-y-4">
              {/* Infos principales */}
              <div className="bg-gradient-to-br from-purple/5 to-primary/5 rounded-xl p-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-4xl shadow-sm">
                    {animalEmoji}
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

              {/* Détails */}
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
                      <span
                        key={trait}
                        className="px-2 py-1 bg-secondary/10 text-secondary text-xs rounded-full"
                      >
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
                      <span
                        key={trait}
                        className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                      >
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
                      <span
                        key={trait}
                        className="px-2 py-1 bg-pink-100 text-pink-700 text-xs rounded-full"
                      >
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
                      <span
                        key={idx}
                        className="px-2 py-1 bg-accent/20 text-foreground text-xs rounded-full"
                      >
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

        {/* Footer */}
        <div className="sticky bottom-0 bg-white p-3 border-t border-slate-100">
          <button
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-foreground rounded-xl font-medium text-sm"
            onClick={onClose}
          >
            Fermer
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Export du type Mission pour compatibilité
export type { ConvexMission as Mission };
