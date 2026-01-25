"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { useCloudinary } from "@/app/hooks/useCloudinary";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  Check,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Upload,
  ImageIcon,
  Link2,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import Image from "next/image";

interface Feature {
  icon?: string;
  title: string;
  description?: string;
}

interface DescriptionCard {
  title: string;
  content: string;
  icon?: string;
}

interface ServicePageFormData {
  slug: string;
  serviceCategoryId: string;
  title: string;
  subtitle: string;
  description: string;
  heroImageUrl: string;
  thumbnailUrl: string;
  ctaPrimaryText: string;
  ctaSecondaryText: string;
  features: Feature[];
  descriptionCards: DescriptionCard[];
  metaTitle: string;
  metaDescription: string;
}

const defaultFormData: ServicePageFormData = {
  slug: "",
  serviceCategoryId: "",
  title: "",
  subtitle: "",
  description: "",
  heroImageUrl: "",
  thumbnailUrl: "",
  ctaPrimaryText: "Trouver un prestataire",
  ctaSecondaryText: "Devenir prestataire",
  features: [{ icon: "", title: "", description: "" }],
  descriptionCards: [
    { title: "", content: "", icon: "" },
    { title: "", content: "", icon: "" },
    { title: "", content: "", icon: "" },
  ],
  metaTitle: "",
  metaDescription: "",
};

// Helper pour générer l'URL du CTA (même logique que le backend)
function generateCtaUrl(categorySlug: string): string {
  if (categorySlug === "garde") {
    return "/recherche?mode=garde";
  }
  return `/recherche?mode=services&category=${categorySlug}`;
}

export default function SeoServicesPage() {
  const { token } = useAdminAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<Id<"seoServicePages"> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<Id<"seoServicePages"> | null>(null);
  const [formData, setFormData] = useState<ServicePageFormData>(defaultFormData);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  // Cloudinary hook
  const { uploadImage, uploadState, isConfigured, getOptimizedUrl } = useCloudinary();

  // Queries
  const pages = useQuery(
    api.seo.servicePages.adminList,
    token ? { token } : "skip"
  );

  // Liste des catégories pour le dropdown
  const categoriesData = useQuery(api.admin.serviceCategories.getActiveCategories, {});

  // Mutations
  const createPage = useMutation(api.seo.servicePages.create);
  const updatePage = useMutation(api.seo.servicePages.update);
  const deletePage = useMutation(api.seo.servicePages.delete_);
  const toggleActive = useMutation(api.seo.servicePages.toggleActive);
  const reorderPages = useMutation(api.seo.servicePages.reorder);

  // Aplatir toutes les sous-catégories (les vrais services: garde, toilettage, etc.)
  interface CategoryOption {
    id: string;
    slug: string;
    name: string;
    icon?: string;
    color?: string;
    parentName?: string;
  }

  const allCategories: CategoryOption[] = [];

  // Extraire les sous-catégories de chaque catégorie parente
  if (categoriesData?.parentCategories) {
    for (const parent of categoriesData.parentCategories) {
      // Ajouter la catégorie parente elle-même si elle n'a pas de sous-catégories
      if (!parent.subcategories || parent.subcategories.length === 0) {
        allCategories.push({
          id: parent.id,
          slug: parent.slug,
          name: parent.name,
          icon: parent.icon,
          color: parent.color,
        });
      }
      // Ajouter les sous-catégories
      if (parent.subcategories) {
        for (const sub of parent.subcategories) {
          allCategories.push({
            id: sub.id,
            slug: sub.slug,
            name: sub.name,
            icon: sub.icon || parent.icon,
            color: sub.color || parent.color,
            parentName: parent.name,
          });
        }
      }
    }
  }

  // Ajouter les catégories orphelines (rootCategories)
  if (categoriesData?.rootCategories) {
    for (const cat of categoriesData.rootCategories) {
      allCategories.push({
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
      });
    }
  }

  // Trouver la catégorie sélectionnée pour afficher l'URL preview
  const selectedCategory = allCategories.find(
    (cat) => cat.id === formData.serviceCategoryId
  );
  const previewCtaUrl = selectedCategory
    ? generateCtaUrl(selectedCategory.slug)
    : "/recherche";

  const resetForm = () => {
    setFormData(defaultFormData);
    setIsAdding(false);
    setEditingId(null);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const url = await uploadImage(file, "animigo/seo");
    if (url) {
      // Appliquer la transformation Cloudinary pour 450x300 avec crop fill
      const optimizedUrl = getOptimizedUrl(url, 450, 300);
      setFormData({ ...formData, heroImageUrl: optimizedUrl });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleThumbnailUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const url = await uploadImage(file, "animigo/seo/thumbnails");
    if (url) {
      // Garder l'URL originale sans transformation supplémentaire
      // L'image est déjà optimisée à 1200x1200 max lors de l'upload
      setFormData({ ...formData, thumbnailUrl: url });
    }

    // Reset input
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!token || !formData.slug.trim() || !formData.title.trim()) return;

    setIsSaving(true);
    try {
      const data = {
        token,
        slug: formData.slug.trim(),
        serviceCategoryId: formData.serviceCategoryId
          ? (formData.serviceCategoryId as Id<"serviceCategories">)
          : undefined,
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim() || undefined,
        description: formData.description.trim(),
        heroImageUrl: formData.heroImageUrl.trim() || undefined,
        thumbnailUrl: formData.thumbnailUrl.trim() || undefined,
        ctaPrimaryText: formData.ctaPrimaryText.trim() || undefined,
        ctaSecondaryText: formData.ctaSecondaryText.trim() || undefined,
        features: formData.features.filter((f) => f.title.trim()),
        descriptionCards: formData.descriptionCards.filter((c) => c.title.trim() && c.content.trim()),
        metaTitle: formData.metaTitle.trim(),
        metaDescription: formData.metaDescription.trim(),
      };

      if (editingId) {
        await updatePage({ ...data, pageId: editingId });
      } else {
        await createPage(data);
      }
      resetForm();
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (page: NonNullable<typeof pages>[0]) => {
    setFormData({
      slug: page.slug,
      serviceCategoryId: page.serviceCategoryId || "",
      title: page.title,
      subtitle: page.subtitle || "",
      description: page.description,
      heroImageUrl: page.heroImageUrl || "",
      thumbnailUrl: page.thumbnailUrl || "",
      ctaPrimaryText: page.ctaPrimaryText || "Trouver un prestataire",
      ctaSecondaryText: page.ctaSecondaryText || "Devenir prestataire",
      features: page.features.length > 0 ? page.features : [{ icon: "", title: "", description: "" }],
      descriptionCards: page.descriptionCards.length > 0
        ? page.descriptionCards
        : [
            { title: "", content: "", icon: "" },
            { title: "", content: "", icon: "" },
            { title: "", content: "", icon: "" },
          ],
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
    });
    setEditingId(page.id);
    setIsAdding(true);
  };

  const handleDelete = async (pageId: Id<"seoServicePages">) => {
    if (!token) return;
    setDeletingId(pageId);
    try {
      await deletePage({ token, pageId });
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (pageId: Id<"seoServicePages">) => {
    if (!token) return;
    try {
      await toggleActive({ token, pageId });
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    if (!token || !pages) return;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= pages.length) return;

    const newOrder = [...pages];
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];

    try {
      await reorderPages({
        token,
        pageIds: newOrder.map((p) => p.id),
      });
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  const addFeature = () => {
    setFormData({
      ...formData,
      features: [...formData.features, { icon: "", title: "", description: "" }],
    });
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index),
    });
  };

  const updateFeature = (index: number, field: keyof Feature, value: string) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = { ...newFeatures[index], [field]: value };
    setFormData({ ...formData, features: newFeatures });
  };

  const updateDescriptionCard = (index: number, field: keyof DescriptionCard, value: string) => {
    const newCards = [...formData.descriptionCards];
    newCards[index] = { ...newCards[index], [field]: value };
    setFormData({ ...formData, descriptionCards: newCards });
  };

  if (!pages) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-500" />
            Pages SEO Services
          </h1>
          <p className="text-slate-400 mt-1">
            Gerez les pages de presentation des services pour le referencement
          </p>
        </div>
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
          Nouvelle page
        </motion.button>
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {(isAdding || editingId) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-slate-800 rounded-xl p-6 mb-6 border border-slate-700 max-h-[70vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-white">
                {editingId ? "Modifier la page" : "Nouvelle page service"}
              </h2>
              <button
                onClick={resetForm}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Identifiant et Categorie */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Slug (URL) *
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                  placeholder="garde-animaux"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">/services/{formData.slug || "..."}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Categorie liee
                </label>
                <select
                  value={formData.serviceCategoryId}
                  onChange={(e) => setFormData({ ...formData, serviceCategoryId: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="">Aucune categorie</option>
                  {allCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name} {cat.parentName ? `(${cat.parentName})` : ""}
                    </option>
                  ))}
                </select>
                {selectedCategory && (
                  <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                    <Link2 className="w-3 h-3" />
                    CTA: {previewCtaUrl}
                  </p>
                )}
              </div>
            </div>

            {/* Contenu principal */}
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Titre *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Garde d'animaux de confiance"
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Sous-titre
                  </label>
                  <input
                    type="text"
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    placeholder="Trouvez le gardien ideal pour votre compagnon"
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Description courte *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description pour le SEO..."
                  rows={2}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              {/* Image Hero avec Upload Cloudinary (450x300) */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Image hero <span className="text-slate-500 font-normal">(450 x 300 px)</span>
                </label>
                <div className="border-2 border-dashed border-slate-600 rounded-xl overflow-hidden" style={{ maxWidth: 450 }}>
                  {formData.heroImageUrl ? (
                    <div className="relative" style={{ aspectRatio: "450/300" }}>
                      <Image
                        src={formData.heroImageUrl}
                        alt="Hero preview"
                        width={450}
                        height={300}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          Changer
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, heroImageUrl: "" })}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center cursor-pointer hover:bg-slate-700/30 transition-colors" style={{ aspectRatio: "450/300" }}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={!isConfigured || uploadState.isUploading}
                      />
                      {uploadState.isUploading ? (
                        <>
                          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-2" />
                          <span className="text-sm text-slate-400">Upload en cours...</span>
                        </>
                      ) : !isConfigured ? (
                        <>
                          <AlertCircle className="w-10 h-10 text-amber-500 mb-2" />
                          <span className="text-sm text-amber-400">Cloudinary non configure</span>
                          <span className="text-xs text-slate-500 mt-1">Configurez Cloudinary dans les parametres</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-10 h-10 text-slate-500 mb-2" />
                          <span className="text-sm text-slate-400">Cliquez pour uploader une image</span>
                          <span className="text-xs text-slate-500 mt-1">JPG, PNG, WebP - Redimensionne a 450x300</span>
                        </>
                      )}
                    </label>
                  )}
                </div>
                {uploadState.error && (
                  <p className="text-sm text-red-400 mt-2">{uploadState.error}</p>
                )}
                {/* Hidden file input for change button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {/* Miniature avec Upload Cloudinary (300x200) */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Miniature (homepage) <span className="text-slate-500 font-normal">(300 x 200 px)</span>
                </label>
                <div className="border-2 border-dashed border-slate-600 rounded-xl overflow-hidden" style={{ maxWidth: 300 }}>
                  {formData.thumbnailUrl ? (
                    <div className="relative" style={{ aspectRatio: "300/200" }}>
                      <Image
                        src={formData.thumbnailUrl}
                        alt="Thumbnail preview"
                        width={300}
                        height={200}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => thumbnailInputRef.current?.click()}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                        >
                          <Upload className="w-4 h-4" />
                          Changer
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, thumbnailUrl: "" })}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center cursor-pointer hover:bg-slate-700/30 transition-colors py-6" style={{ aspectRatio: "300/200" }}>
                      <input
                        ref={thumbnailInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailUpload}
                        className="hidden"
                        disabled={!isConfigured || uploadState.isUploading}
                      />
                      {uploadState.isUploading ? (
                        <>
                          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                          <span className="text-sm text-slate-400">Upload en cours...</span>
                        </>
                      ) : !isConfigured ? (
                        <>
                          <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
                          <span className="text-xs text-amber-400">Cloudinary non configure</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-8 h-8 text-slate-500 mb-2" />
                          <span className="text-sm text-slate-400">Cliquez pour uploader</span>
                          <span className="text-xs text-slate-500 mt-1">300x200 - Pour l&apos;accueil</span>
                        </>
                      )}
                    </label>
                  )}
                </div>
                {/* Hidden file input for change button */}
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* CTAs */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  CTA Primaire - Texte
                </label>
                <input
                  type="text"
                  value={formData.ctaPrimaryText}
                  onChange={(e) => setFormData({ ...formData, ctaPrimaryText: e.target.value })}
                  placeholder="Trouver un prestataire"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">
                  URL generee: <code className="text-green-400">{previewCtaUrl}</code>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  CTA Secondaire - Texte
                </label>
                <input
                  type="text"
                  value={formData.ctaSecondaryText}
                  onChange={(e) => setFormData({ ...formData, ctaSecondaryText: e.target.value })}
                  placeholder="Devenir prestataire"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">
                  URL: <code className="text-green-400">/inscription</code>
                </p>
              </div>
            </div>

            {/* Features */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-300">
                  Caracteristiques
                </label>
                <button
                  type="button"
                  onClick={addFeature}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  + Ajouter
                </button>
              </div>
              <div className="space-y-2">
                {formData.features.map((feature, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={feature.icon || ""}
                      onChange={(e) => updateFeature(index, "icon", e.target.value)}
                      placeholder="Icon"
                      className="w-16 px-2 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-center focus:border-blue-500 outline-none"
                    />
                    <input
                      type="text"
                      value={feature.title}
                      onChange={(e) => updateFeature(index, "title", e.target.value)}
                      placeholder="Titre"
                      className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none"
                    />
                    <input
                      type="text"
                      value={feature.description || ""}
                      onChange={(e) => updateFeature(index, "description", e.target.value)}
                      placeholder="Description"
                      className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeFeature(index)}
                      className="p-2 text-slate-500 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Description Cards */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                3 Cartes de description
              </label>
              <div className="grid grid-cols-3 gap-4">
                {formData.descriptionCards.map((card, index) => (
                  <div key={index} className="space-y-2">
                    <input
                      type="text"
                      value={card.icon || ""}
                      onChange={(e) => updateDescriptionCard(index, "icon", e.target.value)}
                      placeholder="Icon"
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-center focus:border-blue-500 outline-none"
                    />
                    <input
                      type="text"
                      value={card.title}
                      onChange={(e) => updateDescriptionCard(index, "title", e.target.value)}
                      placeholder="Titre"
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none"
                    />
                    <textarea
                      value={card.content}
                      onChange={(e) => updateDescriptionCard(index, "content", e.target.value)}
                      placeholder="Contenu"
                      rows={3}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* SEO */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Meta Title *
                </label>
                <input
                  type="text"
                  value={formData.metaTitle}
                  onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                  placeholder="Garde d'animaux | Animigo"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Meta Description *
                </label>
                <input
                  type="text"
                  value={formData.metaDescription}
                  onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                  placeholder="Trouvez un gardien de confiance..."
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <motion.button
                onClick={handleSubmit}
                disabled={isSaving || !formData.slug.trim() || !formData.title.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
                {editingId ? "Enregistrer" : "Creer"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pages List */}
      {pages.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-12 text-center border border-slate-700">
          <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Aucune page service</h3>
          <p className="text-slate-400 mb-4">
            Creez des pages SEO pour presenter vos services.
          </p>
          <motion.button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-5 h-5" />
            Creer une page
          </motion.button>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 p-4 border-b border-slate-700 bg-slate-900/50">
            <p className="text-sm font-medium text-slate-400">Page</p>
            <p className="text-sm font-medium text-slate-400">Categorie / URL</p>
            <p className="text-sm font-medium text-slate-400 w-24 text-center">Pages villes</p>
            <p className="text-sm font-medium text-slate-400 w-20 text-center">Statut</p>
            <p className="text-sm font-medium text-slate-400 w-32 text-center">Actions</p>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-slate-700">
            {pages.map((page: NonNullable<typeof pages>[0], index: number) => (
              <motion.div
                key={page.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 p-4 items-center transition-colors ${
                  page.isActive ? "bg-slate-800" : "bg-slate-800/50"
                }`}
              >
                {/* Title */}
                <div>
                  <span className={`font-medium ${page.isActive ? "text-white" : "text-slate-500"}`}>
                    {page.title}
                  </span>
                  {page.subtitle && (
                    <p className="text-xs text-slate-500 truncate">{page.subtitle}</p>
                  )}
                </div>

                {/* Category / URL */}
                <div className="space-y-1">
                  {page.category && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded font-medium"
                      style={{
                        backgroundColor: page.category.color ? `${page.category.color}20` : "rgba(59, 130, 246, 0.2)",
                        color: page.category.color || "#3b82f6",
                        border: `1px solid ${page.category.color || "#3b82f6"}40`,
                      }}
                    >
                      {page.category.icon} {page.category.name}
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">/services/{page.slug}</span>
                    <a
                      href={`/services/${page.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-500 hover:text-blue-400"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* City pages count */}
                <div className="w-24 text-center">
                  <span className="px-2 py-1 text-sm bg-slate-700 text-slate-300 rounded">
                    {page.activeCityPagesCount}/{page.cityPagesCount}
                  </span>
                </div>

                {/* Status */}
                <div className="w-20 text-center">
                  {page.isActive ? (
                    <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded">
                      Actif
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs bg-slate-700 text-slate-400 rounded">
                      Inactif
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 w-32 justify-end">
                  {/* Move Up */}
                  <button
                    onClick={() => handleMove(index, "up")}
                    disabled={index === 0}
                    className="p-2 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Monter"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>

                  {/* Move Down */}
                  <button
                    onClick={() => handleMove(index, "down")}
                    disabled={index === pages.length - 1}
                    className="p-2 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Descendre"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Toggle Active */}
                  <button
                    onClick={() => handleToggleActive(page.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      page.isActive
                        ? "text-green-500 hover:bg-green-500/10"
                        : "text-slate-500 hover:bg-slate-700"
                    }`}
                    title={page.isActive ? "Desactiver" : "Activer"}
                  >
                    {page.isActive ? (
                      <ToggleRight className="w-5 h-5" />
                    ) : (
                      <ToggleLeft className="w-5 h-5" />
                    )}
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => handleEdit(page)}
                    className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg"
                    title="Modifier"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => {
                      if (confirm(`Supprimer "${page.title}" et ses ${page.cityPagesCount} pages ville ?`)) {
                        handleDelete(page.id);
                      }
                    }}
                    disabled={deletingId === page.id}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg disabled:opacity-50"
                    title="Supprimer"
                  >
                    {deletingId === page.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="flex items-start gap-3 p-4 bg-blue-500/10 rounded-xl mt-6 border border-blue-500/20">
        <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-300">
          <p className="font-medium">Pages SEO Services</p>
          <p className="mt-1 text-blue-400">
            Ces pages presentent vos services pour le referencement. Les URLs de CTA sont generees
            automatiquement en fonction de la categorie selectionnee. Chaque page peut etre declinee
            pour plusieurs villes afin d&apos;ameliorer le SEO local.
          </p>
        </div>
      </div>
    </div>
  );
}
