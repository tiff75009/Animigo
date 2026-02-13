"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Wallet, Percent } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/app/hooks/useAuth";
import {
  missionOverlapsMonth,
  isInMonth,
  type AuthorizedPayment,
  type PayoutHistoryItem,
  type CancelledMission,
  type PaymentStats,
} from "./types";
import { RevenueOverview } from "./components/RevenueOverview";
import { NextPayoutBanner } from "./components/NextPayoutBanner";
import { MonthlyBreakdown } from "./components/MonthlyBreakdown";
import { CancellationSummary } from "./components/CancellationSummary";
import { PayoutHistory } from "./components/PayoutHistory";
import { CommissionModal } from "./components/CommissionModal";
import { LoadingSkeleton } from "./components/LoadingSkeleton";

export default function PaiementsPage() {
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const { token, isLoading: authLoading } = useAuth();

  // Queries
  const stats = useQuery(
    api.dashboard.payments.getAnnouncerPaymentStats,
    token ? { sessionToken: token } : "skip"
  ) as PaymentStats | undefined;

  const authorizedPayments = useQuery(
    api.dashboard.payments.getAuthorizedPayments,
    token ? { sessionToken: token } : "skip"
  ) as AuthorizedPayment[] | undefined;

  const payoutHistory = useQuery(
    api.dashboard.payments.getAnnouncerPayoutHistory,
    token ? { sessionToken: token, limit: 12 } : "skip"
  ) as PayoutHistoryItem[] | undefined;

  const cancelledMissions = useQuery(
    api.dashboard.payments.getAnnouncerCancelledMissions,
    token ? { sessionToken: token } : "skip"
  ) as CancelledMission[] | undefined;

  const isLoading = authLoading || stats === undefined;

  // Calculs mensuels
  const monthlyData = useMemo(() => {
    const authorizedList = (authorizedPayments || []) as AuthorizedPayment[];
    const historyList = (payoutHistory || []) as PayoutHistoryItem[];

    const filteredAuthorized = authorizedList.filter((m) =>
      missionOverlapsMonth(m.startDate, m.endDate, selectedMonth)
    );
    const filteredHistory = historyList.filter((p) =>
      isInMonth(new Date(p.date).toISOString(), selectedMonth)
    );

    const confirmed = filteredAuthorized.filter((m) => m.status === "upcoming");
    const inProgress = filteredAuthorized.filter((m) => m.status === "in_progress");
    const toCollect = filteredAuthorized.filter((m) => m.status === "completed");

    return {
      confirmed: confirmed.reduce((sum, m) => sum + m.announcerEarnings, 0),
      confirmedCount: confirmed.length,
      inProgress: inProgress.reduce((sum, m) => sum + m.announcerEarnings, 0),
      inProgressCount: inProgress.length,
      toCollect: toCollect.reduce((sum, m) => sum + m.announcerEarnings, 0),
      toCollectCount: toCollect.length,
      collected: filteredHistory.reduce((sum, p) => sum + p.amount, 0),
      collectedCount: filteredHistory.length,
      authorizedList: filteredAuthorized,
      historyList: filteredHistory,
      // Globaux (non filtrés) pour bannière prochain virement
      totalAvailable: authorizedList
        .filter((m) => m.status === "completed")
        .reduce((sum, m) => sum + m.announcerEarnings, 0),
      totalMissionsCount: authorizedList.filter((m) => m.status === "completed")
        .length,
    };
  }, [authorizedPayments, payoutHistory, selectedMonth]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-primary/10 p-3">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">
              Mes revenus
            </h1>
            <p className="text-text-light">
              Suivez vos paiements et virements
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCommissionModal(true)}
          className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-gray-200"
        >
          <Percent className="h-4 w-4" />
          <span className="hidden sm:inline">Voir les frais</span>
        </button>
      </motion.div>

      {/* 3 grandes cartes hero */}
      <RevenueOverview
        stats={stats!}
        authorizedPayments={authorizedPayments || []}
      />

      {/* Bannière prochain virement */}
      <NextPayoutBanner
        netAmount={monthlyData.totalAvailable}
        missionsCount={monthlyData.totalMissionsCount}
      />

      {/* Sélecteur mois + stats + missions */}
      <MonthlyBreakdown
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        monthlyData={monthlyData}
      />

      {/* Section annulations */}
      {stats && cancelledMissions && (
        <CancellationSummary
          stats={stats}
          cancelledMissions={cancelledMissions}
          selectedMonth={selectedMonth}
        />
      )}

      {/* Historique virements */}
      <PayoutHistory historyList={monthlyData.historyList} />

      {/* Modal Commission */}
      <CommissionModal
        isOpen={showCommissionModal}
        onClose={() => setShowCommissionModal(false)}
        currentAmount={stats?.totalEarned || 0}
      />
    </div>
  );
}
