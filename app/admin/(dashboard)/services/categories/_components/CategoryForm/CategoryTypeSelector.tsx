"use client";

import { Check, AlertCircle, Layers } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import type { ParentCategory } from "../../types";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";

interface CategoryTypeOption {
  id: Id<"categoryTypes">;
  slug: string;
  name: string;
  icon?: string;
  color?: string;
}

interface CategoryTypeSelectorProps {
  isSubcategory: boolean;
  parentCategoryId: Id<"serviceCategories"> | null;
  parentCategories: ParentCategory[] | undefined;
  editingId: Id<"serviceCategories"> | null;
  typeId: Id<"categoryTypes"> | null;
  onTypeChange: (isSubcategory: boolean) => void;
  onParentChange: (parentId: Id<"serviceCategories"> | null) => void;
  onCategoryTypeChange: (typeId: Id<"categoryTypes"> | null) => void;
}

export default function CategoryTypeSelector({
  isSubcategory,
  parentCategoryId,
  parentCategories,
  editingId,
  typeId,
  onTypeChange,
  onParentChange,
  onCategoryTypeChange,
}: CategoryTypeSelectorProps) {
  const { token } = useAdminAuth();

  // Récupérer les types actifs
  const categoryTypes = useQuery(
    api.admin.categoryTypes.listActiveTypes,
    token ? { token } : "skip"
  ) as CategoryTypeOption[] | undefined;

  // Filtrer pour exclure la catégorie en cours d'édition des parents possibles
  const availableParents = parentCategories?.filter((p) => p.id !== editingId);

  // Pour les sous-catégories, afficher le type hérité du parent
  const selectedParent = parentCategoryId
    ? parentCategories?.find((p) => p.id === parentCategoryId)
    : null;
  const inheritedType = selectedParent?.typeId
    ? categoryTypes?.find((t) => t.id === selectedParent.typeId)
    : null;

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

        {/* Option: Prestation (sous-catégorie) */}
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
            <p className="font-medium text-white">Prestation</p>
            <p className="text-xs text-slate-400">Service avec tarification</p>
          </div>
          {isSubcategory && <Check className="w-5 h-5 text-blue-500 ml-auto" />}
        </label>
      </div>

      {/* Type de catégorie (uniquement pour les catégories parentes) */}
      {!isSubcategory && (
        <div className="mb-3">
          <label className="block text-sm font-medium text-slate-300 mb-1">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              Type
            </span>
          </label>
          <select
            value={typeId || ""}
            onChange={(e) =>
              onCategoryTypeChange(
                e.target.value ? (e.target.value as Id<"categoryTypes">) : null
              )
            }
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          >
            <option value="">Sans type</option>
            {categoryTypes?.map((type) => (
              <option key={type.id} value={type.id}>
                {type.icon} {type.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1">
            Le type aide à organiser les catégories (Garde, Services, Santé...).
          </p>
        </div>
      )}

      {/* Dropdown pour sélectionner le parent (pour les prestations) */}
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
                {parent.typeName && ` (${parent.typeName})`}
              </option>
            ))}
          </select>

          {/* Afficher le type hérité */}
          {inheritedType && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-slate-400">Type hérité :</span>
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: `${inheritedType.color}20`,
                  color: inheritedType.color || "#6B7280",
                }}
              >
                {inheritedType.icon} {inheritedType.name}
              </span>
            </div>
          )}

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
