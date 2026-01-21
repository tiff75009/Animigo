"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
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
  allowedPriceUnits?: ("hour" | "day" | "week" | "month")[];
  allowOvernightStay?: boolean;
}

type PriceUnit = "hour" | "day" | "week" | "month" | "flat";

// Multi-tarification
interface Pricing {
  hourly?: number;
  daily?: number;
  weekly?: number;
  monthly?: number;
}

type ServiceLocation = "announcer_home" | "client_home" | "both";

interface Service {
  id: Id<"services">;
  category: string;
  animalTypes: string[];
  serviceLocation?: ServiceLocation;
  // Garde de nuit
  allowOvernightStay?: boolean;
  dayStartTime?: string;
  dayEndTime?: string;
  overnightPrice?: number;
  isActive: boolean;
  basePrice?: number;
  moderationStatus?: string;
  variants?: Array<{
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

const serviceLocationLabels: Record<ServiceLocation, { label: string; icon: "home" | "map" | "both"; color: string }> = {
  announcer_home: { label: "À mon domicile", icon: "home", color: "text-primary" },
  client_home: { label: "Au domicile du client", icon: "map", color: "text-secondary" },
  both: { label: "Domicile ou déplacement", icon: "both", color: "text-purple-600" },
};

// Helper pour extraire tous les prix d'un variant (multi-pricing ou fallback)
const getVariantPrices = (variant: NonNullable<Service["variants"]>[number]) => {
  const prices: { value: number; unit: string; label: string }[] = [];

  if (variant.pricing) {
    if (variant.pricing.hourly) {
      prices.push({ value: variant.pricing.hourly, unit: "hour", label: "/h" });
    }
    if (variant.pricing.daily) {
      prices.push({ value: variant.pricing.daily, unit: "day", label: "/jour" });
    }
    if (variant.pricing.weekly) {
      prices.push({ value: variant.pricing.weekly, unit: "week", label: "/sem" });
    }
    if (variant.pricing.monthly) {
      prices.push({ value: variant.pricing.monthly, unit: "month", label: "/mois" });
    }
  }

  // Fallback sur l'ancien système si pas de pricing
  if (prices.length === 0 && variant.price > 0) {
    prices.push({
      value: variant.price,
      unit: variant.priceUnit,
      label: priceUnitLabels[variant.priceUnit] || ""
    });
  }

  return prices;
};

// Helper pour obtenir le prix minimum d'un variant
const getMinPrice = (variant: NonNullable<Service["variants"]>[number]) => {
  const prices = getVariantPrices(variant);
  if (prices.length === 0) return null;
  return prices.reduce((min, p) => p.value < min.value ? p : min, prices[0]);
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

  // Get min price from all variants (including multi-pricing)
  const allMinPrices = activeVariants
    .map((v) => getMinPrice(v))
    .filter((p): p is NonNullable<typeof p> => p !== null);
  const globalMinPrice = allMinPrices.length > 0
    ? allMinPrices.reduce((min, p) => p.value < min.value ? p : min, allMinPrices[0])
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-white rounded-xl overflow-hidden transition-all shadow-sm",
        service.isActive
          ? "border border-foreground/10"
          : "border-2 border-red-200 bg-red-50/30"
      )}
    >
      {/* Header compact - clickable to toggle expand */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "px-3 py-2.5 cursor-pointer transition-colors",
          service.isActive
            ? "bg-gradient-to-r from-primary/5 via-secondary/5 to-purple/5 hover:from-primary/10 hover:via-secondary/10 hover:to-purple/10"
            : "bg-red-50 hover:bg-red-100/50"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0",
                service.isActive ? "bg-white shadow-sm" : "bg-red-100"
              )}
            >
              {categoryData?.icon || "✨"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground truncate">
                  {categoryData?.name || service.category}
                </h3>
                {service.isActive ? (
                  <span className="flex items-center gap-0.5 text-[10px] text-secondary font-medium px-1.5 py-0.5 bg-secondary/10 rounded">
                    <Check className="w-2.5 h-2.5" />
                    Actif
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 text-[10px] text-red-500 font-medium px-1.5 py-0.5 bg-red-100 rounded">
                    <AlertCircle className="w-2.5 h-2.5" />
                    Off
                  </span>
                )}
              </div>
              {/* Infos en ligne */}
              <div className="flex items-center gap-2 text-xs text-text-light mt-0.5">
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  {variantsCount} prestation{variantsCount > 1 ? "s" : ""}
                </span>
                {optionsCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    {optionsCount} option{optionsCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Prix & chevron */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {globalMinPrice && (
              <div className="text-right hidden sm:block">
                <div className="text-[10px] text-text-light">Dès</div>
                <div className="text-base font-bold text-primary">
                  {formatPrice(globalMinPrice.value)}
                  <span className="text-xs font-normal text-text-light">{globalMinPrice.label}</span>
                </div>
              </div>
            )}
            <div className={cn(
              "p-1.5 rounded-lg transition-colors",
              isExpanded ? "bg-primary/10 text-primary" : "bg-foreground/5 text-text-light"
            )}>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </div>
      </div>

      {/* Contenu - Preview OU Edit Mode */}
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          /* Mode Preview compact */
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-3 py-2.5 border-t border-foreground/5"
          >
            {/* Infos en ligne : Animaux + Lieu */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {/* Animaux */}
              {service.animalTypes.map((type) => {
                const Icon = animalIcons[type] || Star;
                return (
                  <div key={type} className="flex items-center gap-1 px-2 py-1 bg-foreground/5 rounded text-xs font-medium">
                    <Icon className="w-3 h-3 text-primary" />
                    {animalLabels[type] || type}
                  </div>
                );
              })}
              {/* Lieu */}
              {service.serviceLocation && (
                <div className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium",
                  service.serviceLocation === "announcer_home" && "bg-primary/10 text-primary",
                  service.serviceLocation === "client_home" && "bg-secondary/10 text-secondary",
                  service.serviceLocation === "both" && "bg-purple-100 text-purple-600"
                )}>
                  {service.serviceLocation === "announcer_home" && <><Home className="w-3 h-3" /> Domicile</>}
                  {service.serviceLocation === "client_home" && <><MapPin className="w-3 h-3" /> Déplacement</>}
                  {service.serviceLocation === "both" && <><Home className="w-3 h-3" /><MapPin className="w-3 h-3" /> Les deux</>}
                </div>
              )}
              {/* Garde de nuit */}
              {service.allowOvernightStay && (
                <div className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-600">
                  <Moon className="w-3 h-3" />
                  Nuit {service.overnightPrice && service.overnightPrice > 0 && `+${(service.overnightPrice / 100).toFixed(0)}€`}
                </div>
              )}
              {/* Horaires */}
              {service.dayStartTime && service.dayEndTime && (
                <div className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-amber-50 text-amber-600">
                  <Sun className="w-3 h-3" />
                  {service.dayStartTime.replace(":00", "h")} - {service.dayEndTime.replace(":00", "h")}
                </div>
              )}
            </div>

            {/* Prestations en ligne compacte */}
            {activeVariants.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {activeVariants.slice(0, 2).map((variant) => {
                  const variantPrices = getVariantPrices(variant);
                  return (
                    <div key={variant.id} className="flex items-center justify-between gap-2 p-2 bg-foreground/[0.02] rounded-lg border border-foreground/5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-sm text-foreground truncate">{variant.name}</span>
                        {variant.duration && (
                          <span className="text-[10px] text-text-light flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />{variant.duration}min
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {variantPrices.slice(0, 3).map((price, idx) => (
                          <span key={idx} className={cn(
                            "text-xs font-semibold px-1.5 py-0.5 rounded",
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
                  );
                })}
                {activeVariants.length > 2 && (
                  <div className="text-[10px] text-text-light text-center">
                    +{activeVariants.length - 2} autre{activeVariants.length - 2 > 1 ? "s" : ""} prestation{activeVariants.length - 2 > 1 ? "s" : ""}
                  </div>
                )}
              </div>
            )}

            {/* Options en ligne */}
            {activeOptions.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {activeOptions.slice(0, 4).map((option) => (
                  <span key={option.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] font-medium">
                    <Zap className="w-2.5 h-2.5" />
                    {option.name} +{formatPrice(option.price)}
                  </span>
                ))}
                {activeOptions.length > 4 && (
                  <span className="text-[10px] text-text-light">+{activeOptions.length - 4}</span>
                )}
              </div>
            )}

            {/* Actions compactes */}
            <div className="flex items-center gap-1.5 pt-2 border-t border-foreground/5">
              <motion.button
                onClick={() => setIsExpanded(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-primary/10 text-primary hover:bg-primary/20"
                whileTap={{ scale: 0.98 }}
              >
                <Edit2 className="w-3.5 h-3.5" />
                Modifier
              </motion.button>

              <motion.button
                onClick={onToggle}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  service.isActive ? "bg-secondary/10 text-secondary hover:bg-secondary/20" : "bg-red-100 text-red-600 hover:bg-red-200"
                )}
                whileTap={{ scale: 0.98 }}
              >
                {service.isActive ? <><ToggleRight className="w-3.5 h-3.5" /> Désactiver</> : <><ToggleLeft className="w-3.5 h-3.5" /> Activer</>}
              </motion.button>

              <motion.button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors ml-auto"
                whileTap={{ scale: 0.98 }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </motion.div>
        ) : (
          /* Mode Édition */
          <motion.div
            key="edit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="border-t border-foreground/10 bg-foreground/[0.02]"
          >
            <div className="p-4 space-y-4">
              {/* Header avec bouton fermer */}
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-primary" />
                  Modifier le service
                </h4>
                <motion.button
                  onClick={() => setIsExpanded(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground/5 text-foreground rounded-lg text-xs font-medium hover:bg-foreground/10 transition-colors"
                  whileTap={{ scale: 0.98 }}
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  Fermer
                </motion.button>
              </div>

              {/* Lieu de prestation */}
              <ServiceLocationEditor
                currentLocation={service.serviceLocation}
                serviceId={service.id}
                token={token}
              />

              {/* Horaires et garde de nuit - seulement si la catégorie le permet */}
              {categoryData?.allowOvernightStay && (
                <ServiceOvernightEditor
                  service={service}
                  serviceId={service.id}
                  token={token}
                />
              )}

              {/* Variant Manager */}
              <VariantManager
                mode="edit"
                serviceId={service.id}
                serviceName={categoryData?.name || service.category}
                variants={service.variants || []}
                billingType={categoryData?.billingType}
                allowedPriceUnits={categoryData?.allowedPriceUnits}
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

              {/* Actions en bas */}
              <div className="flex items-center gap-2 pt-3 border-t border-foreground/10">
                <motion.button
                  onClick={onToggle}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    service.isActive ? "bg-secondary/10 text-secondary hover:bg-secondary/20" : "bg-red-100 text-red-600 hover:bg-red-200"
                  )}
                  whileTap={{ scale: 0.98 }}
                >
                  {service.isActive ? <><ToggleRight className="w-3.5 h-3.5" /> Désactiver</> : <><ToggleLeft className="w-3.5 h-3.5" /> Activer</>}
                </motion.button>

                <motion.button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                  whileTap={{ scale: 0.98 }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Supprimer
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          onDelete();
          setShowDeleteModal(false);
        }}
        title="Supprimer ce service"
        message={`Êtes-vous sûr de vouloir supprimer le service "${categoryData?.name || service.category}" ? Cette action est irréversible et supprimera également toutes les prestations et options associées.`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
      />
    </motion.div>
  );
}

// Composant pour éditer le lieu de prestation
function ServiceLocationEditor({
  currentLocation,
  serviceId,
  token,
}: {
  currentLocation?: ServiceLocation;
  serviceId: Id<"services">;
  token: string;
}) {
  const [location, setLocation] = useState<ServiceLocation | undefined>(currentLocation);
  const [isSaving, setIsSaving] = useState(false);
  const updateService = useMutation(api.services.services.updateService);

  const handleLocationChange = async (newLocation: ServiceLocation) => {
    setLocation(newLocation);
    setIsSaving(true);
    try {
      await updateService({
        token,
        serviceId,
        serviceLocation: newLocation,
      });
    } catch (err) {
      console.error("Erreur:", err);
      setLocation(currentLocation); // Rollback
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-xs text-text-light font-medium uppercase tracking-wide">
        Lieu de prestation
      </div>
      <div className="grid grid-cols-3 gap-2">
        <motion.button
          type="button"
          onClick={() => handleLocationChange("announcer_home")}
          disabled={isSaving}
          className={cn(
            "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
            location === "announcer_home"
              ? "border-primary bg-primary/5"
              : "border-foreground/10 hover:border-foreground/20"
          )}
          whileTap={{ scale: 0.98 }}
        >
          <Home className={cn("w-5 h-5", location === "announcer_home" ? "text-primary" : "text-text-light")} />
          <span className="text-xs font-medium text-foreground">Mon domicile</span>
        </motion.button>

        <motion.button
          type="button"
          onClick={() => handleLocationChange("client_home")}
          disabled={isSaving}
          className={cn(
            "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
            location === "client_home"
              ? "border-secondary bg-secondary/5"
              : "border-foreground/10 hover:border-foreground/20"
          )}
          whileTap={{ scale: 0.98 }}
        >
          <MapPin className={cn("w-5 h-5", location === "client_home" ? "text-secondary" : "text-text-light")} />
          <span className="text-xs font-medium text-foreground">Chez le client</span>
        </motion.button>

        <motion.button
          type="button"
          onClick={() => handleLocationChange("both")}
          disabled={isSaving}
          className={cn(
            "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
            location === "both"
              ? "border-purple-500 bg-purple-50"
              : "border-foreground/10 hover:border-foreground/20"
          )}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex -space-x-1">
            <Home className={cn("w-4 h-4", location === "both" ? "text-purple-600" : "text-text-light")} />
            <MapPin className={cn("w-4 h-4", location === "both" ? "text-purple-600" : "text-text-light")} />
          </div>
          <span className="text-xs font-medium text-foreground">Les deux</span>
        </motion.button>
      </div>
    </div>
  );
}

// Composant pour éditer les horaires et la garde de nuit
function ServiceOvernightEditor({
  service,
  serviceId,
  token,
}: {
  service: Service;
  serviceId: Id<"services">;
  token: string;
}) {
  const [allowOvernightStay, setAllowOvernightStay] = useState(service.allowOvernightStay || false);
  const [dayStartTime, setDayStartTime] = useState(service.dayStartTime || "08:00");
  const [dayEndTime, setDayEndTime] = useState(service.dayEndTime || "20:00");
  const [overnightPrice, setOvernightPrice] = useState(service.overnightPrice ? service.overnightPrice / 100 : 0);
  const [isSaving, setIsSaving] = useState(false);
  const updateService = useMutation(api.services.services.updateService);

  const handleSave = async (updates: {
    allowOvernightStay?: boolean;
    dayStartTime?: string;
    dayEndTime?: string;
    overnightPrice?: number;
  }) => {
    setIsSaving(true);
    try {
      await updateService({
        token,
        serviceId,
        ...updates,
      });
    } catch (err) {
      console.error("Erreur:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-text-light font-medium uppercase tracking-wide flex items-center gap-2">
        <Moon className="w-3.5 h-3.5 text-indigo-500" />
        Horaires et garde de nuit
      </div>

      {/* Horaires de journée */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center gap-1">
            <Sun className="w-3 h-3 text-amber-500" />
            Début journée
          </label>
          <select
            value={dayStartTime}
            onChange={(e) => {
              setDayStartTime(e.target.value);
              handleSave({ dayStartTime: e.target.value });
            }}
            disabled={isSaving}
            className="w-full px-3 py-2 bg-white border border-foreground/10 rounded-lg text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          >
            {Array.from({ length: 24 }, (_, i) => {
              const hour = i.toString().padStart(2, "0");
              return (
                <option key={hour} value={`${hour}:00`}>
                  {hour}:00
                </option>
              );
            })}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center gap-1">
            <Moon className="w-3 h-3 text-indigo-500" />
            Fin journée
          </label>
          <select
            value={dayEndTime}
            onChange={(e) => {
              setDayEndTime(e.target.value);
              handleSave({ dayEndTime: e.target.value });
            }}
            disabled={isSaving}
            className="w-full px-3 py-2 bg-white border border-foreground/10 rounded-lg text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          >
            {Array.from({ length: 24 }, (_, i) => {
              const hour = i.toString().padStart(2, "0");
              return (
                <option key={hour} value={`${hour}:00`}>
                  {hour}:00
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Checkbox garde de nuit */}
      <label className="flex items-start gap-3 p-3 rounded-xl border border-foreground/10 hover:border-indigo-300 cursor-pointer transition-all">
        <input
          type="checkbox"
          checked={allowOvernightStay}
          onChange={(e) => {
            setAllowOvernightStay(e.target.checked);
            handleSave({ allowOvernightStay: e.target.checked });
          }}
          disabled={isSaving}
          className="mt-0.5 w-4 h-4 rounded border-foreground/20 text-indigo-500 focus:ring-indigo-500"
        />
        <div className="flex-1">
          <span className="font-medium text-sm text-foreground flex items-center gap-1.5">
            <Moon className="w-3.5 h-3.5 text-indigo-500" />
            J&apos;accepte la garde de nuit
          </span>
          <p className="text-[11px] text-text-light mt-0.5">
            L&apos;animal peut rester la nuit (de {dayEndTime.replace(":00", "h")} à {dayStartTime.replace(":00", "h")})
          </p>
        </div>
      </label>

      {/* Prix de la nuit */}
      {allowOvernightStay && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          <label className="block text-xs font-medium text-foreground mb-1.5">
            Prix de la nuit
          </label>
          <div className="relative w-40">
            <input
              type="number"
              value={overnightPrice || ""}
              onChange={(e) => setOvernightPrice(parseFloat(e.target.value) || 0)}
              onBlur={() => handleSave({ overnightPrice: Math.round(overnightPrice * 100) })}
              placeholder="20"
              step="0.50"
              min="0"
              disabled={isSaving}
              className="w-full px-3 py-2 pr-10 bg-white border border-foreground/10 rounded-lg text-sm text-foreground focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light text-sm">€</span>
          </div>
          <p className="text-[11px] text-text-light mt-1">
            Prix ajouté pour chaque nuit
          </p>
        </motion.div>
      )}
    </div>
  );
}
