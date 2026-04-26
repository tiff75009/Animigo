"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  AlertCircle,
  Briefcase,
  Layers,
  Zap,
  FileCheck,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import VariantManager, { LocalVariant } from "../VariantManager";
import OptionManager, { LocalOption } from "../OptionManager";
import { ServiceCardPreview } from "./ServiceCardPreview";
import { cn } from "@/app/lib/utils";

type ServiceLocation = "announcer_home" | "client_home" | "both";
type PriceUnit = "hour" | "half_day" | "day" | "week" | "month";

interface DefaultVariant {
  name: string;
  description?: string;
  suggestedDuration?: number;
  includedFeatures?: string[];
}

interface ServiceCategory {
  slug: string;
  name: string;
  icon?: string;
  parentCategoryId?: string;
  parentName?: string;
  isParent?: boolean;
  billingType?: "hourly" | "daily" | "flexible";
  allowedPriceUnits?: PriceUnit[];
  defaultVariants?: DefaultVariant[];
  allowCustomVariants?: boolean;
  allowOvernightStay?: boolean;
  allowRangeBooking?: boolean;
  isCapacityBased?: boolean; // Mode garde (propagé depuis le parent)
  // Type de catégorie
  typeId?: string | null;
  typeName?: string | null;
  typeIcon?: string | null;
  typeColor?: string | null;
  // Configuration tarification avancée
  announcerPriceMode?: "manual" | "automatic";
  displayPriceUnit?: PriceUnit;
  clientBillingMode?: "exact_hourly" | "round_half_day" | "round_full_day";
  hourlyBillingSurchargePercent?: number;
  defaultNightlyPrice?: number;
}

interface CategoryType {
  id: string;
  slug: string;
  name: string;
  icon?: string | null;
  color?: string | null;
}

type FormStep = 1 | 2 | 3;

const STEPS = [
  { id: 1, label: "Prestation", icon: Briefcase },
  { id: 2, label: "Services", icon: Layers },
  { id: 3, label: "Options", icon: Zap },
] as const;

interface ServiceFormProps {
  categories: ServiceCategory[];
  categoryTypes?: CategoryType[];
  existingCategories: string[]; // Categories already used by user
  onSubmit: (data: {
    category: string;
    description?: string;
    // animalTypes est maintenant optionnel au niveau service (les animaux sont définis par formule)
    animalTypes?: string[];
    // Catégories de chiens acceptées - legacy, maintenant au niveau formule
    dogCategoryAcceptance?: "none" | "cat1" | "cat2" | "both";
    // Tailles de chiens acceptées - legacy, maintenant au niveau formule
    acceptedDogSizes?: ("small" | "medium" | "large")[];
    // Garde de nuit
    allowOvernightStay?: boolean;
    overnightPrice?: number;
    initialVariants: Array<{
      name: string;
      description?: string;
      objectives?: Array<{ icon: string; text: string }>;
      price: number;
      priceUnit: "hour" | "half_day" | "day" | "week" | "month" | "flat";
      // Multi-tarification
      pricing?: {
        hourly?: number;
        halfDaily?: number;
        daily?: number;
        weekly?: number;
        monthly?: number;
        nightly?: number;
      };
      duration?: number;
      pricingMode?: "per_session" | "per_hour";
      includedFeatures?: string[];
      // Nouveaux champs au niveau de la formule
      sessionType?: "individual" | "collective";
      maxAnimalsPerSession?: number;
      numberOfSessions?: number;
      sessionInterval?: number;
      serviceLocation?: ServiceLocation;
      // Animaux acceptés au niveau de la formule (NOUVEAU)
      animalTypes?: string[];
      // Restrictions chiens au niveau de la formule
      dogCategoryAcceptance?: "none" | "cat1" | "cat2" | "both";
      acceptedDogSizes?: ("small" | "medium" | "large")[];
      // SAP : TVA réduite par formule
      isSapEligible?: boolean;
      // Photos de la formule (URLs Cloudinary, max 3)
      photos?: string[];
    }>;
    initialOptions?: Array<{
      name: string;
      description?: string;
      price: number;
      priceType: "flat" | "per_day" | "per_unit";
      unitLabel?: string;
      maxQuantity?: number;
    }>;
  }) => Promise<boolean | undefined>;
  onCancel: () => void;
  isSubmitting: boolean;
  error?: string | null;
  isSapApproved?: boolean;
}

export default function ServiceForm({
  categories,
  categoryTypes = [],
  existingCategories,
  onSubmit,
  onCancel,
  isSubmitting,
  error,
  isSapApproved,
}: ServiceFormProps) {
  const [currentStep, setCurrentStep] = useState<FormStep>(1);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [localVariants, setLocalVariants] = useState<LocalVariant[]>([]);
  const [localOptions, setLocalOptions] = useState<LocalOption[]>([]);

  // Garde de nuit
  const [allowOvernightStay, setAllowOvernightStay] = useState(false);
  // SAP : TVA réduite
  const [isSapEligible, setIsSapEligible] = useState(false);

  // Onglet mobile : Form ou Aperçu (split-screen sur desktop)
  const [mobileTab, setMobileTab] = useState<"form" | "preview">("form");

  // Note: Les animaux et restrictions chiens sont maintenant au niveau de chaque formule (variant)

  // Récupérer les activités depuis l'admin
  const activities = useQuery(api.services.activities.getActiveActivities);

  const selectedCategory = categories.find((c) => c.slug === category);

  // NOUVEAU: Vérifier si la catégorie sélectionnée a déjà un service existant
  const isAddingToExistingService = existingCategories.includes(category);

  // Toutes les catégories sont disponibles (mode UPSERT)
  // On affiche un indicateur visuel pour les catégories déjà utilisées
  const availableCategories = categories;

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!category;
      case 2:
        // Au moins une formule avec une durée définie ET des animaux définis
        return localVariants.length > 0 && localVariants.every(v =>
          v.duration && v.duration > 0 && v.animalTypes && v.animalTypes.length > 0
        );
      case 3:
        return true; // Options are optional
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 3 && canProceed()) {
      setCurrentStep((currentStep + 1) as FormStep);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as FormStep);
    }
  };

  const handleSubmit = async () => {
    const initialVariants = localVariants.map((v) => ({
      name: v.name,
      description: v.description,
      objectives: v.objectives, // Objectifs avec icône
      price: v.price,
      priceUnit: v.priceUnit,
      pricing: v.pricing, // Multi-tarification
      duration: v.duration,
      pricingMode: v.pricingMode, // "per_session" | "per_hour"
      includedFeatures: v.includedFeatures,
      // Nouveaux champs au niveau de la formule
      sessionType: v.sessionType,
      maxAnimalsPerSession: v.maxAnimalsPerSession,
      numberOfSessions: v.numberOfSessions,
      sessionInterval: v.sessionInterval,
      serviceLocation: v.serviceLocation,
      // Animaux acceptés au niveau de la formule
      animalTypes: v.animalTypes,
      // Restrictions chiens au niveau de la formule
      dogCategoryAcceptance: v.dogCategoryAcceptance,
      acceptedDogSizes: v.acceptedDogSizes,
      // SAP : TVA réduite (appliquée à toutes les formules si coché en step 1)
      isSapEligible: isSapEligible || undefined,
      // Photos de la formule (URLs Cloudinary max 3)
      photos: v.photos && v.photos.length > 0 ? v.photos : undefined,
    }));

    const initialOptions = localOptions.map((o) => ({
      name: o.name,
      description: o.description,
      price: o.price,
      priceType: o.priceType,
      unitLabel: o.unitLabel,
      maxQuantity: o.maxQuantity,
    }));

    // Préparer les données overnight si la catégorie le permet
    // Le prix nuit est maintenant dans chaque variant (pricing.nightly)
    // Les horaires de jour/nuit sont maintenant définis globalement dans l'admin
    const firstVariantNightlyPrice = localVariants[0]?.pricing?.nightly;
    const overnightData = selectedCategory?.allowOvernightStay
      ? {
          allowOvernightStay,
          overnightPrice: allowOvernightStay && firstVariantNightlyPrice ? firstVariantNightlyPrice : undefined,
        }
      : {};

    // Collecter tous les types d'animaux des formules pour le niveau service (rétrocompatibilité)
    const allAnimalTypes = [...new Set(localVariants.flatMap(v => v.animalTypes || []))];

    const success = await onSubmit({
      category,
      description: description || undefined,
      animalTypes: allAnimalTypes.length > 0 ? allAnimalTypes : undefined,
      ...overnightData,
      initialVariants,
      initialOptions: initialOptions.length > 0 ? initialOptions : undefined,
    });

    if (success) {
      onCancel();
    }
  };

  // Catégorie légère pour le composant preview
  const previewCategory = selectedCategory
    ? {
        slug: selectedCategory.slug,
        name: selectedCategory.name,
        icon: selectedCategory.icon,
        isCapacityBased: selectedCategory.isCapacityBased,
        allowOvernightStay: selectedCategory.allowOvernightStay,
        clientBillingMode: selectedCategory.clientBillingMode,
      }
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white"
      style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
    >
      {/* Header (commun aux 2 colonnes sur desktop, sticky en haut) */}
      <div
        className="p-5"
        style={{
          borderBottom: "1px solid #f1ede3",
          background: "#fcfaf4",
          borderTopLeftRadius: 14,
          borderTopRightRadius: 14,
        }}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-0.5">
              {isAddingToExistingService ? "Ajouter à un service existant" : "Nouveau service"}
            </div>
            <h3 className="text-base font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
              {isAddingToExistingService ? "Ajouter une formule" : "Créer une prestation"}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-[#f7f5ef] transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" style={{ color: "#9c9484" }} />
          </button>
        </div>

        {/* Toggle Form/Aperçu — visible uniquement sur mobile */}
        <div
          className="lg:hidden inline-flex items-center p-0.5 mb-3 w-full max-w-[260px]"
          style={{ borderRadius: 999, background: "#fff", border: "1px solid #ece9e1" }}
        >
          <button
            type="button"
            onClick={() => setMobileTab("form")}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors"
            style={
              mobileTab === "form"
                ? { background: "#1f3a33", color: "#f7f5ef" }
                : { color: "#6d6d68" }
            }
          >
            Formulaire
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("preview")}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors"
            style={
              mobileTab === "preview"
                ? { background: "#1f3a33", color: "#f7f5ef" }
                : { color: "#6d6d68" }
            }
          >
            Aperçu
          </button>
        </div>

        {/* Step Indicator - pill bar moderne */}
        <div
          className="bg-white p-1 overflow-x-auto"
          style={{ borderRadius: 999, border: "1px solid #ece9e1" }}
        >
          <div className="flex items-center gap-0.5 min-w-max">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <div key={step.id} className="flex items-center gap-0.5 flex-1">
                  <div
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-all"
                    style={
                      isActive
                        ? { background: "#1f3a33", color: "#f7f5ef" }
                        : isCompleted
                          ? { color: "#2f4a3f", background: "#eaf0ed" }
                          : { color: "#9c9484" }
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
                    <span className="hidden sm:inline">{step.label}</span>
                  </div>
                  {index < STEPS.length - 1 && (
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
      </div>

      {/* ─────────────────────────────────────────────────────────
          Layout : split-screen desktop (form gauche / aperçu droit)
          Tabs Form/Aperçu sur mobile (un seul visible à la fois)
          ───────────────────────────────────────────────────────── */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* Colonne gauche : formulaire */}
        <div
          className={cn(
            "lg:block",
            mobileTab === "form" ? "block" : "hidden"
          )}
          style={{ borderRight: "1px solid #f1ede3" }}
        >
          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="px-5"
              >
                <div
                  className="mt-4 p-3 flex items-start gap-2 text-[12px]"
                  style={{
                    borderRadius: 12,
                    background: "#fdf0f0",
                    border: "1px solid #f1cdcd",
                    color: "#8a3a3a",
                  }}
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="m-0">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content */}
          <div className="p-5">
        <AnimatePresence mode="wait">
          {/* Step 1: Category */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div>
                <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-1">
                  Étape 1 · Prestation
                </div>
                <h4 className="text-base font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
                  Quelle prestation proposez-vous ?
                </h4>
                <p className="text-[13px] text-[#6d6d68] leading-[1.5] mt-1">
                  Choisissez le type de service que vous souhaitez offrir.
                </p>
              </div>

              {category && selectedCategory ? (
                // Vue compacte après sélection
                <div className="space-y-3">
                  <div
                    className="flex items-center gap-3 p-4"
                    style={{
                      borderRadius: 14,
                      border: "1px solid #1f3a33",
                      background: "#f5f9f6",
                    }}
                  >
                    <div
                      className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-2xl"
                      style={{ background: "#fff", borderRadius: 12, border: "1px solid #cfdbd3" }}
                    >
                      {selectedCategory.icon || "✨"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484]">
                        {selectedCategory.typeIcon} {selectedCategory.typeName || "Service"}
                      </div>
                      <p className="text-[14px] font-semibold text-[#1f3a33] tracking-[-0.01em] m-0 truncate">
                        {selectedCategory.name}
                      </p>
                      {selectedCategory.parentName && (
                        <p className="text-[11px] text-[#6d6d68] truncate">
                          {selectedCategory.parentName}
                        </p>
                      )}
                    </div>
                    {isAddingToExistingService && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{ border: "1px solid #cfdbd3", color: "#2f4a3f", background: "#fff" }}
                      >
                        <Layers className="w-2.5 h-2.5" />
                        Ajout
                      </span>
                    )}
                    <motion.button
                      type="button"
                      onClick={() => setCategory("")}
                      className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors hover:bg-[#f7f5ef]"
                      style={{ border: "1px solid #1f3a33", color: "#1f3a33" }}
                      whileHover={{ scale: 1.005 }}
                      whileTap={{ scale: 0.995 }}
                    >
                      Changer
                    </motion.button>
                  </div>
                  {/* Message explicatif si ajout de formule */}
                  {isAddingToExistingService && (
                    <div
                      className="p-3 text-[12px]"
                      style={{
                        borderRadius: 10,
                        background: "#f7f5ef",
                        border: "1px solid #ece9e1",
                        color: "#3a3a38",
                      }}
                    >
                      <strong className="text-[#1f1f1d]">Mode ajout de formule : </strong>
                      vous avez déjà un service {selectedCategory.name}. Une nouvelle formule sera ajoutée à cette catégorie.
                    </div>
                  )}
                  {/* Toggle SAP */}
                  {isSapApproved && (
                    <label
                      className="flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-[#fafafa]"
                      style={{ borderRadius: 12, background: "#fff", border: "1px solid #ece9e1" }}
                    >
                      <input
                        type="checkbox"
                        checked={isSapEligible}
                        onChange={(e) => setIsSapEligible(e.target.checked)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: "#1f3a33" }}
                      />
                      <FileCheck className="w-4 h-4" style={{ color: "#6d6d68" }} />
                      <div className="flex-1 min-w-0">
                        <span className="text-[13.5px] font-semibold text-[#1f1f1d] tracking-[-0.01em]">
                          Éligible TVA réduite SAP
                        </span>
                        <p className="text-[11px] text-[#6d6d68]">
                          TVA à 10% pour les clients dépendants ou en situation de handicap.
                        </p>
                      </div>
                    </label>
                  )}
                </div>
              ) : (
                (() => {
                  // Grouper les catégories par TYPE puis par PARENT
                  const groupedByType = availableCategories.reduce((acc, cat) => {
                    const typeKey = cat.typeId || "autres";
                    if (!acc[typeKey]) {
                      acc[typeKey] = {
                        typeName: cat.typeName || "Autres",
                        typeIcon: cat.typeIcon || "✨",
                        typeColor: cat.typeColor || "#6B7280",
                        byParent: {} as Record<string, ServiceCategory[]>,
                      };
                    }
                    const parentKey = cat.parentName || "Général";
                    if (!acc[typeKey].byParent[parentKey]) {
                      acc[typeKey].byParent[parentKey] = [];
                    }
                    acc[typeKey].byParent[parentKey].push(cat);
                    return acc;
                  }, {} as Record<string, { typeName: string; typeIcon: string; typeColor: string; byParent: Record<string, ServiceCategory[]> }>);

                  // Trier les types selon l'ordre de categoryTypes
                  const sortedTypeKeys = categoryTypes.length > 0
                    ? categoryTypes.map(t => t.id).filter(id => groupedByType[id])
                    : Object.keys(groupedByType);

                  // Ajouter les types non référencés (comme "autres")
                  Object.keys(groupedByType).forEach(key => {
                    if (!sortedTypeKeys.includes(key)) {
                      sortedTypeKeys.push(key);
                    }
                  });

                  return (
                    <div className="space-y-6">
                      {sortedTypeKeys.map((typeKey) => {
                        const typeData = groupedByType[typeKey];
                        const parentKeys = Object.keys(typeData.byParent);

                        return (
                          <div key={typeKey} className="space-y-3">
                            {/* En-tête du type — eyebrow style cards de recherche */}
                            <div className="flex items-center gap-2">
                              <span className="text-base">{typeData.typeIcon}</span>
                              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#1f1f1d]">
                                {typeData.typeName}
                              </span>
                              <div className="flex-1 h-px" style={{ background: "#f1ede3" }} />
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                                style={{ border: "1px solid #dfdcd4", color: "#3a3a38", background: "#fff" }}
                              >
                                {Object.values(typeData.byParent).flat().length} prestation{Object.values(typeData.byParent).flat().length > 1 ? "s" : ""}
                              </span>
                            </div>

                            {/* Sous-groupes par catégorie parente */}
                            <div className="space-y-3">
                              {parentKeys.map((parentName) => (
                                <div key={parentName} className="space-y-2">
                                  {/* Nom de la catégorie parente */}
                                  <div className="flex items-center gap-1.5 px-1">
                                    <div
                                      className="w-1 h-1 rounded-full"
                                      style={{ background: "#cdc9c0" }}
                                    />
                                    <span className="text-[10px] font-medium text-[#9c9484] uppercase tracking-[0.1em]">
                                      {parentName}
                                    </span>
                                  </div>

                                  {/* Grille des prestations */}
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {typeData.byParent[parentName].map((cat) => {
                                      const hasExisting = existingCategories.includes(cat.slug);
                                      return (
                                        <motion.button
                                          key={cat.slug}
                                          type="button"
                                          onClick={() => setCategory(cat.slug)}
                                          className="flex flex-col items-center justify-center gap-1.5 p-3 transition-all relative hover:bg-[#fafafa]"
                                          style={{
                                            borderRadius: 12,
                                            border: `1px solid ${
                                              category === cat.slug
                                                ? "#1f3a33"
                                                : hasExisting
                                                  ? "#cfdbd3"
                                                  : "#ece9e1"
                                            }`,
                                            background:
                                              category === cat.slug
                                                ? "#f5f9f6"
                                                : hasExisting
                                                  ? "#fcfaf4"
                                                  : "#fff",
                                          }}
                                          whileHover={{ scale: 1.005 }}
                                          whileTap={{ scale: 0.995 }}
                                        >
                                          {hasExisting && (
                                            <span
                                              className="absolute -top-1 -right-1 w-4 h-4 inline-flex items-center justify-center rounded-full text-[10px] font-bold"
                                              style={{ background: "#1f3a33", color: "#f7f5ef" }}
                                            >
                                              +
                                            </span>
                                          )}
                                          <span className="text-[22px]">{cat.icon || "✨"}</span>
                                          <span
                                            className="text-[12px] font-semibold text-center leading-tight tracking-[-0.01em]"
                                            style={{
                                              color: category === cat.slug ? "#1f3a33" : "#1f1f1d",
                                            }}
                                          >
                                            {cat.name}
                                          </span>
                                          {hasExisting && (
                                            <span
                                              className="text-[10px] font-medium"
                                              style={{ color: "#2f4a3f" }}
                                            >
                                              Ajouter formule
                                            </span>
                                          )}
                                        </motion.button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              )}

              {/* La description est désormais saisie par formule à l'étape 2
                  (chaque variante a son propre champ description plus précis) */}

            </motion.div>
          )}

          {/* Step 2: Formules */}
          {currentStep === 2 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div>
                <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-1">
                  Étape 2 · Formules
                </div>
                <h4 className="text-base font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
                  Définissez vos formules
                </h4>
                <p className="text-[13px] text-[#6d6d68] leading-[1.5] mt-1">
                  Configurez les options de tarification, horaires et lieux pour chaque formule.
                </p>
              </div>

              <VariantManager
                mode="create"
                serviceName={selectedCategory?.name || category}
                localVariants={localVariants}
                onLocalChange={setLocalVariants}
                billingType={selectedCategory?.billingType}
                category={category}
                defaultVariants={selectedCategory?.defaultVariants}
                allowedPriceUnits={selectedCategory?.allowedPriceUnits}
                allowCustomVariants={selectedCategory?.allowCustomVariants}
                autoAddFirst={true}
                allowOvernightStay={allowOvernightStay}
                onAllowOvernightStayChange={setAllowOvernightStay}
                isGardeService={selectedCategory?.isCapacityBased === true}
                categoryAllowsOvernightStay={selectedCategory?.allowOvernightStay === true}
                serviceAnimalTypes={[]} // Tous les animaux sont disponibles, sélection par formule
                availableActivities={activities?.map((a: { _id: string; name: string; emoji: string; description?: string }) => ({
                  _id: a._id,
                  name: a.name,
                  emoji: a.emoji,
                  description: a.description,
                })) || []}
                announcerPriceMode={selectedCategory?.announcerPriceMode}
                clientBillingMode={selectedCategory?.clientBillingMode}
                hourlyBillingSurchargePercent={selectedCategory?.hourlyBillingSurchargePercent}
                defaultNightlyPrice={selectedCategory?.defaultNightlyPrice}
              />
            </motion.div>
          )}

          {/* Step 3: Options (anciennement Step 4) */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div>
                <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-1">
                  Étape 3 · Options
                </div>
                <h4 className="text-base font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
                  Options additionnelles
                  <span className="text-[#9c9484] font-normal ml-2">(facultatif)</span>
                </h4>
                <p className="text-[13px] text-[#6d6d68] leading-[1.5] mt-1">
                  Proposez des extras payants (shampoing, transport, etc.).
                </p>
              </div>

              <OptionManager
                mode="create"
                serviceName={selectedCategory?.name || category}
                localOptions={localOptions}
                onLocalChange={setLocalOptions}
              />
            </motion.div>
          )}
        </AnimatePresence>
          </div>

          {/* Footer du formulaire */}
          <div
            className="p-5 rounded-bl-[14px] rounded-br-[14px] lg:rounded-br-none"
            style={{ borderTop: "1px solid #f1ede3", background: "#fcfaf4" }}
          >
            <div className="flex items-center justify-between">
              <button
                onClick={currentStep === 1 ? onCancel : handlePrev}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium text-[#6d6d68] hover:text-[#1f1f1d] hover:bg-[#f7f5ef] transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                {currentStep === 1 ? "Annuler" : "Retour"}
              </button>

              {currentStep < 3 ? (
                <motion.button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[13px] font-medium transition-opacity hover:opacity-90"
                  style={
                    canProceed()
                      ? { background: "#1f3a33", color: "#f7f5ef" }
                      : { background: "#ece9e1", color: "#9c9484", cursor: "not-allowed" }
                  }
                  whileHover={{ scale: canProceed() ? 1.005 : 1 }}
                  whileTap={{ scale: canProceed() ? 0.995 : 1 }}
                >
                  Suivant
                  <ChevronRight className="w-3.5 h-3.5" />
                </motion.button>
              ) : (
                <motion.button
                  onClick={handleSubmit}
                  disabled={isSubmitting || localVariants.length === 0}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[13px] font-medium transition-opacity hover:opacity-90"
                  style={
                    !isSubmitting && localVariants.length > 0
                      ? { background: "#1f3a33", color: "#f7f5ef" }
                      : { background: "#ece9e1", color: "#9c9484", cursor: "not-allowed" }
                  }
                  whileHover={{ scale: !isSubmitting ? 1.005 : 1 }}
                  whileTap={{ scale: !isSubmitting ? 0.995 : 1 }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {isAddingToExistingService ? "Ajout..." : "Création..."}
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      {isAddingToExistingService ? "Ajouter la formule" : "Créer le service"}
                    </>
                  )}
                </motion.button>
              )}
            </div>
          </div>
        </div>

        {/* Colonne droite : aperçu live (sticky desktop, follows page scroll) */}
        <div
          className={cn(
            "lg:block lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto overflow-x-hidden p-5 rounded-bl-[14px] rounded-br-[14px] lg:rounded-bl-none",
            mobileTab === "preview" ? "block" : "hidden"
          )}
          style={{ background: "#fcfaf4" }}
        >
          <ServiceCardPreview
            category={previewCategory}
            variants={localVariants}
            isSapEligible={isSapEligible}
            allowOvernightStay={allowOvernightStay}
            serviceDescription={description}
            currentStep={currentStep}
          />
        </div>
      </div>
    </motion.div>
  );
}
