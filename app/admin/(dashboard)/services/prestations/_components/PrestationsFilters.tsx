"use client";

import { Search, X, Filter } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { TypeOption, ParentOption } from "../types";

interface PrestationsFiltersProps {
  types: TypeOption[] | undefined;
  parentCategories: ParentOption[];
  selectedTypeId: Id<"categoryTypes"> | null;
  selectedParentId: Id<"serviceCategories"> | null;
  searchQuery: string;
  onTypeChange: (id: Id<"categoryTypes"> | null) => void;
  onParentChange: (id: Id<"serviceCategories"> | null) => void;
  onSearchChange: (query: string) => void;
}

export function PrestationsFilters({
  types,
  parentCategories,
  selectedTypeId,
  selectedParentId,
  searchQuery,
  onTypeChange,
  onParentChange,
  onSearchChange,
}: PrestationsFiltersProps) {
  const hasFilters = selectedTypeId || selectedParentId || searchQuery;

  const clearFilters = () => {
    onTypeChange(null);
    onParentChange(null);
    onSearchChange("");
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-slate-400" />
        <span className="text-sm font-medium text-slate-300">Filtres</span>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="ml-auto text-xs text-slate-400 hover:text-white flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Effacer les filtres
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher une prestation..."
            className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Type filter */}
        <div>
          <select
            value={selectedTypeId || ""}
            onChange={(e) =>
              onTypeChange(
                e.target.value
                  ? (e.target.value as Id<"categoryTypes">)
                  : null
              )
            }
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Tous les types</option>
            {types?.map((type) => (
              <option key={type.id} value={type.id}>
                {type.icon} {type.name}
              </option>
            ))}
          </select>
        </div>

        {/* Parent category filter */}
        <div>
          <select
            value={selectedParentId || ""}
            onChange={(e) =>
              onParentChange(
                e.target.value
                  ? (e.target.value as Id<"serviceCategories">)
                  : null
              )
            }
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Toutes les catégories</option>
            {parentCategories.map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.icon} {parent.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
