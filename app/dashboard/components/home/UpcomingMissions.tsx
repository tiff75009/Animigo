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

const statusStyles: Record<string, React.CSSProperties> = {
  pending_acceptance: { background: "#fdf8ec", color: "#7a5b1a", border: "1px solid #f4e6c1" },
  pending_confirmation: { background: "#fdf8ec", color: "#7a5b1a", border: "1px solid #f4e6c1" },
  in_progress: { background: "#f5f9f6", color: "#1f3a33", border: "1px solid #cfdbd3" },
  upcoming: { background: "#fcfaf4", color: "#3a3a38", border: "1px solid #f1ede3" },
};
const statusLabelMap: Record<string, string> = {
  pending_acceptance: "À accepter",
  pending_confirmation: "En attente",
  in_progress: "En cours",
  upcoming: "À venir",
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
      <div
        className="p-8 text-center flex flex-col items-center justify-center min-h-[280px]"
        style={{ borderRadius: 14, background: "#fcfaf4", border: "1px solid #f1ede3" }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: "#fff", border: "1px solid #ece9e1" }}
        >
          <span className="text-[26px]">🐕</span>
        </div>
        <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-1">
          Empty state
        </div>
        <h3 className="text-base font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0 mb-2">
          Aucune garde en cours
        </h3>
        <p className="text-[12px] text-[#6d6d68] mb-4">
          Proposez votre première garde pour commencer
        </p>
        <Link
          href="/dashboard/missions/nouvelle"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition-opacity hover:opacity-90"
          style={{ background: "#1f3a33", color: "#f7f5ef" }}
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Nouvelle garde
        </Link>
      </div>
    );
  }

  return (
    <div
      className="bg-white p-5"
      style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-0.5">
            Prochaines
          </div>
          <h3 className="text-base font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
            Prochaines gardes
          </h3>
        </div>
        <Link
          href="/dashboard/planning"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors hover:bg-[#f7f5ef]"
          style={{ color: "#1f3a33", border: "1px solid #1f3a33" }}
        >
          Planning
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="space-y-2">
        {missions.map((mission) => {
          const { emoji, label } = getAnimalDisplay(mission);
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
              <div
                className="flex items-center gap-3 p-3 transition-colors cursor-pointer hover:bg-[#f7f5ef]"
                style={{ borderRadius: 12, background: "#fcfaf4", border: "1px solid #f1ede3" }}
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-[22px] flex-shrink-0"
                  style={{ background: "#fff", border: "1px solid #ece9e1" }}
                >
                  {emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-[14px] font-semibold text-[#1f1f1d] tracking-[-0.01em] truncate m-0">
                      {label}
                    </p>
                    <span className="text-[11px] text-[#9c9484]">· {mission.clientName}</span>
                  </div>
                  <p className="text-[12px] text-[#6d6d68] truncate">{mission.serviceName}</p>
                  {mission.city && (
                    <p className="text-[11px] text-[#9c9484] flex items-center gap-1 mt-0.5">
                      <MapPin className="w-2.5 h-2.5" />
                      {mission.city}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0 space-y-1">
                  <p className="text-[12.5px] font-semibold text-[#1f1f1d]">{dateStr}</p>
                  {timeStr && (
                    <p className="text-[11px] text-[#6d6d68]">{timeStr}</p>
                  )}
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                    style={statusStyles[mission.status] || statusStyles.upcoming}
                  >
                    {statusLabelMap[mission.status] || "À venir"}
                  </span>
                  <p className="text-[11px] font-semibold flex items-center gap-0.5 justify-end" style={{ color: "#2f4a3f" }}>
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
