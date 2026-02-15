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
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Navbar } from "@/app/components/navbar";
import ImageLightbox from "@/app/components/ui/ImageLightbox";

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

// Type pour les services
interface ServiceData {
  id: string;
  categoryName: string;
  categorySlug?: string;
  categoryIcon: string;
  animalTypes: string[];
  formules: {
    id: string;
    name: string;
    description?: string | null;
    basePrice?: number | null;
    pricePerHour?: number | null;
    pricePerDay?: number | null;
  }[];
}

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

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
                      {profileData.location && (
                        <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1 text-gray-500">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span>{profileData.location}</span>
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
                    {profileData.reviewCount > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 rounded-xl">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          <span className="text-sm font-bold text-gray-900">
                            {profileData.rating.toFixed(1)}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          ({profileData.reviewCount} avis)
                        </span>
                      </div>
                    )}

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
                </div>
              </div>
            </div>

            {/* Bio section */}
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

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 pb-12 space-y-8">
        {/* Animaux de compagnie */}
        {profileData.animals.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-gray-100"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <span className="p-2.5 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl">
                <PawPrint className="w-6 h-6 text-amber-600" />
              </span>
              Les compagnons de {profileData.firstName}
              <span className="text-sm font-normal text-gray-400 ml-auto">
                {profileData.animals.length}
              </span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profileData.animals.map((animal: AnimalData, index: number) => {
                const age = calculateAge(animal.birthDate);

                return (
                  <Link
                    key={animal.id}
                    href={`/profil/${slug}/animaux/${animal.slug}`}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + index * 0.05 }}
                      whileHover={{ scale: 1.02, y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      className="group relative bg-gradient-to-br from-gray-50 to-white rounded-2xl p-4 border border-gray-100 hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        {/* Photo */}
                        <div className="relative flex-shrink-0">
                          {animal.profilePhoto ? (
                            <div className="w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-white shadow-md group-hover:ring-primary/30 transition-all">
                              <Image
                                src={animal.profilePhoto}
                                alt={animal.name}
                                width={80}
                                height={80}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              />
                            </div>
                          ) : (
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center ring-2 ring-white shadow-md">
                              <span className="text-3xl">
                                {animalEmojis[animal.type.toLowerCase()] || "🐾"}
                              </span>
                            </div>
                          )}
                          {/* Badge photos */}
                          {(animal.galleryPhotos?.length ?? 0) > 0 && (
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md">
                              <Camera className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Infos */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900 truncate group-hover:text-primary transition-colors">
                              {animal.name}
                            </h3>
                            {animal.gender && animal.gender !== "unknown" && (
                              <span className={cn(
                                "text-xs px-1.5 py-0.5 rounded-full font-medium",
                                animal.gender === "male"
                                  ? "bg-blue-100 text-blue-600"
                                  : "bg-pink-100 text-pink-600"
                              )}>
                                {animal.gender === "male" ? "♂" : "♀"}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {animal.breed || animal.type}
                            {age && ` • ${age} an${age > 1 ? "s" : ""}`}
                          </p>

                          {/* Traits */}
                          {animal.behaviorTraits && animal.behaviorTraits.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {animal.behaviorTraits.slice(0, 3).map((trait, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 bg-secondary/10 text-secondary rounded-full text-xs font-medium"
                                >
                                  {trait}
                                </span>
                              ))}
                              {animal.behaviorTraits.length > 3 && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">
                                  +{animal.behaviorTraits.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Arrow */}
                        <ExternalLink className="w-5 h-5 text-gray-300 group-hover:text-primary transition-colors" />
                      </div>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* À propos - Équipement (pour annonceurs) */}
        {profileData.isAnnouncer && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-gray-100"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <span className="p-2.5 bg-gradient-to-br from-secondary/20 to-secondary/10 rounded-xl">
                <User className="w-6 h-6 text-secondary" />
              </span>
              À propos de {profileData.firstName}
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {profileData.equipment.housingType && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {profileData.equipment.housingType === "house" ? (
                      <Home className="w-5 h-5 text-primary" />
                    ) : (
                      <Building2 className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {profileData.equipment.housingType === "house" ? "Maison" : "Appartement"}
                    </p>
                    {profileData.equipment.housingSize && (
                      <p className="text-xs text-gray-500">{profileData.equipment.housingSize} m²</p>
                    )}
                  </div>
                </div>
              )}

              {profileData.equipment.hasGarden && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Trees className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Jardin</p>
                    {profileData.equipment.gardenSize && (
                      <p className="text-xs text-gray-500">
                        {profileData.equipment.gardenSize === "petit" ? "Petit" :
                         profileData.equipment.gardenSize === "moyen" ? "Moyen" : "Grand"}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {profileData.equipment.hasVehicle && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Car className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Véhicule</p>
                    <p className="text-xs text-gray-500">Disponible</p>
                  </div>
                </div>
              )}

              {profileData.equipment.isSmoker === false && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <CigaretteOff className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Non-fumeur</p>
                  </div>
                </div>
              )}

              {profileData.equipment.hasChildren && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="p-2 bg-pink-100 rounded-lg">
                    <Baby className="w-5 h-5 text-pink-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Enfants</p>
                    {profileData.equipment.childrenAges?.length > 0 && (
                      <p className="text-xs text-gray-500">
                        {profileData.equipment.childrenAges.map((a: string) =>
                          a === "0-3" ? "0-3 ans" : a === "4-10" ? "4-10 ans" : "11-17 ans"
                        ).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {profileData.equipment.providesFood && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Utensils className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Alimentation</p>
                    <p className="text-xs text-gray-500">Fournie</p>
                  </div>
                </div>
              )}

              {profileData.icadRegistered && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Shield className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">I-CAD</p>
                    <p className="text-xs text-gray-500">Inscrit</p>
                  </div>
                </div>
              )}
            </div>
          </motion.section>
        )}

        {/* Galerie photos */}
        {profileData.gallery.filter((p: string) => p && typeof p === "string" && p.trim() !== "").length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-gray-100"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <span className="p-2.5 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl">
                <ImageIcon className="w-6 h-6 text-primary" />
              </span>
              Galerie photos
              <span className="text-sm font-normal text-gray-400 ml-auto">
                {profileData.gallery.filter((p: string) => p && typeof p === "string" && p.trim() !== "").length}
              </span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {profileData.gallery.filter((p: string) => p && typeof p === "string" && p.trim() !== "").slice(0, 6).map((photo: string, index: number) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setGalleryLightboxIndex(index)}
                  className={cn(
                    "relative aspect-square rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow",
                    index === 0 && "sm:col-span-2 sm:row-span-2"
                  )}
                >
                  <Image
                    src={photo}
                    alt={`Photo ${index + 1}`}
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-300"
                  />
                  {index === 5 && profileData.gallery.length > 6 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white font-bold text-xl">
                        +{profileData.gallery.length - 6}
                      </span>
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.section>
        )}

        {/* Avis */}
        {profileData.reviews.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-gray-100"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <span className="p-2.5 bg-gradient-to-br from-amber-100 to-yellow-100 rounded-xl">
                <Star className="w-6 h-6 text-amber-500" />
              </span>
              Avis
              <div className="flex items-center gap-2 ml-auto">
                <div className="flex items-center gap-1 px-3 py-1 bg-amber-50 rounded-lg">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="font-bold text-gray-900">{profileData.rating.toFixed(1)}</span>
                </div>
                <span className="text-sm text-gray-400">({profileData.reviewCount})</span>
              </div>
            </h2>

            <div className="space-y-4">
              {profileData.reviews.slice(0, 5).map((review: ReviewData, index: number) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                  className="p-4 bg-gray-50 rounded-2xl"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-gray-600">
                        {review.reviewer.firstName.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-gray-900">
                          {review.reviewer.firstName} {review.reviewer.lastName}
                        </p>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "w-4 h-4",
                                i < review.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-gray-200"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-gray-600 text-sm mt-1">{review.comment}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(review.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {profileData.reviews.length > 5 && (
              <button className="w-full mt-4 py-3 text-primary font-medium hover:bg-primary/5 rounded-xl transition-colors">
                Voir tous les avis ({profileData.reviewCount})
              </button>
            )}
          </motion.section>
        )}

        {/* Services / Annonces (pour annonceurs) */}
        {profileData.isAnnouncer && profileData.services.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-gray-100"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <span className="p-2.5 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                </span>
                Ses annonces
              </h2>
              <Link
                href={`/annonceur/${slug}`}
                className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
              >
                Voir le profil annonceur
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profileData.services.map((service: ServiceData, index: number) => {
                // Trouver le prix minimum
                const minPrice = service.formules.reduce((min, f) => {
                  const prices = [f.basePrice, f.pricePerHour, f.pricePerDay].filter(Boolean) as number[];
                  const formuleMin = prices.length > 0 ? Math.min(...prices) : Infinity;
                  return formuleMin < min ? formuleMin : min;
                }, Infinity);

                return (
                  <Link
                    key={service.id}
                    href={`/annonceur/${slug}?service=${service.categorySlug}`}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + index * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center text-2xl">
                          {service.categoryIcon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900">{service.categoryName}</h3>
                          <p className="text-sm text-gray-500">
                            {service.formules.length} service{service.formules.length > 1 ? "s" : ""}
                          </p>
                        </div>
                        {minPrice !== Infinity && (
                          <div className="text-right">
                            <p className="text-xs text-gray-400">À partir de</p>
                            <p className="font-bold text-primary">
                              {(minPrice / 100).toFixed(0)}€
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Animal types */}
                      {service.animalTypes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {service.animalTypes.map((type) => (
                            <span
                              key={type}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs"
                            >
                              <span>{animalEmojis[type.toLowerCase()] || "🐾"}</span>
                              <span className="capitalize">{type}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </motion.section>
        )}
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
