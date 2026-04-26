"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, Package, Calendar, CalendarDays, MapPin, Plus, ChevronLeft, ChevronRight, Users, PawPrint, Dog, Receipt, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/app/lib/utils";

// Tooltip rendu via portail pour échapper aux stacking contexts
function StepTooltip({ label, anchorRef }: { label: string; anchorRef: React.RefObject<HTMLDivElement | null> }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({
      top: rect.top + rect.height / 2,
      left: rect.right + 8,
    });
  }, [anchorRef]);

  if (typeof window === "undefined" || !pos) return null;

  return createPortal(
    <div
      className="fixed px-2.5 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap pointer-events-none"
      style={{
        top: pos.top,
        left: pos.left,
        transform: "translateY(-50%)",
        background: "#1f3a33",
        color: "#f7f5ef",
        boxShadow: "0 4px 12px rgba(31,58,51,0.15)",
        zIndex: 99999,
      }}
    >
      {label}
      <span
        className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0"
        style={{
          borderTop: "4px solid transparent",
          borderBottom: "4px solid transparent",
          borderRight: "4px solid #1f3a33",
        }}
      />
    </div>,
    document.body
  );
}

function StepIconWithTooltip({ children, label }: { children: React.ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  return (
    <div
      ref={ref}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative"
    >
      {children}
      {hover && <StepTooltip label={label} anchorRef={ref} />}
    </div>
  );
}

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

  // Vue repliée (compacte) - icônes uniquement
  if (isCollapsed) {
    return (
      <div className={cn("flex flex-col", className)} style={{ position: "relative", zIndex: 60 }}>
        <div
          className="bg-white p-2"
          style={{
            width: 56,
            borderRadius: 14,
            border: "1px solid #ece9e1",
            position: "relative",
            overflow: "visible",
          }}
        >
          {/* Bouton pour déplier */}
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-full flex items-center justify-center mb-2 py-1 rounded-lg hover:bg-[#f7f5ef] transition-colors"
            title="Afficher les étapes"
          >
            <ChevronRight className="w-3.5 h-3.5" style={{ color: "#9c9484" }} />
          </button>

          {/* Étapes en mode icônes seulement */}
          <div className="flex flex-col items-center gap-1">
            {visibleSteps.map((step, index) => {
              const isLast = index === visibleSteps.length - 1;
              return (
                <div key={step.id} className="flex flex-col items-center">
                  <StepIconWithTooltip label={step.label}>
                    <div
                      className="flex items-center justify-center w-7 h-7 rounded-full transition-all cursor-default"
                      style={
                        step.isCompleted
                          ? { background: "#1f3a33", color: "#f7f5ef", border: "1px solid #1f3a33" }
                          : step.isActive
                            ? { background: "#fff", color: "#1f3a33", border: "1px solid #1f3a33" }
                            : { background: "#fff", color: "#cdc9c0", border: "1px solid #ece9e1" }
                      }
                    >
                      {step.isCompleted ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <span className="w-3.5 h-3.5 flex items-center justify-center">
                          {step.icon}
                        </span>
                      )}
                    </div>
                  </StepIconWithTooltip>
                  {!isLast && (
                    <div
                      className="w-px h-2 mt-1"
                      style={{ background: step.isCompleted ? "#cfdbd3" : "#ece9e1" }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Mini progress */}
          <div
            className="mt-2 pt-2 text-center"
            style={{ borderTop: "1px solid #f1ede3" }}
          >
            <span className="text-[10px] font-bold" style={{ color: "#9c9484" }}>
              {completedCount}/{visibleSteps.length}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <div
        className="bg-white p-3.5"
        style={{
          width: 200,
          borderRadius: 14,
          border: "1px solid #ece9e1",
        }}
      >
        {/* Header avec bouton replier */}
        <button
          onClick={() => setIsCollapsed(true)}
          className="w-full flex items-center justify-between mb-3 hover:opacity-80 transition-opacity"
        >
          <span className="text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: "#9c9484" }}>
            Étapes
          </span>
          <ChevronLeft className="w-3.5 h-3.5" style={{ color: "#9c9484" }} />
        </button>

        <div className="flex flex-col gap-2.5">
          {visibleSteps.map((step, index) => {
            const isLast = index === visibleSteps.length - 1;

            return (
              <div key={step.id} className="flex items-start gap-2.5">
                {/* Cercle + ligne verticale */}
                <div className="flex flex-col items-center">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.08 }}
                    className="relative flex items-center justify-center w-7 h-7 rounded-full transition-all duration-300 flex-shrink-0"
                    style={
                      step.isCompleted
                        ? { background: "#1f3a33", color: "#f7f5ef", border: "1px solid #1f3a33" }
                        : step.isActive
                          ? { background: "#fff", color: "#1f3a33", border: "1px solid #1f3a33" }
                          : { background: "#fff", color: "#cdc9c0", border: "1px solid #ece9e1" }
                    }
                  >
                    {step.isCompleted ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <span className="w-3.5 h-3.5 flex items-center justify-center">
                        {step.icon}
                      </span>
                    )}

                    {/* Pulsation discrète sur l'étape active */}
                    {step.isActive && !step.isCompleted && (
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        animate={{
                          boxShadow: [
                            "0 0 0 0 rgba(31,58,51,0.0)",
                            "0 0 0 6px rgba(31,58,51,0.08)",
                            "0 0 0 0 rgba(31,58,51,0.0)",
                          ],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    )}
                  </motion.div>

                  {/* Ligne de connexion verticale */}
                  {!isLast && (
                    <div
                      className="w-px h-3 mt-1"
                      style={{ background: step.isCompleted ? "#cfdbd3" : "#ece9e1" }}
                    />
                  )}
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <p
                    className={cn("text-[12.5px] leading-tight tracking-[-0.01em]")}
                    style={{
                      color: step.isCompleted
                        ? "#1f3a33"
                        : step.isActive
                          ? "#1f1f1d"
                          : "#cdc9c0",
                      fontWeight: step.isCompleted || step.isActive ? 600 : 500,
                    }}
                  >
                    {step.label}
                  </p>
                  {step.isActive && !step.isCompleted && (
                    <p className="text-[10px] mt-0.5" style={{ color: "#6d6d68" }}>
                      En cours
                    </p>
                  )}
                  {step.isCompleted && (
                    <p className="text-[10px] mt-0.5" style={{ color: "#2f4a3f", opacity: 0.7 }}>
                      Complété
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress bar fine */}
        <div className="mt-3 pt-3" style={{ borderTop: "1px solid #f1ede3" }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: "#9c9484" }}>
              Progression
            </span>
            <span className="text-[11px] font-semibold" style={{ color: "#1f3a33" }}>
              {completedCount}/{visibleSteps.length}
            </span>
          </div>
          <div
            className="h-1 rounded-full overflow-hidden"
            style={{ background: "#f1ede3" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: "#1f3a33" }}
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
  // Vérification animal pour invités (chien/chat)
  requiresAnimalVerification,
  guestAnimalValid,
  // Nouveaux paramètres pour l'étape Lieu
  serviceLocation,
  // Étape active actuelle (pour marquer les précédentes comme complétées)
  currentStepId,
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
  // Vérification animal pour invités (chien/chat)
  requiresAnimalVerification?: boolean;
  guestAnimalValid?: boolean;
  // Nouveaux paramètres pour l'étape Lieu
  serviceLocation?: "announcer_home" | "client_home" | "both" | null;
  // Étape active actuelle (pour marquer les précédentes comme complétées)
  currentStepId?: string;
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

  // L'étape vérification animal (invités) est complétée si validée
  const isAnimalVerificationComplete: boolean = !requiresAnimalVerification || Boolean(guestAnimalValid);

  // L'étape lieu est complétée si :
  // - Service collectif (toujours chez le pro)
  // - Service uniquement chez le pro
  // - Lieu sélectionné
  const isLocationComplete: boolean =
    Boolean(isCollectiveFormula) ||
    serviceLocation === "announcer_home" ||
    hasLocationSelected;

  // Label de l'étape lieu selon le type de service
  const locationLabel = isCollectiveFormula ? "Lieu des séances" : "Lieu de prestation";

  const dateStepId = isCollectiveFormula ? "slots" : isMultiSessionIndividual ? "sessions" : "calendar";

  const rawSteps: StepConfig[] = [
    {
      id: "formule",
      label: "Formule",
      icon: <Package className="w-4 h-4" />,
      isCompleted: hasVariantSelected,
      isActive: !hasVariantSelected,
      isVisible: true,
    },
    // Étape Vérification animal (invités - chien ou chat)
    {
      id: "dog",
      label: "Votre animal",
      icon: <Dog className="w-4 h-4" />,
      isCompleted: Boolean(guestAnimalValid),
      isActive: hasVariantSelected && requiresAnimalVerification === true && !guestAnimalValid,
      isVisible: hasVariantSelected && Boolean(requiresAnimalVerification),
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
    // Étape Lieu — vient AVANT Dates (cohérence avec la barre horizontale)
    {
      id: "location",
      label: locationLabel,
      icon: <MapPin className="w-4 h-4" />,
      isCompleted: isLocationComplete,
      isActive: hasVariantSelected && isAnimalsStepComplete && isAnimalVerificationComplete && !isLocationComplete,
      isVisible: hasVariantSelected,
    },
    {
      id: dateStepId,
      label: isCollectiveFormula
        ? `Créneaux${requiredSlots && requiredSlots > 1 ? ` (${selectedSlotsCount || 0}/${requiredSlots})` : ""}`
        : isMultiSessionIndividual
          ? `Séances${requiredSessions && requiredSessions > 1 ? ` (${selectedSessionsCount || 0}/${requiredSessions})` : ""}`
          : isRangeMode
            ? "Dates & horaires"
            : "Date & heure",
      icon: isCollectiveFormula ? <Users className="w-4 h-4" /> : <CalendarDays className="w-4 h-4" />,
      isCompleted: isStep2Complete,
      isActive: hasVariantSelected && isAnimalsStepComplete && isAnimalVerificationComplete && isLocationComplete && !isStep2Complete,
      isVisible: hasVariantSelected,
    },
    {
      id: "options",
      label: "Options",
      icon: <Plus className="w-4 h-4" />,
      isCompleted: hasOptionsSelected || false,
      isActive: hasVariantSelected && isAnimalsStepComplete && isAnimalVerificationComplete && isLocationComplete && isStep2Complete,
      isVisible: hasOptions,
    },
    {
      id: "recap",
      label: "Récapitulatif",
      icon: <Receipt className="w-4 h-4" />,
      isCompleted: false,
      isActive:
        hasVariantSelected &&
        isAnimalsStepComplete &&
        isAnimalVerificationComplete &&
        isLocationComplete &&
        isStep2Complete,
      isVisible: hasVariantSelected,
    },
    {
      id: "finalize",
      label: "Finaliser",
      icon: <CheckCircle className="w-4 h-4" />,
      isCompleted: false,
      isActive:
        hasVariantSelected &&
        isAnimalsStepComplete &&
        isAnimalVerificationComplete &&
        isLocationComplete &&
        isStep2Complete,
      isVisible: hasVariantSelected,
    },
  ];

  // Si une étape courante est fournie, marquer toutes les étapes précédentes comme complétées
  // et seule l'étape courante comme active
  if (currentStepId) {
    const visibleSteps = rawSteps.filter((s) => s.isVisible);
    const currentIdx = visibleSteps.findIndex((s) => s.id === currentStepId);
    if (currentIdx >= 0) {
      const completedIds = new Set(visibleSteps.slice(0, currentIdx).map((s) => s.id));
      return rawSteps.map((step) => {
        if (step.id === currentStepId) {
          return { ...step, isActive: true, isCompleted: false };
        }
        if (completedIds.has(step.id)) {
          return { ...step, isCompleted: true, isActive: false };
        }
        return { ...step, isActive: false };
      });
    }
  }

  return rawSteps;
}
