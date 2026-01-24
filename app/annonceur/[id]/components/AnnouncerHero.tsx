"use client";

import Image from "next/image";
import {
  MapPin,
  Star,
  Clock,
  Calendar,
  User,
  ShieldCheck,
  ChevronDown,
  MessageCircle,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { cn } from "@/app/lib/utils";
import { AnnouncerData, animalEmojis } from "./types";
import { formatDistance } from "@/app/components/platform/helpers";
import AnnouncerActionBar from "./AnnouncerActionBar";

interface AnnouncerHeroProps {
  announcer: AnnouncerData;
  selectedServiceAnimals?: string[];
  distance?: number;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export default function AnnouncerHero({
  announcer,
  selectedServiceAnimals,
  distance,
  isFavorite = false,
  onToggleFavorite,
}: AnnouncerHeroProps) {
  const [isBioExpanded, setIsBioExpanded] = useState(false);

  // Utiliser les animaux du service sélectionné si disponible, sinon ceux de l'annonceur
  const displayedAnimals = selectedServiceAnimals && selectedServiceAnimals.length > 0
    ? selectedServiceAnimals
    : announcer.acceptedAnimals;

  // Formater la distance
  const formattedDistance = formatDistance(distance);

  const getStatusLabel = () => {
    switch (announcer.statusType) {
      case "professionnel":
        return "Pro";
      case "micro_entrepreneur":
        return "Auto-entrepreneur";
      default:
        return "Particulier";
    }
  };

  const getStatusColor = () => {
    switch (announcer.statusType) {
      case "professionnel":
        return "bg-gradient-to-r from-blue-500 to-blue-600 text-white";
      case "micro_entrepreneur":
        return "bg-gradient-to-r from-purple-500 to-purple-600 text-white";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <section className="pt-16">
      {/* Cover Image */}
      <div className="relative h-40 sm:h-56 md:h-64 bg-gradient-to-br from-primary/20 via-secondary/10 to-primary/20">
        {announcer.coverImage && (
          <Image
            src={announcer.coverImage}
            alt="Couverture"
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Action Bar - Boutons retour, favoris, partage */}
        <AnnouncerActionBar
          announcerName={`${announcer.firstName} ${announcer.lastName.charAt(0)}.`}
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite || (() => {})}
        />
      </div>

      {/* Profile Info Card */}
      <div className="max-w-6xl mx-auto px-4 -mt-16 sm:-mt-20 relative z-10">
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1),0_8px_40px_-8px_rgba(0,0,0,0.05)] border border-gray-100/80 overflow-hidden">
          {/* Top section with avatar and main info */}
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
              {/* Avatar with status badge */}
              <div className="relative mx-auto sm:mx-0 flex-shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-gray-100 ring-4 ring-white shadow-xl">
                  {announcer.profileImage ? (
                    <Image
                      src={announcer.profileImage}
                      alt={announcer.firstName}
                      width={112}
                      height={112}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                      <User className="w-10 h-10 text-gray-400" />
                    </div>
                  )}
                </div>
                {/* Status badge on avatar */}
                <div className={cn(
                  "absolute -bottom-1 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-lg",
                  getStatusColor()
                )}>
                  {getStatusLabel()}
                </div>
              </div>

              {/* Name, location and badges */}
              <div className="flex-1 text-center sm:text-left min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                      {announcer.firstName} {announcer.lastName.charAt(0)}.
                    </h1>
                    {announcer.location && (
                      <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-0.5 text-gray-500 text-sm">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        <span className="truncate">
                          {announcer.location}
                          {formattedDistance && (
                            <span className="text-gray-400"> · {formattedDistance}</span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Verification badges */}
                  <div className="flex flex-wrap justify-center sm:justify-end gap-1.5">
                    {announcer.isIdentityVerified && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-secondary/10 text-secondary">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Vérifié</span>
                      </span>
                    )}
                    {announcer.icadRegistered && (
                      <span className="px-2 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-600">
                        I-CAD
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 mt-3">
                  {/* Rating */}
                  {announcer.reviewCount > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-lg">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="text-sm font-bold text-gray-900">{announcer.rating.toFixed(1)}</span>
                      </div>
                      <span className="text-xs text-gray-500">({announcer.reviewCount})</span>
                    </div>
                  )}

                  {/* Response rate */}
                  {announcer.responseRate && announcer.responseRate >= 90 && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded-lg">
                      <Zap className="w-3.5 h-3.5 text-green-600" />
                      <span className="text-xs font-medium text-green-700">{announcer.responseRate}%</span>
                    </div>
                  )}

                  {/* Response time */}
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-xs">{announcer.responseTime}</span>
                  </div>

                  {/* Member since */}
                  <div className="hidden sm:flex items-center gap-1.5 text-gray-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-xs">Depuis {announcer.memberSince}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Bottom section with animals and bio */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50/50">
            {/* Accepted animals as compact chips */}
            {displayedAnimals.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mb-3">
                <span className="text-xs font-medium text-gray-500 mr-1">Accepte :</span>
                {displayedAnimals.map((animal) => (
                  <span
                    key={animal}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-700"
                  >
                    <span>{animalEmojis[animal.toLowerCase()] || "🐾"}</span>
                    <span className="capitalize">{animal}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Bio / Description */}
            {announcer.bio && (
              <div>
                <p className={cn(
                  "text-gray-600 text-sm leading-relaxed",
                  !isBioExpanded && "line-clamp-2"
                )}>
                  {announcer.bio}
                </p>

                {/* Bouton "Voir plus" si bio longue */}
                {announcer.bio.length > 120 && (
                  <button
                    onClick={() => setIsBioExpanded(!isBioExpanded)}
                    className="mt-1.5 text-xs font-medium text-primary flex items-center gap-0.5 hover:underline"
                  >
                    <span>{isBioExpanded ? "Voir moins" : "Voir plus"}</span>
                    <motion.div
                      animate={{ rotate: isBioExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </motion.div>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
