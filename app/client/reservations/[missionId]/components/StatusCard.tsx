"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Clock,
  CreditCard,
  CheckCircle,
  XCircle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { PaymentCountdown } from "../../components/PaymentCountdown";

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

export { statusConfig };

interface StatusCardProps {
  mission: any;
  formatPrice: (cents: number) => string;
  formatGardeDuration: (startDate: string, endDate: string, includeOvernightStay?: boolean, overnightNights?: number) => string;
  calculateSessionDuration: (startTime: string, endTime: string) => string;
}

export function StatusCard({ mission, formatPrice, formatGardeDuration, calculateSessionDuration }: StatusCardProps) {
  const status = statusConfig[mission.status] || statusConfig.pending_acceptance;

  return (
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
        {/* Prix du service */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">
            {mission.variantName || mission.serviceName}
            {mission.numberOfSessions && mission.numberOfSessions > 1 && (
              <span className="text-gray-400 ml-1">
                × {mission.numberOfSessions} séances
              </span>
            )}
            {mission.serviceCategory === "garde" &&
              (!mission.numberOfSessions || mission.numberOfSessions === 1) && (
                <span className="text-gray-400 ml-1">
                  ({formatGardeDuration(mission.startDate, mission.endDate, mission.includeOvernightStay, mission.overnightNights)})
                </span>
              )}
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

        {/* Frais Stripe */}
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

        {/* TVA */}
        {mission.vatRate != null && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 flex items-center gap-1.5">
              TVA ({mission.vatRate}%)
              {mission.isSapApplied && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700">
                  SAP
                </span>
              )}
            </span>
            <span className="text-gray-500">incluse</span>
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

      {/* Payment button */}
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
  );
}
