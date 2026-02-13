"use client";

import { motion } from "framer-motion";
import {
  CreditCard,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/app/lib/utils";

interface RefundCardProps {
  mission: any;
  formatPrice: (cents: number) => string;
}

export function RefundCard({ mission, formatPrice }: RefundCardProps) {
  const showRefund =
    (mission.status === "cancelled" || mission.status === "refused") &&
    (mission.paymentStatus === "refunded" ||
      (mission.refundAmount != null && mission.refundAmount > 0) ||
      mission.paymentStatus === "paid");

  if (!showRefund) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 border border-gray-200 bg-white shadow-sm"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-emerald-50 rounded-xl">
          <CreditCard className="w-5 h-5 text-emerald-600" />
        </div>
        <h3 className="font-semibold text-foreground text-base">Remboursement</h3>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Montant payé</span>
          <span className="font-medium text-foreground">{formatPrice(mission.amount)}</span>
        </div>

        {((mission.platformFee || 0) + (mission.stripeFee || 0)) > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Commission plateforme</span>
            <span className="text-gray-500">− {formatPrice((mission.platformFee || 0) + (mission.stripeFee || 0))}</span>
          </div>
        )}

        {(mission.announcerRetainedAmount ?? 0) > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Retenu par le prestataire</span>
            <span className="text-gray-500">− {formatPrice(mission.announcerRetainedAmount!)}</span>
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2">
          <span className="font-semibold text-foreground">Montant remboursé</span>
          <span className={cn(
            "font-bold text-lg",
            (mission.refundAmount ?? 0) > 0 ? "text-emerald-600" : "text-red-500"
          )}>
            {(mission.refundAmount ?? 0) > 0
              ? formatPrice(mission.refundAmount!)
              : "0,00 €"}
          </span>
        </div>
      </div>

      <div className="mt-4 p-3 rounded-xl bg-gray-50 space-y-2">
        {(() => {
          const refundStatus = mission.paymentDetails?.refundStatus;
          const paymentStatus = mission.paymentStatus;
          const refundAmount = mission.refundAmount ?? 0;

          if (refundAmount === 0) {
            return (
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-red-600">Aucun remboursement</span>
              </div>
            );
          }
          if (refundStatus === "failed") {
            return (
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-red-600">Échec du remboursement</span>
              </div>
            );
          }
          if (refundStatus === "succeeded" || paymentStatus === "refunded") {
            return (
              <>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-600">Remboursé</span>
                </div>
                {mission.paymentDetails?.refundedAt && (
                  <p className="text-xs text-gray-500">
                    Traité le {new Date(mission.paymentDetails.refundedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                )}
                <p className="text-xs text-gray-400">
                  Délai estimé : 5-10 jours ouvrés sur votre compte bancaire
                </p>
              </>
            );
          }
          return (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
              <span className="text-sm font-medium text-orange-600">En cours de traitement</span>
            </div>
          );
        })()}
      </div>
    </motion.div>
  );
}
