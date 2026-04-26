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

interface BannerConfig {
  emoji: string;
  title: string;
  description: string;
  // Couleur d'accent (palette sobre)
  accent: string;
  pastelBg: string;
  pastelBorder: string;
  textColor: string;
  subTextColor: string;
}

const bannerConfig: Record<MissionTab, BannerConfig | null> = {
  pending_acceptance: null,
  pending_confirmation: {
    emoji: "⏳",
    title: "En attente du client",
    description:
      "Vous avez accepté ces missions. Le propriétaire doit maintenant confirmer la réservation en effectuant le paiement.",
    accent: "#d97f3a",
    pastelBg: "#fdf0e6",
    pastelBorder: "#f4d6bc",
    textColor: "#7a4a1a",
    subTextColor: "#a36e3a",
  },
  upcoming: {
    emoji: "📅",
    title: "Préparez-vous",
    description:
      "Consultez les détails de chaque mission pour bien vous préparer à accueillir les animaux.",
    accent: "#1f3a33",
    pastelBg: "#f5f9f6",
    pastelBorder: "#cfdbd3",
    textColor: "#1f3a33",
    subTextColor: "#3a6052",
  },
  in_progress: {
    emoji: "📸",
    title: "Gardez le contact",
    description:
      "N'oubliez pas d'envoyer des photos et nouvelles aux propriétaires pour les rassurer !",
    accent: "#3a72c4",
    pastelBg: "#eaf0fd",
    pastelBorder: "#c8d6f0",
    textColor: "#1e3f7a",
    subTextColor: "#3a5a96",
  },
  completed: {
    emoji: "💰",
    title: "Paiements en attente",
    description:
      "Vous avez {amount} à encaisser. Les paiements sont généralement traités sous 48h.",
    accent: "#d97f3a",
    pastelBg: "#fdf0e6",
    pastelBorder: "#f4d6bc",
    textColor: "#7a4a1a",
    subTextColor: "#a36e3a",
  },
  refused: {
    emoji: "💡",
    title: "Conseil",
    description:
      "Il est normal de refuser certaines missions si elles ne correspondent pas à vos disponibilités ou vos compétences. Gardez un taux d'acceptation raisonnable pour maintenir votre visibilité.",
    accent: "#3a72c4",
    pastelBg: "#eaf0fd",
    pastelBorder: "#c8d6f0",
    textColor: "#1e3f7a",
    subTextColor: "#3a5a96",
  },
  cancelled: {
    emoji: "ℹ️",
    title: "Annulations",
    description:
      "Ces missions ont été annulées par le propriétaire ou par vous-même. Les annulations tardives peuvent impacter votre classement.",
    accent: "#9c9484",
    pastelBg: "#f7f5ef",
    pastelBorder: "#ece9e1",
    textColor: "#3a3a38",
    subTextColor: "#6d6d68",
  },
};

export function MissionsInfoBanner({ tab, pendingAmount = 0 }: MissionsInfoBannerProps) {
  const config = bannerConfig[tab];

  if (tab === "completed" && pendingAmount <= 0) return null;
  if (!config) return null;

  const description = config.description.replace("{amount}", formatCurrency(pendingAmount));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="p-3.5 flex items-start gap-3"
      style={{
        borderRadius: 12,
        background: config.pastelBg,
        border: `1px solid ${config.pastelBorder}`,
        borderLeft: `3px solid ${config.accent}`,
      }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[16px]"
        style={{ background: "#fff", border: `1px solid ${config.pastelBorder}` }}
      >
        {config.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="text-[10px] font-medium uppercase tracking-[0.1em] mb-0.5"
          style={{ color: config.subTextColor }}
        >
          Information
        </div>
        <p
          className="text-[13.5px] font-semibold tracking-[-0.01em] m-0"
          style={{ color: config.textColor }}
        >
          {config.title}
        </p>
        <p className="text-[12px] mt-0.5 leading-[1.5]" style={{ color: config.subTextColor }}>
          {description}
        </p>
      </div>
    </motion.div>
  );
}
