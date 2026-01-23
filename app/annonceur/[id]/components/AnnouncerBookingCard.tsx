"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Shield, ChevronDown, ChevronUp, Check } from "lucide-react";
import { ServiceData } from "./types";
import { cn } from "@/app/lib/utils";

interface AnnouncerBookingCardProps {
  services: ServiceData[];
  responseRate: number;
  responseTime: string;
  nextAvailable: string;
  selectedServiceId?: string | null;
  commissionRate?: number; // Taux de commission en %
  onServiceChange?: (serviceId: string | null) => void;
  onBook?: (serviceId?: string, variantId?: string) => void;
  onContact?: () => void;
}

// Helper pour formater le prix (centimes -> euros)
const formatPrice = (priceInCents: number) => {
  return (priceInCents / 100).toFixed(2).replace(".", ",");
};

// Calculer le prix avec commission
const calculatePriceWithCommission = (basePriceCents: number, commissionRate: number): number => {
  const commission = Math.round((basePriceCents * commissionRate) / 100);
  return basePriceCents + commission;
};

export default function AnnouncerBookingCard({
  services,
  responseRate,
  responseTime,
  nextAvailable,
  selectedServiceId,
  commissionRate = 15,
  onServiceChange,
  onBook,
  onContact,
}: AnnouncerBookingCardProps) {
  // Le dropdown est fermé par défaut, même avec un service pré-sélectionné
  const [isServicesExpanded, setIsServicesExpanded] = useState(false);

  // Trouver le service sélectionné
  const selectedService = selectedServiceId
    ? services.find((s) => s.id === selectedServiceId)
    : null;

  // Déterminer si c'est une garde (afficher /jour) ou un service (afficher /heure)
  const isGardeService = (service: ServiceData) => {
    const categorySlug = service.categorySlug || service.categoryId || "";
    return categorySlug.includes("garde") || categorySlug === "garde";
  };

  // Trouver le meilleur prix à afficher pour un service
  // Pour les gardes: priorité au prix journalier
  // Pour les services: priorité au prix horaire
  const getServiceBestPrice = (service: ServiceData): { price: number; unit: string } => {
    if (service.formules.length === 0) return { price: 0, unit: "" };

    const isGarde = isGardeService(service);
    let bestPrice = 0;
    let bestUnit = "";

    for (const formule of service.formules) {
      const pricing = formule.pricing;

      if (pricing) {
        // Pour les gardes: priorité daily > weekly > monthly > hourly
        if (isGarde) {
          if (pricing.daily && (bestPrice === 0 || pricing.daily < bestPrice)) {
            bestPrice = pricing.daily;
            bestUnit = "/jour";
          } else if (!bestPrice && pricing.weekly) {
            bestPrice = pricing.weekly;
            bestUnit = "/semaine";
          } else if (!bestPrice && pricing.monthly) {
            bestPrice = pricing.monthly;
            bestUnit = "/mois";
          } else if (!bestPrice && pricing.hourly) {
            bestPrice = pricing.hourly;
            bestUnit = "/heure";
          }
        } else {
          // Pour les services: priorité hourly > daily > weekly > monthly
          if (pricing.hourly && (bestPrice === 0 || pricing.hourly < bestPrice)) {
            bestPrice = pricing.hourly;
            bestUnit = "/heure";
          } else if (!bestPrice && pricing.daily) {
            bestPrice = pricing.daily;
            bestUnit = "/jour";
          } else if (!bestPrice && pricing.weekly) {
            bestPrice = pricing.weekly;
            bestUnit = "/semaine";
          } else if (!bestPrice && pricing.monthly) {
            bestPrice = pricing.monthly;
            bestUnit = "/mois";
          }
        }
      }

      // Fallback sur price/unit si pas de pricing
      if (bestPrice === 0 && formule.price > 0) {
        if (bestPrice === 0 || formule.price < bestPrice) {
          bestPrice = formule.price;
          const unit = formule.unit;
          if (unit === "day") bestUnit = "/jour";
          else if (unit === "hour") bestUnit = "/heure";
          else if (unit === "week") bestUnit = "/semaine";
          else if (unit === "month") bestUnit = "/mois";
          else if (unit === "flat") bestUnit = "";
          else bestUnit = isGarde ? "/jour" : "/heure";
        }
      }
    }

    return { price: bestPrice, unit: bestUnit };
  };

  // Prix et unité à afficher
  let displayPrice: number;
  let displayUnit: string;

  if (selectedService) {
    // Prix du service sélectionné
    const { price, unit } = getServiceBestPrice(selectedService);
    displayPrice = price;
    displayUnit = unit;
  } else {
    // Prix minimum global
    let minPrice = Infinity;
    let minUnit = "/prestation";
    for (const service of services) {
      const { price, unit } = getServiceBestPrice(service);
      if (price > 0 && price < minPrice) {
        minPrice = price;
        minUnit = unit;
      }
    }
    displayPrice = minPrice;
    displayUnit = minUnit;
  }

  const hasPrice = displayPrice !== Infinity && displayPrice > 0;

  return (
    <div className="sticky top-24">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-primary/5 via-secondary/5 to-purple/5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                {selectedService ? selectedService.categoryName : "À partir de"}
              </p>
              {hasPrice ? (
                <p className="text-2xl font-bold text-gray-900">
                  {formatPrice(calculatePriceWithCommission(displayPrice, commissionRate))}€
                  <span className="text-sm font-normal text-gray-500">{displayUnit}</span>
                </p>
              ) : (
                <p className="text-lg font-medium text-gray-500">
                  Prix sur demande
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 rounded-full">
              <span className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span className="text-xs font-medium text-emerald-700">
                Dispo. {nextAvailable}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-xl text-center">
              <p className="text-2xl font-bold text-primary">{responseRate}%</p>
              <p className="text-xs text-gray-500">Taux de réponse</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl text-center">
              <p className="text-2xl font-bold text-secondary">{responseTime}</p>
              <p className="text-xs text-gray-500">Temps de réponse</p>
            </div>
          </div>

          {/* Services Selection */}
          <div className={cn(
            "border rounded-xl overflow-hidden transition-colors",
            selectedServiceId ? "border-primary/50 ring-2 ring-primary/20" : "border-gray-200"
          )}>
            <button
              onClick={() => setIsServicesExpanded(!isServicesExpanded)}
              className={cn(
                "w-full p-3 flex items-center justify-between transition-colors",
                selectedServiceId ? "bg-primary/5 hover:bg-primary/10" : "bg-gray-50 hover:bg-gray-100"
              )}
            >
              <div className="flex items-center gap-2">
                {selectedService && (
                  <span className="text-lg">{selectedService.categoryIcon}</span>
                )}
                <span className={cn(
                  "font-medium",
                  selectedServiceId ? "text-primary" : "text-gray-900"
                )}>
                  {selectedService ? selectedService.categoryName : "Choisir une prestation"}
                </span>
              </div>
              {isServicesExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>

            <AnimatePresence>
              {isServicesExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="max-h-[300px] overflow-y-auto">
                    {services.map((service, index) => {
                      const isSelected = service.id === selectedServiceId;
                      const { price: serviceMinPrice, unit: serviceUnit } = getServiceBestPrice(service);

                      return (
                        <button
                          key={service.id}
                          onClick={() => {
                            onServiceChange?.(service.id);
                            setIsServicesExpanded(false);
                          }}
                          className={cn(
                            "w-full p-3 text-left transition-colors",
                            index > 0 && "border-t border-gray-100",
                            isSelected
                              ? "bg-primary/10"
                              : "hover:bg-gray-50"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{service.categoryIcon}</span>
                              <div>
                                <p className={cn(
                                  "text-sm font-semibold",
                                  isSelected ? "text-primary" : "text-gray-900"
                                )}>
                                  {service.categoryName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {service.formules.length} formule{service.formules.length > 1 ? "s" : ""}
                                  {service.options.length > 0 && ` • ${service.options.length} option${service.options.length > 1 ? "s" : ""}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {serviceMinPrice > 0 && (
                                <span className="text-sm font-bold text-primary whitespace-nowrap">
                                  {formatPrice(calculatePriceWithCommission(serviceMinPrice, commissionRate))}€{serviceUnit}
                                </span>
                              )}
                              {isSelected && (
                                <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                  <Check className="w-3 h-3 text-white" />
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* CTA Buttons */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onBook?.(selectedServiceId ?? undefined)}
            disabled={!selectedServiceId}
            className={cn(
              "w-full py-3.5 font-semibold rounded-xl transition-all",
              selectedServiceId
                ? "bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            {selectedServiceId ? "Réserver maintenant" : "Sélectionnez une prestation"}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onContact}
            className="w-full py-3.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Contacter
          </motion.button>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-center text-gray-500">
            Annulation gratuite jusqu&apos;à 48h avant
          </p>
        </div>
      </div>

      {/* Trust badges */}
      <div className="mt-4 p-4 bg-white rounded-xl border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-secondary/10 rounded-lg">
            <Shield className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Réservation sécurisée</p>
            <p className="text-xs text-gray-500">Paiement protégé, assurance incluse</p>
          </div>
        </div>
      </div>
    </div>
  );
}
