"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface DisputeBannerProps {
  dispute: any;
}

export function DisputeBanner({ dispute }: DisputeBannerProps) {
  if (!dispute) return null;

  return (
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
  );
}
