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

      <StepNav onPrevStep={onPrevStep} showNext={false} />

      {/* Boutons de finalisation - cohérent avec les cards de recherche */}
      {(onBook || onFinalize) && (
        <div
          className="mt-5 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5"
          style={{ borderTop: "1px solid #f1ede3" }}
        >
          {/* Bouton secondaire - Vérifier (outline) */}
          {onBook && (
            <button
              type="button"
              onClick={onBook}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-medium transition-colors hover:bg-[#f7f5ef]"
              style={{
                background: "#fff",
                border: "1px solid #1f3a33",
                color: "#1f3a33",
              }}
            >
              <Eye className="w-3.5 h-3.5" />
              Vérifier la réservation
            </button>
          )}

          {/* Bouton principal - Finaliser (dark green plein) */}
          {onFinalize && (
            <button
              type="button"
              onClick={onFinalize}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-medium transition-opacity hover:opacity-90 active:scale-[0.98]"
              style={{ background: "#1f3a33", color: "#f7f5ef" }}
            >
              <CreditCard className="w-3.5 h-3.5" />
              Finaliser la réservation
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
