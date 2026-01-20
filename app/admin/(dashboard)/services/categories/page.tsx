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
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

type BillingType = "hourly" | "daily" | "flexible";

interface CategoryFormData {
  slug: string;
  name: string;
  description: string;
  icon: string;
  billingType: BillingType;
  defaultHourlyPrice: number; // Prix horaire par défaut en euros
}

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
  });

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
    setFormData({ slug: "", name: "", description: "", icon: "", billingType: "hourly", defaultHourlyPrice: 0 });
    setIsAdding(false);
    setEditingId(null);
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
    setFormData({
      slug: category.slug,
      name: category.name,
      description: category.description || "",
      icon: category.icon || "",
      billingType: category.billingType || "hourly",
      defaultHourlyPrice: category.defaultHourlyPrice ? category.defaultHourlyPrice / 100 : 0, // Convertir en euros
    });
    setEditingId(category.id);
    setIsAdding(false);
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

            <div className="flex justify-end gap-3">
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
              isActive: boolean;
            }, index: number) => (
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
                <td colSpan={7} className="px-6 py-12 text-center">
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
