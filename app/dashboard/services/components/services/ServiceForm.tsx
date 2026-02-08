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
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import VariantManager, { LocalVariant } from "../VariantManager";
import OptionManager, { LocalOption } from "../OptionManager";
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
}

export default function ServiceForm({
  categories,
  categoryTypes = [],
  existingCategories,
  onSubmit,
  onCancel,
  isSubmitting,
  error,
}: ServiceFormProps) {
  const [currentStep, setCurrentStep] = useState<FormStep>(1);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [localVariants, setLocalVariants] = useState<LocalVariant[]>([]);
  const [localOptions, setLocalOptions] = useState<LocalOption[]>([]);

  // Garde de nuit
  const [allowOvernightStay, setAllowOvernightStay] = useState(false);

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
      // Les animaux au niveau service sont maintenant agrégés depuis les formules
      animalTypes: allAnimalTypes.length > 0 ? allAnimalTypes : undefined,
      ...overnightData,
      initialVariants,
      initialOptions: initialOptions.length > 0 ? initialOptions : undefined,
    });

    if (success) {
      onCancel();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-2xl border-2 border-primary/20 overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 border-b border-foreground/10 bg-foreground/[0.02]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            {isAddingToExistingService ? "Ajouter un service" : "Nouveau service"}
          </h3>
          <button
            onClick={onCancel}
            className="p-2 text-text-light hover:text-foreground hover:bg-foreground/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl transition-all",
                    isActive && "bg-primary text-white",
                    isCompleted && "bg-secondary/10 text-secondary",
                    !isActive && !isCompleted && "bg-foreground/5 text-text-light"
                  )}
                >
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                      isActive && "bg-white/20",
                      isCompleted && "bg-secondary/20",
                      !isActive && !isCompleted && "bg-foreground/10"
                    )}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : step.id}
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">
                    {step.label}
                  </span>
                </div>

                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "w-8 h-0.5 mx-1",
                      currentStep > step.id ? "bg-secondary" : "bg-foreground/10"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-5"
          >
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
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
                <h4 className="font-medium text-foreground mb-1">
                  Quelle prestation proposez-vous ?
                </h4>
                <p className="text-sm text-text-light">
                  Choisissez le type de service que vous souhaitez offrir
                </p>
              </div>

              {category && selectedCategory ? (
                // Vue compacte après sélection
                <div className="space-y-3">
                  <div
                    className="p-4 rounded-xl border-2 flex items-center gap-3"
                    style={{
                      borderColor: selectedCategory.typeColor || "#6B7280",
                      backgroundColor: `${selectedCategory.typeColor || "#6B7280"}10`,
                    }}
                  >
                    <span className="text-3xl">{selectedCategory.icon || "✨"}</span>
                    <div className="flex-1">
                      <p className="text-xs font-medium" style={{ color: selectedCategory.typeColor || "#6B7280" }}>
                        {selectedCategory.typeIcon} {selectedCategory.typeName || "Service"}
                      </p>
                      <p className="font-semibold text-foreground">{selectedCategory.name}</p>
                      {selectedCategory.parentName && (
                        <p className="text-xs text-text-light">{selectedCategory.parentName}</p>
                      )}
                    </div>
                    {/* Indicateur mode ajout de formule */}
                    {isAddingToExistingService && (
                      <span className="px-2 py-1 bg-secondary/10 text-secondary text-xs font-medium rounded-lg flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        Ajouter service
                      </span>
                    )}
                    <motion.button
                      type="button"
                      onClick={() => setCategory("")}
                      className="px-3 py-1.5 text-sm font-medium rounded-lg border border-foreground/20 hover:border-foreground/40 text-text-light hover:text-foreground transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Changer
                    </motion.button>
                  </div>
                  {/* Message explicatif si ajout de formule */}
                  {isAddingToExistingService && (
                    <div className="p-3 bg-secondary/5 border border-secondary/20 rounded-xl">
                      <p className="text-sm text-secondary">
                        <strong>Mode ajout de service :</strong> Vous avez déjà un service {selectedCategory.name}.
                        Un nouveau service sera ajouté à cette catégorie existante.
                      </p>
                    </div>
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
                            {/* En-tête du type avec badge coloré */}
                            <div
                              className="flex items-center gap-2 px-3 py-2 rounded-lg"
                              style={{ backgroundColor: `${typeData.typeColor}15` }}
                            >
                              <span className="text-xl">{typeData.typeIcon}</span>
                              <span
                                className="text-sm font-bold uppercase tracking-wider"
                                style={{ color: typeData.typeColor }}
                              >
                                {typeData.typeName}
                              </span>
                              <span
                                className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{
                                  backgroundColor: typeData.typeColor,
                                  color: "white",
                                }}
                              >
                                {Object.values(typeData.byParent).flat().length} prestation{Object.values(typeData.byParent).flat().length > 1 ? "s" : ""}
                              </span>
                            </div>

                            {/* Sous-groupes par catégorie parente */}
                            <div className="pl-2 space-y-4">
                              {parentKeys.map((parentName) => (
                                <div key={parentName} className="space-y-2">
                                  {/* Nom de la catégorie parente */}
                                  <div className="flex items-center gap-2 px-2">
                                    <div
                                      className="w-1.5 h-1.5 rounded-full"
                                      style={{ backgroundColor: typeData.typeColor }}
                                    />
                                    <span className="text-xs font-medium text-text-light">
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
                                          className={cn(
                                            "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all relative",
                                            category === cat.slug
                                              ? "border-current bg-opacity-10"
                                              : hasExisting
                                                ? "border-secondary/30 bg-secondary/5 hover:border-secondary/50"
                                                : "border-foreground/10 hover:border-foreground/20"
                                          )}
                                          style={
                                            category === cat.slug
                                              ? {
                                                  borderColor: typeData.typeColor,
                                                  backgroundColor: `${typeData.typeColor}10`,
                                                }
                                              : undefined
                                          }
                                          whileHover={{ scale: 1.02 }}
                                          whileTap={{ scale: 0.98 }}
                                        >
                                          {/* Badge "Ajouter formule" pour les catégories existantes */}
                                          {hasExisting && (
                                            <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-secondary text-white text-[10px] font-bold rounded-full">
                                              +
                                            </span>
                                          )}
                                          <span className="text-2xl">{cat.icon || "✨"}</span>
                                          <span className="text-xs font-medium text-foreground text-center leading-tight">
                                            {cat.name}
                                          </span>
                                          {hasExisting && (
                                            <span className="text-[10px] text-secondary font-medium">
                                              Ajouter service
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

              {/* Description du service */}
              {category && selectedCategory && (
                <div className="mt-6 pt-6 border-t border-foreground/10">
                  <h4 className="font-medium text-foreground mb-1">
                    Description de votre service
                  </h4>
                  <p className="text-sm text-text-light mb-4">
                    Décrivez brièvement ce que vous proposez (optionnel)
                  </p>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Ex: Je propose des séances adaptées à chaque animal avec une approche bienveillante..."
                    className="w-full px-4 py-3 bg-white border-2 border-foreground/10 rounded-xl text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none placeholder:text-text-light/50"
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* Step 2: Formules (anciennement Step 3) */}
          {currentStep === 2 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div>
                <h4 className="font-medium text-foreground mb-1">
                  Définissez vos tarifs
                </h4>
                <p className="text-sm text-text-light">
                  Ajustez le prix de chaque service selon vos prestations
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
                <h4 className="font-medium text-foreground mb-1">
                  Options additionnelles
                  <span className="text-text-light font-normal ml-2">(facultatif)</span>
                </h4>
                <p className="text-sm text-text-light">
                  Proposez des extras payants (shampoing, transport, etc.)
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

      {/* Footer */}
      <div className="p-5 border-t border-foreground/10 bg-foreground/[0.02]">
        <div className="flex items-center justify-between">
          <button
            onClick={currentStep === 1 ? onCancel : handlePrev}
            className="flex items-center gap-2 px-4 py-2 text-text-light hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            {currentStep === 1 ? "Annuler" : "Retour"}
          </button>

          {currentStep < 3 ? (
            <motion.button
              onClick={handleNext}
              disabled={!canProceed()}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-medium",
                !canProceed() && "opacity-50 cursor-not-allowed"
              )}
              whileHover={{ scale: canProceed() ? 1.02 : 1 }}
              whileTap={{ scale: canProceed() ? 0.98 : 1 }}
            >
              Suivant
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          ) : (
            <motion.button
              onClick={handleSubmit}
              disabled={isSubmitting || localVariants.length === 0}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 bg-secondary text-white rounded-xl font-medium",
                (isSubmitting || localVariants.length === 0) && "opacity-50 cursor-not-allowed"
              )}
              whileHover={{ scale: !isSubmitting ? 1.02 : 1 }}
              whileTap={{ scale: !isSubmitting ? 0.98 : 1 }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isAddingToExistingService ? "Ajout..." : "Création..."}
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  {isAddingToExistingService ? "Ajouter le service" : "Créer le service"}
                </>
              )}
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
