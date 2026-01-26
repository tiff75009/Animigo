"use client";

import { useState } from "react";
import { Package, Plus, Edit2, Trash2, X } from "lucide-react";
import type { DefaultVariant } from "../../types";

interface VariantFormSectionProps {
  variants: DefaultVariant[];
  allowCustomVariants: boolean;
  onVariantsChange: (variants: DefaultVariant[]) => void;
  onAllowCustomChange: (allow: boolean) => void;
  isGardeMode?: boolean;
}

export default function VariantFormSection({
  variants,
  allowCustomVariants,
  onVariantsChange,
  onAllowCustomChange,
  isGardeMode = false,
}: VariantFormSectionProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [variantForm, setVariantForm] = useState<DefaultVariant>({
    name: "",
    description: "",
    suggestedDuration: undefined,
    includedFeatures: [],
  });
  const [newFeature, setNewFeature] = useState("");

  // Réinitialiser le formulaire
  const resetVariantForm = () => {
    setVariantForm({
      name: "",
      description: "",
      suggestedDuration: undefined,
      includedFeatures: [],
    });
    setEditingIndex(null);
    setNewFeature("");
  };

  // Ajouter une prestation
  const addVariant = () => {
    if (!variantForm.name.trim()) return;

    const cleanedVariant: DefaultVariant = {
      name: variantForm.name.trim(),
      description: variantForm.description?.trim() || undefined,
      suggestedDuration: variantForm.suggestedDuration || undefined,
      includedFeatures:
        variantForm.includedFeatures && variantForm.includedFeatures.length > 0
          ? variantForm.includedFeatures
          : undefined,
    };

    onVariantsChange([...variants, cleanedVariant]);
    resetVariantForm();
  };

  // Mettre à jour une prestation
  const updateVariant = () => {
    if (editingIndex === null || !variantForm.name.trim()) return;

    const cleanedVariant: DefaultVariant = {
      name: variantForm.name.trim(),
      description: variantForm.description?.trim() || undefined,
      suggestedDuration: variantForm.suggestedDuration || undefined,
      includedFeatures:
        variantForm.includedFeatures && variantForm.includedFeatures.length > 0
          ? variantForm.includedFeatures
          : undefined,
    };

    const newVariants = [...variants];
    newVariants[editingIndex] = cleanedVariant;
    onVariantsChange(newVariants);
    resetVariantForm();
  };

  // Supprimer une prestation
  const deleteVariant = (index: number) => {
    onVariantsChange(variants.filter((_, i) => i !== index));
  };

  // Commencer l'édition
  const startEditVariant = (index: number) => {
    const variant = variants[index];
    setVariantForm({
      ...variant,
      includedFeatures: variant.includedFeatures || [],
    });
    setEditingIndex(index);
  };

  // Ajouter une caractéristique
  const addFeature = () => {
    if (!newFeature.trim()) return;
    setVariantForm((prev) => ({
      ...prev,
      includedFeatures: [...(prev.includedFeatures || []), newFeature.trim()],
    }));
    setNewFeature("");
  };

  // Supprimer une caractéristique
  const removeFeature = (index: number) => {
    setVariantForm((prev) => ({
      ...prev,
      includedFeatures: (prev.includedFeatures || []).filter(
        (_, i) => i !== index
      ),
    }));
  };

  return (
    <div className="mb-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-purple-400" />
          <span className="font-medium text-white">Prestations par défaut</span>
        </div>
      </div>

      <p className="text-xs text-slate-400 mb-4">
        Créez des modèles de prestations que les annonceurs pourront utiliser.
        Ils n&apos;auront qu&apos;à ajouter leur prix.
      </p>

      {/* Option pour autoriser les prestations personnalisées */}
      <div className="mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-600">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={allowCustomVariants}
            onChange={(e) => onAllowCustomChange(e.target.checked)}
            className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500 focus:ring-offset-slate-900"
          />
          <div>
            <span className="font-medium text-white">
              Autoriser les prestations personnalisées
            </span>
            <p className="text-xs text-slate-400 mt-1">
              Si activé, l&apos;annonceur peut créer ses propres prestations en
              plus des prestations par défaut.
            </p>
          </div>
        </label>
      </div>

      {/* Liste des prestations existantes */}
      {variants.length > 0 && (
        <div className="space-y-2 mb-4">
          {variants.map((variant, index) => (
            <div
              key={index}
              className={`flex items-start justify-between p-3 rounded-lg border ${
                editingIndex === index
                  ? "border-purple-500 bg-purple-500/10"
                  : "border-slate-700 bg-slate-800"
              }`}
            >
              <div className="flex-1">
                <p className="font-medium text-white">{variant.name}</p>
                {variant.description && (
                  <p className="text-sm text-slate-400 mt-1">
                    {variant.description}
                  </p>
                )}
                {variant.suggestedDuration && (
                  <p className="text-xs text-slate-500 mt-1">
                    Durée suggérée: {variant.suggestedDuration} min
                  </p>
                )}
                {variant.includedFeatures &&
                  variant.includedFeatures.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {variant.includedFeatures.map((feature, featureIndex) => (
                        <span
                          key={featureIndex}
                          className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded-full"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => startEditVariant(index)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteVariant(index)}
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulaire d'ajout/modification */}
      <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
        <p className="text-sm font-medium text-white mb-3">
          {editingIndex !== null
            ? "Modifier la prestation"
            : "Nouvelle prestation"}
        </p>

        <div className={`grid ${isGardeMode ? 'grid-cols-1' : 'grid-cols-2'} gap-3 mb-3`}>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Nom de la prestation *
            </label>
            <input
              type="text"
              value={variantForm.name}
              onChange={(e) =>
                setVariantForm({ ...variantForm, name: e.target.value })
              }
              placeholder="Ex: Garde standard"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          {!isGardeMode && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Durée suggérée (min)
              </label>
              <input
                type="number"
                value={variantForm.suggestedDuration || ""}
                onChange={(e) =>
                  setVariantForm({
                    ...variantForm,
                    suggestedDuration: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  })
                }
                placeholder="Ex: 60"
                min="0"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          )}
        </div>

        <div className="mb-3">
          <label className="block text-xs text-slate-400 mb-1">
            Description
          </label>
          <input
            type="text"
            value={variantForm.description || ""}
            onChange={(e) =>
              setVariantForm({ ...variantForm, description: e.target.value })
            }
            placeholder="Ex: Garde à domicile avec promenades incluses"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Caractéristiques incluses / Activités prévues */}
        <div className="mb-3">
          <label className="block text-xs text-slate-400 mb-1">
            {isGardeMode ? "Activités prévues" : "Caractéristiques incluses"}
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addFeature();
                }
              }}
              placeholder={isGardeMode ? "Ex: Promenades quotidiennes" : "Ex: Promenade quotidienne"}
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
            <button
              type="button"
              onClick={addFeature}
              disabled={!newFeature.trim()}
              className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {variantForm.includedFeatures &&
            variantForm.includedFeatures.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {variantForm.includedFeatures.map((feature, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full"
                  >
                    {feature}
                    <button
                      type="button"
                      onClick={() => removeFeature(index)}
                      className="p-0.5 hover:text-white transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-600 mt-3">
          {editingIndex !== null && (
            <button
              type="button"
              onClick={resetVariantForm}
              className="px-3 py-2 text-slate-400 hover:text-white text-sm transition-colors"
            >
              Annuler
            </button>
          )}
          <button
            type="button"
            onClick={editingIndex !== null ? updateVariant : addVariant}
            disabled={!variantForm.name.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
            {editingIndex !== null ? "Mettre à jour" : "Ajouter la prestation"}
          </button>
        </div>

        {!variantForm.name.trim() && (
          <p className="text-xs text-amber-400 mt-2 text-right">
            Remplissez le nom de la prestation pour pouvoir l&apos;ajouter
          </p>
        )}
      </div>
    </div>
  );
}
