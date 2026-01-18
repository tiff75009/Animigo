"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Navigation, Clock, Building2, Map } from "lucide-react";
import SectionCard from "../shared/SectionCard";
import FormField from "../shared/FormField";
import AddressAutocomplete from "@/app/components/ui/AddressAutocomplete";
import { cn } from "@/app/lib/utils";

interface LocationData {
  address: string;
  city: string | null;
  postalCode: string | null;
  department: string | null;
  region: string | null;
  coordinates: { lat: number; lng: number };
  placeId: string;
}

interface LocationSectionProps {
  location: string;
  radius: number;
  availability: string;
  // Données structurées optionnelles
  city?: string;
  postalCode?: string;
  department?: string;
  region?: string;
  coordinates?: { lat: number; lng: number };
  onLocationChange: (location: string) => void;
  onLocationDataChange: (data: {
    location: string;
    city?: string;
    postalCode?: string;
    department?: string;
    region?: string;
    coordinates?: { lat: number; lng: number };
    googlePlaceId?: string;
  }) => void;
  onRadiusChange: (radius: number) => void;
  onAvailabilityChange: (availability: string) => void;
}

// Valeur spéciale pour "Toute la France"
const FRANCE_ENTIRE_VALUE = 999;

// Composant slider pour le rayon
function RadiusSlider({
  value,
  onChange,
  min = 1,
  max = 100,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const isFranceEntire = value >= FRANCE_ENTIRE_VALUE;
  const displayValue = isFranceEntire ? max + 1 : Math.min(value, max);
  const sliderMax = max + 1; // +1 pour l'option "France entière"
  const percentage = ((displayValue - min) / (sliderMax - min)) * 100;

  // Déterminer la couleur et le label selon la distance
  const getDistanceInfo = (km: number) => {
    if (km >= FRANCE_ENTIRE_VALUE) return { color: "from-primary to-pink-500", label: "Toute la France", emoji: "🇫🇷" };
    if (km <= 5) return { color: "from-emerald-400 to-emerald-500", label: "Proximité immédiate", emoji: "🏠" };
    if (km <= 15) return { color: "from-teal-400 to-cyan-500", label: "Quartier", emoji: "🏘️" };
    if (km <= 30) return { color: "from-cyan-400 to-blue-500", label: "Ville", emoji: "🌆" };
    if (km <= 50) return { color: "from-blue-400 to-indigo-500", label: "Agglomération", emoji: "🌇" };
    return { color: "from-indigo-400 to-purple-500", label: "Région", emoji: "🗺️" };
  };

  const distanceInfo = getDistanceInfo(value);

  const handleChange = (newValue: number) => {
    if (newValue > max) {
      onChange(FRANCE_ENTIRE_VALUE);
    } else {
      onChange(newValue);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <Navigation className="w-4 h-4 text-secondary" />
          Rayon d'intervention
        </label>
        <motion.div
          animate={{ scale: isDragging ? 1.1 : 1 }}
          className={cn(
            "px-3 py-1 rounded-full text-sm font-semibold text-white",
            "bg-gradient-to-r shadow-lg",
            distanceInfo.color
          )}
        >
          {isFranceEntire ? "🇫🇷 France" : `${value} km`}
        </motion.div>
      </div>

      {/* Slider container */}
      <div className="relative pt-1 pb-2">
        {/* Track background */}
        <div className="h-3 bg-foreground/10 rounded-full overflow-hidden">
          {/* Filled track */}
          <motion.div
            className={cn("h-full rounded-full bg-gradient-to-r", distanceInfo.color)}
            style={{ width: `${percentage}%` }}
            animate={{ width: `${percentage}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>

        {/* Native range input (invisible but functional) */}
        <input
          type="range"
          min={min}
          max={sliderMax}
          value={displayValue}
          onChange={(e) => handleChange(parseInt(e.target.value, 10))}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        {/* Custom thumb */}
        <motion.div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full",
            "bg-white shadow-lg border-2",
            isFranceEntire ? "border-primary" : "border-secondary",
            "pointer-events-none flex items-center justify-center"
          )}
          style={{ left: `calc(${percentage}% - 12px)` }}
          animate={{
            scale: isDragging ? 1.2 : 1,
            boxShadow: isDragging
              ? isFranceEntire
                ? "0 4px 20px rgba(255, 107, 107, 0.4)"
                : "0 4px 20px rgba(78, 205, 196, 0.4)"
              : "0 2px 8px rgba(0, 0, 0, 0.15)",
          }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          {isFranceEntire ? (
            <span className="text-xs">🇫🇷</span>
          ) : (
            <div className={cn("w-2 h-2 rounded-full bg-gradient-to-r", distanceInfo.color)} />
          )}
        </motion.div>
      </div>

      {/* Distance label */}
      <motion.div
        key={distanceInfo.label}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center gap-2 text-sm text-text-light"
      >
        <span>{distanceInfo.emoji}</span>
        <span>{distanceInfo.label}</span>
      </motion.div>

      {/* Scale markers */}
      <div className="flex justify-between text-xs text-text-light/60 px-1">
        <span>1 km</span>
        <span>25 km</span>
        <span>50 km</span>
        <span>100 km</span>
        <span className="text-primary font-medium">France</span>
      </div>
    </div>
  );
}

// Composant pour les champs auto-remplis (lecture seule)
function AutoFilledField({
  label,
  value,
  icon: Icon,
  placeholder,
}: {
  label: string;
  value?: string;
  icon: React.ComponentType<{ className?: string }>;
  placeholder: string;
}) {
  const hasValue = value && value.trim() !== "";

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        {label}
      </label>
      <div
        className={cn(
          "relative rounded-xl border-2 bg-foreground/[0.02] transition-colors",
          hasValue ? "border-secondary/30" : "border-foreground/10"
        )}
      >
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light">
          <Icon className={cn("w-5 h-5", hasValue && "text-secondary")} />
        </div>
        <input
          type="text"
          value={value || ""}
          readOnly
          placeholder={placeholder}
          className={cn(
            "w-full px-4 py-3 pl-12 rounded-xl bg-transparent text-foreground placeholder:text-text-light/40",
            "focus:outline-none cursor-default"
          )}
        />
      </div>
      <p className="mt-1 text-xs text-text-light/60">
        Rempli automatiquement
      </p>
    </div>
  );
}

export default function LocationSection({
  location,
  radius,
  availability,
  city,
  postalCode,
  region,
  onLocationChange,
  onLocationDataChange,
  onRadiusChange,
  onAvailabilityChange,
}: LocationSectionProps) {
  const handleAddressSelect = (data: LocationData | null) => {
    if (data) {
      onLocationDataChange({
        location: data.address,
        city: data.city ?? undefined,
        postalCode: data.postalCode ?? undefined,
        department: data.department ?? undefined,
        region: data.region ?? undefined,
        coordinates: data.coordinates,
        googlePlaceId: data.placeId,
      });
    } else {
      // Effacer les données
      onLocationDataChange({
        location: "",
        city: undefined,
        postalCode: undefined,
        department: undefined,
        region: undefined,
        coordinates: undefined,
        googlePlaceId: undefined,
      });
    }
  };

  // Formater ville avec code postal
  const cityDisplay = city
    ? postalCode
      ? `${city} (${postalCode})`
      : city
    : "";

  return (
    <SectionCard
      title="Zone d'intervention"
      description="Définissez où vous pouvez intervenir"
      icon={MapPin}
      iconColor="secondary"
    >
      <div className="space-y-5">
        {/* Adresse, Ville, Région */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AddressAutocomplete
            value={location}
            onChange={handleAddressSelect}
            onInputChange={onLocationChange}
            placeholder="Ex: 10 rue de la Paix"
            label="Adresse"
            helperText="Commencez à taper pour rechercher"
          />

          <AutoFilledField
            label="Ville"
            value={cityDisplay}
            icon={Building2}
            placeholder="Ville"
          />

          <AutoFilledField
            label="Région"
            value={region}
            icon={Map}
            placeholder="Région"
          />
        </div>

        {/* Rayon d'intervention */}
        <div className="p-4 bg-foreground/[0.02] rounded-xl border border-foreground/10">
          <RadiusSlider
            value={radius}
            onChange={onRadiusChange}
            min={1}
            max={100}
          />
        </div>

        {/* Disponibilités */}
        <FormField
          label="Disponibilités"
          name="availability"
          type="textarea"
          value={availability}
          onChange={(v) => onAvailabilityChange(v as string)}
          placeholder="Ex: Du lundi au vendredi, 8h-19h. Week-ends sur demande."
          rows={2}
          icon={Clock}
          helperText="Indiquez vos créneaux habituels"
        />
      </div>
    </SectionCard>
  );
}
