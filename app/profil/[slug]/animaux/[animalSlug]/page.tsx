"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Heart,
  Scale,
  Ruler,
  Cake,
  PawPrint,
  Baby,
  Dog,
  Cat,
  Loader2,
  Camera,
  Sparkles,
  Check,
  X as XIcon,
  ChevronLeft,
  ChevronRight,
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

// Labels type
const typeLabels: Record<string, string> = {
  chien: "Chien",
  chat: "Chat",
  oiseau: "Oiseau",
  rongeur: "Rongeur",
  poisson: "Poisson",
  reptile: "Reptile",
  nac: "NAC",
};

// Labels genre
const genderLabels: Record<string, { label: string; color: string; icon: string }> = {
  male: { label: "Mâle", color: "bg-blue-100 text-blue-700", icon: "♂" },
  female: { label: "Femelle", color: "bg-pink-100 text-pink-700", icon: "♀" },
};

// Labels taille
const sizeLabels: Record<string, string> = {
  petit: "Petit",
  moyen: "Moyen",
  grand: "Grand",
  "très grand": "Très grand",
  tres_grand: "Très grand",
};

// Icones traits de comportement
const traitIcons: Record<string, string> = {
  "Joueur": "🎾",
  "Calme": "😌",
  "Énergique": "⚡",
  "Sociable": "🤝",
  "Indépendant": "🐺",
  "Affectueux": "💕",
  "Territorial": "🏠",
  "Anxieux": "😰",
  "Peureux": "😨",
  "Agressif": "😤",
};

// Calculer l'âge
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

// Formater l'âge en texte
function formatAge(birthDate: string | null | undefined, ageField: number | null | undefined): string | null {
  const age = calculateAge(birthDate);
  if (age !== null) {
    if (age === 0) return "Moins d'1 an";
    return `${age} an${age > 1 ? "s" : ""}`;
  }
  if (ageField) {
    return `${ageField} an${ageField > 1 ? "s" : ""}`;
  }
  return null;
}

interface AnimalData {
  id: string;
  name: string;
  slug: string;
  type: string;
  breed?: string | null;
  gender?: string;
  birthDate?: string | null;
  age?: number | null;
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

export default function AnimalProfilePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const animalSlug = params.animalSlug as string;

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Récupérer le profil complet (contient les animaux)
  const profileData = useQuery(api.public.profile.getPublicProfileBySlug, { slug });

  if (profileData === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <div className="text-center">
            <p className="text-6xl mb-4">🐾</p>
            <h1 className="text-2xl font-bold text-foreground mb-2">Profil introuvable</h1>
            <button onClick={() => router.back()} className="text-primary hover:underline">
              Retour
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Trouver l'animal par son slug
  const animal = (profileData.animals as AnimalData[]).find(
    (a) => a.slug === animalSlug
  );

  if (!animal) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <div className="text-center">
            <p className="text-6xl mb-4">🐾</p>
            <h1 className="text-2xl font-bold text-foreground mb-2">Animal introuvable</h1>
            <Link href={`/profil/${slug}`} className="text-primary hover:underline">
              Retour au profil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Données dérivées
  const emoji = animalEmojis[animal.type.toLowerCase()] || "🐾";
  const typeLabel = typeLabels[animal.type.toLowerCase()] || animal.type;
  const ageText = formatAge(animal.birthDate, animal.age);
  const genderInfo = animal.gender && animal.gender !== "unknown" ? genderLabels[animal.gender] : null;
  const sizeLabel = animal.size ? sizeLabels[animal.size] || animal.size : null;

  // Galerie complète (photo profil + galerie)
  const allPhotos: string[] = [];
  if (animal.profilePhoto) allPhotos.push(animal.profilePhoto);
  if (animal.galleryPhotos) allPhotos.push(...animal.galleryPhotos);

  // Compatibilités
  const compatibilities = [
    { key: "children", label: "Enfants", icon: Baby, value: animal.goodWithChildren },
    { key: "dogs", label: "Chiens", icon: Dog, value: animal.goodWithDogs },
    { key: "cats", label: "Chats", icon: Cat, value: animal.goodWithCats },
    { key: "others", label: "Autres animaux", icon: PawPrint, value: animal.goodWithOtherAnimals },
  ].filter((c) => c.value !== null && c.value !== undefined);

  // Caractéristiques physiques
  const physicalTraits = [
    ageText ? { icon: Cake, label: "Âge", value: ageText } : null,
    animal.weight ? { icon: Scale, label: "Poids", value: `${animal.weight} kg` } : null,
    sizeLabel ? { icon: Ruler, label: "Taille", value: sizeLabel } : null,
    { icon: PawPrint, label: "Espèce", value: `${emoji} ${typeLabel}` },
  ].filter(Boolean) as { icon: typeof Cake; label: string; value: string }[];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <div className="relative">
        {/* Photo/Gradient hero */}
        <div className="relative h-64 sm:h-80 md:h-96 overflow-hidden pt-16">
          {animal.profilePhoto ? (
            <Image
              src={animal.profilePhoto}
              alt={animal.name}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-secondary/20 to-amber-200/30" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Bouton retour */}
          <div className="absolute top-4 left-4 z-20">
            <Link
              href={`/profil/${slug}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/90 backdrop-blur-sm rounded-full text-sm font-medium text-gray-800 hover:bg-white transition-all shadow-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour au profil
            </Link>
          </div>

          {/* Badge photos */}
          {allPhotos.length > 1 && (
            <button
              onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
              className="absolute top-4 right-4 z-20 inline-flex items-center gap-1.5 px-3 py-2 bg-white/90 backdrop-blur-sm rounded-full text-sm font-medium text-gray-800 hover:bg-white transition-all shadow-lg"
            >
              <Camera className="w-4 h-4" />
              {allPhotos.length} photos
            </button>
          )}

          {/* Infos sur le hero */}
          <div className="absolute bottom-0 left-0 right-0 z-10 p-6 sm:p-8">
            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex items-end gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
                        {animal.name}
                      </h1>
                      {genderInfo && (
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-sm font-semibold",
                          genderInfo.color
                        )}>
                          {genderInfo.icon} {genderInfo.label}
                        </span>
                      )}
                    </div>
                    <p className="text-white/80 text-lg">
                      {animal.breed || typeLabel}
                      {ageText && ` · ${ageText}`}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-6 relative z-10 pb-16 space-y-6">

        {/* Caractéristiques physiques */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-gray-100"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {physicalTraits.map((trait, i) => (
              <motion.div
                key={trait.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                className="text-center p-4 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <trait.icon className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{trait.label}</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{trait.value}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Description */}
        {animal.description && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-gray-100"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2.5">
              <span className="p-2 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl">
                <Sparkles className="w-5 h-5 text-purple-500" />
              </span>
              A propos de {animal.name}
            </h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">
              {animal.description}
            </p>
          </motion.section>
        )}

        {/* Traits de comportement */}
        {animal.behaviorTraits && animal.behaviorTraits.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-gray-100"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2.5">
              <span className="p-2 bg-gradient-to-br from-secondary/20 to-secondary/10 rounded-xl">
                <Heart className="w-5 h-5 text-secondary" />
              </span>
              Caractere
            </h2>
            <div className="flex flex-wrap gap-3">
              {animal.behaviorTraits.map((trait, i) => (
                <motion.span
                  key={trait}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-secondary/10 to-secondary/5 text-secondary border border-secondary/20 rounded-2xl text-sm font-medium"
                >
                  <span className="text-base">{traitIcons[trait] || "✨"}</span>
                  {trait}
                </motion.span>
              ))}
            </div>
          </motion.section>
        )}

        {/* Compatibilité */}
        {compatibilities.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-gray-100"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2.5">
              <span className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl">
                <PawPrint className="w-5 h-5 text-amber-600" />
              </span>
              Compatibilite
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {compatibilities.map((compat, i) => {
                const isGood = compat.value === true;
                return (
                  <motion.div
                    key={compat.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 + i * 0.05 }}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-colors",
                      isGood
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      isGood ? "bg-green-100" : "bg-red-100"
                    )}>
                      {isGood ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <XIcon className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <span className={cn(
                      "text-sm font-medium text-center",
                      isGood ? "text-green-700" : "text-red-600"
                    )}>
                      {compat.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* Galerie photos */}
        {allPhotos.length > 1 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-gray-100"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2.5">
              <span className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl">
                <Camera className="w-5 h-5 text-primary" />
              </span>
              Photos
              <span className="text-sm font-normal text-gray-400 ml-auto">
                {allPhotos.length}
              </span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {allPhotos.map((photo, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }}
                  className={cn(
                    "relative aspect-square rounded-2xl overflow-hidden group cursor-pointer",
                    i === 0 && allPhotos.length > 2 && "sm:col-span-2 sm:row-span-2"
                  )}
                >
                  <Image
                    src={photo}
                    alt={`${animal.name} - photo ${i + 1}`}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </motion.button>
              ))}
            </div>
          </motion.section>
        )}

        {/* Propriétaire */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Link
            href={`/profil/${slug}`}
            className="block bg-white rounded-3xl p-6 shadow-lg border border-gray-100 hover:border-primary/30 hover:shadow-xl transition-all group"
          >
            <div className="flex items-center gap-4">
              {profileData.profileImage ? (
                <div className="w-14 h-14 rounded-2xl overflow-hidden ring-2 ring-white shadow-md flex-shrink-0">
                  <Image
                    src={profileData.profileImage}
                    alt={profileData.firstName}
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-bold text-primary">
                    {profileData.firstName.charAt(0)}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-400">Proprietaire</p>
                <p className="font-bold text-gray-900 group-hover:text-primary transition-colors truncate">
                  {profileData.firstName} {profileData.lastName.charAt(0)}.
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary transition-colors" />
            </div>
          </Link>
        </motion.section>
      </div>

      {/* Lightbox */}
      {allPhotos.length > 0 && (
        <ImageLightbox
          images={allPhotos}
          currentIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}
