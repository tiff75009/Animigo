"use client";

import { cn } from "@/app/lib/utils";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color: "primary" | "secondary" | "accent" | "purple" | "green" | "red";
  details?: { label: string; value: string }[];
}

const colorClasses = {
  primary: {
    bg: "bg-primary/10",
    text: "text-primary",
    iconBg: "bg-primary",
  },
  secondary: {
    bg: "bg-secondary/10",
    text: "text-secondary",
    iconBg: "bg-secondary",
  },
  accent: {
    bg: "bg-accent/20",
    text: "text-foreground",
    iconBg: "bg-accent",
  },
  purple: {
    bg: "bg-purple/10",
    text: "text-purple",
    iconBg: "bg-purple",
  },
  green: {
    bg: "bg-green-100",
    text: "text-green-600",
    iconBg: "bg-green-500",
  },
  red: {
    bg: "bg-red-100",
    text: "text-red-600",
    iconBg: "bg-red-500",
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  details,
}: StatCardProps) {
  const colors = colorClasses[color];

  return (
    <motion.div
      className="bg-white rounded-2xl p-6 shadow-lg"
      whileHover={{ y: -4, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.1)" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-3 rounded-xl", colors.bg)}>
          <Icon className={cn("w-6 h-6", colors.text)} />
        </div>
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-white",
            colors.iconBg
          )}
        >
          <span className="text-lg font-bold">{typeof value === "number" ? value : ""}</span>
        </div>
      </div>

      <h3 className="text-sm font-medium text-text-light mb-1">{title}</h3>
      <p className={cn("text-2xl font-bold", colors.text)}>{value}</p>
      {subtitle && <p className="text-sm text-text-light mt-1">{subtitle}</p>}

      {details && details.length > 0 && (
        <div className="mt-4 pt-4 border-t border-foreground/10 space-y-2">
          {details.map((detail, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-text-light">{detail.label}</span>
              <span className="font-semibold text-foreground">{detail.value}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

interface MiniStatProps {
  label: string;
  value: number;
  icon: LucideIcon;
  color: "primary" | "secondary" | "accent" | "purple" | "green" | "red";
  href?: string;
}

export function MiniStat({ label, value, icon: Icon, color }: MiniStatProps) {
  const colors = colorClasses[color];

  return (
    <motion.div
      className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-md"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className={cn("p-2 rounded-lg", colors.bg)}>
        <Icon className={cn("w-5 h-5", colors.text)} />
      </div>
      <div>
        <p className="text-xs text-text-light">{label}</p>
        <p className={cn("text-lg font-bold", colors.text)}>{value}</p>
      </div>
    </motion.div>
  );
}
