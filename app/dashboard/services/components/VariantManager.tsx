"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  X,
  Check,
  Clock,
  Euro,
  Loader2,
  ChevronDown,
  ChevronUp,
  Layers,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { PriceRecommendationCompact } from "./PriceRecommendationCompact";
import ConfirmModal from "./shared/ConfirmModal";

type PriceUnit = "hour" | "day" | "week" | "month" | "flat";
type BillingType = "hourly" | "daily" | "flexible";

// Variant pour le mode édition (avec ID backend)
interface Variant {
  id: Id<"serviceVariants">;
  name: string;
  description?: string;
  price: number;
  priceUnit: PriceUnit;
  duration?: number;
  includedFeatures?: string[];
  order: number;
  isActive: boolean;
}

// Variant local pour le mode création (sans ID)
export interface LocalVariant {
  localId: string; // ID temporaire local
  name: string;
  description?: string;
  price: number;
  priceUnit: PriceUnit;
  duration?: number;
  includedFeatures?: string[];
}

interface VariantManagerProps {
  // Mode édition (service existant)
  serviceId?: Id<"services">;
  variants?: Variant[];
  token?: string;
  onUpdate?: () => void;

  // Mode création (nouveau service)
  mode?: "edit" | "create";
  localVariants?: LocalVariant[];
  onLocalChange?: (variants: LocalVariant[]) => void;

  // Commun
  serviceName: string;
  billingType?: BillingType;
  category: string;
}

// Helper pour formater le prix
const formatPrice = (cents: number) => {
  return (cents / 100).toFixed(2).replace(".", ",") + " \u20ac";
};

// Helper pour formater la durée
const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h${mins}` : `${hours}h`;
};

// Helper pour obtenir les unités de prix autorisées selon le billingType
const getAllowedPriceUnits = (billingType?: BillingType): { id: PriceUnit; label: string }[] => {
  const allUnits = [
    { id: "hour" as PriceUnit, label: "par heure" },
    { id: "day" as PriceUnit, label: "par jour" },
    { id: "week" as PriceUnit, label: "par semaine" },
    { id: "month" as PriceUnit, label: "par mois" },
    { id: "flat" as PriceUnit, label: "forfait" },
  ];

  switch (billingType) {
    case "hourly":
      return allUnits.filter((u) => u.id === "hour" || u.id === "flat");
    case "daily":
      return allUnits.filter((u) => u.id !== "hour");
    case "flexible":
    default:
      return allUnits;
  }
};

// Helper pour obtenir le label de l'unité
const getPriceUnitLabel = (unit: PriceUnit) => {
  const labels: Record<PriceUnit, string> = {
    hour: "/h",
    day: "/jour",
    week: "/sem",
    month: "/mois",
    flat: "forfait",
  };
  return labels[unit];
};

// Générer un ID local unique
const generateLocalId = () => `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export default function VariantManager({
  serviceId,
  serviceName,
  variants = [],
  billingType,
  category,
  token,
  onUpdate,
  mode = "edit",
  localVariants = [],
  onLocalChange,
}: VariantManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    priceUnit: "flat" as PriceUnit,
    duration: 60,
    includedFeatures: [] as string[],
  });
  const [newFeature, setNewFeature] = useState("");

  // Mutations (uniquement utilisées en mode edit)
  const addVariantMutation = useMutation(api.services.variants.addVariant);
  const updateVariantMutation = useMutation(api.services.variants.updateVariant);
  const deleteVariantMutation = useMutation(api.services.variants.deleteVariant);

  const allowedPriceUnits = getAllowedPriceUnits(billingType);
  const isCreateMode = mode === "create";

  // Déterminer les items à afficher selon le mode
  const displayItems = isCreateMode
    ? localVariants.map((v) => ({
        id: v.localId,
        name: v.name,
        description: v.description,
        price: v.price,
        priceUnit: v.priceUnit,
        duration: v.duration,
        includedFeatures: v.includedFeatures,
        isActive: true,
      }))
    : variants.map((v) => ({
        id: v.id as string,
        name: v.name,
        description: v.description,
        price: v.price,
        priceUnit: v.priceUnit,
        duration: v.duration,
        includedFeatures: v.includedFeatures,
        isActive: v.isActive,
      }));

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: 0,
      priceUnit: allowedPriceUnits[0]?.id || "flat",
      duration: 60,
      includedFeatures: [],
    });
    setNewFeature("");
    setIsAdding(false);
    setEditingId(null);
    setError(null);
  };

  const startEdit = (item: typeof displayItems[0]) => {
    setFormData({
      name: item.name,
      description: item.description || "",
      price: item.price / 100, // Convertir en euros pour l'édition
      priceUnit: item.priceUnit,
      duration: item.duration || 60,
      includedFeatures: item.includedFeatures || [],
    });
    setEditingId(item.id);
    setIsAdding(false);
    setError(null);
  };

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      setFormData({
        ...formData,
        includedFeatures: [...formData.includedFeatures, newFeature.trim()],
      });
      setNewFeature("");
    }
  };

  const handleRemoveFeature = (index: number) => {
    setFormData({
      ...formData,
      includedFeatures: formData.includedFeatures.filter((_, i) => i !== index),
    });
  };

  const handleSave = async () => {
    if (!formData.name || formData.price <= 0 || !formData.duration || formData.duration <= 0) return;

    setError(null);

    // Prix horaire en centimes
    const hourlyRateInCents = Math.round(formData.price * 100);

    if (isCreateMode) {
      // Mode création: modifier les variantes locales
      if (editingId) {
        // Modifier une variante locale existante
        const updated = localVariants.map((v) =>
          v.localId === editingId
            ? {
                ...v,
                name: formData.name,
                description: formData.description || undefined,
                price: hourlyRateInCents,
                priceUnit: "hour" as PriceUnit,
                duration: formData.duration,
                includedFeatures:
                  formData.includedFeatures.length > 0 ? formData.includedFeatures : undefined,
              }
            : v
        );
        onLocalChange?.(updated);
      } else {
        // Ajouter une nouvelle variante locale
        const newVariant: LocalVariant = {
          localId: generateLocalId(),
          name: formData.name,
          description: formData.description || undefined,
          price: hourlyRateInCents,
          priceUnit: "hour" as PriceUnit,
          duration: formData.duration,
          includedFeatures:
            formData.includedFeatures.length > 0 ? formData.includedFeatures : undefined,
        };
        onLocalChange?.([...localVariants, newVariant]);
      }
      resetForm();
    } else {
      // Mode édition: utiliser les mutations backend
      if (!token || !serviceId) return;

      setSaving(true);
      try {
        if (editingId) {
          await updateVariantMutation({
            token,
            variantId: editingId as Id<"serviceVariants">,
            name: formData.name,
            description: formData.description || undefined,
            price: hourlyRateInCents,
            priceUnit: "hour" as PriceUnit,
            duration: formData.duration,
            includedFeatures:
              formData.includedFeatures.length > 0 ? formData.includedFeatures : undefined,
          });
        } else {
          await addVariantMutation({
            token,
            serviceId,
            name: formData.name,
            description: formData.description || undefined,
            price: hourlyRateInCents,
            priceUnit: "hour" as PriceUnit,
            duration: formData.duration,
            includedFeatures:
              formData.includedFeatures.length > 0 ? formData.includedFeatures : undefined,
          });
        }
        resetForm();
        onUpdate?.();
      } catch (err) {
        console.error("Erreur:", err);
        setError(err instanceof Error ? err.message : "Une erreur est survenue");
      } finally {
        setSaving(false);
      }
    }
  };

  const openDeleteModal = (itemId: string, itemName: string) => {
    setItemToDelete({ id: itemId, name: itemName });
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setError(null);

    if (isCreateMode) {
      // Mode création: supprimer localement
      const filtered = localVariants.filter((v) => v.localId !== itemToDelete.id);
      onLocalChange?.(filtered);
    } else {
      // Mode édition: supprimer via backend
      if (!token) return;

      try {
        await deleteVariantMutation({
          token,
          variantId: itemToDelete.id as Id<"serviceVariants">,
        });
        onUpdate?.();
      } catch (err) {
        console.error("Erreur:", err);
        setError(err instanceof Error ? err.message : "Une erreur est survenue");
      }
    }

    setDeleteModalOpen(false);
    setItemToDelete(null);
  };

  const handleToggleActive = async (itemId: string, currentActive: boolean) => {
    if (isCreateMode || !token) return;

    try {
      await updateVariantMutation({
        token,
        variantId: itemId as Id<"serviceVariants">,
        isActive: !currentActive,
      });
      onUpdate?.();
    } catch (err) {
      console.error("Erreur:", err);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between p-4 cursor-pointer",
          isCreateMode ? "bg-primary/5" : "bg-gray-50"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", isCreateMode ? "bg-primary/20" : "bg-primary/10")}>
            <Layers className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {isCreateMode ? "Formules" : "Formules / Variantes"}
            </h3>
            <p className="text-sm text-text-light">
              {displayItems.length} formule{displayItems.length > 1 ? "s" : ""}
              {isCreateMode && displayItems.length === 0 && (
                <span className="text-amber-600 ml-2">(au moins 1 requise)</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              resetForm();
              setIsAdding(true);
              setIsExpanded(true);
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </motion.button>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-text-light" />
          ) : (
            <ChevronDown className="w-5 h-5 text-text-light" />
          )}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Error message */}
            {error && (
              <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}

            {/* Form */}
            <AnimatePresence>
              {(isAdding || editingId) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 border-b border-gray-200 bg-primary/5"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium text-foreground">
                      {editingId ? "Modifier la formule" : "Nouvelle formule"}
                    </h4>
                    <button
                      onClick={resetForm}
                      className="p-1 text-text-light hover:text-foreground rounded"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Nom */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Nom de la formule
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: Standard, Premium..."
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Description (optionnel)
                      </label>
                      <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Description courte"
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>

                    {/* Prix horaire */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Prix horaire (€/h)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={formData.price || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                          }
                          step="0.5"
                          min="0"
                          placeholder="25"
                          className="w-full px-3 py-2 pr-12 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-light">€/h</span>
                      </div>
                    </div>

                    {/* Durée */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Durée (minutes)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={formData.duration || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })
                          }
                          min="15"
                          step="15"
                          placeholder="60"
                          className="w-full px-3 py-2 pr-10 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light" />
                      </div>
                    </div>

                    {/* Prix total calculé */}
                    {formData.price > 0 && formData.duration > 0 && (
                      <div className="col-span-2 p-3 bg-primary/10 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">Prix total de la prestation</span>
                          <span className="text-xl font-bold text-primary">
                            {((formData.price * formData.duration) / 60).toFixed(2).replace(".", ",")} €
                          </span>
                        </div>
                        <p className="text-xs text-text-light mt-1">
                          {formData.price.toFixed(2)} €/h × {formatDuration(formData.duration)} = {((formData.price * formData.duration) / 60).toFixed(2)} €
                        </p>
                      </div>
                    )}

                    {/* Prix conseillé - afficher uniquement si on a le token */}
                    {token && category && (
                      <div className="col-span-2">
                        <PriceRecommendationCompact
                          token={token}
                          category={category}
                          priceUnit="hour"
                          currentPrice={Math.round(formData.price * 100)}
                          onSelectPrice={(priceInCents) =>
                            setFormData({ ...formData, price: priceInCents / 100 })
                          }
                        />
                      </div>
                    )}

                    {/* Caractéristiques incluses */}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Caractéristiques incluses
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={newFeature}
                          onChange={(e) => setNewFeature(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddFeature())}
                          placeholder="Ajouter une caractéristique..."
                          className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <button
                          type="button"
                          onClick={handleAddFeature}
                          className="px-3 py-2 bg-gray-100 text-foreground rounded-lg hover:bg-gray-200"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      {formData.includedFeatures.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {formData.includedFeatures.map((feature, index) => (
                            <span
                              key={index}
                              className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-sm rounded-full"
                            >
                              {feature}
                              <button
                                type="button"
                                onClick={() => handleRemoveFeature(index)}
                                className="hover:text-red-500"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={resetForm}
                      className="px-4 py-2 text-text-light hover:text-foreground"
                    >
                      Annuler
                    </button>
                    <motion.button
                      onClick={handleSave}
                      disabled={!formData.name || formData.price <= 0 || !formData.duration || formData.duration <= 0 || saving}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      {editingId ? "Enregistrer" : "Ajouter"}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* List */}
            <div className="divide-y divide-gray-100">
              {displayItems.length === 0 ? (
                <div className="p-8 text-center">
                  <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-text-light">Aucune formule</p>
                  <p className="text-sm text-text-light">
                    {isCreateMode
                      ? "Ajoutez au moins une formule pour créer ce service"
                      : "Ajoutez des formules pour proposer différents tarifs"}
                  </p>
                </div>
              ) : (
                displayItems.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors",
                      !item.isActive && "opacity-50"
                    )}
                  >
                    <div className="text-text-light cursor-move">
                      <GripVertical className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-foreground">{item.name}</h4>
                        {!item.isActive && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs">
                            Inactif
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-sm text-text-light">
                        {/* Prix total calculé */}
                        {item.duration && item.duration > 0 ? (
                          <span className="font-semibold text-primary">
                            {((item.price / 100) * item.duration / 60).toFixed(2).replace(".", ",")} €
                            <span className="font-normal text-text-light ml-1">
                              ({formatPrice(item.price)}/h × {formatDuration(item.duration)})
                            </span>
                          </span>
                        ) : (
                          <span className="font-semibold text-primary">
                            {formatPrice(item.price)}/h
                          </span>
                        )}
                      </div>

                      {item.includedFeatures && item.includedFeatures.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.includedFeatures.map((feature, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-gray-100 text-xs text-text-light rounded-full"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(item)}
                        className="p-2 text-text-light hover:text-primary hover:bg-primary/10 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {!isCreateMode && (
                        <button
                          onClick={() => handleToggleActive(item.id, item.isActive)}
                          className={cn(
                            "p-2 rounded-lg",
                            item.isActive
                              ? "text-green-600 hover:bg-green-50"
                              : "text-text-light hover:bg-gray-100"
                          )}
                          title={item.isActive ? "Désactiver" : "Activer"}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => openDeleteModal(item.id, item.name)}
                        className="p-2 text-text-light hover:text-red-500 hover:bg-red-50 rounded-lg"
                        title={
                          isCreateMode || displayItems.length > 1
                            ? "Supprimer"
                            : "Impossible de supprimer la dernière formule"
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Supprimer cette formule"
        message={`Êtes-vous sûr de vouloir supprimer la formule "${itemToDelete?.name || ""}" ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
      />
    </div>
  );
}
