"use client";

import { motion } from "framer-motion";
import {
  X,
  Check,
  Loader2,
  Palette,
  Receipt,
  CalendarRange,
  Moon,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import {
  PrestationFormData,
  DEFAULT_PRESTATION_FORM,
} from "../hooks/usePrestationActions";
import { Prestation, ParentOption } from "../types";

// Couleurs prédéfinies
const COLORS = [
  { value: "#FF6B6B", label: "Corail" },
  { value: "#4ECDC4", label: "Turquoise" },
  { value: "#45B7D1", label: "Bleu ciel" },
  { value: "#96CEB4", label: "Menthe" },
  { value: "#FFEAA7", label: "Jaune" },
  { value: "#DDA0DD", label: "Lavande" },
  { value: "#98D8C8", label: "Vert d'eau" },
  { value: "#F7DC6F", label: "Or" },
  { value: "#BB8FCE", label: "Violet" },
  { value: "#85C1E9", label: "Bleu clair" },
];

const BILLING_TYPES = [
  { value: "hourly", label: "Horaire", emoji: "⏱️", description: "Facturation à l'heure" },
  { value: "daily", label: "Journalier", emoji: "📅", description: "Facturation à la journée" },
  { value: "flexible", label: "Flexible", emoji: "🔄", description: "L'annonceur choisit" },
] as const;

interface PrestationFormProps {
  isEditing: boolean;
  editingPrestation: Prestation | null;
  formData: PrestationFormData;
  parentCategories: ParentOption[] | undefined;
  isSaving: boolean;
  error: string | null;
  onFormDataChange: React.Dispatch<React.SetStateAction<PrestationFormData>>;
  onSave: () => Promise<void>;
  onCancel: () => void;
}

// Helper pour générer un slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function PrestationForm({
  isEditing,
  editingPrestation,
  formData,
  parentCategories,
  isSaving,
  error,
  onFormDataChange,
  onSave,
  onCancel,
}: PrestationFormProps) {
  const isNew = !editingPrestation;

  const handleNameChange = (name: string) => {
    onFormDataChange((prev) => ({
      ...prev,
      name,
      slug: isNew ? generateSlug(name) : prev.slug,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave();
  };

  // Find selected parent info
  const selectedParent = formData.parentCategoryId
    ? parentCategories?.find((p) => p.id === formData.parentCategoryId)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-slate-800 rounded-xl mb-6 border border-slate-700 overflow-hidden"
    >
      <form onSubmit={handleSubmit}>
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 bg-slate-900/50 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
              style={{
                backgroundColor: formData.color + "20",
                border: `2px solid ${formData.color}`,
              }}
            >
              {formData.icon || "📋"}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {isNew ? "Nouvelle prestation" : formData.name || "Modifier"}
              </h2>
              <p className="text-xs text-slate-400">
                {selectedParent
                  ? `Dans ${selectedParent.icon || ""} ${selectedParent.name}`
                  : "Service avec tarification"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Nom <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ex: Toilettage complet"
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Catégorie parente <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.parentCategoryId || ""}
                onChange={(e) =>
                  onFormDataChange((prev) => ({
                    ...prev,
                    parentCategoryId: e.target.value as Id<"serviceCategories">,
                  }))
                }
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
              >
                <option value="" disabled>
                  Sélectionner...
                </option>
                {parentCategories?.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.icon} {parent.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                onFormDataChange((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Décrivez brièvement cette prestation..."
              rows={2}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none transition-colors"
            />
          </div>

          {/* Appearance */}
          <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-5 h-5 text-purple-400" />
              <h3 className="font-medium text-white">Apparence</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Icône (emoji)
                </label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) =>
                    onFormDataChange((prev) => ({ ...prev, icon: e.target.value }))
                  }
                  placeholder="🐾"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-center text-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Couleur
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      onFormDataChange((prev) => ({ ...prev, color: e.target.value }))
                    }
                    className="w-10 h-10 rounded-lg cursor-pointer border-2 border-slate-600 bg-transparent flex-shrink-0"
                    style={{ padding: 0 }}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {COLORS.slice(0, 6).map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() =>
                          onFormDataChange((prev) => ({ ...prev, color: c.value }))
                        }
                        className={`w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 ${
                          formData.color.toUpperCase() === c.value.toUpperCase()
                            ? "border-white ring-2 ring-white/30"
                            : "border-transparent hover:border-slate-400"
                        }`}
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Billing type */}
          <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <Receipt className="w-5 h-5 text-green-400" />
              <span className="font-medium text-white">Type de facturation</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {BILLING_TYPES.map((type) => (
                <label
                  key={type.value}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border cursor-pointer transition-all ${
                    formData.billingType === type.value
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-slate-700 bg-slate-800 hover:border-slate-600"
                  }`}
                >
                  <input
                    type="radio"
                    name="billingType"
                    value={type.value}
                    checked={formData.billingType === type.value}
                    onChange={(e) =>
                      onFormDataChange((prev) => ({
                        ...prev,
                        billingType: e.target.value as "hourly" | "daily" | "flexible",
                      }))
                    }
                    className="sr-only"
                  />
                  <span className="text-xl">{type.emoji}</span>
                  <span className="font-medium text-white text-sm">{type.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Booking options */}
          <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <CalendarRange className="w-5 h-5 text-blue-400" />
              <h4 className="font-medium text-white">Options de réservation</h4>
            </div>

            <label className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.allowRangeBooking}
                onChange={(e) =>
                  onFormDataChange((prev) => ({
                    ...prev,
                    allowRangeBooking: e.target.checked,
                  }))
                }
                className="mt-0.5 w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
              />
              <div>
                <span className="font-medium text-white text-sm">
                  Réservation par plage
                </span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Permet au client de sélectionner une plage de dates ou d&apos;heures.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.allowOvernightStay}
                onChange={(e) =>
                  onFormDataChange((prev) => ({
                    ...prev,
                    allowOvernightStay: e.target.checked,
                  }))
                }
                className="mt-0.5 w-5 h-5 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
              />
              <div>
                <span className="font-medium text-white text-sm flex items-center gap-2">
                  <Moon className="w-4 h-4 text-indigo-400" />
                  Autoriser la garde de nuit
                </span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Le client pourra laisser l&apos;animal la nuit.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.enableDurationBasedBlocking}
                onChange={(e) =>
                  onFormDataChange((prev) => ({
                    ...prev,
                    enableDurationBasedBlocking: e.target.checked,
                  }))
                }
                className="mt-0.5 w-5 h-5 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
              />
              <div>
                <span className="font-medium text-white text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Blocage basé sur la durée
                </span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Calcul automatique du créneau bloqué selon la durée.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-900/30 border-t border-slate-700">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!formData.name || !formData.parentCategoryId || isSaving}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {isNew ? "Créer" : "Enregistrer"}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
