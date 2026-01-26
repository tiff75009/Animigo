"use client";

import { motion } from "framer-motion";
import { X, Save, AlertCircle } from "lucide-react";
import { TypeFormData, TYPE_COLORS, SUGGESTED_ICONS, generateSlug } from "../types";

interface TypeFormProps {
  mode: "add" | "edit";
  formData: TypeFormData;
  isSaving: boolean;
  error: string | null;
  onFormDataChange: React.Dispatch<React.SetStateAction<TypeFormData>>;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
}

export function TypeForm({
  mode,
  formData,
  isSaving,
  error,
  onFormDataChange,
  onSubmit,
  onCancel,
}: TypeFormProps) {
  const handleNameChange = (name: string) => {
    onFormDataChange((prev) => ({
      ...prev,
      name,
      // Auto-générer le slug si on est en mode ajout
      slug: mode === "add" ? generateSlug(name) : prev.slug,
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-white">
          {mode === "add" ? "Nouveau type" : "Modifier le type"}
        </h2>
        <button
          onClick={onCancel}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Erreur */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Nom */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Nom *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Ex: Garde"
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Slug */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Slug *
          </label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) =>
              onFormDataChange((prev) => ({ ...prev, slug: e.target.value }))
            }
            placeholder="Ex: garde"
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Description */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              onFormDataChange((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
            placeholder="Description du type..."
            rows={2}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>

        {/* Icône */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Icône (emoji)
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {SUGGESTED_ICONS.slice(0, 10).map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() =>
                  onFormDataChange((prev) => ({ ...prev, icon }))
                }
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-colors ${
                  formData.icon === icon
                    ? "bg-blue-600 ring-2 ring-blue-400"
                    : "bg-slate-700 hover:bg-slate-600"
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={formData.icon}
            onChange={(e) =>
              onFormDataChange((prev) => ({ ...prev, icon: e.target.value }))
            }
            placeholder="Ou entrez un emoji..."
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Couleur */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Couleur
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {TYPE_COLORS.slice(0, 6).map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() =>
                  onFormDataChange((prev) => ({ ...prev, color: color.value }))
                }
                className={`w-10 h-10 rounded-lg transition-all ${
                  formData.color === color.value
                    ? "ring-2 ring-white ring-offset-2 ring-offset-slate-800"
                    : "hover:scale-110"
                }`}
                style={{ backgroundColor: color.value }}
                title={color.label}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="color"
              value={formData.color}
              onChange={(e) =>
                onFormDataChange((prev) => ({ ...prev, color: e.target.value }))
              }
              className="w-12 h-10 rounded cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={formData.color}
              onChange={(e) =>
                onFormDataChange((prev) => ({ ...prev, color: e.target.value }))
              }
              placeholder="#6B7280"
              className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-700">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={onSubmit}
          disabled={isSaving || !formData.name || !formData.slug}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Enregistrement..." : mode === "add" ? "Créer" : "Enregistrer"}
        </button>
      </div>
    </motion.div>
  );
}
