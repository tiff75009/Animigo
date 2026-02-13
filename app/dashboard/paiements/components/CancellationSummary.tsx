"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserX, XCircle, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { cn } from "@/app/lib/utils";
import {
  formatPrice,
  formatDateShort,
  missionOverlapsMonth,
  type CancelledMission,
  type PaymentStats,
} from "../types";

export function CancellationSummary({
  stats,
  cancelledMissions,
  selectedMonth,
}: {
  stats: PaymentStats;
  cancelledMissions: CancelledMission[];
  selectedMonth: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const totalCancellations =
    stats.cancelledByClientCount + stats.cancelledByAnnouncerCount;

  if (totalCancellations === 0) return null;

  // Filtrer les annulations du mois
  const monthlyCancelled = cancelledMissions.filter((m) =>
    missionOverlapsMonth(m.startDate, m.endDate, selectedMonth)
  );

  const monthlyByClient = monthlyCancelled.filter(
    (m) => m.cancelledBy === "client"
  );
  const monthlyByAnnouncer = monthlyCancelled.filter(
    (m) => m.cancelledBy === "announcer" || m.cancelledBy === "system"
  );

  const monthlyClientRetained = monthlyByClient.reduce(
    (sum, m) => sum + m.announcerRetainedAmount,
    0
  );
  const monthlyClientLost = monthlyByClient.reduce(
    (sum, m) => sum + m.announcerEarnings - m.announcerRetainedAmount,
    0
  );
  const monthlyAnnouncerLost = monthlyByAnnouncer.reduce(
    (sum, m) => sum + m.announcerEarnings,
    0
  );

  if (monthlyCancelled.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
    >
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <h2 className="text-lg font-bold text-foreground">Annulations</h2>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-sm font-semibold text-amber-700">
          {monthlyCancelled.length}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Annulations client */}
        {monthlyByClient.length > 0 && (
          <div className="rounded-2xl border-2 border-amber-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                <UserX className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  Annulations client
                </p>
                <p className="text-xs text-text-light">
                  {monthlyByClient.length} annulation
                  {monthlyByClient.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {monthlyClientRetained > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-light">
                    Montant retenu
                  </span>
                  <span className="font-semibold text-green-600">
                    +{formatPrice(monthlyClientRetained)}
                  </span>
                </div>
              )}
              {monthlyClientLost > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-light">
                    Montant perdu
                  </span>
                  <span className="font-semibold text-gray-400">
                    -{formatPrice(monthlyClientLost)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Vos annulations */}
        {monthlyByAnnouncer.length > 0 && (
          <div className="rounded-2xl border-2 border-red-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Vos annulations</p>
                <p className="text-xs text-text-light">
                  {monthlyByAnnouncer.length} annulation
                  {monthlyByAnnouncer.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-light">
                  Montant total perdu
                </span>
                <span className="font-semibold text-red-600">
                  -{formatPrice(monthlyAnnouncerLost)}
                </span>
              </div>
              <p className="text-xs text-text-light italic">
                Remboursement int&eacute;gral au client
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Accordeon detail */}
      {monthlyCancelled.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100 bg-white">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-gray-50"
          >
            <span className="text-sm font-semibold text-foreground">
              D&eacute;tail des annulations
            </span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-text-light" />
            ) : (
              <ChevronDown className="h-4 w-4 text-text-light" />
            )}
          </button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-gray-100"
              >
                <div className="divide-y divide-gray-50">
                  {monthlyCancelled.map((mission) => (
                    <div
                      key={mission.id}
                      className="flex items-center justify-between px-5 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">
                          {mission.animal?.emoji || "\uD83D\uDC3E"}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {mission.serviceName}
                          </p>
                          <p className="text-xs text-text-light">
                            {mission.clientName} &bull;{" "}
                            {formatDateShort(mission.startDate)}
                            {mission.startDate !== mission.endDate &&
                              ` - ${formatDateShort(mission.endDate)}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={cn(
                            "text-xs font-medium rounded-full px-2 py-0.5",
                            mission.cancelledBy === "client"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                          )}
                        >
                          {mission.cancelledBy === "client"
                            ? "Par le client"
                            : "Par vous"}
                        </span>
                        <p
                          className={cn(
                            "mt-1 text-sm font-semibold",
                            mission.announcerRetainedAmount > 0
                              ? "text-green-600"
                              : "text-red-500"
                          )}
                        >
                          {mission.announcerRetainedAmount > 0
                            ? `+${formatPrice(mission.announcerRetainedAmount)}`
                            : `-${formatPrice(mission.announcerEarnings)}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
