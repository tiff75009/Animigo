"use client";

import { PawPrint, Check, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/app/lib/utils";
import StepNav from "./StepNav";
import StepCard, { StepHeader } from "./StepCard";

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
      <StepCard tone={hasAnimalsSelected ? "success" : "default"}>
        <StepHeader
          eyebrow="Étape · Animaux"
          title="Vos animaux"
          description="Sélectionnez le ou les animaux pour cette prestation."
          rightSlot={
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
              style={{ background: "#f7f5ef", color: "#6d6d68" }}
            >
              {selectedAnimalIds.length} sélectionné{selectedAnimalIds.length > 1 ? "s" : ""}
            </span>
          }
        />

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
                    className="w-full flex items-center gap-3 p-3 transition-all text-left hover:bg-[#f7f5ef]/60"
                    style={{
                      borderRadius: 12,
                      border: `1px solid ${
                        isSelected ? "#1f3a33" : hasError ? "#f1cdcd" : "#ece9e1"
                      }`,
                      background: isSelected
                        ? "#eaf0ed"
                        : hasError
                          ? "#fdf6f6"
                          : "#fff",
                    }}
                  >
                    {animal.profilePhoto ? (
                      <img
                        src={animal.profilePhoto}
                        alt={animal.name}
                        className="w-11 h-11 rounded-full object-cover"
                        style={{ border: "1px solid rgba(0,0,0,0.05)" }}
                      />
                    ) : (
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center"
                        style={{ background: "#f7f5ef" }}
                      >
                        <PawPrint className="w-5 h-5" style={{ color: "#9c9484" }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[14px] font-semibold tracking-[-0.01em] truncate"
                        style={{
                          color: isSelected ? "#1f3a33" : hasError ? "#8a3a3a" : "#1f1f1d",
                        }}
                      >
                        {animal.name}
                      </p>
                      <p className="text-[12px] text-[#6d6d68] capitalize truncate">
                        {animal.type}
                        {animal.breed && ` · ${animal.breed}`}
                      </p>
                    </div>
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center transition-all flex-shrink-0"
                      style={{
                        background: isSelected
                          ? "#1f3a33"
                          : hasError
                            ? "#fdf0f0"
                            : "#fff",
                        border: `1px solid ${
                          isSelected ? "#1f3a33" : hasError ? "#f1cdcd" : "#dfdcd4"
                        }`,
                      }}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      {hasError && !isSelected && (
                        <AlertTriangle className="w-3 h-3" style={{ color: "#c45656" }} />
                      )}
                    </div>
                  </button>
                  {hasError && (
                    <p className="text-[11px] mt-1 ml-1" style={{ color: "#8a3a3a" }}>
                      {hasError}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className="p-3 text-[13px]"
            style={{
              borderRadius: 10,
              background: "#fdf8ec",
              color: "#7a5b1a",
              border: "1px solid #f4e6c1",
            }}
          >
            Aucun de vos animaux n&apos;est compatible avec cette formule.
          </div>
        )}
      </StepCard>

      <StepNav onPrevStep={onPrevStep} onNextStep={onNextStep} canProceed={canProceed} />
    </motion.div>
  );
}
