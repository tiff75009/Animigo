"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin, LocateFixed, Loader2, X } from "lucide-react";
import { useGeolocation } from "@/app/hooks/useGeolocation";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/app/lib/utils";

interface Coordinates {
  lat: number;
  lng: number;
}

interface LocationData {
  text: string;
  coordinates?: Coordinates;
}

interface LocationSearchBarProps {
  value: LocationData;
  onChange: (location: LocationData) => void;
  onGeolocationRequest?: () => void; // Callback pour passer en mode plan
  placeholder?: string;
  className?: string;
}

export default function LocationSearchBar({
  value,
  onChange,
  onGeolocationRequest,
  placeholder = "Ville, code postal...",
  className,
}: LocationSearchBarProps) {
  const [inputValue, setInputValue] = useState(value.text);
  const [isOpen, setIsOpen] = useState(false);
  const [predictions, setPredictions] = useState<
    Array<{
      placeId: string;
      description: string;
      mainText: string;
      secondaryText: string;
    }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  const { coordinates: geoCoords, isLoading: isGeoLoading, error: geoError, requestLocation } = useGeolocation();
  const searchAddress = useAction(api.api.googleMaps.searchAddress);
  const getPlaceDetails = useAction(api.api.googleMaps.getPlaceDetails);
  const reverseGeocode = useAction(api.api.googleMaps.reverseGeocode);

  // Sync input value with external value
  useEffect(() => {
    if (value.text !== inputValue) {
      setInputValue(value.text);
    }
  }, [value.text]);

  // Handle geolocation result with reverse geocoding
  useEffect(() => {
    if (geoCoords && !geoError && !isReverseGeocoding) {
      setIsReverseGeocoding(true);

      // Reverse geocode to get actual address
      reverseGeocode({ lat: geoCoords.lat, lng: geoCoords.lng })
        .then((result) => {
          const addressText = result.success && result.address
            ? result.address
            : "Ma position actuelle";

          onChange({
            text: addressText,
            coordinates: geoCoords,
          });
          setInputValue(addressText);

          // Notify parent to switch to plan view
          onGeolocationRequest?.();
        })
        .catch(() => {
          onChange({
            text: "Ma position actuelle",
            coordinates: geoCoords,
          });
          setInputValue("Ma position actuelle");
          onGeolocationRequest?.();
        })
        .finally(() => {
          setIsReverseGeocoding(false);
        });
    }
  }, [geoCoords, geoError]);

  // Search addresses with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    if (newValue.length < 2) {
      setPredictions([]);
      setIsOpen(false);
      if (newValue === "") {
        onChange({ text: "" });
      }
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const result = await searchAddress({
          query: newValue,
          sessionToken: `search-${Date.now()}`,
        });

        if (result.success && result.predictions) {
          setPredictions(result.predictions);
          setIsOpen(result.predictions.length > 0);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    setDebounceTimer(timer);
  };

  // Handle prediction selection
  const handleSelect = async (prediction: {
    placeId: string;
    mainText: string;
    secondaryText: string;
  }) => {
    setIsOpen(false);
    setInputValue(prediction.mainText);
    setIsSearching(true);

    try {
      const result = await getPlaceDetails({
        placeId: prediction.placeId,
        sessionToken: `details-${Date.now()}`,
      });

      if (result.success && result.details) {
        onChange({
          text: prediction.mainText,
          coordinates: result.details.coordinates,
        });
      }
    } catch (err) {
      console.error("Details error:", err);
      onChange({ text: prediction.mainText });
    } finally {
      setIsSearching(false);
    }
  };

  // Handle geolocation button click
  const handleGeolocate = async () => {
    await requestLocation();
  };

  // Clear input
  const handleClear = () => {
    setInputValue("");
    setPredictions([]);
    setIsOpen(false);
    onChange({ text: "" });
  };

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center gap-2">
        {/* Input container */}
        <div className="relative flex-1">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light">
            {isSearching ? (
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            ) : (
              <MapPin className="w-5 h-5" />
            )}
          </div>

          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => predictions.length > 0 && setIsOpen(true)}
            placeholder={placeholder}
            className={cn(
              "w-full px-4 py-3 pl-12 pr-10 rounded-xl border-2 bg-white",
              "border-foreground/10 focus:border-primary focus:ring-2 focus:ring-primary/10",
              "text-foreground placeholder:text-text-light/60",
              "focus:outline-none transition-all"
            )}
          />

          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-light hover:text-foreground transition-colors rounded-full hover:bg-foreground/5"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Geolocation button */}
        <motion.button
          type="button"
          onClick={handleGeolocate}
          disabled={isGeoLoading}
          className={cn(
            "flex items-center justify-center w-12 h-12 rounded-xl border-2 transition-all",
            value.coordinates
              ? "border-primary bg-primary text-white"
              : "border-foreground/10 bg-white text-foreground hover:border-primary hover:text-primary",
            isGeoLoading && "opacity-50 cursor-not-allowed"
          )}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          title="Me localiser"
        >
          {isGeoLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <LocateFixed className="w-5 h-5" />
          )}
        </motion.button>
      </div>

      {/* Error message */}
      {geoError && (
        <p className="mt-2 text-sm text-red-500">{geoError}</p>
      )}

      {/* Predictions dropdown */}
      {isOpen && predictions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-lg border border-foreground/10 overflow-hidden"
        >
          <ul className="py-1 max-h-60 overflow-auto">
            {predictions.map((prediction) => (
              <li key={prediction.placeId}>
                <button
                  type="button"
                  onClick={() => handleSelect(prediction)}
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
    </div>
  );
}
