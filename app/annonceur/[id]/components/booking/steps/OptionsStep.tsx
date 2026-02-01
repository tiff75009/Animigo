"use client";

import { Plus, ChevronLeft, Eye, CreditCard, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/app/lib/utils";
import SelectableOptionCard from "../SelectableOptionCard";
import type { OptionData } from "../../types";

interface OptionsStepProps {
  // Options
  options: OptionData[];
  selectedOptionIds: string[];
  onOptionToggle?: (optionId: string) => void;
  commissionRate: number;

  // Navigation
  onPrevStep: () => void;
  isLastStep: boolean;

  // Callbacks de finalisation
  onBook?: () => void;
  onFinalize?: () => void;

  // Animation
  slideVariants: Record<string, { x: number; opacity: number }>;
  slideDirection: "left" | "right";
}

export default function OptionsStep({
  options,
  selectedOptionIds,
  onOptionToggle,
  commissionRate,
  onPrevStep,
  isLastStep,
  onBook,
  onFinalize,
  slideVariants,
  slideDirection,
}: OptionsStepProps) {
  return (
    <motion.div
      key="options"
      initial={slideDirection === "right" ? "enterFromRight" : "enterFromLeft"}
      animate="center"
      exit={slideDirection === "right" ? "exitToLeft" : "exitToRight"}
      variants={slideVariants}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
          <span className="p-2 bg-purple-100 rounded-lg">
            <Plus className="w-5 h-5 text-purple-600" />
          </span>
          Options supplémentaires
        </h3>

        {options.length > 0 ? (
          <div className="space-y-3">
            {options.map((option) => (
              <SelectableOptionCard
                key={option.id.toString()}
                option={option}
                isSelected={selectedOptionIds.includes(option.id.toString())}
                onToggle={() => onOptionToggle?.(option.id.toString())}
                commissionRate={commissionRate}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">
            Aucune option disponible pour cette prestation.
          </p>
        )}
      </div>

      {/* Bouton Précédent */}
      <div className="mt-6">
        <button
          onClick={onPrevStep}
          className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Précédent
        </button>
      </div>

      {/* Boutons de finalisation */}
      {(onBook || onFinalize) && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
          {/* Bouton principal - Vérifier la réservation */}
          {onBook && (
            <button
              onClick={onBook}
              className="py-2 px-4 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 bg-primary text-white hover:bg-primary/90"
            >
              <Eye className="w-4 h-4" />
              Vérifier la réservation
            </button>
          )}

          {/* Bouton secondaire - Finaliser directement */}
          {onFinalize && (
            <button
              onClick={onFinalize}
              className="py-2 px-4 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 border border-secondary text-secondary hover:bg-secondary/10"
            >
              <CreditCard className="w-4 h-4" />
              Finaliser
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
