"use client";

import { motion } from "framer-motion";
import {
  Euro,
  Calendar,
  TrendingUp,
  HelpCircle,
  Clock,
  CalendarClock,
  CheckCircle,
  XCircle,
  Ban,
} from "lucide-react";
import type { MissionTab } from "./MissionsTabs";

interface MissionsStatsProps {
  tab: MissionTab;
  count: number;
  totalAmount: number;
  paidAmount?: number;
}

function formatCurrency(amountInCents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  }).format(amountInCents / 100);
}

export function MissionsStats({ tab, count, totalAmount, paidAmount = 0 }: MissionsStatsProps) {
  if (count === 0) return null;

  const pendingAmount = totalAmount - paidAmount;

  // Configuration par onglet
  const statsConfig: Record<MissionTab, {
    countIcon: typeof Calendar;
    countLabel: string;
    countColor: string;
    countBg: string;
    amountLabel: string;
    amountColor: string;
    showPaid?: boolean;
  }> = {
    pending_acceptance: {
      countIcon: HelpCircle,
      countLabel: "En attente",
      countColor: "text-foreground",
      countBg: "bg-accent/20",
      amountLabel: "Revenus potentiels",
      amountColor: "text-secondary",
    },
    pending_confirmation: {
      countIcon: Clock,
      countLabel: "En attente",
      countColor: "text-orange-600",
      countBg: "bg-orange-100",
      amountLabel: "Montant potentiel",
      amountColor: "text-primary",
    },
    upcoming: {
      countIcon: Calendar,
      countLabel: "À venir",
      countColor: "text-purple",
      countBg: "bg-purple/20",
      amountLabel: "Revenus prévus",
      amountColor: "text-primary",
    },
    in_progress: {
      countIcon: CalendarClock,
      countLabel: "En cours",
      countColor: "text-blue-600",
      countBg: "bg-blue-100",
      amountLabel: "Montant total",
      amountColor: "text-primary",
    },
    completed: {
      countIcon: CheckCircle,
      countLabel: "Terminées",
      countColor: "text-green-600",
      countBg: "bg-green-100",
      amountLabel: "Total gagné",
      amountColor: "text-primary",
      showPaid: true,
    },
    refused: {
      countIcon: XCircle,
      countLabel: "Refusées",
      countColor: "text-red-600",
      countBg: "bg-red-100",
      amountLabel: "Montant refusé",
      amountColor: "text-gray-500",
    },
    cancelled: {
      countIcon: Ban,
      countLabel: "Annulées",
      countColor: "text-gray-600",
      countBg: "bg-gray-100",
      amountLabel: "Montant perdu",
      amountColor: "text-gray-500",
    },
  };

  const config = statsConfig[tab];
  const Icon = config.countIcon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={`grid gap-4 ${config.showPaid ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2"}`}
    >
      {/* Count */}
      <div className="bg-white rounded-2xl p-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className={`p-2 ${config.countBg} rounded-xl`}>
            <Icon className={`w-5 h-5 ${config.countColor}`} />
          </div>
          <div>
            <p className="text-sm text-text-light">{config.countLabel}</p>
            <p className="text-2xl font-bold text-foreground">{count}</p>
          </div>
        </div>
      </div>

      {/* Total amount */}
      <div className="bg-white rounded-2xl p-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-text-light">{config.amountLabel}</p>
            <p className={`text-2xl font-bold ${config.amountColor}`}>
              {formatCurrency(totalAmount)}
            </p>
          </div>
        </div>
      </div>

      {/* Paid amount (only for completed) */}
      {config.showPaid && (
        <>
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-xl">
                <Euro className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-text-light">Encaissé</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(paidAmount)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-xl">
                <Euro className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-text-light">À encaisser</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(pendingAmount)}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
