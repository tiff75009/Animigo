"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { MissionCard, MissionSplitView, calculateDistance, type ConvexMission } from "../../../components/mission-card";
import { MissionsStats } from "../MissionsStats";
import { MissionsEmptyState } from "../MissionsEmptyState";
import { MissionsInfoBanner } from "../MissionsInfoBanner";
import { MissionListSkeleton } from "../MissionCardSkeleton";
import { CancelModal } from "../modals";
import { useMissionFilters } from "../useMissionFilters";
import { useRouter } from "next/navigation";
import { useToast } from "@/app/components/ui/toast";
import type { FunctionReturnType } from "convex/server";
import type { ServiceTypeFilter, SessionTypeFilter, AnimalTypeFilter, MonthFilter } from "../MissionsFilters";

type MissionType = FunctionReturnType<typeof api.planning.missions.getMissionsByStatus>[number];

interface UpcomingTabProps {
  token: string | null;
  // Missions passées par la page parente (évite les queries redondantes)
  missions?: MissionType[];
  announcerCoordinates?: { lat: number; lng: number } | null;
  serviceType?: ServiceTypeFilter;
  sessionType?: SessionTypeFilter;
  animalType?: AnimalTypeFilter;
  month?: MonthFilter;
  isVatSubject?: boolean;
}

export function UpcomingTab({
  token,
  missions,
  announcerCoordinates,
  serviceType = "all",
  sessionType = "all",
  animalType = "all",
  month = "all",
  isVatSubject = false,
}: UpcomingTabProps) {
  const router = useRouter();
  const { error: toastError } = useToast();
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isContacting, setIsContacting] = useState(false);
  const [detailMission, setDetailMission] = useState<MissionType | null>(null);

  const cancelMission = useMutation(api.planning.missions.cancelMission);
  const getOrCreateConversation = useMutation(api.messaging.mutations.getOrCreateConversation);

  // Appliquer les filtres sur les missions reçues en props
  const filteredMissions = useMissionFilters(missions, serviceType, sessionType, animalType, month);

  const isLoading = missions === undefined;

  // Calcul des revenus
  let totalAmount = 0;
  for (const m of filteredMissions) {
    totalAmount += m.announcerEarnings ?? (m.amount ?? 0) * 0.85;
  }

  // Tri par date de début
  const sortedMissions = [...filteredMissions].sort(
    (a: MissionType, b: MissionType) => new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime()
  );

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

  const handleCancelClick = (missionId: string) => {
    setSelectedMissionId(missionId);
    setCancelModalOpen(true);
  };

  const handleCancelConfirm = async (reason: string) => {
    if (!selectedMissionId || !token) return;

    setIsCancelling(true);
    try {
      await cancelMission({
        token,
        missionId: selectedMissionId as Id<"missions">,
        reason,
      });
      setCancelModalOpen(false);
      setSelectedMissionId(null);
    } catch (error) {
      console.error("Erreur lors de l'annulation:", error);
    } finally {
      setIsCancelling(false);
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
        isVatSubject={isVatSubject}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <MissionsStats
        tab="upcoming"
        count={filteredMissions.length}
        totalAmount={totalAmount}
      />

      {/* Info banner */}
      {filteredMissions.length > 0 && <MissionsInfoBanner tab="upcoming" />}

      {/* Liste des missions */}
      {sortedMissions.length === 0 ? (
        <MissionsEmptyState tab="upcoming" />
      ) : (
        <div className="space-y-4">
          {sortedMissions.map((mission: MissionType, index: number) => (
            <motion.div
              key={mission.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (index + 1) }}
            >
              <MissionCard
                mission={mission}
                announcerCoordinates={announcerCoordinates}
                token={token}
                onContact={handleContact}
                onCancel={handleCancelClick}
                onViewDetails={() => setDetailMission(mission)}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal d'annulation */}
      <AnimatePresence>
        {cancelModalOpen && selectedMissionId && (
          <CancelModal
            isOpen={cancelModalOpen}
            onClose={() => {
              setCancelModalOpen(false);
              setSelectedMissionId(null);
            }}
            onConfirm={handleCancelConfirm}
            isLoading={isCancelling}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
