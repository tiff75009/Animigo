"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import TraitSelector from "./TraitSelector";
import PhotoGallery from "./PhotoGallery";

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

interface Photo {
  storageId: Id<"_storage">;
  url: string;
  isPrimary: boolean;
  order: number;
}

interface AnimalData {
  id?: Id<"animals">;
  name: string;
  type: string;
  gender: "male" | "female" | "unknown";
  breed?: string;
  birthDate?: string;
  description?: string;
  photos: Photo[];
  compatibilityTraits: string[];
  behaviorTraits: string[];
  needsTraits: string[];
  customTraits: string[];
  specialNeeds?: string;
  medicalConditions?: string;
}

interface AnimalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (animal: AnimalData) => void;
  token: string;
  initialData?: AnimalData | null;
  mode?: "create" | "edit";
}

const defaultAnimalData: AnimalData = {
  name: "",
  type: "",
  gender: "unknown",
  breed: "",
  birthDate: "",
  description: "",
  photos: [],
  compatibilityTraits: [],
  behaviorTraits: [],
  needsTraits: [],
  customTraits: [],
  specialNeeds: "",
  medicalConditions: "",
};

export default function AnimalFormModal({
  isOpen,
  onClose,
  onSave,
  token,
  initialData,
  mode = "create",
}: AnimalFormModalProps) {
  const [formData, setFormData] = useState<AnimalData>(defaultAnimalData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createAnimal = useMutation(api.animals.createAnimal);
  const updateAnimal = useMutation(api.animals.updateAnimal);

  // Initialiser les données si mode édition
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData(defaultAnimalData);
    }
  }, [initialData, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Le nom est requis";
    }

    if (!formData.type) {
      newErrors.type = "Le type d'animal est requis";
    }

    if (!formData.gender) {
      newErrors.gender = "Le genre est requis";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      // Préparer les photos pour Convex
      const photosForConvex = formData.photos.map((p) => ({
        storageId: p.storageId,
        isPrimary: p.isPrimary,
        order: p.order,
      }));

      if (mode === "create") {
        const result = await createAnimal({
          token,
          name: formData.name.trim(),
          type: formData.type,
          gender: formData.gender,
          breed: formData.breed?.trim() || undefined,
          birthDate: formData.birthDate || undefined,
          description: formData.description?.trim() || undefined,
          photos: photosForConvex.length > 0 ? photosForConvex : undefined,
          compatibilityTraits: formData.compatibilityTraits.length > 0 ? formData.compatibilityTraits : undefined,
          behaviorTraits: formData.behaviorTraits.length > 0 ? formData.behaviorTraits : undefined,
          needsTraits: formData.needsTraits.length > 0 ? formData.needsTraits : undefined,
          customTraits: formData.customTraits.length > 0 ? formData.customTraits : undefined,
          specialNeeds: formData.specialNeeds?.trim() || undefined,
          medicalConditions: formData.medicalConditions?.trim() || undefined,
        });

        if (result.success) {
          onSave({ ...formData, id: result.animalId });
          onClose();
        }
      } else if (mode === "edit" && formData.id) {
        const result = await updateAnimal({
          token,
          animalId: formData.id,
          name: formData.name.trim(),
          type: formData.type,
          gender: formData.gender,
          breed: formData.breed?.trim() || undefined,
          birthDate: formData.birthDate || undefined,
          description: formData.description?.trim() || undefined,
          photos: photosForConvex.length > 0 ? photosForConvex : undefined,
          compatibilityTraits: formData.compatibilityTraits,
          behaviorTraits: formData.behaviorTraits,
          needsTraits: formData.needsTraits,
          customTraits: formData.customTraits,
          specialNeeds: formData.specialNeeds?.trim() || undefined,
          medicalConditions: formData.medicalConditions?.trim() || undefined,
        });

        if (result.success) {
          onSave(formData);
          onClose();
        }
      }
    } catch (error) {
      console.error("Erreur:", error);
      if (error instanceof Error) {
        setErrors({ submit: error.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData(defaultAnimalData);
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-foreground">
              {mode === "create" ? "Ajouter un animal" : "Modifier la fiche"}
            </h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="p-6 space-y-6">
              {/* Section 1: Informations de base */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Informations de base
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  {/* Type d'animal */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type d&apos;animal <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                        errors.type ? "border-red-500" : "border-gray-200"
                      }`}
                    >
                      <option value="">Sélectionner...</option>
                      {ANIMAL_TYPES.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.emoji} {type.name}
                        </option>
                      ))}
                    </select>
                    {errors.type && <p className="text-xs text-red-500 mt-1">{errors.type}</p>}
                  </div>

                  {/* Genre */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Genre <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) =>
                        setFormData({ ...formData, gender: e.target.value as "male" | "female" | "unknown" })
                      }
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                        errors.gender ? "border-red-500" : "border-gray-200"
                      }`}
                    >
                      {GENDERS.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                    {errors.gender && <p className="text-xs text-red-500 mt-1">{errors.gender}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Nom */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Max"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                        errors.name ? "border-red-500" : "border-gray-200"
                      }`}
                    />
                    {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                  </div>

                  {/* Race */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Race
                    </label>
                    <input
                      type="text"
                      value={formData.breed || ""}
                      onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                      placeholder="Ex: Labrador"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>

                {/* Date de naissance */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de naissance
                  </label>
                  <input
                    type="date"
                    value={formData.birthDate || ""}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {/* Section 2: Description */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Description
                </h3>

                <div>
                  <textarea
                    value={formData.description || ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Décrivez votre animal (personnalité, habitudes, particularités...)"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  />
                </div>
              </div>

              {/* Section 3: Galerie photos */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <PhotoGallery
                  photos={formData.photos}
                  onPhotosChange={(photos) => setFormData({ ...formData, photos })}
                  token={token}
                  animalName={formData.name || "l'animal"}
                />
              </div>

              {/* Section 4: Traits de caractère */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Traits de caractère
                </h3>

                <TraitSelector
                  title="Compatibilité"
                  icon="🔗"
                  predefinedTraits={COMPATIBILITY_TRAITS}
                  selectedTraits={formData.compatibilityTraits}
                  onTraitsChange={(traits) => setFormData({ ...formData, compatibilityTraits: traits })}
                />

                <TraitSelector
                  title="Comportement"
                  icon="🎭"
                  predefinedTraits={BEHAVIOR_TRAITS}
                  selectedTraits={formData.behaviorTraits}
                  onTraitsChange={(traits) => setFormData({ ...formData, behaviorTraits: traits })}
                />

                <TraitSelector
                  title="Besoins"
                  icon="✨"
                  predefinedTraits={NEEDS_TRAITS}
                  selectedTraits={formData.needsTraits}
                  onTraitsChange={(traits) => setFormData({ ...formData, needsTraits: traits })}
                />

                <TraitSelector
                  title="Traits personnalisés"
                  icon="🏷️"
                  predefinedTraits={[]}
                  selectedTraits={formData.customTraits}
                  onTraitsChange={(traits) => setFormData({ ...formData, customTraits: traits })}
                  allowCustom
                  customPlaceholder="Ajouter un trait..."
                />
              </div>

              {/* Section 5: Contraintes particulières */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Contraintes particulières
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Besoins particuliers
                  </label>
                  <textarea
                    value={formData.specialNeeds || ""}
                    onChange={(e) => setFormData({ ...formData, specialNeeds: e.target.value })}
                    placeholder="Indiquez les besoins spécifiques de votre animal..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Conditions médicales
                  </label>
                  <textarea
                    value={formData.medicalConditions || ""}
                    onChange={(e) => setFormData({ ...formData, medicalConditions: e.target.value })}
                    placeholder="Conditions médicales, allergies, traitements en cours..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  />
                </div>
              </div>

              {/* Erreur globale */}
              {errors.submit && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                  {errors.submit}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === "create" ? "Ajouter l'animal" : "Enregistrer"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
