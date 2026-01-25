"use client";

import { AlertTriangle, CheckCircle, XCircle, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/app/lib/utils";

type PriceStatus = "blocked_low" | "too_low" | "ok" | "too_high" | "blocked_high";

interface PriceRange {
  low: number;  // Prix bas recommandé (en centimes)
  high: number; // Prix haut recommandé (en centimes)
}

interface PriceStatusIndicatorProps {
  currentPrice: number; // Prix actuel en centimes
  recommendedRange: PriceRange;
  className?: string;
  showLimits?: boolean;
}

// Helper pour calculer le statut du prix
export function getPriceStatus(currentPrice: number, recommendedRange: PriceRange): PriceStatus {
  const hardLow = Math.round(recommendedRange.low * 0.8);   // -20% du prix bas
  const hardHigh = Math.round(recommendedRange.high * 1.2); // +20% du prix haut

  if (currentPrice < hardLow) return "blocked_low";
  if (currentPrice < recommendedRange.low) return "too_low";
  if (currentPrice > hardHigh) return "blocked_high";
  if (currentPrice > recommendedRange.high) return "too_high";
  return "ok";
}

// Helper pour vérifier si le prix est valide (non bloqué)
export function isPriceValid(currentPrice: number, recommendedRange: PriceRange): boolean {
  const status = getPriceStatus(currentPrice, recommendedRange);
  return status !== "blocked_low" && status !== "blocked_high";
}

// Helper pour formater le prix
const formatPrice = (cents: number) => {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
};

export default function PriceStatusIndicator({
  currentPrice,
  recommendedRange,
  className,
  showLimits = true,
}: PriceStatusIndicatorProps) {
  const status = getPriceStatus(currentPrice, recommendedRange);
  const hardLow = Math.round(recommendedRange.low * 0.8);
  const hardHigh = Math.round(recommendedRange.high * 1.2);

  const statusConfig: Record<PriceStatus, {
    label: string;
    description: string;
    icon: typeof CheckCircle;
    bgColor: string;
    textColor: string;
    borderColor: string;
  }> = {
    blocked_low: {
      label: "Prix trop bas",
      description: `Minimum autorisé: ${formatPrice(hardLow)}`,
      icon: XCircle,
      bgColor: "bg-red-50",
      textColor: "text-red-700",
      borderColor: "border-red-200",
    },
    too_low: {
      label: "Prix bas",
      description: "En dessous de la fourchette recommandée",
      icon: TrendingDown,
      bgColor: "bg-amber-50",
      textColor: "text-amber-700",
      borderColor: "border-amber-200",
    },
    ok: {
      label: "Prix correct",
      description: "Dans la fourchette recommandée",
      icon: CheckCircle,
      bgColor: "bg-green-50",
      textColor: "text-green-700",
      borderColor: "border-green-200",
    },
    too_high: {
      label: "Prix élevé",
      description: "Au-dessus de la fourchette recommandée",
      icon: TrendingUp,
      bgColor: "bg-amber-50",
      textColor: "text-amber-700",
      borderColor: "border-amber-200",
    },
    blocked_high: {
      label: "Prix trop élevé",
      description: `Maximum autorisé: ${formatPrice(hardHigh)}`,
      icon: XCircle,
      bgColor: "bg-red-50",
      textColor: "text-red-700",
      borderColor: "border-red-200",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;
  const isBlocked = status === "blocked_low" || status === "blocked_high";

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border",
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      <Icon className={cn("w-5 h-5 flex-shrink-0", config.textColor)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("font-medium text-sm", config.textColor)}>
            {config.label}
          </span>
          {isBlocked && (
            <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full font-medium">
              Bloqué
            </span>
          )}
        </div>
        <p className={cn("text-xs mt-0.5", config.textColor, "opacity-80")}>
          {config.description}
        </p>
        {showLimits && (
          <div className="flex items-center gap-2 mt-1.5 text-xs">
            <span className="text-text-light">
              Fourchette: {formatPrice(recommendedRange.low)} - {formatPrice(recommendedRange.high)}
            </span>
            {isBlocked && (
              <span className="text-red-600 font-medium">
                | Limites: {formatPrice(hardLow)} - {formatPrice(hardHigh)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Composant compact pour les formulaires
export function PriceStatusBadge({
  currentPrice,
  recommendedRange,
  className,
}: Omit<PriceStatusIndicatorProps, "showLimits">) {
  const status = getPriceStatus(currentPrice, recommendedRange);

  const badgeConfig: Record<PriceStatus, { label: string; className: string }> = {
    blocked_low: { label: "Trop bas", className: "bg-red-100 text-red-700" },
    too_low: { label: "Bas", className: "bg-amber-100 text-amber-700" },
    ok: { label: "OK", className: "bg-green-100 text-green-700" },
    too_high: { label: "Élevé", className: "bg-amber-100 text-amber-700" },
    blocked_high: { label: "Trop élevé", className: "bg-red-100 text-red-700" },
  };

  const config = badgeConfig[status];

  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", config.className, className)}>
      {config.label}
    </span>
  );
}
