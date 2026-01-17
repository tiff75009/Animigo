"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { Target, TrendingUp, TrendingDown, Minus, Info, MapPin } from "lucide-react";

interface PriceRecommendationProps {
  token: string;
  category: string;
  priceUnit: "hour" | "day" | "week" | "month" | "flat";
  currentPrice: number; // en centimes
  onSelectPrice?: (price: number) => void;
}

// Formatter pour afficher les prix en euros
function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

// Labels pour les unités de prix
const unitLabels: Record<string, string> = {
  hour: "/heure",
  day: "/jour",
  week: "/semaine",
  month: "/mois",
  flat: "forfait",
};

// Labels pour les scopes
const scopeLabels: Record<string, string> = {
  city: "ville",
  department: "departement",
  region: "region",
  national: "national",
  default: "reference marche",
};

export function PriceRecommendation({
  token,
  category,
  priceUnit,
  currentPrice,
  onSelectPrice,
}: PriceRecommendationProps) {
  const recommendation = useQuery(api.services.pricing.getPriceRecommendation, {
    token,
    category,
    priceUnit,
  });

  if (!recommendation) {
    return (
      <div className="p-4 rounded-xl bg-surface/50 border border-border animate-pulse">
        <div className="h-4 bg-border/50 rounded w-1/3 mb-2"></div>
        <div className="h-8 bg-border/50 rounded w-full"></div>
      </div>
    );
  }

  const { minPrice, maxPrice, avgPrice, recommendedRange, sampleSize, scopeUsed, isDefaultPricing, message } = recommendation;

  // Calculer la position du prix actuel sur la barre
  const range = maxPrice - minPrice;
  const currentPosition = range > 0 ? ((currentPrice - minPrice) / range) * 100 : 50;
  const clampedPosition = Math.max(0, Math.min(100, currentPosition));

  // Calculer les positions de la zone recommandee
  const lowPosition = range > 0 ? ((recommendedRange.low - minPrice) / range) * 100 : 25;
  const highPosition = range > 0 ? ((recommendedRange.high - minPrice) / range) * 100 : 75;

  // Determiner si le prix est dans la fourchette
  const isInRange = currentPrice >= recommendedRange.low && currentPrice <= recommendedRange.high;
  const isBelowRange = currentPrice < recommendedRange.low;
  const isAboveRange = currentPrice > recommendedRange.high;

  // Prix suggeres
  const suggestedPrices = [
    { label: "Bas", price: recommendedRange.low },
    { label: "Moyen", price: Math.round((recommendedRange.low + recommendedRange.high) / 2) },
    { label: "Haut", price: recommendedRange.high },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-surface border border-border space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground">Prix conseille</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-text-light">
          <MapPin className="w-3 h-3" />
          {isDefaultPricing
            ? "Reference marche"
            : `${sampleSize} annonces (${scopeLabels[scopeUsed]})`}
        </div>
      </div>

      {/* Prix moyen de la catégorie */}
      <div className="flex items-center justify-center gap-2 p-3 bg-primary/10 rounded-lg">
        <span className="text-sm text-text-light">Prix moyen du marche:</span>
        <span className="text-lg font-bold text-primary">{formatPrice(avgPrice)}</span>
        <span className="text-xs text-text-light">{unitLabels[priceUnit]}</span>
      </div>

      {/* Message info */}
      {message && (
        <div className="flex items-center gap-2 text-xs text-text-light bg-primary/5 p-2 rounded-lg">
          <Info className="w-4 h-4 text-primary" />
          {message}
        </div>
      )}

      {/* Barre de prix */}
      <div className="relative pt-6 pb-2">
        {/* Barre de fond */}
        <div className="h-3 bg-border/50 rounded-full relative overflow-hidden">
          {/* Zone ambre gauche */}
          <div
            className="absolute top-0 h-full bg-amber-500/30"
            style={{ left: 0, width: `${lowPosition}%` }}
          />
          {/* Zone verte (recommandee) */}
          <div
            className="absolute top-0 h-full bg-green-500/40"
            style={{ left: `${lowPosition}%`, width: `${highPosition - lowPosition}%` }}
          />
          {/* Zone ambre droite */}
          <div
            className="absolute top-0 h-full bg-amber-500/30"
            style={{ left: `${highPosition}%`, right: 0 }}
          />
        </div>

        {/* Indicateur de position du prix actuel */}
        {currentPrice > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-4 -translate-x-1/2"
            style={{ left: `${clampedPosition}%` }}
          >
            <div
              className={`w-5 h-5 rounded-full border-2 border-white shadow-lg ${
                isInRange ? "bg-green-500" : "bg-amber-500"
              }`}
            />
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium text-foreground bg-surface px-1 rounded shadow">
              {formatPrice(currentPrice)}
            </div>
          </motion.div>
        )}

        {/* Labels min/max */}
        <div className="flex justify-between mt-2 text-xs text-text-light">
          <span>{formatPrice(minPrice)}</span>
          <span className="text-green-600 font-medium">
            {formatPrice(recommendedRange.low)} - {formatPrice(recommendedRange.high)}
          </span>
          <span>{formatPrice(maxPrice)}</span>
        </div>
      </div>

      {/* Message de statut */}
      <div
        className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
          isInRange
            ? "bg-green-500/10 text-green-600"
            : isBelowRange
            ? "bg-amber-500/10 text-amber-600"
            : "bg-amber-500/10 text-amber-600"
        }`}
      >
        {isInRange ? (
          <>
            <Minus className="w-4 h-4" />
            Votre prix est dans la fourchette conseillee
          </>
        ) : isBelowRange ? (
          <>
            <TrendingDown className="w-4 h-4" />
            Votre prix est inferieur a la fourchette conseillee
          </>
        ) : (
          <>
            <TrendingUp className="w-4 h-4" />
            Votre prix est superieur a la fourchette conseillee
          </>
        )}
      </div>

      {/* Boutons de selection rapide */}
      {onSelectPrice && (
        <div className="flex gap-2">
          {suggestedPrices.map((suggestion) => (
            <button
              key={suggestion.label}
              type="button"
              onClick={() => onSelectPrice(suggestion.price)}
              className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                currentPrice === suggestion.price
                  ? "bg-primary text-white border-primary"
                  : "bg-surface border-border text-foreground hover:border-primary/50 hover:bg-primary/5"
              }`}
            >
              <div className="text-xs opacity-70">{suggestion.label}</div>
              <div>{formatPrice(suggestion.price)}</div>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
