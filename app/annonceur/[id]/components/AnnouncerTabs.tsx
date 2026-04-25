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
        <div
          className="flex gap-1 p-1"
          style={{
            background: "#fff",
            border: "1px solid #ece9e1",
            borderRadius: 999,
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 text-[13px] font-medium rounded-full transition-colors"
                style={
                  isActive
                    ? { background: "#1f3a33", color: "#f7f5ef" }
                    : { color: "#6d6d68" }
                }
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>

                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className="min-w-[1.1rem] h-[18px] px-1.5 inline-flex items-center justify-center text-[10px] font-bold rounded-full"
                    style={
                      isActive
                        ? { background: "rgba(247,245,239,0.25)", color: "#f7f5ef" }
                        : { background: "#f7f5ef", color: "#6d6d68" }
                    }
                  >
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
