"use client";

import { Check, Package, Calendar, MapPin, Plus } from "lucide-react";
import { motion } from "framer-motion";
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
}

export default function BookingStepBar({ steps, className }: BookingStepBarProps) {
  const visibleSteps = steps.filter((step) => step.isVisible);

  if (visibleSteps.length === 0) return null;

  // Calculer l'index de l'étape active pour le progress indicator
  const activeStepIndex = visibleSteps.findIndex((step) => step.isActive);
  const completedCount = visibleSteps.filter((step) => step.isCompleted).length;

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Progress indicator compact */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
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
      </div>
    </div>
  );
}

// Hook helper pour calculer les étapes
export function useBookingSteps({
  hasVariantSelected,
  hasDateSelected,
  hasTimeSelected,
  showLocationSelector,
  hasLocationSelected,
  hasOptions,
}: {
  hasVariantSelected: boolean;
  hasDateSelected: boolean;
  hasTimeSelected: boolean;
  showLocationSelector: boolean;
  hasLocationSelected: boolean;
  hasOptions: boolean;
}): StepConfig[] {
  return [
    {
      id: "formule",
      label: "Formule",
      icon: <Package className="w-4 h-4" />,
      isCompleted: hasVariantSelected,
      isActive: !hasVariantSelected,
      isVisible: true,
    },
    {
      id: "calendar",
      label: "Date & heure",
      icon: <Calendar className="w-4 h-4" />,
      isCompleted: hasDateSelected && hasTimeSelected,
      isActive: hasVariantSelected && (!hasDateSelected || !hasTimeSelected),
      isVisible: hasVariantSelected,
    },
    {
      id: "location",
      label: "Lieu",
      icon: <MapPin className="w-4 h-4" />,
      isCompleted: hasLocationSelected,
      isActive: hasVariantSelected && hasDateSelected && hasTimeSelected && !hasLocationSelected,
      isVisible: showLocationSelector,
    },
    {
      id: "options",
      label: "Options",
      icon: <Plus className="w-4 h-4" />,
      isCompleted: false, // Les options sont optionnelles
      isActive: hasVariantSelected && hasDateSelected && hasTimeSelected && (!showLocationSelector || hasLocationSelected),
      isVisible: hasOptions,
    },
  ];
}
