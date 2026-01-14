"use client";

import { motion } from "framer-motion";
import {
  CheckCircle,
  Clock,
  CalendarClock,
  Euro,
  TrendingUp,
  HelpCircle,
  XCircle,
  Ban,
} from "lucide-react";
import { StatCard, MiniStat } from "./components/stat-card";
import { MissionList } from "./components/mission-card";
import { ReviewList } from "./components/review-card";
import {
  calculateStats,
  getMissionsByStatus,
  mockReviews,
  mockUserProfile,
} from "@/app/lib/dashboard-data";

export default function DashboardPage() {
  const stats = calculateStats();
  const pendingAcceptanceMissions = getMissionsByStatus("pending_acceptance");
  const pendingConfirmationMissions = getMissionsByStatus("pending_confirmation");
  const inProgressMissions = getMissionsByStatus("in_progress");
  const upcomingMissions = getMissionsByStatus("upcoming");
  const refusedMissions = getMissionsByStatus("refused");
  const cancelledMissions = getMissionsByStatus("cancelled");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Bonjour, {mockUserProfile.firstName} ! 👋
          </h1>
          <p className="text-text-light mt-1">
            Voici un apercu de votre activité
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-text-light">
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">
            {stats.averageRating.toFixed(1)} ⭐ ({stats.totalReviews} avis)
          </span>
        </div>
      </motion.div>

      {/* Stats Grid - Main */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {/* Missions terminées */}
        <StatCard
          title="Missions terminées"
          value={stats.completedMissions.count}
          subtitle={formatCurrency(stats.completedMissions.totalAmount)}
          icon={CheckCircle}
          color="green"
          details={[
            {
              label: "Encaissé",
              value: formatCurrency(stats.completedMissions.collectedAmount),
            },
            {
              label: "À encaisser",
              value: formatCurrency(stats.completedMissions.pendingAmount),
            },
          ]}
        />

        {/* Missions en cours */}
        <StatCard
          title="Missions en cours"
          value={stats.inProgressMissions.count}
          subtitle={formatCurrency(stats.inProgressMissions.totalAmount)}
          icon={Clock}
          color="primary"
        />

        {/* Missions à venir */}
        <StatCard
          title="Missions à venir"
          value={stats.upcomingMissions.count}
          subtitle={formatCurrency(stats.upcomingMissions.totalAmount)}
          icon={CalendarClock}
          color="purple"
        />
      </motion.div>

      {/* Revenue Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-6 text-white"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <TrendingUp className="w-8 h-8" />
            </div>
            <div>
              <p className="text-white/80 text-sm">Revenus totaux (estimés)</p>
              <p className="text-3xl font-bold">
                {formatCurrency(
                  stats.completedMissions.totalAmount +
                    stats.inProgressMissions.totalAmount +
                    stats.upcomingMissions.totalAmount
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="bg-white/10 rounded-xl px-4 py-2">
              <p className="text-white/70 text-xs">Encaissé</p>
              <p className="font-bold">
                {formatCurrency(stats.completedMissions.collectedAmount)}
              </p>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-2">
              <p className="text-white/70 text-xs">À encaisser</p>
              <p className="font-bold">
                {formatCurrency(stats.completedMissions.pendingAmount)}
              </p>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-2">
              <p className="text-white/70 text-xs">En attente</p>
              <p className="font-bold">
                {formatCurrency(
                  stats.inProgressMissions.totalAmount +
                    stats.upcomingMissions.totalAmount
                )}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Mini Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <MiniStat
          label="À accepter"
          value={stats.pendingAcceptance}
          icon={HelpCircle}
          color="accent"
        />
        <MiniStat
          label="En attente"
          value={stats.pendingConfirmation}
          icon={Clock}
          color="secondary"
        />
        <MiniStat
          label="Refusées"
          value={stats.refused}
          icon={XCircle}
          color="red"
        />
        <MiniStat
          label="Annulées"
          value={stats.cancelled}
          icon={Ban}
          color="primary"
        />
      </motion.div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
          className="space-y-6"
        >
          {/* Missions à accepter */}
          <MissionList
            missions={pendingAcceptanceMissions}
            title="Missions à accepter"
            emoji="📩"
            showActions
            maxItems={2}
            viewAllHref="/dashboard/missions/accepter"
          />

          {/* Missions en attente de confirmation */}
          <MissionList
            missions={pendingConfirmationMissions}
            title="En attente de confirmation"
            emoji="⏳"
            maxItems={2}
            viewAllHref="/dashboard/missions/confirmation"
          />

          {/* Missions en cours */}
          <MissionList
            missions={inProgressMissions}
            title="Missions en cours"
            emoji="🏃"
            maxItems={2}
            viewAllHref="/dashboard/missions/en-cours"
          />
        </motion.div>

        {/* Right Column */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          {/* Avis */}
          <ReviewList
            reviews={mockReviews}
            maxItems={3}
            viewAllHref="/dashboard/avis"
          />

          {/* Missions à venir */}
          <MissionList
            missions={upcomingMissions}
            title="Missions à venir"
            emoji="📅"
            maxItems={2}
            viewAllHref="/dashboard/missions/a-venir"
          />
        </motion.div>
      </div>

      {/* Bottom section - Refused and Cancelled */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <MissionList
          missions={refusedMissions}
          title="Missions refusées"
          emoji="❌"
          maxItems={2}
          viewAllHref="/dashboard/missions/refusees"
        />
        <MissionList
          missions={cancelledMissions}
          title="Missions annulées"
          emoji="🚫"
          maxItems={2}
          viewAllHref="/dashboard/missions/annulees"
        />
      </motion.div>
    </div>
  );
}
