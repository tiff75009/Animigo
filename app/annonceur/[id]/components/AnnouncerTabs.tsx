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
    <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-sm md:hidden">
      <div className="px-4 py-3">
        <div className="flex gap-2 p-1 bg-gray-100/80 rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                activeTab === tab.id
                  ? "bg-white text-primary shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
