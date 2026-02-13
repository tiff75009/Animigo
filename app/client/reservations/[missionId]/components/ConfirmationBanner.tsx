"use client";

import { motion } from "framer-motion";
import { CheckCircle, Loader2, AlertTriangle, Clock } from "lucide-react";

interface ConfirmationBannerProps {
  isConfirming: boolean;
  canDispute: boolean;
  onConfirmEnd: () => void;
  onOpenDispute: () => void;
  autoConfirmedAt?: number;
  clientConfirmedAt?: number;
}

export function ConfirmationBanner({
  isConfirming,
  canDispute,
  onConfirmEnd,
  onOpenDispute,
  autoConfirmedAt,
  clientConfirmedAt,
}: ConfirmationBannerProps) {
  // Si déjà confirmé (auto ou manuellement), afficher le statut
  if (autoConfirmedAt || clientConfirmedAt) {
    const confirmedDate = new Date(autoConfirmedAt || clientConfirmedAt!);
    const formattedDate = confirmedDate.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl p-5 border ${autoConfirmedAt ? "border-blue-200 bg-blue-50" : "border-green-200 bg-green-50"}`}
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl ${autoConfirmedAt ? "bg-blue-100" : "bg-green-100"}`}>
            {autoConfirmedAt ? (
              <Clock className="w-5 h-5 text-blue-600" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}
          </div>
          <div>
            <h3 className={`font-semibold ${autoConfirmedAt ? "text-blue-800" : "text-green-800"}`}>
              {autoConfirmedAt
                ? "Service confirmé automatiquement"
                : "Service confirmé"}
            </h3>
            <p className={`text-sm mt-0.5 ${autoConfirmedAt ? "text-blue-600" : "text-green-600"}`}>
              {autoConfirmedAt
                ? `Confirmé automatiquement le ${formattedDate} après expiration du délai de validation.`
                : `Confirmé par vous le ${formattedDate}.`}
              {" "}Le versement au prestataire est en cours de traitement.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Sinon, afficher le bandeau de confirmation
  return (
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
          onClick={onConfirmEnd}
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
            onClick={onOpenDispute}
            className="py-3 px-4 border-2 border-red-200 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-5 h-5" />
            Signaler
          </button>
        )}
      </div>
    </motion.div>
  );
}
