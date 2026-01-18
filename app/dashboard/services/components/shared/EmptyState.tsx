"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col items-center justify-center py-12 px-6 text-center",
        className
      )}
    >
      <div className="p-4 bg-foreground/5 rounded-full mb-4">
        <Icon className="w-12 h-12 text-foreground/30" />
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-text-light max-w-sm mb-6">{description}</p>

      {action && (
        <motion.button
          onClick={action.onClick}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-medium"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {action.icon && <action.icon className="w-5 h-5" />}
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
}
