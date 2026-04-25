"use client";

import { ChevronLeft, ArrowRight } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface StepNavProps {
  onPrevStep: () => void;
  onNextStep?: () => void;
  canProceed?: boolean;
  showNext?: boolean;
  nextLabel?: string;
  className?: string;
}

export default function StepNav({
  onPrevStep,
  onNextStep,
  canProceed = true,
  showNext = true,
  nextLabel = "Continuer",
  className,
}: StepNavProps) {
  return (
    <div className={cn("flex items-center justify-between mt-5", className)}>
      <button
        type="button"
        onClick={onPrevStep}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium text-[#6d6d68] hover:text-[#1f1f1d] hover:bg-[#f7f5ef] transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Précédent
      </button>
      {showNext && onNextStep && (
        <button
          type="button"
          onClick={onNextStep}
          disabled={!canProceed}
          className={cn(
            "inline-flex items-center gap-2 px-5 py-2 rounded-full text-[13px] font-medium transition-all",
            canProceed
              ? "hover:opacity-90 active:scale-[0.97]"
              : "cursor-not-allowed"
          )}
          style={
            canProceed
              ? { background: "#1f3a33", color: "#f7f5ef" }
              : { background: "#ece9e1", color: "#9c9484" }
          }
        >
          {nextLabel}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
