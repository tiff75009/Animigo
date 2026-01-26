"use client";

import { motion } from "framer-motion";
import { Edit2, Trash2, Power, Tag, Sparkles, AlertCircle } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { CategoryType } from "../types";

interface TypeTableProps {
  types: CategoryType[] | undefined;
  isLoading: boolean;
  error: string | null;
  onEdit: (type: CategoryType) => void;
  onDelete: (typeId: Id<"categoryTypes">) => Promise<void>;
  onToggleActive: (
    typeId: Id<"categoryTypes">,
    currentActive: boolean
  ) => Promise<void>;
  onSeed: () => Promise<void>;
}

export function TypeTable({
  types,
  isLoading,
  error,
  onEdit,
  onDelete,
  onToggleActive,
  onSeed,
}: TypeTableProps) {
  if (isLoading) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      </div>
    );
  }

  if (!types || types.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8">
        <div className="text-center">
          <Tag className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            Aucun type de catégorie
          </h3>
          <p className="text-slate-400 mb-4">
            Créez des types pour organiser vos catégories de services.
          </p>
          <button
            onClick={onSeed}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Sparkles className="w-5 h-5" />
            Créer les types par défaut
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-500/10 border-b border-red-500/30 flex items-center gap-2 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <table className="w-full">
        <thead className="bg-slate-900/50">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Slug
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Description
            </th>
            <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Catégories
            </th>
            <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Statut
            </th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {types.map((type, index) => (
            <motion.tr
              key={type.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="hover:bg-slate-700/30 transition-colors"
            >
              {/* Type info */}
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{ backgroundColor: type.color || "#6B7280" }}
                  >
                    {type.icon || "📁"}
                  </div>
                  <span className="font-medium text-white">{type.name}</span>
                </div>
              </td>

              {/* Slug */}
              <td className="px-6 py-4">
                <code className="px-2 py-1 bg-slate-700 rounded text-sm text-slate-300">
                  {type.slug}
                </code>
              </td>

              {/* Description */}
              <td className="px-6 py-4">
                <span className="text-slate-400 text-sm line-clamp-1">
                  {type.description || "-"}
                </span>
              </td>

              {/* Categories count */}
              <td className="px-6 py-4 text-center">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    type.categoriesCount > 0
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-slate-700 text-slate-400"
                  }`}
                >
                  {type.categoriesCount}
                </span>
              </td>

              {/* Status */}
              <td className="px-6 py-4 text-center">
                <button
                  onClick={() => onToggleActive(type.id, type.isActive)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    type.isActive
                      ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                      : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  {type.isActive ? "Actif" : "Inactif"}
                </button>
              </td>

              {/* Actions */}
              <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onEdit(type)}
                    className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                    title="Modifier"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (type.categoriesCount > 0) {
                        alert(
                          "Impossible de supprimer ce type : des catégories l'utilisent."
                        );
                        return;
                      }
                      if (confirm(`Supprimer le type "${type.name}" ?`)) {
                        onDelete(type.id);
                      }
                    }}
                    className={`p-2 rounded-lg transition-colors ${
                      type.categoriesCount > 0
                        ? "text-slate-600 cursor-not-allowed"
                        : "text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                    }`}
                    title={
                      type.categoriesCount > 0
                        ? "Impossible de supprimer (catégories liées)"
                        : "Supprimer"
                    }
                    disabled={type.categoriesCount > 0}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
