"use client";

import { useState, useCallback } from "react";
import { Id } from "@/convex/_generated/dataModel";
import type { Category, CategoryFormData, FormMode } from "../types";
import { DEFAULT_FORM_DATA } from "../types";
import { categoryToFormData } from "../utils";

interface UseCategoryFormResult {
  // État du formulaire
  formMode: FormMode;
  setFormMode: (mode: FormMode) => void;
  editingCategory: Category | null;
  formData: CategoryFormData;
  setFormData: React.Dispatch<React.SetStateAction<CategoryFormData>>;

  // État d'expansion (pour la table)
  expandedParents: Set<Id<"serviceCategories">>;
  toggleParentExpansion: (parentId: Id<"serviceCategories">) => void;

  // Actions
  resetForm: () => void;
  startEdit: (category: Category) => void;
  startAdd: () => void;
}

/**
 * Hook pour gérer l'état du formulaire de catégorie
 * Séparé des mutations pour une meilleure testabilité
 */
export function useCategoryForm(): UseCategoryFormResult {
  // État du formulaire
  const [formMode, setFormMode] = useState<FormMode>("closed");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(DEFAULT_FORM_DATA);

  // État d'expansion des catégories parentes dans la table
  const [expandedParents, setExpandedParents] = useState<Set<Id<"serviceCategories">>>(
    new Set()
  );

  // Toggle expansion d'une catégorie parente
  const toggleParentExpansion = useCallback((parentId: Id<"serviceCategories">) => {
    setExpandedParents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(parentId)) {
        newSet.delete(parentId);
      } else {
        newSet.add(parentId);
      }
      return newSet;
    });
  }, []);

  // Réinitialiser le formulaire
  const resetForm = useCallback(() => {
    setFormData(DEFAULT_FORM_DATA);
    setFormMode("closed");
    setEditingCategory(null);
  }, []);

  // Démarrer l'édition d'une catégorie
  const startEdit = useCallback((category: Category) => {
    setFormData(categoryToFormData(category));
    setEditingCategory(category);
    setFormMode("edit");
  }, []);

  // Démarrer l'ajout d'une nouvelle catégorie
  const startAdd = useCallback(() => {
    resetForm();
    setFormMode("add");
  }, [resetForm]);

  return {
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
  };
}
