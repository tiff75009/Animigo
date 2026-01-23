"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Check } from "lucide-react";
import { ServiceData } from "./types";
import { cn } from "@/app/lib/utils";

interface AnnouncerMobileCTAProps {
  services: ServiceData[];
  commissionRate?: number; // Taux de commission en %
  onBook?: (serviceId?: string, variantId?: string) => void;
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

// Labels des unités de prix
const priceUnitLabels: Record<string, string> = {
  hour: "/h",
  day: "/jour",
  week: "/sem",
  month: "/mois",
  flat: "",
};

export default function AnnouncerMobileCTA({ services, commissionRate = 15, onBook }: AnnouncerMobileCTAProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Trouver le prix minimum parmi tous les services
  const minPrice = services.reduce((min, service) => {
    const serviceMin = service.formules.reduce((sMin, formule) => {
      return formule.price < sMin ? formule.price : sMin;
    }, Infinity);
    return serviceMin < min ? serviceMin : min;
  }, Infinity);

  const hasPrice = minPrice !== Infinity && minPrice > 0;

  // Handle booking with service/variant selection
  const handleBookVariant = (serviceId: string, variantId: string) => {
    setIsSheetOpen(false);
    if (onBook) {
      onBook(serviceId, variantId);
    }
  };

  // Handle direct booking (opens selection sheet)
  const handleBookClick = () => {
    if (services.length === 1 && services[0].formules.length === 1) {
      // Only one service with one formule, book directly
      onBook?.(services[0].id, services[0].formules[0].id);
    } else {
      // Multiple options, show selection sheet
      setIsSheetOpen(true);
    }
  };

  return (
    <>
      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 md:hidden z-40">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm text-gray-500">À partir de</p>
            {hasPrice ? (
              <p className="text-xl font-bold text-gray-900">
                {formatPrice(calculatePriceWithCommission(minPrice, commissionRate))}€
                <span className="text-sm font-normal text-gray-500">/prestation</span>
              </p>
            ) : (
              <p className="text-base font-medium text-gray-500">
                Prix sur demande
              </p>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleBookClick}
            className="flex-1 py-3.5 bg-gradient-to-r from-primary to-primary/90 text-white font-semibold rounded-xl shadow-lg shadow-primary/25"
          >
            Réserver
          </motion.button>
        </div>
      </div>

      {/* Spacer for mobile CTA */}
      <div className="h-24 md:hidden" />

      {/* Service Selection Sheet (Portal) */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isSheetOpen && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsSheetOpen(false)}
                  className="fixed inset-0 bg-black/50 z-[9998] md:hidden"
                />

                {/* Sheet */}
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-[9999] md:hidden max-h-[85vh] flex flex-col"
                >
                  {/* Sheet Header */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Choisir une prestation
                    </h3>
                    <button
                      onClick={() => setIsSheetOpen(false)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  {/* Sheet Content */}
                  <div className="overflow-y-auto flex-1 p-4">
                    {services.map((service, index) => (
                      <div
                        key={service.id}
                        className={cn(
                          "pb-4",
                          index > 0 && "pt-4 border-t border-gray-100"
                        )}
                      >
                        {/* Service Header */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg">{service.categoryIcon}</span>
                          <span className="font-semibold text-gray-900">
                            {service.categoryName}
                          </span>
                        </div>

                        {/* Formules */}
                        <div className="space-y-2">
                          {service.formules.map((formule) => (
                            <motion.button
                              key={formule.id}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleBookVariant(service.id, formule.id)}
                              className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left"
                            >
                              <div className="flex-1 min-w-0 pr-3">
                                <p className="font-medium text-gray-900">
                                  {formule.name}
                                </p>
                                {formule.description && (
                                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                                    {formule.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-lg font-bold text-primary">
                                  {formatPrice(calculatePriceWithCommission(formule.price, commissionRate))}€
                                  <span className="text-sm font-normal text-gray-500">
                                    {formule.unit ? priceUnitLabels[formule.unit] || "" : ""}
                                  </span>
                                </span>
                                <div className="p-2 bg-primary text-white rounded-lg">
                                  <ArrowRight className="w-4 h-4" />
                                </div>
                              </div>
                            </motion.button>
                          ))}
                        </div>

                        {/* Options preview */}
                        {service.options.length > 0 && (
                          <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                            <Check className="w-3 h-3 text-secondary" />
                            {service.options.length} option{service.options.length > 1 ? "s" : ""} disponible{service.options.length > 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Safe area spacer */}
                  <div className="h-6 flex-shrink-0" />
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
