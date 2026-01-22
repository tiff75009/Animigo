"use client";

import { Eye } from "lucide-react";
import type { DisplayFormat } from "../../types";
import { DISPLAY_FORMATS } from "../../types";

interface DisplayFormatSelectorProps {
  value: DisplayFormat;
  onChange: (value: DisplayFormat) => void;
  parentName?: string;
}

export default function DisplayFormatSelector({
  value,
  onChange,
  parentName = "Garde",
}: DisplayFormatSelectorProps) {
  // Générer un aperçu dynamique basé sur le nom du parent
  const getPreview = (format: DisplayFormat): string => {
    const subcategory = "Garde standard";
    switch (format) {
      case "hierarchy":
        return `${parentName} > ${subcategory}`;
      case "subcategory":
        return subcategory;
      case "badge":
        return `[${parentName}] ${subcategory}`;
      default:
        return subcategory;
    }
  };

  return (
    <div className="mb-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
      <div className="flex items-center gap-2 mb-3">
        <Eye className="w-5 h-5 text-purple-400" />
        <span className="font-medium text-white">Format d&apos;affichage</span>
      </div>

      <p className="text-xs text-slate-400 mb-4">
        Définissez comment les sous-catégories de ce groupe seront affichées
        dans l&apos;interface client et annonceur.
      </p>

      <div className="space-y-2">
        {DISPLAY_FORMATS.map((format) => {
          const isSelected = value === format.value;

          return (
            <label
              key={format.value}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                isSelected
                  ? "border-purple-500 bg-purple-500/10"
                  : "border-slate-700 bg-slate-800 hover:border-slate-600"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="displayFormat"
                  value={format.value}
                  checked={isSelected}
                  onChange={() => onChange(format.value)}
                  className="w-4 h-4 text-purple-500 border-slate-600 bg-slate-800 focus:ring-purple-500 focus:ring-offset-slate-900"
                />
                <div>
                  <span className="font-medium text-white text-sm">
                    {format.label}
                  </span>
                  <p className="text-xs text-slate-400">{format.description}</p>
                </div>
              </div>

              {/* Aperçu */}
              <div className="px-3 py-1.5 bg-slate-700/50 rounded-lg">
                <code className="text-xs text-slate-300">
                  {getPreview(format.value)}
                </code>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
