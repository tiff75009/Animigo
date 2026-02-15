"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/app/hooks/useAuth";
import { useNotifications } from "@/app/hooks/useNotifications";
import { useConversations } from "@/app/hooks/useMessaging";
import { Id } from "@/convex/_generated/dataModel";
import { DashboardSkeleton } from "./components/home/DashboardSkeleton";
import { AlertBanners } from "./components/home/AlertBanners";
import { WelcomeHeader } from "./components/home/WelcomeHeader";
import { StatsCards } from "./components/home/StatsCards";
import { UpcomingReservations } from "./components/home/UpcomingReservations";
import { MyAnimals } from "./components/home/MyAnimals";
import { SpendingOverview } from "./components/home/SpendingOverview";
import { RecentNotifications } from "./components/home/RecentNotifications";
import { OpenTickets } from "./components/home/OpenTickets";
import { RecentMessages } from "./components/home/RecentMessages";
import { QuickActions } from "./components/home/QuickActions";
import { ReservationTimeline } from "./components/home/ReservationTimeline";

export default function ClientDashboard() {
  const { user, token } = useAuth();

  // ── Queries Convex en parallèle ──
  const dashboardStats = useQuery(
    api.client.dashboard.getClientDashboardStats,
    token ? { token } : "skip"
  );

  const pendingPayments = useQuery(
    api.api.stripeClient.getPendingPayments,
    token ? { token } : "skip"
  );

  const tickets = useQuery(
    api.support.tickets.getMyTickets,
    token ? { sessionToken: token } : "skip"
  );

  const { notifications, isLoading: isLoadingNotifs } = useNotifications(5);

  const { conversations, totalUnread, isLoading: isLoadingMessages } = useConversations(token);

  const confirmMission = useMutation(api.planning.missions.confirmMissionCompletion);

  const displayName = user?.firstName || "Client";

  // ── Loading principal ──
  if (!dashboardStats) {
    return <DashboardSkeleton />;
  }

  const {
    reservations,
    upcomingMissions,
    pendingValidation,
    finances,
    topAnimals,
    animalsCount,
  } = dashboardStats;

  const handleConfirmMission = async (missionId: Id<"missions">) => {
    if (!token) return;
    try {
      await confirmMission({ token, missionId });
    } catch (err) {
      console.error("Erreur confirmation mission:", err);
    }
  };

  const hasAlerts = (pendingPayments && pendingPayments.length > 0) || pendingValidation.length > 0;

  return (
    <div className="space-y-5">
      {/* ── Alertes : paiements en attente + missions à valider ── */}
      <AlertBanners
        pendingPayments={pendingPayments}
        pendingValidation={pendingValidation}
        onConfirmMission={handleConfirmMission}
      />

      {/* ── Header : bienvenue ── */}
      <WelcomeHeader
        displayName={displayName}
        upcomingCount={reservations.upcoming + reservations.inProgress}
        animationDelay={hasAlerts ? 0.1 : 0}
      />

      {/* ── Compteurs par statut — 4 colonnes ── */}
      <StatsCards
        pendingAcceptance={reservations.pendingAcceptance}
        upcoming={reservations.upcoming}
        inProgress={reservations.inProgress}
        completed={reservations.completed}
      />

      {/* ── Timeline horizontale réservations ── */}
      {upcomingMissions.length > 0 && (
        <ReservationTimeline missions={upcomingMissions} />
      )}

      {/* ── Section principale — grille 7/5 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Colonne gauche — 7 cols */}
        <div className="lg:col-span-7 space-y-5">
          <UpcomingReservations missions={upcomingMissions} />
          <RecentMessages
            conversations={conversations}
            totalUnread={totalUnread}
            isLoading={isLoadingMessages}
          />
          <SpendingOverview
            totalSpent={finances.totalSpent}
            monthSpent={finances.monthSpent}
            invoicesCount={finances.invoicesCount}
          />
        </div>

        {/* Colonne droite — 5 cols */}
        <div className="lg:col-span-5 space-y-5">
          <MyAnimals animals={topAnimals} totalCount={animalsCount} />
          <RecentNotifications
            notifications={notifications}
            isLoading={isLoadingNotifs}
          />
          <OpenTickets
            tickets={tickets}
            isLoading={tickets === undefined && token !== null}
          />
        </div>
      </div>

      {/* ── Raccourcis rapides — grille 8 ── */}
      <QuickActions />
    </div>
  );
}
