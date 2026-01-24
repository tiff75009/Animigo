"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  Star,
  Heart,
  Shield,
  ShieldCheck,
  ArrowRight,
  MapPin,
  Navigation,
  Users,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { formatPrice, extractCity, formatDistance, priceUnitLabels } from "./helpers";
import { ANIMAL_TYPES } from "./constants";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

// Taux de commission (15%)
const COMMISSION_RATE = 15;

// Calculer le prix avec commission
function calculatePriceWithCommission(basePriceCents: number): number {
  const commission = Math.round((basePriceCents * COMMISSION_RATE) / 100);
  return basePriceCents + commission;
}

export interface ServiceSearchResult {
  serviceId: Id<"services">;
  announcerId: Id<"users">;
  announcerSlug: string;
  firstName: string;
  lastName: string;
  profileImage: string | null;
  coverImage: string | null;
  location: string;
  coordinates: { lat: number; lng: number } | null;
  distance?: number;
  rating: number;
  reviewCount: number;
  verified: boolean;
  isIdentityVerified: boolean;
  statusType: "particulier" | "micro_entrepreneur" | "professionnel";
  categorySlug: string;
  categoryName: string;
  categoryIcon: string;
  basePrice: number;
  basePriceUnit: "hour" | "day" | "week" | "month" | "flat";
  animalTypes: string[];
  variants: Array<{
    id: string;
    name: string;
    price: number;
    unit: string;
  }>;
  availability: {
    status: "available" | "partial" | "unavailable";
    nextAvailable?: string;
  };
  // Capacity info for garde categories (when dates are selected)
  capacityInfo?: {
    isCapacityBased: boolean;
    currentCount: number;
    maxCapacity: number;
    remainingCapacity: number;
  };
  // Price range for positioning indicator
  priceRange?: {
    min: number;
    max: number;
    avg: number;
  };
}

interface ServiceCardProps {
  service: ServiceSearchResult;
  onViewService: (announcerSlug: string, categorySlug: string) => void;
  index: number;
  hasDateFilter?: boolean; // Si des dates sont sélectionnées dans les filtres
  onCalendarOpen?: () => void; // Callback quand le calendrier s'ouvre (pour fermer les autres)
}

const availabilityConfig = {
  available: { color: "bg-emerald-500", text: "Disponible", textColor: "text-emerald-700", bg: "bg-emerald-50" },
  partial: { color: "bg-amber-500", text: "Partiellement dispo", textColor: "text-amber-700", bg: "bg-amber-50" },
  unavailable: { color: "bg-gray-400", text: "Indisponible", textColor: "text-gray-600", bg: "bg-gray-100" },
};

// Composant mini indicateur de prix
function MiniPriceIndicator({
  currentPrice,
  priceRange,
}: {
  currentPrice: number;
  priceRange: { min: number; max: number; avg: number };
}) {
  // Appliquer la commission aux prix de référence pour la comparaison
  const minWithCommission = calculatePriceWithCommission(priceRange.min);
  const maxWithCommission = calculatePriceWithCommission(priceRange.max);

  const range = maxWithCommission - minWithCommission;
  const position = range > 0
    ? Math.max(0, Math.min(100, ((currentPrice - minWithCommission) / range) * 100))
    : 50;

  // Déterminer le label et la couleur
  let label: string;
  let dotColor: string;

  if (currentPrice <= minWithCommission + range * 0.33) {
    label = "Bas";
    dotColor = "bg-green-500";
  } else if (currentPrice <= minWithCommission + range * 0.66) {
    label = "Moyen";
    dotColor = "bg-amber-500";
  } else {
    label = "Élevé";
    dotColor = "bg-red-400";
  }

  return (
    <div className="flex items-center gap-1.5 mt-1">
      {/* Mini barre de progression */}
      <div className="relative w-12 h-1.5 bg-gradient-to-r from-green-300 via-amber-300 to-red-300 rounded-full">
        <div
          className={cn("absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-white shadow-sm", dotColor)}
          style={{ left: `calc(${position}% - 4px)` }}
        />
      </div>
      <span className="text-[10px] text-gray-500">{label}</span>
    </div>
  );
}

// Mini calendrier pour vérifier les disponibilités (Bottom sheet sur mobile, modal sur desktop)
function AvailabilityCalendar({
  isOpen,
  onClose,
  announcerName,
  announcerId,
  categorySlug,
}: {
  isOpen: boolean;
  onClose: () => void;
  announcerName: string;
  announcerId: Id<"users">;
  categorySlug: string;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Calculer les dates de début et de fin pour la query
  const dateRange = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return { startDate, endDate };
  }, [currentMonth]);

  // Récupérer les disponibilités réelles (seulement si le modal est ouvert)
  const availability = useQuery(
    api.public.search.getAnnouncerAvailabilityCalendar,
    isOpen ? {
      announcerId,
      serviceCategory: categorySlug,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    } : "skip"
  );

  // Créer un map des statuts par date
  type AvailabilityStatus = "available" | "partial" | "unavailable" | "past";
  const availabilityMap = useMemo(() => {
    const map = new Map<string, AvailabilityStatus>();
    if (!availability?.calendar) return map;
    for (const a of availability.calendar) {
      map.set(a.date, a.status as AvailabilityStatus);
    }
    return map;
  }, [availability]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Lundi = 0

    const days: (number | null)[] = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  const today = new Date();

  const formatDateString = (day: number): string => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const isToday = (day: number) => {
    return day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear();
  };

  const getStatusForDay = (day: number): "available" | "partial" | "unavailable" | "past" | null => {
    const dateStr = formatDateString(day);
    return availabilityMap.get(dateStr) ?? null;
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const canGoPrev = currentMonth > new Date(today.getFullYear(), today.getMonth(), 1);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay - ferme au clic */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50"
            onClick={onClose}
          />

          {/* Bottom Sheet (mobile) / Modal centré (desktop) */}
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed z-50 bg-white shadow-xl",
              // Mobile: bottom sheet
              "inset-x-0 bottom-0 rounded-t-3xl max-h-[85vh] overflow-y-auto",
              // Desktop: modal centré
              "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:w-[360px] sm:max-h-[80vh]"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar (mobile only) */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            <div className="p-4 sm:p-5">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 text-lg">
                  Disponibilités de {announcerName}
                </h3>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Month navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={prevMonth}
                  disabled={!canGoPrev}
                  className={cn(
                    "p-2 rounded-full transition-colors",
                    canGoPrev ? "hover:bg-gray-100 active:bg-gray-200" : "opacity-30 cursor-not-allowed"
                  )}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="font-semibold text-gray-900">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
                <button
                  onClick={nextMonth}
                  className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-full transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"].map((day) => (
                  <div key={day} className="text-center text-xs text-gray-500 font-medium py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Days - with loading state */}
              {!availability?.calendar ? (
                <div className="flex items-center justify-center h-52">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {getDaysInMonth(currentMonth).map((day, index) => {
                    if (day === null) {
                      return <div key={index} className="aspect-square" />;
                    }

                    const status = getStatusForDay(day);

                    return (
                      <div
                        key={index}
                        className={cn(
                          "aspect-square flex items-center justify-center text-sm rounded-xl transition-colors font-medium",
                          // Passé
                          status === "past" && "text-gray-300",
                          // Disponible
                          status === "available" && "bg-emerald-100 text-emerald-700",
                          // Partiellement disponible
                          status === "partial" && "bg-amber-100 text-amber-700",
                          // Indisponible
                          status === "unavailable" && "bg-red-100 text-red-500",
                          // Pas de statut (fallback)
                          !status && "text-gray-400",
                          // Aujourd'hui
                          isToday(day) && "ring-2 ring-primary ring-offset-1"
                        )}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Légende */}
              <div className="flex items-center justify-center gap-4 mt-5 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-md bg-emerald-100" />
                  <span className="text-xs text-gray-600">Dispo</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-md bg-amber-100" />
                  <span className="text-xs text-gray-600">Partiel</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-md bg-red-100" />
                  <span className="text-xs text-gray-600">Indispo</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Grid View Card for Service
export function ServiceCardGrid({ service, onViewService, index, hasDateFilter = false, onCalendarOpen }: ServiceCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const availInfo = availabilityConfig[service.availability.status];
  const distanceText = formatDistance(service.distance);
  const city = extractCity(service.location);

  // Calculer le prix avec commission
  const priceWithCommission = calculatePriceWithCommission(service.basePrice);

  return (
    <div className="relative">
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.4 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-gray-200"
      >
        {/* Image Section - Cover Image */}
        <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-50 overflow-hidden">
          {service.coverImage ? (
            <Image
              src={service.coverImage}
              alt={`Couverture de ${service.firstName}`}
              fill
              className={cn(
                "object-cover transition-transform duration-500",
                isHovered && "scale-105"
              )}
            />
          ) : service.profileImage ? (
            <Image
              src={service.profileImage}
              alt={service.firstName}
              fill
              className={cn(
                "object-cover transition-transform duration-500",
                isHovered && "scale-105"
              )}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
              <span className="text-5xl">{service.categoryIcon}</span>
            </div>
          )}

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

          {/* Top badges */}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
            <div className="flex flex-col gap-2">
              {/* Category badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/95 backdrop-blur-sm rounded-full shadow-sm">
                <span className="text-sm">{service.categoryIcon}</span>
                <span className="text-xs font-medium text-gray-700">{service.categoryName}</span>
              </div>
              {service.isIdentityVerified && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary/10 backdrop-blur-sm rounded-full shadow-sm"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-secondary" />
                  <span className="text-xs font-medium text-secondary">Identité vérifiée</span>
                </motion.div>
              )}
            </div>

            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                setIsFavorite(!isFavorite);
              }}
              whileTap={{ scale: 0.85 }}
              className={cn(
                "p-2 rounded-full backdrop-blur-sm transition-all shadow-sm",
                isFavorite ? "bg-red-500 text-white" : "bg-white/95 text-gray-400 hover:text-red-500"
              )}
            >
              <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
            </motion.button>
          </div>

          {/* Avatar overlay - bottom left */}
          <div className="absolute bottom-3 left-3">
            <div className="w-14 h-14 rounded-xl overflow-hidden ring-2 ring-white shadow-lg bg-white">
              {service.profileImage ? (
                <Image
                  src={service.profileImage}
                  alt={service.firstName}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                  <span className="text-2xl">👤</span>
                </div>
              )}
            </div>
          </div>

          {/* Price badge */}
          {service.basePrice > 0 && (
            <div className="absolute bottom-3 right-3">
              <div className="px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-xl shadow-sm">
                <div className="text-center">
                  <span className="text-lg font-bold text-gray-900">{formatPrice(priceWithCommission)}</span>
                  <span className="text-sm text-gray-500">{priceUnitLabels[service.basePriceUnit] || ""}</span>
                </div>
                {service.priceRange && (
                  <MiniPriceIndicator currentPrice={priceWithCommission} priceRange={service.priceRange} />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors">
                {service.firstName} {service.lastName.charAt(0)}.
              </h3>
              <p className="text-sm text-gray-600 mt-0.5">{city}</p>
            </div>

            <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-lg">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-semibold text-gray-900">{service.rating.toFixed(1)}</span>
              <span className="text-xs text-gray-500">({service.reviewCount})</span>
            </div>
          </div>

          {/* Distance */}
          {distanceText && (
            <div className="flex items-center gap-1.5 mb-3">
              <Navigation className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm text-primary font-medium">{distanceText}</span>
            </div>
          )}

          {/* Status badge */}
          <div className="flex flex-wrap gap-2 mb-3">
            <span
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-lg",
                service.statusType === "professionnel"
                  ? "bg-blue-50 text-blue-600"
                  : service.statusType === "micro_entrepreneur"
                  ? "bg-purple-50 text-purple-600"
                  : "bg-gray-100 text-gray-600"
              )}
            >
              {service.statusType === "professionnel" ? "Professionnel" : service.statusType === "micro_entrepreneur" ? "Auto-entrepreneur" : "Particulier"}
            </span>

            {/* Availability badge - "Voir les dispo" si pas de date sélectionnée */}
            {!hasDateFilter ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCalendarOpen?.();
                  setShowCalendar(true);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Voir les dispo</span>
              </button>
            ) : (
              <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg", availInfo.bg)}>
                <span className={cn("w-2 h-2 rounded-full", availInfo.color)} />
                <span className={cn("text-xs font-medium", availInfo.textColor)}>{availInfo.text}</span>
              </div>
            )}

            {/* Capacity badge for garde services */}
            {service.capacityInfo && service.capacityInfo.isCapacityBased && service.capacityInfo.remainingCapacity > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50">
                <Users className="w-3 h-3 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-700">
                  {service.capacityInfo.remainingCapacity} place{service.capacityInfo.remainingCapacity > 1 ? "s" : ""} dispo
                </span>
              </div>
            )}
          </div>

          {/* Animals */}
          {service.animalTypes && service.animalTypes.length > 0 && (
            <div className="flex items-center gap-1 mb-4">
              <span className="text-xs text-gray-500 mr-1">Pour :</span>
              {service.animalTypes.slice(0, 4).map((animal, i) => {
                const animalInfo = ANIMAL_TYPES.find(a => a.id === animal);
                return (
                  <span key={i} className="text-base" title={animalInfo?.label}>
                    {animalInfo?.emoji || "🐾"}
                  </span>
                );
              })}
              {service.animalTypes.length > 4 && (
                <span className="text-xs text-gray-400">+{service.animalTypes.length - 4}</span>
              )}
            </div>
          )}


          {/* CTA */}
          <motion.button
            onClick={() => onViewService(service.announcerSlug, service.categorySlug)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 bg-gradient-to-r from-primary to-primary/90 text-white font-semibold rounded-xl shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center gap-2"
          >
            <span>Voir la prestation</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.article>

      {/* Calendrier modal */}
      <AvailabilityCalendar
        isOpen={showCalendar}
        onClose={() => setShowCalendar(false)}
        announcerName={service.firstName}
        announcerId={service.announcerId}
        categorySlug={service.categorySlug}
      />
    </div>
  );
}

// List View Card for Service
export function ServiceCardList({ service, onViewService, index, hasDateFilter = false, onCalendarOpen }: ServiceCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const availInfo = availabilityConfig[service.availability.status];
  const distanceText = formatDistance(service.distance);
  const city = extractCity(service.location);

  // Calculer le prix avec commission
  const priceWithCommission = calculatePriceWithCommission(service.basePrice);

  return (
    <div className="relative">
      <motion.article
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.03, duration: 0.3 }}
        className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-gray-200"
      >
        <div className="flex flex-col sm:flex-row">
          {/* Image Section - Cover Image */}
          <div className="relative w-full sm:w-48 md:w-56 h-48 sm:h-auto bg-gradient-to-br from-gray-100 to-gray-50 flex-shrink-0">
            {service.coverImage ? (
              <Image
                src={service.coverImage}
                alt={`Couverture de ${service.firstName}`}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : service.profileImage ? (
              <Image
                src={service.profileImage}
                alt={service.firstName}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                <span className="text-4xl">{service.categoryIcon}</span>
              </div>
            )}

            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

            {/* Category badge */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-0.5 bg-white/95 backdrop-blur-sm rounded-full shadow-sm">
              <span className="text-sm">{service.categoryIcon}</span>
              <span className="text-[10px] font-medium text-gray-700">{service.categoryName}</span>
            </div>

            {/* Avatar overlay - bottom left */}
            <div className="absolute bottom-3 left-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden ring-2 ring-white shadow-lg bg-white">
                {service.profileImage ? (
                  <Image
                    src={service.profileImage}
                    alt={service.firstName}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                    <span className="text-xl">👤</span>
                  </div>
                )}
              </div>
            </div>

            {/* Favorite button */}
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                setIsFavorite(!isFavorite);
              }}
              whileTap={{ scale: 0.85 }}
              className={cn(
                "absolute top-3 right-3 p-1.5 rounded-full backdrop-blur-sm transition-all shadow-sm",
                isFavorite ? "bg-red-500 text-white" : "bg-white/95 text-gray-400 hover:text-red-500"
              )}
            >
              <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
            </motion.button>
          </div>

          {/* Content Section */}
          <div className="flex-1 p-4 sm:p-5 flex flex-col">
            {/* Top row */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors">
                    {service.firstName} {service.lastName.charAt(0)}.
                  </h3>
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 rounded-full">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-semibold text-gray-900">{service.rating.toFixed(1)}</span>
                    <span className="text-xs text-gray-500">({service.reviewCount})</span>
                  </div>
                </div>

                {/* Location & Distance */}
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <div className="flex items-center gap-1 text-gray-600">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="text-sm">{city}</span>
                  </div>
                  {distanceText && (
                    <div className="flex items-center gap-1 text-primary">
                      <Navigation className="w-3.5 h-3.5" />
                      <span className="text-sm font-medium">{distanceText}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Price & Availability */}
              <div className="text-right flex-shrink-0">
                {service.basePrice > 0 && (
                  <div className="mb-1">
                    <span className="text-xl font-bold text-gray-900">{formatPrice(priceWithCommission)}</span>
                    <span className="text-sm text-gray-500">{priceUnitLabels[service.basePriceUnit] || ""}</span>
                    {service.priceRange && (
                      <div className="flex justify-end">
                        <MiniPriceIndicator currentPrice={priceWithCommission} priceRange={service.priceRange} />
                      </div>
                    )}
                  </div>
                )}

                {/* Availability badge - "Voir les dispo" si pas de date sélectionnée */}
                {!hasDateFilter ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCalendarOpen?.();
                      setShowCalendar(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    <Calendar className="w-3 h-3" />
                    Voir les dispo
                  </button>
                ) : (
                  <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium", availInfo.bg, availInfo.textColor)}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", availInfo.color)} />
                    {availInfo.text}
                  </div>
                )}
              </div>
            </div>

            {/* Middle: Tags & Animals */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span
                className={cn(
                  "px-2 py-0.5 text-xs font-medium rounded-md",
                  service.statusType === "professionnel"
                    ? "bg-blue-50 text-blue-600"
                    : service.statusType === "micro_entrepreneur"
                    ? "bg-purple-50 text-purple-600"
                    : "bg-gray-100 text-gray-600"
                )}
              >
                {service.statusType === "professionnel" ? "Pro" : service.statusType === "micro_entrepreneur" ? "Auto-entrepreneur" : "Particulier"}
              </span>

              {service.isIdentityVerified && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-secondary/10 text-secondary rounded-md">
                  <ShieldCheck className="w-3 h-3" />
                  Identité vérifiée
                </span>
              )}

              {/* Capacity badge for garde services */}
              {service.capacityInfo && service.capacityInfo.isCapacityBased && service.capacityInfo.remainingCapacity > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-md">
                  <Users className="w-3 h-3" />
                  {service.capacityInfo.remainingCapacity} place{service.capacityInfo.remainingCapacity > 1 ? "s" : ""} dispo
                </span>
              )}

              {/* Animals */}
              {service.animalTypes && service.animalTypes.length > 0 && (
                <>
                  <span className="text-gray-300">•</span>
                  <div className="flex items-center gap-0.5">
                    {service.animalTypes.slice(0, 5).map((animal, i) => {
                      const animalInfo = ANIMAL_TYPES.find(a => a.id === animal);
                      return (
                        <span key={i} className="text-sm" title={animalInfo?.label}>
                          {animalInfo?.emoji || "🐾"}
                        </span>
                      );
                    })}
                    {service.animalTypes.length > 5 && (
                      <span className="text-xs text-gray-400 ml-0.5">+{service.animalTypes.length - 5}</span>
                    )}
                  </div>
                </>
              )}
            </div>


            {/* Bottom: CTA */}
            <div className="mt-auto pt-2">
              <motion.button
                onClick={() => onViewService(service.announcerSlug, service.categorySlug)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-primary to-primary/90 text-white font-semibold rounded-xl shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center gap-2"
              >
                <span>Voir la prestation</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.article>

      {/* Calendrier modal */}
      <AvailabilityCalendar
        isOpen={showCalendar}
        onClose={() => setShowCalendar(false)}
        announcerName={service.firstName}
        announcerId={service.announcerId}
        categorySlug={service.categorySlug}
      />
    </div>
  );
}
