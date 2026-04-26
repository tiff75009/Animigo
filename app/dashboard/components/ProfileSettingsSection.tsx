"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Navigation,
  PawPrint,
  Trees,
  Car,
  Check,
  Users,
  Dog,
  Cat,
  Bird,
  Rabbit,
  Fish,
  Star,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/app/lib/utils";

// Types d'animaux
const ANIMAL_TYPES: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "chien", label: "Chien", icon: Dog },
  { id: "chat", label: "Chat", icon: Cat },
  { id: "oiseau", label: "Oiseau", icon: Bird },
  { id: "rongeur", label: "Rongeur", icon: Rabbit },
  { id: "poisson", label: "Poisson", icon: Fish },
  { id: "reptile", label: "Reptile", icon: Star },
  { id: "nac", label: "NAC", icon: Star },
];

// Valeur spéciale pour "Toute la France"
const FRANCE_ENTIRE_VALUE = 999;

interface ProfileSettingsSectionProps {
  // Rayon
  radius?: number;
  onRadiusChange?: (radius: number) => void;
  // Animaux acceptés
  acceptedAnimals: string[];
  onAcceptedAnimalsChange?: (animals: string[]) => void;
  // Équipements
  hasGarden?: boolean;
  hasVehicle?: boolean;
  onHasGardenChange?: (value: boolean) => void;
  onHasVehicleChange?: (value: boolean) => void;
  // Capacité
  maxAnimalsPerSlot?: number;
  onMaxAnimalsPerSlotChange?: (value: number) => void;
  // Mode édition
  isEditable?: boolean;
  isSaving?: boolean;
  // Afficher uniquement le rayon
  showOnlyRadius?: boolean;
}

// Composant slider pour le rayon
function RadiusSlider({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const min = 1;
  const max = 100;

  const isFranceEntire = value >= FRANCE_ENTIRE_VALUE;
  const displayValue = isFranceEntire ? max + 1 : Math.min(value, max);
  const sliderMax = max + 1;
  const percentage = ((displayValue - min) / (sliderMax - min)) * 100;

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
    if (disabled) return;
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
          Rayon d&apos;intervention
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

      <div className="relative pt-1 pb-2">
        <div className="h-3 bg-foreground/10 rounded-full overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full bg-gradient-to-r", distanceInfo.color)}
            style={{ width: `${percentage}%` }}
            animate={{ width: `${percentage}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>

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
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />

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

      <motion.div
        key={distanceInfo.label}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center gap-2 text-sm text-text-light"
      >
        <span>{distanceInfo.emoji}</span>
        <span>{distanceInfo.label}</span>
      </motion.div>

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

// Composant toggle équipement
function EquipmentToggle({
  icon: Icon,
  label,
  checked,
  onChange,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all",
        checked
          ? "border-secondary bg-secondary/5 text-secondary"
          : "border-foreground/10 bg-white text-foreground hover:border-foreground/20",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      whileHover={!disabled ? { scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
    >
      <div className={cn(
        "p-2 rounded-lg",
        checked ? "bg-secondary/10" : "bg-foreground/5"
      )}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="font-medium">{label}</span>
      {checked && (
        <Check className="w-5 h-5 ml-auto" />
      )}
    </motion.button>
  );
}

// ──────────────────────────────────────────────────────────────────
// ZoneInterventionWidget : widget compact (style Google/iCloud)
// ──────────────────────────────────────────────────────────────────

function ZoneInterventionWidget({
  radius,
  onRadiusChange,
  disabled,
}: {
  radius: number;
  onRadiusChange: (v: number) => void;
  disabled?: boolean;
}) {
  const [inputText, setInputText] = useState(String(radius));
  const inputElRef = useRef<HTMLInputElement>(null);
  const isFranceEntire = radius >= FRANCE_ENTIRE_VALUE;
  const sliderValue = isFranceEntire ? 100 : Math.min(radius, 100);
  const percent = (sliderValue / 100) * 100;

  // Sync l'input avec `radius` chaque fois qu'il change (slider, France entière, prop externe).
  // On ignore uniquement quand l'utilisateur est EN TRAIN de taper dans l'input
  // (sinon on écraserait sa frappe).
  useEffect(() => {
    if (isFranceEntire) return;
    const isUserTyping = document.activeElement === inputElRef.current;
    if (isUserTyping) return;
    setInputText(String(radius));
  }, [radius, isFranceEntire]);

  // Label contextuel (sobre, sans emoji)
  const getZoneLabel = (km: number): string => {
    if (km >= FRANCE_ENTIRE_VALUE) return "Toute la France";
    if (km <= 5) return "Proximité immédiate";
    if (km <= 15) return "Quartier";
    if (km <= 30) return "Ville";
    if (km <= 50) return "Agglomération";
    return "Région";
  };

  const commitInput = (raw: string) => {
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) {
      setInputText(String(radius));
      return;
    }
    const clamped = Math.max(1, Math.min(100, n));
    onRadiusChange(clamped);
    setInputText(String(clamped));
  };

  return (
    <motion.div
      id="section-radius"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, duration: 0.3 }}
      className="bg-white p-5"
      style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
    >
      {/* Header pattern unifié */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "#f5f9f6", border: "1px solid #cfdbd3" }}
          >
            <Navigation className="w-4 h-4" style={{ color: "#1f3a33" }} />
          </div>
          <div className="min-w-0">
            <div
              className="text-[10px] font-medium uppercase tracking-[0.1em]"
              style={{ color: "#9c9484" }}
            >
              Section · Mobilité
            </div>
            <h3
              className="text-[15px] font-semibold tracking-[-0.01em] m-0"
              style={{ color: "#1f1f1d" }}
            >
              Zone d&apos;intervention
            </h3>
          </div>
        </div>
        {/* Badge contextuel */}
        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
          style={{
            background: isFranceEntire ? "#fcfaf4" : "#f5f9f6",
            color: isFranceEntire ? "#a16207" : "#1f3a33",
            border: `1px solid ${isFranceEntire ? "#fde68a" : "#cfdbd3"}`,
          }}
        >
          {getZoneLabel(radius)}
        </span>
      </div>

      {/* Slider + input éditable */}
      <div className="space-y-3">
        <style>{`
          .zone-radius-slider {
            -webkit-appearance: none;
            appearance: none;
          }
          .zone-radius-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #fff;
            border: 2px solid #1f3a33;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(31, 58, 51, 0.25);
            transition: transform 0.12s ease;
          }
          .zone-radius-slider::-webkit-slider-thumb:hover { transform: scale(1.12); }
          .zone-radius-slider::-moz-range-thumb {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #fff;
            border: 2px solid #1f3a33;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(31, 58, 51, 0.25);
            transition: transform 0.12s ease;
          }
          .zone-radius-slider::-moz-range-thumb:hover { transform: scale(1.12); }
        `}</style>

        <div className="flex items-start gap-3">
          {/* Colonne slider + ses repères (même largeur) */}
          <div className="flex-1 space-y-1.5">
            <input
              type="range"
              min={1}
              max={100}
              step={1}
              value={sliderValue}
              disabled={disabled || isFranceEntire}
              onChange={(e) => onRadiusChange(parseInt(e.target.value, 10))}
              className="zone-radius-slider w-full h-1.5 rounded-full cursor-pointer focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isFranceEntire
                  ? "#ece9e1"
                  : `linear-gradient(to right, #1f3a33 0%, #1f3a33 ${percent}%, #ece9e1 ${percent}%, #ece9e1 100%)`,
              }}
              aria-label={`Rayon d'intervention : ${radius} kilomètres`}
            />
            {/* Repères : positionnés sur la même base que le thumb (rayon 9px de chaque côté) */}
            <div
              className="relative h-3.5"
              style={{ marginLeft: 9, marginRight: 9 }}
            >
              {[1, 25, 50, 75, 100].map((v) => {
                const left = ((v - 1) / 99) * 100;
                return (
                  <span
                    key={v}
                    className="absolute top-0 -translate-x-1/2 text-[10px] tabular-nums whitespace-nowrap"
                    style={{ left: `${left}%`, color: "#9c9484" }}
                  >
                    {v === 100 ? "100 km" : v}
                  </span>
                );
              })}
            </div>
          </div>
          {/* Badge éditable à droite, dans une colonne séparée */}
          <label
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full transition-all flex-shrink-0"
            style={{
              background: "#fff",
              border: "1px solid #ece9e1",
              opacity: isFranceEntire ? 0.5 : 1,
            }}
          >
            <input
              ref={inputElRef}
              type="number"
              min={1}
              max={100}
              step={1}
              value={isFranceEntire ? "" : inputText}
              disabled={disabled || isFranceEntire}
              placeholder="—"
              onChange={(e) => setInputText(e.target.value)}
              onBlur={(e) => commitInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              className="w-10 bg-transparent text-[12.5px] font-semibold tabular-nums text-right focus:outline-none disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              style={{ color: "#1f1f1d" }}
              aria-label="Rayon en kilomètres"
            />
            <span className="text-[12px] font-semibold select-none" style={{ color: "#1f1f1d" }}>
              km
            </span>
          </label>
        </div>

        {/* Toggle France entière */}
        <button
          type="button"
          onClick={() => onRadiusChange(isFranceEntire ? 20 : FRANCE_ENTIRE_VALUE)}
          disabled={disabled}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: isFranceEntire ? "#fcfaf4" : "#fff",
            border: `1px solid ${isFranceEntire ? "#fde68a" : "#ece9e1"}`,
            borderRadius: 10,
          }}
        >
          <span className="flex items-center gap-2">
            <span className="text-[14px] leading-none">🇫🇷</span>
            <span className="text-[12.5px] font-medium" style={{ color: "#1f1f1d" }}>
              Intervention sur toute la France
            </span>
          </span>
          <div
            className="w-9 h-5 rounded-full transition-colors flex items-center px-0.5"
            style={{ background: isFranceEntire ? "#1f3a33" : "#ece9e1" }}
          >
            <div
              className="w-4 h-4 rounded-full bg-white shadow transition-transform"
              style={{ transform: isFranceEntire ? "translateX(16px)" : "translateX(0)" }}
            />
          </div>
        </button>
      </div>
    </motion.div>
  );
}

export default function ProfileSettingsSection({
  radius = 20,
  onRadiusChange,
  acceptedAnimals = [],
  onAcceptedAnimalsChange,
  hasGarden = false,
  hasVehicle = false,
  onHasGardenChange,
  onHasVehicleChange,
  maxAnimalsPerSlot,
  onMaxAnimalsPerSlotChange,
  isEditable = false,
  isSaving = false,
  showOnlyRadius = false,
}: ProfileSettingsSectionProps) {
  const handleAnimalToggle = (animalId: string) => {
    if (!onAcceptedAnimalsChange || !isEditable) return;

    if (acceptedAnimals.includes(animalId)) {
      onAcceptedAnimalsChange(acceptedAnimals.filter((id) => id !== animalId));
    } else {
      onAcceptedAnimalsChange([...acceptedAnimals, animalId]);
    }
  };

  // Si on affiche uniquement le rayon → widget compact unifié
  if (showOnlyRadius) {
    return (
      <ZoneInterventionWidget
        radius={radius}
        onRadiusChange={(v) => onRadiusChange?.(v)}
        disabled={!isEditable || isSaving}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Rayon d'intervention */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Navigation className="w-5 h-5 text-secondary" />
          Zone d&apos;intervention
        </h3>
        <div className="p-4 bg-foreground/[0.02] rounded-xl border border-foreground/10">
          <RadiusSlider
            value={radius}
            onChange={(v) => onRadiusChange?.(v)}
            disabled={!isEditable || isSaving}
          />
        </div>
      </motion.div>

      {/* Animaux acceptés */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <PawPrint className="w-5 h-5 text-primary" />
          Animaux acceptés
        </h3>

        {/* Types d'animaux */}
        <div className="mb-6">
          <label className="text-sm font-medium text-foreground mb-3 block">
            Types d&apos;animaux
          </label>
          <div className="flex flex-wrap gap-2">
            {ANIMAL_TYPES.map((animal) => {
              const isSelected = acceptedAnimals.includes(animal.id);
              const Icon = animal.icon;

              return (
                <motion.button
                  key={animal.id}
                  type="button"
                  onClick={() => handleAnimalToggle(animal.id)}
                  disabled={!isEditable || isSaving}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all",
                    isSelected
                      ? "border-primary bg-primary text-white"
                      : "border-foreground/10 bg-white text-foreground hover:border-foreground/20",
                    (!isEditable || isSaving) && "opacity-50 cursor-not-allowed"
                  )}
                  whileHover={isEditable && !isSaving ? { scale: 1.02 } : undefined}
                  whileTap={isEditable && !isSaving ? { scale: 0.98 } : undefined}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{animal.label}</span>
                </motion.button>
              );
            })}
          </div>
          {acceptedAnimals.length === 0 && (
            <p className="text-xs text-amber-500 mt-2">
              Sélectionnez au moins un type d&apos;animal
            </p>
          )}
        </div>

        {/* Équipements */}
        <div className="mb-6">
          <label className="text-sm font-medium text-foreground mb-3 block">
            Équipements
          </label>
          <div className="flex flex-wrap gap-3">
            <EquipmentToggle
              icon={Trees}
              label="J'ai un jardin"
              checked={hasGarden}
              onChange={(v) => onHasGardenChange?.(v)}
              disabled={!isEditable || isSaving}
            />
            <EquipmentToggle
              icon={Car}
              label="J'ai un véhicule"
              checked={hasVehicle}
              onChange={(v) => onHasVehicleChange?.(v)}
              disabled={!isEditable || isSaving}
            />
          </div>
        </div>

        {/* Nombre d'animaux max */}
        <div>
          <label className="text-sm font-medium text-foreground mb-3 block flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Nombre d&apos;animaux max par créneau
          </label>
          <p className="text-xs text-foreground/60 mb-3">
            Combien d&apos;animaux pouvez-vous accueillir en même temps ?
          </p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <motion.button
                key={num}
                type="button"
                onClick={() => onMaxAnimalsPerSlotChange?.(num)}
                disabled={!isEditable || isSaving}
                className={cn(
                  "w-12 h-12 rounded-xl border-2 font-semibold text-lg transition-all",
                  maxAnimalsPerSlot === num
                    ? "border-primary bg-primary text-white"
                    : "border-foreground/10 bg-white text-foreground hover:border-foreground/20",
                  (!isEditable || isSaving) && "opacity-50 cursor-not-allowed"
                )}
                whileHover={isEditable && !isSaving ? { scale: 1.05 } : undefined}
                whileTap={isEditable && !isSaving ? { scale: 0.95 } : undefined}
              >
                {num}
              </motion.button>
            ))}
          </div>
          {!maxAnimalsPerSlot && (
            <p className="text-xs text-amber-500 mt-2">
              Sélectionnez une capacité maximale
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
