"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { Ticket, Plus, Loader2 } from "lucide-react";
import { TicketCard } from "@/app/components/support";
import { cn } from "@/app/lib/utils";

type TicketStatus = "open" | "in_progress" | "waiting_user" | "resolved" | "closed";

const statusFilters: { value: TicketStatus | "all"; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "open", label: "Nouveaux" },
  { value: "in_progress", label: "En cours" },
  { value: "waiting_user", label: "En attente" },
  { value: "resolved", label: "Résolus" },
  { value: "closed", label: "Fermés" },
];

export default function DashboardTicketsPage() {
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");

  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  const tickets = useQuery(
    api.support.tickets.getMyTickets,
    token
      ? {
          sessionToken: token,
          status: statusFilter === "all" ? undefined : statusFilter,
        }
      : "skip"
  );

  const isLoading = tickets === undefined;

  // Compter les tickets par statut
  const allTickets = useQuery(
    api.support.tickets.getMyTickets,
    token ? { sessionToken: token } : "skip"
  );

  const statusCounts = allTickets?.reduce(
    (acc, ticket) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1;
      acc.all = (acc.all || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Ticket className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mes tickets</h1>
            <p className="text-gray-500 text-sm">
              Historique de vos demandes d'aide
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/tickets/nouveau"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white rounded-full font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nouveau ticket
        </Link>
      </motion.div>

      {/* Filtres */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 overflow-x-auto pb-2"
      >
        {statusFilters.map((filter) => {
          const count = statusCounts?.[filter.value] || 0;
          const isActive = statusFilter === filter.value;

          return (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                isActive
                  ? "bg-primary text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
              )}
            >
              {filter.label}
              {count > 0 && (
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full",
                    isActive ? "bg-white/20" : "bg-gray-100"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </motion.div>

      {/* Liste des tickets */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : tickets && tickets.length > 0 ? (
          <div className="space-y-3">
            {tickets.map((ticket, index) => (
              <motion.div
                key={ticket._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index }}
              >
                <TicketCard
                  ticket={ticket}
                  href={`/dashboard/tickets/${ticket._id}`}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Ticket className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">
              {statusFilter === "all"
                ? "Vous n'avez pas encore créé de ticket"
                : "Aucun ticket avec ce statut"}
            </p>
            <Link
              href="/dashboard/tickets/nouveau"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Créer un ticket
            </Link>
          </div>
        )}
      </motion.div>

      {/* Lien vers aide */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gray-50 rounded-2xl p-5 text-center"
      >
        <p className="text-gray-600 mb-2">
          Consultez d'abord notre centre d'aide
        </p>
        <Link
          href="/dashboard/aide"
          className="text-primary font-medium hover:underline"
        >
          Accéder à la FAQ
        </Link>
      </motion.div>
    </div>
  );
}
