"use client";

import { Check, AlertCircle } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import type { ParentCategory } from "../../types";

interface CategoryTypeSelectorProps {
  isSubcategory: boolean;
  parentCategoryId: Id<"serviceCategories"> | null;
  parentCategories: ParentCategory[] | undefined;
  editingId: Id<"serviceCategories"> | null;
  onTypeChange: (isSubcategory: boolean) => void;
  onParentChange: (parentId: Id<"serviceCategories"> | null) => void;
}

export default function CategoryTypeSelector({
  isSubcategory,
  parentCategoryId,
  parentCategories,
  editingId,
  onTypeChange,
  onParentChange,
}: CategoryTypeSelectorProps) {
  // Filtrer pour exclure la catégorie en cours d'édition des parents possibles
  const availableParents = parentCategories?.filter((p) => p.id !== editingId);

  return (
    <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
      <label className="block text-sm font-medium text-slate-300 mb-2">
        Type de catégorie
      </label>

      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Option: Catégorie parente */}
        <label
          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
            !isSubcategory
              ? "border-blue-500 bg-blue-500/10"
              : "border-slate-700 bg-slate-900 hover:border-slate-600"
          }`}
        >
          <input
            type="radio"
            name="categoryType"
            checked={!isSubcategory}
            onChange={() => {
              onTypeChange(false);
              onParentChange(null);
            }}
            className="sr-only"
          />
          <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center text-xl">
            📁
          </div>
          <div>
            <p className="font-medium text-white">Catégorie parente</p>
            <p className="text-xs text-slate-400">
              Groupe organisationnel (sans tarification)
            </p>
          </div>
          {!isSubcategory && <Check className="w-5 h-5 text-blue-500 ml-auto" />}
        </label>

        {/* Option: Sous-catégorie */}
        <label
          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
            isSubcategory
              ? "border-blue-500 bg-blue-500/10"
              : "border-slate-700 bg-slate-900 hover:border-slate-600"
          }`}
        >
          <input
            type="radio"
            name="categoryType"
            checked={isSubcategory}
            onChange={() => {
              onTypeChange(true);
              // Sélectionner le premier parent par défaut
              const firstParent = availableParents?.[0];
              if (firstParent) {
                onParentChange(firstParent.id);
              }
            }}
            className="sr-only"
          />
          <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center text-xl">
            📋
          </div>
          <div>
            <p className="font-medium text-white">Sous-catégorie</p>
            <p className="text-xs text-slate-400">Service avec tarification</p>
          </div>
          {isSubcategory && <Check className="w-5 h-5 text-blue-500 ml-auto" />}
        </label>
      </div>

      {/* Dropdown pour sélectionner le parent */}
      {isSubcategory && (
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Catégorie parente
          </label>
          <select
            value={parentCategoryId || ""}
            onChange={(e) =>
              onParentChange(e.target.value as Id<"serviceCategories">)
            }
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          >
            <option value="" disabled>
              Sélectionner une catégorie parente...
            </option>
            {availableParents?.map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.icon} {parent.name}
              </option>
            ))}
          </select>

          {availableParents?.length === 0 && (
            <p className="text-xs text-orange-400 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Aucune catégorie parente. Créez d&apos;abord une catégorie parente.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
