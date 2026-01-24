"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/app/lib/utils";
import type { FormuleData } from "../types";
import { formatPriceWithCommission, getFormuleBestPrice } from "./pricing";

interface SelectableFormuleCardProps {
  formule: FormuleData;
  isSelected: boolean;
  isGarde: boolean;
  commissionRate: number;
  onSelect: () => void;
  showAttentionPulse?: boolean;
  animationDelay?: number;
}

export default function SelectableFormuleCard({
  formule,
  isSelected,
  isGarde,
  commissionRate,
  onSelect,
  showAttentionPulse = false,
  animationDelay = 0,
}: SelectableFormuleCardProps) {
  const { price: formulePrice, unit: formuleUnit } = getFormuleBestPrice(formule, isGarde);

  return (
    <motion.button
      initial={showAttentionPulse ? { opacity: 0.8, y: 5 } : false}
      animate={showAttentionPulse ? {
        opacity: 1,
        y: 0,
        scale: [1, 1.01, 1],
      } : { opacity: 1, y: 0 }}
      transition={{
        opacity: { duration: 0.3, delay: animationDelay },
        y: { duration: 0.3, delay: animationDelay },
        scale: {
          duration: 1.5,
          repeat: Infinity,
          delay: animationDelay + 0.5,
          ease: "easeInOut"
        },
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.99 }}
      onClick={onSelect}
      className={cn(
        "w-full flex items-center justify-between p-4 rounded-xl transition-all text-left relative overflow-hidden",
        "border-2",
        isSelected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : showAttentionPulse
            ? "border-primary/30 bg-gradient-to-r from-gray-50 to-primary/5 hover:bg-primary/10 hover:border-primary/50"
            : "border-gray-100 bg-gray-50 hover:bg-gray-100 hover:border-gray-200"
      )}
    >
      {/* Shimmer effect when attention pulse is active */}
      {showAttentionPulse && !isSelected && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12"
          initial={{ x: "-100%" }}
          animate={{ x: "200%" }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: animationDelay + 1,
            ease: "easeInOut",
            repeatDelay: 3,
          }}
        />
      )}
      <div className="flex-1 min-w-0 pr-3 relative z-10">
        <div className="flex items-center gap-2">
          <p className={cn(
            "font-semibold",
            isSelected ? "text-primary" : "text-gray-900"
          )}>
            {formule.name}
          </p>
          {isSelected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-5 h-5 bg-primary rounded-full flex items-center justify-center flex-shrink-0"
            >
              <Check className="w-3 h-3 text-white" />
            </motion.div>
          )}
        </div>
        {formule.description && (
          <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{formule.description}</p>
        )}
        {formule.duration && (
          <p className="text-xs text-gray-400 mt-1">{formule.duration} min</p>
        )}
      </div>
      <div className="text-right flex-shrink-0 relative z-10">
        <p className={cn(
          "text-lg font-bold",
          isSelected ? "text-primary" : "text-primary"
        )}>
          {formatPriceWithCommission(formulePrice, commissionRate)}€
          {formuleUnit && <span className="text-sm font-medium text-gray-500">/{formuleUnit}</span>}
        </p>
      </div>
    </motion.button>
  );
}
