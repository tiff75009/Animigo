"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import {
  ToggleRight,
  ToggleLeft,
  Edit,
  Trash2,
  Image as ImageIcon,
  Loader2,
  Clock,
  Calendar,
  Zap,
  ChevronRight,
  ChevronDown,
  Eye,
  FolderOpen,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import type { Category, DisplayFormat } from "../../types";

interface CategoryRowProps {
  category: Category;
  isExpanded?: boolean;
  isParentRow?: boolean;
  childrenCount?: number;
  uploadingImageId: Id<"serviceCategories"> | null;
  onToggleExpand?: () => void;
  onEdit: (category: Category) => void;
  onDelete: (categoryId: Id<"serviceCategories">) => void;
  onToggleActive: (
    categoryId: Id<"serviceCategories">,
    currentActive: boolean
  ) => void;
  onImageUpload: (file: File, categoryId: Id<"serviceCategories">) => void;
}

const BILLING_TYPE_LABELS: Record<
  string,
  { label: string; icon: React.ReactNode }
> = {
  hourly: { label: "Horaire", icon: <Clock className="w-3 h-3" /> },
  daily: { label: "Journalier", icon: <Calendar className="w-3 h-3" /> },
  flexible: { label: "Flexible", icon: <Zap className="w-3 h-3" /> },
};

const DISPLAY_FORMAT_LABELS: Record<DisplayFormat, string> = {
  hierarchy: "Parent > Sous-cat",
  subcategory: "Sous-cat seule",
  badge: "[Parent] Sous-cat",
};

export default function CategoryRow({
  category,
  isExpanded,
  isParentRow,
  childrenCount = 0,
  uploadingImageId,
  onToggleExpand,
  onEdit,
  onDelete,
  onToggleActive,
  onImageUpload,
}: CategoryRowProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isUploading = uploadingImageId === category.id;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(file, category.id);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Rendu pour une catégorie parente (ligne compacte)
  if (isParentRow) {
    return (
      <motion.tr
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="border-b border-slate-600 bg-slate-700/50 hover:bg-slate-700/70 transition-colors"
      >
        {/* Nom de la catégorie parente - prend plus d'espace */}
        <td className="px-6 py-3">
          <div className="flex items-center gap-3">
            {/* Bouton expansion */}
            {childrenCount > 0 ? (
              <button
                onClick={onToggleExpand}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-600 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ) : (
              <div className="w-7" />
            )}

            {/* Icône/Image */}
            {category.imageUrl ? (
              <img
                src={category.imageUrl}
                alt={category.name}
                className="w-9 h-9 rounded-lg object-cover"
              />
            ) : (
              <div className="w-9 h-9 bg-slate-600 rounded-lg flex items-center justify-center text-lg">
                {category.icon || <FolderOpen className="w-5 h-5 text-slate-400" />}
              </div>
            )}

            <div>
              <p className="font-semibold text-white flex items-center gap-2">
                {category.name}
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded-full font-normal">
                  Parent
                </span>
              </p>
              <p className="text-xs text-slate-400">{category.slug}</p>
            </div>
          </div>
        </td>

        {/* Format d'affichage - info pour les parents */}
        <td className="px-6 py-3">
          {category.displayFormat ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">
              <Eye className="w-3 h-3" />
              {DISPLAY_FORMAT_LABELS[category.displayFormat]}
            </span>
          ) : (
            <span className="text-slate-500 text-xs">Par défaut</span>
          )}
        </td>

        {/* Nombre de sous-catégories */}
        <td className="px-6 py-3">
          <span className="text-slate-300 text-sm">
            {childrenCount > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="font-medium">{childrenCount}</span>
                <span className="text-slate-400">
                  sous-catégorie{childrenCount > 1 ? "s" : ""}
                </span>
              </span>
            ) : (
              <span className="text-slate-500 italic">Aucune</span>
            )}
          </span>
        </td>

        {/* Statut */}
        <td className="px-6 py-3">
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${
              category.isActive
                ? "bg-green-500/20 text-green-400"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            {category.isActive ? "Actif" : "Inactif"}
          </span>
        </td>

        {/* Actions */}
        <td className="px-6 py-3">
          <div className="flex items-center justify-end gap-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
              title="Ajouter une image"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImageIcon className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={() => onToggleActive(category.id, category.isActive)}
              className={`p-1.5 rounded-lg transition-colors ${
                category.isActive
                  ? "text-green-400 hover:text-green-300 hover:bg-green-500/10"
                  : "text-slate-400 hover:text-white hover:bg-slate-600"
              }`}
              title={category.isActive ? "Désactiver" : "Activer"}
            >
              {category.isActive ? (
                <ToggleRight className="w-5 h-5" />
              ) : (
                <ToggleLeft className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={() => onEdit(category)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-600 rounded-lg transition-colors"
              title="Modifier"
            >
              <Edit className="w-4 h-4" />
            </button>

            <button
              onClick={() => onDelete(category.id)}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </motion.tr>
    );
  }

  // Rendu pour une sous-catégorie (ligne détaillée)
  return (
    <motion.tr
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="border-b border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
    >
      {/* Nom avec indentation */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          {/* Indentation pour les sous-catégories */}
          <div className="w-7 flex justify-center">
            <div className="w-px h-4 bg-slate-600" />
          </div>

          {/* Icône/Image */}
          {category.imageUrl ? (
            <img
              src={category.imageUrl}
              alt={category.name}
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center text-xl">
              {category.icon || "📋"}
            </div>
          )}

          <div>
            <p className="font-medium text-white">{category.name}</p>
            <p className="text-sm text-slate-400">{category.slug}</p>
          </div>
        </div>
      </td>

      {/* Type de facturation */}
      <td className="px-6 py-4">
        {category.billingType ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-700 text-slate-300 text-xs rounded-full">
            {BILLING_TYPE_LABELS[category.billingType]?.icon}
            {BILLING_TYPE_LABELS[category.billingType]?.label}
          </span>
        ) : (
          <span className="text-slate-500 text-sm">—</span>
        )}
      </td>

      {/* Prestations par défaut */}
      <td className="px-6 py-4">
        {category.defaultVariants && category.defaultVariants.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {category.defaultVariants.slice(0, 2).map((v, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded-full"
              >
                {v.name}
              </span>
            ))}
            {category.defaultVariants.length > 2 && (
              <span className="px-2 py-0.5 bg-slate-600/50 text-slate-400 text-xs rounded-full">
                +{category.defaultVariants.length - 2}
              </span>
            )}
          </div>
        ) : (
          <span className="text-slate-500 text-sm italic">Aucune</span>
        )}
      </td>

      {/* Statut */}
      <td className="px-6 py-4">
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            category.isActive
              ? "bg-green-500/20 text-green-400"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {category.isActive ? "Actif" : "Inactif"}
        </span>
      </td>

      {/* Actions */}
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
            title="Ajouter une image"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ImageIcon className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={() => onToggleActive(category.id, category.isActive)}
            className={`p-2 rounded-lg transition-colors ${
              category.isActive
                ? "text-green-400 hover:text-green-300 hover:bg-green-500/10"
                : "text-slate-400 hover:text-white hover:bg-slate-700"
            }`}
            title={category.isActive ? "Désactiver" : "Activer"}
          >
            {category.isActive ? (
              <ToggleRight className="w-5 h-5" />
            ) : (
              <ToggleLeft className="w-5 h-5" />
            )}
          </button>

          <button
            onClick={() => onEdit(category)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            title="Modifier"
          >
            <Edit className="w-4 h-4" />
          </button>

          <button
            onClick={() => onDelete(category.id)}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </motion.tr>
  );
}
