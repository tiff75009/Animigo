"use client";

import { motion } from "framer-motion";
import {
  Power,
  ListChecks,
  Clock,
  CalendarRange,
  Moon,
  Edit,
  Trash2,
  ToggleRight,
  ToggleLeft,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { Prestation, BILLING_TYPE_LABELS } from "../types";

interface PrestationsTableProps {
  prestations: Prestation[];
  isLoading: boolean;
  onEdit: (prestation: Prestation) => void;
  onDelete: (id: Id<"serviceCategories">) => void;
  onToggleActive: (id: Id<"serviceCategories">, currentActive: boolean) => void;
}

export function PrestationsTable({
  prestations,
  isLoading,
  onEdit,
  onDelete,
  onToggleActive,
}: PrestationsTableProps) {
  if (isLoading) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      </div>
    );
  }

  if (prestations.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8">
        <div className="text-center">
          <ListChecks className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            Aucune prestation trouvée
          </h3>
          <p className="text-slate-400">
            Modifiez vos filtres ou créez une nouvelle prestation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <table className="w-full">
        <thead className="bg-slate-900/50">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Prestation
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Catégorie
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Facturation
            </th>
            <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Options
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
          {prestations.map((prestation, index) => (
            <motion.tr
              key={prestation.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="hover:bg-slate-700/30 transition-colors"
            >
              {/* Prestation info */}
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
                    style={{
                      backgroundColor: (prestation.color || "#6B7280") + "20",
                    }}
                  >
                    {prestation.icon || "📋"}
                  </div>
                  <div>
                    <span className="font-medium text-white block">
                      {prestation.name}
                    </span>
                    <code className="text-xs text-slate-500">
                      {prestation.slug}
                    </code>
                  </div>
                </div>
              </td>

              {/* Parent category */}
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  {prestation.parentIcon && (
                    <span className="text-lg">{prestation.parentIcon}</span>
                  )}
                  <span className="text-slate-300">
                    {prestation.parentName || "-"}
                  </span>
                </div>
              </td>

              {/* Type badge */}
              <td className="px-6 py-4">
                {prestation.typeName ? (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: `${prestation.typeColor}20`,
                      color: prestation.typeColor || "#6B7280",
                    }}
                  >
                    {prestation.typeIcon && <span>{prestation.typeIcon}</span>}
                    {prestation.typeName}
                  </span>
                ) : (
                  <span className="text-slate-500 text-sm">-</span>
                )}
              </td>

              {/* Billing type */}
              <td className="px-6 py-4 text-center">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-700 rounded-full text-xs text-slate-300">
                  <Clock className="w-3 h-3" />
                  {prestation.billingType
                    ? BILLING_TYPE_LABELS[prestation.billingType]
                    : "-"}
                </span>
              </td>

              {/* Options */}
              <td className="px-6 py-4">
                <div className="flex items-center justify-center gap-2">
                  {prestation.allowRangeBooking && (
                    <span
                      className="p-1.5 bg-blue-500/20 rounded text-blue-400"
                      title="Réservation sur plage"
                    >
                      <CalendarRange className="w-3.5 h-3.5" />
                    </span>
                  )}
                  {prestation.allowOvernightStay && (
                    <span
                      className="p-1.5 bg-purple-500/20 rounded text-purple-400"
                      title="Nuit incluse"
                    >
                      <Moon className="w-3.5 h-3.5" />
                    </span>
                  )}
                  {!prestation.allowRangeBooking &&
                    !prestation.allowOvernightStay && (
                      <span className="text-slate-500 text-sm">-</span>
                    )}
                </div>
              </td>

              {/* Status */}
              <td className="px-6 py-4 text-center">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    prestation.isActive
                      ? "bg-green-500/20 text-green-400"
                      : "bg-slate-700 text-slate-400"
                  }`}
                >
                  <Power className="w-3 h-3" />
                  {prestation.isActive ? "Active" : "Inactive"}
                </span>
              </td>

              {/* Actions */}
              <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-1">
                  {/* Toggle active */}
                  <button
                    onClick={() =>
                      onToggleActive(prestation.id, prestation.isActive)
                    }
                    className={`p-2 rounded-lg transition-colors ${
                      prestation.isActive
                        ? "text-green-400 hover:text-green-300 hover:bg-green-500/10"
                        : "text-slate-400 hover:text-white hover:bg-slate-700"
                    }`}
                    title={prestation.isActive ? "Désactiver" : "Activer"}
                  >
                    {prestation.isActive ? (
                      <ToggleRight className="w-5 h-5" />
                    ) : (
                      <ToggleLeft className="w-5 h-5" />
                    )}
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => onEdit(prestation)}
                    className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                    title="Modifier"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          `Supprimer la prestation "${prestation.name}" ?`
                        )
                      ) {
                        onDelete(prestation.id);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Supprimer"
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
