"use client";

import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft,
  Edit2,
  Calendar,
  Scale,
  Ruler,
  MapPin,
  Heart,
  Baby,
  Dog,
  Cat,
  Sparkles,
  AlertCircle,
  Loader2,
  PawPrint,
  Shield,
  Clock,
  Scissors,
  ChevronLeft,
  ChevronRight,
  Info,
  Activity,
  Stethoscope,
  HelpCircle,
} from "lucide-react";
import { useState, useEffect } from "react";

// Types d'animaux
const ANIMAL_TYPES: Record<string, { name: string; emoji: string }> = {
  chien: { name: "Chien", emoji: "🐕" },
  chat: { name: "Chat", emoji: "🐱" },
  oiseau: { name: "Oiseau", emoji: "🐦" },
  rongeur: { name: "Rongeur", emoji: "🐹" },
  poisson: { name: "Poisson", emoji: "🐠" },
  reptile: { name: "Reptile", emoji: "🦎" },
  nac: { name: "NAC", emoji: "🐾" },
};

const SIZE_LABELS: Record<string, string> = {
  petit: "Petit",
  moyen: "Moyen",
  grand: "Grand",
  tres_grand: "Très grand",
};

interface BreedInfo {
  origin?: string;
  lifeExpectancy?: { min: number; max: number };
  fciGroup?: number;
  fciGroupName?: string;
  hypoallergenic?: boolean;
  coatType?: string;
  colors?: string[];
  temperament?: string[];
  weight?: { male?: { min: number; max: number }; female?: { min: number; max: number } };
}

export default function AnimalProfilePage() {
  const params = useParams();
  const animalId = params.animalId as string;
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [breedInfo, setBreedInfo] = useState<BreedInfo | null>(null);

  const animal = useQuery(
    api.animals.getAnimal,
    token && animalId ? { token, animalId: animalId as Id<"animals"> } : "skip"
  );

  // Charger les infos de race si c'est un chien
  useEffect(() => {
    if (animal?.type === "chien" && animal?.breed) {
      fetch("/data/dog-breeds.json")
        .then((res) => res.json())
        .then((data) => {
          const normalizedBreed = animal.breed?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const breed = data.breeds.find((b: { name: string; slug: string }) => {
            const normalizedName = b.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return normalizedName === normalizedBreed || b.slug === normalizedBreed?.replace(/\s+/g, "-");
          });
          if (breed) {
            setBreedInfo(breed);
          }
        })
        .catch(() => {});
    }
  }, [animal?.type, animal?.breed]);

  // Calculer l'âge
  const getAnimalAge = (birthDate?: string) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();

    if (years === 0) {
      if (months <= 0) return "Moins d'un mois";
      return `${months} mois`;
    }
    if (years === 1 && months < 0) {
      return `${12 + months} mois`;
    }
    if (years < 2) {
      return `${years} an${months > 0 ? ` et ${months} mois` : ""}`;
    }
    return `${years} ans`;
  };

  // Toutes les photos (galerie uniquement, sans la photo de profil)
  const galleryPhotos = (animal?.galleryPhotos || []).filter(Boolean) as string[];

  // Navigation photos galerie
  const nextPhoto = () => {
    if (galleryPhotos.length > 1) {
      setCurrentPhotoIndex((prev) => (prev + 1) % galleryPhotos.length);
    }
  };

  const prevPhoto = () => {
    if (galleryPhotos.length > 1) {
      setCurrentPhotoIndex((prev) => (prev - 1 + galleryPhotos.length) % galleryPhotos.length);
    }
  };

  // Chargement
  if (!animal && token && animalId) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!animal) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <PawPrint className="w-16 h-16 text-gray-300 mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Animal introuvable</h1>
        <p className="text-gray-500 mb-6">Cet animal n&apos;existe pas ou a été supprimé.</p>
        <Link
          href="/client/mes-animaux"
          className="px-6 py-3 bg-primary text-white rounded-xl font-medium"
        >
          Retour à mes animaux
        </Link>
      </div>
    );
  }

  const animalType = ANIMAL_TYPES[animal.type] || { name: animal.type, emoji: "🐾" };
  const profilePhoto = animal.profilePhoto || animal.primaryPhotoUrl;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/client/mes-animaux"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Mes animaux</span>
        </Link>

        <Link href={`/client/mes-animaux/${animalId}/modifier`}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium"
          >
            <Edit2 className="w-4 h-4" />
            Modifier
          </motion.button>
        </Link>
      </div>

      {/* Section principale : Photo + Infos */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          {/* Photo de profil */}
          <div className="sm:w-48 md:w-56 flex-shrink-0 p-4 sm:p-6">
            <div className="relative mx-auto w-32 h-32 sm:w-full sm:h-auto sm:aspect-square">
              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt={animal.name}
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <div className="w-full h-full rounded-2xl bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center">
                  <span className="text-5xl sm:text-6xl">{animalType.emoji}</span>
                </div>
              )}
              {breedInfo?.hypoallergenic && (
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg" title="Hypoallergénique">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          </div>

          {/* Informations principales */}
          <div className="flex-1 p-4 sm:p-6 sm:pl-0">
            {/* Nom et type */}
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                {animal.name}
                {animal.gender === "male" && <span className="text-blue-500 text-xl">♂</span>}
                {animal.gender === "female" && <span className="text-pink-500 text-xl">♀</span>}
              </h1>
              <p className="text-gray-500 mt-1">
                {animalType.emoji} {animalType.name}
                {animal.breed && <span className="font-medium text-gray-700"> • {animal.breed}</span>}
              </p>
            </div>

            {/* Badges caractéristiques */}
            <div className="flex flex-wrap gap-2 mb-4">
              {animal.birthDate && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium">
                  <Calendar className="w-4 h-4" />
                  {getAnimalAge(animal.birthDate)}
                </div>
              )}
              {animal.weight && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium">
                  <Scale className="w-4 h-4" />
                  {animal.weight} kg
                </div>
              )}
              {animal.size && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium">
                  <Ruler className="w-4 h-4" />
                  {SIZE_LABELS[animal.size] || animal.size}
                </div>
              )}
              {breedInfo?.origin && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-sm font-medium">
                  <MapPin className="w-4 h-4" />
                  {breedInfo.origin}
                </div>
              )}
            </div>

            {/* Description */}
            {animal.description && (
              <p className="text-gray-600 text-sm leading-relaxed">{animal.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Grid 2 colonnes pour le reste */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Colonne gauche */}
        <div className="space-y-4">
          {/* Compatibilité */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              Compatibilité
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "goodWithChildren", label: "Enfants", icon: Baby, value: animal.goodWithChildren },
                { key: "goodWithDogs", label: "Chiens", icon: Dog, value: animal.goodWithDogs },
                { key: "goodWithCats", label: "Chats", icon: Cat, value: animal.goodWithCats },
                { key: "goodWithOtherAnimals", label: "Autres", icon: PawPrint, value: animal.goodWithOtherAnimals },
              ].map(({ key, label, icon: Icon, value }) => (
                <div
                  key={key}
                  className={`p-3 rounded-xl text-center ${
                    value === true
                      ? "bg-green-50 text-green-700"
                      : value === false
                      ? "bg-red-50 text-red-700"
                      : "bg-gray-50 text-gray-400"
                  }`}
                >
                  <Icon className="w-5 h-5 mx-auto mb-1" />
                  <p className="text-xs font-medium">{label}</p>
                  <p className="text-[10px] mt-0.5">
                    {value === true ? "Oui" : value === false ? "Non" : "Inconnu"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Caractère */}
          {animal.behaviorTraits && animal.behaviorTraits.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-secondary" />
                Caractère
              </h2>
              <div className="flex flex-wrap gap-2">
                {animal.behaviorTraits.map((trait: string) => (
                  <span
                    key={trait}
                    className="px-3 py-1.5 bg-secondary/10 text-secondary rounded-full text-sm font-medium"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Santé */}
          {(animal.hasAllergies || animal.medicalConditions || animal.specialNeeds) && (
            <div className="bg-orange-50 rounded-2xl border border-orange-100 p-5">
              <h2 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                <Stethoscope className="w-5 h-5" />
                Santé
              </h2>
              <div className="space-y-3 text-sm">
                {animal.hasAllergies && (
                  <div>
                    <p className="font-medium text-orange-700">Allergies</p>
                    <p className="text-orange-600">{animal.allergiesDetails || "Oui"}</p>
                  </div>
                )}
                {animal.medicalConditions && (
                  <div>
                    <p className="font-medium text-orange-700">Conditions médicales</p>
                    <p className="text-orange-600">{animal.medicalConditions}</p>
                  </div>
                )}
                {animal.specialNeeds && (
                  <div>
                    <p className="font-medium text-orange-700">Besoins particuliers</p>
                    <p className="text-orange-600">{animal.specialNeeds}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Colonne droite */}
        <div className="space-y-4">
          {/* Informations de la race */}
          {breedInfo && (
            <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                Infos sur la race
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {breedInfo.lifeExpectancy && (
                  <div className="bg-white/80 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                      <Clock className="w-3.5 h-3.5" />
                      Espérance de vie
                    </div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {breedInfo.lifeExpectancy.min}-{breedInfo.lifeExpectancy.max} ans
                    </p>
                  </div>
                )}
                {breedInfo.coatType && (
                  <div className="bg-white/80 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                      <Scissors className="w-3.5 h-3.5" />
                      Type de poil
                    </div>
                    <p className="font-semibold text-gray-900 text-sm">{breedInfo.coatType}</p>
                  </div>
                )}
                {breedInfo.weight?.male && (
                  <div className="bg-white/80 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                      <Scale className="w-3.5 h-3.5" />
                      Poids typique
                    </div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {breedInfo.weight.male.min}-{breedInfo.weight.male.max} kg
                    </p>
                  </div>
                )}
                {breedInfo.fciGroup && (
                  <div className="bg-white/80 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1 group relative">
                      <Shield className="w-3.5 h-3.5" />
                      Groupe FCI
                      <HelpCircle className="w-3 h-3 text-gray-400 cursor-help" />
                      <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 shadow-lg">
                        <p className="font-medium mb-1">Fédération Cynologique Internationale</p>
                        <p className="text-gray-300">Classification officielle des races de chiens en 10 groupes selon leurs caractéristiques et fonctions (bergers, terriers, chiens de compagnie, etc.)</p>
                        <div className="absolute left-4 top-full -mt-1 border-4 border-transparent border-t-gray-900" />
                      </div>
                    </div>
                    <p className="font-semibold text-gray-900 text-sm">
                      Groupe {breedInfo.fciGroup}
                    </p>
                  </div>
                )}
              </div>
              {breedInfo.temperament && breedInfo.temperament.length > 0 && (
                <div className="mt-4">
                  <p className="text-gray-500 text-xs mb-2 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    Tempérament typique
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {breedInfo.temperament.slice(0, 5).map((trait) => (
                      <span
                        key={trait}
                        className="px-2 py-1 bg-white/80 text-gray-600 rounded-full text-xs capitalize"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Galerie photos */}
          {galleryPhotos.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Photos</h2>

              {/* Photo principale de la galerie */}
              <div className="relative aspect-video rounded-xl overflow-hidden mb-3">
                <motion.img
                  key={currentPhotoIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  src={galleryPhotos[currentPhotoIndex]}
                  alt={`Photo ${currentPhotoIndex + 1}`}
                  className="w-full h-full object-cover"
                />
                {galleryPhotos.length > 1 && (
                  <>
                    <button
                      onClick={prevPhoto}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-700 hover:bg-white transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={nextPhoto}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-700 hover:bg-white transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 rounded-full text-white text-xs">
                      {currentPhotoIndex + 1} / {galleryPhotos.length}
                    </div>
                  </>
                )}
              </div>

              {/* Miniatures */}
              {galleryPhotos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {galleryPhotos.map((photo, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPhotoIndex(idx)}
                      className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden transition-all ${
                        idx === currentPhotoIndex
                          ? "ring-2 ring-primary ring-offset-1"
                          : "opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={photo} alt={`Miniature ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
