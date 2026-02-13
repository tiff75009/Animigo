"use client";

import { motion } from "framer-motion";
import {
  Calendar,
  CreditCard,
  BadgeCheck,
  Sparkles,
  PiggyBank,
  Coins,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { formatPrice, type AuthorizedPayment, type PayoutHistoryItem } from "../types";
import { MonthSelector } from "./MonthSelector";
import { MissionPaymentCard } from "./MissionPaymentCard";

function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  amount,
  count,
  countLabel,
  valueColor,
}: {
  icon: any;
  iconBg: string;
  iconColor: string;
  label: string;
  amount: number;
  count: number;
  countLabel: string;
  valueColor: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <div className={cn("rounded-lg p-1.5", iconBg)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
        <span className="text-xs font-medium text-text-light">{label}</span>
      </div>
      <p className={cn("text-2xl font-bold", valueColor)}>
        {formatPrice(amount)}
      </p>
      <p className="mt-1 text-xs text-text-light">
        {count} {countLabel}
      </p>
    </div>
  );
}

interface MonthlyData {
  confirmed: number;
  confirmedCount: number;
  inProgress: number;
  inProgressCount: number;
  toCollect: number;
  toCollectCount: number;
  collected: number;
  collectedCount: number;
  authorizedList: AuthorizedPayment[];
  historyList: PayoutHistoryItem[];
}

export function MonthlyBreakdown({
  selectedMonth,
  onMonthChange,
  monthlyData,
}: {
  selectedMonth: string;
  onMonthChange: (value: string) => void;
  monthlyData: MonthlyData;
}) {
  const sortedMissions = [...monthlyData.authorizedList].sort(
    (a, b) =>
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  return (
    <>
      {/* Selecteur de mois */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex justify-center"
      >
        <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm">
          <Calendar className="h-5 w-5 text-primary" />
          <MonthSelector value={selectedMonth} onChange={onMonthChange} />
        </div>
      </motion.div>

      {/* Stats Cards - 4 categories */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <StatCard
          icon={BadgeCheck}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          label="Confirm\u00E9"
          amount={monthlyData.confirmed}
          count={monthlyData.confirmedCount}
          countLabel={monthlyData.confirmedCount > 1 ? "missions" : "mission"}
          valueColor="text-blue-600"
        />
        <StatCard
          icon={Sparkles}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          label="En cours"
          amount={monthlyData.inProgress}
          count={monthlyData.inProgressCount}
          countLabel={monthlyData.inProgressCount > 1 ? "missions" : "mission"}
          valueColor="text-amber-600"
        />
        <StatCard
          icon={PiggyBank}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          label="\u00C0 encaisser"
          amount={monthlyData.toCollect}
          count={monthlyData.toCollectCount}
          countLabel={monthlyData.toCollectCount > 1 ? "missions" : "mission"}
          valueColor="text-purple-600"
        />
        <StatCard
          icon={Coins}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          label="Encaiss\u00E9"
          amount={monthlyData.collected}
          count={monthlyData.collectedCount}
          countLabel={
            monthlyData.collectedCount > 1 ? "virements" : "virement"
          }
          valueColor="text-green-600"
        />
      </motion.div>

      {/* Missions du mois */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <CreditCard className="h-5 w-5 text-primary" />
            Missions du mois
            {sortedMissions.length > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-sm font-semibold text-primary">
                {sortedMissions.length}
              </span>
            )}
          </h2>
        </div>

        {sortedMissions.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="font-semibold text-foreground">
              Aucune mission ce mois
            </h3>
            <p className="mt-1 text-sm text-text-light">
              S&eacute;lectionnez un autre mois ou attendez de nouvelles r&eacute;servations
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedMissions.map((mission, index) => (
              <motion.div
                key={mission.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <MissionPaymentCard mission={mission} />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </>
  );
}
