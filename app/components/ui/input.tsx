"use client";

import { cn } from "@/app/lib/utils";
import { motion } from "framer-motion";
import { forwardRef, useState } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, icon, type = "text", ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <motion.div
          animate={{
            borderColor: error
              ? "rgb(239, 68, 68)"
              : isFocused
                ? "var(--primary)"
                : "rgba(0, 0, 0, 0.1)",
            boxShadow: isFocused
              ? error
                ? "0 0 0 3px rgba(239, 68, 68, 0.1)"
                : "0 0 0 3px rgba(255, 107, 107, 0.1)"
              : "none",
          }}
          transition={{ duration: 0.2 }}
          className="relative rounded-xl border-2 bg-white"
        >
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light">
              {icon}
            </div>
          )}
          <input
            type={type}
            ref={ref}
            className={cn(
              "w-full px-4 py-3 rounded-xl bg-transparent text-foreground placeholder:text-text-light/60",
              "focus:outline-none transition-all",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              icon && "pl-12",
              className
            )}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />
        </motion.div>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-red-500 flex items-center gap-1"
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
);

Input.displayName = "Input";

export { Input };
