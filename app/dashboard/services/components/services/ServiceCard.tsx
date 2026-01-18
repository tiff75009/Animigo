"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
  Layers,
  Zap,
  Sparkles,
  AlertCircle,
  Clock,
  Dog,
  Cat,
  Bird,
  Rabbit,
  Fish,
  Star,
  Euro,
  Check,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import VariantManager from "../VariantManager";
import OptionManager from "../OptionManager";
import ConfirmModal from "../shared/ConfirmModal";
import { cn } from "@/app/lib/utils";

interface ServiceCategory {
  slug: string;
  name: string;
  icon?: string;
  billingType?: "hourly" | "daily" | "flexible";
}

interface Service {
  id: Id<"services">;
  category: string;
  animalTypes: string[];
  isActive: boolean;
  basePrice?: number;
  moderationStatus?: string;
  variants?: Array<{
    id: Id<"serviceVariants">;
    name: string;
    description?: string;
    price: number;
    priceUnit: string;
    duration?: number;
    includedFeatures?: string[];
    order: number;
    isActive: boolean;
  }>;
  options?: Array<{
    id: Id<"serviceOptions">;
    name: string;
    description?: string;
    price: number;
    priceType: "flat" | "per_day" | "per_unit";
    unitLabel?: string;
    maxQuantity?: number;
    order: number;
    isActive: boolean;
  }>;
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

const priceUnitLabels: Record<string, string> = {
  hour: "/heure",
  day: "/jour",
  week: "/semaine",
  month: "/mois",
  flat: "",
};

export default function ServiceCard({
  service,
  categoryData,
  token,
  onEdit,
  onToggle,
  onDelete,
}: ServiceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const variantsCount = service.variants?.length || 0;
  const optionsCount = service.options?.length || 0;
  const activeVariants = service.variants?.filter((v) => v.isActive) || [];
  const activeOptions = service.options?.filter((o) => o.isActive) || [];

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2).replace(".", ",") + " €";
  };

  // Get min and max prices from variants
  const prices = activeVariants.map((v) => v.price);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-white rounded-2xl overflow-hidden transition-all shadow-sm",
        service.isActive
          ? "border border-foreground/10"
          : "border-2 border-red-200 bg-red-50/30"
      )}
    >
      {/* Header with gradient - clickable to toggle expand */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "p-4 border-b cursor-pointer transition-colors",
          service.isActive
            ? "bg-gradient-to-r from-primary/5 via-secondary/5 to-purple/5 border-foreground/5 hover:from-primary/10 hover:via-secondary/10 hover:to-purple/10"
            : "bg-red-50 border-red-100 hover:bg-red-100/50"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center text-2xl",
                service.isActive ? "bg-white shadow-sm" : "bg-red-100"
              )}
            >
              {categoryData?.icon || "✨"}
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground">
                {categoryData?.name || service.category}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                {service.isActive ? (
                  <span className="flex items-center gap-1 text-xs text-secondary font-medium">
                    <Check className="w-3 h-3" />
                    Actif
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                    <AlertCircle className="w-3 h-3" />
                    Désactivé
                  </span>
                )}
                {service.moderationStatus === "pending" && (
                  <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                    <Clock className="w-3 h-3" />
                    En attente de modération
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Price Display & Expand indicator */}
          <div className="flex items-center gap-3">
            {minPrice > 0 && (
              <div className="text-right">
                <div className="text-xs text-text-light">À partir de</div>
                <div className="text-xl font-bold text-primary">
                  {formatPrice(minPrice)}
                  {activeVariants[0]?.priceUnit && (
                    <span className="text-sm font-normal text-text-light">
                      {priceUnitLabels[activeVariants[0].priceUnit] || ""}
                    </span>
                  )}
                </div>
              </div>
            )}
            <div
              className={cn(
                "p-2 rounded-lg transition-colors",
                isExpanded ? "bg-primary/10 text-primary" : "bg-foreground/5 text-text-light"
              )}
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        {/* Animal Types */}
        <div className="mb-4">
          <div className="text-xs text-text-light mb-2 font-medium uppercase tracking-wide">
            Animaux acceptés
          </div>
          <div className="flex flex-wrap gap-2">
            {service.animalTypes.map((type) => {
              const Icon = animalIcons[type] || Star;
              return (
                <div
                  key={type}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground/5 text-foreground rounded-lg text-sm font-medium"
                >
                  <Icon className="w-4 h-4 text-primary" />
                  {animalLabels[type] || type}
                </div>
              );
            })}
          </div>
        </div>

        {/* Variants Preview */}
        {activeVariants.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-text-light mb-2 font-medium uppercase tracking-wide">
              Formules disponibles
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {activeVariants.slice(0, 3).map((variant) => (
                <div
                  key={variant.id}
                  className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/10"
                >
                  <div>
                    <div className="font-medium text-foreground text-sm">
                      {variant.name}
                    </div>
                    {variant.includedFeatures && variant.includedFeatures.length > 0 && (
                      <div className="text-xs text-text-light mt-0.5">
                        {variant.includedFeatures.length} avantage{variant.includedFeatures.length > 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">
                      {formatPrice(variant.price)}
                    </div>
                    <div className="text-xs text-text-light">
                      {priceUnitLabels[variant.priceUnit] || ""}
                    </div>
                  </div>
                </div>
              ))}
              {activeVariants.length > 3 && (
                <div className="flex items-center justify-center p-3 bg-foreground/5 rounded-xl text-sm text-text-light">
                  +{activeVariants.length - 3} autre{activeVariants.length - 3 > 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Options Preview */}
        {activeOptions.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-text-light mb-2 font-medium uppercase tracking-wide">
              Options additionnelles
            </div>
            <div className="flex flex-wrap gap-2">
              {activeOptions.slice(0, 4).map((option) => (
                <div
                  key={option.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-sm border border-amber-100"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span className="font-medium">{option.name}</span>
                  <span className="text-amber-600">+{formatPrice(option.price)}</span>
                </div>
              ))}
              {activeOptions.length > 4 && (
                <div className="px-3 py-1.5 bg-foreground/5 rounded-lg text-sm text-text-light">
                  +{activeOptions.length - 4} autre{activeOptions.length - 4 > 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="flex flex-wrap items-center gap-2 mb-4 pt-3 border-t border-foreground/5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
            <Layers className="w-3.5 h-3.5" />
            {variantsCount} formule{variantsCount > 1 ? "s" : ""}
          </div>

          {optionsCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
              <Zap className="w-3.5 h-3.5" />
              {optionsCount} option{optionsCount > 1 ? "s" : ""}
            </div>
          )}

          {minPrice > 0 && maxPrice > minPrice && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/10 text-secondary rounded-full text-xs font-medium">
              <Euro className="w-3.5 h-3.5" />
              {formatPrice(minPrice)} - {formatPrice(maxPrice)}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <motion.button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors",
              isExpanded
                ? "bg-primary text-white"
                : "bg-primary/10 text-primary hover:bg-primary/20"
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Edit2 className="w-4 h-4" />
            {isExpanded ? "Fermer" : "Modifier"}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </motion.button>

          <motion.button
            onClick={onToggle}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors",
              service.isActive
                ? "bg-secondary/10 text-secondary hover:bg-secondary/20"
                : "bg-red-100 text-red-600 hover:bg-red-200"
            )}
            whileHover={{ scale: 1.02 }}
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
            className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-500 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Trash2 className="w-4 h-4" />
            Supprimer
          </motion.button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          onDelete();
          setShowDeleteModal(false);
        }}
        title="Supprimer ce service"
        message={`Êtes-vous sûr de vouloir supprimer le service "${categoryData?.name || service.category}" ? Cette action est irréversible et supprimera également toutes les formules et options associées.`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
      />

      {/* Expanded Section - Variants & Options */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-foreground/10 bg-foreground/[0.02]"
          >
            <div className="p-5 space-y-4">
              {/* Info Box */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-start gap-2 text-sm text-blue-700">
                  <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>
                    Gérez vos formules de prix et options additionnelles pour ce service.
                  </p>
                </div>
              </div>

              {/* Variant Manager */}
              <VariantManager
                mode="edit"
                serviceId={service.id}
                serviceName={categoryData?.name || service.category}
                variants={service.variants || []}
                billingType={categoryData?.billingType}
                category={service.category}
                token={token}
                onUpdate={() => {}}
              />

              {/* Option Manager */}
              <OptionManager
                mode="edit"
                serviceId={service.id}
                serviceName={categoryData?.name || service.category}
                options={service.options || []}
                token={token}
                onUpdate={() => {}}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
