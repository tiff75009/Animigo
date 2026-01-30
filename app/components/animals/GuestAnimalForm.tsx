"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, PawPrint, ChevronDown, ChevronUp, Plus, Check } from "lucide-react";
import TraitSelector from "./TraitSelector";
import BreedAutocomplete from "@/app/components/ui/BreedAutocomplete";
import CatBreedAutocomplete from "@/app/components/ui/CatBreedAutocomplete";

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

// Genres
const GENDERS = [
  { id: "male", name: "Mâle" },
  { id: "female", name: "Femelle" },
  { id: "unknown", name: "Inconnu" },
];

// Traits prédéfinis
const COMPATIBILITY_TRAITS = [
  "Ne s'entend pas avec les mâles",
  "Ne s'entend pas avec les femelles",
  "Ne s'entend pas avec les chiens",
  "Ne s'entend pas avec les chats",
  "Ne s'entend pas avec les enfants",
  "Ne s'entend pas avec les autres animaux",
];

const BEHAVIOR_TRAITS = [
  "Anxieux",
  "Peureux",
  "Agressif",
  "Joueur",
  "Calme",
  "Énergique",
  "Sociable",
  "Indépendant",
  "Affectueux",
  "Territorial",
];

const NEEDS_TRAITS = [
  "A besoin de se dépenser",
  "Demande beaucoup d'attention",
  "Régime alimentaire spécial",
  "Besoin de sorties fréquentes",
  "Nécessite un environnement calme",
  "Traitement médical régulier",
];

export interface GuestAnimalData {
  name: string;
  type: string;
  gender: "male" | "female" | "unknown";
  breed?: string;
  isMixedBreed?: boolean;
  primaryBreed?: string;
  secondaryBreed?: string;
  birthDate?: string;
  description?: string;
  compatibilityTraits: string[];
  behaviorTraits: string[];
  needsTraits: string[];
  customTraits: string[];
  specialNeeds?: string;
  medicalConditions?: string;
}

interface GuestAnimalFormProps {
  data: GuestAnimalData;
  onChange: (data: GuestAnimalData) => void;
  errors?: Record<string, string>;
  // Types d'animaux acceptés par la formule (filtre les options)
  acceptedAnimalTypes?: string[];
}

export default function GuestAnimalForm({
  data,
  onChange,
  errors = {},
  acceptedAnimalTypes,
}: GuestAnimalFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Filtrer les types d'animaux si des types acceptés sont spécifiés
  const availableTypes = acceptedAnimalTypes && acceptedAnimalTypes.length > 0
    ? ANIMAL_TYPES.filter(t => acceptedAnimalTypes.includes(t.id))
    : ANIMAL_TYPES;

  const selectedType = ANIMAL_TYPES.find((t) => t.id === data.type);

  return (
    <div className="space-y-6">
      {/* En-tête avec l'animal sélectionné */}
      {data.name && data.type && (
        <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
            {selectedType?.emoji || "🐾"}
          </div>
          <div>
            <p className="font-semibold text-foreground">{data.name}</p>
            <p className="text-sm text-text-light">
              {selectedType?.name || data.type}
              {data.isMixedBreed
                ? data.primaryBreed && data.secondaryBreed
                  ? ` • ${data.primaryBreed} x ${data.secondaryBreed}`
                  : data.primaryBreed
                  ? ` • Croisé ${data.primaryBreed}`
                  : ""
                : data.breed && ` • ${data.breed}`}
              {data.gender !== "unknown" && ` • ${GENDERS.find((g) => g.id === data.gender)?.name}`}
            </p>
          </div>
        </div>
      )}

      {/* Informations de base */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Type d'animal */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Type d&apos;animal <span className="text-red-500">*</span>
            </label>
            <select
              value={data.type}
              onChange={(e) => onChange({ ...data, type: e.target.value })}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none bg-white ${
                errors.type ? "border-red-500" : "border-gray-200"
              }`}
            >
              <option value="">Sélectionner...</option>
              {availableTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.emoji} {type.name}
                </option>
              ))}
            </select>
            {errors.type && <p className="text-xs text-red-500 mt-1">{errors.type}</p>}
            {/* Message si types filtrés */}
            {acceptedAnimalTypes && acceptedAnimalTypes.length > 0 && acceptedAnimalTypes.length < ANIMAL_TYPES.length && (
              <p className="text-xs text-gray-500 mt-1">
                Cette formule accepte : {availableTypes.map(t => t.name).join(", ")}
              </p>
            )}
          </div>

          {/* Genre */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Genre <span className="text-red-500">*</span>
            </label>
            <select
              value={data.gender}
              onChange={(e) =>
                onChange({ ...data, gender: e.target.value as "male" | "female" | "unknown" })
              }
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none bg-white"
            >
              {GENDERS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Checkbox Race croisée - pour les chiens ET les chats */}
        {(data.type === "chien" || data.type === "chat") && (
          <label className="flex items-center gap-2 cursor-pointer group mb-2">
            <div
              className={`relative w-4 h-4 rounded border-2 transition-all ${
                data.isMixedBreed
                  ? "bg-primary border-primary"
                  : "border-gray-300 group-hover:border-primary/50"
              }`}
            >
              {data.isMixedBreed && (
                <Check className="w-2.5 h-2.5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              )}
              <input
                type="checkbox"
                checked={data.isMixedBreed || false}
                onChange={(e) =>
                  onChange({
                    ...data,
                    isMixedBreed: e.target.checked,
                    breed: "",
                    primaryBreed: "",
                    secondaryBreed: "",
                  })
                }
                className="sr-only"
              />
            </div>
            <span className="text-sm text-gray-600">Race croisée / Métis</span>
          </label>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.name}
              onChange={(e) => onChange({ ...data, name: e.target.value })}
              placeholder="Ex: Max"
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                errors.name ? "border-red-500" : "border-gray-200"
              }`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Race */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Race {data.isMixedBreed && <span className="text-xs text-gray-400">(dominante)</span>}
            </label>
            {data.type === "chien" ? (
              <BreedAutocomplete
                value={data.isMixedBreed ? (data.primaryBreed || "") : (data.breed || "")}
                onChange={(breed) =>
                  data.isMixedBreed
                    ? onChange({ ...data, primaryBreed: breed })
                    : onChange({ ...data, breed })
                }
                placeholder={data.isMixedBreed ? "Race dominante..." : "Rechercher une race..."}
              />
            ) : data.type === "chat" ? (
              <CatBreedAutocomplete
                value={data.isMixedBreed ? (data.primaryBreed || "") : (data.breed || "")}
                onChange={(breed) =>
                  data.isMixedBreed
                    ? onChange({ ...data, primaryBreed: breed })
                    : onChange({ ...data, breed })
                }
                placeholder={data.isMixedBreed ? "Race dominante..." : "Rechercher une race..."}
              />
            ) : (
              <input
                type="text"
                value={data.breed || ""}
                onChange={(e) => onChange({ ...data, breed: e.target.value })}
                placeholder="Ex: Canari, Hamster..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            )}
          </div>
        </div>

        {/* Race secondaire pour les croisés (chiens ET chats) */}
        {(data.type === "chien" || data.type === "chat") && data.isMixedBreed && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Race secondaire <span className="text-xs text-gray-400">(optionnel)</span>
            </label>
            {data.type === "chien" ? (
              <BreedAutocomplete
                value={data.secondaryBreed || ""}
                onChange={(breed) => onChange({ ...data, secondaryBreed: breed })}
                placeholder="Inconnue ou laissez vide..."
              />
            ) : (
              <CatBreedAutocomplete
                value={data.secondaryBreed || ""}
                onChange={(breed) => onChange({ ...data, secondaryBreed: breed })}
                placeholder="Inconnue ou laissez vide..."
              />
            )}
            {(data.primaryBreed || data.secondaryBreed) && (
              <p className="text-xs text-gray-500 mt-2">
                Affiché comme : <span className="font-medium text-gray-700">
                  {data.primaryBreed && data.secondaryBreed
                    ? `${data.primaryBreed} x ${data.secondaryBreed}`
                    : data.primaryBreed
                    ? `Croisé ${data.primaryBreed}`
                    : "Croisé"}
                </span>
              </p>
            )}
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Description
          </label>
          <textarea
            value={data.description || ""}
            onChange={(e) => onChange({ ...data, description: e.target.value })}
            placeholder="Décrivez votre animal (personnalité, habitudes, particularités...)"
            rows={3}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
          />
        </div>
      </div>

      {/* Bouton pour afficher les options avancées */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary hover:bg-primary/5 rounded-xl transition-colors"
      >
        {showAdvanced ? (
          <>
            <ChevronUp className="w-4 h-4" />
            Masquer les options avancées
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            Ajouter des informations complémentaires
          </>
        )}
      </button>

      {/* Options avancées */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6 overflow-hidden"
          >
            {/* Traits de caractère */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Traits de caractère
              </h3>

              <TraitSelector
                title="Compatibilité"
                icon="🔗"
                predefinedTraits={COMPATIBILITY_TRAITS}
                selectedTraits={data.compatibilityTraits}
                onTraitsChange={(traits) => onChange({ ...data, compatibilityTraits: traits })}
              />

              <TraitSelector
                title="Comportement"
                icon="🎭"
                predefinedTraits={BEHAVIOR_TRAITS}
                selectedTraits={data.behaviorTraits}
                onTraitsChange={(traits) => onChange({ ...data, behaviorTraits: traits })}
              />

              <TraitSelector
                title="Besoins"
                icon="✨"
                predefinedTraits={NEEDS_TRAITS}
                selectedTraits={data.needsTraits}
                onTraitsChange={(traits) => onChange({ ...data, needsTraits: traits })}
              />

              <TraitSelector
                title="Traits personnalisés"
                icon="🏷️"
                predefinedTraits={[]}
                selectedTraits={data.customTraits}
                onTraitsChange={(traits) => onChange({ ...data, customTraits: traits })}
                allowCustom
                customPlaceholder="Ajouter un trait..."
              />
            </div>

            {/* Contraintes particulières */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Contraintes particulières
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Besoins particuliers
                </label>
                <textarea
                  value={data.specialNeeds || ""}
                  onChange={(e) => onChange({ ...data, specialNeeds: e.target.value })}
                  placeholder="Indiquez les besoins spécifiques de votre animal..."
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conditions médicales
                </label>
                <textarea
                  value={data.medicalConditions || ""}
                  onChange={(e) => onChange({ ...data, medicalConditions: e.target.value })}
                  placeholder="Conditions médicales, allergies, traitements en cours..."
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Note sur les photos */}
      <p className="text-xs text-text-light text-center italic">
        Vous pourrez ajouter des photos de votre animal après la création de votre compte.
      </p>
    </div>
  );
}
