"use client";

import { useState } from "react";
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
  Zap,
  FileCheck,
  Building2,
  Briefcase,
  MapPin,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { formatPrice, formatDistance } from "./helpers";

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
  nextSlot?: NextSlot;
  collectiveSlots?: CollectiveSlotInfo[];
  spotsLeft?: number;
}

interface FormuleCardProps {
  formule: FormuleResult;
  index: number;
  isFavorite?: boolean;
  onToggleFavorite?: (formuleId: string) => void;
  isTogglingFavorite?: boolean;
  isAnnouncer?: boolean;
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

// Calcule le prix avec commission
function getPriceWithCommission(price: number, statusType: "particulier" | "micro_entrepreneur" | "professionnel"): number {
  const rate = COMMISSION_RATES[statusType] || 0.15;
  return Math.round(price * (1 + rate));
}

// Grid View Card - Design structuré en colonnes
export function FormuleCardGrid({
  formule,
  index,
  isFavorite = false,
  onToggleFavorite,
  isTogglingFavorite = false,
  isAnnouncer = false,
}: FormuleCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const isCollective = formule.sessionType === "collective";

  const announcerBaseUrl = `/annonceur/${formule.announcerSlug || formule.announcerId}`;
  const announcerBookingUrl = `${announcerBaseUrl}?formule=${formule.formuleId}`;
  const announcerPublicProfileUrl = `/profil/${formule.announcerSlug || formule.announcerId}`;

  const finalPrice = getPriceWithCommission(formule.price, formule.announcerStatusType);
  const priceLabel = priceUnitLabels[formule.priceUnit] || formule.priceUnit;

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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full shadow-lg shadow-emerald-500/30"
            >
              <Zap className="w-3.5 h-3.5 text-white" />
              <span className="text-xs font-semibold text-white">
                {formatNextSlotDate(formule.nextSlot.date)} · {formatTime(formule.nextSlot.startTime)}
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
        <div className={cn("px-4 pt-4 pb-3", formule.nextSlot ? "pt-7" : "")}>
          <div className="flex items-center gap-3">
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
        <div className="mx-4 border-t border-gray-100" />

        {/* Contenu principal */}
        <div className="px-4 py-3 flex-1 flex flex-col">
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

            {/* Type de séance */}
            <div className="flex items-center gap-1.5 justify-end">
              {isCollective ? <Users className="w-3.5 h-3.5 text-blue-500" /> : <User className="w-3.5 h-3.5 text-gray-400" />}
              <span className={cn("font-medium", isCollective ? "text-blue-600" : "text-gray-500")}>
                {isCollective ? "Collectif" : "Individuel"}
              </span>
            </div>

            {/* Durée */}
            {formule.duration && (
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
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-50/50 rounded-xl">
            <div>
              {formule.numberOfSessions && formule.numberOfSessions > 1 ? (
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
}: FormuleCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const isCollective = formule.sessionType === "collective";

  const announcerBaseUrl = `/annonceur/${formule.announcerSlug || formule.announcerId}`;
  const announcerBookingUrl = `${announcerBaseUrl}?formule=${formule.formuleId}`;
  const announcerPublicProfileUrl = `/profil/${formule.announcerSlug || formule.announcerId}`;

  const finalPrice = getPriceWithCommission(formule.price, formule.announcerStatusType);
  const priceLabel = priceUnitLabels[formule.priceUnit] || formule.priceUnit;

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
          <div className="relative sm:w-36 p-4 bg-gradient-to-br from-gray-50/80 to-white flex flex-row sm:flex-col items-center gap-3 sm:gap-2 sm:justify-center border-b sm:border-b-0 sm:border-r border-gray-100">
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
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium",
                    isCollective ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"
                  )}>
                    {isCollective ? <Users className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    {isCollective ? "Collectif" : "Individuel"}
                  </span>
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

            {/* Grille détails 2-3 colonnes */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500 mb-3">
              {formule.duration && (
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
            </div>

            {/* Footer : Créneau + Prix + CTA */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-auto">
              {formule.nextSlot && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-100">
                  <Zap className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-700">
                    {formatNextSlotDate(formule.nextSlot.date)} · {formatTime(formule.nextSlot.startTime)}
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
                      className="relative px-5 py-2.5 bg-gradient-to-r from-primary to-primary/90 text-white font-bold text-sm rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 flex items-center gap-1.5 overflow-hidden group/btn"
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
        </div>
      </div>
    </motion.article>
  );
}
