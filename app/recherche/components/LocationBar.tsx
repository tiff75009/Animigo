"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MapPin, ChevronDown, LocateFixed, Loader2 } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { LocationSearchBar } from "@/app/components/search";
import { radiusOptions } from "@/app/components/platform";

interface LocationBarProps {
  location: { text: string; coordinates?: { lat: number; lng: number } };
  onLocationChange: (loc: { text: string; coordinates?: { lat: number; lng: number } }) => void;
  radius: number;
  onRadiusChange: (r: number) => void;
  onGeolocate: () => void;
  isGeoLoading: boolean;
  isReverseGeocoding: boolean;
  openDropdown: string | null;
  dropdownId: string;
  onToggleDropdown: (id: string | null) => void;
  /** Variante visuelle : "hero" pour la barre principale, "sticky" pour la barre compacte */
  variant?: "hero" | "sticky";
}

export function LocationBar({
  location,
  onLocationChange,
  radius,
  onRadiusChange,
  onGeolocate,
  isGeoLoading,
  isReverseGeocoding,
  openDropdown,
  dropdownId,
  onToggleDropdown,
  variant = "hero",
}: LocationBarProps) {
  const isOpen = openDropdown === dropdownId;

  return (
    <div className="flex items-center gap-2">
      {/* Barre de recherche de localisation */}
      <div className="flex-1 relative z-40">
        <LocationSearchBar
          value={location}
          onChange={onLocationChange}
          placeholder="Rechercher une ville..."
          showGeolocationButton={false}
        />
      </div>

      {/* Bouton géolocalisation */}
      {variant === "hero" ? (
        <motion.button
          type="button"
          onClick={onGeolocate}
          disabled={isGeoLoading || isReverseGeocoding}
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-all flex-shrink-0",
            location.coordinates
              ? "border-primary bg-primary text-white"
              : "border-foreground/10 bg-white text-foreground hover:border-primary hover:text-primary",
            (isGeoLoading || isReverseGeocoding) && "opacity-50 cursor-not-allowed"
          )}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          title="Me localiser"
        >
          {isGeoLoading || isReverseGeocoding ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <LocateFixed className="w-4 h-4" />
          )}
        </motion.button>
      ) : (
        <button
          type="button"
          onClick={onGeolocate}
          disabled={isGeoLoading || isReverseGeocoding}
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-all flex-shrink-0",
            location.coordinates
              ? "border-primary bg-primary text-white"
              : "border-foreground/10 bg-white text-foreground hover:border-primary hover:text-primary",
            (isGeoLoading || isReverseGeocoding) && "opacity-50 cursor-not-allowed"
          )}
          title="Me localiser"
        >
          {isGeoLoading || isReverseGeocoding ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <LocateFixed className="w-4 h-4" />
          )}
        </button>
      )}

      {/* Dropdown rayon de recherche */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => onToggleDropdown(isOpen ? null : dropdownId)}
          className={cn(
            "flex items-center rounded-xl text-sm font-medium text-gray-700 transition-all whitespace-nowrap",
            variant === "hero"
              ? "gap-1.5 px-3 py-2.5 bg-gray-50 border border-gray-200 hover:border-primary"
              : "gap-1 px-2.5 py-2 bg-white border-2 border-foreground/10 hover:border-primary"
          )}
        >
          <MapPin className="w-3.5 h-3.5 text-primary" />
          <span>{radius} km</span>
          <ChevronDown className={cn("w-3 h-3 text-gray-400 transition-transform", isOpen && "rotate-180")} />
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full right-0 mt-2 py-2 bg-white rounded-xl shadow-xl border border-gray-200 z-[100] min-w-[140px]"
            >
              {radiusOptions.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    onRadiusChange(r);
                    onToggleDropdown(null);
                  }}
                  className={cn(
                    "w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors",
                    radius === r && "bg-primary/5 text-primary font-medium"
                  )}
                >
                  {r} km
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
