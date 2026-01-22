"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Shield, ChevronDown, ChevronUp, ArrowRight, Check } from "lucide-react";
import { ServiceData } from "./types";
import { cn } from "@/app/lib/utils";

interface AnnouncerBookingCardProps {
  services: ServiceData[];
  responseRate: number;
  responseTime: string;
  nextAvailable: string;
  onBook?: (serviceId?: string, variantId?: string) => void;
  onContact?: () => void;
}

// Helper pour formater le prix (centimes -> euros)
const formatPrice = (priceInCents: number) => {
  return (priceInCents / 100).toFixed(0);
};

// Labels des unités de prix
const priceUnitLabels: Record<string, string> = {
  hour: "/h",
  day: "/jour",
  week: "/sem",
  month: "/mois",
  flat: "",
};

export default function AnnouncerBookingCard({
  services,
  responseRate,
  responseTime,
  nextAvailable,
  onBook,
  onContact,
}: AnnouncerBookingCardProps) {
  const [isServicesExpanded, setIsServicesExpanded] = useState(false);

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
    if (onBook) {
      onBook(serviceId, variantId);
    }
  };

  return (
    <div className="sticky top-24">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-primary/5 via-secondary/5 to-purple/5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">À partir de</p>
              {hasPrice ? (
                <p className="text-2xl font-bold text-gray-900">
                  {formatPrice(minPrice)}€
                  <span className="text-sm font-normal text-gray-500">/prestation</span>
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
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setIsServicesExpanded(!isServicesExpanded)}
              className="w-full p-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="font-medium text-gray-900">
                Choisir une prestation
              </span>
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
                    {services.map((service, index) => (
                      <div
                        key={service.id}
                        className={cn(
                          "p-3",
                          index > 0 && "border-t border-gray-100"
                        )}
                      >
                        {/* Service Header */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base">{service.categoryIcon}</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {service.categoryName}
                          </span>
                        </div>

                        {/* Formules */}
                        <div className="space-y-2">
                          {service.formules.map((formule) => (
                            <div
                              key={formule.id}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {formule.name}
                                </p>
                                {formule.description && (
                                  <p className="text-xs text-gray-500 truncate mt-0.5">
                                    {formule.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 ml-2">
                                <span className="text-sm font-bold text-primary whitespace-nowrap">
                                  {formatPrice(formule.price)}€
                                  <span className="text-xs font-normal text-gray-500">
                                    {formule.unit ? priceUnitLabels[formule.unit] || "" : ""}
                                  </span>
                                </span>
                                <button
                                  onClick={() => handleBookVariant(service.id, formule.id)}
                                  className="p-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                                  title="Réserver"
                                >
                                  <ArrowRight className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Options preview */}
                        {service.options.length > 0 && (
                          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                            <Check className="w-3 h-3 text-secondary" />
                            {service.options.length} option{service.options.length > 1 ? "s" : ""} disponible{service.options.length > 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* CTA Buttons */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onBook?.()}
            className="w-full py-3.5 bg-gradient-to-r from-primary to-primary/90 text-white font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
          >
            Réserver maintenant
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
