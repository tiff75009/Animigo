"use client";

import { Calendar, Users, Info, CalendarCheck, CalendarDays } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { motion } from "framer-motion";
import type { ServiceDetail, ServiceVariant } from "./FormulaStep";
import { Id } from "@/convex/_generated/dataModel";

// Import des composants de calendrier de la page annonceur
import {
  BookingCalendar,
  CollectiveSlotPicker,
  MultiSessionCalendar,
  type SelectedSession,
  type CalendarEntry,
} from "@/app/annonceur/[id]/components/booking";

// Ré-exporter le type pour usage externe
export type { SelectedSession };

// Type pour les créneaux collectifs
interface CollectiveSlotInfo {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  availableSpots: number;
}

interface DateTimeStepProps {
  selectedService: ServiceDetail;
  selectedVariant: ServiceVariant;
  selectedDate: string | null;
  selectedEndDate: string | null;
  selectedTime: string | null;
  selectedEndTime: string | null;
  includeOvernightStay: boolean;
  calendarMonth: Date;
  availabilityCalendar: CalendarEntry[] | undefined;
  isRangeMode: boolean;
  days: number;
  nights: number;
  // Informations de capacité (pour les catégories de garde)
  isCapacityBased?: boolean;
  maxAnimalsPerSlot?: number;
  // Blocage basé sur la durée (la fin est calculée automatiquement)
  enableDurationBasedBlocking?: boolean;
  // Temps de préparation de l'annonceur (en minutes)
  bufferBefore?: number;
  bufferAfter?: number;
  // Horaires de disponibilité de l'annonceur
  acceptReservationsFrom?: string; // "08:00"
  acceptReservationsTo?: string;   // "20:00"
  // Support pour les formules collectives
  isCollectiveFormula?: boolean;
  collectiveSlots?: CollectiveSlotInfo[]; // Créneaux disponibles pour formules collectives
  selectedSlotIds?: string[];
  onSlotsSelected?: (slotIds: string[]) => void;
  // Support pour les formules individuelles multi-séances
  isMultiSessionIndividual?: boolean;
  selectedSessions?: SelectedSession[];
  onSessionsChange?: (sessions: SelectedSession[]) => void;
  // Props pour CollectiveSlotPicker
  animalCount?: number;
  animalType?: string;
  // Billing info pour affichage jours/demi-journées
  billingInfo?: {
    billingUnit?: string;
    fullDays: number;
    halfDays: number;
    firstDayIsHalfDay?: boolean;
    lastDayIsHalfDay?: boolean;
  };
  clientBillingMode?: "exact_hourly" | "round_half_day" | "round_full_day";
  onDateSelect: (date: string) => void;
  onEndDateSelect: (date: string | null) => void;
  onTimeSelect: (time: string) => void;
  onEndTimeSelect: (time: string) => void;
  onOvernightChange: (include: boolean) => void;
  onMonthChange: (date: Date) => void;
}

export default function DateTimeStep({
  selectedService,
  selectedVariant,
  selectedDate,
  selectedEndDate,
  selectedTime,
  selectedEndTime,
  includeOvernightStay,
  calendarMonth,
  availabilityCalendar,
  isRangeMode,
  days,
  nights,
  isCapacityBased,
  maxAnimalsPerSlot,
  enableDurationBasedBlocking,
  bufferBefore = 0,
  bufferAfter = 0,
  acceptReservationsFrom = "08:00",
  acceptReservationsTo = "20:00",
  // Formules collectives
  isCollectiveFormula = false,
  collectiveSlots = [],
  selectedSlotIds = [],
  onSlotsSelected,
  // Formules multi-séances
  isMultiSessionIndividual = false,
  selectedSessions = [],
  onSessionsChange,
  // Props pour CollectiveSlotPicker
  animalCount = 1,
  animalType = "chien",
  // Billing info pour affichage jours/demi-journées
  billingInfo,
  clientBillingMode,
  onDateSelect,
  onEndDateSelect,
  onTimeSelect,
  onEndTimeSelect,
  onOvernightChange,
  onMonthChange,
}: DateTimeStepProps) {
  // Déterminer le type de formule
  const isCollective = isCollectiveFormula || selectedVariant.sessionType === "collective";
  const isMultiSession = isMultiSessionIndividual || (!isCollective && (selectedVariant.numberOfSessions || 1) > 1);
  const numberOfSessions = selectedVariant.numberOfSessions || 1;
  const sessionInterval = selectedVariant.sessionInterval || 0;
  const variantDuration = selectedVariant.duration || 60;

  // Déterminer le titre et le message d'aide selon le type
  const getStepInfo = () => {
    if (isCollective) {
      return {
        title: "Choisissez vos créneaux",
        icon: CalendarCheck,
        iconColor: "text-purple-600",
        bgColor: "bg-purple-50",
        borderColor: "border-purple-200",
        message: `Sélectionnez ${numberOfSessions} créneau${numberOfSessions > 1 ? "x" : ""} parmi les disponibilités proposées par le prestataire.`,
      };
    }
    if (isMultiSession) {
      return {
        title: "Planifiez vos séances",
        icon: CalendarDays,
        iconColor: "text-primary",
        bgColor: "bg-primary/5",
        borderColor: "border-primary/20",
        message: sessionInterval > 0
          ? `Sélectionnez ${numberOfSessions} dates pour vos séances (minimum ${sessionInterval} jour${sessionInterval > 1 ? "s" : ""} d'intervalle entre chaque).`
          : `Sélectionnez ${numberOfSessions} dates pour vos séances.`,
      };
    }
    return {
      title: isRangeMode ? "Choisissez vos dates" : "Choisissez votre créneau",
      icon: Calendar,
      iconColor: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      message: isRangeMode
        ? "Sélectionnez une période de garde pour votre animal."
        : "Choisissez une date et un horaire pour votre séance.",
    };
  };

  const stepInfo = getStepInfo();
  const StepIcon = stepInfo.icon;

  return (
    <div className="space-y-4">
      {/* En-tête contextuel selon le type de formule */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn("p-2 rounded-lg", stepInfo.bgColor)}>
            <StepIcon className={cn("w-5 h-5", stepInfo.iconColor)} />
          </div>
          <h2 className="text-lg font-bold text-foreground">
            {stepInfo.title}
          </h2>
        </div>

        {/* Message d'aide contextuel */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "mb-4 p-3 rounded-xl border flex items-start gap-2",
            stepInfo.bgColor,
            stepInfo.borderColor
          )}
        >
          <Info className={cn("w-4 h-4 mt-0.5 flex-shrink-0", stepInfo.iconColor)} />
          <p className="text-sm text-foreground">{stepInfo.message}</p>
        </motion.div>

        {/* Récap formule sélectionnée */}
        <div className="p-3 bg-gray-50 rounded-xl">
          <p className="text-sm text-text-light">Prestation sélectionnée</p>
          <p className="font-semibold text-foreground">
            {selectedService.categoryIcon} {selectedService.categoryName} -{" "}
            {selectedVariant.name}
          </p>
          {isMultiSession && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                {numberOfSessions} séances
              </span>
              {sessionInterval > 0 && (
                <span className="text-xs text-text-light">
                  (intervalle min. {sessionInterval}j)
                </span>
              )}
            </div>
          )}
          {isCollective && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full flex items-center gap-1">
                <Users className="w-3 h-3" />
                Séance collective
              </span>
              <span className="text-xs text-text-light">
                {numberOfSessions} créneau{numberOfSessions > 1 ? "x" : ""} à choisir
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Calendrier approprié selon le type de formule */}
      {isCollective ? (
        // CollectiveSlotPicker pour les formules collectives
        <CollectiveSlotPicker
          variantId={selectedVariant.id as Id<"serviceVariants">}
          numberOfSessions={numberOfSessions}
          sessionInterval={sessionInterval}
          animalCount={animalCount}
          animalType={animalType}
          selectedSlotIds={selectedSlotIds}
          onSlotsSelected={onSlotsSelected || (() => {})}
          className="bg-white rounded-2xl p-5 shadow-sm"
        />
      ) : isMultiSession ? (
        // MultiSessionCalendar pour les formules multi-séances individuelles
        <MultiSessionCalendar
          numberOfSessions={numberOfSessions}
          sessionInterval={sessionInterval}
          selectedSessions={selectedSessions}
          onSessionsChange={onSessionsChange || (() => {})}
          calendarMonth={calendarMonth}
          availabilityCalendar={availabilityCalendar}
          variantDuration={variantDuration}
          bufferBefore={bufferBefore}
          bufferAfter={bufferAfter}
          acceptReservationsFrom={acceptReservationsFrom}
          acceptReservationsTo={acceptReservationsTo}
          onMonthChange={onMonthChange}
          className="shadow-sm"
        />
      ) : (
        // BookingCalendar pour les formules uni-séance
        <BookingCalendar
          selectedDate={selectedDate}
          selectedEndDate={selectedEndDate}
          selectedTime={selectedTime}
          selectedEndTime={selectedEndTime}
          includeOvernightStay={includeOvernightStay}
          calendarMonth={calendarMonth}
          availabilityCalendar={availabilityCalendar}
          isRangeMode={isRangeMode}
          days={days}
          nights={nights}
          isCapacityBased={isCapacityBased}
          maxAnimalsPerSlot={maxAnimalsPerSlot}
          enableDurationBasedBlocking={enableDurationBasedBlocking}
          variantDuration={variantDuration}
          bufferBefore={bufferBefore}
          bufferAfter={bufferAfter}
          acceptReservationsFrom={acceptReservationsFrom}
          acceptReservationsTo={acceptReservationsTo}
          allowOvernightStay={selectedService.allowOvernightStay}
          overnightPrice={selectedVariant.pricing?.nightly || selectedService.overnightPrice}
          dayStartTime={selectedService.dayStartTime}
          dayEndTime={selectedService.dayEndTime}
          billingInfo={billingInfo}
          clientBillingMode={clientBillingMode}
          onDateSelect={onDateSelect}
          onEndDateSelect={onEndDateSelect}
          onTimeSelect={onTimeSelect}
          onEndTimeSelect={onEndTimeSelect}
          onOvernightChange={onOvernightChange}
          onMonthChange={onMonthChange}
        />
      )}
    </div>
  );
}
