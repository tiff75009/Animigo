"use client";

import { motion, AnimatePresence } from "framer-motion";
import { LucideIcon, AlertCircle } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface FormFieldProps {
  label: string;
  name: string;
  type?: "text" | "textarea" | "number" | "select";
  placeholder?: string;
  helperText?: string;
  error?: string;
  maxLength?: number;
  showCharCount?: boolean;
  icon?: LucideIcon;
  required?: boolean;
  value: string | number;
  onChange: (value: string | number) => void;
  options?: { value: string; label: string }[];
  rows?: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

export default function FormField({
  label,
  name,
  type = "text",
  placeholder,
  helperText,
  error,
  maxLength,
  showCharCount,
  icon: Icon,
  required,
  value,
  onChange,
  options,
  rows = 3,
  min,
  max,
  step,
  disabled,
  className,
}: FormFieldProps) {
  const charCount = typeof value === "string" ? value.length : 0;
  const hasError = !!error;

  const baseInputStyles = cn(
    "w-full px-4 py-3 rounded-xl border-2 transition-all duration-200",
    "bg-white text-foreground placeholder:text-text-light/50",
    "focus:outline-none focus:ring-0",
    hasError
      ? "border-red-300 focus:border-red-500"
      : "border-foreground/10 focus:border-primary",
    Icon && "pl-11",
    disabled && "opacity-50 cursor-not-allowed bg-foreground/5"
  );

  const renderInput = () => {
    if (type === "textarea") {
      return (
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={rows}
          disabled={disabled}
          className={cn(baseInputStyles, "resize-none")}
        />
      );
    }

    if (type === "select" && options) {
      return (
        <select
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={baseInputStyles}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) =>
          onChange(type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)
        }
        placeholder={placeholder}
        maxLength={maxLength}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={baseInputStyles}
      />
    );
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Label */}
      <div className="flex items-center justify-between">
        <label
          htmlFor={name}
          className="text-sm font-medium text-foreground flex items-center gap-1"
        >
          {label}
          {required && <span className="text-primary">*</span>}
        </label>
        {showCharCount && maxLength && (
          <span
            className={cn(
              "text-xs",
              charCount > maxLength * 0.9 ? "text-amber-500" : "text-text-light"
            )}
          >
            {charCount}/{maxLength}
          </span>
        )}
      </div>

      {/* Input wrapper */}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light" />
        )}
        {renderInput()}
      </div>

      {/* Helper text or error */}
      <AnimatePresence mode="wait">
        {error ? (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-xs text-red-500 flex items-center gap-1"
          >
            <AlertCircle className="w-3 h-3" />
            {error}
          </motion.p>
        ) : helperText ? (
          <motion.p
            key="helper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-text-light"
          >
            {helperText}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
