"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Save,
  Loader2,
  Eye,
  Trash2,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

export default function AdminEditArticlePage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params.articleId as string;
  const { token } = useAdminAuth();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [targetAudience, setTargetAudience] = useState<"all" | "client" | "annonceur">("all");
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const articleData = useQuery(
    api.admin.faq.getArticle,
    token ? { sessionToken: token, articleId: articleId as Id<"faqArticles"> } : "skip"
  );

  const categoriesData = useQuery(
    api.admin.faq.getAllCategories,
    token ? { sessionToken: token } : "skip"
  );

  const updateArticle = useMutation(api.admin.faq.updateArticle);
  const deleteArticle = useMutation(api.admin.faq.deleteArticle);

  const categories = categoriesData?.success ? categoriesData.categories : [];
  const article = articleData?.success ? articleData.article : null;

  // Load article data
  useEffect(() => {
    if (article && !isLoaded) {
      setTitle(article.title);
      setSlug(article.slug);
      setContent(article.content);
      setCategoryId(article.categoryId);
      setTargetAudience(article.targetAudience);
      setIsActive(article.isActive);
      setIsLoaded(true);
    }
  }, [article, isLoaded]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsSaving(true);
    try {
      await updateArticle({
        sessionToken: token,
        articleId: articleId as Id<"faqArticles">,
        categoryId: categoryId as Id<"faqCategories">,
        title: title.trim(),
        content,
        slug,
        targetAudience,
        isActive,
      });
      router.push("/admin/faq");
    } catch (error: any) {
      alert(error.message || "Erreur lors de la mise à jour");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !confirm("Supprimer cet article ?")) return;

    setIsDeleting(true);
    try {
      await deleteArticle({
        sessionToken: token,
        articleId: articleId as Id<"faqArticles">,
      });
      router.push("/admin/faq");
    } catch (error: any) {
      alert(error.message || "Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
    }
  };

  if (articleData === undefined) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="p-8">
        <div className="text-center py-12 bg-slate-900 rounded-xl border border-slate-800">
          <p className="text-slate-400 mb-4">Article non trouvé</p>
          <Link href="/admin/faq" className="text-blue-400 hover:underline">
            Retour à la FAQ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/faq"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Retour à la FAQ
        </Link>
        <h1 className="text-2xl font-bold text-white">Modifier l'article</h1>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
            <label className="block text-sm text-slate-400 mb-2">
              Titre (question)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-lg focus:outline-none focus:border-blue-500"
              placeholder="Ex: Comment modifier ma réservation ?"
            />
          </div>

          {/* Content */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm text-slate-400">
                Contenu (Markdown supporté)
              </label>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-1.5 px-3 py-1 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <Eye className="w-4 h-4" />
                {showPreview ? "Éditer" : "Aperçu"}
              </button>
            </div>

            {showPreview ? (
              <div className="prose prose-invert prose-sm max-w-none min-h-[300px] p-4 bg-slate-800 rounded-xl">
                {content ? (
                  <div dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, "<br/>") }} />
                ) : (
                  <p className="text-slate-500">Aucun contenu</p>
                )}
              </div>
            ) : (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={15}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 resize-none font-mono text-sm"
              />
            )}
          </div>

          {/* Stats */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
            <h3 className="font-semibold text-white mb-4">Statistiques</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-slate-400 text-sm">Vues</p>
                <p className="text-2xl font-bold text-white">{article.viewCount}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Utile 👍</p>
                <p className="text-2xl font-bold text-green-400">{article.helpfulCount}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Pas utile 👎</p>
                <p className="text-2xl font-bold text-red-400">{article.notHelpfulCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Publish */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
            <h3 className="font-semibold text-white mb-4">Publication</h3>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-white">Article actif (visible)</span>
              </label>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                Enregistrer
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 disabled:opacity-50 text-red-400 rounded-xl font-medium transition-colors"
              >
                {isDeleting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Trash2 className="w-5 h-5" />
                )}
                Supprimer
              </button>
            </div>
          </div>

          {/* Settings */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
            <h3 className="font-semibold text-white mb-4">Paramètres</h3>

            <div className="space-y-4">
              {/* Category */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Catégorie
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  {categories.map((cat: any) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Slug (URL)
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                  required
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
                />
              </div>

              {/* Audience */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Audience
                </label>
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
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
