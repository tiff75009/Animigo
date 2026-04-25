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
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
      onClick={onToggle}
      className="w-full flex items-center justify-between p-3 text-left relative overflow-hidden transition-all"
      style={{
        borderRadius: 12,
        border: `1px solid ${isSelected ? "#1f3a33" : "#ece9e1"}`,
        background: isSelected ? "#f5f9f6" : "#fff",
      }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0 relative z-10">
        <div
          className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
          style={{
            background: isSelected ? "#1f3a33" : "#fff",
            border: `1px solid ${isSelected ? "#1f3a33" : "#dfdcd4"}`,
          }}
        >
          {isSelected ? (
            <Check className="w-3.5 h-3.5 text-white" />
          ) : (
            <Plus className="w-3 h-3" style={{ color: "#9c9484" }} />
          )}
        </div>
        <div className="min-w-0">
          <p
            className="text-[13.5px] font-semibold tracking-[-0.01em]"
            style={{ color: isSelected ? "#1f3a33" : "#1f1f1d" }}
          >
            {option.name}
          </p>
          {option.description && (
            <p className="text-[12px] text-[#6d6d68] mt-0.5 line-clamp-2 leading-[1.45]">
              {option.description}
            </p>
          )}
        </div>
      </div>
      <div className="text-right flex-shrink-0 ml-3 relative z-10">
        <p className="text-[13.5px] font-semibold text-[#1f1f1d]">
          +{formatPriceWithCommission(option.price, commissionRate)}€
        </p>
      </div>
    </motion.button>
  );
}
