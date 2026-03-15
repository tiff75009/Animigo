"use client";

import { LocateFixed, Loader2, MapPin } from "lucide-react";
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

// Index du rayon dans radiusOptions
function radiusToIndex(r: number): number {
  const idx = radiusOptions.indexOf(r);
  return idx >= 0 ? idx : 0;
}

export function LocationBar({
  location,
  onLocationChange,
  radius,
  onRadiusChange,
  onGeolocate,
  isGeoLoading,
  isReverseGeocoding,
  variant = "hero",
}: LocationBarProps) {
  const sliderIndex = radiusToIndex(radius);

  // Bouton géoloc intégré dans le champ
  const geoButton = (
    <button
      type="button"
      onClick={onGeolocate}
      disabled={isGeoLoading || isReverseGeocoding}
      className={cn(
        "flex items-center justify-center w-8 h-8 rounded-lg transition-all flex-shrink-0",
        location.coordinates
          ? "bg-primary text-white"
          : "text-gray-400 hover:text-primary hover:bg-primary/5",
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
  );

  return (
    <div className="space-y-2">
      {/* Champ de recherche avec bouton géoloc intégré */}
      <div className="relative z-40">
        <LocationSearchBar
          value={location}
          onChange={onLocationChange}
          placeholder="Rechercher une ville..."
          showGeolocationButton={false}
          rightSlot={geoButton}
        />
      </div>

      {/* Slider rayon de recherche */}
      <div className={cn(
        "flex items-center gap-3",
        variant === "hero" ? "px-1" : "px-0"
      )}>
        <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
        <input
          type="range"
          min={0}
          max={radiusOptions.length - 1}
          step={1}
          value={sliderIndex}
          onChange={(e) => onRadiusChange(radiusOptions[parseInt(e.target.value)])}
          className="flex-1 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-primary
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
            [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white"
        />
        <span className="text-xs font-semibold text-gray-600 min-w-[3rem] text-right">
          {radius} km
        </span>
      </div>
    </div>
  );
}
