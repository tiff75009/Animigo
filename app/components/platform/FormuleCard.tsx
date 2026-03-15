"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  Star,
  Heart,
  Shield,
  Navigation,
  Calendar,
  Users,
  User,
  Timer,
  Home,
  Car,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Zap,
  FileCheck,
  Building2,
  Briefcase,
  MapPin,
  ExternalLink,
  TreePine,
  Moon,
  Utensils,
  PawPrint,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { formatPrice, formatDistance } from "./helpers";
import { ANIMAL_TYPES } from "./constants";

// Map rapide id → emoji
const animalEmojiMap = new Map(ANIMAL_TYPES.map((a) => [a.id, a.emoji]));

// Composant coeur animé avec particules
function AnimatedHeart({
  isFavorite,
  onToggle,
  isLoading,
}: {
  isFavorite: boolean;
  onToggle: () => void;
  isLoading?: boolean;
}) {
  const [particles, setParticles] = useState<number[]>([]);
  const [wasJustAdded, setWasJustAdded] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return;

    if (!isFavorite) {
      // Créer des particules quand on ajoute en favori
      setParticles([...Array(6)].map((_, i) => i));
      setWasJustAdded(true);
      setTimeout(() => {
        setParticles([]);
        setWasJustAdded(false);
      }, 700);
    }

    onToggle();
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        "relative p-2.5 rounded-xl transition-colors duration-300",
        isFavorite
          ? "bg-gradient-to-br from-red-500 to-pink-500 text-white shadow-lg shadow-red-500/30"
          : "bg-gray-50 text-gray-300 hover:bg-red-50 hover:text-red-400",
        isLoading && "opacity-50 cursor-not-allowed"
      )}
    >
      {/* Particules */}
      <AnimatePresence>
        {particles.map((i) => (
          <motion.span
            key={i}
            initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
            animate={{
              scale: [0, 1, 0.5],
              x: Math.cos((i * 60 * Math.PI) / 180) * 30,
              y: Math.sin((i * 60 * Math.PI) / 180) * 30,
              opacity: [1, 1, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          >
            <Heart className="w-3 h-3 fill-red-500 text-red-500" />
          </motion.span>
        ))}
      </AnimatePresence>

      {/* Ring pulse effect */}
      <AnimatePresence>
        {wasJustAdded && (
          <motion.span
            initial={{ scale: 0.8, opacity: 0.8 }}
            animate={{ scale: 2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 rounded-xl bg-red-400 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Coeur principal */}
      <motion.div
        animate={wasJustAdded ? {
          scale: [1, 1.3, 0.9, 1.1, 1],
        } : { scale: 1 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
      >
        <Heart className={cn("w-5 h-5 relative z-10", isFavorite && "fill-current")} />
      </motion.div>
    </motion.button>
  );
}

// Types
interface NextSlot {
  date: string;
  startTime: string;
  endTime?: string;
  isFullDay?: boolean;
  slotOccupancy?: "free" | "busy" | "almost_full";
}

interface CollectiveSlotInfo {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  spotsLeft: number;
  formule: string;
}

export interface FormuleResult {
  formuleId: string;
  formuleName: string;
  formuleDescription?: string;
  price: number;
  priceUnit: string;
  duration?: number;
  sessionType: "individual" | "collective";
  serviceLocation?: "announcer_home" | "client_home" | "both";
  numberOfSessions?: number;
  serviceId: string;
  categorySlug: string;
  categoryName: string;
  categoryIcon?: string;
  animalTypes: string[];
  announcerId: string;
  announcerSlug?: string;
  announcerFirstName: string;
  announcerLastName: string;
  announcerUsername?: string;
  announcerProfileImage?: string | null;
  announcerIsDisplayingLogo?: boolean;
  announcerRating: number;
  announcerReviewCount: number;
  announcerLocation: string;
  announcerDistance?: number;
  announcerVerified: boolean;
  announcerStatusType: "particulier" | "micro_entrepreneur" | "professionnel";
  isSapEligible?: boolean;
  announcerSapApproved?: boolean;
  // Pricing détaillé pour calcul du total multi-jours
  pricing?: {
    hourly?: number;
    halfDaily?: number;
    daily?: number;
    nightly?: number;
  };
  workdayHours?: number;
  dayStartTime?: string;
  dayEndTime?: string;
  includeOvernightStay?: boolean;
  clientBillingMode?: string;
  nextSlot?: NextSlot;
  collectiveSlots?: CollectiveSlotInfo[];
  spotsLeft?: number;
  capacityInfo?: {
    isCapacityBased: boolean;
    maxCapacity: number;
    minRemainingCapacity: number;
  };
  gardeInfo?: {
    housingType?: "house" | "apartment";
    hasGarden?: boolean;
    gardenSize?: string;
    hasOwnAnimals?: boolean;
    ownAnimalTypes?: string[];
    providesFood?: boolean;
    allowOvernightStay?: boolean;
  };
}

export interface SearchDates {
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  numberOfAnimals?: number;
}

interface FormuleCardProps {
  formule: FormuleResult;
  index: number;
  isFavorite?: boolean;
  onToggleFavorite?: (formuleId: string) => void;
  isTogglingFavorite?: boolean;
  isAnnouncer?: boolean;
  searchDates?: SearchDates;
  selectedAnimalIds?: string[];
}

// Construit l'URL de réservation avec les params de recherche pré-remplis
function buildBookingUrl(
  baseUrl: string,
  formuleId: string,
  searchDates?: SearchDates,
  selectedAnimalIds?: string[],
): string {
  const params = new URLSearchParams();
  params.set("formule", formuleId);

  if (searchDates?.startDate) params.set("date", searchDates.startDate);
  if (searchDates?.endDate) params.set("endDate", searchDates.endDate);
  if (searchDates?.startTime) params.set("startTime", searchDates.startTime);
  if (searchDates?.endTime) params.set("endTime", searchDates.endTime);

  if (selectedAnimalIds && selectedAnimalIds.length > 0) {
    params.set("animalIds", selectedAnimalIds.join(","));
  } else if (searchDates?.numberOfAnimals && searchDates.numberOfAnimals > 1) {
    params.set("animalCount", String(searchDates.numberOfAnimals));
  }

  return `${baseUrl}?${params.toString()}`;
}

// Helper pour formater la date du prochain créneau
function formatNextSlotDate(date: string): string {
  const slotDate = new Date(date);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  today.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);
  slotDate.setHours(0, 0, 0, 0);

  if (slotDate.getTime() === today.getTime()) {
    return "Aujourd'hui";
  }
  if (slotDate.getTime() === tomorrow.getTime()) {
    return "Demain";
  }

  const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const months = ["jan", "fév", "mar", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];
  const originalDate = new Date(date);
  return `${days[originalDate.getDay()]} ${originalDate.getDate()} ${months[originalDate.getMonth()]}`;
}

function formatTime(time: string): string {
  return time.substring(0, 5);
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h${mins}` : `${hours}h`;
}

const priceUnitLabels: Record<string, string> = {
  hour: "heure",
  half_day: "demi-journée",
  day: "jour",
  week: "semaine",
  month: "mois",
  flat: "",
};

const locationLabels: Record<string, string> = {
  announcer_home: "Chez le pro",
  client_home: "À domicile",
  both: "Au choix",
};

// Taux de commission selon le type d'annonceur
const COMMISSION_RATES = {
  particulier: 0.15,
  micro_entrepreneur: 0.12,
  professionnel: 0.10,
};

// Frais Stripe (même défaut que BookingSummary)
const DEFAULT_STRIPE_FEE_RATE = 0.03; // 3%

const statusTypeConfig = {
  professionnel: {
    label: "Pro",
    icon: Building2,
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  micro_entrepreneur: {
    label: "Auto-entrepreneur",
    icon: Briefcase,
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
  },
  particulier: {
    label: "Particulier",
    icon: User,
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
} as const;

// Calcule le prix client complet : base + commission + frais Stripe
export function getPriceWithCommission(price: number, statusType: "particulier" | "micro_entrepreneur" | "professionnel"): number {
  const commissionRate = COMMISSION_RATES[statusType] || 0.15;
  const commission = Math.round(price * commissionRate);
  const stripeFee = Math.round(price * DEFAULT_STRIPE_FEE_RATE);
  return price + commission + stripeFee;
}

// Calcule le nombre de jours et nuits entre deux dates
function computeStayInfo(startDate: string, endDate: string): { days: number; nights: number } {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  // Nombre de nuits = nombre de jours entre les deux dates
  // Si même jour, 0 nuit. Si J → J+1, 1 nuit.
  const nights = diffDays;
  // Nombre de jours de garde = nuits + 1 (jour d'arrivée + jour de départ)
  const days = diffDays + 1;
  return { days, nights };
}

// Convertit un horaire "HH:MM" en minutes depuis minuit
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

// Calcule le prix total estimé pour un séjour (logique alignée sur calculateSmartPrice)
export function computeTotalPrice(
  formule: FormuleResult,
  searchDates?: SearchDates,
): { total: number; label: string } | null {
  if (!searchDates?.startDate || !searchDates?.endDate) return null;

  const { days, nights } = computeStayInfo(searchDates.startDate, searchDates.endDate);
  const animals = searchDates.numberOfAnimals || 1;

  // Paramètres de tarification de la formule
  const pricing = formule.pricing;
  const workdayHours = formule.workdayHours || 8;
  const dayStartTime = formule.dayStartTime || "08:00";
  const dayEndTime = formule.dayEndTime || "20:00";
  const includeOvernight = formule.includeOvernightStay || false;
  const billingMode = formule.clientBillingMode;

  // Dériver les tarifs manquants à partir des tarifs disponibles
  const hourlyRate = pricing?.hourly || (pricing?.daily ? Math.round(pricing.daily / workdayHours) : 0);
  const halfDailyRate = pricing?.halfDaily || (pricing?.daily ? Math.round(pricing.daily / 2) : (hourlyRate ? hourlyRate * (workdayHours / 2) : 0));
  const dailyRate = pricing?.daily || (hourlyRate ? hourlyRate * workdayHours : 0);
  const nightlyRate = (includeOvernight && pricing?.nightly) ? pricing.nightly : 0;

  // Taux de commission selon le statut de l'annonceur
  const commissionRate = COMMISSION_RATES[formule.announcerStatusType] || 0.15;

  // Tarif de base (journalier ou prix unitaire de la formule)
  const baseRate = dailyRate || formule.price;
  if (!baseRate) return null;

  // Calcule le montant et le type de facturation pour une durée partielle
  // En mode round_half_day : toujours arrondir (≤ demi-journée → demi-journée, sinon → journée)
  // En mode round_full_day : toujours journée complète
  const calcPartial = (hours: number): { amount: number; isHalf: boolean } => {
    if (hours >= workdayHours) {
      return { amount: dailyRate || baseRate, isHalf: false };
    }
    if (billingMode === "round_full_day") {
      return { amount: dailyRate || baseRate, isHalf: false };
    }
    if (billingMode === "round_half_day") {
      if (hours <= workdayHours / 2) {
        return { amount: halfDailyRate, isHalf: true };
      }
      return { amount: dailyRate || baseRate, isHalf: false };
    }
    // Mode exact_hourly
    if (hourlyRate > 0) {
      const amt = Math.round(hourlyRate * hours);
      return { amount: dailyRate > 0 ? Math.min(amt, dailyRate) : amt, isHalf: false };
    }
    return { amount: dailyRate || baseRate, isHalf: false };
  };

  let serviceTotal = 0;
  let label = "";

  if (days === 1) {
    // Même jour
    if (searchDates.startTime && searchDates.endTime) {
      const hours = Math.max(0, (timeToMinutes(searchDates.endTime) - timeToMinutes(searchDates.startTime)) / 60);
      const result = calcPartial(hours);
      serviceTotal = result.amount;
      label = result.isHalf ? "½ journée" : "1 jour";
    } else {
      serviceTotal = dailyRate || baseRate;
      label = "1 jour";
    }
  } else {
    // Multi-jours : compter en jours complets + demi-journées pour un label lisible

    // Premier jour
    let firstDay = { amount: dailyRate || baseRate, isHalf: false };
    if (searchDates.startTime) {
      const hours = Math.max(0, (timeToMinutes(dayEndTime) - timeToMinutes(searchDates.startTime)) / 60);
      firstDay = calcPartial(hours);
    }

    // Jours complets entre le premier et le dernier
    const fullDays = Math.max(0, days - 2);
    const fullDaysAmount = fullDays * (dailyRate || baseRate);

    // Dernier jour
    let lastDay = { amount: dailyRate || baseRate, isHalf: false };
    if (searchDates.endTime) {
      const hours = Math.max(0, (timeToMinutes(searchDates.endTime) - timeToMinutes(dayStartTime)) / 60);
      lastDay = calcPartial(hours);
    }

    // Nuitées
    const nightsAmount = includeOvernight ? nights * nightlyRate : 0;

    serviceTotal = firstDay.amount + fullDaysAmount + lastDay.amount + nightsAmount;

    // Construire un label lisible : "X jours et demi" ou "X jours"
    const halfCount = (firstDay.isHalf ? 1 : 0) + (lastDay.isHalf ? 1 : 0);
    const fullCount = (firstDay.isHalf ? 0 : 1) + fullDays + (lastDay.isHalf ? 0 : 1);

    if (halfCount === 0) {
      label = `${fullCount} jour${fullCount > 1 ? "s" : ""}`;
    } else if (halfCount === 1) {
      if (fullCount === 0) {
        label = "½ journée";
      } else {
        label = `${fullCount} jour${fullCount > 1 ? "s" : ""} et demi`;
      }
    } else {
      // 2 demi-journées = 1 jour de plus en label
      label = `${fullCount + 1} jour${fullCount + 1 > 1 ? "s" : ""}`;
    }

    if (includeOvernight && nights > 0 && nightlyRate > 0) {
      label += `, ${nights} nuit${nights > 1 ? "s" : ""}`;
    }
  }

  // Multiplier par le nombre d'animaux
  if (animals > 1) {
    serviceTotal *= animals;
    label += ` × ${animals} animaux`;
  }

  // Appliquer commission + frais Stripe (aligné avec BookingSummary)
  const commission = Math.round(serviceTotal * commissionRate);
  const stripeFee = Math.round(serviceTotal * DEFAULT_STRIPE_FEE_RATE);
  const total = serviceTotal + commission + stripeFee;

  return { total, label };
}

// Grid View Card - Design structuré en colonnes
export function FormuleCardGrid({
  formule,
  index,
  isFavorite = false,
  onToggleFavorite,
  isTogglingFavorite = false,
  isAnnouncer = false,
  searchDates,
  selectedAnimalIds,
}: FormuleCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const isCollective = formule.sessionType === "collective";
  const isGarde = !!formule.capacityInfo?.isCapacityBased;

  const announcerBaseUrl = `/annonceur/${formule.announcerSlug || formule.announcerId}`;
  const announcerBookingUrl = buildBookingUrl(announcerBaseUrl, formule.formuleId, searchDates, selectedAnimalIds);
  const announcerPublicProfileUrl = `/profil/${formule.announcerSlug || formule.announcerId}`;

  const finalPrice = getPriceWithCommission(formule.price, formule.announcerStatusType);
  const priceLabel = priceUnitLabels[formule.priceUnit] || formule.priceUnit;
  const totalEstimate = computeTotalPrice(formule, searchDates);

  const shortDistance = formule.announcerDistance !== undefined
    ? formule.announcerDistance < 1
      ? "< 1 km"
      : `${Math.round(formule.announcerDistance)} km`
    : null;

  const sc = statusTypeConfig[formule.announcerStatusType];
  const StatusIcon = sc.icon;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: "easeOut" }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group relative bg-white rounded-3xl flex flex-col h-full"
    >
      {/* Glow effect on hover */}
      <motion.div
        className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 via-secondary/50 to-primary/50 rounded-3xl opacity-0 blur-lg transition-opacity duration-500 -z-10"
        animate={{ opacity: isHovered ? 0.4 : 0 }}
      />

      <div className="relative bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col h-full overflow-visible">

        {/* Badge prochain créneau - flottant */}
        {formule.nextSlot && (
          <div className="absolute -top-3 left-4 z-20">
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 + 0.2 }}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-lg",
                formule.nextSlot.slotOccupancy === "almost_full"
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 shadow-orange-500/30"
                  : formule.nextSlot.slotOccupancy === "busy"
                    ? "bg-gradient-to-r from-amber-400 to-yellow-400 shadow-amber-400/30"
                    : "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/30"
              )}
            >
              <Zap className="w-3.5 h-3.5 text-white" />
              <span className="text-xs font-semibold text-white">
                {formatNextSlotDate(formule.nextSlot.date)}{!formule.nextSlot.isFullDay && ` · ${formatTime(formule.nextSlot.startTime)}`}
              </span>
              {isCollective && formule.spotsLeft && (
                <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-[10px] font-bold text-white">
                  {formule.spotsLeft} place{formule.spotsLeft > 1 ? "s" : ""}
                </span>
              )}
            </motion.div>
          </div>
        )}

        {/* Header : Avatar + Nom + Favoris */}
        <div className={cn("px-3 sm:px-4 pt-3 sm:pt-4 pb-2.5 sm:pb-3", formule.nextSlot ? "pt-7" : "")}>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link href={announcerPublicProfileUrl} className="relative flex-shrink-0 group/avatar">
              <div className="absolute -inset-0.5 bg-gradient-to-tr from-primary via-secondary to-primary rounded-xl opacity-60 blur-sm group-hover/avatar:opacity-100 transition-opacity" />
              <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-white ring-2 ring-white">
                {formule.announcerProfileImage ? (
                  <Image
                    src={formule.announcerProfileImage}
                    alt={formule.announcerFirstName}
                    width={44}
                    height={44}
                    className={cn("w-full h-full", formule.announcerIsDisplayingLogo ? "object-contain p-0.5" : "object-cover")}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                    <span className="text-base">👤</span>
                  </div>
                )}
              </div>
              {formule.announcerVerified && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-br from-secondary to-teal-500 rounded-md flex items-center justify-center ring-1.5 ring-white shadow-sm">
                  <Shield className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </Link>

            <div className="flex-1 min-w-0">
              <Link href={announcerPublicProfileUrl}>
                <h4 className="font-bold text-sm text-gray-900 hover:text-primary transition-colors truncate">
                  {formule.announcerFirstName}
                </h4>
              </Link>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-full border", sc.bg, sc.border)}>
                  <StatusIcon className={cn("w-2.5 h-2.5", sc.text)} />
                  <span className={cn("text-[10px] font-semibold", sc.text)}>{sc.label}</span>
                </div>
                <div className="flex items-center gap-0.5 text-amber-500">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className="text-[11px] font-bold">{formule.announcerRating.toFixed(1)}</span>
                </div>
              </div>
            </div>

            <AnimatedHeart
              isFavorite={isFavorite}
              onToggle={() => onToggleFavorite?.(formule.formuleId)}
              isLoading={isTogglingFavorite}
            />
          </div>
        </div>

        {/* Séparateur */}
        <div className="mx-3 sm:mx-4 border-t border-gray-100" />

        {/* Contenu principal */}
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 flex-1 flex flex-col">
          {/* Nom de la formule */}
          <h3 className="text-base font-bold text-gray-900 mb-2.5 line-clamp-2 leading-snug group-hover:text-primary transition-colors">
            {formule.formuleName}
          </h3>

          {/* Grille d'infos 2 colonnes */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-gray-600 mb-3">
            {/* Catégorie */}
            <div className="flex items-center gap-1.5">
              {formule.categoryIcon && <span className="text-sm">{formule.categoryIcon}</span>}
              <span className="font-medium text-primary truncate">{formule.categoryName}</span>
            </div>

            {/* Type de séance — masqué pour garde individuelle */}
            {(isCollective || !isGarde) && (
              <div className="flex items-center gap-1.5 justify-end">
                {isCollective ? <Users className="w-3.5 h-3.5 text-blue-500" /> : <User className="w-3.5 h-3.5 text-gray-400" />}
                <span className={cn("font-medium", isCollective ? "text-blue-600" : "text-gray-500")}>
                  {isCollective ? "Collectif" : "Individuel"}
                </span>
              </div>
            )}

            {/* Durée — masquée pour garde */}
            {formule.duration && !isGarde && (
              <div className="flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-gray-400" />
                <span>{formatDuration(formule.duration)}</span>
              </div>
            )}

            {/* Lieu */}
            {formule.serviceLocation && (
              <div className="flex items-center gap-1.5 justify-end">
                {formule.serviceLocation === "client_home" ? (
                  <Car className="w-3.5 h-3.5 text-gray-400" />
                ) : (
                  <Home className="w-3.5 h-3.5 text-gray-400" />
                )}
                <span>{locationLabels[formule.serviceLocation]}</span>
              </div>
            )}

            {/* Ville + Distance */}
            {formule.announcerLocation && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <span className="truncate">{formule.announcerLocation}</span>
              </div>
            )}
            {shortDistance && (
              <div className="flex items-center gap-1.5 justify-end">
                <Navigation className="w-3.5 h-3.5 text-primary" />
                <span className="font-medium text-primary">{shortDistance}</span>
              </div>
            )}

            {/* Séances multiples */}
            {formule.numberOfSessions && formule.numberOfSessions > 1 && (
              <div className="flex items-center gap-1.5 justify-end">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                <span className="font-medium text-purple-600">{formule.numberOfSessions} séances</span>
              </div>
            )}

            {/* === Infos spécifiques Garde === */}
            {isGarde && formule.gardeInfo && (
              <>
                {/* Logement */}
                <div className="flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-gray-400" />
                  <span>{formule.gardeInfo.housingType === "house" ? "Maison" : formule.gardeInfo.housingType === "apartment" ? "Appartement" : "Non précisé"}</span>
                </div>

                {/* Jardin */}
                <div className="flex items-center gap-1.5 justify-end">
                  <TreePine className={cn("w-3.5 h-3.5", formule.gardeInfo.hasGarden ? "text-emerald-500" : "text-gray-300")} />
                  <span className={formule.gardeInfo.hasGarden ? "text-emerald-600 font-medium" : "text-gray-400"}>
                    {formule.gardeInfo.hasGarden
                      ? formule.gardeInfo.gardenSize === "grand" ? "Grand jardin" : formule.gardeInfo.gardenSize === "moyen" ? "Jardin moyen" : "Jardin"
                      : "Pas de jardin"}
                  </span>
                </div>

                {/* Garde de nuit */}
                {formule.gardeInfo.allowOvernightStay && (
                  <div className="flex items-center gap-1.5">
                    <Moon className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-indigo-600 font-medium">Nuit incluse</span>
                  </div>
                )}

                {/* Nourriture fournie */}
                {formule.gardeInfo.providesFood && (
                  <div className="flex items-center gap-1.5 justify-end">
                    <Utensils className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-amber-600 font-medium">Repas fournis</span>
                  </div>
                )}

                {/* Animaux du gardien */}
                {formule.gardeInfo.hasOwnAnimals && formule.gardeInfo.ownAnimalTypes && (
                  <div className="flex items-center gap-1.5 col-span-2">
                    <PawPrint className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-500">
                      A {formule.gardeInfo.ownAnimalTypes.map((t) => animalEmojiMap.get(t) || "🐾").join(" ")} au foyer
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Places disponibles (garde) */}
            {formule.capacityInfo && formule.capacityInfo.isCapacityBased && (
              <div className="flex items-center gap-1.5 col-span-2">
                <Users className="w-3.5 h-3.5 text-secondary" />
                <span className={cn(
                  "font-semibold",
                  formule.capacityInfo.minRemainingCapacity <= 2
                    ? "text-orange-600"
                    : "text-secondary"
                )}>
                  {formule.capacityInfo.minRemainingCapacity} place{formule.capacityInfo.minRemainingCapacity > 1 ? "s" : ""} dispo{formule.capacityInfo.minRemainingCapacity > 1 ? "s" : ""} sur {formule.capacityInfo.maxCapacity}
                </span>
              </div>
            )}

            {/* Types d'animaux acceptés */}
            {formule.animalTypes && formule.animalTypes.length > 0 && (
              <div className="flex items-center gap-1 col-span-2">
                {formule.animalTypes.map((type) => (
                  <span key={type} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 rounded-full text-[10px] font-medium text-amber-700 border border-amber-100" title={type}>
                    {animalEmojiMap.get(type) || "🐾"}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Badges SAP */}
          {formule.isSapEligible && formule.announcerSapApproved && (
            <div className="mb-3">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-medium border border-emerald-100">
                <FileCheck className="w-3 h-3" />
                Éligible crédit d&apos;impôt
              </span>
            </div>
          )}
        </div>

        {/* Footer - Prix & CTA */}
        <div className="px-3 sm:px-4 pb-3 sm:pb-4">
          <div className="flex items-center justify-between gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-50/50 rounded-xl">
            <div>
              {totalEstimate ? (
                <>
                  <span className="text-xl font-black bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                    {formatPrice(totalEstimate.total)}
                  </span>
                  <span className="block text-[11px] text-gray-400">
                    {totalEstimate.label}
                  </span>
                  <span className="block text-[10px] text-gray-300">
                    {formatPrice(finalPrice)}/{priceLabel || "jour"}
                  </span>
                </>
              ) : formule.numberOfSessions && formule.numberOfSessions > 1 ? (
                <>
                  <span className="text-xl font-black bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    {formatPrice(finalPrice * formule.numberOfSessions)}
                  </span>
                  <span className="block text-[11px] text-gray-400">
                    {formule.numberOfSessions}× {formatPrice(finalPrice)}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-xl font-black bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    {formatPrice(finalPrice)}
                  </span>
                  {priceLabel && (
                    <span className="block text-[11px] text-gray-400">par {priceLabel}</span>
                  )}
                </>
              )}
            </div>

            {!isAnnouncer && (
              <Link href={announcerBookingUrl}>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="relative px-4 py-2.5 bg-gradient-to-r from-primary to-primary/90 text-white font-bold text-sm rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 flex items-center gap-1.5 overflow-hidden group/btn"
                >
                  <span className="relative z-10">Réserver</span>
                  <ChevronRight className="w-4 h-4 relative z-10 group-hover/btn:translate-x-0.5 transition-transform" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                </motion.button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

// List View Card - Design structuré en colonnes
export function FormuleCardList({
  formule,
  index,
  isFavorite = false,
  onToggleFavorite,
  isTogglingFavorite = false,
  isAnnouncer = false,
  searchDates,
  selectedAnimalIds,
}: FormuleCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const isCollective = formule.sessionType === "collective";
  const isGarde = !!formule.capacityInfo?.isCapacityBased;

  const announcerBaseUrl = `/annonceur/${formule.announcerSlug || formule.announcerId}`;
  const announcerBookingUrl = buildBookingUrl(announcerBaseUrl, formule.formuleId, searchDates, selectedAnimalIds);
  const announcerPublicProfileUrl = `/profil/${formule.announcerSlug || formule.announcerId}`;

  const finalPrice = getPriceWithCommission(formule.price, formule.announcerStatusType);
  const priceLabel = priceUnitLabels[formule.priceUnit] || formule.priceUnit;
  const totalEstimate = computeTotalPrice(formule, searchDates);

  const shortDistance = formule.announcerDistance !== undefined
    ? formule.announcerDistance < 1
      ? "< 1 km"
      : `${Math.round(formule.announcerDistance)} km`
    : null;

  const sc = statusTypeConfig[formule.announcerStatusType];
  const StatusIcon = sc.icon;

  return (
    <motion.article
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4, ease: "easeOut" }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group relative"
    >
      <motion.div
        className="absolute -inset-0.5 bg-gradient-to-r from-primary/40 via-secondary/40 to-primary/40 rounded-2xl opacity-0 blur-md transition-opacity duration-500 -z-10"
        animate={{ opacity: isHovered ? 0.3 : 0 }}
      />

      <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          {/* Colonne gauche : Annonceur */}
          <div className="relative sm:w-36 p-3 sm:p-4 bg-gradient-to-br from-gray-50/80 to-white flex flex-row sm:flex-col items-center gap-2.5 sm:gap-2 sm:justify-center border-b sm:border-b-0 sm:border-r border-gray-100">
            <Link href={announcerPublicProfileUrl} className="relative group/avatar flex-shrink-0">
              <div className="absolute -inset-1 bg-gradient-to-tr from-primary via-secondary to-primary rounded-xl opacity-60 blur-sm group-hover/avatar:opacity-100 transition-opacity" />
              <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-white ring-2 ring-white shadow-md">
                {formule.announcerProfileImage ? (
                  <Image
                    src={formule.announcerProfileImage}
                    alt={formule.announcerFirstName}
                    width={56}
                    height={56}
                    className={cn("w-full h-full", formule.announcerIsDisplayingLogo ? "object-contain p-1" : "object-cover")}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                    <span className="text-xl">👤</span>
                  </div>
                )}
              </div>
              {formule.announcerVerified && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-br from-secondary to-teal-500 rounded-md flex items-center justify-center ring-1.5 ring-white shadow-sm">
                  <Shield className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </Link>

            <div className="flex flex-col items-start sm:items-center gap-1">
              <Link href={announcerPublicProfileUrl}>
                <span className="font-bold text-gray-900 text-sm hover:text-primary transition-colors">
                  {formule.announcerFirstName}
                </span>
              </Link>
              <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-full border", sc.bg, sc.border)}>
                <StatusIcon className={cn("w-2.5 h-2.5", sc.text)} />
                <span className={cn("text-[10px] font-semibold", sc.text)}>{sc.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-bold text-amber-600">{formule.announcerRating.toFixed(1)}</span>
                </div>
                {shortDistance && (
                  <span className="text-xs text-primary font-medium flex items-center gap-0.5">
                    <Navigation className="w-3 h-3" />
                    {shortDistance}
                  </span>
                )}
              </div>
              {formule.announcerLocation && (
                <span className="text-[11px] text-gray-500 flex items-center gap-0.5 truncate max-w-[130px]">
                  <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  {formule.announcerLocation}
                </span>
              )}
            </div>
          </div>

          {/* Colonne centrale : Formule */}
          <div className="flex-1 p-4 flex flex-col">
            {/* Titre + Tags */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-gray-900 group-hover:text-primary transition-colors mb-1.5">
                  {formule.formuleName}
                </h3>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 rounded-full">
                    {formule.categoryIcon && <span className="text-xs">{formule.categoryIcon}</span>}
                    <span className="text-[11px] font-semibold text-primary">{formule.categoryName}</span>
                  </span>
                  {(isCollective || !isGarde) && (
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium",
                      isCollective ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"
                    )}>
                      {isCollective ? <Users className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      {isCollective ? "Collectif" : "Individuel"}
                    </span>
                  )}
                  {formule.isSapEligible && formule.announcerSapApproved && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-medium">
                      <FileCheck className="w-3 h-3" />
                      Crédit d&apos;impôt
                    </span>
                  )}
                </div>
              </div>

              <AnimatedHeart
                isFavorite={isFavorite}
                onToggle={() => onToggleFavorite?.(formule.formuleId)}
                isLoading={isTogglingFavorite}
              />
            </div>

            {/* Grille détails */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500 mb-3">
              {/* Durée — masquée pour garde */}
              {formule.duration && !isGarde && (
                <span className="flex items-center gap-1">
                  <Timer className="w-3.5 h-3.5 text-gray-400" />
                  {formatDuration(formule.duration)}
                </span>
              )}
              {formule.serviceLocation && (
                <span className="flex items-center gap-1">
                  {formule.serviceLocation === "client_home" ? (
                    <Car className="w-3.5 h-3.5 text-gray-400" />
                  ) : (
                    <Home className="w-3.5 h-3.5 text-gray-400" />
                  )}
                  {locationLabels[formule.serviceLocation]}
                </span>
              )}
              {formule.numberOfSessions && formule.numberOfSessions > 1 && (
                <span className="flex items-center gap-1 text-purple-600">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  {formule.numberOfSessions} séances
                </span>
              )}
              {/* Infos garde */}
              {isGarde && formule.gardeInfo && (
                <>
                  <span className="flex items-center gap-1">
                    <Home className="w-3.5 h-3.5 text-gray-400" />
                    {formule.gardeInfo.housingType === "house" ? "Maison" : formule.gardeInfo.housingType === "apartment" ? "Appart." : "—"}
                  </span>
                  <span className={cn("flex items-center gap-1", formule.gardeInfo.hasGarden ? "text-emerald-600" : "text-gray-400")}>
                    <TreePine className="w-3.5 h-3.5" />
                    {formule.gardeInfo.hasGarden ? "Jardin" : "Sans jardin"}
                  </span>
                  {formule.gardeInfo.allowOvernightStay && (
                    <span className="flex items-center gap-1 text-indigo-600">
                      <Moon className="w-3.5 h-3.5" />
                      Nuit
                    </span>
                  )}
                  {formule.gardeInfo.providesFood && (
                    <span className="flex items-center gap-1 text-amber-600">
                      <Utensils className="w-3.5 h-3.5" />
                      Repas
                    </span>
                  )}
                  {formule.gardeInfo.hasOwnAnimals && formule.gardeInfo.ownAnimalTypes && (
                    <span className="flex items-center gap-1">
                      <PawPrint className="w-3.5 h-3.5 text-gray-400" />
                      {formule.gardeInfo.ownAnimalTypes.map((t) => animalEmojiMap.get(t) || "🐾").join("")}
                    </span>
                  )}
                </>
              )}
              {formule.capacityInfo && formule.capacityInfo.isCapacityBased && (
                <span className={cn(
                  "flex items-center gap-1 font-semibold",
                  formule.capacityInfo.minRemainingCapacity <= 2
                    ? "text-orange-600"
                    : "text-secondary"
                )}>
                  <Users className="w-3.5 h-3.5" />
                  {formule.capacityInfo.minRemainingCapacity}/{formule.capacityInfo.maxCapacity} place{formule.capacityInfo.minRemainingCapacity > 1 ? "s" : ""}
                </span>
              )}
              {/* Types d'animaux acceptés */}
              {formule.animalTypes && formule.animalTypes.length > 0 && (
                <span className="flex items-center gap-1">
                  {formule.animalTypes.map((type) => (
                    <span key={type} className="inline-flex items-center px-1 py-0.5 bg-amber-50 rounded-full text-[10px] border border-amber-100" title={type}>
                      {animalEmojiMap.get(type) || "🐾"}
                    </span>
                  ))}
                </span>
              )}
            </div>

            {/* Footer : Créneau + Prix + CTA */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-auto">
              {formule.nextSlot && (
                <div className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border",
                  formule.nextSlot.slotOccupancy === "almost_full"
                    ? "bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200"
                    : formule.nextSlot.slotOccupancy === "busy"
                      ? "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200"
                      : "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100"
                )}>
                  <Zap className={cn(
                    "w-3.5 h-3.5",
                    formule.nextSlot.slotOccupancy === "almost_full"
                      ? "text-orange-500"
                      : formule.nextSlot.slotOccupancy === "busy"
                        ? "text-amber-500"
                        : "text-emerald-500"
                  )} />
                  <span className={cn(
                    "text-xs font-semibold",
                    formule.nextSlot.slotOccupancy === "almost_full"
                      ? "text-orange-700"
                      : formule.nextSlot.slotOccupancy === "busy"
                        ? "text-amber-700"
                        : "text-emerald-700"
                  )}>
                    {formatNextSlotDate(formule.nextSlot.date)}{!formule.nextSlot.isFullDay && ` · ${formatTime(formule.nextSlot.startTime)}`}
                  </span>
                  {isCollective && formule.spotsLeft && (
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                      formule.spotsLeft <= 2
                        ? "bg-orange-100 text-orange-600"
                        : "bg-emerald-100 text-emerald-600"
                    )}>
                      {formule.spotsLeft} place{formule.spotsLeft > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 ml-auto">
                {/* Prix */}
                <div className="text-right">
                  {totalEstimate ? (
                    <>
                      <span className="text-lg font-black bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                        {formatPrice(totalEstimate.total)}
                      </span>
                      <span className="block text-[10px] text-gray-400">
                        {totalEstimate.label}
                      </span>
                      <span className="block text-[9px] text-gray-300">
                        {formatPrice(finalPrice)}/{priceLabel || "jour"}
                      </span>
                    </>
                  ) : formule.numberOfSessions && formule.numberOfSessions > 1 ? (
                    <>
                      <span className="text-lg font-black text-gray-900">
                        {formatPrice(finalPrice * formule.numberOfSessions)}
                      </span>
                      <span className="block text-[10px] text-gray-400">
                        {formule.numberOfSessions}× {formatPrice(finalPrice)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-lg font-black text-gray-900">
                        {formatPrice(finalPrice)}
                      </span>
                      {priceLabel && (
                        <span className="block text-[10px] text-gray-400">par {priceLabel}</span>
                      )}
                    </>
                  )}
                </div>

                {!isAnnouncer && (
                  <Link href={announcerBookingUrl}>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="relative px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-primary to-primary/90 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 flex items-center gap-1 sm:gap-1.5 overflow-hidden group/btn"
                    >
                      <span className="relative z-10">Réserver</span>
                      <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 relative z-10 group-hover/btn:translate-x-0.5 transition-transform" />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                    </motion.button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

// ========================
// Grouped by Announcer - Carousel Card
// ========================

export interface AnnouncerGroup {
  announcerId: string;
  announcerFirstName: string;
  announcerLastName: string;
  announcerSlug?: string;
  announcerProfileImage?: string | null;
  announcerIsDisplayingLogo?: boolean;
  announcerRating: number;
  announcerReviewCount: number;
  announcerLocation: string;
  announcerDistance?: number;
  announcerVerified: boolean;
  announcerStatusType: "particulier" | "micro_entrepreneur" | "professionnel";
  formules: FormuleResult[];
}

// Mini-card formule pour le carousel
function FormuleChip({
  formule,
  isAnnouncer,
  isFavorite = false,
  onToggleFavorite,
  isTogglingFavorite = false,
  searchDates,
  selectedAnimalIds,
}: {
  formule: FormuleResult;
  isAnnouncer: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (formuleId: string) => void;
  isTogglingFavorite?: boolean;
  searchDates?: SearchDates;
  selectedAnimalIds?: string[];
}) {
  const announcerBaseUrl = `/annonceur/${formule.announcerSlug || formule.announcerId}`;
  const announcerBookingUrl = buildBookingUrl(announcerBaseUrl, formule.formuleId, searchDates, selectedAnimalIds);

  const finalPrice = getPriceWithCommission(formule.price, formule.announcerStatusType);
  const priceLabel = priceUnitLabels[formule.priceUnit] || formule.priceUnit;
  const isCollective = formule.sessionType === "collective";

  return (
    <div className="flex-shrink-0 w-[180px] bg-white border border-gray-100 rounded-2xl p-3 hover:shadow-lg hover:border-primary/20 transition-all duration-300 flex flex-col">
      {/* Catégorie + Favori */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {formule.categoryIcon && <span className="text-sm">{formule.categoryIcon}</span>}
          <span className="text-[11px] font-semibold text-primary truncate">{formule.categoryName}</span>
        </div>
        {onToggleFavorite && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(formule.formuleId); }}
            disabled={isTogglingFavorite}
            aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            className={cn(
              "flex-shrink-0 p-1 rounded-full transition-colors",
              isFavorite ? "text-red-500" : "text-gray-300 hover:text-red-400",
              isTogglingFavorite && "opacity-50"
            )}
          >
            <Heart className={cn("w-3.5 h-3.5", isFavorite && "fill-current")} />
          </button>
        )}
      </div>

      {/* Nom formule */}
      <h4 className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug mb-2 flex-1">
        {formule.formuleName}
      </h4>

      {/* Infos compactes */}
      <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-2">
        {formule.duration && (
          <span className="flex items-center gap-0.5">
            <Timer className="w-3 h-3 text-gray-400" />
            {formatDuration(formule.duration)}
          </span>
        )}
        <span className={cn(
          "flex items-center gap-0.5",
          isCollective ? "text-blue-600" : ""
        )}>
          {isCollective ? <Users className="w-3 h-3" /> : <User className="w-3 h-3 text-gray-400" />}
          {isCollective ? "Collectif" : "Indiv."}
        </span>
      </div>

      {/* Badge créneau */}
      {formule.nextSlot && (
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-lg mb-2 text-[10px] font-semibold",
          formule.nextSlot.slotOccupancy === "almost_full"
            ? "bg-orange-50 text-orange-700 border border-orange-200"
            : formule.nextSlot.slotOccupancy === "busy"
              ? "bg-amber-50 text-amber-700 border border-amber-200"
              : "bg-emerald-50 text-emerald-700 border border-emerald-100"
        )}>
          <Zap className="w-3 h-3" />
          {formatNextSlotDate(formule.nextSlot.date)}
          {!formule.nextSlot.isFullDay && ` · ${formatTime(formule.nextSlot.startTime)}`}
        </div>
      )}

      {/* Prix */}
      <div className="mb-2">
        {formule.numberOfSessions && formule.numberOfSessions > 1 ? (
          <>
            <span className="text-lg font-black text-gray-900">
              {formatPrice(finalPrice * formule.numberOfSessions)}
            </span>
            <span className="block text-[10px] text-gray-400">
              {formule.numberOfSessions}× {formatPrice(finalPrice)}
            </span>
          </>
        ) : (
          <>
            <span className="text-lg font-black text-gray-900">
              {formatPrice(finalPrice)}
            </span>
            {priceLabel && (
              <span className="text-[10px] text-gray-400 ml-0.5">/{priceLabel}</span>
            )}
          </>
        )}
      </div>

      {/* Bouton Réserver */}
      {!isAnnouncer && (
        <Link href={announcerBookingUrl} className="mt-auto">
          <button className="w-full px-3 py-2 bg-gradient-to-r from-primary to-primary/90 text-white font-bold text-xs rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center gap-1">
            Réserver
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </Link>
      )}
    </div>
  );
}

// Carousel Card groupé par annonceur
export function AnnouncerCarouselCard({
  group,
  index,
  isAnnouncer = false,
  favoriteFormuleIds,
  onToggleFavorite,
  togglingFavoriteId,
  searchDates,
  selectedAnimalIds,
}: {
  group: AnnouncerGroup;
  index: number;
  isAnnouncer: boolean;
  favoriteFormuleIds?: string[];
  onToggleFavorite?: (formuleId: string) => void;
  togglingFavoriteId?: string | null;
  searchDates?: SearchDates;
  selectedAnimalIds?: string[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const announcerPublicProfileUrl = `/profil/${group.announcerSlug || group.announcerId}`;
  const sc = statusTypeConfig[group.announcerStatusType];
  const StatusIcon = sc.icon;

  const shortDistance = group.announcerDistance !== undefined
    ? group.announcerDistance < 1
      ? "< 1 km"
      : `${Math.round(group.announcerDistance)} km`
    : null;

  const updateScrollButtons = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  const scrollBy = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  };

  // Check scroll on mount
  const handleRef = (el: HTMLDivElement | null) => {
    (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    if (el) {
      setCanScrollRight(el.scrollWidth > el.clientWidth + 4);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: "easeOut" }}
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden"
    >
      <div className="flex flex-col md:flex-row">
        {/* Gauche : Info annonceur */}
        <div className="relative md:w-[210px] flex-shrink-0 p-4 md:p-5 bg-gradient-to-br from-gray-50/80 to-white flex flex-row md:flex-col items-center gap-3 md:gap-3 md:justify-center border-b md:border-b-0 md:border-r border-gray-100">
          {/* Avatar */}
          <Link href={announcerPublicProfileUrl} className="relative group/avatar flex-shrink-0">
            <div className="absolute -inset-1 bg-gradient-to-tr from-primary via-secondary to-primary rounded-2xl opacity-60 blur-sm group-hover/avatar:opacity-100 transition-opacity" />
            <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-white ring-2 ring-white shadow-md">
              {group.announcerProfileImage ? (
                <Image
                  src={group.announcerProfileImage}
                  alt={group.announcerFirstName}
                  width={56}
                  height={56}
                  className={cn("w-full h-full", group.announcerIsDisplayingLogo ? "object-contain p-1" : "object-cover")}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                  <span className="text-xl">👤</span>
                </div>
              )}
            </div>
            {group.announcerVerified && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-secondary to-teal-500 rounded-lg flex items-center justify-center ring-2 ring-white shadow-sm">
                <Shield className="w-3 h-3 text-white" />
              </div>
            )}
          </Link>

          {/* Infos textuelles */}
          <div className="flex flex-col items-start md:items-center gap-1.5">
            <Link href={announcerPublicProfileUrl}>
              <h3 className="font-bold text-gray-900 text-sm hover:text-primary transition-colors">
                {group.announcerFirstName} {group.announcerLastName.charAt(0)}.
              </h3>
            </Link>

            {/* Badge statut */}
            <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full border", sc.bg, sc.border)}>
              <StatusIcon className={cn("w-3 h-3", sc.text)} />
              <span className={cn("text-[11px] font-semibold", sc.text)}>{sc.label}</span>
            </div>

            {/* Note + Distance */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xs font-bold text-amber-600">{group.announcerRating.toFixed(1)}</span>
                {group.announcerReviewCount > 0 && (
                  <span className="text-[10px] text-gray-400">({group.announcerReviewCount})</span>
                )}
              </div>
            </div>

            {/* Localisation */}
            {group.announcerLocation && (
              <span className="text-[11px] text-gray-500 flex items-center gap-0.5 md:text-center">
                <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                <span className="truncate max-w-[120px]">{group.announcerLocation}</span>
              </span>
            )}
            {shortDistance && (
              <span className="text-xs text-primary font-medium flex items-center gap-0.5">
                <Navigation className="w-3 h-3" />
                {shortDistance}
              </span>
            )}

            {/* Lien profil */}
            <Link
              href={announcerPublicProfileUrl}
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-primary transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Voir profil
            </Link>
          </div>
        </div>

        {/* Droite : Carousel formules */}
        <div className="relative flex-1 min-w-0 py-4 md:py-5">
          {/* Compteur formules */}
          <div className="px-4 mb-3">
            <span className="text-xs font-semibold text-gray-500">
              {group.formules.length} formule{group.formules.length > 1 ? "s" : ""}
            </span>
          </div>

          {/* Scroll container */}
          <div className="relative">
            {/* Flèche gauche */}
            {canScrollLeft && (
              <button
                onClick={() => scrollBy("left")}
                className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 border border-gray-200 rounded-full shadow-lg flex items-center justify-center hover:bg-white hover:scale-110 transition-all"
              >
                <ChevronLeft className="w-4 h-4 text-gray-700" />
              </button>
            )}

            {/* Flèche droite */}
            {canScrollRight && (
              <button
                onClick={() => scrollBy("right")}
                className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 border border-gray-200 rounded-full shadow-lg flex items-center justify-center hover:bg-white hover:scale-110 transition-all"
              >
                <ChevronRight className="w-4 h-4 text-gray-700" />
              </button>
            )}

            {/* Fade indicators */}
            {canScrollLeft && (
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-[5] pointer-events-none" />
            )}
            {canScrollRight && (
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-[5] pointer-events-none" />
            )}

            <div
              ref={handleRef}
              onScroll={updateScrollButtons}
              className="flex gap-3 overflow-x-auto scrollbar-hide px-4"
            >
              {group.formules.map((formule) => (
                <FormuleChip
                  key={formule.formuleId}
                  formule={formule}
                  isAnnouncer={isAnnouncer}
                  isFavorite={favoriteFormuleIds?.includes(formule.formuleId) ?? false}
                  onToggleFavorite={onToggleFavorite}
                  isTogglingFavorite={togglingFavoriteId === formule.formuleId}
                  searchDates={searchDates}
                  selectedAnimalIds={selectedAnimalIds}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
