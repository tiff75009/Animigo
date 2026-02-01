"use client";

import { ChevronLeft, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/app/lib/utils";
import BookingCalendar from "../BookingCalendar";
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

      {/* Boutons de navigation */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={onPrevStep}
          className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Précédent
        </button>
        {!isLastStep && (
          <button
            onClick={onNextStep}
            disabled={!canProceed}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-colors",
              canProceed
                ? "bg-primary text-white hover:bg-primary/90"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            Continuer
            <ArrowRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
