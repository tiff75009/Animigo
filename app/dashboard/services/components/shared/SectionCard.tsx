"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface SectionCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: "primary" | "secondary" | "accent" | "purple";
  children: React.ReactNode;
  className?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
    variant?: "primary" | "secondary" | "ghost";
  };
}

const iconColors = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary",
  accent: "bg-accent/20 text-amber-600",
  purple: "bg-purple/10 text-purple",
};

const buttonVariants = {
  primary: "bg-primary text-white hover:bg-primary/90",
  secondary: "bg-secondary text-white hover:bg-secondary/90",
  ghost: "bg-foreground/5 text-foreground hover:bg-foreground/10",
};

export default function SectionCard({
  title,
  description,
  icon: Icon,
  iconColor = "primary",
  children,
  className,
  action,
}: SectionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "bg-white rounded-2xl p-6 shadow-sm border border-foreground/5",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={cn("p-2.5 rounded-xl", iconColors[iconColor])}>
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            {description && (
              <p className="text-sm text-text-light mt-0.5">{description}</p>
            )}
          </div>
        </div>

        {action && (
          <motion.button
            onClick={action.onClick}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
              buttonVariants[action.variant || "ghost"]
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {action.icon && <action.icon className="w-4 h-4" />}
            {action.label}
          </motion.button>
        )}
      </div>

      {/* Content */}
      <div>{children}</div>
    </motion.div>
  );
}
