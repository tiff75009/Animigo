"use client";

import { Check, Package } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface ServiceOption {
  id: string;
  name: string;
  description?: string;
  price: number;
  priceType?: string;
}

interface OptionsStepProps {
  options: ServiceOption[];
  selectedOptionIds: string[];
  onToggleOption: (optionId: string) => void;
}

// Helper function
function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

export default function OptionsStep({
  options,
  selectedOptionIds,
  onToggleOption,
}: OptionsStepProps) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <h2 className="text-lg font-bold text-foreground mb-4">
        Options supplémentaires
      </h2>

      {options.length === 0 ? (
        <div className="text-center py-8 text-text-light">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucune option disponible pour ce service</p>
        </div>
      ) : (
        <div className="space-y-3">
          {options.map((option) => {
            const isSelected = selectedOptionIds.includes(option.id);
            return (
              <button
                key={option.id}
                onClick={() => onToggleOption(option.id)}
                className={cn(
                  "w-full p-4 rounded-xl border-2 transition-all text-left",
                  isSelected
                    ? "border-secondary bg-secondary/5"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{option.name}</p>
                    {option.description && (
                      <p className="text-sm text-text-light mt-0.5">
                        {option.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <span className="font-bold text-secondary whitespace-nowrap">
                      +{formatPrice(option.price)}
                    </span>
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                        isSelected
                          ? "border-secondary bg-secondary"
                          : "border-gray-300"
                      )}
                    >
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Info */}
      <p className="text-xs text-text-light text-center mt-4">
        Les options sont facultatives et peuvent être modifiées avant la confirmation
      </p>
    </div>
  );
}

export type { ServiceOption };
