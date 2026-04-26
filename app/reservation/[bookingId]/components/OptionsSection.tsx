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
      className="bg-white p-[18px]"
      style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
    >
      <div className="mb-4 flex items-start gap-2.5">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "#fcfaf4", border: "1px solid #ece9e1" }}
        >
          <Plus className="w-4 h-4" style={{ color: "#1f3a33" }} />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484]">
            Section · Personnalisation (optionnel)
          </div>
          <h2 className="text-base font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
            Options supplémentaires
          </h2>
          <p className="text-[12px] text-[#6d6d68] mt-0.5">
            Ajoutez des prestations additionnelles à votre réservation
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {availableOptions.map((option) => {
          const isSelected = selectedOptionIds.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => toggleOption(option.id)}
              className="w-full flex items-start gap-3 p-3 text-left transition-all hover:bg-[#fafafa]"
              style={{
                borderRadius: 12,
                background: isSelected ? "#f5f9f6" : "#fff",
                border: `1px solid ${isSelected ? "#1f3a33" : "#dfdcd4"}`,
              }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors"
                style={{
                  background: isSelected ? "#1f3a33" : "#fff",
                  border: `1px solid ${isSelected ? "#1f3a33" : "#dfdcd4"}`,
                  color: "#fff",
                }}
              >
                {isSelected && <Check className="w-3 h-3" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-[13.5px] font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
                    {option.name}
                  </h4>
                  <span
                    className="text-[12.5px] font-semibold whitespace-nowrap"
                    style={{ color: "#1f3a33" }}
                  >
                    +{formatPrice(option.price)}
                    {option.priceUnit && (
                      <span className="text-[10.5px] font-normal" style={{ color: "#9c9484" }}>
                        /{option.priceUnit}
                      </span>
                    )}
                  </span>
                </div>
                {option.description && (
                  <p className="text-[12px] mt-0.5 leading-[1.5]" style={{ color: "#6d6d68" }}>
                    {option.description}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
