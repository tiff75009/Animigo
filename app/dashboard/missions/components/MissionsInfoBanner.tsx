"use client";

import { motion } from "framer-motion";
import type { MissionTab } from "./MissionsTabs";

interface MissionsInfoBannerProps {
  tab: MissionTab;
  pendingAmount?: number;
}

function formatCurrency(amountInCents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  }).format(amountInCents / 100);
}

const bannerConfig: Record<MissionTab, {
  emoji: string;
  title: string;
  description: string;
  bgColor: string;
  borderColor: string;
  titleColor: string;
  textColor: string;
} | null> = {
  pending_acceptance: null, // Pas de banner pour cette tab
  pending_confirmation: {
    emoji: "⏳",
    title: "En attente du client",
    description: "Vous avez accepté ces missions. Le propriétaire doit maintenant confirmer la réservation en effectuant le paiement.",
    bgColor: "bg-gradient-to-r from-orange-50 to-amber-50",
    borderColor: "border-orange-200",
    titleColor: "text-orange-800",
    textColor: "text-orange-700",
  },
  upcoming: {
    emoji: "📅",
    title: "Préparez-vous",
    description: "Consultez les détails de chaque mission pour bien vous préparer à accueillir les animaux.",
    bgColor: "bg-purple/10",
    borderColor: "border-purple/30",
    titleColor: "text-purple",
    textColor: "text-purple/80",
  },
  in_progress: {
    emoji: "📸",
    title: "Gardez le contact",
    description: "N'oubliez pas d'envoyer des photos et nouvelles aux propriétaires pour les rassurer !",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    titleColor: "text-blue-800",
    textColor: "text-blue-700",
  },
  completed: {
    emoji: "💰",
    title: "Paiements en attente",
    description: "Vous avez {amount} à encaisser. Les paiements sont généralement traités sous 48h.",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    titleColor: "text-orange-800",
    textColor: "text-orange-700",
  },
  refused: {
    emoji: "💡",
    title: "Conseil",
    description: "Il est normal de refuser certaines missions si elles ne correspondent pas à vos disponibilités ou vos compétences. Gardez un taux d'acceptation raisonnable pour maintenir votre visibilité.",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    titleColor: "text-blue-800",
    textColor: "text-blue-700",
  },
  cancelled: {
    emoji: "ℹ️",
    title: "Annulations",
    description: "Ces missions ont été annulées par le propriétaire ou par vous-même. Les annulations tardives peuvent impacter votre classement.",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    titleColor: "text-gray-800",
    textColor: "text-gray-600",
  },
};

export function MissionsInfoBanner({ tab, pendingAmount = 0 }: MissionsInfoBannerProps) {
  const config = bannerConfig[tab];

  // Cas spécial pour completed : afficher uniquement si pendingAmount > 0
  if (tab === "completed" && pendingAmount <= 0) return null;
  if (!config) return null;

  // Remplacer {amount} dans la description
  const description = config.description.replace("{amount}", formatCurrency(pendingAmount));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className={`${config.bgColor} border ${config.borderColor} rounded-2xl p-4 flex items-start gap-3`}
    >
      <span className="text-2xl">{config.emoji}</span>
      <div>
        <p className={`font-semibold ${config.titleColor}`}>{config.title}</p>
        <p className={`text-sm ${config.textColor}`}>{description}</p>
      </div>
    </motion.div>
  );
}
