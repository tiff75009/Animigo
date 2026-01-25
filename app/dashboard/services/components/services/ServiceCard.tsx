"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Edit2,
  Trash2,
  ChevronDown,
  Layers,
  Zap,
  AlertCircle,
  Clock,
  Dog,
  Cat,
  Bird,
  Rabbit,
  Fish,
  Star,
  Check,
  Home,
  MapPin,
  Moon,
  Sun,
  Plus,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  X,
  Loader2,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import ConfirmModal from "../shared/ConfirmModal";
import { PriceRecommendationCompact } from "../PriceRecommendationCompact";
import { cn } from "@/app/lib/utils";

interface ServiceCategory {
  slug: string;
  name: string;
  icon?: string;
  billingType?: "hourly" | "daily" | "flexible";
  allowedPriceUnits?: ("hour" | "day" | "week" | "month")[];
  allowOvernightStay?: boolean;
}

type PriceUnit = "hour" | "day" | "week" | "month" | "flat";

interface Pricing {
  hourly?: number;
  daily?: number;
  weekly?: number;
  monthly?: number;
  nightly?: number;
}

type ServiceLocation = "announcer_home" | "client_home" | "both";

interface Objective {
  icon: string;
  text: string;
}

interface Variant {
  id: Id<"serviceVariants">;
  name: string;
  description?: string;
  objectives?: Objective[];
  numberOfSessions?: number;
  price: number;
  priceUnit: PriceUnit;
  pricing?: Pricing;
  duration?: number;
  includedFeatures?: string[];
  order: number;
  isActive: boolean;
}

interface Option {
  id: Id<"serviceOptions">;
  name: string;
  description?: string;
  price: number;
  priceType: "flat" | "per_day" | "per_unit";
  unitLabel?: string;
  maxQuantity?: number;
  order: number;
  isActive: boolean;
}

interface Service {
  id: Id<"services">;
  category: string;
  animalTypes: string[];
  serviceLocation?: ServiceLocation;
  allowOvernightStay?: boolean;
  dayStartTime?: string;
  dayEndTime?: string;
  overnightPrice?: number;
  isActive: boolean;
  basePrice?: number;
  moderationStatus?: string;
  variants?: Variant[];
  options?: Option[];
}

interface ServiceCardProps {
  service: Service;
  categoryData?: ServiceCategory;
  token: string;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

const animalIcons: Record<string, React.ElementType> = {
  chien: Dog,
  chat: Cat,
  oiseau: Bird,
  rongeur: Rabbit,
  poisson: Fish,
  reptile: Star,
  nac: Star,
};

const animalLabels: Record<string, string> = {
  chien: "Chien",
  chat: "Chat",
  oiseau: "Oiseau",
  rongeur: "Rongeur",
  poisson: "Poisson",
  reptile: "Reptile",
  nac: "NAC",
};

const formatPrice = (cents: number) => {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
};

const getVariantPrices = (variant: Variant) => {
  const prices: { value: number; unit: string; label: string }[] = [];
  if (variant.pricing) {
    if (variant.pricing.hourly) prices.push({ value: variant.pricing.hourly, unit: "hour", label: "/h" });
    if (variant.pricing.daily) prices.push({ value: variant.pricing.daily, unit: "day", label: "/jour" });
    if (variant.pricing.weekly) prices.push({ value: variant.pricing.weekly, unit: "week", label: "/sem" });
    if (variant.pricing.monthly) prices.push({ value: variant.pricing.monthly, unit: "month", label: "/mois" });
  }
  if (prices.length === 0 && variant.price > 0) {
    const unitLabels: Record<string, string> = { hour: "/h", day: "/jour", week: "/sem", month: "/mois", flat: "" };
    prices.push({ value: variant.price, unit: variant.priceUnit, label: unitLabels[variant.priceUnit] || "" });
  }
  return prices;
};

const getMinPrice = (variant: Variant) => {
  const prices = getVariantPrices(variant);
  if (prices.length === 0) return null;
  return prices.reduce((min, p) => (p.value < min.value ? p : min), prices[0]);
};

export default function ServiceCard({
  service,
  categoryData,
  token,
  onToggle,
  onDelete,
}: ServiceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingSection, setEditingSection] = useState<"variants" | "options" | null>(null);

  const activeVariants = service.variants?.filter((v) => v.isActive) || [];
  const activeOptions = service.options?.filter((o) => o.isActive) || [];
  const variantsCount = service.variants?.length || 0;
  const optionsCount = service.options?.length || 0;

  const allMinPrices = activeVariants.map((v) => getMinPrice(v)).filter((p): p is NonNullable<typeof p> => p !== null);
  const globalMinPrice = allMinPrices.length > 0
    ? allMinPrices.reduce((min, p) => (p.value < min.value ? p : min), allMinPrices[0])
    : null;

  return (
    <motion.div
      layout
      className={cn(
        "bg-white rounded-2xl overflow-hidden transition-all",
        service.isActive
          ? "border border-foreground/10 shadow-sm hover:shadow-md"
          : "border-2 border-red-200 bg-red-50/30"
      )}
    >
      {/* Header - Always visible */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "p-4 cursor-pointer transition-colors",
          service.isActive
            ? "hover:bg-foreground/[0.02]"
            : "bg-red-50/50 hover:bg-red-50"
        )}
      >
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0",
              service.isActive
                ? "bg-gradient-to-br from-primary/10 to-secondary/10"
                : "bg-red-100"
            )}
          >
            {categoryData?.icon || "✨"}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-lg text-foreground truncate">
                {categoryData?.name || service.category}
              </h3>
              {service.isActive ? (
                <span className="flex items-center gap-1 text-xs text-secondary font-medium px-2 py-0.5 bg-secondary/10 rounded-full">
                  <Check className="w-3 h-3" />
                  Actif
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-red-500 font-medium px-2 py-0.5 bg-red-100 rounded-full">
                  <AlertCircle className="w-3 h-3" />
                  Inactif
                </span>
              )}
            </div>

            {/* Quick info */}
            <div className="flex flex-wrap items-center gap-2 text-sm text-text-light">
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                {variantsCount} formule{variantsCount > 1 ? "s" : ""}
              </span>
              {optionsCount > 0 && (
                <span className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  {optionsCount} option{optionsCount > 1 ? "s" : ""}
                </span>
              )}
              {service.serviceLocation && (
                <span className="flex items-center gap-1">
                  {service.serviceLocation === "announcer_home" && <Home className="w-3.5 h-3.5 text-primary" />}
                  {service.serviceLocation === "client_home" && <MapPin className="w-3.5 h-3.5 text-secondary" />}
                  {service.serviceLocation === "both" && (
                    <>
                      <Home className="w-3 h-3" />
                      <MapPin className="w-3 h-3" />
                    </>
                  )}
                </span>
              )}
              {service.allowOvernightStay && (
                <span className="flex items-center gap-1 text-indigo-500">
                  <Moon className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
          </div>

          {/* Price & Expand */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {globalMinPrice && (
              <div className="text-right hidden sm:block">
                <div className="text-xs text-text-light">Dès</div>
                <div className="text-xl font-bold text-primary">
                  {formatPrice(globalMinPrice.value)}
                  <span className="text-xs font-normal text-text-light">{globalMinPrice.label}</span>
                </div>
              </div>
            )}
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              className={cn(
                "p-2 rounded-xl transition-colors",
                isExpanded ? "bg-primary/10 text-primary" : "bg-foreground/5 text-text-light"
              )}
            >
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="border-t border-foreground/10">
              {/* Animals & Location */}
              <div className="p-4 bg-foreground/[0.02]">
                <div className="flex flex-wrap gap-2">
                  {service.animalTypes.map((type) => {
                    const Icon = animalIcons[type] || Star;
                    return (
                      <span key={type} className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full text-sm font-medium border border-foreground/10">
                        <Icon className="w-4 h-4 text-primary" />
                        {animalLabels[type] || type}
                      </span>
                    );
                  })}
                  {service.serviceLocation && (
                    <span className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
                      service.serviceLocation === "announcer_home" && "bg-primary/10 text-primary",
                      service.serviceLocation === "client_home" && "bg-secondary/10 text-secondary",
                      service.serviceLocation === "both" && "bg-purple-100 text-purple-600"
                    )}>
                      {service.serviceLocation === "announcer_home" && <><Home className="w-4 h-4" /> Mon domicile</>}
                      {service.serviceLocation === "client_home" && <><MapPin className="w-4 h-4" /> Déplacement</>}
                      {service.serviceLocation === "both" && <><Home className="w-3.5 h-3.5" /><MapPin className="w-3.5 h-3.5" /> Les deux</>}
                    </span>
                  )}
                  {service.allowOvernightStay && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-indigo-100 text-indigo-600">
                      <Moon className="w-4 h-4" />
                      Garde de nuit
                      {service.overnightPrice && service.overnightPrice > 0 && ` (+${formatPrice(service.overnightPrice)})`}
                    </span>
                  )}
                  {service.dayStartTime && service.dayEndTime && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-amber-50 text-amber-600">
                      <Sun className="w-4 h-4" />
                      {service.dayStartTime.replace(":00", "h")} - {service.dayEndTime.replace(":00", "h")}
                    </span>
                  )}
                </div>
              </div>

              {/* Variants Section */}
              <div className="p-4 border-t border-foreground/5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    Formules
                  </h4>
                  <button
                    onClick={() => setEditingSection(editingSection === "variants" ? null : "variants")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      editingSection === "variants"
                        ? "bg-primary text-white"
                        : "bg-primary/10 text-primary hover:bg-primary/20"
                    )}
                  >
                    {editingSection === "variants" ? (
                      <>
                        <X className="w-3.5 h-3.5" />
                        Fermer
                      </>
                    ) : (
                      <>
                        <Edit2 className="w-3.5 h-3.5" />
                        Gérer
                      </>
                    )}
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {editingSection === "variants" ? (
                    <motion.div
                      key="edit-variants"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <VariantEditor
                        serviceId={service.id}
                        variants={service.variants || []}
                        token={token}
                        categoryData={categoryData}
                        category={service.category}
                        allowOvernightStay={service.allowOvernightStay}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="preview-variants"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-2"
                    >
                      {activeVariants.length === 0 ? (
                        <div className="p-4 bg-amber-50 rounded-xl text-center">
                          <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                          <p className="text-sm text-amber-700">Aucune formule active</p>
                        </div>
                      ) : (
                        activeVariants.map((variant) => {
                          const prices = getVariantPrices(variant);
                          return (
                            <div
                              key={variant.id}
                              className="p-3 bg-foreground/[0.02] rounded-xl border border-foreground/5"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <Sparkles className="w-4 h-4 text-primary" />
                                  </div>
                                  <div className="min-w-0">
                                    <span className="font-medium text-foreground block truncate">{variant.name}</span>
                                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                      {variant.duration && (
                                        <span className="text-xs text-text-light flex items-center gap-1">
                                          <Clock className="w-3 h-3" />{variant.duration} min
                                        </span>
                                      )}
                                      {variant.numberOfSessions && variant.numberOfSessions > 1 && (
                                        <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full">
                                          {variant.numberOfSessions} séances
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {prices.slice(0, 2).map((price, idx) => (
                                    <span key={idx} className={cn(
                                      "text-xs font-bold px-2 py-1 rounded-lg",
                                      price.unit === "hour" && "bg-primary/10 text-primary",
                                      price.unit === "day" && "bg-secondary/10 text-secondary",
                                      price.unit === "week" && "bg-purple-100 text-purple-600",
                                      price.unit === "month" && "bg-amber-100 text-amber-600"
                                    )}>
                                      {formatPrice(price.value)}{price.label}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              {/* Description */}
                              {variant.description && (
                                <p className="text-xs text-text-light mt-2 pl-11 line-clamp-2">{variant.description}</p>
                              )}
                              {/* Objectifs */}
                              {variant.objectives && variant.objectives.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2 pl-11">
                                  {variant.objectives.map((objective, idx) => (
                                    <span key={idx} className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">
                                      <span>{objective.icon}</span>
                                      <span>{objective.text}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Options Section */}
              <div className="p-4 border-t border-foreground/5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Options
                    {optionsCount > 0 && (
                      <span className="text-xs font-normal text-text-light">({optionsCount})</span>
                    )}
                  </h4>
                  <button
                    onClick={() => setEditingSection(editingSection === "options" ? null : "options")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      editingSection === "options"
                        ? "bg-amber-500 text-white"
                        : "bg-amber-100 text-amber-600 hover:bg-amber-200"
                    )}
                  >
                    {editingSection === "options" ? (
                      <>
                        <X className="w-3.5 h-3.5" />
                        Fermer
                      </>
                    ) : (
                      <>
                        <Edit2 className="w-3.5 h-3.5" />
                        Gérer
                      </>
                    )}
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {editingSection === "options" ? (
                    <motion.div
                      key="edit-options"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <OptionEditor
                        serviceId={service.id}
                        options={service.options || []}
                        token={token}
                      />
                    </motion.div>
                  ) : activeOptions.length > 0 ? (
                    <motion.div
                      key="preview-options"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-wrap gap-2"
                    >
                      {activeOptions.map((option) => (
                        <span key={option.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm font-medium">
                          <Zap className="w-3.5 h-3.5" />
                          {option.name}
                          <span className="text-amber-500">+{formatPrice(option.price)}</span>
                        </span>
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty-options"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm text-text-light text-center py-2"
                    >
                      Aucune option - cliquez sur Gérer pour en ajouter
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-foreground/10 bg-foreground/[0.02]">
                <div className="flex items-center gap-2">
                  <motion.button
                    onClick={onToggle}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                      service.isActive
                        ? "bg-secondary/10 text-secondary hover:bg-secondary/20"
                        : "bg-primary/10 text-primary hover:bg-primary/20"
                    )}
                    whileTap={{ scale: 0.98 }}
                  >
                    {service.isActive ? (
                      <>
                        <ToggleRight className="w-4 h-4" />
                        Désactiver
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4" />
                        Activer
                      </>
                    )}
                  </motion.button>

                  <motion.button
                    onClick={() => setShowDeleteModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-500 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors ml-auto"
                    whileTap={{ scale: 0.98 }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          onDelete();
          setShowDeleteModal(false);
        }}
        title="Supprimer ce service"
        message={`Êtes-vous sûr de vouloir supprimer le service "${categoryData?.name || service.category}" ? Cette action supprimera également toutes les formules et options associées.`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
      />
    </motion.div>
  );
}

// ============================================================================
// Variant Editor Component
// ============================================================================

interface VariantEditorProps {
  serviceId: Id<"services">;
  variants: Variant[];
  token: string;
  categoryData?: ServiceCategory;
  category: string;
  allowOvernightStay?: boolean;
}

function VariantEditor({ serviceId, variants, token, categoryData, category, allowOvernightStay }: VariantEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<Id<"serviceVariants"> | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: Id<"serviceVariants">; name: string } | null>(null);

  const addVariantMutation = useMutation(api.services.variants.addVariant);
  const updateVariantMutation = useMutation(api.services.variants.updateVariant);
  const deleteVariantMutation = useMutation(api.services.variants.deleteVariant);

  // Get price recommendation
  const priceRecommendation = useQuery(
    api.services.pricing.getPriceRecommendation,
    token && category ? { token, category, priceUnit: "hour" } : "skip"
  );

  const recommendedPrice = priceRecommendation?.avgPrice || 2000;
  const isGardeService = categoryData?.allowOvernightStay === true;

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteVariantMutation({ token, variantId: itemToDelete.id });
    } catch (err) {
      console.error("Erreur:", err);
    }
    setDeleteModalOpen(false);
    setItemToDelete(null);
  };

  return (
    <div className="space-y-3">
      {/* Existing variants */}
      <AnimatePresence mode="popLayout">
        {variants.map((variant, index) => (
          <motion.div
            key={variant.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            {editingId === variant.id ? (
              <VariantEditForm
                variant={variant}
                token={token}
                category={category}
                recommendedPrice={recommendedPrice}
                isGardeService={isGardeService}
                allowOvernightStay={allowOvernightStay}
                allowedPriceUnits={categoryData?.allowedPriceUnits}
                onSave={async (data) => {
                  await updateVariantMutation({ token, variantId: variant.id, ...data });
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <VariantPreviewCard
                variant={variant}
                index={index}
                onEdit={() => setEditingId(variant.id)}
                onDelete={() => {
                  setItemToDelete({ id: variant.id, name: variant.name });
                  setDeleteModalOpen(true);
                }}
                canDelete={variants.length > 1}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add new variant */}
      <AnimatePresence>
        {isAdding ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <VariantAddForm
              serviceId={serviceId}
              token={token}
              category={category}
              recommendedPrice={recommendedPrice}
              isGardeService={isGardeService}
              allowOvernightStay={allowOvernightStay}
              allowedPriceUnits={categoryData?.allowedPriceUnits}
              existingCount={variants.length}
              onSave={async (data) => {
                await addVariantMutation({ token, serviceId, ...data });
                setIsAdding(false);
              }}
              onCancel={() => setIsAdding(false)}
            />
          </motion.div>
        ) : (
          <motion.button
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-primary/30 rounded-xl text-primary hover:bg-primary/5 hover:border-primary/50 transition-all"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Ajouter une formule</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Supprimer cette formule"
        message={`Êtes-vous sûr de vouloir supprimer "${itemToDelete?.name}" ?`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
      />
    </div>
  );
}

// Variant Preview Card
function VariantPreviewCard({
  variant,
  index,
  onEdit,
  onDelete,
  canDelete,
}: {
  variant: Variant;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const prices = getVariantPrices(variant);

  return (
    <div className={cn(
      "p-4 rounded-xl border-2 transition-all",
      variant.isActive
        ? "bg-white border-primary/20"
        : "bg-red-50/50 border-red-200"
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h5 className="font-semibold text-foreground truncate">{variant.name}</h5>
              {!variant.isActive && (
                <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full">Inactif</span>
              )}
            </div>
            {variant.description && (
              <p className="text-xs text-text-light mb-2 line-clamp-2">{variant.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {prices.map((price, idx) => (
                <span key={idx} className={cn(
                  "text-sm font-bold px-2.5 py-1 rounded-lg",
                  price.unit === "hour" && "bg-primary/10 text-primary",
                  price.unit === "day" && "bg-secondary/10 text-secondary",
                  price.unit === "week" && "bg-purple-100 text-purple-600",
                  price.unit === "month" && "bg-amber-100 text-amber-600"
                )}>
                  {formatPrice(price.value)}{price.label}
                </span>
              ))}
              {variant.pricing?.nightly && (
                <span className="text-sm font-bold px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-600">
                  {formatPrice(variant.pricing.nightly)}/nuit
                </span>
              )}
              {variant.numberOfSessions && variant.numberOfSessions > 1 && (
                <span className="text-sm font-bold px-2.5 py-1 rounded-lg bg-blue-100 text-blue-600">
                  {variant.numberOfSessions} séances
                </span>
              )}
              {variant.duration && (
                <span className="text-xs text-text-light flex items-center gap-1">
                  <Clock className="w-3 h-3" />{variant.duration} min
                </span>
              )}
            </div>
            {variant.objectives && variant.objectives.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {variant.objectives.map((objective, idx) => (
                  <span key={idx} className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">
                    <span>{objective.icon}</span>
                    <span>{objective.text}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
            title="Modifier"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          {canDelete && (
            <button
              onClick={onDelete}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Variant Edit Form
function VariantEditForm({
  variant,
  token,
  category,
  recommendedPrice,
  isGardeService,
  allowOvernightStay,
  allowedPriceUnits,
  onSave,
  onCancel,
}: {
  variant: Variant;
  token: string;
  category: string;
  recommendedPrice: number;
  isGardeService: boolean;
  allowOvernightStay?: boolean;
  allowedPriceUnits?: ("hour" | "day" | "week" | "month")[];
  onSave: (data: {
    name?: string;
    description?: string;
    objectives?: Objective[];
    numberOfSessions?: number;
    pricing?: Pricing;
    duration?: number;
    includedFeatures?: string[];
    isActive?: boolean;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(variant.name);
  const [description, setDescription] = useState(variant.description || "");
  const [objectives, setObjectives] = useState<Objective[]>(variant.objectives || []);
  const [newObjectiveIcon, setNewObjectiveIcon] = useState("🎯");
  const [newObjectiveText, setNewObjectiveText] = useState("");
  const [numberOfSessions, setNumberOfSessions] = useState(variant.numberOfSessions || 1);
  const [duration, setDuration] = useState(variant.duration || 60);
  const [isActive, setIsActive] = useState(variant.isActive);
  const [pricing, setPricing] = useState<Pricing>(variant.pricing || {});
  const [includedFeatures, setIncludedFeatures] = useState<string[]>(variant.includedFeatures || []);
  const [newFeature, setNewFeature] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const dailyPrice = pricing.daily || recommendedPrice * 8;
  const hourlyPrice = pricing.hourly || recommendedPrice;
  const nightlyPrice = pricing.nightly || Math.round(dailyPrice * 0.5);

  // Déterminer quels prix afficher selon allowedPriceUnits
  const showHourly = !allowedPriceUnits || allowedPriceUnits.includes("hour");
  const showDaily = !allowedPriceUnits || allowedPriceUnits.includes("day") || isGardeService;
  const showWeekly = allowedPriceUnits?.includes("week");
  const showMonthly = allowedPriceUnits?.includes("month");

  const handleAddObjective = () => {
    if (newObjectiveText.trim()) {
      setObjectives([...objectives, { icon: newObjectiveIcon, text: newObjectiveText.trim() }]);
      setNewObjectiveIcon("🎯");
      setNewObjectiveText("");
    }
  };

  const handleRemoveObjective = (index: number) => {
    setObjectives(objectives.filter((_, i) => i !== index));
  };

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      setIncludedFeatures([...includedFeatures, newFeature.trim()]);
      setNewFeature("");
    }
  };

  const handleRemoveFeature = (index: number) => {
    setIncludedFeatures(includedFeatures.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        name,
        description: description || undefined,
        objectives: objectives.length > 0 ? objectives : undefined,
        numberOfSessions: numberOfSessions > 1 ? numberOfSessions : undefined,
        pricing,
        duration,
        includedFeatures: includedFeatures.length > 0 ? includedFeatures : undefined,
        isActive,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 bg-primary/5 rounded-xl border-2 border-primary/20 space-y-4">
      <div className="flex items-center justify-between">
        <h5 className="font-semibold text-foreground flex items-center gap-2">
          <Edit2 className="w-4 h-4 text-primary" />
          Modifier la formule
        </h5>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-xs text-text-light">Active</span>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded border-foreground/20 text-primary focus:ring-primary"
          />
        </label>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Nom</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 bg-white border border-foreground/10 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Description (optionnel)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 bg-white border border-foreground/10 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
        />
      </div>

      {/* Objectifs */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Objectifs (optionnel)</label>
        <div className="flex gap-2 mb-2">
          <select
            value={newObjectiveIcon}
            onChange={(e) => setNewObjectiveIcon(e.target.value)}
            className="w-14 px-1 py-2 bg-white border border-foreground/10 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none text-center text-lg"
          >
            <option value="🎯">🎯</option>
            <option value="✅">✅</option>
            <option value="⭐">⭐</option>
            <option value="💪">💪</option>
            <option value="🐕">🐕</option>
            <option value="🐈">🐈</option>
            <option value="❤️">❤️</option>
            <option value="🏆">🏆</option>
            <option value="📈">📈</option>
            <option value="🔧">🔧</option>
            <option value="🧠">🧠</option>
            <option value="🎓">🎓</option>
          </select>
          <input
            type="text"
            value={newObjectiveText}
            onChange={(e) => setNewObjectiveText(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddObjective())}
            placeholder="Ajouter un objectif..."
            className="flex-1 px-3 py-2 bg-white border border-foreground/10 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          />
          <button
            type="button"
            onClick={handleAddObjective}
            className="px-3 py-2 bg-gray-100 text-foreground rounded-lg hover:bg-gray-200"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {objectives.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {objectives.map((objective, index) => (
              <span
                key={index}
                className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 text-sm rounded-full"
              >
                <span>{objective.icon}</span>
                <span>{objective.text}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveObjective(index)}
                  className="hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Duration & Nombre de séances */}
      <div className="flex gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Durée (minutes)</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
            min={30}
            step={30}
            className="w-24 px-3 py-2 bg-white border border-foreground/10 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Nombre de séances</label>
          <input
            type="number"
            value={numberOfSessions}
            onChange={(e) => setNumberOfSessions(Math.max(1, parseInt(e.target.value) || 1))}
            min={1}
            className="w-24 px-3 py-2 bg-white border border-foreground/10 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
      </div>

      {/* Pricing */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">Tarifs</label>

        {isGardeService ? (
          <>
            {/* Daily price */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs text-text-light mb-1">Prix par jour</label>
                <div className="relative">
                  <input
                    type="number"
                    value={(pricing.daily || dailyPrice) / 100}
                    onChange={(e) => {
                      const daily = Math.round(parseFloat(e.target.value) * 100) || 0;
                      const hourly = Math.round(daily / 8);
                      setPricing({ ...pricing, daily, hourly });
                    }}
                    step={0.5}
                    className="w-full px-3 py-2 pr-8 bg-white border border-foreground/10 rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light text-sm">€</span>
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-text-light mb-1">Prix par heure (auto)</label>
                <div className="px-3 py-2 bg-foreground/5 rounded-lg text-foreground">
                  {((pricing.hourly || hourlyPrice) / 100).toFixed(2)} €
                </div>
              </div>
            </div>

            {/* Nightly price */}
            {allowOvernightStay && (
              <div>
                <label className="block text-xs text-text-light mb-1">Prix par nuit</label>
                <div className="relative w-40">
                  <input
                    type="number"
                    value={(pricing.nightly || nightlyPrice) / 100}
                    onChange={(e) => setPricing({ ...pricing, nightly: Math.round(parseFloat(e.target.value) * 100) || 0 })}
                    step={0.5}
                    className="w-full px-3 py-2 pr-8 bg-white border border-indigo-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 text-sm">€</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {showHourly && (
              <div>
                <label className="block text-xs text-text-light mb-1">Par heure</label>
                <div className="relative">
                  <input
                    type="number"
                    value={(pricing.hourly || 0) / 100}
                    onChange={(e) => setPricing({ ...pricing, hourly: Math.round(parseFloat(e.target.value) * 100) || undefined })}
                    step={0.5}
                    placeholder="--"
                    className="w-full px-3 py-2 pr-8 bg-white border border-foreground/10 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light text-sm">€</span>
                </div>
              </div>
            )}
            {showDaily && (
              <div>
                <label className="block text-xs text-text-light mb-1">Par jour</label>
                <div className="relative">
                  <input
                    type="number"
                    value={(pricing.daily || 0) / 100}
                    onChange={(e) => setPricing({ ...pricing, daily: Math.round(parseFloat(e.target.value) * 100) || undefined })}
                    step={0.5}
                    placeholder="--"
                    className="w-full px-3 py-2 pr-8 bg-white border border-foreground/10 rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light text-sm">€</span>
                </div>
              </div>
            )}
            {showWeekly && (
              <div>
                <label className="block text-xs text-text-light mb-1">Par semaine</label>
                <div className="relative">
                  <input
                    type="number"
                    value={(pricing.weekly || 0) / 100}
                    onChange={(e) => setPricing({ ...pricing, weekly: Math.round(parseFloat(e.target.value) * 100) || undefined })}
                    step={0.5}
                    placeholder="--"
                    className="w-full px-3 py-2 pr-8 bg-white border border-purple-200 rounded-lg focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light text-sm">€</span>
                </div>
              </div>
            )}
            {showMonthly && (
              <div>
                <label className="block text-xs text-text-light mb-1">Par mois</label>
                <div className="relative">
                  <input
                    type="number"
                    value={(pricing.monthly || 0) / 100}
                    onChange={(e) => setPricing({ ...pricing, monthly: Math.round(parseFloat(e.target.value) * 100) || undefined })}
                    step={0.5}
                    placeholder="--"
                    className="w-full px-3 py-2 pr-8 bg-white border border-amber-200 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light text-sm">€</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Prix conseillé */}
        <PriceRecommendationCompact
          token={token}
          category={category}
          priceUnit={isGardeService ? "day" : (showHourly ? "hour" : "day")}
          currentPrice={isGardeService ? (pricing.daily || 0) : (showHourly ? (pricing.hourly || 0) : (pricing.daily || 0))}
          onSelectPrice={(price) => {
            if (isGardeService || !showHourly) {
              const hourly = Math.round(price / 8);
              setPricing({ ...pricing, daily: price, hourly });
            } else {
              setPricing({ ...pricing, hourly: price });
            }
          }}
        />
      </div>

      {/* Caractéristiques incluses */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Caractéristiques incluses</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newFeature}
            onChange={(e) => setNewFeature(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddFeature())}
            placeholder="Ajouter une caractéristique..."
            className="flex-1 px-3 py-2 bg-white border border-foreground/10 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          />
          <button
            type="button"
            onClick={handleAddFeature}
            className="px-3 py-2 bg-gray-100 text-foreground rounded-lg hover:bg-gray-200"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {includedFeatures.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {includedFeatures.map((feature, index) => (
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

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <motion.button
          onClick={handleSave}
          disabled={isSaving || !name}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium disabled:opacity-50"
          whileTap={{ scale: 0.98 }}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Enregistrer
        </motion.button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-text-light hover:text-foreground transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

// Variant Add Form
function VariantAddForm({
  serviceId,
  token,
  category,
  recommendedPrice,
  isGardeService,
  allowOvernightStay,
  allowedPriceUnits,
  existingCount,
  onSave,
  onCancel,
}: {
  serviceId: Id<"services">;
  token: string;
  category: string;
  recommendedPrice: number;
  isGardeService: boolean;
  allowOvernightStay?: boolean;
  allowedPriceUnits?: ("hour" | "day" | "week" | "month")[];
  existingCount: number;
  onSave: (data: {
    name: string;
    description?: string;
    objectives?: Objective[];
    numberOfSessions?: number;
    price: number;
    priceUnit: PriceUnit;
    pricing?: Pricing;
    duration?: number;
    includedFeatures?: string[];
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(`Formule ${existingCount + 1}`);
  const [description, setDescription] = useState("");
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [newObjectiveIcon, setNewObjectiveIcon] = useState("🎯");
  const [newObjectiveText, setNewObjectiveText] = useState("");
  const [numberOfSessions, setNumberOfSessions] = useState(1);
  const [duration, setDuration] = useState(60);
  const [includedFeatures, setIncludedFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const dailyPrice = recommendedPrice * 8;
  const hourlyPrice = recommendedPrice;
  const nightlyPrice = Math.round(dailyPrice * 0.5);

  const [pricing, setPricing] = useState<Pricing>(
    isGardeService
      ? { daily: dailyPrice, hourly: hourlyPrice, nightly: allowOvernightStay ? nightlyPrice : undefined }
      : { hourly: recommendedPrice }
  );

  // Déterminer quels prix afficher selon allowedPriceUnits
  const showHourly = !allowedPriceUnits || allowedPriceUnits.includes("hour");
  const showDaily = !allowedPriceUnits || allowedPriceUnits.includes("day") || isGardeService;
  const showWeekly = allowedPriceUnits?.includes("week");
  const showMonthly = allowedPriceUnits?.includes("month");

  const handleAddObjective = () => {
    if (newObjectiveText.trim()) {
      setObjectives([...objectives, { icon: newObjectiveIcon, text: newObjectiveText.trim() }]);
      setNewObjectiveIcon("🎯");
      setNewObjectiveText("");
    }
  };

  const handleRemoveObjective = (index: number) => {
    setObjectives(objectives.filter((_, i) => i !== index));
  };

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      setIncludedFeatures([...includedFeatures, newFeature.trim()]);
      setNewFeature("");
    }
  };

  const handleRemoveFeature = (index: number) => {
    setIncludedFeatures(includedFeatures.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const mainPrice = pricing.daily || pricing.hourly || recommendedPrice;
      await onSave({
        name,
        description: description || undefined,
        objectives: objectives.length > 0 ? objectives : undefined,
        numberOfSessions: numberOfSessions > 1 ? numberOfSessions : undefined,
        price: mainPrice,
        priceUnit: isGardeService || !showHourly ? "day" : "hour",
        pricing,
        duration,
        includedFeatures: includedFeatures.length > 0 ? includedFeatures : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 bg-secondary/5 rounded-xl border-2 border-secondary/20 space-y-4">
      <div className="flex items-center gap-2">
        <Plus className="w-4 h-4 text-secondary" />
        <h5 className="font-semibold text-foreground">Nouvelle formule</h5>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Nom</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 bg-white border border-foreground/10 rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Description (optionnel)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 bg-white border border-foreground/10 rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary outline-none resize-none"
        />
      </div>

      {/* Objectifs */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Objectifs (optionnel)</label>
        <div className="flex gap-2 mb-2">
          <select
            value={newObjectiveIcon}
            onChange={(e) => setNewObjectiveIcon(e.target.value)}
            className="w-14 px-1 py-2 bg-white border border-foreground/10 rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary outline-none text-center text-lg"
          >
            <option value="🎯">🎯</option>
            <option value="✅">✅</option>
            <option value="⭐">⭐</option>
            <option value="💪">💪</option>
            <option value="🐕">🐕</option>
            <option value="🐈">🐈</option>
            <option value="❤️">❤️</option>
            <option value="🏆">🏆</option>
            <option value="📈">📈</option>
            <option value="🔧">🔧</option>
            <option value="🧠">🧠</option>
            <option value="🎓">🎓</option>
          </select>
          <input
            type="text"
            value={newObjectiveText}
            onChange={(e) => setNewObjectiveText(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddObjective())}
            placeholder="Ajouter un objectif..."
            className="flex-1 px-3 py-2 bg-white border border-foreground/10 rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
          />
          <button
            type="button"
            onClick={handleAddObjective}
            className="px-3 py-2 bg-gray-100 text-foreground rounded-lg hover:bg-gray-200"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {objectives.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {objectives.map((objective, index) => (
              <span
                key={index}
                className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 text-sm rounded-full"
              >
                <span>{objective.icon}</span>
                <span>{objective.text}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveObjective(index)}
                  className="hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Duration & Nombre de séances */}
      <div className="flex gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Durée (minutes)</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
            min={30}
            step={30}
            className="w-24 px-3 py-2 bg-white border border-foreground/10 rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Nombre de séances</label>
          <input
            type="number"
            value={numberOfSessions}
            onChange={(e) => setNumberOfSessions(Math.max(1, parseInt(e.target.value) || 1))}
            min={1}
            className="w-24 px-3 py-2 bg-white border border-foreground/10 rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
          />
        </div>
      </div>

      {/* Pricing */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">Tarifs</label>

        {isGardeService ? (
          <>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs text-text-light mb-1">Prix par jour</label>
                <div className="relative">
                  <input
                    type="number"
                    value={(pricing.daily || dailyPrice) / 100}
                    onChange={(e) => {
                      const daily = Math.round(parseFloat(e.target.value) * 100) || 0;
                      const hourly = Math.round(daily / 8);
                      setPricing({ ...pricing, daily, hourly });
                    }}
                    step={0.5}
                    className="w-full px-3 py-2 pr-8 bg-white border border-foreground/10 rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light text-sm">€</span>
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-text-light mb-1">Prix par heure (auto)</label>
                <div className="px-3 py-2 bg-foreground/5 rounded-lg text-foreground">
                  {((pricing.hourly || hourlyPrice) / 100).toFixed(2)} €
                </div>
              </div>
            </div>

            {allowOvernightStay && (
              <div>
                <label className="block text-xs text-text-light mb-1">Prix par nuit</label>
                <div className="relative w-40">
                  <input
                    type="number"
                    value={(pricing.nightly || nightlyPrice) / 100}
                    onChange={(e) => setPricing({ ...pricing, nightly: Math.round(parseFloat(e.target.value) * 100) || 0 })}
                    step={0.5}
                    className="w-full px-3 py-2 pr-8 bg-white border border-indigo-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 text-sm">€</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {showHourly && (
              <div>
                <label className="block text-xs text-text-light mb-1">Par heure</label>
                <div className="relative">
                  <input
                    type="number"
                    value={(pricing.hourly || 0) / 100}
                    onChange={(e) => setPricing({ ...pricing, hourly: Math.round(parseFloat(e.target.value) * 100) || undefined })}
                    step={0.5}
                    placeholder="--"
                    className="w-full px-3 py-2 pr-8 bg-white border border-foreground/10 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light text-sm">€</span>
                </div>
              </div>
            )}
            {showDaily && (
              <div>
                <label className="block text-xs text-text-light mb-1">Par jour</label>
                <div className="relative">
                  <input
                    type="number"
                    value={(pricing.daily || 0) / 100}
                    onChange={(e) => setPricing({ ...pricing, daily: Math.round(parseFloat(e.target.value) * 100) || undefined })}
                    step={0.5}
                    placeholder="--"
                    className="w-full px-3 py-2 pr-8 bg-white border border-foreground/10 rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light text-sm">€</span>
                </div>
              </div>
            )}
            {showWeekly && (
              <div>
                <label className="block text-xs text-text-light mb-1">Par semaine</label>
                <div className="relative">
                  <input
                    type="number"
                    value={(pricing.weekly || 0) / 100}
                    onChange={(e) => setPricing({ ...pricing, weekly: Math.round(parseFloat(e.target.value) * 100) || undefined })}
                    step={0.5}
                    placeholder="--"
                    className="w-full px-3 py-2 pr-8 bg-white border border-purple-200 rounded-lg focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light text-sm">€</span>
                </div>
              </div>
            )}
            {showMonthly && (
              <div>
                <label className="block text-xs text-text-light mb-1">Par mois</label>
                <div className="relative">
                  <input
                    type="number"
                    value={(pricing.monthly || 0) / 100}
                    onChange={(e) => setPricing({ ...pricing, monthly: Math.round(parseFloat(e.target.value) * 100) || undefined })}
                    step={0.5}
                    placeholder="--"
                    className="w-full px-3 py-2 pr-8 bg-white border border-amber-200 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light text-sm">€</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Prix conseillé */}
        <PriceRecommendationCompact
          token={token}
          category={category}
          priceUnit={isGardeService ? "day" : (showHourly ? "hour" : "day")}
          currentPrice={isGardeService ? (pricing.daily || 0) : (showHourly ? (pricing.hourly || 0) : (pricing.daily || 0))}
          onSelectPrice={(price) => {
            if (isGardeService || !showHourly) {
              const hourly = Math.round(price / 8);
              setPricing({ ...pricing, daily: price, hourly });
            } else {
              setPricing({ ...pricing, hourly: price });
            }
          }}
        />
      </div>

      {/* Caractéristiques incluses */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Caractéristiques incluses</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newFeature}
            onChange={(e) => setNewFeature(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddFeature())}
            placeholder="Ajouter une caractéristique..."
            className="flex-1 px-3 py-2 bg-white border border-foreground/10 rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
          />
          <button
            type="button"
            onClick={handleAddFeature}
            className="px-3 py-2 bg-gray-100 text-foreground rounded-lg hover:bg-gray-200"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {includedFeatures.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {includedFeatures.map((feature, index) => (
              <span
                key={index}
                className="flex items-center gap-1 px-2 py-1 bg-secondary/10 text-secondary text-sm rounded-full"
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

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <motion.button
          onClick={handleSave}
          disabled={isSaving || !name}
          className="flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-xl font-medium disabled:opacity-50"
          whileTap={{ scale: 0.98 }}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Ajouter
        </motion.button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-text-light hover:text-foreground transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Option Editor Component
// ============================================================================

interface OptionEditorProps {
  serviceId: Id<"services">;
  options: Option[];
  token: string;
}

function OptionEditor({ serviceId, options, token }: OptionEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<Id<"serviceOptions"> | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: Id<"serviceOptions">; name: string } | null>(null);

  const addOptionMutation = useMutation(api.services.options.addOption);
  const updateOptionMutation = useMutation(api.services.options.updateOption);
  const deleteOptionMutation = useMutation(api.services.options.deleteOption);

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteOptionMutation({ token, optionId: itemToDelete.id });
    } catch (err) {
      console.error("Erreur:", err);
    }
    setDeleteModalOpen(false);
    setItemToDelete(null);
  };

  return (
    <div className="space-y-3">
      {/* Existing options */}
      <AnimatePresence mode="popLayout">
        {options.map((option) => (
          <motion.div
            key={option.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            {editingId === option.id ? (
              <OptionEditForm
                option={option}
                token={token}
                onSave={async (data) => {
                  await updateOptionMutation({ token, optionId: option.id, ...data });
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <OptionPreviewCard
                option={option}
                onEdit={() => setEditingId(option.id)}
                onDelete={() => {
                  setItemToDelete({ id: option.id, name: option.name });
                  setDeleteModalOpen(true);
                }}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add new option */}
      <AnimatePresence>
        {isAdding ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <OptionAddForm
              serviceId={serviceId}
              token={token}
              onSave={async (data) => {
                await addOptionMutation({ token, serviceId, ...data });
                setIsAdding(false);
              }}
              onCancel={() => setIsAdding(false)}
            />
          </motion.div>
        ) : (
          <motion.button
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-amber-300 rounded-xl text-amber-600 hover:bg-amber-50 hover:border-amber-400 transition-all"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Ajouter une option</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Supprimer cette option"
        message={`Êtes-vous sûr de vouloir supprimer "${itemToDelete?.name}" ?`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
      />
    </div>
  );
}

// Option Preview Card
function OptionPreviewCard({
  option,
  onEdit,
  onDelete,
}: {
  option: Option;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={cn(
      "p-3 rounded-xl border transition-all flex items-center justify-between",
      option.isActive
        ? "bg-amber-50/50 border-amber-200"
        : "bg-red-50/50 border-red-200"
    )}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-amber-600" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground truncate">{option.name}</span>
            {!option.isActive && (
              <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full">Inactif</span>
            )}
          </div>
          {option.description && (
            <p className="text-xs text-text-light truncate">{option.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-sm font-bold text-amber-600">+{formatPrice(option.price)}</span>
        <button
          onClick={onEdit}
          className="p-1.5 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Option Edit Form
function OptionEditForm({
  option,
  token,
  onSave,
  onCancel,
}: {
  option: Option;
  token: string;
  onSave: (data: {
    name?: string;
    description?: string;
    price?: number;
    priceType?: "flat" | "per_day" | "per_unit";
    isActive?: boolean;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(option.name);
  const [description, setDescription] = useState(option.description || "");
  const [price, setPrice] = useState(option.price / 100);
  const [priceType, setPriceType] = useState<"flat" | "per_day" | "per_unit">(option.priceType);
  const [isActive, setIsActive] = useState(option.isActive);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        name,
        description: description || undefined,
        price: Math.round(price * 100),
        priceType,
        isActive,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 bg-amber-50 rounded-xl border-2 border-amber-200 space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="font-semibold text-foreground flex items-center gap-2">
          <Edit2 className="w-4 h-4 text-amber-600" />
          Modifier l'option
        </h5>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-xs text-text-light">Active</span>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded border-foreground/20 text-amber-500 focus:ring-amber-500"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Nom</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-foreground/10 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Prix</label>
          <div className="relative">
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              step={0.5}
              className="w-full px-3 py-2 pr-8 bg-white border border-foreground/10 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light text-sm">€</span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Description (optionnel)</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 bg-white border border-foreground/10 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
        />
      </div>

      <div className="flex items-center gap-2 pt-2">
        <motion.button
          onClick={handleSave}
          disabled={isSaving || !name}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl font-medium disabled:opacity-50"
          whileTap={{ scale: 0.98 }}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Enregistrer
        </motion.button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-text-light hover:text-foreground transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

// Option Add Form
function OptionAddForm({
  serviceId,
  token,
  onSave,
  onCancel,
}: {
  serviceId: Id<"services">;
  token: string;
  onSave: (data: {
    name: string;
    description?: string;
    price: number;
    priceType: "flat" | "per_day" | "per_unit";
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(5);
  const [priceType, setPriceType] = useState<"flat" | "per_day" | "per_unit">("flat");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        name,
        description: description || undefined,
        price: Math.round(price * 100),
        priceType,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 bg-amber-50 rounded-xl border-2 border-amber-200 space-y-3">
      <div className="flex items-center gap-2">
        <Plus className="w-4 h-4 text-amber-600" />
        <h5 className="font-semibold text-foreground">Nouvelle option</h5>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Nom</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Promenade, Shampoing..."
            className="w-full px-3 py-2 bg-white border border-foreground/10 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Prix</label>
          <div className="relative">
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              step={0.5}
              className="w-full px-3 py-2 pr-8 bg-white border border-foreground/10 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light text-sm">€</span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Description (optionnel)</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Détails de l'option..."
          className="w-full px-3 py-2 bg-white border border-foreground/10 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
        />
      </div>

      <div className="flex items-center gap-2 pt-2">
        <motion.button
          onClick={handleSave}
          disabled={isSaving || !name}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl font-medium disabled:opacity-50"
          whileTap={{ scale: 0.98 }}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Ajouter
        </motion.button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-text-light hover:text-foreground transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
