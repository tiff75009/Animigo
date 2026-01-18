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
  Euro,
  Loader2,
  ChevronDown,
  ChevronUp,
  Zap,
  Hash,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import ConfirmModal from "./shared/ConfirmModal";

type PriceType = "flat" | "per_day" | "per_unit";

// Option pour le mode édition (avec ID backend)
interface Option {
  id: Id<"serviceOptions">;
  name: string;
  description?: string;
  price: number;
  priceType: PriceType;
  unitLabel?: string;
  maxQuantity?: number;
  order: number;
  isActive: boolean;
}

// Option locale pour le mode création (sans ID)
export interface LocalOption {
  localId: string;
  name: string;
  description?: string;
  price: number;
  priceType: PriceType;
  unitLabel?: string;
  maxQuantity?: number;
}

interface OptionManagerProps {
  // Mode édition (service existant)
  serviceId?: Id<"services">;
  options?: Option[];
  token?: string;
  onUpdate?: () => void;

  // Mode création (nouveau service)
  mode?: "edit" | "create";
  localOptions?: LocalOption[];
  onLocalChange?: (options: LocalOption[]) => void;

  // Commun
  serviceName: string;
}

// Générer un ID local unique
const generateLocalId = () => `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Helper pour formater le prix
const formatPrice = (cents: number) => {
  return (cents / 100).toFixed(2).replace(".", ",") + " \u20ac";
};

// Helper pour obtenir le label du type de prix
const getPriceTypeLabel = (type: PriceType, unitLabel?: string) => {
  switch (type) {
    case "flat":
      return "forfait";
    case "per_day":
      return unitLabel || "par jour";
    case "per_unit":
      return unitLabel || "par unité";
    default:
      return "";
  }
};

// Options de type de prix
const PRICE_TYPE_OPTIONS = [
  { id: "flat" as PriceType, label: "Forfait unique", description: "+X€ une seule fois" },
  { id: "per_day" as PriceType, label: "Par jour", description: "+X€ par jour de prestation" },
  { id: "per_unit" as PriceType, label: "Par unité", description: "+X€ par unité/occurrence" },
];

export default function OptionManager({
  serviceId,
  serviceName,
  options = [],
  token,
  onUpdate,
  mode = "edit",
  localOptions = [],
  onLocalChange,
}: OptionManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);

  const isCreateMode = mode === "create";

  // Déterminer les items à afficher selon le mode
  const displayItems = isCreateMode
    ? localOptions.map((o) => ({
        id: o.localId,
        name: o.name,
        description: o.description,
        price: o.price,
        priceType: o.priceType,
        unitLabel: o.unitLabel,
        maxQuantity: o.maxQuantity,
        isActive: true,
      }))
    : options.map((o) => ({
        id: o.id as string,
        name: o.name,
        description: o.description,
        price: o.price,
        priceType: o.priceType,
        unitLabel: o.unitLabel,
        maxQuantity: o.maxQuantity,
        isActive: o.isActive,
      }));

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    priceType: "flat" as PriceType,
    unitLabel: "",
    maxQuantity: undefined as number | undefined,
  });

  // Mutations
  const addOption = useMutation(api.services.options.addOption);
  const updateOption = useMutation(api.services.options.updateOption);
  const deleteOption = useMutation(api.services.options.deleteOption);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: 0,
      priceType: "flat",
      unitLabel: "",
      maxQuantity: undefined,
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const startEdit = (item: typeof displayItems[0]) => {
    setFormData({
      name: item.name,
      description: item.description || "",
      price: item.price / 100, // Convertir en euros pour l'édition
      priceType: item.priceType,
      unitLabel: item.unitLabel || "",
      maxQuantity: item.maxQuantity,
    });
    setEditingId(item.id);
    setIsAdding(false);
  };

  const handleSave = async () => {
    if (!formData.name || formData.price <= 0) return;

    const priceInCents = Math.round(formData.price * 100);

    if (isCreateMode) {
      // Mode création: modifier les options locales
      if (editingId) {
        // Modifier une option locale existante
        const updated = localOptions.map((o) =>
          o.localId === editingId
            ? {
                ...o,
                name: formData.name,
                description: formData.description || undefined,
                price: priceInCents,
                priceType: formData.priceType,
                unitLabel: formData.priceType !== "flat" ? formData.unitLabel || undefined : undefined,
                maxQuantity: formData.maxQuantity || undefined,
              }
            : o
        );
        onLocalChange?.(updated);
      } else {
        // Ajouter une nouvelle option locale
        const newOption: LocalOption = {
          localId: generateLocalId(),
          name: formData.name,
          description: formData.description || undefined,
          price: priceInCents,
          priceType: formData.priceType,
          unitLabel: formData.priceType !== "flat" ? formData.unitLabel || undefined : undefined,
          maxQuantity: formData.maxQuantity || undefined,
        };
        onLocalChange?.([...localOptions, newOption]);
      }
      resetForm();
    } else {
      // Mode édition: utiliser les mutations backend
      if (!token || !serviceId) return;

      setSaving(true);
      try {
        if (editingId) {
          await updateOption({
            token,
            optionId: editingId as Id<"serviceOptions">,
            name: formData.name,
            description: formData.description || undefined,
            price: priceInCents,
            priceType: formData.priceType,
            unitLabel: formData.priceType !== "flat" ? formData.unitLabel || undefined : undefined,
            maxQuantity: formData.maxQuantity || undefined,
          });
        } else {
          await addOption({
            token,
            serviceId,
            name: formData.name,
            description: formData.description || undefined,
            price: priceInCents,
            priceType: formData.priceType,
            unitLabel: formData.priceType !== "flat" ? formData.unitLabel || undefined : undefined,
            maxQuantity: formData.maxQuantity || undefined,
          });
        }
        resetForm();
        onUpdate?.();
      } catch (error) {
        console.error("Erreur:", error);
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

    if (isCreateMode) {
      // Mode création: filtrer les options locales
      const updated = localOptions.filter((o) => o.localId !== itemToDelete.id);
      onLocalChange?.(updated);
    } else {
      // Mode édition: utiliser la mutation backend
      if (!token) return;
      try {
        await deleteOption({ token, optionId: itemToDelete.id as Id<"serviceOptions"> });
        onUpdate?.();
      } catch (error) {
        console.error("Erreur:", error);
      }
    }

    setDeleteModalOpen(false);
    setItemToDelete(null);
  };

  const handleToggleActive = async (item: typeof displayItems[0]) => {
    // Cette fonction n'est disponible qu'en mode édition
    if (isCreateMode || !token) return;

    try {
      await updateOption({
        token,
        optionId: item.id as Id<"serviceOptions">,
        isActive: !item.isActive,
      });
      onUpdate?.();
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between p-4 cursor-pointer",
          isCreateMode ? "bg-amber-500/5" : "bg-gray-50"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Zap className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              Options additionnelles {isCreateMode && <span className="text-text-light font-normal">(optionnel)</span>}
            </h3>
            <p className="text-sm text-text-light">
              {displayItems.length} option{displayItems.length > 1 ? "s" : ""}
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
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
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
            {/* Form */}
            <AnimatePresence>
              {(isAdding || editingId) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 border-b border-gray-200 bg-amber-50/50"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium text-foreground">
                      {editingId ? "Modifier l'option" : "Nouvelle option"}
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
                        Nom de l'option
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: Shampoing anti-puces"
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      />
                    </div>

                    {/* Prix */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Prix
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
                          placeholder="0"
                          className="w-full px-3 py-2 pr-8 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />
                        <Euro className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light" />
                      </div>
                    </div>

                    {/* Type de facturation */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Type de facturation
                      </label>
                      <select
                        value={formData.priceType}
                        onChange={(e) =>
                          setFormData({ ...formData, priceType: e.target.value as PriceType })
                        }
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      >
                        {PRICE_TYPE_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-text-light mt-1">
                        {PRICE_TYPE_OPTIONS.find((o) => o.id === formData.priceType)?.description}
                      </p>
                    </div>

                    {/* Label unité (si per_day ou per_unit) */}
                    {formData.priceType !== "flat" && (
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Label de l'unité
                        </label>
                        <input
                          type="text"
                          value={formData.unitLabel}
                          onChange={(e) => setFormData({ ...formData, unitLabel: e.target.value })}
                          placeholder={
                            formData.priceType === "per_day" ? "par jour" : "par promenade"
                          }
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />
                      </div>
                    )}

                    {/* Quantité max (si per_unit) */}
                    {formData.priceType === "per_unit" && (
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Quantité max (optionnel)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={formData.maxQuantity || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                maxQuantity: e.target.value ? parseInt(e.target.value) : undefined,
                              })
                            }
                            min="1"
                            placeholder="Illimité"
                            className="w-full px-3 py-2 pr-10 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                          />
                          <Hash className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light" />
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    <div className={formData.priceType === "flat" ? "col-span-2" : ""}>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Description (optionnel)
                      </label>
                      <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Description courte de l'option"
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      />
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
                      disabled={!formData.name || formData.price <= 0 || saving}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg disabled:opacity-50"
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
                  <Zap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-text-light">Aucune option</p>
                  <p className="text-sm text-text-light">
                    {isCreateMode
                      ? "Ajoutez des options payantes pour enrichir votre offre (facultatif)"
                      : "Ajoutez des options pour proposer des extras payants"}
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
                        <span className="font-semibold text-amber-600">
                          +{formatPrice(item.price)}{" "}
                          <span className="font-normal text-text-light">
                            ({getPriceTypeLabel(item.priceType, item.unitLabel)})
                          </span>
                        </span>
                        {item.maxQuantity && (
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                            Max: {item.maxQuantity}
                          </span>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-sm text-text-light mt-1">{item.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(item)}
                        className="p-2 text-text-light hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {/* Toggle actif/inactif - seulement en mode édition */}
                      {!isCreateMode && (
                        <button
                          onClick={() => handleToggleActive(item)}
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
        title="Supprimer cette option"
        message={`Êtes-vous sûr de vouloir supprimer l'option "${itemToDelete?.name || ""}" ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
      />
    </div>
  );
}
