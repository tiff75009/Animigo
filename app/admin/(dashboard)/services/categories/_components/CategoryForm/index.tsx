"use client";

import { motion } from "framer-motion";
import { X, Check, Loader2 } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import type {
  CategoryFormData,
  Category,
  ParentCategory,
  BillingType,
  PriceUnit,
  DisplayFormat,
  DefaultVariant,
} from "../../types";
import { generateSlug, CATEGORY_COLORS } from "../../types";

import CategoryTypeSelector from "./CategoryTypeSelector";
import BillingTypeSelector from "./BillingTypeSelector";
import PriceUnitsSelector from "./PriceUnitsSelector";
import OvernightStaySection from "./OvernightStaySection";
import VariantFormSection from "./VariantFormSection";
import DisplayFormatSelector from "./DisplayFormatSelector";
import CapacityBasedSelector from "./CapacityBasedSelector";
import DurationBlockingSelector from "./DurationBlockingSelector";

interface CategoryFormProps {
  mode: "add" | "edit";
  formData: CategoryFormData;
  editingCategory: Category | null;
  parentCategories: ParentCategory[] | undefined;
  isSaving: boolean;
  error: string | null;
  onFormDataChange: React.Dispatch<React.SetStateAction<CategoryFormData>>;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
}

export default function CategoryForm({
  mode,
  formData,
  editingCategory,
  parentCategories,
  isSaving,
  error,
  onFormDataChange,
  onSubmit,
  onCancel,
}: CategoryFormProps) {
  const isSubcategory = formData.parentCategoryId !== null;
  const editingId = editingCategory?.id || null;

  // Handlers pour les changements de formulaire
  const handleNameChange = (name: string) => {
    onFormDataChange((prev) => ({
      ...prev,
      name,
      slug: mode === "add" ? generateSlug(name) : prev.slug,
    }));
  };

  const handleTypeChange = (isSubcategory: boolean) => {
    if (!isSubcategory) {
      onFormDataChange((prev) => ({ ...prev, parentCategoryId: null }));
    }
  };

  const handleParentChange = (parentId: Id<"serviceCategories"> | null) => {
    onFormDataChange((prev) => ({ ...prev, parentCategoryId: parentId }));
  };

  const handleBillingTypeChange = (billingType: BillingType) => {
    onFormDataChange((prev) => ({ ...prev, billingType }));
  };

  const handlePriceUnitsChange = (allowedPriceUnits: PriceUnit[]) => {
    onFormDataChange((prev) => ({ ...prev, allowedPriceUnits }));
  };

  const handleRangeBookingChange = (allowRangeBooking: boolean) => {
    onFormDataChange((prev) => ({ ...prev, allowRangeBooking }));
  };

  const handleOvernightStayChange = (allowOvernightStay: boolean) => {
    onFormDataChange((prev) => ({ ...prev, allowOvernightStay }));
  };

  const handleVariantsChange = (defaultVariants: DefaultVariant[]) => {
    onFormDataChange((prev) => ({ ...prev, defaultVariants }));
  };

  const handleAllowCustomChange = (allowCustomVariants: boolean) => {
    onFormDataChange((prev) => ({ ...prev, allowCustomVariants }));
  };

  const handleDisplayFormatChange = (displayFormat: DisplayFormat) => {
    onFormDataChange((prev) => ({ ...prev, displayFormat }));
  };

  const handleCapacityBasedChange = (isCapacityBased: boolean) => {
    onFormDataChange((prev) => ({ ...prev, isCapacityBased }));
  };

  const handleDurationBlockingChange = (enableDurationBasedBlocking: boolean) => {
    onFormDataChange((prev) => ({ ...prev, enableDurationBasedBlocking }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-slate-800 rounded-xl p-6 mb-6 border border-slate-700"
    >
      <form onSubmit={handleSubmit}>
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-white">
            {mode === "add" ? "Nouvelle catégorie" : "Modifier la catégorie"}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Champs de base */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Nom
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex: Toilettage"
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Slug (identifiant unique)
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) =>
                onFormDataChange((prev) => ({ ...prev, slug: e.target.value }))
              }
              placeholder="Ex: toilettage"
              disabled={mode === "edit"}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Icône (emoji)
            </label>
            <input
              type="text"
              value={formData.icon}
              onChange={(e) =>
                onFormDataChange((prev) => ({ ...prev, icon: e.target.value }))
              }
              placeholder="Ex: 🛁"
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Couleur
            </label>
            <div className="flex items-center gap-3">
              {/* Color picker natif */}
              <div className="relative">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) =>
                    onFormDataChange((prev) => ({ ...prev, color: e.target.value }))
                  }
                  className="w-10 h-10 rounded-lg cursor-pointer border-2 border-slate-600 bg-transparent"
                  style={{ padding: 0 }}
                />
              </div>
              {/* Code HEX */}
              <input
                type="text"
                value={formData.color.toUpperCase()}
                onChange={(e) => {
                  let value = e.target.value;
                  if (!value.startsWith("#")) value = "#" + value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                    onFormDataChange((prev) => ({ ...prev, color: value }));
                  }
                }}
                placeholder="#FF6B6B"
                className="w-24 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm font-mono focus:border-blue-500 outline-none"
              />
              {/* Couleurs prédéfinies */}
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() =>
                      onFormDataChange((prev) => ({ ...prev, color: c.value }))
                    }
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      formData.color.toUpperCase() === c.value.toUpperCase()
                        ? "border-white scale-110"
                        : "border-transparent hover:border-slate-400"
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
              {/* Aperçu */}
              <div
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: formData.color + "20",
                  color: formData.color,
                  border: `1px solid ${formData.color}`,
                }}
              >
                {formData.name || "Aperçu"}
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Description
          </label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) =>
              onFormDataChange((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
            placeholder="Ex: Soins et hygiène"
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Sélection type de catégorie */}
        <CategoryTypeSelector
          isSubcategory={isSubcategory}
          parentCategoryId={formData.parentCategoryId}
          parentCategories={parentCategories}
          editingId={editingId}
          onTypeChange={handleTypeChange}
          onParentChange={handleParentChange}
        />

        {/* Section format d'affichage et mode de réservation - uniquement pour les catégories parentes */}
        {!isSubcategory && (
          <div className="mt-4 space-y-4">
            <DisplayFormatSelector
              value={formData.displayFormat}
              onChange={handleDisplayFormatChange}
              parentName={formData.name || "Garde"}
            />
            <CapacityBasedSelector
              value={formData.isCapacityBased}
              onChange={handleCapacityBasedChange}
            />
          </div>
        )}

        {/* Champs métier - uniquement pour les sous-catégories */}
        {isSubcategory && (
          <div className="mt-4 space-y-4">
            {/* Prix horaire conseillé */}
            <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Prix horaire conseillé par défaut (€/h)
              </label>
              <div className="flex items-center gap-4">
                <div className="relative w-48">
                  <input
                    type="number"
                    value={formData.defaultHourlyPrice || ""}
                    onChange={(e) =>
                      onFormDataChange((prev) => ({
                        ...prev,
                        defaultHourlyPrice: parseFloat(e.target.value) || 0,
                      }))
                    }
                    placeholder="25"
                    step="0.5"
                    min="0"
                    className="w-full px-4 py-2 pr-12 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    €/h
                  </span>
                </div>
                <p className="text-xs text-slate-500 flex-1">
                  Ce prix sera utilisé comme référence quand il n&apos;y a pas
                  assez de données pour calculer une moyenne.
                </p>
              </div>
            </div>

            {/* Type de facturation */}
            <BillingTypeSelector
              value={formData.billingType}
              onChange={handleBillingTypeChange}
            />

            {/* Options réservation */}
            <OvernightStaySection
              allowRangeBooking={formData.allowRangeBooking}
              allowOvernightStay={formData.allowOvernightStay}
              onRangeBookingChange={handleRangeBookingChange}
              onOvernightStayChange={handleOvernightStayChange}
            />

            {/* Blocage basé sur la durée */}
            <DurationBlockingSelector
              value={formData.enableDurationBasedBlocking}
              onChange={handleDurationBlockingChange}
            />

            {/* Types de prix autorisés */}
            <PriceUnitsSelector
              value={formData.allowedPriceUnits}
              onChange={handlePriceUnitsChange}
            />

            {/* Prestations par défaut */}
            <VariantFormSection
              variants={formData.defaultVariants}
              allowCustomVariants={formData.allowCustomVariants}
              onVariantsChange={handleVariantsChange}
              onAllowCustomChange={handleAllowCustomChange}
              isGardeMode={parentCategories?.find(p => p.id === formData.parentCategoryId)?.isCapacityBased}
            />
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!formData.name || (mode === "add" && !formData.slug) || isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Check className="w-5 h-5" />
            )}
            {mode === "add" ? "Créer" : "Enregistrer"}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
