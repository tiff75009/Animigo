"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { MissionTab } from "./MissionsTabs";

interface MissionsEmptyStateProps {
  tab: MissionTab;
}

const emptyStateConfig: Record<MissionTab, {
  emoji: string;
  title: string;
  description: string;
  linkText?: string;
  linkHref?: string;
}> = {
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
    description: "Vous n'avez pas de mission à venir. Acceptez de nouvelles demandes pour remplir votre planning !",
  },
  in_progress: {
    emoji: "🏖️",
    title: "Pas de mission en cours",
    description: "Vous n'avez pas de mission active pour le moment. Consultez vos missions à venir !",
  },
  completed: {
    emoji: "🎯",
    title: "Aucune mission terminée",
    description: "Vous n'avez pas encore terminé de mission. Vos missions complétées apparaîtront ici.",
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
      className="bg-white rounded-2xl p-12 shadow-md text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.2 }}
        className="text-6xl mb-4"
      >
        {config.emoji}
      </motion.div>
      <h3 className="text-xl font-semibold text-foreground mb-2">
        {config.title}
      </h3>
      <p className="text-text-light mb-6 max-w-md mx-auto">
        {config.description}
      </p>
      {config.linkText && config.linkHref && (
        <Link
          href={config.linkHref}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors"
        >
          {config.linkText}
        </Link>
      )}
    </motion.div>
  );
}
