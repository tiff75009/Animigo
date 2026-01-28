"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Moon,
  Sun,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/app/lib/utils";
import { useToast } from "@/app/components/ui/toast";

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode; description: string }> = {
  pending_acceptance: {
    label: "En attente d'acceptation",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
    icon: <Loader2 className="w-5 h-5 animate-spin" />,
    description: "L'annonceur doit accepter votre demande de réservation."
  },
  pending_confirmation: {
    label: "En attente de paiement",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
    icon: <CreditCard className="w-5 h-5" />,
    description: "L'annonceur a accepté. Veuillez procéder au paiement pour confirmer."
  },
  upcoming: {
    label: "Confirmée",
    color: "text-green-700",
    bgColor: "bg-green-100",
    icon: <CheckCircle className="w-5 h-5" />,
    description: "Votre réservation est confirmée. Préparez-vous pour le jour J !"
  },
  in_progress: {
    label: "En cours",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    icon: <Clock className="w-5 h-5" />,
    description: "La prestation est actuellement en cours."
  },
  completed: {
    label: "Terminée",
    color: "text-gray-700",
    bgColor: "bg-gray-100",
    icon: <CheckCircle className="w-5 h-5" />,
    description: "La prestation est terminée."
  },
  refused: {
    label: "Refusée",
    color: "text-red-700",
    bgColor: "bg-red-100",
    icon: <XCircle className="w-5 h-5" />,
    description: "L'annonceur n'a pas pu accepter cette réservation."
  },
  cancelled: {
    label: "Annulée",
    color: "text-red-700",
    bgColor: "bg-red-100",
    icon: <XCircle className="w-5 h-5" />,
    description: "Cette réservation a été annulée."
  },
};

export default function ReservationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { error: toastError } = useToast();
  const missionId = params.missionId as string;
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const [isContacting, setIsContacting] = useState(false);

  const mission = useQuery(
    api.planning.missions.getClientMissionById,
    token && missionId ? { token, missionId: missionId as Id<"missions"> } : "skip"
  );

  // Mutation pour obtenir ou créer une conversation
  const getOrCreateConversation = useMutation(api.messaging.mutations.getOrCreateConversation);

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

  // Vérifier si le bouton contacter doit être affiché
  const canContact = mission && ["upcoming", "in_progress", "completed"].includes(mission.status);

  if (!mission) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const status = statusConfig[mission.status] || statusConfig.pending_acceptance;
  const duration = calculateDuration(mission.startDate, mission.endDate, mission.startTime, mission.endTime);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Détail de la réservation</h1>
          <p className="text-sm text-gray-500">Réf: {missionId.slice(-8).toUpperCase()}</p>
        </div>
      </div>

      {/* Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("rounded-2xl p-5", status.bgColor)}
      >
        <div className="flex items-start gap-4">
          <div className={cn("p-3 rounded-xl bg-white/50", status.color)}>
            {status.icon}
          </div>
          <div className="flex-1">
            <h2 className={cn("font-semibold text-lg", status.color)}>{status.label}</h2>
            <p className={cn("text-sm mt-1", status.color.replace("700", "600"))}>{status.description}</p>
          </div>
        </div>

        {/* Payment button if pending */}
        {mission.status === "pending_confirmation" && mission.paymentDetails?.paymentUrl && (
          <Link
            href={`/client/paiement/${mission.id}`}
            className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            <CreditCard className="w-5 h-5" />
            Procéder au paiement
          </Link>
        )}

        {/* Cancellation reason if refused/cancelled */}
        {(mission.status === "refused" || mission.status === "cancelled") && mission.cancellationReason && (
          <div className="mt-4 p-3 bg-white/50 rounded-xl">
            <p className="text-sm font-medium text-red-800">Motif :</p>
            <p className="text-sm text-red-700">{mission.cancellationReason}</p>
          </div>
        )}
      </motion.div>

      {/* Service & Animal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-3xl">
            {mission.animal?.emoji || "🐾"}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-foreground">{mission.serviceName}</h3>
            <p className="text-gray-500">
              Pour {mission.animal?.name || "votre animal"}
              {mission.animal?.type && ` (${mission.animal.type})`}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Date & Time Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
      >
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Dates et horaires
        </h3>

        <div className="space-y-4">
          {/* Start */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Sun className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Début</p>
              <p className="font-semibold text-foreground">
                {formatDate(mission.startDate)}
                {mission.startTime && ` à ${mission.startTime}`}
              </p>
            </div>
          </div>

          {/* End */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <Moon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Fin</p>
              <p className="font-semibold text-foreground">
                {formatDate(mission.endDate)}
                {mission.endTime && ` à ${mission.endTime}`}
              </p>
            </div>
          </div>

          {/* Duration Summary */}
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl">
              <Clock className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-gray-500">Durée totale</p>
                <p className="font-semibold text-foreground">{duration.summary}</p>
              </div>
            </div>
          </div>

          {/* Overnight Stay */}
          {mission.includeOvernightStay && mission.overnightNights && (
            <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl">
              <Moon className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="text-sm text-indigo-600">Garde de nuit incluse</p>
                <p className="font-semibold text-indigo-700">
                  {mission.overnightNights} nuit{mission.overnightNights > 1 ? "s" : ""}
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Announcer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
      >
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          Votre pet-sitter
        </h3>

        <div className="flex items-center gap-4">
          {mission.announcerPhotoUrl ? (
            <img
              src={mission.announcerPhotoUrl}
              alt={mission.announcerName}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-gray-400" />
            </div>
          )}
          <div className="flex-1">
            <p className="font-semibold text-foreground text-lg">{mission.announcerName}</p>
            {mission.status !== "pending_acceptance" && mission.status !== "refused" && mission.status !== "cancelled" && (
              <div className="mt-2 space-y-1">
                {mission.announcerPhone && (
                  <a
                    href={`tel:${mission.announcerPhone}`}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary"
                  >
                    <Phone className="w-4 h-4" />
                    {mission.announcerPhone}
                  </a>
                )}
              </div>
            )}
          </div>
          {canContact && (
            <button
              onClick={handleContact}
              disabled={isContacting}
              className="p-3 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              {isContacting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <MessageCircle className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
      </motion.div>

      {/* Location */}
      {mission.location && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
        >
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Lieu de la prestation
          </h3>
          <p className="text-gray-600">{mission.location}</p>
          {mission.city && <p className="text-sm text-gray-500 mt-1">{mission.city}</p>}
        </motion.div>
      )}

      {/* Notes */}
      {(mission.clientNotes || mission.announcerNotes) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
        >
          <h3 className="font-semibold text-foreground mb-3">Notes</h3>
          {mission.clientNotes && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">Vos instructions</p>
              <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-xl">{mission.clientNotes}</p>
            </div>
          )}
          {mission.announcerNotes && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Notes du pet-sitter</p>
              <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-xl">{mission.announcerNotes}</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Price Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
      >
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          Récapitulatif du paiement
        </h3>

        <div className="space-y-3">
          <div className="flex justify-between items-center text-gray-600">
            <span>Montant total</span>
            <span className="font-bold text-xl text-foreground">
              {(mission.amount / 100).toFixed(2).replace(".", ",")} €
            </span>
          </div>

          {mission.includeOvernightStay && mission.overnightAmount && (
            <div className="flex justify-between items-center text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Moon className="w-4 h-4" />
                dont garde de nuit
              </span>
              <span>{(mission.overnightAmount / 100).toFixed(2).replace(".", ",")} €</span>
            </div>
          )}

          {/* Payment Status */}
          <div className="pt-3 border-t border-gray-100">
            <div className={cn(
              "flex items-start gap-3 p-3 rounded-xl",
              mission.paymentStatus === "paid" ? "bg-green-50 text-green-700" :
              mission.paymentStatus === "pending" ? "bg-orange-50 text-orange-700" :
              mission.status === "pending_confirmation" ? "bg-blue-50 text-blue-700" :
              "bg-gray-50 text-gray-600"
            )}>
              {mission.paymentStatus === "paid" ? (
                <>
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium block">Paiement effectué</span>
                    <span className="text-sm text-green-600">Le montant sera encaissé à la fin de la prestation.</span>
                  </div>
                </>
              ) : mission.paymentStatus === "pending" ? (
                <>
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium block">Paiement en attente</span>
                    <span className="text-sm text-orange-600">Veuillez procéder au paiement pour confirmer la réservation.</span>
                  </div>
                </>
              ) : mission.status === "pending_confirmation" ? (
                <>
                  <CreditCard className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium block">Paiement requis</span>
                    <span className="text-sm text-blue-600">Le montant sera bloqué sur votre carte et encaissé uniquement à la fin de la mission.</span>
                  </div>
                </>
              ) : mission.status === "pending_acceptance" ? (
                <>
                  <Clock className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium block">En attente d'acceptation</span>
                    <span className="text-sm text-gray-500">Le paiement sera demandé après acceptation par le pet-sitter.</span>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span className="font-medium">Réservation terminée</span>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex gap-3"
      >
        <Link
          href="/client/reservations"
          className="flex-1 py-3 text-center bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
        >
          Retour aux réservations
        </Link>
        {mission.status === "pending_confirmation" && (
          <Link
            href={`/client/paiement/${mission.id}`}
            className="flex-1 py-3 text-center bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            Payer maintenant
          </Link>
        )}
      </motion.div>
    </div>
  );
}

// Helper functions
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function calculateDuration(
  startDate: string,
  endDate: string,
  startTime?: string | null,
  endTime?: string | null
): { days: number; hours?: number; summary: string } {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  // If same day with times, calculate hours
  if (startDate === endDate && startTime && endTime) {
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    const hours = endH - startH + (endM - startM) / 60;

    if (hours < 1) {
      return { days: 1, hours, summary: `${Math.round(hours * 60)} minutes` };
    }
    return { days: 1, hours, summary: `${hours.toFixed(1).replace(".0", "")}h` };
  }

  // Multi-day
  let summary = `${diffDays} jour${diffDays > 1 ? "s" : ""}`;

  // Add time range if available
  if (startTime && endTime) {
    summary += ` (${startTime} - ${endTime})`;
  } else if (startTime) {
    summary += ` (à partir de ${startTime})`;
  }

  return { days: diffDays, summary };
}
