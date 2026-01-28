"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronRight, Clock, Calendar, CheckCircle2, Target } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { ServiceData, FormuleData } from "./types";

// Calculer le prix total avec durée et nombre de séances
function calculateTotalPrice(
  hourlyPrice: number,
  duration: number | undefined,
  numberOfSessions: number | undefined
): number {
  const durationHours = (duration || 60) / 60;
  const sessions = numberOfSessions || 1;
  return Math.round(hourlyPrice * durationHours * sessions);
}

interface AnnouncerServicesProps {
  services: ServiceData[];
  initialExpandedService?: string | null;
  commissionRate?: number; // Taux de commission en %
  onServiceSelect?: (serviceId: string) => void; // Callback pour sélectionner un service (mobile)
  className?: string;
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

// Déterminer si c'est une garde (afficher /jour) ou un service (afficher /heure)
const isGardeService = (service: ServiceData) => {
  const categorySlug = service.categorySlug || service.categoryId || "";
  return categorySlug.toString().includes("garde") || categorySlug === "garde";
};

// Mapping des unités d'affichage
const DISPLAY_UNIT_LABELS: Record<string, string> = {
  hour: "heure",
  half_day: "demi-j",
  day: "jour",
  week: "semaine",
  month: "mois",
};

// Obtenir le meilleur prix et unité pour une formule selon l'unité d'affichage configurée
const getFormuleBestPrice = (
  formule: FormuleData,
  isGarde: boolean,
  displayPriceUnit?: "hour" | "half_day" | "day" | "week" | "month"
): { price: number; unit: string } => {
  const pricing = formule.pricing;

  // Si une unité d'affichage est configurée, l'utiliser en priorité
  if (displayPriceUnit && pricing) {
    const priceMap: Record<string, { value?: number; label: string }> = {
      hour: { value: pricing.hourly, label: "heure" },
      half_day: { value: pricing.halfDaily, label: "demi-j" },
      day: { value: pricing.daily, label: "jour" },
      week: { value: pricing.weekly, label: "semaine" },
      month: { value: pricing.monthly, label: "mois" },
    };

    const selected = priceMap[displayPriceUnit];
    if (selected?.value) {
      return { price: selected.value, unit: selected.label };
    }
    // Fallback au premier prix disponible si l'unité configurée n'est pas disponible
  }

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
  const displayPriceUnit = service.displayPriceUnit;
  let minPrice = Infinity;
  let minUnit = "";

  for (const formule of service.formules) {
    const { price, unit } = getFormuleBestPrice(formule, isGarde, displayPriceUnit);
    if (price > 0 && price < minPrice) {
      minPrice = price;
      minUnit = unit;
    }
  }

  return { price: minPrice === Infinity ? 0 : minPrice, unit: minUnit };
};

export default function AnnouncerServices({ services, initialExpandedService, commissionRate = 15, onServiceSelect, className }: AnnouncerServicesProps) {
  const [expandedService, setExpandedService] = useState<string | null>(initialExpandedService ?? null);

  const handleServiceClick = (serviceId: string) => {
    // Toggle expand
    setExpandedService(expandedService === serviceId ? null : serviceId);
    // Notify parent to update selected service (for mobile CTA)
    if (onServiceSelect) {
      onServiceSelect(serviceId);
    }
  };

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
                onClick={() => handleServiceClick(service.id as string)}
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
                      Dès {formatPrice(calculatePriceWithCommission(minPrice, commissionRate))}€{minUnit && `/${minUnit}`}
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
                      {/* Note: Les restrictions chiens sont maintenant affichées par formule ci-dessous */}
                      {/* Formules */}
                      {service.formules.map((formule) => {
                        const { price: formulePrice, unit: formuleUnit } = getFormuleBestPrice(formule, isGarde, service.displayPriceUnit);
                        // Calculer le prix total si plusieurs séances ou durée différente de 60min
                        const hasMultipleSessions = formule.numberOfSessions && formule.numberOfSessions > 1;
                        const hasDifferentDuration = formule.duration && formule.duration !== 60;
                        const showTotalPrice = (hasMultipleSessions || hasDifferentDuration) && formuleUnit === "heure";
                        const totalPrice = showTotalPrice
                          ? calculateTotalPrice(formulePrice, formule.duration, formule.numberOfSessions)
                          : null;
                        return (
                          <div
                            key={formule.id}
                            className="p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                          >
                            {/* En-tête: Titre + Prix - layout responsive */}
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                              <p className="font-medium text-gray-900">{formule.name}</p>

                              {/* Prix - aligné à droite sur desktop, en dessous sur mobile */}
                              <div className="sm:text-right flex-shrink-0">
                                {totalPrice ? (
                                  <div className="flex sm:flex-col items-baseline sm:items-end gap-2 sm:gap-0">
                                    <p className="font-bold text-primary">
                                      {formatPrice(calculatePriceWithCommission(totalPrice, commissionRate))}€
                                      <span className="text-xs font-normal text-gray-400 ml-1">total</span>
                                    </p>
                                    <p className="text-xs text-gray-500 sm:mt-0.5">
                                      {formatPrice(calculatePriceWithCommission(formulePrice, commissionRate))}€/{formuleUnit} × {formule.duration || 60}min
                                      {formule.numberOfSessions && formule.numberOfSessions > 1 && ` × ${formule.numberOfSessions}`}
                                    </p>
                                  </div>
                                ) : (
                                  <p className="font-bold text-primary">
                                    {formatPrice(calculatePriceWithCommission(formulePrice, commissionRate))}€{formuleUnit && `/${formuleUnit}`}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Description */}
                            {formule.description && (
                              <p className="text-sm text-gray-500 mt-2">{formule.description}</p>
                            )}

                            {/* Durée et nombre de séances */}
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              {formule.duration && (
                                <span className="flex items-center gap-1 text-xs text-gray-400">
                                  <Clock className="w-3 h-3" />
                                  {formule.duration} min
                                </span>
                              )}
                              {formule.numberOfSessions && formule.numberOfSessions > 1 && (
                                <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                                  <Calendar className="w-3 h-3" />
                                  {formule.numberOfSessions} séances
                                </span>
                              )}
                            </div>

                            {/* Objectifs / Activités proposées */}
                            {formule.objectives && formule.objectives.length > 0 && (
                              <div className="mt-3 pt-2 border-t border-gray-200/50">
                                <p className="flex items-center gap-1 text-xs font-medium text-purple-700 mb-1.5">
                                  <Target className="w-3 h-3" />
                                  {isGarde ? "Activités proposées" : "Objectifs de la prestation"}
                                </p>
                                <div className="space-y-1.5">
                                  {formule.objectives.map((objective, idx) => (
                                    <div key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                                      <span className="flex-shrink-0 mt-0.5">{objective.icon}</span>
                                      <span className="leading-relaxed">{objective.text}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Caractéristiques incluses */}
                            {formule.includedFeatures && formule.includedFeatures.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {formule.includedFeatures.map((feature, idx) => (
                                  <span key={idx} className="flex items-center gap-1 text-xs text-green-600">
                                    <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                                    <span>{feature}</span>
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Restrictions chiens (au niveau de la formule) */}
                            {(() => {
                              // Vérifier si cette formule accepte les chiens
                              const formuleAcceptsDogs = formule.animalTypes?.includes("chien") ||
                                (!formule.animalTypes?.length && service.animalTypes?.includes("chien"));
                              if (!formuleAcceptsDogs) return null;

                              const dogSizes = formule.acceptedDogSizes || ["small", "medium", "large"];
                              const dogCategory = formule.dogCategoryAcceptance || "none";
                              const allSizes = dogSizes.length === 3;

                              return (
                                <div className="mt-3 pt-2 border-t border-gray-200/50">
                                  <p className="flex items-center gap-1 text-xs font-medium text-amber-700 mb-1.5">
                                    <span>🐕</span>
                                    Chiens acceptés
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {/* Tailles de chiens acceptées */}
                                    {allSizes ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                        ✓ Toutes tailles
                                      </span>
                                    ) : (
                                      dogSizes.map((size) => (
                                        <span
                                          key={size}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full"
                                        >
                                          {size === "small" ? "Petit (<10kg)" : size === "medium" ? "Moyen (10-25kg)" : "Grand (>25kg)"}
                                        </span>
                                      ))
                                    )}
                                    {/* Catégories de chiens */}
                                    <span className={cn(
                                      "inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full",
                                      dogCategory === "none" && "bg-gray-100 text-gray-600",
                                      dogCategory === "cat1" && "bg-orange-100 text-orange-700",
                                      dogCategory === "cat2" && "bg-orange-100 text-orange-700",
                                      dogCategory === "both" && "bg-green-100 text-green-700"
                                    )}>
                                      {dogCategory === "none" && "Cat. non acceptées"}
                                      {dogCategory === "cat1" && "✓ Cat. 1"}
                                      {dogCategory === "cat2" && "✓ Cat. 2"}
                                      {dogCategory === "both" && "✓ Cat. 1 & 2"}
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}
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
                                {option.name} (+{formatPrice(calculatePriceWithCommission(option.price, commissionRate))}€)
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
