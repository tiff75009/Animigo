"use client";

import { cn } from "@/app/lib/utils";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({
  checked,
  onChange,
  label,
  error,
  disabled,
  className,
}: CheckboxProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <label
        className={cn(
          "flex items-start gap-3 cursor-pointer group",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <motion.button
          type="button"
          onClick={() => !disabled && onChange(!checked)}
          className={cn(
            "w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors",
            checked
              ? "bg-primary border-primary"
              : "border-foreground/20 group-hover:border-primary/50"
          )}
          whileTap={{ scale: 0.9 }}
          disabled={disabled}
        >
          <motion.div
            initial={false}
            animate={{
              scale: checked ? 1 : 0,
              opacity: checked ? 1 : 0,
            }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
          </motion.div>
        </motion.button>
        {label && (
          <span className="text-sm text-foreground leading-relaxed">
            {label}
          </span>
        )}
      </label>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-500 flex items-center gap-1 ml-8"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {error}
        </motion.p>
      )}
    </div>
  );
}
