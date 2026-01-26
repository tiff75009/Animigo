"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  PawPrint,
  Plus,
  Check,
  AlertCircle,
  Users,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/app/lib/utils";

interface CollectiveSlotData {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  availableSpots: number;
}

interface UserAnimal {
  id: string; // L'API retourne 'id' pas '_id'
  name: string;
  type: string;
  breed?: string;
  profilePhotoUrl?: string | null; // Champ correct de l'API
}

interface CollectiveAnimalSelectorProps {
  token: string;
  // Animaux déjà sélectionnés (IDs passés depuis la page annonceur)
  preSelectedAnimalIds: string[];
  // Types d'animaux acceptés par la formule
  acceptedAnimalTypes: string[];
  // Créneaux collectifs avec leur disponibilité
  collectiveSlots: CollectiveSlotData[];
  // Nombre max d'animaux par créneau
  maxAnimalsPerSlot: number;
  // Callback quand la sélection change
  onSelectionChange: (animalIds: Id<"animals">[]) => void;
  // Erreur de validation
  error?: string;
}

const animalEmojis: Record<string, string> = {
  chien: "🐕",
  chat: "🐱",
  oiseau: "🐦",
  rongeur: "🐹",
  reptile: "🦎",
  poisson: "🐠",
  nac: "🐾",
  autre: "🐾",
};

const animalLabels: Record<string, string> = {
  chien: "Chien",
  chat: "Chat",
  oiseau: "Oiseau",
  rongeur: "Rongeur",
  reptile: "Reptile",
  poisson: "Poisson",
  nac: "NAC",
  autre: "Autre",
};

export default function CollectiveAnimalSelector({
  token,
  preSelectedAnimalIds,
  acceptedAnimalTypes,
  collectiveSlots,
  maxAnimalsPerSlot,
  onSelectionChange,
  error,
}: CollectiveAnimalSelectorProps) {
  const [selectedIds, setSelectedIds] = useState<Id<"animals">[]>([]);
  // Démarrer ouvert si pas d'animaux pré-sélectionnés
  const [isExpanded, setIsExpanded] = useState(preSelectedAnimalIds.length === 0);

  // Récupérer les animaux de l'utilisateur
  const userAnimals = useQuery(
    api.animals.getUserAnimals,
    token ? { token } : "skip"
  ) as UserAnimal[] | undefined;

  // Calculer le nombre minimum de places disponibles parmi tous les créneaux
  const minAvailableSpots = useMemo(() => {
    if (!collectiveSlots || collectiveSlots.length === 0) return 0;
    return Math.min(...collectiveSlots.map(slot => slot.availableSpots));
  }, [collectiveSlots]);

  // Nombre d'animaux actuellement sélectionnés
  const currentAnimalCount = selectedIds.length;

  // Peut-on ajouter un animal de plus ?
  const canAddMore = currentAnimalCount < minAvailableSpots;

  // Filtrer les animaux par type accepté
  const eligibleAnimals = useMemo(() => {
    if (!userAnimals) return [];
    return userAnimals.filter(animal =>
      acceptedAnimalTypes.includes(animal.type)
    );
  }, [userAnimals, acceptedAnimalTypes]);

  // Animaux non éligibles (mauvais type)
  const ineligibleAnimals = useMemo(() => {
    if (!userAnimals) return [];
    return userAnimals.filter(animal =>
      !acceptedAnimalTypes.includes(animal.type)
    );
  }, [userAnimals, acceptedAnimalTypes]);

  // Initialiser avec les animaux pré-sélectionnés
  useEffect(() => {
    // Ne pas initialiser si on a déjà des animaux sélectionnés
    if (selectedIds.length > 0) return;

    // Initialiser depuis les pré-sélections si disponibles
    if (preSelectedAnimalIds.length > 0 && eligibleAnimals.length > 0) {
      // Filtrer pour ne garder que les animaux éligibles et existants
      const validIds = preSelectedAnimalIds
        .filter(id => eligibleAnimals.some(a => a.id === id))
        .map(id => id as Id<"animals">);

      if (validIds.length > 0) {
        setSelectedIds(validIds);
        onSelectionChange(validIds);
        return;
      }
    }

    // Si pas de pré-sélection mais un seul animal éligible, le sélectionner automatiquement
    if (eligibleAnimals.length === 1 && preSelectedAnimalIds.length === 0) {
      const singleAnimalId = eligibleAnimals[0].id as Id<"animals">;
      setSelectedIds([singleAnimalId]);
      onSelectionChange([singleAnimalId]);
      setIsExpanded(false);
    }
  }, [preSelectedAnimalIds, eligibleAnimals, selectedIds.length, onSelectionChange]);

  // Fermer automatiquement quand une sélection est faite
  useEffect(() => {
    if (selectedIds.length > 0 && isExpanded) {
      // Petit délai pour laisser l'animation se faire
      const timer = setTimeout(() => setIsExpanded(false), 300);
      return () => clearTimeout(timer);
    }
  }, [selectedIds.length, isExpanded]);

  // Gérer la sélection/désélection
  const toggleAnimal = (animalId: Id<"animals">) => {
    setSelectedIds(prev => {
      const isSelected = prev.includes(animalId);
      let newIds: Id<"animals">[];

      if (isSelected) {
        // Désélectionner
        newIds = prev.filter(id => id !== animalId);
      } else {
        // Vérifier si on peut ajouter
        if (!canAddMore) return prev;
        newIds = [...prev, animalId];
      }

      onSelectionChange(newIds);
      return newIds;
    });
  };

  // Animaux sélectionnés (objets complets)
  const selectedAnimals = useMemo(() => {
    if (!eligibleAnimals) return [];
    return selectedIds
      .map(id => eligibleAnimals.find(a => a.id === id))
      .filter((a): a is UserAnimal => a !== undefined);
  }, [selectedIds, eligibleAnimals]);

  // Loading
  if (userAnimals === undefined) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-secondary" />
      </div>
    );
  }

  // Pas d'animaux éligibles
  if (eligibleAnimals.length === 0) {
    return (
      <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Aucun animal eligible
            </p>
            <p className="text-sm text-amber-700 mt-1">
              Cette formule accepte uniquement : {acceptedAnimalTypes.map(t => animalLabels[t] || t).join(", ")}.
              {ineligibleAnimals.length > 0 && (
                <> Vos animaux ({ineligibleAnimals.map(a => a.name).join(", ")}) ne correspondent pas.</>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Indicateur de disponibilité */}
      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-600" />
          <span className="text-sm text-purple-700">
            Places disponibles : <span className="font-semibold">{minAvailableSpots}</span>
          </span>
        </div>
        <span className="text-sm text-purple-600">
          {currentAnimalCount} animal{currentAnimalCount > 1 ? "aux" : ""} selectionne{currentAnimalCount > 1 ? "s" : ""}
        </span>
      </div>

      {/* Animaux sélectionnés */}
      {selectedAnimals.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Animaux inscrits a cette seance :
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedAnimals.map(animal => (
              <motion.div
                key={animal.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 px-3 py-2 bg-secondary/10 border border-secondary/30 rounded-full"
              >
                {animal.profilePhotoUrl ? (
                  <div className="relative w-6 h-6 rounded-full overflow-hidden">
                    <Image
                      src={animal.profilePhotoUrl}
                      alt={animal.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <span className="text-lg">{animalEmojis[animal.type] || "🐾"}</span>
                )}
                <span className="text-sm font-medium text-foreground">{animal.name}</span>
                <button
                  onClick={() => toggleAnimal(animal.id as Id<"animals">)}
                  className="p-0.5 hover:bg-secondary/20 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-text-light" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Message si aucun animal sélectionné */}
      {selectedAnimals.length === 0 && (
        <div className={cn(
          "p-4 rounded-xl border border-dashed text-center",
          error ? "border-red-500 bg-red-50" : "border-gray-300 bg-gray-50"
        )}>
          <PawPrint className={cn("w-8 h-8 mx-auto mb-2", error ? "text-red-400" : "text-gray-400")} />
          <p className={cn("text-sm", error ? "text-red-600" : "text-text-light")}>
            Selectionnez au moins un animal pour cette seance
          </p>
        </div>
      )}

      {/* Bouton pour ajouter des animaux ou sélectionner si aucun sélectionné */}
      {canAddMore && eligibleAnimals.length > selectedIds.length && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "w-full flex items-center justify-center gap-2 p-3 border border-dashed rounded-xl transition-colors",
            selectedIds.length === 0
              ? "border-secondary bg-secondary/5 text-secondary font-semibold"
              : "border-secondary/50 text-secondary hover:bg-secondary/5"
          )}
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">
            {selectedIds.length === 0
              ? `Selectionner un animal (${eligibleAnimals.length} disponible${eligibleAnimals.length > 1 ? "s" : ""})`
              : `Ajouter un animal (${eligibleAnimals.length - selectedIds.length} disponible${eligibleAnimals.length - selectedIds.length > 1 ? "s" : ""})`
            }
          </span>
        </button>
      )}

      {/* Message si plus de place */}
      {!canAddMore && eligibleAnimals.length > selectedIds.length && (
        <div className="p-3 bg-gray-100 rounded-lg text-center">
          <p className="text-sm text-text-light">
            Impossible d&apos;ajouter plus d&apos;animaux - places limitees dans les creneaux
          </p>
        </div>
      )}

      {/* Liste des animaux disponibles pour ajout */}
      <AnimatePresence>
        {isExpanded && canAddMore && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pt-2">
              <p className="text-sm font-medium text-foreground">
                Selectionnez un animal :
              </p>
              {eligibleAnimals
                .filter(animal => !selectedIds.includes(animal.id as Id<"animals">))
                .map(animal => (
                  <div
                    key={animal.id}
                    onClick={() => {
                      toggleAnimal(animal.id as Id<"animals">);
                      setIsExpanded(false);
                    }}
                    className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-secondary/50 hover:bg-secondary/5 transition-colors"
                  >
                    {animal.profilePhotoUrl ? (
                      <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                        <Image
                          src={animal.profilePhotoUrl}
                          alt={animal.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xl">{animalEmojis[animal.type] || "🐾"}</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{animal.name}</p>
                      <p className="text-xs text-text-light">
                        {animalLabels[animal.type] || animal.type}
                        {animal.breed && ` - ${animal.breed}`}
                      </p>
                    </div>
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                  </div>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Types acceptés */}
      <p className="text-xs text-text-light">
        Types acceptes : {acceptedAnimalTypes.map(t => `${animalEmojis[t] || "🐾"} ${animalLabels[t] || t}`).join(", ")}
      </p>

      {/* Erreur */}
      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  );
}
