"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, PawPrint, Loader2 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import AnimalCard from "./AnimalCard";
import AnimalFormModal from "./AnimalFormModal";

interface Animal {
  id: Id<"animals">;
  name: string;
  type: string;
  emoji: string;
  breed?: string;
  gender: string;
  primaryPhotoUrl: string | null;
  photos: Array<{ url: string; isPrimary: boolean; order: number }>;
  compatibilityTraits: string[];
  behaviorTraits: string[];
  needsTraits: string[];
  customTraits: string[];
  specialNeeds?: string;
  medicalConditions?: string;
  birthDate?: string;
  description?: string;
}

interface AnimalSelectorProps {
  token: string;
  selectedAnimalId: Id<"animals"> | null;
  onSelect: (animalId: Id<"animals">) => void;
  onAnimalCreated?: (animal: Animal) => void;
  compact?: boolean;
}

export default function AnimalSelector({
  token,
  selectedAnimalId,
  onSelect,
  onAnimalCreated,
  compact = false,
}: AnimalSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null);

  // Récupérer les animaux de l'utilisateur
  const animals = useQuery(api.animals.getUserAnimals, { token });

  const isLoading = animals === undefined;

  const handleOpenCreate = () => {
    setEditingAnimal(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (animal: Animal) => {
    setEditingAnimal(animal);
    setIsModalOpen(true);
  };

  const handleSave = (animalData: {
    id?: Id<"animals">;
    name: string;
    type: string;
    gender: "male" | "female" | "unknown";
  }) => {
    // Si c'est une création et qu'on a un callback
    if (!editingAnimal && onAnimalCreated && animalData.id) {
      // Auto-sélectionner le nouvel animal
      onSelect(animalData.id);
    }
    setIsModalOpen(false);
    setEditingAnimal(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  const hasAnimals = animals && animals.length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <PawPrint className="w-5 h-5 text-primary" />
          Sélectionner un animal
        </h3>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      {/* Liste des animaux */}
      {hasAnimals ? (
        <div
          className={
            compact
              ? "space-y-2"
              : "grid grid-cols-2 sm:grid-cols-3 gap-3"
          }
        >
          <AnimatePresence mode="popLayout">
            {animals.map((animal) => (
              <motion.div
                key={animal.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                layout
              >
                <AnimalCard
                  id={animal.id}
                  name={animal.name}
                  type={animal.type}
                  emoji={animal.emoji}
                  breed={animal.breed}
                  gender={animal.gender}
                  photoUrl={animal.primaryPhotoUrl}
                  isSelected={selectedAnimalId === animal.id}
                  onSelect={() => onSelect(animal.id)}
                  onEdit={() => handleOpenEdit(animal as Animal)}
                  compact={compact}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-xl">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <PawPrint className="w-8 h-8 text-primary" />
          </div>
          <h4 className="font-semibold text-foreground mb-2">
            Vous n&apos;avez pas encore d&apos;animal
          </h4>
          <p className="text-sm text-gray-500 mb-4">
            Créez une fiche pour votre compagnon pour pouvoir réserver
          </p>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Créer ma première fiche animal
          </button>
        </div>
      )}

      {/* Modale de création/édition */}
      <AnimalFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAnimal(null);
        }}
        onSave={handleSave}
        token={token}
        initialData={
          editingAnimal
            ? {
                id: editingAnimal.id,
                name: editingAnimal.name,
                type: editingAnimal.type,
                gender: editingAnimal.gender as "male" | "female" | "unknown",
                breed: editingAnimal.breed,
                birthDate: editingAnimal.birthDate,
                description: editingAnimal.description,
                photos: editingAnimal.photos.map((p, i) => ({
                  storageId: "" as unknown as Id<"_storage">, // Sera rempli par le composant
                  url: p.url,
                  isPrimary: p.isPrimary,
                  order: p.order,
                })),
                compatibilityTraits: editingAnimal.compatibilityTraits,
                behaviorTraits: editingAnimal.behaviorTraits,
                needsTraits: editingAnimal.needsTraits,
                customTraits: editingAnimal.customTraits,
                specialNeeds: editingAnimal.specialNeeds,
                medicalConditions: editingAnimal.medicalConditions,
              }
            : null
        }
        mode={editingAnimal ? "edit" : "create"}
      />
    </div>
  );
}
