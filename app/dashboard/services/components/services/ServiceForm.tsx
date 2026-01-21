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
  Home,
  MapPin,
  Moon,
  Sun,
  Clock,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import AnimalTypeSelector from "../shared/AnimalTypeSelector";
import VariantManager, { LocalVariant } from "../VariantManager";
import OptionManager, { LocalOption } from "../OptionManager";
import { cn } from "@/app/lib/utils";

type ServiceLocation = "announcer_home" | "client_home" | "both";
type PriceUnit = "hour" | "day" | "week" | "month";

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
  billingType?: "hourly" | "daily" | "flexible";
  allowedPriceUnits?: PriceUnit[];
  defaultVariants?: DefaultVariant[];
  allowCustomVariants?: boolean;
  allowOvernightStay?: boolean;
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
    serviceLocation?: ServiceLocation;
    // Garde de nuit
    allowOvernightStay?: boolean;
    dayStartTime?: string;
    dayEndTime?: string;
    overnightPrice?: number;
    initialVariants: Array<{
      name: string;
      description?: string;
      price: number;
      priceUnit: "hour" | "day" | "week" | "month" | "flat";
      // Multi-tarification
      pricing?: {
        hourly?: number;
        daily?: number;
        weekly?: number;
        monthly?: number;
        nightly?: number;
      };
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
  const [serviceLocation, setServiceLocation] = useState<ServiceLocation | undefined>(undefined);
  const [animalTypes, setAnimalTypes] = useState<string[]>([]);
  const [localVariants, setLocalVariants] = useState<LocalVariant[]>([]);
  const [localOptions, setLocalOptions] = useState<LocalOption[]>([]);

  // Garde de nuit
  const [allowOvernightStay, setAllowOvernightStay] = useState(false);
  const [dayStartTime, setDayStartTime] = useState("08:00");
  const [dayEndTime, setDayEndTime] = useState("20:00");
  const [overnightPrice, setOvernightPrice] = useState<number>(0); // En euros

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
      pricing: v.pricing, // Multi-tarification
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

    // Préparer les données overnight si la catégorie le permet
    const overnightData = selectedCategory?.allowOvernightStay
      ? {
          allowOvernightStay,
          dayStartTime,
          dayEndTime,
          overnightPrice: allowOvernightStay ? Math.round(overnightPrice * 100) : undefined, // Convertir en centimes
        }
      : {};

    const success = await onSubmit({
      category,
      animalTypes,
      serviceLocation,
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

              {/* Lieu de prestation */}
              {category && (
                <div className="mt-6 pt-6 border-t border-foreground/10">
                  <h4 className="font-medium text-foreground mb-1">
                    Où effectuez-vous cette prestation ?
                  </h4>
                  <p className="text-sm text-text-light mb-4">
                    Le client pourra choisir selon vos disponibilités
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <motion.button
                      type="button"
                      onClick={() => setServiceLocation("announcer_home")}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                        serviceLocation === "announcer_home"
                          ? "border-primary bg-primary/5"
                          : "border-foreground/10 hover:border-foreground/20"
                      )}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="p-3 rounded-full bg-primary/10">
                        <Home className="w-6 h-6 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        À mon domicile
                      </span>
                      <span className="text-xs text-text-light text-center">
                        Le client vient chez vous
                      </span>
                    </motion.button>

                    <motion.button
                      type="button"
                      onClick={() => setServiceLocation("client_home")}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                        serviceLocation === "client_home"
                          ? "border-primary bg-primary/5"
                          : "border-foreground/10 hover:border-foreground/20"
                      )}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="p-3 rounded-full bg-secondary/10">
                        <MapPin className="w-6 h-6 text-secondary" />
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        Chez le client
                      </span>
                      <span className="text-xs text-text-light text-center">
                        Vous vous déplacez
                      </span>
                    </motion.button>

                    <motion.button
                      type="button"
                      onClick={() => setServiceLocation("both")}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                        serviceLocation === "both"
                          ? "border-primary bg-primary/5"
                          : "border-foreground/10 hover:border-foreground/20"
                      )}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="p-3 rounded-full bg-accent/20">
                        <div className="flex -space-x-1">
                          <Home className="w-5 h-5 text-accent" />
                          <MapPin className="w-5 h-5 text-accent" />
                        </div>
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        Les deux
                      </span>
                      <span className="text-xs text-text-light text-center">
                        Le client choisit
                      </span>
                    </motion.button>
                  </div>
                </div>
              )}

              {/* Section Garde de nuit - seulement si la catégorie le permet */}
              {category && selectedCategory?.allowOvernightStay && (
                <div className="mt-6 pt-6 border-t border-foreground/10">
                  <h4 className="font-medium text-foreground mb-1 flex items-center gap-2">
                    <Moon className="w-5 h-5 text-indigo-500" />
                    Horaires et garde de nuit
                  </h4>
                  <p className="text-sm text-text-light mb-4">
                    Définissez vos horaires de journée et si vous acceptez la garde de nuit
                  </p>

                  {/* Horaires de journée */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                        <Sun className="w-4 h-4 text-amber-500" />
                        Début de journée
                      </label>
                      <select
                        value={dayStartTime}
                        onChange={(e) => setDayStartTime(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border-2 border-foreground/10 rounded-xl text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
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
                      <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                        <Moon className="w-4 h-4 text-indigo-500" />
                        Fin de journée
                      </label>
                      <select
                        value={dayEndTime}
                        onChange={(e) => setDayEndTime(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border-2 border-foreground/10 rounded-xl text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
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
                  <label className="flex items-start gap-3 p-4 rounded-xl border-2 border-foreground/10 hover:border-indigo-300 cursor-pointer transition-all mb-4">
                    <input
                      type="checkbox"
                      checked={allowOvernightStay}
                      onChange={(e) => setAllowOvernightStay(e.target.checked)}
                      className="mt-1 w-5 h-5 rounded border-foreground/20 text-indigo-500 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-foreground flex items-center gap-2">
                        <Moon className="w-4 h-4 text-indigo-500" />
                        J&apos;accepte la garde de nuit
                      </span>
                      <p className="text-xs text-text-light mt-1">
                        L&apos;animal peut rester la nuit (de {dayEndTime} à {dayStartTime} le lendemain)
                      </p>
                    </div>
                  </label>

                  {/* Prix de la nuit - seulement si garde de nuit activée */}
                  {allowOvernightStay && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Prix de la nuit
                      </label>
                      <div className="relative w-48">
                        <input
                          type="number"
                          value={overnightPrice || ""}
                          onChange={(e) => setOvernightPrice(parseFloat(e.target.value) || 0)}
                          placeholder="20"
                          step="0.50"
                          min="0"
                          className="w-full px-4 py-2.5 pr-12 bg-white border-2 border-foreground/10 rounded-xl text-foreground focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-light">€</span>
                      </div>
                      <p className="text-xs text-text-light mt-2">
                        Ce prix sera ajouté pour chaque nuit lors d&apos;une réservation multi-jours
                      </p>
                    </motion.div>
                  )}
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
                defaultVariants={selectedCategory?.defaultVariants}
                allowedPriceUnits={selectedCategory?.allowedPriceUnits}
                allowCustomVariants={selectedCategory?.allowCustomVariants}
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
