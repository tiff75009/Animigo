"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface ProfileCompletionProps {
  data: {
    percentage: number;
    missingCount: number;
    nextMissing: string | null;
  } | null;
  isLoading: boolean;
}

export function ProfileCompletion({ data, isLoading }: ProfileCompletionProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-200" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-32 rounded bg-gray-200" />
            <div className="h-3 w-40 rounded bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.percentage === 100) return null;

  const getColor = () => {
    if (data.percentage >= 80) return { stroke: "#22c55e", text: "text-green-600", bg: "bg-green-50 border-green-200" };
    if (data.percentage >= 50) return { stroke: "#f59e0b", text: "text-amber-600", bg: "bg-amber-50 border-amber-200" };
    return { stroke: "#FF6B6B", text: "text-primary", bg: "bg-primary/5 border-primary/20" };
  };

  const color = getColor();
  const circumference = 2 * Math.PI * 20;
  const dashOffset = circumference - (data.percentage / 100) * circumference;

  return (
    <Link href="/dashboard/profil">
      <div className={`rounded-2xl p-4 shadow-sm border hover:shadow-md transition-all cursor-pointer ${color.bg}`}>
        <div className="flex items-center gap-4">
          {/* Cercle de progression */}
          <div className="relative w-12 h-12 flex-shrink-0">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="#e5e7eb" strokeWidth="3" />
              <circle
                cx="24" cy="24" r="20" fill="none"
                stroke={color.stroke} strokeWidth="3" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-xs font-bold ${color.text}`}>{data.percentage}%</span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Profil à compléter
            </p>
            {data.nextMissing && (
              <p className="text-xs text-text-light truncate">
                Ajoutez : {data.nextMissing.toLowerCase()}
              </p>
            )}
          </div>

          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </div>
      </div>
    </Link>
  );
}
