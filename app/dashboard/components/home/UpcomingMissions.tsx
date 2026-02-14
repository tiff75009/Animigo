"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, PlusCircle, MapPin, Euro } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

interface MissionAnimal {
  name: string;
  type: string;
  emoji: string;
}

interface ActiveMission {
  id: Id<"missions">;
  animal: MissionAnimal | null;
  animals?: MissionAnimal[] | null;
  serviceName: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  status: string;
  clientName: string;
  announcerEarnings: number;
  serviceLocation?: string;
  city?: string;
}

interface UpcomingMissionsProps {
  missions: ActiveMission[];
}

const statusLabels: Record<string, { label: string; className: string }> = {
  pending_acceptance: { label: "À accepter", className: "bg-amber-100 text-amber-700" },
  pending_confirmation: { label: "En attente", className: "bg-orange-100 text-orange-700" },
  in_progress: { label: "En cours", className: "bg-blue-100 text-blue-700" },
  upcoming: { label: "À venir", className: "bg-purple-100 text-purple-700" },
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

function getAnimalDisplay(mission: ActiveMission) {
  const animals = mission.animals && mission.animals.length > 0
    ? mission.animals
    : mission.animal ? [mission.animal] : [];

  if (animals.length === 0) return { emoji: "🐾", label: "Animal" };
  if (animals.length === 1) return { emoji: animals[0].emoji, label: animals[0].name };
  return {
    emoji: animals[0].emoji,
    label: `${animals[0].name} +${animals.length - 1}`,
  };
}

export function UpcomingMissions({ missions }: UpcomingMissionsProps) {
  if (missions.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[280px]">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
          <span className="text-3xl">🐕</span>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Aucune garde en cours
        </h3>
        <p className="text-text-light mb-4 text-sm">
          Proposez votre première garde pour commencer
        </p>
        <Link
          href="/dashboard/missions/nouvelle"
          className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-medium hover:bg-primary/90 transition-colors text-sm"
        >
          <PlusCircle className="w-4 h-4" />
          Nouvelle garde
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Prochaines gardes
        </h3>
        <Link
          href="/dashboard/planning"
          className="text-primary text-sm font-medium flex items-center gap-1 hover:underline"
        >
          Planning
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-3">
        {missions.map((mission) => {
          const { emoji, label } = getAnimalDisplay(mission);
          const status = statusLabels[mission.status] || statusLabels.upcoming;
          const dateStr = new Date(mission.startDate).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
          });
          const timeStr = mission.startTime
            ? `${mission.startTime}${mission.endTime ? ` - ${mission.endTime}` : ""}`
            : null;

          return (
            <Link
              key={mission.id}
              href={`/dashboard/missions?tab=${mission.status}`}
            >
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl shadow-sm flex-shrink-0">
                  {emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground truncate">{label}</p>
                    <span className="text-xs text-text-light">• {mission.clientName}</span>
                  </div>
                  <p className="text-sm text-text-light truncate">{mission.serviceName}</p>
                  {mission.city && (
                    <p className="text-xs text-text-light flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {mission.city}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0 space-y-1">
                  <p className="text-sm font-medium text-foreground">{dateStr}</p>
                  {timeStr && (
                    <p className="text-xs text-text-light">{timeStr}</p>
                  )}
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                    {status.label}
                  </span>
                  <p className="text-xs font-medium text-green-600 flex items-center gap-0.5 justify-end">
                    <Euro className="w-3 h-3" />
                    {formatCurrency(mission.announcerEarnings)}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
