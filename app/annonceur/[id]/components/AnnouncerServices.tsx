"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronRight } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { ServiceData, FormuleData } from "./types";

interface AnnouncerServicesProps {
  services: ServiceData[];
  initialExpandedService?: string | null;
  className?: string;
}

// Helper pour formater le prix (centimes -> euros)
const formatPrice = (priceInCents: number) => {
  return (priceInCents / 100).toFixed(2).replace(".00", "");
};

// Déterminer si c'est une garde (afficher /jour) ou un service (afficher /heure)
const isGardeService = (service: ServiceData) => {
  const categorySlug = service.categorySlug || service.categoryId || "";
  return categorySlug.toString().includes("garde") || categorySlug === "garde";
};

// Obtenir le meilleur prix et unité pour une formule
const getFormuleBestPrice = (formule: FormuleData, isGarde: boolean): { price: number; unit: string } => {
  const pricing = formule.pricing;

  if (pricing) {
    if (isGarde) {
      // Pour les gardes: priorité daily > weekly > monthly > hourly
      if (pricing.daily) return { price: pricing.daily, unit: "jour" };
      if (pricing.weekly) return { price: pricing.weekly, unit: "semaine" };
      if (pricing.monthly) return { price: pricing.monthly, unit: "mois" };
      if (pricing.hourly) return { price: pricing.hourly, unit: "heure" };
    } else {
      // Pour les services: priorité hourly > daily > weekly > monthly
      if (pricing.hourly) return { price: pricing.hourly, unit: "heure" };
      if (pricing.daily) return { price: pricing.daily, unit: "jour" };
      if (pricing.weekly) return { price: pricing.weekly, unit: "semaine" };
      if (pricing.monthly) return { price: pricing.monthly, unit: "mois" };
    }
  }

  // Fallback sur price/unit
  if (formule.price > 0) {
    let unit = isGarde ? "jour" : "heure";
    if (formule.unit === "day") unit = "jour";
    else if (formule.unit === "hour") unit = "heure";
    else if (formule.unit === "week") unit = "semaine";
    else if (formule.unit === "month") unit = "mois";
    else if (formule.unit === "flat") unit = "";
    return { price: formule.price, unit };
  }

  return { price: 0, unit: "" };
};

// Obtenir le prix minimum pour un service
const getServiceMinPrice = (service: ServiceData): { price: number; unit: string } => {
  const isGarde = isGardeService(service);
  let minPrice = Infinity;
  let minUnit = "";

  for (const formule of service.formules) {
    const { price, unit } = getFormuleBestPrice(formule, isGarde);
    if (price > 0 && price < minPrice) {
      minPrice = price;
      minUnit = unit;
    }
  }

  return { price: minPrice === Infinity ? 0 : minPrice, unit: minUnit };
};

export default function AnnouncerServices({ services, initialExpandedService, className }: AnnouncerServicesProps) {
  const [expandedService, setExpandedService] = useState<string | null>(initialExpandedService ?? null);

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
          const { price: minPrice, unit: minUnit } = getServiceMinPrice(service);
          const isGarde = isGardeService(service);

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
                      Dès {formatPrice(minPrice)}€{minUnit && `/${minUnit}`}
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
                      {service.formules.map((formule) => {
                        const { price: formulePrice, unit: formuleUnit } = getFormuleBestPrice(formule, isGarde);
                        return (
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
                              <p className="font-bold text-primary">
                                {formatPrice(formulePrice)}€{formuleUnit && `/${formuleUnit}`}
                              </p>
                            </div>
                          </div>
                        );
                      })}

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
