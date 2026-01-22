"use client";

import { Sparkles, Star, Users } from "lucide-react";
import { cn } from "@/app/lib/utils";

export type TabType = "services" | "avis" | "infos";

interface AnnouncerTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs = [
  { id: "services" as const, label: "Prestations", icon: Sparkles },
  { id: "avis" as const, label: "Avis", icon: Star },
  { id: "infos" as const, label: "Infos", icon: Users },
];

export default function AnnouncerTabs({ activeTab, onTabChange }: AnnouncerTabsProps) {
  return (
    <div className="sticky top-16 z-40 bg-white border-b border-gray-200 md:hidden">
      <div className="flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-gray-500"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
