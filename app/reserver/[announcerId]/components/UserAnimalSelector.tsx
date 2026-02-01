"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { PawPrint, Check, Plus, Dog, Cat, AlertCircle } from "lucide-react";
import { cn } from "@/app/lib/utils";
import Link from "next/link";

// Type pour les animaux de l'utilisateur
interface UserAnimal {
  id: string;
  name: string;
  type: string;
  emoji?: string;
  breed?: string;
  primaryPhotoUrl?: string | null;
  size?: string;
}

interface UserAnimalSelectorProps {
  // Animaux de l'utilisateur
  userAnimals: UserAnimal[] | null | undefined;
  // Animaux sélectionnés
  selectedAnimalIds: string[];
  // Types d'animaux acceptés par le service
  acceptedAnimalTypes: string[];
  // Callback de sélection
  onSelectionChange: (animalIds: string[]) => void;
  // Mode de sélection (single ou multiple)
  selectionMode?: "single" | "multiple";
  // Formule collective (permet plusieurs animaux)
  isCollectiveFormula?: boolean;
  // Nombre max d'animaux (pour les formules collectives)
  maxAnimals?: number;
  className?: string;
}

// Labels pour les types d'animaux
const animalLabels: Record<string, { emoji: string; label: string }> = {
  chien: { emoji: "🐕", label: "Chien" },
  chat: { emoji: "🐈", label: "Chat" },
  lapin: { emoji: "🐰", label: "Lapin" },
  rongeur: { emoji: "🐹", label: "Rongeur" },
  oiseau: { emoji: "🦜", label: "Oiseau" },
  poisson: { emoji: "🐠", label: "Poisson" },
  reptile: { emoji: "🦎", label: "Reptile" },
  nac: { emoji: "🐾", label: "NAC" },
  autre: { emoji: "🐾", label: "Autre" },
};

export default function UserAnimalSelector({
  userAnimals,
  selectedAnimalIds,
  acceptedAnimalTypes,
  onSelectionChange,
  selectionMode = "single",
  isCollectiveFormula = false,
  maxAnimals,
  className,
}: UserAnimalSelectorProps) {
  // Filtrer les animaux selon les types acceptés par le service
  const eligibleAnimals = useMemo(() => {
    if (!userAnimals) return [];
    return userAnimals.filter((animal) =>
      acceptedAnimalTypes.includes(animal.type.toLowerCase())
    );
  }, [userAnimals, acceptedAnimalTypes]);

  // Animaux non éligibles (pour affichage informatif)
  const ineligibleAnimals = useMemo(() => {
    if (!userAnimals) return [];
    return userAnimals.filter((animal) =>
      !acceptedAnimalTypes.includes(animal.type.toLowerCase())
    );
  }, [userAnimals, acceptedAnimalTypes]);

  // Gérer la sélection/désélection d'un animal
  const toggleAnimal = (animalId: string) => {
    if (selectionMode === "single") {
      // Mode single : remplacer la sélection
      if (selectedAnimalIds.includes(animalId)) {
        onSelectionChange([]);
      } else {
        onSelectionChange([animalId]);
      }
    } else {
      // Mode multiple
      if (selectedAnimalIds.includes(animalId)) {
        onSelectionChange(selectedAnimalIds.filter((id) => id !== animalId));
      } else {
        // Vérifier la limite si définie
        if (maxAnimals && selectedAnimalIds.length >= maxAnimals) {
          return;
        }
        onSelectionChange([...selectedAnimalIds, animalId]);
      }
    }
  };

  // Pas d'animaux ? Afficher un message
  if (!userAnimals || userAnimals.length === 0) {
    return (
      <div className={cn("bg-white rounded-2xl p-5 shadow-sm", className)}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-amber-100">
            <PawPrint className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Vos animaux</h3>
            <p className="text-sm text-text-light">
              Sélectionnez l&apos;animal pour cette réservation
            </p>
          </div>
        </div>

        <div className="text-center py-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <PawPrint className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 mb-2">
            Vous n&apos;avez pas encore ajouté d&apos;animaux
          </p>
          <p className="text-sm text-text-light mb-4">
            Ajoutez vos animaux pour faciliter vos réservations
          </p>
          <Link
            href="/client/mes-animaux/nouveau"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ajouter un animal
          </Link>
        </div>
      </div>
    );
  }

  // Aucun animal éligible pour ce service
  if (eligibleAnimals.length === 0) {
    return (
      <div className={cn("bg-white rounded-2xl p-5 shadow-sm", className)}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-amber-100">
            <PawPrint className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Vos animaux</h3>
            <p className="text-sm text-text-light">
              Sélectionnez l&apos;animal pour cette réservation
            </p>
          </div>
        </div>

        <div className="p-4 bg-amber-50 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">
                Aucun animal compatible
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Ce prestataire accepte uniquement les{" "}
                {acceptedAnimalTypes.map((type, i) => {
                  const info = animalLabels[type] || { emoji: "🐾", label: type };
                  return (
                    <span key={type}>
                      {i > 0 && (i === acceptedAnimalTypes.length - 1 ? " et " : ", ")}
                      {info.emoji} {info.label.toLowerCase()}s
                    </span>
                  );
                })}
                .
              </p>
              {ineligibleAnimals.length > 0 && (
                <p className="text-sm text-amber-600 mt-2">
                  Vos animaux ({ineligibleAnimals.map(a => a.name).join(", ")}) ne correspondent pas.
                </p>
              )}
              <Link
                href="/client/mes-animaux/nouveau"
                className="inline-flex items-center gap-2 mt-3 text-sm text-amber-700 hover:text-amber-800 font-medium"
              >
                <Plus className="w-4 h-4" />
                Ajouter un {acceptedAnimalTypes[0]}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-2xl p-5 shadow-sm", className)}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-amber-100">
          <PawPrint className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">
            {isCollectiveFormula ? "Sélectionnez vos animaux" : "Sélectionnez votre animal"}
          </h3>
          <p className="text-sm text-text-light">
            {isCollectiveFormula
              ? `Vous pouvez inscrire jusqu'à ${maxAnimals || "plusieurs"} animaux`
              : "Quel animal accompagnera cette prestation ?"}
          </p>
        </div>
      </div>

      {/* Types acceptés */}
      <div className="flex flex-wrap gap-2 mb-4">
        {acceptedAnimalTypes.map((type) => {
          const info = animalLabels[type] || { emoji: "🐾", label: type };
          return (
            <span
              key={type}
              className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"
            >
              {info.emoji} {info.label} accepté
            </span>
          );
        })}
      </div>

      {/* Liste des animaux éligibles */}
      <div className="space-y-2">
        {eligibleAnimals.map((animal) => {
          const isSelected = selectedAnimalIds.includes(animal.id);
          const isDisabled = Boolean(
            selectionMode === "multiple" &&
            maxAnimals &&
            !isSelected &&
            selectedAnimalIds.length >= maxAnimals
          );

          return (
            <button
              key={animal.id}
              type="button"
              onClick={() => toggleAnimal(animal.id)}
              disabled={isDisabled}
              className={cn(
                "w-full p-3 rounded-xl border-2 transition-all flex items-center gap-3 text-left",
                isSelected
                  ? "border-primary bg-primary/5"
                  : isDisabled
                    ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              )}
            >
              {/* Photo ou emoji */}
              <div className="relative flex-shrink-0">
                {animal.primaryPhotoUrl ? (
                  <div className="relative w-12 h-12 rounded-full overflow-hidden">
                    <Image
                      src={animal.primaryPhotoUrl}
                      alt={animal.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center text-xl",
                      isSelected ? "bg-primary/20" : "bg-gray-100"
                    )}
                  >
                    {animal.emoji ||
                      (animal.type.toLowerCase() === "chien" ? "🐕" :
                       animal.type.toLowerCase() === "chat" ? "🐈" : "🐾")}
                  </div>
                )}
                {/* Badge de sélection */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center"
                    >
                      <Check className="w-3 h-3 text-white" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "font-medium truncate",
                    isSelected ? "text-primary" : "text-foreground"
                  )}
                >
                  {animal.name}
                </p>
                <p className="text-sm text-text-light truncate">
                  {(() => {
                    const info = animalLabels[animal.type.toLowerCase()];
                    return info ? `${info.emoji} ${info.label}` : animal.type;
                  })()}
                  {animal.breed && ` - ${animal.breed}`}
                </p>
              </div>

              {/* Icône type */}
              <div className="flex-shrink-0">
                {animal.type.toLowerCase() === "chien" ? (
                  <Dog
                    className={cn(
                      "w-5 h-5",
                      isSelected ? "text-primary" : "text-gray-400"
                    )}
                  />
                ) : animal.type.toLowerCase() === "chat" ? (
                  <Cat
                    className={cn(
                      "w-5 h-5",
                      isSelected ? "text-purple-600" : "text-gray-400"
                    )}
                  />
                ) : (
                  <PawPrint
                    className={cn(
                      "w-5 h-5",
                      isSelected ? "text-primary" : "text-gray-400"
                    )}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Animaux non éligibles (affichage informatif) */}
      {ineligibleAnimals.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-text-light mb-2">
            Non disponibles pour cette prestation :
          </p>
          <div className="flex flex-wrap gap-2">
            {ineligibleAnimals.map((animal) => (
              <span
                key={animal.id}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full"
              >
                {animal.emoji || "🐾"} {animal.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Lien pour ajouter un animal */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <Link
          href="/client/mes-animaux/nouveau"
          className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80"
        >
          <Plus className="w-4 h-4" />
          Ajouter un autre animal
        </Link>
      </div>

      {/* Indicateur de sélection */}
      {isCollectiveFormula && selectedAnimalIds.length > 0 && (
        <div className="mt-4 p-3 bg-green-50 rounded-xl">
          <p className="text-sm text-green-700">
            <span className="font-medium">{selectedAnimalIds.length}</span> animal
            {selectedAnimalIds.length > 1 ? "ux" : ""} sélectionné
            {selectedAnimalIds.length > 1 ? "s" : ""}
            {maxAnimals && ` (max. ${maxAnimals})`}
          </p>
        </div>
      )}
    </div>
  );
}
