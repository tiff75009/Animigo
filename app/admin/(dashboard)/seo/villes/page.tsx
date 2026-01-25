"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  Check,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Download,
  Upload,
  Search,
  Globe,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

interface CityFormData {
  slug: string;
  name: string;
  region: string;
  department: string;
  postalCodes: string;
  population: string;
  lat: string;
  lng: string;
}

interface CityItem {
  id: Id<"seoServiceCities">;
  slug: string;
  name: string;
  region: string;
  department?: string;
  postalCodes?: string[];
  population?: number;
  coordinates?: { lat: number; lng: number };
  isActive: boolean;
  order: number;
  pagesCount?: number;
  activePagesCount?: number;
  createdAt: number;
  updatedAt: number;
}

const defaultFormData: CityFormData = {
  slug: "",
  name: "",
  region: "",
  department: "",
  postalCodes: "",
  population: "",
  lat: "",
  lng: "",
};

const REGIONS = [
  "Auvergne-Rhône-Alpes",
  "Bourgogne-Franche-Comté",
  "Bretagne",
  "Centre-Val de Loire",
  "Corse",
  "Grand Est",
  "Hauts-de-France",
  "Île-de-France",
  "Normandie",
  "Nouvelle-Aquitaine",
  "Occitanie",
  "Pays de la Loire",
  "Provence-Alpes-Côte d'Azur",
];

export default function SeoCitiesPage() {
  const { token } = useAdminAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<Id<"seoServiceCities"> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<Id<"seoServiceCities"> | null>(null);
  const [formData, setFormData] = useState<CityFormData>(defaultFormData);
  const [searchQuery, setSearchQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [isSeeding, setIsSeeding] = useState(false);

  // Queries
  const cities = useQuery(
    api.seo.serviceCities.adminList,
    token ? { token } : "skip"
  );

  // Mutations
  const createCity = useMutation(api.seo.serviceCities.create);
  const updateCity = useMutation(api.seo.serviceCities.update);
  const deleteCity = useMutation(api.seo.serviceCities.delete_);
  const toggleActive = useMutation(api.seo.serviceCities.toggleActive);
  const seedDefaultCities = useMutation(api.seo.serviceCities.seedDefaultCities);

  const resetForm = () => {
    setFormData(defaultFormData);
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!token || !formData.slug.trim() || !formData.name.trim() || !formData.region) return;

    setIsSaving(true);
    try {
      const data = {
        token,
        slug: formData.slug.trim().toLowerCase().replace(/\s+/g, "-"),
        name: formData.name.trim(),
        region: formData.region,
        department: formData.department.trim() || undefined,
        postalCodes: formData.postalCodes.trim()
          ? formData.postalCodes.split(",").map((p) => p.trim())
          : undefined,
        population: formData.population ? parseInt(formData.population) : undefined,
        coordinates:
          formData.lat && formData.lng
            ? { lat: parseFloat(formData.lat), lng: parseFloat(formData.lng) }
            : undefined,
      };

      if (editingId) {
        await updateCity({ ...data, cityId: editingId });
      } else {
        await createCity(data);
      }
      resetForm();
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (city: CityItem) => {
    setFormData({
      slug: city.slug,
      name: city.name,
      region: city.region,
      department: city.department || "",
      postalCodes: city.postalCodes?.join(", ") || "",
      population: city.population?.toString() || "",
      lat: city.coordinates?.lat?.toString() || "",
      lng: city.coordinates?.lng?.toString() || "",
    });
    setEditingId(city.id);
    setIsAdding(true);
  };

  const handleDelete = async (cityId: Id<"seoServiceCities">) => {
    if (!token) return;
    setDeletingId(cityId);
    try {
      await deleteCity({ token, cityId });
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (cityId: Id<"seoServiceCities">) => {
    if (!token) return;
    try {
      await toggleActive({ token, cityId });
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  const handleSeed = async () => {
    if (!token) return;
    setIsSeeding(true);
    try {
      await seedDefaultCities({ token });
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setIsSeeding(false);
    }
  };

  // Filter cities
  const filteredCities = cities?.filter((city: CityItem) => {
    const matchesSearch =
      !searchQuery ||
      city.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      city.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      city.department?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRegion = !regionFilter || city.region === regionFilter;

    return matchesSearch && matchesRegion;
  });

  // Group by region
  const citiesByRegion = filteredCities?.reduce(
    (acc: Record<string, CityItem[]>, city: CityItem) => {
      if (!acc[city.region]) {
        acc[city.region] = [];
      }
      acc[city.region].push(city);
      return acc;
    },
    {} as Record<string, CityItem[]>
  );

  if (!cities) {
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
            <MapPin className="w-8 h-8 text-blue-500" />
            Villes SEO
          </h1>
          <p className="text-slate-400 mt-1">
            Gérez les villes pour le référencement local ({cities.length} villes)
          </p>
        </div>
        <div className="flex gap-3">
          {cities.length === 0 && (
            <motion.button
              onClick={handleSeed}
              disabled={isSeeding}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isSeeding ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              Importer les 20 principales villes
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
            Nouvelle ville
          </motion.button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une ville..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>
        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none"
        >
          <option value="">Toutes les régions</option>
          {REGIONS.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
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
                {editingId ? "Modifier la ville" : "Nouvelle ville"}
              </h2>
              <button
                onClick={resetForm}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Slug (URL) *
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                    })
                  }
                  placeholder="paris"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Nom *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Paris"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Région *
                </label>
                <select
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none"
                >
                  <option value="">Sélectionner...</option>
                  {REGIONS.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Département
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="75"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Population
                </label>
                <input
                  type="number"
                  value={formData.population}
                  onChange={(e) => setFormData({ ...formData, population: e.target.value })}
                  placeholder="2161000"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Latitude
                </label>
                <input
                  type="text"
                  value={formData.lat}
                  onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                  placeholder="48.8566"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Longitude
                </label>
                <input
                  type="text"
                  value={formData.lng}
                  onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                  placeholder="2.3522"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Codes postaux (séparés par des virgules)
              </label>
              <input
                type="text"
                value={formData.postalCodes}
                onChange={(e) => setFormData({ ...formData, postalCodes: e.target.value })}
                placeholder="75001, 75002, 75003..."
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none"
              />
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
                disabled={isSaving || !formData.slug.trim() || !formData.name.trim() || !formData.region}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Cities List */}
      {filteredCities?.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-12 text-center border border-slate-700">
          <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {cities.length === 0 ? "Aucune ville" : "Aucun résultat"}
          </h3>
          <p className="text-slate-400 mb-4">
            {cities.length === 0
              ? "Commencez par importer les villes principales ou ajoutez-en manuellement."
              : "Aucune ville ne correspond à votre recherche."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {(Object.entries(citiesByRegion || {}) as [string, CityItem[]][])
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([region, regionCities]) => (
              <div key={region} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700 bg-slate-900/50">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-400" />
                    {region}
                    <span className="text-sm font-normal text-slate-500">
                      ({regionCities.length} ville{regionCities.length > 1 ? "s" : ""})
                    </span>
                  </h3>
                </div>

                <div className="divide-y divide-slate-700">
                  {regionCities.map((city: CityItem) => (
                    <motion.div
                      key={city.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`flex items-center justify-between p-4 transition-colors ${
                        city.isActive ? "bg-slate-800" : "bg-slate-800/50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <span className={`font-medium ${city.isActive ? "text-white" : "text-slate-500"}`}>
                            {city.name}
                          </span>
                          {city.department && (
                            <span className="text-slate-500 text-sm ml-2">({city.department})</span>
                          )}
                          {!city.isActive && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-slate-700 text-slate-400 rounded">
                              Inactif
                            </span>
                          )}
                        </div>
                        {city.population && (
                          <span className="text-sm text-slate-500">
                            {city.population.toLocaleString("fr-FR")} hab.
                          </span>
                        )}
                        <span className="text-sm text-slate-600">
                          {city.activePagesCount}/{city.pagesCount} pages
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Toggle Active */}
                        <button
                          onClick={() => handleToggleActive(city.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            city.isActive
                              ? "text-green-500 hover:bg-green-500/10"
                              : "text-slate-500 hover:bg-slate-700"
                          }`}
                          title={city.isActive ? "Désactiver" : "Activer"}
                        >
                          {city.isActive ? (
                            <ToggleRight className="w-5 h-5" />
                          ) : (
                            <ToggleLeft className="w-5 h-5" />
                          )}
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => handleEdit(city)}
                          className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg"
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => {
                            if (confirm(`Supprimer ${city.name} et ses ${city.pagesCount} pages associées ?`)) {
                              handleDelete(city.id);
                            }
                          }}
                          disabled={deletingId === city.id}
                          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg disabled:opacity-50"
                          title="Supprimer"
                        >
                          {deletingId === city.id ? (
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
            ))}
        </div>
      )}

      {/* Info */}
      <div className="flex items-start gap-3 p-4 bg-blue-500/10 rounded-xl mt-6 border border-blue-500/20">
        <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-300">
          <p className="font-medium">Villes SEO</p>
          <p className="mt-1 text-blue-400">
            Les villes sont utilisées pour générer des pages de référencement local. Chaque service
            peut être décliné pour toutes les villes actives (ex: "Garde d'animaux à Lyon").
          </p>
        </div>
      </div>
    </div>
  );
}
