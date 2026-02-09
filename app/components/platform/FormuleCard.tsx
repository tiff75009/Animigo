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

// Calcule le prix avec commission
function getPriceWithCommission(price: number, statusType: "particulier" | "micro_entrepreneur" | "professionnel"): number {
  const rate = COMMISSION_RATES[statusType] || 0.15;
  return Math.round(price * (1 + rate));
}

// Grid View Card - Design moderne et original
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
  const announcerProfileUrl = `${announcerBaseUrl}?service=${formule.categorySlug}`;
  const announcerBookingUrl = `${announcerBaseUrl}?formule=${formule.formuleId}`;
  const announcerPublicProfileUrl = `/profil/${formule.announcerSlug || formule.announcerId}`;

  const finalPrice = getPriceWithCommission(formule.price, formule.announcerStatusType);
  const priceLabel = priceUnitLabels[formule.priceUnit] || formule.priceUnit;

  // Distance courte et élégante
  const shortDistance = formule.announcerDistance !== undefined
    ? formule.announcerDistance < 1
      ? "< 1 km"
      : `${Math.round(formule.announcerDistance)} km`
    : null;

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

      {/* Main card */}
      <div className="relative bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col h-full overflow-visible">

        {/* Badge prochain créneau - flottant qui sort de la card */}
        {formule.nextSlot && (
          <div className="absolute -top-3 left-4 right-4 z-20">
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 + 0.2 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full shadow-lg shadow-emerald-500/30"
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

        {/* Header section */}
        <div className={cn("p-5", formule.nextSlot ? "pt-7" : "")}>
          <div className="flex items-start gap-4">
            {/* Avatar avec ring gradient */}
            <Link href={announcerPublicProfileUrl} className="relative flex-shrink-0 group/avatar">
              <div className="absolute -inset-1 bg-gradient-to-tr from-primary via-secondary to-primary rounded-2xl opacity-75 blur-sm group-hover/avatar:opacity-100 transition-opacity" />
              <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-white ring-2 ring-white">
                {formule.announcerProfileImage ? (
                  <Image
                    src={formule.announcerProfileImage}
                    alt={formule.announcerFirstName}
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                    <span className="text-xl">👤</span>
                  </div>
                )}
              </div>
              {formule.announcerVerified && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-secondary to-teal-500 rounded-lg flex items-center justify-center ring-2 ring-white shadow-md">
                  <Shield className="w-3 h-3 text-white" />
                </div>
              )}
            </Link>

            {/* Infos annonceur */}
            <div className="flex-1 min-w-0">
              <Link href={announcerPublicProfileUrl}>
                <h4 className="font-bold text-gray-900 hover:text-primary transition-colors truncate">
                  {formule.announcerFirstName}
                </h4>
              </Link>
              {formule.announcerUsername && (
                <Link href={announcerPublicProfileUrl} className="text-xs text-gray-400 truncate hover:text-primary transition-colors">@{formule.announcerUsername}</Link>
              )}
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 rounded-full">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-bold text-amber-600">{formule.announcerRating.toFixed(1)}</span>
                </div>
                {shortDistance && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 rounded-full">
                    <Navigation className="w-3 h-3 text-primary" />
                    <span className="text-xs font-semibold text-primary">{shortDistance}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Favoris */}
            <AnimatedHeart
              isFavorite={isFavorite}
              onToggle={() => onToggleFavorite?.(formule.formuleId)}
              isLoading={isTogglingFavorite}
            />
          </div>
        </div>

        {/* Service info */}
        <div className="px-5 pb-4 flex-1">
          {/* Tags catégorie + type */}
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg">
              {formule.categoryIcon && <span className="text-sm">{formule.categoryIcon}</span>}
              <span className="text-xs font-semibold text-primary">{formule.categoryName}</span>
            </span>
            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium",
              isCollective
                ? "bg-blue-50 text-blue-600"
                : "bg-gray-50 text-gray-500"
            )}>
              {isCollective ? <Users className="w-3 h-3" /> : <User className="w-3 h-3" />}
              {isCollective ? "Collectif" : "Individuel"}
            </span>
            {formule.isSapEligible && formule.announcerSapApproved && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium">
                <FileCheck className="w-3 h-3" />
                TVA 10%
              </span>
            )}
          </div>

          {/* Nom de la formule */}
          <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
            {formule.formuleName}
          </h3>

          {/* Détails */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
            {formule.duration && (
              <span className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Timer className="w-3.5 h-3.5 text-gray-500" />
                </div>
                {formatDuration(formule.duration)}
              </span>
            )}
            {formule.serviceLocation && (
              <span className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center">
                  {formule.serviceLocation === "client_home" ? (
                    <Car className="w-3.5 h-3.5 text-gray-500" />
                  ) : (
                    <Home className="w-3.5 h-3.5 text-gray-500" />
                  )}
                </div>
                {locationLabels[formule.serviceLocation]}
              </span>
            )}
            {formule.numberOfSessions && formule.numberOfSessions > 1 && (
              <span className="flex items-center gap-1.5 text-purple-600">
                <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                </div>
                {formule.numberOfSessions} séances
              </span>
            )}
          </div>
        </div>

        {/* Footer - Prix & CTA */}
        <div className="p-5 pt-0">
          <div className="flex items-center justify-between gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-50/50 rounded-2xl">
            {/* Prix avec design original */}
            <div className="flex items-baseline gap-1">
              {formule.numberOfSessions && formule.numberOfSessions > 1 ? (
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      {formatPrice(finalPrice * formule.numberOfSessions)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formule.numberOfSessions}× {formatPrice(finalPrice)}
                  </span>
                </div>
              ) : (
                <div>
                  <span className="text-2xl font-black bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    {formatPrice(finalPrice)}
                  </span>
                  {priceLabel && (
                    <span className="block text-xs text-gray-400 mt-0.5">par {priceLabel}</span>
                  )}
                </div>
              )}
            </div>

            {/* CTA Button - caché pour les annonceurs */}
            {!isAnnouncer && (
              <Link href={announcerBookingUrl}>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="relative px-5 py-3 bg-gradient-to-r from-primary to-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 flex items-center gap-2 overflow-hidden group/btn"
                >
                  <span className="relative z-10">Réserver</span>
                  <ChevronRight className="w-4 h-4 relative z-10 group-hover/btn:translate-x-0.5 transition-transform" />
                  {/* Shine effect */}
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

// List View Card
export function FormuleCardList({
  formule,
  index,
  isFavorite = false,
  onToggleFavorite,
  isTogglingFavorite = false,
  isAnnouncer = false,
}: FormuleCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const distanceText = formatDistance(formule.announcerDistance);
  const isCollective = formule.sessionType === "collective";

  const announcerBaseUrl = `/annonceur/${formule.announcerSlug || formule.announcerId}`;
  const announcerProfileUrl = `${announcerBaseUrl}?service=${formule.categorySlug}`;
  const announcerBookingUrl = `${announcerBaseUrl}?formule=${formule.formuleId}`;
  const announcerPublicProfileUrl = `/profil/${formule.announcerSlug || formule.announcerId}`;

  const finalPrice = getPriceWithCommission(formule.price, formule.announcerStatusType);
  const priceLabel = priceUnitLabels[formule.priceUnit] || formule.priceUnit;

  return (
    <motion.article
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4, ease: "easeOut" }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group relative"
    >
      {/* Glow effect on hover */}
      <motion.div
        className="absolute -inset-0.5 bg-gradient-to-r from-primary/40 via-secondary/40 to-primary/40 rounded-3xl opacity-0 blur-md transition-opacity duration-500 -z-10"
        animate={{ opacity: isHovered ? 0.3 : 0 }}
      />

      <div className="relative bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Section gauche - Annonceur */}
          <div className="relative md:w-40 p-5 bg-gradient-to-br from-gray-50/80 to-white flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-gray-100">
            {/* Avatar avec ring gradient */}
            <Link href={announcerPublicProfileUrl} className="relative group/avatar">
              <div className="absolute -inset-1.5 bg-gradient-to-tr from-primary via-secondary to-primary rounded-2xl opacity-60 blur-sm group-hover/avatar:opacity-100 transition-opacity" />
              <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-white ring-2 ring-white shadow-md">
                {formule.announcerProfileImage ? (
                  <Image
                    src={formule.announcerProfileImage}
                    alt={formule.announcerFirstName}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                    <span className="text-2xl">👤</span>
                  </div>
                )}
              </div>
              {formule.announcerVerified && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-secondary to-teal-500 rounded-lg flex items-center justify-center ring-2 ring-white shadow-md">
                  <Shield className="w-3 h-3 text-white" />
                </div>
              )}
            </Link>

            <Link href={announcerPublicProfileUrl}>
              <span className="font-bold text-gray-900 text-sm mt-3 hover:text-primary transition-colors">
                {formule.announcerFirstName}
              </span>
            </Link>
            {formule.announcerUsername && (
              <Link href={announcerPublicProfileUrl} className="text-xs text-gray-400 truncate hover:text-primary transition-colors">@{formule.announcerUsername}</Link>
            )}

            <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 rounded-full mt-1.5">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold text-amber-600">{formule.announcerRating.toFixed(1)}</span>
            </div>

            {distanceText && (
              <span className="text-xs text-gray-500 flex items-center gap-1 mt-2">
                <Navigation className="w-3 h-3 text-primary" />
                {distanceText}
              </span>
            )}
          </div>

          {/* Section droite - Formule */}
          <div className="flex-1 p-5 flex flex-col">
            {/* Top row */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1 min-w-0">
                {/* Tags */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg">
                    {formule.categoryIcon && <span className="text-sm">{formule.categoryIcon}</span>}
                    <span className="text-xs font-semibold text-primary">{formule.categoryName}</span>
                  </span>
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium",
                    isCollective
                      ? "bg-blue-50 text-blue-600"
                      : "bg-gray-50 text-gray-500"
                  )}>
                    {isCollective ? <Users className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    {isCollective ? "Collectif" : "Individuel"}
                  </span>
                  {formule.isSapEligible && formule.announcerSapApproved && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium">
                      <FileCheck className="w-3 h-3" />
                      TVA 10%
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary transition-colors">
                  {formule.formuleName}
                </h3>
              </div>

              {/* Prix + Favoris */}
              <div className="flex items-start gap-3 flex-shrink-0">
                {/* Prix badge */}
                <div className="px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                  {formule.numberOfSessions && formule.numberOfSessions > 1 ? (
                    <div className="text-right">
                      <span className="text-lg font-black text-gray-900">
                        {formatPrice(finalPrice * formule.numberOfSessions)}
                      </span>
                      <div className="text-[10px] text-gray-400">
                        {formule.numberOfSessions}× {formatPrice(finalPrice)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-right">
                      <span className="text-lg font-black text-gray-900">
                        {formatPrice(finalPrice)}
                      </span>
                      {priceLabel && (
                        <span className="block text-[10px] text-gray-400">par {priceLabel}</span>
                      )}
                    </div>
                  )}
                </div>

                <AnimatedHeart
                  isFavorite={isFavorite}
                  onToggle={() => onToggleFavorite?.(formule.formuleId)}
                  isLoading={isTogglingFavorite}
                />
              </div>
            </div>

            {/* Détails */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 mb-4">
              {formule.duration && (
                <span className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Timer className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  {formatDuration(formule.duration)}
                </span>
              )}
              {formule.serviceLocation && (
                <span className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center">
                    {formule.serviceLocation === "client_home" ? (
                      <Car className="w-3.5 h-3.5 text-gray-500" />
                    ) : (
                      <Home className="w-3.5 h-3.5 text-gray-500" />
                    )}
                  </div>
                  {locationLabels[formule.serviceLocation]}
                </span>
              )}
              {formule.numberOfSessions && formule.numberOfSessions > 1 && (
                <span className="flex items-center gap-1.5 text-purple-600">
                  <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  </div>
                  {formule.numberOfSessions} séances
                </span>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-auto">
              {/* Prochain créneau */}
              {formule.nextSlot && (
                <div className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                  <Zap className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-semibold text-emerald-700">
                    {formatNextSlotDate(formule.nextSlot.date)}
                  </span>
                  <span className="text-emerald-400">·</span>
                  <span className="text-sm text-emerald-600">{formatTime(formule.nextSlot.startTime)}</span>
                  {isCollective && formule.spotsLeft && (
                    <>
                      <span className="text-emerald-400">·</span>
                      <span className={cn(
                        "text-xs font-bold px-1.5 py-0.5 rounded-full",
                        formule.spotsLeft <= 2
                          ? "bg-orange-100 text-orange-600"
                          : "bg-emerald-100 text-emerald-600"
                      )}>
                        {formule.spotsLeft} place{formule.spotsLeft > 1 ? "s" : ""}
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* CTA - caché pour les annonceurs */}
              {!isAnnouncer && (
                <Link href={announcerBookingUrl} className="ml-auto">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="relative px-6 py-3 bg-gradient-to-r from-primary to-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 flex items-center gap-2 overflow-hidden group/btn"
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
    </motion.article>
  );
}
