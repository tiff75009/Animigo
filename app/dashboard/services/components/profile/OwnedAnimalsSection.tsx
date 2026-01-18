"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Plus,
  X,
  Trash2,
  Dog,
  Cat,
  Bird,
  Rabbit,
  Fish,
  Star,
} from "lucide-react";
import SectionCard from "../shared/SectionCard";
import FormField from "../shared/FormField";
import { cn } from "@/app/lib/utils";

export interface OwnedAnimal {
  type: string;
  name: string;
  breed?: string;
  age?: number;
}

interface OwnedAnimalsSectionProps {
  ownedAnimals: OwnedAnimal[];
  onAdd: (animal: OwnedAnimal) => void;
  onRemove: (index: number) => void;
}

const animalIcons: Record<string, React.ElementType> = {
  chien: Dog,
  chat: Cat,
  oiseau: Bird,
  rongeur: Rabbit,
  poisson: Fish,
  reptile: Star,
  nac: Star,
};

const animalOptions = [
  { value: "chien", label: "Chien" },
  { value: "chat", label: "Chat" },
  { value: "oiseau", label: "Oiseau" },
  { value: "rongeur", label: "Rongeur" },
  { value: "poisson", label: "Poisson" },
  { value: "reptile", label: "Reptile" },
  { value: "nac", label: "NAC" },
];

export default function OwnedAnimalsSection({
  ownedAnimals,
  onAdd,
  onRemove,
}: OwnedAnimalsSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newAnimal, setNewAnimal] = useState<OwnedAnimal>({
    type: "chien",
    name: "",
    breed: "",
    age: undefined,
  });

  const handleAdd = () => {
    if (!newAnimal.name.trim()) return;
    onAdd({ ...newAnimal });
    setNewAnimal({ type: "chien", name: "", breed: "", age: undefined });
    setIsAdding(false);
  };

  return (
    <SectionCard
      title="Mes animaux"
      description="Présentez vos compagnons aux propriétaires"
      icon={Heart}
      iconColor="purple"
      action={
        !isAdding
          ? {
              label: "Ajouter",
              onClick: () => setIsAdding(true),
              icon: Plus,
              variant: "primary",
            }
          : undefined
      }
    >
      <div className="space-y-4">
        {/* Animals List */}
        <AnimatePresence mode="popLayout">
          {ownedAnimals.map((animal, index) => {
            const Icon = animalIcons[animal.type] || Star;
            return (
              <motion.div
                key={`${animal.name}-${index}`}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-4 p-4 bg-foreground/5 rounded-xl"
              >
                <div className="p-2.5 bg-purple/10 rounded-xl">
                  <Icon className="w-5 h-5 text-purple" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{animal.name}</p>
                  <p className="text-sm text-text-light">
                    {animalOptions.find((o) => o.value === animal.type)?.label}
                    {animal.breed && ` • ${animal.breed}`}
                    {animal.age && ` • ${animal.age} an${animal.age > 1 ? "s" : ""}`}
                  </p>
                </div>
                <motion.button
                  onClick={() => onRemove(index)}
                  className="p-2 text-text-light hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Trash2 className="w-5 h-5" />
                </motion.button>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty State */}
        {ownedAnimals.length === 0 && !isAdding && (
          <div className="text-center py-8">
            <Heart className="w-12 h-12 text-foreground/20 mx-auto mb-3" />
            <p className="text-text-light">Aucun animal ajouté</p>
            <p className="text-sm text-text-light">
              Présentez vos compagnons pour créer un lien de confiance
            </p>
          </div>
        )}

        {/* Add Form */}
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-purple/5 rounded-xl border-2 border-purple/20 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-foreground">Nouvel animal</h4>
                  <button
                    onClick={() => setIsAdding(false)}
                    className="p-1 text-text-light hover:text-foreground rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    label="Type d'animal"
                    name="animalType"
                    type="select"
                    value={newAnimal.type}
                    onChange={(v) => setNewAnimal({ ...newAnimal, type: v as string })}
                    options={animalOptions}
                  />

                  <FormField
                    label="Nom"
                    name="animalName"
                    type="text"
                    value={newAnimal.name}
                    onChange={(v) => setNewAnimal({ ...newAnimal, name: v as string })}
                    placeholder="Ex: Max"
                    required
                  />

                  <FormField
                    label="Race (optionnel)"
                    name="animalBreed"
                    type="text"
                    value={newAnimal.breed || ""}
                    onChange={(v) => setNewAnimal({ ...newAnimal, breed: v as string })}
                    placeholder="Ex: Labrador"
                  />

                  <FormField
                    label="Âge (optionnel)"
                    name="animalAge"
                    type="number"
                    value={newAnimal.age || ""}
                    onChange={(v) => setNewAnimal({ ...newAnimal, age: v as number || undefined })}
                    min={0}
                    max={30}
                    placeholder="En années"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setIsAdding(false)}
                    className="px-4 py-2 text-text-light hover:text-foreground transition-colors"
                  >
                    Annuler
                  </button>
                  <motion.button
                    onClick={handleAdd}
                    disabled={!newAnimal.name.trim()}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 bg-purple text-white rounded-xl font-medium",
                      !newAnimal.name.trim() && "opacity-50 cursor-not-allowed"
                    )}
                    whileHover={{ scale: newAnimal.name.trim() ? 1.02 : 1 }}
                    whileTap={{ scale: newAnimal.name.trim() ? 0.98 : 1 }}
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SectionCard>
  );
}
