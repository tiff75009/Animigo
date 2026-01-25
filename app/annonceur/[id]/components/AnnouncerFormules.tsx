"use client";

import { useState } from "react";
import { Package, Sparkles, Plus, MousePointerClick, Filter, PawPrint, Check } from "lucide-react";
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
  CollectiveSlotPicker,
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
  // Créneaux collectifs
  selectedSlotIds?: string[];
  onSlotsSelected?: (slotIds: string[]) => void;
  selectedAnimalType?: string; // Type d'animal sélectionné par le client
  animalCount?: number; // Nombre d'animaux du client
  onAnimalCountChange?: (count: number) => void;
  // Sélection de l'animal (utilisateur connecté)
  userAnimals?: Array<{
    id: string;
    name: string;
    type: string;
    breed?: string;
    profilePhoto?: string;
  }>;
  selectedAnimalId?: string | null;
  onAnimalSelect?: (animalId: string, animalType: string) => void;
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
  selectedSlotIds = [],
  onSlotsSelected,
  selectedAnimalType = "chien",
  animalCount = 1,
  onAnimalCountChange,
  userAnimals = [],
  selectedAnimalId,
  onAnimalSelect,
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

  // États des filtres
  const [filterSessionType, setFilterSessionType] = useState<"all" | "individual" | "collective">("all");
  const [filterLocation, setFilterLocation] = useState<"all" | "announcer_home" | "client_home" | "both">("all");
  const [filterAnimal, setFilterAnimal] = useState<string>("all");

  const isGarde = isGardeService(service);
  const hasVariantSelected = selectedVariantId !== null && selectedVariantId !== undefined;

  // Collecter tous les types d'animaux uniques dans les formules
  const allAnimalsInFormules = [...new Set(service.formules.flatMap(f => f.animalTypes || []))];

  // Filtrer les formules
  const filteredFormules = service.formules.filter(formule => {
    if (filterSessionType !== "all") {
      const formuleSessionType = formule.sessionType || "individual";
      if (formuleSessionType !== filterSessionType) return false;
    }
    if (filterLocation !== "all") {
      if (!formule.serviceLocation) return false;
      if (filterLocation === "both") {
        if (formule.serviceLocation !== "both") return false;
      } else {
        if (formule.serviceLocation !== filterLocation && formule.serviceLocation !== "both") return false;
      }
    }
    if (filterAnimal !== "all") {
      if (!formule.animalTypes || !formule.animalTypes.includes(filterAnimal)) return false;
    }
    return true;
  });

  const hasActiveFilters = filterSessionType !== "all" || filterLocation !== "all" || filterAnimal !== "all";

  const resetFilters = () => {
    setFilterSessionType("all");
    setFilterLocation("all");
    setFilterAnimal("all");
  };

  // Labels pour les animaux
  const animalLabels: Record<string, string> = {
    chien: "🐕 Chien",
    chat: "🐈 Chat",
    lapin: "🐰 Lapin",
    rongeur: "🐹 Rongeur",
    oiseau: "🦜 Oiseau",
    poisson: "🐠 Poisson",
    reptile: "🦎 Reptile",
    nac: "🐾 NAC",
  };

  // Trouver la formule sélectionnée pour obtenir sa durée
  const selectedFormule = hasVariantSelected
    ? service.formules.find((f) => f.id.toString() === selectedVariantId)
    : null;

  // Déterminer si le blocage basé sur la durée est activé
  const enableDurationBasedBlocking = Boolean(service.enableDurationBasedBlocking && selectedFormule?.duration);
  const variantDuration = selectedFormule?.duration || 60;

  // Déterminer si la formule sélectionnée est collective
  const isCollectiveFormule = selectedFormule?.sessionType === "collective";
  const collectiveNumberOfSessions = selectedFormule?.numberOfSessions || 1;
  const collectiveSessionInterval = selectedFormule?.sessionInterval || 7;
  const collectiveMaxAnimals = selectedFormule?.maxAnimalsPerSession || 5;

  // Déterminer si on doit afficher le sélecteur de lieu
  // Pour les services garde (isRangeMode), on affiche toujours le sélecteur de lieu
  const showLocationSelector = hasVariantSelected && (
    service.serviceLocation === "both" ||
    isRangeMode // Toujours afficher pour les services garde
  );

  // Le calendrier ne s'affiche que si :
  // - Une formule est sélectionnée
  // - Si le service nécessite un choix de lieu ET qu'il est fait OU si pas de choix nécessaire
  const canShowCalendar = hasVariantSelected && (
    !showLocationSelector ||
    (showLocationSelector && bookingSelection?.serviceLocation)
  );

  // Calculer les étapes de réservation
  const hasDateSelected = Boolean(bookingSelection?.startDate);
  const hasEndDateSelected = Boolean(bookingSelection?.endDate);
  const hasTimeSelected = Boolean(bookingSelection?.startTime);
  const hasEndTimeSelected = Boolean(bookingSelection?.endTime);
  const hasLocationSelected = Boolean(bookingSelection?.serviceLocation);
  // Pour les services garde (isRangeMode), on affiche toujours l'étape Options
  const hasOptions = service.options.length > 0 || isRangeMode;
  const hasOptionsSelected = selectedOptionIds.length > 0;

  const steps = useBookingSteps({
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
  });

  return (
    <section className={cn("relative", className)}>
      <div className="flex gap-4 lg:gap-6">
        {/* Barre d'étapes verticale - visible uniquement sur desktop */}
        {/* La largeur s'adapte automatiquement selon l'état replié/déplié */}
        <div className="hidden lg:block flex-shrink-0 transition-all duration-300">
          <div className="sticky top-36">
            <BookingStepBar steps={steps} defaultCollapsed={true} />
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

          {/* Filtres */}
          {service.formules.length > 1 && (
            <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">Filtrer</span>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="ml-auto text-xs text-primary hover:underline"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={filterSessionType}
                  onChange={(e) => setFilterSessionType(e.target.value as "all" | "individual" | "collective")}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-lg border transition-colors",
                    filterSessionType !== "all"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-gray-200 bg-white text-gray-700"
                  )}
                >
                  <option value="all">Toutes les séances</option>
                  <option value="individual">👤 Individuel</option>
                  <option value="collective">👥 Collectif</option>
                </select>

                <select
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value as "all" | "announcer_home" | "client_home" | "both")}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-lg border transition-colors",
                    filterLocation !== "all"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-gray-200 bg-white text-gray-700"
                  )}
                >
                  <option value="all">Tous les lieux</option>
                  <option value="announcer_home">🏠 Chez le pro</option>
                  <option value="client_home">📍 À domicile</option>
                  <option value="both">🔄 Flexible</option>
                </select>

                {allAnimalsInFormules.length > 0 && (
                  <select
                    value={filterAnimal}
                    onChange={(e) => setFilterAnimal(e.target.value)}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-lg border transition-colors",
                      filterAnimal !== "all"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-gray-200 bg-white text-gray-700"
                    )}
                  >
                    <option value="all">Tous les animaux</option>
                    {allAnimalsInFormules.map(animal => (
                      <option key={animal} value={animal}>{animalLabels[animal] || animal}</option>
                    ))}
                  </select>
                )}
              </div>
              {hasActiveFilters && (
                <p className="text-xs text-gray-500 mt-2">
                  {filteredFormules.length} formule{filteredFormules.length > 1 ? "s" : ""} sur {service.formules.length}
                </p>
              )}
            </div>
          )}

          {service.formules.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <p className="text-gray-500">Aucune formule disponible</p>
            </div>
          ) : filteredFormules.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <p className="text-gray-500">Aucune formule ne correspond aux filtres</p>
              <button
                onClick={resetFilters}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFormules.map((formule, index) => (
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

      {/* Créneaux collectifs - visible sur tous les écrans */}
      {hasVariantSelected && isCollectiveFormule && selectedFormule && onSlotsSelected && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 space-y-4">
          {/* Sélecteur d'animal (utilisateur connecté) */}
          {isLoggedIn && userAnimals.length > 0 && onAnimalSelect && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <PawPrint className="w-5 h-5 text-primary" />
                <span className="font-medium text-gray-900">
                  Quel animal participera ?
                </span>
              </div>
              <div className="grid gap-2">
                {userAnimals
                  .filter((animal) => {
                    // Filtrer par les types acceptés par la formule
                    const acceptedTypes = selectedFormule.animalTypes || service?.animalTypes || [];
                    return acceptedTypes.length === 0 || acceptedTypes.includes(animal.type);
                  })
                  .map((animal, idx) => {
                    const isSelected = selectedAnimalId === animal.id;
                    return (
                      <button
                        key={animal.id || `animal-${idx}`}
                        type="button"
                        onClick={() => onAnimalSelect(animal.id, animal.type)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        )}
                      >
                        {animal.profilePhoto ? (
                          <img
                            src={animal.profilePhoto}
                            alt={animal.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                            <PawPrint className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className={cn(
                            "font-semibold",
                            isSelected ? "text-primary" : "text-gray-900"
                          )}>
                            {animal.name}
                          </p>
                          <p className="text-sm text-gray-500 capitalize">
                            {animal.type}
                            {animal.breed && ` • ${animal.breed}`}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
              </div>
              {userAnimals.filter((animal) => {
                const acceptedTypes = selectedFormule.animalTypes || service?.animalTypes || [];
                return acceptedTypes.length === 0 || acceptedTypes.includes(animal.type);
              }).length === 0 && (
                <div className="p-4 bg-amber-50 rounded-xl text-amber-700 text-sm">
                  Aucun de vos animaux n'est compatible avec cette formule.
                  Types acceptés : {(selectedFormule.animalTypes || service?.animalTypes || []).join(", ")}.
                </div>
              )}
            </div>
          )}

          {/* Sélecteur du nombre d'animaux */}
          {onAnimalCountChange && collectiveMaxAnimals > 1 && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="font-medium text-gray-900">Nombre d'animaux</p>
                <p className="text-sm text-gray-500">
                  Maximum {collectiveMaxAnimals} par séance
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onAnimalCountChange(Math.max(1, animalCount - 1))}
                  disabled={animalCount <= 1}
                  className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  -
                </button>
                <span className="w-8 text-center font-semibold text-gray-900">
                  {animalCount}
                </span>
                <button
                  type="button"
                  onClick={() => onAnimalCountChange(Math.min(collectiveMaxAnimals, animalCount + 1))}
                  disabled={animalCount >= collectiveMaxAnimals}
                  className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>
            </div>
          )}

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

      {/* Calendrier normal - visible quand une formule non-collective est sélectionnée (desktop seulement) */}
      {hasVariantSelected && !isCollectiveFormule && (
        <div className="hidden md:block">
          {calendarMonth && onDateSelect && onEndDateSelect && onTimeSelect && onEndTimeSelect && onOvernightChange && onMonthChange && (
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
          )}
        </div>
      )}

      {/* Section Lieu de prestation - visible pour services garde ou si choix nécessaire */}
      {showLocationSelector && onLocationSelect && (
        <ServiceLocationSelector
          serviceLocation={service.serviceLocation || "both"}
          selectedLocation={bookingSelection?.serviceLocation ?? null}
          onSelect={onLocationSelect}
          isRangeMode={isRangeMode}
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
      {/* Pour les services garde (isRangeMode), toujours afficher cette section */}
      {hasVariantSelected && (service.options.length > 0 || isRangeMode) && (
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
              {selectedOptionIds.length === 0 && service.options.length > 0 && (
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

            {service.options.length > 0 ? (
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
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">
                  Aucune option disponible pour ce service
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
        </div>
      </div>
    </section>
  );
}
