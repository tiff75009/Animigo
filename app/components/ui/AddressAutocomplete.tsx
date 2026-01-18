"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Loader2, X, AlertCircle } from "lucide-react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/app/lib/utils";

interface AddressData {
  address: string;
  city: string | null;
  postalCode: string | null;
  department: string | null;
  region: string | null;
  coordinates: { lat: number; lng: number };
  placeId: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (data: AddressData | null) => void;
  onInputChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  error?: string;
  label?: string;
  helperText?: string;
  disabled?: boolean;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onInputChange,
  placeholder = "Entrez une adresse...",
  className,
  error,
  label,
  helperText,
  disabled,
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [predictions, setPredictions] = useState<
    Array<{
      placeId: string;
      description: string;
      mainText: string;
      secondaryText: string;
    }>
  >([]);
  const [apiError, setApiError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTokenRef = useRef<string>(generateSessionToken());

  const searchAddress = useAction(api.api.googleMaps.searchAddress);
  const getPlaceDetails = useAction(api.api.googleMaps.getPlaceDetails);

  // Génère un token de session unique pour grouper les requêtes
  function generateSessionToken(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Fermer le dropdown quand on clique ailleurs
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Mettre à jour inputValue quand value change de l'extérieur
  useEffect(() => {
    if (value !== inputValue && !isFocused) {
      setInputValue(value);
    }
  }, [value]);

  // Recherche avec debounce
  const handleSearch = useCallback(
    async (query: string) => {
      if (query.length < 3) {
        setPredictions([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      setApiError(null);

      try {
        const result = await searchAddress({
          query,
          sessionToken: sessionTokenRef.current,
        });

        if (result.success && result.predictions) {
          setPredictions(result.predictions);
          setIsOpen(result.predictions.length > 0);
        } else {
          setApiError(result.error || "Erreur de recherche");
          setPredictions([]);
        }
      } catch (err) {
        console.error("Erreur autocomplete:", err);
        setApiError("Erreur de connexion");
        setPredictions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [searchAddress]
  );

  // Gestion de la saisie
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onInputChange?.(newValue);

    // Si l'input est vide, effacer les données structurées
    if (newValue.trim() === "") {
      onChange(null);
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    // Debounce la recherche
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      handleSearch(newValue);
    }, 300);
  };

  // Sélection d'une prédiction
  const handleSelectPrediction = async (prediction: {
    placeId: string;
    description: string;
    mainText: string;
    secondaryText: string;
  }) => {
    setIsLoading(true);
    setIsOpen(false);
    setInputValue(prediction.mainText);

    try {
      const result = await getPlaceDetails({
        placeId: prediction.placeId,
        sessionToken: sessionTokenRef.current,
      });

      // Générer un nouveau token de session après la sélection
      sessionTokenRef.current = generateSessionToken();

      if (result.success && result.details) {
        const data: AddressData = {
          address: result.details.address,
          city: result.details.city,
          postalCode: result.details.postalCode,
          department: result.details.department,
          region: result.details.region,
          coordinates: result.details.coordinates,
          placeId: result.details.placeId,
        };
        onChange(data);
        // N'afficher que l'adresse (rue), pas la ville/CP
        setInputValue(result.details.address);
      } else {
        setApiError(result.error || "Impossible de récupérer les détails");
      }
    } catch (err) {
      console.error("Erreur getPlaceDetails:", err);
      setApiError("Erreur de connexion");
    } finally {
      setIsLoading(false);
    }
  };

  // Effacer la sélection
  const handleClear = () => {
    setInputValue("");
    setPredictions([]);
    onChange(null);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {label && (
        <label className="block text-sm font-medium text-foreground mb-1.5">
          {label}
        </label>
      )}

      <motion.div
        animate={{
          borderColor: error
            ? "rgb(239, 68, 68)"
            : isFocused
              ? "var(--primary)"
              : "rgba(0, 0, 0, 0.1)",
          boxShadow: isFocused
            ? error
              ? "0 0 0 3px rgba(239, 68, 68, 0.1)"
              : "0 0 0 3px rgba(255, 107, 107, 0.1)"
            : "none",
        }}
        transition={{ duration: 0.2 }}
        className="relative rounded-xl border-2 bg-white"
      >
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          ) : (
            <MapPin className="w-5 h-5" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            setIsFocused(true);
            if (predictions.length > 0) setIsOpen(true);
          }}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full px-4 py-3 pl-12 pr-10 rounded-xl bg-transparent text-foreground placeholder:text-text-light/60",
            "focus:outline-none transition-all",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        />

        {inputValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-light hover:text-foreground transition-colors rounded-full hover:bg-foreground/5"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </motion.div>

      {helperText && !error && !apiError && (
        <p className="mt-1.5 text-xs text-text-light">{helperText}</p>
      )}

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1.5 text-sm text-red-500 flex items-center gap-1"
        >
          <AlertCircle className="w-4 h-4" />
          {error}
        </motion.p>
      )}

      {apiError && !error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1.5 text-sm text-amber-600 flex items-center gap-1"
        >
          <AlertCircle className="w-4 h-4" />
          {apiError}
        </motion.p>
      )}

      {/* Dropdown des suggestions */}
      <AnimatePresence>
        {isOpen && predictions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-lg border border-foreground/10 overflow-hidden"
          >
            <ul className="py-1 max-h-60 overflow-auto">
              {predictions.map((prediction) => (
                <li key={prediction.placeId}>
                  <button
                    type="button"
                    onClick={() => handleSelectPrediction(prediction)}
                    className="w-full px-4 py-3 text-left hover:bg-primary/5 transition-colors flex items-start gap-3"
                  >
                    <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-foreground">
                        {prediction.mainText}
                      </div>
                      {prediction.secondaryText && (
                        <div className="text-sm text-text-light">
                          {prediction.secondaryText}
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
