"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  Check,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Zap,
  Grid3X3,
  List,
  ExternalLink,
  Search,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

interface PageFormData {
  servicePageId: string;
  cityId: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  customContent: string;
}

// Types pour les données des queries
interface CityPageData {
  id: Id<"seoServiceCityPages">;
  servicePageId: Id<"seoServicePages">;
  cityId: Id<"seoServiceCities">;
  serviceName: string;
  serviceSlug: string;
  cityName: string;
  citySlug: string;
  region: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  customContent?: string;
  localStats?: { announcersCount?: number; averageRating?: number; completedMissions?: number };
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

interface ServiceData {
  id: Id<"seoServicePages">;
  title: string;
  slug: string;
  isActive: boolean;
}

interface CityData {
  id: Id<"seoServiceCities">;
  name: string;
  slug: string;
  region: string;
  isActive: boolean;
}

interface MatrixCity {
  cityId: Id<"seoServiceCities">;
  citySlug: string;
  cityName: string;
  cityActive: boolean;
  hasPage: boolean;
  pageId?: string;
  pageActive?: boolean;
}

interface MatrixRow {
  serviceId: Id<"seoServicePages">;
  serviceSlug: string;
  serviceName: string;
  serviceActive: boolean;
  cities: MatrixCity[];
}

const defaultFormData: PageFormData = {
  servicePageId: "",
  cityId: "",
  title: "{{service}} à {{ville}}",
  description: "Trouvez les meilleurs professionnels de {{service}} à {{ville}}, {{region}}. Réservez en ligne en quelques clics.",
  metaTitle: "{{service}} à {{ville}} | Gopattes",
  metaDescription: "Recherchez et réservez un professionnel de {{service}} à {{ville}} ({{department}}). Service de qualité garanti.",
  customContent: "",
};

const generateFormData: PageFormData = {
  servicePageId: "",
  cityId: "",
  title: "{{service}} à {{ville}}",
  description: "Trouvez les meilleurs professionnels de {{service}} à {{ville}}, {{region}}. Réservez en ligne en quelques clics.",
  metaTitle: "{{service}} à {{ville}} | Gopattes",
  metaDescription: "Recherchez et réservez un professionnel de {{service}} à {{ville}} ({{department}}). Service de qualité garanti.",
  customContent: "",
};

export default function SeoCityPagesPage() {
  const { token } = useAdminAuth();
  const [viewMode, setViewMode] = useState<"list" | "matrix">("list");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<Id<"seoServiceCityPages"> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<Id<"seoServiceCityPages"> | null>(null);
  const [formData, setFormData] = useState<PageFormData>(defaultFormData);
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");

  // Génération automatique
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateFor, setGenerateFor] = useState<"all" | "service" | "city">("all");
  const [selectedServiceId, setSelectedServiceId] = useState<Id<"seoServicePages"> | "">("");
  const [selectedCityId, setSelectedCityId] = useState<Id<"seoServiceCities"> | "">("");

  // Queries
  const cityPages = useQuery(
    api.seo.serviceCityPages.adminList,
    token ? { token } : "skip"
  );

  const matrix = useQuery(
    api.seo.serviceCityPages.adminMatrix,
    token ? { token } : "skip"
  );

  const services = useQuery(
    api.seo.servicePages.adminList,
    token ? { token } : "skip"
  );

  const cities = useQuery(
    api.seo.serviceCities.adminList,
    token ? { token } : "skip"
  );

  // Mutations
  const createPage = useMutation(api.seo.serviceCityPages.create);
  const updatePage = useMutation(api.seo.serviceCityPages.update);
  const deletePage = useMutation(api.seo.serviceCityPages.delete_);
  const toggleActive = useMutation(api.seo.serviceCityPages.toggleActive);
  const generateAll = useMutation(api.seo.serviceCityPages.generateAll);
  const generateForService = useMutation(api.seo.serviceCityPages.generateForService);
  const generateForCity = useMutation(api.seo.serviceCityPages.generateForCity);

  const resetForm = () => {
    setFormData(defaultFormData);
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!token || !formData.servicePageId || !formData.cityId) return;

    setIsSaving(true);
    try {
      const data = {
        token,
        servicePageId: formData.servicePageId as Id<"seoServicePages">,
        cityId: formData.cityId as Id<"seoServiceCities">,
        title: formData.title.trim(),
        description: formData.description.trim(),
        metaTitle: formData.metaTitle.trim(),
        metaDescription: formData.metaDescription.trim(),
        customContent: formData.customContent.trim() || undefined,
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

  const handleEdit = (page: NonNullable<typeof cityPages>[0]) => {
    setFormData({
      servicePageId: page.servicePageId,
      cityId: page.cityId,
      title: page.title,
      description: page.description,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      customContent: page.customContent || "",
    });
    setEditingId(page.id);
    setIsAdding(true);
  };

  const handleDelete = async (pageId: Id<"seoServiceCityPages">) => {
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

  const handleToggleActive = async (pageId: Id<"seoServiceCityPages">) => {
    if (!token) return;
    try {
      await toggleActive({ token, pageId });
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  const handleGenerate = async () => {
    if (!token) return;

    setIsGenerating(true);
    try {
      const templates = {
        titleTemplate: generateFormData.title,
        descriptionTemplate: generateFormData.description,
        metaTitleTemplate: generateFormData.metaTitle,
        metaDescriptionTemplate: generateFormData.metaDescription,
      };

      if (generateFor === "all") {
        await generateAll({ token, ...templates });
      } else if (generateFor === "service" && selectedServiceId) {
        await generateForService({
          token,
          servicePageId: selectedServiceId as Id<"seoServicePages">,
          ...templates,
        });
      } else if (generateFor === "city" && selectedCityId) {
        await generateForCity({
          token,
          cityId: selectedCityId as Id<"seoServiceCities">,
          ...templates,
        });
      }

      setShowGenerateModal(false);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Filter pages
  const filteredPages = cityPages?.filter((page: CityPageData) => {
    const matchesSearch =
      !searchQuery ||
      page.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.cityName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesService = !serviceFilter || page.servicePageId === serviceFilter;
    const matchesCity = !cityFilter || page.cityId === cityFilter;

    return matchesSearch && matchesService && matchesCity;
  });

  if (!cityPages || !matrix || !services || !cities) {
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
            <Globe className="w-8 h-8 text-blue-500" />
            Pages Service + Ville
          </h1>
          <p className="text-slate-400 mt-1">
            {matrix.stats.totalCreated}/{matrix.stats.totalPossible} pages créées (
            {matrix.stats.coverage.toFixed(0)}% de couverture)
          </p>
        </div>
        <div className="flex gap-3">
          {/* View toggle */}
          <div className="flex bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded ${viewMode === "list" ? "bg-blue-600 text-white" : "text-slate-400"}`}
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("matrix")}
              className={`p-2 rounded ${viewMode === "matrix" ? "bg-blue-600 text-white" : "text-slate-400"}`}
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
          </div>

          <motion.button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Zap className="w-5 h-5" />
            Générer
          </motion.button>

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
      </div>

      {/* Filters (list view) */}
      {viewMode === "list" && (
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none"
            />
          </div>
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none"
          >
            <option value="">Tous les services</option>
            {services.map((service: ServiceData) => (
              <option key={service.id} value={service.id}>
                {service.title}
              </option>
            ))}
          </select>
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none"
          >
            <option value="">Toutes les villes</option>
            {cities.map((city: CityData) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Generate Modal */}
      <AnimatePresence>
        {showGenerateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowGenerateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-slate-800 rounded-xl p-6 max-w-lg w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  Génération automatique
                </h2>
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Options */}
              <div className="space-y-3 mb-6">
                <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer">
                  <input
                    type="radio"
                    name="generateFor"
                    checked={generateFor === "all"}
                    onChange={() => setGenerateFor("all")}
                    className="w-4 h-4"
                  />
                  <div>
                    <span className="text-white font-medium">Toutes les combinaisons manquantes</span>
                    <p className="text-sm text-slate-400">
                      Génère les pages pour tous les services × toutes les villes
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer">
                  <input
                    type="radio"
                    name="generateFor"
                    checked={generateFor === "service"}
                    onChange={() => setGenerateFor("service")}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <span className="text-white font-medium">Pour un service</span>
                    <p className="text-sm text-slate-400">Génère les pages pour toutes les villes</p>
                    {generateFor === "service" && (
                      <select
                        value={selectedServiceId}
                        onChange={(e) => setSelectedServiceId(e.target.value as Id<"seoServicePages">)}
                        className="mt-2 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                      >
                        <option value="">Sélectionner un service...</option>
                        {services.map((s: ServiceData) => (
                          <option key={s.id} value={s.id}>
                            {s.title}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer">
                  <input
                    type="radio"
                    name="generateFor"
                    checked={generateFor === "city"}
                    onChange={() => setGenerateFor("city")}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <span className="text-white font-medium">Pour une ville</span>
                    <p className="text-sm text-slate-400">Génère les pages pour tous les services</p>
                    {generateFor === "city" && (
                      <select
                        value={selectedCityId}
                        onChange={(e) => setSelectedCityId(e.target.value as Id<"seoServiceCities">)}
                        className="mt-2 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                      >
                        <option value="">Sélectionner une ville...</option>
                        {cities.map((c: CityData) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </label>
              </div>

              {/* Templates info */}
              <div className="p-3 bg-slate-900 rounded-lg mb-6">
                <p className="text-sm text-slate-400 mb-2">Templates utilisés :</p>
                <p className="text-xs text-slate-500">
                  <strong>Titre:</strong> {generateFormData.title}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  <strong>Variables:</strong> {"{{ville}}, {{region}}, {{service}}, {{department}}"}
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
                >
                  Annuler
                </button>
                <motion.button
                  onClick={handleGenerate}
                  disabled={
                    isGenerating ||
                    (generateFor === "service" && !selectedServiceId) ||
                    (generateFor === "city" && !selectedCityId)
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isGenerating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Zap className="w-5 h-5" />
                  )}
                  Générer
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                {editingId ? "Modifier la page" : "Nouvelle page service + ville"}
              </h2>
              <button
                onClick={resetForm}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!editingId && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Service *
                  </label>
                  <select
                    value={formData.servicePageId}
                    onChange={(e) => setFormData({ ...formData, servicePageId: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none"
                  >
                    <option value="">Sélectionner...</option>
                    {services.map((s: ServiceData) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Ville *
                  </label>
                  <select
                    value={formData.cityId}
                    onChange={(e) => setFormData({ ...formData, cityId: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none"
                  >
                    <option value="">Sélectionner...</option>
                    {cities.map((c: CityData) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.region})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Titre *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="{{service}} à {{ville}}"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Meta Title *
                  </label>
                  <input
                    type="text"
                    value={formData.metaTitle}
                    onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none"
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
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Contenu personnalisé (optionnel)
                </label>
                <textarea
                  value={formData.customContent}
                  onChange={(e) => setFormData({ ...formData, customContent: e.target.value })}
                  placeholder="Contenu HTML ou Markdown spécifique à cette combinaison..."
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none resize-none"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-900 rounded-lg mb-4">
              <p className="text-sm text-slate-400">
                <strong>Variables disponibles:</strong>{" "}
                {"{{ville}}, {{region}}, {{service}}, {{department}}"}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
              >
                Annuler
              </button>
              <motion.button
                onClick={handleSubmit}
                disabled={isSaving || (!editingId && (!formData.servicePageId || !formData.cityId))}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
                {editingId ? "Enregistrer" : "Créer"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Matrix View */}
      {viewMode === "matrix" && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900/50">
                <th className="p-3 text-left text-sm font-medium text-slate-400 sticky left-0 bg-slate-900">
                  Services / Villes
                </th>
                {matrix.matrix[0]?.cities.map((city: MatrixCity) => (
                  <th
                    key={city.cityId}
                    className={`p-3 text-center text-sm font-medium ${
                      city.cityActive ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    {city.cityName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.matrix.map((service: MatrixRow) => (
                <tr key={service.serviceId} className="border-b border-slate-700">
                  <td
                    className={`p-3 font-medium sticky left-0 bg-slate-800 ${
                      service.serviceActive ? "text-white" : "text-slate-500"
                    }`}
                  >
                    {service.serviceName}
                  </td>
                  {service.cities.map((city: MatrixCity) => (
                    <td key={city.cityId} className="p-3 text-center">
                      {city.hasPage ? (
                        <button
                          onClick={() => {
                            if (city.pageId) {
                              handleToggleActive(city.pageId as Id<"seoServiceCityPages">);
                            }
                          }}
                          className={`w-6 h-6 rounded-full mx-auto flex items-center justify-center ${
                            city.pageActive
                              ? "bg-green-500/20 text-green-400"
                              : "bg-slate-700 text-slate-500"
                          }`}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="w-6 h-6 rounded-full mx-auto bg-slate-700/50" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <>
          {filteredPages?.length === 0 ? (
            <div className="bg-slate-800 rounded-xl p-12 text-center border border-slate-700">
              <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-slate-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Aucune page</h3>
              <p className="text-slate-400 mb-4">
                Utilisez le bouton "Générer" pour créer des pages automatiquement.
              </p>
            </div>
          ) : (
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 p-4 border-b border-slate-700 bg-slate-900/50">
                <p className="text-sm font-medium text-slate-400">Service</p>
                <p className="text-sm font-medium text-slate-400">Ville</p>
                <p className="text-sm font-medium text-slate-400 w-20 text-center">Statut</p>
                <p className="text-sm font-medium text-slate-400 w-24 text-center">Actions</p>
              </div>

              <div className="divide-y divide-slate-700 max-h-[60vh] overflow-y-auto">
                {filteredPages?.map((page: CityPageData) => (
                  <motion.div
                    key={page.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`grid grid-cols-[1fr_1fr_auto_auto] gap-4 p-4 items-center ${
                      page.isActive ? "bg-slate-800" : "bg-slate-800/50"
                    }`}
                  >
                    <div>
                      <span className={`font-medium ${page.isActive ? "text-white" : "text-slate-500"}`}>
                        {page.serviceName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={page.isActive ? "text-slate-300" : "text-slate-500"}>
                        {page.cityName}
                      </span>
                      <span className="text-xs text-slate-600">{page.region}</span>
                      <a
                        href={`/services/${page.serviceSlug}/${page.citySlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-500 hover:text-blue-400"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

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

                    <div className="flex items-center gap-1 w-24 justify-end">
                      <button
                        onClick={() => handleToggleActive(page.id)}
                        className={`p-2 rounded-lg ${
                          page.isActive
                            ? "text-green-500 hover:bg-green-500/10"
                            : "text-slate-500 hover:bg-slate-700"
                        }`}
                      >
                        {page.isActive ? (
                          <ToggleRight className="w-5 h-5" />
                        ) : (
                          <ToggleLeft className="w-5 h-5" />
                        )}
                      </button>

                      <button
                        onClick={() => handleEdit(page)}
                        className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          if (confirm("Supprimer cette page ?")) {
                            handleDelete(page.id);
                          }
                        }}
                        disabled={deletingId === page.id}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg disabled:opacity-50"
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
        </>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-sm text-slate-400">Services</p>
          <p className="text-2xl font-bold text-white">{matrix.stats.totalServices}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-sm text-slate-400">Villes</p>
          <p className="text-2xl font-bold text-white">{matrix.stats.totalCities}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-sm text-slate-400">Pages créées</p>
          <p className="text-2xl font-bold text-white">{matrix.stats.totalCreated}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-sm text-slate-400">Couverture</p>
          <p className="text-2xl font-bold text-green-400">{matrix.stats.coverage.toFixed(0)}%</p>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 p-4 bg-blue-500/10 rounded-xl mt-6 border border-blue-500/20">
        <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-300">
          <p className="font-medium">Pages Service + Ville</p>
          <p className="mt-1 text-blue-400">
            Ces pages combinent un service et une ville pour le SEO local. Utilisez le bouton "Générer"
            pour créer automatiquement les combinaisons manquantes avec les templates prédéfinis.
          </p>
        </div>
      </div>
    </div>
  );
}
