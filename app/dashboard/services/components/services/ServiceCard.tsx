"use client";

const DEFAULT_VAT_RATE = 20;

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getContactInfoWarning } from "@/app/lib/contentFilter";
import { useContactInfoCheck } from "@/app/hooks/useContactInfoCheck";

// Composant : message d'avertissement quand un téléphone/email est détecté.
// Utilise le hook qui combine regex (instant) + Gemini (debounce 1s) pour
// catcher les contournements créatifs (numéros écrits en lettres, etc.).
function ContactInfoWarning({ text }: { text: string }) {
  const check = useContactInfoCheck(text);
  if (!check.hasViolation) {
    if (check.isCheckingGemini) {
      return (
        <p className="mt-1.5 text-[11.5px] flex items-center gap-1.5 px-2.5 py-1 rounded-md"
          style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" }}
        >
          <Loader2 className="w-3 h-3 flex-shrink-0 animate-spin" />
          <span>Analyse IA en cours...</span>
        </p>
      );
    }
    return null;
  }
  return (
    <p className="mt-1.5 text-[12px] flex items-start gap-1.5 px-2.5 py-1.5 rounded-md"
      style={{ background: "#fdf0f0", color: "#8a3a3a", border: "1px solid #f1cdcd" }}
    >
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
      <span>
        {check.message}
        {check.source === "gemini" && (
          <span className="ml-1 text-[10px] font-semibold opacity-70">(détecté par l&apos;IA)</span>
        )}
      </span>
    </p>
  );
}
import {
  Edit2,
  Trash2,
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
  Plus,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  X,
  Loader2,
  User,
  Users,
  Calendar,
  CalendarPlus,
  Phone,
  ArrowRight,
  Eye,
  EyeOff,
  FileCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import ConfirmModal from "../shared/ConfirmModal";
import { PriceRecommendationCompact } from "../PriceRecommendationCompact";
import CollectiveSlotsManager from "../CollectiveSlotsManager";
import { cn } from "@/app/lib/utils";
import { Tooltip } from "@/app/components/ui/tooltip";
import { useAuth } from "@/app/hooks/useAuth";
import { ServicePhotosUploader } from "./ServicePhotosUploader";
import { ServiceCardPreview } from "./ServiceCardPreview";
import type { LocalVariant } from "../VariantManager";

interface ServiceCategory {
  slug: string;
  name: string;
  icon?: string;
  billingType?: "hourly" | "daily" | "flexible";
  allowedPriceUnits?: ("hour" | "half_day" | "day" | "week" | "month")[];
  allowOvernightStay?: boolean;
  allowRangeBooking?: boolean;
  announcerPriceMode?: "manual" | "automatic";
  defaultNightlyPrice?: number; // Prix supplément nuit conseillé en centimes
  displayPriceUnit?: "hour" | "half_day" | "day" | "week" | "month"; // Unité de prix à afficher
}

type PriceUnit = "hour" | "half_day" | "day" | "week" | "month" | "flat";

interface Pricing {
  hourly?: number;
  halfDaily?: number;
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
  sessionInterval?: number; // Délai en jours entre chaque séance
  sessionType?: "individual" | "collective";
  maxAnimalsPerSession?: number;
  serviceLocation?: ServiceLocation; // Lieu de prestation
  animalTypes?: string[]; // Animaux acceptés
  // Restrictions chiens (au niveau de la service)
  dogCategoryAcceptance?: "none" | "cat1" | "cat2" | "both";
  acceptedDogSizes?: ("small" | "medium" | "large")[];
  price: number;
  priceUnit: PriceUnit;
  pricing?: Pricing;
  duration?: number;
  includedFeatures?: string[];
  order: number;
  isActive: boolean;
  needsSlotConfiguration?: boolean; // true si service collective sans créneaux
  slotsCount?: number; // Nombre de créneaux futurs configurés
  isSapEligible?: boolean;
  photos?: Array<{
    url: string;
    order: number;
    moderationStatus?: "pending" | "approved" | "rejected";
    rejectionReason?: string;
  }>;
}

interface Option {
  id: Id<"serviceOptions">;
  variantId?: Id<"serviceVariants">; // ID du service lié (undefined = option partagée)
  name: string;
  description?: string;
  price: number;
  priceType: "flat" | "per_day" | "per_unit";
  unitLabel?: string;
  maxQuantity?: number;
  order: number;
  isActive: boolean;
}

type DogCategoryAcceptance = "none" | "cat1" | "cat2" | "both";

interface Service {
  id: Id<"services">;
  category: string;
  animalTypes: string[];
  serviceLocation?: ServiceLocation;
  allowOvernightStay?: boolean;
  dayStartTime?: string;
  dayEndTime?: string;
  overnightPrice?: number;
  dogCategoryAcceptance?: DogCategoryAcceptance;
  isSapEligible?: boolean;
  isActive: boolean;
  basePrice?: number;
  moderationStatus?: string;
  variants?: Variant[];
  options?: Option[];
}

interface ServiceCardProps {
  service: Service;
  filteredVariants?: Variant[];
  categoryData?: ServiceCategory;
  token: string;
  viewMode?: "grid" | "list";
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  phoneVerified?: boolean;
  isSapApproved?: boolean;
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

const UNIT_LABELS: Record<string, string> = {
  hour: "/h",
  half_day: "/demi-j",
  day: "/jour",
  week: "/sem",
  month: "/mois",
  nightly: "/nuit",
  flat: ""
};

const getVariantPrices = (variant: Variant, allowedPriceUnits?: string[], allowOvernightStay?: boolean) => {
  const prices: { value: number; unit: string; label: string }[] = [];

  if (variant.pricing) {
    // Collecter tous les prix disponibles
    const availablePrices: { value: number; unit: string; label: string }[] = [];
    if (variant.pricing.hourly) availablePrices.push({ value: variant.pricing.hourly, unit: "hour", label: UNIT_LABELS.hour });
    if (variant.pricing.halfDaily) availablePrices.push({ value: variant.pricing.halfDaily, unit: "half_day", label: UNIT_LABELS.half_day });
    if (variant.pricing.daily) availablePrices.push({ value: variant.pricing.daily, unit: "day", label: UNIT_LABELS.day });
    if (variant.pricing.weekly) availablePrices.push({ value: variant.pricing.weekly, unit: "week", label: UNIT_LABELS.week });
    if (variant.pricing.monthly) availablePrices.push({ value: variant.pricing.monthly, unit: "month", label: UNIT_LABELS.month });
    if (variant.pricing.nightly && allowOvernightStay) availablePrices.push({ value: variant.pricing.nightly, unit: "nightly", label: UNIT_LABELS.nightly });

    // Si allowedPriceUnits est défini, trier selon cet ordre
    if (allowedPriceUnits && allowedPriceUnits.length > 0) {
      for (const unit of allowedPriceUnits) {
        const found = availablePrices.find(p => p.unit === unit);
        if (found) prices.push(found);
      }
      // Ajouter nightly à la fin si présent et non dans allowedPriceUnits
      const nightlyPrice = availablePrices.find(p => p.unit === "nightly");
      if (nightlyPrice && !prices.find(p => p.unit === "nightly")) {
        prices.push(nightlyPrice);
      }
    } else {
      prices.push(...availablePrices);
    }
  }

  if (prices.length === 0 && variant.price > 0) {
    prices.push({ value: variant.price, unit: variant.priceUnit, label: UNIT_LABELS[variant.priceUnit] || "" });
  }
  return prices;
};

const getMinPrice = (variant: Variant, allowedPriceUnits?: string[], allowOvernightStay?: boolean) => {
  const prices = getVariantPrices(variant, allowedPriceUnits, allowOvernightStay);
  if (prices.length === 0) return null;
  // Retourner le premier prix (celui avec la plus haute priorité selon allowedPriceUnits)
  // plutôt que le prix minimum, pour refléter le prix de référence configuré
  return prices[0];
};

const getPrimaryPrice = (variant: Variant, allowedPriceUnits?: string[], allowOvernightStay?: boolean, displayPriceUnit?: string) => {
  const prices = getVariantPrices(variant, allowedPriceUnits, allowOvernightStay);
  if (prices.length === 0) return null;

  // Si displayPriceUnit est défini, chercher ce prix en priorité
  if (displayPriceUnit) {
    const displayPrice = prices.find(p => p.unit === displayPriceUnit);
    if (displayPrice) return displayPrice;

    // Si le prix exact n'existe pas, essayer de le calculer depuis un autre prix
    const pricing = variant.pricing;
    if (pricing) {
      let calculatedPrice: number | null = null;

      // Essayer de calculer le prix demandé à partir du prix journalier ou horaire
      if (displayPriceUnit === "day" && pricing.hourly) {
        calculatedPrice = pricing.hourly * 8; // 8h = 1 jour
      } else if (displayPriceUnit === "hour" && pricing.daily) {
        calculatedPrice = Math.round(pricing.daily / 8);
      } else if (displayPriceUnit === "half_day" && pricing.daily) {
        calculatedPrice = Math.round(pricing.daily / 2);
      } else if (displayPriceUnit === "half_day" && pricing.hourly) {
        calculatedPrice = pricing.hourly * 4; // 4h = demi-journée
      } else if (displayPriceUnit === "week" && pricing.daily) {
        calculatedPrice = pricing.daily * 5; // 5 jours = 1 semaine
      } else if (displayPriceUnit === "month" && pricing.daily) {
        calculatedPrice = pricing.daily * 20; // 20 jours = 1 mois
      }

      if (calculatedPrice !== null) {
        return { value: calculatedPrice, unit: displayPriceUnit, label: UNIT_LABELS[displayPriceUnit] || "" };
      }
    }
  }

  // Sinon, retourner le premier prix selon l'ordre de priorité des allowedPriceUnits
  return prices[0];
};

export default function ServiceCard({
  service,
  filteredVariants,
  categoryData,
  token,
  viewMode = "grid",
  onToggle,
  onDelete,
  phoneVerified,
  isSapApproved,
}: ServiceCardProps) {
  const { user } = useAuth();
  const isVatSubject = user?.isVatSubject;
  const companyType = user?.companyType;
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [editingSection, setEditingSection] = useState<"variants" | "options" | null>(null);
  const [managingSlotsVariant, setManagingSlotsVariant] = useState<Variant | null>(null);
  const [editingVariantId, setEditingVariantId] = useState<Id<"serviceVariants"> | null>(null);
  const [isAddingVariant, setIsAddingVariant] = useState(false);
  const [editingOptionId, setEditingOptionId] = useState<Id<"serviceOptions"> | null>(null);
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [togglingVariantId, setTogglingVariantId] = useState<Id<"serviceVariants"> | null>(null);
  const toggleVariantMutation = useMutation(api.services.variants.updateVariant);

  // Utiliser filteredVariants si fourni, sinon toutes les variants
  const displayVariants = filteredVariants || service.variants || [];
  const activeVariants = displayVariants.filter((v) => v.isActive);
  const activeOptions = service.options?.filter((o) => o.isActive) || [];
  const variantsCount = displayVariants.length;
  const optionsCount = service.options?.length || 0;

  const allowedPriceUnits = categoryData?.allowedPriceUnits;
  const allowOvernightStay = categoryData?.allowOvernightStay;
  const displayPriceUnit = categoryData?.displayPriceUnit;

  const allPrimaryPrices = activeVariants.map((v) => getPrimaryPrice(v, allowedPriceUnits, allowOvernightStay, displayPriceUnit)).filter((p): p is NonNullable<typeof p> => p !== null);
  const globalMinPrice = allPrimaryPrices.length > 0
    ? allPrimaryPrices.reduce((min, p) => (p.value < min.value ? p : min), allPrimaryPrices[0])
    : null;

  const handleToggleVariant = async (variantId: Id<"serviceVariants">, currentlyActive: boolean) => {
    setTogglingVariantId(variantId);
    try {
      await toggleVariantMutation({ token, variantId, isActive: !currentlyActive });
    } catch (err) {
      console.error("Erreur toggle variante:", err);
    } finally {
      setTogglingVariantId(null);
    }
  };

  return (
    <motion.div
      layout
      whileHover={{ y: -1 }}
      transition={{ duration: 0.15 }}
      className="bg-white transition-shadow hover:shadow-[0_10px_30px_rgba(30,30,28,0.06)]"
      style={{
        borderRadius: 16,
        border: service.isActive
          ? "1px solid #ece9e1"
          : "1px dashed #f1cdcd",
        background: service.isActive ? "#fff" : "#fdf6f6",
      }}
    >
      {/* Header du service - bandeau visuellement distinct */}
      <div
        className="p-4"
        style={{
          background: service.isActive ? "#fff" : "#fdf6f6",
          borderBottom: "1px solid #f1ede3",
        }}
      >
        <div className="flex items-center gap-3">
          {/* Icon catégorie - rond plus prononcé */}
          <div
            className="w-12 h-12 flex items-center justify-center text-[24px] flex-shrink-0"
            style={{
              borderRadius: 999,
              background: service.isActive
                ? "linear-gradient(135deg, #f5f9f6 0%, #eaf0ed 100%)"
                : "#fdf0f0",
              border: `1px solid ${service.isActive ? "#cfdbd3" : "#f1cdcd"}`,
            }}
          >
            {categoryData?.icon || "✨"}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3
                className="text-[14.5px] font-semibold tracking-[-0.01em] truncate m-0"
                style={{ color: service.isActive ? "#1f1f1d" : "#9c9484" }}
              >
                {categoryData?.name || service.category}
              </h3>
              {!service.isActive && !phoneVerified && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ border: "1px solid #f4e6c1", color: "#7a5b1a", background: "#fdf8ec" }}
                >
                  <Phone className="w-2.5 h-2.5" />
                  Tel. non vérifié
                </span>
              )}
              {(service.variants || []).some(v => v.isSapEligible) && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ border: "1px solid #cfdbd3", color: "#2f4a3f", background: "#f5f9f6" }}
                >
                  <FileCheck className="w-2.5 h-2.5" />
                  SAP
                </span>
              )}
            </div>
            <p className="text-[12px] text-[#6d6d68] mt-0.5">
              {activeVariants.length}/{variantsCount} formule{variantsCount > 1 ? "s" : ""} active{activeVariants.length > 1 ? "s" : ""}
              {optionsCount > 0 && ` · ${optionsCount} option${optionsCount > 1 ? "s" : ""}`}
            </p>
          </div>

          {/* Price */}
          {globalMinPrice && (
            <div className="text-right hidden sm:block">
              <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484]">
                À partir de
              </div>
              <div className="text-[16px] font-semibold text-[#1f1f1d] tracking-[-0.01em]">
                {formatPrice(globalMinPrice.value)}
                <span className="text-[10px] font-normal text-[#6d6d68] ml-0.5">{globalMinPrice.label}</span>
              </div>
              {isVatSubject && (
                <div className="text-[10px] font-medium" style={{ color: "#6d6d68" }}>
                  HT : {formatPrice(Math.round(globalMinPrice.value / (1 + DEFAULT_VAT_RATE / 100)))}
                </div>
              )}
              {companyType === "micro_enterprise" && !isVatSubject && (
                <div className="text-[9px] text-[#9c9484] italic">TVA non applicable</div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Tooltip content="Ajouter une formule" position="top">
              <button
                onClick={() => {
                  setIsAddingVariant(true);
                  setEditingSection("variants");
                }}
                className="w-8 h-8 inline-flex items-center justify-center rounded-full transition-colors hover:bg-[#fafafa]"
                style={{ background: "#fff", border: "1px solid #ece9e1", color: "#1f3a33" }}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </Tooltip>

            {/* Toggle catégorie — pill */}
            <button
              onClick={() => {
                if (!service.isActive && !phoneVerified) {
                  setShowPhoneModal(true);
                  return;
                }
                onToggle();
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors"
              style={
                service.isActive
                  ? { background: "#f5f9f6", color: "#1f3a33", border: "1px solid #cfdbd3" }
                  : !phoneVerified
                    ? { background: "#fdf8ec", color: "#7a5b1a", border: "1px solid #f4e6c1" }
                    : { background: "#fdf0f0", color: "#8a3a3a", border: "1px solid #f1cdcd" }
              }
              title={
                !service.isActive && !phoneVerified
                  ? "Vérifiez votre téléphone pour activer"
                  : service.isActive
                    ? "Désactiver la catégorie"
                    : "Activer la catégorie"
              }
            >
              {service.isActive ? (
                <>
                  <Eye className="w-3 h-3" />
                  <span className="hidden sm:inline">En ligne</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3 h-3" />
                  <span className="hidden sm:inline">Hors ligne</span>
                </>
              )}
            </button>

            <Tooltip content="Supprimer" position="top">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-8 h-8 inline-flex items-center justify-center rounded-full transition-colors hover:bg-[rgba(196,86,86,0.08)]"
                style={{ background: "#fff", border: "1px solid #f1cdcd", color: "#c45656" }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Services - Affichées directement (zone "nested" cream pour différencier du parent) */}
      <div style={{ background: "#fafaf6" }}>
        <AnimatePresence mode="wait">
          {editingSection === "variants" && isAddingVariant ? (
            <motion.div
              key="add-variant"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4"
            >
              <VariantEditor
                serviceId={service.id}
                variants={service.variants || []}
                token={token}
                categoryData={categoryData}
                category={service.category}
                allowOvernightStay={service.allowOvernightStay}
                serviceAnimalTypes={service.animalTypes}
                onManageSlots={setManagingSlotsVariant}
                initialAddMode={true}
                onClose={() => {
                  setIsAddingVariant(false);
                  setEditingSection(null);
                }}
                isSapApproved={isSapApproved}
              />
            </motion.div>
          ) : editingSection === "variants" && editingVariantId ? (
            <motion.div
              key="edit-single-variant"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4"
            >
              <VariantEditor
                serviceId={service.id}
                variants={service.variants || []}
                token={token}
                categoryData={categoryData}
                category={service.category}
                allowOvernightStay={service.allowOvernightStay}
                serviceAnimalTypes={service.animalTypes}
                onManageSlots={setManagingSlotsVariant}
                initialEditingId={editingVariantId}
                onClose={() => {
                  setEditingVariantId(null);
                  setEditingSection(null);
                }}
                isSapApproved={isSapApproved}
              />
            </motion.div>
          ) : (
            <motion.div
              key="preview-variants"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Services - Vue Grille ou Liste */}
              {displayVariants.length > 0 ? (
                <AnimatePresence mode="wait">
                <motion.div
                  key={viewMode}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    "p-4",
                    viewMode === "grid"
                      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                      : "flex flex-col gap-2"
                  )}
                >
                  {displayVariants.map((variant) => {
                    const primaryPrice = getPrimaryPrice(variant, allowedPriceUnits, allowOvernightStay, displayPriceUnit);
                    const AnimalIcon = variant.animalTypes?.[0] ? (animalIcons[variant.animalTypes[0]] || Star) : null;
                    const variantOptions = activeOptions.filter(opt => opt.variantId === variant.id);
                    const sharedOptions = activeOptions.filter(opt => !opt.variantId);
                    const isToggling = togglingVariantId === variant.id;
                    const htPrice = primaryPrice ? Math.round(primaryPrice.value / (1 + DEFAULT_VAT_RATE / 100)) : 0;

                    // ========== VUE LISTE ==========
                    if (viewMode === "list") {
                      return (
                        <div
                          key={variant.id}
                          className={cn(
                            "group flex items-center gap-3 p-3 rounded-xl border transition-all",
                            variant.isActive
                              ? "bg-gradient-to-r from-foreground/[0.02] to-foreground/[0.04] border-foreground/5 hover:border-primary/30 hover:shadow-sm"
                              : "bg-red-50/30 border-dashed border-red-200/60"
                          )}
                        >
                          {/* Toggle individuel */}
                          <Tooltip content={variant.isActive ? "Désactiver ce service" : "Activer ce service"} position="top">
                            <button
                              onClick={() => handleToggleVariant(variant.id, variant.isActive)}
                              disabled={isToggling}
                              className={cn(
                                "relative w-10 h-5 rounded-full transition-colors flex-shrink-0",
                                variant.isActive ? "bg-secondary" : "bg-gray-300",
                                isToggling && "opacity-50"
                              )}
                            >
                              <span className={cn(
                                "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                                variant.isActive ? "translate-x-5" : "translate-x-0"
                              )} />
                            </button>
                          </Tooltip>

                          {/* Badge + bouton créneaux collectif */}
                          {variant.sessionType === "collective" && (
                            <Tooltip content="Gérer les créneaux collectifs" position="top">
                              <button
                                onClick={() => setManagingSlotsVariant(variant)}
                                className={cn(
                                  "flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full transition-colors",
                                  variant.needsSlotConfiguration || !variant.slotsCount
                                    ? "bg-red-500 text-white animate-pulse hover:bg-red-600"
                                    : "bg-orange-500 text-white hover:bg-orange-600"
                                )}
                              >
                                <CalendarPlus className="w-3.5 h-3.5" />
                                {variant.needsSlotConfiguration || !variant.slotsCount
                                  ? "Créer créneaux"
                                  : `${variant.slotsCount} créneaux`}
                              </button>
                            </Tooltip>
                          )}

                          {/* Nom et description */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className={cn(
                                "font-semibold truncate",
                                variant.isActive ? "text-foreground" : "text-foreground/50"
                              )}>{variant.name}</h4>
                              {!variant.isActive && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-500 rounded font-medium">Inactif</span>
                              )}
                              {variant.isSapEligible && (
                                <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-medium">
                                  <FileCheck className="w-3 h-3" />
                                  SAP
                                </span>
                              )}
                              {variant.description && (
                                <p className="text-xs text-text-light truncate hidden sm:block">— {variant.description}</p>
                              )}
                            </div>
                          </div>

                          {/* Infos compactes */}
                          <div className="hidden md:flex items-center gap-2 text-xs">
                            {variant.animalTypes && variant.animalTypes.length > 0 && (
                              <span className="flex items-center gap-1 px-2 py-1 bg-white rounded-md text-text-light">
                                {AnimalIcon && <AnimalIcon className="w-3 h-3 text-primary" />}
                                {variant.animalTypes.length > 1
                                  ? `${variant.animalTypes.length}`
                                  : animalLabels[variant.animalTypes[0]] || variant.animalTypes[0]
                                }
                              </span>
                            )}
                            {variant.serviceLocation && (
                              <span className={cn(
                                "flex items-center gap-1 px-2 py-1 rounded-md",
                                variant.serviceLocation === "announcer_home" && "bg-primary/10 text-primary",
                                variant.serviceLocation === "client_home" && "bg-secondary/10 text-secondary",
                                variant.serviceLocation === "both" && "bg-purple-100 text-purple-600"
                              )}>
                                {variant.serviceLocation === "announcer_home" && <Home className="w-3 h-3" />}
                                {variant.serviceLocation === "client_home" && <MapPin className="w-3 h-3" />}
                                {variant.serviceLocation === "both" && <><Home className="w-3 h-3" /><MapPin className="w-3 h-3" /></>}
                              </span>
                            )}
                            {variant.duration && (
                              <span className="flex items-center gap-1 px-2 py-1 bg-white rounded-md text-text-light">
                                <Clock className="w-3 h-3" />
                                {variant.duration}min
                              </span>
                            )}
                          </div>

                          {/* Options count */}
                          {(variantOptions.length > 0 || sharedOptions.length > 0) && (
                            <span className="hidden sm:flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded-md">
                              <Zap className="w-3 h-3" />
                              {variantOptions.length + sharedOptions.length}
                            </span>
                          )}

                          {/* Prix avec HT/TTC */}
                          {primaryPrice && (
                            <div className={cn("text-right", !variant.isActive && "opacity-50")}>
                              <div className="text-lg font-bold text-primary">
                                {formatPrice(primaryPrice.value)}
                              </div>
                              <div className="text-xs text-text-light">{primaryPrice.label}</div>
                              {isVatSubject && (
                                <div className="text-[10px] text-blue-500 font-medium">
                                  HT : {formatPrice(htPrice)}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Bouton éditer */}
                          <button
                            onClick={() => {
                              setEditingVariantId(variant.id);
                              setEditingSection("variants");
                            }}
                            className="p-2 text-text-light hover:text-primary hover:bg-primary/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    }

                    // ========== VUE GRILLE ==========
                    return (
                      <div
                        key={variant.id}
                        className={cn(
                          "group relative p-4 rounded-xl border transition-all",
                          variant.isActive
                            ? "bg-gradient-to-br from-foreground/[0.02] to-foreground/[0.04] border-foreground/5 hover:border-primary/30 hover:shadow-sm"
                            : "bg-red-50/20 border-dashed border-red-200/60"
                        )}
                      >
                        {/* Badges en haut à droite */}
                        <div className="absolute -top-2 -right-2 flex items-center gap-1">
                          {variant.isSapEligible && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500 text-white text-xs font-medium rounded-full">
                              <FileCheck className="w-3 h-3" />
                              SAP
                            </span>
                          )}
                          {variant.sessionType === "collective" && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-500 text-white text-xs font-medium rounded-full">
                              <Users className="w-3 h-3" />
                              Collectif
                            </span>
                          )}
                        </div>

                        {/* Header service avec toggle */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            {/* Toggle individuel */}
                            <Tooltip content={variant.isActive ? "Désactiver ce service" : "Activer ce service"} position="top">
                              <button
                                onClick={() => handleToggleVariant(variant.id, variant.isActive)}
                                disabled={isToggling}
                                className={cn(
                                  "relative w-9 h-5 rounded-full transition-colors flex-shrink-0 mt-0.5 p-0 border-0 appearance-none",
                                  variant.isActive ? "bg-secondary" : "bg-gray-300",
                                  isToggling && "opacity-50"
                                )}
                              >
                                <span className={cn(
                                  "absolute left-0 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                                  variant.isActive ? "translate-x-[18px]" : "translate-x-0.5"
                                )} />
                              </button>
                            </Tooltip>
                            <div className="flex-1 min-w-0">
                              <h4 className={cn(
                                "font-semibold truncate",
                                variant.isActive ? "text-foreground" : "text-foreground/50"
                              )}>{variant.name}</h4>
                              {variant.description && (
                                <p className="text-xs text-text-light line-clamp-2 mt-0.5">{variant.description}</p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setEditingVariantId(variant.id);
                              setEditingSection("variants");
                            }}
                            className="ml-2 p-1.5 text-text-light hover:text-primary hover:bg-primary/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Prix avec HT/TTC */}
                        {primaryPrice && (
                          <div className={cn("mb-2", !variant.isActive && "opacity-50")}>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-lg font-bold text-primary">
                                {formatPrice(primaryPrice.value)}
                              </span>
                              <span className="text-xs font-normal text-text-light">{primaryPrice.label}</span>
                              {isVatSubject && (
                                <span className="text-[10px] text-primary/60 font-medium">TTC</span>
                              )}
                            </div>
                            {isVatSubject && (
                              <div className="text-[11px] text-blue-500 font-medium mt-0.5">
                                HT : {formatPrice(htPrice)}
                              </div>
                            )}
                            {companyType === "micro_enterprise" && !isVatSubject && (
                              <div className="text-[9px] text-text-light italic">TVA non applicable, art. 293B</div>
                            )}
                          </div>
                        )}

                        {/* Infos du service */}
                        <div className={cn("flex flex-wrap items-center gap-1.5 text-xs", !variant.isActive && "opacity-50")}>
                          {/* Animaux */}
                          {variant.animalTypes && variant.animalTypes.length > 0 && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-white rounded-md text-text-light">
                              {AnimalIcon && <AnimalIcon className="w-3 h-3 text-primary" />}
                              {variant.animalTypes.length > 1
                                ? `${variant.animalTypes.length} types`
                                : animalLabels[variant.animalTypes[0]] || variant.animalTypes[0]
                              }
                            </span>
                          )}

                          {/* Lieu */}
                          {variant.serviceLocation && (
                            <span className={cn(
                              "flex items-center gap-1 px-2 py-1 rounded-md",
                              variant.serviceLocation === "announcer_home" && "bg-primary/10 text-primary",
                              variant.serviceLocation === "client_home" && "bg-secondary/10 text-secondary",
                              variant.serviceLocation === "both" && "bg-purple-100 text-purple-600"
                            )}>
                              {variant.serviceLocation === "announcer_home" && <><Home className="w-3 h-3" />Domicile</>}
                              {variant.serviceLocation === "client_home" && <><MapPin className="w-3 h-3" />Client</>}
                              {variant.serviceLocation === "both" && <><Home className="w-3 h-3" /><MapPin className="w-3 h-3" /></>}
                            </span>
                          )}

                          {/* Durée */}
                          {variant.duration && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-white rounded-md text-text-light">
                              <Clock className="w-3 h-3" />
                              {variant.duration}min
                            </span>
                          )}

                          {/* Garde de nuit */}
                          {variant.pricing?.nightly && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md">
                              <Moon className="w-3 h-3" />
                              +{formatPrice(variant.pricing.nightly)}
                            </span>
                          )}

                          {/* Bouton créneaux pour services collectifs */}
                          {variant.sessionType === "collective" && (
                            <button
                              onClick={() => setManagingSlotsVariant(variant)}
                              className={cn(
                                "flex items-center gap-1 px-2 py-1 rounded-md transition-colors",
                                variant.needsSlotConfiguration || !variant.slotsCount
                                  ? "bg-red-100 text-red-700 hover:bg-red-200 animate-pulse"
                                  : "bg-green-100 text-green-700 hover:bg-green-200"
                              )}
                            >
                              <CalendarPlus className="w-3 h-3" />
                              {variant.needsSlotConfiguration || !variant.slotsCount
                                ? "Créer créneaux"
                                : `${variant.slotsCount} créneaux`}
                            </button>
                          )}
                        </div>

                        {/* Features */}
                        {variant.includedFeatures && variant.includedFeatures.length > 0 && (
                          <div className={cn("mt-2 pt-2 border-t border-foreground/5", !variant.isActive && "opacity-50")}>
                            <div className="flex flex-wrap gap-1">
                              {variant.includedFeatures.slice(0, 3).map((feature, i) => (
                                <span key={i} className="text-xs text-secondary flex items-center gap-0.5">
                                  <Sparkles className="w-3 h-3" />
                                  {feature}
                                </span>
                              ))}
                              {variant.includedFeatures.length > 3 && (
                                <span className="text-xs text-text-light">+{variant.includedFeatures.length - 3}</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Options du service */}
                        {(variantOptions.length > 0 || sharedOptions.length > 0) && (
                          <div className={cn("mt-2 pt-2 border-t border-foreground/5", !variant.isActive && "opacity-50")}>
                            <div className="flex items-center gap-1 mb-1.5">
                              <Zap className="w-3 h-3 text-amber-500" />
                              <span className="text-xs font-medium text-amber-700">Options</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {variantOptions.map((option) => (
                                <span
                                  key={option.id}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-700 text-xs rounded border border-amber-200"
                                >
                                  {option.name}
                                  <span className="font-medium">+{formatPrice(option.price)}</span>
                                </span>
                              ))}
                              {sharedOptions.map((option) => (
                                <Tooltip key={option.id} content="Option partagée" position="top">
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-50 text-gray-600 text-xs rounded border border-gray-200">
                                    {option.name}
                                    <span className="font-medium">+{formatPrice(option.price)}</span>
                                  </span>
                                </Tooltip>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </motion.div>
                </AnimatePresence>
              ) : (
                <div className="p-6 text-center">
                  <p className="text-text-light mb-3">Aucun service</p>
                  <button
                    onClick={() => {
                      setIsAddingVariant(true);
                      setEditingSection("variants");
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter un service
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          onDelete();
          setShowDeleteModal(false);
        }}
        title="Supprimer ce service"
        message={`Êtes-vous sûr de vouloir supprimer le service "${categoryData?.name || service.category}" ? Cette action supprimera également tous les services et options associés.`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
      />

      {/* Modale vérification téléphone */}
      <AnimatePresence>
        {showPhoneModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPhoneModal(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
                <div className="p-5 border-b border-foreground/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 rounded-xl">
                        <Phone className="w-5 h-5 text-amber-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground">Téléphone non vérifié</h3>
                    </div>
                    <button
                      onClick={() => setShowPhoneModal(false)}
                      className="p-2 text-text-light hover:text-foreground hover:bg-foreground/5 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  <p className="text-text-light">
                    Vous devez vérifier votre numéro de téléphone avant de pouvoir activer vos services et les rendre visibles aux clients.
                  </p>
                  <p className="text-sm text-text-light">
                    Rendez-vous sur la page <strong>Mes services</strong> et utilisez la bannière de vérification en haut de page, ou allez dans vos <strong>Paramètres</strong>.
                  </p>
                </div>
                <div className="p-5 border-t border-foreground/10 bg-foreground/[0.02] flex items-center justify-end gap-3">
                  <motion.button
                    onClick={() => setShowPhoneModal(false)}
                    className="px-4 py-2.5 text-text-light hover:text-foreground font-medium rounded-xl transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Fermer
                  </motion.button>
                  <motion.a
                    href="/dashboard/services"
                    onClick={() => {
                      setShowPhoneModal(false);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Vérifier mon téléphone
                    <ArrowRight className="w-4 h-4" />
                  </motion.a>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Collective Slots Manager Modal */}
      <AnimatePresence>
        {managingSlotsVariant && (
          <CollectiveSlotsManager
            variantId={managingSlotsVariant.id}
            variantName={managingSlotsVariant.name}
            duration={managingSlotsVariant.duration || 60}
            maxAnimalsPerSession={managingSlotsVariant.maxAnimalsPerSession || 5}
            animalTypes={managingSlotsVariant.animalTypes || service.animalTypes}
            onClose={() => setManagingSlotsVariant(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================================
// Variant Editor Component
// ============================================================================

// Type pour les activités admin
interface AdminActivity {
  _id: string;
  name: string;
  emoji: string;
  description?: string;
}

interface VariantEditorProps {
  serviceId: Id<"services">;
  variants: Variant[];
  token: string;
  categoryData?: ServiceCategory;
  category: string;
  allowOvernightStay?: boolean;
  serviceAnimalTypes: string[];
  onManageSlots?: (variant: Variant) => void;
  // Props pour ouvrir directement en mode édition/ajout
  initialEditingId?: Id<"serviceVariants"> | null;
  initialAddMode?: boolean;
  onClose?: () => void;
  // SAP
  isSapApproved?: boolean;
}

function VariantEditor({ serviceId, variants, token, categoryData, category, allowOvernightStay, serviceAnimalTypes, onManageSlots, initialEditingId, initialAddMode, onClose, isSapApproved }: VariantEditorProps) {
  const [isAdding, setIsAdding] = useState(initialAddMode || false);
  const [editingId, setEditingId] = useState<Id<"serviceVariants"> | null>(initialEditingId || null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: Id<"serviceVariants">; name: string } | null>(null);

  // Filtres
  const [filterSessionType, setFilterSessionType] = useState<"all" | "individual" | "collective">("all");
  const [filterLocation, setFilterLocation] = useState<"all" | "announcer_home" | "client_home" | "both">("all");
  const [filterAnimal, setFilterAnimal] = useState<string>("all");

  const addVariantMutation = useMutation(api.services.variants.addVariant);
  const updateVariantMutation = useMutation(api.services.variants.updateVariant);
  const deleteVariantMutation = useMutation(api.services.variants.deleteVariant);

  // Récupérer les activités depuis l'admin (comme dans ServiceForm)
  const activities = useQuery(api.services.activities.getActiveActivities);
  const availableActivities: AdminActivity[] = activities?.map((a: { _id: string; name: string; emoji: string; description?: string }) => ({
    _id: a._id,
    name: a.name,
    emoji: a.emoji,
    description: a.description,
  })) || [];

  // Get price recommendation
  const priceRecommendation = useQuery(
    api.services.pricing.getPriceRecommendation,
    token && category ? { token, category, priceUnit: "hour" } : "skip"
  );

  const recommendedPrice = priceRecommendation?.avgPrice || 2000;
  const isGardeService = categoryData?.allowOvernightStay === true;

  // Collecter tous les types d'animaux uniques dans les variantes
  const allAnimalsInVariants = [...new Set(variants.flatMap(v => v.animalTypes || []))];

  // Filtrer les variantes
  const filteredVariants = variants.filter(variant => {
    // Filtre type de séance
    if (filterSessionType !== "all") {
      const variantSessionType = variant.sessionType || "individual";
      if (variantSessionType !== filterSessionType) return false;
    }
    // Filtre lieu
    if (filterLocation !== "all") {
      if (!variant.serviceLocation) return false;
      if (filterLocation === "both") {
        // "both" signifie flexible
        if (variant.serviceLocation !== "both") return false;
      } else {
        if (variant.serviceLocation !== filterLocation && variant.serviceLocation !== "both") return false;
      }
    }
    // Filtre animal
    if (filterAnimal !== "all") {
      if (!variant.animalTypes || !variant.animalTypes.includes(filterAnimal)) return false;
    }
    return true;
  });

  const hasActiveFilters = filterSessionType !== "all" || filterLocation !== "all" || filterAnimal !== "all";

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

  const resetFilters = () => {
    setFilterSessionType("all");
    setFilterLocation("all");
    setFilterAnimal("all");
  };

  // Mode édition directe d'une service spécifique
  if (initialEditingId) {
    const variantToEdit = variants.find(v => v.id === initialEditingId);
    if (variantToEdit) {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h5 className="font-medium text-foreground">Modifier la service</h5>
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Annuler
            </button>
          </div>
          <VariantEditForm
            variant={variantToEdit}
            token={token}
            category={category}
            categoryData={categoryData}
            recommendedPrice={recommendedPrice}
            isGardeService={isGardeService}
            allowOvernightStay={allowOvernightStay}
            allowedPriceUnits={categoryData?.allowedPriceUnits}
            announcerPriceMode={categoryData?.announcerPriceMode}
            defaultNightlyPrice={categoryData?.defaultNightlyPrice}
            serviceAnimalTypes={serviceAnimalTypes}
            availableActivities={availableActivities}
            isSapApproved={isSapApproved}
            onSave={async (data) => {
              await updateVariantMutation({ token, variantId: variantToEdit.id, ...data });
              onClose?.();
            }}
            onCancel={() => onClose?.()}
          />
        </div>
      );
    }
  }

  // Mode ajout direct d'une nouvelle service
  if (initialAddMode) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h5 className="font-medium text-foreground">Nouvelle service</h5>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Annuler
          </button>
        </div>
        <VariantAddForm
          serviceId={serviceId}
          token={token}
          category={category}
          recommendedPrice={recommendedPrice}
          isGardeService={isGardeService}
          allowOvernightStay={allowOvernightStay}
          allowedPriceUnits={categoryData?.allowedPriceUnits}
          announcerPriceMode={categoryData?.announcerPriceMode}
          defaultNightlyPrice={categoryData?.defaultNightlyPrice}
          serviceAnimalTypes={serviceAnimalTypes}
          availableActivities={availableActivities}
          existingCount={variants.length}
          isSapApproved={isSapApproved}
          onSave={async (data) => {
            await addVariantMutation({ token, serviceId, ...data });
            onClose?.();
          }}
          onCancel={() => onClose?.()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filtres */}
      {variants.length > 1 && (
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-4 h-4 text-text-light" />
            <span className="text-sm font-medium text-foreground">Filtrer les services</span>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="ml-auto text-xs text-primary hover:underline"
              >
                Réinitialiser
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Filtre type de séance */}
            <select
              value={filterSessionType}
              onChange={(e) => setFilterSessionType(e.target.value as "all" | "individual" | "collective")}
              className={cn(
                "px-3 py-1.5 text-xs rounded-lg border transition-colors",
                filterSessionType !== "all"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-gray-200 bg-white text-foreground"
              )}
            >
              <option value="all">Toutes les séances</option>
              <option value="individual">👤 Individuel</option>
              <option value="collective">👥 Collectif</option>
            </select>

            {/* Filtre lieu */}
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value as "all" | "announcer_home" | "client_home" | "both")}
              className={cn(
                "px-3 py-1.5 text-xs rounded-lg border transition-colors",
                filterLocation !== "all"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-gray-200 bg-white text-foreground"
              )}
            >
              <option value="all">Tous les lieux</option>
              <option value="announcer_home">🏠 Mon domicile</option>
              <option value="client_home">📍 À domicile</option>
              <option value="both">🔄 Flexible</option>
            </select>

            {/* Filtre animal */}
            {allAnimalsInVariants.length > 0 && (
              <select
                value={filterAnimal}
                onChange={(e) => setFilterAnimal(e.target.value)}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-lg border transition-colors",
                  filterAnimal !== "all"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-gray-200 bg-white text-foreground"
                )}
              >
                <option value="all">Tous les animaux</option>
                {allAnimalsInVariants.map(animal => (
                  <option key={animal} value={animal}>{animalLabels[animal] || animal}</option>
                ))}
              </select>
            )}
          </div>
          {/* Résultat du filtre */}
          {hasActiveFilters && (
            <p className="text-xs text-text-light mt-2">
              {filteredVariants.length} service{filteredVariants.length > 1 ? "s" : ""} sur {variants.length}
            </p>
          )}
        </div>
      )}

      {/* Existing variants */}
      <AnimatePresence mode="popLayout">
        {filteredVariants.map((variant, index) => (
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
                announcerPriceMode={categoryData?.announcerPriceMode}
                defaultNightlyPrice={categoryData?.defaultNightlyPrice}
                serviceAnimalTypes={serviceAnimalTypes}
                availableActivities={availableActivities}
                isSapApproved={isSapApproved}
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
                onManageSlots={onManageSlots}
                allowedPriceUnits={categoryData?.allowedPriceUnits}
                serviceAnimalTypes={serviceAnimalTypes}
                allowOvernightStay={categoryData?.allowOvernightStay}
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
              announcerPriceMode={categoryData?.announcerPriceMode}
              defaultNightlyPrice={categoryData?.defaultNightlyPrice}
              serviceAnimalTypes={serviceAnimalTypes}
              availableActivities={availableActivities}
              existingCount={variants.length}
              isSapApproved={isSapApproved}
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
            <span className="font-medium">Ajouter une service</span>
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
        title="Supprimer cette service"
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
  onManageSlots,
  allowedPriceUnits,
  allowOvernightStay,
  serviceAnimalTypes,
}: {
  variant: Variant;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  canDelete: boolean;
  onManageSlots?: (variant: Variant) => void;
  allowedPriceUnits?: string[];
  allowOvernightStay?: boolean;
  serviceAnimalTypes: string[];
}) {
  const prices = getVariantPrices(variant, allowedPriceUnits, allowOvernightStay);

  return (
    <div
      className="p-3.5 transition-all hover:bg-[#f7f5ef]"
      style={{
        borderRadius: 12,
        background: variant.isActive ? "#fcfaf4" : "#fdf6f6",
        border: `1px solid ${variant.isActive ? "#f1ede3" : "#f1cdcd"}`,
        borderLeft: `3px solid ${variant.isActive ? "#1f3a33" : "#c45656"}`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          {/* Indicateur numéroté nested (au lieu de l'avatar Sparkles) */}
          <div
            className="w-7 h-7 inline-flex items-center justify-center text-[11px] font-bold rounded-full flex-shrink-0"
            style={{
              background: variant.isActive ? "#1f3a33" : "#c45656",
              color: "#f7f5ef",
            }}
          >
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            {/* Nom direct (sans eyebrow car indicateur numéroté à gauche) */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <h5 className="text-[14px] font-semibold text-[#1f1f1d] tracking-[-0.01em] truncate m-0">
                {variant.name}
              </h5>
              {/* Service collective sans créneaux */}
              {variant.sessionType === "collective" && (variant.needsSlotConfiguration || !variant.slotsCount) && (
                <StatusPill tone="danger" pulse>
                  Créneaux requis
                </StatusPill>
              )}
              {/* Service inactive (non collective ou autre raison) */}
              {!variant.isActive && variant.sessionType !== "collective" && (
                <StatusPill tone="danger">Inactif</StatusPill>
              )}
              {/* Service collective avec créneaux configurés */}
              {variant.sessionType === "collective" && variant.slotsCount && variant.slotsCount > 0 && (
                <StatusPill tone="success">{variant.slotsCount} créneaux</StatusPill>
              )}
            </div>
            {variant.description && (
              <p className="text-[12px] text-[#6d6d68] mb-2 line-clamp-2 leading-[1.5]">
                {variant.description}
              </p>
            )}
            {/* Pills de prix */}
            <div className="flex flex-wrap items-center gap-1.5">
              {prices.map((price, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-semibold"
                  style={{ background: "#1f3a33", color: "#f7f5ef" }}
                >
                  {formatPrice(price.value)}
                  <span className="font-normal opacity-80 ml-0.5">{price.label}</span>
                </span>
              ))}
              {variant.numberOfSessions && variant.numberOfSessions > 1 && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ border: "1px solid #cfdbd3", color: "#2f4a3f" }}
                >
                  <Layers className="w-2.5 h-2.5" />
                  {variant.numberOfSessions} séances
                </span>
              )}
              {variant.duration && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ border: "1px solid #dfdcd4", color: "#3a3a38" }}
                >
                  <Clock className="w-2.5 h-2.5" />
                  {variant.duration} min
                </span>
              )}
            </div>
            {/* Objectifs / activités */}
            {variant.objectives && variant.objectives.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {variant.objectives.map((objective, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                    style={{ border: "1px solid #dfdcd4", color: "#3a3a38" }}
                  >
                    <span>{objective.icon}</span>
                    <span>{objective.text}</span>
                  </span>
                ))}
              </div>
            )}
            {/* Type de séance, lieu et animaux */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {variant.sessionType === "collective" ? (
                <PreviewPill>
                  <Users className="w-2.5 h-2.5" />
                  Collectif{variant.maxAnimalsPerSession ? ` · ${variant.maxAnimalsPerSession} max` : ""}
                </PreviewPill>
              ) : (
                <PreviewPill>
                  <User className="w-2.5 h-2.5" />
                  Individuel
                </PreviewPill>
              )}
              {variant.serviceLocation && (
                <PreviewPill>
                  {variant.serviceLocation === "announcer_home" && <><Home className="w-2.5 h-2.5" /> Mon domicile</>}
                  {variant.serviceLocation === "client_home" && <><MapPin className="w-2.5 h-2.5" /> À domicile</>}
                  {variant.serviceLocation === "both" && <><Home className="w-2.5 h-2.5" /> Flexible</>}
                </PreviewPill>
              )}
              {variant.animalTypes && variant.animalTypes.length > 0 && (
                <>
                  {variant.animalTypes.map((animal) => (
                    <span
                      key={animal}
                      className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                      style={{ background: "#f7f5ef", color: "#3a3a38" }}
                    >
                      {animalLabels[animal] || animal}
                    </span>
                  ))}
                </>
              )}
              {/* Restrictions chiens */}
              {(() => {
                const serviceAcceptsDogs = variant.animalTypes?.includes("chien") ||
                  (!variant.animalTypes?.length && serviceAnimalTypes.includes("chien"));
                if (!serviceAcceptsDogs) return null;

                const dogSizes = variant.acceptedDogSizes || ["small", "medium", "large"];
                const dogCategory = variant.dogCategoryAcceptance || "none";
                const allSizes = dogSizes.length === 3;

                return (
                  <>
                    <span className="text-[10px] text-[#9c9484]">🐕</span>
                    {allSizes ? (
                      <PreviewPill tone="success">Toutes tailles</PreviewPill>
                    ) : (
                      <>
                        {dogSizes.includes("small") && <PreviewPill tone="success">Petit</PreviewPill>}
                        {dogSizes.includes("medium") && <PreviewPill>Moyen</PreviewPill>}
                        {dogSizes.includes("large") && <PreviewPill>Grand</PreviewPill>}
                      </>
                    )}
                    <PreviewPill tone={dogCategory === "none" ? "default" : "success"}>
                      {dogCategory === "none" && "Cat. non acceptées"}
                      {dogCategory === "cat1" && "Cat. 1 ✓"}
                      {dogCategory === "cat2" && "Cat. 2 ✓"}
                      {dogCategory === "both" && "Cat. 1 & 2 ✓"}
                    </PreviewPill>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {variant.sessionType === "collective" && onManageSlots && (
            <Tooltip content="Gérer les créneaux" position="top">
              <button
                onClick={() => onManageSlots(variant)}
                className={cn(
                  "w-8 h-8 inline-flex items-center justify-center rounded-full transition-colors",
                  variant.needsSlotConfiguration && "animate-pulse"
                )}
                style={
                  variant.needsSlotConfiguration
                    ? { background: "#1f3a33", color: "#f7f5ef", border: "1px solid #1f3a33" }
                    : { background: "#fff", color: "#1f3a33", border: "1px solid #cfdbd3" }
                }
              >
                <Calendar className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          )}
          <Tooltip content="Modifier" position="top">
            <button
              onClick={onEdit}
              className="w-8 h-8 inline-flex items-center justify-center rounded-full transition-colors hover:bg-[#fafafa]"
              style={{ background: "#fff", border: "1px solid #ece9e1", color: "#1f3a33" }}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          {canDelete && (
            <Tooltip content="Supprimer" position="top">
              <button
                onClick={onDelete}
                className="w-8 h-8 inline-flex items-center justify-center rounded-full transition-colors hover:bg-[rgba(196,86,86,0.08)]"
                style={{ background: "#fff", border: "1px solid #f1cdcd", color: "#c45656" }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Alerte créneaux requis */}
      {variant.sessionType === "collective" && (variant.needsSlotConfiguration || !variant.slotsCount) && onManageSlots && (
        <div
          className="mt-3 p-3"
          style={{ borderRadius: 12, background: "#fdf8ec", border: "1px solid #f4e6c1" }}
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#7a5b1a" }} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#1f1f1d] tracking-[-0.01em]">
                Créneaux non configurés
              </p>
              <p className="text-[12px] mt-0.5 leading-[1.5]" style={{ color: "#7a5b1a" }}>
                Cette formule collective est inactive car aucun créneau n&apos;est défini.
                Ajoutez des créneaux pour permettre aux clients de réserver.
              </p>
              <button
                onClick={() => onManageSlots(variant)}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-opacity hover:opacity-90"
                style={{ background: "#1f3a33", color: "#f7f5ef" }}
              >
                <Calendar className="w-3 h-3" />
                Configurer les créneaux
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Pill de statut (succès / danger / défaut) pour les badges en haut de la card formule.
 */
function StatusPill({
  tone,
  pulse,
  children,
}: {
  tone: "success" | "danger" | "default";
  pulse?: boolean;
  children: React.ReactNode;
}) {
  const palette =
    tone === "success"
      ? { border: "1px solid #cfdbd3", color: "#2f4a3f", background: "#fff" }
      : tone === "danger"
        ? { border: "1px solid #f1cdcd", color: "#8a3a3a", background: "#fdf6f6" }
        : { border: "1px solid #dfdcd4", color: "#3a3a38", background: "#fff" };
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium",
        pulse && "animate-pulse"
      )}
      style={palette}
    >
      {children}
    </span>
  );
}

/**
 * Pill outline neutre pour métadonnées (lieu, type, taille, catégorie).
 */
function PreviewPill({
  tone = "default",
  children,
}: {
  tone?: "default" | "success";
  children: React.ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
      style={
        tone === "success"
          ? { border: "1px solid #cfdbd3", color: "#2f4a3f" }
          : { border: "1px solid #dfdcd4", color: "#3a3a38" }
      }
    >
      {children}
    </span>
  );
}

// Variant Edit Form
function VariantEditForm({
  variant,
  token,
  category,
  categoryData,
  recommendedPrice,
  isGardeService,
  allowOvernightStay,
  allowedPriceUnits,
  announcerPriceMode,
  defaultNightlyPrice,
  serviceAnimalTypes,
  availableActivities = [],
  isSapApproved,
  onSave,
  onCancel,
}: {
  variant: Variant;
  token: string;
  category: string;
  categoryData?: ServiceCategory;
  recommendedPrice: number;
  isGardeService: boolean;
  allowOvernightStay?: boolean;
  allowedPriceUnits?: ("hour" | "half_day" | "day" | "week" | "month")[];
  announcerPriceMode?: "manual" | "automatic";
  defaultNightlyPrice?: number;
  serviceAnimalTypes: string[];
  availableActivities?: AdminActivity[];
  isSapApproved?: boolean;
  onSave: (data: {
    name?: string;
    description?: string;
    objectives?: Objective[];
    numberOfSessions?: number;
    sessionInterval?: number;
    sessionType?: "individual" | "collective";
    maxAnimalsPerSession?: number;
    serviceLocation?: ServiceLocation;
    animalTypes?: string[];
    dogCategoryAcceptance?: "none" | "cat1" | "cat2" | "both";
    acceptedDogSizes?: ("small" | "medium" | "large")[];
    price?: number;
    pricing?: Pricing;
    duration?: number;
    includedFeatures?: string[];
    isActive?: boolean;
    isSapEligible?: boolean;
    photos?: string[];
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(variant.name);
  const [description, setDescription] = useState(variant.description || "");
  const [objectives, setObjectives] = useState<Objective[]>(variant.objectives || []);
  const [showActivitySelector, setShowActivitySelector] = useState(false);
  const [numberOfSessions, setNumberOfSessions] = useState(variant.numberOfSessions || 1);
  const [sessionInterval, setSessionInterval] = useState<number | undefined>(variant.sessionInterval);
  const [sessionType, setSessionType] = useState<"individual" | "collective">(variant.sessionType || "individual");
  const [maxAnimalsPerSession, setMaxAnimalsPerSession] = useState<number | undefined>(variant.maxAnimalsPerSession);
  const [serviceLocation, setServiceLocation] = useState<ServiceLocation>(variant.serviceLocation || "announcer_home");
  const [selectedAnimalTypes, setSelectedAnimalTypes] = useState<string[]>(variant.animalTypes || serviceAnimalTypes);
  const [duration, setDuration] = useState(variant.duration || 60);
  const [isActive, setIsActive] = useState(variant.isActive);
  const [photoUrls, setPhotoUrls] = useState<string[]>(
    (variant.photos || []).sort((a, b) => a.order - b.order).map((p) => p.url)
  );
  const [sapEligible, setSapEligible] = useState(variant.isSapEligible || false);
  const [pricing, setPricing] = useState<Pricing>(variant.pricing || {});
  const [includedFeatures, setIncludedFeatures] = useState<string[]>(variant.includedFeatures || []);
  const [newFeature, setNewFeature] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // TVA
  const { user: authUser } = useAuth();
  const isVatSubject = authUser?.isVatSubject;

  // Restrictions chiens
  const [dogCategoryAcceptance, setDogCategoryAcceptance] = useState<"none" | "cat1" | "cat2" | "both">(
    variant.dogCategoryAcceptance || "none"
  );
  const [acceptedDogSizes, setAcceptedDogSizes] = useState<("small" | "medium" | "large")[]>(
    variant.acceptedDogSizes || ["small", "medium", "large"]
  );

  // Onglet mobile : Form ou Aperçu
  const [mobileTab, setMobileTab] = useState<"form" | "preview">("form");

  // Construction live d'un LocalVariant + ServiceCategoryLite à partir des
  // states locaux pour alimenter l'aperçu. Re-build à chaque modification.
  const previewVariant: LocalVariant = useMemo(
    () => ({
      localId: String(variant.id),
      name,
      description,
      objectives,
      numberOfSessions,
      sessionInterval,
      sessionType,
      maxAnimalsPerSession,
      serviceLocation,
      animalTypes: selectedAnimalTypes,
      dogCategoryAcceptance,
      acceptedDogSizes,
      price: pricing.daily ?? pricing.hourly ?? variant.price ?? 0,
      priceUnit: isGardeService ? "day" : variant.priceUnit ?? "hour",
      pricing,
      duration,
      includedFeatures,
      photos: photoUrls,
    }),
    [
      variant.id,
      variant.price,
      variant.priceUnit,
      name,
      description,
      objectives,
      numberOfSessions,
      sessionInterval,
      sessionType,
      maxAnimalsPerSession,
      serviceLocation,
      selectedAnimalTypes,
      dogCategoryAcceptance,
      acceptedDogSizes,
      pricing,
      duration,
      includedFeatures,
      photoUrls,
      isGardeService,
    ]
  );

  const previewCategory = useMemo(
    () => ({
      slug: category,
      name: categoryData?.name ?? category,
      icon: categoryData?.icon,
      isCapacityBased: isGardeService,
      allowOvernightStay: categoryData?.allowOvernightStay,
    }),
    [category, categoryData, isGardeService]
  );

  // Calcul du prix journalier recommandé (pour le slider)
  // Si announcerPriceMode === "automatic", le prix recommandé est déjà un prix journalier
  // Sinon, c'est un prix horaire qu'on multiplie par 8 pour avoir le prix journée
  const dailyRecommendedPrice = announcerPriceMode === "automatic"
    ? recommendedPrice  // Prix déjà en journalier
    : (isGardeService ? recommendedPrice * 8 : recommendedPrice);

  // Récupérer le prix journée actuel (en euros)
  const getDailyPrice = () => {
    if (!pricing.daily) return dailyRecommendedPrice / 100;
    return pricing.daily / 100;
  };

  // Récupérer le prix nuit actuel (en euros)
  const getNightlyPrice = () => {
    if (!pricing.nightly) {
      // Utiliser le prix nuit conseillé de l'admin si disponible, sinon 50% du prix journalier
      return defaultNightlyPrice
        ? defaultNightlyPrice / 100
        : Math.round(dailyRecommendedPrice * 0.5) / 100;
    }
    return pricing.nightly / 100;
  };

  // Handler pour le prix journée (garde)
  const handleDailyPriceChange = (newDailyPriceEuros: number) => {
    const dailyInCents = Math.round(newDailyPriceEuros * 100);
    const hourlyInCents = Math.round(dailyInCents / 8);

    const currentNightly = pricing.nightly || 0;
    const newNightly = currentNightly > dailyInCents ? dailyInCents : currentNightly;

    setPricing({
      ...pricing,
      daily: dailyInCents,
      hourly: hourlyInCents,
      halfDaily: Math.round(dailyInCents / 2),
      weekly: Math.round(dailyInCents * 5),
      monthly: Math.round(dailyInCents * 20),
      nightly: newNightly > 0 ? newNightly : undefined,
    });
  };

  // Handler pour le prix nuit (garde)
  const handleNightlyPriceChange = (newNightlyPriceEuros: number) => {
    const nightlyInCents = Math.round(newNightlyPriceEuros * 100);
    const dailyInCents = pricing.daily || dailyRecommendedPrice;
    const clampedNightly = Math.min(nightlyInCents, dailyInCents);

    setPricing({
      ...pricing,
      nightly: clampedNightly,
    });
  };

  const dailyPrice = pricing.daily || recommendedPrice * 8;
  const hourlyPrice = pricing.hourly || recommendedPrice;
  const nightlyPrice = pricing.nightly || Math.round(dailyPrice * 0.5);

  // Si collective, forcer le lieu à announcer_home
  const isCollective = sessionType === "collective";
  const effectiveServiceLocation = isCollective ? "announcer_home" : serviceLocation;

  // Déterminer quels prix afficher selon allowedPriceUnits
  // Si allowedPriceUnits est défini et non vide, on utilise uniquement ces types
  // Sinon, on utilise les valeurs par défaut
  const hasConfiguredPriceUnits = allowedPriceUnits && allowedPriceUnits.length > 0;
  const showHourly = hasConfiguredPriceUnits ? allowedPriceUnits.includes("hour") : true;
  const showHalfDaily = hasConfiguredPriceUnits ? allowedPriceUnits.includes("half_day") : false;
  const showDaily = hasConfiguredPriceUnits ? allowedPriceUnits.includes("day") : true;
  const showWeekly = hasConfiguredPriceUnits ? allowedPriceUnits.includes("week") : false;
  const showMonthly = hasConfiguredPriceUnits ? allowedPriceUnits.includes("month") : false;

  // Vérifier si une activité est sélectionnée
  const isActivitySelected = (activity: AdminActivity) => {
    return objectives.some((obj) => obj.text === activity.name && obj.icon === activity.emoji);
  };

  // Toggle une activité
  const toggleActivity = (activity: AdminActivity) => {
    if (isActivitySelected(activity)) {
      setObjectives(objectives.filter((obj) => !(obj.text === activity.name && obj.icon === activity.emoji)));
    } else {
      setObjectives([...objectives, { icon: activity.emoji, text: activity.name }]);
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
      // Déterminer si les restrictions chiens s'appliquent
      const acceptsDogs = selectedAnimalTypes.includes("chien");

      // CRUCIAL : aligner variant.price avec la nouvelle valeur saisie
      // (pricing.hourly pour les services standard, pricing.daily pour la garde).
      // Sinon la BDD garde l'ancien price et getVariantSessionPrice utilise
      // un prix obsolète sur la page détail formule / la recherche.
      const newMainPrice =
        pricing.hourly ??
        pricing.daily ??
        pricing.weekly ??
        pricing.monthly ??
        variant.price;

      await onSave({
        name,
        description: description || undefined,
        objectives: objectives.length > 0 ? objectives : undefined,
        numberOfSessions: numberOfSessions > 1 ? numberOfSessions : undefined,
        sessionInterval: numberOfSessions > 1 ? sessionInterval : undefined,
        sessionType,
        maxAnimalsPerSession: sessionType === "collective" ? maxAnimalsPerSession : undefined,
        serviceLocation: effectiveServiceLocation,
        animalTypes: selectedAnimalTypes.length > 0 ? selectedAnimalTypes : undefined,
        dogCategoryAcceptance: acceptsDogs ? dogCategoryAcceptance : undefined,
        acceptedDogSizes: acceptsDogs ? acceptedDogSizes : undefined,
        price: newMainPrice,
        pricing,
        duration,
        includedFeatures: includedFeatures.length > 0 ? includedFeatures : undefined,
        isActive,
        isSapEligible: sapEligible || undefined,
        photos: photoUrls,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-4"
      style={{ borderRadius: 14 }}
    >
      {/* Colonne gauche : formulaire */}
      <div
        className={cn(
          "p-4 space-y-4 lg:block",
          mobileTab === "form" ? "block" : "hidden"
        )}
        style={{ borderRadius: 14, background: "#fcfaf4", border: "1px solid #ece9e1" }}
      >
      {/* Toggle Form/Aperçu — visible uniquement sur mobile */}
      <div
        className="lg:hidden inline-flex items-center p-0.5 w-full max-w-[260px]"
        style={{ borderRadius: 999, background: "#fff", border: "1px solid #ece9e1" }}
      >
        <button
          type="button"
          onClick={() => setMobileTab("form")}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors"
          style={mobileTab === "form" ? { background: "#1f3a33", color: "#f7f5ef" } : { color: "#6d6d68" }}
        >
          Formulaire
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("preview")}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors"
          style={mobileTab === "preview" ? { background: "#1f3a33", color: "#f7f5ef" } : { color: "#6d6d68" }}
        >
          Aperçu
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "#1f3a33" }}
          >
            <Edit2 className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: "#9c9484" }}>
              Modification
            </div>
            <h5 className="text-[14px] font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
              Modifier la formule
            </h5>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {isSapApproved && (
            <label
              className="inline-flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded-full hover:bg-[#fafafa] transition-colors"
              style={{ border: "1px solid #cfdbd3", background: "#fff" }}
            >
              <input
                type="checkbox"
                checked={sapEligible}
                onChange={(e) => setSapEligible(e.target.checked)}
                className="w-3.5 h-3.5 rounded"
                style={{ accentColor: "#1f3a33" }}
              />
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: "#2f4a3f" }}>
                <FileCheck className="w-3 h-3" />
                SAP
              </span>
            </label>
          )}
          <label
            className="inline-flex items-center gap-2 cursor-pointer px-2 py-1 rounded-full hover:bg-[#fafafa] transition-colors"
            style={{ border: "1px solid #ece9e1", background: "#fff" }}
          >
            <span className="text-[10px] font-medium" style={{ color: "#6d6d68" }}>Active</span>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-3.5 h-3.5 rounded"
              style={{ accentColor: "#1f3a33" }}
            />
          </label>
        </div>
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
        <ContactInfoWarning text={name} />
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
        <ContactInfoWarning text={description} />
      </div>

      {/* Photos de la formule — affichées dans les résultats de recherche */}
      <div className="pt-3 border-t border-primary/10">
        <ServicePhotosUploader
          photos={photoUrls.map((url, i) => {
            const original = variant.photos?.find((p) => p.url === url);
            return {
              url,
              order: i,
              moderationStatus: original?.moderationStatus,
              rejectionReason: original?.rejectionReason,
            };
          })}
          onChange={(urls) => setPhotoUrls(urls)}
        />
      </div>

      {/* Objectifs / Activités - Sélecteur depuis admin */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          {isGardeService ? "Activités proposées pendant la garde (optionnel)" : "Objectifs de la prestation (optionnel)"}
        </label>

        {/* Sélecteur d'activités si disponibles depuis l'admin */}
        {availableActivities.length > 0 ? (
          <>
            <button
              type="button"
              onClick={() => setShowActivitySelector(!showActivitySelector)}
              className={cn(
                "w-full px-4 py-3 border-2 border-dashed rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2",
                showActivitySelector
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-gray-300 bg-gray-50 text-gray-600 hover:border-gray-400"
              )}
            >
              <Sparkles className="w-4 h-4" />
              {showActivitySelector ? "Fermer le sélecteur" : `Choisir des ${isGardeService ? "activités" : "objectifs"} (${objectives.length} sélectionné${objectives.length > 1 ? "s" : ""})`}
            </button>

            {/* Grille de sélection */}
            <AnimatePresence>
              {showActivitySelector && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200"
                >
                  <div className="grid grid-cols-2 gap-2">
                    {availableActivities.map((activity) => (
                      <button
                        key={activity._id}
                        type="button"
                        onClick={() => toggleActivity(activity)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all text-left",
                          isActivitySelected(activity)
                            ? isGardeService
                              ? "bg-emerald-100 border-2 border-emerald-400 text-emerald-800"
                              : "bg-purple-100 border-2 border-purple-400 text-purple-800"
                            : "bg-white border border-gray-200 hover:border-gray-300 text-gray-700"
                        )}
                      >
                        <span className="text-lg">{activity.emoji}</span>
                        <span className="flex-1 truncate">{activity.name}</span>
                        {isActivitySelected(activity) && (
                          <Check className="w-4 h-4 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <p className="text-sm text-gray-500 italic">Aucune activité configurée par l&apos;administrateur</p>
        )}

        {/* Affichage des activités sélectionnées */}
        {objectives.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {objectives.map((objective, idx) => (
              <span
                key={idx}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm",
                  isGardeService ? "bg-emerald-50 text-emerald-700" : "bg-purple-50 text-purple-700"
                )}
              >
                {objective.icon} {objective.text}
                <button type="button" onClick={() => handleRemoveObjective(idx)} className="hover:text-red-500 ml-1">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Duration & Nombre de séances - masqué pour les services de garde */}
      {!isGardeService && (
        <div className="flex flex-wrap gap-4">
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
      )}

      {/* Délai entre séances - visible si plusieurs séances (non garde) */}
      {!isGardeService && numberOfSessions > 1 && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Délai entre chaque séance</label>
          <select
            value={sessionInterval || ""}
            onChange={(e) => setSessionInterval(e.target.value ? parseInt(e.target.value) : undefined)}
            className="px-3 py-2 bg-white border border-foreground/10 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          >
            <option value="">Pas de délai minimum</option>
            <option value="1">1 jour minimum</option>
            <option value="2">2 jours minimum</option>
            <option value="3">3 jours minimum</option>
            <option value="7">1 semaine minimum</option>
            <option value="14">2 semaines minimum</option>
            <option value="30">1 mois minimum</option>
          </select>
          {sessionInterval && (
            <p className="text-xs text-text-light mt-1">
              Les {numberOfSessions} séances seront espacées d'au moins {sessionInterval} jour(s)
            </p>
          )}
        </div>
      )}

      {/* Type de séance - masqué pour les services de garde */}
      {!isGardeService && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Type de séance</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`sessionType-edit-${variant.id}`}
                value="individual"
                checked={sessionType === "individual"}
                onChange={() => {
                  setSessionType("individual");
                  setMaxAnimalsPerSession(undefined);
                }}
                className="w-4 h-4 text-primary focus:ring-primary"
              />
              <span className="text-sm">Individuelle</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`sessionType-edit-${variant.id}`}
                value="collective"
                checked={sessionType === "collective"}
                onChange={() => {
                  setSessionType("collective");
                  setMaxAnimalsPerSession(5);
                }}
                className="w-4 h-4 text-primary focus:ring-primary"
              />
              <span className="text-sm">Collective</span>
            </label>
          </div>
        </div>
      )}

      {/* Nombre max d'animaux - visible si séance collective (et non garde) */}
      {!isGardeService && sessionType === "collective" && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Nombre max d'animaux par séance</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={maxAnimalsPerSession || 5}
              onChange={(e) => setMaxAnimalsPerSession(parseInt(e.target.value) || 5)}
              min={2}
              max={20}
              className="w-20 px-3 py-2 bg-white border border-foreground/10 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
            <span className="text-sm text-text-light">animaux max</span>
          </div>
        </div>
      )}

      {/* Lieu de prestation - masqué pour les services de garde (toujours chez l'annonceur) */}
      {!isGardeService && <div>
        <label className="block text-sm font-medium text-foreground mb-2">Lieu de prestation</label>
        {isCollective && (
          <p className="text-xs text-orange-600 mb-2">Les séances collectives se déroulent obligatoirement à votre domicile.</p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => !isCollective && setServiceLocation("announcer_home")}
            disabled={isCollective && effectiveServiceLocation !== "announcer_home"}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-sm",
              effectiveServiceLocation === "announcer_home"
                ? "border-primary bg-primary/5 text-primary"
                : "border-foreground/10 bg-white text-foreground/60 hover:bg-foreground/5",
              isCollective && effectiveServiceLocation !== "announcer_home" && "opacity-50 cursor-not-allowed"
            )}
          >
            <Home className="w-4 h-4" />
            Mon domicile
          </button>
          <button
            type="button"
            onClick={() => !isCollective && setServiceLocation("client_home")}
            disabled={isCollective}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-sm",
              effectiveServiceLocation === "client_home"
                ? "border-secondary bg-secondary/5 text-secondary"
                : "border-foreground/10 bg-white text-foreground/60 hover:bg-foreground/5",
              isCollective && "opacity-50 cursor-not-allowed"
            )}
          >
            <MapPin className="w-4 h-4" />
            À domicile
          </button>
          <button
            type="button"
            onClick={() => !isCollective && setServiceLocation("both")}
            disabled={isCollective}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-sm",
              effectiveServiceLocation === "both"
                ? "border-purple-500 bg-purple-50 text-purple-600"
                : "border-foreground/10 bg-white text-foreground/60 hover:bg-foreground/5",
              isCollective && "opacity-50 cursor-not-allowed"
            )}
          >
            <Home className="w-3.5 h-3.5" />
            <MapPin className="w-3.5 h-3.5" />
            Les deux
          </button>
        </div>
      </div>}

      {/* Animaux acceptés */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Animaux acceptés pour cette service</label>
        <div className="flex flex-wrap gap-2">
          {serviceAnimalTypes.map((animal) => {
            const isSelected = selectedAnimalTypes.includes(animal);
            return (
              <button
                key={animal}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    setSelectedAnimalTypes(selectedAnimalTypes.filter(a => a !== animal));
                  } else {
                    setSelectedAnimalTypes([...selectedAnimalTypes, animal]);
                  }
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                  isSelected
                    ? "bg-primary/10 text-primary border-2 border-primary"
                    : "bg-foreground/5 text-foreground/60 border-2 border-transparent hover:bg-foreground/10"
                )}
              >
                {animalLabels[animal] || animal}
                {isSelected && <Check className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
        {selectedAnimalTypes.length === 0 && (
          <p className="text-xs text-red-500 mt-1">Sélectionnez au moins un type d'animal</p>
        )}
      </div>

      {/* Restrictions chiens - visible seulement si chien est accepté */}
      {selectedAnimalTypes.includes("chien") && (
        <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 space-y-4">
          <label className="block text-sm font-medium text-amber-800 flex items-center gap-2">
            <span>🐕</span>
            Restrictions chiens (optionnel)
          </label>

          {/* Tailles de chiens acceptées */}
          <div>
            <p className="text-xs font-medium text-amber-700 mb-2">Tailles acceptées</p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "small" as const, label: "Petit", desc: "< 10 kg" },
                { id: "medium" as const, label: "Moyen", desc: "10-25 kg" },
                { id: "large" as const, label: "Grand", desc: "> 25 kg" },
              ].map((size) => {
                const isSelected = acceptedDogSizes.includes(size.id);
                return (
                  <button
                    key={size.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        if (acceptedDogSizes.length > 1) {
                          setAcceptedDogSizes(acceptedDogSizes.filter((s) => s !== size.id));
                        }
                      } else {
                        setAcceptedDogSizes([...acceptedDogSizes, size.id]);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                      isSelected
                        ? "bg-amber-200 border-2 border-amber-400 text-amber-900 font-medium"
                        : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"
                    )}
                  >
                    <span>{size.label}</span>
                    <span className="text-xs opacity-70">({size.desc})</span>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chiens catégorisés */}
          <div>
            <p className="text-xs font-medium text-amber-700 mb-2">Chiens catégorisés (législation française)</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "none" as const, label: "Non catégorisés uniquement", desc: "Pas de chien dangereux" },
                { id: "cat2" as const, label: "Catégorie 2 acceptée", desc: "Chiens de garde" },
                { id: "cat1" as const, label: "Catégorie 1 acceptée", desc: "Chiens d'attaque" },
                { id: "both" as const, label: "Toutes catégories", desc: "Cat. 1 et 2 acceptées" },
              ].map((cat) => {
                const isSelected = dogCategoryAcceptance === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setDogCategoryAcceptance(cat.id)}
                    className={cn(
                      "flex flex-col items-start gap-0.5 px-3 py-2 rounded-lg text-sm transition-all text-left",
                      isSelected
                        ? "bg-amber-200 border-2 border-amber-400"
                        : "bg-white border border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <span className={cn("font-medium", isSelected ? "text-amber-900" : "text-gray-700")}>
                      {cat.label}
                    </span>
                    <span className={cn("text-xs", isSelected ? "text-amber-700" : "text-gray-400")}>
                      {cat.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Pricing */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">Tarifs</label>
        {isVatSubject && (
          <p className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
            Les prix saisis sont en TTC (TVA 20% incluse). Le montant HT est calculé automatiquement.
          </p>
        )}

        {isGardeService ? (
          /* ═══ TARIFS GARDE - Système avec slider ═══ */
          <div className="space-y-4">
            {/* Prix journée */}
            <div className="p-4 bg-gradient-to-br from-primary/5 to-orange-50 rounded-xl border border-primary/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground">Prix par jour {isVatSubject ? "TTC" : ""}</span>
                <span className="text-xs px-2 py-0.5 bg-white rounded-full text-gray-500">
                  {getDailyPrice() <= dailyRecommendedPrice / 100 * 0.9 ? "Compétitif" :
                   getDailyPrice() >= dailyRecommendedPrice / 100 * 1.1 ? "Premium" : "Standard"}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input
                    type="range"
                    min={Math.round(dailyRecommendedPrice * 0.8 / 100)}
                    max={Math.round(dailyRecommendedPrice * 1.2 / 100)}
                    step={1}
                    value={getDailyPrice()}
                    onChange={(e) => handleDailyPriceChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md
                      [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{Math.round(dailyRecommendedPrice * 0.8 / 100)}€</span>
                    <span className="text-primary">Conseillé: {Math.round(dailyRecommendedPrice / 100)}€</span>
                    <span>{Math.round(dailyRecommendedPrice * 1.2 / 100)}€</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-primary">{getDailyPrice().toFixed(0)}</span>
                  <span className="text-sm text-gray-500">€/jour</span>
                  {isVatSubject && (
                    <div className="text-xs text-blue-600 mt-0.5">HT: {(getDailyPrice() / (1 + DEFAULT_VAT_RATE / 100)).toFixed(2).replace(".", ",")}€</div>
                  )}
                </div>
              </div>
              {/* Exemples de facturation garde */}
              {(() => {
                const currentDailyPrice = getDailyPrice();
                const currentHourlyPrice = currentDailyPrice / 8;
                const halfDailyPrice = currentDailyPrice / 2;

                return (
                  <div className="mt-3 pt-3 border-t border-primary/10">
                    <p className="text-xs font-medium text-gray-500 mb-2">
                      Exemples de facturation :
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">2 heures</span>
                        <span className="font-semibold text-gray-700">{(currentHourlyPrice * 2).toFixed(2).replace(".", ",")}€</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">6 heures</span>
                        <span className="font-semibold text-gray-700">{(currentHourlyPrice * 6).toFixed(2).replace(".", ",")}€</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">1 demi-journée</span>
                        <span className="font-semibold text-gray-700">{halfDailyPrice.toFixed(2).replace(".", ",")}€</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">1 journée</span>
                        <span className="font-semibold text-gray-700">{currentDailyPrice.toFixed(2).replace(".", ",")}€</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">2 jours</span>
                        <span className="font-semibold text-gray-700">{(currentDailyPrice * 2).toFixed(2).replace(".", ",")}€</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">1 semaine</span>
                        <span className="font-semibold text-gray-700">{(currentDailyPrice * 5).toFixed(2).replace(".", ",")}€</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Prix nuit (si activé) */}
            {allowOvernightStay && (() => {
              // Utiliser le prix nuit conseillé de l'admin si disponible, sinon 50% du prix journalier
              const nightlyRecommended = defaultNightlyPrice
                ? defaultNightlyPrice / 100
                : Math.round(dailyRecommendedPrice * 0.5 / 100);
              const nightlyMax = Math.round(dailyRecommendedPrice / 100);

              return (
                <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Moon className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm font-medium text-indigo-800">Supplément nuit</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <input
                        type="range"
                        min={0}
                        max={nightlyMax}
                        step={0.5}
                        value={getNightlyPrice()}
                        onChange={(e) => handleNightlyPriceChange(parseFloat(e.target.value))}
                        className="w-full h-2 bg-indigo-200 rounded-full appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:shadow-md"
                      />
                      <div className="flex justify-between text-xs text-indigo-400 mt-1">
                        <span>0€</span>
                        <span>Conseillé: {nightlyRecommended.toFixed(2).replace(".", ",")}€</span>
                        <span>{nightlyMax}€</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-indigo-600">{getNightlyPrice().toFixed(0)}</span>
                      <span className="text-sm text-indigo-400">€/nuit</span>
                      {isVatSubject && (
                        <div className="text-xs text-blue-600 mt-0.5">HT: {(getNightlyPrice() / (1 + DEFAULT_VAT_RATE / 100)).toFixed(2).replace(".", ",")}€</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          /* ═══ TARIFS SERVICES - Système classique ═══ */
          <>
            <div className="grid grid-cols-2 gap-3">
              {showHourly && (
                <div>
                  <label className="block text-xs text-text-light mb-1">Par heure {isVatSubject ? "TTC" : ""}</label>
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
                  {isVatSubject && pricing.hourly ? (
                    <span className="text-[10px] text-blue-600 mt-0.5 block">HT: {((pricing.hourly || 0) / 120).toFixed(2).replace(".", ",")} €</span>
                  ) : null}
                </div>
              )}
              {showHalfDaily && (
                <div>
                  <label className="block text-xs text-text-light mb-1">Par demi-journée {isVatSubject ? "TTC" : ""}</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={(pricing.halfDaily || 0) / 100}
                      onChange={(e) => setPricing({ ...pricing, halfDaily: Math.round(parseFloat(e.target.value) * 100) || undefined })}
                      step={0.5}
                      placeholder="--"
                      className="w-full px-3 py-2 pr-8 bg-white border border-cyan-200 rounded-lg focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light text-sm">€</span>
                  </div>
                  {isVatSubject && pricing.halfDaily ? (
                    <span className="text-[10px] text-blue-600 mt-0.5 block">HT: {((pricing.halfDaily || 0) / 120).toFixed(2).replace(".", ",")} €</span>
                  ) : null}
                </div>
              )}
              {showDaily && (
                <div>
                  <label className="block text-xs text-text-light mb-1">Par jour {isVatSubject ? "TTC" : ""}</label>
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
                  {isVatSubject && pricing.daily ? (
                    <span className="text-[10px] text-blue-600 mt-0.5 block">HT: {((pricing.daily || 0) / 120).toFixed(2).replace(".", ",")} €</span>
                  ) : null}
                </div>
              )}
              {showWeekly && (
                <div>
                  <label className="block text-xs text-text-light mb-1">Par semaine {isVatSubject ? "TTC" : ""}</label>
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
                  {isVatSubject && pricing.weekly ? (
                    <span className="text-[10px] text-blue-600 mt-0.5 block">HT: {((pricing.weekly || 0) / 120).toFixed(2).replace(".", ",")} €</span>
                  ) : null}
                </div>
              )}
              {showMonthly && (
                <div>
                  <label className="block text-xs text-text-light mb-1">Par mois {isVatSubject ? "TTC" : ""}</label>
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
                  {isVatSubject && pricing.monthly ? (
                    <span className="text-[10px] text-blue-600 mt-0.5 block">HT: {((pricing.monthly || 0) / 120).toFixed(2).replace(".", ",")} €</span>
                  ) : null}
                </div>
              )}
            </div>

            {/* Prix conseillé pour services */}
            <PriceRecommendationCompact
              token={token}
              category={category}
              priceUnit={showDaily ? "day" : (showHalfDaily ? "half_day" : "hour")}
              currentPrice={showDaily ? (pricing.daily || 0) : (showHalfDaily ? (pricing.halfDaily || 0) : (pricing.hourly || 0))}
              onSelectPrice={(price) => {
                if (showDaily) {
                  setPricing({ ...pricing, daily: price });
                } else if (showHalfDaily) {
                  setPricing({ ...pricing, halfDaily: price });
                } else {
                  setPricing({ ...pricing, hourly: price });
                }
              }}
            />
          </>
        )}
      </div>

      {/* Actions */}
      <div
        className="flex items-center justify-end gap-2 pt-3 mt-2"
        style={{ borderTop: "1px solid #f1ede3" }}
      >
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium text-[#6d6d68] hover:text-[#1f1f1d] hover:bg-[#f7f5ef] transition-colors"
        >
          Annuler
        </button>
        {(() => {
          const hasContactViolation = Boolean(
            getContactInfoWarning(name) || getContactInfoWarning(description)
          );
          const canSave = !isSaving && name && !hasContactViolation;
          return (
            <motion.button
              onClick={handleSave}
              disabled={!canSave}
              title={
                hasContactViolation
                  ? "Retirez les coordonnées (téléphone / email) avant de sauvegarder"
                  : undefined
              }
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[13px] font-medium transition-opacity hover:opacity-90"
              style={
                canSave
                  ? { background: "#1f3a33", color: "#f7f5ef" }
                  : { background: "#ece9e1", color: "#9c9484", cursor: "not-allowed" }
              }
              whileTap={{ scale: canSave ? 0.98 : 1 }}
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Enregistrer
            </motion.button>
          );
        })()}
      </div>
      </div>
      {/* Fin de la colonne gauche (formulaire) */}

      {/* Colonne droite : aperçu live */}
      <div
        className={cn(
          "lg:block lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto overflow-x-hidden p-4",
          mobileTab === "preview" ? "block" : "hidden"
        )}
        style={{
          borderRadius: 14,
          background: "#fcfaf4",
          border: "1px solid #ece9e1",
        }}
      >
        <ServiceCardPreview
          category={previewCategory}
          variants={[previewVariant]}
          isSapEligible={sapEligible}
          allowOvernightStay={allowOvernightStay}
          serviceDescription={undefined}
          currentStep={2}
        />
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
  announcerPriceMode,
  defaultNightlyPrice,
  serviceAnimalTypes,
  availableActivities = [],
  existingCount,
  isSapApproved,
  onSave,
  onCancel,
}: {
  serviceId: Id<"services">;
  token: string;
  category: string;
  recommendedPrice: number;
  isGardeService: boolean;
  allowOvernightStay?: boolean;
  allowedPriceUnits?: ("hour" | "half_day" | "day" | "week" | "month")[];
  announcerPriceMode?: "manual" | "automatic";
  defaultNightlyPrice?: number;
  serviceAnimalTypes: string[];
  availableActivities?: AdminActivity[];
  existingCount: number;
  isSapApproved?: boolean;
  onSave: (data: {
    name: string;
    description?: string;
    objectives?: Objective[];
    numberOfSessions?: number;
    sessionInterval?: number;
    sessionType?: "individual" | "collective";
    maxAnimalsPerSession?: number;
    serviceLocation?: ServiceLocation;
    animalTypes?: string[];
    dogCategoryAcceptance?: "none" | "cat1" | "cat2" | "both";
    acceptedDogSizes?: ("small" | "medium" | "large")[];
    price: number;
    priceUnit: PriceUnit;
    pricing?: Pricing;
    duration?: number;
    includedFeatures?: string[];
    isSapEligible?: boolean;
    photos?: string[];
  }) => Promise<void>;
  onCancel: () => void;
}) {
  // Wizard step state — formule d'ajout en step-by-step
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const [name, setName] = useState(`Formule ${existingCount + 1}`);
  const [description, setDescription] = useState("");
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [showActivitySelector, setShowActivitySelector] = useState(false);
  const [numberOfSessions, setNumberOfSessions] = useState(1);
  const [sessionInterval, setSessionInterval] = useState<number | undefined>(undefined);
  const [sessionType, setSessionType] = useState<"individual" | "collective">("individual");
  const [maxAnimalsPerSession, setMaxAnimalsPerSession] = useState<number | undefined>(undefined);
  const [serviceLocation, setServiceLocation] = useState<ServiceLocation>("announcer_home");
  const [sapEligible, setSapEligible] = useState(false);
  const [selectedAnimalTypes, setSelectedAnimalTypes] = useState<string[]>(serviceAnimalTypes);
  const [duration, setDuration] = useState(60);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  // TVA
  const { user: authUser } = useAuth();
  const isVatSubject = authUser?.isVatSubject;
  const [includedFeatures, setIncludedFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Restrictions chiens
  const [dogCategoryAcceptance, setDogCategoryAcceptance] = useState<"none" | "cat1" | "cat2" | "both">("none");
  const [acceptedDogSizes, setAcceptedDogSizes] = useState<("small" | "medium" | "large")[]>(["small", "medium", "large"]);

  // Calcul du prix journalier recommandé (pour le slider)
  const dailyRecommendedPrice = announcerPriceMode === "automatic"
    ? recommendedPrice
    : (isGardeService ? recommendedPrice * 8 : recommendedPrice);

  const dailyPrice = dailyRecommendedPrice;
  const hourlyPrice = Math.round(dailyPrice / 8);
  const nightlyPrice = defaultNightlyPrice || Math.round(dailyPrice * 0.5);

  const [pricing, setPricing] = useState<Pricing>(
    isGardeService
      ? { daily: dailyPrice, hourly: hourlyPrice, halfDaily: Math.round(dailyPrice / 2), weekly: Math.round(dailyPrice * 5), monthly: Math.round(dailyPrice * 20), nightly: allowOvernightStay ? nightlyPrice : undefined }
      : { hourly: recommendedPrice }
  );

  // Récupérer le prix journée actuel (en euros)
  const getDailyPrice = () => {
    if (!pricing.daily) return dailyRecommendedPrice / 100;
    return pricing.daily / 100;
  };

  // Récupérer le prix nuit actuel (en euros)
  const getNightlyPrice = () => {
    if (!pricing.nightly) {
      return defaultNightlyPrice
        ? defaultNightlyPrice / 100
        : Math.round(dailyRecommendedPrice * 0.5) / 100;
    }
    return pricing.nightly / 100;
  };

  // Handler pour le prix journée (garde)
  const handleDailyPriceChange = (newDailyPriceEuros: number) => {
    const dailyInCents = Math.round(newDailyPriceEuros * 100);
    const hourlyInCents = Math.round(dailyInCents / 8);
    const currentNightly = pricing.nightly || 0;
    const newNightly = currentNightly > dailyInCents ? dailyInCents : currentNightly;
    setPricing({
      ...pricing,
      daily: dailyInCents,
      hourly: hourlyInCents,
      halfDaily: Math.round(dailyInCents / 2),
      weekly: Math.round(dailyInCents * 5),
      monthly: Math.round(dailyInCents * 20),
      nightly: newNightly > 0 ? newNightly : undefined,
    });
  };

  // Handler pour le prix nuit (garde)
  const handleNightlyPriceChange = (newNightlyPriceEuros: number) => {
    const nightlyInCents = Math.round(newNightlyPriceEuros * 100);
    const dailyInCents = pricing.daily || dailyRecommendedPrice;
    const clampedNightly = Math.min(nightlyInCents, dailyInCents);
    setPricing({
      ...pricing,
      nightly: clampedNightly,
    });
  };

  // Si collective, forcer le lieu à announcer_home
  const isCollective = sessionType === "collective";
  const effectiveServiceLocation = isCollective ? "announcer_home" : serviceLocation;

  // Déterminer quels prix afficher selon allowedPriceUnits
  // Si allowedPriceUnits est défini et non vide, on utilise uniquement ces types
  // Sinon, on utilise les valeurs par défaut
  const hasConfiguredPriceUnits = allowedPriceUnits && allowedPriceUnits.length > 0;
  const showHourly = hasConfiguredPriceUnits ? allowedPriceUnits.includes("hour") : true;
  const showHalfDaily = hasConfiguredPriceUnits ? allowedPriceUnits.includes("half_day") : false;
  const showDaily = hasConfiguredPriceUnits ? allowedPriceUnits.includes("day") : true;
  const showWeekly = hasConfiguredPriceUnits ? allowedPriceUnits.includes("week") : false;
  const showMonthly = hasConfiguredPriceUnits ? allowedPriceUnits.includes("month") : false;

  // Vérifier si une activité est sélectionnée
  const isActivitySelected = (activity: AdminActivity) => {
    return objectives.some((obj) => obj.text === activity.name && obj.icon === activity.emoji);
  };

  // Toggle une activité
  const toggleActivity = (activity: AdminActivity) => {
    if (isActivitySelected(activity)) {
      setObjectives(objectives.filter((obj) => !(obj.text === activity.name && obj.icon === activity.emoji)));
    } else {
      setObjectives([...objectives, { icon: activity.emoji, text: activity.name }]);
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
      // Déterminer si les restrictions chiens s'appliquent
      const acceptsDogs = selectedAnimalTypes.includes("chien");

      await onSave({
        name,
        description: description || undefined,
        objectives: objectives.length > 0 ? objectives : undefined,
        numberOfSessions: numberOfSessions > 1 ? numberOfSessions : undefined,
        sessionInterval: numberOfSessions > 1 ? sessionInterval : undefined,
        sessionType,
        maxAnimalsPerSession: sessionType === "collective" ? maxAnimalsPerSession : undefined,
        serviceLocation: effectiveServiceLocation,
        animalTypes: selectedAnimalTypes.length > 0 ? selectedAnimalTypes : undefined,
        dogCategoryAcceptance: acceptsDogs ? dogCategoryAcceptance : undefined,
        acceptedDogSizes: acceptsDogs ? acceptedDogSizes : undefined,
        price: mainPrice,
        priceUnit: isGardeService || !showHourly ? "day" : "hour",
        pricing,
        duration,
        includedFeatures: includedFeatures.length > 0 ? includedFeatures : undefined,
        isSapEligible: sapEligible || undefined,
        photos: photoUrls.length > 0 ? photoUrls : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="p-4 space-y-4"
      style={{ borderRadius: 14, background: "#fcfaf4", border: "1px solid #ece9e1" }}
    >
      {/* Header avec eyebrow + step indicator wizard */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "#1f3a33" }}
            >
              <Plus className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: "#9c9484" }}>
                Création
              </div>
              <h5 className="text-[14px] font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
                Nouvelle formule
              </h5>
            </div>
          </div>
          {isSapApproved && (
            <label
              className="inline-flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded-full hover:bg-[#fafafa] transition-colors flex-shrink-0"
              style={{ border: "1px solid #cfdbd3", background: "#fff" }}
            >
              <input
                type="checkbox"
                checked={sapEligible}
                onChange={(e) => setSapEligible(e.target.checked)}
                className="w-3.5 h-3.5 rounded"
                style={{ accentColor: "#1f3a33" }}
              />
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: "#2f4a3f" }}>
                <FileCheck className="w-3 h-3" />
                SAP
              </span>
            </label>
          )}
        </div>
      </div>

      {/* Step indicator wizard */}
      <div
        className="bg-white p-1 overflow-x-auto"
        style={{ borderRadius: 999, border: "1px solid #ece9e1" }}
      >
        <div className="flex items-center gap-0.5 min-w-max">
          {[
            { id: 1 as const, label: "Identité" },
            { id: 2 as const, label: "Configuration" },
            { id: 3 as const, label: "Tarifs" },
          ].map((step, idx, arr) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            return (
              <div key={step.id} className="flex items-center gap-0.5 flex-1">
                <button
                  type="button"
                  onClick={() => {
                    if (isCompleted) setCurrentStep(step.id);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-all"
                  style={
                    isActive
                      ? { background: "#1f3a33", color: "#f7f5ef" }
                      : isCompleted
                        ? { color: "#2f4a3f", background: "#eaf0ed", cursor: "pointer" }
                        : { color: "#9c9484", cursor: "default" }
                  }
                >
                  <span
                    className="flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold flex-shrink-0"
                    style={
                      isActive
                        ? { background: "rgba(247,245,239,0.25)", color: "#f7f5ef" }
                        : isCompleted
                          ? { background: "rgba(47,74,63,0.15)", color: "#2f4a3f" }
                          : { background: "#f7f5ef", color: "#9c9484" }
                    }
                  >
                    {isCompleted ? <Check className="w-2.5 h-2.5" /> : step.id}
                  </span>
                  <span>{step.label}</span>
                </button>
                {idx < arr.length - 1 && (
                  <div
                    className="w-2 h-px flex-shrink-0"
                    style={{ background: isCompleted ? "#cfdbd3" : "#ece9e1" }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ÉTAPE 1 : Identité (nom, description, photos) */}
      {currentStep === 1 && (
        <>
          {/* Name */}
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-[0.1em] mb-1.5" style={{ color: "#9c9484" }}>
              Nom de la formule
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 text-[13px] text-[#1f1f1d] focus:outline-none focus:ring-2 focus:ring-[#1f3a33]/20 transition-all placeholder:text-[#cdc9c0]"
              style={{ borderRadius: 10, border: "1px solid #ece9e1", background: "#fff" }}
            />
            <ContactInfoWarning text={name} />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-[0.1em] mb-1.5" style={{ color: "#9c9484" }}>
              Description <span className="normal-case text-[#cdc9c0] font-normal">(optionnel)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 text-[13px] text-[#1f1f1d] focus:outline-none focus:ring-2 focus:ring-[#1f3a33]/20 transition-all resize-none placeholder:text-[#cdc9c0]"
              style={{ borderRadius: 10, border: "1px solid #ece9e1", background: "#fff" }}
            />
            <ContactInfoWarning text={description} />
          </div>

          {/* Photos */}
          <div className="pt-3" style={{ borderTop: "1px solid #f1ede3" }}>
            <ServicePhotosUploader
              photos={photoUrls.map((url, i) => ({ url, order: i }))}
              onChange={(urls) => setPhotoUrls(urls)}
            />
          </div>
        </>
      )}

      {/* Sections suivantes : visibles à partir de l'étape 2 */}
      {currentStep >= 2 && (
      <>
      {/* Objectifs / Activités - Sélecteur depuis admin */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          {isGardeService ? "Activités proposées pendant la garde (optionnel)" : "Objectifs de la prestation (optionnel)"}
        </label>

        {/* Sélecteur d'activités si disponibles depuis l'admin */}
        {availableActivities.length > 0 ? (
          <>
            <button
              type="button"
              onClick={() => setShowActivitySelector(!showActivitySelector)}
              className={cn(
                "w-full px-4 py-3 border-2 border-dashed rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2",
                showActivitySelector
                  ? "border-secondary bg-secondary/5 text-secondary"
                  : "border-gray-300 bg-gray-50 text-gray-600 hover:border-gray-400"
              )}
            >
              <Sparkles className="w-4 h-4" />
              {showActivitySelector ? "Fermer le sélecteur" : `Choisir des ${isGardeService ? "activités" : "objectifs"} (${objectives.length} sélectionné${objectives.length > 1 ? "s" : ""})`}
            </button>

            {/* Grille de sélection */}
            <AnimatePresence>
              {showActivitySelector && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200"
                >
                  <div className="grid grid-cols-2 gap-2">
                    {availableActivities.map((activity) => (
                      <button
                        key={activity._id}
                        type="button"
                        onClick={() => toggleActivity(activity)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all text-left",
                          isActivitySelected(activity)
                            ? isGardeService
                              ? "bg-emerald-100 border-2 border-emerald-400 text-emerald-800"
                              : "bg-purple-100 border-2 border-purple-400 text-purple-800"
                            : "bg-white border border-gray-200 hover:border-gray-300 text-gray-700"
                        )}
                      >
                        <span className="text-lg">{activity.emoji}</span>
                        <span className="flex-1 truncate">{activity.name}</span>
                        {isActivitySelected(activity) && (
                          <Check className="w-4 h-4 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <p className="text-sm text-gray-500 italic">Aucune activité configurée par l&apos;administrateur</p>
        )}

        {/* Affichage des activités sélectionnées */}
        {objectives.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {objectives.map((objective, idx) => (
              <span
                key={idx}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm",
                  isGardeService ? "bg-emerald-50 text-emerald-700" : "bg-purple-50 text-purple-700"
                )}
              >
                {objective.icon} {objective.text}
                <button type="button" onClick={() => handleRemoveObjective(idx)} className="hover:text-red-500 ml-1">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Duration & Nombre de séances - masqué pour les services de garde */}
      {!isGardeService && (
        <div className="flex flex-wrap gap-4">
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
      )}

      {/* Délai entre séances - visible si plusieurs séances (non garde) */}
      {!isGardeService && numberOfSessions > 1 && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Délai entre chaque séance</label>
          <select
            value={sessionInterval || ""}
            onChange={(e) => setSessionInterval(e.target.value ? parseInt(e.target.value) : undefined)}
            className="px-3 py-2 bg-white border border-foreground/10 rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
          >
            <option value="">Pas de délai minimum</option>
            <option value="1">1 jour minimum</option>
            <option value="2">2 jours minimum</option>
            <option value="3">3 jours minimum</option>
            <option value="7">1 semaine minimum</option>
            <option value="14">2 semaines minimum</option>
            <option value="30">1 mois minimum</option>
          </select>
          {sessionInterval && (
            <p className="text-xs text-text-light mt-1">
              Les {numberOfSessions} séances seront espacées d'au moins {sessionInterval} jour(s)
            </p>
          )}
        </div>
      )}

      {/* Type de séance - masqué pour les services de garde */}
      {!isGardeService && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Type de séance</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="sessionType-add"
                value="individual"
                checked={sessionType === "individual"}
                onChange={() => {
                  setSessionType("individual");
                  setMaxAnimalsPerSession(undefined);
                }}
                className="w-4 h-4 text-secondary focus:ring-secondary"
              />
              <span className="text-sm">Individuelle</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="sessionType-add"
                value="collective"
                checked={sessionType === "collective"}
                onChange={() => {
                  setSessionType("collective");
                  setMaxAnimalsPerSession(5);
                }}
                className="w-4 h-4 text-secondary focus:ring-secondary"
              />
              <span className="text-sm">Collective</span>
            </label>
          </div>
        </div>
      )}

      {/* Nombre max d'animaux - visible si séance collective (et non garde) */}
      {!isGardeService && sessionType === "collective" && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Nombre max d'animaux par séance</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={maxAnimalsPerSession || 5}
              onChange={(e) => setMaxAnimalsPerSession(parseInt(e.target.value) || 5)}
              min={2}
              max={20}
              className="w-20 px-3 py-2 bg-white border border-foreground/10 rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
            />
            <span className="text-sm text-text-light">animaux max</span>
          </div>
        </div>
      )}

      {/* Lieu de prestation - masqué pour les services de garde (toujours chez l'annonceur) */}
      {!isGardeService && <div>
        <label className="block text-sm font-medium text-foreground mb-2">Lieu de prestation</label>
        {isCollective && (
          <p className="text-xs text-orange-600 mb-2">Les séances collectives se déroulent obligatoirement à votre domicile.</p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => !isCollective && setServiceLocation("announcer_home")}
            disabled={isCollective && effectiveServiceLocation !== "announcer_home"}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-sm",
              effectiveServiceLocation === "announcer_home"
                ? "border-secondary bg-secondary/5 text-secondary"
                : "border-foreground/10 bg-white text-foreground/60 hover:bg-foreground/5",
              isCollective && effectiveServiceLocation !== "announcer_home" && "opacity-50 cursor-not-allowed"
            )}
          >
            <Home className="w-4 h-4" />
            Mon domicile
          </button>
          <button
            type="button"
            onClick={() => !isCollective && setServiceLocation("client_home")}
            disabled={isCollective}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-sm",
              effectiveServiceLocation === "client_home"
                ? "border-secondary bg-secondary/5 text-secondary"
                : "border-foreground/10 bg-white text-foreground/60 hover:bg-foreground/5",
              isCollective && "opacity-50 cursor-not-allowed"
            )}
          >
            <MapPin className="w-4 h-4" />
            À domicile
          </button>
          <button
            type="button"
            onClick={() => !isCollective && setServiceLocation("both")}
            disabled={isCollective}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-sm",
              effectiveServiceLocation === "both"
                ? "border-purple-500 bg-purple-50 text-purple-600"
                : "border-foreground/10 bg-white text-foreground/60 hover:bg-foreground/5",
              isCollective && "opacity-50 cursor-not-allowed"
            )}
          >
            <Home className="w-3.5 h-3.5" />
            <MapPin className="w-3.5 h-3.5" />
            Les deux
          </button>
        </div>
      </div>}

      {/* Animaux acceptés */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Animaux acceptés pour cette service</label>
        <div className="flex flex-wrap gap-2">
          {serviceAnimalTypes.map((animal) => {
            const isSelected = selectedAnimalTypes.includes(animal);
            return (
              <button
                key={animal}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    setSelectedAnimalTypes(selectedAnimalTypes.filter(a => a !== animal));
                  } else {
                    setSelectedAnimalTypes([...selectedAnimalTypes, animal]);
                  }
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                  isSelected
                    ? "bg-secondary/10 text-secondary border-2 border-secondary"
                    : "bg-foreground/5 text-foreground/60 border-2 border-transparent hover:bg-foreground/10"
                )}
              >
                {animalLabels[animal] || animal}
                {isSelected && <Check className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
        {selectedAnimalTypes.length === 0 && (
          <p className="text-xs text-red-500 mt-1">Sélectionnez au moins un type d'animal</p>
        )}
      </div>

      {/* Restrictions chiens - visible seulement si chien est accepté */}
      {selectedAnimalTypes.includes("chien") && (
        <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 space-y-4">
          <label className="block text-sm font-medium text-amber-800 flex items-center gap-2">
            <span>🐕</span>
            Restrictions chiens (optionnel)
          </label>

          {/* Tailles de chiens acceptées */}
          <div>
            <p className="text-xs font-medium text-amber-700 mb-2">Tailles acceptées</p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "small" as const, label: "Petit", desc: "< 10 kg" },
                { id: "medium" as const, label: "Moyen", desc: "10-25 kg" },
                { id: "large" as const, label: "Grand", desc: "> 25 kg" },
              ].map((size) => {
                const isSelected = acceptedDogSizes.includes(size.id);
                return (
                  <button
                    key={size.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        if (acceptedDogSizes.length > 1) {
                          setAcceptedDogSizes(acceptedDogSizes.filter((s) => s !== size.id));
                        }
                      } else {
                        setAcceptedDogSizes([...acceptedDogSizes, size.id]);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                      isSelected
                        ? "bg-amber-200 border-2 border-amber-400 text-amber-900 font-medium"
                        : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"
                    )}
                  >
                    <span>{size.label}</span>
                    <span className="text-xs opacity-70">({size.desc})</span>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chiens catégorisés */}
          <div>
            <p className="text-xs font-medium text-amber-700 mb-2">Chiens catégorisés (législation française)</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "none" as const, label: "Non catégorisés uniquement", desc: "Pas de chien dangereux" },
                { id: "cat2" as const, label: "Catégorie 2 acceptée", desc: "Chiens de garde" },
                { id: "cat1" as const, label: "Catégorie 1 acceptée", desc: "Chiens d'attaque" },
                { id: "both" as const, label: "Toutes catégories", desc: "Cat. 1 et 2 acceptées" },
              ].map((cat) => {
                const isSelected = dogCategoryAcceptance === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setDogCategoryAcceptance(cat.id)}
                    className={cn(
                      "flex flex-col items-start gap-0.5 px-3 py-2 rounded-lg text-sm transition-all text-left",
                      isSelected
                        ? "bg-amber-200 border-2 border-amber-400"
                        : "bg-white border border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <span className={cn("font-medium", isSelected ? "text-amber-900" : "text-gray-700")}>
                      {cat.label}
                    </span>
                    <span className={cn("text-xs", isSelected ? "text-amber-700" : "text-gray-400")}>
                      {cat.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Pricing */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">Tarifs</label>
        {isVatSubject && (
          <p className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
            Les prix saisis sont en TTC (TVA 20% incluse). Le montant HT est calculé automatiquement.
          </p>
        )}

        {isGardeService ? (
          /* ═══ TARIFS GARDE - Système avec slider ═══ */
          <div className="space-y-4">
            {/* Prix journée */}
            <div className="p-4 bg-gradient-to-br from-secondary/5 to-orange-50 rounded-xl border border-secondary/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground">Prix par jour {isVatSubject ? "TTC" : ""}</span>
                <span className="text-xs px-2 py-0.5 bg-white rounded-full text-gray-500">
                  {getDailyPrice() <= dailyRecommendedPrice / 100 * 0.9 ? "Compétitif" :
                   getDailyPrice() >= dailyRecommendedPrice / 100 * 1.1 ? "Premium" : "Standard"}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input
                    type="range"
                    min={Math.round(dailyRecommendedPrice * 0.8 / 100)}
                    max={Math.round(dailyRecommendedPrice * 1.2 / 100)}
                    step={1}
                    value={getDailyPrice()}
                    onChange={(e) => handleDailyPriceChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-secondary [&::-webkit-slider-thumb]:shadow-md
                      [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{Math.round(dailyRecommendedPrice * 0.8 / 100)}€</span>
                    <span className="text-secondary">Conseillé: {Math.round(dailyRecommendedPrice / 100)}€</span>
                    <span>{Math.round(dailyRecommendedPrice * 1.2 / 100)}€</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-secondary">{getDailyPrice().toFixed(0)}</span>
                  <span className="text-sm text-gray-500">€/jour</span>
                  {isVatSubject && (
                    <div className="text-xs text-blue-600 mt-0.5">HT: {(getDailyPrice() / (1 + DEFAULT_VAT_RATE / 100)).toFixed(2).replace(".", ",")}€</div>
                  )}
                </div>
              </div>
            </div>

            {/* Prix nuit - si autorisé */}
            {allowOvernightStay && (
              <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm font-medium text-foreground">Supplément nuit</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-white rounded-full text-indigo-500">Optionnel</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <input
                      type="range"
                      min={0}
                      max={Math.round(getDailyPrice())}
                      step={1}
                      value={getNightlyPrice()}
                      onChange={(e) => handleNightlyPriceChange(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:shadow-md
                        [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>0€</span>
                      <span className="text-indigo-500">Conseillé: {defaultNightlyPrice ? Math.round(defaultNightlyPrice / 100) : Math.round(getDailyPrice() * 0.5)}€</span>
                      <span>{Math.round(getDailyPrice())}€</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-indigo-600">{getNightlyPrice().toFixed(0)}</span>
                    <span className="text-sm text-gray-500">€/nuit</span>
                    {isVatSubject && (
                      <div className="text-xs text-blue-600 mt-0.5">HT: {(getNightlyPrice() / (1 + DEFAULT_VAT_RATE / 100)).toFixed(2).replace(".", ",")}€</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ═══ TARIFS SERVICES - Grille classique ═══ */
          <div className="grid grid-cols-2 gap-3">
            {showHourly && (
              <div>
                <label className="block text-xs text-text-light mb-1">Par heure {isVatSubject ? "TTC" : ""}</label>
                <div className="relative">
                  <input
                    type="number"
                    value={(pricing.hourly || 0) / 100}
                    onChange={(e) => setPricing({ ...pricing, hourly: Math.round(parseFloat(e.target.value) * 100) || undefined })}
                    step={0.5}
                    placeholder="--"
                    className="w-full px-3 py-2 pr-8 bg-white border border-foreground/10 rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light text-sm">€</span>
                </div>
                {isVatSubject && pricing.hourly ? (
                  <span className="text-[10px] text-blue-600 mt-0.5 block">HT: {((pricing.hourly || 0) / 120).toFixed(2).replace(".", ",")} €</span>
                ) : null}
              </div>
            )}
            {showHalfDaily && (
              <div>
                <label className="block text-xs text-text-light mb-1">Par demi-journée {isVatSubject ? "TTC" : ""}</label>
                <div className="relative">
                  <input
                    type="number"
                    value={(pricing.halfDaily || 0) / 100}
                    onChange={(e) => setPricing({ ...pricing, halfDaily: Math.round(parseFloat(e.target.value) * 100) || undefined })}
                    step={0.5}
                    placeholder="--"
                    className="w-full px-3 py-2 pr-8 bg-white border border-cyan-200 rounded-lg focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light text-sm">€</span>
                </div>
                {isVatSubject && pricing.halfDaily ? (
                  <span className="text-[10px] text-blue-600 mt-0.5 block">HT: {((pricing.halfDaily || 0) / 120).toFixed(2).replace(".", ",")} €</span>
                ) : null}
              </div>
            )}
            {showDaily && (
              <div>
                <label className="block text-xs text-text-light mb-1">Par jour {isVatSubject ? "TTC" : ""}</label>
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
                {isVatSubject && pricing.daily ? (
                  <span className="text-[10px] text-blue-600 mt-0.5 block">HT: {((pricing.daily || 0) / 120).toFixed(2).replace(".", ",")} €</span>
                ) : null}
              </div>
            )}
            {showWeekly && (
              <div>
                <label className="block text-xs text-text-light mb-1">Par semaine {isVatSubject ? "TTC" : ""}</label>
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
                {isVatSubject && pricing.weekly ? (
                  <span className="text-[10px] text-blue-600 mt-0.5 block">HT: {((pricing.weekly || 0) / 120).toFixed(2).replace(".", ",")} €</span>
                ) : null}
              </div>
            )}
            {showMonthly && (
              <div>
                <label className="block text-xs text-text-light mb-1">Par mois {isVatSubject ? "TTC" : ""}</label>
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
                {isVatSubject && pricing.monthly ? (
                  <span className="text-[10px] text-blue-600 mt-0.5 block">HT: {((pricing.monthly || 0) / 120).toFixed(2).replace(".", ",")} €</span>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* Prix conseillé - uniquement pour les services non-garde */}
        {!isGardeService && (
          <PriceRecommendationCompact
            token={token}
            category={category}
            priceUnit={showDaily ? "day" : (showHalfDaily ? "half_day" : "hour")}
            currentPrice={showDaily ? (pricing.daily || 0) : (showHalfDaily ? (pricing.halfDaily || 0) : (pricing.hourly || 0))}
            onSelectPrice={(price) => {
              if (showDaily) {
                setPricing({ ...pricing, daily: price });
              } else if (showHalfDaily) {
                setPricing({ ...pricing, halfDaily: price });
              } else {
                setPricing({ ...pricing, hourly: price });
              }
            }}
          />
        )}
      </div>
      </>
      )}

      {/* Wizard navigation footer */}
      <div
        className="flex items-center justify-between gap-2 pt-3 mt-2"
        style={{ borderTop: "1px solid #f1ede3" }}
      >
        <button
          onClick={() => {
            if (currentStep === 1) {
              onCancel();
            } else {
              setCurrentStep((currentStep - 1) as 1 | 2 | 3);
            }
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium text-[#6d6d68] hover:text-[#1f1f1d] hover:bg-[#f7f5ef] transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          {currentStep === 1 ? "Annuler" : "Retour"}
        </button>

        {(() => {
          const hasContactViolation = Boolean(
            getContactInfoWarning(name) || getContactInfoWarning(description)
          );
          if (currentStep < 3) {
            // Bouton Suivant : bloqué à l'étape 1 si name vide OU coordonnées détectées
            const blocked = (currentStep === 1 && !name) || (currentStep === 1 && hasContactViolation);
            return (
              <motion.button
                onClick={() => setCurrentStep((currentStep + 1) as 1 | 2 | 3)}
                disabled={blocked}
                title={
                  hasContactViolation
                    ? "Retirez les coordonnées (téléphone / email) avant de continuer"
                    : undefined
                }
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[13px] font-medium transition-opacity hover:opacity-90"
                style={
                  !blocked
                    ? { background: "#1f3a33", color: "#f7f5ef" }
                    : { background: "#ece9e1", color: "#9c9484", cursor: "not-allowed" }
                }
                whileTap={{ scale: !blocked ? 0.98 : 1 }}
              >
                Suivant
                <ChevronRight className="w-3.5 h-3.5" />
              </motion.button>
            );
          }
          const canSave = !isSaving && name && !hasContactViolation;
          return (
            <motion.button
              onClick={handleSave}
              disabled={!canSave}
              title={
                hasContactViolation
                  ? "Retirez les coordonnées (téléphone / email) avant de créer la formule"
                  : undefined
              }
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[13px] font-medium transition-opacity hover:opacity-90"
              style={
                canSave
                  ? { background: "#1f3a33", color: "#f7f5ef" }
                  : { background: "#ece9e1", color: "#9c9484", cursor: "not-allowed" }
              }
              whileTap={{ scale: canSave ? 0.98 : 1 }}
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Créer la formule
            </motion.button>
          );
        })()}
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
  initialAddMode?: boolean;
  initialEditingId?: Id<"serviceOptions"> | null;
  onClose?: () => void;
}

function OptionEditor({ serviceId, options, token, initialAddMode, initialEditingId, onClose }: OptionEditorProps) {
  const [isAdding, setIsAdding] = useState(initialAddMode || false);
  const [editingId, setEditingId] = useState<Id<"serviceOptions"> | null>(initialEditingId || null);
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

  // Mode édition directe d'une option spécifique
  if (initialEditingId) {
    const optionToEdit = options.find(o => o.id === initialEditingId);
    if (optionToEdit) {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h5 className="font-medium text-foreground">Modifier l'option</h5>
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Annuler
            </button>
          </div>
          <OptionEditForm
            option={optionToEdit}
            token={token}
            onSave={async (data) => {
              await updateOptionMutation({ token, optionId: optionToEdit.id, ...data });
              onClose?.();
            }}
            onCancel={() => onClose?.()}
          />
        </div>
      );
    }
  }

  // Mode ajout direct d'une nouvelle option
  if (initialAddMode) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h5 className="font-medium text-foreground">Nouvelle option</h5>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Annuler
          </button>
        </div>
        <OptionAddForm
          serviceId={serviceId}
          token={token}
          onSave={async (data) => {
            await addOptionMutation({ token, serviceId, ...data });
            onClose?.();
          }}
          onCancel={() => onClose?.()}
        />
      </div>
    );
  }

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

