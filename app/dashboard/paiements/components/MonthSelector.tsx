"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { getAvailableMonths } from "../types";

export function MonthSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const months = getAvailableMonths();
  const currentIndex = months.findIndex((m) => m.value === value);
  const currentMonth = months[currentIndex] || months[0];

  const goToPrevious = () => {
    if (currentIndex < months.length - 1) {
      onChange(months[currentIndex + 1].value);
    }
  };

  const goToNext = () => {
    if (currentIndex > 0) {
      onChange(months[currentIndex - 1].value);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={goToPrevious}
        disabled={currentIndex >= months.length - 1}
        className="rounded-lg p-2 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="h-5 w-5 text-gray-600" />
      </button>
      <div className="min-w-[160px] text-center">
        <p className="font-semibold text-foreground capitalize">
          {currentMonth.label}
        </p>
      </div>
      <button
        onClick={goToNext}
        disabled={currentIndex <= 0}
        className="rounded-lg p-2 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight className="h-5 w-5 text-gray-600" />
      </button>
    </div>
  );
}
