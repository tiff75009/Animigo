"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Check, ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/app/lib/utils";

// Types pour les races
export interface BreedData {
  slug: string;
  name: string;
  otherNames: string[];
  size: "small" | "medium" | "large" | null;
  weight: number | null;
  hypoallergenic: boolean;
}

interface BreedAutocompleteProps {
  value: string;
  onChange: (breed: string, breedData?: BreedData) => void;
  onSizeDetected?: (size: "small" | "medium" | "large" | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// Charger les données des races (côté client uniquement)
let cachedBreeds: BreedData[] | null = null;

async function loadBreeds(): Promise<BreedData[]> {
  if (cachedBreeds) return cachedBreeds;

  try {
    const response = await fetch("/data/dog-breeds-autocomplete.json");
    if (!response.ok) throw new Error("Failed to load breeds");
    cachedBreeds = await response.json();
    return cachedBreeds || [];
  } catch (error) {
    console.error("Error loading breeds:", error);
    return [];
  }
}

// Fonction de recherche avec scoring (minimum 3 caractères)
function searchBreeds(breeds: BreedData[], query: string): BreedData[] {
  if (!query.trim() || query.trim().length < 3) return [];

  const normalizedQuery = query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const results: { breed: BreedData; score: number }[] = [];

  for (const breed of breeds) {
    const normalizedName = breed.name
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
    // Le nom contient la recherche
    else if (normalizedName.includes(normalizedQuery)) {
      score = 60;
    }
    // Recherche dans les autres noms
    else {
      for (const otherName of breed.otherNames) {
        const normalizedOther = otherName
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        if (normalizedOther === normalizedQuery) {
          score = Math.max(score, 90);
        } else if (normalizedOther.startsWith(normalizedQuery)) {
          score = Math.max(score, 70);
        } else if (normalizedOther.includes(normalizedQuery)) {
          score = Math.max(score, 50);
        }
      }
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

// Traduire la taille
function translateSize(size: "small" | "medium" | "large" | null): string {
  switch (size) {
    case "small":
      return "Petit";
    case "medium":
      return "Moyen";
    case "large":
      return "Grand";
    default:
      return "";
  }
}

export default function BreedAutocomplete({
  value,
  onChange,
  onSizeDetected,
  placeholder = "Rechercher une race...",
  className,
  disabled = false,
}: BreedAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [breeds, setBreeds] = useState<BreedData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBreed, setSelectedBreed] = useState<BreedData | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Charger les races au montage
  useEffect(() => {
    loadBreeds().then((data) => {
      setBreeds(data);
      setIsLoading(false);

      // Si une valeur initiale existe, chercher la race correspondante
      if (value) {
        const found = data.find(
          (b) => b.name.toLowerCase() === value.toLowerCase() ||
                 b.otherNames.some((n) => n.toLowerCase() === value.toLowerCase())
        );
        if (found) {
          setSelectedBreed(found);
        }
      }
    });
  }, []);

  // Synchroniser inputValue avec value externe
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Résultats de recherche
  const searchResults = useMemo(() => {
    if (!inputValue.trim() || isLoading) return [];
    return searchBreeds(breeds, inputValue);
  }, [inputValue, breeds, isLoading]);

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
  const selectBreed = (breed: BreedData) => {
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
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
            <Check className="w-3 h-3" />
            {selectedBreed.name}
          </span>
          {selectedBreed.size && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
              {translateSize(selectedBreed.size)}
            </span>
          )}
          {selectedBreed.hypoallergenic && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
              <Sparkles className="w-3 h-3" />
              Hypoallergénique
            </span>
          )}
          {selectedBreed.weight && (
            <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs">
              ~{selectedBreed.weight} kg
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
                  highlightedIndex === index && "bg-primary/5",
                  index > 0 && "border-t border-gray-100"
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {breed.name}
                  </p>
                  {breed.otherNames.length > 0 && (
                    <p className="text-xs text-gray-500 truncate">
                      {breed.otherNames.slice(0, 2).join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-3">
                  {breed.size && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                      {translateSize(breed.size)}
                    </span>
                  )}
                  {breed.hypoallergenic && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                      Hypo
                    </span>
                  )}
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message si pas de résultats */}
      <AnimatePresence>
        {isOpen && inputValue.trim().length >= 3 && searchResults.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-1 p-4 bg-white rounded-xl shadow-lg border border-gray-200 text-center"
          >
            <p className="text-gray-500 text-sm">
              Aucune race trouvée pour &quot;{inputValue}&quot;
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Vous pouvez quand même utiliser ce nom
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading state */}
      {isLoading && isOpen && (
        <div className="absolute z-50 w-full mt-1 p-4 bg-white rounded-xl shadow-lg border border-gray-200 text-center">
          <p className="text-gray-500 text-sm">Chargement des races...</p>
        </div>
      )}
    </div>
  );
}
