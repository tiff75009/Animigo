"use client";

import { cn } from "@/app/lib/utils";
import type { PaymentTab, MissionDetail } from "../types";

interface MissionTabsProps {
  activeTab: PaymentTab;
  onTabChange: (tab: PaymentTab) => void;
  missionsByStatus: {
    awaitingPayment: MissionDetail[];
    paid: MissionDetail[];
    completed: MissionDetail[];
    cancelled: MissionDetail[];
  };
}

const tabs: {
  key: PaymentTab;
  label: string;
  emoji: string;
  activeColor: string;
  activeBg: string;
}[] = [
  {
    key: "awaitingPayment",
    label: "En attente",
    emoji: "💳",
    activeColor: "text-amber-700",
    activeBg: "bg-amber-100",
  },
  {
    key: "paid",
    label: "Payé",
    emoji: "✓",
    activeColor: "text-blue-700",
    activeBg: "bg-blue-100",
  },
  {
    key: "completed",
    label: "Terminé",
    emoji: "🏁",
    activeColor: "text-green-700",
    activeBg: "bg-green-100",
  },
  {
    key: "cancelled",
    label: "Annulé",
    emoji: "✕",
    activeColor: "text-gray-700",
    activeBg: "bg-gray-200",
  },
];

export function MissionTabs({
  activeTab,
  onTabChange,
  missionsByStatus,
}: MissionTabsProps) {
  const counts: Record<PaymentTab, number> = {
    awaitingPayment: missionsByStatus.awaitingPayment.length,
    paid: missionsByStatus.paid.length,
    completed: missionsByStatus.completed.length,
    cancelled: missionsByStatus.cancelled.length,
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const count = counts[tab.key];

        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-medium transition-all",
              isActive
                ? `${tab.activeBg} ${tab.activeColor} shadow-sm`
                : "bg-white text-gray-500 hover:bg-gray-50"
            )}
          >
            <span>{tab.emoji}</span>
            <span>{tab.label}</span>
            {count > 0 && (
              <span
                className={cn(
                  "ml-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold",
                  isActive
                    ? "bg-white/60 text-inherit"
                    : "bg-gray-100 text-gray-500"
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
