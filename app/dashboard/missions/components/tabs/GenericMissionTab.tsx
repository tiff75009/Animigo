"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { MissionCard, MissionSplitView, calculateDistance, type ConvexMission } from "../../../components/mission-card";
import { MissionsStats } from "../MissionsStats";
import { MissionsEmptyState } from "../MissionsEmptyState";
import { MissionsInfoBanner } from "../MissionsInfoBanner";
import { MissionListSkeleton } from "../MissionCardSkeleton";
import { useMissionFilters } from "../useMissionFilters";
import { useRouter } from "next/navigation";
import { useToast } from "@/app/components/ui/toast";
import type { MissionTab } from "../MissionsTabs";
import type { FunctionReturnType } from "convex/server";
import type { ServiceTypeFilter, SessionTypeFilter, AnimalTypeFilter, MonthFilter } from "../MissionsFilters";

type MissionType = FunctionReturnType<typeof api.planning.missions.getMissionsByStatus>[number] & {
  announcerEarnings?: number;
};

type MissionStatus =
  | "pending_confirmation"
  | "in_progress"
  | "completed"
  | "refused"
  | "cancelled";

interface GenericMissionTabProps {
  token: string | null;
  status: MissionStatus;
  // Missions passées par la page parente (évite les queries redondantes)
  missions?: MissionType[];
  announcerCoordinates?: { lat: number; lng: number } | null;
  serviceType?: ServiceTypeFilter;
  sessionType?: SessionTypeFilter;
  animalType?: AnimalTypeFilter;
  month?: MonthFilter;
}

export function GenericMissionTab({
  token,
  status,
  missions,
  announcerCoordinates,
  serviceType = "all",
  sessionType = "all",
  animalType = "all",
  month = "all",
}: GenericMissionTabProps) {
  const router = useRouter();
  const { error: toastError } = useToast();
  const [isContacting, setIsContacting] = useState(false);
  const [detailMission, setDetailMission] = useState<MissionType | null>(null);

  const getOrCreateConversation = useMutation(api.messaging.mutations.getOrCreateConversation);

  // Appliquer les filtres sur les missions reçues en props
  const filteredMissions = useMissionFilters(missions, serviceType, sessionType, animalType, month);

  const isLoading = missions === undefined;

  // Calcul des montants
  let totalAmount = 0;
  let paidAmount = 0;
  for (const m of filteredMissions) {
    const amount = m.announcerEarnings ?? (m.amount ?? 0) * 0.85;
    totalAmount += amount;
    if (m.paymentStatus === "paid") {
      paidAmount += amount;
    }
  }

  // Tri par date (récent en premier pour completed/refused/cancelled, proche en premier pour les autres)
  const sortedMissions = [...filteredMissions].sort((a: MissionType, b: MissionType) => {
    if (status === "completed" || status === "refused" || status === "cancelled") {
      return new Date(b.endDate || 0).getTime() - new Date(a.endDate || 0).getTime();
    }
    return new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime();
  });

  const handleContact = async (missionId: string) => {
    if (!token || isContacting) return;

    setIsContacting(true);
    try {
      const result = await getOrCreateConversation({
        token,
        missionId: missionId as Id<"missions">,
      });

      if (result?.conversationId) {
        router.push(`/dashboard/messagerie?conversation=${result.conversationId}`);
      }
    } catch (error) {
      console.error("Erreur lors de l'ouverture de la conversation:", error);
      toastError("Impossible d'ouvrir la conversation");
    } finally {
      setIsContacting(false);
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

  const tabId = status as MissionTab;
  const pendingAmount = totalAmount - paidAmount;

  // Vue détail split
  if (detailMission) {
    const dist = announcerCoordinates && detailMission.clientCoordinates
      ? calculateDistance(announcerCoordinates, detailMission.clientCoordinates)
      : null;
    const accepted = ["upcoming", "in_progress", "completed"].includes(detailMission.status);

    return (
      <MissionSplitView
        mission={detailMission as ConvexMission}
        onClose={() => setDetailMission(null)}
        isAccepted={accepted}
        distance={dist}
        token={token}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <MissionsStats
        tab={tabId}
        count={filteredMissions.length}
        totalAmount={totalAmount}
        paidAmount={paidAmount}
      />

      {/* Info banner */}
      {filteredMissions.length > 0 && (
        <MissionsInfoBanner tab={tabId} pendingAmount={pendingAmount} />
      )}

      {/* Liste des missions */}
      {sortedMissions.length === 0 ? (
        <MissionsEmptyState tab={tabId} />
      ) : (
        <div className="space-y-4">
          {sortedMissions.map((mission: MissionType, index: number) => (
            <motion.div
              key={mission.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * (index + 1) }}
            >
              <MissionCard
                mission={mission}
                announcerCoordinates={announcerCoordinates}
                token={token}
                onContact={status === "in_progress" ? handleContact : undefined}
                onViewDetails={() => setDetailMission(mission)}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
