"use client";

import Image from "next/image";
import { MapPin, Star, Clock, Calendar, User } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { AnnouncerData, animalEmojis } from "./types";

interface AnnouncerHeroProps {
  announcer: AnnouncerData;
  selectedServiceAnimals?: string[];
}

export default function AnnouncerHero({ announcer, selectedServiceAnimals }: AnnouncerHeroProps) {
  // Utiliser les animaux du service sélectionné si disponible, sinon ceux de l'annonceur
  const displayedAnimals = selectedServiceAnimals && selectedServiceAnimals.length > 0
    ? selectedServiceAnimals
    : announcer.acceptedAnimals;

  const getStatusLabel = () => {
    switch (announcer.statusType) {
      case "professionnel":
        return "Professionnel";
      case "micro_entrepreneur":
        return "Auto-entrepreneur";
      default:
        return "Particulier";
    }
  };

  const getStatusColor = () => {
    switch (announcer.statusType) {
      case "professionnel":
        return "bg-blue-50 text-blue-600";
      case "micro_entrepreneur":
        return "bg-purple-50 text-purple-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <section className="pt-16">
      {/* Cover Image */}
      <div className="relative h-48 sm:h-64 md:h-80 bg-gradient-to-br from-primary/20 to-secondary/20">
        {announcer.coverImage && (
          <Image
            src={announcer.coverImage}
            alt="Couverture"
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      </div>

      {/* Profile Info Card */}
      <div className="max-w-6xl mx-auto px-4 -mt-20 sm:-mt-24 relative z-10">
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 md:p-8">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            {/* Avatar */}
            <div className="relative mx-auto sm:mx-0 flex-shrink-0">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-gray-100 ring-4 ring-white shadow-2xl">
                {announcer.profileImage ? (
                  <Image
                    src={announcer.profileImage}
                    alt={announcer.firstName}
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                    <User className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {announcer.firstName} {announcer.lastName.charAt(0)}.
                  </h1>
                  {announcer.location && (
                    <div className="flex items-center justify-center sm:justify-start gap-2 mt-1 text-gray-600">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span>{announcer.location}</span>
                    </div>
                  )}
                </div>

                {/* Badges */}
                <div className="flex flex-wrap justify-center sm:justify-end gap-2">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-sm font-medium",
                    getStatusColor()
                  )}>
                    {getStatusLabel()}
                  </span>
                  {announcer.verified && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-secondary/10 text-secondary">
                      Profil vérifié
                    </span>
                  )}
                  {announcer.icadRegistered && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-emerald-50 text-emerald-600">
                      I-CAD
                    </span>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-6 mt-4 pt-4 border-t border-gray-100">
                {/* Rating */}
                {announcer.reviewCount > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 rounded-lg">
                      <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                      <span className="font-bold text-gray-900">{announcer.rating.toFixed(1)}</span>
                    </div>
                    <span className="text-sm text-gray-500">({announcer.reviewCount} avis)</span>
                  </div>
                )}

                {/* Response time */}
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-sm">Répond en {announcer.responseTime}</span>
                </div>

                {/* Member since */}
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-sm">Membre depuis {announcer.memberSince}</span>
                </div>
              </div>

              {/* Accepted animals */}
              {displayedAnimals.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    {displayedAnimals.map((animal) => (
                      <div
                        key={animal}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/10 rounded-full"
                      >
                        <span className="text-lg">
                          {animalEmojis[animal.toLowerCase()] || "🐾"}
                        </span>
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {animal}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
