"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
  onStepClick?: (step: number) => void;
}

export default function StepIndicator({
  currentStep,
  totalSteps,
  labels,
  onStepClick,
}: StepIndicatorProps) {
  const handleStepClick = (stepNum: number) => {
    // On peut seulement cliquer sur les étapes complétées (pour revenir en arrière)
    if (onStepClick && stepNum < currentStep) {
      onStepClick(stepNum);
    }
  };

  return (
    <div className="mb-6">
      {/* Steps */}
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNum = index + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;
          const isClickable = isCompleted && onStepClick;
          return (
            <div key={index} className="flex items-center">
              <motion.button
                type="button"
                onClick={() => handleStepClick(stepNum)}
                disabled={!isClickable}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
                  isActive && "bg-primary text-white",
                  isCompleted && "bg-secondary text-white",
                  !isActive && !isCompleted && "bg-gray-200 text-gray-500",
                  isClickable && "cursor-pointer hover:ring-2 hover:ring-secondary/50 hover:scale-105",
                  !isClickable && "cursor-default"
                )}
                animate={{ scale: isActive ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
              </motion.button>
              {index < totalSteps - 1 && (
                <div
                  className={cn(
                    "w-8 h-1 mx-1 rounded transition-colors",
                    stepNum < currentStep ? "bg-secondary" : "bg-gray-200"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Labels */}
      {labels && labels.length > 0 && (
        <div className="flex justify-center mt-2">
          <span className="text-sm text-text-light">
            {labels[currentStep - 1]}
          </span>
        </div>
      )}
    </div>
  );
}
