"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
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
  Building2,
  Briefcase,
  User,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { type AnnouncerResult, type NextSlot, type CollectiveSlotInfo } from "@/app/hooks/useSearch";
import { formatPrice, extractCity, formatDistance } from "./helpers";
import { ANIMAL_TYPES } from "./constants";

// Helper pour formater la date du prochain créneau
function formatNextSlotDate(date: string): string {
  const slotDate = new Date(date);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Reset time for comparison
  today.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);
  slotDate.setHours(0, 0, 0, 0);

  if (slotDate.getTime() === today.getTime()) {
    return "Aujourd'hui";
  }
  if (slotDate.getTime() === tomorrow.getTime()) {
    return "Demain";
  }

  // Format: "Lun 15 jan"
  const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const months = ["jan", "fév", "mar", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];
  const originalDate = new Date(date);
  return `${days[originalDate.getDay()]} ${originalDate.getDate()} ${months[originalDate.getMonth()]}`;
}

// Helper pour formater l'heure
function formatTime(time: string): string {
  return time.substring(0, 5); // "14:00:00" -> "14:00"
}

interface AnnouncerCardProps {
  announcer: AnnouncerResult;
  onShowFormulas: () => void;
  index: number;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

const availabilityConfig = {
  available: { color: "bg-emerald-500", text: "Disponible", textColor: "text-emerald-700", bg: "bg-emerald-50" },
  partial: { color: "bg-amber-500", text: "Partiellement dispo", textColor: "text-amber-700", bg: "bg-amber-50" },
  unavailable: { color: "bg-gray-400", text: "Indisponible", textColor: "text-gray-600", bg: "bg-gray-100" },
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

// Grid View Card
export function AnnouncerCardGrid({ announcer, onShowFormulas, index, isFavorite: isFavoriteProp = false, onToggleFavorite }: AnnouncerCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isFavorite = isFavoriteProp;

  const availInfo = availabilityConfig[announcer.availability.status];
  const distanceText = formatDistance(announcer.distance);
  const city = extractCity(announcer.location);

  return (
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
        {announcer.coverImage ? (
          <Image
            src={announcer.coverImage}
            alt={`Couverture de ${announcer.firstName}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className={cn(
              "object-cover transition-transform duration-500",
              isHovered && "scale-105"
            )}
          />
        ) : announcer.profileImage ? (
          <Image
            src={announcer.profileImage}
            alt={announcer.firstName}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className={cn(
              "object-cover transition-transform duration-500",
              isHovered && "scale-105"
            )}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
            <span className="text-5xl">🐾</span>
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          <div className="flex flex-col gap-2">
            {/* Badge statut (Pro / Auto-entrepreneur / Particulier) */}
            {(() => {
              const statusConfig = statusTypeConfig[announcer.statusType];
              const StatusIcon = statusConfig.icon;
              return (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-sm border", statusConfig.bg, statusConfig.border)}
                >
                  <StatusIcon className={cn("w-3.5 h-3.5", statusConfig.text)} />
                  <span className={cn("text-xs font-semibold", statusConfig.text)}>{statusConfig.label}</span>
                </motion.div>
              );
            })()}
            {announcer.isIdentityVerified && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.05 }}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-white/95 backdrop-blur-sm rounded-full shadow-sm"
              >
                <Shield className="w-3.5 h-3.5 text-secondary" />
                <span className="text-xs font-medium text-gray-700">Vérifié</span>
              </motion.div>
            )}
            <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-sm", availInfo.bg)}>
              <span className={cn("w-2 h-2 rounded-full", availInfo.color)} />
              <span className={cn("text-xs font-medium", availInfo.textColor)}>{availInfo.text}</span>
            </div>
          </div>

          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite?.();
            }}
            whileTap={{ scale: 0.85 }}
            aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
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
            {announcer.profileImage ? (
              <Image
                src={announcer.profileImage}
                alt={announcer.firstName}
                width={56}
                height={56}
                className={cn("w-full h-full", announcer.isDisplayingLogo ? "object-contain p-1" : "object-cover")}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                <span className="text-2xl">👤</span>
              </div>
            )}
          </div>
        </div>

        {/* Price badge */}
        {announcer.basePrice && (
          <div className="absolute bottom-3 right-3">
            <div className="px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-xl shadow-sm">
              <span className="text-lg font-bold text-gray-900">{formatPrice(announcer.basePrice)}</span>
              <span className="text-sm text-gray-500">/h</span>
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
              {announcer.firstName} {announcer.lastName.charAt(0)}.
            </h3>
            <p className="text-sm text-gray-600 mt-0.5">{city}</p>
          </div>

          <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-lg">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span className="text-sm font-semibold text-gray-900">{announcer.rating.toFixed(1)}</span>
            <span className="text-xs text-gray-500">({announcer.reviewCount})</span>
          </div>
        </div>

        {/* Distance */}
        {distanceText && (
          <div className="flex items-center gap-1.5 mb-3">
            <Navigation className="w-3.5 h-3.5 text-primary" />
            <span className="text-sm text-primary font-medium">{distanceText}</span>
          </div>
        )}

        {/* Tags services */}
        <div className="flex flex-wrap gap-2 mb-4">
          {announcer.services.slice(0, 3).map((service, i) => (
            <span key={i} className="px-2.5 py-1 text-xs font-medium bg-primary/5 text-primary rounded-lg">
              {service}
            </span>
          ))}
          {announcer.services.length > 3 && (
            <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg">
              +{announcer.services.length - 3}
            </span>
          )}
        </div>

        {/* Animals */}
        {announcer.acceptedAnimals && announcer.acceptedAnimals.length > 0 && (
          <div className="flex items-center gap-1 mb-4">
            <span className="text-xs text-gray-500 mr-1">Accepte :</span>
            {announcer.acceptedAnimals.slice(0, 4).map((animal, i) => {
              const animalInfo = ANIMAL_TYPES.find(a => a.id === animal);
              return (
                <span key={i} className="text-base" title={animalInfo?.label}>
                  {animalInfo?.emoji || "🐾"}
                </span>
              );
            })}
            {announcer.acceptedAnimals.length > 4 && (
              <span className="text-xs text-gray-400">+{announcer.acceptedAnimals.length - 4}</span>
            )}
          </div>
        )}

        {/* Prochain créneau disponible */}
        {announcer.availability.nextSlot && (
          <div className="mb-4 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">
                {formatNextSlotDate(announcer.availability.nextSlot.date)}
              </span>
              <span className="text-emerald-600">•</span>
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-sm text-emerald-600">
                {formatTime(announcer.availability.nextSlot.startTime)}
              </span>
            </div>
          </div>
        )}

        {/* Créneaux collectifs */}
        {announcer.availability.collectiveSlots && announcer.availability.collectiveSlots.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Séances collectives</span>
            </div>
            <div className="space-y-1.5">
              {announcer.availability.collectiveSlots.slice(0, 2).map((slot, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-blue-600">
                    <Calendar className="w-3 h-3" />
                    <span>{formatNextSlotDate(slot.date)}</span>
                    <span>•</span>
                    <span>{formatTime(slot.startTime)}</span>
                  </div>
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                    slot.spotsLeft <= 2 ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                  )}>
                    {slot.spotsLeft} place{slot.spotsLeft > 1 ? "s" : ""}
                  </span>
                </div>
              ))}
              {announcer.availability.collectiveSlots.length > 2 && (
                <span className="text-xs text-blue-500">
                  +{announcer.availability.collectiveSlots.length - 2} autre{announcer.availability.collectiveSlots.length - 2 > 1 ? "s" : ""} créneau{announcer.availability.collectiveSlots.length - 2 > 1 ? "x" : ""}
                </span>
              )}
            </div>
          </div>
        )}

        {/* CTA */}
        <motion.button
          onClick={onShowFormulas}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3 bg-gradient-to-r from-primary to-primary/90 text-white font-semibold rounded-xl shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center gap-2"
        >
          <span>Voir les prestations</span>
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.article>
  );
}

// List View Card
export function AnnouncerCardList({ announcer, onShowFormulas, index, isFavorite: isFavoriteProp = false, onToggleFavorite }: AnnouncerCardProps) {
  const isFavorite = isFavoriteProp;

  const availInfo = availabilityConfig[announcer.availability.status];
  const distanceText = formatDistance(announcer.distance);
  const city = extractCity(announcer.location);

  return (
    <motion.article
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-gray-200"
    >
      <div className="flex flex-col sm:flex-row">
        {/* Image Section - Cover Image */}
        <div className="relative w-full sm:w-48 md:w-56 h-48 sm:h-auto bg-gradient-to-br from-gray-100 to-gray-50 flex-shrink-0">
          {announcer.coverImage ? (
            <Image
              src={announcer.coverImage}
              alt={`Couverture de ${announcer.firstName}`}
              fill
              sizes="(max-width: 640px) 100vw, 224px"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : announcer.profileImage ? (
            <Image
              src={announcer.profileImage}
              alt={announcer.firstName}
              fill
              sizes="(max-width: 640px) 100vw, 224px"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
              <span className="text-4xl">🐾</span>
            </div>
          )}

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

          {/* Badges on image */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {/* Badge statut */}
            {(() => {
              const statusConfig = statusTypeConfig[announcer.statusType];
              const StatusIcon = statusConfig.icon;
              return (
                <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full shadow-sm border", statusConfig.bg, statusConfig.border)}>
                  <StatusIcon className={cn("w-3 h-3", statusConfig.text)} />
                  <span className={cn("text-[10px] font-semibold", statusConfig.text)}>{statusConfig.label}</span>
                </div>
              );
            })()}
            {announcer.isIdentityVerified && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-white/95 backdrop-blur-sm rounded-full shadow-sm">
                <Shield className="w-3 h-3 text-secondary" />
                <span className="text-[10px] font-medium text-gray-700">Vérifié</span>
              </div>
            )}
          </div>

          {/* Avatar overlay - bottom left */}
          <div className="absolute bottom-3 left-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden ring-2 ring-white shadow-lg bg-white">
              {announcer.profileImage ? (
                <Image
                  src={announcer.profileImage}
                  alt={announcer.firstName}
                  width={48}
                  height={48}
                  className={cn("w-full h-full", announcer.isDisplayingLogo ? "object-contain p-1" : "object-cover")}
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
              onToggleFavorite?.();
            }}
            whileTap={{ scale: 0.85 }}
            aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
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
                  {announcer.firstName} {announcer.lastName.charAt(0)}.
                </h3>
                <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 rounded-full">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-sm font-semibold text-gray-900">{announcer.rating.toFixed(1)}</span>
                  <span className="text-xs text-gray-500">({announcer.reviewCount})</span>
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
              {announcer.basePrice && (
                <div className="mb-1">
                  <span className="text-xl font-bold text-gray-900">{formatPrice(announcer.basePrice)}</span>
                  <span className="text-sm text-gray-500">/h</span>
                </div>
              )}
              <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium", availInfo.bg, availInfo.textColor)}>
                <span className={cn("w-1.5 h-1.5 rounded-full", availInfo.color)} />
                {availInfo.text}
              </div>
            </div>
          </div>

          {/* Middle: Tags & Services */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {announcer.services.slice(0, 3).map((service, i) => (
              <span key={i} className="px-2 py-0.5 text-xs font-medium bg-primary/5 text-primary rounded-md">
                {service}
              </span>
            ))}
            {announcer.services.length > 3 && (
              <span className="text-xs text-gray-400">+{announcer.services.length - 3}</span>
            )}

            {/* Separator */}
            {announcer.acceptedAnimals && announcer.acceptedAnimals.length > 0 && (
              <>
                <span className="text-gray-300">•</span>
                <div className="flex items-center gap-0.5">
                  {announcer.acceptedAnimals.slice(0, 5).map((animal, i) => {
                    const animalInfo = ANIMAL_TYPES.find(a => a.id === animal);
                    return (
                      <span key={i} className="text-sm" title={animalInfo?.label}>
                        {animalInfo?.emoji || "🐾"}
                      </span>
                    );
                  })}
                  {announcer.acceptedAnimals.length > 5 && (
                    <span className="text-xs text-gray-400 ml-0.5">+{announcer.acceptedAnimals.length - 5}</span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Prochain créneau et créneaux collectifs - compact pour liste */}
          <div className="flex flex-wrap gap-2 mb-3">
            {/* Prochain créneau disponible */}
            {announcer.availability.nextSlot && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-700">
                  {formatNextSlotDate(announcer.availability.nextSlot.date)}
                </span>
                <span className="text-emerald-400">•</span>
                <Clock className="w-3 h-3 text-emerald-600" />
                <span className="text-xs text-emerald-600">
                  {formatTime(announcer.availability.nextSlot.startTime)}
                </span>
              </div>
            )}

            {/* Créneaux collectifs - compact */}
            {announcer.availability.collectiveSlots && announcer.availability.collectiveSlots.length > 0 && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-medium text-blue-700">
                  {announcer.availability.collectiveSlots.length} séance{announcer.availability.collectiveSlots.length > 1 ? "s" : ""} collective{announcer.availability.collectiveSlots.length > 1 ? "s" : ""}
                </span>
                <span className="text-blue-400">•</span>
                <span className="text-xs text-blue-600">
                  {formatNextSlotDate(announcer.availability.collectiveSlots[0].date)}
                </span>
              </div>
            )}
          </div>

          {/* Bottom: CTA */}
          <div className="mt-auto pt-2">
            <motion.button
              onClick={onShowFormulas}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-primary to-primary/90 text-white font-semibold rounded-xl shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center gap-2"
            >
              <span>Voir les prestations</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
