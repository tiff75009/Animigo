"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { MissionCard, type ConvexMission } from "../../../components/mission-card";
import { MissionsStats } from "../MissionsStats";
import { MissionsEmptyState } from "../MissionsEmptyState";
import { MissionListSkeleton } from "../MissionCardSkeleton";
import { AcceptModal, RefuseModal } from "../modals";
import { useMissionFilters } from "../useMissionFilters";
import type { ServiceTypeFilter, SessionTypeFilter, AnimalTypeFilter, MonthFilter } from "../MissionsFilters";

interface PendingAcceptanceTabProps {
  token: string | null;
  // Missions passées par la page parente (évite les queries redondantes)
  missions?: ConvexMission[];
  announcerCoordinates?: { lat: number; lng: number } | null;
  serviceType?: ServiceTypeFilter;
  sessionType?: SessionTypeFilter;
  animalType?: AnimalTypeFilter;
  month?: MonthFilter;
}

export function PendingAcceptanceTab({
  token,
  missions,
  announcerCoordinates,
  serviceType = "all",
  sessionType = "all",
  animalType = "all",
  month = "all",
}: PendingAcceptanceTabProps) {
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [refuseModalOpen, setRefuseModalOpen] = useState(false);
  const [selectedMission, setSelectedMission] = useState<ConvexMission | null>(null);

  const acceptMissionMutation = useMutation(api.planning.missions.acceptMission);
  const refuseMissionMutation = useMutation(api.planning.missions.refuseMission);

  // Appliquer les filtres sur les missions reçues en props
  const filteredMissions = useMissionFilters(missions, serviceType, sessionType, animalType, month);

  const isLoading = token !== null && missions === undefined;

  // Calcul des revenus totaux potentiels (sur les missions filtrées)
  const totalEarnings = filteredMissions.reduce((sum, m) => {
    const earnings = m.announcerEarnings ?? Math.round(m.amount * 0.85);
    return sum + earnings;
  }, 0);

  const handleAcceptClick = (missionId: string) => {
    const mission = filteredMissions.find((m) => m.id === missionId);
    if (mission) {
      setSelectedMission(mission);
      setAcceptModalOpen(true);
    }
  };

  const handleRefuseClick = (missionId: string) => {
    const mission = filteredMissions.find((m) => m.id === missionId);
    if (mission) {
      setSelectedMission(mission);
      setRefuseModalOpen(true);
    }
  };

  const handleAcceptConfirm = async () => {
    if (selectedMission && token) {
      await acceptMissionMutation({
        token,
        missionId: selectedMission.id as Id<"missions">,
      });
    }
  };

  const handleRefuseConfirm = async (reason: string) => {
    if (selectedMission && token) {
      await refuseMissionMutation({
        token,
        missionId: selectedMission.id as Id<"missions">,
        reason: reason || undefined,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Stats skeleton */}
        <div className="bg-white rounded-2xl p-5 shadow-sm animate-pulse">
          <div className="flex justify-between items-center">
            <div className="h-6 bg-gray-200 rounded w-40" />
            <div className="h-8 bg-gray-200 rounded w-24" />
          </div>
        </div>
        {/* Mission cards skeleton */}
        <MissionListSkeleton count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <MissionsStats
        tab="pending_acceptance"
        count={filteredMissions.length}
        totalAmount={totalEarnings}
      />

      {/* Liste des missions */}
      {filteredMissions.length === 0 ? (
        <MissionsEmptyState tab="pending_acceptance" />
      ) : (
        <div className="space-y-4">
          {filteredMissions.map((mission, index) => (
            <motion.div
              key={mission.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (index + 1) }}
            >
              <MissionCard
                mission={mission}
                showActions={true}
                onAccept={handleAcceptClick}
                onRefuse={handleRefuseClick}
                announcerCoordinates={announcerCoordinates}
                token={token}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Modals */}
      <AcceptModal
        isOpen={acceptModalOpen}
        onClose={() => setAcceptModalOpen(false)}
        mission={selectedMission}
        onConfirm={handleAcceptConfirm}
      />

      <RefuseModal
        isOpen={refuseModalOpen}
        onClose={() => setRefuseModalOpen(false)}
        mission={selectedMission}
        onConfirm={handleRefuseConfirm}
      />
    </div>
  );
}
