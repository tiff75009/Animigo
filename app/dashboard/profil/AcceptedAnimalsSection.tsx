"use client";

import { motion } from "framer-motion";
import { CheckCircle, XCircle, Heart, Car } from "lucide-react";
import { cn } from "@/app/lib/utils";

const ANIMAL_TYPES = [
  { type: "chien", label: "Chien", emoji: "🐕" },
  { type: "chat", label: "Chat", emoji: "🐈" },
  { type: "lapin", label: "Lapin", emoji: "🐰" },
  { type: "rongeur", label: "Rongeur", emoji: "🐹" },
  { type: "oiseau", label: "Oiseau", emoji: "🦜" },
  { type: "reptile", label: "Reptile", emoji: "🦎" },
  { type: "poisson", label: "Poisson", emoji: "🐠" },
  { type: "autre", label: "Autre", emoji: "🐾" },
];

interface AcceptedAnimalsSectionProps {
  acceptedAnimals: string[];
  maxAnimalsPerSlot: number | undefined;
  hasVehicle: boolean | undefined;
  onAcceptedAnimalsChange: (animals: string[]) => void;
  onMaxAnimalsChange: (max: number) => void;
  onHasVehicleChange: (hasVehicle: boolean) => void;
}

export default function AcceptedAnimalsSection({
  acceptedAnimals,
  maxAnimalsPerSlot,
  hasVehicle,
  onAcceptedAnimalsChange,
  onMaxAnimalsChange,
  onHasVehicleChange,
}: AcceptedAnimalsSectionProps) {
  const toggleAnimal = (animalType: string) => {
    if (acceptedAnimals.includes(animalType)) {
      onAcceptedAnimalsChange(acceptedAnimals.filter(a => a !== animalType));
    } else {
      onAcceptedAnimalsChange([...acceptedAnimals, animalType]);
    }
  };

  return (
    <motion.div
      id="section-animaux"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white rounded-3xl shadow-lg p-6"
    >
      <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
        <Heart className="w-5 h-5 text-primary" />
        Animaux acceptés
      </h3>

      {/* Capacité maximale */}
      <div className="mb-6">
        <p className="text-sm font-medium text-foreground mb-3">Capacité maximale</p>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
            <motion.button
              key={num}
              type="button"
              onClick={() => onMaxAnimalsChange(num)}
              className={cn(
                "w-12 h-12 rounded-xl border-2 font-semibold text-lg transition-all",
                maxAnimalsPerSlot === num
                  ? "border-primary bg-primary text-white"
                  : "border-foreground/10 bg-white text-foreground hover:border-foreground/20"
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {num}
            </motion.button>
          ))}
        </div>
        {!maxAnimalsPerSlot && (
          <p className="text-xs text-amber-500 mt-2">Sélectionnez une capacité maximale</p>
        )}
      </div>

      {/* Types d'animaux */}
      <div className="mb-6">
        <p className="text-sm font-medium text-foreground mb-3">Types d&apos;animaux</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {ANIMAL_TYPES.map(animal => {
            const isAccepted = acceptedAnimals.includes(animal.type);
            return (
              <motion.button
                key={animal.type}
                type="button"
                onClick={() => toggleAnimal(animal.type)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer",
                  isAccepted
                    ? "bg-green-50 border-2 border-green-300"
                    : "bg-gray-50 border-2 border-gray-200 hover:border-gray-300"
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-2xl">{animal.emoji}</span>
                <span className={cn("font-medium", isAccepted ? "text-green-700" : "text-gray-500")}>
                  {animal.label}
                </span>
                {isAccepted ? (
                  <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-300 ml-auto" />
                )}
              </motion.button>
            );
          })}
        </div>
        {acceptedAnimals.length === 0 && (
          <p className="text-xs text-amber-500 mt-2">Sélectionnez au moins un type d&apos;animal</p>
        )}
      </div>

      {/* Équipements */}
      <div>
        <p className="text-sm font-medium text-foreground mb-3">Équipements</p>
        <div className="flex flex-wrap gap-3">
          <motion.button
            type="button"
            onClick={() => onHasVehicleChange(!hasVehicle)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all",
              hasVehicle
                ? "border-secondary bg-secondary/5 text-secondary"
                : "border-foreground/10 bg-white text-foreground hover:border-foreground/20"
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className={cn("p-2 rounded-lg", hasVehicle ? "bg-secondary/10" : "bg-foreground/5")}>
              <Car className="w-5 h-5" />
            </div>
            <span className="font-medium">J&apos;ai un véhicule</span>
            {hasVehicle && <CheckCircle className="w-5 h-5 ml-2" />}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
