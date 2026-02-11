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
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (label: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  // États pour config expéditeur
  const [emailFrom, setEmailFrom] = useState("noreply@animigo.fr");
  const [emailFromName, setEmailFromName] = useState("Animigo");
  const [savingSender, setSavingSender] = useState(false);
  const [savedSender, setSavedSender] = useState(false);

  const templates = useQuery(
    api.admin.emailTemplates.getAll,
    token ? { token } : "skip"
  );

  const allConfigs = useQuery(
    api.admin.config.getAllConfigs,
    token ? { token } : "skip"
  );

  const updateTemplate = useMutation(api.admin.emailTemplates.update);
  const resetTemplate = useMutation(api.admin.emailTemplates.resetToDefault);
  const seedDefaults = useMutation(api.admin.emailTemplates.seedDefaults);
  const updateConfig = useMutation(api.admin.config.updateConfig);

  // Charger les configs expéditeur
  useEffect(() => {
    if (allConfigs) {
      for (const config of allConfigs) {
        if (config.key === "email_from") setEmailFrom(config.value);
        if (config.key === "email_from_name") setEmailFromName(config.value);
      }
    }
  }, [allConfigs]);

  const handleSaveSender = async () => {
    if (!token) return;
    setSavingSender(true);
    try {
      await updateConfig({ token, key: "email_from", value: emailFrom });
      await updateConfig({ token, key: "email_from_name", value: emailFromName });
      setSavedSender(true);
      setTimeout(() => setSavedSender(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    } finally {
      setSavingSender(false);
    }
  };

  const currentTemplate = templates?.find((t: EmailTemplate) => t.slug === selectedTemplate);

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
    currentTemplate.availableVariables.forEach((v: TemplateVariable) => {
      const regex = new RegExp(`\\{\\{${v.key}\\}\\}`, "g");
      preview = preview.replace(regex, v.example || `[${v.key}]`);
    });
    return preview;
  };

  // Catégories de templates pour la sidebar
  const TEMPLATE_CATEGORIES: { label: string; icon: string; slugs: string[] }[] = [
    {
      label: "Inscription",
      icon: "🔐",
      slugs: ["verification", "verification_reservation", "welcome"],
    },
    {
      label: "Réservations",
      icon: "📅",
      slugs: ["reservation_confirmed", "new_reservation_request", "reservation_accepted"],
    },
    {
      label: "Missions",
      icon: "✅",
      slugs: ["mission_validated_by_client", "mission_auto_validated_announcer", "mission_auto_validated_client"],
    },
    {
      label: "Annulations",
      icon: "❌",
      slugs: [
        "mission_cancelled_by_client",
        "mission_cancelled_by_client_confirmation",
        "mission_auto_refused",
        "mission_auto_expired_client",
        "mission_auto_expired_announcer",
      ],
    },
    {
      label: "Paiements",
      icon: "💳",
      slugs: ["payment_receipt"],
    },
    {
      label: "Réclamations",
      icon: "⚠️",
      slugs: ["dispute_opened"],
    },
  ];

  // Grouper les templates par catégorie
  const categorizedTemplates = TEMPLATE_CATEGORIES.map((cat) => ({
    ...cat,
    templates: (templates || []).filter((t: EmailTemplate) => cat.slugs.includes(t.slug)),
  })).filter((cat) => cat.templates.length > 0);

  // Templates non catégorisés (au cas où)
  const categorizedSlugs = TEMPLATE_CATEGORIES.flatMap((c) => c.slugs);
  const uncategorized = (templates || []).filter(
    (t: EmailTemplate) => !categorizedSlugs.includes(t.slug)
  );

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
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Mail className="w-8 h-8 text-primary" />
            Templates Email
          </h1>
          <p className="text-slate-400 mt-1">
            Personnalisez les emails envoyés par la plateforme
          </p>
        </div>
        <button
          onClick={handleSeedDefaults}
          disabled={seeding}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
        >
          {seeding ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {seeding ? "Synchronisation..." : "Synchroniser les templates"}
        </button>
      </div>

      {/* Config expéditeur */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 p-4 bg-slate-900 border border-slate-800 rounded-xl"
      >
        <div className="flex items-center gap-3 mb-3">
          <Mail className="w-5 h-5 text-green-400" />
          <h3 className="font-semibold text-white text-sm">Configuration expéditeur</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Email expéditeur (From)</label>
            <input
              type="email"
              value={emailFrom}
              onChange={(e) => setEmailFrom(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nom d&apos;expéditeur</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={emailFromName}
                onChange={(e) => setEmailFromName(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-green-500"
              />
              <button
                onClick={handleSaveSender}
                disabled={savingSender}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  savedSender
                    ? "bg-green-500 text-white"
                    : "bg-green-500/20 hover:bg-green-500/30 text-green-400"
                }`}
              >
                {savingSender ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : savedSender ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Liste des templates */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800">
              <h2 className="font-semibold text-white">Templates</h2>
              <p className="text-xs text-slate-500 mt-0.5">{templates.length} template{templates.length > 1 ? "s" : ""}</p>
            </div>
            <div className="p-2 space-y-1">
              {categorizedTemplates.map((category) => {
                const isCollapsed = collapsedCategories.has(category.label);
                return (
                  <div key={category.label}>
                    <button
                      onClick={() => toggleCategory(category.label)}
                      className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-800/50 rounded-lg transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{category.icon}</span>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-slate-400 transition-colors">
                          {category.label}
                        </span>
                        <span className="text-[10px] text-slate-600 font-medium">{category.templates.length}</span>
                      </div>
                      {isCollapsed ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
                      ) : (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
                      )}
                    </button>
                    <AnimatePresence initial={false}>
                      {!isCollapsed && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          {category.templates.map((template: EmailTemplate) => (
                            <button
                              key={template.slug}
                              onClick={() => setSelectedTemplate(template.slug)}
                              className={`w-full text-left p-2.5 pl-4 rounded-lg transition-colors ${
                                selectedTemplate === template.slug
                                  ? "bg-primary/20 text-primary"
                                  : "text-slate-300 hover:bg-slate-800"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                                <p className="text-sm font-medium truncate">{template.name}</p>
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
              {uncategorized.length > 0 && (
                <div>
                  <div className="px-3 py-2 flex items-center gap-2">
                    <span className="text-sm">📄</span>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Autres
                    </span>
                  </div>
                  {uncategorized.map((template: EmailTemplate) => (
                    <button
                      key={template.slug}
                      onClick={() => setSelectedTemplate(template.slug)}
                      className={`w-full text-left p-2.5 pl-4 rounded-lg transition-colors ${
                        selectedTemplate === template.slug
                          ? "bg-primary/20 text-primary"
                          : "text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                        <p className="text-sm font-medium truncate">{template.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
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
                          {currentTemplate.availableVariables.map((v: TemplateVariable) => (
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
                            (acc: string, v: TemplateVariable) =>
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
