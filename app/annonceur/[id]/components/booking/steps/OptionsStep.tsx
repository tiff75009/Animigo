"use client";

import { Eye, CreditCard, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import SelectableOptionCard from "../SelectableOptionCard";
import StepNav from "./StepNav";
import StepCard, { StepHeader } from "./StepCard";
import type { OptionData } from "../../types";

interface OptionsStepProps {
  // Options
  options: OptionData[];
  selectedOptionIds: string[];
  onOptionToggle?: (optionId: string) => void;
  commissionRate: number;

  // Navigation
  onPrevStep: () => void;
  onNextStep?: () => void;
  isLastStep: boolean;

  // Callbacks de finalisation (legacy — wizard intégré utilise onNextStep)
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
  onNextStep,
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
      <StepCard>
        <StepHeader
          eyebrow="Étape · Options"
          title="Options supplémentaires"
          description="Personnalisez votre réservation."
        />

        {options.length > 0 ? (
          <div className="space-y-2">
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
          <p className="text-[13px] text-[#9c9484] text-center py-4">
            Aucune option disponible pour cette prestation.
          </p>
        )}
      </StepCard>

      {/* Bouton "Continuer" → passe à l'étape Récapitulatif (wizard intégré) */}
      <StepNav
        onPrevStep={onPrevStep}
        onNextStep={onNextStep}
        canProceed
        showNext={Boolean(onNextStep)}
        nextLabel="Voir le récapitulatif"
      />
    </motion.div>
  );
}
