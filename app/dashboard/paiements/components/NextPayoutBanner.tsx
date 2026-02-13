"use client";

import { motion } from "framer-motion";
import { CalendarClock } from "lucide-react";
import { formatPrice, getNextPayoutDate } from "../types";

export function NextPayoutBanner({
  netAmount,
  missionsCount,
}: {
  netAmount: number;
  missionsCount: number;
}) {
  const { formatted, daysUntil } = getNextPayoutDate();

  if (netAmount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-secondary p-5 text-white shadow-xl shadow-primary/20"
    >
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white" />
      </div>

      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
            <CalendarClock className="h-7 w-7" />
          </div>
          <div>
            <p className="text-sm font-medium text-white/80">
              Prochain virement
            </p>
            <p className="text-lg font-bold capitalize">{formatted}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold backdrop-blur">
                {daysUntil === 0
                  ? "Aujourd'hui"
                  : daysUntil === 1
                    ? "Demain"
                    : `Dans ${daysUntil} jours`}
              </span>
              <span className="text-sm text-white/70">
                {missionsCount} mission{missionsCount > 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-white/70">Vous recevrez</p>
            <p className="text-3xl font-bold">{formatPrice(netAmount)}</p>
            <p className="text-xs text-white/60">commission d&eacute;j&agrave; d&eacute;duite</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
