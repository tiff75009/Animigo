"use client";

import { motion } from "framer-motion";
import {
  Calendar,
  PawPrint,
  Scissors,
  Users,
  UserCircle,
} from "lucide-react";
import { cn } from "@/app/lib/utils";

interface ServiceAnimalCardProps {
  mission: any;
}

export function ServiceAnimalCard({ mission }: ServiceAnimalCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0",
          mission.animals && mission.animals.length > 1 ? "text-lg gap-0.5" : "text-2xl"
        )}>
          {mission.animals && mission.animals.length > 1
            ? mission.animals.slice(0, 3).map((a: { emoji: string }, i: number) => (
                <span key={i}>{a.emoji}</span>
              ))
            : (mission.animal?.emoji || "🐾")
          }
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground truncate">
            {mission.serviceName}
          </h3>
          {mission.animals && mission.animals.length > 1 ? (
            <p className="text-gray-500 text-sm">
              Pour {mission.animals.map((a: { name: string }) => a.name).join(", ")}
              <span className="text-gray-400 ml-1">({mission.animals.length} animaux)</span>
            </p>
          ) : (
            <p className="text-gray-500 text-sm">
              Pour {mission.animal?.name || "votre animal"}
              {mission.animal?.type && ` (${mission.animal.type})`}
            </p>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mt-4">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
            mission.serviceCategory === "garde"
              ? "bg-purple-100 text-purple-700"
              : "bg-teal-100 text-teal-700"
          )}
        >
          {mission.serviceCategory === "garde" ? (
            <>
              <PawPrint className="w-3.5 h-3.5" />
              Garde
            </>
          ) : (
            <>
              <Scissors className="w-3.5 h-3.5" />
              Service
            </>
          )}
        </span>

        {mission.sessionType && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
              mission.sessionType === "collective"
                ? "bg-blue-100 text-blue-700"
                : "bg-amber-100 text-amber-700"
            )}
          >
            {mission.sessionType === "collective" ? (
              <>
                <Users className="w-3.5 h-3.5" />
                Collectif
              </>
            ) : (
              <>
                <UserCircle className="w-3.5 h-3.5" />
                Individuel
              </>
            )}
          </span>
        )}

        {mission.numberOfSessions && mission.numberOfSessions > 1 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <Calendar className="w-3.5 h-3.5" />
            {mission.numberOfSessions} séances
          </span>
        )}
      </div>
    </motion.div>
  );
}
