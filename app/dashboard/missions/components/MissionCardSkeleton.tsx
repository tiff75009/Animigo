"use client";

import { motion } from "framer-motion";

/**
 * Skeleton loader pour les cartes de mission
 * Affiche un placeholder pendant le chargement des données
 */
export function MissionCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm animate-pulse">
      <div className="flex gap-4">
        {/* Avatar animal */}
        <div className="w-14 h-14 bg-gray-200 rounded-xl flex-shrink-0" />

        {/* Contenu */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Nom client + service */}
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>

          {/* Dates et infos */}
          <div className="flex gap-4">
            <div className="h-3 bg-gray-200 rounded w-24" />
            <div className="h-3 bg-gray-200 rounded w-20" />
          </div>

          {/* Montant */}
          <div className="h-5 bg-gray-200 rounded w-16" />
        </div>

        {/* Badge status */}
        <div className="w-20 h-6 bg-gray-200 rounded-full flex-shrink-0" />
      </div>
    </div>
  );
}

/**
 * Liste de skeletons pour les missions
 */
export function MissionListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <MissionCardSkeleton />
        </motion.div>
      ))}
    </div>
  );
}
