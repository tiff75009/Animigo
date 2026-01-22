"use client";

import { Clock, Calendar, CalendarDays, CalendarRange } from "lucide-react";
import type { PriceUnit } from "../../types";

interface PriceUnitsSelectorProps {
  value: PriceUnit[];
  onChange: (value: PriceUnit[]) => void;
}

const PRICE_UNITS_CONFIG: {
  value: PriceUnit;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    value: "hour",
    label: "Horaire",
    icon: <Clock className="w-4 h-4" />,
    description: "Prix à l'heure",
  },
  {
    value: "day",
    label: "Journalier",
    icon: <Calendar className="w-4 h-4" />,
    description: "Prix à la journée",
  },
  {
    value: "week",
    label: "Hebdomadaire",
    icon: <CalendarDays className="w-4 h-4" />,
    description: "Prix à la semaine",
  },
  {
    value: "month",
    label: "Mensuel",
    icon: <CalendarRange className="w-4 h-4" />,
    description: "Prix au mois",
  },
];

export default function PriceUnitsSelector({
  value,
  onChange,
}: PriceUnitsSelectorProps) {
  const toggleUnit = (unit: PriceUnit) => {
    if (value.includes(unit)) {
      onChange(value.filter((u) => u !== unit));
    } else {
      onChange([...value, unit]);
    }
  };

  return (
    <div className="mb-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-5 h-5 text-blue-400" />
        <span className="font-medium text-white">Types de prix autorisés</span>
      </div>

      <p className="text-xs text-slate-400 mb-4">
        Sélectionnez les unités de tarification que les annonceurs pourront
        utiliser pour cette catégorie.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {PRICE_UNITS_CONFIG.map((unit) => {
          const isSelected = value.includes(unit.value);

          return (
            <label
              key={unit.value}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                isSelected
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-slate-700 bg-slate-800 hover:border-slate-600"
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleUnit(unit.value)}
                className="sr-only"
              />
              <div
                className={`p-2 rounded-lg ${
                  isSelected
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-slate-700 text-slate-400"
                }`}
              >
                {unit.icon}
              </div>
              <div>
                <span className="font-medium text-white text-sm">
                  {unit.label}
                </span>
                <p className="text-xs text-slate-400">{unit.description}</p>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
