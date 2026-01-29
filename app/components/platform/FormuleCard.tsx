"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  Star,
  Heart,
  Shield,
  ArrowRight,
  MapPin,
  Navigation,
  Calendar,
  Clock,
  Users,
  User,
  Timer,
  Home,
  Car,
  Sparkles,
  Eye,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { formatPrice, formatDistance } from "./helpers";

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
  announcerProfileImage?: string | null;
  announcerRating: number;
  announcerReviewCount: number;
  announcerLocation: string;
  announcerDistance?: number;
  announcerVerified: boolean;
  announcerStatusType: "particulier" | "micro_entrepreneur" | "professionnel";
  nextSlot?: NextSlot;
  collectiveSlots?: CollectiveSlotInfo[];
  spotsLeft?: number;
}

interface FormuleCardProps {
  formule: FormuleResult;
  index: number;
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
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h${mins}` : `${hours}h`;
}

const locationLabels = {
  announcer_home: "Chez le pro",
  client_home: "À domicile",
  both: "Au choix",
};

const locationIcons = {
  announcer_home: Home,
  client_home: Car,
  both: MapPin,
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

// Grid View Card - Design moderne et épuré
export function FormuleCardGrid({ formule, index }: FormuleCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  const distanceText = formatDistance(formule.announcerDistance);
  const isCollective = formule.sessionType === "collective";
  const LocationIcon = formule.serviceLocation ? locationIcons[formule.serviceLocation] : MapPin;

  const announcerBaseUrl = `/annonceur/${formule.announcerSlug || formule.announcerId}`;
  const announcerProfileUrl = `${announcerBaseUrl}?service=${formule.categorySlug}`;
  const announcerBookingUrl = `${announcerBaseUrl}?formule=${formule.formuleId}`;
  const formuleDetailUrl = `/formule/${formule.formuleId}`;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-primary/20 flex flex-col h-full"
    >
      {/* Header avec annonceur */}
      <div className="p-4 pb-3 border-b border-gray-50">
        <div className="flex items-center gap-3">
          {/* Avatar annonceur */}
          <Link href={announcerProfileUrl}>
            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 ring-2 ring-gray-100 group-hover:ring-primary/20 transition-all">
              {formule.announcerProfileImage ? (
                <Image
                  src={formule.announcerProfileImage}
                  alt={formule.announcerFirstName}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                  <span className="text-xl">👤</span>
                </div>
              )}
              {formule.announcerVerified && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <Shield className="w-3 h-3 text-secondary" />
                </div>
              )}
            </div>
          </Link>

          {/* Infos annonceur */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link href={announcerProfileUrl} className="font-semibold text-gray-900 truncate hover:text-primary transition-colors">
                {formule.announcerFirstName}
              </Link>
              <div className="flex items-center gap-0.5">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-sm font-medium text-gray-700">{formule.announcerRating.toFixed(1)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {distanceText && (
                <span className="flex items-center gap-1 text-primary font-medium">
                  <Navigation className="w-3 h-3" />
                  {distanceText}
                </span>
              )}
              {!distanceText && formule.announcerLocation && (
                <span className="truncate">{formule.announcerLocation}</span>
              )}
            </div>
          </div>

          {/* Favoris */}
          <motion.button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsFavorite(!isFavorite);
            }}
            whileTap={{ scale: 0.85 }}
            className={cn(
              "p-2 rounded-full transition-all",
              isFavorite ? "bg-red-500 text-white" : "bg-gray-100 text-gray-400 hover:text-red-500 hover:bg-red-50"
            )}
          >
            <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
          </motion.button>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Tags en haut */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {/* Catégorie */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
            {formule.categoryIcon && <span className="text-sm">{formule.categoryIcon}</span>}
            {formule.categoryName}
          </span>
          {/* Type */}
          <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
            isCollective ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
          )}>
            {isCollective ? <Users className="w-3 h-3" /> : <User className="w-3 h-3" />}
            {isCollective ? "Collectif" : "Individuel"}
          </span>
        </div>

        {/* Nom de la formule */}
        <h3 className="text-base font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {formule.formuleName}
        </h3>

        {/* Badges infos */}
        <div className="flex flex-wrap gap-1.5 mb-3 text-xs text-gray-600">
          {formule.duration && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-lg">
              <Timer className="w-3 h-3 text-gray-400" />
              {formatDuration(formule.duration)}
            </span>
          )}
          {formule.serviceLocation && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-lg">
              <LocationIcon className="w-3 h-3 text-gray-400" />
              {locationLabels[formule.serviceLocation]}
            </span>
          )}
          {formule.numberOfSessions && formule.numberOfSessions > 1 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-600 rounded-lg">
              <Sparkles className="w-3 h-3" />
              {formule.numberOfSessions} séances
            </span>
          )}
        </div>

        {/* Prochain créneau */}
        {formule.nextSlot && (
          <div className="mb-3 px-3 py-2 bg-gradient-to-r from-emerald-50 to-emerald-50/50 rounded-xl border border-emerald-100">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span className="font-medium text-emerald-700">
                {formatNextSlotDate(formule.nextSlot.date)}
              </span>
              <span className="text-emerald-400">•</span>
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-600">{formatTime(formule.nextSlot.startTime)}</span>
            </div>
          </div>
        )}

        {/* Créneaux collectifs - Afficher uniquement le prochain créneau avec places disponibles */}
        {isCollective && formule.collectiveSlots && formule.collectiveSlots.length > 0 && (
          <div className="mb-3 px-3 py-2 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-700">Séance collective</span>
              </div>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-xs font-semibold",
                formule.collectiveSlots[0].spotsLeft <= 2 ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
              )}>
                {formule.collectiveSlots[0].spotsLeft} place{formule.collectiveSlots[0].spotsLeft > 1 ? "s" : ""} dispo
              </span>
            </div>
            {formule.collectiveSlots.length > 1 && (
              <p className="text-xs text-blue-600 mt-1">
                +{formule.collectiveSlots.length - 1} autre{formule.collectiveSlots.length > 2 ? "s" : ""} créneau{formule.collectiveSlots.length > 2 ? "x" : ""} disponible{formule.collectiveSlots.length > 2 ? "s" : ""}
              </p>
            )}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer: Prix et CTA */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100 mt-auto">
          <div>
            {formule.numberOfSessions && formule.numberOfSessions > 1 ? (
              <>
                <span className="text-2xl font-bold text-gray-900">
                  {formatPrice(getPriceWithCommission(formule.price, formule.announcerStatusType) * formule.numberOfSessions)}
                </span>
                <div className="text-xs text-gray-500">
                  {formule.numberOfSessions} séances × {formatPrice(getPriceWithCommission(formule.price, formule.announcerStatusType))}
                </div>
              </>
            ) : (
              <>
                <span className="text-2xl font-bold text-gray-900">
                  {formatPrice(getPriceWithCommission(formule.price, formule.announcerStatusType))}
                </span>
                {formule.priceUnit && (
                  <span className="text-sm text-gray-500 ml-0.5">
                    /{formule.priceUnit === "hour" ? "h" : formule.priceUnit === "day" ? "jour" : formule.priceUnit}
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link href={formuleDetailUrl}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-3 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all flex items-center gap-1.5 text-sm"
              >
                <Eye className="w-4 h-4" />
                Détail
              </motion.button>
            </Link>
            <Link href={announcerBookingUrl}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-4 py-2.5 bg-gradient-to-r from-primary to-primary/90 text-white font-semibold rounded-xl shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center gap-1.5 text-sm"
              >
                Réserver
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </Link>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

// List View Card
export function FormuleCardList({ formule, index }: FormuleCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  const distanceText = formatDistance(formule.announcerDistance);
  const isCollective = formule.sessionType === "collective";
  const LocationIcon = formule.serviceLocation ? locationIcons[formule.serviceLocation] : MapPin;

  const announcerBaseUrl = `/annonceur/${formule.announcerSlug || formule.announcerId}`;
  const announcerProfileUrl = `${announcerBaseUrl}?service=${formule.categorySlug}`;
  const announcerBookingUrl = `${announcerBaseUrl}?formule=${formule.formuleId}`;
  const formuleDetailUrl = `/formule/${formule.formuleId}`;

  return (
    <motion.article
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-primary/20"
    >
      <div className="flex flex-col sm:flex-row">
        {/* Section gauche - Annonceur */}
        <div className="relative w-full sm:w-36 p-4 bg-gradient-to-br from-gray-50/80 to-white flex flex-col items-center justify-center border-b sm:border-b-0 sm:border-r border-gray-100">
          <Link href={announcerProfileUrl} className="relative">
            <div className="w-16 h-16 rounded-xl overflow-hidden ring-2 ring-white shadow-lg bg-white">
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
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
                <Shield className="w-3.5 h-3.5 text-secondary" />
              </div>
            )}
          </Link>
          <div className="text-center mt-2">
            <Link href={announcerProfileUrl} className="font-semibold text-gray-900 text-sm hover:text-primary transition-colors">
              {formule.announcerFirstName}
            </Link>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-medium text-gray-600">{formule.announcerRating.toFixed(1)}</span>
            </div>
            {distanceText && (
              <div className="flex items-center justify-center gap-1 mt-1 text-primary text-xs font-medium">
                <Navigation className="w-3 h-3" />
                {distanceText}
              </div>
            )}
          </div>
        </div>

        {/* Section droite - Formule */}
        <div className="flex-1 p-4 flex flex-col">
          {/* Top row */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                  {formule.categoryIcon && <span className="text-sm">{formule.categoryIcon}</span>}
                  {formule.categoryName}
                </span>
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                  isCollective ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                )}>
                  {isCollective ? <Users className="w-3 h-3" /> : <User className="w-3 h-3" />}
                  {isCollective ? "Collectif" : "Individuel"}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors">
                {formule.formuleName}
              </h3>
            </div>

            {/* Prix et favoris */}
            <div className="text-right flex-shrink-0">
              {formule.numberOfSessions && formule.numberOfSessions > 1 ? (
                <div>
                  <span className="text-xl font-bold text-gray-900">
                    {formatPrice(getPriceWithCommission(formule.price, formule.announcerStatusType) * formule.numberOfSessions)}
                  </span>
                  <div className="text-[10px] text-gray-500">
                    {formule.numberOfSessions} × {formatPrice(getPriceWithCommission(formule.price, formule.announcerStatusType))}
                  </div>
                </div>
              ) : (
                <div>
                  <span className="text-xl font-bold text-gray-900">
                    {formatPrice(getPriceWithCommission(formule.price, formule.announcerStatusType))}
                  </span>
                  <span className="text-sm text-gray-500">/{formule.priceUnit === "hour" ? "h" : formule.priceUnit}</span>
                </div>
              )}
              <motion.button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsFavorite(!isFavorite);
                }}
                whileTap={{ scale: 0.85 }}
                className={cn(
                  "mt-1 p-1.5 rounded-full transition-all",
                  isFavorite ? "bg-red-500 text-white" : "bg-gray-100 text-gray-400 hover:text-red-500"
                )}
              >
                <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
              </motion.button>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {formule.duration && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 rounded-md text-xs text-gray-600">
                <Timer className="w-3 h-3 text-gray-400" />
                {formatDuration(formule.duration)}
              </span>
            )}
            {formule.serviceLocation && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 rounded-md text-xs text-gray-600">
                <LocationIcon className="w-3 h-3 text-gray-400" />
                {locationLabels[formule.serviceLocation]}
              </span>
            )}
            {formule.numberOfSessions && formule.numberOfSessions > 1 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 rounded-md text-xs text-purple-600">
                <Sparkles className="w-3 h-3" />
                {formule.numberOfSessions} séances
              </span>
            )}
          </div>

          {/* Prochain créneau et créneaux collectifs */}
          <div className="flex flex-wrap gap-2 mb-3">
            {formule.nextSlot && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-700">
                  {formatNextSlotDate(formule.nextSlot.date)}
                </span>
                <span className="text-emerald-400">•</span>
                <Clock className="w-3 h-3 text-emerald-600" />
                <span className="text-xs text-emerald-600">
                  {formatTime(formule.nextSlot.startTime)}
                </span>
              </div>
            )}

            {isCollective && formule.collectiveSlots && formule.collectiveSlots.length > 0 && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-medium text-blue-700">Collectif</span>
                <span className="text-blue-400">•</span>
                <span className={cn(
                  "text-xs font-medium",
                  formule.collectiveSlots[0].spotsLeft <= 2 ? "text-orange-600" : "text-blue-600"
                )}>
                  {formule.collectiveSlots[0].spotsLeft} place{formule.collectiveSlots[0].spotsLeft > 1 ? "s" : ""} dispo
                </span>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="mt-auto pt-2 flex flex-wrap gap-2">
            <Link href={formuleDetailUrl}>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                <span>Voir détail</span>
              </motion.button>
            </Link>
            <Link href={announcerBookingUrl}>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="px-5 py-2.5 bg-gradient-to-r from-primary to-primary/90 text-white font-semibold rounded-xl shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center gap-2"
              >
                <span>Réserver</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </Link>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
