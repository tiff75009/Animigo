"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Check } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { CAT_BREEDS, CAT_SIZE_LABELS, type CatBreed, type CatSize } from "@/data/cat-breeds";

interface CatBreedAutocompleteProps {
  value: string;
  onChange: (breed: string, breedData?: CatBreed) => void;
  onSizeDetected?: (size: CatSize | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// Fonction de recherche avec scoring (minimum 2 caractères)
function searchCatBreeds(query: string): CatBreed[] {
  if (!query.trim() || query.trim().length < 2) return [];

  const normalizedQuery = query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const results: { breed: CatBreed; score: number }[] = [];

  for (const breed of CAT_BREEDS) {
    const normalizedName = breed.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const normalizedSlug = breed.slug
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    let score = 0;

    // Correspondance exacte du nom
    if (normalizedName === normalizedQuery) {
      score = 100;
    }
    // Le nom commence par la recherche
    else if (normalizedName.startsWith(normalizedQuery)) {
      score = 80;
    }
    // Le slug commence par la recherche
    else if (normalizedSlug.startsWith(normalizedQuery)) {
      score = 70;
    }
    // Le nom contient la recherche
    else if (normalizedName.includes(normalizedQuery)) {
      score = 60;
    }
    // Le slug contient la recherche
    else if (normalizedSlug.includes(normalizedQuery)) {
      score = 50;
    }

    if (score > 0) {
      results.push({ breed, score });
    }
  }

  // Trier par score décroissant, puis par nom
  return results
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.breed.name.localeCompare(b.breed.name, "fr");
    })
    .slice(0, 10)
    .map((r) => r.breed);
}

export default function CatBreedAutocomplete({
  value,
  onChange,
  onSizeDetected,
  placeholder = "Rechercher une race de chat...",
  className,
  disabled = false,
}: CatBreedAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [selectedBreed, setSelectedBreed] = useState<CatBreed | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Si une valeur initiale existe, chercher la race correspondante
  useEffect(() => {
    if (value) {
      const found = CAT_BREEDS.find(
        (b) => b.name.toLowerCase() === value.toLowerCase() ||
               b.slug === value.toLowerCase()
      );
      if (found) {
        setSelectedBreed(found);
      }
    }
  }, []);

  // Synchroniser inputValue avec value externe
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Résultats de recherche
  const searchResults = useMemo(() => {
    if (!inputValue.trim()) return [];
    return searchCatBreeds(inputValue);
  }, [inputValue]);

  // Fermer le dropdown quand on clique ailleurs
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Gestion du clavier
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && searchResults[highlightedIndex]) {
          selectBreed(searchResults[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  // Sélectionner une race
  const selectBreed = (breed: CatBreed) => {
    setSelectedBreed(breed);
    setInputValue(breed.name);
    onChange(breed.name, breed);
    onSizeDetected?.(breed.size);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  // Effacer la sélection
  const clearSelection = () => {
    setSelectedBreed(null);
    setInputValue("");
    onChange("");
    onSizeDetected?.(null);
    inputRef.current?.focus();
  };

  // Gérer le changement de l'input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSelectedBreed(null);
    setHighlightedIndex(-1);
    setIsOpen(true);

    // Appeler onChange avec la valeur brute (pas de race sélectionnée)
    onChange(newValue);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Input */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200",
            "focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none",
            "transition-all text-gray-900",
            disabled && "opacity-50 cursor-not-allowed bg-gray-50"
          )}
        />
        {inputValue && !disabled && (
          <button
            type="button"
            onClick={clearSelection}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Badge de la race sélectionnée */}
      {selectedBreed && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 flex flex-wrap items-center gap-2"
        >
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
            <Check className="w-3 h-3" />
            {selectedBreed.name}
          </span>
          <span className={cn(
            "px-2 py-1 rounded-full text-xs",
            selectedBreed.size === "small" && "bg-green-100 text-green-700",
            selectedBreed.size === "medium" && "bg-blue-100 text-blue-700",
            selectedBreed.size === "large" && "bg-purple-100 text-purple-700"
          )}>
            {CAT_SIZE_LABELS[selectedBreed.size]}
          </span>
          {selectedBreed.weightRange && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
              {selectedBreed.weightRange.min}-{selectedBreed.weightRange.max} kg
            </span>
          )}
        </motion.div>
      )}

      {/* Dropdown des résultats */}
      <AnimatePresence>
        {isOpen && searchResults.length > 0 && (
          <motion.div
            ref={listRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden max-h-[300px] overflow-y-auto"
          >
            {searchResults.map((breed, index) => (
              <button
                key={breed.slug}
                type="button"
                onClick={() => selectBreed(breed)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={cn(
                  "w-full px-4 py-3 text-left flex items-center justify-between",
                  "hover:bg-gray-50 transition-colors",
                  highlightedIndex === index && "bg-purple-50",
                  index > 0 && "border-t border-gray-100"
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {breed.name}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-xs",
                    breed.size === "small" && "bg-green-100 text-green-700",
                    breed.size === "medium" && "bg-blue-100 text-blue-700",
                    breed.size === "large" && "bg-purple-100 text-purple-700"
                  )}>
                    {CAT_SIZE_LABELS[breed.size]}
                  </span>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message si pas de résultats avec option saisie manuelle */}
      <AnimatePresence>
        {isOpen && inputValue.trim().length >= 2 && searchResults.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
          >
            <div className="p-4 text-center border-b border-gray-100">
              <p className="text-gray-500 text-sm">
                Aucune race trouvée pour &quot;{inputValue}&quot;
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                // Valider la saisie manuelle
                onChange(inputValue.trim());
                setIsOpen(false);
              }}
              className="w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-gray-900">
                  Utiliser &quot;{inputValue.trim()}&quot;
                </p>
                <p className="text-xs text-gray-500">
                  Saisie manuelle de la race
                </p>
              </div>
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                Personnalisé
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
