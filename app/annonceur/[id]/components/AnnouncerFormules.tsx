"use client";

import { Package, Sparkles, Plus } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { ServiceData, FormuleData } from "./types";
import {
  SelectableFormuleCard,
  SelectableOptionCard,
  BookingCalendar,
  ServiceLocationSelector,
  AddressSelector,
  type BookingSelection,
  type CalendarEntry,
  type ClientAddress,
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
  clientAddresses?: ClientAddress[];
  isLoadingAddresses?: boolean;
  onAddressSelect?: (addressId: string) => void;
  onAddNewAddress?: () => void;
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
  clientAddresses = [],
  isLoadingAddresses = false,
  onAddressSelect,
  onAddNewAddress,
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

  return (
    <section className={cn("space-y-6", className)}>
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
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="p-2 bg-purple/10 rounded-lg">
            <Package className="w-5 h-5 text-purple" />
          </span>
          Choisissez votre formule
        </h3>

        {service.formules.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-6 text-center">
            <p className="text-gray-500">Aucune formule disponible</p>
          </div>
        ) : (
          <div className="space-y-3">
            {service.formules.map((formule) => (
              <SelectableFormuleCard
                key={formule.id.toString()}
                formule={formule}
                isSelected={selectedVariantId === formule.id.toString()}
                isGarde={isGarde}
                commissionRate={commissionRate}
                onSelect={() => onVariantSelect?.(service.id.toString(), formule.id.toString())}
              />
            ))}
          </div>
        )}
      </div>

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
          (service.serviceLocation === "client_home" && !showLocationSelector)) &&
        onAddressSelect &&
        onAddNewAddress && (
          <AddressSelector
            addresses={clientAddresses}
            selectedAddressId={bookingSelection?.selectedAddressId ?? null}
            isLoading={isLoadingAddresses}
            onSelect={onAddressSelect}
            onAddNew={onAddNewAddress}
          />
        )}

      {/* Section Options additionnelles - visible quand une formule est sélectionnée */}
      {hasVariantSelected && service.options.length > 0 && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="p-2 bg-secondary/10 rounded-lg">
              <Plus className="w-5 h-5 text-secondary" />
            </span>
            Options additionnelles
          </h3>

          <div className="space-y-3">
            {service.options.map((option) => (
              <SelectableOptionCard
                key={option.id.toString()}
                option={option}
                isSelected={selectedOptionIds.includes(option.id.toString())}
                commissionRate={commissionRate}
                onToggle={() => onOptionToggle?.(option.id.toString())}
              />
            ))}
          </div>
        </div>
      )}

      {/* Calendrier - visible quand les conditions sont remplies (desktop seulement) */}
      {canShowCalendar && calendarMonth && onDateSelect && onEndDateSelect && onTimeSelect && onEndTimeSelect && onOvernightChange && onMonthChange && (
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
    </section>
  );
}
