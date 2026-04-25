"use client";

import { ReactNode } from "react";
import { cn } from "@/app/lib/utils";

interface StepCardProps {
  children: ReactNode;
  className?: string;
  highlighted?: boolean;
  tone?: "default" | "warning" | "success" | "danger";
}

/**
 * Conteneur standardisé pour les étapes du wizard.
 * Style aligné sur les cards de résultats de recherche :
 * - bordure fine `#ece9e1`
 * - radius 14px
 * - padding interne 18px
 * - shadow douce uniquement si highlighted
 */
export default function StepCard({
  children,
  className,
  highlighted = false,
  tone = "default",
}: StepCardProps) {
  const borderColor =
    tone === "warning"
      ? "#f4e6c1"
      : tone === "success"
        ? "#cfdbd3"
        : tone === "danger"
          ? "#f1cdcd"
          : "#ece9e1";

  return (
    <div
      className={cn("bg-white p-[18px] sm:p-5", className)}
      style={{
        borderRadius: 14,
        border: `1px solid ${borderColor}`,
        boxShadow: highlighted
          ? "0 10px 30px rgba(30,30,28,0.06)"
          : "none",
      }}
    >
      {children}
    </div>
  );
}

interface StepHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  rightSlot?: ReactNode;
  className?: string;
}

/**
 * En-tête standardisé d'une étape :
 * - eyebrow uppercase tracking-wider couleur muted (#9c9484)
 * - titre semi-bold #1f1f1d
 * - description fine #6d6d68
 */
export function StepHeader({
  eyebrow,
  title,
  description,
  rightSlot,
  className,
}: StepHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-4", className)}>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-1">
          {eyebrow}
        </div>
        <h3 className="text-base font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
          {title}
        </h3>
        {description && (
          <p className="text-[13px] text-[#6d6d68] leading-[1.5] mt-1">
            {description}
          </p>
        )}
      </div>
      {rightSlot && <div className="flex-shrink-0">{rightSlot}</div>}
    </div>
  );
}
