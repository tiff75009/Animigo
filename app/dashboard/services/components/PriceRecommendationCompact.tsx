"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { Target, TrendingUp, TrendingDown, Check, Loader2 } from "lucide-react";

interface PriceRecommendationCompactProps {
  token: string;
  category: string;
  priceUnit: "hour" | "half_day" | "day" | "week" | "month" | "flat";
  currentPrice: number; // en centimes
  onSelectPrice?: (price: number) => void;
  className?: string;
}

// Formatter pour afficher les prix en euros
function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }) + " \u20ac";
}

export function PriceRecommendationCompact({
  token,
  category,
  priceUnit,
  currentPrice,
  onSelectPrice,
  className = "",
}: PriceRecommendationCompactProps) {
  const recommendation = useQuery(api.services.pricing.getPriceRecommendation, {
    token,
    category,
    priceUnit,
  });

  if (!recommendation) {
    return (
      <div className={`flex items-center gap-2 text-sm text-text-light ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        Chargement prix conseillé...
      </div>
    );
  }

  const { recommendedRange, avgPrice } = recommendation;

  // Déterminer si le prix est dans la fourchette
  const isInRange = currentPrice >= recommendedRange.low && currentPrice <= recommendedRange.high;
  const isBelowRange = currentPrice > 0 && currentPrice < recommendedRange.low;
  const isAboveRange = currentPrice > recommendedRange.high;

  // Prix suggérés
  const suggestedPrices = [
    { label: "Bas", price: recommendedRange.low },
    { label: "Moyen", price: Math.round((recommendedRange.low + recommendedRange.high) / 2) },
    { label: "Haut", price: recommendedRange.high },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`space-y-2 ${className}`}
    >
      {/* Header compact */}
      <div className="flex items-center gap-2 text-sm">
        <Target className="w-4 h-4 text-primary" />
        <span className="font-medium text-foreground">Prix conseillé:</span>
        <span className="text-primary font-semibold">
          {formatPrice(recommendedRange.low)} - {formatPrice(recommendedRange.high)}
        </span>
        <span className="text-text-light">(moy. {formatPrice(avgPrice)})</span>
      </div>

      {/* Status indicator */}
      {currentPrice > 0 && (
        <div
          className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full w-fit ${
            isInRange
              ? "bg-green-100 text-green-700"
              : isBelowRange
              ? "bg-amber-100 text-amber-700"
              : isAboveRange
              ? "bg-amber-100 text-amber-700"
              : ""
          }`}
        >
          {isInRange ? (
            <>
              <Check className="w-3 h-3" />
              Dans la fourchette
            </>
          ) : isBelowRange ? (
            <>
              <TrendingDown className="w-3 h-3" />
              En dessous
            </>
          ) : isAboveRange ? (
            <>
              <TrendingUp className="w-3 h-3" />
              Au dessus
            </>
          ) : null}
        </div>
      )}

      {/* Quick selection buttons */}
      {onSelectPrice && (
        <div className="flex gap-1.5">
          {suggestedPrices.map((suggestion) => (
            <button
              key={suggestion.label}
              type="button"
              onClick={() => onSelectPrice(suggestion.price)}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                currentPrice === suggestion.price
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-foreground hover:bg-primary/10 hover:text-primary"
              }`}
            >
              {formatPrice(suggestion.price)}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
