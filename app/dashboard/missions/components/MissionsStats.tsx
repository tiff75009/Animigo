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

interface StatConfig {
  countIcon: typeof Calendar;
  countLabel: string;
  // Couleur d'accent (palette sobre)
  accent: string;
  pastelBg: string;
  pastelBorder: string;
  amountLabel: string;
  showPaid?: boolean;
}

const statsConfig: Record<MissionTab, StatConfig> = {
  pending_acceptance: {
    countIcon: HelpCircle,
    countLabel: "En attente",
    accent: "#c9a14a",
    pastelBg: "#fdf8ec",
    pastelBorder: "#f4e6c1",
    amountLabel: "Revenus potentiels",
  },
  pending_confirmation: {
    countIcon: Clock,
    countLabel: "En attente",
    accent: "#d97f3a",
    pastelBg: "#fdf0e6",
    pastelBorder: "#f4d6bc",
    amountLabel: "Montant potentiel",
  },
  upcoming: {
    countIcon: Calendar,
    countLabel: "À venir",
    accent: "#1f3a33",
    pastelBg: "#f5f9f6",
    pastelBorder: "#cfdbd3",
    amountLabel: "Revenus prévus",
  },
  in_progress: {
    countIcon: CalendarClock,
    countLabel: "En cours",
    accent: "#3a72c4",
    pastelBg: "#eaf0fd",
    pastelBorder: "#c8d6f0",
    amountLabel: "Montant total",
  },
  completed: {
    countIcon: CheckCircle,
    countLabel: "Terminées",
    accent: "#5a8a6e",
    pastelBg: "#f0f5f0",
    pastelBorder: "#d3ddd3",
    amountLabel: "Total gagné",
    showPaid: true,
  },
  refused: {
    countIcon: XCircle,
    countLabel: "Refusées",
    accent: "#c45656",
    pastelBg: "#fdf0f0",
    pastelBorder: "#f1cdcd",
    amountLabel: "Montant refusé",
  },
  cancelled: {
    countIcon: Ban,
    countLabel: "Annulées",
    accent: "#9c9484",
    pastelBg: "#f7f5ef",
    pastelBorder: "#ece9e1",
    amountLabel: "Montant perdu",
  },
};

export function MissionsStats({ tab, count, totalAmount, paidAmount = 0 }: MissionsStatsProps) {
  if (count === 0) return null;

  const pendingAmount = totalAmount - paidAmount;
  const config = statsConfig[tab];
  const Icon = config.countIcon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={`grid gap-3 ${config.showPaid ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2"}`}
    >
      {/* Count */}
      <StatCard
        icon={<Icon className="w-4 h-4" style={{ color: config.accent }} />}
        iconBg={config.pastelBg}
        iconBorder={config.pastelBorder}
        label={config.countLabel}
        value={String(count)}
        valueColor="#1f1f1d"
      />

      {/* Total */}
      <StatCard
        icon={<TrendingUp className="w-4 h-4" style={{ color: "#1f3a33" }} />}
        iconBg="#f5f9f6"
        iconBorder="#cfdbd3"
        label={config.amountLabel}
        value={formatCurrency(totalAmount)}
        valueColor="#1f3a33"
      />

      {/* Paid (only completed) */}
      {config.showPaid && (
        <>
          <StatCard
            icon={<Euro className="w-4 h-4" style={{ color: "#1f3a33" }} />}
            iconBg="#f5f9f6"
            iconBorder="#cfdbd3"
            label="Encaissé"
            value={formatCurrency(paidAmount)}
            valueColor="#1f3a33"
          />
          <StatCard
            icon={<Euro className="w-4 h-4" style={{ color: "#d97f3a" }} />}
            iconBg="#fdf0e6"
            iconBorder="#f4d6bc"
            label="À encaisser"
            value={formatCurrency(pendingAmount)}
            valueColor="#7a4a1a"
          />
        </>
      )}
    </motion.div>
  );
}

function StatCard({
  icon,
  iconBg,
  iconBorder,
  label,
  value,
  valueColor,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconBorder: string;
  label: string;
  value: string;
  valueColor: string;
}) {
  return (
    <div
      className="bg-white p-3"
      style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg, border: `1px solid ${iconBorder}` }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.1em] m-0" style={{ color: "#9c9484" }}>
            {label}
          </p>
          <p
            className="text-[18px] font-semibold tracking-[-0.02em] m-0 truncate"
            style={{ color: valueColor }}
          >
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}
