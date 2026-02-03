"use client";

import { cn } from "@/app/lib/utils";

type TicketStatus = "open" | "in_progress" | "waiting_user" | "resolved" | "closed";

interface TicketStatusBadgeProps {
  status: TicketStatus;
  className?: string;
}

const statusConfig: Record<TicketStatus, { label: string; className: string }> = {
  open: {
    label: "Nouveau",
    className: "bg-orange-100 text-orange-700 border-orange-200",
  },
  in_progress: {
    label: "En cours",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  waiting_user: {
    label: "En attente",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  resolved: {
    label: "Résolu",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  closed: {
    label: "Fermé",
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
};

export function TicketStatusBadge({ status, className }: TicketStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
