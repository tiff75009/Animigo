"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Check,
  Loader2,
  FileText,
  Settings,
  Package,
  Layers,
  Palette,
} from "lucide-react";
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
import { CATEGORY_COLORS } from "../../types";
import { generateSlug } from "../../utils";

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

type TabId = "general" | "hierarchy" | "config" | "variants";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  showForParent: boolean;
  showForPrestation: boolean;
}

const TABS: Tab[] = [
  {
    id: "general",
    label: "Informations",
    icon: <FileText className="w-4 h-4" />,
    showForParent: true,
    showForPrestation: true,
  },
  {
    id: "hierarchy",
    label: "Hiérarchie",
    icon: <Layers className="w-4 h-4" />,
    showForParent: true,
    showForPrestation: true,
  },
  {
    id: "config",
    label: "Configuration",
    icon: <Settings className="w-4 h-4" />,
    showForParent: true,
    showForPrestation: true,
  },
  {
    id: "variants",
    label: "Formules",
    icon: <Package className="w-4 h-4" />,
    showForParent: false,
    showForPrestation: true,
  },
];

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
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const isSubcategory = formData.parentCategoryId !== null;
  const editingId = editingCategory?.id || null;

  // Filtrer les onglets selon le type
  const visibleTabs = TABS.filter((tab) =>
    isSubcategory ? tab.showForPrestation : tab.showForParent
  );

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
    // Reset to first tab when type changes
    setActiveTab("general");
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

  const handleDurationBlockingChange = (
    enableDurationBasedBlocking: boolean
  ) => {
    onFormDataChange((prev) => ({ ...prev, enableDurationBasedBlocking }));
  };

  const handleCategoryTypeChange = (typeId: Id<"categoryTypes"> | null) => {
    onFormDataChange((prev) => ({ ...prev, typeId }));
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
      className="bg-slate-800 rounded-xl mb-6 border border-slate-700 overflow-hidden"
    >
      <form onSubmit={handleSubmit}>
        {/* Header avec titre et badge type */}
        <div className="flex justify-between items-center px-6 py-4 bg-slate-900/50 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
              style={{
                backgroundColor: formData.color + "20",
                border: `2px solid ${formData.color}`,
              }}
            >
              {formData.icon || (isSubcategory ? "📋" : "📁")}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {mode === "add"
                  ? isSubcategory
                    ? "Nouvelle prestation"
                    : "Nouvelle catégorie"
                  : formData.name || "Modifier"}
              </h2>
              <p className="text-xs text-slate-400">
                {isSubcategory
                  ? "Service avec tarification"
                  : "Groupe organisationnel"}
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
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="px-6 pt-4">
          <div className="flex gap-1 p-1 bg-slate-900/50 rounded-lg">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all flex-1 justify-center ${
                  activeTab === tab.id
                    ? "bg-slate-700 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* Tab: Informations générales */}
            {activeTab === "general" && (
              <motion.div
                key="general"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                {/* Nom et Slug */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Nom <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder={
                        isSubcategory ? "Ex: Toilettage complet" : "Ex: Garde"
                      }
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Slug{" "}
                      <span className="text-slate-500 font-normal">
                        (identifiant URL)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) =>
                        onFormDataChange((prev) => ({
                          ...prev,
                          slug: e.target.value,
                        }))
                      }
                      placeholder="toilettage-complet"
                      disabled={mode === "edit"}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    />
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
                      onFormDataChange((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Décrivez brièvement cette catégorie..."
                    rows={2}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none transition-colors"
                  />
                </div>

                {/* Apparence */}
                <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                  <div className="flex items-center gap-2 mb-4">
                    <Palette className="w-5 h-5 text-purple-400" />
                    <h3 className="font-medium text-white">Apparence</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Icône */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Icône (emoji)
                      </label>
                      <input
                        type="text"
                        value={formData.icon}
                        onChange={(e) =>
                          onFormDataChange((prev) => ({
                            ...prev,
                            icon: e.target.value,
                          }))
                        }
                        placeholder="🐾"
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-center text-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                      />
                    </div>

                    {/* Couleur */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Couleur
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={formData.color}
                          onChange={(e) =>
                            onFormDataChange((prev) => ({
                              ...prev,
                              color: e.target.value,
                            }))
                          }
                          className="w-10 h-10 rounded-lg cursor-pointer border-2 border-slate-600 bg-transparent flex-shrink-0"
                          style={{ padding: 0 }}
                        />
                        <input
                          type="text"
                          value={formData.color.toUpperCase()}
                          onChange={(e) => {
                            let value = e.target.value;
                            if (!value.startsWith("#")) value = "#" + value;
                            if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                              onFormDataChange((prev) => ({
                                ...prev,
                                color: value,
                              }));
                            }
                          }}
                          placeholder="#FF6B6B"
                          className="w-24 px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm font-mono focus:border-blue-500 outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Palette de couleurs prédéfinies */}
                  <div className="mt-4">
                    <label className="block text-xs text-slate-400 mb-2">
                      Couleurs suggérées
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORY_COLORS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() =>
                            onFormDataChange((prev) => ({
                              ...prev,
                              color: c.value,
                            }))
                          }
                          className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${
                            formData.color.toUpperCase() ===
                            c.value.toUpperCase()
                              ? "border-white ring-2 ring-white/30"
                              : "border-transparent hover:border-slate-400"
                          }`}
                          style={{ backgroundColor: c.value }}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Aperçu */}
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <label className="block text-xs text-slate-400 mb-2">
                      Aperçu
                    </label>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                        style={{
                          backgroundColor: formData.color + "20",
                          border: `2px solid ${formData.color}`,
                        }}
                      >
                        {formData.icon || "📋"}
                      </div>
                      <div>
                        <p
                          className="font-semibold"
                          style={{ color: formData.color }}
                        >
                          {formData.name || "Nom de la catégorie"}
                        </p>
                        <p className="text-sm text-slate-400">
                          {formData.description || "Description..."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tab: Hiérarchie */}
            {activeTab === "hierarchy" && (
              <motion.div
                key="hierarchy"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
              >
                <CategoryTypeSelector
                  isSubcategory={isSubcategory}
                  parentCategoryId={formData.parentCategoryId}
                  parentCategories={parentCategories}
                  editingId={editingId}
                  typeId={formData.typeId}
                  onTypeChange={handleTypeChange}
                  onParentChange={handleParentChange}
                  onCategoryTypeChange={handleCategoryTypeChange}
                />
              </motion.div>
            )}

            {/* Tab: Configuration */}
            {activeTab === "config" && (
              <motion.div
                key="config"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                {/* Configuration pour catégories parentes */}
                {!isSubcategory && (
                  <>
                    <DisplayFormatSelector
                      value={formData.displayFormat}
                      onChange={handleDisplayFormatChange}
                      parentName={formData.name || "Garde"}
                    />
                    <CapacityBasedSelector
                      value={formData.isCapacityBased}
                      onChange={handleCapacityBasedChange}
                    />
                  </>
                )}

                {/* Configuration pour prestations */}
                {isSubcategory && (
                  <>
                    {/* Prix horaire conseillé */}
                    <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Prix horaire conseillé par défaut
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="relative w-48">
                          <input
                            type="number"
                            value={formData.defaultHourlyPrice || ""}
                            onChange={(e) =>
                              onFormDataChange((prev) => ({
                                ...prev,
                                defaultHourlyPrice:
                                  parseFloat(e.target.value) || 0,
                              }))
                            }
                            placeholder="25"
                            step="0.5"
                            min="0"
                            className="w-full px-4 py-2.5 pr-12 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                            €/h
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 flex-1">
                          Ce prix sera utilisé comme référence quand il
                          n&apos;y a pas assez de données.
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
                  </>
                )}
              </motion.div>
            )}

            {/* Tab: Formules (prestations uniquement) */}
            {activeTab === "variants" && isSubcategory && (
              <motion.div
                key="variants"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
              >
                <VariantFormSection
                  variants={formData.defaultVariants}
                  allowCustomVariants={formData.allowCustomVariants}
                  onVariantsChange={handleVariantsChange}
                  onAllowCustomChange={handleAllowCustomChange}
                  isGardeMode={
                    parentCategories?.find(
                      (p) => p.id === formData.parentCategoryId
                    )?.isCapacityBased
                  }
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer avec navigation et actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900/30 border-t border-slate-700">
          {/* Navigation entre tabs */}
          <div className="flex items-center gap-2">
            {visibleTabs.map((tab, index) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-2 h-2 rounded-full transition-all ${
                  activeTab === tab.id
                    ? "bg-blue-500 w-6"
                    : "bg-slate-600 hover:bg-slate-500"
                }`}
                title={tab.label}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={
                !formData.name || (mode === "add" && !formData.slug) || isSaving
              }
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {mode === "add" ? "Créer" : "Enregistrer"}
            </button>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
