"use client";

import { Check } from "lucide-react";
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

interface FormulaStepProps {
  services: ServiceDetail[];
  selectedServiceId: string;
  selectedVariantId: string;
  onSelect: (serviceId: string, variantId: string) => void;
}

// Helper function
function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

export default function FormulaStep({
  services,
  selectedServiceId,
  selectedVariantId,
  onSelect,
}: FormulaStepProps) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <h2 className="text-lg font-bold text-foreground mb-4">
        Choisissez une formule
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
                const displayPrice =
                  pricing?.daily || pricing?.hourly || variant.price;
                const priceUnit = pricing?.daily
                  ? "/jour"
                  : pricing?.hourly
                    ? "/h"
                    : "";

                return (
                  <button
                    key={variant.id}
                    onClick={() => onSelect(service.id, variant.id)}
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
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export type { ServiceDetail, ServiceVariant };
