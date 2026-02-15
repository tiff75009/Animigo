"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowRight, MapPin, User, Calendar, ChevronRight } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

interface MissionAnimal {
  name: string;
  type: string;
  emoji: string;
}

interface TimelineMission {
  id: Id<"missions">;
  serviceName: string;
  serviceCategory?: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  status: string;
  announcerName: string;
  animal: MissionAnimal | null;
  animals?: MissionAnimal[] | null;
  location?: string;
  city?: string;
}

interface ReservationTimelineProps {
  missions: TimelineMission[];
}

type TimelineItem =
  | { type: "section"; label: string; variant: "upcoming" | "in_progress" }
  | { type: "mission"; mission: TimelineMission };

const categoryEmojis: Record<string, string> = {
  garde: "🏠",
  promenade: "🦮",
  visite: "👀",
  toilettage: "✂️",
  education: "🎓",
  transport: "🚗",
};

function getAnimalDisplay(mission: TimelineMission) {
  const animals =
    mission.animals && mission.animals.length > 0
      ? mission.animals
      : mission.animal
        ? [mission.animal]
        : [];

  if (animals.length === 0) return { emoji: "🐾", names: "" };
  if (animals.length === 1)
    return { emoji: animals[0].emoji, names: animals[0].name };
  return {
    emoji: animals[0].emoji,
    names: `${animals[0].name} +${animals.length - 1}`,
  };
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const day = d.getDate();
  const month = d
    .toLocaleDateString("fr-FR", { month: "short" })
    .replace(".", "");
  return `${day} ${month}`;
}

function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

export function ReservationTimeline({ missions }: ReservationTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (missions.length === 0) return null;

  // Séparer : à venir d'abord, en cours ensuite
  const upcomingMissions = missions
    .filter((m) => m.status !== "in_progress")
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

  const inProgressMissions = missions
    .filter((m) => m.status === "in_progress")
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

  // Construire la séquence du timeline
  const items: TimelineItem[] = [];
  if (upcomingMissions.length > 0) {
    items.push({ type: "section", label: "À venir", variant: "upcoming" });
    upcomingMissions.forEach((m) =>
      items.push({ type: "mission", mission: m })
    );
  }
  if (inProgressMissions.length > 0) {
    items.push({ type: "section", label: "En cours", variant: "in_progress" });
    inProgressMissions.forEach((m) =>
      items.push({ type: "mission", mission: m })
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-foreground">Agenda</h3>
        <Link
          href="/client/reservations"
          className="text-primary text-sm font-medium flex items-center gap-1 hover:underline"
        >
          Toutes
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="relative">
        {/* Ligne continue du timeline (centrée sur les dots/badges) */}
        <div className="absolute top-[13px] left-4 right-4 h-0.5 bg-gray-200 z-0 rounded-full" />

        <div className="flex overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
          {items.map((item, index) => {
            // ── Section indicator ──
            if (item.type === "section") {
              return (
                <div
                  key={`section-${item.variant}`}
                  className="flex-shrink-0 px-1 z-10"
                >
                  <div
                    className={`
                    inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap
                    ${
                      item.variant === "in_progress"
                        ? "bg-blue-100 text-blue-700 border border-blue-200"
                        : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    }
                  `}
                  >
                    {item.variant === "in_progress" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse mr-1.5" />
                    )}
                    {item.label}
                  </div>
                </div>
              );
            }

            // ── Mission card ──
            const mission = item.mission;
            const isExpanded = expandedId === mission.id;
            const { emoji, names } = getAnimalDisplay(mission);
            const today = isToday(mission.startDate);
            const catEmoji = mission.serviceCategory
              ? categoryEmojis[mission.serviceCategory]
              : undefined;
            const isInProgress = mission.status === "in_progress";

            return (
              <div
                key={mission.id}
                className="flex-shrink-0 flex flex-col items-center px-1.5 z-10"
              >
                {/* Dot sur la ligne */}
                <div className="pt-[8px]">
                  <div
                    className={`
                    w-2.5 h-2.5 rounded-full ring-2 ring-white
                    ${
                      isInProgress
                        ? "bg-blue-500 animate-pulse"
                        : today
                          ? "bg-primary ring-primary/20"
                          : "bg-gray-300"
                    }
                  `}
                  />
                </div>

                {/* Date sous le dot */}
                <span
                  className={`
                  text-[9px] font-semibold mt-1 whitespace-nowrap leading-none
                  ${today ? "text-primary" : "text-gray-400"}
                `}
                >
                  {today ? "Aujourd'hui" : formatDate(mission.startDate)}
                </span>

                {/* Card (compact / expanded) */}
                <button
                  onClick={() =>
                    setExpandedId((prev) =>
                      prev === mission.id ? null : mission.id
                    )
                  }
                  className="mt-1.5 text-left focus:outline-none"
                >
                  <div
                    className={`
                    rounded-xl border transition-all duration-200
                    ${
                      isInProgress
                        ? "bg-blue-50 border-blue-200"
                        : today
                          ? "bg-primary/5 border-primary/20"
                          : "bg-white border-gray-200 hover:border-gray-300"
                    }
                    ${isExpanded ? "shadow-lg w-[230px]" : "shadow-sm hover:shadow-md w-[140px]"}
                  `}
                  >
                    {/* Vue compacte (toujours visible) */}
                    <div className="p-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base flex-shrink-0">{emoji}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold text-foreground truncate leading-tight">
                            {catEmoji && (
                              <span className="mr-0.5">{catEmoji}</span>
                            )}
                            {mission.serviceName}
                          </p>
                          {mission.startTime && (
                            <p className="text-[10px] text-gray-500 mt-0.5 leading-none">
                              {mission.startTime}
                              {mission.endTime && ` – ${mission.endTime}`}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Vue détaillée (expanded) */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mx-2.5 mb-2.5 pt-2 border-t border-black/5 space-y-1.5">
                            {names && (
                              <p className="text-[11px] text-gray-600 flex items-center gap-1.5">
                                <span className="text-sm">{emoji}</span>
                                {names}
                              </p>
                            )}
                            <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                              <User className="w-3 h-3 flex-shrink-0" />
                              {mission.announcerName}
                            </p>
                            {(mission.city || mission.location) && (
                              <p className="text-[11px] text-gray-500 flex items-center gap-1.5 truncate">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                {mission.city || mission.location}
                              </p>
                            )}
                            {mission.endDate &&
                              mission.endDate !== mission.startDate && (
                                <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                                  <Calendar className="w-3 h-3 flex-shrink-0" />
                                  {formatDate(mission.startDate)} &rarr;{" "}
                                  {formatDate(mission.endDate)}
                                </p>
                              )}
                            <Link
                              href="/client/reservations"
                              className="inline-flex items-center gap-0.5 text-[11px] text-primary font-semibold pt-1 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Voir détails
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
