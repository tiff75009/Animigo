"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Check, ShoppingCart, Calendar, Clock, CreditCard, Eye, PawPrint, MapPin, Home, Plus, ChevronLeft } from "lucide-react";
import { ServiceData, FormuleData } from "./types";
import { cn } from "@/app/lib/utils";
import {
  BookingSummary,
  BookingCalendar,
  CollectiveSlotPicker,
  MultiSessionCalendar,
  ServiceLocationSelector,
  SelectableOptionCard,
  type BookingSelection,
  type PriceBreakdown,
  type CalendarEntry,
  type SelectedSession,
  type ClientAddress,
  type GuestAddress,
  formatPrice,
  formatDateDisplay,
  calculatePriceWithCommission,
  calculateCollectivePrice,
  isGardeService,
  getFormuleBestPrice,
} from "./booking";

// Types pour les étapes du flux mobile garde
// Étape 1: Formule, Étape 2: Animaux, Étape 3: Lieu, Étape 4: Dates, Étape 5: Options, Final: Summary
type MobileBookingStep = "formule" | "animals" | "location" | "dates" | "options" | "summary";

interface UserAnimal {
  id: string;
  name: string;
  type: string;
  breed?: string;
  profilePhoto?: string;
}

interface AnnouncerMobileCTAProps {
  services: ServiceData[];
  selectedServiceId?: string | null;
  commissionRate?: number;
  vatRate?: number;
  stripeFeeRate?: number;
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
  // Créneaux collectifs
  selectedSlotIds?: string[];
  onSlotsSelected?: (slotIds: string[]) => void;
  animalCount?: number;
  onAnimalCountChange?: (count: number) => void;
  selectedAnimalType?: string;
  // Séances individuelles multi-sessions
  selectedSessions?: SelectedSession[];
  onSessionsChange?: (sessions: SelectedSession[]) => void;
  // Props pour sélection d'animaux (garde)
  isLoggedIn?: boolean;
  userAnimals?: UserAnimal[];
  selectedAnimalIds?: string[];
  onAnimalToggle?: (animalId: string, animalType: string) => void;
  maxSelectableAnimals?: number;
  // Props pour le lieu
  onLocationSelect?: (location: "announcer_home" | "client_home") => void;
  announcerFirstName?: string;
  announcerCity?: string;
  // Props pour les options
  onOptionToggle?: (optionId: string) => void;
  selectedOptionIds?: string[];
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
  vatRate = 20,
  stripeFeeRate = 3,
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
  // Créneaux collectifs
  selectedSlotIds = [],
  onSlotsSelected,
  animalCount = 1,
  onAnimalCountChange,
  selectedAnimalType = "chien",
  // Séances individuelles multi-sessions
  selectedSessions = [],
  onSessionsChange,
  // Props pour sélection d'animaux (garde)
  isLoggedIn = false,
  userAnimals = [],
  selectedAnimalIds = [],
  onAnimalToggle,
  maxSelectableAnimals = 1,
  // Props pour le lieu
  onLocationSelect,
  announcerFirstName,
  announcerCity,
  // Props pour les options
  onOptionToggle,
  selectedOptionIds = [],
}: AnnouncerMobileCTAProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isCalendarSheetOpen, setIsCalendarSheetOpen] = useState(false);
  const [prevVariantId, setPrevVariantId] = useState<string | null>(null);

  // État pour le flux par étapes (services garde)
  const [mobileStep, setMobileStep] = useState<MobileBookingStep>("formule");
  const [isStepSheetOpen, setIsStepSheetOpen] = useState(false);

  // Determine if duration-based blocking is enabled
  const enableDurationBasedBlocking = Boolean(bookingService?.enableDurationBasedBlocking && bookingVariant?.duration);
  const variantDuration = bookingVariant?.duration || 60;

  // Déterminer si la formule sélectionnée est collective
  const isCollectiveFormule = bookingVariant?.sessionType === "collective";
  const collectiveNumberOfSessions = bookingVariant?.numberOfSessions || 1;
  const collectiveSessionInterval = bookingVariant?.sessionInterval || 7;
  const collectiveMaxAnimals = bookingVariant?.maxAnimalsPerSession || 5;

  // Déterminer si c'est une formule individuelle multi-séances
  const isMultiSessionIndividual = !isCollectiveFormule &&
    (bookingVariant?.numberOfSessions || 1) > 1;
  const individualNumberOfSessions = bookingVariant?.numberOfSessions || 1;
  const individualSessionInterval = bookingVariant?.sessionInterval || 0;

  // Check if we need time selection for the service (non-range mode services)
  // Pour les formules collectives et multi-séances individuelles, pas besoin de sélection de temps standard
  const needsTimeSelection = bookingService && !isRangeMode && !isCollectiveFormule && !isMultiSessionIndividual;

  // Pour les formules individuelles multi-séances
  const hasAllSessionsSelected = isMultiSessionIndividual
    ? selectedSessions.length >= individualNumberOfSessions
    : true;

  // Determine if booking can proceed: if needs time, must have time selected
  // Pour les formules collectives, vérifier si tous les créneaux sont sélectionnés
  const hasRequiredTimeSelection = !needsTimeSelection || (bookingSelection?.startTime !== null);
  const hasAllSlotsSelected = isCollectiveFormule
    ? selectedSlotIds.length >= collectiveNumberOfSessions
    : true;

  // Find selected service
  const selectedService = selectedServiceId
    ? services.find((s) => s.id === selectedServiceId || s.categorySlug === selectedServiceId)
    : null;

  // Check if booking is in progress (variant selected)
  const hasVariantSelected = Boolean(bookingService && bookingVariant);
  const hasDateSelected = Boolean(bookingSelection?.startDate);
  const hasAnimalsSelected = isLoggedIn ? selectedAnimalIds.length > 0 : true; // Non connectés: pas de sélection requise
  const hasLocationSelected = Boolean(bookingSelection?.serviceLocation);
  const hasOptionsStep = (bookingService?.options?.length ?? 0) > 0;

  // Vérifier si le choix de lieu est nécessaire (si les deux options sont disponibles)
  const needsLocationChoice = bookingService?.serviceLocation === "both";

  // Vérifier si l'adresse est requise et saisie
  const isAddressRequired = bookingSelection?.serviceLocation === "client_home";
  const hasAddress = isAddressRequired
    ? Boolean(bookingSelection?.guestAddress?.address)
    : true;

  // Animaux compatibles avec la formule sélectionnée
  const compatibleUserAnimals = userAnimals.filter((animal) => {
    const acceptedTypes = bookingVariant?.animalTypes || bookingService?.animalTypes || [];
    return acceptedTypes.length === 0 || acceptedTypes.includes(animal.type);
  });

  // Déterminer l'étape actuelle pour le flux garde mobile
  const getCurrentGardeStep = (): MobileBookingStep => {
    if (!hasVariantSelected) return "formule";
    if (isLoggedIn && userAnimals.length > 0 && !hasAnimalsSelected) return "animals";
    // N'afficher l'étape location que si les deux options sont disponibles
    if (needsLocationChoice && !hasLocationSelected) return "location";
    if (!hasDateSelected) return "dates";
    if (hasOptionsStep) return "options";
    return "summary";
  };

  // Auto-open step sheet when a variant is selected for the first time (garde mode)
  useEffect(() => {
    if (bookingVariant && bookingVariant.id.toString() !== prevVariantId) {
      setPrevVariantId(bookingVariant.id.toString());

      // Pour les services garde, ouvrir le sheet d'étapes
      if (isRangeMode) {
        const nextStep = getCurrentGardeStep();
        setMobileStep(nextStep);
        if (nextStep !== "formule") {
          setIsStepSheetOpen(true);
        }
      } else {
        // Pour les autres services, ouvrir le calendrier
        if (!bookingSelection?.startDate) {
          setIsCalendarSheetOpen(true);
        }
      }
    }
  }, [bookingVariant, prevVariantId, bookingSelection?.startDate, isRangeMode]);

  // Pour les formules collectives, la réservation est complète quand tous les créneaux sont sélectionnés
  // Pour les formules multi-séances individuelles, quand toutes les séances sont sélectionnées
  const hasFullBooking = isCollectiveFormule
    ? hasVariantSelected && hasAllSlotsSelected && hasAddress
    : isMultiSessionIndividual
      ? hasVariantSelected && hasAllSessionsSelected && hasAddress
      : hasVariantSelected && hasDateSelected && Boolean(priceBreakdown) && hasAddress;

  // Get price to display
  const { price: minPrice, unit: minUnit } = selectedService
    ? getServiceMinPrice(selectedService)
    : getGlobalMinPrice(services);
  const hasPrice = minPrice > 0;

  // Handle direct booking
  const handleBookClick = () => {
    // Flux par étapes pour les services garde
    if (isRangeMode && hasVariantSelected) {
      const currentStep = getCurrentGardeStep();
      setMobileStep(currentStep);
      setIsStepSheetOpen(true);
      return;
    }

    // Cas spécial pour les formules collectives
    if (isCollectiveFormule && hasVariantSelected) {
      if (hasAllSlotsSelected) {
        // Tous les créneaux sont sélectionnés - afficher le récap
        setIsSheetOpen(true);
      } else {
        // Pas assez de créneaux - ouvrir le sheet de sélection
        setIsCalendarSheetOpen(true);
      }
      return;
    }

    // Cas spécial pour les formules individuelles multi-séances
    if (isMultiSessionIndividual && hasVariantSelected) {
      if (hasAllSessionsSelected) {
        // Toutes les séances sont sélectionnées - afficher le récap
        setIsSheetOpen(true);
      } else {
        // Pas assez de séances - ouvrir le calendrier multi-séances
        setIsCalendarSheetOpen(true);
      }
      return;
    }

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

  // Gérer la navigation entre les étapes du flux garde
  const handleNextStep = () => {
    switch (mobileStep) {
      case "animals":
        if (needsLocationChoice) {
          setMobileStep("location");
        } else {
          setMobileStep("dates");
        }
        break;
      case "location":
        setMobileStep("dates");
        break;
      case "dates":
        if (hasOptionsStep) {
          setMobileStep("options");
        } else {
          setMobileStep("summary");
        }
        break;
      case "options":
        setMobileStep("summary");
        break;
      case "summary":
        setIsStepSheetOpen(false);
        break;
    }
  };

  const handlePrevStep = () => {
    switch (mobileStep) {
      case "animals":
        setIsStepSheetOpen(false);
        break;
      case "location":
        if (isLoggedIn && userAnimals.length > 0) {
          setMobileStep("animals");
        } else {
          setIsStepSheetOpen(false);
        }
        break;
      case "dates":
        if (needsLocationChoice) {
          setMobileStep("location");
        } else if (isLoggedIn && userAnimals.length > 0) {
          setMobileStep("animals");
        } else {
          setIsStepSheetOpen(false);
        }
        break;
      case "options":
        setMobileStep("dates");
        break;
      case "summary":
        if (hasOptionsStep) {
          setMobileStep("options");
        } else {
          setMobileStep("dates");
        }
        break;
    }
  };

  // Vérifier si on peut passer à l'étape suivante
  const canProceedToNextStep = (): boolean => {
    switch (mobileStep) {
      case "animals":
        return hasAnimalsSelected;
      case "location":
        return hasLocationSelected;
      case "dates":
        return hasDateSelected;
      case "options":
        return true; // Options sont optionnelles
      case "summary":
        return Boolean(hasFullBooking);
      default:
        return false;
    }
  };

  // Texte du bouton selon l'étape
  const getStepButtonText = (): string => {
    switch (mobileStep) {
      case "animals":
        return hasAnimalsSelected ? "Continuer" : "Sélectionnez vos animaux";
      case "location":
        return hasLocationSelected ? "Continuer" : "Choisissez le lieu";
      case "dates":
        return hasDateSelected ? "Continuer" : "Sélectionnez les dates";
      case "options":
        return selectedOptionIds.length > 0 ? "Continuer" : "Passer cette étape";
      case "summary":
        return "Voir le récap";
      default:
        return "Continuer";
    }
  };

  // Handle confirm from calendar sheet
  const handleCalendarConfirm = () => {
    // Pour les formules collectives, confirmer si tous les créneaux sont sélectionnés
    if (isCollectiveFormule) {
      if (hasAllSlotsSelected) {
        setIsCalendarSheetOpen(false);
      }
      return;
    }

    // Pour les formules individuelles multi-séances
    if (isMultiSessionIndividual) {
      if (hasAllSessionsSelected) {
        setIsCalendarSheetOpen(false);
      }
      return;
    }

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
    // Collective formula with all slots selected: show total price
    if (isCollectiveFormule && hasAllSlotsSelected && bookingVariant) {
      const collectiveTotal = calculateCollectivePrice(
        bookingVariant.price,
        animalCount,
        commissionRate,
        collectiveNumberOfSessions,
        bookingVariant.unit || "hour",
        bookingVariant.duration || 60
      );

      return (
        <button
          onClick={() => setIsCalendarSheetOpen(true)}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-medium text-gray-700 truncate max-w-[100px]">
              {bookingVariant.name}
            </span>
            <span className="text-primary underline underline-offset-2">
              {collectiveNumberOfSessions} séance{collectiveNumberOfSessions > 1 ? "s" : ""}
            </span>
            {animalCount > 1 && (
              <>
                <span className="text-gray-300">•</span>
                <span>{animalCount} animaux</span>
              </>
            )}
          </div>
          <p className="text-xl font-bold text-gray-900">
            {formatPrice(collectiveTotal.total)}€
            <span className="text-sm font-normal text-gray-500 ml-1">total</span>
          </p>
        </button>
      );
    }

    // Full booking: show total with details - tappable to modify
    if (hasFullBooking && priceBreakdown) {
      // Calculer le total correct avec le nombre d'animaux, TVA et frais Stripe
      const effectiveAnimalCount = selectedAnimalIds.length > 0 ? selectedAnimalIds.length : animalCount;
      const baseWithAnimals = priceBreakdown.baseAmount * effectiveAnimalCount;
      const nightsWithAnimals = (priceBreakdown.nightsAmount || 0) * effectiveAnimalCount;
      const optionsAmount = priceBreakdown.optionsAmount || 0;
      const subtotalHT = baseWithAnimals + nightsWithAnimals + optionsAmount;
      const commission = Math.round(subtotalHT * commissionRate / 100);
      const vatOnCommission = Math.round(commission * vatRate / 100);
      const stripeFee = Math.round(subtotalHT * stripeFeeRate / 100);
      const totalTTC = subtotalHT + commission + vatOnCommission + stripeFee;

      return (
        <button
          onClick={() => setIsCalendarSheetOpen(true)}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-medium text-gray-700 truncate max-w-[100px]">
              {bookingVariant!.name}
            </span>
            {effectiveAnimalCount > 1 && (
              <>
                <span className="text-gray-300">•</span>
                <span>{effectiveAnimalCount} animaux</span>
              </>
            )}
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
          </div>
          <p className="text-xl font-bold text-gray-900">
            {formatPrice(totalTTC)}€
            <span className="text-sm font-normal text-gray-500 ml-1">total</span>
          </p>
        </button>
      );
    }

    // Collective formula selected but not all slots: show pack price (not hourly)
    if (isCollectiveFormule && hasVariantSelected && bookingVariant && !hasAllSlotsSelected) {
      const collectiveTotal = calculateCollectivePrice(
        bookingVariant.price,
        animalCount,
        commissionRate,
        collectiveNumberOfSessions,
        bookingVariant.unit || "hour",
        bookingVariant.duration || 60
      );

      return (
        <button
          onClick={() => setIsCalendarSheetOpen(true)}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="truncate max-w-[100px]">
              {bookingService?.categoryIcon} {bookingVariant.name}
            </span>
            <span className="text-primary underline underline-offset-2">
              {selectedSlotIds.length}/{collectiveNumberOfSessions} séances
            </span>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {formatPrice(collectiveTotal.total)}€
            <span className="text-sm font-normal text-gray-500 ml-1">total</span>
          </p>
        </button>
      );
    }

    // Multi-session individual formula with all sessions selected: show total price
    if (isMultiSessionIndividual && hasAllSessionsSelected && bookingVariant) {
      const isGarde = bookingService ? isGardeService(bookingService) : false;
      const { price: variantPrice, unit: variantUnit } = getFormuleBestPrice(bookingVariant, isGarde);
      const totalPrice = calculatePriceWithCommission(variantPrice * individualNumberOfSessions, commissionRate);

      return (
        <button
          onClick={() => setIsCalendarSheetOpen(true)}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-medium text-gray-700 truncate max-w-[100px]">
              {bookingVariant.name}
            </span>
            <span className="text-primary underline underline-offset-2">
              {individualNumberOfSessions} séance{individualNumberOfSessions > 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {formatPrice(totalPrice)}€
            <span className="text-sm font-normal text-gray-500 ml-1">total</span>
          </p>
        </button>
      );
    }

    // Multi-session individual formula selected but not all sessions: show progress
    if (isMultiSessionIndividual && hasVariantSelected && bookingVariant && !hasAllSessionsSelected) {
      const isGarde = bookingService ? isGardeService(bookingService) : false;
      const { price: variantPrice } = getFormuleBestPrice(bookingVariant, isGarde);
      const totalPrice = calculatePriceWithCommission(variantPrice * individualNumberOfSessions, commissionRate);

      return (
        <button
          onClick={() => setIsCalendarSheetOpen(true)}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="truncate max-w-[100px]">
              {bookingService?.categoryIcon} {bookingVariant.name}
            </span>
            <span className="text-primary underline underline-offset-2">
              {selectedSessions.length}/{individualNumberOfSessions} séances
            </span>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {formatPrice(totalPrice)}€
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
    // Flux par étapes pour les services garde
    if (isRangeMode && hasVariantSelected) {
      const currentStep = getCurrentGardeStep();
      switch (currentStep) {
        case "animals":
          return (
            <>
              <PawPrint className="w-4 h-4" />
              Choisir vos animaux
            </>
          );
        case "location":
          return (
            <>
              <MapPin className="w-4 h-4" />
              Choisir le lieu
            </>
          );
        case "dates":
          return (
            <>
              <Calendar className="w-4 h-4" />
              Choisir les dates
            </>
          );
        case "options":
          return (
            <>
              <Plus className="w-4 h-4" />
              Options
            </>
          );
        case "summary":
          return (
            <>
              <ShoppingCart className="w-4 h-4" />
              Voir le récap
            </>
          );
      }
    }

    // Cas spécial pour les formules collectives
    if (isCollectiveFormule && hasVariantSelected) {
      if (hasAllSlotsSelected) {
        return (
          <>
            <ShoppingCart className="w-4 h-4" />
            Voir le récap
          </>
        );
      }
      return (
        <>
          <Calendar className="w-4 h-4" />
          Choisir les créneaux
        </>
      );
    }

    // Cas spécial pour les formules individuelles multi-séances
    if (isMultiSessionIndividual && hasVariantSelected) {
      if (hasAllSessionsSelected) {
        return (
          <>
            <ShoppingCart className="w-4 h-4" />
            Voir le récap
          </>
        );
      }
      return (
        <>
          <Calendar className="w-4 h-4" />
          Choisir les séances
        </>
      );
    }

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
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-40 p-4">
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
                          vatRate={vatRate}
                          stripeFeeRate={stripeFeeRate}
                          isRangeMode={isRangeMode}
                          animalCount={selectedAnimalIds.length > 0 ? selectedAnimalIds.length : animalCount}
                          announcerFirstName={announcerFirstName}
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
            {isCalendarSheetOpen && (
              // Pour les formules collectives, multi-séances individuelles ou calendrier normal
              (isCollectiveFormule && bookingVariant && onSlotsSelected) ||
              (isMultiSessionIndividual && bookingVariant && onSessionsChange && calendarMonth && onMonthChange) ||
              (calendarMonth && onDateSelect && onEndDateSelect && onTimeSelect && onEndTimeSelect && onOvernightChange && onMonthChange)
            ) && (
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
                        {isCollectiveFormule
                          ? "Choisissez vos créneaux"
                          : isMultiSessionIndividual
                          ? "Choisissez vos séances"
                          : isRangeMode
                          ? "Choisissez vos dates"
                          : "Choisissez votre créneau"}
                      </h3>
                      {bookingVariant && (
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <span>{bookingService?.categoryIcon}</span>
                          {bookingVariant.name}
                          {isCollectiveFormule && (
                            <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                              {selectedSlotIds.length}/{collectiveNumberOfSessions} séances
                            </span>
                          )}
                          {isMultiSessionIndividual && (
                            <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                              {selectedSessions.length}/{individualNumberOfSessions} séances
                            </span>
                          )}
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

                  {/* Sheet Content */}
                  <div className="overflow-y-auto flex-1 p-4">
                    {isCollectiveFormule && bookingVariant && onSlotsSelected ? (
                      // Afficher le CollectiveSlotPicker pour les formules collectives
                      <div className="space-y-4">
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
                          variantId={bookingVariant.id as string}
                          numberOfSessions={collectiveNumberOfSessions}
                          sessionInterval={collectiveSessionInterval}
                          animalCount={animalCount}
                          animalType={selectedAnimalType}
                          onSlotsSelected={onSlotsSelected}
                          selectedSlotIds={selectedSlotIds}
                        />
                      </div>
                    ) : isMultiSessionIndividual && bookingVariant && onSessionsChange && calendarMonth && onMonthChange ? (
                      // Afficher le MultiSessionCalendar pour les formules individuelles multi-séances
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
                    ) : (
                      // Afficher le calendrier normal
                      calendarMonth && onDateSelect && onEndDateSelect && onTimeSelect && onEndTimeSelect && onOvernightChange && onMonthChange && (
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
                      )
                    )}
                  </div>

                  {/* Confirm button */}
                  <div className="p-4 border-t border-gray-100 flex-shrink-0">
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCalendarConfirm}
                      disabled={
                        isCollectiveFormule
                          ? !hasAllSlotsSelected
                          : isMultiSessionIndividual
                            ? !hasAllSessionsSelected
                            : !bookingSelection?.startDate || !hasRequiredTimeSelection
                      }
                      className={cn(
                        "w-full py-3.5 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors",
                        (isCollectiveFormule ? hasAllSlotsSelected : isMultiSessionIndividual ? hasAllSessionsSelected : (bookingSelection?.startDate && hasRequiredTimeSelection))
                          ? "bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg shadow-primary/25"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      )}
                    >
                      {isCollectiveFormule ? (
                        !hasAllSlotsSelected ? (
                          `Sélectionnez ${collectiveNumberOfSessions - selectedSlotIds.length} créneau(x)`
                        ) : (
                          <>
                            Confirmer
                            <Check className="w-4 h-4" />
                          </>
                        )
                      ) : isMultiSessionIndividual ? (
                        !hasAllSessionsSelected ? (
                          `Sélectionnez ${individualNumberOfSessions - selectedSessions.length} séance(s)`
                        ) : (
                          <>
                            Confirmer
                            <Check className="w-4 h-4" />
                          </>
                        )
                      ) : !bookingSelection?.startDate ? (
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

      {/* Step Sheet pour services garde (Portal) */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isStepSheetOpen && isRangeMode && hasVariantSelected && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsStepSheetOpen(false)}
                  className="fixed inset-0 bg-black/50 z-[9998] md:hidden"
                />

                {/* Step Sheet */}
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-[9999] md:hidden max-h-[90vh] flex flex-col"
                >
                  {/* Sheet Header avec navigation */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handlePrevStep}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-500" />
                      </button>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {mobileStep === "animals" && "Vos animaux"}
                          {mobileStep === "location" && "Lieu de garde"}
                          {mobileStep === "dates" && "Dates de garde"}
                          {mobileStep === "options" && "Options supplémentaires"}
                          {mobileStep === "summary" && "Récapitulatif"}
                        </h3>
                        {bookingVariant && (
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <span>{bookingService?.categoryIcon}</span>
                            {bookingVariant.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setIsStepSheetOpen(false)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  {/* Indicateur d'étapes */}
                  <div className="flex items-center gap-1 px-4 py-3 border-b border-gray-50">
                    {(() => {
                      // Construire la liste des étapes à afficher
                      const steps: MobileBookingStep[] = [];
                      if (isLoggedIn && userAnimals.length > 0) steps.push("animals");
                      steps.push("location", "dates");
                      if (hasOptionsStep) steps.push("options");
                      steps.push("summary");

                      let stepNumber = 1;
                      return steps.map((step, index) => {
                        const isActive = mobileStep === step;
                        const stepIndex = steps.indexOf(mobileStep);
                        const isPast = index < stepIndex;

                        const currentNumber = stepNumber++;

                        return (
                          <div key={step} className="flex items-center gap-1 flex-1">
                            <div className={cn(
                              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors flex-shrink-0",
                              isActive ? "bg-primary text-white" :
                              isPast ? "bg-secondary/20 text-secondary" :
                              "bg-gray-100 text-gray-400"
                            )}>
                              {isPast ? <Check className="w-3 h-3" /> : currentNumber}
                            </div>
                            {index < steps.length - 1 && <div className={cn(
                              "flex-1 h-0.5 transition-colors",
                              isPast ? "bg-secondary/20" : "bg-gray-100"
                            )} />}
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Sheet Content */}
                  <div className="overflow-y-auto flex-1 p-4">
                    {/* Étape Animaux */}
                    {mobileStep === "animals" && isLoggedIn && onAnimalToggle && (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-500">
                          Sélectionnez le ou les animaux pour cette garde.
                        </p>

                        {compatibleUserAnimals.length > 0 ? (
                          <div className="space-y-2">
                            {compatibleUserAnimals.map((animal) => {
                              const isSelected = selectedAnimalIds.includes(animal.id);
                              return (
                                <button
                                  key={animal.id}
                                  type="button"
                                  onClick={() => onAnimalToggle(animal.id, animal.type)}
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
                                  <div className={cn(
                                    "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
                                    isSelected
                                      ? "bg-primary border-primary"
                                      : "border-gray-300 bg-white"
                                  )}>
                                    {isSelected && <Check className="w-4 h-4 text-white" />}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-4 bg-amber-50 rounded-xl text-amber-700 text-sm">
                            Aucun de vos animaux n'est compatible avec cette formule.
                          </div>
                        )}

                        <p className="text-xs text-gray-400">
                          {selectedAnimalIds.length} animal{selectedAnimalIds.length > 1 ? "x" : ""} sélectionné{selectedAnimalIds.length > 1 ? "s" : ""}
                        </p>
                      </div>
                    )}

                    {/* Étape Lieu */}
                    {mobileStep === "location" && (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-500">
                          Où souhaitez-vous que la garde ait lieu ?
                        </p>

                        {onLocationSelect && (
                          <ServiceLocationSelector
                            serviceLocation={bookingService?.serviceLocation || "both"}
                            selectedLocation={bookingSelection?.serviceLocation ?? null}
                            onSelect={onLocationSelect}
                            isRangeMode={isRangeMode}
                            announcerFirstName={announcerFirstName}
                          />
                        )}

                        {/* Afficher la ville si chez l'annonceur */}
                        {bookingSelection?.serviceLocation === "announcer_home" && announcerCity && (
                          <p className="text-xs text-gray-500 italic px-1">
                            L'adresse exacte vous sera communiquée après acceptation.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Étape Dates */}
                    {mobileStep === "dates" && (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-500">
                          Sélectionnez les dates de la garde.
                        </p>

                        {/* Calendrier */}
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
                        )}
                      </div>
                    )}

                    {/* Étape Options */}
                    {mobileStep === "options" && bookingService && (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-500">
                          Personnalisez votre réservation avec des options supplémentaires.
                        </p>

                        {bookingService.options.length > 0 ? (
                          <div className="space-y-3">
                            {bookingService.options.map((option, index) => (
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
                    )}

                    {/* Étape Summary */}
                    {mobileStep === "summary" && bookingService && bookingVariant && bookingSelection && (
                      <div className="space-y-4">
                        <BookingSummary
                          service={bookingService}
                          variant={bookingVariant}
                          selection={bookingSelection}
                          priceBreakdown={priceBreakdown ?? null}
                          commissionRate={commissionRate}
                          vatRate={vatRate}
                          stripeFeeRate={stripeFeeRate}
                          isRangeMode={isRangeMode}
                          animalCount={selectedAnimalIds.length > 0 ? selectedAnimalIds.length : animalCount}
                          announcerFirstName={announcerFirstName}
                          compact
                        />
                      </div>
                    )}
                  </div>

                  {/* Bouton de navigation */}
                  <div className="p-4 border-t border-gray-100 flex-shrink-0 space-y-3">
                    {mobileStep === "summary" ? (
                      <>
                        <motion.button
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setIsStepSheetOpen(false);
                            onBook?.();
                          }}
                          className="w-full py-3.5 bg-gradient-to-r from-primary to-primary/90 text-white font-semibold rounded-xl shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Vérifier la réservation
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setIsStepSheetOpen(false);
                            onFinalize?.();
                          }}
                          className="w-full py-3.5 border-2 border-secondary bg-secondary/5 text-secondary font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-secondary/10 transition-colors"
                        >
                          <CreditCard className="w-4 h-4" />
                          Finaliser la réservation
                          <ArrowRight className="w-4 h-4" />
                        </motion.button>
                      </>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={handleNextStep}
                        disabled={!canProceedToNextStep()}
                        className={cn(
                          "w-full py-3.5 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors",
                          canProceedToNextStep()
                            ? "bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg shadow-primary/25"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        )}
                      >
                        {getStepButtonText()}
                        {canProceedToNextStep() && <ArrowRight className="w-4 h-4" />}
                      </motion.button>
                    )}
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
