"use client";

import { useState } from "react";
import { Calendar, CreditCard, CheckCircle, XCircle } from "lucide-react";
import type { MissionDetail, PaymentTab } from "../types";
import { MissionRow } from "./MissionRow";

interface MissionListProps {
  missions: MissionDetail[];
  tab: PaymentTab;
  isPro: boolean;
}

const PAGE_SIZE = 10;

const emptyStates: Record<
  PaymentTab,
  { icon: React.ElementType; title: string; description: string }
> = {
  awaitingPayment: {
    icon: CreditCard,
    title: "Aucune mission en attente de paiement",
    description: "Les missions en attente de confirmation client apparaîtront ici",
  },
  paid: {
    icon: Calendar,
    title: "Aucune mission payée en cours",
    description: "Les missions à venir et en cours avec paiement confirmé apparaîtront ici",
  },
  completed: {
    icon: CheckCircle,
    title: "Aucune mission terminée",
    description: "Vos missions terminées et leurs revenus apparaîtront ici",
  },
  cancelled: {
    icon: XCircle,
    title: "Aucune annulation",
    description: "Bonne nouvelle ! Vous n'avez aucune mission annulée",
  },
};

export function MissionList({ missions, tab, isPro }: MissionListProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const sortedMissions = [...missions].sort((a, b) => {
    if (tab === "cancelled") {
      return (b.cancelledAt || 0) - (a.cancelledAt || 0);
    }
    return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
  });

  const visibleMissions = sortedMissions.slice(0, visibleCount);
  const hasMore = visibleCount < sortedMissions.length;

  if (missions.length === 0) {
    const empty = emptyStates[tab];
    const Icon = empty.icon;
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
          <Icon className="h-7 w-7 text-gray-400" />
        </div>
        <h3 className="font-semibold text-foreground">{empty.title}</h3>
        <p className="mt-1 text-sm text-gray-500">{empty.description}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {visibleMissions.map((mission, i) => (
        <MissionRow
          key={mission._id}
          mission={mission}
          tab={tab}
          isPro={isPro}
          index={i}
        />
      ))}

      {hasMore && (
        <button
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="w-full rounded-2xl bg-white py-3 text-sm font-medium text-primary shadow-sm transition-colors hover:bg-primary/5"
        >
          Voir plus ({sortedMissions.length - visibleCount} restantes)
        </button>
      )}
    </div>
  );
}
