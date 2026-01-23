"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Category,
  ParentCategory,
  CategoryFormData,
  DEFAULT_FORM_DATA,
} from "../types";

interface UseCategoryPageResult {
  // Data
  categories: Category[] | undefined;
  parentCategories: ParentCategory[] | undefined;
  isLoading: boolean;

  // Form state
  formMode: "closed" | "add" | "edit";
  setFormMode: (mode: "closed" | "add" | "edit") => void;
  editingCategory: Category | null;
  setEditingCategory: (category: Category | null) => void;
  formData: CategoryFormData;
  setFormData: React.Dispatch<React.SetStateAction<CategoryFormData>>;
  resetForm: () => void;

  // Expanded state
  expandedParents: Set<Id<"serviceCategories">>;
  toggleParentExpansion: (parentId: Id<"serviceCategories">) => void;

  // Action states
  isSaving: boolean;
  uploadingImageId: Id<"serviceCategories"> | null;
  error: string | null;

  // Actions
  handleCreate: () => Promise<void>;
  handleUpdate: () => Promise<void>;
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
  startEdit: (category: Category) => void;
}

export function useCategoryPage(
  token: string | null | undefined
): UseCategoryPageResult {
  // Form state
  const [formMode, setFormMode] = useState<"closed" | "add" | "edit">("closed");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(DEFAULT_FORM_DATA);

  // UI state
  const [expandedParents, setExpandedParents] = useState<
    Set<Id<"serviceCategories">>
  >(new Set());

  // Action states
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImageId, setUploadingImageId] =
    useState<Id<"serviceCategories"> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Queries
  const categories = useQuery(
    api.admin.serviceCategories.listCategories,
    token ? { token } : "skip"
  ) as Category[] | undefined;

  const parentCategories = useQuery(
    api.admin.serviceCategories.listParentCategories,
    token ? { token } : "skip"
  ) as ParentCategory[] | undefined;

  // Mutations
  const createCategoryMutation = useMutation(
    api.admin.serviceCategories.createCategory
  );
  const updateCategoryMutation = useMutation(
    api.admin.serviceCategories.updateCategory
  );
  const deleteCategoryMutation = useMutation(
    api.admin.serviceCategories.deleteCategory
  );
  const generateUploadUrlMutation = useMutation(
    api.admin.serviceCategories.generateUploadUrl
  );
  const seedCategoriesMutation = useMutation(
    api.admin.serviceCategories.seedDefaultCategories
  );

  // Reset form
  const resetForm = useCallback(() => {
    setFormData(DEFAULT_FORM_DATA);
    setFormMode("closed");
    setEditingCategory(null);
    setError(null);
  }, []);

  // Toggle parent expansion
  const toggleParentExpansion = useCallback(
    (parentId: Id<"serviceCategories">) => {
      setExpandedParents((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(parentId)) {
          newSet.delete(parentId);
        } else {
          newSet.add(parentId);
        }
        return newSet;
      });
    },
    []
  );

  // Start editing a category
  const startEdit = useCallback((category: Category) => {
    setFormData({
      slug: category.slug,
      name: category.name,
      description: category.description || "",
      icon: category.icon || "",
      parentCategoryId: category.parentCategoryId || null,
      billingType: category.billingType || "hourly",
      defaultHourlyPrice: category.defaultHourlyPrice
        ? category.defaultHourlyPrice / 100
        : 0,
      allowRangeBooking: category.allowRangeBooking || false,
      allowedPriceUnits:
        (category.allowedPriceUnits as ("hour" | "day" | "week" | "month")[]) ||
        ["hour"],
      defaultVariants: category.defaultVariants || [],
      allowCustomVariants: category.allowCustomVariants !== false,
      allowOvernightStay: category.allowOvernightStay || false,
      displayFormat: category.displayFormat || "subcategory",
      isCapacityBased: category.isCapacityBased || false,
    });
    setEditingCategory(category);
    setFormMode("edit");
    setError(null);
  }, []);

  // Create category
  const handleCreate = useCallback(async () => {
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
        parentCategoryId: formData.parentCategoryId || undefined,
        // Champs pour les catégories parentes
        displayFormat: !isSubcategory ? formData.displayFormat : undefined,
        isCapacityBased: !isSubcategory ? formData.isCapacityBased : undefined,
        // Champs métier uniquement pour les sous-catégories
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
        allowCustomVariants: isSubcategory
          ? formData.allowCustomVariants
          : undefined,
        allowOvernightStay: isSubcategory
          ? formData.allowOvernightStay
          : undefined,
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
  }, [token, formData, createCategoryMutation, resetForm]);

  // Update category
  const handleUpdate = useCallback(async () => {
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
      };

      // N'envoyer parentCategoryId que si changé
      if (parentChanged) {
        updateArgs.parentCategoryId = formData.parentCategoryId;
      }

      // Champs pour les catégories parentes
      if (!isSubcategory) {
        updateArgs.displayFormat = formData.displayFormat;
        updateArgs.isCapacityBased = formData.isCapacityBased;
      }

      // Champs métier uniquement pour les sous-catégories
      if (isSubcategory) {
        updateArgs.billingType = formData.billingType;
        if (formData.defaultHourlyPrice > 0) {
          updateArgs.defaultHourlyPrice = Math.round(
            formData.defaultHourlyPrice * 100
          );
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
      }

      await updateCategoryMutation(updateArgs);
      resetForm();
    } catch (err) {
      console.error("Erreur mise à jour:", err);
      setError(
        err instanceof Error ? err.message : "Erreur lors de la mise à jour"
      );
    } finally {
      setIsSaving(false);
    }
  }, [token, editingCategory, formData, updateCategoryMutation, resetForm]);

  // Delete category
  const handleDelete = useCallback(
    async (categoryId: Id<"serviceCategories">) => {
      if (!token) return;

      try {
        await deleteCategoryMutation({ token, categoryId });
      } catch (err) {
        console.error("Erreur suppression:", err);
        setError(
          err instanceof Error ? err.message : "Erreur lors de la suppression"
        );
      }
    },
    [token, deleteCategoryMutation]
  );

  // Toggle active status
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

  // Upload image
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
        setError(
          err instanceof Error ? err.message : "Erreur lors de l'upload"
        );
      } finally {
        setUploadingImageId(null);
      }
    },
    [token, generateUploadUrlMutation, updateCategoryMutation]
  );

  // Seed default categories
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
    // Data
    categories,
    parentCategories,
    isLoading: categories === undefined,

    // Form state
    formMode,
    setFormMode,
    editingCategory,
    setEditingCategory,
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
  };
}
