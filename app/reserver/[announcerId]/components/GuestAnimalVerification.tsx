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
      <div>
        <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-1">
          Étape · Animal
        </div>
        <h3 className="text-base font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
          Quel animal réservez-vous ?
        </h3>
        <p className="text-[13px] text-[#6d6d68] leading-[1.5] mt-1 mb-4">
          Ce prestataire accepte les chiens et les chats.
        </p>

        {/* Boutons de sélection */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setSelectedAnimalType("chien")}
            className="flex items-center gap-3 p-3 text-left transition-all"
            style={{
              borderRadius: 12,
              border: `1px solid ${selectedAnimalType === "chien" ? "#1f3a33" : "#ece9e1"}`,
              background: selectedAnimalType === "chien" ? "#f5f9f6" : "#fff",
            }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: selectedAnimalType === "chien" ? "#fff" : "#f7f5ef",
                border: `1px solid ${selectedAnimalType === "chien" ? "#cfdbd3" : "#ece9e1"}`,
              }}
            >
              <Dog
                className="w-4 h-4"
                style={{ color: selectedAnimalType === "chien" ? "#1f3a33" : "#6d6d68" }}
              />
            </div>
            <span
              className="text-[13.5px] font-semibold tracking-[-0.01em]"
              style={{ color: selectedAnimalType === "chien" ? "#1f3a33" : "#1f1f1d" }}
            >
              Chien
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedAnimalType("chat")}
            className="flex items-center gap-3 p-3 text-left transition-all"
            style={{
              borderRadius: 12,
              border: `1px solid ${selectedAnimalType === "chat" ? "#1f3a33" : "#ece9e1"}`,
              background: selectedAnimalType === "chat" ? "#f5f9f6" : "#fff",
            }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: selectedAnimalType === "chat" ? "#fff" : "#f7f5ef",
                border: `1px solid ${selectedAnimalType === "chat" ? "#cfdbd3" : "#ece9e1"}`,
              }}
            >
              <Cat
                className="w-4 h-4"
                style={{ color: selectedAnimalType === "chat" ? "#1f3a33" : "#6d6d68" }}
              />
            </div>
            <span
              className="text-[13.5px] font-semibold tracking-[-0.01em]"
              style={{ color: selectedAnimalType === "chat" ? "#1f3a33" : "#1f1f1d" }}
            >
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
