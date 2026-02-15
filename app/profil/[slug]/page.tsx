"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Calendar,
  User,
  Star,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Share2,
  Home,
  Building2,
  Trees,
  Car,
  Baby,
  CigaretteOff,
  Cigarette,
  Utensils,
  Shield,
  ShieldCheck,
  ImageIcon,
  PawPrint,
  MessageSquare,
  Heart,
  Sparkles,
  Check,
  X as XIcon,
  Loader2,
  Camera,
  ExternalLink,
  Pencil,
  Navigation,
  Clock,
  Euro,
  Users,
  ThumbsUp,
  MessageSquarePlus,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Navbar } from "@/app/components/navbar";
import ImageLightbox from "@/app/components/ui/ImageLightbox";
import { useAuth } from "@/app/hooks/useAuth";

// Emojis pour les types d'animaux
const animalEmojis: Record<string, string> = {
  chien: "🐕",
  chat: "🐱",
  oiseau: "🐦",
  rongeur: "🐹",
  poisson: "🐠",
  reptile: "🦎",
  nac: "🐾",
};

// Labels pour le genre
const genderLabels: Record<string, string> = {
  male: "Mâle",
  female: "Femelle",
  unknown: "Non précisé",
};

// Labels pour la taille
const sizeLabels: Record<string, string> = {
  petit: "Petit",
  moyen: "Moyen",
  grand: "Grand",
  "très grand": "Très grand",
  tres_grand: "Très grand",
};

// Calculer l'âge à partir de la date de naissance
function calculateAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age > 0 ? age : null;
}

// Type pour les animaux
interface AnimalData {
  id: string;
  name: string;
  slug: string;
  type: string;
  breed?: string | null;
  gender?: string;
  birthDate?: string | null;
  weight?: number | null;
  size?: string | null;
  description?: string | null;
  profilePhoto?: string | null;
  galleryPhotos?: string[];
  goodWithChildren?: boolean | null;
  goodWithDogs?: boolean | null;
  goodWithCats?: boolean | null;
  goodWithOtherAnimals?: boolean | null;
  behaviorTraits?: string[];
}

// Type pour les avis
interface ReviewData {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: number;
  reviewer: {
    firstName: string;
    lastName: string;
  };
}

// Type pour les formules
interface FormuleData {
  id: string;
  name: string;
  description?: string | null;
  basePrice?: number | null;
  priceUnit?: string | null;
  pricePerHour?: number | null;
  pricePerHalfDay?: number | null;
  pricePerDay?: number | null;
  pricePerWeek?: number | null;
  pricePerMonth?: number | null;
  animalTypes?: string[];
  sessionType?: "individual" | "collective" | null;
  numberOfSessions?: number | null;
  maxAnimalsPerSession?: number | null;
}

// Type pour les services
interface ServiceData {
  id: string;
  categoryName: string;
  categorySlug?: string;
  categoryIcon: string;
  animalTypes: string[];
  formules: FormuleData[];
}

// Type pour les créneaux collectifs
interface CollectiveSlotData {
  id: string;
  variantId: string;
  date: string;
  startTime: string;
  endTime: string;
  maxAnimals: number;
  bookedAnimals: number;
}

// Helper: prix d'affichage d'une formule
function getFormuleDisplayPrice(f: FormuleData): { price: number; unit: string } | null {
  if (f.pricePerDay && f.pricePerDay > 0) return { price: f.pricePerDay, unit: "/jour" };
  if (f.pricePerHour && f.pricePerHour > 0) return { price: f.pricePerHour, unit: "/h" };
  if (f.pricePerHalfDay && f.pricePerHalfDay > 0) return { price: f.pricePerHalfDay, unit: "/½j" };
  if (f.pricePerWeek && f.pricePerWeek > 0) return { price: f.pricePerWeek, unit: "/sem" };
  if (f.pricePerMonth && f.pricePerMonth > 0) return { price: f.pricePerMonth, unit: "/mois" };
  if (f.basePrice && f.basePrice > 0) {
    const unitLabel: Record<string, string> = { hour: "/h", half_day: "/½j", day: "/jour", week: "/sem", month: "/mois", flat: "" };
    return { price: f.basePrice, unit: unitLabel[f.priceUnit || ""] || "" };
  }
  return null;
}

function formatPriceCents(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " €";
}

// ──────────────────────────────────────────────────────
// Calendrier public des disponibilités (style planning)
// ──────────────────────────────────────────────────────
function PublicAvailabilityCalendar({ slug }: { slug: string }) {
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

  // Query publique
  const data = useQuery(api.public.profile.getPublicAvailability, {
    slug,
    startDate,
    endDate,
  });

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ];
  const dayNames = ["L", "M", "M", "J", "V", "S", "D"];

  // Fond du jour
  const getDayBg = (dateKey: string): string => {
    if (!data) return "";
    const dayAvails = data.availability.filter((a) => a.date === dateKey);
    const hasAvailable = dayAvails.some((a) => a.status === "available");
    const hasPartial = dayAvails.some((a) => a.status === "partial");
    const allUnavailable = dayAvails.length > 0 && dayAvails.every((a) => a.status === "unavailable");

    if (dayAvails.length === 0) return "";
    if (allUnavailable) return "bg-gray-100 border-gray-300";

    // Créneaux collectifs ce jour
    const daySlots = data.collectiveSlots.filter((s) => s.date === dateKey);
    const hasBookedSlots = daySlots.some((s) => s.bookedAnimals > 0);

    if (!hasBookedSlots) {
      if (hasAvailable) return "bg-green-50 border-green-200";
      if (hasPartial) return "bg-orange-50 border-orange-200";
      return "";
    }

    if (hasAvailable || hasPartial) return "bg-orange-50 border-orange-200";
    return "bg-red-50 border-red-200";
  };

  // Créneaux collectifs par date
  const getSlotsForDate = (dateKey: string) => {
    if (!data) return [];
    return data.collectiveSlots.filter((s) => s.date === dateKey);
  };

  return (
    <div className="max-w-md mx-auto">
      {/* Header navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-gray-700" />
        </button>
        <h4 className="text-sm font-semibold text-gray-900 capitalize">
          {monthNames[month]} {year}
        </h4>
        <button
          onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-gray-700" />
        </button>
      </div>

      {/* Jours de la semaine */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {dayNames.map((day, i) => (
          <div key={i} className="text-center text-[11px] font-medium text-gray-400 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Grille du calendrier */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: adjustedFirstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="h-12" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          const dateKey = formatDate(day);
          const isToday = dateKey === todayKey;
          const isPast = dateKey < todayKey;
          const bgClass = getDayBg(dateKey);
          const daySlots = getSlotsForDate(dateKey);

          return (
            <div
              key={day}
              className={cn(
                "h-12 rounded-md border p-0.5 flex flex-col transition-colors overflow-hidden",
                isPast
                  ? "bg-gray-50 border-gray-100 opacity-50"
                  : isToday
                    ? "border-primary bg-primary/5"
                    : bgClass || "border-gray-100"
              )}
            >
              <span className={cn(
                "text-[10px] font-medium leading-none mb-0.5",
                isPast ? "text-gray-400" : isToday ? "text-primary font-bold" : "text-gray-900"
              )}>
                {day}
              </span>

              {/* Créneaux collectifs */}
              <div className="flex-1 flex flex-col gap-px overflow-hidden">
                {daySlots.slice(0, 2).map((slot) => {
                  const placesLeft = slot.maxAnimals - slot.bookedAnimals;
                  return (
                    <div
                      key={slot.id}
                      className={cn(
                        "h-2.5 rounded-sm text-white text-[7px] leading-[10px] px-0.5 truncate",
                        placesLeft <= 0 ? "bg-purple-300" : "bg-purple-500"
                      )}
                    >
                      {slot.bookedAnimals}/{slot.maxAnimals}
                    </div>
                  );
                })}
                {daySlots.length > 2 && (
                  <span className="text-[7px] text-gray-400 leading-none">+{daySlots.length - 2}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Légende */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-sm bg-green-50 border border-green-200" />
          <span className="text-[10px] text-gray-500">Disponible</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-sm bg-orange-50 border border-orange-200" />
          <span className="text-[10px] text-gray-500">Partiel</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-sm bg-red-50 border border-red-200" />
          <span className="text-[10px] text-gray-500">Complet</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-sm bg-gray-100 border border-gray-300" />
          <span className="text-[10px] text-gray-500">Indisponible</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-2 rounded-sm bg-purple-500" />
          <span className="text-[10px] text-gray-500">Collectif</span>
        </div>
      </div>
    </div>
  );
}

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { user: authUser } = useAuth();

  // Détecte si l'utilisateur connecté consulte son propre profil
  const isOwnProfile = authUser?.username ? authUser.username.toLowerCase() === slug.toLowerCase() : false;

  // États
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [galleryLightboxIndex, setGalleryLightboxIndex] = useState<number | null>(null);

  // Récupérer les données du profil
  const profileData = useQuery(api.public.profile.getPublicProfileBySlug, { slug });

  // Loading
  if (profileData === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-gray-500">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  // Profil non trouvé
  if (profileData === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Profil introuvable
          </h1>
          <p className="text-gray-500 mb-6">
            Ce profil n&apos;existe pas ou n&apos;est plus disponible.
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors"
          >
            Retour à l&apos;accueil
          </button>
        </div>
      </div>
    );
  }

  const getStatusLabel = () => {
    switch (profileData.statusType) {
      case "professionnel":
        return "Pro";
      case "particulier":
        return "Particulier";
      default:
        return "Membre";
    }
  };

  const getStatusColor = () => {
    switch (profileData.statusType) {
      case "professionnel":
        return "bg-gradient-to-r from-blue-500 to-blue-600 text-white";
      case "particulier":
        return "bg-gradient-to-r from-primary to-primary/80 text-white";
      default:
        return "bg-gradient-to-r from-secondary to-secondary/80 text-white";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar hideSpacers />

      {/* Hero Section */}
      <section className="pt-16 pb-8">
        {/* Cover Image */}
        <div className="relative h-48 sm:h-64 md:h-80 bg-gradient-to-br from-primary/30 via-secondary/20 to-purple-500/20">
          {profileData.coverImage ? (
            <Image
              src={profileData.coverImage}
              alt="Couverture"
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-[url('/patterns/paws.svg')] opacity-10" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

          {/* Action Bar */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.back()}
              className="p-2.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </motion.button>

            <div className="flex items-center gap-2">
              {isOwnProfile && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push("/dashboard/profil")}
                  className="flex items-center gap-2 px-3.5 py-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors"
                >
                  <Pencil className="w-4 h-4 text-gray-700" />
                  <span className="text-sm font-medium text-gray-700 hidden sm:inline">Modifier mon profil</span>
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: `Profil de ${profileData.firstName}`,
                      url: window.location.href,
                    });
                  }
                }}
                className="p-2.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors"
              >
                <Share2 className="w-5 h-5 text-gray-700" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Profile Card */}
        <div className="max-w-4xl mx-auto px-4 -mt-20 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-xl border border-gray-100/80"
          >
            {/* Top section */}
            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row gap-5 sm:gap-6">
                {/* Avatar */}
                <div className="relative mx-auto sm:mx-0 flex-shrink-0">
                  <div className={cn("w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden ring-4 ring-white shadow-2xl", profileData.isDisplayingLogo ? "bg-white" : "bg-gray-100")}>
                    {profileData.profileImage ? (
                      <Image
                        src={profileData.profileImage}
                        alt={profileData.firstName}
                        width={128}
                        height={128}
                        className={cn("w-full h-full", profileData.isDisplayingLogo ? "object-contain p-2" : "object-cover")}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                        <User className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                  {/* Status badge */}
                  <div className={cn(
                    "absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold shadow-lg",
                    getStatusColor()
                  )}>
                    {getStatusLabel()}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                        {profileData.firstName} {profileData.lastName.charAt(0)}.
                      </h1>
                      {/* Ville uniquement (pas l'adresse exacte) */}
                      {(profileData.city || profileData.location) && (
                        <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1 text-gray-500">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span>{profileData.city || profileData.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap justify-center sm:justify-end gap-2">
                      {profileData.isIdentityVerified && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-secondary/10 text-secondary">
                          <ShieldCheck className="w-4 h-4" />
                          Vérifié
                        </span>
                      )}
                      {profileData.isSapApproved && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-600">
                          <Shield className="w-4 h-4" />
                          Déclaré SAP
                        </span>
                      )}
                      {profileData.icadRegistered && (
                        <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-600">
                          I-CAD
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-4">
                    {/* Note moyenne — toujours affiché */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 rounded-xl">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="text-sm font-bold text-gray-900">
                          {profileData.reviewCount > 0 ? profileData.rating.toFixed(1) : "—"}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {profileData.reviewCount > 0
                          ? `(${profileData.reviewCount} avis)`
                          : "Pas encore d'avis"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">Membre depuis {profileData.memberSince}</span>
                    </div>

                    {profileData.animals.length > 0 && (
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <PawPrint className="w-4 h-4" />
                        <span className="text-sm">
                          {profileData.animals.length} compagnon{profileData.animals.length > 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* SIRET pour les pros */}
                  {profileData.siret && (
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-3 text-xs text-gray-400">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>SIRET : {profileData.siret}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bio/Description section */}
            {profileData.bio && (
              <>
                <div className="border-t border-gray-100" />
                <div className="px-6 sm:px-8 py-5 bg-gradient-to-br from-gray-50/50 to-white rounded-b-3xl">
                  <p className={cn(
                    "text-gray-600 leading-relaxed",
                    !isBioExpanded && "line-clamp-3"
                  )}>
                    {profileData.bio}
                  </p>
                  {profileData.bio.length > 200 && (
                    <button
                      onClick={() => setIsBioExpanded(!isBioExpanded)}
                      className="mt-2 text-sm font-medium text-primary flex items-center gap-1 hover:underline"
                    >
                      <span>{isBioExpanded ? "Voir moins" : "Voir plus"}</span>
                      <motion.div
                        animate={{ rotate: isBioExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </motion.div>
                    </button>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* Main Content — 2 colonnes sur desktop */}
      <main className="max-w-5xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ═══ COLONNE GAUCHE (2/3) ═══ */}
          <div className="lg:col-span-2 space-y-6">

            {/* À propos — Équipement + Zone d'intervention */}
            {profileData.isAnnouncer && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-gray-100 space-y-6"
              >
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-3">
                  <span className="p-2 bg-gradient-to-br from-secondary/20 to-secondary/10 rounded-xl">
                    <User className="w-5 h-5 text-secondary" />
                  </span>
                  À propos
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {profileData.equipment.housingType && (
                    <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                      <div className="p-1.5 bg-primary/10 rounded-lg">
                        {profileData.equipment.housingType === "house" ? <Home className="w-4 h-4 text-primary" /> : <Building2 className="w-4 h-4 text-primary" />}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900">{profileData.equipment.housingType === "house" ? "Maison" : "Appartement"}</p>
                        {profileData.equipment.housingSize && <p className="text-[10px] text-gray-500">{profileData.equipment.housingSize} m²</p>}
                      </div>
                    </div>
                  )}
                  {profileData.equipment.hasGarden && (
                    <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                      <div className="p-1.5 bg-green-100 rounded-lg"><Trees className="w-4 h-4 text-green-600" /></div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900">Jardin</p>
                        {profileData.equipment.gardenSize && <p className="text-[10px] text-gray-500">{profileData.equipment.gardenSize === "petit" ? "Petit" : profileData.equipment.gardenSize === "moyen" ? "Moyen" : "Grand"}</p>}
                      </div>
                    </div>
                  )}
                  {profileData.equipment.hasVehicle && (
                    <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                      <div className="p-1.5 bg-blue-100 rounded-lg"><Car className="w-4 h-4 text-blue-600" /></div>
                      <p className="text-xs font-semibold text-gray-900">Véhicule</p>
                    </div>
                  )}
                  {profileData.equipment.isSmoker === false && (
                    <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                      <div className="p-1.5 bg-emerald-100 rounded-lg"><CigaretteOff className="w-4 h-4 text-emerald-600" /></div>
                      <p className="text-xs font-semibold text-gray-900">Non-fumeur</p>
                    </div>
                  )}
                  {profileData.equipment.hasChildren && (
                    <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                      <div className="p-1.5 bg-pink-100 rounded-lg"><Baby className="w-4 h-4 text-pink-600" /></div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900">Enfants</p>
                        {profileData.equipment.childrenAges?.length > 0 && (
                          <p className="text-[10px] text-gray-500">{profileData.equipment.childrenAges.map((a: string) => a === "0-3" ? "0-3 ans" : a === "4-10" ? "4-10 ans" : "11-17 ans").join(", ")}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {profileData.equipment.providesFood && (
                    <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                      <div className="p-1.5 bg-orange-100 rounded-lg"><Utensils className="w-4 h-4 text-orange-600" /></div>
                      <p className="text-xs font-semibold text-gray-900">Alimentation fournie</p>
                    </div>
                  )}
                  {profileData.icadRegistered && (
                    <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                      <div className="p-1.5 bg-emerald-100 rounded-lg"><Shield className="w-4 h-4 text-emerald-600" /></div>
                      <p className="text-xs font-semibold text-gray-900">I-CAD inscrit</p>
                    </div>
                  )}
                </div>

                {/* Zone d'intervention */}
                {profileData.radius && profileData.radius > 0 && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl border border-primary/10">
                    <Navigation className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm text-gray-700">
                      {profileData.city || profileData.location || "Zone non précisée"} — rayon de <span className="font-semibold text-gray-900">{profileData.radius} km</span>
                    </span>
                  </div>
                )}
              </motion.section>
            )}

            {/* Tarifs */}
            {profileData.isAnnouncer && profileData.services && profileData.services.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-gray-100"
              >
                <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-3">
                  <span className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl">
                    <Euro className="w-5 h-5 text-primary" />
                  </span>
                  Tarifs
                </h2>

                <div className="space-y-3">
                  {(profileData.services as ServiceData[]).map((service) => (
                    <div key={service.id} className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gray-100 to-gray-50">
                        <span className="text-lg">{service.categoryIcon}</span>
                        <span className="text-sm font-bold text-gray-900">{service.categoryName}</span>
                        <span className="ml-auto text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">{service.formules.length} formule{service.formules.length > 1 ? "s" : ""}</span>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {service.formules.map((formule: FormuleData) => {
                          const displayPrice = getFormuleDisplayPrice(formule);
                          return (
                            <div key={formule.id} className="flex items-center justify-between px-4 py-3 gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-medium text-gray-900">{formule.name}</p>
                                  {formule.sessionType === "collective" && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded">Collectif</span>}
                                  {(formule.numberOfSessions ?? 0) > 1 && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded">{formule.numberOfSessions} séances</span>}
                                </div>
                                {formule.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{formule.description}</p>}
                              </div>
                              {displayPrice && <span className="text-sm font-bold text-primary whitespace-nowrap">{formatPriceCents(displayPrice.price)}{displayPrice.unit}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Animaux de compagnie */}
            {profileData.animals.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-gray-100"
              >
                <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-3">
                  <span className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl">
                    <PawPrint className="w-5 h-5 text-amber-600" />
                  </span>
                  Les compagnons de {profileData.firstName}
                  <span className="text-sm font-normal text-gray-400 ml-auto">{profileData.animals.length}</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {profileData.animals.map((animal: AnimalData, index: number) => {
                    const age = calculateAge(animal.birthDate);
                    return (
                      <Link key={animal.id} href={`/profil/${slug}/animaux/${animal.slug}`}>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + index * 0.05 }}
                          whileHover={{ scale: 1.02, y: -2 }}
                          className="group bg-gradient-to-br from-gray-50 to-white rounded-2xl p-3.5 border border-gray-100 hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative flex-shrink-0">
                              {animal.profilePhoto ? (
                                <div className="w-16 h-16 rounded-xl overflow-hidden ring-2 ring-white shadow-md">
                                  <Image src={animal.profilePhoto} alt={animal.name} width={64} height={64} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                                </div>
                              ) : (
                                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center ring-2 ring-white shadow-md">
                                  <span className="text-2xl">{animalEmojis[animal.type.toLowerCase()] || "🐾"}</span>
                                </div>
                              )}
                              {(animal.galleryPhotos?.length ?? 0) > 0 && (
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-md">
                                  <Camera className="w-2.5 h-2.5 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h3 className="font-bold text-sm text-gray-900 truncate group-hover:text-primary transition-colors">{animal.name}</h3>
                                {animal.gender && animal.gender !== "unknown" && (
                                  <span className={cn("text-[10px] px-1 py-0.5 rounded-full font-medium", animal.gender === "male" ? "bg-blue-100 text-blue-600" : "bg-pink-100 text-pink-600")}>{animal.gender === "male" ? "♂" : "♀"}</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">{animal.breed || animal.type}{age && ` • ${age} an${age > 1 ? "s" : ""}`}</p>
                              {animal.behaviorTraits && animal.behaviorTraits.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {animal.behaviorTraits.slice(0, 2).map((trait, i) => (
                                    <span key={i} className="px-1.5 py-0.5 bg-secondary/10 text-secondary rounded-full text-[10px] font-medium">{trait}</span>
                                  ))}
                                  {animal.behaviorTraits.length > 2 && <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[10px]">+{animal.behaviorTraits.length - 2}</span>}
                                </div>
                              )}
                            </div>
                            <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors flex-shrink-0" />
                          </div>
                        </motion.div>
                      </Link>
                    );
                  })}
                </div>
              </motion.section>
            )}

            {/* Galerie photos */}
            {profileData.gallery.filter((p: string) => p && typeof p === "string" && p.trim() !== "").length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-gray-100"
              >
                <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-3">
                  <span className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl">
                    <ImageIcon className="w-5 h-5 text-primary" />
                  </span>
                  Galerie photos
                  <span className="text-sm font-normal text-gray-400 ml-auto">{profileData.gallery.filter((p: string) => p && typeof p === "string" && p.trim() !== "").length}</span>
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {profileData.gallery.filter((p: string) => p && typeof p === "string" && p.trim() !== "").slice(0, 6).map((photo: string, index: number) => (
                    <motion.button
                      key={index}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setGalleryLightboxIndex(index)}
                      className={cn("relative aspect-square rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow", index === 0 && "sm:col-span-2 sm:row-span-2")}
                    >
                      <Image src={photo} alt={`Photo ${index + 1}`} fill className="object-cover hover:scale-105 transition-transform duration-300" />
                      {index === 5 && profileData.gallery.length > 6 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-white font-bold text-xl">+{profileData.gallery.length - 6}</span>
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </motion.section>
            )}
          </div>

          {/* ═══ COLONNE DROITE (1/3) ═══ */}
          <div className="space-y-6">

            {/* Disponibilités — calendrier mensuel */}
            {profileData.isAnnouncer && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white rounded-3xl p-5 shadow-lg border border-gray-100"
              >
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-3">
                  <span className="p-2 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-xl">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                  </span>
                  Disponibilités
                </h2>
                <PublicAvailabilityCalendar slug={slug} />
              </motion.section>
            )}

            {/* Avis & Recommandation */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-3xl p-5 shadow-lg border border-gray-100"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-3">
                <span className="p-2 bg-gradient-to-br from-amber-100 to-yellow-100 rounded-xl">
                  <Star className="w-5 h-5 text-amber-500" />
                </span>
                Avis
              </h2>

              {/* Taux de recommandation + Note moyenne */}
              <div className="flex items-stretch gap-3 mb-5">
                {/* Note moyenne */}
                <div className="flex-1 p-4 bg-gradient-to-br from-amber-50 to-white rounded-2xl border border-amber-100 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={cn("w-4 h-4", i < Math.round(profileData.rating) ? "fill-amber-400 text-amber-400" : "text-gray-200")} />
                    ))}
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {profileData.reviewCount > 0 ? profileData.rating.toFixed(1) : "—"}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {profileData.reviewCount > 0 ? `${profileData.reviewCount} avis` : "Aucun avis"}
                  </p>
                </div>

                {/* Taux de recommandation */}
                <div className="flex-1 p-4 bg-gradient-to-br from-emerald-50 to-white rounded-2xl border border-emerald-100 text-center">
                  <div className="flex items-center justify-center mb-1">
                    <ThumbsUp className="w-5 h-5 text-emerald-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {profileData.reviewCount > 0
                      ? `${Math.round((profileData.reviews.filter((r: ReviewData) => r.rating >= 4).length / profileData.reviewCount) * 100)}%`
                      : "—"}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Recommandé</p>
                </div>
              </div>

              {/* Derniers avis */}
              {profileData.reviews.length > 0 ? (
                <div className="space-y-3">
                  {profileData.reviews.slice(0, 3).map((review: ReviewData) => (
                    <div key={review.id} className="p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-bold text-gray-600">{review.reviewer.firstName.charAt(0)}</span>
                          </div>
                          <p className="text-xs font-semibold text-gray-900">{review.reviewer.firstName}</p>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={cn("w-3 h-3", i < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-200")} />
                          ))}
                        </div>
                      </div>
                      {review.comment && <p className="text-xs text-gray-600 line-clamp-2">{review.comment}</p>}
                      <p className="text-[10px] text-gray-400 mt-1.5">
                        {new Date(review.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  ))}
                  {profileData.reviews.length > 3 && (
                    <button className="w-full py-2.5 text-sm text-primary font-medium hover:bg-primary/5 rounded-xl transition-colors">
                      Voir les {profileData.reviewCount} avis
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <MessageSquarePlus className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Pas encore d&apos;avis</p>
                  <p className="text-xs text-gray-400 mt-1">Soyez le premier à donner votre avis !</p>
                </div>
              )}
            </motion.section>
          </div>

        </div>
      </main>

      {/* Gallery Lightbox */}
      <ImageLightbox
        images={profileData.gallery.filter((p: string) => p && typeof p === "string" && p.trim() !== "")}
        currentIndex={galleryLightboxIndex ?? 0}
        isOpen={galleryLightboxIndex !== null}
        onClose={() => setGalleryLightboxIndex(null)}
        onNavigate={setGalleryLightboxIndex}
        altPrefix={`Photo de ${profileData.firstName}`}
      />
    </div>
  );
}
