"use client";

import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  Star,
  Clock,
  Calendar,
  User,
  UserCircle,
  ShieldCheck,
  ChevronDown,
  Zap,
  Target,
  TreePine,
  Award,
  CheckCircle2,
  XCircle,
  PawPrint,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { cn } from "@/app/lib/utils";
import { AnnouncerData, animalEmojis } from "./types";
import { formatDistance } from "@/app/components/platform/helpers";
import AnnouncerActionBar from "./AnnouncerActionBar";

interface AnnouncerHeroProps {
  announcer: AnnouncerData;
  slug: string;
  distance?: number;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export default function AnnouncerHero({
  announcer,
  slug,
  distance,
  isFavorite = false,
  onToggleFavorite,
}: AnnouncerHeroProps) {
  const [isBioExpanded, setIsBioExpanded] = useState(false);

  // Formater la distance
  const formattedDistance = formatDistance(distance);

  // Statistiques de missions (avec valeurs par défaut si non disponibles)
  const missionStats = announcer.missionStats || { completed: 0, cancelled: 0, refused: 0, total: 0 };

  // Calculer le ratio de confiance (0-100)
  // Par défaut 100% (5/5), s'ajuste avec les missions terminées/annulées/refusées
  const calculateTrustScore = () => {
    const { completed, cancelled, refused, total } = missionStats;

    // Par défaut, score de confiance à 100% (5/5)
    if (total === 0) return 100;

    // Score basé sur: missions terminées positivement vs annulées/refusées
    // Formule: (completed / total) * 100 - penalité pour refus/annulations
    const successRate = (completed / total) * 100;
    const penaltyRate = ((cancelled + refused) / total) * 20; // Penalité légère
    const score = Math.max(0, Math.min(100, Math.round(successRate - penaltyRate)));

    return score;
  };

  const trustScore = calculateTrustScore();

  // Couleur du score de confiance
  const getTrustScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 bg-green-50";
    if (score >= 70) return "text-amber-600 bg-amber-50";
    return "text-red-600 bg-red-50";
  };

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

  const getStatusBadgeStyle = (): React.CSSProperties => {
    switch (announcer.statusType) {
      case "professionnel":
      case "micro_entrepreneur":
        return { background: "#eaf0ed", color: "#2f4a3f" };
      default:
        return { background: "#f3ecdf", color: "#6b4f25" };
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
        <div
          className="bg-white overflow-hidden"
          style={{
            borderRadius: 14,
            border: "1px solid #ece9e1",
            boxShadow: "0 10px 30px rgba(30,30,28,0.06)",
          }}
        >
          {/* Top section with avatar and main info */}
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
              {/* Avatar */}
              <div className="relative mx-auto sm:mx-0 flex-shrink-0">
                <div
                  className="w-24 h-24 sm:w-28 sm:h-28 overflow-hidden bg-white"
                  style={{
                    borderRadius: 16,
                    border: "3px solid #fff",
                    boxShadow: "0 6px 18px rgba(30,30,28,0.08)",
                  }}
                >
                  {announcer.profileImage ? (
                    <Image
                      src={announcer.profileImage}
                      alt={announcer.firstName}
                      width={112}
                      height={112}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #e8efe9, #d4e0d2)" }}
                    >
                      <User className="w-10 h-10" style={{ color: "#3a5a40" }} />
                    </div>
                  )}
                </div>
                {/* Status badge */}
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={getStatusBadgeStyle()}
                >
                  {getStatusLabel()}
                </div>
              </div>

              {/* Name, location and badges */}
              <div className="flex-1 text-center sm:text-left min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div>
                    <Link href={`/profil/${announcer.username || slug}`}>
                      <h1 className="text-lg sm:text-xl font-semibold text-[#1f1f1d] tracking-[-0.01em] truncate hover:text-primary transition-colors m-0">
                        {announcer.firstName} {announcer.lastName.charAt(0)}.
                      </h1>
                    </Link>
                    {announcer.username && (
                      <span className="text-[12px] text-[#9c9484]">@{announcer.username}</span>
                    )}
                    {announcer.location && (
                      <div className="flex items-center justify-center sm:justify-start gap-1 mt-0.5 text-[12px] text-[#6d6d68]">
                        <MapPin className="w-3 h-3 text-primary" />
                        <span className="truncate">
                          {announcer.location}
                          {formattedDistance && (
                            <span className="text-[#9c9484]"> · {formattedDistance}</span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Badges + Voir profil */}
                  <div className="flex flex-wrap justify-center sm:justify-end items-center gap-1.5">
                    {announcer.isIdentityVerified && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                        style={{ border: "1px solid #cfdbd3", color: "#2f4a3f" }}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        Vérifié
                      </span>
                    )}
                    {announcer.icadRegistered && (
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                        style={{ border: "1px solid #cfdbd3", color: "#2f4a3f" }}
                      >
                        I-CAD
                      </span>
                    )}
                    <Link
                      href={`/profil/${announcer.username || slug}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-opacity hover:opacity-90"
                      style={{ background: "#1f3a33", color: "#f7f5ef" }}
                    >
                      <UserCircle className="w-3 h-3" />
                      Voir le profil
                    </Link>
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                  {/* Rating */}
                  {announcer.reviewCount > 0 && (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                      style={{ border: "1px solid #dfdcd4", color: "#3a3a38" }}
                    >
                      <Star className="w-2.5 h-2.5 fill-[#1f2937] text-[#1f2937]" />
                      {announcer.rating.toFixed(1)} · {announcer.reviewCount}
                    </span>
                  )}

                  {/* Response rate */}
                  {announcer.responseRate && announcer.responseRate >= 90 && (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                      style={{ border: "1px solid #cfdbd3", color: "#2f4a3f" }}
                    >
                      <Zap className="w-2.5 h-2.5" />
                      {announcer.responseRate}%
                    </span>
                  )}

                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                    style={{ border: "1px solid #dfdcd4", color: "#3a3a38" }}
                  >
                    <Clock className="w-2.5 h-2.5" />
                    {announcer.responseTime}
                  </span>

                  <span
                    className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                    style={{ border: "1px solid #dfdcd4", color: "#3a3a38" }}
                  >
                    <Calendar className="w-2.5 h-2.5" />
                    Depuis {announcer.memberSince}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom section */}
          <div
            className="px-4 sm:px-6 py-3"
            style={{ borderTop: "1px solid #f1ede3", background: "#fcfaf4" }}
          >
            {/* Row 1: pills */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
              {announcer.radius && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ border: "1px solid #dfdcd4", color: "#3a3a38" }}
                >
                  <Target className="w-2.5 h-2.5" />
                  Zone : {announcer.radius} km
                </span>
              )}

              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                style={
                  trustScore >= 90
                    ? { border: "1px solid #cfdbd3", color: "#2f4a3f" }
                    : trustScore >= 70
                      ? { border: "1px solid #f4e6c1", color: "#7a5b1a" }
                      : { border: "1px solid #f1cdcd", color: "#8a3a3a" }
                }
              >
                <Award className="w-2.5 h-2.5" />
                Confiance {trustScore}%
                <span className="opacity-70">
                  {missionStats.total === 0
                    ? "(Nouveau)"
                    : `(${missionStats.completed} mission${missionStats.completed > 1 ? "s" : ""})`}
                </span>
              </span>

              {announcer.equipment.hasGarden && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ border: "1px solid #cfdbd3", color: "#2f4a3f" }}
                >
                  <TreePine className="w-2.5 h-2.5" />
                  Jardin{announcer.equipment.gardenSize ? ` (${announcer.equipment.gardenSize})` : ""}
                </span>
              )}
            </div>

            {/* Row 2: stats missions */}
            {missionStats.total > 0 && (
              <div className="flex flex-wrap items-center gap-2.5 mb-2 text-[11px]">
                <span className="inline-flex items-center gap-1" style={{ color: "#2f4a3f" }}>
                  <CheckCircle2 className="w-3 h-3" />
                  {missionStats.completed} terminée{missionStats.completed > 1 ? "s" : ""}
                </span>
                {missionStats.cancelled > 0 && (
                  <span className="inline-flex items-center gap-1" style={{ color: "#7a5b1a" }}>
                    <XCircle className="w-3 h-3" />
                    {missionStats.cancelled} annulée{missionStats.cancelled > 1 ? "s" : ""}
                  </span>
                )}
                {missionStats.refused > 0 && (
                  <span className="inline-flex items-center gap-1" style={{ color: "#8a3a3a" }}>
                    <XCircle className="w-3 h-3" />
                    {missionStats.refused} refusée{missionStats.refused > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            )}

            {/* Row 3: Animaux */}
            {announcer.ownAnimals.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 mb-2.5">
                <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mr-1 inline-flex items-center gap-1">
                  <PawPrint className="w-2.5 h-2.5" />
                  Ses animaux
                </span>
                {announcer.ownAnimals.map((animal, index) => (
                  <span
                    key={animal.id || index}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                    style={{ background: "#fff", border: "1px solid #dfdcd4", color: "#3a3a38" }}
                  >
                    <span>{animalEmojis[animal.type.toLowerCase()] || "🐾"}</span>
                    <span>{animal.name}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Bio */}
            {announcer.bio && (
              <div>
                <p
                  className={cn(
                    "text-[12.5px] leading-[1.55] text-[#4a4a46]",
                    !isBioExpanded && "line-clamp-2"
                  )}
                >
                  {announcer.bio}
                </p>

                {announcer.bio.length > 120 && (
                  <button
                    onClick={() => setIsBioExpanded(!isBioExpanded)}
                    className="mt-1 text-[11px] font-medium text-[#1f3a33] inline-flex items-center gap-0.5 hover:underline"
                  >
                    <span>{isBioExpanded ? "Voir moins" : "Voir plus"}</span>
                    <motion.div
                      animate={{ rotate: isBioExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-3 h-3" />
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
