"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Shield, ChevronDown, ChevronUp, Check } from "lucide-react";
import { ServiceData, FormuleData } from "./types";
import { cn } from "@/app/lib/utils";
import {
  BookingSummary,
  type BookingSelection,
  type PriceBreakdown,
  type ClientAddress,
  formatPrice,
  calculatePriceWithCommission,
  isGardeService,
  getFormuleBestPrice,
} from "./booking";

interface AnnouncerBookingCardProps {
  services: ServiceData[];
  responseRate: number;
  responseTime: string;
  nextAvailable: string;
  selectedServiceId?: string | null;
  commissionRate?: number;
  bookingService?: ServiceData | null;
  bookingVariant?: FormuleData | null;
  bookingSelection?: BookingSelection;
  priceBreakdown?: PriceBreakdown | null;
  clientAddress?: ClientAddress | null;
  onServiceChange?: (serviceId: string | null) => void;
  onBook?: () => void;
  onFinalize?: () => void;
  onContact?: () => void;
}

// Get best price for a service
const getServiceBestPrice = (service: ServiceData, commissionRate: number): { price: number; unit: string } => {
  if (service.formules.length === 0) return { price: 0, unit: "" };

  const isGarde = isGardeService(service);
  let bestPrice = 0;
  let bestUnit = "";

  for (const formule of service.formules) {
    const { price, unit } = getFormuleBestPrice(formule, isGarde);
    if (price > 0 && (bestPrice === 0 || price < bestPrice)) {
      bestPrice = price;
      bestUnit = unit;
    }
  }

  return { price: bestPrice, unit: bestUnit ? `/${bestUnit}` : "" };
};

export default function AnnouncerBookingCard({
  services,
  responseRate,
  responseTime,
  nextAvailable,
  selectedServiceId,
  commissionRate = 15,
  bookingService,
  bookingVariant,
  bookingSelection,
  priceBreakdown,
  clientAddress,
  onServiceChange,
  onBook,
  onFinalize,
  onContact,
}: AnnouncerBookingCardProps) {
  const [isServicesExpanded, setIsServicesExpanded] = useState(false);

  // Find selected service
  const selectedService = selectedServiceId
    ? services.find((s) => s.id === selectedServiceId)
    : null;

  // Check if we have a booking in progress (formule selected)
  const hasBookingInProgress = Boolean(bookingService && bookingVariant);

  // Check if it's a range mode service (garde)
  const isRangeMode = bookingService ? isGardeService(bookingService) : false;

  // If booking is in progress, show the summary
  if (hasBookingInProgress && bookingSelection) {
    return (
      <div className="sticky top-36 space-y-4">
        <BookingSummary
          service={bookingService!}
          variant={bookingVariant!}
          selection={bookingSelection}
          priceBreakdown={priceBreakdown ?? null}
          commissionRate={commissionRate}
          responseRate={responseRate}
          responseTime={responseTime}
          nextAvailable={nextAvailable}
          isRangeMode={isRangeMode}
          clientAddress={clientAddress}
          onBook={onBook}
          onFinalize={onFinalize}
        />

        {/* Trust badges */}
        <div className="p-4 bg-white rounded-xl border border-gray-100">
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

  // Default view: service selection dropdown (original behavior)
  let displayPrice: number;
  let displayUnit: string;

  if (selectedService) {
    const { price, unit } = getServiceBestPrice(selectedService, commissionRate);
    displayPrice = price;
    displayUnit = unit;
  } else {
    let minPrice = Infinity;
    let minUnit = "/prestation";
    for (const service of services) {
      const { price, unit } = getServiceBestPrice(service, commissionRate);
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
    <div className="sticky top-36">
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
                      const { price: serviceMinPrice, unit: serviceUnit } = getServiceBestPrice(service, commissionRate);

                      return (
                        <button
                          key={service.id.toString()}
                          onClick={() => {
                            onServiceChange?.(service.id.toString());
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

          {/* Instructions */}
          <p className="text-sm text-gray-500 text-center">
            Sélectionnez un service puis choisissez une formule ci-dessous
          </p>

          {/* CTA Buttons */}
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
