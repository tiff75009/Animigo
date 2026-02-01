"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { MissionCard } from "../../../components/mission-card";
import { MissionsStats } from "../MissionsStats";
import { MissionsEmptyState } from "../MissionsEmptyState";
import { MissionsInfoBanner } from "../MissionsInfoBanner";
import { CancelModal } from "../modals";
import { useMissionFilters } from "../useMissionFilters";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/app/components/ui/toast";
import type { FunctionReturnType } from "convex/server";
import type { ServiceTypeFilter, SessionTypeFilter, AnimalTypeFilter, MonthFilter } from "../MissionsFilters";

type MissionType = FunctionReturnType<typeof api.planning.missions.getMissionsByStatus>[number];

interface UpcomingTabProps {
  token: string | null;
  serviceType?: ServiceTypeFilter;
  sessionType?: SessionTypeFilter;
  animalType?: AnimalTypeFilter;
  month?: MonthFilter;
}

export function UpcomingTab({
  token,
  serviceType = "all",
  sessionType = "all",
  animalType = "all",
  month = "all",
}: UpcomingTabProps) {
  const router = useRouter();
  const { error: toastError } = useToast();
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isContacting, setIsContacting] = useState(false);

  const missions = useQuery(
    api.planning.missions.getMissionsByStatus,
    token ? { token, status: "upcoming" } : "skip"
  );

  const announcerData = useQuery(
    api.planning.missions.getAnnouncerCoordinates,
    token ? { token } : "skip"
  );

  const cancelMission = useMutation(api.planning.missions.cancelMission);
  const getOrCreateConversation = useMutation(api.messaging.mutations.getOrCreateConversation);

  // Appliquer les filtres
  const filteredMissions = useMissionFilters(missions, serviceType, sessionType, animalType, month);

  const isLoading = missions === undefined;

  // Calcul des revenus
  let totalAmount = 0;
  for (const m of filteredMissions) {
    totalAmount += m.announcerEarnings ?? (m.amount ?? 0) * 0.85;
  }

  // Tri par date de début
  const sortedMissions = [...filteredMissions].sort(
    (a, b) => new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime()
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
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-purple animate-spin mx-auto mb-4" />
          <p className="text-text-light">Chargement des missions...</p>
        </div>
      </div>
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
                announcerCoordinates={announcerData?.coordinates}
                token={token}
                onContact={handleContact}
                onCancel={handleCancelClick}
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
