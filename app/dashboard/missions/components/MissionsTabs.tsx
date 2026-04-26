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
  // Couleur d'accent (pour le compteur et le header de page)
  accent: string;
  pastelBg: string;
  pastelBorder: string;
  // Compatibilité ascendante
  bgColor: string;
  textColor: string;
  color: string;
}

export const TABS_CONFIG: TabConfig[] = [
  {
    id: "pending_acceptance",
    label: "À accepter",
    icon: HelpCircle,
    accent: "#c9a14a",
    pastelBg: "#fdf8ec",
    pastelBorder: "#f4e6c1",
    color: "amber",
    bgColor: "bg-[#fdf8ec]",
    textColor: "text-[#7a5b1a]",
  },
  {
    id: "pending_confirmation",
    label: "En attente",
    icon: Clock,
    accent: "#d97f3a",
    pastelBg: "#fdf0e6",
    pastelBorder: "#f4d6bc",
    color: "orange",
    bgColor: "bg-[#fdf0e6]",
    textColor: "text-[#7a4a1a]",
  },
  {
    id: "upcoming",
    label: "À venir",
    icon: Calendar,
    accent: "#1f3a33",
    pastelBg: "#f5f9f6",
    pastelBorder: "#cfdbd3",
    color: "green",
    bgColor: "bg-[#f5f9f6]",
    textColor: "text-[#1f3a33]",
  },
  {
    id: "in_progress",
    label: "En cours",
    icon: CalendarClock,
    accent: "#3a72c4",
    pastelBg: "#eaf0fd",
    pastelBorder: "#c8d6f0",
    color: "blue",
    bgColor: "bg-[#eaf0fd]",
    textColor: "text-[#1e3f7a]",
  },
  {
    id: "completed",
    label: "Terminées",
    icon: CheckCircle,
    accent: "#5a8a6e",
    pastelBg: "#f0f5f0",
    pastelBorder: "#d3ddd3",
    color: "muted-green",
    bgColor: "bg-[#f0f5f0]",
    textColor: "text-[#3a5a48]",
  },
  {
    id: "refused",
    label: "Refusées",
    icon: XCircle,
    accent: "#c45656",
    pastelBg: "#fdf0f0",
    pastelBorder: "#f1cdcd",
    color: "red",
    bgColor: "bg-[#fdf0f0]",
    textColor: "text-[#8a3a3a]",
  },
  {
    id: "cancelled",
    label: "Annulées",
    icon: Ban,
    accent: "#9c9484",
    pastelBg: "#f7f5ef",
    pastelBorder: "#ece9e1",
    color: "gray",
    bgColor: "bg-[#f7f5ef]",
    textColor: "text-[#6d6d68]",
  },
];

interface MissionsTabsProps {
  activeTab: MissionTab;
  onTabChange: (tab: MissionTab) => void;
  counts?: Partial<Record<MissionTab, number>>;
}

/**
 * Tabs en pill bar unifiée (esprit planning).
 * - État inactif : transparent, texte gris
 * - État actif : fond vert foncé `#1f3a33`, texte crème
 * - Petit point d'accent coloré sur la pill active pour rappeler le statut
 * - Compteur en bulle pastel/accent selon l'état
 */
export function MissionsTabs({ activeTab, onTabChange, counts = {} }: MissionsTabsProps) {
  return (
    <div className="relative" role="tablist" aria-label="Onglets des missions">
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        <div
          className="inline-flex gap-0.5 p-1 min-w-max"
          style={{
            borderRadius: 999,
            background: "#fff",
            border: "1px solid #ece9e1",
          }}
        >
          {TABS_CONFIG.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = counts[tab.id] ?? 0;

            return (
              <motion.button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                aria-label={`${tab.label}${count > 0 ? `, ${count} mission${count > 1 ? "s" : ""}` : ""}`}
                onClick={() => onTabChange(tab.id)}
                className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-colors"
                style={{
                  background: isActive ? "#1f3a33" : "transparent",
                  color: isActive ? "#f7f5ef" : "#6d6d68",
                }}
                whileTap={{ scale: 0.97 }}
              >
                {/* Point d'accent statut (sur la pill active uniquement) */}
                {isActive && (
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: tab.accent }}
                  />
                )}
                {!isActive && (
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                )}
                <span className="tracking-[-0.01em]">{tab.label}</span>
                {count > 0 && (
                  <span
                    className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
                    style={{
                      background: isActive ? "rgba(247,245,239,0.18)" : tab.pastelBg,
                      color: isActive ? "#f7f5ef" : tab.accent,
                    }}
                    aria-hidden="true"
                  >
                    {count}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Fade gradients (mobile) */}
      <div
        className="absolute top-0 left-0 h-full w-4 pointer-events-none md:hidden"
        style={{ background: "linear-gradient(to right, #fcfaf4, transparent)" }}
      />
      <div
        className="absolute top-0 right-0 h-full w-4 pointer-events-none md:hidden"
        style={{ background: "linear-gradient(to left, #fcfaf4, transparent)" }}
      />
    </div>
  );
}

export function getTabConfig(tabId: MissionTab): TabConfig {
  return TABS_CONFIG.find((t) => t.id === tabId) || TABS_CONFIG[0];
}
