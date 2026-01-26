"use client";

import { useState } from "react";
import { Check, Package, Calendar, MapPin, Plus, ChevronLeft, ChevronRight, Users, PawPrint } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/app/lib/utils";

export interface StepConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  isCompleted: boolean;
  isActive: boolean;
  isVisible: boolean;
}

interface BookingStepBarProps {
  steps: StepConfig[];
  className?: string;
  defaultCollapsed?: boolean;
}

export default function BookingStepBar({ steps, className, defaultCollapsed = true }: BookingStepBarProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const visibleSteps = steps.filter((step) => step.isVisible);

  if (visibleSteps.length === 0) return null;

  // Calculer l'index de l'étape active pour le progress indicator
  const activeStepIndex = visibleSteps.findIndex((step) => step.isActive);
  const completedCount = visibleSteps.filter((step) => step.isCompleted).length;

  // Vue repliée (compacte)
  if (isCollapsed) {
    return (
      <div className={cn("flex flex-col", className)}>
        <motion.div
          initial={{ width: 64 }}
          animate={{ width: 64 }}
          className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm"
        >
          {/* Bouton pour déplier */}
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-full flex items-center justify-center mb-3 p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            title="Afficher les étapes"
          >
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>

          {/* Étapes en mode icônes seulement */}
          <div className="flex flex-col items-center gap-2">
            {visibleSteps.map((step, index) => {
              const isLast = index === visibleSteps.length - 1;
              return (
                <div key={step.id} className="flex flex-col items-center">
                  <motion.div
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all",
                      step.isCompleted
                        ? "bg-primary border-primary text-white"
                        : step.isActive
                          ? "bg-white border-primary text-primary"
                          : "bg-gray-50 border-gray-200 text-gray-400"
                    )}
                  >
                    {step.isCompleted ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <span className="w-4 h-4 flex items-center justify-center">
                        {step.icon}
                      </span>
                    )}
                  </motion.div>
                  {!isLast && (
                    <div className={cn(
                      "w-0.5 h-3 mt-1 rounded-full",
                      step.isCompleted ? "bg-primary" : "bg-gray-200"
                    )} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Mini progress */}
          <div className="mt-3 pt-2 border-t border-gray-100 text-center">
            <span className="text-xs font-medium text-gray-500">
              {completedCount}/{visibleSteps.length}
            </span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Progress indicator compact */}
      <motion.div
        initial={{ width: 192 }}
        animate={{ width: 192 }}
        className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
      >
        {/* Bouton pour replier */}
        <button
          onClick={() => setIsCollapsed(true)}
          className="w-full flex items-center justify-between mb-3 p-1.5 rounded-lg hover:bg-gray-50 transition-colors text-xs text-gray-500"
        >
          <span>Étapes</span>
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex flex-col gap-3">
          {visibleSteps.map((step, index) => {
            const isLast = index === visibleSteps.length - 1;

            return (
              <div key={step.id} className="flex items-start gap-3">
                {/* Cercle et ligne */}
                <div className="flex flex-col items-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      "relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 flex-shrink-0",
                      step.isCompleted
                        ? "bg-primary border-primary text-white"
                        : step.isActive
                          ? "bg-white border-primary text-primary shadow-sm shadow-primary/20"
                          : "bg-gray-50 border-gray-200 text-gray-400"
                    )}
                  >
                    {step.isCompleted ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <span className="w-4 h-4 flex items-center justify-center">
                        {step.icon}
                      </span>
                    )}

                    {/* Effet de pulsation pour l'étape active */}
                    {step.isActive && !step.isCompleted && (
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-primary"
                        animate={{
                          scale: [1, 1.2, 1],
                          opacity: [0.4, 0, 0.4],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    )}
                  </motion.div>

                  {/* Ligne de connexion */}
                  {!isLast && (
                    <div className="relative w-0.5 h-4 mt-1">
                      <div className="absolute inset-0 bg-gray-200 rounded-full" />
                      <motion.div
                        className="absolute inset-x-0 top-0 bg-primary rounded-full"
                        initial={{ height: 0 }}
                        animate={{ height: step.isCompleted ? "100%" : "0%" }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      />
                    </div>
                  )}
                </div>

                {/* Label et status */}
                <div className="flex-1 min-w-0 pt-1">
                  <motion.p
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 + 0.05 }}
                    className={cn(
                      "text-sm font-medium leading-tight",
                      step.isCompleted
                        ? "text-primary"
                        : step.isActive
                          ? "text-gray-900"
                          : "text-gray-400"
                    )}
                  >
                    {step.label}
                  </motion.p>
                  {step.isActive && !step.isCompleted && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-gray-500 mt-0.5"
                    >
                      En cours
                    </motion.p>
                  )}
                  {step.isCompleted && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-primary/70 mt-0.5"
                    >
                      Complété
                    </motion.p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
            <span>Progression</span>
            <span className="font-medium text-gray-700">
              {completedCount}/{visibleSteps.length}
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
              initial={{ width: 0 }}
              animate={{
                width: `${(completedCount / visibleSteps.length) * 100}%`,
              }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Hook helper pour calculer les étapes
export function useBookingSteps({
  hasVariantSelected,
  hasDateSelected,
  hasEndDateSelected,
  hasTimeSelected,
  hasEndTimeSelected,
  isRangeMode,
  showLocationSelector,
  hasLocationSelected,
  hasOptions,
  hasOptionsSelected,
  // Paramètres pour les formules collectives
  isCollectiveFormula,
  hasSlotsSelected,
  requiredSlots,
  selectedSlotsCount,
  // Paramètres pour les formules individuelles multi-séances
  isMultiSessionIndividual,
  hasSessionsSelected,
  requiredSessions,
  selectedSessionsCount,
  // Nouveaux paramètres pour l'étape Animaux
  isLoggedIn,
  hasAnimalsSelected,
  selectedAnimalsCount,
  maxAnimals,
  // Nouveaux paramètres pour l'étape Lieu
  serviceLocation,
}: {
  hasVariantSelected: boolean;
  hasDateSelected: boolean;
  hasEndDateSelected?: boolean;
  hasTimeSelected: boolean;
  hasEndTimeSelected?: boolean;
  isRangeMode?: boolean;
  showLocationSelector: boolean;
  hasLocationSelected: boolean;
  hasOptions: boolean;
  hasOptionsSelected?: boolean;
  // Paramètres pour les formules collectives
  isCollectiveFormula?: boolean;
  hasSlotsSelected?: boolean;
  requiredSlots?: number;
  selectedSlotsCount?: number;
  // Paramètres pour les formules individuelles multi-séances
  isMultiSessionIndividual?: boolean;
  hasSessionsSelected?: boolean;
  requiredSessions?: number;
  selectedSessionsCount?: number;
  // Nouveaux paramètres pour l'étape Animaux
  isLoggedIn?: boolean;
  hasAnimalsSelected?: boolean;
  selectedAnimalsCount?: number;
  maxAnimals?: number;
  // Nouveaux paramètres pour l'étape Lieu
  serviceLocation?: "announcer_home" | "client_home" | "both" | null;
}): StepConfig[] {
  // Pour les formules collectives, vérifier si tous les créneaux sont sélectionnés
  const isCollectiveSlotsComplete = isCollectiveFormula
    ? Boolean(hasSlotsSelected && selectedSlotsCount === requiredSlots)
    : false;

  // Pour les formules individuelles multi-séances
  const isMultiSessionComplete = isMultiSessionIndividual
    ? Boolean(hasSessionsSelected && selectedSessionsCount === requiredSessions)
    : false;

  // Pour le mode plage (garde), on vérifie aussi la date/heure de fin
  const isDateTimeComplete = isRangeMode
    ? Boolean(hasDateSelected && hasEndDateSelected && hasTimeSelected && hasEndTimeSelected)
    : Boolean(hasDateSelected && hasTimeSelected);

  // L'étape calendrier/créneaux est complétée selon le type de formule
  const isStep2Complete: boolean = isCollectiveFormula
    ? isCollectiveSlotsComplete
    : isMultiSessionIndividual
      ? isMultiSessionComplete
      : isDateTimeComplete;

  // L'étape animaux est complétée si sélectionné ou si pas connecté
  const isAnimalsStepComplete: boolean = !isLoggedIn || Boolean(hasAnimalsSelected);

  // L'étape lieu est complétée si :
  // - Service collectif (toujours chez le pro)
  // - Service uniquement chez le pro
  // - Lieu sélectionné
  const isLocationComplete: boolean =
    Boolean(isCollectiveFormula) ||
    serviceLocation === "announcer_home" ||
    hasLocationSelected;

  // L'étape lieu est visible si :
  // - Une formule est sélectionnée
  // - L'étape animaux est complète (pour les utilisateurs connectés)
  // - L'étape calendrier/créneaux est complète
  const showLocationStep: boolean = hasVariantSelected && isAnimalsStepComplete && isStep2Complete;

  // Label de l'étape lieu selon le type de service
  const locationLabel = isCollectiveFormula ? "Lieu des séances" : "Lieu de prestation";

  return [
    {
      id: "formule",
      label: "Formule",
      icon: <Package className="w-4 h-4" />,
      isCompleted: hasVariantSelected,
      isActive: !hasVariantSelected,
      isVisible: true,
    },
    // Étape Animaux (utilisateurs connectés uniquement)
    {
      id: "animals",
      label: selectedAnimalsCount && maxAnimals
        ? `Animaux (${selectedAnimalsCount}/${maxAnimals})`
        : "Vos animaux",
      icon: <PawPrint className="w-4 h-4" />,
      isCompleted: Boolean(hasAnimalsSelected),
      isActive: hasVariantSelected && !hasAnimalsSelected,
      isVisible: Boolean(isLoggedIn) && hasVariantSelected,
    },
    {
      id: isCollectiveFormula ? "slots" : isMultiSessionIndividual ? "sessions" : "calendar",
      label: isCollectiveFormula
        ? `Créneaux${requiredSlots && requiredSlots > 1 ? ` (${selectedSlotsCount || 0}/${requiredSlots})` : ""}`
        : isMultiSessionIndividual
          ? `Séances${requiredSessions && requiredSessions > 1 ? ` (${selectedSessionsCount || 0}/${requiredSessions})` : ""}`
          : isRangeMode
            ? "Dates & horaires"
            : "Date & heure",
      icon: isCollectiveFormula ? <Users className="w-4 h-4" /> : <Calendar className="w-4 h-4" />,
      isCompleted: isStep2Complete,
      isActive: hasVariantSelected && isAnimalsStepComplete && !isStep2Complete,
      isVisible: hasVariantSelected,
    },
    // Étape Lieu (toujours visible après formule sélectionnée, mode lecture seule pour collectif)
    {
      id: "location",
      label: locationLabel,
      icon: <MapPin className="w-4 h-4" />,
      isCompleted: isLocationComplete,
      isActive: showLocationStep && !isLocationComplete,
      isVisible: showLocationStep,
    },
    {
      id: "options",
      label: "Options",
      icon: <Plus className="w-4 h-4" />,
      isCompleted: hasOptionsSelected || false,
      isActive: showLocationStep && isLocationComplete,
      isVisible: hasOptions,
    },
  ];
}
