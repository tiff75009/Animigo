"use client";

import { Package, User, Star, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/app/lib/utils";

export type TabType = "formules" | "profil" | "avis";

interface AnnouncerTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  reviewCount?: number;
  serviceCount?: number;
}

export default function AnnouncerTabs({
  activeTab,
  onTabChange,
  reviewCount = 0,
  serviceCount = 0,
}: AnnouncerTabsProps) {
  const tabs = [
    {
      id: "formules" as const,
      label: "Formules",
      icon: Package,
      count: serviceCount > 0 ? serviceCount : undefined,
    },
    {
      id: "profil" as const,
      label: "Profil",
      icon: User,
      count: undefined,
    },
    {
      id: "avis" as const,
      label: "Avis",
      icon: MessageSquare,
      count: reviewCount > 0 ? reviewCount : undefined,
    },
  ];

  return (
    <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-2">
        {/* Tabs container - full width like header card */}
        <div className="flex gap-1 p-1.5 bg-gray-100/80 rounded-xl">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium rounded-lg transition-all duration-200",
                  isActive
                    ? "bg-white text-primary shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <tab.icon className={cn(
                  "w-4 h-4 transition-colors",
                  isActive && "text-primary"
                )} />
                <span>{tab.label}</span>

                {/* Count badge */}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={cn(
                    "min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center text-xs font-semibold rounded-full transition-colors",
                    isActive
                      ? "bg-primary text-white"
                      : "bg-gray-300 text-gray-600"
                  )}>
                    {tab.count > 99 ? "99+" : tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
