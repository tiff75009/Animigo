"use client";

import { motion } from "framer-motion";
import { PawPrint, Trees, Car, Check, Users } from "lucide-react";
import SectionCard from "../shared/SectionCard";
import AnimalTypeSelector from "../shared/AnimalTypeSelector";
import { cn } from "@/app/lib/utils";

interface AcceptedAnimalsSectionProps {
  acceptedAnimals: string[];
  hasGarden: boolean;
  hasVehicle: boolean;
  maxAnimalsPerSlot?: number;
  onAcceptedAnimalsChange: (animals: string[]) => void;
  onHasGardenChange: (hasGarden: boolean) => void;
  onHasVehicleChange: (hasVehicle: boolean) => void;
  onMaxAnimalsPerSlotChange?: (value: number | undefined) => void;
}

export default function AcceptedAnimalsSection({
  acceptedAnimals,
  hasGarden,
  hasVehicle,
  maxAnimalsPerSlot,
  onAcceptedAnimalsChange,
  onHasGardenChange,
  onHasVehicleChange,
  onMaxAnimalsPerSlotChange,
}: AcceptedAnimalsSectionProps) {
  return (
    <SectionCard
      title="Animaux acceptés"
      description="Quels animaux pouvez-vous garder ?"
      icon={PawPrint}
      iconColor="accent"
    >
      <div className="space-y-6">
        {/* Animal Types */}
        <div>
          <label className="text-sm font-medium text-foreground mb-3 block">
            Types d'animaux
          </label>
          <AnimalTypeSelector
            selected={acceptedAnimals}
            onChange={onAcceptedAnimalsChange}
            variant="pills"
          />
          {acceptedAnimals.length === 0 && (
            <p className="text-xs text-amber-500 mt-2">
              Sélectionnez au moins un type d'animal
            </p>
          )}
        </div>

        {/* Equipment */}
        <div>
          <label className="text-sm font-medium text-foreground mb-3 block">
            Équipements
          </label>
          <div className="flex flex-wrap gap-3">
            <EquipmentToggle
              icon={Trees}
              label="J'ai un jardin"
              checked={hasGarden}
              onChange={onHasGardenChange}
            />
            <EquipmentToggle
              icon={Car}
              label="J'ai un véhicule"
              checked={hasVehicle}
              onChange={onHasVehicleChange}
            />
          </div>
        </div>

        {/* Max Animals Per Slot */}
        <div>
          <label className="text-sm font-medium text-foreground mb-3 block flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Nombre d'animaux max par créneau
          </label>
          <p className="text-xs text-foreground/60 mb-3">
            Combien d'animaux pouvez-vous accueillir en même temps ?
          </p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <motion.button
                key={num}
                type="button"
                onClick={() => onMaxAnimalsPerSlotChange?.(num)}
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
            <p className="text-xs text-amber-500 mt-2">
              Sélectionnez une capacité maximale
            </p>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

interface EquipmentToggleProps {
  icon: React.ElementType;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function EquipmentToggle({ icon: Icon, label, checked, onChange }: EquipmentToggleProps) {
  return (
    <motion.button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all",
        checked
          ? "border-secondary bg-secondary/5 text-secondary"
          : "border-foreground/10 bg-white text-foreground hover:border-foreground/20"
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
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
