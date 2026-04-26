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
      <div
        className="bg-white p-4 animate-pulse"
        style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#f1ede3]" />
          <div className="space-y-2 flex-1">
            <div className="h-3 w-32 rounded bg-[#f1ede3]" />
            <div className="h-2.5 w-40 rounded bg-[#f1ede3]" />
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.percentage === 100) return null;

  // Couleur du cercle (sobre, palette unifiée)
  const stroke =
    data.percentage >= 80 ? "#1f3a33" : data.percentage >= 50 ? "#c9a14a" : "#c45656";
  const textColor =
    data.percentage >= 80 ? "#1f3a33" : data.percentage >= 50 ? "#7a5b1a" : "#8a3a3a";

  const circumference = 2 * Math.PI * 20;
  const dashOffset = circumference - (data.percentage / 100) * circumference;

  return (
    <Link href="/dashboard/profil">
      <div
        className="p-4 transition-all cursor-pointer hover:shadow-[0_10px_30px_rgba(30,30,28,0.06)]"
        style={{ borderRadius: 14, background: "#fff", border: "1px solid #ece9e1" }}
      >
        <div className="flex items-center gap-3">
          {/* Cercle de progression */}
          <div className="relative w-12 h-12 flex-shrink-0">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="#f1ede3" strokeWidth="3" />
              <circle
                cx="24" cy="24" r="20" fill="none"
                stroke={stroke} strokeWidth="3" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[11px] font-bold" style={{ color: textColor }}>
                {data.percentage}%
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: "#9c9484" }}>
              Profil
            </div>
            <p className="text-[13.5px] font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
              Profil à compléter
            </p>
            {data.nextMissing && (
              <p className="text-[11px] text-[#6d6d68] truncate">
                Ajoutez : {data.nextMissing.toLowerCase()}
              </p>
            )}
          </div>

          <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#9c9484" }} />
        </div>
      </div>
    </Link>
  );
}
