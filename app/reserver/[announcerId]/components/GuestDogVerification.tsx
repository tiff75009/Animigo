"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dog,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Scale,
  FileText,
  ChevronDown,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import dogBreedsData from "@/data/dog-breeds.json";
import {
  checkBreedCategory,
  getSizeFromWeight,
  isDogAccepted,
  WEIGHT_RANGES,
  type DogSize,
  type DogCategoryResult,
} from "@/data/categorized-dog-breeds";

// Types
interface DogBreed {
  slug: string;
  name: string;
  otherNames?: string[];
  size: "small" | "medium" | "large";
  weight?: {
    male?: { min: number; max: number };
    female?: { min: number; max: number };
  };
}

interface GuestDogData {
  breed: string;
  breedSlug: string | null;
  isMixedBreed: boolean;
  dominantBreed?: string;
  dominantBreedSlug?: string | null;
  weight?: number;
  size: DogSize;
  hasLof: boolean;
  category: "none" | "cat1" | "cat2";
  isCategorized: boolean;
}

interface GuestDogVerificationProps {
  // Restrictions de la formule
  acceptedDogSizes: DogSize[];
  dogCategoryAcceptance: "none" | "cat1" | "cat2" | "both";
  // Callbacks
  onDogDataChange: (data: GuestDogData | null) => void;
  onValidationChange: (isValid: boolean, error?: string) => void;
  // Initial data (for editing)
  initialData?: GuestDogData | null;
  className?: string;
}

// Liste des races depuis le JSON
const breeds: DogBreed[] = dogBreedsData.breeds as DogBreed[];

export default function GuestDogVerification({
  acceptedDogSizes,
  dogCategoryAcceptance,
  onDogDataChange,
  onValidationChange,
  initialData,
  className,
}: GuestDogVerificationProps) {
  // État du formulaire
  const [isMixedBreed, setIsMixedBreed] = useState(initialData?.isMixedBreed ?? false);
  const [selectedBreed, setSelectedBreed] = useState<DogBreed | null>(() => {
    // Retrouver la race depuis initialData si disponible
    if (initialData?.breedSlug) {
      return breeds.find(b => b.slug === initialData.breedSlug) || null;
    }
    return null;
  });
  const [breedSearch, setBreedSearch] = useState(initialData?.breed ?? "");
  const [showBreedDropdown, setShowBreedDropdown] = useState(false);
  const [dominantBreedSearch, setDominantBreedSearch] = useState(initialData?.dominantBreed ?? "");
  const [selectedDominantBreed, setSelectedDominantBreed] = useState<DogBreed | null>(() => {
    // Retrouver la race dominante depuis initialData si disponible
    if (initialData?.dominantBreedSlug) {
      return breeds.find(b => b.slug === initialData.dominantBreedSlug) || null;
    }
    return null;
  });
  const [showDominantBreedDropdown, setShowDominantBreedDropdown] = useState(false);
  const [weight, setWeight] = useState<string>(initialData?.weight?.toString() ?? "");
  const [hasLof, setHasLof] = useState(initialData?.hasLof ?? false);

  // État de validation
  const [categoryResult, setCategoryResult] = useState<DogCategoryResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isAccepted, setIsAccepted] = useState<boolean | null>(null);

  // Synchroniser avec initialData quand il change (ex: retour sur l'étape)
  useEffect(() => {
    if (initialData) {
      setIsMixedBreed(initialData.isMixedBreed);
      setBreedSearch(initialData.breed || "");
      setDominantBreedSearch(initialData.dominantBreed || "");
      setWeight(initialData.weight?.toString() || "");
      setHasLof(initialData.hasLof);

      // Retrouver les objets race
      if (initialData.breedSlug) {
        const breed = breeds.find(b => b.slug === initialData.breedSlug);
        setSelectedBreed(breed || null);
      }
      if (initialData.dominantBreedSlug) {
        const breed = breeds.find(b => b.slug === initialData.dominantBreedSlug);
        setSelectedDominantBreed(breed || null);
      }
    }
  }, [initialData]);

  // Filtrer les races pour l'autocomplete
  const filteredBreeds = useMemo(() => {
    const search = breedSearch.toLowerCase().trim();
    if (!search) return breeds.slice(0, 20);
    return breeds.filter(
      (b) =>
        b.name.toLowerCase().includes(search) ||
        b.slug.includes(search) ||
        b.otherNames?.some((n) => n.toLowerCase().includes(search))
    ).slice(0, 20);
  }, [breedSearch]);

  const filteredDominantBreeds = useMemo(() => {
    const search = dominantBreedSearch.toLowerCase().trim();
    if (!search) return breeds.slice(0, 20);
    return breeds.filter(
      (b) =>
        b.name.toLowerCase().includes(search) ||
        b.slug.includes(search) ||
        b.otherNames?.some((n) => n.toLowerCase().includes(search))
    ).slice(0, 20);
  }, [dominantBreedSearch]);

  // Calculer la taille du chien
  const dogSize = useMemo((): DogSize | null => {
    if (isMixedBreed) {
      // Pour les croisés, utiliser le poids
      const weightNum = parseFloat(weight);
      if (!isNaN(weightNum) && weightNum > 0) {
        return getSizeFromWeight(weightNum);
      }
      // Sinon utiliser la race dominante si disponible
      if (selectedDominantBreed) {
        return selectedDominantBreed.size;
      }
      return null;
    } else {
      // Pour les races pures, utiliser la taille de la race
      return selectedBreed?.size ?? null;
    }
  }, [isMixedBreed, selectedBreed, selectedDominantBreed, weight]);

  // Vérifier la catégorie du chien
  useEffect(() => {
    let result: DogCategoryResult | null = null;

    if (isMixedBreed) {
      if (selectedDominantBreed || dominantBreedSearch) {
        result = checkBreedCategory(
          selectedDominantBreed?.slug || null,
          dominantBreedSearch || selectedDominantBreed?.name || "",
          hasLof
        );
      }
    } else {
      if (selectedBreed || breedSearch) {
        result = checkBreedCategory(
          selectedBreed?.slug || null,
          breedSearch || selectedBreed?.name || "",
          hasLof
        );
      }
    }

    setCategoryResult(result);
  }, [isMixedBreed, selectedBreed, breedSearch, selectedDominantBreed, dominantBreedSearch, hasLof]);

  // Valider et notifier le parent
  useEffect(() => {
    // Vérifier si on a assez d'informations
    const hasBreedInfo = isMixedBreed
      ? (selectedDominantBreed || dominantBreedSearch) && (weight || selectedDominantBreed)
      : (selectedBreed || breedSearch);

    if (!hasBreedInfo || !dogSize) {
      setValidationError(null);
      setIsAccepted(null);
      onDogDataChange(null);
      onValidationChange(false);
      return;
    }

    // Déterminer la catégorie finale
    const category = categoryResult?.category === "unknown" || categoryResult?.category === "cat1" || categoryResult?.category === "cat2"
      ? (categoryResult.category === "unknown" ? (hasLof ? "cat2" : "cat1") : categoryResult.category)
      : "none";

    // Vérifier si le chien est accepté
    const acceptanceResult = isDogAccepted(
      dogSize,
      category as "none" | "cat1" | "cat2",
      acceptedDogSizes,
      dogCategoryAcceptance
    );

    setIsAccepted(acceptanceResult.accepted);
    setValidationError(acceptanceResult.reason || null);

    // Créer les données du chien
    const dogData: GuestDogData = {
      breed: isMixedBreed ? "Croisé" : (selectedBreed?.name || breedSearch),
      breedSlug: isMixedBreed ? null : (selectedBreed?.slug || null),
      isMixedBreed,
      dominantBreed: isMixedBreed ? (selectedDominantBreed?.name || dominantBreedSearch) : undefined,
      dominantBreedSlug: isMixedBreed ? (selectedDominantBreed?.slug || null) : undefined,
      weight: isMixedBreed && weight ? parseFloat(weight) : undefined,
      size: dogSize,
      hasLof,
      category: category as "none" | "cat1" | "cat2",
      isCategorized: categoryResult?.isCategorized ?? false,
    };

    onDogDataChange(dogData);
    onValidationChange(acceptanceResult.accepted, acceptanceResult.reason);
  }, [
    isMixedBreed,
    selectedBreed,
    breedSearch,
    selectedDominantBreed,
    dominantBreedSearch,
    weight,
    hasLof,
    dogSize,
    categoryResult,
    acceptedDogSizes,
    dogCategoryAcceptance,
    onDogDataChange,
    onValidationChange,
  ]);

  // Sélectionner une race
  const handleSelectBreed = (breed: DogBreed) => {
    setSelectedBreed(breed);
    setBreedSearch(breed.name);
    setShowBreedDropdown(false);
  };

  const handleSelectDominantBreed = (breed: DogBreed) => {
    setSelectedDominantBreed(breed);
    setDominantBreedSearch(breed.name);
    setShowDominantBreedDropdown(false);
  };

  // Labels des tailles
  const sizeLabels: Record<DogSize, string> = {
    small: "Petit (< 10 kg)",
    medium: "Moyen (10-25 kg)",
    large: "Grand (> 25 kg)",
  };

  // Afficher les restrictions de la formule
  const restrictionText = useMemo(() => {
    const sizes = acceptedDogSizes.map(s => sizeLabels[s]).join(", ");
    const category = dogCategoryAcceptance === "none"
      ? "non catégorisés uniquement"
      : dogCategoryAcceptance === "cat1"
        ? "catégorie 1 acceptée"
        : dogCategoryAcceptance === "cat2"
          ? "catégorie 2 acceptée"
          : "toutes catégories acceptées";
    return `Tailles acceptées: ${sizes}. ${category}.`;
  }, [acceptedDogSizes, dogCategoryAcceptance]);

  return (
    <div className={cn("bg-white rounded-2xl p-5 shadow-sm", className)}>
      {/* En-tête */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-amber-50">
          <Dog className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Informations sur votre chien</h3>
          <p className="text-sm text-text-light">
            Renseignez la race pour vérifier la compatibilité
          </p>
        </div>
      </div>

      {/* Message d'info sur les restrictions */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-800">{restrictionText}</p>
        </div>
      </div>

      {/* Checkbox race croisée */}
      <div className="mb-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isMixedBreed}
            onChange={(e) => {
              setIsMixedBreed(e.target.checked);
              setSelectedBreed(null);
              setBreedSearch("");
              setSelectedDominantBreed(null);
              setDominantBreedSearch("");
            }}
            className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm font-medium text-foreground">
            Race croisée / Métis
          </span>
        </label>
      </div>

      {/* Sélection de race */}
      {!isMixedBreed ? (
        // Race pure
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-2">
            Race du chien
          </label>
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={breedSearch}
                onChange={(e) => {
                  setBreedSearch(e.target.value);
                  setSelectedBreed(null);
                  setShowBreedDropdown(true);
                }}
                onFocus={() => setShowBreedDropdown(true)}
                placeholder="Rechercher une race..."
                className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
              {breedSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setBreedSearch("");
                    setSelectedBreed(null);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>

            {/* Dropdown des races - s'affiche vers le haut sur mobile */}
            <AnimatePresence>
              {showBreedDropdown && filteredBreeds.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute z-[10000] w-full bottom-full mb-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto"
                >
                  {filteredBreeds.map((breed) => (
                    <button
                      key={breed.slug}
                      type="button"
                      onClick={() => handleSelectBreed(breed)}
                      className={cn(
                        "w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between",
                        selectedBreed?.slug === breed.slug && "bg-primary/5"
                      )}
                    >
                      <span className="font-medium text-foreground">{breed.name}</span>
                      <span className="text-xs text-text-light px-2 py-0.5 bg-gray-100 rounded-full">
                        {sizeLabels[breed.size]}
                      </span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        // Race croisée
        <>
          {/* Race dominante */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Race dominante
            </label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={dominantBreedSearch}
                  onChange={(e) => {
                    setDominantBreedSearch(e.target.value);
                    setSelectedDominantBreed(null);
                    setShowDominantBreedDropdown(true);
                  }}
                  onFocus={() => setShowDominantBreedDropdown(true)}
                  placeholder="Race dominante..."
                  className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
                {dominantBreedSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setDominantBreedSearch("");
                      setSelectedDominantBreed(null);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>

              {/* Dropdown des races dominantes - s'affiche vers le haut sur mobile */}
              <AnimatePresence>
                {showDominantBreedDropdown && filteredDominantBreeds.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute z-[10000] w-full bottom-full mb-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto"
                  >
                    {filteredDominantBreeds.map((breed) => (
                      <button
                        key={breed.slug}
                        type="button"
                        onClick={() => handleSelectDominantBreed(breed)}
                        className={cn(
                          "w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between",
                          selectedDominantBreed?.slug === breed.slug && "bg-primary/5"
                        )}
                      >
                        <span className="font-medium text-foreground">{breed.name}</span>
                        <span className="text-xs text-text-light px-2 py-0.5 bg-gray-100 rounded-full">
                          {sizeLabels[breed.size]}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Poids estimé */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              <Scale className="w-4 h-4 inline mr-1" />
              Poids estimé (kg)
            </label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="Ex: 15"
              min="0"
              max="100"
              step="0.5"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
            <p className="text-xs text-text-light mt-1">
              Petit: &lt;10kg | Moyen: 10-25kg | Grand: &gt;25kg
            </p>
          </div>
        </>
      )}

      {/* Affichage de la taille déterminée */}
      {dogSize && (
        <div className="mb-4 p-3 bg-gray-50 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-light">Taille déterminée :</span>
            <span className={cn(
              "text-sm font-medium px-3 py-1 rounded-full",
              dogSize === "small" && "bg-green-100 text-green-700",
              dogSize === "medium" && "bg-blue-100 text-blue-700",
              dogSize === "large" && "bg-purple-100 text-purple-700"
            )}>
              {sizeLabels[dogSize]}
            </span>
          </div>
        </div>
      )}

      {/* Vérification LOF si nécessaire */}
      {categoryResult?.requiresLofCheck && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 mb-2">
                Cette race peut être catégorisée selon la législation française
              </p>
              <p className="text-xs text-amber-700 mb-3">
                Les chiens de type &quot;{categoryResult.breedName}&quot; peuvent être de catégorie 1 (non LOF) ou catégorie 2 (inscrits au LOF).
              </p>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasLof}
                  onChange={(e) => setHasLof(e.target.checked)}
                  className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm font-medium text-amber-800 flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  Mon chien est inscrit au LOF
                </span>
              </label>
            </div>
          </div>
        </motion.div>
      )}

      {/* Résultat de la validation */}
      <AnimatePresence mode="wait">
        {isAccepted === true && (
          <motion.div
            key="accepted"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-green-50 border border-green-200 rounded-xl"
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Votre chien est accepté !</p>
                <p className="text-sm text-green-600">
                  Vous pouvez poursuivre la réservation.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {isAccepted === false && validationError && (
          <motion.div
            key="rejected"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-50 border border-red-200 rounded-xl"
          >
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Réservation impossible</p>
                <p className="text-sm text-red-600">{validationError}</p>
                <p className="text-xs text-red-500 mt-2">
                  Nous vous invitons à rechercher un autre prestataire qui accepte les chiens de ce profil.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fermer les dropdowns quand on clique ailleurs */}
      {(showBreedDropdown || showDominantBreedDropdown) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowBreedDropdown(false);
            setShowDominantBreedDropdown(false);
          }}
        />
      )}
    </div>
  );
}

// Export du type pour utilisation externe
export type { GuestDogData };
