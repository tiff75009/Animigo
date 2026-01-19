"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Loader2, X, AlertCircle, Edit3 } from "lucide-react";
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
  onManualChange?: (value: string) => void; // Pour la saisie manuelle
  placeholder?: string;
  className?: string;
  error?: string;
  label?: string;
  helperText?: string;
  disabled?: boolean;
  allowManualEntry?: boolean; // Permet la saisie manuelle
  searchType?: "address" | "regions"; // address = rue exacte, regions = villes/départements
}

export default function AddressAutocomplete({
  value,
  onChange,
  onInputChange,
  onManualChange,
  placeholder = "Entrez une adresse...",
  className,
  error,
  label,
  helperText,
  disabled,
  allowManualEntry = false,
  searchType = "regions",
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
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
          searchType,
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
    [searchAddress, searchType]
  );

  // Gestion de la saisie
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onInputChange?.(newValue);

    // En mode manuel, notifier directement
    if (isManualMode) {
      onManualChange?.(newValue);
      return;
    }

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

  // Basculer en mode manuel
  const switchToManualMode = () => {
    setIsManualMode(true);
    setIsOpen(false);
    setPredictions([]);
    onManualChange?.(inputValue);
  };

  // Revenir au mode autocomplete
  const switchToAutocompleteMode = () => {
    setIsManualMode(false);
    setInputValue("");
    onChange(null);
    onManualChange?.("");
    inputRef.current?.focus();
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
    onManualChange?.("");
    setIsManualMode(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {label && (
        <label className="block text-sm font-medium text-foreground mb-1.5">
          {label}
          {isManualMode && (
            <span className="ml-2 text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              Mode manuel
            </span>
          )}
        </label>
      )}

      <motion.div
        animate={{
          borderColor: error
            ? "rgb(239, 68, 68)"
            : isManualMode
              ? "rgb(217, 119, 6)"
              : isFocused
                ? "var(--primary)"
                : "rgba(0, 0, 0, 0.1)",
          boxShadow: isFocused
            ? error
              ? "0 0 0 3px rgba(239, 68, 68, 0.1)"
              : isManualMode
                ? "0 0 0 3px rgba(217, 119, 6, 0.1)"
                : "0 0 0 3px rgba(255, 107, 107, 0.1)"
            : "none",
        }}
        transition={{ duration: 0.2 }}
        className="relative rounded-xl border-2 bg-white"
      >
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          ) : isManualMode ? (
            <Edit3 className="w-5 h-5 text-amber-600" />
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
            if (predictions.length > 0 && !isManualMode) setIsOpen(true);
          }}
          onBlur={() => setIsFocused(false)}
          placeholder={isManualMode ? "Saisissez votre adresse complète..." : placeholder}
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

      {/* Bouton pour revenir au mode autocomplete */}
      {isManualMode && allowManualEntry && (
        <button
          type="button"
          onClick={switchToAutocompleteMode}
          className="mt-2 text-sm text-primary hover:underline flex items-center gap-1"
        >
          <MapPin className="w-4 h-4" />
          Rechercher une adresse
        </button>
      )}

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
        {isOpen && predictions.length > 0 && !isManualMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-[100] w-full mt-2 bg-white rounded-xl shadow-xl border border-foreground/10 overflow-hidden"
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

              {/* Option saisie manuelle */}
              {allowManualEntry && (
                <li className="border-t border-foreground/10">
                  <button
                    type="button"
                    onClick={switchToManualMode}
                    className="w-full px-4 py-3 text-left hover:bg-amber-50 transition-colors flex items-start gap-3"
                  >
                    <Edit3 className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-amber-700">
                        Adresse non trouvée ?
                      </div>
                      <div className="text-sm text-amber-600">
                        Saisir manuellement
                      </div>
                    </div>
                  </button>
                </li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Option saisie manuelle si aucune prédiction */}
      {allowManualEntry && !isManualMode && inputValue.length >= 3 && predictions.length === 0 && !isLoading && !isOpen && (
        <button
          type="button"
          onClick={switchToManualMode}
          className="mt-2 text-sm text-amber-600 hover:text-amber-700 flex items-center gap-1"
        >
          <Edit3 className="w-4 h-4" />
          Adresse non trouvée ? Saisir manuellement
        </button>
      )}
    </div>
  );
}
