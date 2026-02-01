"use client";

import { PawPrint, Check, AlertTriangle, ChevronLeft, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/app/lib/utils";

interface UserAnimal {
  id: string;
  name: string;
  type: string;
  breed?: string;
  profilePhoto?: string;
}

interface AnimalsStepProps {
  userAnimals: UserAnimal[];
  selectedAnimalIds: string[];
  connectedDogErrors: Record<string, string>;
  onAnimalToggle: (animalId: string, animalType: string) => void;
  onPrevStep: () => void;
  onNextStep: () => void;
  canProceed: boolean;
  slideVariants: Record<string, { x: number; opacity: number }>;
  slideDirection: "left" | "right";
}

export default function AnimalsStep({
  userAnimals,
  selectedAnimalIds,
  connectedDogErrors,
  onAnimalToggle,
  onPrevStep,
  onNextStep,
  canProceed,
  slideVariants,
  slideDirection,
}: AnimalsStepProps) {
  const hasAnimalsSelected = selectedAnimalIds.length > 0;

  return (
    <motion.div
      key="animals"
      initial={slideDirection === "right" ? "enterFromRight" : "enterFromLeft"}
      animate="center"
      exit={slideDirection === "right" ? "exitToLeft" : "exitToRight"}
      variants={slideVariants}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <div className={cn(
        "bg-white rounded-2xl p-5 sm:p-6 border-2 transition-colors duration-300",
        hasAnimalsSelected ? "border-gray-100" : "border-primary/30"
      )}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="p-2 rounded-lg bg-primary/10">
              <PawPrint className="w-5 h-5 text-primary" />
            </span>
            Vos animaux
          </h3>
          <span className="text-sm text-gray-500">
            {selectedAnimalIds.length} sélectionné{selectedAnimalIds.length > 1 ? "s" : ""}
          </span>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Sélectionnez le ou les animaux pour cette prestation.
        </p>

        {userAnimals.length > 0 ? (
          <div className="grid gap-2">
            {userAnimals.map((animal) => {
              const isSelected = selectedAnimalIds.includes(animal.id);
              const hasError = connectedDogErrors[animal.id];
              return (
                <div key={animal.id}>
                  <button
                    type="button"
                    onClick={() => onAnimalToggle(animal.id, animal.type)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                      isSelected ? "border-primary bg-primary/5" :
                      hasError ? "border-red-300 bg-red-50" :
                      "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    {animal.profilePhoto ? (
                      <img src={animal.profilePhoto} alt={animal.name} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                        <PawPrint className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className={cn("font-semibold", isSelected ? "text-primary" : hasError ? "text-red-700" : "text-gray-900")}>{animal.name}</p>
                      <p className="text-sm text-gray-500 capitalize">{animal.type}{animal.breed && ` • ${animal.breed}`}</p>
                    </div>
                    <div className={cn(
                      "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
                      isSelected ? "bg-primary border-primary" :
                      hasError ? "border-red-300 bg-red-100" :
                      "border-gray-300 bg-white"
                    )}>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                      {hasError && !isSelected && <AlertTriangle className="w-3 h-3 text-red-500" />}
                    </div>
                  </button>
                  {/* Afficher l'erreur de restriction */}
                  {hasError && (
                    <p className="text-xs text-red-600 mt-1 ml-2">{hasError}</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 bg-amber-50 rounded-xl text-amber-700 text-sm">
            Aucun de vos animaux n'est compatible avec cette formule.
          </div>
        )}
      </div>

      {/* Boutons de navigation */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={onPrevStep}
          className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Précédent
        </button>
        <button
          onClick={onNextStep}
          disabled={!canProceed}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-colors",
            canProceed
              ? "bg-primary text-white hover:bg-primary/90"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          )}
        >
          Continuer
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}
