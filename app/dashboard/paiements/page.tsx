"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Wallet } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/app/hooks/useAuth";
import type { AnnouncerPaymentsData, PaymentTab } from "./types";
import { LoadingSkeleton } from "./components/LoadingSkeleton";
import { CommissionInfo } from "./components/CommissionInfo";
import { RevenueCards } from "./components/RevenueCards";
import { ProVatSummary } from "./components/ProVatSummary";
import { MonthlyChart } from "./components/MonthlyChart";
import { MissionTabs } from "./components/MissionTabs";
import { MissionList } from "./components/MissionList";
import { PayoutSection } from "./components/PayoutSection";
import { StripeBalanceWidget } from "./components/StripeBalanceWidget";

export default function PaiementsPage() {
  const [activeTab, setActiveTab] = useState<PaymentTab>("paid");
  const { token, isLoading: authLoading } = useAuth();

  const data = useQuery(
    api.dashboard.payments.getAnnouncerPaymentsData,
    token ? { sessionToken: token } : "skip"
  ) as AnnouncerPaymentsData | undefined;

  if (authLoading || !data) {
    return <LoadingSkeleton />;
  }

  const activeMissions = data.missionsByStatus[activeTab];

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-primary/10 p-3">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">
              Mes revenus
            </h1>
            <p className="text-sm text-gray-500">
              Suivez vos paiements et virements
            </p>
          </div>
        </div>
        <CommissionInfo userInfo={data.userInfo} />
      </motion.div>

      {/* Revenue Cards */}
      <RevenueCards
        stats={data.stats}
        monthlyRevenue={data.monthlyRevenue}
        annualRevenue={data.annualRevenue}
        currentMonth={data.currentMonth}
        userInfo={data.userInfo}
      />

      {/* Section TVA (pros assujettis uniquement) */}
      {data.userInfo.isVatSubject && (
        <ProVatSummary
          stats={data.stats}
          monthlyRevenue={data.monthlyRevenue}
          currentMonth={data.currentMonth}
        />
      )}

      {/* Graphique CA mensuel */}
      <MonthlyChart
        monthlyRevenue={data.monthlyRevenue}
        userInfo={data.userInfo}
        selectedYear={data.selectedYear}
      />

      {/* Onglets missions */}
      <MissionTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        missionsByStatus={data.missionsByStatus}
      />

      {/* Liste des missions */}
      <MissionList
        missions={activeMissions}
        tab={activeTab}
        isPro={data.userInfo.isVatSubject}
      />

      {/* Solde Stripe Connect (live depuis Stripe API) */}
      <StripeBalanceWidget token={token} />

      {/* Section virements */}
      <PayoutSection
        nextPayout={data.nextPayout}
        payoutHistory={data.payoutHistory}
      />
    </div>
  );
}
