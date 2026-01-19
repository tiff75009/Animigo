"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Loader2,
  Code,
  FileText,
  ChevronDown,
  ChevronUp,
  Copy,
  Sparkles,
  X,
} from "lucide-react";

interface TemplateVariable {
  key: string;
  description: string;
  example?: string;
}

interface EmailTemplate {
  _id?: string;
  slug: string;
  name: string;
  description?: string;
  subject: string;
  htmlContent: string;
  availableVariables: TemplateVariable[];
  isActive: boolean;
  isSystem: boolean;
}

export default function EmailTemplatesPage() {
  const { token } = useAdminAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedHtml, setEditedHtml] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVariables, setShowVariables] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const templates = useQuery(
    api.admin.emailTemplates.getAll,
    token ? { token } : "skip"
  );

  const updateTemplate = useMutation(api.admin.emailTemplates.update);
  const resetTemplate = useMutation(api.admin.emailTemplates.resetToDefault);
  const seedDefaults = useMutation(api.admin.emailTemplates.seedDefaults);

  const currentTemplate = templates?.find((t) => t.slug === selectedTemplate);

  useEffect(() => {
    if (currentTemplate) {
      setEditedSubject(currentTemplate.subject);
      setEditedHtml(currentTemplate.htmlContent);
    }
  }, [currentTemplate]);

  // Sélectionner le premier template par défaut
  useEffect(() => {
    if (templates && templates.length > 0 && !selectedTemplate) {
      setSelectedTemplate(templates[0].slug);
    }
  }, [templates, selectedTemplate]);

  const handleSeedDefaults = async () => {
    if (!token) return;
    setSeeding(true);
    try {
      await seedDefaults({ token });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'initialisation");
    } finally {
      setSeeding(false);
    }
  };

  const handleSave = async () => {
    if (!token || !selectedTemplate) return;

    setSaving(true);
    setError(null);

    try {
      await updateTemplate({
        token,
        slug: selectedTemplate,
        subject: editedSubject,
        htmlContent: editedHtml,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!token || !selectedTemplate) return;

    if (!confirm("Réinitialiser ce template à sa version par défaut ? Les modifications seront perdues.")) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await resetTemplate({ token, slug: selectedTemplate });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la réinitialisation");
    } finally {
      setSaving(false);
    }
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById("html-editor") as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue =
        editedHtml.substring(0, start) +
        `{{${variable}}}` +
        editedHtml.substring(end);
      setEditedHtml(newValue);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length + 4, start + variable.length + 4);
      }, 0);
    }
  };

  const copyVariable = (variable: string) => {
    navigator.clipboard.writeText(`{{${variable}}}`);
  };

  // Générer la preview avec des exemples
  const generatePreview = () => {
    if (!currentTemplate) return "";

    let preview = editedHtml;
    currentTemplate.availableVariables.forEach((v) => {
      const regex = new RegExp(`\\{\\{${v.key}\\}\\}`, "g");
      preview = preview.replace(regex, v.example || `[${v.key}]`);
    });
    return preview;
  };

  if (!templates) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Mail className="w-8 h-8 text-primary" />
            Templates Email
          </h1>
          <p className="text-slate-400 mt-1">
            Personnalisez les emails envoyés par la plateforme
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 rounded-xl border border-slate-800 p-8 text-center"
        >
          <Sparkles className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            Aucun template configuré
          </h2>
          <p className="text-slate-400 mb-6">
            Initialisez les templates par défaut pour commencer à personnaliser vos emails.
          </p>
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
            Initialiser les templates
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
          <Mail className="w-8 h-8 text-primary" />
          Templates Email
        </h1>
        <p className="text-slate-400 mt-1">
          Personnalisez les emails envoyés par la plateforme
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Liste des templates */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800">
              <h2 className="font-semibold text-white">Templates</h2>
            </div>
            <div className="p-2">
              {templates.map((template) => (
                <button
                  key={template.slug}
                  onClick={() => setSelectedTemplate(template.slug)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedTemplate === template.slug
                      ? "bg-primary/20 text-primary"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{template.name}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {template.slug}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Éditeur */}
        <div className="lg:col-span-3">
          {currentTemplate ? (
            <div className="space-y-6">
              {/* Info template */}
              <motion.div
                key={currentTemplate.slug}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900 rounded-xl border border-slate-800 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      {currentTemplate.name}
                    </h2>
                    {currentTemplate.description && (
                      <p className="text-slate-400 text-sm mt-1">
                        {currentTemplate.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowPreview(!showPreview)}
                      className={`p-2 rounded-lg transition-colors ${
                        showPreview
                          ? "bg-primary text-white"
                          : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                      title={showPreview ? "Masquer la preview" : "Afficher la preview"}
                    >
                      {showPreview ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Variables disponibles */}
                <div className="mb-4">
                  <button
                    onClick={() => setShowVariables(!showVariables)}
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    <Code className="w-4 h-4" />
                    Variables disponibles
                    {showVariables ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  <AnimatePresence>
                    {showVariables && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 flex flex-wrap gap-2">
                          {currentTemplate.availableVariables.map((v) => (
                            <div
                              key={v.key}
                              className="group flex items-center gap-1 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700"
                            >
                              <button
                                onClick={() => insertVariable(v.key)}
                                className="text-sm font-mono text-primary hover:text-primary/80"
                                title={`${v.description}${v.example ? ` (ex: ${v.example})` : ""}`}
                              >
                                {`{{${v.key}}}`}
                              </button>
                              <button
                                onClick={() => copyVariable(v.key)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-primary"
                                title="Copier"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Sujet */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Sujet de l&apos;email
                  </label>
                  <input
                    type="text"
                    value={editedSubject}
                    onChange={(e) => setEditedSubject(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary font-mono text-sm"
                    placeholder="Sujet de l'email..."
                  />
                </div>

                {/* Contenu HTML */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Contenu HTML
                  </label>
                  <textarea
                    id="html-editor"
                    value={editedHtml}
                    onChange={(e) => setEditedHtml(e.target.value)}
                    className="w-full h-80 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary font-mono text-sm resize-none"
                    placeholder="Contenu HTML de l'email..."
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
                    onClick={handleSave}
                    disabled={saving}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors ${
                      saved
                        ? "bg-green-500 text-white"
                        : "bg-primary hover:bg-primary/90 text-white"
                    }`}
                  >
                    {saving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : saved ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    {saved ? "Sauvegardé" : "Sauvegarder"}
                  </button>

                  {currentTemplate.isSystem && (
                    <button
                      onClick={handleReset}
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
                    >
                      <RotateCcw className="w-5 h-5" />
                      Réinitialiser
                    </button>
                  )}
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
                    <div className="p-4">
                      <div className="mb-3 p-3 bg-slate-800 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">Sujet :</p>
                        <p className="text-white font-medium">
                          {currentTemplate.availableVariables.reduce(
                            (acc, v) =>
                              acc.replace(
                                new RegExp(`\\{\\{${v.key}\\}\\}`, "g"),
                                v.example || `[${v.key}]`
                              ),
                            editedSubject
                          )}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg overflow-hidden">
                        <iframe
                          srcDoc={generatePreview()}
                          className="w-full h-[500px] border-0"
                          title="Email Preview"
                        />
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
                Sélectionnez un template pour le modifier
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
