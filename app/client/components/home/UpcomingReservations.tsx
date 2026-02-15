"use client";

import Link from "next/link";
import { ArrowRight, Search, Clock, MapPin } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

interface MissionAnimal {
  name: string;
  type: string;
  emoji: string;
}

interface UpcomingMission {
  id: Id<"missions">;
  serviceName: string;
  startDate: string;
  startTime?: string;
  endTime?: string;
  status: string;
  announcerName: string;
  animal: MissionAnimal | null;
  animals?: MissionAnimal[] | null;
  location?: string;
  city?: string;
}

interface UpcomingReservationsProps {
  missions: UpcomingMission[];
}

const statusLabels: Record<string, { label: string; className: string }> = {
  pending_acceptance: { label: "En attente", className: "bg-yellow-100 text-yellow-700" },
  pending_confirmation: { label: "À payer", className: "bg-orange-100 text-orange-700" },
  upcoming: { label: "Confirmée", className: "bg-green-100 text-green-700" },
  in_progress: { label: "En cours", className: "bg-blue-100 text-blue-700" },
};

function getAnimalDisplay(mission: UpcomingMission) {
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

export function UpcomingReservations({ missions }: UpcomingReservationsProps) {
  if (missions.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Prochaines réservations
        </h3>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🐕</span>
          </div>
          <p className="text-gray-500 mb-4">Aucune réservation à venir</p>
          <Link
            href="/recherche"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors text-sm"
          >
            <Search className="w-4 h-4" />
            Trouver un pet-sitter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Prochaines réservations
        </h3>
        <Link
          href="/client/reservations"
          className="text-primary text-sm font-medium flex items-center gap-1 hover:underline"
        >
          Voir tout
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
              href="/client/reservations"
            >
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl shadow-sm flex-shrink-0">
                  {emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground truncate">{label}</p>
                    <span className="text-xs text-gray-500">• {mission.announcerName}</span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{mission.serviceName}</p>
                  {(mission.city || mission.location) && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {mission.city || mission.location}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0 space-y-1">
                  <p className="text-sm font-medium text-foreground flex items-center gap-1 justify-end">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {dateStr}
                  </p>
                  {timeStr && (
                    <p className="text-xs text-gray-500">{timeStr}</p>
                  )}
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                    {status.label}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
