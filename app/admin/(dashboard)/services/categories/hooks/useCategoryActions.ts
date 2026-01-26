"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import type { Category, CategoryFormData } from "../types";

interface UseCategoryActionsResult {
  // États
  isSaving: boolean;
  uploadingImageId: Id<"serviceCategories"> | null;
  error: string | null;
  clearError: () => void;

  // Actions CRUD
  handleCreate: (formData: CategoryFormData, onSuccess: () => void) => Promise<void>;
  handleUpdate: (
    editingCategory: Category,
    formData: CategoryFormData,
    onSuccess: () => void
  ) => Promise<void>;
  handleDelete: (categoryId: Id<"serviceCategories">) => Promise<void>;
  handleToggleActive: (
    categoryId: Id<"serviceCategories">,
    currentActive: boolean
  ) => Promise<void>;
  handleImageUpload: (
    file: File,
    categoryId: Id<"serviceCategories">
  ) => Promise<void>;
  handleSeed: () => Promise<void>;
}

/**
 * Hook pour les actions CRUD sur les catégories
 * Gère les mutations Convex et les états de chargement
 */
export function useCategoryActions(
  token: string | null | undefined
): UseCategoryActionsResult {
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImageId, setUploadingImageId] = useState<Id<"serviceCategories"> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mutations Convex
  const createCategoryMutation = useMutation(api.admin.serviceCategories.createCategory);
  const updateCategoryMutation = useMutation(api.admin.serviceCategories.updateCategory);
  const deleteCategoryMutation = useMutation(api.admin.serviceCategories.deleteCategory);
  const generateUploadUrlMutation = useMutation(api.admin.serviceCategories.generateUploadUrl);
  const seedCategoriesMutation = useMutation(api.admin.serviceCategories.seedDefaultCategories);

  const clearError = useCallback(() => setError(null), []);

  // Créer une catégorie
  const handleCreate = useCallback(
    async (formData: CategoryFormData, onSuccess: () => void) => {
      if (!token || !formData.name || !formData.slug) return;
      setIsSaving(true);
      setError(null);

      try {
        const isSubcategory = formData.parentCategoryId !== null;

        await createCategoryMutation({
          token,
          slug: formData.slug,
          name: formData.name,
          description: formData.description || undefined,
          icon: formData.icon || undefined,
          color: formData.color || undefined,
          parentCategoryId: formData.parentCategoryId || undefined,
          // Champs pour les catégories parentes
          typeId: !isSubcategory && formData.typeId ? formData.typeId : undefined,
          displayFormat: !isSubcategory ? formData.displayFormat : undefined,
          isCapacityBased: !isSubcategory ? formData.isCapacityBased : undefined,
          // Champs métier pour les prestations
          billingType: isSubcategory ? formData.billingType : undefined,
          defaultHourlyPrice:
            isSubcategory && formData.defaultHourlyPrice > 0
              ? Math.round(formData.defaultHourlyPrice * 100)
              : undefined,
          allowRangeBooking: isSubcategory ? formData.allowRangeBooking : undefined,
          allowedPriceUnits:
            isSubcategory && formData.allowedPriceUnits.length > 0
              ? formData.allowedPriceUnits
              : undefined,
          defaultVariants:
            isSubcategory && formData.defaultVariants.length > 0
              ? formData.defaultVariants
              : undefined,
          allowCustomVariants: isSubcategory ? formData.allowCustomVariants : undefined,
          allowOvernightStay: isSubcategory ? formData.allowOvernightStay : undefined,
          enableDurationBasedBlocking: isSubcategory
            ? formData.enableDurationBasedBlocking
            : undefined,
        });
        onSuccess();
      } catch (err) {
        console.error("Erreur création:", err);
        setError(err instanceof Error ? err.message : "Erreur lors de la création");
      } finally {
        setIsSaving(false);
      }
    },
    [token, createCategoryMutation]
  );

  // Mettre à jour une catégorie
  const handleUpdate = useCallback(
    async (editingCategory: Category, formData: CategoryFormData, onSuccess: () => void) => {
      if (!token || !editingCategory) return;
      setIsSaving(true);
      setError(null);

      try {
        const isSubcategory = formData.parentCategoryId !== null;
        const originalParentId = editingCategory.parentCategoryId || null;
        const parentChanged = formData.parentCategoryId !== originalParentId;

        type UpdateArgs = Parameters<typeof updateCategoryMutation>[0];
        const updateArgs: UpdateArgs = {
          token,
          categoryId: editingCategory.id,
          name: formData.name || undefined,
          description: formData.description || undefined,
          icon: formData.icon || undefined,
          color: formData.color || undefined,
        };

        // Changer le parent si nécessaire
        if (parentChanged) {
          updateArgs.parentCategoryId = formData.parentCategoryId;
        }

        // Champs pour les catégories parentes
        if (!isSubcategory) {
          updateArgs.typeId = formData.typeId;
          updateArgs.displayFormat = formData.displayFormat;
          updateArgs.isCapacityBased = formData.isCapacityBased;
        }

        // Champs métier pour les prestations
        if (isSubcategory) {
          updateArgs.billingType = formData.billingType;
          if (formData.defaultHourlyPrice > 0) {
            updateArgs.defaultHourlyPrice = Math.round(formData.defaultHourlyPrice * 100);
          }
          updateArgs.allowRangeBooking = formData.allowRangeBooking;
          if (formData.allowedPriceUnits.length > 0) {
            updateArgs.allowedPriceUnits = formData.allowedPriceUnits;
          }
          if (formData.defaultVariants.length > 0) {
            updateArgs.defaultVariants = formData.defaultVariants;
          }
          updateArgs.allowCustomVariants = formData.allowCustomVariants;
          updateArgs.allowOvernightStay = formData.allowOvernightStay;
          updateArgs.enableDurationBasedBlocking = formData.enableDurationBasedBlocking;
        }

        await updateCategoryMutation(updateArgs);
        onSuccess();
      } catch (err) {
        console.error("Erreur mise à jour:", err);
        setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
      } finally {
        setIsSaving(false);
      }
    },
    [token, updateCategoryMutation]
  );

  // Supprimer une catégorie
  const handleDelete = useCallback(
    async (categoryId: Id<"serviceCategories">) => {
      if (!token) return;

      try {
        await deleteCategoryMutation({ token, categoryId });
      } catch (err) {
        console.error("Erreur suppression:", err);
        setError(err instanceof Error ? err.message : "Erreur lors de la suppression");
      }
    },
    [token, deleteCategoryMutation]
  );

  // Activer/désactiver une catégorie
  const handleToggleActive = useCallback(
    async (categoryId: Id<"serviceCategories">, currentActive: boolean) => {
      if (!token) return;

      try {
        await updateCategoryMutation({
          token,
          categoryId,
          isActive: !currentActive,
        });
      } catch (err) {
        console.error("Erreur toggle:", err);
      }
    },
    [token, updateCategoryMutation]
  );

  // Upload d'image
  const handleImageUpload = useCallback(
    async (file: File, categoryId: Id<"serviceCategories">) => {
      if (!token) return;
      setUploadingImageId(categoryId);

      try {
        const uploadUrl = await generateUploadUrlMutation({ token });
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await result.json();
        await updateCategoryMutation({ token, categoryId, imageStorageId: storageId });
      } catch (err) {
        console.error("Erreur upload:", err);
        setError(err instanceof Error ? err.message : "Erreur lors de l'upload");
      } finally {
        setUploadingImageId(null);
      }
    },
    [token, generateUploadUrlMutation, updateCategoryMutation]
  );

  // Seed des catégories par défaut
  const handleSeed = useCallback(async () => {
    if (!token) return;

    try {
      await seedCategoriesMutation({ token });
    } catch (err) {
      console.error("Erreur seed:", err);
      setError(err instanceof Error ? err.message : "Erreur lors du seed");
    }
  }, [token, seedCategoriesMutation]);

  return {
    isSaving,
    uploadingImageId,
    error,
    clearError,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleToggleActive,
    handleImageUpload,
    handleSeed,
  };
}
