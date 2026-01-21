"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  ArrowRight,
  Check,
} from "lucide-react";
import { cn } from "@/app/lib/utils";

// Types
interface ServiceVariant {
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
}

interface ServiceDetail {
  id: string;
  category: string;
  categoryName: string;
  categoryIcon?: string;
  animalTypes: string[];
  allowOvernightStay?: boolean;
  dayStartTime?: string;
  dayEndTime?: string;
  overnightPrice?: number;
  variants: ServiceVariant[];
  options: Array<{ id: string; name: string; price: number }>;
}

interface FormulasDropdownProps {
  announcerId: string;
  isOpen: boolean;
  onToggle: () => void;
  searchFilters?: {
    category?: { slug: string; name: string } | null;
    date?: string | null;
    endDate?: string | null;
  };
}

// Format price
function formatPrice(cents: number): string {
  return (cents / 100).toFixed(0) + "€";
}

// Price unit labels
const priceUnitLabels: Record<string, string> = {
  hour: "/h",
  day: "/jour",
  week: "/sem",
  month: "/mois",
  flat: "",
};

export default function FormulasDropdown({
  announcerId,
  isOpen,
  onToggle,
  searchFilters,
}: FormulasDropdownProps) {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch services
  const serviceDetails = useQuery(
    api.public.search.getAnnouncerServiceDetails,
    isOpen ? { announcerId: announcerId as Id<"users"> } : "skip"
  );

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        if (isOpen) onToggle();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onToggle]);

  // Filter services by category if specified
  const filteredServices = serviceDetails?.filter((service: ServiceDetail) => {
    if (!searchFilters?.category) return true;
    return service.category === searchFilters.category.slug;
  }) || [];

  // Handle booking redirect
  const handleBookVariant = (serviceId: string, variantId: string) => {
    const params = new URLSearchParams();
    params.set("service", serviceId);
    params.set("variant", variantId);
    if (searchFilters?.date) params.set("date", searchFilters.date);
    if (searchFilters?.endDate) params.set("endDate", searchFilters.endDate);

    router.push(`/reserver/${announcerId}?${params.toString()}`);
  };

  // Get display price for variant
  const getVariantDisplayPrice = (variant: ServiceVariant) => {
    const pricing = variant.pricing;
    if (pricing?.daily) return { price: pricing.daily, unit: "/jour" };
    if (pricing?.hourly) return { price: pricing.hourly, unit: "/h" };
    if (pricing?.weekly) return { price: pricing.weekly, unit: "/sem" };
    if (pricing?.monthly) return { price: pricing.monthly, unit: "/mois" };
    return { price: variant.price, unit: priceUnitLabels[variant.priceUnit] || "" };
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Toggle Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={cn(
          "flex items-center gap-1 text-xs font-medium transition-colors",
          isOpen
            ? "text-primary"
            : "text-primary/80 hover:text-primary"
        )}
      >
        {isOpen ? "Masquer" : "Voir les formules"}
        {isOpen ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Dropdown Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 right-0 top-full mt-2 z-50"
            style={{ minWidth: "280px" }}
          >
            <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
              {/* Loading State */}
              {!serviceDetails && (
                <div className="p-6 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-text-light">Chargement...</span>
                </div>
              )}

              {/* No Services */}
              {serviceDetails && filteredServices.length === 0 && (
                <div className="p-4 text-center text-sm text-text-light">
                  Aucune formule disponible
                </div>
              )}

              {/* Services List */}
              {filteredServices.length > 0 && (
                <div className="max-h-[400px] overflow-y-auto">
                  {filteredServices.map((service: ServiceDetail, index: number) => (
                    <div
                      key={service.id}
                      className={cn(
                        "p-3",
                        index > 0 && "border-t border-gray-100"
                      )}
                    >
                      {/* Service Header */}
                      <div className="flex items-center gap-2 mb-2">
                        {service.categoryIcon && (
                          <span className="text-base">{service.categoryIcon}</span>
                        )}
                        <span className="text-sm font-semibold text-foreground">
                          {service.categoryName}
                        </span>
                      </div>

                      {/* Variants */}
                      <div className="space-y-2">
                        {service.variants.map((variant) => {
                          const displayPrice = getVariantDisplayPrice(variant);
                          return (
                            <div
                              key={variant.id}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {variant.name}
                                </p>
                                {variant.includedFeatures && variant.includedFeatures.length > 0 && (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <Check className="w-3 h-3 text-secondary flex-shrink-0" />
                                    <span className="text-xs text-text-light truncate">
                                      {variant.includedFeatures[0]}
                                      {variant.includedFeatures.length > 1 && ` +${variant.includedFeatures.length - 1}`}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 ml-2">
                                <span className="text-sm font-bold text-primary whitespace-nowrap">
                                  {formatPrice(displayPrice.price)}
                                  <span className="text-xs font-normal text-text-light">
                                    {displayPrice.unit}
                                  </span>
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBookVariant(service.id, variant.id);
                                  }}
                                  className="p-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                                  title="Réserver"
                                >
                                  <ArrowRight className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Options preview */}
                      {service.options.length > 0 && (
                        <p className="text-xs text-text-light mt-2">
                          +{service.options.length} option{service.options.length > 1 ? "s" : ""} disponible{service.options.length > 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* View All Link */}
              {filteredServices.length > 0 && (
                <div className="p-2 border-t border-gray-100 bg-gray-50">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/reserver/${announcerId}`);
                    }}
                    className="w-full py-2 text-xs text-center text-primary font-medium hover:underline"
                  >
                    Voir toutes les formules et réserver
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
