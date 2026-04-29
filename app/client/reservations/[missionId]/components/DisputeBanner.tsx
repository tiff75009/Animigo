"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Wallet,
} from "lucide-react";

interface DisputeBannerProps {
  dispute: any;
  // mission optionnelle pour afficher le montant remboursé en lien avec la dispute
  mission?: any;
  formatPrice?: (cents: number) => string;
}

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    description: string;
    bg: string;
    border: string;
    text: string;
    accent: string;
    Icon: typeof AlertTriangle;
  }
> = {
  open: {
    label: "Réclamation ouverte",
    description:
      "Notre équipe va prendre contact avec le prestataire et examiner votre demande.",
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-800",
    accent: "text-red-600",
    Icon: AlertTriangle,
  },
  investigating: {
    label: "En investigation",
    description:
      "Notre équipe support analyse les éléments fournis. Vous serez tenu(e) informé(e).",
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    accent: "text-amber-600",
    Icon: ShieldAlert,
  },
  resolved_client: {
    label: "Résolue en votre faveur",
    description:
      "Notre équipe a tranché en votre faveur. Le remboursement est en cours de traitement.",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-800",
    accent: "text-emerald-600",
    Icon: ShieldCheck,
  },
  resolved_announcer: {
    label: "Résolue en faveur du prestataire",
    description:
      "Suite à notre enquête, votre réclamation n'a pas été retenue. Le paiement a été versé au prestataire.",
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-800",
    accent: "text-slate-600",
    Icon: ShieldAlert,
  },
  closed: {
    label: "Réclamation clôturée",
    description: "Cette réclamation est définitivement clôturée.",
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-800",
    accent: "text-slate-500",
    Icon: CheckCircle2,
  },
};

const formatLongDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export function DisputeBanner({
  dispute,
  mission,
  formatPrice,
}: DisputeBannerProps) {
  if (!dispute) return null;

  const config = STATUS_CONFIG[dispute.status] ?? STATUS_CONFIG.open;
  const Icon = config.Icon;
  const isResolvedForClient = dispute.status === "resolved_client";
  const refundAmount = mission?.refundAmount ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-5 border ${config.bg} ${config.border}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`p-2 rounded-xl flex-shrink-0 ${config.bg}`}
          style={{ background: "rgba(255,255,255,0.6)" }}
        >
          <Icon className={`w-5 h-5 ${config.accent}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold ${config.text}`}>
            {config.label}
            {dispute.reasonLabel && (
              <span className="font-normal opacity-80"> — {dispute.reasonLabel}</span>
            )}
          </p>
          <p className={`text-sm mt-1 ${config.accent}`}>{config.description}</p>

          {/* Détails contextuels */}
          <div className="mt-3 space-y-1.5 text-xs">
            {dispute.paymentBlocked && dispute.status !== "resolved_announcer" && (
              <div className={`flex items-center gap-1.5 ${config.accent}`}>
                <Lock className="w-3.5 h-3.5" />
                Paiement au prestataire suspendu
              </div>
            )}

            {isResolvedForClient && refundAmount > 0 && formatPrice && (
              <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <Wallet className="w-3.5 h-3.5" />
                Remboursement de {formatPrice(refundAmount)} en cours
                <span className="font-normal text-emerald-600">
                  (5-10 jours ouvrés)
                </span>
              </div>
            )}

            {dispute.resolvedAt && (
              <div className={`flex items-center gap-1.5 ${config.accent}`}>
                <Calendar className="w-3.5 h-3.5" />
                Résolue le {formatLongDate(dispute.resolvedAt)}
              </div>
            )}
          </div>

          {/* Message de résolution de l'admin si présent */}
          {dispute.resolution && (
            <div
              className="mt-3 p-3 rounded-xl text-sm whitespace-pre-wrap"
              style={{
                background: "rgba(255,255,255,0.6)",
                border: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <p
                className={`text-[11px] font-medium uppercase tracking-wide mb-1 ${config.accent}`}
              >
                Message de notre équipe
              </p>
              <p className={config.text}>{dispute.resolution}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
