"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/app/hooks/useAuth";
import { useConversations } from "@/app/hooks/useMessaging";
import RegularityBanner from "./components/RegularityBanner";
import { DashboardSkeleton } from "./components/home/DashboardSkeleton";
import { WelcomeHeader } from "./components/home/WelcomeHeader";
import { VerificationBadge } from "./components/home/VerificationBadge";
import { ProfileCompletion } from "./components/home/ProfileCompletion";
import { NextPayout } from "./components/home/NextPayout";
import { RevenueCards } from "./components/home/RevenueCards";
import { StatCards } from "./components/home/StatCards";
import { UpcomingMissions } from "./components/home/UpcomingMissions";
import { RevenueSparkline } from "./components/home/RevenueSparkline";
import { TopServices } from "./components/home/TopServices";
import { RecentMessages } from "./components/home/RecentMessages";
import { ReviewSummary } from "./components/home/ReviewSummary";
import { PerformanceKPIs } from "./components/home/PerformanceKPIs";
import { OpenTickets } from "./components/home/OpenTickets";
import { QuickShortcuts } from "./components/home/QuickShortcuts";

export default function DashboardPage() {
  const { user, token } = useAuth();

  // ── Queries Convex en parallèle ──
  const dashboardStats = useQuery(
    api.planning.missions.getAnnouncerDashboardStats,
    token ? { token } : "skip"
  );

  const { conversations, totalUnread, isLoading: isLoadingConversations } = useConversations(token);

  const tickets = useQuery(
    api.support.tickets.getMyTickets,
    token ? { sessionToken: token } : "skip"
  );

  const topServicesData = useQuery(
    api.planning.missions.getAnnouncerTopServices,
    token ? { token } : "skip"
  );

  const extras = useQuery(
    api.dashboard.extras.getAnnouncerDashboardExtras,
    token ? { token } : "skip"
  );

  const regularityScore = useQuery(
    api.planning.regularity.getMyRegularityScore,
    token ? { token } : "skip"
  );

  const displayName = user?.firstName || "Annonceur";
  const extrasLoading = extras === undefined && token !== null;

  // ── Loading principal ──
  if (!dashboardStats) {
    return <DashboardSkeleton />;
  }

  const {
    pendingAcceptance,
    upcoming,
    inProgress,
    completed,
    upcomingRevenue,
    completedRevenue,
    activeMissions,
    kpis,
    monthlySparkline,
    nextPayout,
  } = dashboardStats;

  const showProfileBanner = extras?.profileCompletion?.percentage !== undefined && extras.profileCompletion.percentage < 100;
  const showContextBanner = showProfileBanner || nextPayout;

  return (
    <div className="space-y-5">
      {/* Bannière de régularité (annonceurs particuliers) */}
      {regularityScore && token && (
        <RegularityBanner data={regularityScore} token={token} />
      )}

      {/* ── Header : bienvenue + badges + vérification ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <WelcomeHeader
          displayName={displayName}
          pendingAcceptance={pendingAcceptance}
          totalUnread={totalUnread}
        />
        <VerificationBadge
          data={extras?.verification ?? null}
          isLoading={extrasLoading}
        />
      </div>

      {/* ── Bandeau contextuel : profil + prochain virement ── */}
      {showContextBanner && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {showProfileBanner && (
            <ProfileCompletion
              data={extras?.profileCompletion ?? null}
              isLoading={extrasLoading}
            />
          )}
          <NextPayout data={nextPayout} />
        </div>
      )}

      {/* ── Cartes revenus — 3 colonnes ── */}
      <RevenueCards
        upcomingRevenue={upcomingRevenue}
        completedRevenue={completedRevenue}
      />

      {/* ── Compteurs par statut — 4 colonnes ── */}
      <StatCards
        pendingAcceptance={pendingAcceptance}
        inProgress={inProgress}
        upcoming={upcoming}
        completed={completed}
      />

      {/* ── Section principale — grille 7/5 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Colonne gauche — 7 cols */}
        <div className="lg:col-span-7 space-y-5">
          <UpcomingMissions missions={activeMissions} />

          {/* Sparkline + Top Services côte à côte sur grand écran */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <RevenueSparkline data={monthlySparkline} />
            <TopServices
              data={topServicesData}
              isLoading={topServicesData === undefined && token !== null}
            />
          </div>
        </div>

        {/* Colonne droite — 5 cols */}
        <div className="lg:col-span-5 space-y-5">
          <RecentMessages
            conversations={conversations}
            isLoading={isLoadingConversations}
          />

          {/* Avis + Performance côte à côte */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
            <ReviewSummary
              data={extras?.reviewSummary ?? null}
              isLoading={extrasLoading}
            />
            <PerformanceKPIs kpis={kpis} />
          </div>

          <OpenTickets
            tickets={tickets}
            isLoading={tickets === undefined && token !== null}
          />
        </div>
      </div>

      {/* ── Raccourcis rapides — grille 8 ── */}
      <QuickShortcuts />
    </div>
  );
}
