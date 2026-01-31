"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { MissionCard, type ConvexMission } from "../../../components/mission-card";
import { MissionsStats } from "../MissionsStats";
import { MissionsEmptyState } from "../MissionsEmptyState";
import { AcceptModal, RefuseModal } from "../modals";
import { useMissionFilters } from "../useMissionFilters";
import { Loader2 } from "lucide-react";
import type { ServiceTypeFilter, SessionTypeFilter, AnimalTypeFilter, MonthFilter } from "../MissionsFilters";

interface PendingAcceptanceTabProps {
  token: string | null;
  serviceType?: ServiceTypeFilter;
  sessionType?: SessionTypeFilter;
  animalType?: AnimalTypeFilter;
  month?: MonthFilter;
}

export function PendingAcceptanceTab({
  token,
  serviceType = "all",
  sessionType = "all",
  animalType = "all",
  month = "all",
}: PendingAcceptanceTabProps) {
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [refuseModalOpen, setRefuseModalOpen] = useState(false);
  const [selectedMission, setSelectedMission] = useState<ConvexMission | null>(null);

  const missions = useQuery(
    api.planning.missions.getMissionsByStatus,
    token ? { token, status: "pending_acceptance" as const } : "skip"
  ) as ConvexMission[] | undefined;

  const announcerData = useQuery(
    api.planning.missions.getAnnouncerCoordinates,
    token ? { token } : "skip"
  );

  const acceptMissionMutation = useMutation(api.planning.missions.acceptMission);
  const refuseMissionMutation = useMutation(api.planning.missions.refuseMission);

  // Appliquer les filtres
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
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-text-light">Chargement des missions...</p>
        </div>
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
                announcerCoordinates={announcerData?.coordinates}
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
