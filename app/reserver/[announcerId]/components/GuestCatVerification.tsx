"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cat,
  CheckCircle,
  Scale,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import {
  CAT_BREEDS_SORTED,
  CAT_SIZE_LABELS,
  getCatSizeFromWeight,
  type CatBreed,
  type CatSize,
} from "@/data/cat-breeds";

// Types
export interface GuestCatData {
  breed: string;
  breedSlug: string | null;
  isMixedBreed: boolean;
  primaryBreed?: string;
  primaryBreedSlug?: string | null;
  secondaryBreed?: string;
  secondaryBreedSlug?: string | null;
  weight?: number;
  size: CatSize;
  manualBreedEntry?: string;
}

interface GuestCatVerificationProps {
  // Callbacks
  onCatDataChange: (data: GuestCatData | null) => void;
  onValidationChange: (isValid: boolean, error?: string) => void;
  // Initial data (for editing)
  initialData?: GuestCatData | null;
  className?: string;
}

/**
 * Formulaire de saisie des informations du chat pour les invités.
 * Pas de validation de restriction - collecte simplement les données pour pré-remplir la finalisation.
 */
export default function GuestCatVerification({
  onCatDataChange,
  onValidationChange,
  initialData,
  className,
}: GuestCatVerificationProps) {
  // État du formulaire
  const [isMixedBreed, setIsMixedBreed] = useState(initialData?.isMixedBreed ?? false);
  const [isManualEntry, setIsManualEntry] = useState(!!initialData?.manualBreedEntry);
  const [selectedBreed, setSelectedBreed] = useState<CatBreed | null>(() => {
    if (initialData?.breedSlug) {
      return CAT_BREEDS_SORTED.find(b => b.slug === initialData.breedSlug) || null;
    }
    return null;
  });
  const [breedSearch, setBreedSearch] = useState(initialData?.breed ?? "");
  const [showBreedDropdown, setShowBreedDropdown] = useState(false);

  // Races croisées
  const [primaryBreedSearch, setPrimaryBreedSearch] = useState(initialData?.primaryBreed ?? "");
  const [selectedPrimaryBreed, setSelectedPrimaryBreed] = useState<CatBreed | null>(() => {
    if (initialData?.primaryBreedSlug) {
      return CAT_BREEDS_SORTED.find(b => b.slug === initialData.primaryBreedSlug) || null;
    }
    return null;
  });
  const [showPrimaryBreedDropdown, setShowPrimaryBreedDropdown] = useState(false);

  const [secondaryBreedSearch, setSecondaryBreedSearch] = useState(initialData?.secondaryBreed ?? "");
  const [selectedSecondaryBreed, setSelectedSecondaryBreed] = useState<CatBreed | null>(() => {
    if (initialData?.secondaryBreedSlug) {
      return CAT_BREEDS_SORTED.find(b => b.slug === initialData.secondaryBreedSlug) || null;
    }
    return null;
  });
  const [showSecondaryBreedDropdown, setShowSecondaryBreedDropdown] = useState(false);

  // Saisie manuelle
  const [manualBreedEntry, setManualBreedEntry] = useState(initialData?.manualBreedEntry ?? "");

  // Poids (pour croisés ou saisie manuelle)
  const [weight, setWeight] = useState<string>(initialData?.weight?.toString() ?? "");

  // Synchroniser avec initialData
  useEffect(() => {
    if (initialData) {
      setIsMixedBreed(initialData.isMixedBreed);
      setIsManualEntry(!!initialData.manualBreedEntry);
      setBreedSearch(initialData.breed || "");
      setPrimaryBreedSearch(initialData.primaryBreed || "");
      setSecondaryBreedSearch(initialData.secondaryBreed || "");
      setManualBreedEntry(initialData.manualBreedEntry || "");
      setWeight(initialData.weight?.toString() || "");

      if (initialData.breedSlug) {
        const breed = CAT_BREEDS_SORTED.find(b => b.slug === initialData.breedSlug);
        setSelectedBreed(breed || null);
      }
      if (initialData.primaryBreedSlug) {
        const breed = CAT_BREEDS_SORTED.find(b => b.slug === initialData.primaryBreedSlug);
        setSelectedPrimaryBreed(breed || null);
      }
      if (initialData.secondaryBreedSlug) {
        const breed = CAT_BREEDS_SORTED.find(b => b.slug === initialData.secondaryBreedSlug);
        setSelectedSecondaryBreed(breed || null);
      }
    }
  }, [initialData]);

  // Filtrer les races pour l'autocomplete
  const filteredBreeds = useMemo(() => {
    const search = breedSearch.toLowerCase().trim();
    if (!search) return CAT_BREEDS_SORTED.slice(0, 20);
    return CAT_BREEDS_SORTED.filter(
      (b) =>
        b.name.toLowerCase().includes(search) ||
        b.slug.includes(search)
    ).slice(0, 20);
  }, [breedSearch]);

  const filteredPrimaryBreeds = useMemo(() => {
    const search = primaryBreedSearch.toLowerCase().trim();
    if (!search) return CAT_BREEDS_SORTED.slice(0, 20);
    return CAT_BREEDS_SORTED.filter(
      (b) =>
        b.name.toLowerCase().includes(search) ||
        b.slug.includes(search)
    ).slice(0, 20);
  }, [primaryBreedSearch]);

  const filteredSecondaryBreeds = useMemo(() => {
    const search = secondaryBreedSearch.toLowerCase().trim();
    if (!search) return CAT_BREEDS_SORTED.slice(0, 20);
    return CAT_BREEDS_SORTED.filter(
      (b) =>
        b.name.toLowerCase().includes(search) ||
        b.slug.includes(search)
    ).slice(0, 20);
  }, [secondaryBreedSearch]);

  // Calculer la taille du chat
  const catSize = useMemo((): CatSize | null => {
    if (isManualEntry) {
      const weightNum = parseFloat(weight);
      if (!isNaN(weightNum) && weightNum > 0) {
        return getCatSizeFromWeight(weightNum);
      }
      return null;
    }

    if (isMixedBreed) {
      const weightNum = parseFloat(weight);
      if (!isNaN(weightNum) && weightNum > 0) {
        return getCatSizeFromWeight(weightNum);
      }
      if (selectedPrimaryBreed) {
        return selectedPrimaryBreed.size;
      }
      return null;
    } else {
      return selectedBreed?.size ?? null;
    }
  }, [isManualEntry, isMixedBreed, selectedBreed, selectedPrimaryBreed, weight]);

  // Valider et notifier le parent (pas de restriction pour les chats)
  useEffect(() => {
    let hasBreedInfo = false;

    if (isManualEntry) {
      hasBreedInfo = !!manualBreedEntry && !!weight;
    } else if (isMixedBreed) {
      hasBreedInfo = !!(selectedPrimaryBreed || primaryBreedSearch);
    } else {
      hasBreedInfo = !!(selectedBreed || breedSearch);
    }

    if (!hasBreedInfo || !catSize) {
      onCatDataChange(null);
      onValidationChange(false);
      return;
    }

    // Créer les données du chat - toujours valide si les infos sont renseignées
    const catData: GuestCatData = {
      breed: isManualEntry
        ? manualBreedEntry
        : (isMixedBreed ? "Croisé" : (selectedBreed?.name || breedSearch)),
      breedSlug: isManualEntry || isMixedBreed ? null : (selectedBreed?.slug || null),
      isMixedBreed: isMixedBreed || isManualEntry,
      primaryBreed: isMixedBreed ? (selectedPrimaryBreed?.name || primaryBreedSearch) : undefined,
      primaryBreedSlug: isMixedBreed ? (selectedPrimaryBreed?.slug || null) : undefined,
      secondaryBreed: isMixedBreed && (selectedSecondaryBreed || secondaryBreedSearch)
        ? (selectedSecondaryBreed?.name || secondaryBreedSearch)
        : undefined,
      secondaryBreedSlug: isMixedBreed ? (selectedSecondaryBreed?.slug || null) : undefined,
      weight: (isMixedBreed || isManualEntry) && weight ? parseFloat(weight) : undefined,
      size: catSize,
      manualBreedEntry: isManualEntry ? manualBreedEntry : undefined,
    };

    onCatDataChange(catData);
    onValidationChange(true);
  }, [
    isManualEntry,
    isMixedBreed,
    selectedBreed,
    breedSearch,
    selectedPrimaryBreed,
    primaryBreedSearch,
    selectedSecondaryBreed,
    secondaryBreedSearch,
    manualBreedEntry,
    weight,
    catSize,
    onCatDataChange,
    onValidationChange,
  ]);

  // Sélectionner une race
  const handleSelectBreed = (breed: CatBreed) => {
    setSelectedBreed(breed);
    setBreedSearch(breed.name);
    setShowBreedDropdown(false);
  };

  const handleSelectPrimaryBreed = (breed: CatBreed) => {
    setSelectedPrimaryBreed(breed);
    setPrimaryBreedSearch(breed.name);
    setShowPrimaryBreedDropdown(false);
  };

  const handleSelectSecondaryBreed = (breed: CatBreed) => {
    setSelectedSecondaryBreed(breed);
    setSecondaryBreedSearch(breed.name);
    setShowSecondaryBreedDropdown(false);
  };

  // Reset lors du changement de mode
  const handleModeChange = (mode: "pure" | "mixed" | "manual") => {
    setIsMixedBreed(mode === "mixed");
    setIsManualEntry(mode === "manual");
    setSelectedBreed(null);
    setBreedSearch("");
    setSelectedPrimaryBreed(null);
    setPrimaryBreedSearch("");
    setSelectedSecondaryBreed(null);
    setSecondaryBreedSearch("");
    setManualBreedEntry("");
    setWeight("");
  };

  // Vérifier si les informations sont complètes
  const isComplete = useMemo(() => {
    if (isManualEntry) {
      return !!manualBreedEntry && !!weight && !!catSize;
    } else if (isMixedBreed) {
      return !!(selectedPrimaryBreed || primaryBreedSearch) && !!catSize;
    } else {
      return !!(selectedBreed || breedSearch) && !!catSize;
    }
  }, [isManualEntry, isMixedBreed, selectedBreed, breedSearch, selectedPrimaryBreed, primaryBreedSearch, manualBreedEntry, weight, catSize]);

  return (
    <div className={cn("bg-white rounded-2xl p-5 shadow-sm", className)}>
      {/* En-tête */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-purple-50">
          <Cat className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Informations sur votre chat</h3>
          <p className="text-sm text-text-light">
            Ces informations seront pré-remplies lors de la finalisation
          </p>
        </div>
      </div>

      {/* Sélection du mode */}
      <div className="mb-4 space-y-2">
        <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
          <input
            type="radio"
            name="catMode"
            checked={!isMixedBreed && !isManualEntry}
            onChange={() => handleModeChange("pure")}
            className="w-4 h-4 text-purple-600 focus:ring-purple-500"
          />
          <span className="text-sm font-medium text-foreground">Race pure</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
          <input
            type="radio"
            name="catMode"
            checked={isMixedBreed && !isManualEntry}
            onChange={() => handleModeChange("mixed")}
            className="w-4 h-4 text-purple-600 focus:ring-purple-500"
          />
          <span className="text-sm font-medium text-foreground">Race croisée / Métis</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
          <input
            type="radio"
            name="catMode"
            checked={isManualEntry}
            onChange={() => handleModeChange("manual")}
            className="w-4 h-4 text-purple-600 focus:ring-purple-500"
          />
          <span className="text-sm font-medium text-foreground">Je ne trouve pas ma race</span>
        </label>
      </div>

      {/* Sélection de race pure */}
      {!isMixedBreed && !isManualEntry && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-2">
            Race du chat
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
                className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-colors"
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

            {/* Dropdown */}
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
                        selectedBreed?.slug === breed.slug && "bg-purple-50"
                      )}
                    >
                      <span className="font-medium text-foreground">{breed.name}</span>
                      <span className="text-xs text-text-light px-2 py-0.5 bg-gray-100 rounded-full">
                        {CAT_SIZE_LABELS[breed.size]}
                      </span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Race croisée */}
      {isMixedBreed && !isManualEntry && (
        <>
          {/* Race primaire */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Race principale
            </label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={primaryBreedSearch}
                  onChange={(e) => {
                    setPrimaryBreedSearch(e.target.value);
                    setSelectedPrimaryBreed(null);
                    setShowPrimaryBreedDropdown(true);
                  }}
                  onFocus={() => setShowPrimaryBreedDropdown(true)}
                  placeholder="Race principale..."
                  className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-colors"
                />
                {primaryBreedSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setPrimaryBreedSearch("");
                      setSelectedPrimaryBreed(null);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>

              <AnimatePresence>
                {showPrimaryBreedDropdown && filteredPrimaryBreeds.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute z-[10000] w-full bottom-full mb-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto"
                  >
                    {filteredPrimaryBreeds.map((breed) => (
                      <button
                        key={breed.slug}
                        type="button"
                        onClick={() => handleSelectPrimaryBreed(breed)}
                        className={cn(
                          "w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between",
                          selectedPrimaryBreed?.slug === breed.slug && "bg-purple-50"
                        )}
                      >
                        <span className="font-medium text-foreground">{breed.name}</span>
                        <span className="text-xs text-text-light px-2 py-0.5 bg-gray-100 rounded-full">
                          {CAT_SIZE_LABELS[breed.size]}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Race secondaire (optionnel) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Race secondaire <span className="text-text-light">(optionnel)</span>
            </label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={secondaryBreedSearch}
                  onChange={(e) => {
                    setSecondaryBreedSearch(e.target.value);
                    setSelectedSecondaryBreed(null);
                    setShowSecondaryBreedDropdown(true);
                  }}
                  onFocus={() => setShowSecondaryBreedDropdown(true)}
                  placeholder="Race secondaire..."
                  className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-colors"
                />
                {secondaryBreedSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setSecondaryBreedSearch("");
                      setSelectedSecondaryBreed(null);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>

              <AnimatePresence>
                {showSecondaryBreedDropdown && filteredSecondaryBreeds.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute z-[10000] w-full bottom-full mb-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto"
                  >
                    {filteredSecondaryBreeds.map((breed) => (
                      <button
                        key={breed.slug}
                        type="button"
                        onClick={() => handleSelectSecondaryBreed(breed)}
                        className={cn(
                          "w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between",
                          selectedSecondaryBreed?.slug === breed.slug && "bg-purple-50"
                        )}
                      >
                        <span className="font-medium text-foreground">{breed.name}</span>
                        <span className="text-xs text-text-light px-2 py-0.5 bg-gray-100 rounded-full">
                          {CAT_SIZE_LABELS[breed.size]}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Poids */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              <Scale className="w-4 h-4 inline mr-1" />
              Poids estimé (kg)
            </label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="Ex: 4"
              min="0"
              max="20"
              step="0.5"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-colors"
            />
            <p className="text-xs text-text-light mt-1">
              Petit: &lt;4kg | Moyen: 4-6kg | Grand: &gt;6kg
            </p>
          </div>
        </>
      )}

      {/* Saisie manuelle */}
      {isManualEntry && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Nom de la race
            </label>
            <input
              type="text"
              value={manualBreedEntry}
              onChange={(e) => setManualBreedEntry(e.target.value)}
              placeholder="Ex: Chat européen tigré"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-colors"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              <Scale className="w-4 h-4 inline mr-1" />
              Poids (kg) <span className="text-purple-600">*</span>
            </label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="Ex: 4"
              min="0"
              max="20"
              step="0.5"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-colors"
            />
            <p className="text-xs text-text-light mt-1">
              Le poids est requis pour déterminer la taille. Petit: &lt;4kg | Moyen: 4-6kg | Grand: &gt;6kg
            </p>
          </div>
        </>
      )}

      {/* Affichage de la taille déterminée */}
      {catSize && (
        <div className="mb-4 p-3 bg-gray-50 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-light">Taille déterminée :</span>
            <span className={cn(
              "text-sm font-medium px-3 py-1 rounded-full",
              catSize === "small" && "bg-green-100 text-green-700",
              catSize === "medium" && "bg-blue-100 text-blue-700",
              catSize === "large" && "bg-purple-100 text-purple-700"
            )}>
              {CAT_SIZE_LABELS[catSize]}
            </span>
          </div>
        </div>
      )}

      {/* Confirmation que les infos sont complètes */}
      <AnimatePresence mode="wait">
        {isComplete && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-purple-50 border border-purple-200 rounded-xl"
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-purple-600" />
              <div>
                <p className="font-medium text-purple-800">Informations enregistrées</p>
                <p className="text-sm text-purple-600">
                  Ces données seront utilisées pour la réservation.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fermer les dropdowns */}
      {(showBreedDropdown || showPrimaryBreedDropdown || showSecondaryBreedDropdown) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowBreedDropdown(false);
            setShowPrimaryBreedDropdown(false);
            setShowSecondaryBreedDropdown(false);
          }}
        />
      )}
    </div>
  );
}
