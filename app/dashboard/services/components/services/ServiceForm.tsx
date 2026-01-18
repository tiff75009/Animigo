"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  AlertCircle,
  Briefcase,
  PawPrint,
  Layers,
  Zap,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import AnimalTypeSelector from "../shared/AnimalTypeSelector";
import VariantManager, { LocalVariant } from "../VariantManager";
import OptionManager, { LocalOption } from "../OptionManager";
import { cn } from "@/app/lib/utils";

interface ServiceCategory {
  slug: string;
  name: string;
  icon?: string;
  billingType?: "hourly" | "daily" | "flexible";
}

type FormStep = 1 | 2 | 3 | 4;

const STEPS = [
  { id: 1, label: "Prestation", icon: Briefcase },
  { id: 2, label: "Animaux", icon: PawPrint },
  { id: 3, label: "Formules", icon: Layers },
  { id: 4, label: "Options", icon: Zap },
] as const;

interface ServiceFormProps {
  categories: ServiceCategory[];
  existingCategories: string[]; // Categories already used by user
  onSubmit: (data: {
    category: string;
    animalTypes: string[];
    initialVariants: Array<{
      name: string;
      description?: string;
      price: number;
      priceUnit: "hour" | "day" | "week" | "month" | "flat";
      duration?: number;
      includedFeatures?: string[];
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
  existingCategories,
  onSubmit,
  onCancel,
  isSubmitting,
  error,
}: ServiceFormProps) {
  const [currentStep, setCurrentStep] = useState<FormStep>(1);
  const [category, setCategory] = useState("");
  const [animalTypes, setAnimalTypes] = useState<string[]>([]);
  const [localVariants, setLocalVariants] = useState<LocalVariant[]>([]);
  const [localOptions, setLocalOptions] = useState<LocalOption[]>([]);

  const selectedCategory = categories.find((c) => c.slug === category);

  // Available categories (not yet used)
  const availableCategories = categories.filter(
    (c) => !existingCategories.includes(c.slug)
  );

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!category;
      case 2:
        return animalTypes.length > 0;
      case 3:
        return localVariants.length > 0;
      case 4:
        return true; // Options are optional
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 4 && canProceed()) {
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
      price: v.price,
      priceUnit: v.priceUnit,
      duration: v.duration,
      includedFeatures: v.includedFeatures,
    }));

    const initialOptions = localOptions.map((o) => ({
      name: o.name,
      description: o.description,
      price: o.price,
      priceType: o.priceType,
      unitLabel: o.unitLabel,
      maxQuantity: o.maxQuantity,
    }));

    const success = await onSubmit({
      category,
      animalTypes,
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
            Nouveau service
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

              {availableCategories.length === 0 ? (
                <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-amber-700 font-medium">
                    Vous avez déjà créé un service pour chaque catégorie
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {availableCategories.map((cat) => (
                    <motion.button
                      key={cat.slug}
                      type="button"
                      onClick={() => setCategory(cat.slug)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                        category === cat.slug
                          ? "border-primary bg-primary/5"
                          : "border-foreground/10 hover:border-foreground/20"
                      )}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="text-3xl">{cat.icon || "✨"}</span>
                      <span className="text-sm font-medium text-foreground">
                        {cat.name}
                      </span>
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Step 2: Animal Types */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div>
                <h4 className="font-medium text-foreground mb-1">
                  Quels animaux acceptez-vous ?
                </h4>
                <p className="text-sm text-text-light">
                  Sélectionnez tous les types d'animaux pour ce service
                </p>
              </div>

              <AnimalTypeSelector
                selected={animalTypes}
                onChange={setAnimalTypes}
                variant="cards"
              />

              {animalTypes.length === 0 && (
                <p className="text-xs text-amber-500">
                  Sélectionnez au moins un type d'animal
                </p>
              )}
            </motion.div>
          )}

          {/* Step 3: Variants */}
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
                  Définissez vos formules
                </h4>
                <p className="text-sm text-text-light">
                  Créez au moins une formule avec son prix (ex: Standard, Premium...)
                </p>
              </div>

              <VariantManager
                mode="create"
                serviceName={selectedCategory?.name || category}
                localVariants={localVariants}
                onLocalChange={setLocalVariants}
                billingType={selectedCategory?.billingType}
                category={category}
              />

              {localVariants.length === 0 && (
                <p className="text-xs text-amber-500">
                  Ajoutez au moins une formule
                </p>
              )}
            </motion.div>
          )}

          {/* Step 4: Options */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
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

          {currentStep < 4 ? (
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
                  Création...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Créer le service
                </>
              )}
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
