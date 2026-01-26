"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { CategoryType, TypeFormData, DEFAULT_TYPE_FORM_DATA } from "../types";

interface UseTypesPageResult {
  // Data
  types: CategoryType[] | undefined;
  isLoading: boolean;

  // Form state
  formMode: "closed" | "add" | "edit";
  setFormMode: (mode: "closed" | "add" | "edit") => void;
  editingType: CategoryType | null;
  formData: TypeFormData;
  setFormData: React.Dispatch<React.SetStateAction<TypeFormData>>;
  resetForm: () => void;

  // Action states
  isSaving: boolean;
  error: string | null;

  // Actions
  handleCreate: () => Promise<void>;
  handleUpdate: () => Promise<void>;
  handleDelete: (typeId: Id<"categoryTypes">) => Promise<void>;
  handleToggleActive: (
    typeId: Id<"categoryTypes">,
    currentActive: boolean
  ) => Promise<void>;
  handleSeed: () => Promise<void>;
  startEdit: (type: CategoryType) => void;
}

export function useTypesPage(
  token: string | null | undefined
): UseTypesPageResult {
  // Form state
  const [formMode, setFormMode] = useState<"closed" | "add" | "edit">("closed");
  const [editingType, setEditingType] = useState<CategoryType | null>(null);
  const [formData, setFormData] = useState<TypeFormData>(DEFAULT_TYPE_FORM_DATA);

  // Action states
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Queries
  const types = useQuery(
    api.admin.categoryTypes.listCategoryTypes,
    token ? { token } : "skip"
  ) as CategoryType[] | undefined;

  // Mutations
  const createTypeMutation = useMutation(
    api.admin.categoryTypes.createCategoryType
  );
  const updateTypeMutation = useMutation(
    api.admin.categoryTypes.updateCategoryType
  );
  const deleteTypeMutation = useMutation(
    api.admin.categoryTypes.deleteCategoryType
  );
  const seedTypesMutation = useMutation(
    api.admin.categoryTypes.seedDefaultCategoryTypes
  );

  // Reset form
  const resetForm = useCallback(() => {
    setFormData(DEFAULT_TYPE_FORM_DATA);
    setFormMode("closed");
    setEditingType(null);
    setError(null);
  }, []);

  // Start editing a type
  const startEdit = useCallback((type: CategoryType) => {
    setFormData({
      slug: type.slug,
      name: type.name,
      description: type.description || "",
      icon: type.icon || "📁",
      color: type.color || "#6B7280",
    });
    setEditingType(type);
    setFormMode("edit");
    setError(null);
  }, []);

  // Create type
  const handleCreate = useCallback(async () => {
    if (!token || !formData.name || !formData.slug) return;
    setIsSaving(true);
    setError(null);

    try {
      await createTypeMutation({
        token,
        slug: formData.slug,
        name: formData.name,
        description: formData.description || undefined,
        icon: formData.icon || undefined,
        color: formData.color || undefined,
      });
      resetForm();
    } catch (err) {
      console.error("Erreur création:", err);
      setError(
        err instanceof Error ? err.message : "Erreur lors de la création"
      );
    } finally {
      setIsSaving(false);
    }
  }, [token, formData, createTypeMutation, resetForm]);

  // Update type
  const handleUpdate = useCallback(async () => {
    if (!token || !editingType) return;
    setIsSaving(true);
    setError(null);

    try {
      await updateTypeMutation({
        token,
        typeId: editingType.id,
        slug: formData.slug || undefined,
        name: formData.name || undefined,
        description: formData.description || undefined,
        icon: formData.icon || undefined,
        color: formData.color || undefined,
      });
      resetForm();
    } catch (err) {
      console.error("Erreur mise à jour:", err);
      setError(
        err instanceof Error ? err.message : "Erreur lors de la mise à jour"
      );
    } finally {
      setIsSaving(false);
    }
  }, [token, editingType, formData, updateTypeMutation, resetForm]);

  // Delete type
  const handleDelete = useCallback(
    async (typeId: Id<"categoryTypes">) => {
      if (!token) return;

      try {
        await deleteTypeMutation({ token, typeId });
      } catch (err) {
        console.error("Erreur suppression:", err);
        setError(
          err instanceof Error ? err.message : "Erreur lors de la suppression"
        );
      }
    },
    [token, deleteTypeMutation]
  );

  // Toggle active status
  const handleToggleActive = useCallback(
    async (typeId: Id<"categoryTypes">, currentActive: boolean) => {
      if (!token) return;

      try {
        await updateTypeMutation({
          token,
          typeId,
          isActive: !currentActive,
        });
      } catch (err) {
        console.error("Erreur toggle:", err);
      }
    },
    [token, updateTypeMutation]
  );

  // Seed default types
  const handleSeed = useCallback(async () => {
    if (!token) return;

    try {
      await seedTypesMutation({ token });
    } catch (err) {
      console.error("Erreur seed:", err);
      setError(err instanceof Error ? err.message : "Erreur lors du seed");
    }
  }, [token, seedTypesMutation]);

  return {
    // Data
    types,
    isLoading: types === undefined,

    // Form state
    formMode,
    setFormMode,
    editingType,
    formData,
    setFormData,
    resetForm,

    // Action states
    isSaving,
    error,

    // Actions
    handleCreate,
    handleUpdate,
    handleDelete,
    handleToggleActive,
    handleSeed,
    startEdit,
  };
}
