"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, CheckCircle2, AlertTriangle, XCircle, Search,
  FileText, MapPin, Share2, Code, Image, Link2,
  ChevronDown, ChevronRight, Loader2, Save, RotateCcw,
  Eye, Settings, Sparkles, BarChart3, Shield,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";

// ============================================
// Types
// ============================================

type Priority = "critical" | "high" | "medium" | "low";
type CheckStatus = "passed" | "warning" | "failed";

interface SeoCheck {
  id: string;
  label: string;
  description: string;
  priority: Priority;
  category: string;
  check: (data: AuditData) => CheckStatus;
  points: number;
}

interface AuditData {
  pageConfigs: any[];
  totalServicePages: number;
  activeServicePages: number;
  totalCities: number;
  activeCities: number;
  totalCityPages: number;
  activeCityPages: number;
  servicePagesWithMeta: number;
  hasRobotsTxt: boolean;
  hasSitemap: boolean;
}

// ============================================
// SEO Checklist Definition
// ============================================

const seoChecks: SeoCheck[] = [
  // Critical (red)
  {
    id: "robots_txt",
    label: "Fichier robots.txt configuré",
    description: "Le fichier robots.txt indique aux moteurs de recherche quelles pages crawler.",
    priority: "critical",
    category: "technique",
    points: 10,
    check: (d) => d.hasRobotsTxt ? "passed" : "failed",
  },
  {
    id: "sitemap_xml",
    label: "Sitemap XML généré dynamiquement",
    description: "Le sitemap aide Google à découvrir toutes les pages du site.",
    priority: "critical",
    category: "technique",
    points: 10,
    check: (d) => d.hasSitemap ? "passed" : "failed",
  },
  {
    id: "home_meta",
    label: "Meta title et description sur la page d'accueil",
    description: "La page d'accueil doit avoir un titre et une description optimisés.",
    priority: "critical",
    category: "meta",
    points: 8,
    check: (d) => {
      const home = d.pageConfigs.find((p: any) => p.pageKey === "home");
      return home?.metaTitle && home?.metaDescription ? "passed" : "failed";
    },
  },
  {
    id: "announcer_meta",
    label: "Template meta pour les profils annonceurs",
    description: "Les profils annonceurs doivent avoir des meta dynamiques (nom, service, ville).",
    priority: "critical",
    category: "meta",
    points: 8,
    check: (d) => {
      const p = d.pageConfigs.find((p: any) => p.pageKey === "annonceur_profile");
      return p?.metaTitle && p?.metaDescription ? "passed" : "failed";
    },
  },
  {
    id: "og_tags_home",
    label: "Open Graph configuré pour la page d'accueil",
    description: "Les balises OG permettent un affichage riche lors du partage sur les réseaux sociaux.",
    priority: "critical",
    category: "social",
    points: 7,
    check: (d) => {
      const home = d.pageConfigs.find((p: any) => p.pageKey === "home");
      return home?.ogTitle && home?.ogDescription ? "passed" : home?.ogTitle || home?.ogDescription ? "warning" : "failed";
    },
  },

  // High (orange)
  {
    id: "service_pages_meta",
    label: "Meta configurés sur toutes les pages services",
    description: "Chaque page service doit avoir un title et une description uniques.",
    priority: "high",
    category: "meta",
    points: 7,
    check: (d) => {
      if (d.activeServicePages === 0) return "warning";
      return d.servicePagesWithMeta >= d.activeServicePages ? "passed" : d.servicePagesWithMeta > 0 ? "warning" : "failed";
    },
  },
  {
    id: "service_page_template",
    label: "Template meta pour les pages services",
    description: "Un template par défaut pour les meta des pages services.",
    priority: "high",
    category: "meta",
    points: 5,
    check: (d) => {
      const p = d.pageConfigs.find((p: any) => p.pageKey === "service_page");
      return p?.metaTitle ? "passed" : "failed";
    },
  },
  {
    id: "city_pages_exist",
    label: "Pages service + ville créées",
    description: "Les pages géolocalisées améliorent le référencement local (garde animaux Paris, etc.).",
    priority: "high",
    category: "contenu",
    points: 6,
    check: (d) => d.activeCityPages > 10 ? "passed" : d.activeCityPages > 0 ? "warning" : "failed",
  },
  {
    id: "cities_configured",
    label: "Villes principales configurées",
    description: "Au moins 10 grandes villes doivent être configurées pour le SEO local.",
    priority: "high",
    category: "contenu",
    points: 5,
    check: (d) => d.activeCities >= 10 ? "passed" : d.activeCities >= 5 ? "warning" : "failed",
  },
  {
    id: "og_announcer",
    label: "Open Graph pour les profils annonceurs",
    description: "Quand un annonceur partage son profil, l'aperçu doit montrer son nom et sa photo.",
    priority: "high",
    category: "social",
    points: 5,
    check: (d) => {
      const p = d.pageConfigs.find((p: any) => p.pageKey === "annonceur_profile");
      return p?.ogTitle && p?.ogDescription ? "passed" : "failed";
    },
  },
  {
    id: "twitter_cards",
    label: "Twitter Cards configurées",
    description: "Les Twitter Cards améliorent l'aperçu des liens partagés sur X/Twitter.",
    priority: "high",
    category: "social",
    points: 4,
    check: (d) => {
      const withTwitter = d.pageConfigs.filter((p: any) => p.twitterCard);
      return withTwitter.length >= 3 ? "passed" : withTwitter.length > 0 ? "warning" : "failed";
    },
  },

  // Medium (green/yellow)
  {
    id: "structured_data",
    label: "Données structurées (Schema.org) configurées",
    description: "Les données structurées permettent les rich snippets dans Google (étoiles, prix, etc.).",
    priority: "medium",
    category: "technique",
    points: 5,
    check: (d) => {
      const withSD = d.pageConfigs.filter((p: any) => p.structuredDataJson);
      return withSD.length >= 2 ? "passed" : withSD.length > 0 ? "warning" : "failed";
    },
  },
  {
    id: "search_meta",
    label: "Meta pour la page de recherche",
    description: "La page de recherche doit avoir des meta optimisés.",
    priority: "medium",
    category: "meta",
    points: 4,
    check: (d) => {
      const p = d.pageConfigs.find((p: any) => p.pageKey === "recherche");
      return p?.metaTitle && p?.metaDescription ? "passed" : "failed";
    },
  },
  {
    id: "service_city_template",
    label: "Template meta pour pages service + ville",
    description: "Un template avec variables {{ville}}, {{service}} pour les pages géolocalisées.",
    priority: "medium",
    category: "meta",
    points: 4,
    check: (d) => {
      const p = d.pageConfigs.find((p: any) => p.pageKey === "service_city_page");
      return p?.metaTitle?.includes("{{") ? "passed" : p?.metaTitle ? "warning" : "failed";
    },
  },
  {
    id: "noindex_correct",
    label: "Pages privées en noindex",
    description: "Les pages connexion, dashboard, admin ne doivent pas être indexées.",
    priority: "medium",
    category: "technique",
    points: 3,
    check: (d) => {
      const connexion = d.pageConfigs.find((p: any) => p.pageKey === "connexion");
      return connexion?.noIndex ? "passed" : "warning";
    },
  },
  {
    id: "faq_meta",
    label: "Meta pour la FAQ",
    description: "La FAQ peut générer du trafic longue traîne si bien optimisée.",
    priority: "low",
    category: "meta",
    points: 3,
    check: (d) => {
      const p = d.pageConfigs.find((p: any) => p.pageKey === "faq");
      return p?.metaTitle ? "passed" : "failed";
    },
  },
  {
    id: "og_image",
    label: "Image OG par défaut configurée",
    description: "Une image par défaut pour les partages sociaux quand aucune image spécifique n'est disponible.",
    priority: "low",
    category: "social",
    points: 3,
    check: (d) => {
      const home = d.pageConfigs.find((p: any) => p.pageKey === "home");
      return home?.ogImageUrl ? "passed" : "failed";
    },
  },
  {
    id: "all_pages_configured",
    label: "Toutes les pages clés ont une config SEO",
    description: "Chaque type de page important doit avoir sa configuration SEO.",
    priority: "low",
    category: "meta",
    points: 3,
    check: (d) => {
      const keys = ["home", "recherche", "annonceur_profile", "service_page", "faq", "inscription"];
      const configured = keys.filter(k => d.pageConfigs.some((p: any) => p.pageKey === k));
      return configured.length === keys.length ? "passed" : configured.length >= 4 ? "warning" : "failed";
    },
  },
];

const priorityConfig: Record<Priority, { label: string; color: string; bg: string; border: string; dot: string }> = {
  critical: { label: "Critique", color: "text-red-600", bg: "bg-red-50", border: "border-red-200", dot: "bg-red-500" },
  high: { label: "Important", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", dot: "bg-orange-500" },
  medium: { label: "Moyen", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500" },
  low: { label: "Mineur", color: "text-green-600", bg: "bg-green-50", border: "border-green-200", dot: "bg-green-500" },
};

const categoryLabels: Record<string, { label: string; icon: React.ElementType }> = {
  technique: { label: "Technique", icon: Code },
  meta: { label: "Meta Tags", icon: FileText },
  social: { label: "Réseaux Sociaux", icon: Share2 },
  contenu: { label: "Contenu", icon: Globe },
};

// ============================================
// Page Config Editor Modal
// ============================================

function PageConfigEditor({
  config,
  onClose,
  token,
}: {
  config: any;
  onClose: () => void;
  token: string;
}) {
  const upsert = useMutation(api.admin.seo.upsertPageConfig);
  const [form, setForm] = useState({
    metaTitle: config?.metaTitle || "",
    metaDescription: config?.metaDescription || "",
    metaKeywords: config?.metaKeywords || "",
    ogTitle: config?.ogTitle || "",
    ogDescription: config?.ogDescription || "",
    ogImageUrl: config?.ogImageUrl || "",
    ogType: config?.ogType || "website",
    twitterCard: config?.twitterCard || "summary_large_image",
    twitterTitle: config?.twitterTitle || "",
    twitterDescription: config?.twitterDescription || "",
    structuredDataType: config?.structuredDataType || "",
    structuredDataJson: config?.structuredDataJson || "",
    canonicalUrl: config?.canonicalUrl || "",
    noIndex: config?.noIndex || false,
    noFollow: config?.noFollow || false,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsert({
        token,
        pageKey: config.pageKey,
        label: config.label,
        category: config.category,
        ...form,
        availableVariables: config.availableVariables,
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const variables = config?.availableVariables || [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-foreground">{config.label}</h2>
            <p className="text-xs text-text-light mt-0.5">Page : {config.pageKey}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <XCircle className="w-5 h-5 text-text-light" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Variables disponibles */}
          {variables.length > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-xs font-semibold text-blue-700 mb-1">Variables disponibles :</p>
              <div className="flex flex-wrap gap-1.5">
                {variables.map((v: string) => (
                  <code key={v} className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-md font-mono">{v}</code>
                ))}
              </div>
            </div>
          )}

          {/* Meta Tags */}
          <fieldset>
            <legend className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-primary" />
              Meta Tags (Navigateurs)
            </legend>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-text-light block mb-1">Meta Title</label>
                <input
                  value={form.metaTitle}
                  onChange={(e) => setForm(f => ({ ...f, metaTitle: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Titre affiché dans Google"
                />
                <p className={cn("text-xs mt-1", form.metaTitle.length > 60 ? "text-red-500" : "text-text-light")}>
                  {form.metaTitle.length}/60 caractères
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-text-light block mb-1">Meta Description</label>
                <textarea
                  value={form.metaDescription}
                  onChange={(e) => setForm(f => ({ ...f, metaDescription: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  placeholder="Description affichée sous le titre dans Google"
                />
                <p className={cn("text-xs mt-1", form.metaDescription.length > 160 ? "text-red-500" : "text-text-light")}>
                  {form.metaDescription.length}/160 caractères
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-text-light block mb-1">Mots-clés (optionnel)</label>
                <input
                  value={form.metaKeywords}
                  onChange={(e) => setForm(f => ({ ...f, metaKeywords: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="garde animaux, pet sitting, promenade chien"
                />
              </div>
            </div>
          </fieldset>

          {/* Open Graph */}
          <fieldset>
            <legend className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Share2 className="w-4 h-4 text-blue-500" />
              Open Graph (Facebook, LinkedIn, WhatsApp)
            </legend>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-text-light block mb-1">OG Title</label>
                <input
                  value={form.ogTitle}
                  onChange={(e) => setForm(f => ({ ...f, ogTitle: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Titre pour le partage social (laisser vide = meta title)"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-light block mb-1">OG Description</label>
                <textarea
                  value={form.ogDescription}
                  onChange={(e) => setForm(f => ({ ...f, ogDescription: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  placeholder="Description pour le partage social"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-light block mb-1">OG Image URL</label>
                <input
                  value={form.ogImageUrl}
                  onChange={(e) => setForm(f => ({ ...f, ogImageUrl: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="https://... (1200x630px recommandé)"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-light block mb-1">OG Type</label>
                <select
                  value={form.ogType}
                  onChange={(e) => setForm(f => ({ ...f, ogType: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="website">website</option>
                  <option value="article">article</option>
                  <option value="profile">profile</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* Twitter */}
          <fieldset>
            <legend className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-sky-500" />
              Twitter Card (X)
            </legend>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-text-light block mb-1">Type de carte</label>
                <select
                  value={form.twitterCard}
                  onChange={(e) => setForm(f => ({ ...f, twitterCard: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="summary">summary (petite image)</option>
                  <option value="summary_large_image">summary_large_image (grande image)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-text-light block mb-1">Twitter Title (optionnel)</label>
                <input
                  value={form.twitterTitle}
                  onChange={(e) => setForm(f => ({ ...f, twitterTitle: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Laisser vide = OG Title"
                />
              </div>
            </div>
          </fieldset>

          {/* Indexation */}
          <fieldset>
            <legend className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-amber-500" />
              Indexation
            </legend>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.noIndex}
                  onChange={(e) => setForm(f => ({ ...f, noIndex: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">noindex</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.noFollow}
                  onChange={(e) => setForm(f => ({ ...f, noFollow: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">nofollow</span>
              </label>
            </div>
          </fieldset>

          {/* Structured Data */}
          <fieldset>
            <legend className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Code className="w-4 h-4 text-violet-500" />
              Données structurées (JSON-LD)
            </legend>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-text-light block mb-1">Type Schema.org</label>
                <select
                  value={form.structuredDataType}
                  onChange={(e) => setForm(f => ({ ...f, structuredDataType: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Aucun</option>
                  <option value="Organization">Organization</option>
                  <option value="LocalBusiness">LocalBusiness</option>
                  <option value="Service">Service</option>
                  <option value="FAQPage">FAQPage</option>
                  <option value="WebSite">WebSite</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-text-light block mb-1">JSON-LD (avancé)</label>
                <textarea
                  value={form.structuredDataJson}
                  onChange={(e) => setForm(f => ({ ...f, structuredDataJson: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  placeholder='{"@type": "Organization", "name": "Animigo", ...}'
                />
              </div>
            </div>
          </fieldset>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-light hover:text-foreground transition-colors">
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold text-sm rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Sauvegarder
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// Main Page
// ============================================

export default function SeoDashboardPage() {
  const { token } = useAdminAuth();
  const [selectedConfig, setSelectedConfig] = useState<any | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [expandedPriorities, setExpandedPriorities] = useState<Set<string>>(new Set(["critical", "high", "medium", "low"]));

  const auditData = useQuery(api.admin.seo.getSeoAuditData, token ? { token } : "skip");
  const initDefaults = useMutation(api.admin.seo.initializeDefaults);

  const fullAuditData: AuditData | null = useMemo(() => {
    if (!auditData) return null;
    return {
      ...auditData,
      hasRobotsTxt: true, // Fichier créé statiquement
      hasSitemap: true,   // Fichier créé statiquement
    };
  }, [auditData]);

  // Calculate score
  const { score, results, passedCount, totalCount } = useMemo(() => {
    if (!fullAuditData) return { score: 0, results: [], passedCount: 0, totalCount: 0 };

    let earnedPoints = 0;
    let maxPoints = 0;
    let passed = 0;

    const res = seoChecks.map((check) => {
      const status = check.check(fullAuditData);
      maxPoints += check.points;
      if (status === "passed") {
        earnedPoints += check.points;
        passed++;
      } else if (status === "warning") {
        earnedPoints += Math.round(check.points * 0.5);
      }
      return { ...check, status };
    });

    return {
      score: maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 0,
      results: res,
      passedCount: passed,
      totalCount: seoChecks.length,
    };
  }, [fullAuditData]);

  const filteredResults = useMemo(() => {
    if (activeCategory === "all") return results;
    return results.filter((r) => r.category === activeCategory);
  }, [results, activeCategory]);

  const scoreColor = score >= 80 ? "text-green-500" : score >= 50 ? "text-amber-500" : "text-red-500";
  const scoreRingColor = score >= 80 ? "stroke-green-500" : score >= 50 ? "stroke-amber-500" : "stroke-red-500";

  const handleInitDefaults = async () => {
    if (!token) return;
    await initDefaults({ token });
  };

  const togglePriority = (priority: string) => {
    setExpandedPriorities((prev) => {
      const next = new Set(prev);
      if (next.has(priority)) next.delete(priority);
      else next.add(priority);
      return next;
    });
  };

  if (!auditData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">SEO Dashboard</h1>
            <p className="text-sm text-slate-400">Audit et gestion du référencement</p>
          </div>
        </div>
        <button
          onClick={handleInitDefaults}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl text-sm font-medium hover:bg-cyan-500/20 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Initialiser les configs
        </button>
      </div>

      {/* Score + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Score Circle */}
        <div className="lg:col-span-1 bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 flex flex-col items-center justify-center">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-700" />
              <circle
                cx="60" cy="60" r="52" fill="none" strokeWidth="8"
                className={scoreRingColor}
                strokeDasharray={`${(score / 100) * 327} 327`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("text-3xl font-bold", scoreColor)}>{score}</span>
              <span className="text-xs text-slate-500">/100</span>
            </div>
          </div>
          <p className="mt-3 text-sm font-medium text-slate-300">Score SEO</p>
          <p className="text-xs text-slate-500 mt-1">{passedCount}/{totalCount} critères validés</p>
        </div>

        {/* Stats Cards */}
        <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Pages configurées" value={auditData.pageConfigs.length} icon={FileText} color="cyan" />
          <StatCard label="Pages services" value={`${auditData.activeServicePages}/${auditData.totalServicePages}`} icon={Globe} color="emerald" />
          <StatCard label="Villes actives" value={auditData.activeCities} icon={MapPin} color="violet" />
          <StatCard label="Pages villes" value={auditData.activeCityPages} icon={Sparkles} color="amber" />
        </div>
      </div>

      {/* Page Configs List */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700/50 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-cyan-400" />
            Configurations par page
          </h2>
        </div>
        <div className="divide-y divide-slate-700/30">
          {auditData.pageConfigs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-slate-400 text-sm mb-3">Aucune configuration SEO. Initialisez les configs par défaut.</p>
              <button
                onClick={handleInitDefaults}
                className="px-4 py-2 bg-cyan-500 text-white rounded-xl text-sm font-medium hover:bg-cyan-600 transition-colors"
              >
                Initialiser
              </button>
            </div>
          ) : (
            auditData.pageConfigs.map((config: any) => {
              const hasMeta = !!config.metaTitle && !!config.metaDescription;
              const hasOg = !!config.ogTitle;
              const hasSD = !!config.structuredDataJson;

              return (
                <button
                  key={config._id}
                  onClick={() => setSelectedConfig(config)}
                  className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-slate-700/30 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{config.label}</p>
                    <p className="text-xs text-slate-500 font-mono">{config.pageKey}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <TagPill label="Meta" active={hasMeta} />
                    <TagPill label="OG" active={hasOg} />
                    <TagPill label="Schema" active={hasSD} />
                    {config.noIndex && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-red-500/10 text-red-400 rounded-md">noindex</span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Checklist SEO */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700/50">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            Bonnes pratiques SEO
          </h2>
          <p className="text-xs text-slate-400 mt-1">Les critères validés sont barrés. Couleur = niveau d'importance.</p>
        </div>

        {/* Category Filters */}
        <div className="px-5 py-3 border-b border-slate-700/30 flex gap-2 flex-wrap">
          <FilterButton label="Tout" active={activeCategory === "all"} onClick={() => setActiveCategory("all")} />
          {Object.entries(categoryLabels).map(([key, { label, icon: Icon }]) => (
            <FilterButton key={key} label={label} icon={Icon} active={activeCategory === key} onClick={() => setActiveCategory(key)} />
          ))}
        </div>

        {/* Grouped by priority */}
        <div className="divide-y divide-slate-700/30">
          {(["critical", "high", "medium", "low"] as Priority[]).map((priority) => {
            const items = filteredResults.filter((r) => r.priority === priority);
            if (items.length === 0) return null;

            const conf = priorityConfig[priority];
            const isExpanded = expandedPriorities.has(priority);
            const passedInGroup = items.filter((i) => i.status === "passed").length;

            return (
              <div key={priority}>
                <button
                  onClick={() => togglePriority(priority)}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-700/20 transition-colors"
                >
                  <span className={cn("w-2.5 h-2.5 rounded-full", conf.dot)} />
                  <span className={cn("text-sm font-semibold", conf.color)}>{conf.label}</span>
                  <span className="text-xs text-slate-500">({passedInGroup}/{items.length})</span>
                  <div className="flex-1" />
                  <ChevronDown className={cn("w-4 h-4 text-slate-600 transition-transform", !isExpanded && "-rotate-90")} />
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-3 space-y-1.5">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className={cn(
                              "flex items-start gap-3 px-3 py-2.5 rounded-xl",
                              item.status === "passed" ? "bg-slate-800/30" : "bg-slate-800/60"
                            )}
                          >
                            {item.status === "passed" ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            ) : item.status === "warning" ? (
                              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-sm font-medium",
                                item.status === "passed" ? "text-slate-500 line-through" : "text-slate-200"
                              )}>
                                {item.label}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                            </div>
                            <span className={cn(
                              "px-2 py-0.5 text-[10px] font-bold rounded-md flex-shrink-0",
                              item.status === "passed" ? "bg-green-500/10 text-green-400"
                                : item.status === "warning" ? "bg-amber-500/10 text-amber-400"
                                : "bg-red-500/10 text-red-400"
                            )}>
                              {item.points} pts
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* Editor Modal */}
      <AnimatePresence>
        {selectedConfig && token && (
          <PageConfigEditor
            config={selectedConfig}
            onClose={() => setSelectedConfig(null)}
            token={token}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  const colorStyles: Record<string, string> = {
    cyan: "from-cyan-500/10 to-cyan-500/5 border-cyan-500/20 text-cyan-400",
    emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-400",
    violet: "from-violet-500/10 to-violet-500/5 border-violet-500/20 text-violet-400",
    amber: "from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-400",
  };

  return (
    <div className={cn("bg-gradient-to-br border rounded-xl p-4", colorStyles[color])}>
      <Icon className="w-5 h-5 mb-2" />
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}

function TagPill({ label, active }: { label: string; active: boolean }) {
  return (
    <span className={cn(
      "px-2 py-0.5 text-[10px] font-semibold rounded-md",
      active ? "bg-green-500/10 text-green-400" : "bg-slate-700 text-slate-500"
    )}>
      {label}
    </span>
  );
}

function FilterButton({ label, icon: Icon, active, onClick }: { label: string; icon?: React.ElementType; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
        active ? "bg-cyan-500/20 text-cyan-300" : "bg-slate-800 text-slate-400 hover:text-slate-300"
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}
