"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { PhotoLightbox } from "./PhotoLightbox";
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
import { getVariantSessionPrice } from "@/app/lib/pricing";
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
  /** Mode de tarification : "per_session" (forfait) ou "per_hour" (horaire) */
  pricingMode?: "per_session" | "per_hour";
  sessionType: "individual" | "collective";
  serviceLocation?: "announcer_home" | "client_home" | "both";
  /** Lieu effectif après filtre zone d'intervention annonceur (search.ts).
   *  Si différent de serviceLocation, ça veut dire que le pro ne peut pas
   *  se déplacer chez ce client : la formule "both" devient "announcer_home". */
  effectiveServiceLocation?: "announcer_home" | "client_home" | "both";
  /** L'annonceur peut-il se déplacer aux coords du client ? (undefined = pas calculable) */
  announcerCanTravelToClient?: boolean;
  /** Rayon d'intervention de l'annonceur en km */
  announcerInterventionRadius?: number;
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
  /** Photos du service (jusqu'à 3) affichées dans la mini-galerie */
  servicePhotos?: Array<{ url: string; order: number }>;
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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const isCollective = formule.sessionType === "collective";
  const isGarde = !!formule.capacityInfo?.isCapacityBased;

  const announcerBaseUrl = `/annonceur/${formule.announcerSlug || formule.announcerId}`;
  const announcerBookingUrl = buildBookingUrl(announcerBaseUrl, formule.formuleId, searchDates, selectedAnimalIds);
  const announcerPublicProfileUrl = `/profil/${formule.announcerSlug || formule.announcerId}`;

  // Pour les formules collective/multi : le prix mis en avant est le forfait par séance
  // (calculé selon priceUnit/duration/pricingMode), pas le prix horaire.
  const isMultiSession = isCollective || (formule.numberOfSessions ?? 1) > 1;
  const announcerSessionPrice = isMultiSession
    ? getVariantSessionPrice(formule)
    : formule.price;
  const finalPrice = getPriceWithCommission(announcerSessionPrice, formule.announcerStatusType);
  const priceLabel = isMultiSession
    ? "séance"
    : (priceUnitLabels[formule.priceUnit] || formule.priceUnit);
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
      className="group relative flex flex-col h-full"
    >
      <div
        className="relative bg-white flex flex-col h-full overflow-visible transition-shadow duration-300"
        style={{
          borderRadius: 14,
          border: "1px solid #ece9e1",
          boxShadow: isHovered ? "0 10px 30px rgba(30,30,28,0.08)" : "none",
        }}
      >

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

        {/* Header : Avatar + Identité (style Profile-first) */}
        <div className={cn("px-[18px] pt-[18px] pb-2", formule.nextSlot ? "pt-7" : "")}>
          <div className="flex items-start gap-3">
            {/* Avatar 56px avec badge vérifié */}
            <Link href={announcerPublicProfileUrl} className="relative flex-shrink-0">
              <div
                className="w-14 h-14 rounded-full overflow-hidden bg-white"
                style={{ border: "1px solid rgba(0,0,0,0.05)" }}
              >
                {formule.announcerProfileImage ? (
                  <Image
                    src={formule.announcerProfileImage}
                    alt={formule.announcerFirstName}
                    width={56}
                    height={56}
                    className={cn("w-full h-full", formule.announcerIsDisplayingLogo ? "object-contain p-1" : "object-cover")}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-xl font-semibold"
                    style={{
                      background: "linear-gradient(135deg, #e8efe9, #d4e0d2)",
                      color: "#3a5a40",
                    }}
                  >
                    {formule.announcerFirstName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {formule.announcerVerified && (
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{
                    background: "#1f3a33",
                    border: "2px solid #fff",
                  }}
                  title="Profil vérifié"
                >
                  <Shield className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </Link>

            {/* Identité */}
            <div className="flex-1 min-w-0 pr-6">
              {/* Badge type */}
              <div className="mb-1">
                <span
                  className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                  style={
                    formule.announcerStatusType === "professionnel" || formule.announcerStatusType === "micro_entrepreneur"
                      ? { background: "#eaf0ed", color: "#2f4a3f" }
                      : { background: "#f3ecdf", color: "#6b4f25" }
                  }
                >
                  {formule.announcerStatusType === "professionnel"
                    ? "Professionnel"
                    : formule.announcerStatusType === "micro_entrepreneur"
                    ? "Micro-entrepreneur"
                    : "Particulier"}
                </span>
              </div>
              <Link href={announcerPublicProfileUrl}>
                <div className="text-sm font-semibold text-[#1f1f1d] hover:text-primary transition-colors truncate">
                  {formule.announcerFirstName}
                </div>
              </Link>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-[#6d6d68]">
                <span className="inline-flex items-center gap-1">
                  <Star className="w-2.5 h-2.5 fill-[#1f2937] text-[#1f2937]" />
                  {formule.announcerRating.toFixed(1)} · {formule.announcerReviewCount} avis
                </span>
                {shortDistance && (
                  <>
                    <span className="text-[#cdc9c0]">·</span>
                    <span className="inline-flex items-center gap-0.5 text-primary font-semibold">
                      <MapPin className="w-2.5 h-2.5" />
                      {shortDistance}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Favori (absolute top-right) */}
            <div className="absolute top-3.5 right-3.5">
              <AnimatedHeart
                isFavorite={isFavorite}
                onToggle={() => onToggleFavorite?.(formule.formuleId)}
                isLoading={isTogglingFavorite}
              />
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="px-[18px] py-2 flex-1 flex flex-col">
          {/* Eyebrow "Propose" */}
          <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mt-3.5 mb-1">
            Propose
          </div>

          {/* Nom de la formule */}
          <Link href={`/formule/${formule.formuleId}`} className="block">
            <h3 className="text-base font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0 hover:text-primary transition-colors">
              {formule.formuleName}
            </h3>
          </Link>

          {/* Description courte (2 lignes max) */}
          {formule.formuleDescription && (
            <p className="text-[13px] text-[#4a4a46] leading-[1.5] mt-1.5 line-clamp-2">
              {formule.formuleDescription}
            </p>
          )}

          {/* Mini galerie photos (hauteur fixe 64px comme la référence) */}
          {formule.servicePhotos && formule.servicePhotos.length > 0 && (
            <div
              className="grid grid-cols-3 gap-1 mt-3 overflow-hidden"
              style={{ borderRadius: 8 }}
            >
              {formule.servicePhotos.slice(0, 3).map((photo, i) => (
                <button
                  key={`${photo.url}-${i}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setLightboxIndex(i);
                    setLightboxOpen(true);
                  }}
                  className="relative bg-gray-100 overflow-hidden block focus:outline-none focus:ring-2 focus:ring-primary/50"
                  style={{ height: 64 }}
                  aria-label={`Voir la photo ${i + 1} en grand`}
                >
                  <Image
                    src={photo.url}
                    alt={`${formule.formuleName} ${i + 1}`}
                    fill
                    sizes="(max-width: 640px) 33vw, 100px"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    unoptimized
                  />
                </button>
              ))}
              {Array.from({ length: Math.max(0, 3 - formule.servicePhotos.length) }).map((_, i) => (
                <div
                  key={`placeholder-${i}`}
                  className="flex items-center justify-center text-xl opacity-40"
                  style={{
                    height: 64,
                    background: "repeating-linear-gradient(45deg, #efe8dd, #efe8dd 6px, #f5eee0 6px, #f5eee0 12px)",
                  }}
                >
                  {formule.categoryIcon || "📷"}
                </div>
              ))}
            </div>
          )}

          {/* Info pills (style outline référence) — distance déplacée près du nom */}
          <div className="flex flex-wrap gap-1.5 mt-3.5 mb-1">
            {/* Durée d'une séance pour les services (pas garde) — toujours visible si présente */}
            {formule.duration && !isGarde && (
              <InfoPill>
                <Timer className="w-2.5 h-2.5" /> {formatDuration(formule.duration)}
                {formule.numberOfSessions && formule.numberOfSessions > 1 && " / séance"}
              </InfoPill>
            )}
            {formule.animalTypes && formule.animalTypes.length > 0 && (
              <InfoPill>
                {formule.animalTypes.slice(0, 2).map((type) => (
                  <span key={type} className="text-[11px]">
                    {animalEmojiMap.get(type) || "🐾"}
                  </span>
                ))}
              </InfoPill>
            )}
            {(formule.effectiveServiceLocation ?? formule.serviceLocation) && (() => {
              const loc = formule.effectiveServiceLocation ?? formule.serviceLocation!;
              const wasDegraded =
                formule.serviceLocation === "both" &&
                formule.effectiveServiceLocation === "announcer_home";
              return (
                <InfoPill
                  title={
                    wasDegraded
                      ? `Le pet-sitter ne se déplace pas jusqu'à votre adresse (rayon : ${formule.announcerInterventionRadius} km)`
                      : undefined
                  }
                >
                  {loc === "client_home" ? (
                    <Car className="w-2.5 h-2.5" />
                  ) : (
                    <Home className="w-2.5 h-2.5" />
                  )}
                  {locationLabels[loc]}
                </InfoPill>
              );
            })()}
            {isCollective && (
              <InfoPill>
                <Users className="w-2.5 h-2.5" /> Collectif
              </InfoPill>
            )}
            {formule.numberOfSessions && formule.numberOfSessions > 1 && (
              <InfoPill>
                <Sparkles className="w-2.5 h-2.5" /> {formule.numberOfSessions} séances
              </InfoPill>
            )}
            {formule.gardeInfo?.allowOvernightStay && (
              <InfoPill>
                <Moon className="w-2.5 h-2.5" /> Nuit
              </InfoPill>
            )}
            {/* Capacity (garde) */}
            {formule.capacityInfo?.isCapacityBased && (
              <InfoPill>
                <Users className="w-2.5 h-2.5" /> {formule.capacityInfo.minRemainingCapacity}/{formule.capacityInfo.maxCapacity} places
              </InfoPill>
            )}
            {/* Verified */}
            {formule.announcerVerified && <VerifiedPill>Vérifié</VerifiedPill>}
            {/* SAP */}
            {formule.isSapEligible && formule.announcerSapApproved && (
              <VerifiedPill>
                <FileCheck className="w-2.5 h-2.5" /> Crédit d&apos;impôt
              </VerifiedPill>
            )}
          </div>
        </div>

        {/* Footer : Disponibilité + Prix + CTA */}
        <div
          className="mx-[18px] mb-[18px] mt-3 pt-3.5 flex items-center justify-between"
          style={{ borderTop: "1px solid #f1ede3" }}
        >
          <div>
            {/* Disponibilité avec puce */}
            {formule.nextSlot ? (
              <div className="text-[11px] font-medium text-[#4a6b5a] flex items-center gap-1">
                <span>●</span>
                {formatNextSlotDate(formule.nextSlot.date)}
                {!formule.nextSlot.isFullDay && ` · ${formatTime(formule.nextSlot.startTime)}`}
              </div>
            ) : (
              <div className="text-[11px] font-medium text-[#4a6b5a] flex items-center gap-1">
                <span>●</span>
                Dispo cette semaine
              </div>
            )}
            {/* Prix */}
            <div className="mt-0.5">
              {totalEstimate ? (
                <>
                  <span className="text-[17px] font-semibold text-[#1f1f1d]">
                    {formatPrice(totalEstimate.total)}
                  </span>
                  <span className="text-[11px] text-[#6d6d68]"> {totalEstimate.label}</span>
                </>
              ) : (
                <>
                  <span className="text-[17px] font-semibold text-[#1f1f1d]">
                    {formatPrice(finalPrice)}
                  </span>
                  {priceLabel && (
                    <span className="text-[11px] text-[#6d6d68]"> / {priceLabel}</span>
                  )}
                </>
              )}
              {/* Total séances obligatoires (formules collectives / multi-séances)
                  Le client doit payer toutes les séances en une fois. */}
              {(() => {
                const sessions = formule.numberOfSessions ?? (isCollective ? 1 : 1);
                const showTotal =
                  (isCollective || (formule.numberOfSessions ?? 1) > 1) && sessions >= 2;
                if (!showTotal) return null;
                return (
                  <div
                    className="text-[11px] mt-1 px-2 py-1 inline-flex items-center gap-1 rounded-full font-semibold"
                    style={{
                      background: "#f5f9f6",
                      color: "#1f3a33",
                      border: "1px solid #cfdbd3",
                    }}
                  >
                    Total {sessions}× : {formatPrice(finalPrice * sessions)}
                  </div>
                );
              })()}
            </div>
          </div>

          {!isAnnouncer && (
            <Link href={announcerBookingUrl}>
              <button
                className="px-4 py-2 rounded-full text-xs font-medium transition-all hover:opacity-90 active:scale-95"
                style={{ background: "#1f3a33", color: "#f7f5ef" }}
              >
                Réserver
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* Galerie modale plein écran */}
      {formule.servicePhotos && formule.servicePhotos.length > 0 && (
        <PhotoLightbox
          photos={formule.servicePhotos}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          caption={formule.formuleName}
        />
      )}
    </motion.article>
  );
}

/** Pill outline style référence : padding 2-7px, radius 999, fontSize 10, weight 500 */
function InfoPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium text-[#3a3a38]"
      style={{ border: "1px solid #dfdcd4" }}
    >
      {children}
    </span>
  );
}

function VerifiedPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium text-[#2f4a3f]"
      style={{ border: "1px solid #cfdbd3" }}
    >
      <Shield className="w-2.5 h-2.5" />
      {children}
    </span>
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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const isCollective = formule.sessionType === "collective";
  const isGarde = !!formule.capacityInfo?.isCapacityBased;

  const announcerBaseUrl = `/annonceur/${formule.announcerSlug || formule.announcerId}`;
  const announcerBookingUrl = buildBookingUrl(announcerBaseUrl, formule.formuleId, searchDates, selectedAnimalIds);
  const announcerPublicProfileUrl = `/profil/${formule.announcerSlug || formule.announcerId}`;

  // Pour les formules collective/multi : prix forfait par séance mis en avant
  const isMultiSession = isCollective || (formule.numberOfSessions ?? 1) > 1;
  const announcerSessionPrice = isMultiSession
    ? getVariantSessionPrice(formule)
    : formule.price;
  const finalPrice = getPriceWithCommission(announcerSessionPrice, formule.announcerStatusType);
  const priceLabel = isMultiSession
    ? "séance"
    : (priceUnitLabels[formule.priceUnit] || formule.priceUnit);
  const totalEstimate = computeTotalPrice(formule, searchDates);

  const shortDistance = formule.announcerDistance !== undefined
    ? formule.announcerDistance < 1
      ? "< 1 km"
      : `${Math.round(formule.announcerDistance)} km`
    : null;

  const photos = formule.servicePhotos ?? [];
  const typeLabel =
    formule.announcerStatusType === "professionnel"
      ? "Professionnel"
      : formule.announcerStatusType === "micro_entrepreneur"
      ? "Micro-entrepreneur"
      : "Particulier";
  const typeBadgeStyle =
    formule.announcerStatusType === "particulier"
      ? { background: "#f3ecdf", color: "#6b4f25" }
      : { background: "#eaf0ed", color: "#2f4a3f" };

  // Conservés pour compatibilité avec le bloc legacy caché (display:none)
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
      <div
        className="relative bg-white overflow-hidden transition-all duration-200"
        style={{
          borderRadius: 16,
          border: "1px solid #ece9e1",
          boxShadow: isHovered ? "0 14px 36px rgba(30,30,28,0.08)" : "none",
          transform: isHovered ? "translateY(-1px)" : "none",
        }}
      >
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 p-4 sm:p-5">
          {/* ═══ COLONNE GAUCHE : Avatar + mini photos ═══ */}
          <div className="flex sm:flex-col items-start gap-3 sm:gap-3 flex-shrink-0">
            <Link href={announcerPublicProfileUrl} className="relative flex-shrink-0">
              <div
                className="rounded-full overflow-hidden bg-white"
                style={{ width: 68, height: 68, border: "1px solid rgba(0,0,0,0.05)" }}
              >
                {formule.announcerProfileImage ? (
                  <Image
                    src={formule.announcerProfileImage}
                    alt={formule.announcerFirstName}
                    width={68}
                    height={68}
                    className={cn(
                      "w-full h-full",
                      formule.announcerIsDisplayingLogo ? "object-contain p-1" : "object-cover"
                    )}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-2xl font-semibold"
                    style={{
                      background: "linear-gradient(135deg, #e8efe9, #d4e0d2)",
                      color: "#3a5a40",
                    }}
                  >
                    {formule.announcerFirstName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {formule.announcerVerified && (
                <div
                  className="absolute flex items-center justify-center"
                  style={{
                    bottom: -2,
                    right: -2,
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "#1f3a33",
                    border: "2px solid #fff",
                  }}
                  title="Profil vérifié"
                >
                  <Shield className="text-white" style={{ width: 11, height: 11 }} />
                </div>
              )}
            </Link>

            {/* Mini strip 2x2 ou horizontal si pas de photos disponibles */}
            {photos.length > 0 && (
              <div
                className="grid grid-cols-2 gap-[3px] overflow-hidden"
                style={{ width: 68, borderRadius: 8 }}
              >
                {photos.slice(0, 4).map((photo, i) => (
                  <button
                    key={`${photo.url}-${i}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setLightboxIndex(i);
                      setLightboxOpen(true);
                    }}
                    className="relative bg-gray-100 overflow-hidden block focus:outline-none focus:ring-2 focus:ring-primary/50"
                    style={{ height: 32 }}
                    aria-label={`Voir photo ${i + 1}`}
                  >
                    <Image
                      src={photo.url}
                      alt={`Photo ${i + 1}`}
                      fill
                      sizes="40px"
                      className="object-cover"
                      unoptimized
                    />
                  </button>
                ))}
                {Array.from({ length: Math.max(0, 4 - photos.length) }).map((_, i) => (
                  <div
                    key={`ph-${i}`}
                    className="flex items-center justify-center text-sm opacity-40"
                    style={{
                      height: 32,
                      background:
                        "repeating-linear-gradient(45deg, #efe8dd, #efe8dd 4px, #f5eee0 4px, #f5eee0 8px)",
                    }}
                  >
                    {formule.categoryIcon || "·"}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ═══ COLONNE MIDDLE : Contenu principal ═══ */}
          <div className="flex-1 min-w-0">
            {/* Row 1 : badge + name + rating + distance */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                style={typeBadgeStyle}
              >
                {typeLabel}
              </span>
              <Link href={announcerPublicProfileUrl}>
                <span className="text-[15px] font-semibold text-[#1f1f1d] hover:text-primary transition-colors">
                  {formule.announcerFirstName}
                </span>
              </Link>
              <span className="text-[#dcd8cd] text-xs">·</span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-[#4a4a46]">
                <Star className="w-[11px] h-[11px] fill-[#1f2937] text-[#1f2937]" />
                <b className="text-[#1f1f1d]">{formule.announcerRating.toFixed(1)}</b>
                <span className="text-[#6d6d68]">({formule.announcerReviewCount} avis)</span>
              </span>
              {(shortDistance || formule.announcerLocation) && (
                <>
                  <span className="text-[#dcd8cd] text-xs">·</span>
                  <span className="inline-flex items-center gap-1 text-xs text-[#6d6d68]">
                    <MapPin className="w-[11px] h-[11px]" />
                    {[shortDistance, formule.announcerLocation].filter(Boolean).join(" · ")}
                  </span>
                </>
              )}
            </div>

            {/* Row 2 : Eyebrow + service title */}
            <div className="mt-2.5">
              <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-0.5">
                Propose
              </div>
              <Link href={`/formule/${formule.formuleId}`} className="block">
                <h3 className="m-0 text-[17px] font-semibold text-[#1f1f1d] tracking-[-0.01em] hover:text-primary transition-colors">
                  {formule.formuleName}
                </h3>
              </Link>
            </div>

            {/* Row 3 : Description (1 line clamp) */}
            {formule.formuleDescription && (
              <p className="mt-1.5 text-[13px] leading-[1.5] text-[#4a4a46] line-clamp-1">
                {formule.formuleDescription}
              </p>
            )}

            {/* Row 4 : Pills (duration, animal, badges, availability) */}
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              {formule.duration && !isGarde && (
                <InfoPill>
                  <Timer className="w-2.5 h-2.5" />
                  {formatDuration(formule.duration)}
                  {formule.numberOfSessions && formule.numberOfSessions > 1 && " / séance"}
                </InfoPill>
              )}
              {formule.animalTypes && formule.animalTypes.length > 0 && (
                <InfoPill>
                  {formule.animalTypes.slice(0, 3).map((t) => (
                    <span key={t}>{animalEmojiMap.get(t) || "🐾"}</span>
                  ))}
                </InfoPill>
              )}
              {isCollective && (
                <InfoPill>
                  <Users className="w-2.5 h-2.5" /> Collectif
                </InfoPill>
              )}
              {formule.capacityInfo?.isCapacityBased && (
                <InfoPill>
                  <Users className="w-2.5 h-2.5" />
                  {formule.capacityInfo.minRemainingCapacity}/{formule.capacityInfo.maxCapacity} places
                </InfoPill>
              )}
              {formule.gardeInfo?.allowOvernightStay && (
                <InfoPill>
                  <Moon className="w-2.5 h-2.5" /> Nuit
                </InfoPill>
              )}
              {formule.announcerVerified && <VerifiedPill>Vérifié</VerifiedPill>}
              {formule.isSapEligible && formule.announcerSapApproved && (
                <VerifiedPill>
                  <FileCheck className="w-2.5 h-2.5" /> Crédit d&apos;impôt
                </VerifiedPill>
              )}
              {/* Availability with green dot */}
              {formule.nextSlot ? (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium text-[#3a3a38]"
                  style={{ border: "1px solid #dfdcd4" }}
                >
                  <span className="text-[#4a6b5a] text-[9px]">●</span>
                  {formatNextSlotDate(formule.nextSlot.date)}
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium text-[#3a3a38]"
                  style={{ border: "1px solid #dfdcd4" }}
                >
                  <span className="text-[#4a6b5a] text-[9px]">●</span>
                  Dispo cette semaine
                </span>
              )}
            </div>
          </div>

          {/* ═══ COLONNE DROITE : Heart + Prix + CTA ═══ */}
          <div
            className="flex flex-col justify-between items-stretch sm:items-end flex-shrink-0 sm:pl-5 sm:border-l border-t sm:border-t-0 pt-3 sm:pt-0 w-full sm:w-auto"
            style={{ minWidth: 130, borderColor: "#f1ede3" }}
          >
            {/* Heart */}
            <div className="self-end">
              <AnimatedHeart
                isFavorite={isFavorite}
                onToggle={() => onToggleFavorite?.(formule.formuleId)}
                isLoading={isTogglingFavorite}
              />
            </div>

            {/* Prix au centre-droite */}
            <div className="text-right my-3 sm:my-0">
              {totalEstimate ? (
                <>
                  <div className="flex items-baseline gap-0.5 justify-end">
                    <span
                      className="text-[24px] font-semibold text-[#1f1f1d]"
                      style={{ letterSpacing: "-0.02em" }}
                    >
                      {formatPrice(totalEstimate.total)}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#6d6d68] mt-0.5">{totalEstimate.label}</div>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-0.5 justify-end">
                    <span
                      className="text-[24px] font-semibold text-[#1f1f1d]"
                      style={{ letterSpacing: "-0.02em" }}
                    >
                      {formatPrice(finalPrice)}
                    </span>
                  </div>
                  {priceLabel && (
                    <div className="text-[11px] text-[#6d6d68] mt-0.5">/ {priceLabel}</div>
                  )}
                </>
              )}
              {/* Total séances obligatoires (collectives / multi) */}
              {(() => {
                const sessions = formule.numberOfSessions ?? (isCollective ? 1 : 1);
                const showTotal =
                  (isCollective || (formule.numberOfSessions ?? 1) > 1) && sessions >= 2;
                if (!showTotal) return null;
                return (
                  <div
                    className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                    style={{
                      background: "#f5f9f6",
                      color: "#1f3a33",
                      border: "1px solid #cfdbd3",
                    }}
                  >
                    Total {sessions}× : {formatPrice(finalPrice * sessions)}
                  </div>
                );
              })()}
            </div>

            {/* CTA Réserver */}
            {!isAnnouncer && (
              <Link href={announcerBookingUrl} className="mt-2 w-full">
                <button
                  className="w-full px-5 py-2.5 rounded-full text-[13px] font-medium transition-all hover:opacity-90 active:scale-95"
                  style={{ background: "#1f3a33", color: "#f7f5ef" }}
                >
                  Réserver
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* Bloc legacy caché (évite de casser l'arbre avant nettoyage) */}
        <div style={{ display: "none" }}>
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

            {/* Description */}
            {formule.formuleDescription && (
              <p className="text-[13px] text-gray-600 mb-2.5 line-clamp-2 leading-relaxed">
                {formule.formuleDescription}
              </p>
            )}

            {/* Mini galerie photos (hauteur fixe 80px, plus compactes en liste) */}
            {formule.servicePhotos && formule.servicePhotos.length > 0 && (
              <div
                className="grid grid-cols-3 gap-1 mb-3 max-w-md overflow-hidden"
                style={{ borderRadius: 8 }}
              >
                {formule.servicePhotos.slice(0, 3).map((photo, i) => (
                  <button
                    key={`${photo.url}-${i}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setLightboxIndex(i);
                      setLightboxOpen(true);
                    }}
                    className="relative bg-gray-100 overflow-hidden block focus:outline-none focus:ring-2 focus:ring-primary/50"
                    style={{ height: 80 }}
                    aria-label={`Voir la photo ${i + 1}`}
                  >
                    <Image
                      src={photo.url}
                      alt={`${formule.formuleName} ${i + 1}`}
                      fill
                      sizes="(max-width: 640px) 33vw, 130px"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      unoptimized
                    />
                  </button>
                ))}
                {Array.from({ length: Math.max(0, 3 - formule.servicePhotos.length) }).map((_, i) => (
                  <div
                    key={`placeholder-${i}`}
                    className="flex items-center justify-center text-xl opacity-40"
                    style={{
                      height: 80,
                      background: "repeating-linear-gradient(45deg, #efe8dd, #efe8dd 6px, #f5eee0 6px, #f5eee0 12px)",
                    }}
                  >
                    {formule.categoryIcon || "📷"}
                  </div>
                ))}
              </div>
            )}

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

      {/* Galerie modale plein écran */}
      {formule.servicePhotos && formule.servicePhotos.length > 0 && (
        <PhotoLightbox
          photos={formule.servicePhotos}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          caption={formule.formuleName}
        />
      )}
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
      <Link href={`/formule/${formule.formuleId}`} className="block flex-1">
        <h4 className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug mb-2 hover:text-primary transition-colors">
          {formule.formuleName}
        </h4>
      </Link>

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
