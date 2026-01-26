"use client";

import { useCallback } from "react";
import { useCategoryData } from "./useCategoryData";
import { useCategoryForm } from "./useCategoryForm";
import { useCategoryActions } from "./useCategoryActions";

/**
 * Hook principal de la page des catégories
 * Compose les hooks spécialisés pour une API unifiée
 */
export function useCategoryPage(token: string | null | undefined) {
  // Données
  const { categories, parentCategories, isLoading } = useCategoryData(token);

  // État du formulaire
  const {
    formMode,
    setFormMode,
    editingCategory,
    formData,
    setFormData,
    expandedParents,
    toggleParentExpansion,
    resetForm,
    startEdit,
    startAdd,
  } = useCategoryForm();

  // Actions CRUD
  const {
    isSaving,
    uploadingImageId,
    error,
    clearError,
    handleCreate: createCategory,
    handleUpdate: updateCategory,
    handleDelete,
    handleToggleActive,
    handleImageUpload,
    handleSeed,
  } = useCategoryActions(token);

  // Wrapper pour handleCreate avec resetForm
  const handleCreate = useCallback(async () => {
    await createCategory(formData, resetForm);
  }, [createCategory, formData, resetForm]);

  // Wrapper pour handleUpdate avec resetForm
  const handleUpdate = useCallback(async () => {
    if (!editingCategory) return;
    await updateCategory(editingCategory, formData, resetForm);
  }, [updateCategory, editingCategory, formData, resetForm]);

  return {
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
    clearError,

    // Actions
    handleCreate,
    handleUpdate,
    handleDelete,
    handleToggleActive,
    handleImageUpload,
    handleSeed,
    startEdit,
    startAdd,
  };
}
