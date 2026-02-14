"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarClock,
  History,
  Banknote,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import type { PayoutDetail, NextPayoutInfo } from "../types";
import { formatPrice, formatTimestamp } from "../types";

interface PayoutSectionProps {
  nextPayout: NextPayoutInfo | null;
  payoutHistory: PayoutDetail[];
}

function PayoutCard({ payout }: { payout: PayoutDetail }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full",
              payout.status === "completed" ? "bg-green-100" : "bg-amber-100"
            )}
          >
            <Banknote
              className={cn(
                "h-4 w-4",
                payout.status === "completed"
                  ? "text-green-600"
                  : "text-amber-600"
              )}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {payout.status === "completed"
                ? "Virement reçu"
                : "En traitement"}
            </p>
            <p className="text-xs text-gray-500">
              {formatTimestamp(payout.date)} · {payout.missionsCount} mission
              {payout.missionsCount > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-base font-bold",
              payout.status === "completed"
                ? "text-green-600"
                : "text-amber-600"
            )}
          >
            +{formatPrice(payout.amount)}
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-100 bg-gray-50/50 px-4 py-3"
          >
            <div className="space-y-1.5 text-sm">
              {payout.grossAmount !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Montant brut</span>
                  <span>{formatPrice(payout.grossAmount)}</span>
                </div>
              )}
              {payout.commissionAmount !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Commission</span>
                  <span className="text-red-500">
                    -{formatPrice(payout.commissionAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-1.5 font-semibold">
                <span>Net reçu</span>
                <span className="text-green-600">
                  {formatPrice(payout.amount)}
                </span>
              </div>
              {payout.missionNames.length > 0 && (
                <div className="mt-2 border-t border-gray-200 pt-2">
                  <p className="text-xs text-gray-400 mb-1">Missions :</p>
                  <ul className="space-y-0.5">
                    {payout.missionNames.map((name, i) => (
                      <li key={i} className="text-xs text-gray-500">
                        · {name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PayoutSection({
  nextPayout,
  payoutHistory,
}: PayoutSectionProps) {
  const nextPayoutDate = nextPayout
    ? new Date(nextPayout.scheduledDate)
    : null;
  const daysUntil = nextPayoutDate
    ? Math.ceil(
        (nextPayoutDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-4"
    >
      {/* Bannière prochain virement */}
      {nextPayout && nextPayout.amount > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-secondary p-5 text-white shadow-lg shadow-primary/15">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white" />
            <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white" />
          </div>

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                <CalendarClock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/80">
                  Prochain virement
                </p>
                <p className="text-lg font-bold capitalize">
                  {nextPayoutDate!.toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold backdrop-blur">
                    {daysUntil <= 0
                      ? "Aujourd'hui"
                      : daysUntil === 1
                        ? "Demain"
                        : `Dans ${daysUntil} jours`}
                  </span>
                  <span className="text-sm text-white/70">
                    {nextPayout.missionsCount} mission
                    {nextPayout.missionsCount > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm text-white/70">Vous recevrez</p>
              <p className="text-3xl font-bold">
                {formatPrice(nextPayout.amount)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Historique */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            Historique des virements
          </h2>
        </div>

        {payoutHistory.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-gray-500">Aucun virement effectué</p>
          </div>
        ) : (
          <div className="space-y-2">
            {payoutHistory.map((payout) => (
              <PayoutCard key={payout.id} payout={payout} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
