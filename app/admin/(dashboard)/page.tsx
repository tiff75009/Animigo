"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import AdminDashboardSkeleton from "./components/home/AdminDashboardSkeleton";
import AdminHeader from "./components/home/AdminHeader";
import KpiCards from "./components/home/KpiCards";
import ModerationAlerts from "./components/home/ModerationAlerts";
import FinancialOverview from "./components/home/FinancialOverview";
import MissionPipeline from "./components/home/MissionPipeline";
import RecentActivity from "./components/home/RecentActivity";
import SupportSummary from "./components/home/SupportSummary";
import AdminQuickActions from "./components/home/AdminQuickActions";
import OnlineDevelopers from "./components/home/OnlineDevelopers";

export default function AdminDashboardPage() {
  const { token } = useAdminAuth();
  const data = useQuery(
    api.admin.stats.getAdminDashboardOverview,
    token ? { token } : "skip"
  );
  const onlineDevs = useQuery(
    api.admin.devPresence.getOnlineDevs,
    token ? { token } : "skip"
  );

  if (!data) return <AdminDashboardSkeleton />;

  return (
    <div className="p-8 space-y-6">
      <AdminHeader adminName={data.adminName} />

      <KpiCards kpis={data.kpis} />

      <ModerationAlerts moderation={data.moderation} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Colonne gauche */}
        <div className="lg:col-span-7 space-y-6">
          <FinancialOverview financial={data.financial} />
          <MissionPipeline missions={data.missions} />
        </div>

        {/* Colonne droite */}
        <div className="lg:col-span-5 space-y-6">
          <RecentActivity recentActivity={data.recentActivity} />
          <SupportSummary
            support={data.support}
            openDisputes={data.moderation.openDisputes}
          />
        </div>
      </div>

      <AdminQuickActions />

      <OnlineDevelopers onlineDevs={onlineDevs} />
    </div>
  );
}
