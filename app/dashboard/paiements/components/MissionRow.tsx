"use client";

import { motion } from "framer-motion";
import { cn } from "@/app/lib/utils";
import type { MissionDetail, PaymentTab } from "../types";
import { formatPrice, formatDateShort, formatTimestampShort } from "../types";

interface MissionRowProps {
  mission: MissionDetail;
  tab: PaymentTab;
  isPro: boolean;
  index: number;
}

function StatusBadge({ mission, tab }: { mission: MissionDetail; tab: PaymentTab }) {
  if (tab === "cancelled") {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
        Annulé{mission.cancelledBy === "client" ? " par le client" : ""}
      </span>
    );
  }
  if (tab === "completed") {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
          mission.readyForPayout
            ? "bg-purple-50 text-purple-600"
            : mission.announcerPaymentStatus === "paid"
              ? "bg-green-50 text-green-600"
              : "bg-gray-100 text-gray-600"
        )}
      >
        {mission.readyForPayout
          ? "Prêt au virement"
          : mission.announcerPaymentStatus === "paid"
            ? "Versé"
            : "Terminé"}
      </span>
    );
  }
  if (tab === "paid") {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
        {mission.status === "in_progress" ? "En cours" : "À venir"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-600">
      En attente de paiement
    </span>
  );
}

export function MissionRow({ mission, tab, isPro, index }: MissionRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="rounded-2xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Ligne principale */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="mt-0.5 text-2xl flex-shrink-0">
            {mission.animal?.emoji || "🐾"}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-foreground">
              {mission.serviceName}
            </h3>
            <p className="text-xs text-gray-500">
              {mission.animal?.name} · {mission.clientName}
            </p>
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <p
            className={cn(
              "text-lg font-bold",
              tab === "cancelled" ? "text-gray-400 line-through" : "text-green-600"
            )}
          >
            {tab !== "cancelled" ? "+" : ""}
            {formatPrice(mission.announcerEarnings)}
          </p>
        </div>
      </div>

      {/* Dates */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
        {mission.bookedAt && (
          <span>Réservé le {formatTimestampShort(mission.bookedAt)}</span>
        )}
        {mission.paidAt && (
          <>
            <span className="text-gray-300">·</span>
            <span>Payé le {formatTimestampShort(mission.paidAt)}</span>
          </>
        )}
        {tab === "completed" && mission.completedAt && (
          <>
            <span className="text-gray-300">·</span>
            <span>Terminé le {formatTimestampShort(mission.completedAt)}</span>
          </>
        )}
        {tab === "cancelled" && mission.cancelledAt && (
          <>
            <span className="text-gray-300">·</span>
            <span>Annulé le {formatTimestampShort(mission.cancelledAt)}</span>
          </>
        )}
      </div>

      {/* Période + horaire */}
      <div className="mt-1.5 text-xs font-medium text-foreground">
        {formatDateShort(mission.startDate)}
        {mission.startDate !== mission.endDate &&
          ` → ${formatDateShort(mission.endDate)}`}
        {mission.startTime && mission.endTime && (
          <span className="ml-2 text-gray-400">
            {mission.startTime} - {mission.endTime}
          </span>
        )}
      </div>

      {/* Détails financiers */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-gray-100 pt-2.5 text-[11px] text-gray-400">
        <span>Prestation : {formatPrice(mission.serviceAmount)}</span>
        <span>Commission : {formatPrice(mission.platformFee)}</span>
        {mission.stripeFee > 0 && (
          <span>Frais : {formatPrice(mission.stripeFee)}</span>
        )}
        {isPro && mission.vatAmount > 0 && (
          <>
            <span className="text-gray-300">|</span>
            <span className="text-indigo-500">
              HT {formatPrice(mission.earningsHT)} · TVA {formatPrice(mission.vatAmount)}
            </span>
          </>
        )}
      </div>

      {/* Annulation : détails supplémentaires */}
      {tab === "cancelled" && (
        <div className="mt-2 space-y-1 rounded-xl bg-red-50/50 p-2.5 text-xs">
          {mission.cancellationReason && (
            <p className="text-red-600">
              Motif : {mission.cancellationReason}
            </p>
          )}
          {mission.announcerRetainedAmount > 0 && (
            <p className="font-medium text-green-600">
              Montant conservé : {formatPrice(mission.announcerRetainedAmount)}
            </p>
          )}
          {mission.refundAmount !== undefined && mission.refundAmount > 0 && (
            <p className="text-gray-500">
              Remboursé au client : {formatPrice(mission.refundAmount)}
            </p>
          )}
        </div>
      )}

      {/* Badge statut */}
      <div className="mt-2.5 flex items-center justify-end">
        <StatusBadge mission={mission} tab={tab} />
      </div>
    </motion.div>
  );
}
