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

// Multi-tarification par unité de temps
interface Pricing {
  hourly?: number;  // Prix à l'heure en centimes
  daily?: number;   // Prix à la journée en centimes
  weekly?: number;  // Prix à la semaine en centimes
  monthly?: number; // Prix au mois en centimes
  nightly?: number; // Prix de la nuit en centimes
}

// Variant pour le mode édition (avec ID backend)
interface Variant {
  id: Id<"serviceVariants">;
  name: string;
  description?: string;
  price: number;
  priceUnit: PriceUnit;
  pricing?: Pricing;
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
  pricing?: Pricing; // Multi-tarification
  duration?: number;
  includedFeatures?: string[];
  isFromDefault?: boolean; // Indique si c'est une formule par défaut
}

// Formule par défaut définie par l'admin
interface DefaultVariant {
  name: string;
  description?: string;
  suggestedDuration?: number;
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

  // Formules par défaut et restrictions
  defaultVariants?: DefaultVariant[];
  allowedPriceUnits?: ("hour" | "day" | "week" | "month")[];
  allowCustomVariants?: boolean; // Si false, ne peut utiliser que les formules par défaut

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

// Toutes les unités de prix disponibles
const ALL_PRICE_UNITS: { id: PriceUnit; label: string; shortLabel: string }[] = [
  { id: "hour", label: "par heure", shortLabel: "/h" },
  { id: "day", label: "par jour", shortLabel: "/jour" },
  { id: "week", label: "par semaine", shortLabel: "/sem" },
  { id: "month", label: "par mois", shortLabel: "/mois" },
  { id: "flat", label: "forfait", shortLabel: "forfait" },
];

// Helper pour obtenir les unités de prix autorisées selon la catégorie ou le billingType
const getComputedPriceUnits = (
  allowedPriceUnits?: ("hour" | "day" | "week" | "month")[],
  billingType?: BillingType
): { id: PriceUnit; label: string; shortLabel: string }[] => {
  // Si allowedPriceUnits est défini par la catégorie admin, l'utiliser
  if (allowedPriceUnits && allowedPriceUnits.length > 0) {
    return ALL_PRICE_UNITS.filter((u) => allowedPriceUnits.includes(u.id as "hour" | "day" | "week" | "month"));
  }

  // Sinon, utiliser le billingType comme fallback
  switch (billingType) {
    case "hourly":
      return ALL_PRICE_UNITS.filter((u) => u.id === "hour" || u.id === "flat");
    case "daily":
      return ALL_PRICE_UNITS.filter((u) => u.id !== "hour");
    case "flexible":
    default:
      return ALL_PRICE_UNITS;
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
  defaultVariants = [],
  allowedPriceUnits,
  allowCustomVariants = true,
}: VariantManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showDefaultVariants, setShowDefaultVariants] = useState(true);

  // Déterminer si on a des formules par défaut non encore ajoutées
  const hasDefaultVariants = defaultVariants.length > 0;
  const usedDefaultNames = localVariants.filter(v => v.isFromDefault).map(v => v.name);
  const availableDefaultVariants = defaultVariants.filter(dv => !usedDefaultNames.includes(dv.name));
  const canAddCustom = allowCustomVariants !== false;

  // Form state avec multi-pricing
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    priceUnit: "flat" as PriceUnit,
    // Multi-tarification: prix en euros (sera converti en centimes à la sauvegarde)
    pricing: {
      hourly: 0,
      daily: 0,
      weekly: 0,
      monthly: 0,
      nightly: 0,
    },
    duration: 60,
    includedFeatures: [] as string[],
  });
  const [newFeature, setNewFeature] = useState("");

  // Mutations (uniquement utilisées en mode edit)
  const addVariantMutation = useMutation(api.services.variants.addVariant);
  const updateVariantMutation = useMutation(api.services.variants.updateVariant);
  const deleteVariantMutation = useMutation(api.services.variants.deleteVariant);

  const computedPriceUnits = getComputedPriceUnits(allowedPriceUnits, billingType);
  const defaultPriceUnit = computedPriceUnits.length > 0 ? computedPriceUnits[0].id : "hour";
  const isCreateMode = mode === "create";

  // Déterminer les items à afficher selon le mode
  const displayItems = isCreateMode
    ? localVariants.map((v) => ({
        id: v.localId,
        name: v.name,
        description: v.description,
        price: v.price,
        priceUnit: v.priceUnit,
        pricing: v.pricing,
        duration: v.duration,
        includedFeatures: v.includedFeatures,
        isActive: true,
        isFromDefault: v.isFromDefault,
        needsPrice: !v.pricing || (!v.pricing.hourly && !v.pricing.daily && !v.pricing.weekly && !v.pricing.monthly),
      }))
    : variants.map((v) => ({
        id: v.id as string,
        name: v.name,
        description: v.description,
        price: v.price,
        priceUnit: v.priceUnit,
        pricing: v.pricing,
        duration: v.duration,
        includedFeatures: v.includedFeatures,
        isActive: v.isActive,
        isFromDefault: false,
        needsPrice: false,
      }));

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: 0,
      priceUnit: defaultPriceUnit,
      pricing: {
        hourly: 0,
        daily: 0,
        weekly: 0,
        monthly: 0,
        nightly: 0,
      },
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
      pricing: {
        hourly: item.pricing?.hourly ? item.pricing.hourly / 100 : 0,
        daily: item.pricing?.daily ? item.pricing.daily / 100 : 0,
        weekly: item.pricing?.weekly ? item.pricing.weekly / 100 : 0,
        monthly: item.pricing?.monthly ? item.pricing.monthly / 100 : 0,
        nightly: item.pricing?.nightly ? item.pricing.nightly / 100 : 0,
      },
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
    // Vérifier qu'au moins un prix est défini
    const hasAtLeastOnePrice =
      formData.pricing.hourly > 0 ||
      formData.pricing.daily > 0 ||
      formData.pricing.weekly > 0 ||
      formData.pricing.monthly > 0;

    if (!formData.name || !hasAtLeastOnePrice) return;

    setError(null);

    // Convertir les prix en centimes
    const pricingInCents: Pricing = {};
    if (formData.pricing.hourly > 0) pricingInCents.hourly = Math.round(formData.pricing.hourly * 100);
    if (formData.pricing.daily > 0) pricingInCents.daily = Math.round(formData.pricing.daily * 100);
    if (formData.pricing.weekly > 0) pricingInCents.weekly = Math.round(formData.pricing.weekly * 100);
    if (formData.pricing.monthly > 0) pricingInCents.monthly = Math.round(formData.pricing.monthly * 100);
    if (formData.pricing.nightly > 0) pricingInCents.nightly = Math.round(formData.pricing.nightly * 100);

    // Prix principal = premier prix non-nul (pour rétrocompatibilité)
    const mainPrice = pricingInCents.hourly || pricingInCents.daily || pricingInCents.weekly || pricingInCents.monthly || 0;
    const mainPriceUnit: PriceUnit = pricingInCents.hourly ? "hour" :
                                      pricingInCents.daily ? "day" :
                                      pricingInCents.weekly ? "week" :
                                      pricingInCents.monthly ? "month" : "hour";

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
                price: mainPrice,
                priceUnit: mainPriceUnit,
                pricing: pricingInCents,
                duration: formData.duration || undefined,
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
          price: mainPrice,
          priceUnit: mainPriceUnit,
          pricing: pricingInCents,
          duration: formData.duration || undefined,
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
            price: mainPrice,
            priceUnit: mainPriceUnit,
            pricing: pricingInCents,
            duration: formData.duration || undefined,
            includedFeatures:
              formData.includedFeatures.length > 0 ? formData.includedFeatures : undefined,
          });
        } else {
          await addVariantMutation({
            token,
            serviceId,
            name: formData.name,
            description: formData.description || undefined,
            price: mainPrice,
            priceUnit: mainPriceUnit,
            pricing: pricingInCents,
            duration: formData.duration || undefined,
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

  // Ajouter une formule depuis les formules par défaut
  const addFromDefault = (defaultVariant: DefaultVariant) => {
    const newVariant: LocalVariant = {
      localId: generateLocalId(),
      name: defaultVariant.name,
      description: defaultVariant.description || undefined,
      price: 0, // L'utilisateur doit définir le prix
      priceUnit: defaultPriceUnit, // Utiliser l'unité de prix par défaut de la catégorie
      pricing: {}, // L'utilisateur doit définir les prix
      duration: defaultVariant.suggestedDuration || undefined,
      includedFeatures: defaultVariant.includedFeatures || undefined,
      isFromDefault: true,
    };
    onLocalChange?.([...localVariants, newVariant]);
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
          {/* Bouton Ajouter uniquement si autorisé */}
          {(canAddCustom || availableDefaultVariants.length === 0) && (
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
          )}
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

            {/* Section formules par défaut disponibles */}
            {isCreateMode && hasDefaultVariants && availableDefaultVariants.length > 0 && (
              <div className="p-4 border-b border-gray-200 bg-purple-50/50">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-foreground flex items-center gap-2">
                      <Layers className="w-4 h-4 text-purple-500" />
                      Formules suggérées
                    </h4>
                    <p className="text-sm text-text-light mt-1">
                      Sélectionnez une formule et définissez votre tarif
                    </p>
                  </div>
                  {!canAddCustom && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                      Formules personnalisées non autorisées
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableDefaultVariants.map((dv, index) => (
                    <motion.button
                      key={index}
                      onClick={() => addFromDefault(dv)}
                      className="flex flex-col items-start p-4 bg-white border-2 border-purple-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all text-left"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Plus className="w-4 h-4 text-purple-500" />
                        <span className="font-medium text-foreground">{dv.name}</span>
                      </div>
                      {dv.description && (
                        <p className="text-sm text-text-light mb-2">{dv.description}</p>
                      )}
                      {dv.suggestedDuration && (
                        <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                          Durée suggérée: {dv.suggestedDuration} min
                        </span>
                      )}
                      {dv.includedFeatures && dv.includedFeatures.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {dv.includedFeatures.slice(0, 3).map((feature, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-gray-100 text-xs text-text-light rounded-full"
                            >
                              {feature}
                            </span>
                          ))}
                          {dv.includedFeatures.length > 3 && (
                            <span className="px-2 py-0.5 bg-gray-100 text-xs text-text-light rounded-full">
                              +{dv.includedFeatures.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
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

                    {/* Multi-tarification - un prix par unité autorisée */}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Tarification
                        <span className="text-text-light font-normal ml-2">(au moins un prix requis)</span>
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {/* Prix à l'heure */}
                        {computedPriceUnits.some(u => u.id === "hour") && (
                          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <label className="block text-xs text-text-light mb-1">Prix / heure</label>
                            <div className="relative">
                              <input
                                type="number"
                                value={formData.pricing.hourly || ""}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    pricing: { ...formData.pricing, hourly: parseFloat(e.target.value) || 0 }
                                  })
                                }
                                step="0.5"
                                min="0"
                                placeholder="15"
                                className="w-full px-3 py-2 pr-8 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-light">€</span>
                            </div>
                          </div>
                        )}

                        {/* Prix à la journée */}
                        {computedPriceUnits.some(u => u.id === "day") && (
                          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <label className="block text-xs text-text-light mb-1">Prix / jour</label>
                            <div className="relative">
                              <input
                                type="number"
                                value={formData.pricing.daily || ""}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    pricing: { ...formData.pricing, daily: parseFloat(e.target.value) || 0 }
                                  })
                                }
                                step="1"
                                min="0"
                                placeholder="80"
                                className="w-full px-3 py-2 pr-8 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-light">€</span>
                            </div>
                          </div>
                        )}

                        {/* Prix à la semaine */}
                        {computedPriceUnits.some(u => u.id === "week") && (
                          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <label className="block text-xs text-text-light mb-1">Prix / semaine</label>
                            <div className="relative">
                              <input
                                type="number"
                                value={formData.pricing.weekly || ""}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    pricing: { ...formData.pricing, weekly: parseFloat(e.target.value) || 0 }
                                  })
                                }
                                step="1"
                                min="0"
                                placeholder="400"
                                className="w-full px-3 py-2 pr-8 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-light">€</span>
                            </div>
                          </div>
                        )}

                        {/* Prix au mois */}
                        {computedPriceUnits.some(u => u.id === "month") && (
                          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <label className="block text-xs text-text-light mb-1">Prix / mois</label>
                            <div className="relative">
                              <input
                                type="number"
                                value={formData.pricing.monthly || ""}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    pricing: { ...formData.pricing, monthly: parseFloat(e.target.value) || 0 }
                                  })
                                }
                                step="1"
                                min="0"
                                placeholder="1200"
                                className="w-full px-3 py-2 pr-8 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-light">€</span>
                            </div>
                          </div>
                        )}

                        {/* Prix de la nuit (pour garde de nuit) */}
                        {computedPriceUnits.some(u => u.id === "day") && (
                          <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                            <label className="block text-xs text-indigo-600 mb-1">Prix / nuit</label>
                            <div className="relative">
                              <input
                                type="number"
                                value={formData.pricing.nightly || ""}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    pricing: { ...formData.pricing, nightly: parseFloat(e.target.value) || 0 }
                                  })
                                }
                                step="1"
                                min="0"
                                placeholder="20"
                                className="w-full px-3 py-2 pr-8 bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-light">€</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-text-light mt-2">
                        Définissez vos tarifs pour chaque durée de réservation possible. Le prix approprié sera utilisé lors de la réservation.
                      </p>
                    </div>

                    {/* Durée (optionnel) */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Durée estimée <span className="text-text-light font-normal">(optionnel)</span>
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

                    {/* Récapitulatif des prix définis */}
                    {(formData.pricing.hourly > 0 || formData.pricing.daily > 0 || formData.pricing.weekly > 0 || formData.pricing.monthly > 0 || formData.pricing.nightly > 0) && (
                      <div className="col-span-2 p-3 bg-primary/10 rounded-lg">
                        <span className="text-sm font-medium text-foreground">Récapitulatif des tarifs</span>
                        <div className="flex flex-wrap gap-3 mt-2">
                          {formData.pricing.hourly > 0 && (
                            <span className="px-3 py-1 bg-white rounded-full text-sm font-medium text-primary border border-primary/20">
                              {formData.pricing.hourly.toFixed(2).replace(".", ",")} €/h
                            </span>
                          )}
                          {formData.pricing.daily > 0 && (
                            <span className="px-3 py-1 bg-white rounded-full text-sm font-medium text-primary border border-primary/20">
                              {formData.pricing.daily.toFixed(2).replace(".", ",")} €/jour
                            </span>
                          )}
                          {formData.pricing.weekly > 0 && (
                            <span className="px-3 py-1 bg-white rounded-full text-sm font-medium text-primary border border-primary/20">
                              {formData.pricing.weekly.toFixed(2).replace(".", ",")} €/sem
                            </span>
                          )}
                          {formData.pricing.monthly > 0 && (
                            <span className="px-3 py-1 bg-white rounded-full text-sm font-medium text-primary border border-primary/20">
                              {formData.pricing.monthly.toFixed(2).replace(".", ",")} €/mois
                            </span>
                          )}
                          {formData.pricing.nightly > 0 && (
                            <span className="px-3 py-1 bg-white rounded-full text-sm font-medium text-indigo-600 border border-indigo-200">
                              {formData.pricing.nightly.toFixed(2).replace(".", ",")} €/nuit
                            </span>
                          )}
                        </div>
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
                      disabled={
                        !formData.name ||
                        !(formData.pricing.hourly > 0 || formData.pricing.daily > 0 || formData.pricing.weekly > 0 || formData.pricing.monthly > 0) ||
                        saving
                      }
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

                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        {/* Afficher tous les prix définis */}
                        {item.pricing?.hourly && (
                          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                            {formatPrice(item.pricing.hourly)}/h
                          </span>
                        )}
                        {item.pricing?.daily && (
                          <span className="px-2 py-0.5 bg-secondary/10 text-secondary rounded-full text-xs font-medium">
                            {formatPrice(item.pricing.daily)}/jour
                          </span>
                        )}
                        {item.pricing?.weekly && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-600 rounded-full text-xs font-medium">
                            {formatPrice(item.pricing.weekly)}/sem
                          </span>
                        )}
                        {item.pricing?.monthly && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full text-xs font-medium">
                            {formatPrice(item.pricing.monthly)}/mois
                          </span>
                        )}
                        {item.pricing?.nightly && (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full text-xs font-medium">
                            {formatPrice(item.pricing.nightly)}/nuit
                          </span>
                        )}
                        {/* Fallback: afficher l'ancien prix si pas de pricing */}
                        {!item.pricing?.hourly && !item.pricing?.daily && !item.pricing?.weekly && !item.pricing?.monthly && !item.pricing?.nightly && item.price > 0 && (
                          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                            {formatPrice(item.price)}{getPriceUnitLabel(item.priceUnit)}
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
