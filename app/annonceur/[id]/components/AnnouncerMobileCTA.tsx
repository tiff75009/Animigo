"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Check, ShoppingCart, Calendar, Clock, CreditCard, Eye } from "lucide-react";
import { ServiceData, FormuleData } from "./types";
import { cn } from "@/app/lib/utils";
import {
  BookingSummary,
  BookingCalendar,
  type BookingSelection,
  type PriceBreakdown,
  type CalendarEntry,
  formatPrice,
  formatDateDisplay,
  calculatePriceWithCommission,
  isGardeService,
  getFormuleBestPrice,
} from "./booking";

interface AnnouncerMobileCTAProps {
  services: ServiceData[];
  selectedServiceId?: string | null;
  commissionRate?: number;
  bookingService?: ServiceData | null;
  bookingVariant?: FormuleData | null;
  bookingSelection?: BookingSelection;
  priceBreakdown?: PriceBreakdown | null;
  // Calendar props
  isRangeMode?: boolean;
  days?: number;
  nights?: number;
  calendarMonth?: Date;
  availabilityCalendar?: CalendarEntry[];
  isCapacityBased?: boolean;
  maxAnimalsPerSlot?: number;
  acceptReservationsFrom?: string;
  acceptReservationsTo?: string;
  bufferBefore?: number;
  bufferAfter?: number;
  onDateSelect?: (date: string) => void;
  onEndDateSelect?: (date: string | null) => void;
  onTimeSelect?: (time: string) => void;
  onEndTimeSelect?: (time: string) => void;
  onOvernightChange?: (include: boolean) => void;
  onMonthChange?: (date: Date) => void;
  onBook?: () => void;
  onFinalize?: () => void;
}

// Get minimum price for a service
const getServiceMinPrice = (service: ServiceData): { price: number; unit: string } => {
  const isGarde = isGardeService(service);
  let minPrice = Infinity;
  let minUnit = "";

  for (const formule of service.formules) {
    const { price, unit } = getFormuleBestPrice(formule, isGarde);
    if (price > 0 && price < minPrice) {
      minPrice = price;
      minUnit = unit;
    }
  }

  return { price: minPrice === Infinity ? 0 : minPrice, unit: minUnit };
};

// Get global minimum price
const getGlobalMinPrice = (services: ServiceData[]): { price: number; unit: string } => {
  let minPrice = Infinity;
  let minUnit = "";

  for (const service of services) {
    const isGarde = isGardeService(service);
    for (const formule of service.formules) {
      const { price, unit } = getFormuleBestPrice(formule, isGarde);
      if (price > 0 && price < minPrice) {
        minPrice = price;
        minUnit = unit;
      }
    }
  }

  return { price: minPrice === Infinity ? 0 : minPrice, unit: minUnit };
};

export default function AnnouncerMobileCTA({
  services,
  selectedServiceId,
  commissionRate = 15,
  bookingService,
  bookingVariant,
  bookingSelection,
  priceBreakdown,
  // Calendar props
  isRangeMode = false,
  days = 1,
  nights = 0,
  calendarMonth,
  availabilityCalendar,
  isCapacityBased,
  maxAnimalsPerSlot,
  acceptReservationsFrom = "08:00",
  acceptReservationsTo = "20:00",
  bufferBefore = 0,
  bufferAfter = 0,
  onDateSelect,
  onEndDateSelect,
  onTimeSelect,
  onEndTimeSelect,
  onOvernightChange,
  onMonthChange,
  onBook,
  onFinalize,
}: AnnouncerMobileCTAProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isCalendarSheetOpen, setIsCalendarSheetOpen] = useState(false);
  const [prevVariantId, setPrevVariantId] = useState<string | null>(null);

  // Determine if duration-based blocking is enabled
  const enableDurationBasedBlocking = Boolean(bookingService?.enableDurationBasedBlocking && bookingVariant?.duration);
  const variantDuration = bookingVariant?.duration || 60;

  // Check if we need time selection for the service (non-range mode services)
  const needsTimeSelection = bookingService && !isRangeMode;

  // Determine if booking can proceed: if needs time, must have time selected
  const hasRequiredTimeSelection = !needsTimeSelection || (bookingSelection?.startTime !== null);

  // Auto-open calendar sheet when a variant is selected for the first time
  useEffect(() => {
    if (bookingVariant && bookingVariant.id.toString() !== prevVariantId) {
      setPrevVariantId(bookingVariant.id.toString());
      // Open calendar sheet automatically when variant changes
      if (!bookingSelection?.startDate) {
        setIsCalendarSheetOpen(true);
      }
    }
  }, [bookingVariant, prevVariantId, bookingSelection?.startDate]);

  // Find selected service
  const selectedService = selectedServiceId
    ? services.find((s) => s.id === selectedServiceId || s.categorySlug === selectedServiceId)
    : null;

  // Check if booking is in progress (variant selected)
  const hasVariantSelected = Boolean(bookingService && bookingVariant);
  const hasDateSelected = Boolean(bookingSelection?.startDate);
  const hasFullBooking = hasVariantSelected && hasDateSelected && priceBreakdown;

  // Get price to display
  const { price: minPrice, unit: minUnit } = selectedService
    ? getServiceMinPrice(selectedService)
    : getGlobalMinPrice(services);
  const hasPrice = minPrice > 0;

  // Handle direct booking
  const handleBookClick = () => {
    if (hasFullBooking && hasRequiredTimeSelection) {
      // If booking is ready with required time, show summary sheet
      setIsSheetOpen(true);
    } else if (hasVariantSelected && !hasDateSelected) {
      // Variant selected but no date - open calendar sheet
      setIsCalendarSheetOpen(true);
    } else if (hasVariantSelected && hasDateSelected && !hasRequiredTimeSelection) {
      // Date selected but no time when required - open calendar sheet
      setIsCalendarSheetOpen(true);
    } else if (services.length === 1 && services[0].formules.length === 1) {
      // Only one service with one formule, book directly
      onBook?.();
    } else {
      // Multiple options, show selection sheet
      setIsSheetOpen(true);
    }
  };

  // Handle confirm from calendar sheet
  const handleCalendarConfirm = () => {
    if (hasRequiredTimeSelection && bookingSelection?.startDate) {
      setIsCalendarSheetOpen(false);
    }
  };

  // Handle confirm booking from sheet
  const handleConfirmBooking = () => {
    setIsSheetOpen(false);
    onBook?.();
  };

  // Format short date for display
  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  // Determine what to show in the CTA bar
  const renderPriceSection = () => {
    // Full booking: show total with details - tappable to modify
    if (hasFullBooking && priceBreakdown) {
      return (
        <button
          onClick={() => setIsCalendarSheetOpen(true)}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-medium text-gray-700 truncate max-w-[100px]">
              {bookingVariant!.name}
            </span>
            {bookingSelection?.startDate && (
              <>
                <span className="text-gray-300">•</span>
                <span className="flex items-center gap-1 whitespace-nowrap text-primary underline underline-offset-2">
                  <Calendar className="w-3 h-3" />
                  {formatShortDate(bookingSelection.startDate)}
                  {bookingSelection.endDate && bookingSelection.endDate !== bookingSelection.startDate && (
                    <> - {formatShortDate(bookingSelection.endDate)}</>
                  )}
                </span>
              </>
            )}
            {bookingSelection?.startTime && (
              <>
                <span className="text-gray-300">•</span>
                <span className="flex items-center gap-1 whitespace-nowrap text-primary underline underline-offset-2">
                  <Clock className="w-3 h-3" />
                  {bookingSelection.startTime}
                </span>
              </>
            )}
          </div>
          <p className="text-xl font-bold text-gray-900">
            {formatPrice(priceBreakdown.total)}€
            <span className="text-sm font-normal text-gray-500 ml-1">total</span>
          </p>
        </button>
      );
    }

    // Variant selected (with or without date): show formule price - tappable if date exists
    if (hasVariantSelected && bookingVariant) {
      const isGarde = bookingService ? isGardeService(bookingService) : false;
      const { price: variantPrice, unit: variantUnit } = getFormuleBestPrice(bookingVariant, isGarde);

      // If date is selected, make it tappable to modify
      if (hasDateSelected) {
        return (
          <button
            onClick={() => setIsCalendarSheetOpen(true)}
            className="flex-1 min-w-0 text-left"
          >
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="truncate max-w-[100px]">
                {bookingService?.categoryIcon} {bookingVariant.name}
              </span>
              {bookingSelection?.startDate && (
                <span className="flex items-center gap-1 whitespace-nowrap text-primary underline underline-offset-2">
                  <Calendar className="w-3 h-3" />
                  {formatShortDate(bookingSelection.startDate)}
                </span>
              )}
              {bookingSelection?.startTime && (
                <span className="flex items-center gap-1 whitespace-nowrap text-primary underline underline-offset-2">
                  <Clock className="w-3 h-3" />
                  {bookingSelection.startTime}
                </span>
              )}
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatPrice(calculatePriceWithCommission(variantPrice, commissionRate))}€
              {variantUnit && (
                <span className="text-sm font-normal text-gray-500">/{variantUnit}</span>
              )}
            </p>
          </button>
        );
      }

      return (
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 truncate">
            {bookingService?.categoryIcon} {bookingVariant.name}
          </p>
          <p className="text-xl font-bold text-gray-900">
            {formatPrice(calculatePriceWithCommission(variantPrice, commissionRate))}€
            {variantUnit && (
              <span className="text-sm font-normal text-gray-500">/{variantUnit}</span>
            )}
          </p>
        </div>
      );
    }

    // No selection: show minimum price
    return (
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500">À partir de</p>
        {hasPrice ? (
          <p className="text-xl font-bold text-gray-900">
            {formatPrice(calculatePriceWithCommission(minPrice, commissionRate))}€
            <span className="text-sm font-normal text-gray-500">
              {minUnit ? `/${minUnit}` : ""}
            </span>
          </p>
        ) : (
          <p className="text-base font-medium text-gray-500">
            Prix sur demande
          </p>
        )}
      </div>
    );
  };

  // Determine button text
  const getButtonText = () => {
    if (hasFullBooking && hasRequiredTimeSelection) {
      return (
        <>
          <ShoppingCart className="w-4 h-4" />
          Voir le récap
        </>
      );
    }
    if (hasVariantSelected && !hasDateSelected) {
      return (
        <>
          <Calendar className="w-4 h-4" />
          Choisir une date
        </>
      );
    }
    if (hasVariantSelected && hasDateSelected && !hasRequiredTimeSelection) {
      return (
        <>
          <Clock className="w-4 h-4" />
          Choisir l&apos;heure
        </>
      );
    }
    return "Réserver";
  };

  // Check if book button should be enabled
  const isBookButtonEnabled = !hasVariantSelected || (hasFullBooking && hasRequiredTimeSelection) || !hasDateSelected || !hasRequiredTimeSelection;

  return (
    <>
      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 md:hidden z-40">
        <div className="flex items-center gap-3">
          {renderPriceSection()}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleBookClick}
            className="flex-shrink-0 px-6 py-3.5 font-semibold rounded-xl shadow-lg flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary/90 text-white shadow-primary/25"
          >
            {getButtonText()}
          </motion.button>
        </div>
      </div>

      {/* Spacer for mobile CTA */}
      <div className="h-24 md:hidden" />

      {/* Sheet (Portal) */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isSheetOpen && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsSheetOpen(false)}
                  className="fixed inset-0 bg-black/50 z-[9998] md:hidden"
                />

                {/* Sheet */}
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-[9999] md:hidden max-h-[85vh] flex flex-col"
                >
                  {/* Sheet Header */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {hasFullBooking ? "Récapitulatif" : "Choisir une prestation"}
                    </h3>
                    <button
                      onClick={() => setIsSheetOpen(false)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  {/* Sheet Content */}
                  <div className="overflow-y-auto flex-1 p-4">
                    {hasFullBooking && bookingService && bookingVariant && bookingSelection ? (
                      // Show booking summary
                      <div className="space-y-4">
                        <BookingSummary
                          service={bookingService}
                          variant={bookingVariant}
                          selection={bookingSelection}
                          priceBreakdown={priceBreakdown ?? null}
                          commissionRate={commissionRate}
                          compact
                        />

                        {/* Buttons */}
                        <div className="space-y-3">
                          {/* Vérifier la réservation */}
                          <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={handleConfirmBooking}
                            className="w-full py-3.5 bg-gradient-to-r from-primary to-primary/90 text-white font-semibold rounded-xl shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            Vérifier la réservation
                          </motion.button>

                          {/* Finaliser directement */}
                          <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              setIsSheetOpen(false);
                              onFinalize?.();
                            }}
                            className="w-full py-3.5 border-2 border-secondary bg-secondary/5 text-secondary font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-secondary/10 transition-colors"
                          >
                            <CreditCard className="w-4 h-4" />
                            Finaliser la réservation
                            <ArrowRight className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>
                    ) : (
                      // Show service/formule selection
                      services.map((service, index) => (
                        <div
                          key={service.id.toString()}
                          className={cn(
                            "pb-4",
                            index > 0 && "pt-4 border-t border-gray-100"
                          )}
                        >
                          {/* Service Header */}
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-lg">{service.categoryIcon}</span>
                            <span className="font-semibold text-gray-900">
                              {service.categoryName}
                            </span>
                          </div>

                          {/* Formules */}
                          <div className="space-y-2">
                            {service.formules.map((formule) => {
                              const isGarde = isGardeService(service);
                              const { price: formulePrice, unit: formuleUnit } = getFormuleBestPrice(
                                formule,
                                isGarde
                              );
                              return (
                                <motion.button
                                  key={formule.id.toString()}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => {
                                    setIsSheetOpen(false);
                                    onBook?.();
                                  }}
                                  className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left"
                                >
                                  <div className="flex-1 min-w-0 pr-3">
                                    <p className="font-medium text-gray-900">
                                      {formule.name}
                                    </p>
                                    {formule.description && (
                                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                                        {formule.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="text-lg font-bold text-primary">
                                      {formatPrice(
                                        calculatePriceWithCommission(formulePrice, commissionRate)
                                      )}
                                      €
                                      <span className="text-sm font-normal text-gray-500">
                                        {formuleUnit ? `/${formuleUnit}` : ""}
                                      </span>
                                    </span>
                                    <div className="p-2 bg-primary text-white rounded-lg">
                                      <ArrowRight className="w-4 h-4" />
                                    </div>
                                  </div>
                                </motion.button>
                              );
                            })}
                          </div>

                          {/* Options preview */}
                          {service.options.length > 0 && (
                            <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                              <Check className="w-3 h-3 text-secondary" />
                              {service.options.length} option
                              {service.options.length > 1 ? "s" : ""} disponible
                              {service.options.length > 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Safe area spacer */}
                  <div className="h-6 flex-shrink-0" />
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* Calendar Sheet (Portal) */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isCalendarSheetOpen && calendarMonth && onDateSelect && onEndDateSelect && onTimeSelect && onEndTimeSelect && onOvernightChange && onMonthChange && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsCalendarSheetOpen(false)}
                  className="fixed inset-0 bg-black/50 z-[9998] md:hidden"
                />

                {/* Calendar Sheet */}
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-[9999] md:hidden max-h-[90vh] flex flex-col"
                >
                  {/* Sheet Header */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {isRangeMode ? "Choisissez vos dates" : "Choisissez votre créneau"}
                      </h3>
                      {bookingVariant && (
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <span>{bookingService?.categoryIcon}</span>
                          {bookingVariant.name}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setIsCalendarSheetOpen(false)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  {/* Sheet Content - Calendar */}
                  <div className="overflow-y-auto flex-1 p-4">
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
                      allowOvernightStay={bookingService?.allowOvernightStay}
                      overnightPrice={bookingService?.overnightPrice}
                      dayStartTime={bookingService?.dayStartTime}
                      dayEndTime={bookingService?.dayEndTime}
                      onDateSelect={onDateSelect}
                      onEndDateSelect={onEndDateSelect}
                      onTimeSelect={onTimeSelect}
                      onEndTimeSelect={onEndTimeSelect}
                      onOvernightChange={onOvernightChange}
                      onMonthChange={onMonthChange}
                    />
                  </div>

                  {/* Confirm button */}
                  <div className="p-4 border-t border-gray-100 flex-shrink-0">
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCalendarConfirm}
                      disabled={!bookingSelection?.startDate || !hasRequiredTimeSelection}
                      className={cn(
                        "w-full py-3.5 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors",
                        bookingSelection?.startDate && hasRequiredTimeSelection
                          ? "bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg shadow-primary/25"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      )}
                    >
                      {!bookingSelection?.startDate ? (
                        "Sélectionnez une date"
                      ) : !hasRequiredTimeSelection ? (
                        "Sélectionnez un horaire"
                      ) : (
                        <>
                          Confirmer
                          <Check className="w-4 h-4" />
                        </>
                      )}
                    </motion.button>
                  </div>

                  {/* Safe area spacer */}
                  <div className="h-2 flex-shrink-0" />
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
