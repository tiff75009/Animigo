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
  Palette,
  Scissors,
  ChevronLeft,
  ChevronRight,
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

// Données des races pour les infos supplémentaires
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

  // Toutes les photos
  const allPhotos = [
    animal?.profilePhoto || animal?.primaryPhotoUrl,
    ...(animal?.galleryPhotos || []),
  ].filter(Boolean) as string[];

  // Navigation photos
  const nextPhoto = () => {
    if (allPhotos.length > 1) {
      setCurrentPhotoIndex((prev) => (prev + 1) % allPhotos.length);
    }
  };

  const prevPhoto = () => {
    if (allPhotos.length > 1) {
      setCurrentPhotoIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length);
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

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/client/mes-animaux"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Retour</span>
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

      {/* Photo principale avec galerie */}
      <div className="relative">
        <div className="aspect-[4/3] sm:aspect-[16/9] rounded-2xl overflow-hidden bg-gradient-to-br from-secondary/20 to-secondary/5">
          {allPhotos.length > 0 ? (
            <>
              <motion.img
                key={currentPhotoIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                src={allPhotos[currentPhotoIndex]}
                alt={animal.name}
                className="w-full h-full object-cover"
              />
              {allPhotos.length > 1 && (
                <>
                  <button
                    onClick={prevPhoto}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-700 hover:bg-white transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={nextPhoto}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-700 hover:bg-white transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {allPhotos.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentPhotoIndex(idx)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          idx === currentPhotoIndex ? "bg-white" : "bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-8xl">{animalType.emoji}</span>
            </div>
          )}
        </div>

        {/* Badge hypoallergénique */}
        {breedInfo?.hypoallergenic && (
          <div className="absolute top-3 right-3 px-3 py-1.5 bg-green-500 text-white rounded-full text-sm font-medium flex items-center gap-1.5 shadow-lg">
            <Sparkles className="w-4 h-4" />
            Hypoallergénique
          </div>
        )}
      </div>

      {/* Nom et infos principales */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              {animal.name}
              {animal.gender === "male" && <span className="text-blue-500">♂</span>}
              {animal.gender === "female" && <span className="text-pink-500">♀</span>}
            </h1>
            <p className="text-gray-500">
              {animalType.emoji} {animalType.name}
              {animal.breed && ` • ${animal.breed}`}
            </p>
          </div>
        </div>

        {/* Badges rapides */}
        <div className="flex flex-wrap gap-2">
          {animal.birthDate && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium">
              <Calendar className="w-4 h-4" />
              {getAnimalAge(animal.birthDate)}
            </span>
          )}
          {animal.weight && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium">
              <Scale className="w-4 h-4" />
              {animal.weight} kg
            </span>
          )}
          {animal.size && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium">
              <Ruler className="w-4 h-4" />
              {SIZE_LABELS[animal.size] || animal.size}
            </span>
          )}
          {breedInfo?.origin && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-sm font-medium">
              <MapPin className="w-4 h-4" />
              {breedInfo.origin}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {animal.description && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Description</h2>
          <p className="text-gray-600">{animal.description}</p>
        </div>
      )}

      {/* Informations de la race (si chien) */}
      {breedInfo && (
        <div className="bg-gradient-to-br from-secondary/5 to-primary/5 rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <PawPrint className="w-5 h-5 text-primary" />
            Informations sur la race
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {breedInfo.lifeExpectancy && (
              <div className="bg-white rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <Clock className="w-4 h-4" />
                  Espérance de vie
                </div>
                <p className="font-semibold text-gray-900">
                  {breedInfo.lifeExpectancy.min}-{breedInfo.lifeExpectancy.max} ans
                </p>
              </div>
            )}
            {breedInfo.coatType && (
              <div className="bg-white rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <Scissors className="w-4 h-4" />
                  Type de poil
                </div>
                <p className="font-semibold text-gray-900">{breedInfo.coatType}</p>
              </div>
            )}
            {breedInfo.fciGroupName && (
              <div className="bg-white rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <Shield className="w-4 h-4" />
                  Groupe FCI
                </div>
                <p className="font-semibold text-gray-900 text-sm">
                  {breedInfo.fciGroup} - {breedInfo.fciGroupName.slice(0, 30)}...
                </p>
              </div>
            )}
            {breedInfo.weight?.male && (
              <div className="bg-white rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <Scale className="w-4 h-4" />
                  Poids typique
                </div>
                <p className="font-semibold text-gray-900">
                  {breedInfo.weight.male.min}-{breedInfo.weight.male.max} kg
                </p>
              </div>
            )}
          </div>
          {breedInfo.temperament && breedInfo.temperament.length > 0 && (
            <div className="mt-4">
              <p className="text-gray-500 text-sm mb-2">Tempérament typique de la race</p>
              <div className="flex flex-wrap gap-2">
                {breedInfo.temperament.slice(0, 6).map((trait) => (
                  <span
                    key={trait}
                    className="px-3 py-1 bg-white text-gray-700 rounded-full text-sm capitalize"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Compatibilité */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Heart className="w-5 h-5 text-primary" />
          Compatibilité
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className={`p-4 rounded-xl text-center ${
            animal.goodWithChildren === true
              ? "bg-green-50 text-green-700"
              : animal.goodWithChildren === false
              ? "bg-red-50 text-red-700"
              : "bg-gray-50 text-gray-500"
          }`}>
            <Baby className="w-6 h-6 mx-auto mb-2" />
            <p className="text-sm font-medium">Enfants</p>
            <p className="text-xs mt-1">
              {animal.goodWithChildren === true ? "Oui" : animal.goodWithChildren === false ? "Non" : "?"}
            </p>
          </div>
          <div className={`p-4 rounded-xl text-center ${
            animal.goodWithDogs === true
              ? "bg-green-50 text-green-700"
              : animal.goodWithDogs === false
              ? "bg-red-50 text-red-700"
              : "bg-gray-50 text-gray-500"
          }`}>
            <Dog className="w-6 h-6 mx-auto mb-2" />
            <p className="text-sm font-medium">Chiens</p>
            <p className="text-xs mt-1">
              {animal.goodWithDogs === true ? "Oui" : animal.goodWithDogs === false ? "Non" : "?"}
            </p>
          </div>
          <div className={`p-4 rounded-xl text-center ${
            animal.goodWithCats === true
              ? "bg-green-50 text-green-700"
              : animal.goodWithCats === false
              ? "bg-red-50 text-red-700"
              : "bg-gray-50 text-gray-500"
          }`}>
            <Cat className="w-6 h-6 mx-auto mb-2" />
            <p className="text-sm font-medium">Chats</p>
            <p className="text-xs mt-1">
              {animal.goodWithCats === true ? "Oui" : animal.goodWithCats === false ? "Non" : "?"}
            </p>
          </div>
          <div className={`p-4 rounded-xl text-center ${
            animal.goodWithOtherAnimals === true
              ? "bg-green-50 text-green-700"
              : animal.goodWithOtherAnimals === false
              ? "bg-red-50 text-red-700"
              : "bg-gray-50 text-gray-500"
          }`}>
            <PawPrint className="w-6 h-6 mx-auto mb-2" />
            <p className="text-sm font-medium">Autres</p>
            <p className="text-xs mt-1">
              {animal.goodWithOtherAnimals === true ? "Oui" : animal.goodWithOtherAnimals === false ? "Non" : "?"}
            </p>
          </div>
        </div>
      </div>

      {/* Traits de caractère */}
      {animal.behaviorTraits && animal.behaviorTraits.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-secondary" />
            Caractère
          </h2>
          <div className="flex flex-wrap gap-2">
            {animal.behaviorTraits.map((trait) => (
              <span
                key={trait}
                className="px-4 py-2 bg-secondary/10 text-secondary rounded-full font-medium"
              >
                {trait}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Santé */}
      {(animal.hasAllergies || animal.medicalConditions || animal.specialNeeds) && (
        <div className="bg-orange-50 rounded-2xl border border-orange-100 p-6">
          <h2 className="font-semibold text-orange-800 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Informations de santé
          </h2>
          <div className="space-y-4">
            {animal.hasAllergies && (
              <div>
                <p className="font-medium text-orange-700">Allergies</p>
                <p className="text-orange-600">{animal.allergiesDetails || "Oui (détails non précisés)"}</p>
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

      {/* Galerie miniatures */}
      {allPhotos.length > 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Galerie photos</h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {allPhotos.map((photo, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentPhotoIndex(idx)}
                className={`aspect-square rounded-lg overflow-hidden ${
                  idx === currentPhotoIndex ? "ring-2 ring-primary" : ""
                }`}
              >
                <img src={photo} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
