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
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { type AnnouncerResult } from "@/app/hooks/useSearch";
import { formatPrice, extractCity, formatDistance } from "./helpers";
import { ANIMAL_TYPES } from "./constants";

interface AnnouncerCardProps {
  announcer: AnnouncerResult;
  onShowFormulas: () => void;
  index: number;
}

const availabilityConfig = {
  available: { color: "bg-emerald-500", text: "Disponible", textColor: "text-emerald-700", bg: "bg-emerald-50" },
  partial: { color: "bg-amber-500", text: "Partiellement dispo", textColor: "text-amber-700", bg: "bg-amber-50" },
  unavailable: { color: "bg-gray-400", text: "Indisponible", textColor: "text-gray-600", bg: "bg-gray-100" },
};

// Grid View Card
export function AnnouncerCardGrid({ announcer, onShowFormulas, index }: AnnouncerCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

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
      {/* Image Section */}
      <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-50 overflow-hidden">
        {announcer.profileImage ? (
          <Image
            src={announcer.profileImage}
            alt={announcer.firstName}
            fill
            className={cn(
              "object-cover transition-transform duration-500",
              isHovered && "scale-105"
            )}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center">
              <span className="text-4xl">👤</span>
            </div>
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          <div className="flex flex-col gap-2">
            {announcer.verified && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
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

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-lg",
              announcer.statusType === "professionnel"
                ? "bg-blue-50 text-blue-600"
                : announcer.statusType === "micro_entrepreneur"
                ? "bg-purple-50 text-purple-600"
                : "bg-gray-100 text-gray-600"
            )}
          >
            {announcer.statusType === "professionnel" ? "Professionnel" : announcer.statusType === "micro_entrepreneur" ? "Auto-entrepreneur" : "Particulier"}
          </span>
          {announcer.services.slice(0, 2).map((service, i) => (
            <span key={i} className="px-2.5 py-1 text-xs font-medium bg-primary/5 text-primary rounded-lg">
              {service}
            </span>
          ))}
          {announcer.services.length > 2 && (
            <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg">
              +{announcer.services.length - 2}
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
export function AnnouncerCardList({ announcer, onShowFormulas, index }: AnnouncerCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);

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
        {/* Image Section */}
        <div className="relative w-full sm:w-48 md:w-56 h-48 sm:h-auto bg-gradient-to-br from-gray-100 to-gray-50 flex-shrink-0">
          {announcer.profileImage ? (
            <Image
              src={announcer.profileImage}
              alt={announcer.firstName}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center">
                <span className="text-3xl">👤</span>
              </div>
            </div>
          )}

          {/* Badges on image */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {announcer.verified && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-white/95 backdrop-blur-sm rounded-full shadow-sm">
                <Shield className="w-3 h-3 text-secondary" />
                <span className="text-[10px] font-medium text-gray-700">Vérifié</span>
              </div>
            )}
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
            <span
              className={cn(
                "px-2 py-0.5 text-xs font-medium rounded-md",
                announcer.statusType === "professionnel"
                  ? "bg-blue-50 text-blue-600"
                  : announcer.statusType === "micro_entrepreneur"
                  ? "bg-purple-50 text-purple-600"
                  : "bg-gray-100 text-gray-600"
              )}
            >
              {announcer.statusType === "professionnel" ? "Pro" : announcer.statusType === "micro_entrepreneur" ? "Auto-entrepreneur" : "Particulier"}
            </span>
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
