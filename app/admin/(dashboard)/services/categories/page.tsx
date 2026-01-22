"use client";

import { AnimatePresence } from "framer-motion";
import { Tag, Plus, Sparkles } from "lucide-react";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { useCategoryPage } from "./hooks/useCategoryPage";
import { CategoryForm, CategoryTable } from "./_components";

export default function ServiceCategoriesPage() {
  const { token } = useAdminAuth();
  const {
    // Data
    categories,
    parentCategories,
    isLoading,

    // Form state
    formMode,
    setFormMode,
    editingCategory,
    formData,
    setFormData,
    resetForm,

    // Expanded state
    expandedParents,
    toggleParentExpansion,

    // Action states
    isSaving,
    uploadingImageId,
    error,

    // Actions
    handleCreate,
    handleUpdate,
    handleDelete,
    handleToggleActive,
    handleImageUpload,
    handleSeed,
    startEdit,
  } = useCategoryPage(token);

  // Submit handler basé sur le mode
  const handleSubmit = async () => {
    if (formMode === "add") {
      await handleCreate();
    } else if (formMode === "edit") {
      await handleUpdate();
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Tag className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl font-bold text-white">
              Catégories de services
            </h1>
          </div>
          <p className="text-slate-400">
            Gérez les catégories et sous-catégories de prestations disponibles
            sur la plateforme.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Bouton Seed (si aucune catégorie) */}
          {categories && categories.length === 0 && (
            <button
              onClick={handleSeed}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Sparkles className="w-5 h-5" />
              Catégories par défaut
            </button>
          )}

          {/* Bouton Nouvelle catégorie */}
          <button
            onClick={() => {
              resetForm();
              setFormMode("add");
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nouvelle catégorie
          </button>
        </div>
      </div>

      {/* Formulaire (si ouvert) */}
      <AnimatePresence>
        {formMode !== "closed" && (
          <CategoryForm
            mode={formMode}
            formData={formData}
            editingCategory={editingCategory}
            parentCategories={parentCategories}
            isSaving={isSaving}
            error={error}
            onFormDataChange={setFormData}
            onSubmit={handleSubmit}
            onCancel={resetForm}
          />
        )}
      </AnimatePresence>

      {/* Table des catégories */}
      <CategoryTable
        categories={categories}
        isLoading={isLoading}
        expandedParents={expandedParents}
        uploadingImageId={uploadingImageId}
        onToggleExpand={toggleParentExpansion}
        onEdit={startEdit}
        onDelete={handleDelete}
        onToggleActive={handleToggleActive}
        onImageUpload={handleImageUpload}
        onSeed={handleSeed}
      />
    </div>
  );
}
