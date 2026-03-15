"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, AlertTriangle, Activity, Info } from "lucide-react";

interface PerformanceKPIsProps {
  kpis: {
    totalMissions: number;
    acceptanceRate: number;
    cancellationRate: number;
    refusalRate: number;
  };
}

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="text-gray-400 hover:text-gray-500"
        aria-label="Information"
      >
        <Info className="w-3 h-3" />
      </button>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-gray-900 text-white text-[11px] rounded-lg whitespace-nowrap z-20 leading-tight">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  );
}

export function PerformanceKPIs({ kpis }: PerformanceKPIsProps) {
  if (!kpis || kpis.totalMissions === 0) return null;

  const items = [
    {
      label: "Réalisation",
      tooltip: "Missions acceptées et non annulées",
      value: kpis.acceptanceRate,
      icon: CheckCircle,
      color: "text-green-600",
      barColor: "bg-green-500",
    },
    {
      label: "Annulation",
      tooltip: "Missions annulées après acceptation",
      value: kpis.cancellationRate,
      icon: XCircle,
      color: "text-red-500",
      barColor: "bg-red-500",
    },
    {
      label: "Réclamation",
      tooltip: "Demandes refusées par rapport au total",
      value: kpis.refusalRate,
      icon: AlertTriangle,
      color: kpis.refusalRate <= 15 ? "text-green-600" : kpis.refusalRate <= 30 ? "text-amber-600" : "text-red-500",
      barColor: kpis.refusalRate <= 15 ? "bg-green-500" : kpis.refusalRate <= 30 ? "bg-amber-500" : "bg-red-500",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white rounded-2xl p-5 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-text-light" />
        <h3 className="text-sm font-semibold text-foreground">Performance</h3>
        <span className="text-xs text-text-light ml-auto">{kpis.totalMissions} missions</span>
      </div>

      <div className="space-y-3.5">
        {items.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                <span className="text-xs text-text-light">{item.label}</span>
                <Tooltip text={item.tooltip} />
              </div>
              <span className={`text-sm font-bold ${item.color}`}>{item.value}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${item.barColor}`}
                style={{ width: `${Math.min(item.value, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
