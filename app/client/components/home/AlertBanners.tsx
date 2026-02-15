"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { CreditCard, AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

interface PendingPayment {
  missionId: string;
  serviceName: string;
  announcerName: string;
  amount: number;
  isReady?: boolean;
}

interface PendingValidation {
  id: Id<"missions">;
  serviceName: string;
  announcerName: string;
}

interface AlertBannersProps {
  pendingPayments: PendingPayment[] | undefined;
  pendingValidation: PendingValidation[];
  onConfirmMission?: (missionId: Id<"missions">) => void;
}

export function AlertBanners({ pendingPayments, pendingValidation, onConfirmMission }: AlertBannersProps) {
  const hasPayments = pendingPayments && pendingPayments.length > 0;
  const hasValidation = pendingValidation.length > 0;

  if (!hasPayments && !hasValidation) return null;

  return (
    <div className="space-y-4">
      {/* Alerte paiement en attente */}
      {hasPayments && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white shadow-lg shadow-orange-500/25"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <h2 className="text-lg font-bold">
                  {pendingPayments!.length === 1
                    ? "Paiement en attente"
                    : `${pendingPayments!.length} paiements en attente`}
                </h2>
              </div>
              <p className="text-white/90 mb-4">
                {pendingPayments!.length === 1
                  ? `Votre réservation "${pendingPayments![0].serviceName}" avec ${pendingPayments![0].announcerName} a été acceptée ! Finalisez le paiement pour confirmer.`
                  : "Vos réservations ont été acceptées ! Finalisez les paiements pour confirmer."}
              </p>
              <div className="flex flex-wrap gap-3">
                {pendingPayments!.slice(0, 2).map((payment) => (
                  <Link
                    key={payment.missionId}
                    href={`/client/paiement/${payment.missionId}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white text-orange-600 rounded-xl font-semibold text-sm hover:bg-white/90 transition-colors"
                  >
                    <CreditCard className="w-4 h-4" />
                    Payer {(payment.amount / 100).toFixed(2)} €
                  </Link>
                ))}
                {pendingPayments!.length > 2 && (
                  <Link
                    href="/client/reservations"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-xl font-semibold text-sm hover:bg-white/30 transition-colors"
                  >
                    Voir tout
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Bannière missions à valider */}
      {hasValidation && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: hasPayments ? 0.1 : 0 }}
          className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-5 text-white shadow-lg shadow-orange-500/20"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold mb-1">
                {pendingValidation.length === 1
                  ? "1 prestation à confirmer"
                  : `${pendingValidation.length} prestations à confirmer`}
              </h3>
              <p className="text-white/90 text-sm mb-3">
                Confirmez la bonne réalisation pour libérer le paiement
              </p>
              <div className="flex flex-wrap gap-2">
                {pendingValidation.slice(0, 3).map((mission) => (
                  <button
                    key={mission.id}
                    onClick={() => onConfirmMission?.(mission.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-orange-600 rounded-lg font-medium text-xs hover:bg-white/90 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {mission.serviceName}
                  </button>
                ))}
                {pendingValidation.length > 3 && (
                  <Link
                    href="/client/reservations"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/20 text-white rounded-lg font-medium text-xs hover:bg-white/30 transition-colors"
                  >
                    +{pendingValidation.length - 3} autres
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
