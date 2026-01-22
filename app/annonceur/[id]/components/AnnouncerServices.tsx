"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronRight } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { ServiceData } from "./types";

interface AnnouncerServicesProps {
  services: ServiceData[];
  className?: string;
}

// Helper pour formater le prix (centimes -> euros)
const formatPrice = (priceInCents: number) => {
  return (priceInCents / 100).toFixed(2).replace(".00", "");
};

export default function AnnouncerServices({ services, className }: AnnouncerServicesProps) {
  const [expandedService, setExpandedService] = useState<string | null>(null);

  if (services.length === 0) {
    return (
      <section className={className}>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="p-2 bg-purple/10 rounded-lg">
            <Sparkles className="w-5 h-5 text-purple" />
          </span>
          Prestations proposées
        </h2>
        <div className="bg-gray-50 rounded-2xl p-8 text-center">
          <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucune prestation disponible pour le moment</p>
        </div>
      </section>
    );
  }

  return (
    <section className={className}>
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span className="p-2 bg-purple/10 rounded-lg">
          <Sparkles className="w-5 h-5 text-purple" />
        </span>
        Prestations proposées
      </h2>
      <div className="space-y-4">
        {services.map((service) => {
          const minPrice = service.formules.length > 0
            ? Math.min(...service.formules.map(f => f.price))
            : 0;

          return (
            <motion.div
              key={service.id}
              layout
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            >
              {/* Service Header */}
              <button
                onClick={() => setExpandedService(
                  expandedService === service.id ? null : service.id
                )}
                className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{service.categoryIcon}</span>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">{service.categoryName}</h3>
                    <p className="text-sm text-gray-500">{service.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {minPrice > 0 && (
                    <span className="text-lg font-bold text-primary">
                      À partir de {formatPrice(minPrice)}€
                    </span>
                  )}
                  <ChevronRight className={cn(
                    "w-5 h-5 text-gray-400 transition-transform",
                    expandedService === service.id && "rotate-90"
                  )} />
                </div>
              </button>

              {/* Service Details */}
              <AnimatePresence>
                {expandedService === service.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-gray-100"
                  >
                    <div className="p-4 sm:p-5 space-y-3">
                      {/* Formules */}
                      {service.formules.map((formule) => (
                        <div
                          key={formule.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                          <div>
                            <p className="font-medium text-gray-900">{formule.name}</p>
                            {formule.description && (
                              <p className="text-sm text-gray-500">{formule.description}</p>
                            )}
                            {formule.duration && (
                              <p className="text-sm text-gray-500">{formule.duration} min</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">{formatPrice(formule.price)}€</p>
                            {formule.unit && (
                              <p className="text-xs text-gray-500">/{formule.unit}</p>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Options */}
                      {service.options.length > 0 && (
                        <div className="pt-3 border-t border-gray-200">
                          <p className="text-sm font-medium text-gray-500 mb-2">Options disponibles</p>
                          <div className="flex flex-wrap gap-2">
                            {service.options.map((option) => (
                              <span
                                key={option.id}
                                className="px-3 py-1.5 bg-primary/5 text-primary text-sm font-medium rounded-full"
                              >
                                {option.name} (+{formatPrice(option.price)}€)
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
