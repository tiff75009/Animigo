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
  CreditCard,
  CheckCircle,
  XCircle,
  Loader2,
  Moon,
  Sun,
  MessageCircle,
  ExternalLink,
  Home,
  Lock,
  Sparkles,
  Users,
  UserCircle,
  PawPrint,
  Scissors,
  Ban,
  Star,
  AlertTriangle,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/app/lib/utils";
import { useToast } from "@/app/components/ui/toast";
import { SessionsList } from "../../components/sessions-list";
import { CancelModal } from "./components/CancelModal";
import { ReviewModal } from "./components/ReviewModal";
import { DisputeModal } from "./components/DisputeModal";
import { PaymentCountdown } from "../components/PaymentCountdown";

const statusConfig: Record<
  string,
  {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: React.ReactNode;
    description: string;
  }
> = {
  pending_acceptance: {
    label: "En attente d'acceptation",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    icon: <Clock className="w-5 h-5" />,
    description: "L'annonceur doit accepter votre demande.",
  },
  pending_confirmation: {
    label: "En attente de paiement",
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    icon: <CreditCard className="w-5 h-5" />,
    description: "L'annonceur a accepté ! Confirmez en procédant au paiement.",
  },
  upcoming: {
    label: "Confirmée",
    color: "text-green-700",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    icon: <CheckCircle className="w-5 h-5" />,
    description: "Réservation confirmée. Préparez-vous !",
  },
  in_progress: {
    label: "En cours",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: <Sparkles className="w-5 h-5" />,
    description: "La prestation est en cours.",
  },
  completed: {
    label: "Terminée",
    color: "text-gray-700",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    icon: <CheckCircle className="w-5 h-5" />,
    description: "La prestation est terminée.",
  },
  refused: {
    label: "Refusée",
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: <XCircle className="w-5 h-5" />,
    description: "L'annonceur n'a pas pu accepter.",
  },
  cancelled: {
    label: "Annulée",
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: <XCircle className="w-5 h-5" />,
    description: "Réservation annulée.",
  },
};

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

  // Mission terminée, payée, non encore confirmée
  const needsConfirmation =
    mission &&
    mission.status === "completed" &&
    mission.paymentStatus === "paid" &&
    !mission.clientConfirmedAt &&
    !mission.autoConfirmedAt;

  // Mission confirmée (manuellement ou auto) mais pas encore d'avis
  const canReview =
    mission &&
    mission.status === "completed" &&
    (mission.clientConfirmedAt || mission.autoConfirmedAt) &&
    !review;

  // Peut ouvrir une réclamation
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

  const isMultiSession = mission?.sessions && mission.sessions.length > 1;

  if (!mission) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const status = statusConfig[mission.status] || statusConfig.pending_acceptance;

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

      {/* Status Card fusionnée avec Récapitulatif paiement */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "rounded-2xl p-5 border",
          status.bgColor,
          status.borderColor
        )}
      >
        {/* Status header */}
        <div className="flex items-start gap-4">
          <div
            className={cn("p-3 rounded-xl bg-white/80 shadow-sm", status.color)}
          >
            {status.icon}
          </div>
          <div className="flex-1">
            <h2 className={cn("font-semibold text-lg", status.color)}>
              {status.label}
            </h2>
            <p className="text-sm mt-0.5 text-gray-600">{status.description}</p>
          </div>
        </div>

        {/* Détails du paiement */}
        <div className="mt-4 p-4 bg-white/70 rounded-xl space-y-2">
          {/* Prix du service (ce que l'annonceur reçoit) */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">
              {mission.variantName || mission.serviceName}
              {mission.numberOfSessions && mission.numberOfSessions > 1 && (
                <span className="text-gray-400 ml-1">
                  × {mission.numberOfSessions} séances
                </span>
              )}
              {/* Durée pour les gardes (jours) */}
              {mission.serviceCategory === "garde" &&
                (!mission.numberOfSessions || mission.numberOfSessions === 1) && (
                  <span className="text-gray-400 ml-1">
                    ({formatGardeDuration(mission.startDate, mission.endDate, mission.includeOvernightStay, mission.overnightNights)})
                  </span>
                )}
              {/* Durée pour les services (heures) */}
              {mission.serviceCategory !== "garde" &&
                (!mission.numberOfSessions || mission.numberOfSessions === 1) &&
                mission.startTime &&
                mission.endTime && (
                  <span className="text-gray-400 ml-1">
                    ({calculateSessionDuration(mission.startTime, mission.endTime)})
                  </span>
                )}
            </span>
            <span className="font-medium text-foreground">
              {formatPrice(mission.announcerEarnings || (mission.amount - (mission.platformFee || 0) - (mission.stripeFee || 0)))}
            </span>
          </div>

          {/* Commission plateforme */}
          {mission.platformFee && mission.platformFee > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">
                Commission plateforme{mission.commissionRate ? ` (${mission.commissionRate}%)` : ""}
              </span>
              <span className="text-gray-500">
                {formatPrice(mission.platformFee)}
              </span>
            </div>
          )}

          {/* Frais de gestion paiement (Stripe) */}
          {mission.stripeFee && mission.stripeFee > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">
                Frais de gestion paiement{mission.stripeFeeRate ? ` (${mission.stripeFeeRate}%)` : ""}
              </span>
              <span className="text-gray-500">
                {formatPrice(mission.stripeFee)}
              </span>
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2">
            <span className="font-semibold text-foreground">Total à payer</span>
            <span className="font-bold text-xl text-foreground">
              {formatPrice(mission.amount)}
            </span>
          </div>
        </div>

        {/* Info paiement */}
        {mission.status === "pending_acceptance" && (
          <p className="mt-3 text-xs text-gray-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Le paiement sera demandé après acceptation par le pet-sitter.
          </p>
        )}

        {mission.paymentStatus === "paid" && (
          <p className="mt-3 text-xs text-green-600 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            Paiement effectué - Le montant sera encaissé à la fin de la prestation.
          </p>
        )}

        {/* Délai de paiement */}
        {mission.status === "pending_confirmation" && mission.paymentDeadline && (
          <div className="mt-3 p-3 bg-white/60 rounded-xl border border-orange-200">
            <PaymentCountdown deadline={mission.paymentDeadline} />
          </div>
        )}

        {/* Payment button if pending */}
        {mission.status === "pending_confirmation" && (
          <Link
            href={`/client/paiement/${mission.id}`}
            className="mt-4 flex items-center justify-center gap-3 w-full py-4 bg-primary text-white rounded-2xl font-semibold text-lg hover:bg-primary/90 transition-all hover:scale-[1.01] shadow-lg shadow-primary/20"
          >
            <CreditCard className="w-6 h-6" />
            Confirmer ma réservation
          </Link>
        )}

        {/* Cancellation reason */}
        {(mission.status === "refused" || mission.status === "cancelled") &&
          mission.cancellationReason && (
            <div className="mt-4 p-4 bg-white/60 rounded-xl border border-red-100">
              <p className="text-sm font-medium text-red-800">Motif :</p>
              <p className="text-sm text-red-700 mt-1">
                {mission.cancellationReason}
              </p>
            </div>
          )}
      </motion.div>

      {/* Bandeau confirmation fin de service */}
      {needsConfirmation && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 border-2 border-green-300 bg-green-50"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-xl">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-800">
                Le service est terminé !
              </h3>
              <p className="text-sm text-green-600 mt-0.5">
                Confirmez la fin du service pour déclencher le versement au prestataire.
                Si vous ne confirmez pas sous 48h, la validation sera automatique.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleConfirmEnd}
              disabled={isConfirming}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isConfirming ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Confirmer la fin du service
                </>
              )}
            </button>
            {canDispute && (
              <button
                onClick={() => setShowDisputeModal(true)}
                className="py-3 px-4 border-2 border-red-200 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-5 h-5" />
                Signaler
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Bandeau laisser un avis */}
      {canReview && !needsConfirmation && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 border border-amber-200 bg-amber-50"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-amber-100 rounded-xl">
              <Star className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-800">
                Comment s&apos;est passé le service ?
              </h3>
              <p className="text-sm text-amber-600 mt-0.5">
                Votre avis aide les autres propriétaires et le prestataire.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowReviewModal(true)}
              className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
            >
              <Star className="w-5 h-5" />
              Laisser un avis
            </button>
            {canDispute && (
              <button
                onClick={() => setShowDisputeModal(true)}
                className="py-3 px-4 border-2 border-red-200 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-5 h-5" />
                Signaler
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Avis déjà laissé */}
      {review && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 border border-green-200 bg-green-50"
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-semibold text-green-800">Avis publié</p>
              <div className="flex items-center gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "w-4 h-4",
                      star <= Math.round(review.overallRating)
                        ? "fill-accent text-accent"
                        : "text-gray-300"
                    )}
                  />
                ))}
                <span className="text-sm text-green-700 ml-1">
                  {review.overallRating}/5
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Réclamation en cours */}
      {dispute && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 border border-red-200 bg-red-50"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-semibold text-red-800">
                Réclamation en cours : {dispute.reasonLabel}
              </p>
              <p className="text-sm text-red-600 mt-0.5">
                Statut :{" "}
                {dispute.status === "open"
                  ? "Ouverte"
                  : dispute.status === "investigating"
                    ? "En investigation"
                    : dispute.status === "resolved_client"
                      ? "Résolu en votre faveur"
                      : dispute.status === "resolved_announcer"
                        ? "Résolu en faveur du prestataire"
                        : "Fermée"}
                {dispute.paymentBlocked && " • Paiement suspendu"}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Service & Animal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
            {mission.animal?.emoji || "🐾"}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground truncate">
              {mission.serviceName}
            </h3>
            <p className="text-gray-500 text-sm">
              Pour {mission.animal?.name || "votre animal"}
              {mission.animal?.type && ` (${mission.animal.type})`}
            </p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mt-4">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
              mission.serviceCategory === "garde"
                ? "bg-purple-100 text-purple-700"
                : "bg-teal-100 text-teal-700"
            )}
          >
            {mission.serviceCategory === "garde" ? (
              <>
                <PawPrint className="w-3.5 h-3.5" />
                Garde
              </>
            ) : (
              <>
                <Scissors className="w-3.5 h-3.5" />
                Service
              </>
            )}
          </span>

          {mission.sessionType && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
                mission.sessionType === "collective"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-amber-100 text-amber-700"
              )}
            >
              {mission.sessionType === "collective" ? (
                <>
                  <Users className="w-3.5 h-3.5" />
                  Collectif
                </>
              ) : (
                <>
                  <UserCircle className="w-3.5 h-3.5" />
                  Individuel
                </>
              )}
            </span>
          )}

          {mission.numberOfSessions && mission.numberOfSessions > 1 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              <Calendar className="w-3.5 h-3.5" />
              {mission.numberOfSessions} séances
            </span>
          )}
        </div>
      </motion.div>

      {/* Annonceur + Lieu - Grid 2 colonnes */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Annonceur */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
        >
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-primary" />
            Votre pet-sitter
          </h3>

          <div className="flex items-center gap-3">
            {mission.announcerPhotoUrl ? (
              <img
                src={mission.announcerPhotoUrl}
                alt={mission.announcerName}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">
                {mission.announcerName}
              </p>
            </div>

            {/* Boutons */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Link
                href={`/annonceur/${mission.announcerSlug || mission.announcerId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                title="Voir le profil"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>

              {isPaid ? (
                <button
                  onClick={handleContact}
                  disabled={isContacting}
                  className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50"
                  title="Contacter"
                >
                  {isContacting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MessageCircle className="w-4 h-4" />
                  )}
                </button>
              ) : (
                <div
                  className="p-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed relative"
                  title="Disponible après paiement"
                >
                  <MessageCircle className="w-4 h-4" />
                  <Lock className="w-2 h-2 absolute -bottom-0.5 -right-0.5 bg-gray-100 rounded-full" />
                </div>
              )}
            </div>
          </div>

          {!isPaid && (
            <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Messagerie après paiement
            </p>
          )}
        </motion.div>

        {/* Lieu */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
        >
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-primary" />
            Lieu de prestation
          </h3>

          {/* Adresse visible si payé OU si c'est chez le client (son propre domicile) */}
          {isPaid || mission.serviceLocation === "client_home" ? (
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                mission.serviceLocation === "client_home"
                  ? "bg-teal-100"
                  : "bg-green-100"
              )}>
                {mission.serviceLocation === "client_home" ? (
                  <Home className="w-5 h-5 text-teal-600" />
                ) : (
                  <MapPin className="w-5 h-5 text-green-600" />
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">
                  {mission.serviceLocation === "client_home"
                    ? "À votre domicile"
                    : "Chez le pet-sitter"}
                </p>
                <p className="text-foreground font-medium text-sm">
                  {mission.location}
                </p>
                {(mission.postalCode || mission.city) && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {[mission.postalCode, mission.city].filter(Boolean).join(" ")}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <p className="text-gray-600 text-sm">
                  Chez <span className="font-medium">le pet-sitter</span>
                </p>
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Adresse visible après paiement
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Séances / Dates */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
      >
        {isMultiSession && mission.sessions ? (
          <>
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Vos séances
              <span className="text-sm font-normal text-gray-500">
                ({mission.sessions.length} séances)
              </span>
            </h3>
            <SessionsList
              sessions={mission.sessions}
              sessionType={mission.sessionType}
              numberOfSessions={mission.numberOfSessions}
            />
          </>
        ) : (
          <>
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Dates et horaires
            </h3>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <Sun className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-green-600 font-medium">Début</p>
                  <p className="font-semibold text-foreground text-sm">
                    {formatDateShort(mission.startDate)}
                    {mission.startTime && ` • ${mission.startTime}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl border border-orange-100">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <Moon className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-orange-600 font-medium">Fin</p>
                  <p className="font-semibold text-foreground text-sm">
                    {formatDateShort(mission.endDate)}
                    {mission.endTime && ` • ${mission.endTime}`}
                  </p>
                </div>
              </div>
            </div>

            {mission.includeOvernightStay && mission.overnightNights && (
              <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100 mt-3">
                <Moon className="w-5 h-5 text-indigo-600" />
                <div>
                  <p className="font-medium text-indigo-700 text-sm">
                    Garde de nuit incluse
                  </p>
                  <p className="text-xs text-indigo-600">
                    {mission.overnightNights} nuit
                    {mission.overnightNights > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

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

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="flex gap-3"
      >
        <Link
          href="/client/reservations"
          className="flex-1 py-3.5 text-center bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
        >
          Retour
        </Link>
        {mission.status === "pending_confirmation" && (
          <Link
            href={`/client/paiement/${mission.id}`}
            className="flex-1 py-3.5 text-center bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <CreditCard className="w-5 h-5" />
            Payer
          </Link>
        )}
        {isPaid && (
          <button
            onClick={handleContact}
            disabled={isContacting}
            className="flex-1 py-3.5 text-center bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isContacting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <MessageCircle className="w-5 h-5" />
                Contacter
              </>
            )}
          </button>
        )}
        {canCancel && (
          <button
            onClick={() => setShowCancelModal(true)}
            className="flex-1 py-3.5 text-center border-2 border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
          >
            <Ban className="w-5 h-5" />
            Annuler
          </button>
        )}
      </motion.div>

      {/* Modal d'annulation */}
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

      {/* Modal de notation */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        missionId={missionId}
        serviceName={mission.serviceName}
        announcerName={mission.announcerName || "Annonceur"}
      />

      {/* Modal de réclamation */}
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
  if (totalMinutes < 0) totalMinutes += 24 * 60; // Gestion passage minuit

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

  // Calculer le nombre de jours
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const parts: string[] = [];

  if (diffDays === 0) {
    // Même jour = demi-journée
    parts.push("1 demi-journée");
  } else if (diffDays === 1) {
    parts.push("1 jour");
  } else {
    parts.push(`${diffDays} jours`);
  }

  // Ajouter les nuits si présentes
  if (includeOvernightStay && overnightNights && overnightNights > 0) {
    parts.push(overnightNights === 1 ? "1 nuit" : `${overnightNights} nuits`);
  }

  return parts.join(" + ");
}
