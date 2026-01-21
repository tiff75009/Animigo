"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Upload,
  X,
  Loader2,
  GripVertical,
  Check,
  AlertCircle,
  Image as ImageIcon,
  Sparkles,
  Clock,
  Calendar,
  CalendarDays,
  CalendarRange,
  Package,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

type BillingType = "hourly" | "daily" | "flexible";
type PriceUnit = "hour" | "day" | "week" | "month";

interface DefaultVariant {
  name: string;
  description?: string;
  suggestedDuration?: number;
  includedFeatures?: string[];
}

interface CategoryFormData {
  slug: string;
  name: string;
  description: string;
  icon: string;
  billingType: BillingType;
  defaultHourlyPrice: number; // Prix horaire par défaut en euros
  allowRangeBooking: boolean; // Permettre la réservation par plage
  allowedPriceUnits: PriceUnit[]; // Types de prix autorisés
  defaultVariants: DefaultVariant[]; // Formules par défaut
  allowCustomVariants: boolean; // Autoriser l'ajout de formules personnalisées
  allowOvernightStay: boolean; // Autoriser la garde de nuit
}

const PRICE_UNITS: { value: PriceUnit; label: string; icon: React.ReactNode; description: string }[] = [
  { value: "hour", label: "Horaire", icon: <Clock className="w-4 h-4" />, description: "Prix à l'heure" },
  { value: "day", label: "Journalier", icon: <Calendar className="w-4 h-4" />, description: "Prix à la journée" },
  { value: "week", label: "Hebdomadaire", icon: <CalendarDays className="w-4 h-4" />, description: "Prix à la semaine" },
  { value: "month", label: "Mensuel", icon: <CalendarRange className="w-4 h-4" />, description: "Prix au mois" },
];

export default function ServiceCategoriesPage() {
  const { token } = useAdminAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<Id<"serviceCategories"> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<Id<"serviceCategories"> | null>(null);

  // Form state
  const [formData, setFormData] = useState<CategoryFormData>({
    slug: "",
    name: "",
    description: "",
    icon: "",
    billingType: "hourly",
    defaultHourlyPrice: 0,
    allowRangeBooking: false,
    allowedPriceUnits: ["hour"],
    defaultVariants: [],
    allowCustomVariants: true,
    allowOvernightStay: false,
  });

  // State for editing a variant
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null);
  const [variantForm, setVariantForm] = useState<DefaultVariant>({
    name: "",
    description: "",
    suggestedDuration: undefined,
    includedFeatures: [],
  });
  const [newFeature, setNewFeature] = useState("");

  // Queries
  const categories = useQuery(
    api.admin.serviceCategories.listCategories,
    token ? { token } : "skip"
  );

  // Mutations
  const createCategory = useMutation(api.admin.serviceCategories.createCategory);
  const updateCategory = useMutation(api.admin.serviceCategories.updateCategory);
  const deleteCategory = useMutation(api.admin.serviceCategories.deleteCategory);
  const generateUploadUrl = useMutation(api.admin.serviceCategories.generateUploadUrl);
  const seedCategories = useMutation(api.admin.serviceCategories.seedDefaultCategories);

  // Reset form
  const resetForm = () => {
    setFormData({
      slug: "",
      name: "",
      description: "",
      icon: "",
      billingType: "hourly",
      defaultHourlyPrice: 0,
      allowRangeBooking: false,
      allowedPriceUnits: ["hour"],
      defaultVariants: [],
      allowCustomVariants: true,
      allowOvernightStay: false,
    });
    setIsAdding(false);
    setEditingId(null);
    setEditingVariantIndex(null);
    setVariantForm({ name: "", description: "", suggestedDuration: undefined, includedFeatures: [] });
    setNewFeature("");
  };

  // Toggle price unit
  const togglePriceUnit = (unit: PriceUnit) => {
    setFormData(prev => ({
      ...prev,
      allowedPriceUnits: prev.allowedPriceUnits.includes(unit)
        ? prev.allowedPriceUnits.filter(u => u !== unit)
        : [...prev.allowedPriceUnits, unit],
    }));
  };

  // Add variant
  const addVariant = () => {
    if (!variantForm.name.trim()) return;
    // Nettoyer les données avant ajout (retirer les valeurs vides)
    const cleanedVariant: DefaultVariant = {
      name: variantForm.name.trim(),
      description: variantForm.description?.trim() || undefined,
      suggestedDuration: variantForm.suggestedDuration || undefined,
      includedFeatures: variantForm.includedFeatures && variantForm.includedFeatures.length > 0
        ? variantForm.includedFeatures
        : undefined,
    };
    console.log("addVariant - cleanedVariant:", cleanedVariant);
    setFormData(prev => {
      const newVariants = [...prev.defaultVariants, cleanedVariant];
      console.log("addVariant - newVariants:", newVariants);
      return {
        ...prev,
        defaultVariants: newVariants,
      };
    });
    setVariantForm({ name: "", description: "", suggestedDuration: undefined, includedFeatures: [] });
    setNewFeature("");
  };

  // Update variant
  const updateVariant = () => {
    if (editingVariantIndex === null || !variantForm.name.trim()) return;
    // Nettoyer les données avant mise à jour
    const cleanedVariant: DefaultVariant = {
      name: variantForm.name.trim(),
      description: variantForm.description?.trim() || undefined,
      suggestedDuration: variantForm.suggestedDuration || undefined,
      includedFeatures: variantForm.includedFeatures && variantForm.includedFeatures.length > 0
        ? variantForm.includedFeatures
        : undefined,
    };
    setFormData(prev => ({
      ...prev,
      defaultVariants: prev.defaultVariants.map((v, i) =>
        i === editingVariantIndex ? cleanedVariant : v
      ),
    }));
    setEditingVariantIndex(null);
    setVariantForm({ name: "", description: "", suggestedDuration: undefined, includedFeatures: [] });
    setNewFeature("");
  };

  // Delete variant
  const deleteVariant = (index: number) => {
    setFormData(prev => ({
      ...prev,
      defaultVariants: prev.defaultVariants.filter((_, i) => i !== index),
    }));
  };

  // Start edit variant
  const startEditVariant = (index: number) => {
    const variant = formData.defaultVariants[index];
    setVariantForm({ ...variant, includedFeatures: variant.includedFeatures || [] });
    setEditingVariantIndex(index);
  };

  // Add feature to variant
  const addFeature = () => {
    if (!newFeature.trim()) return;
    setVariantForm(prev => ({
      ...prev,
      includedFeatures: [...(prev.includedFeatures || []), newFeature.trim()],
    }));
    setNewFeature("");
  };

  // Remove feature from variant
  const removeFeature = (index: number) => {
    setVariantForm(prev => ({
      ...prev,
      includedFeatures: (prev.includedFeatures || []).filter((_, i) => i !== index),
    }));
  };

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  // Handle name change with auto-slug
  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: isAdding ? generateSlug(name) : formData.slug,
    });
  };

  // Create category
  const handleCreate = async () => {
    if (!token || !formData.name || !formData.slug) return;
    setIsSaving(true);

    // Debug: afficher les données à envoyer
    console.log("handleCreate - formData.defaultVariants:", formData.defaultVariants);

    try {
      await createCategory({
        token,
        slug: formData.slug,
        name: formData.name,
        description: formData.description || undefined,
        icon: formData.icon || undefined,
        billingType: formData.billingType,
        defaultHourlyPrice: formData.defaultHourlyPrice > 0
          ? Math.round(formData.defaultHourlyPrice * 100) // Convertir en centimes
          : undefined,
        allowRangeBooking: formData.allowRangeBooking,
        allowedPriceUnits: formData.allowedPriceUnits.length > 0
          ? formData.allowedPriceUnits
          : undefined,
        defaultVariants: formData.defaultVariants.length > 0
          ? formData.defaultVariants
          : undefined,
        allowCustomVariants: formData.allowCustomVariants,
        allowOvernightStay: formData.allowOvernightStay,
      });
      resetForm();
    } catch (error) {
      console.error("Erreur:", error);
      alert(error instanceof Error ? error.message : "Erreur lors de la création");
    } finally {
      setIsSaving(false);
    }
  };

  // Update category
  const handleUpdate = async () => {
    if (!token || !editingId) return;
    setIsSaving(true);

    // Debug: afficher les données à envoyer
    console.log("handleUpdate - formData.defaultVariants:", formData.defaultVariants);

    try {
      await updateCategory({
        token,
        categoryId: editingId,
        name: formData.name || undefined,
        description: formData.description || undefined,
        icon: formData.icon || undefined,
        billingType: formData.billingType,
        defaultHourlyPrice: formData.defaultHourlyPrice > 0
          ? Math.round(formData.defaultHourlyPrice * 100) // Convertir en centimes
          : undefined,
        allowRangeBooking: formData.allowRangeBooking,
        allowedPriceUnits: formData.allowedPriceUnits.length > 0
          ? formData.allowedPriceUnits
          : undefined,
        defaultVariants: formData.defaultVariants.length > 0
          ? formData.defaultVariants
          : undefined,
        allowCustomVariants: formData.allowCustomVariants,
        allowOvernightStay: formData.allowOvernightStay,
      });
      resetForm();
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete category
  const handleDelete = async (categoryId: Id<"serviceCategories">) => {
    if (!token || !confirm("Supprimer cette catégorie ?")) return;
    try {
      await deleteCategory({ token, categoryId });
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  // Toggle active
  const handleToggleActive = async (categoryId: Id<"serviceCategories">, isActive: boolean) => {
    if (!token) return;
    try {
      await updateCategory({ token, categoryId, isActive: !isActive });
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  // Start editing
  const startEdit = (category: NonNullable<typeof categories>[number]) => {
    // Debug: afficher les données de la catégorie
    console.log("startEdit - category:", category);
    console.log("startEdit - category.defaultVariants:", category.defaultVariants);

    setFormData({
      slug: category.slug,
      name: category.name,
      description: category.description || "",
      icon: category.icon || "",
      billingType: category.billingType || "hourly",
      defaultHourlyPrice: category.defaultHourlyPrice ? category.defaultHourlyPrice / 100 : 0, // Convertir en euros
      allowRangeBooking: category.allowRangeBooking || false,
      allowedPriceUnits: (category.allowedPriceUnits as PriceUnit[]) || ["hour"],
      defaultVariants: (category.defaultVariants as DefaultVariant[]) || [],
      allowCustomVariants: category.allowCustomVariants !== false, // Par défaut true si non défini
      allowOvernightStay: category.allowOvernightStay || false,
    });
    setEditingId(category.id);
    setIsAdding(false);
    setEditingVariantIndex(null);
    setVariantForm({ name: "", description: "", suggestedDuration: undefined, includedFeatures: [] });
  };

  // Upload image
  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    categoryId: Id<"serviceCategories">
  ) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setUploadingImage(categoryId);
    try {
      const uploadUrl = await generateUploadUrl({ token });
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      await updateCategory({ token, categoryId, imageStorageId: storageId });
    } catch (error) {
      console.error("Erreur upload:", error);
    } finally {
      setUploadingImage(null);
    }
  };

  // Seed default categories
  const handleSeed = async () => {
    if (!token || !confirm("Créer les catégories par défaut ?")) return;
    try {
      await seedCategories({ token });
    } catch (error) {
      console.error("Erreur:", error);
      alert(error instanceof Error ? error.message : "Erreur");
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Tag className="w-8 h-8 text-blue-500" />
            Catégories de services
          </h1>
          <p className="text-slate-400 mt-1">
            Gérez les catégories de services disponibles sur la plateforme
          </p>
        </div>
        <div className="flex gap-3">
          {categories?.length === 0 && (
            <motion.button
              onClick={handleSeed}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Sparkles className="w-5 h-5" />
              Créer par défaut
            </motion.button>
          )}
          <motion.button
            onClick={() => {
              resetForm();
              setIsAdding(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-5 h-5" />
            Nouvelle catégorie
          </motion.button>
        </div>
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {(isAdding || editingId) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-slate-800 rounded-xl p-6 mb-6 border border-slate-700"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">
                {isAdding ? "Nouvelle catégorie" : "Modifier la catégorie"}
              </h2>
              <button
                onClick={resetForm}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

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
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="Ex: toilettage"
                  disabled={!!editingId}
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
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="Ex: 🛁"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Soins et hygiène"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Prix horaire conseillé par défaut */}
            <div className="mb-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Prix horaire conseillé par défaut (€/h)
              </label>
              <div className="flex items-center gap-4">
                <div className="relative w-48">
                  <input
                    type="number"
                    value={formData.defaultHourlyPrice || ""}
                    onChange={(e) => setFormData({ ...formData, defaultHourlyPrice: parseFloat(e.target.value) || 0 })}
                    placeholder="25"
                    step="0.5"
                    min="0"
                    className="w-full px-4 py-2 pr-12 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">€/h</span>
                </div>
                <p className="text-xs text-slate-500 flex-1">
                  Ce prix sera utilisé comme référence quand il n&apos;y a pas assez de données pour calculer une moyenne.
                </p>
              </div>
            </div>

            {/* Billing Type Selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Type de facturation
              </label>
              <div className="grid grid-cols-3 gap-3">
                <label
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-all ${
                    formData.billingType === "hourly"
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-slate-700 bg-slate-900 hover:border-slate-600"
                  }`}
                >
                  <input
                    type="radio"
                    name="billingType"
                    value="hourly"
                    checked={formData.billingType === "hourly"}
                    onChange={(e) => setFormData({ ...formData, billingType: e.target.value as BillingType })}
                    className="sr-only"
                  />
                  <span className="text-2xl">⏱️</span>
                  <span className="font-medium text-white">Horaire</span>
                  <span className="text-xs text-slate-400 text-center">
                    Facturation à l&apos;heure
                  </span>
                </label>
                <label
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-all ${
                    formData.billingType === "daily"
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-slate-700 bg-slate-900 hover:border-slate-600"
                  }`}
                >
                  <input
                    type="radio"
                    name="billingType"
                    value="daily"
                    checked={formData.billingType === "daily"}
                    onChange={(e) => setFormData({ ...formData, billingType: e.target.value as BillingType })}
                    className="sr-only"
                  />
                  <span className="text-2xl">📅</span>
                  <span className="font-medium text-white">Journalier</span>
                  <span className="text-xs text-slate-400 text-center">
                    Facturation à la journée
                  </span>
                </label>
                <label
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-all ${
                    formData.billingType === "flexible"
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-slate-700 bg-slate-900 hover:border-slate-600"
                  }`}
                >
                  <input
                    type="radio"
                    name="billingType"
                    value="flexible"
                    checked={formData.billingType === "flexible"}
                    onChange={(e) => setFormData({ ...formData, billingType: e.target.value as BillingType })}
                    className="sr-only"
                  />
                  <span className="text-2xl">🔄</span>
                  <span className="font-medium text-white">Flexible</span>
                  <span className="text-xs text-slate-400 text-center">
                    L&apos;annonceur choisit
                  </span>
                </label>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Pour les catégories &quot;Flexible&quot;, l&apos;annonceur définit s&apos;il facture à l&apos;heure ou à la journée.
              </p>
            </div>

            {/* Réservation par plage */}
            <div className="mb-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allowRangeBooking}
                  onChange={(e) => setFormData({ ...formData, allowRangeBooking: e.target.checked })}
                  className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                />
                <div>
                  <span className="font-medium text-white">Réservation par plage</span>
                  <p className="text-xs text-slate-400 mt-1">
                    Permet au client de sélectionner une plage de dates (ex: du 15 au 18 janvier)
                    ou une plage d&apos;heures sur un même jour (ex: de 10h à 14h).
                  </p>
                </div>
              </label>
            </div>

            {/* Autoriser la garde de nuit */}
            <div className="mb-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allowOvernightStay}
                  onChange={(e) => setFormData({ ...formData, allowOvernightStay: e.target.checked })}
                  className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900"
                />
                <div>
                  <span className="font-medium text-white">Autoriser la garde de nuit</span>
                  <p className="text-xs text-slate-400 mt-1">
                    Permet aux annonceurs de proposer la garde de nuit pour cette catégorie.
                    Le client pourra choisir de laisser l&apos;animal la nuit lors d&apos;une réservation multi-jours.
                  </p>
                </div>
              </label>
            </div>

            {/* Multi-pricing - Types de prix autorisés */}
            <div className="mb-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-blue-400" />
                <span className="font-medium text-white">Types de prix autorisés</span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Sélectionnez les unités de tarification que les annonceurs pourront utiliser pour cette catégorie.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PRICE_UNITS.map((unit) => (
                  <label
                    key={unit.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      formData.allowedPriceUnits.includes(unit.value)
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-slate-700 bg-slate-800 hover:border-slate-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.allowedPriceUnits.includes(unit.value)}
                      onChange={() => togglePriceUnit(unit.value)}
                      className="sr-only"
                    />
                    <div className={`p-2 rounded-lg ${formData.allowedPriceUnits.includes(unit.value) ? "bg-blue-500/20 text-blue-400" : "bg-slate-700 text-slate-400"}`}>
                      {unit.icon}
                    </div>
                    <div>
                      <span className="font-medium text-white text-sm">{unit.label}</span>
                      <p className="text-xs text-slate-400">{unit.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Formules par défaut */}
            <div className="mb-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-400" />
                  <span className="font-medium text-white">Formules par défaut</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Créez des modèles de formules que les annonceurs pourront utiliser. Ils n&apos;auront qu&apos;à ajouter leur prix.
              </p>

              {/* Option pour autoriser les formules personnalisées */}
              <div className="mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-600">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.allowCustomVariants}
                    onChange={(e) => setFormData({ ...formData, allowCustomVariants: e.target.checked })}
                    className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500 focus:ring-offset-slate-900"
                  />
                  <div>
                    <span className="font-medium text-white">Autoriser les formules personnalisées</span>
                    <p className="text-xs text-slate-400 mt-1">
                      Si activé, l&apos;annonceur peut créer ses propres formules en plus des formules par défaut.
                      Si désactivé, il ne peut utiliser que les formules définies ci-dessous.
                    </p>
                  </div>
                </label>
              </div>

              {/* Liste des formules existantes */}
              {formData.defaultVariants.length > 0 && (
                <div className="space-y-2 mb-4">
                  {formData.defaultVariants.map((variant, index) => (
                    <div
                      key={index}
                      className={`flex items-start justify-between p-3 rounded-lg border ${
                        editingVariantIndex === index
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-slate-700 bg-slate-800"
                      }`}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-white">{variant.name}</p>
                        {variant.description && (
                          <p className="text-sm text-slate-400 mt-1">{variant.description}</p>
                        )}
                        {variant.suggestedDuration && (
                          <p className="text-xs text-slate-500 mt-1">
                            Durée suggérée: {variant.suggestedDuration} min
                          </p>
                        )}
                        {variant.includedFeatures && variant.includedFeatures.length > 0 && (
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
                          onClick={() => startEditVariant(index)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
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

              {/* Formulaire d'ajout/modification de formule */}
              <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <p className="text-sm font-medium text-white mb-3">
                  {editingVariantIndex !== null ? "Modifier la formule" : "Nouvelle formule"}
                </p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Nom de la formule *</label>
                    <input
                      type="text"
                      value={variantForm.name}
                      onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                      placeholder="Ex: Garde standard"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Durée suggérée (min)</label>
                    <input
                      type="number"
                      value={variantForm.suggestedDuration || ""}
                      onChange={(e) => setVariantForm({ ...variantForm, suggestedDuration: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="Ex: 60"
                      min="0"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-xs text-slate-400 mb-1">Description</label>
                  <input
                    type="text"
                    value={variantForm.description || ""}
                    onChange={(e) => setVariantForm({ ...variantForm, description: e.target.value })}
                    placeholder="Ex: Garde à domicile avec promenades incluses"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Caractéristiques incluses */}
                <div className="mb-3">
                  <label className="block text-xs text-slate-400 mb-1">Caractéristiques incluses</label>
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
                      placeholder="Ex: Promenade quotidienne"
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                    <button
                      onClick={addFeature}
                      disabled={!newFeature.trim()}
                      className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {variantForm.includedFeatures && variantForm.includedFeatures.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {variantForm.includedFeatures.map((feature, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full"
                        >
                          {feature}
                          <button
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
                  {editingVariantIndex !== null && (
                    <button
                      onClick={() => {
                        setEditingVariantIndex(null);
                        setVariantForm({ name: "", description: "", suggestedDuration: undefined, includedFeatures: [] });
                      }}
                      className="px-3 py-2 text-slate-400 hover:text-white text-sm transition-colors"
                    >
                      Annuler
                    </button>
                  )}
                  <button
                    onClick={() => {
                      console.log("Bouton Ajouter formule cliqué");
                      if (editingVariantIndex !== null) {
                        updateVariant();
                      } else {
                        addVariant();
                      }
                    }}
                    disabled={!variantForm.name.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    {editingVariantIndex !== null ? "Mettre à jour la formule" : "➕ AJOUTER CETTE FORMULE À LA LISTE"}
                  </button>
                </div>
                {!variantForm.name.trim() && (
                  <p className="text-xs text-amber-400 mt-2 text-right">
                    ⚠️ Remplissez le nom de la formule pour pouvoir l&apos;ajouter
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-700 mt-4">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={isAdding ? handleCreate : handleUpdate}
                disabled={!formData.name || (isAdding && !formData.slug) || isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
                {isAdding ? "Créer" : "Enregistrer"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories List */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Catégorie
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Slug
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Image
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Facturation
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Prix conseillé
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Plage
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Nuit
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Prix
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Formules
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {categories?.map((category: {
              id: Id<"serviceCategories">;
              slug: string;
              name: string;
              description?: string;
              icon?: string;
              imageUrl?: string;
              billingType?: string;
              defaultHourlyPrice?: number;
              allowRangeBooking?: boolean;
              allowOvernightStay?: boolean;
              allowedPriceUnits?: string[];
              defaultVariants?: Array<{ name: string; description?: string; suggestedDuration?: number; includedFeatures?: string[] }>;
              allowCustomVariants?: boolean;
              isActive: boolean;
            }) => (
              <motion.tr
                key={category.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hover:bg-slate-700/50 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center text-xl">
                      {category.icon || "📁"}
                    </div>
                    <div>
                      <p className="font-medium text-white">{category.name}</p>
                      {category.description && (
                        <p className="text-sm text-slate-400">{category.description}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <code className="px-2 py-1 bg-slate-900 rounded text-sm text-slate-300">
                    {category.slug}
                  </code>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {category.imageUrl ? (
                      <img
                        src={category.imageUrl}
                        alt={category.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-slate-500" />
                      </div>
                    )}
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, category.id)}
                        className="hidden"
                      />
                      <span className="text-xs text-blue-400 hover:text-blue-300">
                        {uploadingImage === category.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                      </span>
                    </label>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      category.billingType === "hourly"
                        ? "bg-blue-500/20 text-blue-400"
                        : category.billingType === "daily"
                        ? "bg-purple-500/20 text-purple-400"
                        : "bg-orange-500/20 text-orange-400"
                    }`}
                  >
                    {category.billingType === "hourly"
                      ? "⏱️ Horaire"
                      : category.billingType === "daily"
                      ? "📅 Journalier"
                      : "🔄 Flexible"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {category.defaultHourlyPrice ? (
                    <span className="text-green-400 font-medium">
                      {(category.defaultHourlyPrice / 100).toFixed(2).replace(".", ",")} €/h
                    </span>
                  ) : (
                    <span className="text-slate-500 text-sm">Non défini</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {category.allowRangeBooking ? (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-teal-500/20 text-teal-400">
                      Activée
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-600/20 text-slate-400">
                      Désactivée
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {category.allowOvernightStay ? (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-400">
                      Activée
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-600/20 text-slate-400">
                      Désactivée
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {category.allowedPriceUnits && category.allowedPriceUnits.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {category.allowedPriceUnits.map((unit) => (
                        <span
                          key={unit}
                          className="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400"
                        >
                          {unit === "hour" ? "H" : unit === "day" ? "J" : unit === "week" ? "S" : "M"}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-500 text-xs">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    {category.defaultVariants && category.defaultVariants.length > 0 ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 w-fit">
                        {category.defaultVariants.length} formule{category.defaultVariants.length > 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-xs">Aucune</span>
                    )}
                    <span className={`text-xs ${category.allowCustomVariants !== false ? "text-green-400" : "text-orange-400"}`}>
                      {category.allowCustomVariants !== false ? "✓ Perso. autorisé" : "✗ Perso. interdit"}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleToggleActive(category.id, category.isActive)}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      category.isActive
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {category.isActive ? "Actif" : "Inactif"}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => startEdit(category)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}

            {categories?.length === 0 && (
              <tr>
                <td colSpan={11} className="px-6 py-12 text-center">
                  <Tag className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Aucune catégorie</p>
                  <p className="text-sm text-slate-500">
                    Créez votre première catégorie ou utilisez les catégories par défaut
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
