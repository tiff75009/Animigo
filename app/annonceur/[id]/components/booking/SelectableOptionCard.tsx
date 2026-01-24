"use client";

import { Check, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/app/lib/utils";
import type { OptionData } from "../types";
import { formatPriceWithCommission } from "./pricing";

interface SelectableOptionCardProps {
  option: OptionData;
  isSelected: boolean;
  commissionRate: number;
  onToggle: () => void;
  showSuggestPulse?: boolean;
  animationDelay?: number;
}

export default function SelectableOptionCard({
  option,
  isSelected,
  commissionRate,
  onToggle,
  showSuggestPulse = false,
  animationDelay = 0,
}: SelectableOptionCardProps) {
  return (
    <motion.button
      initial={showSuggestPulse ? { opacity: 0.9, y: 3 } : false}
      animate={showSuggestPulse ? {
        opacity: 1,
        y: 0,
      } : { opacity: 1, y: 0 }}
      transition={{
        opacity: { duration: 0.3, delay: animationDelay },
        y: { duration: 0.3, delay: animationDelay },
      }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onToggle}
      className={cn(
        "w-full flex items-center justify-between p-4 rounded-xl transition-all text-left relative overflow-hidden",
        "border-2",
        isSelected
          ? "border-secondary bg-secondary/5 ring-2 ring-secondary/20"
          : showSuggestPulse
            ? "border-secondary/20 bg-gradient-to-r from-gray-50 to-secondary/5 hover:bg-secondary/10 hover:border-secondary/40"
            : "border-gray-100 bg-gray-50 hover:bg-gray-100 hover:border-gray-200"
      )}
    >
      {/* Subtle shimmer effect when suggesting */}
      {showSuggestPulse && !isSelected && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-secondary/10 to-transparent -skew-x-12"
          initial={{ x: "-100%" }}
          animate={{ x: "200%" }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            delay: animationDelay + 1,
            ease: "easeInOut",
            repeatDelay: 4,
          }}
        />
      )}
      <div className="flex items-center gap-3 flex-1 min-w-0 relative z-10">
        <motion.div
          animate={{
            backgroundColor: isSelected ? "rgb(78, 205, 196)" : "rgb(243, 244, 246)",
            borderColor: isSelected ? "rgb(78, 205, 196)" : "rgb(209, 213, 219)",
          }}
          className={cn(
            "w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0",
            isSelected ? "bg-secondary border-secondary" : "bg-gray-100 border-gray-300"
          )}
        >
          {isSelected ? (
            <Check className="w-4 h-4 text-white" />
          ) : (
            <Plus className="w-4 h-4 text-gray-400" />
          )}
        </motion.div>
        <div className="min-w-0">
          <p className={cn(
            "font-medium",
            isSelected ? "text-secondary" : "text-gray-900"
          )}>
            {option.name}
          </p>
          {option.description && (
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{option.description}</p>
          )}
        </div>
      </div>
      <div className="text-right flex-shrink-0 ml-3 relative z-10">
        <p className={cn(
          "font-bold",
          isSelected ? "text-secondary" : "text-secondary"
        )}>
          +{formatPriceWithCommission(option.price, commissionRate)}€
        </p>
      </div>
    </motion.button>
  );
}
