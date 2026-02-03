"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  GripVertical,
  Loader2,
  FolderOpen,
  FileText,
  ThumbsUp,
  ThumbsDown,
  X,
  Save,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

type Tab = "categories" | "articles";

// Category Form Modal
function CategoryModal({
  isOpen,
  category,
  onClose,
  onSave,
  isSaving,
}: {
  isOpen: boolean;
  category?: any;
  onClose: () => void;
  onSave: (data: any) => void;
  isSaving: boolean;
}) {
  const [name, setName] = useState(category?.name || "");
  const [slug, setSlug] = useState(category?.slug || "");
  const [icon, setIcon] = useState(category?.icon || "📚");
  const [targetAudience, setTargetAudience] = useState<"all" | "client" | "annonceur">(
    category?.targetAudience || "all"
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, slug, icon, targetAudience });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">
              {category ? "Modifier la catégorie" : "Nouvelle catégorie"}
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Nom</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="Ex: Paiements"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                required
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="Ex: paiements"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Icône (emoji)</label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 text-2xl text-center"
                maxLength={2}
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Audience</label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">Tous</option>
                <option value="client">Clients uniquement</option>
                <option value="annonceur">Annonceurs uniquement</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                Enregistrer
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function AdminFaqPage() {
  const { token } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<Tab>("categories");
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Queries
  const categoriesData = useQuery(
    api.admin.faq.getAllCategories,
    token ? { sessionToken: token } : "skip"
  );

  const articlesData = useQuery(
    api.admin.faq.getAllArticles,
    token
      ? {
          sessionToken: token,
          categoryId: selectedCategoryId
            ? (selectedCategoryId as Id<"faqCategories">)
            : undefined,
        }
      : "skip"
  );

  const statsData = useQuery(
    api.admin.faq.getFaqStats,
    token ? { sessionToken: token } : "skip"
  );

  // Mutations
  const createCategory = useMutation(api.admin.faq.createCategory);
  const updateCategory = useMutation(api.admin.faq.updateCategory);
  const deleteCategory = useMutation(api.admin.faq.deleteCategory);
  const deleteArticle = useMutation(api.admin.faq.deleteArticle);
  const updateArticle = useMutation(api.admin.faq.updateArticle);

  const categories = categoriesData?.success ? categoriesData.categories : [];
  const articles = articlesData?.success ? articlesData.articles : [];
  const stats = statsData?.success ? statsData.stats : null;

  const handleSaveCategory = async (data: any) => {
    if (!token) return;
    setIsSaving(true);
    try {
      if (editingCategory) {
        await updateCategory({
          sessionToken: token,
          categoryId: editingCategory._id,
          ...data,
        });
      } else {
        await createCategory({
          sessionToken: token,
          ...data,
        });
      }
      setCategoryModalOpen(false);
      setEditingCategory(null);
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!token || !confirm("Supprimer cette catégorie ?")) return;
    try {
      await deleteCategory({
        sessionToken: token,
        categoryId: categoryId as Id<"faqCategories">,
      });
    } catch (error: any) {
      alert(error.message || "Erreur lors de la suppression");
    }
  };

  const handleToggleArticle = async (articleId: string, isActive: boolean) => {
    if (!token) return;
    try {
      await updateArticle({
        sessionToken: token,
        articleId: articleId as Id<"faqArticles">,
        isActive: !isActive,
      });
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  const handleDeleteArticle = async (articleId: string) => {
    if (!token || !confirm("Supprimer cet article ?")) return;
    try {
      await deleteArticle({
        sessionToken: token,
        articleId: articleId as Id<"faqArticles">,
      });
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  const audienceLabels: Record<string, string> = {
    all: "Tous",
    client: "Clients",
    annonceur: "Annonceurs",
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">FAQ</h1>
        <p className="text-slate-400 mt-1">
          Gérez les catégories et articles de la FAQ
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Catégories</p>
            <p className="text-2xl font-bold text-white">
              {stats.activeCategories}/{stats.totalCategories}
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Articles</p>
            <p className="text-2xl font-bold text-white">
              {stats.activeArticles}/{stats.totalArticles}
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Vues totales</p>
            <p className="text-2xl font-bold text-white">{stats.totalViews}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Taux satisfaction</p>
            <p className="text-2xl font-bold text-green-400">
              {stats.helpfulRatio !== null ? `${stats.helpfulRatio}%` : "-"}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("categories")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
            activeTab === "categories"
              ? "bg-blue-500 text-white"
              : "bg-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          <FolderOpen className="w-5 h-5" />
          Catégories
        </button>
        <button
          onClick={() => setActiveTab("articles")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
            activeTab === "articles"
              ? "bg-blue-500 text-white"
              : "bg-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          <FileText className="w-5 h-5" />
          Articles
        </button>
      </div>

      {/* Content */}
      {activeTab === "categories" ? (
        <div className="bg-slate-900 rounded-xl border border-slate-800">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800">
            <h2 className="font-semibold text-white">Catégories FAQ</h2>
            <button
              onClick={() => {
                setEditingCategory(null);
                setCategoryModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nouvelle catégorie
            </button>
          </div>

          {/* List */}
          <div className="divide-y divide-slate-800">
            {categories.map((category: any, index: number) => (
              <motion.div
                key={category._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-4 p-4 hover:bg-slate-800/30"
              >
                <div className="text-slate-500 cursor-grab">
                  <GripVertical className="w-5 h-5" />
                </div>

                <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-2xl">
                  {category.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium">{category.name}</p>
                    {!category.isActive && (
                      <span className="px-2 py-0.5 bg-slate-700 text-slate-400 text-xs rounded">
                        Inactif
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-sm">
                    /{category.slug} • {audienceLabels[category.targetAudience]} •{" "}
                    {category.articleCount} articles • {category.totalViews} vues
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingCategory(category);
                      setCategoryModalOpen(true);
                    }}
                    className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category._id)}
                    className="p-2 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}

            {categories.length === 0 && (
              <div className="text-center py-12">
                <FolderOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Aucune catégorie</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 rounded-xl border border-slate-800">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800">
            <div className="flex items-center gap-4">
              <h2 className="font-semibold text-white">Articles FAQ</h2>
              <select
                value={selectedCategoryId || ""}
                onChange={(e) => setSelectedCategoryId(e.target.value || null)}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">Toutes les catégories</option>
                {categories.map((cat: any) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <Link
              href="/admin/faq/articles/nouveau"
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nouvel article
            </Link>
          </div>

          {/* List */}
          <div className="divide-y divide-slate-800">
            {articles.map((article: any, index: number) => (
              <motion.div
                key={article._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-4 p-4 hover:bg-slate-800/30"
              >
                <div className="text-slate-500 cursor-grab">
                  <GripVertical className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium line-clamp-1">
                      {article.title}
                    </p>
                    {!article.isActive && (
                      <span className="px-2 py-0.5 bg-slate-700 text-slate-400 text-xs rounded">
                        Inactif
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 text-sm">
                    <span>{article.categoryName}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {article.viewCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-3.5 h-3.5 text-green-500" />
                      {article.helpfulCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsDown className="w-3.5 h-3.5 text-red-500" />
                      {article.notHelpfulCount}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleArticle(article._id, article.isActive)}
                    className={`p-2 rounded-lg transition-colors ${
                      article.isActive
                        ? "hover:bg-yellow-500/20 text-green-400 hover:text-yellow-400"
                        : "hover:bg-green-500/20 text-slate-400 hover:text-green-400"
                    }`}
                    title={article.isActive ? "Désactiver" : "Activer"}
                  >
                    {article.isActive ? (
                      <Eye className="w-5 h-5" />
                    ) : (
                      <EyeOff className="w-5 h-5" />
                    )}
                  </button>
                  <Link
                    href={`/admin/faq/articles/${article._id}`}
                    className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                  >
                    <Edit2 className="w-5 h-5" />
                  </Link>
                  <button
                    onClick={() => handleDeleteArticle(article._id)}
                    className="p-2 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}

            {articles.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Aucun article</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Category Modal */}
      <CategoryModal
        isOpen={categoryModalOpen}
        category={editingCategory}
        onClose={() => {
          setCategoryModalOpen(false);
          setEditingCategory(null);
        }}
        onSave={handleSaveCategory}
        isSaving={isSaving}
      />
    </div>
  );
}
