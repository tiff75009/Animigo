"use client";

import { motion } from "framer-motion";
import { Heart, Check, Car, AlertCircle, ChevronDown } from "lucide-react";
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
      onAcceptedAnimalsChange(acceptedAnimals.filter((a) => a !== animalType));
    } else {
      onAcceptedAnimalsChange([...acceptedAnimals, animalType]);
    }
  };

  return (
    <motion.div
      id="section-animaux"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18, duration: 0.3 }}
      className="bg-white p-4"
      style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
    >
      {/* Header compact : icône + eyebrow + titre + capacité (select) à droite */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "#f5f9f6", border: "1px solid #cfdbd3" }}
          >
            <Heart className="w-3.5 h-3.5" style={{ color: "#1f3a33" }} />
          </div>
          <div className="min-w-0">
            <div
              className="text-[10px] font-medium uppercase tracking-[0.1em]"
              style={{ color: "#9c9484" }}
            >
              Section · Capacité
            </div>
            <h3
              className="text-[14px] font-semibold tracking-[-0.01em] m-0"
              style={{ color: "#1f1f1d" }}
            >
              Animaux acceptés
            </h3>
          </div>
        </div>
        {/* Capacité — select natif compact */}
        <div className="relative flex-shrink-0">
          <select
            value={maxAnimalsPerSlot || ""}
            onChange={(e) => onMaxAnimalsChange(parseInt(e.target.value, 10))}
            className="appearance-none pl-3 pr-7 py-1.5 text-[12px] font-semibold cursor-pointer focus:outline-none"
            style={{
              background: maxAnimalsPerSlot ? "#f5f9f6" : "#fff",
              color: maxAnimalsPerSlot ? "#1f3a33" : "#9c9484",
              border: `1px solid ${maxAnimalsPerSlot ? "#cfdbd3" : "#fde68a"}`,
              borderRadius: 999,
            }}
          >
            <option value="" disabled>Capacité ?</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>
                {n} {n > 1 ? "animaux" : "animal"} / créneau
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
            style={{ color: maxAnimalsPerSlot ? "#1f3a33" : "#9c9484" }}
          />
        </div>
      </div>

      {/* Types d'animaux — grille 4 colonnes très compacte */}
      <div className="grid grid-cols-4 gap-1 mb-2.5">
        {ANIMAL_TYPES.map((animal) => {
          const isAccepted = acceptedAnimals.includes(animal.type);
          return (
            <button
              key={animal.type}
              type="button"
              onClick={() => toggleAnimal(animal.type)}
              className="group flex flex-col items-center justify-center gap-0.5 py-2 transition-all"
              style={
                isAccepted
                  ? { background: "#f5f9f6", border: "1px solid #1f3a33", borderRadius: 8 }
                  : { background: "#fff", border: "1px solid #ece9e1", borderRadius: 8 }
              }
              title={animal.label}
            >
              <span className="text-[20px] leading-none">{animal.emoji}</span>
              <span
                className="text-[10.5px] font-medium leading-none"
                style={{ color: isAccepted ? "#1f3a33" : "#6d6d68" }}
              >
                {animal.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bandeau bas : compteur sélection + équipement véhicule (toggle compact) */}
      <div className="flex items-center justify-between gap-2 pt-2.5" style={{ borderTop: "1px solid #f1ede3" }}>
        <div className="text-[11px]" style={{ color: "#6d6d68" }}>
          {acceptedAnimals.length === 0 ? (
            <span className="inline-flex items-center gap-1" style={{ color: "#a16207" }}>
              <AlertCircle className="w-3 h-3" />
              Sélectionnez au moins un animal
            </span>
          ) : (
            <>
              <span className="font-semibold" style={{ color: "#1f3a33" }}>
                {acceptedAnimals.length}
              </span>{" "}
              type{acceptedAnimals.length > 1 ? "s" : ""} accepté{acceptedAnimals.length > 1 ? "s" : ""}
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => onHasVehicleChange(!hasVehicle)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold transition-all"
          style={
            hasVehicle
              ? { background: "#1f3a33", color: "#f7f5ef", border: "1px solid #1f3a33" }
              : { background: "#fff", color: "#6d6d68", border: "1px solid #ece9e1" }
          }
        >
          <Car className="w-3 h-3" />
          Véhicule
          {hasVehicle && <Check className="w-3 h-3" />}
        </button>
      </div>
    </motion.div>
  );
}
