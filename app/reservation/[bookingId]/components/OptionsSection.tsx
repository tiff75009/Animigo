"use client";

import { motion } from "framer-motion";
import { Plus, Check } from "lucide-react";
import { formatPrice } from "../utils";
import type { ServiceOption } from "../types";

interface OptionsSectionProps {
  availableOptions: ServiceOption[];
  selectedOptionIds: string[];
  toggleOption: (optionId: string) => void;
}

export default function OptionsSection({
  availableOptions,
  selectedOptionIds,
  toggleOption,
}: OptionsSectionProps) {
  if (!availableOptions || availableOptions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-white rounded-2xl shadow-sm overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" />
          Options supplémentaires
        </h2>
        <p className="text-sm text-text-light mt-1">
          Personnalisez votre prestation avec des services additionnels
        </p>
      </div>
      <div className="p-6">
        <div className="space-y-3">
          {availableOptions.map((option) => {
            const isSelected = selectedOptionIds.includes(option.id);
            return (
              <div
                key={option.id}
                onClick={() => toggleOption(option.id)}
                className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                    isSelected
                      ? "bg-primary text-white"
                      : "border-2 border-gray-300"
                  }`}
                >
                  {isSelected && <Check className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-medium text-foreground">
                      {option.name}
                    </h4>
                    <span className="text-primary font-semibold whitespace-nowrap">
                      +{formatPrice(option.price)}
                      {option.priceUnit && (
                        <span className="text-xs text-text-light font-normal">
                          /{option.priceUnit}
                        </span>
                      )}
                    </span>
                  </div>
                  {option.description && (
                    <p className="text-sm text-text-light mt-1">
                      {option.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
