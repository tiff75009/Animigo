"use client";

import { cn } from "@/app/lib/utils";
import { TicketStatusBadge } from "./TicketStatusBadge";
import { TicketPriorityBadge } from "./TicketPriorityBadge";
import { Clock, MessageSquare, ChevronRight } from "lucide-react";
import Link from "next/link";

interface TicketCardProps {
  ticket: {
    _id: string;
    ticketNumber: string;
    subject: string;
    category: string;
    status: "open" | "in_progress" | "waiting_user" | "resolved" | "closed";
    priority: "low" | "medium" | "high";
    createdAt: number;
    updatedAt: number;
    lastMessagePreview?: string;
    lastMessageAt?: number;
    lastMessageSender?: "user" | "admin";
    unreadCount?: number;
  };
  href: string;
  className?: string;
}

const categoryLabels: Record<string, string> = {
  paiement: "Paiement",
  reservation: "Réservation",
  compte: "Mon compte",
  technique: "Technique",
  signalement: "Signalement",
  autre: "Autre",
};

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days < 7) return `Il y a ${days}j`;
  return new Date(timestamp).toLocaleDateString("fr-FR");
}

export function TicketCard({ ticket, href, className }: TicketCardProps) {
  const hasNewReply = ticket.lastMessageSender === "admin" && ticket.status === "waiting_user";

  return (
    <Link href={href}>
      <div
        className={cn(
          "bg-white rounded-2xl p-4 shadow-sm border border-gray-100",
          "hover:shadow-md hover:border-primary/20 transition-all duration-200",
          "cursor-pointer",
          hasNewReply && "ring-2 ring-primary/20",
          className
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Header avec numéro et badges */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-xs text-gray-500 font-mono">
                {ticket.ticketNumber}
              </span>
              <TicketStatusBadge status={ticket.status} />
              <TicketPriorityBadge priority={ticket.priority} showIcon={false} />
            </div>

            {/* Sujet */}
            <h3 className="font-semibold text-foreground truncate mb-1">
              {ticket.subject}
            </h3>

            {/* Catégorie */}
            <p className="text-sm text-gray-500 mb-2">
              {categoryLabels[ticket.category] || ticket.category}
            </p>

            {/* Dernier message */}
            {ticket.lastMessagePreview && (
              <p className="text-sm text-gray-600 line-clamp-1">
                {ticket.lastMessageSender === "admin" && (
                  <span className="text-primary font-medium">Support: </span>
                )}
                {ticket.lastMessagePreview}
              </p>
            )}

            {/* Footer avec dates */}
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatRelativeTime(ticket.updatedAt)}
              </span>
              {ticket.unreadCount !== undefined && ticket.unreadCount > 0 && (
                <span className="flex items-center gap-1 text-primary">
                  <MessageSquare className="w-3 h-3" />
                  {ticket.unreadCount} nouveau(x)
                </span>
              )}
            </div>
          </div>

          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-2" />
        </div>
      </div>
    </Link>
  );
}
