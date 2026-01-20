"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus, PawPrint, Loader2, ExternalLink } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import AnimalCard from "./AnimalCard";

interface AnimalSelectorProps {
  token: string;
  selectedAnimalId: Id<"animals"> | null;
  onSelect: (animalId: Id<"animals">) => void;
  compact?: boolean;
}

export default function AnimalSelector({
  token,
  selectedAnimalId,
  onSelect,
  compact = false,
}: AnimalSelectorProps) {
  // Récupérer les animaux de l'utilisateur
  const animals = useQuery(api.animals.getUserAnimals, { token });

  const isLoading = animals === undefined;

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
        <Link
          href="/client/mes-animaux/nouveau"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Ajouter
          <ExternalLink className="w-3 h-3 ml-0.5" />
        </Link>
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
            {animals.map((animal: {
              id: Id<"animals">;
              name: string;
              type: string;
              emoji: string;
              breed?: string;
              gender: string;
              primaryPhotoUrl: string | null;
            }) => (
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
          <Link
            href="/client/mes-animaux/nouveau"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Créer ma première fiche animal
            <ExternalLink className="w-4 h-4 ml-1" />
          </Link>
        </div>
      )}
    </div>
  );
}
