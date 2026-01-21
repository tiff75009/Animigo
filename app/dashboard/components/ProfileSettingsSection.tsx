"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Navigation,
  PawPrint,
  Trees,
  Car,
  Check,
  Users,
  Dog,
  Cat,
  Bird,
  Rabbit,
  Fish,
  Star,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/app/lib/utils";

// Types d'animaux
const ANIMAL_TYPES: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "chien", label: "Chien", icon: Dog },
  { id: "chat", label: "Chat", icon: Cat },
  { id: "oiseau", label: "Oiseau", icon: Bird },
  { id: "rongeur", label: "Rongeur", icon: Rabbit },
  { id: "poisson", label: "Poisson", icon: Fish },
  { id: "reptile", label: "Reptile", icon: Star },
  { id: "nac", label: "NAC", icon: Star },
];

// Valeur spéciale pour "Toute la France"
const FRANCE_ENTIRE_VALUE = 999;

interface ProfileSettingsSectionProps {
  // Rayon
  radius?: number;
  onRadiusChange?: (radius: number) => void;
  // Animaux acceptés
  acceptedAnimals: string[];
  onAcceptedAnimalsChange?: (animals: string[]) => void;
  // Équipements
  hasGarden?: boolean;
  hasVehicle?: boolean;
  onHasGardenChange?: (value: boolean) => void;
  onHasVehicleChange?: (value: boolean) => void;
  // Capacité
  maxAnimalsPerSlot?: number;
  onMaxAnimalsPerSlotChange?: (value: number) => void;
  // Mode édition
  isEditable?: boolean;
  isSaving?: boolean;
  // Afficher uniquement le rayon
  showOnlyRadius?: boolean;
}

// Composant slider pour le rayon
function RadiusSlider({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const min = 1;
  const max = 100;

  const isFranceEntire = value >= FRANCE_ENTIRE_VALUE;
  const displayValue = isFranceEntire ? max + 1 : Math.min(value, max);
  const sliderMax = max + 1;
  const percentage = ((displayValue - min) / (sliderMax - min)) * 100;

  const getDistanceInfo = (km: number) => {
    if (km >= FRANCE_ENTIRE_VALUE) return { color: "from-primary to-pink-500", label: "Toute la France", emoji: "🇫🇷" };
    if (km <= 5) return { color: "from-emerald-400 to-emerald-500", label: "Proximité immédiate", emoji: "🏠" };
    if (km <= 15) return { color: "from-teal-400 to-cyan-500", label: "Quartier", emoji: "🏘️" };
    if (km <= 30) return { color: "from-cyan-400 to-blue-500", label: "Ville", emoji: "🌆" };
    if (km <= 50) return { color: "from-blue-400 to-indigo-500", label: "Agglomération", emoji: "🌇" };
    return { color: "from-indigo-400 to-purple-500", label: "Région", emoji: "🗺️" };
  };

  const distanceInfo = getDistanceInfo(value);

  const handleChange = (newValue: number) => {
    if (disabled) return;
    if (newValue > max) {
      onChange(FRANCE_ENTIRE_VALUE);
    } else {
      onChange(newValue);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <Navigation className="w-4 h-4 text-secondary" />
          Rayon d&apos;intervention
        </label>
        <motion.div
          animate={{ scale: isDragging ? 1.1 : 1 }}
          className={cn(
            "px-3 py-1 rounded-full text-sm font-semibold text-white",
            "bg-gradient-to-r shadow-lg",
            distanceInfo.color
          )}
        >
          {isFranceEntire ? "🇫🇷 France" : `${value} km`}
        </motion.div>
      </div>

      <div className="relative pt-1 pb-2">
        <div className="h-3 bg-foreground/10 rounded-full overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full bg-gradient-to-r", distanceInfo.color)}
            style={{ width: `${percentage}%` }}
            animate={{ width: `${percentage}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>

        <input
          type="range"
          min={min}
          max={sliderMax}
          value={displayValue}
          onChange={(e) => handleChange(parseInt(e.target.value, 10))}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />

        <motion.div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full",
            "bg-white shadow-lg border-2",
            isFranceEntire ? "border-primary" : "border-secondary",
            "pointer-events-none flex items-center justify-center"
          )}
          style={{ left: `calc(${percentage}% - 12px)` }}
          animate={{
            scale: isDragging ? 1.2 : 1,
            boxShadow: isDragging
              ? isFranceEntire
                ? "0 4px 20px rgba(255, 107, 107, 0.4)"
                : "0 4px 20px rgba(78, 205, 196, 0.4)"
              : "0 2px 8px rgba(0, 0, 0, 0.15)",
          }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          {isFranceEntire ? (
            <span className="text-xs">🇫🇷</span>
          ) : (
            <div className={cn("w-2 h-2 rounded-full bg-gradient-to-r", distanceInfo.color)} />
          )}
        </motion.div>
      </div>

      <motion.div
        key={distanceInfo.label}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center gap-2 text-sm text-text-light"
      >
        <span>{distanceInfo.emoji}</span>
        <span>{distanceInfo.label}</span>
      </motion.div>

      <div className="flex justify-between text-xs text-text-light/60 px-1">
        <span>1 km</span>
        <span>25 km</span>
        <span>50 km</span>
        <span>100 km</span>
        <span className="text-primary font-medium">France</span>
      </div>
    </div>
  );
}

// Composant toggle équipement
function EquipmentToggle({
  icon: Icon,
  label,
  checked,
  onChange,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all",
        checked
          ? "border-secondary bg-secondary/5 text-secondary"
          : "border-foreground/10 bg-white text-foreground hover:border-foreground/20",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      whileHover={!disabled ? { scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
    >
      <div className={cn(
        "p-2 rounded-lg",
        checked ? "bg-secondary/10" : "bg-foreground/5"
      )}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="font-medium">{label}</span>
      {checked && (
        <Check className="w-5 h-5 ml-auto" />
      )}
    </motion.button>
  );
}

export default function ProfileSettingsSection({
  radius = 20,
  onRadiusChange,
  acceptedAnimals = [],
  onAcceptedAnimalsChange,
  hasGarden = false,
  hasVehicle = false,
  onHasGardenChange,
  onHasVehicleChange,
  maxAnimalsPerSlot,
  onMaxAnimalsPerSlotChange,
  isEditable = false,
  isSaving = false,
  showOnlyRadius = false,
}: ProfileSettingsSectionProps) {
  const handleAnimalToggle = (animalId: string) => {
    if (!onAcceptedAnimalsChange || !isEditable) return;

    if (acceptedAnimals.includes(animalId)) {
      onAcceptedAnimalsChange(acceptedAnimals.filter((id) => id !== animalId));
    } else {
      onAcceptedAnimalsChange([...acceptedAnimals, animalId]);
    }
  };

  // Si on affiche uniquement le rayon
  if (showOnlyRadius) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Navigation className="w-5 h-5 text-secondary" />
          Zone d&apos;intervention
        </h3>
        <div className="p-4 bg-foreground/[0.02] rounded-xl border border-foreground/10">
          <RadiusSlider
            value={radius}
            onChange={(v) => onRadiusChange?.(v)}
            disabled={!isEditable || isSaving}
          />
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rayon d'intervention */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Navigation className="w-5 h-5 text-secondary" />
          Zone d&apos;intervention
        </h3>
        <div className="p-4 bg-foreground/[0.02] rounded-xl border border-foreground/10">
          <RadiusSlider
            value={radius}
            onChange={(v) => onRadiusChange?.(v)}
            disabled={!isEditable || isSaving}
          />
        </div>
      </motion.div>

      {/* Animaux acceptés */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <PawPrint className="w-5 h-5 text-primary" />
          Animaux acceptés
        </h3>

        {/* Types d'animaux */}
        <div className="mb-6">
          <label className="text-sm font-medium text-foreground mb-3 block">
            Types d&apos;animaux
          </label>
          <div className="flex flex-wrap gap-2">
            {ANIMAL_TYPES.map((animal) => {
              const isSelected = acceptedAnimals.includes(animal.id);
              const Icon = animal.icon;

              return (
                <motion.button
                  key={animal.id}
                  type="button"
                  onClick={() => handleAnimalToggle(animal.id)}
                  disabled={!isEditable || isSaving}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all",
                    isSelected
                      ? "border-primary bg-primary text-white"
                      : "border-foreground/10 bg-white text-foreground hover:border-foreground/20",
                    (!isEditable || isSaving) && "opacity-50 cursor-not-allowed"
                  )}
                  whileHover={isEditable && !isSaving ? { scale: 1.02 } : undefined}
                  whileTap={isEditable && !isSaving ? { scale: 0.98 } : undefined}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{animal.label}</span>
                </motion.button>
              );
            })}
          </div>
          {acceptedAnimals.length === 0 && (
            <p className="text-xs text-amber-500 mt-2">
              Sélectionnez au moins un type d&apos;animal
            </p>
          )}
        </div>

        {/* Équipements */}
        <div className="mb-6">
          <label className="text-sm font-medium text-foreground mb-3 block">
            Équipements
          </label>
          <div className="flex flex-wrap gap-3">
            <EquipmentToggle
              icon={Trees}
              label="J'ai un jardin"
              checked={hasGarden}
              onChange={(v) => onHasGardenChange?.(v)}
              disabled={!isEditable || isSaving}
            />
            <EquipmentToggle
              icon={Car}
              label="J'ai un véhicule"
              checked={hasVehicle}
              onChange={(v) => onHasVehicleChange?.(v)}
              disabled={!isEditable || isSaving}
            />
          </div>
        </div>

        {/* Nombre d'animaux max */}
        <div>
          <label className="text-sm font-medium text-foreground mb-3 block flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Nombre d&apos;animaux max par créneau
          </label>
          <p className="text-xs text-foreground/60 mb-3">
            Combien d&apos;animaux pouvez-vous accueillir en même temps ?
          </p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <motion.button
                key={num}
                type="button"
                onClick={() => onMaxAnimalsPerSlotChange?.(num)}
                disabled={!isEditable || isSaving}
                className={cn(
                  "w-12 h-12 rounded-xl border-2 font-semibold text-lg transition-all",
                  maxAnimalsPerSlot === num
                    ? "border-primary bg-primary text-white"
                    : "border-foreground/10 bg-white text-foreground hover:border-foreground/20",
                  (!isEditable || isSaving) && "opacity-50 cursor-not-allowed"
                )}
                whileHover={isEditable && !isSaving ? { scale: 1.05 } : undefined}
                whileTap={isEditable && !isSaving ? { scale: 0.95 } : undefined}
              >
                {num}
              </motion.button>
            ))}
          </div>
          {!maxAnimalsPerSlot && (
            <p className="text-xs text-amber-500 mt-2">
              Sélectionnez une capacité maximale
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
