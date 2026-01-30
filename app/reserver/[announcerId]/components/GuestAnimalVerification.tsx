"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dog, Cat, PawPrint } from "lucide-react";
import { cn } from "@/app/lib/utils";
import GuestDogVerification, { type GuestDogData } from "./GuestDogVerification";
import GuestCatVerification, { type GuestCatData } from "./GuestCatVerification";
import type { DogSize } from "@/data/categorized-dog-breeds";
import type { CatSize } from "@/data/cat-breeds";

// Type unifié pour les données d'animal invité
export interface GuestAnimalData {
  animalType: "chien" | "chat";
  // Champs communs
  breed: string;
  breedSlug: string | null;
  isMixedBreed: boolean;
  size: DogSize | CatSize;
  weight?: number;
  // Champs spécifiques chien
  dogData?: GuestDogData;
  // Champs spécifiques chat
  catData?: GuestCatData;
}

interface GuestAnimalVerificationProps {
  // Types d'animaux acceptés par le service
  acceptedAnimalTypes: string[];
  // Restrictions pour les chiens
  dogRestrictions?: {
    acceptedDogSizes: DogSize[];
    dogCategoryAcceptance: "none" | "cat1" | "cat2" | "both";
  };
  // Type d'animal pré-sélectionné
  preSelectedAnimalType?: "chien" | "chat";
  // Callbacks
  onAnimalDataChange: (data: GuestAnimalData | null) => void;
  onValidationChange: (isValid: boolean, error?: string) => void;
  // Initial data
  initialData?: GuestAnimalData | null;
  className?: string;
}

export default function GuestAnimalVerification({
  acceptedAnimalTypes,
  dogRestrictions,
  preSelectedAnimalType,
  onAnimalDataChange,
  onValidationChange,
  initialData,
  className,
}: GuestAnimalVerificationProps) {
  // Déterminer les types d'animaux disponibles
  const acceptsDogs = acceptedAnimalTypes.includes("chien");
  const acceptsCats = acceptedAnimalTypes.includes("chat");
  const acceptsBoth = acceptsDogs && acceptsCats;

  // Type d'animal sélectionné
  const [selectedAnimalType, setSelectedAnimalType] = useState<"chien" | "chat">(() => {
    if (initialData?.animalType) return initialData.animalType;
    if (preSelectedAnimalType) return preSelectedAnimalType;
    if (acceptsDogs) return "chien";
    if (acceptsCats) return "chat";
    return "chien";
  });

  // États pour chaque type d'animal
  const [dogData, setDogData] = useState<GuestDogData | null>(initialData?.dogData || null);
  const [catData, setCatData] = useState<GuestCatData | null>(initialData?.catData || null);
  const [dogValid, setDogValid] = useState(false);
  const [catValid, setCatValid] = useState(false);
  const [dogError, setDogError] = useState<string | undefined>();
  const [catError, setCatError] = useState<string | undefined>();

  // Mettre à jour les données quand le type change
  useEffect(() => {
    if (selectedAnimalType === "chien" && dogData && dogValid) {
      const animalData: GuestAnimalData = {
        animalType: "chien",
        breed: dogData.breed,
        breedSlug: dogData.breedSlug,
        isMixedBreed: dogData.isMixedBreed,
        size: dogData.size,
        weight: dogData.weight,
        dogData,
      };
      onAnimalDataChange(animalData);
      onValidationChange(true);
    } else if (selectedAnimalType === "chat" && catData && catValid) {
      const animalData: GuestAnimalData = {
        animalType: "chat",
        breed: catData.breed,
        breedSlug: catData.breedSlug,
        isMixedBreed: catData.isMixedBreed,
        size: catData.size,
        weight: catData.weight,
        catData,
      };
      onAnimalDataChange(animalData);
      onValidationChange(true);
    } else {
      onAnimalDataChange(null);
      onValidationChange(false, selectedAnimalType === "chien" ? dogError : catError);
    }
  }, [selectedAnimalType, dogData, catData, dogValid, catValid, dogError, catError, onAnimalDataChange, onValidationChange]);

  // Handlers pour le chien
  const handleDogDataChange = (data: GuestDogData | null) => {
    setDogData(data);
  };

  const handleDogValidationChange = (isValid: boolean, error?: string) => {
    setDogValid(isValid);
    setDogError(error);
  };

  // Handlers pour le chat
  const handleCatDataChange = (data: GuestCatData | null) => {
    setCatData(data);
  };

  const handleCatValidationChange = (isValid: boolean, error?: string) => {
    setCatValid(isValid);
    setCatError(error);
  };

  // Si un seul type d'animal est accepté, afficher directement le formulaire
  if (!acceptsBoth) {
    if (acceptsDogs && dogRestrictions) {
      return (
        <GuestDogVerification
          acceptedDogSizes={dogRestrictions.acceptedDogSizes}
          dogCategoryAcceptance={dogRestrictions.dogCategoryAcceptance}
          onDogDataChange={handleDogDataChange}
          onValidationChange={handleDogValidationChange}
          initialData={dogData}
          className={className}
        />
      );
    }

    if (acceptsCats) {
      return (
        <GuestCatVerification
          onCatDataChange={handleCatDataChange}
          onValidationChange={handleCatValidationChange}
          initialData={catData}
          className={className}
        />
      );
    }

    return null;
  }

  // Les deux types sont acceptés - afficher le sélecteur
  return (
    <div className={cn("space-y-4", className)}>
      {/* Sélecteur de type d'animal */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <PawPrint className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Quel animal réservez-vous ?</h3>
            <p className="text-sm text-text-light">
              Ce prestataire accepte les chiens et les chats
            </p>
          </div>
        </div>

        {/* Boutons de sélection */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSelectedAnimalType("chien")}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
              selectedAnimalType === "chien"
                ? "border-primary bg-primary/5"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            )}
          >
            <div className={cn(
              "p-3 rounded-full transition-colors",
              selectedAnimalType === "chien"
                ? "bg-primary/10"
                : "bg-gray-100"
            )}>
              <Dog className={cn(
                "w-6 h-6",
                selectedAnimalType === "chien" ? "text-primary" : "text-gray-500"
              )} />
            </div>
            <span className={cn(
              "font-medium",
              selectedAnimalType === "chien" ? "text-primary" : "text-foreground"
            )}>
              Chien
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedAnimalType("chat")}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
              selectedAnimalType === "chat"
                ? "border-purple-500 bg-purple-50"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            )}
          >
            <div className={cn(
              "p-3 rounded-full transition-colors",
              selectedAnimalType === "chat"
                ? "bg-purple-100"
                : "bg-gray-100"
            )}>
              <Cat className={cn(
                "w-6 h-6",
                selectedAnimalType === "chat" ? "text-purple-600" : "text-gray-500"
              )} />
            </div>
            <span className={cn(
              "font-medium",
              selectedAnimalType === "chat" ? "text-purple-600" : "text-foreground"
            )}>
              Chat
            </span>
          </button>
        </div>
      </div>

      {/* Formulaire de vérification selon le type sélectionné */}
      <AnimatePresence mode="wait">
        {selectedAnimalType === "chien" && dogRestrictions && (
          <motion.div
            key="dog"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <GuestDogVerification
              acceptedDogSizes={dogRestrictions.acceptedDogSizes}
              dogCategoryAcceptance={dogRestrictions.dogCategoryAcceptance}
              onDogDataChange={handleDogDataChange}
              onValidationChange={handleDogValidationChange}
              initialData={dogData}
            />
          </motion.div>
        )}

        {selectedAnimalType === "chat" && (
          <motion.div
            key="cat"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <GuestCatVerification
              onCatDataChange={handleCatDataChange}
              onValidationChange={handleCatValidationChange}
              initialData={catData}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export type { GuestDogData, GuestCatData };
