"use client";

import { motion } from "framer-motion";
import {
  Dog,
  Cat,
  Bird,
  Rabbit,
  Fish,
  Star,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/app/lib/utils";

export interface AnimalType {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const ANIMAL_TYPES: AnimalType[] = [
  { id: "chien", label: "Chien", icon: Dog },
  { id: "chat", label: "Chat", icon: Cat },
  { id: "oiseau", label: "Oiseau", icon: Bird },
  { id: "rongeur", label: "Rongeur", icon: Rabbit },
  { id: "poisson", label: "Poisson", icon: Fish },
  { id: "reptile", label: "Reptile", icon: Star },
  { id: "nac", label: "NAC", icon: Star },
];

interface AnimalTypeSelectorProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  variant?: "pills" | "cards";
  multiSelect?: boolean;
  className?: string;
}

export default function AnimalTypeSelector({
  selected,
  onChange,
  variant = "pills",
  multiSelect = true,
  className,
}: AnimalTypeSelectorProps) {
  const handleToggle = (animalId: string) => {
    if (multiSelect) {
      if (selected.includes(animalId)) {
        onChange(selected.filter((id) => id !== animalId));
      } else {
        onChange([...selected, animalId]);
      }
    } else {
      onChange([animalId]);
    }
  };

  if (variant === "cards") {
    return (
      <div className={cn("grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3", className)}>
        {ANIMAL_TYPES.map((animal) => {
          const isSelected = selected.includes(animal.id);
          const Icon = animal.icon;

          return (
            <motion.button
              key={animal.id}
              type="button"
              onClick={() => handleToggle(animal.id)}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                isSelected
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-foreground/10 bg-white text-foreground hover:border-foreground/20"
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div
                className={cn(
                  "p-3 rounded-full",
                  isSelected ? "bg-primary/10" : "bg-foreground/5"
                )}
              >
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium">{animal.label}</span>
            </motion.button>
          );
        })}
      </div>
    );
  }

  // Pills variant (default)
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {ANIMAL_TYPES.map((animal) => {
        const isSelected = selected.includes(animal.id);
        const Icon = animal.icon;

        return (
          <motion.button
            key={animal.id}
            type="button"
            onClick={() => handleToggle(animal.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all",
              isSelected
                ? "border-primary bg-primary text-white"
                : "border-foreground/10 bg-white text-foreground hover:border-foreground/20"
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Icon className="w-4 h-4" />
            <span className="text-sm font-medium">{animal.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
