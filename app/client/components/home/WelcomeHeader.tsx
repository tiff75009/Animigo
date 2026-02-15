"use client";

import { motion } from "framer-motion";

interface WelcomeHeaderProps {
  displayName: string;
  upcomingCount: number;
  animationDelay?: number;
}

export function WelcomeHeader({ displayName, upcomingCount, animationDelay = 0 }: WelcomeHeaderProps) {
  const subtitle = upcomingCount > 0
    ? `${upcomingCount} réservation${upcomingCount > 1 ? "s" : ""} à venir`
    : "Tout est à jour !";

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animationDelay }}
      className="bg-gradient-to-r from-secondary to-secondary/80 rounded-2xl p-6 lg:p-8 text-white"
    >
      <h1 className="text-2xl lg:text-3xl font-bold mb-2">
        Bonjour {displayName} !
      </h1>
      <p className="text-white/90">{subtitle}</p>
    </motion.div>
  );
}
