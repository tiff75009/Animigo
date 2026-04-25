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
