"use client";

import { useState, useEffect } from "react";
import { Check, Home, MapPin, Clock, ChevronDown } from "lucide-react";
import { cn } from "@/app/lib/utils";

// Types
export interface ServiceVariant {
  id: string;
  name: string;
  description?: string;
  price: number;
  priceUnit: string;
  duration?: number;
  pricing?: {
    hourly?: number;
    daily?: number;
    weekly?: number;
    monthly?: number;
    nightly?: number;
  };
  includedFeatures?: string[];
  isActive?: boolean;
}

export interface PriceRange {
  min: number;
  max: number;
  avg: number;
}

export interface ServiceDetail {
  id: string;
  category: string;
  categoryName: string;
  categoryIcon?: string;
  categoryDescription?: string;
  animalTypes: string[];
  allowOvernightStay?: boolean;
  dayStartTime?: string;
  dayEndTime?: string;
  overnightPrice?: number;
  serviceLocation?: "announcer_home" | "client_home" | "both";
  enableDurationBasedBlocking?: boolean;
  priceRange?: PriceRange;
  variants: ServiceVariant[];
  options: Array<{ id: string; name: string; price: number; priceType?: string; isActive?: boolean }>;
}

interface FormulaStepProps {
  services: ServiceDetail[];
  selectedServiceId: string;
  selectedVariantId: string;
  selectedServiceLocation: "announcer_home" | "client_home" | null;
  commissionRate?: number;
  preSelectedFromSidebar?: boolean;
  onSelect: (serviceId: string, variantId: string, autoServiceLocation?: "announcer_home" | "client_home" | null) => void;
  onServiceLocationSelect: (location: "announcer_home" | "client_home") => void;
}

// Helper functions
function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

function formatPriceShort(cents: number): string {
  return (cents / 100).toFixed(0) + "€";
}

function calculatePriceWithCommission(basePriceCents: number, commissionRate: number): number {
  const commission = Math.round((basePriceCents * commissionRate) / 100);
  return basePriceCents + commission;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h${remainingMinutes}`;
}

// Composant indicateur de prix
function PriceRangeIndicator({
  currentPrice,
  priceRange,
  commissionRate
}: {
  currentPrice: number;
  priceRange: PriceRange;
  commissionRate: number;
}) {
  // Ajouter la commission aux prix de référence pour la comparaison
  const minWithCommission = calculatePriceWithCommission(priceRange.min, commissionRate);
  const maxWithCommission = calculatePriceWithCommission(priceRange.max, commissionRate);
  const avgWithCommission = calculatePriceWithCommission(priceRange.avg, commissionRate);

  // Calculer la position du prix actuel (0-100%)
  const range = maxWithCommission - minWithCommission;
  let position = range > 0
    ? Math.max(0, Math.min(100, ((currentPrice - minWithCommission) / range) * 100))
    : 50;

  // Déterminer le label
  let label: string;
  let labelColor: string;

  if (currentPrice <= minWithCommission + range * 0.33) {
    label = "Prix bas";
    labelColor = "text-green-600";
  } else if (currentPrice <= minWithCommission + range * 0.66) {
    label = "Prix moyen";
    labelColor = "text-amber-600";
  } else {
    label = "Prix élevé";
    labelColor = "text-red-500";
  }

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-light">Positionnement du tarif</span>
        <span className={cn("text-xs font-medium", labelColor)}>{label}</span>
      </div>

      {/* Barre de progression */}
      <div className="relative h-2 bg-gradient-to-r from-green-200 via-amber-200 to-red-200 rounded-full">
        {/* Indicateur de position */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-gray-700 rounded-full shadow-sm transition-all"
          style={{ left: `calc(${position}% - 6px)` }}
        />
      </div>

      {/* Labels min/max */}
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-text-light">{formatPriceShort(minWithCommission)}</span>
        <span className="text-[10px] text-text-light font-medium">~{formatPriceShort(avgWithCommission)}</span>
        <span className="text-[10px] text-text-light">{formatPriceShort(maxWithCommission)}</span>
      </div>
    </div>
  );
}

export default function FormulaStep({
  services,
  selectedServiceId,
  selectedVariantId,
  selectedServiceLocation,
  commissionRate = 15,
  preSelectedFromSidebar = false,
  onSelect,
  onServiceLocationSelect,
}: FormulaStepProps) {
  const [showAllServices, setShowAllServices] = useState(false);

  // Trouver le service sélectionné
  const selectedService = services.find((s) => s.id === selectedServiceId);

  // Déterminer l'auto-sélection du lieu de prestation
  const getAutoServiceLocation = (service: ServiceDetail) => {
    if (service.serviceLocation === "announcer_home") return "announcer_home";
    if (service.serviceLocation === "client_home") return "client_home";
    return null;
  };

  // Auto-sélectionner le premier variant en vue simplifiée
  useEffect(() => {
    if (preSelectedFromSidebar && selectedService && !selectedVariantId) {
      const firstVariant = selectedService.variants[0];
      if (firstVariant) {
        onSelect(selectedService.id, firstVariant.id, getAutoServiceLocation(selectedService));
      }
    }
  }, [preSelectedFromSidebar, selectedService, selectedVariantId, onSelect]);

  // Déterminer si on affiche la vue simplifiée
  const showSimplifiedView = preSelectedFromSidebar && selectedService && !showAllServices;

  // Le choix du lieu est affiché si le service supporte "both"
  const showLocationChoice = selectedService?.serviceLocation === "both" && selectedVariantId;

  // Vue simplifiée quand on vient de la sidebar
  if (showSimplifiedView) {
    const variant = selectedService.variants.find(v => v.id === selectedVariantId) || selectedService.variants[0];
    const pricing = variant?.pricing;
    const basePrice = pricing?.daily || pricing?.hourly || variant?.price || 0;
    const displayPrice = calculatePriceWithCommission(basePrice, commissionRate);
    const priceUnit = pricing?.daily ? "/jour" : pricing?.hourly ? "/h" : "";

    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        {/* En-tête du service */}
        <div className="flex items-center gap-3 mb-4">
          {selectedService.categoryIcon && (
            <span className="text-3xl">{selectedService.categoryIcon}</span>
          )}
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {selectedService.categoryName}
            </h2>
            {selectedService.categoryDescription && (
              <p className="text-sm text-text-light">
                {selectedService.categoryDescription}
              </p>
            )}
          </div>
        </div>

        {/* Sélection de la formule si plusieurs */}
        {selectedService.variants.length > 1 ? (
          <div className="mb-4">
            <h3 className="font-medium text-foreground mb-2">Choisissez votre formule</h3>
            <div className="space-y-2">
              {selectedService.variants.map((v) => {
                const isSelected = selectedVariantId === v.id;
                const vPricing = v.pricing;
                const vBasePrice = vPricing?.daily || vPricing?.hourly || v.price;
                const vDisplayPrice = calculatePriceWithCommission(vBasePrice, commissionRate);
                const vPriceUnit = vPricing?.daily ? "/jour" : vPricing?.hourly ? "/h" : "";

                return (
                  <button
                    key={v.id}
                    onClick={() => onSelect(selectedService.id, v.id, getAutoServiceLocation(selectedService))}
                    className={cn(
                      "w-full p-4 rounded-xl border-2 transition-all text-left",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{v.name}</p>
                        {v.description && (
                          <p className="text-sm text-text-light mt-0.5">{v.description}</p>
                        )}
                        {v.duration && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-text-light">
                            <Clock className="w-3 h-3" />
                            {formatDuration(v.duration)}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-lg font-bold text-primary">
                          {formatPrice(vDisplayPrice)}
                          <span className="text-xs font-normal text-text-light">{vPriceUnit}</span>
                        </p>
                        {isSelected && <Check className="w-5 h-5 text-primary" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Indicateur de prix pour le variant sélectionné */}
            {selectedService.priceRange && selectedVariantId && (
              <PriceRangeIndicator
                currentPrice={displayPrice}
                priceRange={selectedService.priceRange}
                commissionRate={commissionRate}
              />
            )}
          </div>
        ) : (
          /* Affichage détaillé pour une seule formule */
          <div className="space-y-3 mb-4">
            {/* Durée + Prix en ligne */}
            <div className="flex gap-3">
              {variant?.duration && (
                <div className="flex-1 flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                  <Clock className="w-5 h-5 text-text-light" />
                  <div>
                    <p className="text-xs text-text-light">Durée</p>
                    <p className="font-semibold text-foreground">{formatDuration(variant.duration)}</p>
                  </div>
                </div>
              )}
              <div className={cn(
                "flex items-center gap-2 p-3 bg-primary/5 rounded-xl",
                variant?.duration ? "flex-1" : "w-full"
              )}>
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-primary text-xs font-bold">€</span>
                </div>
                <div>
                  <p className="text-xs text-text-light">Prix</p>
                  <p className="font-semibold text-primary">
                    {formatPrice(displayPrice)}
                    <span className="text-xs font-normal text-text-light">{priceUnit}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Indicateur de positionnement du prix */}
            {selectedService.priceRange && (
              <PriceRangeIndicator
                currentPrice={displayPrice}
                priceRange={selectedService.priceRange}
                commissionRate={commissionRate}
              />
            )}

            {/* Description de la formule */}
            {variant?.description && (
              <p className="text-sm text-text-light">{variant.description}</p>
            )}

            {/* Features incluses */}
            {variant?.includedFeatures && variant.includedFeatures.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {variant.includedFeatures.map((f, i) => (
                  <span
                    key={i}
                    className="text-xs px-3 py-1 bg-secondary/10 text-secondary rounded-full"
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Choix du lieu de prestation */}
        {selectedService.serviceLocation === "both" && (
          <div className="pt-4 border-t border-gray-200">
            <h3 className="font-semibold text-foreground mb-3">
              Où souhaitez-vous que la prestation ait lieu ?
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onServiceLocationSelect("client_home")}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                  selectedServiceLocation === "client_home"
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <Home className={cn(
                  "w-6 h-6",
                  selectedServiceLocation === "client_home" ? "text-primary" : "text-gray-500"
                )} />
                <span className="font-medium text-foreground text-sm">À domicile</span>
                <span className="text-xs text-text-light text-center">Chez vous</span>
                {selectedServiceLocation === "client_home" && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </button>
              <button
                onClick={() => onServiceLocationSelect("announcer_home")}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                  selectedServiceLocation === "announcer_home"
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <MapPin className={cn(
                  "w-6 h-6",
                  selectedServiceLocation === "announcer_home" ? "text-primary" : "text-gray-500"
                )} />
                <span className="font-medium text-foreground text-sm">Chez le pet-sitter</span>
                <span className="text-xs text-text-light text-center">À son domicile</span>
                {selectedServiceLocation === "announcer_home" && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Bouton pour voir d'autres prestations */}
        {services.length > 1 && (
          <button
            onClick={() => setShowAllServices(true)}
            className="w-full mt-4 py-2 text-sm text-primary hover:text-primary/80 flex items-center justify-center gap-1"
          >
            <ChevronDown className="w-4 h-4" />
            Voir d&apos;autres prestations
          </button>
        )}
      </div>
    );
  }

  // Vue complète (liste de tous les services)
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <h2 className="text-lg font-bold text-foreground mb-4">
        Choisissez une prestation
      </h2>
      <div className="space-y-4">
        {services.map((service) => (
          <div
            key={service.id}
            className="border border-gray-200 rounded-xl overflow-hidden"
          >
            {/* Service Header */}
            <div className="p-3 bg-gray-50 flex items-center gap-2">
              {service.categoryIcon && (
                <span className="text-lg">{service.categoryIcon}</span>
              )}
              <span className="font-semibold text-foreground">
                {service.categoryName}
              </span>
            </div>

            {/* Variants */}
            <div className="p-3 space-y-2">
              {service.variants.map((variant) => {
                const isSelected =
                  selectedServiceId === service.id &&
                  selectedVariantId === variant.id;
                const pricing = variant.pricing;
                const basePrice =
                  pricing?.daily || pricing?.hourly || variant.price;
                const displayPrice = calculatePriceWithCommission(basePrice, commissionRate);
                const priceUnit = pricing?.daily
                  ? "/jour"
                  : pricing?.hourly
                    ? "/h"
                    : "";

                return (
                  <button
                    key={variant.id}
                    onClick={() => onSelect(service.id, variant.id, getAutoServiceLocation(service))}
                    className={cn(
                      "w-full p-3 rounded-xl border-2 transition-all text-left",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {variant.name}
                        </p>
                        {variant.description && (
                          <p className="text-xs text-text-light mt-0.5">
                            {variant.description}
                          </p>
                        )}
                        {variant.duration && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-text-light">
                            <Clock className="w-3 h-3" />
                            {formatDuration(variant.duration)}
                          </div>
                        )}
                        {variant.includedFeatures &&
                          variant.includedFeatures.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {variant.includedFeatures.slice(0, 2).map((f, i) => (
                                <span
                                  key={i}
                                  className="text-xs px-2 py-0.5 bg-secondary/10 text-secondary rounded-full"
                                >
                                  {f}
                                </span>
                              ))}
                              {variant.includedFeatures.length > 2 && (
                                <span className="text-xs px-2 py-0.5 bg-gray-100 text-text-light rounded-full">
                                  +{variant.includedFeatures.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                      </div>
                      <div className="text-right ml-3">
                        <p className="text-lg font-bold text-primary">
                          {formatPrice(displayPrice)}
                          <span className="text-xs font-normal text-text-light">
                            {priceUnit}
                          </span>
                        </p>
                        {isSelected && (
                          <Check className="w-5 h-5 text-primary ml-auto mt-1" />
                        )}
                      </div>
                    </div>

                    {/* Indicateur de prix pour le variant sélectionné */}
                    {isSelected && service.priceRange && (
                      <PriceRangeIndicator
                        currentPrice={displayPrice}
                        priceRange={service.priceRange}
                        commissionRate={commissionRate}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Choix du lieu de prestation (affiché seulement si service = "both") */}
      {showLocationChoice && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="font-semibold text-foreground mb-3">
            Où souhaitez-vous que la prestation ait lieu ?
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onServiceLocationSelect("client_home")}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                selectedServiceLocation === "client_home"
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <Home className={cn(
                "w-6 h-6",
                selectedServiceLocation === "client_home" ? "text-primary" : "text-gray-500"
              )} />
              <span className="font-medium text-foreground text-sm">À domicile</span>
              <span className="text-xs text-text-light text-center">Chez vous</span>
              {selectedServiceLocation === "client_home" && (
                <Check className="w-4 h-4 text-primary" />
              )}
            </button>
            <button
              onClick={() => onServiceLocationSelect("announcer_home")}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                selectedServiceLocation === "announcer_home"
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <MapPin className={cn(
                "w-6 h-6",
                selectedServiceLocation === "announcer_home" ? "text-primary" : "text-gray-500"
              )} />
              <span className="font-medium text-foreground text-sm">Chez le pet-sitter</span>
              <span className="text-xs text-text-light text-center">À son domicile</span>
              {selectedServiceLocation === "announcer_home" && (
                <Check className="w-4 h-4 text-primary" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
