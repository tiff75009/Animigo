"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Prestation } from "../types";

export interface PrestationFormData {
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  parentCategoryId: Id<"serviceCategories"> | null;
  billingType: "hourly" | "daily" | "flexible";
  defaultHourlyPrice: number;
  defaultNightlyPrice: number;
  allowRangeBooking: boolean;
  allowOvernightStay: boolean;
  enableDurationBasedBlocking: boolean;
  allowedPriceUnits: ("hour" | "half_day" | "day" | "week" | "month")[];
  // Configuration tarification avancée
  announcerPriceMode: "manual" | "automatic";
  clientBillingMode: "exact_hourly" | "round_half_day" | "round_full_day";
  hourlyBillingSurchargePercent: number;
  displayPriceUnit: "hour" | "half_day" | "day" | "week" | "month";
}

export const DEFAULT_PRESTATION_FORM: PrestationFormData = {
  name: "",
  slug: "",
  description: "",
  icon: "",
  color: "#FF6B6B",
  parentCategoryId: null,
  billingType: "hourly",
  defaultHourlyPrice: 0,
  defaultNightlyPrice: 0,
  allowRangeBooking: false,
  allowOvernightStay: false,
  enableDurationBasedBlocking: false,
  allowedPriceUnits: ["hour"],
  // Configuration tarification avancée - valeurs par défaut
  announcerPriceMode: "manual",
  clientBillingMode: "exact_hourly",
  hourlyBillingSurchargePercent: 0,
  displayPriceUnit: "hour",
};

interface UsePrestationActionsResult {
  // Form state
  isEditing: boolean;
  editingPrestation: Prestation | null;
  formData: PrestationFormData;
  setFormData: React.Dispatch<React.SetStateAction<PrestationFormData>>;

  // Action states
  isSaving: boolean;
  error: string | null;

  // Actions
  startEdit: (prestation: Prestation) => void;
  startCreate: () => void;
  cancelEdit: () => void;
  handleSave: () => Promise<void>;
  handleDelete: (id: Id<"serviceCategories">) => Promise<void>;
  handleToggleActive: (id: Id<"serviceCategories">, currentActive: boolean) => Promise<void>;
}

export function usePrestationActions(
  token: string | null | undefined
): UsePrestationActionsResult {
  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [editingPrestation, setEditingPrestation] = useState<Prestation | null>(null);
  const [formData, setFormData] = useState<PrestationFormData>(DEFAULT_PRESTATION_FORM);

  // Action states
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mutations
  const createMutation = useMutation(api.admin.serviceCategories.createCategory);
  const updateMutation = useMutation(api.admin.serviceCategories.updateCategory);
  const deleteMutation = useMutation(api.admin.serviceCategories.deleteCategory);

  // Convert prestation to form data
  const prestationToFormData = (prestation: Prestation): PrestationFormData => ({
    name: prestation.name,
    slug: prestation.slug,
    description: prestation.description || "",
    icon: prestation.icon || "",
    color: prestation.color || "#FF6B6B",
    parentCategoryId: prestation.parentCategoryId,
    billingType: prestation.billingType || "hourly",
    defaultHourlyPrice: prestation.defaultHourlyPrice ? prestation.defaultHourlyPrice / 100 : 0, // Convert from cents to euros
    defaultNightlyPrice: prestation.defaultNightlyPrice ? prestation.defaultNightlyPrice / 100 : 0, // Convert from cents to euros
    allowRangeBooking: prestation.allowRangeBooking || false,
    allowOvernightStay: prestation.allowOvernightStay || false,
    enableDurationBasedBlocking: prestation.enableDurationBasedBlocking || false,
    allowedPriceUnits: ["hour"],
    // Configuration tarification avancée
    announcerPriceMode: prestation.announcerPriceMode || "manual",
    clientBillingMode: prestation.clientBillingMode || "exact_hourly",
    hourlyBillingSurchargePercent: prestation.hourlyBillingSurchargePercent || 0,
    displayPriceUnit: prestation.displayPriceUnit || "hour",
  });

  // Start editing a prestation
  const startEdit = useCallback((prestation: Prestation) => {
    setFormData(prestationToFormData(prestation));
    setEditingPrestation(prestation);
    setIsEditing(true);
    setError(null);
    // Scroll to top to show the form
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Start creating a new prestation
  const startCreate = useCallback(() => {
    setFormData(DEFAULT_PRESTATION_FORM);
    setEditingPrestation(null);
    setIsEditing(true);
    setError(null);
    // Scroll to top to show the form
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Cancel editing
  const cancelEdit = useCallback(() => {
    setFormData(DEFAULT_PRESTATION_FORM);
    setEditingPrestation(null);
    setIsEditing(false);
    setError(null);
  }, []);

  // Save (create or update)
  const handleSave = useCallback(async () => {
    if (!token || !formData.name || !formData.parentCategoryId) {
      setError("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (editingPrestation) {
        // Update existing prestation
        await updateMutation({
          token,
          categoryId: editingPrestation.id,
          name: formData.name,
          description: formData.description || undefined,
          icon: formData.icon || undefined,
          color: formData.color || undefined,
          billingType: formData.billingType,
          allowRangeBooking: formData.allowRangeBooking,
          allowOvernightStay: formData.allowOvernightStay,
          enableDurationBasedBlocking: formData.enableDurationBasedBlocking,
          allowedPriceUnits: formData.allowedPriceUnits.length > 0 ? formData.allowedPriceUnits : undefined,
          defaultHourlyPrice: formData.defaultHourlyPrice > 0
            ? Math.round(formData.defaultHourlyPrice * 100)
            : undefined,
          defaultNightlyPrice: formData.defaultNightlyPrice > 0
            ? Math.round(formData.defaultNightlyPrice * 100)
            : undefined,
          // Configuration tarification avancée
          announcerPriceMode: formData.announcerPriceMode,
          clientBillingMode: formData.clientBillingMode,
          hourlyBillingSurchargePercent: formData.hourlyBillingSurchargePercent,
          displayPriceUnit: formData.displayPriceUnit,
        });
      } else {
        // Create new prestation
        await createMutation({
          token,
          slug: formData.slug,
          name: formData.name,
          description: formData.description || undefined,
          icon: formData.icon || undefined,
          color: formData.color || undefined,
          parentCategoryId: formData.parentCategoryId,
          billingType: formData.billingType,
          allowRangeBooking: formData.allowRangeBooking,
          allowOvernightStay: formData.allowOvernightStay,
          enableDurationBasedBlocking: formData.enableDurationBasedBlocking,
          allowedPriceUnits: formData.allowedPriceUnits.length > 0 ? formData.allowedPriceUnits : undefined,
          defaultHourlyPrice: formData.defaultHourlyPrice > 0
            ? Math.round(formData.defaultHourlyPrice * 100)
            : undefined,
          defaultNightlyPrice: formData.defaultNightlyPrice > 0
            ? Math.round(formData.defaultNightlyPrice * 100)
            : undefined,
          // Configuration tarification avancée
          announcerPriceMode: formData.announcerPriceMode,
          clientBillingMode: formData.clientBillingMode,
          hourlyBillingSurchargePercent: formData.hourlyBillingSurchargePercent,
          displayPriceUnit: formData.displayPriceUnit,
        });
      }

      cancelEdit();
    } catch (err) {
      console.error("Error saving prestation:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  }, [token, formData, editingPrestation, createMutation, updateMutation, cancelEdit]);

  // Delete prestation
  const handleDelete = useCallback(async (id: Id<"serviceCategories">) => {
    if (!token) return;

    try {
      await deleteMutation({ token, categoryId: id });
      if (editingPrestation?.id === id) {
        cancelEdit();
      }
    } catch (err) {
      console.error("Error deleting prestation:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression");
    }
  }, [token, deleteMutation, editingPrestation, cancelEdit]);

  // Toggle active status
  const handleToggleActive = useCallback(async (
    id: Id<"serviceCategories">,
    currentActive: boolean
  ) => {
    if (!token) return;

    try {
      await updateMutation({
        token,
        categoryId: id,
        isActive: !currentActive,
      });
    } catch (err) {
      console.error("Error toggling active:", err);
    }
  }, [token, updateMutation]);

  return {
    // Form state
    isEditing,
    editingPrestation,
    formData,
    setFormData,

    // Action states
    isSaving,
    error,

    // Actions
    startEdit,
    startCreate,
    cancelEdit,
    handleSave,
    handleDelete,
    handleToggleActive,
  };
}
