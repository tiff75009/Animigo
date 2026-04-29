"use client";

import { motion } from "framer-motion";
import BookingCalendar from "../BookingCalendar";
import StepNav from "./StepNav";
import CollectiveSlotPicker from "../CollectiveSlotPicker";
import MultiSessionCalendar from "../MultiSessionCalendar";
import type { CalendarEntry, SelectedSession, BookingSelection } from "../types";
import type { FormuleData } from "../../types";

interface DatesStepProps {
  // Type de formule
  isCollectiveFormule: boolean;
  isMultiSessionIndividual: boolean;
  selectedFormule: FormuleData | null;

  // Collectif
  collectiveNumberOfSessions: number;
  collectiveSessionInterval: number;
  animalCount: number;
  selectedAnimalType: string;
  selectedSlotIds: string[];
  onSlotsSelected?: (slotIds: string[]) => void;

  // Multi-sessions
  individualNumberOfSessions: number;
  individualSessionInterval: number;
  selectedSessions: SelectedSession[];
  onSessionsChange?: (sessions: SelectedSession[]) => void;

  // Calendrier normal
  bookingSelection?: BookingSelection;
  calendarMonth?: Date;
  availabilityCalendar?: CalendarEntry[];
  isRangeMode: boolean;
  days: number;
  nights: number;
  isCapacityBased?: boolean;
  maxAnimalsPerSlot?: number;
  enableDurationBasedBlocking: boolean;
  variantDuration: number;
  bufferBefore: number;
  bufferAfter: number;
  acceptReservationsFrom: string;
  acceptReservationsTo: string;

  // Délai minimum de réservation à l'avance (en heures)
  minimumBookingAdvanceHours?: number;
  // Service settings
  allowOvernightStay?: boolean;
  overnightPrice?: number;
  dayStartTime?: string;
  dayEndTime?: string;

  // Callbacks
  onDateSelect?: (date: string) => void;
  onEndDateSelect?: (date: string | null) => void;
  onTimeSelect?: (time: string) => void;
  onEndTimeSelect?: (time: string) => void;
  onOvernightChange?: (include: boolean) => void;
  onMonthChange?: (date: Date) => void;

  // Navigation
  onPrevStep: () => void;
  onNextStep: () => void;
  canProceed: boolean;
  isLastStep: boolean;

  // Animation
  slideVariants: Record<string, { x: number; opacity: number }>;
  slideDirection: "left" | "right";

  // Conflits animal (autres missions/pendings du client pour les animaux sélectionnés)
  animalBookedSlots?: Array<{
    date: string;
    startTime?: string;
    endTime?: string;
    animalName?: string;
  }>;
  onWeeksToShowChange?: (weeks: number) => void;
  // Indique si un animal est requis mais pas encore sélectionné
  // (utilisateur connecté avec animaux mais aucune sélection)
  needsAnimalSelection?: boolean;
}

export default function DatesStep({
  isCollectiveFormule,
  isMultiSessionIndividual,
  selectedFormule,
  collectiveNumberOfSessions,
  collectiveSessionInterval,
  animalCount,
  selectedAnimalType,
  selectedSlotIds,
  onSlotsSelected,
  individualNumberOfSessions,
  individualSessionInterval,
  selectedSessions,
  onSessionsChange,
  bookingSelection,
  calendarMonth,
  availabilityCalendar,
  isRangeMode,
  days,
  nights,
  isCapacityBased,
  maxAnimalsPerSlot,
  enableDurationBasedBlocking,
  variantDuration,
  bufferBefore,
  bufferAfter,
  acceptReservationsFrom,
  acceptReservationsTo,
  minimumBookingAdvanceHours,
  allowOvernightStay,
  overnightPrice,
  dayStartTime,
  dayEndTime,
  onDateSelect,
  onEndDateSelect,
  onTimeSelect,
  onEndTimeSelect,
  onOvernightChange,
  onMonthChange,
  onPrevStep,
  onNextStep,
  canProceed,
  isLastStep,
  slideVariants,
  slideDirection,
  animalBookedSlots,
  onWeeksToShowChange,
  needsAnimalSelection,
}: DatesStepProps) {
  return (
    <motion.div
      key="dates"
      initial={slideDirection === "right" ? "enterFromRight" : "enterFromLeft"}
      animate="center"
      exit={slideDirection === "right" ? "exitToLeft" : "exitToRight"}
      variants={slideVariants}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {/* Bandeau d'avertissement : aucun animal sélectionné */}
      {needsAnimalSelection && (
        <div
          className="mb-4 p-3 flex items-start gap-2.5 rounded-xl"
          style={{ background: "#fdf3f3", border: "1px solid #f1cdcd" }}
        >
          <span
            className="w-5 h-5 rounded-full inline-flex items-center justify-center flex-shrink-0 text-[12px] font-bold"
            style={{ background: "#c45656", color: "#fff" }}
          >
            !
          </span>
          <div className="text-[12.5px] leading-[1.45]" style={{ color: "#7a3a3a" }}>
            <p className="font-semibold mb-0.5" style={{ color: "#1f1f1d" }}>
              Sélectionnez un animal d&apos;abord
            </p>
            <p>
              Revenez à l&apos;étape précédente pour choisir l&apos;animal concerné par cette
              réservation. Cela permet aussi de bloquer les créneaux où il a déjà une
              autre mission.
            </p>
          </div>
        </div>
      )}

      {/* Créneaux collectifs */}
      {isCollectiveFormule && selectedFormule && onSlotsSelected && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100">
          <CollectiveSlotPicker
            variantId={selectedFormule.id as string}
            numberOfSessions={collectiveNumberOfSessions}
            sessionInterval={collectiveSessionInterval}
            animalCount={animalCount}
            animalType={selectedAnimalType}
            onSlotsSelected={onSlotsSelected}
            selectedSlotIds={selectedSlotIds}
            animalBookedSlots={animalBookedSlots}
            minimumBookingAdvanceHours={minimumBookingAdvanceHours}
          />
        </div>
      )}

      {/* Calendrier multi-séances */}
      {isMultiSessionIndividual && onSessionsChange && calendarMonth && onMonthChange && (
        <MultiSessionCalendar
          numberOfSessions={individualNumberOfSessions}
          sessionInterval={individualSessionInterval}
          selectedSessions={selectedSessions}
          onSessionsChange={onSessionsChange}
          calendarMonth={calendarMonth}
          availabilityCalendar={availabilityCalendar}
          variantDuration={variantDuration}
          bufferBefore={bufferBefore}
          bufferAfter={bufferAfter}
          acceptReservationsFrom={acceptReservationsFrom}
          acceptReservationsTo={acceptReservationsTo}
          onMonthChange={onMonthChange}
          animalBookedSlots={animalBookedSlots}
          onWeeksToShowChange={onWeeksToShowChange}
          minimumBookingAdvanceHours={minimumBookingAdvanceHours}
        />
      )}

      {/* Calendrier normal */}
      {!isCollectiveFormule && !isMultiSessionIndividual && calendarMonth && onDateSelect && onEndDateSelect && onTimeSelect && onEndTimeSelect && onOvernightChange && onMonthChange && (
        <BookingCalendar
          selectedDate={bookingSelection?.startDate ?? null}
          selectedEndDate={bookingSelection?.endDate ?? null}
          selectedTime={bookingSelection?.startTime ?? null}
          selectedEndTime={bookingSelection?.endTime ?? null}
          includeOvernightStay={bookingSelection?.includeOvernightStay ?? false}
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
          minimumBookingAdvanceHours={minimumBookingAdvanceHours}
          allowOvernightStay={allowOvernightStay}
          overnightPrice={overnightPrice}
          dayStartTime={dayStartTime}
          dayEndTime={dayEndTime}
          onDateSelect={onDateSelect}
          onEndDateSelect={onEndDateSelect}
          onTimeSelect={onTimeSelect}
          onEndTimeSelect={onEndTimeSelect}
          onOvernightChange={onOvernightChange}
          onMonthChange={onMonthChange}
          animalBookedSlots={animalBookedSlots}
        />
      )}

      <StepNav
        onPrevStep={onPrevStep}
        onNextStep={onNextStep}
        canProceed={canProceed}
        showNext={!isLastStep}
      />
    </motion.div>
  );
}
