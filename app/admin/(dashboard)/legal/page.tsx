"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Save,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Loader2,
  Sparkles,
  X,
  Upload,
  BookOpen,
  Shield,
  ScrollText,
  Ban,
  Clock,
  CheckCircle2,
} from "lucide-react";

interface LegalPage {
  _id: string;
  slug: string;
  title: string;
  content: string;
  version: number;
  status: "draft" | "published";
  lastModifiedBy?: string;
  createdAt: number;
  updatedAt: number;
  publishedAt?: number;
}

// Icons pour chaque type de page
const PAGE_ICONS: Record<string, React.ElementType> = {
  cgv: ScrollText,
  cgu: BookOpen,
  privacy: Shield,
  cancellation: Ban,
};

// Descriptions pour chaque type de page
const PAGE_DESCRIPTIONS: Record<string, string> = {
  cgv: "Termes de vente et paiement",
  cgu: "Règles d'utilisation de la plateforme",
  privacy: "Traitement des données personnelles",
  cancellation: "Politique d'annulation et remboursement",
};

export default function LegalPagesPage() {
  const { token } = useAdminAuth();
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const legalPages = useQuery(
    api.admin.legalPages.listLegalPages,
    token ? { token } : "skip"
  );

  const saveDraft = useMutation(api.admin.legalPages.saveDraft);
  const publishPage = useMutation(api.admin.legalPages.publishLegalPage);
  const seedDefaults = useMutation(api.admin.legalPages.seedDefaultPages);

  const currentPage = legalPages?.find((p: LegalPage) => p.slug === selectedPage);

  useEffect(() => {
    if (currentPage) {
      setEditedTitle(currentPage.title);
      setEditedContent(currentPage.content);
    }
  }, [currentPage]);

  // Sélectionner la première page par défaut
  useEffect(() => {
    if (legalPages && legalPages.length > 0 && !selectedPage) {
      setSelectedPage(legalPages[0].slug);
    }
  }, [legalPages, selectedPage]);

  const handleSeedDefaults = async () => {
    if (!token) return;
    setSeeding(true);
    setError(null);
    try {
      await seedDefaults({ token });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'initialisation");
    } finally {
      setSeeding(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!token || !selectedPage) return;

    setSaving(true);
    setError(null);

    try {
      await saveDraft({
        token,
        slug: selectedPage,
        title: editedTitle,
        content: editedContent,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!token || !selectedPage) return;

    // Sauvegarder d'abord
    setPublishing(true);
    setError(null);

    try {
      // Sauvegarder le contenu
      await saveDraft({
        token,
        slug: selectedPage,
        title: editedTitle,
        content: editedContent,
      });

      // Puis publier
      await publishPage({ token, slug: selectedPage });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la publication");
    } finally {
      setPublishing(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!legalPages) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (legalPages.length === 0) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            Pages légales
          </h1>
          <p className="text-slate-400 mt-1">
            Gérez les pages légales de la plateforme (CGV, CGU, Confidentialité, Annulation)
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 rounded-xl border border-slate-800 p-8 text-center"
        >
          <Sparkles className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            Aucune page légale configurée
          </h2>
          <p className="text-slate-400 mb-6">
            Initialisez les pages légales par défaut pour commencer à les personnaliser.
          </p>
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 justify-center">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
          <button
            onClick={handleSeedDefaults}
            disabled={seeding}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {seeding ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
            Initialiser les pages légales
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <FileText className="w-8 h-8 text-primary" />
          Pages légales
        </h1>
        <p className="text-slate-400 mt-1">
          Gérez les pages légales de la plateforme (CGV, CGU, Confidentialité, Annulation)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Liste des pages */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800">
              <h2 className="font-semibold text-white">Documents</h2>
            </div>
            <div className="p-2">
              {legalPages.map((page: LegalPage) => {
                const PageIcon = PAGE_ICONS[page.slug] || FileText;
                const isSelected = selectedPage === page.slug;

                return (
                  <button
                    key={page.slug}
                    onClick={() => setSelectedPage(page.slug)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      isSelected
                        ? "bg-primary/20 text-primary"
                        : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <PageIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{page.title}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {PAGE_DESCRIPTIONS[page.slug]}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          {page.status === "published" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                              <CheckCircle2 className="w-3 h-3" />
                              Publié
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                              <Clock className="w-3 h-3" />
                              Brouillon
                            </span>
                          )}
                          <span className="text-xs text-slate-500">v{page.version}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Éditeur */}
        <div className="lg:col-span-3">
          {currentPage ? (
            <div className="space-y-6">
              {/* Info page */}
              <motion.div
                key={currentPage.slug}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900 rounded-xl border border-slate-800 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-semibold text-white">
                        {currentPage.title}
                      </h2>
                      {currentPage.status === "published" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Publié
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                          <Clock className="w-3 h-3" />
                          Brouillon
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm">
                      {PAGE_DESCRIPTIONS[currentPage.slug]}
                    </p>
                    <p className="text-slate-500 text-xs mt-1">
                      Version {currentPage.version} - Dernière modification : {formatDate(currentPage.updatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowPreview(!showPreview)}
                      className={`p-2 rounded-lg transition-colors ${
                        showPreview
                          ? "bg-primary text-white"
                          : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                      title={showPreview ? "Masquer l'aperçu" : "Afficher l'aperçu"}
                    >
                      {showPreview ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Titre */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Titre de la page
                  </label>
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary"
                    placeholder="Titre de la page..."
                  />
                </div>

                {/* Contenu HTML */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Contenu HTML
                  </label>
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full h-96 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary font-mono text-sm resize-none"
                    placeholder="Contenu HTML de la page..."
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-6 flex items-center gap-3">
                  <button
                    onClick={handleSaveDraft}
                    disabled={saving || publishing}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors ${
                      saved && !publishing
                        ? "bg-green-500 text-white"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                    }`}
                  >
                    {saving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : saved && !publishing ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    {saved && !publishing ? "Sauvegardé" : "Enregistrer brouillon"}
                  </button>

                  <button
                    onClick={handlePublish}
                    disabled={saving || publishing}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors ${
                      saved && publishing
                        ? "bg-green-500 text-white"
                        : "bg-primary hover:bg-primary/90 text-white"
                    }`}
                  >
                    {publishing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : saved ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Upload className="w-5 h-5" />
                    )}
                    {saved ? "Publié" : "Publier"}
                  </button>
                </div>
              </motion.div>

              {/* Preview */}
              <AnimatePresence>
                {showPreview && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden"
                  >
                    <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                      <h3 className="font-semibold text-white flex items-center gap-2">
                        <Eye className="w-5 h-5 text-primary" />
                        Aperçu
                      </h3>
                      <button
                        onClick={() => setShowPreview(false)}
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="p-6">
                      <div className="bg-white rounded-lg p-8 prose prose-slate max-w-none">
                        <div dangerouslySetInnerHTML={{ __html: editedContent }} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-8 text-center">
              <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">
                Sélectionnez une page légale pour la modifier
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
