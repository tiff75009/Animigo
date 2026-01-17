"use client";

import { motion } from "framer-motion";
import { cn } from "@/app/lib/utils";
import { Check } from "lucide-react";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <div key={step} className="flex items-center">
            <motion.div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                step < currentStep
                  ? "bg-primary text-white"
                  : step === currentStep
                    ? "bg-primary text-white"
                    : "bg-foreground/10 text-text-light"
              )}
              initial={false}
              animate={{
                scale: step === currentStep ? 1.1 : 1,
              }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              {step < currentStep ? (
                <Check className="w-4 h-4" />
              ) : (
                step
              )}
            </motion.div>
            {step < totalSteps && (
              <div
                className={cn(
                  "w-8 h-0.5 transition-colors",
                  step < currentStep ? "bg-primary" : "bg-foreground/10"
                )}
              />
            )}
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-text-light mt-3">
        Étape {currentStep} sur {totalSteps}
      </p>
    </div>
  );
}
