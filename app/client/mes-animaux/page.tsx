"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  PawPrint,
  Plus,
  Edit2,
  Calendar,
  Heart,
  Scale,
  Ruler,
  Baby,
  Dog,
  Cat,
  Sparkles,
  AlertCircle,
  Check,
  ChevronRight,
  Eye,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

// Types d'animaux
const ANIMAL_TYPES = [
  { id: "chien", name: "Chien", emoji: "🐕" },
  { id: "chat", name: "Chat", emoji: "🐱" },
  { id: "oiseau", name: "Oiseau", emoji: "🐦" },
  { id: "rongeur", name: "Rongeur", emoji: "🐹" },
  { id: "poisson", name: "Poisson", emoji: "🐠" },
  { id: "reptile", name: "Reptile", emoji: "🦎" },
  { id: "nac", name: "NAC", emoji: "🐾" },
];

const SIZE_LABELS: Record<string, string> = {
  petit: "Petit",
  moyen: "Moyen",
  grand: "Grand",
  tres_grand: "Très grand",
};

interface Animal {
  id: Id<"animals">;
  name: string;
  type: string;
  emoji: string;
  breed?: string;
  gender?: "male" | "female" | "unknown";
  birthDate?: string;
  weight?: number;
  size?: string;
  description?: string;
  profilePhoto?: string;
  primaryPhotoUrl?: string | null;
  galleryPhotos?: string[];
  goodWithChildren?: boolean;
  goodWithDogs?: boolean;
  goodWithCats?: boolean;
  goodWithOtherAnimals?: boolean;
  behaviorTraits?: string[];
  hasAllergies?: boolean;
  allergiesDetails?: string;
  specialNeeds?: string;
  medicalConditions?: string;
}

export default function MesAnimauxPage() {
  const searchParams = useSearchParams();
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const [showSuccess, setShowSuccess] = useState<string | null>(null);

  const animals = useQuery(
    api.animals.getUserAnimals,
    token ? { token } : "skip"
  );

  // Afficher les messages de succès
  useEffect(() => {
    const success = searchParams.get("success");
    if (success) {
      setShowSuccess(success);
      // Retirer le paramètre de l'URL
      window.history.replaceState({}, "", "/client/mes-animaux");
      // Masquer le message après 3 secondes
      const timer = setTimeout(() => setShowSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  // Calculer l'âge
  const getAnimalAge = (birthDate?: string) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();

    if (years === 0) {
      if (months <= 0) return "< 1 mois";
      return `${months} mois`;
    }
    if (years === 1 && months < 0) {
      return `${12 + months} mois`;
    }
    if (years < 2) {
      return `${years} an`;
    }
    return `${years} ans`;
  };

  // Message de succès
  const successMessages: Record<string, string> = {
    created: "Animal ajouté avec succès !",
    updated: "Modifications enregistrées !",
    deleted: "Animal supprimé.",
  };

  return (
    <div className="space-y-6">
      {/* Message de succès */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="w-5 h-5 text-white" />
            </div>
            <p className="text-green-700 font-medium">
              {successMessages[showSuccess] || "Opération réussie !"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mes animaux</h1>
          <p className="text-gray-500 mt-1">
            {animals && animals.length > 0
              ? `${animals.length} compagnon${animals.length > 1 ? "s" : ""} enregistré${animals.length > 1 ? "s" : ""}`
              : "Gérez les fiches de vos compagnons"}
          </p>
        </div>
        <Link href="/client/mes-animaux/nouveau">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl font-medium shadow-lg shadow-primary/25"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Ajouter un animal</span>
            <span className="sm:hidden">Ajouter</span>
          </motion.button>
        </Link>
      </div>

      {/* Liste des animaux */}
      {animals && animals.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {animals.map((animal: Animal, index: number) => (
            <motion.div
              key={animal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow group"
            >
              <div className="flex">
                {/* Photo */}
                <Link href={`/client/mes-animaux/${animal.id}`} className="w-32 sm:w-40 flex-shrink-0">
                  {animal.profilePhoto || animal.primaryPhotoUrl ? (
                    <div className="w-full h-full aspect-square relative">
                      <img
                        src={animal.profilePhoto || animal.primaryPhotoUrl || ""}
                        alt={animal.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>
                  ) : (
                    <div className="w-full h-full aspect-square bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center">
                      <span className="text-5xl">{animal.emoji}</span>
                    </div>
                  )}
                </Link>

                {/* Infos */}
                <div className="flex-1 p-4 sm:p-5">
                  <div className="flex items-start justify-between mb-2">
                    <Link href={`/client/mes-animaux/${animal.id}`}>
                      <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                        {animal.name}
                      </h3>
                      <p className="text-gray-500 text-sm">
                        {ANIMAL_TYPES.find((t) => t.id === animal.type)?.name}
                        {animal.breed && ` • ${animal.breed}`}
                      </p>
                    </Link>
                    {/* Boutons d'action */}
                    <div className="flex gap-2">
                      <Link
                        href={`/client/mes-animaux/${animal.id}`}
                        className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Voir la fiche"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/client/mes-animaux/${animal.id}/modifier`}
                        className="p-2 text-gray-400 hover:text-secondary hover:bg-secondary/10 rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {animal.gender && animal.gender !== "unknown" && (
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg ${
                        animal.gender === "male" ? "bg-blue-50 text-blue-600" : "bg-pink-50 text-pink-600"
                      }`}>
                        {animal.gender === "male" ? "♂ Mâle" : "♀ Femelle"}
                      </span>
                    )}
                    {animal.birthDate && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-lg">
                        <Calendar className="w-3 h-3" />
                        {getAnimalAge(animal.birthDate)}
                      </span>
                    )}
                    {animal.weight && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-lg">
                        <Scale className="w-3 h-3" />
                        {animal.weight} kg
                      </span>
                    )}
                    {animal.size && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-600 text-xs font-medium rounded-lg">
                        <Ruler className="w-3 h-3" />
                        {SIZE_LABELS[animal.size] || animal.size}
                      </span>
                    )}
                  </div>

                  {/* Compatibilité */}
                  <div className="flex flex-wrap gap-1.5">
                    {animal.goodWithChildren === true && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded-full">
                        <Baby className="w-3 h-3" />
                        Enfants
                      </span>
                    )}
                    {animal.goodWithDogs === true && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded-full">
                        <Dog className="w-3 h-3" />
                        Chiens
                      </span>
                    )}
                    {animal.goodWithCats === true && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded-full">
                        <Cat className="w-3 h-3" />
                        Chats
                      </span>
                    )}
                    {animal.behaviorTraits && animal.behaviorTraits.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary/10 text-secondary text-xs rounded-full">
                        <Sparkles className="w-3 h-3" />
                        {animal.behaviorTraits.slice(0, 2).join(", ")}
                        {animal.behaviorTraits.length > 2 && ` +${animal.behaviorTraits.length - 2}`}
                      </span>
                    )}
                  </div>

                  {/* Alertes */}
                  {(animal.hasAllergies || animal.specialNeeds || animal.medicalConditions) && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-1.5 text-orange-600 text-xs">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span className="font-medium">
                          {[
                            animal.hasAllergies && "Allergies",
                            animal.medicalConditions && "Suivi médical",
                            animal.specialNeeds && "Besoins spéciaux",
                          ]
                            .filter(Boolean)
                            .join(" • ")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        // État vide
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-white to-gray-50 rounded-3xl p-8 sm:p-12 text-center border border-gray-100"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-24 h-24 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <PawPrint className="w-12 h-12 text-primary" />
          </motion.div>
          <h3 className="text-2xl font-bold text-foreground mb-3">
            Aucun compagnon enregistré
          </h3>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            Ajoutez vos animaux pour faciliter vos futures réservations. Leurs informations seront automatiquement pré-remplies !
          </p>
          <Link href="/client/mes-animaux/nouveau">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl font-semibold shadow-lg shadow-primary/30"
            >
              <Plus className="w-5 h-5" />
              Ajouter mon premier animal
            </motion.button>
          </Link>
          <div className="mt-8 flex items-center justify-center gap-8 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐕</span>
              <span>Chiens</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐱</span>
              <span>Chats</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐾</span>
              <span>NAC</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Conseil */}
      {animals && animals.length > 0 && animals.length < 3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-r from-secondary/10 to-primary/10 rounded-2xl p-5 flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
            <Heart className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              Vous avez plusieurs animaux ?
            </p>
            <p className="text-sm text-gray-500">
              Ajoutez-les tous pour les sélectionner facilement lors de vos réservations.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
