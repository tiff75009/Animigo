"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Trees,
  Car,
  Dog,
  Home,
  Building2,
  Baby,
  Cigarette,
  CigaretteOff,
  Utensils,
  Shield,
  ChevronDown,
  Cake,
  Scale,
  Ruler,
  Heart,
  Sparkles,
  Check,
  X as XIcon,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { AnnouncerData, animalEmojis } from "./types";
import ImageLightbox from "@/app/components/ui/ImageLightbox";

interface AnnouncerAboutProps {
  announcer: AnnouncerData;
  className?: string;
}

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
};

export default function AnnouncerAbout({ announcer, className }: AnnouncerAboutProps) {
  const { equipment } = announcer;
  const [expandedAnimalId, setExpandedAnimalId] = useState<string | null>(null);
  // Lightbox state: track which animal and which image index
  const [lightboxAnimalId, setLightboxAnimalId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);

  const toggleAnimal = (animalId: string) => {
    setExpandedAnimalId(expandedAnimalId === animalId ? null : animalId);
  };

  // Get all photos for an animal
  const getAnimalPhotos = (animal: typeof announcer.ownAnimals[0]) => {
    const photos: string[] = [];
    if (animal.profilePhoto) photos.push(animal.profilePhoto);
    if (animal.galleryPhotos) photos.push(...animal.galleryPhotos);
    return photos;
  };

  // Current animal being viewed in lightbox
  const currentAnimal = useMemo(() => {
    if (!lightboxAnimalId) return null;
    return announcer.ownAnimals.find((a, i) => (a.id || `animal-${i}`) === lightboxAnimalId);
  }, [lightboxAnimalId, announcer.ownAnimals]);

  const currentAnimalPhotos = useMemo(() => {
    if (!currentAnimal) return [];
    return getAnimalPhotos(currentAnimal);
  }, [currentAnimal]);

  const openLightbox = (animalId: string, photoIndex: number) => {
    setLightboxAnimalId(animalId);
    setLightboxIndex(photoIndex);
  };

  const closeLightbox = () => {
    setLightboxAnimalId(null);
    setLightboxIndex(0);
  };

  return (
    <section className={className}>
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span className="p-2 bg-secondary/10 rounded-lg">
          <Users className="w-5 h-5 text-secondary" />
        </span>
        À propos de {announcer.firstName}
      </h2>
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100">
        {/* Bio */}
        {announcer.bio ? (
          <p className="text-gray-600 whitespace-pre-line leading-relaxed">
            {announcer.bio}
          </p>
        ) : (
          <p className="text-gray-400 italic">Pas de description disponible</p>
        )}

        {/* Equipment Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-gray-100">
          {/* Type de logement */}
          {equipment.housingType && (
            <div className="flex items-center gap-2 text-gray-600">
              <div className="p-2 bg-primary/10 rounded-lg">
                {equipment.housingType === "house" ? (
                  <Home className="w-4 h-4 text-primary" />
                ) : (
                  <Building2 className="w-4 h-4 text-primary" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {equipment.housingType === "house" ? "Maison" : "Appartement"}
                </p>
                {equipment.housingSize && (
                  <p className="text-xs text-gray-500">{equipment.housingSize} m²</p>
                )}
              </div>
            </div>
          )}

          {/* Jardin */}
          {equipment.hasGarden && (
            <div className="flex items-center gap-2 text-gray-600">
              <div className="p-2 bg-green-50 rounded-lg">
                <Trees className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Jardin</p>
                {equipment.gardenSize && (
                  <p className="text-xs text-gray-500">
                    {equipment.gardenSize === "petit" ? "Petit" :
                     equipment.gardenSize === "moyen" ? "Moyen" : "Grand"}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Véhicule */}
          {equipment.hasVehicle && (
            <div className="flex items-center gap-2 text-gray-600">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Car className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Véhicule</p>
                <p className="text-xs text-gray-500">Disponible</p>
              </div>
            </div>
          )}

          {/* Non-fumeur */}
          {equipment.isSmoker === false && (
            <div className="flex items-center gap-2 text-gray-600">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <CigaretteOff className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Non-fumeur</p>
                <p className="text-xs text-gray-500">Environnement sain</p>
              </div>
            </div>
          )}

          {/* Fumeur */}
          {equipment.isSmoker === true && (
            <div className="flex items-center gap-2 text-gray-600">
              <div className="p-2 bg-orange-50 rounded-lg">
                <Cigarette className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Fumeur</p>
              </div>
            </div>
          )}

          {/* Enfants */}
          {equipment.hasChildren && (
            <div className="flex items-center gap-2 text-gray-600">
              <div className="p-2 bg-pink-50 rounded-lg">
                <Baby className="w-4 h-4 text-pink-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Enfants</p>
                {equipment.childrenAges.length > 0 && (
                  <p className="text-xs text-gray-500">
                    {equipment.childrenAges.map(a =>
                      a === "0-3" ? "0-3 ans" : a === "4-10" ? "4-10 ans" : "11-17 ans"
                    ).join(", ")}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Pas d'enfants */}
          {equipment.hasChildren === false && (
            <div className="flex items-center gap-2 text-gray-600">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Baby className="w-4 h-4 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Pas d&apos;enfants</p>
              </div>
            </div>
          )}

          {/* Alimentation fournie */}
          {equipment.providesFood === true && (
            <div className="flex items-center gap-2 text-gray-600">
              <div className="p-2 bg-green-50 rounded-lg">
                <Utensils className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Alimentation</p>
                <p className="text-xs text-gray-500">Fournie</p>
              </div>
            </div>
          )}

          {/* I-CAD */}
          {announcer.icadRegistered && (
            <div className="flex items-center gap-2 text-gray-600">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Shield className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">I-CAD</p>
                <p className="text-xs text-gray-500">Inscrit</p>
              </div>
            </div>
          )}
        </div>

        {/* Animaux de l'annonceur - Section améliorée */}
        {announcer.ownAnimals && announcer.ownAnimals.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-amber-50 rounded-lg">
                <Dog className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="font-semibold text-gray-900">
                Les compagnons de {announcer.firstName}
              </h3>
              <span className="text-sm text-gray-500">
                ({announcer.ownAnimals.length})
              </span>
            </div>

            {/* Liste des animaux avec accordéon */}
            <div className="space-y-3">
              {announcer.ownAnimals.map((animal, index) => {
                const animalId = animal.id || `animal-${index}`;
                const isExpanded = expandedAnimalId === animalId;
                const hasPhotos = animal.profilePhoto || (animal.galleryPhotos && animal.galleryPhotos.length > 0);

                return (
                  <div
                    key={animalId}
                    className={cn(
                      "rounded-xl border transition-all overflow-hidden",
                      isExpanded
                        ? "border-primary/30 bg-gradient-to-br from-primary/5 to-secondary/5"
                        : "border-gray-100 bg-gray-50 hover:bg-gray-100"
                    )}
                  >
                    {/* Header cliquable */}
                    <button
                      onClick={() => toggleAnimal(animalId)}
                      className="w-full p-4 flex items-center gap-4 text-left"
                    >
                      {/* Photo ou emoji */}
                      <div className="relative flex-shrink-0">
                        {animal.profilePhoto ? (
                          <div className="w-14 h-14 rounded-xl overflow-hidden ring-2 ring-white shadow-md">
                            <Image
                              src={animal.profilePhoto}
                              alt={animal.name}
                              width={56}
                              height={56}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center ring-2 ring-white shadow-md">
                            <span className="text-2xl">
                              {animalEmojis[animal.type.toLowerCase()] || "🐾"}
                            </span>
                          </div>
                        )}
                        {hasPhotos && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold shadow">
                            📷
                          </div>
                        )}
                      </div>

                      {/* Infos de base */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">
                            {animal.name}
                          </h4>
                          {animal.gender && animal.gender !== "unknown" && (
                            <span className={cn(
                              "text-xs px-1.5 py-0.5 rounded-full",
                              animal.gender === "male"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-pink-100 text-pink-700"
                            )}>
                              {animal.gender === "male" ? "♂" : "♀"}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          {animal.breed || animal.type}
                          {animal.age && ` • ${animal.age} an${animal.age > 1 ? "s" : ""}`}
                        </p>
                      </div>

                      {/* Chevron */}
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      </motion.div>
                    </button>

                    {/* Contenu expandable */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="px-4 pb-4 space-y-4">
                            {/* Description - seulement si différente du nom */}
                            {animal.description && animal.description.trim().toLowerCase() !== animal.name.trim().toLowerCase() && (
                              <p className="text-sm text-gray-600 bg-white/50 rounded-lg p-3">
                                {animal.description}
                              </p>
                            )}

                            {/* Infos détaillées */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {animal.age && (
                                <div className="flex items-center gap-2 p-2 bg-white/50 rounded-lg">
                                  <Cake className="w-4 h-4 text-amber-500" />
                                  <div>
                                    <p className="text-xs text-gray-500">Âge</p>
                                    <p className="text-sm font-medium text-gray-900">
                                      {animal.age} an{animal.age > 1 ? "s" : ""}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {animal.weight && (
                                <div className="flex items-center gap-2 p-2 bg-white/50 rounded-lg">
                                  <Scale className="w-4 h-4 text-blue-500" />
                                  <div>
                                    <p className="text-xs text-gray-500">Poids</p>
                                    <p className="text-sm font-medium text-gray-900">
                                      {animal.weight} kg
                                    </p>
                                  </div>
                                </div>
                              )}

                              {animal.size && (
                                <div className="flex items-center gap-2 p-2 bg-white/50 rounded-lg">
                                  <Ruler className="w-4 h-4 text-purple-500" />
                                  <div>
                                    <p className="text-xs text-gray-500">Taille</p>
                                    <p className="text-sm font-medium text-gray-900">
                                      {sizeLabels[animal.size] || animal.size}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {animal.gender && animal.gender !== "unknown" && (
                                <div className="flex items-center gap-2 p-2 bg-white/50 rounded-lg">
                                  <span className={cn(
                                    "w-4 h-4 flex items-center justify-center text-sm",
                                    animal.gender === "male" ? "text-blue-500" : "text-pink-500"
                                  )}>
                                    {animal.gender === "male" ? "♂" : "♀"}
                                  </span>
                                  <div>
                                    <p className="text-xs text-gray-500">Genre</p>
                                    <p className="text-sm font-medium text-gray-900">
                                      {genderLabels[animal.gender]}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Compatibilité */}
                            {(animal.goodWithChildren !== null || animal.goodWithDogs !== null || animal.goodWithCats !== null || animal.goodWithOtherAnimals !== null) && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                  <Heart className="w-4 h-4 text-pink-500" />
                                  <span>Compatibilité</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {animal.goodWithChildren !== null && (
                                    <span className={cn(
                                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
                                      animal.goodWithChildren
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"
                                    )}>
                                      {animal.goodWithChildren ? <Check className="w-3 h-3" /> : <XIcon className="w-3 h-3" />}
                                      Enfants
                                    </span>
                                  )}
                                  {animal.goodWithDogs !== null && (
                                    <span className={cn(
                                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
                                      animal.goodWithDogs
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"
                                    )}>
                                      {animal.goodWithDogs ? <Check className="w-3 h-3" /> : <XIcon className="w-3 h-3" />}
                                      Chiens
                                    </span>
                                  )}
                                  {animal.goodWithCats !== null && (
                                    <span className={cn(
                                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
                                      animal.goodWithCats
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"
                                    )}>
                                      {animal.goodWithCats ? <Check className="w-3 h-3" /> : <XIcon className="w-3 h-3" />}
                                      Chats
                                    </span>
                                  )}
                                  {animal.goodWithOtherAnimals !== null && (
                                    <span className={cn(
                                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
                                      animal.goodWithOtherAnimals
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"
                                    )}>
                                      {animal.goodWithOtherAnimals ? <Check className="w-3 h-3" /> : <XIcon className="w-3 h-3" />}
                                      Autres animaux
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Traits de caractère */}
                            {animal.behaviorTraits && animal.behaviorTraits.length > 0 && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                  <Sparkles className="w-4 h-4 text-secondary" />
                                  <span>Caractère</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {animal.behaviorTraits.map((trait, traitIndex) => (
                                    <span
                                      key={traitIndex}
                                      className="px-2.5 py-1 bg-secondary/10 text-secondary rounded-full text-xs font-medium"
                                    >
                                      {trait}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Galerie photos */}
                            {(animal.profilePhoto || (animal.galleryPhotos && animal.galleryPhotos.length > 0)) && (
                              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                                  {animal.profilePhoto && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openLightbox(animalId, 0);
                                      }}
                                      className="relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden shadow-md hover:shadow-lg hover:scale-105 transition-all ring-2 ring-white"
                                    >
                                      <Image
                                        src={animal.profilePhoto}
                                        alt={`${animal.name} - Photo principale`}
                                        fill
                                        className="object-cover"
                                      />
                                    </button>
                                  )}
                                  {animal.galleryPhotos?.map((photo, photoIndex) => (
                                    <button
                                      key={photoIndex}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Index is +1 if there's a profile photo, otherwise just photoIndex
                                        const idx = animal.profilePhoto ? photoIndex + 1 : photoIndex;
                                        openLightbox(animalId, idx);
                                      }}
                                      className="relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden shadow-md hover:shadow-lg hover:scale-105 transition-all ring-2 ring-white"
                                    >
                                      <Image
                                        src={photo}
                                        alt={`${animal.name} - Photo ${photoIndex + 1}`}
                                        fill
                                        className="object-cover"
                                      />
                                    </button>
                                  ))}
                              </div>
                            )}

                            {/* Message si pas d'infos supplémentaires */}
                            {(!animal.description || animal.description.trim().toLowerCase() === animal.name.trim().toLowerCase()) &&
                             !animal.weight &&
                             !animal.size &&
                             !hasPhotos &&
                             animal.goodWithChildren === null &&
                             animal.goodWithDogs === null &&
                             animal.goodWithCats === null &&
                             animal.goodWithOtherAnimals === null &&
                             (!animal.behaviorTraits || animal.behaviorTraits.length === 0) && (
                              <p className="text-sm text-gray-400 italic text-center py-2">
                                Pas d&apos;informations supplémentaires
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox pour les photos */}
      <ImageLightbox
        images={currentAnimalPhotos}
        currentIndex={lightboxIndex}
        isOpen={lightboxAnimalId !== null}
        onClose={closeLightbox}
        onNavigate={setLightboxIndex}
        altPrefix={currentAnimal ? `Photo de ${currentAnimal.name}` : "Photo"}
      />
    </section>
  );
}
