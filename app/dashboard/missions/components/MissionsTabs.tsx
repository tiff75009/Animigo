"use client";

import { motion } from "framer-motion";
import {
  HelpCircle,
  Clock,
  Calendar,
  CalendarClock,
  CheckCircle,
  XCircle,
  Ban,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/app/lib/utils";

export type MissionTab =
  | "pending_acceptance"
  | "pending_confirmation"
  | "upcoming"
  | "in_progress"
  | "completed"
  | "refused"
  | "cancelled";

interface TabConfig {
  id: MissionTab;
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  textColor: string;
}

export const TABS_CONFIG: TabConfig[] = [
  {
    id: "pending_acceptance",
    label: "À accepter",
    icon: HelpCircle,
    color: "accent",
    bgColor: "bg-accent/20",
    textColor: "text-foreground",
  },
  {
    id: "pending_confirmation",
    label: "En attente",
    icon: Clock,
    color: "orange",
    bgColor: "bg-orange-100",
    textColor: "text-orange-700",
  },
  {
    id: "upcoming",
    label: "À venir",
    icon: Calendar,
    color: "purple",
    bgColor: "bg-purple/20",
    textColor: "text-purple",
  },
  {
    id: "in_progress",
    label: "En cours",
    icon: CalendarClock,
    color: "blue",
    bgColor: "bg-blue-100",
    textColor: "text-blue-700",
  },
  {
    id: "completed",
    label: "Terminées",
    icon: CheckCircle,
    color: "green",
    bgColor: "bg-green-100",
    textColor: "text-green-700",
  },
  {
    id: "refused",
    label: "Refusées",
    icon: XCircle,
    color: "red",
    bgColor: "bg-red-100",
    textColor: "text-red-700",
  },
  {
    id: "cancelled",
    label: "Annulées",
    icon: Ban,
    color: "gray",
    bgColor: "bg-gray-100",
    textColor: "text-gray-700",
  },
];

interface MissionsTabsProps {
  activeTab: MissionTab;
  onTabChange: (tab: MissionTab) => void;
  counts?: Partial<Record<MissionTab, number>>;
}

export function MissionsTabs({ activeTab, onTabChange, counts = {} }: MissionsTabsProps) {
  return (
    <div className="relative">
      {/* Scroll container */}
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-2 min-w-max pb-2">
          {TABS_CONFIG.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = counts[tab.id] ?? 0;

            return (
              <motion.button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap",
                  isActive
                    ? `${tab.bgColor} ${tab.textColor} shadow-sm`
                    : "bg-white text-text-light hover:bg-slate-50"
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      "min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center",
                      isActive
                        ? "bg-white/80 text-foreground"
                        : `${tab.bgColor} ${tab.textColor}`
                    )}
                  >
                    {count}
                  </span>
                )}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-xl border-2 border-current opacity-20"
                    layoutId="activeTab"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Gradient fade on edges */}
      <div className="absolute top-0 left-0 h-full w-4 bg-gradient-to-r from-background to-transparent pointer-events-none md:hidden" />
      <div className="absolute top-0 right-0 h-full w-4 bg-gradient-to-l from-background to-transparent pointer-events-none md:hidden" />
    </div>
  );
}

export function getTabConfig(tabId: MissionTab): TabConfig {
  return TABS_CONFIG.find((t) => t.id === tabId) || TABS_CONFIG[0];
}
