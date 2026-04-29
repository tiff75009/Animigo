"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronRight,
  MessageSquare,
  CreditCard,
  Home,
  Star,
  AlertTriangle,
  Ban,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { PaymentCountdown } from "./PaymentCountdown";

// --- Types ---

export interface EnrichedReservation {
  id: string;
  announcerId?: string;
  serviceName: string;
  serviceCategory?: string;
  announcerName: string;
  createdAt?: number;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  city?: string;
  status: string;
  amount: number;
  animal?: { name: string; emoji: string };
  animals?: Array<{ name: string; type: string; emoji: string }>;
  animalCount?: number;
  sessionType?: "individual" | "collective";
  numberOfSessions?: number;
  sessions?: Array<{ date: string; startTime: string; endTime: string }>;
  serviceTypeSlug?: string;
  serviceLocation?: "announcer_home" | "client_home";
  paymentDeadline?: number;
  paymentStatus?: string;
  refundAmount?: number;
  variantName?: string;
  cancellationReason?: string;
  cancelledBy?: string;
  acceptanceDeadline?: number;
  hasReview?: boolean;
  hasDispute?: boolean;
  // Détails dispute (depuis getClientMissions enrichie)
  disputeStatus?:
    | "open"
    | "investigating"
    | "resolved_client"
    | "resolved_announcer"
    | "closed";
  disputeReasonLabel?: string;
  disputeResolvedAt?: number;
  disputePaymentBlocked?: boolean;
  clientConfirmedAt?: number;
  autoConfirmedAt?: number;
}

// --- Status config ---

interface StatusStyle {
  label: string;
  color: string;
  bgColor: string;
  dotColor: string;
  shadowColor: string;
  icon: React.ReactNode;
}

const statusConfig: Record<string, StatusStyle> = {
  pending_acceptance: {
    label: "En attente",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    dotColor: "bg-amber-400",
    shadowColor: "shadow-amber-200/40",
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
  },
  pending_confirmation: {
    label: "À payer",
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    dotColor: "bg-orange-400",
    shadowColor: "shadow-orange-200/40",
    icon: <CreditCard className="w-3 h-3" />,
  },
  upcoming: {
    label: "Confirmée",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    dotColor: "bg-emerald-400",
    shadowColor: "shadow-emerald-200/40",
    icon: <CheckCircle className="w-3 h-3" />,
  },
  in_progress: {
    label: "En cours",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    dotColor: "bg-blue-400",
    shadowColor: "shadow-blue-200/40",
    icon: <Clock className="w-3 h-3" />,
  },
  completed: {
    label: "Terminée",
    color: "text-slate-600",
    bgColor: "bg-slate-50",
    dotColor: "bg-slate-300",
    shadowColor: "shadow-slate-200/30",
    icon: <CheckCircle className="w-3 h-3" />,
  },
  refused: {
    label: "Refusée",
    color: "text-red-600",
    bgColor: "bg-red-50",
    dotColor: "bg-red-400",
    shadowColor: "shadow-red-200/30",
    icon: <XCircle className="w-3 h-3" />,
  },
  cancelled: {
    label: "Annulée",
    color: "text-red-600",
    bgColor: "bg-red-50",
    dotColor: "bg-red-400",
    shadowColor: "shadow-red-200/30",
    icon: <XCircle className="w-3 h-3" />,
  },
};

export { statusConfig };

// --- Utils ---

function formatDatesDisplay(r: {
  startDate: string;
  endDate: string;
  sessions?: Array<{ date: string; startTime: string; endTime: string }>;
  numberOfSessions?: number;
}): string {
  if (r.sessions && r.sessions.length > 1) return `${r.sessions.length} séances`;
  if (r.numberOfSessions && r.numberOfSessions > 1) return `${r.numberOfSessions} séances`;
  const start = new Date(r.startDate);
  const end = new Date(r.endDate);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  if (r.startDate === r.endDate) return start.toLocaleDateString("fr-FR", opts);
  return `${start.toLocaleDateString("fr-FR", opts)} – ${end.toLocaleDateString("fr-FR", opts)}`;
}

function formatTime(time: string): string {
  return time.replace(":", "h");
}

function getTimeUntil(
  startDate: string
): { label: string; urgency: "today" | "imminent" | "soon" | "normal" } | null {
  const start = new Date(startDate);
  const now = new Date();
  start.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const d = Math.ceil((start.getTime() - now.getTime()) / 86400000);
  if (d < 0) return null;
  if (d === 0) return { label: "Aujourd'hui", urgency: "today" };
  if (d === 1) return { label: "Demain", urgency: "imminent" };
  if (d <= 3) return { label: `Dans ${d}j`, urgency: "imminent" };
  if (d <= 7) return { label: `Dans ${d}j`, urgency: "soon" };
  if (d <= 30) return { label: `J-${d}`, urgency: "normal" };
  return null;
}

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// --- Shared pieces ---

function useCardData(r: EnrichedReservation) {
  const status = statusConfig[r.status] || statusConfig.pending_acceptance;
  const isPendingPayment = r.status === "pending_confirmation";
  const isConfirmed = ["upcoming", "in_progress", "completed"].includes(r.status);
  const isCancelled = ["refused", "cancelled"].includes(r.status);
  const isMultiSession =
    (r.sessions && r.sessions.length > 1) || (r.numberOfSessions && r.numberOfSessions > 1);

  const timeUntil = ["pending_acceptance", "pending_confirmation", "upcoming"].includes(r.status)
    ? getTimeUntil(r.startDate)
    : null;

  const animalEmoji =
    r.animals && r.animals.length > 1
      ? r.animals.slice(0, 2).map((a) => a.emoji).join("")
      : r.animal?.emoji || "🐾";

  const animalNames =
    r.animals && r.animals.length > 1
      ? r.animals.map((a) => a.name).join(", ")
      : r.animal?.name || "Votre animal";

  const timeDisplay =
    r.startTime && r.endTime
      ? `${formatTime(r.startTime)} – ${formatTime(r.endTime)}`
      : r.startTime
        ? formatTime(r.startTime)
        : null;

  const locationLabel = r.city
    ? r.city
    : r.serviceLocation === "client_home"
      ? "À domicile"
      : "Chez le pet-sitter";

  return { status, isPendingPayment, isConfirmed, isCancelled, isMultiSession, timeUntil, animalEmoji, animalNames, timeDisplay, locationLabel };
}

// --- Card props ---

interface ReservationCardProps {
  reservation: EnrichedReservation;
  index: number;
  isContacting: string | null;
  onContact: (e: React.MouseEvent, missionId: string) => void;
  variant?: "list" | "grid";
}

// =============================================================================
// LIST CARD
// =============================================================================

function ListCard({ reservation: r, index, isContacting, onContact }: ReservationCardProps) {
  const { status, isPendingPayment, isConfirmed, isCancelled, isMultiSession, timeUntil, animalEmoji, animalNames, timeDisplay, locationLabel } = useCardData(r);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.035, duration: 0.25 }}
    >
      <Link href={`/client/reservations/${r.id}`} className="block group">
        <div
          className={cn(
            "bg-white rounded-2xl overflow-hidden transition-all duration-200",
            "border border-gray-100 shadow-sm",
            "hover:shadow-md hover:border-gray-200",
            status.shadowColor,
            isCancelled && "opacity-60 hover:opacity-80"
          )}
        >
          {/* Bannière paiement urgent */}
          {isPendingPayment && r.paymentDeadline && (
            <div className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-400 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-white">
                <CreditCard className="w-4 h-4 flex-shrink-0" />
                <span className="text-[13px] font-semibold">Paiement requis</span>
              </div>
              <div className="bg-white/20 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-white">
                <PaymentCountdown deadline={r.paymentDeadline} />
              </div>
            </div>
          )}

          {/* Bannière validation fin de mission */}
          {/* ⚠️ Masquée si une dispute existe (en cours ou résolue) :
                 la résolution admin remplace la validation manuelle. */}
          {r.status === "completed" &&
            !r.clientConfirmedAt &&
            !r.autoConfirmedAt &&
            !r.hasDispute && (
              <div className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-400 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-white">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-[13px] font-semibold">Validez la fin de la garde</span>
                </div>
                <span className="bg-white/20 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-white text-[11px] font-medium">
                  Action requise
                </span>
              </div>
            )}

          <div className="p-5">
            {/* ── Header ── */}
            <div className="flex items-start gap-3.5">
              {/* Avatar animal — rounded-2xl + shadow colorée */}
              <div className="relative flex-shrink-0">
                <div
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center",
                    "bg-gradient-to-br from-[#FFF9F0] to-primary/10",
                    "shadow-lg shadow-primary/20",
                    r.animals && r.animals.length > 1 ? "text-base gap-0.5" : "text-[22px]"
                  )}
                >
                  {animalEmoji}
                </div>
                <div className={cn("absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-white", status.dotColor)} />
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-[15px] text-foreground truncate leading-snug">
                      {r.serviceName}
                    </h3>
                    <p className="text-[13px] text-gray-400 mt-0.5 truncate leading-snug">
                      {r.variantName && r.variantName !== r.serviceName && (
                        <>{r.variantName}<span className="mx-1 opacity-30">·</span></>
                      )}
                      {animalNames}
                      <span className="mx-1 opacity-30">·</span>
                      {r.announcerName}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-[17px] font-bold text-foreground tabular-nums leading-tight">
                      {formatPrice(r.amount)}&nbsp;€
                    </p>
                    {isCancelled && r.refundAmount != null && r.refundAmount > 0 && (
                      <p className="text-[11px] font-medium text-emerald-600 mt-0.5">
                        -{formatPrice(r.refundAmount)} € remboursé
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Badges ── */}
            <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
              <span className={cn("inline-flex items-center gap-1.5 h-[26px] px-2.5 rounded-full text-[11px] font-semibold", status.bgColor, status.color)}>
                {status.icon}
                {status.label}
              </span>
              {timeUntil && (
                <span className={cn("inline-flex items-center gap-1 h-[26px] px-2.5 rounded-full text-[11px] font-semibold", {
                  "bg-primary/10 text-primary": timeUntil.urgency === "today",
                  "bg-orange-50 text-orange-600": timeUntil.urgency === "imminent",
                  "bg-sky-50 text-sky-600": timeUntil.urgency === "soon",
                  "bg-gray-50 text-gray-500": timeUntil.urgency === "normal",
                })}>
                  <Clock className="w-3 h-3" />
                  {timeUntil.label}
                </span>
              )}
              {r.status === "completed" && r.autoConfirmedAt && (
                <span className="inline-flex items-center gap-1 h-[26px] px-2.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-600">
                  <Clock className="w-3 h-3" />
                  Confirmée auto.
                </span>
              )}
              {r.status === "completed" && r.clientConfirmedAt && !r.autoConfirmedAt && (
                <span className="inline-flex items-center gap-1 h-[26px] px-2.5 rounded-full text-[11px] font-semibold bg-green-50 text-green-600">
                  <CheckCircle className="w-3 h-3" />
                  Confirmée
                </span>
              )}
              {r.status === "completed" &&
                !r.clientConfirmedAt &&
                !r.autoConfirmedAt &&
                !r.hasDispute && (
                  <span className="inline-flex items-center gap-1 h-[26px] px-2.5 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-600">
                    <Clock className="w-3 h-3" />
                    À confirmer
                  </span>
                )}
              {r.hasReview && (
                <span className="inline-flex items-center gap-1 h-[26px] px-2.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-600">
                  <Star className="w-3 h-3" />
                  Avis laissé
                </span>
              )}
              {/* Avis à laisser : mission terminée + confirmée + sans avis */}
              {r.status === "completed" &&
                !r.hasReview &&
                (r.clientConfirmedAt || r.autoConfirmedAt) &&
                !r.hasDispute && (
                  <span className="inline-flex items-center gap-1 h-[26px] px-2.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-600">
                    <Star className="w-3 h-3" />
                    Avis à laisser
                  </span>
                )}
              {r.hasDispute && (
                <DisputeBadge
                  status={r.disputeStatus}
                  paymentBlocked={r.disputePaymentBlocked}
                />
              )}
              {isCancelled && (r.refundAmount == null || r.refundAmount === 0) && r.paymentStatus === "paid" && (
                <span className="inline-flex items-center gap-1 h-[26px] px-2.5 rounded-full text-[11px] font-medium bg-gray-50 text-gray-400">
                  <Ban className="w-3 h-3" />
                  Non remboursé
                </span>
              )}
            </div>

            {/* ── Métadonnées ── */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-300" />
                {formatDatesDisplay(r)}
              </span>
              {timeDisplay && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-300" />
                  {timeDisplay}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                {r.serviceLocation === "client_home" ? <Home className="w-3.5 h-3.5 text-gray-300" /> : <MapPin className="w-3.5 h-3.5 text-gray-300" />}
                {locationLabel}
              </span>
              {r.sessionType === "collective" && (
                <span className="inline-flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-gray-300" />Collectif</span>
              )}
              {isMultiSession && (
                <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-gray-300" />{r.sessions?.length || r.numberOfSessions} séances</span>
              )}
            </div>

            {/* ── Motif annulation ── */}
            {isCancelled && r.cancellationReason && (
              <p className="mt-3 text-[12px] text-gray-400 leading-relaxed line-clamp-1">
                <span className="font-medium text-gray-500">Motif :</span> {r.cancellationReason}
              </p>
            )}

            {/* ── Bandeau dispute (info détaillée : motif + sommes) ── */}
            {r.hasDispute && (
              <DisputeInfoStrip reservation={r} variant="client" />
            )}

            {/* ── Actions ── */}
            <div className="mt-4 pt-3.5 border-t border-gray-100 flex items-center gap-2">
              {isPendingPayment ? (
                <div className="flex-1 flex items-center justify-center gap-2 h-10 bg-primary text-white rounded-xl text-sm font-semibold shadow-sm shadow-primary/15 group-hover:shadow-md group-hover:shadow-primary/25 transition-shadow">
                  <CreditCard className="w-4 h-4" />
                  Confirmer et payer
                </div>
              ) : isConfirmed ? (
                <>
                  <button
                    type="button"
                    onClick={(e) => onContact(e, r.id)}
                    disabled={isContacting === r.id}
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold bg-secondary/10 text-secondary hover:bg-secondary hover:text-white transition-colors disabled:opacity-50"
                  >
                    {isContacting === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                    Contacter
                  </button>
                  {/* Bouton "Réserver à nouveau" sur missions terminées sans dispute en cours */}
                  {/* ⚠️ <button> et pas <Link> car la card entière est déjà
                       wrappée dans <Link> — pas d'<a> imbriqué dans <a>. */}
                  {r.status === "completed" &&
                    !r.hasDispute &&
                    r.announcerId && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          window.location.href = `/annonceur/${r.announcerId}`;
                        }}
                        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Réserver à nouveau
                      </button>
                    )}
                  <div className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl text-sm font-medium text-gray-400 group-hover:text-foreground transition-colors">
                    Voir détails
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-60 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl text-sm font-medium text-gray-400 group-hover:text-foreground group-hover:bg-gray-50/80 transition-all">
                  Voir détails
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-60 group-hover:translate-x-0.5 transition-all" />
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// =============================================================================
// GRID CARD
// =============================================================================

function GridCard({ reservation: r, index, isContacting, onContact }: ReservationCardProps) {
  const { status, isPendingPayment, isConfirmed, isCancelled, timeUntil, animalEmoji, animalNames, timeDisplay, locationLabel } = useCardData(r);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
    >
      <Link href={`/client/reservations/${r.id}`} className="block group h-full">
        <div
          className={cn(
            "bg-white rounded-2xl overflow-hidden transition-all duration-200 h-full flex flex-col",
            "border border-gray-100 shadow-sm",
            "hover:shadow-md hover:border-gray-200",
            status.shadowColor,
            isCancelled && "opacity-60 hover:opacity-80"
          )}
        >
          {/* Top accent bar */}
          <div className={cn("h-1", status.dotColor)} />

          {/* Bannière paiement */}
          {isPendingPayment && r.paymentDeadline && (
            <div className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-400 flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-white">Paiement requis</span>
              <div className="bg-white/20 px-2 py-0.5 rounded-full text-white text-[11px]">
                <PaymentCountdown deadline={r.paymentDeadline} />
              </div>
            </div>
          )}

          {/* Bannière validation fin de mission */}
          {/* ⚠️ Masquée si dispute (en cours ou résolue). */}
          {r.status === "completed" &&
            !r.clientConfirmedAt &&
            !r.autoConfirmedAt &&
            !r.hasDispute && (
              <div className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-400 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-white">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="text-[12px] font-semibold">Validez la fin de la garde</span>
                </div>
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-white text-[10px] font-medium">
                  Action requise
                </span>
              </div>
            )}

          <div className="p-4 flex-1 flex flex-col">
            {/* Header : emoji + prix */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="relative flex-shrink-0">
                <div
                  className={cn(
                    "w-11 h-11 rounded-2xl flex items-center justify-center",
                    "bg-gradient-to-br from-[#FFF9F0] to-primary/10",
                    "shadow-lg shadow-primary/20",
                    r.animals && r.animals.length > 1 ? "text-sm gap-0.5" : "text-xl"
                  )}
                >
                  {animalEmoji}
                </div>
                <div className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white", status.dotColor)} />
              </div>
              <p className="text-[16px] font-bold text-foreground tabular-nums">
                {formatPrice(r.amount)}&nbsp;€
              </p>
            </div>

            {/* Service + annonceur */}
            <h3 className="font-semibold text-[14px] text-foreground truncate leading-snug">
              {r.serviceName}
            </h3>
            <p className="text-[12px] text-gray-400 mt-0.5 truncate">
              {animalNames}<span className="mx-1 opacity-30">·</span>{r.announcerName}
            </p>

            {/* Badges */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className={cn("inline-flex items-center gap-1 h-[22px] px-2 rounded-full text-[10px] font-semibold", status.bgColor, status.color)}>
                {status.icon}
                {status.label}
              </span>
              {timeUntil && (
                <span className={cn("inline-flex items-center gap-1 h-[22px] px-2 rounded-full text-[10px] font-semibold", {
                  "bg-primary/10 text-primary": timeUntil.urgency === "today",
                  "bg-orange-50 text-orange-600": timeUntil.urgency === "imminent",
                  "bg-sky-50 text-sky-600": timeUntil.urgency === "soon",
                  "bg-gray-50 text-gray-500": timeUntil.urgency === "normal",
                })}>
                  <Clock className="w-2.5 h-2.5" />
                  {timeUntil.label}
                </span>
              )}
              {r.status === "completed" && r.autoConfirmedAt && (
                <span className="inline-flex items-center gap-1 h-[22px] px-2 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-600">
                  <Clock className="w-2.5 h-2.5" />
                  Auto.
                </span>
              )}
              {r.status === "completed" && r.clientConfirmedAt && !r.autoConfirmedAt && (
                <span className="inline-flex items-center gap-1 h-[22px] px-2 rounded-full text-[10px] font-semibold bg-green-50 text-green-600">
                  <CheckCircle className="w-2.5 h-2.5" />
                  Confirmée
                </span>
              )}
              {r.status === "completed" && !r.clientConfirmedAt && !r.autoConfirmedAt && (
                <span className="inline-flex items-center gap-1 h-[22px] px-2 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-600">
                  <Clock className="w-2.5 h-2.5" />
                  À confirmer
                </span>
              )}
              {r.hasReview && (
                <span className="inline-flex items-center gap-1 h-[22px] px-2 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600">
                  <Star className="w-2.5 h-2.5" />
                  Avis
                </span>
              )}
              {r.hasDispute && (
                <span className="inline-flex items-center gap-1 h-[22px] px-2 rounded-full text-[10px] font-semibold bg-red-50 text-red-600">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  Litige
                </span>
              )}
              {isCancelled && r.refundAmount != null && r.refundAmount > 0 && (
                <span className="inline-flex items-center gap-1 h-[22px] px-2 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600">
                  -{formatPrice(r.refundAmount)} €
                </span>
              )}
            </div>

            {/* Metadata compact */}
            <div className="mt-auto pt-3 space-y-1 text-[12px] text-gray-500">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-gray-300" />
                {formatDatesDisplay(r)}
                {timeDisplay && <span className="text-gray-300 mx-0.5">·</span>}
                {timeDisplay && <>{timeDisplay}</>}
              </div>
              <div className="flex items-center gap-1.5">
                {r.serviceLocation === "client_home" ? <Home className="w-3 h-3 text-gray-300" /> : <MapPin className="w-3 h-3 text-gray-300" />}
                {locationLabel}
              </div>
            </div>

            {/* Action */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              {isPendingPayment ? (
                <div className="flex items-center justify-center gap-1.5 h-9 bg-primary text-white rounded-xl text-[13px] font-semibold shadow-sm shadow-primary/15">
                  <CreditCard className="w-3.5 h-3.5" />
                  Payer
                </div>
              ) : isConfirmed ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={(e) => onContact(e, r.id)}
                    disabled={isContacting === r.id}
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-[13px] font-semibold bg-secondary/10 text-secondary hover:bg-secondary hover:text-white transition-colors disabled:opacity-50"
                  >
                    {isContacting === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                    Contacter
                  </button>
                  <div className="flex items-center justify-center w-9 h-9 rounded-xl text-gray-400 group-hover:text-foreground group-hover:bg-gray-50 transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1 h-9 rounded-xl text-[13px] font-medium text-gray-400 group-hover:text-foreground group-hover:bg-gray-50/80 transition-all">
                  Détails
                  <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// =============================================================================
// DISPUTE BADGE
// =============================================================================

function DisputeBadge({
  status,
  paymentBlocked,
}: {
  status?: string;
  paymentBlocked?: boolean;
}) {
  // Fallback si pas de statut (mission.hasDispute=true mais lookup raté)
  const config = {
    open: {
      label: "Réclamation ouverte",
      bg: "bg-red-50",
      text: "text-red-600",
      Icon: AlertTriangle,
    },
    investigating: {
      label: "Réclamation en cours",
      bg: "bg-amber-50",
      text: "text-amber-600",
      Icon: AlertTriangle,
    },
    resolved_client: {
      label: "Résolue en votre faveur",
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      Icon: Star,
    },
    resolved_announcer: {
      label: "Résolue (en faveur du pet-sitter)",
      bg: "bg-slate-50",
      text: "text-slate-500",
      Icon: AlertTriangle,
    },
    closed: {
      label: "Réclamation clôturée",
      bg: "bg-slate-50",
      text: "text-slate-500",
      Icon: AlertTriangle,
    },
  }[status ?? "open"] ?? {
    label: "Réclamation",
    bg: "bg-red-50",
    text: "text-red-600",
    Icon: AlertTriangle,
  };

  const Icon = config.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1 h-[26px] px-2.5 rounded-full text-[11px] font-semibold ${config.bg} ${config.text}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
      {paymentBlocked &&
        status !== "resolved_announcer" &&
        status !== "closed" && (
          <span className="opacity-70">• Paiement suspendu</span>
        )}
    </span>
  );
}

// =============================================================================
// DISPUTE INFO STRIP — détails dispute (motif, statut, sommes) sur card
// =============================================================================

const formatEuros = (cents: number) =>
  `${(cents / 100).toFixed(2).replace(".", ",")} €`;

function DisputeInfoStrip({
  reservation,
  variant,
}: {
  reservation: EnrichedReservation;
  variant: "client" | "announcer";
}) {
  const r = reservation;
  const isResolvedClient = r.disputeStatus === "resolved_client";
  const isResolvedAnnouncer = r.disputeStatus === "resolved_announcer";
  const isClosed = r.disputeStatus === "closed";
  const isInProgress =
    r.disputeStatus === "open" || r.disputeStatus === "investigating";
  const paymentSuspended =
    !!r.disputePaymentBlocked && !isResolvedAnnouncer && !isClosed;

  // Couleur du strip selon résolution
  const tone = isResolvedClient
    ? {
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        title: "text-emerald-800",
        body: "text-emerald-700",
      }
    : isResolvedAnnouncer
      ? {
          bg: "bg-slate-50",
          border: "border-slate-200",
          title: "text-slate-800",
          body: "text-slate-600",
        }
      : isInProgress
        ? {
            bg: "bg-amber-50",
            border: "border-amber-200",
            title: "text-amber-800",
            body: "text-amber-700",
          }
        : {
            bg: "bg-slate-50",
            border: "border-slate-200",
            title: "text-slate-700",
            body: "text-slate-500",
          };

  // Texte principal selon angle (client / annonceur)
  const headline = (() => {
    if (isResolvedClient) {
      return variant === "client"
        ? "Réclamation résolue en votre faveur"
        : "Réclamation résolue en faveur du client";
    }
    if (isResolvedAnnouncer) {
      return variant === "client"
        ? "Réclamation non retenue"
        : "Réclamation résolue en votre faveur";
    }
    if (isClosed) return "Réclamation clôturée";
    return "Réclamation en cours de traitement";
  })();

  return (
    <div
      className={`mt-3 p-3 rounded-xl border ${tone.bg} ${tone.border} flex items-start gap-3`}
    >
      <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${tone.title}`} />
      <div className="flex-1 min-w-0 text-[12.5px] leading-[1.5]">
        <p className={`font-semibold ${tone.title}`}>{headline}</p>

        {/* Motif (si dispo) */}
        {r.disputeReasonLabel && (
          <p className={`${tone.body} mt-0.5`}>
            <span className="opacity-70">Motif :</span> {r.disputeReasonLabel}
          </p>
        )}

        {/* Sommes en jeu */}
        <div className={`mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] ${tone.body}`}>
          {/* Montant total mission */}
          <span>
            <span className="opacity-70">Montant mission :</span>{" "}
            <strong className={tone.title}>{formatEuros(r.amount)}</strong>
          </span>

          {/* Montant remboursé (résolution client) */}
          {isResolvedClient && (r.refundAmount ?? 0) > 0 && (
            <span>
              <span className="opacity-70">
                {variant === "client" ? "Remboursé :" : "Remboursé au client :"}
              </span>{" "}
              <strong className="text-emerald-700">
                {formatEuros(r.refundAmount!)}
              </strong>
            </span>
          )}

          {/* Versement suspendu (en cours) */}
          {paymentSuspended && (
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span className="text-red-700 font-semibold">
                {variant === "announcer"
                  ? "Votre versement suspendu"
                  : "Versement annonceur suspendu"}
              </span>
            </span>
          )}

          {/* Versement débloqué après résolution_announcer */}
          {isResolvedAnnouncer && variant === "announcer" && (
            <span className="text-slate-700 font-medium">
              Versement débloqué
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// EXPORT
// =============================================================================

export function ReservationCard(props: ReservationCardProps) {
  return props.variant === "grid" ? <GridCard {...props} /> : <ListCard {...props} />;
}
