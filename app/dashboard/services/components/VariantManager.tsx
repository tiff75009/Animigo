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
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import ConfirmModal from "./shared/ConfirmModal";
import { useAuth } from "@/app/hooks/useAuth";

type PriceUnit = "hour" | "day" | "week" | "month" | "flat";
type BillingType = "hourly" | "daily" | "flexible";

// Multi-tarification par unité de temps
interface Pricing {
  hourly?: number;
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

// Variant local pour le mode création (sans ID)
export interface LocalVariant {
  localId: string;
  name: string;
  description?: string;
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
  allowedPriceUnits?: ("hour" | "day" | "week" | "month")[];
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
}

// Helper pour formater le prix
const formatPrice = (cents: number) => {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
};

// Toutes les unités de prix disponibles
const ALL_PRICE_UNITS: { id: PriceUnit; label: string; shortLabel: string }[] = [
  { id: "hour", label: "par heure", shortLabel: "/h" },
  { id: "day", label: "par jour", shortLabel: "/jour" },
  { id: "week", label: "par semaine", shortLabel: "/sem" },
  { id: "month", label: "par mois", shortLabel: "/mois" },
  { id: "flat", label: "forfait", shortLabel: "forfait" },
];

// Helper pour obtenir les unités de prix autorisées
const getComputedPriceUnits = (
  allowedPriceUnits?: ("hour" | "day" | "week" | "month")[],
  billingType?: BillingType
): { id: PriceUnit; label: string; shortLabel: string }[] => {
  if (allowedPriceUnits && allowedPriceUnits.length > 0) {
    return ALL_PRICE_UNITS.filter((u) => allowedPriceUnits.includes(u.id as "hour" | "day" | "week" | "month"));
  }
  switch (billingType) {
    case "hourly":
      return ALL_PRICE_UNITS.filter((u) => u.id === "hour" || u.id === "flat");
    case "daily":
      return ALL_PRICE_UNITS.filter((u) => u.id !== "hour");
    case "flexible":
    default:
      return ALL_PRICE_UNITS;
  }
};

// Générer un ID local unique
const generateLocalId = () => `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
  priceUnit,
  isLoadingPrice,
  isGardeService,
  allowOvernightStay,
}: {
  variant: LocalVariant;
  index: number;
  onUpdate: (updates: Partial<LocalVariant>) => void;
  onDelete: () => void;
  canDelete: boolean;
  recommendedPrice: number;
  priceUnit: { id: PriceUnit; label: string; shortLabel: string };
  isLoadingPrice: boolean;
  isGardeService?: boolean;
  allowOvernightStay?: boolean;
}) {
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [newFeature, setNewFeature] = useState("");

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

  // Récupérer le prix actuel selon l'unité (pour services non-garde)
  const getCurrentPrice = () => {
    if (!variant.pricing) return recommendedPrice / 100;
    switch (priceUnit.id) {
      case "hour": return (variant.pricing.hourly || recommendedPrice) / 100;
      case "day": return (variant.pricing.daily || recommendedPrice) / 100;
      case "week": return (variant.pricing.weekly || recommendedPrice) / 100;
      case "month": return (variant.pricing.monthly || recommendedPrice) / 100;
      default: return recommendedPrice / 100;
    }
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

  // Handler générique pour les autres services
  const handlePriceChange = (newPriceEuros: number) => {
    const priceInCents = Math.round(newPriceEuros * 100);
    const newPricing: Pricing = { ...variant.pricing };

    switch (priceUnit.id) {
      case "hour": newPricing.hourly = priceInCents; break;
      case "day": newPricing.daily = priceInCents; break;
      case "week": newPricing.weekly = priceInCents; break;
      case "month": newPricing.monthly = priceInCents; break;
    }

    onUpdate({ pricing: newPricing, price: priceInCents });
  };

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

      {/* Prix */}
      <div className="p-4 space-y-4">
        {isGardeService ? (
          <>
            {/* Mode Garde: Prix journée principal */}
            <PriceSlider
              label="Prix par jour"
              value={getDailyPrice()}
              onChange={handleDailyPriceChange}
              recommendedPrice={dailyRecommendedPrice}
              unit="/jour"
              isLoading={isLoadingPrice}
            />

            {/* Prix horaire calculé automatiquement */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-light">Prix par heure</span>
                  <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                    Auto-calculé
                  </span>
                </div>
                <span className="text-lg font-semibold text-foreground">
                  {calculatedHourlyPrice?.toFixed(2).replace(".", ",")} €/h
                </span>
              </div>
              <p className="text-xs text-text-light mt-1">
                = Prix journée ÷ 8 heures
              </p>
            </div>

            {/* Prix nuit si garde de nuit activée */}
            {allowOvernightStay && (
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
          </>
        ) : (
          /* Mode standard: prix selon l'unité */
          <PriceSlider
            label={`Prix ${priceUnit.label}`}
            value={getCurrentPrice()}
            onChange={handlePriceChange}
            recommendedPrice={recommendedPrice}
            unit={priceUnit.shortLabel}
            isLoading={isLoadingPrice}
          />
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

                {/* Durée */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Durée estimée <span className="text-primary">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={variant.duration || ""}
                      onChange={(e) => onUpdate({ duration: parseInt(e.target.value) || undefined })}
                      min="15"
                      step="15"
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
      };
      onLocalChange?.([firstVariant]);
      setHasAutoAdded(true);
    }
  }, [isCreateMode, autoAddFirst, localVariants.length, hasAutoAdded, priceRecommendation, recommendedPrice, serviceName, defaultPriceUnit.id, onLocalChange, isGardeService, allowOvernightStay]);

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
        {/* Info sur le prix conseillé */}
        {priceRecommendation && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl"
          >
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800 font-medium">Prix conseillé sur la plateforme</p>
              <p className="text-lg text-blue-700 font-bold">
                {formatPrice(priceRecommendation.avgPrice)} {defaultPriceUnit.label}
              </p>
              <p className="text-xs text-blue-500 mt-1">
                Ajustable de {formatPrice(Math.round(priceRecommendation.avgPrice * 0.8))} à {formatPrice(Math.round(priceRecommendation.avgPrice * 1.2))}
              </p>
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
              priceUnit={defaultPriceUnit}
              isLoadingPrice={isLoadingPrice}
              isGardeService={isGardeService}
              allowOvernightStay={allowOvernightStay}
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
            <div className="flex items-center gap-2 mb-2">
              <Check className="w-4 h-4 text-secondary" />
              <span className="text-sm font-medium text-foreground">
                {localVariants.length} formule{localVariants.length > 1 ? "s" : ""} configurée{localVariants.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {localVariants.map((v, i) => (
                <span
                  key={v.localId}
                  className="px-3 py-1 bg-white rounded-full text-sm text-foreground border border-secondary/20"
                >
                  Formule {i + 1}: {formatPrice(v.pricing?.hourly || v.pricing?.daily || v.pricing?.weekly || v.pricing?.monthly || v.price)}{defaultPriceUnit.shortLabel}
                </span>
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
