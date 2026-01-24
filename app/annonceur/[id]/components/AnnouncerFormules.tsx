"use client";

import { Package, Sparkles, Plus, MousePointerClick } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/app/lib/utils";
import { ServiceData, FormuleData } from "./types";
import {
  SelectableFormuleCard,
  SelectableOptionCard,
  BookingCalendar,
  ServiceLocationSelector,
  AddressSelector,
  GuestAddressSelector,
  BookingStepBar,
  useBookingSteps,
  type BookingSelection,
  type CalendarEntry,
  type ClientAddress,
  type GuestAddress,
  isGardeService,
} from "./booking";

interface AnnouncerFormulesProps {
  service: ServiceData | null;
  commissionRate?: number;
  selectedVariantId?: string | null;
  selectedOptionIds?: string[];
  bookingSelection?: BookingSelection;
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
  onVariantSelect?: (serviceId: string, variantId: string) => void;
  onOptionToggle?: (optionId: string) => void;
  onLocationSelect?: (location: "announcer_home" | "client_home") => void;
  // Address selection for client_home
  isLoggedIn?: boolean;
  clientAddresses?: ClientAddress[];
  isLoadingAddresses?: boolean;
  onAddressSelect?: (addressId: string) => void;
  onAddNewAddress?: () => void;
  // Guest address for non-logged in users
  guestAddress?: GuestAddress | null;
  announcerCoordinates?: { lat: number; lng: number };
  onGuestAddressChange?: (address: GuestAddress | null) => void;
  onDateSelect?: (date: string) => void;
  onEndDateSelect?: (date: string | null) => void;
  onTimeSelect?: (time: string) => void;
  onEndTimeSelect?: (time: string) => void;
  onOvernightChange?: (include: boolean) => void;
  onMonthChange?: (date: Date) => void;
  className?: string;
}

export default function AnnouncerFormules({
  service,
  commissionRate = 15,
  selectedVariantId,
  selectedOptionIds = [],
  bookingSelection,
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
  onVariantSelect,
  onOptionToggle,
  onLocationSelect,
  isLoggedIn = false,
  clientAddresses = [],
  isLoadingAddresses = false,
  onAddressSelect,
  onAddNewAddress,
  guestAddress,
  announcerCoordinates,
  onGuestAddressChange,
  onDateSelect,
  onEndDateSelect,
  onTimeSelect,
  onEndTimeSelect,
  onOvernightChange,
  onMonthChange,
  className,
}: AnnouncerFormulesProps) {
  // Aucun service sélectionné
  if (!service) {
    return (
      <section className={className}>
        <div className="bg-gray-50 rounded-2xl p-8 text-center">
          <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucun service sélectionné</p>
          <p className="text-sm text-gray-400 mt-2">
            Sélectionnez un service depuis la page de recherche
          </p>
        </div>
      </section>
    );
  }

  const isGarde = isGardeService(service);
  const hasVariantSelected = selectedVariantId !== null && selectedVariantId !== undefined;

  // Trouver la formule sélectionnée pour obtenir sa durée
  const selectedFormule = hasVariantSelected
    ? service.formules.find((f) => f.id.toString() === selectedVariantId)
    : null;

  // Déterminer si le blocage basé sur la durée est activé
  const enableDurationBasedBlocking = Boolean(service.enableDurationBasedBlocking && selectedFormule?.duration);
  const variantDuration = selectedFormule?.duration || 60;

  // Déterminer si on doit afficher le sélecteur de lieu
  const showLocationSelector = hasVariantSelected && service.serviceLocation === "both";

  // Le calendrier ne s'affiche que si :
  // - Une formule est sélectionnée
  // - Si le service nécessite un choix de lieu ET qu'il est fait OU si pas de choix nécessaire
  const canShowCalendar = hasVariantSelected && (
    !showLocationSelector ||
    (showLocationSelector && bookingSelection?.serviceLocation)
  );

  // Calculer les étapes de réservation
  const hasDateSelected = Boolean(bookingSelection?.startDate);
  const hasTimeSelected = Boolean(bookingSelection?.startTime);
  const hasLocationSelected = Boolean(bookingSelection?.serviceLocation);
  const hasOptions = service.options.length > 0;

  const steps = useBookingSteps({
    hasVariantSelected,
    hasDateSelected,
    hasTimeSelected,
    showLocationSelector,
    hasLocationSelected,
    hasOptions,
  });

  return (
    <section className={cn("relative", className)}>
      <div className="flex gap-4 lg:gap-6">
        {/* Barre d'étapes verticale - visible uniquement sur desktop */}
        <div className="hidden lg:block w-48 flex-shrink-0">
          <div className="sticky top-36">
            <BookingStepBar steps={steps} />
          </div>
        </div>

        {/* Contenu principal */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* En-tête du service */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100">
            <div className="flex items-start gap-4">
              <span className="text-3xl">{service.categoryIcon}</span>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">{service.categoryName}</h2>
                {service.description && (
                  <p className="text-gray-600 mt-1">{service.description}</p>
                )}
              </div>
            </div>
          </div>

      {/* Section Formules */}
      <motion.div
        className={cn(
          "bg-white rounded-2xl p-5 sm:p-6 border-2 transition-colors duration-300 relative overflow-hidden",
          hasVariantSelected
            ? "border-gray-100"
            : "border-primary/50"
        )}
        animate={!hasVariantSelected ? {
          boxShadow: [
            "0 0 0 0 rgba(255, 107, 107, 0)",
            "0 0 0 8px rgba(255, 107, 107, 0.15)",
            "0 0 0 0 rgba(255, 107, 107, 0)",
          ],
        } : {}}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Subtle gradient overlay when no selection */}
        {!hasVariantSelected && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
        )}

        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className={cn(
                "p-2 rounded-lg transition-colors duration-300",
                hasVariantSelected ? "bg-purple/10" : "bg-primary/10"
              )}>
                <Package className={cn(
                  "w-5 h-5 transition-colors duration-300",
                  hasVariantSelected ? "text-purple" : "text-primary"
                )} />
              </span>
              Choisissez votre formule
            </h3>

            {/* Indicator when no selection */}
            {!hasVariantSelected && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-1.5 text-sm text-primary font-medium"
              >
                <MousePointerClick className="w-4 h-4" />
                <span className="hidden sm:inline">Sélectionnez une formule</span>
              </motion.div>
            )}
          </div>

          {service.formules.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <p className="text-gray-500">Aucune formule disponible</p>
            </div>
          ) : (
            <div className="space-y-3">
              {service.formules.map((formule, index) => (
                <SelectableFormuleCard
                  key={formule.id.toString()}
                  formule={formule}
                  isSelected={selectedVariantId === formule.id.toString()}
                  isGarde={isGarde}
                  commissionRate={commissionRate}
                  onSelect={() => onVariantSelect?.(service.id.toString(), formule.id.toString())}
                  showAttentionPulse={!hasVariantSelected}
                  animationDelay={index * 0.1}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Calendrier - visible quand une formule est sélectionnée (desktop seulement) */}
      {hasVariantSelected && calendarMonth && onDateSelect && onEndDateSelect && onTimeSelect && onEndTimeSelect && onOvernightChange && onMonthChange && (
        <div className="hidden md:block">
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
            allowOvernightStay={service.allowOvernightStay}
            overnightPrice={service.overnightPrice}
            dayStartTime={service.dayStartTime}
            dayEndTime={service.dayEndTime}
            onDateSelect={onDateSelect}
            onEndDateSelect={onEndDateSelect}
            onTimeSelect={onTimeSelect}
            onEndTimeSelect={onEndTimeSelect}
            onOvernightChange={onOvernightChange}
            onMonthChange={onMonthChange}
          />
        </div>
      )}

      {/* Section Lieu de prestation - visible si nécessaire */}
      {showLocationSelector && onLocationSelect && (
        <ServiceLocationSelector
          serviceLocation={service.serviceLocation!}
          selectedLocation={bookingSelection?.serviceLocation ?? null}
          onSelect={onLocationSelect}
        />
      )}

      {/* Section Adresse client - visible si service à domicile */}
      {hasVariantSelected &&
        (bookingSelection?.serviceLocation === "client_home" ||
          (service.serviceLocation === "client_home" && !showLocationSelector)) && (
          <>
            {isLoggedIn ? (
              // Utilisateur connecté - Sélection d'adresse existante
              onAddressSelect && onAddNewAddress && (
                <AddressSelector
                  addresses={clientAddresses}
                  selectedAddressId={bookingSelection?.selectedAddressId ?? null}
                  isLoading={isLoadingAddresses}
                  onSelect={onAddressSelect}
                  onAddNew={onAddNewAddress}
                />
              )
            ) : (
              // Invité - Saisie d'adresse avec autocomplétion
              onGuestAddressChange && (
                <GuestAddressSelector
                  guestAddress={guestAddress ?? null}
                  announcerCoordinates={announcerCoordinates}
                  onAddressChange={onGuestAddressChange}
                />
              )
            )}
          </>
        )}

      {/* Section Options additionnelles - visible quand une formule est sélectionnée */}
      {hasVariantSelected && service.options.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "bg-white rounded-2xl p-5 sm:p-6 border-2 transition-colors duration-300 relative overflow-hidden",
            selectedOptionIds.length > 0
              ? "border-gray-100"
              : "border-secondary/30"
          )}
        >
          {/* Subtle gradient overlay when no options selected */}
          {selectedOptionIds.length === 0 && (
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-secondary/5 pointer-events-none" />
          )}

          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span className={cn(
                  "p-2 rounded-lg transition-colors duration-300",
                  selectedOptionIds.length > 0 ? "bg-secondary/10" : "bg-secondary/15"
                )}>
                  <Plus className="w-5 h-5 text-secondary" />
                </span>
                Options additionnelles
              </h3>

              {/* Subtle invitation when no options selected */}
              {selectedOptionIds.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-1.5 text-sm text-secondary font-medium"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden sm:inline">Personnalisez votre réservation</span>
                </motion.div>
              )}
            </div>

            <div className="space-y-3">
              {service.options.map((option, index) => (
                <SelectableOptionCard
                  key={option.id.toString()}
                  option={option}
                  isSelected={selectedOptionIds.includes(option.id.toString())}
                  commissionRate={commissionRate}
                  onToggle={() => onOptionToggle?.(option.id.toString())}
                  showSuggestPulse={selectedOptionIds.length === 0}
                  animationDelay={index * 0.1}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
        </div>
      </div>
    </section>
  );
}
