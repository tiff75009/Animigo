"use client";

import { Package, User, Star } from "lucide-react";
import { cn } from "@/app/lib/utils";

export type TabType = "formules" | "profil" | "avis";

interface AnnouncerTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs = [
  { id: "formules" as const, label: "Formules", icon: Package },
  { id: "profil" as const, label: "Profil", icon: User },
  { id: "avis" as const, label: "Avis", icon: Star },
];

export default function AnnouncerTabs({ activeTab, onTabChange }: AnnouncerTabsProps) {
  return (
    <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex gap-2 p-1 bg-gray-100/80 rounded-xl max-w-md md:max-w-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium rounded-lg transition-all duration-200",
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
