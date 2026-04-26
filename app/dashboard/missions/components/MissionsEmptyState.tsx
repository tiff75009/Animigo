"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { MissionTab } from "./MissionsTabs";

interface MissionsEmptyStateProps {
  tab: MissionTab;
}

const emptyStateConfig: Record<
  MissionTab,
  {
    emoji: string;
    title: string;
    description: string;
    linkText?: string;
    linkHref?: string;
  }
> = {
  pending_acceptance: {
    emoji: "📭",
    title: "Aucune mission en attente",
    description: "Vous n'avez pas de nouvelles demandes de mission pour le moment.",
  },
  pending_confirmation: {
    emoji: "✅",
    title: "Aucune mission en attente",
    description: "Toutes vos propositions ont été traitées par les clients.",
    linkText: "Voir les demandes à accepter",
    linkHref: "/dashboard/missions?tab=pending_acceptance",
  },
  upcoming: {
    emoji: "📆",
    title: "Aucune mission planifiée",
    description:
      "Vous n'avez pas de mission à venir. Acceptez de nouvelles demandes pour remplir votre planning !",
  },
  in_progress: {
    emoji: "🏖️",
    title: "Pas de mission en cours",
    description:
      "Vous n'avez pas de mission active pour le moment. Consultez vos missions à venir !",
  },
  completed: {
    emoji: "🎯",
    title: "Aucune mission terminée",
    description:
      "Vous n'avez pas encore terminé de mission. Vos missions complétées apparaîtront ici.",
  },
  refused: {
    emoji: "👍",
    title: "Aucune mission refusée",
    description: "Vous n'avez refusé aucune mission. Excellent travail !",
  },
  cancelled: {
    emoji: "✨",
    title: "Aucune mission annulée",
    description: "Parfait ! Vous n'avez aucune mission annulée dans votre historique.",
  },
};

export function MissionsEmptyState({ tab }: MissionsEmptyStateProps) {
  const config = emptyStateConfig[tab];

  return (
    <motion.div
      className="bg-white p-10 text-center"
      style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.2 }}
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-[32px]"
        style={{ background: "#fcfaf4", border: "1px solid #f1ede3" }}
      >
        {config.emoji}
      </motion.div>
      <div className="text-[10px] font-medium uppercase tracking-[0.1em] mb-1" style={{ color: "#9c9484" }}>
        Liste vide
      </div>
      <h3 className="text-[16px] font-semibold text-[#1f1f1d] tracking-[-0.01em] mb-2">
        {config.title}
      </h3>
      <p className="text-[13px] mb-5 max-w-md mx-auto leading-[1.5]" style={{ color: "#6d6d68" }}>
        {config.description}
      </p>
      {config.linkText && config.linkHref && (
        <Link
          href={config.linkHref}
          className="inline-flex items-center gap-1.5 px-4 py-2 font-semibold rounded-full transition-opacity hover:opacity-90 text-[13px]"
          style={{ background: "#1f3a33", color: "#f7f5ef" }}
        >
          {config.linkText}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </motion.div>
  );
}
