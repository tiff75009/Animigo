"use client";

import Link from "next/link";
import { ArrowRight, LifeBuoy } from "lucide-react";
import { TicketStatusBadge } from "@/app/components/support/TicketStatusBadge";
import { TicketPriorityBadge } from "@/app/components/support/TicketPriorityBadge";

interface Ticket {
  _id: string;
  ticketNumber: string;
  subject: string;
  status: "open" | "in_progress" | "waiting_user" | "resolved" | "closed";
  priority: "low" | "medium" | "high";
  updatedAt: number;
}

interface OpenTicketsProps {
  tickets: Ticket[] | undefined;
  isLoading: boolean;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `${minutes} min`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}j`;
  return new Date(timestamp).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function OpenTickets({ tickets, isLoading }: OpenTicketsProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
        <div className="h-5 w-28 rounded bg-gray-200 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="p-3 bg-gray-50 rounded-xl space-y-2">
              <div className="h-4 w-36 rounded bg-gray-200" />
              <div className="h-3 w-24 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Filtrer : seuls les tickets actifs
  const activeTickets = (tickets ?? [])
    .filter((t) => ["open", "in_progress", "waiting_user"].includes(t.status))
    .slice(0, 3);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Tickets ouverts
        </h3>
        <Link
          href="/dashboard/tickets"
          className="text-primary text-sm font-medium flex items-center gap-1 hover:underline"
        >
          Tous
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {activeTickets.length === 0 ? (
        <div className="text-center py-6 text-text-light">
          <LifeBuoy className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucun ticket ouvert</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeTickets.map((ticket) => (
            <Link key={ticket._id} href={`/dashboard/tickets/${ticket._id}`}>
              <div className="p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {ticket.subject}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <TicketStatusBadge status={ticket.status} />
                      <TicketPriorityBadge priority={ticket.priority} showIcon={false} />
                    </div>
                  </div>
                  <span className="text-xs text-text-light flex-shrink-0">
                    {formatRelativeTime(ticket.updatedAt)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
