"use client";

import { cn } from "@/app/lib/utils";
import { AlertCircle, AlertTriangle, MinusCircle } from "lucide-react";

type TicketPriority = "low" | "medium" | "high";

interface TicketPriorityBadgeProps {
  priority: TicketPriority;
  showIcon?: boolean;
  className?: string;
}

const priorityConfig: Record<TicketPriority, {
  label: string;
  className: string;
  Icon: typeof AlertCircle;
}> = {
  low: {
    label: "Basse",
    className: "bg-gray-100 text-gray-600",
    Icon: MinusCircle,
  },
  medium: {
    label: "Moyenne",
    className: "bg-yellow-100 text-yellow-700",
    Icon: AlertTriangle,
  },
  high: {
    label: "Haute",
    className: "bg-red-100 text-red-700",
    Icon: AlertCircle,
  },
};

export function TicketPriorityBadge({
  priority,
  showIcon = true,
  className
}: TicketPriorityBadgeProps) {
  const config = priorityConfig[priority];
  const Icon = config.Icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
        config.className,
        className
      )}
    >
      {showIcon && <Icon className="w-3 h-3" />}
      {config.label}
    </span>
  );
}
