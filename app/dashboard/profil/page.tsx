"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import {
  CheckCircle,
  Home,
  Building2,
  TreeDeciduous,
  Baby,
  Heart,
  Calendar,
  Euro,
  Utensils,
  Star,
  Edit,
  XCircle,
  Ban,
  TrendingUp,
  TrendingDown,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Car,
  Cigarette,
  CigaretteOff,
  Plus,
  Trash2,
  PawPrint,
  Loader2,
  ArrowUp,
} from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/app/hooks/useAuth";
import { mockReviews, calculateStats } from "@/app/lib/dashboard-data";
import { cn } from "@/app/lib/utils";
import Link from "next/link";
import { Eye } from "lucide-react";
import ProfileHeader from "../components/ProfileHeader";
import ProfileCompletionBar from "../components/ProfileCompletionBar";
import ProfileSettingsSection from "../components/ProfileSettingsSection";
import ActivitiesSection from "../components/ActivitiesSection";
import EnvironmentPhotosSection from "../components/EnvironmentPhotosSection";
import { Id } from "@/convex/_generated/dataModel";

// Mapping des catégories de services
const CATEGORY_INFO: Record<string, { name: string; emoji: string }> = {
  garde: { name: "Garde", emoji: "🏠" },
  promenade: { name: "Promenade", emoji: "🚶" },
  toilettage: { name: "Toilettage", emoji: "🛁" },
  dressage: { name: "Dressage", emoji: "🎓" },
  agilite: { name: "Agilité", emoji: "🏃" },
  transport: { name: "Transport", emoji: "🚗" },
  pension: { name: "Pension", emoji: "🏨" },
  visite: { name: "Visite", emoji: "👋" },
  medical: { name: "Soins médicaux", emoji: "💊" },
  autre: { name: "Autre", emoji: "✨" },
};

const PRICE_UNIT_LABELS: Record<string, string> = {
  hour: "/h",
  half_day: "/½j",
  day: "/jour",
  week: "/sem",
  month: "/mois",
  flat: "",
};

function formatPriceCents(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }) + " €";
}

// Détermine le prix d'affichage d'une variante à partir de l'objet pricing (multi-tarification)
// Même logique que FormulasDropdown : daily > hourly > halfDaily > weekly > monthly > fallback price
interface VariantPriceInfo {
  name: string;
  price: number; // variant.price brut (centimes) — souvent le tarif horaire dérivé
  priceUnit: string;
  pricing?: {
    hourly?: number;
    halfDaily?: number;
    daily?: number;
    weekly?: number;
    monthly?: number;
    nightly?: number;
  };
  numberOfSessions?: number;
  sessionType?: string;
}

function getVariantDisplayPrice(variant: VariantPriceInfo): { price: number; unitLabel: string; unitKey: string } {
  const p = variant.pricing;
  if (p?.daily) return { price: p.daily, unitLabel: "/jour", unitKey: "day" };
  if (p?.hourly) return { price: p.hourly, unitLabel: "/h", unitKey: "hour" };
  if (p?.halfDaily) return { price: p.halfDaily, unitLabel: "/½j", unitKey: "half_day" };
  if (p?.weekly) return { price: p.weekly, unitLabel: "/sem", unitKey: "week" };
  if (p?.monthly) return { price: p.monthly, unitLabel: "/mois", unitKey: "month" };
  return { price: variant.price, unitLabel: PRICE_UNIT_LABELS[variant.priceUnit] || "", unitKey: variant.priceUnit };
}

// Ligne de prix par catégorie avec comparaison au prix conseillé
function CategoryPricingRow({ token, category, variants }: {
  token: string;
  category: string;
  variants: VariantPriceInfo[];
}) {
  // Récupérer le prix d'affichage pour chaque variante (depuis pricing ou price)
  const displayPrices = variants.map(v => ({
    ...getVariantDisplayPrice(v),
    sessions: v.numberOfSessions || 1,
    sessionType: v.sessionType,
  }));

  const primaryDisplay = displayPrices[0];
  const displayUnitKey = primaryDisplay.unitKey;
  const displayUnitLabel = primaryDisplay.unitLabel;

  // Moyenne des prix d'affichage (dans l'unité visuelle correcte)
  const avgDisplayPrice = Math.round(
    displayPrices.reduce((sum, d) => sum + d.price, 0) / displayPrices.length
  );

  // Info multi-séances / collectif
  const hasMultiSession = displayPrices.some(d => d.sessions > 1);
  const hasCollective = displayPrices.some(d => d.sessionType === "collective");

  // Appeler la recommendation dans l'unité D'AFFICHAGE (pas l'unité brute variant.price)
  // Le backend utilise maintenant pricing.daily/hourly/etc. selon l'unité demandée
  const recommendation = useQuery(
    api.services.pricing.getPriceRecommendation,
    { token, category, priceUnit: displayUnitKey as "hour" | "half_day" | "day" | "week" | "month" | "flat" }
  );

  const catInfo = CATEGORY_INFO[category] || { name: category, emoji: "🐾" };

  if (!recommendation) {
    return (
      <div className="p-3 rounded-xl bg-gray-50 animate-pulse h-24" />
    );
  }

  // Les valeurs de recommendation sont maintenant dans la bonne unité (ex: €/jour pour garde)
  const { recommendedRange, avgPrice: recAvg } = recommendation;

  // Étendre la plage pour toujours inclure le prix de l'annonceur
  const effectiveMin = Math.min(recommendation.minPrice, avgDisplayPrice);
  const effectiveMax = Math.max(recommendation.maxPrice, avgDisplayPrice);

  // Ajouter 10% de marge de chaque côté pour que le point ne colle pas aux bords
  const padding = (effectiveMax - effectiveMin) * 0.1 || 1;
  const barMin = effectiveMin - padding;
  const barMax = effectiveMax + padding;
  const barRange = barMax - barMin;

  // Position précise du point (centré via translateX)
  const dotPosition = barRange > 0 ? ((avgDisplayPrice - barMin) / barRange) * 100 : 50;

  // Zone conseillée positionnée sur la même échelle
  const zoneLeftPct = barRange > 0 ? ((recommendedRange.low - barMin) / barRange) * 100 : 10;
  const zoneRightPct = barRange > 0 ? ((recommendedRange.high - barMin) / barRange) * 100 : 90;
  const zoneWidthPct = zoneRightPct - zoneLeftPct;

  // Marqueur de la moyenne conseillée
  const avgMarkerPct = barRange > 0 ? ((recAvg - barMin) / barRange) * 100 : 50;

  const isInRange = avgDisplayPrice >= recommendedRange.low && avgDisplayPrice <= recommendedRange.high;
  const isBelow = avgDisplayPrice < recommendedRange.low;

  const diffPercent = recAvg > 0
    ? Math.round(((avgDisplayPrice - recAvg) / recAvg) * 100)
    : 0;

  const statusColor = isInRange ? "green" : isBelow ? "amber" : "orange";
  const statusBg = { green: "bg-green-500", amber: "bg-amber-500", orange: "bg-orange-500" }[statusColor];
  const statusBgLight = { green: "bg-green-100", amber: "bg-amber-100", orange: "bg-orange-100" }[statusColor];
  const statusText = { green: "text-green-700", amber: "text-amber-700", orange: "text-orange-700" }[statusColor];
  const statusBorder = { green: "border-green-500", amber: "border-amber-500", orange: "border-orange-500" }[statusColor];

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100/80 transition-colors">
      {/* Emoji catégorie */}
      <span className="text-lg flex-shrink-0">{catInfo.emoji}</span>

      {/* Nom + formules */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-foreground">{catInfo.name}</span>
          <span className="text-[10px] text-text-light">
            {variants.length} formule{variants.length > 1 ? "s" : ""}
          </span>
        </div>
        {/* Mini barre de positionnement */}
        <div className="relative h-1.5 mt-1.5 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="absolute top-0 h-full bg-green-200 rounded-full"
            style={{
              left: `${Math.max(0, zoneLeftPct)}%`,
              width: `${Math.min(100, zoneWidthPct)}%`,
            }}
          />
          <div
            className="absolute top-0 h-full w-px bg-green-400/70"
            style={{ left: `${avgMarkerPct}%` }}
          />
          <motion.div
            className={cn("absolute w-2.5 h-2.5 rounded-full border-[1.5px] border-white shadow-sm z-10", statusBg)}
            style={{
              left: `calc(${dotPosition}% - 5px)`,
              top: `calc(50% - 5px)`,
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          />
        </div>
        <div className="flex items-center gap-1 mt-1">
          <span className="text-[9px] text-text-light">{formatPriceCents(recommendedRange.low)}</span>
          <span className="text-[9px] text-text-light">—</span>
          <span className="text-[9px] text-green-600 font-medium">{formatPriceCents(recAvg)}</span>
          <span className="text-[9px] text-text-light">—</span>
          <span className="text-[9px] text-text-light">{formatPriceCents(recommendedRange.high)}</span>
        </div>
      </div>

      {/* Prix + badge statut */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className={cn("text-sm font-bold tabular-nums", statusText)}>
          {formatPriceCents(avgDisplayPrice)}{displayUnitLabel}
        </span>
        <span className={cn("flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full", statusBgLight, statusText)}>
          {isInRange ? (
            <><Check className="w-2.5 h-2.5" /> OK</>
          ) : isBelow ? (
            <><TrendingDown className="w-2.5 h-2.5" /> -{Math.abs(diffPercent)}%</>
          ) : (
            <><TrendingUp className="w-2.5 h-2.5" /> +{diffPercent}%</>
          )}
        </span>
      </div>
    </div>
  );
}

// Vue d'ensemble des tarifs par catégorie
function ServicePricingOverview({ token }: { token: string }) {
  const services = useQuery(api.services.services.getMyServices, { token });

  if (services === undefined) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!services || services.length === 0) {
    return (
      <div className="text-center py-6 space-y-2">
        <Euro className="w-8 h-8 text-gray-300 mx-auto" />
        <p className="text-sm text-text-light">Aucun service configuré</p>
        <Link href="/dashboard/services" className="text-xs text-primary font-medium hover:underline">
          Ajouter des services
        </Link>
      </div>
    );
  }

  // Grouper les variantes par catégorie avec toutes les infos de prix
  const categoriesMap = new Map<string, VariantPriceInfo[]>();

  for (const service of services) {
    if (!service.isActive) continue;
    const activeVariants = service.variants.filter((v: any) => v.isActive && v.price > 0);
    if (activeVariants.length === 0) continue;

    const existing = categoriesMap.get(service.category) || [];
    existing.push(...activeVariants.map((v: any) => ({
      name: v.name,
      price: v.price,
      priceUnit: v.priceUnit,
      pricing: v.pricing,
      numberOfSessions: v.numberOfSessions,
      sessionType: v.sessionType,
    })));
    categoriesMap.set(service.category, existing);
  }

  const categories = Array.from(categoriesMap.entries());

  if (categories.length === 0) {
    return (
      <div className="text-center py-6 space-y-2">
        <Euro className="w-8 h-8 text-gray-300 mx-auto" />
        <p className="text-sm text-text-light">Aucune formule active avec tarif</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {categories.map(([category, variants]) => (
        <CategoryPricingRow
          key={category}
          token={token}
          category={category}
          variants={variants}
        />
      ))}
    </div>
  );
}

// Mini-planning : même logique que MonthView mais en version compacte
// Fond = disponibilité, barres = missions + créneaux collectifs
interface AvailabilityCalendarProps {
  token: string | null;
}

// Couleurs des statuts de mission (identiques à types.ts du planning)
const missionStatusColors: Record<string, string> = {
  completed: "bg-green-500",
  in_progress: "bg-blue-500",
  upcoming: "bg-purple",
  pending_acceptance: "bg-amber-500",
  pending_confirmation: "bg-orange-500",
  refused: "bg-red-400",
  cancelled: "bg-gray-400",
};

function AvailabilityCalendar({ token }: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  const formatDate = (d: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  // 3 queries identiques au planning
  const availabilityData = useQuery(
    api.planning.availability.getAvailabilityByDateRange,
    token ? { token, startDate, endDate } : "skip"
  );

  const missionsData = useQuery(
    api.planning.missions.getMissionsByDateRange,
    token ? { token, startDate, endDate } : "skip"
  );

  const collectiveSlotsRaw = useQuery(
    api.planning.collectiveSlots.getSlotsByUser,
    token ? { token, startDate, endDate } : "skip"
  );

  // Fond du jour selon la logique :
  // Gris = indisponible (marqué par l'utilisateur)
  // Vert = disponible, aucune réservation
  // Orange = réservations mais encore des créneaux
  // Rouge = complet, plus de créneaux
  const getDayBg = React.useCallback((dateKey: string): { bg: string; status: "free" | "partial" | "full" | "unavailable" | "none" } => {
    const dayAvails = availabilityData?.filter((a: { date: string }) => a.date === dateKey) || [];
    const hasAvailable = dayAvails.some((a: { status: string }) => a.status === "available");
    const hasPartial = dayAvails.some((a: { status: string }) => a.status === "partial");
    const allUnavailable = dayAvails.length > 0 && dayAvails.every((a: { status: string }) => a.status === "unavailable");

    // Pas de dispo renseignée → neutre
    if (dayAvails.length === 0) return { bg: "", status: "none" };

    // Indisponible explicite → gris
    if (allUnavailable) return { bg: "bg-gray-100 border-gray-300", status: "unavailable" };

    // Compter les réservations sur ce jour
    const dayMissions = missionsData?.filter((m: { status: string; sessionType?: string; collectiveSlotDates?: string[]; sessions?: { date: string }[]; startDate: string; endDate: string }) => {
      if (m.status === "cancelled" || m.status === "refused") return false;
      if (m.sessionType === "collective" && m.collectiveSlotDates) return m.collectiveSlotDates.includes(dateKey);
      if (m.sessions && m.sessions.length > 0) return m.sessions.some((s: { date: string }) => s.date === dateKey);
      return m.startDate <= dateKey && m.endDate >= dateKey;
    }) || [];

    const daySlots = collectiveSlotsRaw?.filter(
      (s: { date: string; isCancelled: boolean; isActive: boolean }) =>
        s.date === dateKey && !s.isCancelled && s.isActive
    ) || [];

    const hasBookings = dayMissions.length > 0 || daySlots.some((s: { bookedAnimals: number }) => s.bookedAnimals > 0);

    if (!hasBookings) {
      // Aucune réservation → vert si dispo
      if (hasAvailable) return { bg: "bg-green-50 border-green-200", status: "free" };
      if (hasPartial) return { bg: "bg-orange-50 border-orange-200", status: "partial" };
      return { bg: "", status: "none" };
    }

    // A des réservations : encore de la place ?
    if (hasAvailable || hasPartial) {
      // Encore des créneaux disponibles → orange
      return { bg: "bg-orange-50 border-orange-200", status: "partial" };
    }

    // Plus de créneaux disponibles → rouge
    return { bg: "bg-red-50 border-red-200", status: "full" };
  }, [availabilityData, missionsData, collectiveSlotsRaw]);

  // Missions par date (même logique que getMissionsForDate du MonthView)
  const getMissionsForDate = React.useCallback((dateKey: string) => {
    if (!missionsData) return [];
    return missionsData.filter((m: { status: string; sessionType?: string; collectiveSlotDates?: string[]; sessions?: { date: string }[]; startDate: string; endDate: string }) => {
      if (m.status === "cancelled" || m.status === "refused") return false;
      if (m.sessionType === "collective" && m.collectiveSlotDates) {
        return m.collectiveSlotDates.includes(dateKey);
      }
      if (m.sessions && m.sessions.length > 0) {
        return m.sessions.some((s) => s.date === dateKey);
      }
      return m.startDate <= dateKey && m.endDate >= dateKey;
    });
  }, [missionsData]);

  // Créneaux collectifs par date
  const getSlotsForDate = React.useCallback((dateKey: string) => {
    if (!collectiveSlotsRaw) return [];
    return collectiveSlotsRaw.filter(
      (s: { date: string; isCancelled: boolean; isActive: boolean }) =>
        s.date === dateKey && !s.isCancelled && s.isActive
    );
  }, [collectiveSlotsRaw]);

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];
  const dayNames = ["L", "M", "M", "J", "V", "S", "D"];

  return (
    <div className="max-w-md mx-auto">
      {/* Header navigation */}
      <div className="flex items-center justify-between mb-3">
        <motion.button
          onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronLeft className="w-4 h-4 text-foreground" />
        </motion.button>
        <h4 className="text-sm font-semibold text-foreground">
          {monthNames[month]} {year}
        </h4>
        <motion.button
          onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronRight className="w-4 h-4 text-foreground" />
        </motion.button>
      </div>

      {/* Jours de la semaine */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {dayNames.map((day, i) => (
          <div key={i} className="text-center text-[11px] font-medium text-text-light py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Grille du calendrier */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: adjustedFirstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="h-14" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          const dateKey = formatDate(day);
          const isToday = dateKey === todayKey;
          const isPast = dateKey < todayKey;
          const { bg: bgClass } = getDayBg(dateKey);
          const dayMissions = getMissionsForDate(dateKey);
          const daySlots = getSlotsForDate(dateKey);

          // Nombre total d'événements
          const nonCollectiveMissions = dayMissions.filter((m: { sessionType?: string }) => m.sessionType !== "collective");
          const totalEvents = nonCollectiveMissions.length + daySlots.length;

          return (
            <div
              key={day}
              className={cn(
                "h-14 rounded-md border p-0.5 flex flex-col transition-colors overflow-hidden",
                isPast
                  ? "bg-gray-50 border-gray-100 opacity-50"
                  : isToday
                    ? "border-primary bg-primary/5"
                    : bgClass
                      ? bgClass
                      : "border-gray-100"
              )}
            >
              {/* Numéro du jour */}
              <span className={cn(
                "text-[10px] font-medium leading-none mb-0.5",
                isPast ? "text-gray-400" : isToday ? "text-primary font-bold" : "text-foreground"
              )}>
                {day}
              </span>

              {/* Événements (max 2 barres) */}
              <div className="flex-1 flex flex-col gap-px overflow-hidden">
                {/* Créneaux collectifs en priorité */}
                {daySlots.slice(0, 1).map((slot: { _id: string; bookings?: { animalEmoji: string }[]; bookedAnimals: number; maxAnimals: number; variantName?: string }) => (
                  <div
                    key={slot._id}
                    className={cn(
                      "h-2.5 rounded-sm text-white text-[7px] leading-[10px] px-0.5 truncate",
                      slot.bookings && slot.bookings.length > 0 ? "bg-purple-600" : "bg-purple-400"
                    )}
                  >
                    {slot.bookings && slot.bookings.length > 0
                      ? `${slot.bookings[0].animalEmoji} ${slot.bookedAnimals}/${slot.maxAnimals}`
                      : `${slot.bookedAnimals}/${slot.maxAnimals}`
                    }
                  </div>
                ))}

                {/* Missions (uni-séance, multi-séances - tout sauf collective) */}
                {nonCollectiveMissions.slice(0, daySlots.length > 0 ? 1 : 2).map((mission: { id: string; status: string; animal: { emoji: string; name: string }; animals?: { emoji: string; name: string }[]; sessionType?: string; numberOfSessions?: number }) => (
                  <div
                    key={mission.id}
                    className={cn(
                      "h-2.5 rounded-sm text-white text-[7px] leading-[10px] px-0.5 truncate",
                      missionStatusColors[mission.status] || "bg-gray-400"
                    )}
                  >
                    {mission.animals && mission.animals.length > 1
                      ? mission.animals.map((a) => a.emoji).join("")
                      : `${mission.animal.emoji} ${mission.animal.name}`
                    }
                  </div>
                ))}

                {/* Indicateur +N si plus d'événements */}
                {totalEvents > 2 && (
                  <span className="text-[7px] text-text-light leading-none">+{totalEvents - 2}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Légende */}
      <div className="space-y-1.5 mt-3 pt-3 border-t border-foreground/10">
        {/* Fond de cellule */}
        <div className="flex items-center justify-center gap-2.5">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-green-50 border border-green-200" />
            <span className="text-[10px] text-text-light">Libre</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-orange-50 border border-orange-200" />
            <span className="text-[10px] text-text-light">Partiel</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-red-50 border border-red-200" />
            <span className="text-[10px] text-text-light">Complet</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-gray-100 border border-gray-300" />
            <span className="text-[10px] text-text-light">Indispo</span>
          </div>
        </div>
        {/* Barres d'événements */}
        <div className="flex items-center justify-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-4 h-2 rounded-sm bg-purple-600" />
            <span className="text-[10px] text-text-light">Collectif</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-2 rounded-sm bg-purple" />
            <span className="text-[10px] text-text-light">A venir</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-2 rounded-sm bg-blue-500" />
            <span className="text-[10px] text-text-light">En cours</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-2 rounded-sm bg-amber-500" />
            <span className="text-[10px] text-text-light">A traiter</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const mockAcceptedAnimalTypes = [
  { type: "Chien", emoji: "🐕", accepted: true },
  { type: "Chat", emoji: "🐈", accepted: true },
  { type: "Lapin", emoji: "🐰", accepted: true },
  { type: "Rongeur", emoji: "🐹", accepted: true },
  { type: "Oiseau", emoji: "🦜", accepted: false },
  { type: "Reptile", emoji: "🦎", accepted: false },
];

// Types d'animaux pour l'affichage
const ANIMAL_TYPE_OPTIONS = [
  { value: "chien", label: "Chien", emoji: "🐕" },
  { value: "chat", label: "Chat", emoji: "🐈" },
  { value: "lapin", label: "Lapin", emoji: "🐰" },
  { value: "rongeur", label: "Rongeur", emoji: "🐹" },
  { value: "oiseau", label: "Oiseau", emoji: "🦜" },
  { value: "reptile", label: "Reptile", emoji: "🦎" },
  { value: "poisson", label: "Poisson", emoji: "🐠" },
  { value: "autre", label: "Autre", emoji: "🐾" },
];

export default function ProfilePage() {
  const { user, token, isLoading: authLoading } = useAuth();
  const stats = calculateStats();
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Récupérer le profil Convex
  const profileData = useQuery(
    api.services.profile.getProfile,
    token ? { token } : "skip"
  );

  // Mutations
  const upsertProfile = useMutation(api.services.profile.upsertProfile);

  // État de chargement
  const isLoading = authLoading || profileData === undefined;

  // Données du profil
  const userInfo = profileData?.user;
  const profile = profileData?.profile;

  // Photo de profil depuis le profil (URL Cloudinary)
  const profileImageUrl = profile?.profileImageUrl || null;

  // Calculer le pourcentage de complétion du profil
  const profileCompletionData = {
    hasProfilePhoto: !!profileImageUrl,
    hasCoverPhoto: !!profile?.coverImageUrl,
    hasDescription: !!profile?.description && profile.description.trim().length > 0,
    hasLocation: !!profile?.city || !!profile?.location,
    hasRadius: !!profile?.radius && profile.radius > 0,
    hasAcceptedAnimals: !!profile?.acceptedAnimals && profile.acceptedAnimals.length > 0,
    hasEquipments: profile?.hasGarden !== undefined || profile?.hasVehicle !== undefined,
    hasMaxAnimals: !!profile?.maxAnimalsPerSlot && profile.maxAnimalsPerSlot > 0,
    hasServices: true, // TODO: vérifier les services
    hasAvailability: true, // TODO: vérifier les disponibilités
    hasIcad: profile?.icadRegistered !== undefined && profile?.icadRegistered !== null,
  };

  // Handlers pour les modifications
  const handleUpdateDescription = useCallback(async (description: string) => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, description: description || null });
  }, [token, upsertProfile]);

  const handleUpdateLocation = useCallback(async (data: {
    location: string;
    city?: string;
    postalCode?: string;
    department?: string;
    region?: string;
    coordinates?: { lat: number; lng: number };
    googlePlaceId?: string;
  }) => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({
      token,
      location: data.location || null,
      city: data.city || null,
      postalCode: data.postalCode || null,
      department: data.department || null,
      region: data.region || null,
      coordinates: data.coordinates || null,
      googlePlaceId: data.googlePlaceId || null,
    });
  }, [token, upsertProfile]);

  const handleUploadAvatar = useCallback(async (cloudinaryUrl: string) => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, profileImageUrl: cloudinaryUrl });
  }, [token, upsertProfile]);

  const handleRemoveAvatar = useCallback(async () => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, profileImageUrl: null });
  }, [token, upsertProfile]);

  const handleUploadCover = useCallback(async (cloudinaryUrl: string) => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, coverImageUrl: cloudinaryUrl });
  }, [token, upsertProfile]);

  const handleRemoveCover = useCallback(async () => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, coverImageUrl: null });
  }, [token, upsertProfile]);

  // Handlers pour les paramètres du profil
  const handleRadiusChange = useCallback(async (radius: number) => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, radius });
  }, [token, upsertProfile]);

  const handleAcceptedAnimalsChange = useCallback(async (animals: string[]) => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, acceptedAnimals: animals });
  }, [token, upsertProfile]);

  const handleHasGardenChange = useCallback(async (hasGarden: boolean) => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, hasGarden });
  }, [token, upsertProfile]);

  const handleHasVehicleChange = useCallback(async (hasVehicle: boolean) => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, hasVehicle });
  }, [token, upsertProfile]);

  const handleMaxAnimalsChange = useCallback(async (maxAnimalsPerSlot: number) => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, maxAnimalsPerSlot });
  }, [token, upsertProfile]);

  // Handlers pour les conditions de garde
  const handleHousingTypeChange = useCallback(async (housingType: "house" | "apartment") => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, housingType });
  }, [token, upsertProfile]);

  const handleHousingSizeChange = useCallback(async (housingSize: number) => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, housingSize });
  }, [token, upsertProfile]);

  const handleGardenSizeChange = useCallback(async (gardenSize: string | null) => {
    if (!token) throw new Error("Non authentifié");
    if (gardenSize === null) {
      await upsertProfile({ token, hasGarden: false, gardenSize: null });
    } else {
      await upsertProfile({ token, hasGarden: true, gardenSize });
    }
  }, [token, upsertProfile]);

  const handleIsSmokerChange = useCallback(async (isSmoker: boolean) => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, isSmoker });
  }, [token, upsertProfile]);

  const handleHasChildrenChange = useCallback(async (hasChildren: boolean, childrenAges?: string[]) => {
    if (!token) throw new Error("Non authentifié");
    if (hasChildren && childrenAges) {
      await upsertProfile({ token, hasChildren, childrenAges });
    } else {
      await upsertProfile({ token, hasChildren: false, childrenAges: null });
    }
  }, [token, upsertProfile]);

  const handleChildrenAgesChange = useCallback(async (childrenAges: string[]) => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, childrenAges });
  }, [token, upsertProfile]);

  const handleProvidesFoodChange = useCallback(async (providesFood: boolean) => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, providesFood });
  }, [token, upsertProfile]);

  const handleOwnedAnimalsChange = useCallback(async (ownedAnimals: Array<{ type: string; name: string; breed?: string; age?: number }>) => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, ownedAnimals: ownedAnimals.length > 0 ? ownedAnimals : null });
  }, [token, upsertProfile]);

  const handleSelectedActivitiesChange = useCallback(async (selectedActivities: Array<{ activityId: Id<"activities">; customDescription?: string }>) => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, selectedActivities: selectedActivities.length > 0 ? selectedActivities : null });
  }, [token, upsertProfile]);

  const handleEnvironmentPhotosChange = useCallback(async (environmentPhotos: Array<{ id: string; url: string; caption?: string }>) => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, environmentPhotos: environmentPhotos.length > 0 ? environmentPhotos : null });
  }, [token, upsertProfile]);

  const handleUpdateIcad = useCallback(async (icadRegistered: boolean) => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, icadRegistered });
  }, [token, upsertProfile]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-text-light">Chargement du profil...</p>
          </div>
        </div>
      </div>
    );
  }

  // Si pas de données utilisateur
  if (!userInfo) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <p className="text-red-700">Impossible de charger le profil. Veuillez vous reconnecter.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Mon profil
          </h1>
          <p className="text-text-light mt-1">
            Votre annonce visible par les propriétaires d&apos;animaux
          </p>
        </div>
        {user?.username && (
          <Link
            href={`/profil/${user.username}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm w-fit"
          >
            <Eye className="w-4 h-4" />
            Voir mon profil
          </Link>
        )}
      </motion.div>

      {/* Profile Completion Bar */}
      <ProfileCompletionBar profileData={profileCompletionData} />

      {/* Profile Header avec bannière */}
      <div id="section-profile-header">
      <ProfileHeader
        firstName={userInfo.firstName}
        lastName={userInfo.lastName}
        profileImage={profileImageUrl}
        coverImage={profile?.coverImageUrl}
        location={profile?.location}
        city={profile?.city}
        postalCode={profile?.postalCode}
        region={profile?.region}
        memberSince={user?.createdAt}
        verified={user?.emailVerified || false}
        rating={stats.averageRating}
        reviewCount={stats.totalReviews}
        responseRate={0}
        responseTime={undefined}
        description={profile?.description}
        icadRegistered={profile?.icadRegistered}
        isEditable={true}
        onUpdateDescription={handleUpdateDescription}
        onUpdateLocation={handleUpdateLocation}
        onUpdateIcad={handleUpdateIcad}
        onUploadAvatar={handleUploadAvatar}
        onRemoveAvatar={handleRemoveAvatar}
        onUploadCover={handleUploadCover}
        onRemoveCover={handleRemoveCover}
      />
      </div>

      {/* Rayon d'intervention */}
      <div id="section-radius">
      <ProfileSettingsSection
        radius={profile?.radius || 20}
        onRadiusChange={handleRadiusChange}
        acceptedAnimals={[]}
        isEditable={true}
        showOnlyRadius={true}
      />
      </div>

      {/* Availability & Pricing - Side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Availability Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="bg-white rounded-3xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Mes disponibilités
            </h3>
            <Link
              href="/dashboard/planning"
              className="text-sm text-primary font-medium hover:underline"
            >
              Gérer
            </Link>
          </div>
          <AvailabilityCalendar token={token} />
        </motion.div>

        {/* Pricing Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-3xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Euro className="w-5 h-5 text-primary" />
              Tarifs
            </h3>
            <Link
              href="/dashboard/services"
              className="text-xs text-primary font-medium hover:underline"
            >
              Gérer
            </Link>
          </div>
          {token && <ServicePricingOverview token={token} />}
          <div className="mt-3 p-2 bg-blue-50 rounded-xl flex items-center gap-2 text-xs text-blue-700">
            <span>💡</span>
            <span>Vos tarifs comparés aux prix conseillés de la plateforme.</span>
          </div>
        </motion.div>
      </div>

      {/* Accepted Animals & Capacity & Equipment */}
      <motion.div
        id="section-animaux"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-3xl shadow-lg p-6"
      >
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Heart className="w-5 h-5 text-primary" />
          Animaux acceptés
        </h3>

        {/* Capacité maximale */}
        <div className="mb-6">
          <p className="text-sm font-medium text-foreground mb-3">Capacité maximale</p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <motion.button
                key={num}
                type="button"
                onClick={() => handleMaxAnimalsChange(num)}
                className={cn(
                  "w-12 h-12 rounded-xl border-2 font-semibold text-lg transition-all",
                  profile?.maxAnimalsPerSlot === num
                    ? "border-primary bg-primary text-white"
                    : "border-foreground/10 bg-white text-foreground hover:border-foreground/20"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {num}
              </motion.button>
            ))}
          </div>
          {!profile?.maxAnimalsPerSlot && (
            <p className="text-xs text-amber-500 mt-2">
              Sélectionnez une capacité maximale
            </p>
          )}
        </div>

        {/* Types d'animaux */}
        <div className="mb-6">
          <p className="text-sm font-medium text-foreground mb-3">Types d&apos;animaux</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {mockAcceptedAnimalTypes.map((animal) => {
              const isAccepted = profile?.acceptedAnimals?.includes(animal.type.toLowerCase()) ?? false;
              return (
                <motion.button
                  key={animal.type}
                  type="button"
                  onClick={() => {
                    const animalId = animal.type.toLowerCase();
                    const currentAnimals = profile?.acceptedAnimals || [];
                    if (isAccepted) {
                      handleAcceptedAnimalsChange(currentAnimals.filter((a: string) => a !== animalId));
                    } else {
                      handleAcceptedAnimalsChange([...currentAnimals, animalId]);
                    }
                  }}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer",
                    isAccepted
                      ? "bg-green-50 border-2 border-green-300"
                      : "bg-gray-50 border-2 border-gray-200 hover:border-gray-300"
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="text-2xl">{animal.emoji}</span>
                  <span className={cn(
                    "font-medium",
                    isAccepted ? "text-green-700" : "text-gray-500"
                  )}>
                    {animal.type}
                  </span>
                  {isAccepted ? (
                    <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-300 ml-auto" />
                  )}
                </motion.button>
              );
            })}
          </div>
          {(!profile?.acceptedAnimals || profile.acceptedAnimals.length === 0) && (
            <p className="text-xs text-amber-500 mt-2">
              Sélectionnez au moins un type d&apos;animal
            </p>
          )}
        </div>

        {/* Équipements */}
        <div>
          <p className="text-sm font-medium text-foreground mb-3">Équipements</p>
          <div className="flex flex-wrap gap-3">
            <motion.button
              type="button"
              onClick={() => handleHasVehicleChange(!profile?.hasVehicle)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all",
                profile?.hasVehicle
                  ? "border-secondary bg-secondary/5 text-secondary"
                  : "border-foreground/10 bg-white text-foreground hover:border-foreground/20"
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className={cn(
                "p-2 rounded-lg",
                profile?.hasVehicle ? "bg-secondary/10" : "bg-foreground/5"
              )}>
                <Car className="w-5 h-5" />
              </div>
              <span className="font-medium">J&apos;ai un véhicule</span>
              {profile?.hasVehicle && <CheckCircle className="w-5 h-5 ml-2" />}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Housing Conditions - Style Cards */}
      <motion.div
        id="section-conditions"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-white rounded-3xl shadow-lg p-6"
      >
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Home className="w-5 h-5 text-primary" />
          Conditions de garde
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Type de logement */}
          <motion.button
            type="button"
            onClick={() => handleHousingTypeChange(profile?.housingType === "house" ? "apartment" : "house")}
            className="group relative flex items-center gap-4 p-4 bg-background rounded-xl hover:bg-primary/5 transition-colors text-left"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-foreground/5 group-hover:bg-primary/10 transition-colors">
              <Edit className="w-3.5 h-3.5 text-foreground/40 group-hover:text-primary transition-colors" />
            </div>
            <div className={cn(
              "p-3 rounded-xl",
              profile?.housingType ? "bg-primary/10" : "bg-amber-100"
            )}>
              {profile?.housingType === "house" ? (
                <Home className="w-6 h-6 text-primary" />
              ) : profile?.housingType === "apartment" ? (
                <Building2 className="w-6 h-6 text-primary" />
              ) : (
                <Home className="w-6 h-6 text-amber-500" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">
                {profile?.housingType === "house" ? "🏠 Maison" : profile?.housingType === "apartment" ? "🏢 Appartement" : "Type de logement ?"}
              </p>
              {profile?.housingType ? (
                <p className="text-sm text-text-light flex items-center gap-1">
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={profile?.housingSize || ""}
                    placeholder="?"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val > 0) handleHousingSizeChange(val);
                    }}
                    className="w-12 px-1 py-0.5 text-sm text-center bg-transparent border-b border-dashed border-foreground/30 focus:border-primary focus:outline-none font-medium text-foreground"
                  />
                  m²
                </p>
              ) : (
                <p className="text-sm text-amber-600">À renseigner</p>
              )}
            </div>
          </motion.button>

          {/* Jardin */}
          <motion.button
            type="button"
            onClick={() => {
              const sizes = [null, "petit", "moyen", "grand"];
              const currentIdx = profile?.hasGarden ? sizes.indexOf(profile?.gardenSize || "petit") : 0;
              const nextIdx = (currentIdx + 1) % sizes.length;
              handleGardenSizeChange(sizes[nextIdx]);
            }}
            className="group relative flex items-center gap-4 p-4 bg-background rounded-xl hover:bg-green-50 transition-colors text-left"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-foreground/5 group-hover:bg-green-100 transition-colors">
              <Edit className="w-3.5 h-3.5 text-foreground/40 group-hover:text-green-600 transition-colors" />
            </div>
            <div className={cn(
              "p-3 rounded-xl",
              profile?.hasGarden ? "bg-green-100" : "bg-gray-100"
            )}>
              <TreeDeciduous className={cn(
                "w-6 h-6",
                profile?.hasGarden ? "text-green-600" : "text-gray-400"
              )} />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {profile?.hasGarden
                  ? `🌳 ${profile?.gardenSize === "petit" ? "Petit jardin" : profile?.gardenSize === "moyen" ? "Jardin moyen" : "Grand jardin"}`
                  : "🚫 Pas de jardin"}
              </p>
            </div>
          </motion.button>

          {/* Fumeur */}
          <motion.button
            type="button"
            onClick={() => handleIsSmokerChange(!(profile?.isSmoker ?? false))}
            className="group relative flex items-center gap-4 p-4 bg-background rounded-xl hover:bg-green-50 transition-colors text-left"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-foreground/5 group-hover:bg-green-100 transition-colors">
              <Edit className="w-3.5 h-3.5 text-foreground/40 group-hover:text-green-600 transition-colors" />
            </div>
            <div className={cn(
              "p-3 rounded-xl",
              profile?.isSmoker === false ? "bg-green-100" : profile?.isSmoker === true ? "bg-orange-100" : "bg-amber-100"
            )}>
              {profile?.isSmoker === true ? (
                <Cigarette className="w-6 h-6 text-orange-600" />
              ) : profile?.isSmoker === false ? (
                <CigaretteOff className="w-6 h-6 text-green-600" />
              ) : (
                <CigaretteOff className="w-6 h-6 text-amber-500" />
              )}
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {profile?.isSmoker === true ? "🚬 Fumeur" : profile?.isSmoker === false ? "🚭 Non-fumeur" : "Fumeur ?"}
              </p>
              {profile?.isSmoker === undefined && (
                <p className="text-sm text-amber-600">À renseigner</p>
              )}
            </div>
          </motion.button>

          {/* Enfants */}
          <motion.button
            type="button"
            onClick={() => handleHasChildrenChange(!(profile?.hasChildren ?? false), profile?.childrenAges || [])}
            className="group relative flex items-center gap-4 p-4 bg-background rounded-xl hover:bg-secondary/5 transition-colors text-left"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-foreground/5 group-hover:bg-secondary/10 transition-colors">
              <Edit className="w-3.5 h-3.5 text-foreground/40 group-hover:text-secondary transition-colors" />
            </div>
            <div className={cn(
              "p-3 rounded-xl",
              profile?.hasChildren ? "bg-secondary/10" : profile?.hasChildren === false ? "bg-gray-100" : "bg-amber-100"
            )}>
              <Baby className={cn(
                "w-6 h-6",
                profile?.hasChildren ? "text-secondary" : profile?.hasChildren === false ? "text-gray-400" : "text-amber-500"
              )} />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {profile?.hasChildren ? "👶 Enfants présents" : profile?.hasChildren === false ? "👤 Pas d'enfants" : "Enfants ?"}
              </p>
              {profile?.hasChildren && profile?.childrenAges && profile.childrenAges.length > 0 && (
                <p className="text-sm text-text-light">
                  {profile.childrenAges.map((a: string) => a === "0-3" ? "👶 0-3" : a === "4-10" ? "🧒 4-10" : "👦 11-17").join(", ")} ans
                </p>
              )}
              {profile?.hasChildren === undefined && (
                <p className="text-sm text-amber-600">À renseigner</p>
              )}
            </div>
          </motion.button>

          {/* Animaux de l'annonceur */}
          <div className="flex items-center gap-4 p-4 bg-background rounded-xl text-left">
            <div className={cn(
              "p-3 rounded-xl",
              profile?.ownedAnimals && profile.ownedAnimals.length > 0 ? "bg-primary/10" : "bg-gray-100"
            )}>
              <PawPrint className={cn(
                "w-6 h-6",
                profile?.ownedAnimals && profile.ownedAnimals.length > 0 ? "text-primary" : "text-gray-400"
              )} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">
                {profile?.ownedAnimals && profile.ownedAnimals.length > 0
                  ? `🐾 ${profile.ownedAnimals.length} animal${profile.ownedAnimals.length > 1 ? "x" : ""}`
                  : "🐾 Mes animaux"}
              </p>
              {profile?.ownedAnimals && profile.ownedAnimals.length > 0 ? (
                <p className="text-sm text-text-light">
                  {profile.ownedAnimals.map((a: { name: string }) => a.name).join(", ")}
                </p>
              ) : (
                <p className="text-sm text-text-light">Voir ci-dessous</p>
              )}
            </div>
          </div>

          {/* Alimentation */}
          <motion.button
            type="button"
            onClick={() => handleProvidesFoodChange(!(profile?.providesFood ?? false))}
            className="group relative flex items-center gap-4 p-4 bg-background rounded-xl hover:bg-orange-50 transition-colors text-left"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-foreground/5 group-hover:bg-orange-100 transition-colors">
              <Edit className="w-3.5 h-3.5 text-foreground/40 group-hover:text-orange-600 transition-colors" />
            </div>
            <div className={cn(
              "p-3 rounded-xl",
              profile?.providesFood === true ? "bg-green-100" : profile?.providesFood === false ? "bg-orange-100" : "bg-amber-100"
            )}>
              <Utensils className={cn(
                "w-6 h-6",
                profile?.providesFood === true ? "text-green-600" : profile?.providesFood === false ? "text-orange-600" : "text-amber-500"
              )} />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {profile?.providesFood === true ? "✅ Alimentation fournie" : profile?.providesFood === false ? "📦 À fournir" : "Alimentation ?"}
              </p>
              {profile?.providesFood === false && (
                <p className="text-sm text-text-light">Le propriétaire fournit</p>
              )}
              {profile?.providesFood === undefined && (
                <p className="text-sm text-amber-600">À renseigner</p>
              )}
            </div>
          </motion.button>
        </div>

        {/* Section enfants - Âges (si enfants) */}
        {profile?.hasChildren && (
          <div className="mt-4 p-4 bg-secondary/5 rounded-xl">
            <p className="text-sm font-medium text-foreground mb-2">Âge des enfants :</p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "0-3", label: "0-3 ans", emoji: "👶" },
                { value: "4-10", label: "4-10 ans", emoji: "🧒" },
                { value: "11-17", label: "11-17 ans", emoji: "👦" },
              ].map((age) => {
                const isSelected = profile?.childrenAges?.includes(age.value);
                return (
                  <motion.button
                    key={age.value}
                    type="button"
                    onClick={() => {
                      const currentAges = profile?.childrenAges || [];
                      if (isSelected) {
                        handleChildrenAgesChange(currentAges.filter((a: string) => a !== age.value));
                      } else {
                        handleChildrenAgesChange([...currentAges, age.value]);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-sm",
                      isSelected
                        ? "bg-secondary text-white"
                        : "bg-white text-foreground hover:bg-secondary/10"
                    )}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span>{age.emoji}</span>
                    <span className="font-medium">{age.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* Section animaux - Liste et ajout */}
        <div className="mt-4 p-4 bg-primary/5 rounded-xl">
          <p className="text-sm font-medium text-foreground mb-3">Mes animaux :</p>

          {profile?.ownedAnimals && profile.ownedAnimals.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {profile.ownedAnimals.map((animal: { id?: string; type: string; name: string; breed?: string; age?: number; profilePhoto?: string }, index: number) => (
                <div
                  key={animal.id || index}
                  className="group flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-primary/20 hover:border-primary/40 transition-colors"
                >
                  {animal.profilePhoto ? (
                    <img src={animal.profilePhoto} alt={animal.name} className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <span className="text-sm">
                      {ANIMAL_TYPE_OPTIONS.find(o => o.value === animal.type)?.emoji || "🐾"}
                    </span>
                  )}
                  <span className="font-medium text-sm">{animal.name}</span>
                  {animal.age !== undefined && <span className="text-xs text-text-light">({animal.age}a)</span>}

                  {/* Boutons édition/suppression */}
                  <div className="flex items-center gap-1 ml-1">
                    <Link href={`/dashboard/mes-animaux/${animal.id || `index-${index}`}/modifier`}>
                      <motion.div
                        className="text-foreground/40 hover:text-primary p-0.5"
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </motion.div>
                    </Link>
                    <motion.button
                      type="button"
                      onClick={() => {
                        const newAnimals = [...(profile?.ownedAnimals || [])];
                        newAnimals.splice(index, 1);
                        handleOwnedAnimalsChange(newAnimals);
                      }}
                      className="text-foreground/40 hover:text-red-600 p-0.5"
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Link href="/dashboard/mes-animaux/nouveau">
            <motion.div
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter un animal</span>
            </motion.div>
          </Link>
        </div>
      </motion.div>

      {/* Activities */}
      <ActivitiesSection
        token={token}
        selectedActivities={profile?.selectedActivities as Array<{ activityId: Id<"activities">; customDescription?: string }> | undefined}
        onUpdate={handleSelectedActivitiesChange}
      />

      {/* Environment Photos */}
      <EnvironmentPhotosSection
        photos={profile?.environmentPhotos || []}
        onUpdate={handleEnvironmentPhotosChange}
      />

      {/* Recent Reviews Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-3xl shadow-lg p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Star className="w-5 h-5 fill-accent text-accent" />
            Derniers avis
            <span className="ml-2 px-2 py-0.5 bg-accent/20 text-foreground text-sm rounded-full">
              {stats.averageRating.toFixed(1)}/5
            </span>
          </h3>
          <a href="/dashboard/avis" className="text-sm text-primary font-medium hover:underline">
            Voir tous les avis
          </a>
        </div>

        <div className="space-y-4">
          {mockReviews.slice(0, 2).map((review) => (
            <div key={review.id} className="p-4 bg-background rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-xl">
                  {review.clientAvatar}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{review.clientName}</p>
                  <p className="text-xs text-text-light flex items-center gap-1">
                    <span>{review.animal.emoji}</span>
                    {review.animal.name}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "w-4 h-4",
                        i < review.rating ? "fill-accent text-accent" : "text-gray-200"
                      )}
                    />
                  ))}
                </div>
              </div>
              <p className="text-text-light text-sm">&ldquo;{review.comment}&rdquo;</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Bouton remonter en haut */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-6 right-6 z-50 p-3 bg-primary text-white rounded-full shadow-lg hover:bg-primary/90 transition-colors"
            aria-label="Remonter en haut de page"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
