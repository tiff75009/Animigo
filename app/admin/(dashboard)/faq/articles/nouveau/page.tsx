"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Save,
  Loader2,
  Eye,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

export default function AdminNewArticlePage() {
  const router = useRouter();
  const { token } = useAdminAuth();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [targetAudience, setTargetAudience] = useState<"all" | "client" | "annonceur">("all");
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const categoriesData = useQuery(
    api.admin.faq.getAllCategories,
    token ? { sessionToken: token } : "skip"
  );

  const createArticle = useMutation(api.admin.faq.createArticle);

  const categories = categoriesData?.success ? categoriesData.categories : [];

  const handleTitleChange = (value: string) => {
    setTitle(value);
    // Auto-generate slug
    const newSlug = value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);
    setSlug(newSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !categoryId) return;

    setIsSaving(true);
    try {
      await createArticle({
        sessionToken: token,
        categoryId: categoryId as Id<"faqCategories">,
        title: title.trim(),
        content,
        slug,
        targetAudience,
      });
      router.push("/admin/faq");
    } catch (error: any) {
      alert(error.message || "Erreur lors de la création");
    } finally {
      setIsSaving(false);
    }
  };

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
        <h1 className="text-2xl font-bold text-white">Nouvel article FAQ</h1>
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
              onChange={(e) => handleTitleChange(e.target.value)}
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
                placeholder="Rédigez votre réponse ici...

## Sous-titre

Vous pouvez utiliser le **markdown** pour formater votre texte.

- Point 1
- Point 2

> Citation importante"
              />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Publish */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
            <h3 className="font-semibold text-white mb-4">Publication</h3>

            <button
              type="submit"
              disabled={isSaving || !categoryId}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Publier l'article
            </button>
          </div>

          {/* Settings */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
            <h3 className="font-semibold text-white mb-4">Paramètres</h3>

            <div className="space-y-4">
              {/* Category */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Catégorie *
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Sélectionner...</option>
                  {categories.map((cat: any) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.icon} {cat.name}
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

          {/* Help */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-800 p-4">
            <h4 className="font-medium text-white mb-2">Conseils</h4>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• Utilisez un titre clair sous forme de question</li>
              <li>• Structurez votre réponse avec des sous-titres</li>
              <li>• Gardez les paragraphes courts et concis</li>
              <li>• Utilisez des listes pour les étapes</li>
            </ul>
          </div>
        </div>
      </form>
    </div>
  );
}
