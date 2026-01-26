"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Plus,
  Trash2,
  GripVertical,
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  AlertTriangle,
  Info,
  Sparkles,
  Settings,
  X,
  Moon,
  Home,
  MapPin,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import ConfirmModal from "./shared/ConfirmModal";
import { useAuth } from "@/app/hooks/useAuth";

type PriceUnit = "hour" | "half_day" | "day" | "week" | "month" | "flat";
type BillingType = "hourly" | "daily" | "flexible";

// Multi-tarification par unité de temps
interface Pricing {
  hourly?: number;
  halfDaily?: number;
  daily?: number;
  weekly?: number;
  monthly?: number;
  nightly?: number;
}

// Variant pour le mode édition (avec ID backend)
interface Variant {
  id: Id<"serviceVariants">;
  name: string;
  description?: string;
  price: number;
  priceUnit: PriceUnit;
  pricing?: Pricing;
  duration?: number;
  includedFeatures?: string[];
  order: number;
  isActive: boolean;
}

type ServiceLocation = "announcer_home" | "client_home" | "both";

// Variant local pour le mode création (sans ID)
export interface LocalVariant {
  localId: string;
  name: string;
  description?: string;
  objectives?: { icon: string; text: string }[];
  numberOfSessions?: number;
  sessionInterval?: number; // Délai en jours entre chaque séance
  sessionType?: "individual" | "collective";
  maxAnimalsPerSession?: number;
  serviceLocation?: ServiceLocation; // Lieu de prestation
  animalTypes?: string[]; // Animaux acceptés pour cette formule
  price: number;
  priceUnit: PriceUnit;
  pricing?: Pricing;
  duration?: number;
  includedFeatures?: string[];
  isFromDefault?: boolean;
}

// Prestation par défaut définie par l'admin
interface DefaultVariant {
  name: string;
  description?: string;
  suggestedDuration?: number;
  includedFeatures?: string[];
}

interface VariantManagerProps {
  // Mode édition (service existant)
  serviceId?: Id<"services">;
  variants?: Variant[];
  token?: string;
  onUpdate?: () => void;

  // Mode création (nouveau service)
  mode?: "edit" | "create";
  localVariants?: LocalVariant[];
  onLocalChange?: (variants: LocalVariant[]) => void;

  // Prestations par défaut et restrictions
  defaultVariants?: DefaultVariant[];
  allowedPriceUnits?: ("hour" | "half_day" | "day" | "week" | "month")[];
  allowCustomVariants?: boolean;

  // Commun
  serviceName: string;
  billingType?: BillingType;
  category: string;

  // Auto-add first variant
  autoAddFirst?: boolean;

  // Garde de nuit
  allowOvernightStay?: boolean;
  isGardeService?: boolean;

  // Animaux sélectionnés pour ce service (pour filtrer dans les formules)
  serviceAnimalTypes?: string[];
}

// Helper pour formater le prix
const formatPrice = (cents: number) => {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
};

// Toutes les unités de prix disponibles
const ALL_PRICE_UNITS: { id: PriceUnit; label: string; shortLabel: string }[] = [
  { id: "hour", label: "par heure", shortLabel: "/h" },
  { id: "half_day", label: "par demi-journée", shortLabel: "/demi-j" },
  { id: "day", label: "par jour", shortLabel: "/jour" },
  { id: "week", label: "par semaine", shortLabel: "/sem" },
  { id: "month", label: "par mois", shortLabel: "/mois" },
  { id: "flat", label: "forfait", shortLabel: "forfait" },
];

// Helper pour obtenir les unités de prix autorisées
const getComputedPriceUnits = (
  allowedPriceUnits?: ("hour" | "half_day" | "day" | "week" | "month")[],
  billingType?: BillingType
): { id: PriceUnit; label: string; shortLabel: string }[] => {
  if (allowedPriceUnits && allowedPriceUnits.length > 0) {
    return ALL_PRICE_UNITS.filter((u) => allowedPriceUnits.includes(u.id as "hour" | "half_day" | "day" | "week" | "month"));
  }
  switch (billingType) {
    case "hourly":
      return ALL_PRICE_UNITS.filter((u) => u.id === "hour" || u.id === "flat");
    case "daily":
      return ALL_PRICE_UNITS.filter((u) => u.id !== "hour" && u.id !== "half_day");
    case "flexible":
    default:
      return ALL_PRICE_UNITS;
  }
};

// Générer un ID local unique
const generateLocalId = () => `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Labels pour les types d'animaux
const animalLabels: Record<string, string> = {
  chien: "Chien",
  chat: "Chat",
  lapin: "Lapin",
  rongeur: "Rongeur",
  oiseau: "Oiseau",
  poisson: "Poisson",
  reptile: "Reptile",
  nac: "NAC",
  autre: "Autre",
};

// Composant pour afficher/éditer le prix d'une formule
function PriceSlider({
  label,
  value,
  onChange,
  recommendedPrice,
  unit,
  isLoading,
}: {
  label: string;
  value: number; // en euros
  onChange: (value: number) => void;
  recommendedPrice: number; // en centimes
  unit: string;
  isLoading?: boolean;
}) {
  // Calcul des limites ±20%
  const basePrice = recommendedPrice / 100; // Convertir en euros
  const minPrice = Math.round(basePrice * 0.8 * 100) / 100;
  const maxPrice = Math.round(basePrice * 1.2 * 100) / 100;

  // S'assurer que la valeur est dans les limites
  const clampedValue = Math.min(Math.max(value || basePrice, minPrice), maxPrice);

  // Calculer le pourcentage pour le slider
  const percentage = ((clampedValue - minPrice) / (maxPrice - minPrice)) * 100;

  // Déterminer si le prix est bas, moyen ou élevé
  const priceLevel = clampedValue <= basePrice * 0.9 ? "low" : clampedValue >= basePrice * 1.1 ? "high" : "medium";

  if (isLoading) {
    return (
      <div className="p-4 bg-gray-50 rounded-xl animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
        <div className="h-8 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <div className="p-4 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl border border-primary/10">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full",
            priceLevel === "low" && "bg-green-100 text-green-700",
            priceLevel === "medium" && "bg-blue-100 text-blue-700",
            priceLevel === "high" && "bg-amber-100 text-amber-700"
          )}>
            {priceLevel === "low" ? "Compétitif" : priceLevel === "high" ? "Premium" : "Standard"}
          </span>
        </div>
      </div>

      {/* Prix actuel - grand affichage */}
      <div className="flex items-center justify-center gap-1 mb-4">
        <span className="text-3xl font-bold text-primary">
          {clampedValue.toFixed(2).replace(".", ",")}
        </span>
        <span className="text-lg text-text-light">€{unit}</span>
      </div>

      {/* Slider */}
      <div className="relative mb-2">
        <input
          type="range"
          min={minPrice}
          max={maxPrice}
          step={0.5}
          value={clampedValue}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-primary
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-moz-range-thumb]:w-5
            [&::-moz-range-thumb]:h-5
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-primary
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:cursor-pointer"
          style={{
            background: `linear-gradient(to right, #FF6B6B ${percentage}%, #e5e7eb ${percentage}%)`,
          }}
        />
      </div>

      {/* Labels min/max */}
      <div className="flex justify-between text-xs text-text-light">
        <span>{minPrice.toFixed(0)} €</span>
        <span className="text-primary font-medium">Conseillé: {basePrice.toFixed(0)} €</span>
        <span>{maxPrice.toFixed(0)} €</span>
      </div>
    </div>
  );
}

// Composant pour une formule en mode création simplifié
function SimpleVariantCard({
  variant,
  index,
  onUpdate,
  onDelete,
  canDelete,
  recommendedPrice,
  allowedPriceUnits,
  isLoadingPrice,
  isGardeService,
  allowOvernightStay,
  serviceAnimalTypes,
}: {
  variant: LocalVariant;
  index: number;
  onUpdate: (updates: Partial<LocalVariant>) => void;
  onDelete: () => void;
  canDelete: boolean;
  recommendedPrice: number;
  allowedPriceUnits: { id: PriceUnit; label: string; shortLabel: string }[];
  isLoadingPrice: boolean;
  isGardeService?: boolean;
  allowOvernightStay?: boolean;
  serviceAnimalTypes: string[];
}) {
  // Déterminer quels prix afficher
  const showHourly = allowedPriceUnits.some(u => u.id === "hour");
  const showHalfDaily = allowedPriceUnits.some(u => u.id === "half_day");
  const showDaily = allowedPriceUnits.some(u => u.id === "day");
  const showWeekly = allowedPriceUnits.some(u => u.id === "week");
  const showMonthly = allowedPriceUnits.some(u => u.id === "month");

  // L'unité principale pour l'affichage (la première autorisée)
  const primaryUnit = allowedPriceUnits[0] || { id: "hour" as PriceUnit, label: "par heure", shortLabel: "/h" };
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [newFeature, setNewFeature] = useState("");
  const [newObjectiveText, setNewObjectiveText] = useState("");
  const [newObjectiveIcon, setNewObjectiveIcon] = useState("🎯");
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Emojis disponibles pour les objectifs
  const objectiveIcons = ["🎯", "✨", "🏆", "💪", "🧠", "❤️", "🐾", "⭐", "🔧", "📈", "🎓", "🤝", "🌟", "👍", "✅"];

  // Ajouter un objectif
  const handleAddObjective = () => {
    if (newObjectiveText.trim()) {
      const currentObjectives = variant.objectives || [];
      onUpdate({ objectives: [...currentObjectives, { icon: newObjectiveIcon, text: newObjectiveText.trim() }] });
      setNewObjectiveText("");
      setNewObjectiveIcon("🎯");
    }
  };

  // Supprimer un objectif
  const handleRemoveObjective = (idx: number) => {
    const currentObjectives = variant.objectives || [];
    onUpdate({ objectives: currentObjectives.filter((_, i) => i !== idx) });
  };

  // Pour les gardes: prix journée recommandé (8x le prix horaire)
  const dailyRecommendedPrice = isGardeService ? recommendedPrice * 8 : recommendedPrice;

  // Récupérer le prix journée actuel
  const getDailyPrice = () => {
    if (!variant.pricing?.daily) return dailyRecommendedPrice / 100;
    return variant.pricing.daily / 100;
  };

  // Récupérer le prix nuit actuel
  const getNightlyPrice = () => {
    if (!variant.pricing?.nightly) return Math.round(dailyRecommendedPrice * 0.5) / 100; // 50% du jour par défaut
    return variant.pricing.nightly / 100;
  };


  // Handler pour le prix journée (garde)
  const handleDailyPriceChange = (newDailyPriceEuros: number) => {
    const dailyInCents = Math.round(newDailyPriceEuros * 100);
    const hourlyInCents = Math.round(dailyInCents / 8); // Prix horaire = journée / 8

    // S'assurer que le prix nuit ne dépasse pas le prix jour
    const currentNightly = variant.pricing?.nightly || 0;
    const newNightly = currentNightly > dailyInCents ? dailyInCents : currentNightly;

    onUpdate({
      pricing: {
        ...variant.pricing,
        daily: dailyInCents,
        hourly: hourlyInCents,
        nightly: newNightly > 0 ? newNightly : undefined,
      },
      price: dailyInCents,
    });
  };

  // Handler pour le prix nuit (garde)
  const handleNightlyPriceChange = (newNightlyPriceEuros: number) => {
    const nightlyInCents = Math.round(newNightlyPriceEuros * 100);
    const dailyInCents = variant.pricing?.daily || dailyRecommendedPrice;

    // Le prix nuit ne peut pas dépasser le prix jour
    const clampedNightly = Math.min(nightlyInCents, dailyInCents);

    onUpdate({
      pricing: {
        ...variant.pricing,
        nightly: clampedNightly,
      },
    });
  };

  // Handler générique pour chaque type de prix
  const handlePriceChangeByUnit = (unit: PriceUnit, newPriceEuros: number) => {
    const priceInCents = Math.round(newPriceEuros * 100);
    const newPricing: Pricing = { ...variant.pricing };

    switch (unit) {
      case "hour": newPricing.hourly = priceInCents; break;
      case "half_day": newPricing.halfDaily = priceInCents; break;
      case "day": newPricing.daily = priceInCents; break;
      case "week": newPricing.weekly = priceInCents; break;
      case "month": newPricing.monthly = priceInCents; break;
    }

    // Le prix principal est celui de la première unité autorisée
    const mainPrice = newPricing[primaryUnit.id === "hour" ? "hourly" :
                                  primaryUnit.id === "half_day" ? "halfDaily" :
                                  primaryUnit.id === "day" ? "daily" :
                                  primaryUnit.id === "week" ? "weekly" :
                                  primaryUnit.id === "month" ? "monthly" : "hourly"] || priceInCents;

    onUpdate({ pricing: newPricing, price: mainPrice });
  };

  // Helpers pour obtenir les prix actuels
  const getHourlyPrice = () => (variant.pricing?.hourly || recommendedPrice) / 100;
  const getHalfDailyPrice = () => (variant.pricing?.halfDaily || recommendedPrice * 4) / 100;
  const getWeeklyPrice = () => (variant.pricing?.weekly || recommendedPrice * 40) / 100;
  const getMonthlyPrice = () => (variant.pricing?.monthly || recommendedPrice * 160) / 100;

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      const currentFeatures = variant.includedFeatures || [];
      onUpdate({ includedFeatures: [...currentFeatures, newFeature.trim()] });
      setNewFeature("");
    }
  };

  const handleRemoveFeature = (idx: number) => {
    const currentFeatures = variant.includedFeatures || [];
    onUpdate({ includedFeatures: currentFeatures.filter((_, i) => i !== idx) });
  };

  // Vérifier si des options avancées sont remplies
  const hasAdvancedOptions = variant.description || variant.duration || (variant.includedFeatures && variant.includedFeatures.length > 0);

  // Prix horaire calculé automatiquement pour les gardes
  const calculatedHourlyPrice = isGardeService && variant.pricing?.daily
    ? Math.round(variant.pricing.daily / 8) / 100
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-2xl border-2 border-primary/20 overflow-hidden shadow-sm"
    >
      {/* Header avec nom auto-généré */}
      <div className="flex items-center justify-between p-4 bg-primary/5 border-b border-primary/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-foreground">{variant.name}</h4>
            <p className="text-xs text-text-light">Formule {index + 1}</p>
          </div>
        </div>
        {canDelete && (
          <button
            onClick={onDelete}
            className="p-2 text-text-light hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Supprimer cette formule"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Prix - Affiche tous les types de prix autorisés */}
      <div className="p-4 space-y-4">
        {/* Prix par heure */}
        {showHourly && (
          <PriceSlider
            label="Prix par heure"
            value={getHourlyPrice()}
            onChange={(value) => handlePriceChangeByUnit("hour", value)}
            recommendedPrice={recommendedPrice}
            unit="/h"
            isLoading={isLoadingPrice}
          />
        )}

        {/* Prix par demi-journée */}
        {showHalfDaily && (
          <PriceSlider
            label="Prix par demi-journée"
            value={getHalfDailyPrice()}
            onChange={(value) => handlePriceChangeByUnit("half_day", value)}
            recommendedPrice={recommendedPrice * 4}
            unit="/demi-j"
            isLoading={isLoadingPrice}
          />
        )}

        {/* Prix par jour */}
        {showDaily && (
          <PriceSlider
            label="Prix par jour"
            value={getDailyPrice()}
            onChange={(value) => handlePriceChangeByUnit("day", value)}
            recommendedPrice={recommendedPrice * 8}
            unit="/jour"
            isLoading={isLoadingPrice}
          />
        )}

        {/* Prix par semaine */}
        {showWeekly && (
          <PriceSlider
            label="Prix par semaine"
            value={getWeeklyPrice()}
            onChange={(value) => handlePriceChangeByUnit("week", value)}
            recommendedPrice={recommendedPrice * 40}
            unit="/sem"
            isLoading={isLoadingPrice}
          />
        )}

        {/* Prix par mois */}
        {showMonthly && (
          <PriceSlider
            label="Prix par mois"
            value={getMonthlyPrice()}
            onChange={(value) => handlePriceChangeByUnit("month", value)}
            recommendedPrice={recommendedPrice * 160}
            unit="/mois"
            isLoading={isLoadingPrice}
          />
        )}

        {/* Prix nuit si garde de nuit activée */}
        {isGardeService && allowOvernightStay && (
          <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
            <div className="flex items-center gap-2 mb-3">
              <Moon className="w-5 h-5 text-indigo-500" />
              <span className="font-medium text-indigo-800">Tarif de nuit</span>
            </div>

            {/* Slider pour le prix nuit */}
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-1">
                <span className="text-2xl font-bold text-indigo-600">
                  {getNightlyPrice().toFixed(2).replace(".", ",")}
                </span>
                <span className="text-lg text-indigo-400">€/nuit</span>
              </div>

              <input
                type="range"
                min={0}
                max={getDailyPrice()}
                step={0.5}
                value={getNightlyPrice()}
                onChange={(e) => handleNightlyPriceChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-indigo-200 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-5
                  [&::-webkit-slider-thumb]:h-5
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-indigo-500
                  [&::-webkit-slider-thumb]:shadow-lg
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-moz-range-thumb]:w-5
                  [&::-moz-range-thumb]:h-5
                  [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-indigo-500
                  [&::-moz-range-thumb]:border-0"
              />

              <div className="flex justify-between text-xs text-indigo-400">
                <span>0 €</span>
                <span>Max: {getDailyPrice().toFixed(0)} € (= prix jour)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bouton options avancées */}
      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={cn(
            "w-full flex items-center justify-between p-3 rounded-xl transition-all text-sm",
            showAdvanced || hasAdvancedOptions
              ? "bg-secondary/10 text-secondary"
              : "bg-gray-50 text-text-light hover:bg-gray-100"
          )}
        >
          <span className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Options avancées
            {hasAdvancedOptions && !showAdvanced && (
              <span className="px-2 py-0.5 bg-secondary/20 text-secondary text-xs rounded-full">
                Configuré
              </span>
            )}
          </span>
          {showAdvanced ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {/* Options avancées dépliables */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-4 space-y-4">
                {/* Nom de la formule */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Nom de la formule
                  </label>
                  <input
                    type="text"
                    value={variant.name}
                    onChange={(e) => onUpdate({ name: e.target.value })}
                    placeholder="Ex: Formule découverte, Pack 5 séances..."
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Description <span className="text-text-light font-normal">(optionnel)</span>
                  </label>
                  <textarea
                    value={variant.description || ""}
                    onChange={(e) => onUpdate({ description: e.target.value || undefined })}
                    placeholder="Décrivez ce qui est inclus dans cette formule..."
                    rows={2}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none"
                  />
                </div>

                {/* Objectifs / Activités proposées */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {isGardeService ? "Activités proposées" : "Objectifs de la prestation"} <span className="text-text-light font-normal">(optionnel)</span>
                  </label>
                  <p className="text-xs text-text-light mb-2">
                    {isGardeService
                      ? "Décrivez les activités incluses dans cette garde (promenades, jeux, soins...)"
                      : "Décrivez les objectifs que vous souhaitez atteindre avec cette formule"}
                  </p>
                  <div className="flex gap-2 mb-2">
                    {/* Sélecteur d'icône */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowIconPicker(!showIconPicker)}
                        className="w-10 h-10 flex items-center justify-center bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-xl"
                      >
                        {newObjectiveIcon}
                      </button>
                      {showIconPicker && (
                        <div className="absolute top-12 left-0 z-10 p-2 bg-white border border-gray-200 rounded-lg shadow-lg">
                          <div className="grid grid-cols-5 gap-1">
                            {objectiveIcons.map((icon) => (
                              <button
                                key={icon}
                                type="button"
                                onClick={() => {
                                  setNewObjectiveIcon(icon);
                                  setShowIconPicker(false);
                                }}
                                className={cn(
                                  "w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-lg",
                                  newObjectiveIcon === icon && "bg-primary/10"
                                )}
                              >
                                {icon}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <input
                      type="text"
                      value={newObjectiveText}
                      onChange={(e) => setNewObjectiveText(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddObjective())}
                      placeholder={isGardeService ? "Ex: Promenades quotidiennes, Jeux..." : "Ex: Améliorer le rappel, Socialisation..."}
                      className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleAddObjective}
                      disabled={!newObjectiveText.trim()}
                      className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {variant.objectives && variant.objectives.length > 0 && (
                    <div className="space-y-2">
                      {variant.objectives.map((objective, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg",
                            isGardeService
                              ? "bg-emerald-50 border border-emerald-200"
                              : "bg-purple-50 border border-purple-200"
                          )}
                        >
                          <span className="text-lg">{objective.icon}</span>
                          <span className={cn(
                            "flex-1 text-sm",
                            isGardeService ? "text-emerald-800" : "text-purple-800"
                          )}>{objective.text}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveObjective(idx)}
                            className={cn(
                              "p-1 hover:text-red-500 rounded",
                              isGardeService ? "text-emerald-400" : "text-purple-400"
                            )}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Durée - masqué pour les services de garde */}
                {!isGardeService && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Durée estimée <span className="text-primary">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={variant.duration || ""}
                        onChange={(e) => onUpdate({ duration: parseInt(e.target.value) || undefined })}
                        min="30"
                        step="30"
                        placeholder="60"
                        required
                        className={cn(
                          "w-24 px-3 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm",
                          !variant.duration ? "border-primary/50 bg-primary/5" : "border-gray-300"
                        )}
                      />
                      <span className="text-sm text-text-light">minutes</span>
                      {!variant.duration && (
                        <span className="text-xs text-primary">Requis</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Nombre de séances - masqué pour les services de garde */}
                {!isGardeService && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Nombre de séances <span className="text-text-light font-normal">(optionnel)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={variant.numberOfSessions || 1}
                        onChange={(e) => onUpdate({ numberOfSessions: parseInt(e.target.value) || 1 })}
                        min="1"
                        max="50"
                        className="w-20 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                      />
                      <span className="text-sm text-text-light">séance(s)</span>
                    </div>
                    {(variant.numberOfSessions || 1) > 1 && (
                      <p className="text-xs text-text-light mt-1">
                        Prix total = prix × durée × {variant.numberOfSessions} séances
                      </p>
                    )}
                  </div>
                )}

                {/* Délai entre séances - visible si plusieurs séances et pas garde */}
                {!isGardeService && (variant.numberOfSessions || 1) > 1 && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Délai entre chaque séance
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={variant.sessionInterval || ""}
                        onChange={(e) => onUpdate({ sessionInterval: e.target.value ? parseInt(e.target.value) : undefined })}
                        className="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                      >
                        <option value="">Pas de délai minimum</option>
                        <option value="1">1 jour minimum</option>
                        <option value="2">2 jours minimum</option>
                        <option value="3">3 jours minimum</option>
                        <option value="7">1 semaine minimum</option>
                        <option value="14">2 semaines minimum</option>
                        <option value="30">1 mois minimum</option>
                      </select>
                    </div>
                    {variant.sessionInterval && (
                      <p className="text-xs text-text-light mt-1">
                        Les {variant.numberOfSessions} séances seront espacées d'au moins {variant.sessionInterval} jour(s)
                      </p>
                    )}
                  </div>
                )}

                {/* Type de séance - masqué pour les services de garde */}
                {!isGardeService && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Type de séance
                      </label>
                      <div className="flex gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`sessionType-${variant.localId}`}
                            value="individual"
                            checked={(variant.sessionType || "individual") === "individual"}
                            onChange={() => onUpdate({ sessionType: "individual", maxAnimalsPerSession: undefined })}
                            className="w-4 h-4 text-primary focus:ring-primary"
                          />
                          <span className="text-sm">Individuelle</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`sessionType-${variant.localId}`}
                            value="collective"
                            checked={variant.sessionType === "collective"}
                            onChange={() => onUpdate({ sessionType: "collective", maxAnimalsPerSession: 5 })}
                            className="w-4 h-4 text-primary focus:ring-primary"
                          />
                          <span className="text-sm">Collective</span>
                        </label>
                      </div>
                    </div>

                    {/* Nombre max d'animaux - visible si séance collective */}
                    {variant.sessionType === "collective" && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            Nombre max d'animaux par séance
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={variant.maxAnimalsPerSession || 5}
                              onChange={(e) => onUpdate({ maxAnimalsPerSession: parseInt(e.target.value) || 5 })}
                              min="2"
                              max="20"
                              className="w-20 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                            />
                            <span className="text-sm text-text-light">animaux max</span>
                          </div>
                        </div>
                        {/* Info créneaux collectifs */}
                        <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-xl border border-orange-200">
                          <Info className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-orange-700">
                            <strong>Créneaux à configurer :</strong> Après avoir créé le service, vous pourrez définir les créneaux disponibles pour cette formule collective depuis la page de gestion du service.
                          </p>
                        </div>
                      </>
                    )}

                    {/* Lieu de prestation */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Lieu de prestation
                      </label>
                      {variant.sessionType === "collective" && (
                        <p className="text-xs text-orange-600 mb-2">Les séances collectives se déroulent obligatoirement à votre domicile.</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => variant.sessionType !== "collective" && onUpdate({ serviceLocation: "announcer_home" })}
                          disabled={variant.sessionType === "collective" && variant.serviceLocation !== "announcer_home"}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-sm",
                            (variant.serviceLocation || "announcer_home") === "announcer_home"
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
                            variant.sessionType === "collective" && (variant.serviceLocation || "announcer_home") !== "announcer_home" && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <Home className="w-4 h-4" />
                          Mon domicile
                        </button>
                        <button
                          type="button"
                          onClick={() => variant.sessionType !== "collective" && onUpdate({ serviceLocation: "client_home" })}
                          disabled={variant.sessionType === "collective"}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-sm",
                            variant.serviceLocation === "client_home"
                              ? "border-secondary bg-secondary/5 text-secondary"
                              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
                            variant.sessionType === "collective" && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <MapPin className="w-4 h-4" />
                          À domicile
                        </button>
                        <button
                          type="button"
                          onClick={() => variant.sessionType !== "collective" && onUpdate({ serviceLocation: "both" })}
                          disabled={variant.sessionType === "collective"}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-sm",
                            variant.serviceLocation === "both"
                              ? "border-purple-500 bg-purple-50 text-purple-600"
                              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
                            variant.sessionType === "collective" && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <Home className="w-3.5 h-3.5" />
                          <MapPin className="w-3.5 h-3.5" />
                          Les deux
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Animaux acceptés pour cette formule */}
                {serviceAnimalTypes.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Animaux acceptés pour cette formule
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {serviceAnimalTypes.map((animal) => {
                        const isSelected = (variant.animalTypes || serviceAnimalTypes).includes(animal);
                        return (
                          <button
                            key={animal}
                            type="button"
                            onClick={() => {
                              const currentAnimals = variant.animalTypes || serviceAnimalTypes;
                              if (isSelected) {
                                onUpdate({ animalTypes: currentAnimals.filter(a => a !== animal) });
                              } else {
                                onUpdate({ animalTypes: [...currentAnimals, animal] });
                              }
                            }}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                              isSelected
                                ? "bg-primary/10 text-primary border-2 border-primary"
                                : "bg-gray-100 text-gray-500 border-2 border-transparent hover:bg-gray-200"
                            )}
                          >
                            {animalLabels[animal] || animal}
                            {isSelected && <Check className="w-3 h-3" />}
                          </button>
                        );
                      })}
                    </div>
                    {(variant.animalTypes || []).length === 0 && (
                      <p className="text-xs text-red-500 mt-1">Sélectionnez au moins un type d'animal</p>
                    )}
                  </div>
                )}

                {/* Caractéristiques incluses */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Caractéristiques incluses <span className="text-text-light font-normal">(optionnel)</span>
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddFeature())}
                      placeholder="Ex: Promenade incluse..."
                      className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleAddFeature}
                      disabled={!newFeature.trim()}
                      className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {variant.includedFeatures && variant.includedFeatures.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {variant.includedFeatures.map((feature, idx) => (
                        <span
                          key={idx}
                          className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-sm rounded-full"
                        >
                          {feature}
                          <button
                            type="button"
                            onClick={() => handleRemoveFeature(idx)}
                            className="hover:text-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function VariantManager({
  serviceId,
  serviceName,
  variants = [],
  billingType,
  category,
  token,
  onUpdate,
  mode = "edit",
  localVariants = [],
  onLocalChange,
  defaultVariants = [],
  allowedPriceUnits,
  allowCustomVariants = true,
  autoAddFirst = false,
  allowOvernightStay = false,
  isGardeService = false,
  serviceAnimalTypes = [],
}: VariantManagerProps) {
  const { token: authToken } = useAuth();
  const [isExpanded, setIsExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);
  const [hasAutoAdded, setHasAutoAdded] = useState(false);

  // Récupérer le prix conseillé
  const sessionToken = token || authToken || "";
  const priceRecommendation = useQuery(
    api.services.pricing.getPriceRecommendation,
    sessionToken && category ? { token: sessionToken, category, priceUnit: "hour" } : "skip"
  );

  const computedPriceUnits = getComputedPriceUnits(allowedPriceUnits, billingType);
  const defaultPriceUnit = computedPriceUnits.length > 0 ? computedPriceUnits[0] : ALL_PRICE_UNITS[0];
  const isCreateMode = mode === "create";

  // Prix conseillé par défaut (en centimes)
  const recommendedPrice = priceRecommendation?.avgPrice || 2000; // 20€ par défaut
  const isLoadingPrice = !priceRecommendation && !!sessionToken && !!category;

  // Auto-ajouter la première prestation en mode création
  useEffect(() => {
    if (isCreateMode && autoAddFirst && localVariants.length === 0 && !hasAutoAdded && priceRecommendation) {
      let pricing: Pricing;
      let mainPrice: number;

      if (isGardeService) {
        // Pour les gardes: prix journée = prix horaire recommandé * 8
        const dailyPrice = recommendedPrice * 8;
        const hourlyPrice = recommendedPrice;
        const nightlyPrice = allowOvernightStay ? Math.round(dailyPrice * 0.5) : undefined;

        pricing = {
          daily: dailyPrice,
          hourly: hourlyPrice,
          nightly: nightlyPrice,
        };
        mainPrice = dailyPrice;
      } else {
        // Pour les autres services
        pricing = {
          [defaultPriceUnit.id === "hour" ? "hourly" :
           defaultPriceUnit.id === "day" ? "daily" :
           defaultPriceUnit.id === "week" ? "weekly" : "monthly"]: recommendedPrice,
        };
        mainPrice = recommendedPrice;
      }

      const firstVariant: LocalVariant = {
        localId: generateLocalId(),
        name: `${serviceName} - Formule 1`,
        description: undefined,
        price: mainPrice,
        priceUnit: isGardeService ? "day" : defaultPriceUnit.id,
        pricing,
        duration: 60, // Durée par défaut: 1 heure
        includedFeatures: undefined,
        isFromDefault: false,
        sessionType: "individual",
        serviceLocation: "announcer_home",
        animalTypes: serviceAnimalTypes,
      };
      onLocalChange?.([firstVariant]);
      setHasAutoAdded(true);
    }
  }, [isCreateMode, autoAddFirst, localVariants.length, hasAutoAdded, priceRecommendation, recommendedPrice, serviceName, defaultPriceUnit.id, onLocalChange, isGardeService, allowOvernightStay, serviceAnimalTypes]);

  // Mutation pour supprimer (utilisée en mode edit)
  const deleteVariantMutation = useMutation(api.services.variants.deleteVariant);

  // Ajouter une nouvelle formule
  const handleAddVariant = () => {
    const nextIndex = localVariants.length + 1;

    let pricing: Pricing;
    let mainPrice: number;

    if (isGardeService) {
      // Pour les gardes: prix journée = prix horaire recommandé * 8
      const dailyPrice = recommendedPrice * 8;
      const hourlyPrice = recommendedPrice;
      const nightlyPrice = allowOvernightStay ? Math.round(dailyPrice * 0.5) : undefined;

      pricing = {
        daily: dailyPrice,
        hourly: hourlyPrice,
        nightly: nightlyPrice,
      };
      mainPrice = dailyPrice;
    } else {
      pricing = {
        [defaultPriceUnit.id === "hour" ? "hourly" :
         defaultPriceUnit.id === "day" ? "daily" :
         defaultPriceUnit.id === "week" ? "weekly" : "monthly"]: recommendedPrice,
      };
      mainPrice = recommendedPrice;
    }

    const newVariant: LocalVariant = {
      localId: generateLocalId(),
      name: `${serviceName} - Formule ${nextIndex}`,
      description: undefined,
      objectives: undefined,
      numberOfSessions: 1,
      sessionInterval: undefined,
      sessionType: "individual",
      maxAnimalsPerSession: undefined,
      serviceLocation: "announcer_home",
      animalTypes: serviceAnimalTypes,
      price: mainPrice,
      priceUnit: isGardeService ? "day" : defaultPriceUnit.id,
      pricing,
      duration: 60, // Durée par défaut: 1 heure
      includedFeatures: undefined,
      isFromDefault: false,
    };
    onLocalChange?.([...localVariants, newVariant]);
  };

  // Mettre à jour une formule
  const handleVariantUpdate = (localId: string, updates: Partial<LocalVariant>) => {
    const updated = localVariants.map((v) =>
      v.localId === localId
        ? {
            ...v,
            ...updates,
            // Mettre à jour le prix principal si pricing est modifié
            price: updates.pricing
              ? (updates.pricing.hourly || updates.pricing.daily || updates.pricing.weekly || updates.pricing.monthly || v.price)
              : v.price,
          }
        : v
    );
    onLocalChange?.(updated);
  };

  // Supprimer une formule
  const openDeleteModal = (itemId: string, itemName: string) => {
    setItemToDelete({ id: itemId, name: itemName });
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setError(null);

    if (isCreateMode) {
      const filtered = localVariants.filter((v) => v.localId !== itemToDelete.id);
      onLocalChange?.(filtered);
    } else {
      if (!token) return;
      try {
        await deleteVariantMutation({
          token,
          variantId: itemToDelete.id as Id<"serviceVariants">,
        });
        onUpdate?.();
      } catch (err) {
        console.error("Erreur:", err);
        setError(err instanceof Error ? err.message : "Une erreur est survenue");
      }
    }

    setDeleteModalOpen(false);
    setItemToDelete(null);
  };

  // Mode création simplifié
  if (isCreateMode) {
    return (
      <div className="space-y-4">
        {/* Info sur les prix conseillés */}
        {priceRecommendation && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-blue-50 border border-blue-200 rounded-xl"
          >
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <p className="text-sm text-blue-800 font-medium">Prix conseillés sur la plateforme</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {computedPriceUnits.map((unit) => {
                const multiplier = unit.id === "hour" ? 1 :
                                   unit.id === "half_day" ? 4 :
                                   unit.id === "day" ? 8 :
                                   unit.id === "week" ? 40 :
                                   unit.id === "month" ? 160 : 1;
                const price = priceRecommendation.avgPrice * multiplier;
                return (
                  <div key={unit.id} className="text-center p-2 bg-white/50 rounded-lg">
                    <p className="text-lg text-blue-700 font-bold">{formatPrice(price)}</p>
                    <p className="text-xs text-blue-500">{unit.label}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Liste des formules */}
        <AnimatePresence mode="popLayout">
          {localVariants.map((variant, index) => (
            <SimpleVariantCard
              key={variant.localId}
              variant={variant}
              index={index}
              onUpdate={(updates) => handleVariantUpdate(variant.localId, updates)}
              onDelete={() => openDeleteModal(variant.localId, variant.name)}
              canDelete={localVariants.length > 1}
              recommendedPrice={recommendedPrice}
              allowedPriceUnits={computedPriceUnits}
              isLoadingPrice={isLoadingPrice}
              isGardeService={isGardeService}
              allowOvernightStay={allowOvernightStay}
              serviceAnimalTypes={serviceAnimalTypes}
            />
          ))}
        </AnimatePresence>

        {/* Bouton ajouter une formule */}
        <motion.button
          onClick={handleAddVariant}
          className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-primary/30 rounded-xl text-primary hover:bg-primary/5 hover:border-primary/50 transition-all"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Ajouter une formule</span>
        </motion.button>

        {/* Récapitulatif */}
        {localVariants.length > 0 && (
          <div className="p-4 bg-secondary/10 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Check className="w-4 h-4 text-secondary" />
              <span className="text-sm font-medium text-foreground">
                {localVariants.length} formule{localVariants.length > 1 ? "s" : ""} configurée{localVariants.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-2">
              {localVariants.map((v) => (
                <div
                  key={v.localId}
                  className="p-3 bg-white rounded-xl border border-secondary/20"
                >
                  {/* Nom et prix */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-foreground text-sm">{v.name}</span>
                    <span className="text-sm font-semibold text-primary">
                      {formatPrice(v.pricing?.hourly || v.pricing?.daily || v.pricing?.weekly || v.pricing?.monthly || v.price)}{defaultPriceUnit.shortLabel}
                    </span>
                  </div>
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Type de séance */}
                    {v.sessionType === "collective" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                        👥 Collectif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        👤 Individuel
                      </span>
                    )}
                    {/* Animaux acceptés */}
                    {v.animalTypes && v.animalTypes.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {v.animalTypes.map(a => animalLabels[a] || a).join(", ")}
                      </span>
                    )}
                    {/* Nombre de séances si > 1 */}
                    {v.numberOfSessions && v.numberOfSessions > 1 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                        📅 {v.numberOfSessions} séances
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setItemToDelete(null);
          }}
          onConfirm={handleDelete}
          title="Supprimer cette formule"
          message={`Êtes-vous sûr de vouloir supprimer "${itemToDelete?.name || ""}" ? Cette action est irréversible.`}
          confirmLabel="Supprimer"
          cancelLabel="Annuler"
          variant="danger"
        />
      </div>
    );
  }

  // Mode édition (pour les services existants) - garder l'ancien comportement
  const displayItems = variants.map((v) => ({
    id: v.id as string,
    name: v.name,
    description: v.description,
    price: v.price,
    priceUnit: v.priceUnit,
    pricing: v.pricing,
    duration: v.duration,
    includedFeatures: v.includedFeatures,
    isActive: v.isActive,
    isFromDefault: false,
    needsPrice: false,
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Layers className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Prestations / Variantes</h3>
            <p className="text-sm text-text-light">
              {displayItems.length} prestation{displayItems.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-text-light" />
          ) : (
            <ChevronDown className="w-5 h-5 text-text-light" />
          )}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Error message */}
            {error && (
              <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}

            {/* List */}
            <div className="divide-y divide-gray-100">
              {displayItems.length === 0 ? (
                <div className="p-8 text-center">
                  <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-text-light">Aucune prestation</p>
                </div>
              ) : (
                displayItems.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors",
                      !item.isActive && "opacity-50"
                    )}
                  >
                    <div className="text-text-light cursor-move">
                      <GripVertical className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-foreground">{item.name}</h4>
                        {!item.isActive && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs">
                            Inactif
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        {item.pricing?.hourly && (
                          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                            {formatPrice(item.pricing.hourly)}/h
                          </span>
                        )}
                        {item.pricing?.halfDaily && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full text-xs font-medium">
                            {formatPrice(item.pricing.halfDaily)}/demi-j
                          </span>
                        )}
                        {item.pricing?.daily && (
                          <span className="px-2 py-0.5 bg-secondary/10 text-secondary rounded-full text-xs font-medium">
                            {formatPrice(item.pricing.daily)}/jour
                          </span>
                        )}
                        {item.pricing?.weekly && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-600 rounded-full text-xs font-medium">
                            {formatPrice(item.pricing.weekly)}/sem
                          </span>
                        )}
                        {item.pricing?.monthly && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full text-xs font-medium">
                            {formatPrice(item.pricing.monthly)}/mois
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openDeleteModal(item.id, item.name)}
                        className="p-2 text-text-light hover:text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Supprimer cette prestation"
        message={`Êtes-vous sûr de vouloir supprimer la prestation "${itemToDelete?.name || ""}" ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
      />
    </div>
  );
}
