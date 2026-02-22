"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/app/components/ui/toast";
import { CancelModal } from "./components/CancelModal";
import { ReviewModal } from "./components/ReviewModal";
import { DisputeModal } from "./components/DisputeModal";
import { StatusCard } from "./components/StatusCard";
import { RefundCard } from "./components/RefundCard";
import { ConfirmationBanner } from "./components/ConfirmationBanner";
import { ReviewBanner } from "./components/ReviewBanner";
import { DisputeBanner } from "./components/DisputeBanner";
import { ServiceAnimalCard } from "./components/ServiceAnimalCard";
import { AnnouncerLocationGrid } from "./components/AnnouncerLocationGrid";
import { SessionsDateCard } from "./components/SessionsDateCard";
import { ActionButtons } from "./components/ActionButtons";

export default function ReservationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { error: toastError } = useToast();
  const missionId = params.missionId as string;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const [isContacting, setIsContacting] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const mission = useQuery(
    api.planning.missions.getClientMissionById,
    token && missionId
      ? { token, missionId: missionId as Id<"missions"> }
      : "skip"
  );

  const getOrCreateConversation = useMutation(
    api.messaging.mutations.getOrCreateConversation
  );

  const cancelMission = useMutation(
    api.planning.cancellation.cancelMissionByClient
  );

  const confirmMissionEnd = useMutation(
    api.planning.payouts.confirmMissionEnd
  );

  const review = useQuery(
    api.planning.reviews.getReviewByMission,
    token && missionId
      ? { sessionToken: token, missionId: missionId as Id<"missions"> }
      : "skip"
  );

  const dispute = useQuery(
    api.planning.disputes.getDisputeByMission,
    token && missionId
      ? { sessionToken: token, missionId: missionId as Id<"missions"> }
      : "skip"
  );

  const handleContact = async () => {
    if (!token || !missionId || isContacting) return;

    setIsContacting(true);
    try {
      const result = await getOrCreateConversation({
        token,
        missionId: missionId as Id<"missions">,
      });

      if (result?.conversationId) {
        router.push(`/client/messagerie?conversation=${result.conversationId}`);
      }
    } catch (error) {
      console.error("Erreur lors de l'ouverture de la conversation:", error);
      toastError("Impossible d'ouvrir la conversation");
    } finally {
      setIsContacting(false);
    }
  };

  const handleConfirmEnd = async () => {
    if (!token || !missionId || isConfirming) return;
    setIsConfirming(true);
    try {
      await confirmMissionEnd({
        sessionToken: token,
        missionId: missionId as Id<"missions">,
      });
      setShowReviewModal(true);
    } catch (error) {
      console.error("Erreur confirmation:", error);
      toastError("Impossible de confirmer la fin du service");
    } finally {
      setIsConfirming(false);
    }
  };

  const needsConfirmation =
    mission &&
    mission.status === "completed" &&
    (mission.paymentStatus === "paid" || mission.paymentStatus === "pending") &&
    !mission.clientConfirmedAt &&
    !mission.autoConfirmedAt &&
    !mission.hasDispute;

  const canReview =
    mission &&
    mission.status === "completed" &&
    (mission.clientConfirmedAt || mission.autoConfirmedAt) &&
    !review;

  const canDispute =
    mission &&
    mission.status === "completed" &&
    mission.paymentStatus === "paid" &&
    !dispute;

  const handleCancelMission = async (reason: string) => {
    if (!token || !missionId) return;
    await cancelMission({
      token,
      missionId: missionId as Id<"missions">,
      reason,
    });
  };

  const canCancel = mission && (
    ["pending_acceptance", "pending_confirmation", "upcoming"].includes(mission.status) ||
    (mission.status === "in_progress" && (
      (mission.sessions && mission.sessions.length > 1) ||
      mission.sessionType === "collective"
    ))
  );

  const isPaid =
    mission &&
    ["upcoming", "in_progress", "completed"].includes(mission.status);

  if (!mission) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Ma réservation</h1>
          <p className="text-sm text-gray-500">
            Réf: {missionId.slice(-8).toUpperCase()}
          </p>
        </div>
      </div>

      <StatusCard
        mission={mission}
        formatPrice={formatPrice}
        formatGardeDuration={formatGardeDuration}
        calculateSessionDuration={calculateSessionDuration}
      />

      <RefundCard mission={mission} formatPrice={formatPrice} />

      {/* Bandeau confirmation : en attente, confirmé manuellement, ou auto-confirmé */}
      {mission.status === "completed" && (mission.clientConfirmedAt || mission.autoConfirmedAt || needsConfirmation) && (
        <ConfirmationBanner
          isConfirming={isConfirming}
          canDispute={!!canDispute}
          onConfirmEnd={handleConfirmEnd}
          onOpenDispute={() => setShowDisputeModal(true)}
          autoConfirmedAt={mission.autoConfirmedAt}
          clientConfirmedAt={mission.clientConfirmedAt}
        />
      )}

      {!needsConfirmation && (
        <ReviewBanner
          canReview={!!canReview}
          review={review}
          canDispute={!!canDispute}
          onOpenReview={() => setShowReviewModal(true)}
          onOpenDispute={() => setShowDisputeModal(true)}
        />
      )}

      <DisputeBanner dispute={dispute} />

      <ServiceAnimalCard mission={mission} />

      <AnnouncerLocationGrid
        mission={mission}
        isPaid={!!isPaid}
        isContacting={isContacting}
        onContact={handleContact}
      />

      <SessionsDateCard mission={mission} formatDateShort={formatDateShort} />

      {/* Notes */}
      {(mission.clientNotes || mission.announcerNotes) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
        >
          <h3 className="font-semibold text-foreground mb-3">Notes</h3>
          <div className="space-y-3">
            {mission.clientNotes && (
              <div>
                <p className="text-xs text-gray-500 mb-1.5 font-medium">
                  Vos instructions
                </p>
                <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-xl border border-gray-100">
                  {mission.clientNotes}
                </p>
              </div>
            )}
            {mission.announcerNotes && (
              <div>
                <p className="text-xs text-gray-500 mb-1.5 font-medium">
                  Notes du pet-sitter
                </p>
                <p className="text-gray-600 text-sm bg-primary/5 p-3 rounded-xl border border-primary/10">
                  {mission.announcerNotes}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      <ActionButtons
        mission={mission}
        isPaid={!!isPaid}
        canCancel={!!canCancel}
        isContacting={isContacting}
        onContact={handleContact}
        onOpenCancel={() => setShowCancelModal(true)}
      />

      {/* Modales */}
      {canCancel && token && (
        <CancelModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleCancelMission}
          missionId={missionId}
          serviceName={mission.serviceName}
          animalName={mission.animal?.name || "Animal"}
          announcerName={mission.announcerName || "Annonceur"}
          startDate={mission.startDate}
          endDate={mission.endDate}
          token={token}
        />
      )}

      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        missionId={missionId}
        serviceName={mission.serviceName}
        announcerName={mission.announcerName || "Annonceur"}
      />

      <DisputeModal
        isOpen={showDisputeModal}
        onClose={() => setShowDisputeModal(false)}
        missionId={missionId}
        serviceName={mission.serviceName}
      />
    </div>
  );
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatPrice(cents: number): string {
  const euros = Math.round(cents) / 100;
  return euros.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function calculateSessionDuration(startTime: string, endTime: string): string {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);

  let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
  if (totalMinutes < 0) totalMinutes += 24 * 60;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  } else if (minutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h${minutes.toString().padStart(2, "0")}`;
  }
}

function formatGardeDuration(
  startDate: string,
  endDate: string,
  includeOvernightStay?: boolean,
  overnightNights?: number
): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const parts: string[] = [];

  if (diffDays === 0) {
    parts.push("1 demi-journée");
  } else if (diffDays === 1) {
    parts.push("1 jour");
  } else {
    parts.push(`${diffDays} jours`);
  }

  if (includeOvernightStay && overnightNights && overnightNights > 0) {
    parts.push(overnightNights === 1 ? "1 nuit" : `${overnightNights} nuits`);
  }

  return parts.join(" + ");
}
