"use client";

import { useState, useMemo, use, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/app/lib/utils";

// Import factorized components
import {
  StepIndicator,
  FormulaStep,
  DateTimeStep,
  OptionsStep,
  SummaryStep,
  GuestDogVerification,
  type ServiceDetail,
  type ServiceVariant,
  type ServiceOption,
  type GuestDogData,
} from "./components";

// Types
interface GuestAddressData {
  address: string;
  city: string | null;
  postalCode: string | null;
  coordinates: { lat: number; lng: number } | null;
}

// Type pour les séances multi-sessions
interface SelectedSession {
  date: string;
  startTime: string;
  endTime: string;
}

// Type pour les créneaux collectifs sélectionnés
interface CollectiveSlotInfo {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  availableSpots: number;
}

interface BookingData {
  serviceId: string;
  variantId: string;
  selectedDate: string | null;
  selectedEndDate: string | null;
  selectedTime: string | null;
  selectedEndTime: string | null;
  includeOvernightStay: boolean;
  selectedOptionIds: string[];
  serviceLocation: "announcer_home" | "client_home" | null;
  guestAddress: GuestAddressData | null;
  // Support formules multi-séances
  selectedSessions: SelectedSession[];
  // Support formules collectives
  selectedSlotIds: string[];
  selectedCollectiveSlots: CollectiveSlotInfo[];
  animalCount: number;
  selectedAnimalType: string;
  // Animaux sélectionnés par l'utilisateur
  selectedAnimalIds: string[];
  // Adresse sélectionnée pour la prestation
  selectedAddressId: string | null;
  selectedAddressData: {
    address: string;
    city?: string;
    postalCode?: string;
    coordinates?: { lat: number; lng: number };
  } | null;
}

// Step labels
const STEP_LABELS = [
  "Choix de la prestation",
  "Dates et horaires",
  "Options",
  "Récapitulatif",
];

// Helper: Parse time to minutes
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// Helper: Calculate hours between two times
function calculateHoursBetween(startTime: string, endTime: string): number {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  const diff = endMinutes - startMinutes;
  return Math.max(0, diff / 60);
}

// Helper: Calculate days between two dates
function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Smart price calculation result interface
export interface PriceCalculationResult {
  firstDayAmount: number;
  firstDayHours: number;
  firstDayIsFullDay: boolean;
  firstDayIsHalfDay?: boolean;
  fullDays: number;
  fullDaysAmount: number;
  lastDayAmount: number;
  lastDayHours: number;
  lastDayIsFullDay: boolean;
  lastDayIsHalfDay?: boolean;
  nightsAmount: number;
  nights: number;
  optionsAmount: number;
  totalAmount: number;
  // For display
  hourlyRate: number;
  dailyRate: number;
  nightlyRate: number;
  halfDailyRate?: number;
  billingUnit?: "hour" | "half_day" | "day" | "fixed";
}

// Calculate smart pricing with partial day support
function calculateSmartPrice(params: {
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  includeOvernightStay: boolean;
  dayStartTime: string;
  dayEndTime: string;
  workdayHours: number;
  halfDayHours?: number;
  pricing: {
    hourly?: number;
    halfDaily?: number;
    daily?: number;
    nightly?: number;
  };
  optionsTotal: number;
  // For duration-based blocking: use fixed price instead of hourly calculation
  fixedServicePrice?: number;
  serviceDurationMinutes?: number;
  // Client billing mode from category settings
  clientBillingMode?: "exact_hourly" | "round_half_day" | "round_full_day";
}): PriceCalculationResult {
  const {
    startDate,
    endDate,
    startTime,
    endTime,
    includeOvernightStay,
    dayStartTime,
    dayEndTime,
    workdayHours,
    halfDayHours: customHalfDayHours,
    pricing,
    optionsTotal,
    fixedServicePrice,
    serviceDurationMinutes,
    clientBillingMode,
  } = params;

  // Calculate half-day hours (default to workdayHours / 2)
  const halfDayHours = customHalfDayHours || workdayHours / 2;

  // Determine rates (derive missing rates from available ones)
  const hourlyRate = pricing.hourly || (pricing.daily ? Math.round(pricing.daily / workdayHours) : 0);
  const halfDailyRate = pricing.halfDaily || (pricing.daily ? Math.round(pricing.daily / 2) : (hourlyRate ? hourlyRate * halfDayHours : 0));
  const dailyRate = pricing.daily || (hourlyRate ? hourlyRate * workdayHours : 0);
  const nightlyRate = pricing.nightly || 0;

  // Helper: Calculate amount for a partial day based on billing mode
  const calculatePartialDayAmount = (hours: number): { amount: number; isFullDay: boolean; isHalfDay: boolean } => {
    // Si le nombre d'heures dépasse la journée de travail, c'est une journée complète
    if (hours >= workdayHours) {
      return { amount: dailyRate, isFullDay: true, isHalfDay: false };
    }

    // Mode arrondi à la demi-journée
    if (clientBillingMode === "round_half_day") {
      if (hours <= halfDayHours) {
        return { amount: halfDailyRate, isFullDay: false, isHalfDay: true };
      }
      return { amount: dailyRate, isFullDay: true, isHalfDay: false };
    }

    // Mode arrondi à la journée
    if (clientBillingMode === "round_full_day") {
      return { amount: dailyRate, isFullDay: true, isHalfDay: false };
    }

    // Mode horaire exact (par défaut)
    if (hourlyRate > 0) {
      const hourlyAmount = Math.round(hourlyRate * hours);
      const cappedAmount = dailyRate > 0 ? Math.min(hourlyAmount, dailyRate) : hourlyAmount;
      return { amount: cappedAmount, isFullDay: cappedAmount >= dailyRate, isHalfDay: false };
    }

    return { amount: dailyRate, isFullDay: true, isHalfDay: false };
  };

  // Calculate total days
  const effectiveEndDate = endDate || startDate;
  const totalDays = daysBetween(startDate, effectiveEndDate) + 1;

  // Single day booking
  if (totalDays === 1) {
    let firstDayHours: number;
    let firstDayAmount: number;
    let firstDayIsFullDay = false;
    let firstDayIsHalfDay = false;

    // Duration-based blocking: use fixed price
    if (fixedServicePrice !== undefined && serviceDurationMinutes !== undefined) {
      firstDayHours = serviceDurationMinutes / 60;
      firstDayAmount = fixedServicePrice;

      return {
        firstDayAmount,
        firstDayHours,
        firstDayIsFullDay: false,
        firstDayIsHalfDay: false,
        fullDays: 0,
        fullDaysAmount: 0,
        lastDayAmount: 0,
        lastDayHours: 0,
        lastDayIsFullDay: false,
        lastDayIsHalfDay: false,
        nightsAmount: 0,
        nights: 0,
        optionsAmount: optionsTotal,
        totalAmount: firstDayAmount + optionsTotal,
        hourlyRate: 0,
        dailyRate: 0,
        nightlyRate,
        halfDailyRate: 0,
        billingUnit: "fixed",
      };
    }

    if (startTime && endTime) {
      // Specific time range
      firstDayHours = calculateHoursBetween(startTime, endTime);
      const result = calculatePartialDayAmount(firstDayHours);
      firstDayAmount = result.amount;
      firstDayIsFullDay = result.isFullDay;
      firstDayIsHalfDay = result.isHalfDay;
    } else {
      // Full day
      firstDayHours = workdayHours;
      firstDayAmount = dailyRate || (hourlyRate * workdayHours);
      firstDayIsFullDay = true;
    }

    // Determine billing unit
    let billingUnit: "hour" | "half_day" | "day" | "fixed" = "hour";
    if (firstDayIsFullDay) billingUnit = "day";
    else if (firstDayIsHalfDay) billingUnit = "half_day";

    return {
      firstDayAmount,
      firstDayHours,
      firstDayIsFullDay,
      firstDayIsHalfDay,
      fullDays: 0,
      fullDaysAmount: 0,
      lastDayAmount: 0,
      lastDayHours: 0,
      lastDayIsFullDay: false,
      lastDayIsHalfDay: false,
      nightsAmount: 0,
      nights: 0,
      optionsAmount: optionsTotal,
      totalAmount: firstDayAmount + optionsTotal,
      hourlyRate,
      dailyRate,
      nightlyRate,
      halfDailyRate,
      billingUnit,
    };
  }

  // Multi-day booking
  // First day calculation
  const effectiveStartTime = startTime || dayStartTime;
  const firstDayEndTime = dayEndTime;
  const firstDayHours = calculateHoursBetween(effectiveStartTime, firstDayEndTime);

  const firstDayResult = calculatePartialDayAmount(firstDayHours);
  const firstDayAmount = firstDayResult.amount;
  const firstDayIsFullDay = firstDayResult.isFullDay;
  const firstDayIsHalfDay = firstDayResult.isHalfDay;

  // Last day calculation
  const lastDayStartTime = dayStartTime;
  const effectiveEndTime = endTime || dayEndTime;
  const lastDayHours = calculateHoursBetween(lastDayStartTime, effectiveEndTime);

  const lastDayResult = calculatePartialDayAmount(lastDayHours);
  const lastDayAmount = lastDayResult.amount;
  const lastDayIsFullDay = lastDayResult.isFullDay;
  const lastDayIsHalfDay = lastDayResult.isHalfDay;

  // Full days in between (excluding first and last)
  const fullDays = Math.max(0, totalDays - 2);
  const fullDaysAmount = fullDays * dailyRate;

  // Nights
  const nights = includeOvernightStay ? totalDays - 1 : 0;
  const nightsAmount = nights * nightlyRate;

  const totalAmount = firstDayAmount + fullDaysAmount + lastDayAmount + nightsAmount + optionsTotal;

  // Determine primary billing unit for display
  let billingUnit: "hour" | "half_day" | "day" | "fixed" = "day";
  if (!firstDayIsFullDay && !firstDayIsHalfDay && !lastDayIsFullDay && !lastDayIsHalfDay) {
    billingUnit = "hour";
  } else if ((firstDayIsHalfDay || lastDayIsHalfDay) && fullDays === 0) {
    billingUnit = "half_day";
  }

  return {
    firstDayAmount,
    firstDayHours,
    firstDayIsFullDay,
    firstDayIsHalfDay,
    fullDays,
    fullDaysAmount,
    lastDayAmount,
    lastDayHours,
    lastDayIsFullDay,
    lastDayIsHalfDay,
    nightsAmount,
    nights,
    optionsAmount: optionsTotal,
    totalAmount,
    hourlyRate,
    dailyRate,
    nightlyRate,
    halfDailyRate,
    billingUnit,
  };
}

// Main Page Component
export default function ReserverPage({
  params,
}: {
  params: Promise<{ announcerId: string }>;
}) {
  const { announcerId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get URL params
  const preSelectedServiceId = searchParams.get("service");
  const preSelectedVariantId = searchParams.get("variant");
  const preSelectedDate = searchParams.get("date");
  const preSelectedEndDate = searchParams.get("endDate");
  const preSelectedStartTime = searchParams.get("startTime");
  const preSelectedEndTime = searchParams.get("endTime");
  const preSelectedOptions = searchParams.get("options");
  const preSelectedOvernight = searchParams.get("overnight");
  const preSelectedLocation = searchParams.get("location") as "announcer_home" | "client_home" | null;

  // Guest address params (for non-logged in users)
  const guestAddressParam = searchParams.get("guestAddress");
  const guestCityParam = searchParams.get("guestCity");
  const guestPostalCodeParam = searchParams.get("guestPostalCode");
  const guestLatParam = searchParams.get("guestLat");
  const guestLngParam = searchParams.get("guestLng");

  // Direct finalization param (skip to step 4)
  const shouldFinalize = searchParams.get("finalize") === "true";

  // Edit mode param (from /reservation page, allows navigation between steps)
  const isEditMode = searchParams.get("edit") === "true";
  const preSelectedStep = parseInt(searchParams.get("step") || "0", 10);

  // Address param
  const preSelectedAddressId = searchParams.get("addressId");

  // Créneaux collectifs et multi-sessions params
  const preSelectedSlotIds = searchParams.get("slotIds")?.split(",").filter(Boolean) || [];
  const preSelectedAnimalCount = parseInt(searchParams.get("animalCount") || "1", 10);
  const preSelectedAnimalType = searchParams.get("animalType") || "chien";
  const preSelectedSessions: SelectedSession[] = (() => {
    const sessionsParam = searchParams.get("sessions");
    if (sessionsParam) {
      try {
        return JSON.parse(sessionsParam) as SelectedSession[];
      } catch {
        return [];
      }
    }
    return [];
  })();
  // Animaux sélectionnés (IDs)
  const preSelectedAnimalIds = searchParams.get("animalIds")?.split(",").filter(Boolean) || [];

  // Données pré-remplies de l'animal invité (depuis l'étape 2 de la page annonceur)
  const preGuestAnimalType = searchParams.get("guestAnimalType");
  const preGuestAnimalBreed = searchParams.get("guestAnimalBreed");
  const preGuestAnimalMixed = searchParams.get("guestAnimalMixed") === "true";
  const preGuestAnimalPrimaryBreed = searchParams.get("guestAnimalPrimaryBreed");
  const preGuestAnimalSecondaryBreed = searchParams.get("guestAnimalSecondaryBreed");

  // Build guest address object if present
  const preSelectedGuestAddress = guestAddressParam ? {
    address: guestAddressParam,
    city: guestCityParam,
    postalCode: guestPostalCodeParam,
    coordinates: guestLatParam && guestLngParam ? {
      lat: parseFloat(guestLatParam),
      lng: parseFloat(guestLngParam),
    } : null,
  } : null;

  // Parse pre-selected options (comma-separated IDs)
  const preSelectedOptionIds = preSelectedOptions ? preSelectedOptions.split(",") : [];

  // Determine initial step
  // If edit mode with step param, use that step
  // If finalize=true and all required data is present, go directly to step 4 (summary)
  const getInitialStep = () => {
    // Si on revient de /reservation en mode édition avec un step spécifique
    if (isEditMode && preSelectedStep >= 1 && preSelectedStep <= 4) {
      return preSelectedStep;
    }
    if (shouldFinalize && preSelectedServiceId && preSelectedVariantId) {
      // Pour les formules collectives, les slotIds suffisent
      if (preSelectedSlotIds.length > 0) {
        return 4;
      }
      // Pour les formules multi-séances, les sessions suffisent
      if (preSelectedSessions.length > 0) {
        return 4;
      }
      // Pour les formules uni-séance, date et heure sont requises
      if (preSelectedDate && preSelectedStartTime) {
        return 4;
      }
    }
    return 1;
  };

  // State
  const [step, setStep] = useState(getInitialStep);
  const [bookingData, setBookingData] = useState<BookingData>({
    serviceId: preSelectedServiceId || "",
    variantId: preSelectedVariantId || "",
    selectedDate: preSelectedDate,
    selectedEndDate: preSelectedEndDate,
    selectedTime: preSelectedStartTime,
    selectedEndTime: preSelectedEndTime,
    includeOvernightStay: preSelectedOvernight === "true",
    selectedOptionIds: preSelectedOptionIds,
    serviceLocation: preSelectedLocation,
    guestAddress: preSelectedGuestAddress,
    // Formules multi-séances
    selectedSessions: preSelectedSessions,
    // Formules collectives
    selectedSlotIds: preSelectedSlotIds,
    selectedCollectiveSlots: [],
    animalCount: preSelectedAnimalCount,
    selectedAnimalType: preSelectedAnimalType,
    // Animaux sélectionnés
    selectedAnimalIds: preSelectedAnimalIds,
    // Adresse sélectionnée
    selectedAddressId: preSelectedAddressId,
    selectedAddressData: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // État pour la vérification du chien (invités)
  const [guestDogData, setGuestDogData] = useState<GuestDogData | null>(null);
  const [guestDogValid, setGuestDogValid] = useState(false);
  const [guestDogError, setGuestDogError] = useState<string | undefined>(undefined);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    return preSelectedDate ? new Date(preSelectedDate) : new Date();
  });
  // Flag pour éviter que l'useEffect ne réinitialise le step après navigation manuelle
  // Initialisé à true si on est en mode édition (retour depuis /reservation)
  const [hasManuallyNavigated, setHasManuallyNavigated] = useState(isEditMode);

  // Effect pour aller directement à l'étape 4 si finalize=true (seulement si pas de navigation manuelle)
  useEffect(() => {
    if (hasManuallyNavigated) return; // Ne pas réinitialiser si l'utilisateur a navigué manuellement

    if (shouldFinalize && preSelectedServiceId && preSelectedVariantId) {
      // Pour les formules collectives, les slotIds suffisent
      if (preSelectedSlotIds.length > 0 || preSelectedSessions.length > 0 || (preSelectedDate && preSelectedStartTime)) {
        setStep(4);
      }
    }
  }, [shouldFinalize, preSelectedServiceId, preSelectedVariantId, preSelectedDate, preSelectedStartTime, preSelectedSlotIds, preSelectedSessions, hasManuallyNavigated]);

  // Queries
  const announcerData = useQuery(api.public.search.getAnnouncerById, {
    announcerId: announcerId as Id<"users">,
  });

  const serviceDetails = useQuery(api.public.search.getAnnouncerServiceDetails, {
    announcerId: announcerId as Id<"users">,
  });

  const announcerPreferences = useQuery(
    api.public.search.getAnnouncerAvailabilityPreferences,
    { announcerId: announcerId as Id<"users"> }
  );

  // Workday config from admin settings
  const workdayConfig = useQuery(api.admin.config.getWorkdayConfig);
  const workdayHours = workdayConfig?.workdayHours ?? 8;

  // Pricing config (commission, TVA, Stripe fees) based on announcer type
  const pricingConfig = useQuery(
    api.admin.commissions.getPricingConfig,
    announcerData?.statusType
      ? { announcerType: announcerData.statusType }
      : "skip"
  );
  const commissionRate = pricingConfig?.commissionRate ?? 15; // Default 15% for particuliers
  const stripeFeeRate = pricingConfig?.stripeFeeRate ?? 3; // Default 3% Stripe fees
  const vatRate = pricingConfig?.vatRate ?? 20; // Default 20% VAT on commissions

  // Auth token pour les queries utilisateur
  const [authToken, setAuthToken] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setAuthToken(localStorage.getItem("auth_token"));
    }
  }, []);

  // Récupérer les animaux de l'utilisateur connecté
  const userAnimals = useQuery(
    api.animals.getUserAnimals,
    authToken ? { token: authToken } : "skip"
  );

  // Récupérer les détails des créneaux collectifs sélectionnés
  const collectiveSlotsDetails = useQuery(
    api.planning.collectiveSlots.getSlotsByIds,
    bookingData.selectedSlotIds.length > 0
      ? { slotIds: bookingData.selectedSlotIds as Id<"collectiveSlots">[] }
      : "skip"
  );

  // Mettre à jour les détails des créneaux collectifs quand ils sont chargés
  useEffect(() => {
    if (collectiveSlotsDetails && collectiveSlotsDetails.length > 0) {
      setBookingData(prev => ({
        ...prev,
        selectedCollectiveSlots: collectiveSlotsDetails.map((slot: {
          _id: string;
          date: string;
          startTime: string;
          endTime: string;
          availableSpots: number;
        }) => ({
          _id: slot._id,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          availableSpots: slot.availableSpots,
        })),
      }));
    }
  }, [collectiveSlotsDetails]);

  // Selected service and variant (needed before calendar query)
  // Match by id OR by category (slug) since URL may contain either
  const selectedService = serviceDetails?.find(
    (s: ServiceDetail) => s.id === bookingData.serviceId || s.category === bookingData.serviceId
  ) as ServiceDetail | undefined;

  const selectedVariant = selectedService?.variants.find(
    (v: ServiceVariant) => v.id === bookingData.variantId
  ) as ServiceVariant | undefined;

  // Calculer le taux TVA SAP (si conditions remplies)
  const sapVatInfo = useQuery(
    api.sap.eligibility.computeSapVatRate,
    authToken && selectedService
      ? {
          sessionToken: authToken,
          announcerId: announcerId as Id<"users">,
          serviceCategorySlug: selectedService.category,
          serviceId: selectedService.id as Id<"services">,
          variantId: selectedVariant?.id as Id<"serviceVariants"> | undefined,
        }
      : "skip"
  );

  // Calendar availability
  const startOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const endOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);

  // Format dates without toISOString() to avoid timezone issues
  const formatDateLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const availabilityCalendar = useQuery(
    api.public.search.getAnnouncerAvailabilityCalendar,
    bookingData.serviceId && selectedService
      ? {
          announcerId: announcerId as Id<"users">,
          serviceCategory: selectedService.category,
          startDate: formatDateLocal(startOfMonth),
          endDate: formatDateLocal(endOfMonth),
        }
      : "skip"
  );

  // Mutation
  const createPendingBooking = useMutation(api.public.booking.createPendingBooking);

  // Déterminer le type de formule (collective, multi-session, uni-séance)
  // Une formule est collective si sessionType === "collective" OU si des slotIds sont présents dans l'URL
  const isCollectiveFormula = selectedVariant?.sessionType === "collective" || preSelectedSlotIds.length > 0;
  const isMultiSessionIndividual = !isCollectiveFormula && (selectedVariant?.numberOfSessions || 1) > 1;
  const numberOfSessions = selectedVariant?.numberOfSessions || 1;
  const sessionInterval = selectedVariant?.sessionInterval || 0;

  // Determine if range mode (daily/weekly/monthly services)
  // Categories that use daily pricing and allow date range selection
  const dailyCategories = ["garde", "hebergement", "pension", "garde-domicile", "visite"];
  // Categories that use hourly pricing (single date + time slots)
  const hourlyCategories = ["promenade", "transport", "toilettage"];

  // Determine mode based on: category first, then priceUnit, then pricing object
  const isRangeMode = (() => {
    if (!selectedService || !selectedVariant) return false;

    // 1. Check category first (most reliable)
    if (dailyCategories.includes(selectedService.category)) {
      return true;
    }
    if (hourlyCategories.includes(selectedService.category)) {
      return false;
    }

    // 2. Check priceUnit
    if (selectedVariant.priceUnit === "hour" || selectedVariant.priceUnit === "flat") {
      return false;
    }
    if (
      selectedVariant.priceUnit === "day" ||
      selectedVariant.priceUnit === "week" ||
      selectedVariant.priceUnit === "month"
    ) {
      return true;
    }

    // 3. Check pricing object
    if (selectedVariant.pricing?.daily && selectedVariant.pricing.daily > 0) {
      return true;
    }

    // Default: hourly mode
    return false;
  })();

  // Déterminer si la vérification du chien est requise pour les invités
  const requiresDogVerification = useMemo(() => {
    // Seulement pour les invités (non connectés)
    if (authToken) return false;
    // Doit avoir un service et un variant sélectionnés
    if (!selectedService || !selectedVariant) return false;
    // Le service doit accepter les chiens
    const serviceAcceptsDogs = selectedService.animalTypes?.includes("chien");
    if (!serviceAcceptsDogs) return false;
    // Pour les formules collectives, vérifier le type d'animal sélectionné
    if (isCollectiveFormula && bookingData.selectedAnimalType !== "chien") return false;
    // Le variant doit accepter les chiens
    const variantAcceptsDogs = !selectedVariant.animalTypes?.length || selectedVariant.animalTypes.includes("chien");
    return variantAcceptsDogs;
  }, [authToken, selectedService, selectedVariant, isCollectiveFormula, bookingData.selectedAnimalType]);

  // Restrictions du chien depuis le variant (avec fallback vers le service)
  const dogRestrictions = useMemo(() => {
    if (!selectedVariant || !selectedService) {
      return {
        acceptedDogSizes: ["small", "medium", "large"] as ("small" | "medium" | "large")[],
        dogCategoryAcceptance: "none" as "none" | "cat1" | "cat2" | "both",
      };
    }
    // Priorité au variant, sinon au service
    const acceptedDogSizes = (selectedVariant as { acceptedDogSizes?: ("small" | "medium" | "large")[] }).acceptedDogSizes
      || (selectedService as { acceptedDogSizes?: ("small" | "medium" | "large")[] }).acceptedDogSizes
      || ["small", "medium", "large"];
    const dogCategoryAcceptance = (selectedVariant as { dogCategoryAcceptance?: "none" | "cat1" | "cat2" | "both" }).dogCategoryAcceptance
      || (selectedService as { dogCategoryAcceptance?: "none" | "cat1" | "cat2" | "both" }).dogCategoryAcceptance
      || "none";
    return { acceptedDogSizes, dogCategoryAcceptance };
  }, [selectedVariant, selectedService]);

  // Handlers pour la vérification du chien
  const handleGuestDogDataChange = (data: GuestDogData | null) => {
    setGuestDogData(data);
  };

  const handleGuestDogValidationChange = (isValid: boolean, error?: string) => {
    setGuestDogValid(isValid);
    setGuestDogError(error);
  };

  // Calculate days (for display purposes)
  // Pour les formules collectives ou multi-séances, retourner le nombre de séances
  const calculateDays = () => {
    // Formule collective: nombre de créneaux sélectionnés
    if (isCollectiveFormula) {
      return bookingData.selectedSlotIds.length || 1;
    }
    // Formule multi-séances: nombre de séances
    if (isMultiSessionIndividual) {
      return bookingData.selectedSessions.length || numberOfSessions;
    }
    // Formule uni-séance: calcul classique basé sur la plage de dates
    if (!bookingData.selectedDate) return 1;
    if (!bookingData.selectedEndDate || bookingData.selectedDate === bookingData.selectedEndDate) return 1;
    const start = new Date(bookingData.selectedDate);
    const end = new Date(bookingData.selectedEndDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const days = calculateDays();

  // Calculate nights (for garde services with overnight stay)
  const calculateNights = () => {
    if (!bookingData.includeOvernightStay) return 0;
    const d = calculateDays();
    return d > 1 ? d - 1 : 0;
  };

  // Options total (calculated separately for use in smart pricing)
  const optionsTotal = useMemo(() => {
    if (!selectedService) return 0;
    return bookingData.selectedOptionIds.reduce((sum, optId) => {
      const opt = selectedService.options.find((o: ServiceOption) => o.id === optId);
      return sum + (opt?.price || 0);
    }, 0);
  }, [selectedService, bookingData.selectedOptionIds]);

  // Smart price calculation
  const priceCalculation = useMemo((): PriceCalculationResult | null => {
    if (!selectedVariant || !selectedService) {
      return null;
    }

    // Pour les formules collectives ou multi-séances, on peut calculer sans date spécifique
    const hasCollectiveSlots = isCollectiveFormula && bookingData.selectedSlotIds.length > 0;
    const hasMultiSessions = isMultiSessionIndividual && bookingData.selectedSessions.length > 0;

    // Si pas de date et pas de slots/sessions, retourner null
    if (!bookingData.selectedDate && !hasCollectiveSlots && !hasMultiSessions) {
      return null;
    }

    const pricing = selectedVariant.pricing;

    // Get announcer working hours
    const dayStartTime = selectedService.dayStartTime ||
                         announcerPreferences?.acceptReservationsFrom || "08:00";
    const dayEndTime = selectedService.dayEndTime ||
                       announcerPreferences?.acceptReservationsTo || "20:00";

    // For duration-based blocking, use the variant's fixed price
    const useDurationBasedPricing = selectedService.enableDurationBasedBlocking && selectedVariant.duration;

    // Pour les formules collectives/multi-séances, utiliser la première date disponible
    const effectiveStartDate = bookingData.selectedDate ||
      (hasMultiSessions && bookingData.selectedSessions[0]?.date) ||
      (hasCollectiveSlots && bookingData.selectedCollectiveSlots[0]?.date) ||
      new Date().toISOString().split('T')[0];

    return calculateSmartPrice({
      startDate: effectiveStartDate,
      endDate: bookingData.selectedEndDate,
      startTime: bookingData.selectedTime,
      endTime: bookingData.selectedEndTime,
      includeOvernightStay: bookingData.includeOvernightStay,
      dayStartTime,
      dayEndTime,
      workdayHours,
      pricing: {
        hourly: pricing?.hourly || selectedVariant.price,
        halfDaily: (pricing as { halfDaily?: number })?.halfDaily,
        daily: pricing?.daily,
        nightly: pricing?.nightly || selectedService.overnightPrice,
      },
      optionsTotal,
      // Pass fixed price and duration for duration-based blocking
      fixedServicePrice: useDurationBasedPricing ? selectedVariant.price : undefined,
      serviceDurationMinutes: useDurationBasedPricing ? selectedVariant.duration : undefined,
      // Pass client billing mode from category settings
      clientBillingMode: (selectedService as { clientBillingMode?: "exact_hourly" | "round_half_day" | "round_full_day" }).clientBillingMode,
    });
  }, [selectedVariant, selectedService, bookingData, workdayHours, announcerPreferences, optionsTotal, isCollectiveFormula, isMultiSessionIndividual]);

  // Extract values from price calculation for easy access
  const baseAmount = priceCalculation
    ? priceCalculation.firstDayAmount + priceCalculation.fullDaysAmount + priceCalculation.lastDayAmount
    : 0;
  const overnightAmount = priceCalculation?.nightsAmount ?? 0;
  const nights = priceCalculation?.nights ?? 0;

  // Calculer le montant total selon le type de formule
  const totalAmount = useMemo(() => {
    if (!selectedVariant) return 0;

    // Prix avec commission
    const commissionMultiplier = 1 + commissionRate / 100;

    if (isCollectiveFormula) {
      // Formule collective: prix × créneaux sélectionnés × animaux
      const actualSlots = bookingData.selectedSlotIds.length || 1;
      const effectiveAnimalCount = bookingData.selectedAnimalIds.length > 0
        ? bookingData.selectedAnimalIds.length
        : bookingData.animalCount;
      const basePrice = selectedVariant.price * actualSlots * effectiveAnimalCount;
      return Math.round((basePrice + optionsTotal) * commissionMultiplier);
    }

    if (isMultiSessionIndividual) {
      // Formule multi-séances individuelle: prix × séances
      const nSessions = selectedVariant.numberOfSessions || 1;
      const basePrice = selectedVariant.price * nSessions;
      return Math.round((basePrice + optionsTotal) * commissionMultiplier);
    }

    // Formule uni-séance: utiliser le calcul standard
    return priceCalculation?.totalAmount ?? 0;
  }, [selectedVariant, isCollectiveFormula, isMultiSessionIndividual, bookingData.animalCount, bookingData.selectedSlotIds.length, bookingData.selectedAnimalIds.length, optionsTotal, commissionRate, priceCalculation?.totalAmount]);

  // Compute billing info for display in FormulaStep
  const billingInfo = useMemo(() => {
    if (!priceCalculation) return undefined;

    // Calculate full days and half days count
    let fullDays = priceCalculation.fullDays || 0;
    let halfDays = 0;

    const daysCount = calculateDays();

    if (daysCount === 1) {
      // Single day
      if (priceCalculation.firstDayIsFullDay) {
        fullDays = 1;
      } else if (priceCalculation.firstDayIsHalfDay) {
        halfDays = 1;
      } else {
        fullDays = 1; // Default
      }
    } else {
      // Multi-day
      if (priceCalculation.firstDayIsFullDay) fullDays++;
      else if (priceCalculation.firstDayIsHalfDay) halfDays++;
      else fullDays++;

      if (priceCalculation.lastDayIsFullDay) fullDays++;
      else if (priceCalculation.lastDayIsHalfDay) halfDays++;
      else fullDays++;
    }

    return {
      billingUnit: priceCalculation.billingUnit,
      fullDays,
      halfDays,
      firstDayIsHalfDay: priceCalculation.firstDayIsHalfDay,
      lastDayIsHalfDay: priceCalculation.lastDayIsHalfDay,
    };
  }, [priceCalculation, calculateDays]);

  // Handle form submission
  const handleSubmit = async () => {
    // Vérifier les informations de base
    if (!selectedService || !selectedVariant) {
      setError("Veuillez sélectionner un service");
      return;
    }

    // Validation selon le type de formule
    const hasValidDate = bookingData.selectedDate !== null;
    const hasValidSlots = isCollectiveFormula && bookingData.selectedSlotIds.length > 0;
    const hasValidSessions = isMultiSessionIndividual && bookingData.selectedSessions.length > 0;

    if (!hasValidDate && !hasValidSlots && !hasValidSessions) {
      setError("Veuillez sélectionner une date ou des créneaux");
      return;
    }

    // Pour les formules collectives, attendre que les détails des créneaux soient chargés
    if (isCollectiveFormula && bookingData.selectedSlotIds.length > 0 && bookingData.selectedCollectiveSlots.length === 0) {
      setError("Chargement des créneaux en cours, veuillez patienter...");
      return;
    }

    // Vérifier que le montant est valide
    if (isNaN(totalAmount) || totalAmount <= 0) {
      console.error("Invalid totalAmount:", totalAmount, { selectedVariant, isCollectiveFormula, isMultiSessionIndividual });
      setError("Erreur de calcul du prix. Veuillez réessayer.");
      return;
    }

    // Vérifier que l'heure est fournie si le service est basé sur la durée (pas range mode)
    const needsTimeSlot = !isRangeMode && !isCollectiveFormula && !isMultiSessionIndividual;
    if (needsTimeSlot && !bookingData.selectedTime) {
      setError("Veuillez sélectionner un horaire pour cette prestation.");
      setStep(2); // Rediriger vers l'étape de sélection de date/heure
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

      // Use actual IDs from selected objects, not URL params (which may be slugs)
      if (!selectedService || !selectedVariant) {
        setError("Service non trouvé");
        setIsSubmitting(false);
        return;
      }

      // Déterminer la date de début et de fin effectives
      // Pour les formules collectives, utiliser le premier et dernier créneau
      // Pour les formules multi-séances, utiliser la première et dernière séance
      let effectiveStartDate = bookingData.selectedDate || new Date().toISOString().split('T')[0];
      let effectiveEndDate = bookingData.selectedEndDate || effectiveStartDate;
      let effectiveStartTime = bookingData.selectedTime;
      let effectiveEndTime = bookingData.selectedEndTime;

      if (isCollectiveFormula && bookingData.selectedCollectiveSlots.length > 0) {
        // Trier les créneaux par date
        const sortedSlots = [...bookingData.selectedCollectiveSlots].sort((a, b) => a.date.localeCompare(b.date));
        effectiveStartDate = sortedSlots[0].date;
        effectiveEndDate = sortedSlots[sortedSlots.length - 1].date;
        effectiveStartTime = sortedSlots[0].startTime;
        effectiveEndTime = sortedSlots[0].endTime;
      } else if (isMultiSessionIndividual && bookingData.selectedSessions.length > 0) {
        // Trier les séances par date
        const sortedSessions = [...bookingData.selectedSessions].sort((a, b) => a.date.localeCompare(b.date));
        effectiveStartDate = sortedSessions[0].date;
        effectiveEndDate = sortedSessions[sortedSessions.length - 1].date;
        effectiveStartTime = sortedSessions[0].startTime;
        effectiveEndTime = sortedSessions[0].endTime;
      }

      // Log des données pour debug
      const bookingParams = {
        announcerId: announcerId as Id<"users">,
        serviceId: selectedService.id as Id<"services">,
        variantId: selectedVariant.id,
        optionIds: bookingData.selectedOptionIds as Id<"serviceOptions">[],
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        startTime: effectiveStartTime || undefined,
        endTime: effectiveEndTime || undefined,
        calculatedAmount: totalAmount,
        // Créneaux collectifs
        collectiveSlotIds: isCollectiveFormula && bookingData.selectedSlotIds.length > 0
          ? bookingData.selectedSlotIds
          : undefined,
        animalCount: isCollectiveFormula ? bookingData.animalCount : undefined,
        selectedAnimalType: isCollectiveFormula ? bookingData.selectedAnimalType : undefined,
        // Séances multi-sessions
        sessions: isMultiSessionIndividual && bookingData.selectedSessions.length > 0
          ? bookingData.selectedSessions
          : undefined,
        includeOvernightStay: bookingData.includeOvernightStay && nights > 0 ? true : undefined,
        overnightNights: nights > 0 ? nights : undefined,
        overnightAmount: overnightAmount > 0 ? overnightAmount : undefined,
        serviceLocation: bookingData.serviceLocation || undefined,
        // Debug info
        isCollectiveFormula,
        isMultiSessionIndividual,
        selectedSlotIds: bookingData.selectedSlotIds,
      };
      console.log("Creating booking with params:", bookingParams);

      const result = await createPendingBooking({
        announcerId: announcerId as Id<"users">,
        serviceId: selectedService.id as Id<"services">,
        variantId: selectedVariant.id,
        optionIds: bookingData.selectedOptionIds as Id<"serviceOptions">[],
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        startTime: effectiveStartTime || undefined,
        endTime: effectiveEndTime || undefined,
        calculatedAmount: totalAmount,
        // Créneaux collectifs
        collectiveSlotIds: isCollectiveFormula && bookingData.selectedSlotIds.length > 0
          ? bookingData.selectedSlotIds as Id<"collectiveSlots">[]
          : undefined,
        animalCount: isCollectiveFormula ? bookingData.animalCount : undefined,
        selectedAnimalType: isCollectiveFormula ? bookingData.selectedAnimalType : undefined,
        // Animaux sélectionnés par l'utilisateur
        selectedAnimalIds: bookingData.selectedAnimalIds.length > 0 ? bookingData.selectedAnimalIds : undefined,
        // Séances multi-sessions
        sessions: isMultiSessionIndividual && bookingData.selectedSessions.length > 0
          ? bookingData.selectedSessions
          : undefined,
        // Garde de nuit
        includeOvernightStay: bookingData.includeOvernightStay && nights > 0 ? true : undefined,
        overnightNights: nights > 0 ? nights : undefined,
        overnightAmount: overnightAmount > 0 ? overnightAmount : undefined,
        serviceLocation: bookingData.serviceLocation || undefined,
        guestAddress: bookingData.guestAddress ? {
          address: bookingData.guestAddress.address,
          city: bookingData.guestAddress.city || undefined,
          postalCode: bookingData.guestAddress.postalCode || undefined,
          coordinates: bookingData.guestAddress.coordinates || undefined,
        } : undefined,
        // Données pré-remplies de l'animal invité
        guestAnimalPreFill: preGuestAnimalType ? {
          type: preGuestAnimalType,
          breed: preGuestAnimalBreed || undefined,
          isMixedBreed: preGuestAnimalMixed || undefined,
          primaryBreed: preGuestAnimalPrimaryBreed || undefined,
          secondaryBreed: preGuestAnimalSecondaryBreed || undefined,
        } : undefined,
        token: token || undefined,
      });

      if (result.success) {
        router.push(`/reservation/${result.bookingId}`);
      } else {
        setError("Une erreur est survenue lors de la création de la réservation");
      }
    } catch (err: unknown) {
      console.error("Booking error:", err);
      // Essayer d'extraire un message d'erreur plus détaillé
      let errorMessage = "Erreur lors de la réservation";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "object" && err !== null && "data" in err) {
        // Erreur Convex avec data
        const convexErr = err as { data?: string | { message?: string } };
        if (typeof convexErr.data === "string") {
          errorMessage = convexErr.data;
        } else if (convexErr.data?.message) {
          errorMessage = convexErr.data.message;
        }
      }
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Navigate steps
  const nextStep = () => {
    if (step < 4) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) {
      setHasManuallyNavigated(true); // Marquer qu'on a navigué manuellement
      setStep(step - 1);
    }
  };

  // Validation for each step
  const canProceed = () => {
    switch (step) {
      case 1:
        // Service et variante requis
        if (!bookingData.serviceId || !bookingData.variantId) return false;
        // Si le service propose "both", le lieu doit être sélectionné
        if (selectedService?.serviceLocation === "both" && !bookingData.serviceLocation) return false;
        // Si le lieu est à domicile et utilisateur non connecté, vérifier l'adresse guest
        const effectiveLocation = bookingData.serviceLocation || selectedService?.serviceLocation;
        if (effectiveLocation === "client_home" && !authToken && !bookingData.guestAddress?.address) return false;
        // Vérification du chien pour les invités
        if (requiresDogVerification && !guestDogValid) return false;
        return true;
      case 2:
        // Formule collective: au moins 1 créneau sélectionné
        if (isCollectiveFormula) {
          return bookingData.selectedSlotIds.length >= 1;
        }
        // Formule multi-séances individuelle: vérifier que toutes les séances sont planifiées
        if (isMultiSessionIndividual) {
          return bookingData.selectedSessions.length >= numberOfSessions;
        }
        // Formule uni-séance
        if (isRangeMode) {
          // Range mode: start date required (end date optional for single day)
          return bookingData.selectedDate !== null;
        } else {
          // Hourly mode: date + start time + end time required
          return (
            bookingData.selectedDate !== null &&
            bookingData.selectedTime !== null &&
            bookingData.selectedEndTime !== null
          );
        }
      case 3:
        return true; // Options are optional
      case 4:
        return true;
      default:
        return false;
    }
  };

  // Handlers for step components (using functional updates to avoid stale closures)
  const handleFormulaSelect = (serviceId: string, variantId: string, autoServiceLocation?: "announcer_home" | "client_home" | null) => {
    setBookingData((prev) => ({
      ...prev,
      serviceId,
      variantId,
      // Reset options when changing formula
      selectedOptionIds: [],
      // Auto-set service location if service only offers one option
      serviceLocation: autoServiceLocation !== undefined ? autoServiceLocation : prev.serviceLocation,
    }));
    // Réinitialiser la vérification du chien quand on change de formule
    setGuestDogData(null);
    setGuestDogValid(false);
    setGuestDogError(undefined);
  };

  const handleServiceLocationSelect = (location: "announcer_home" | "client_home") => {
    setBookingData((prev) => ({ ...prev, serviceLocation: location }));
  };

  const handleDateSelect = (date: string) => {
    setBookingData((prev) => ({ ...prev, selectedDate: date }));
  };

  const handleEndDateSelect = (date: string | null) => {
    setBookingData((prev) => ({ ...prev, selectedEndDate: date }));
  };

  const handleTimeSelect = (time: string) => {
    // For duration-based blocking, auto-calculate end time
    if (selectedService?.enableDurationBasedBlocking && selectedVariant?.duration) {
      const [hours, minutes] = time.split(":").map(Number);
      const totalMinutes = hours * 60 + minutes + selectedVariant.duration;
      const endHours = Math.floor(totalMinutes / 60);
      const endMinutes = totalMinutes % 60;
      const calculatedEndTime = `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
      setBookingData((prev) => ({ ...prev, selectedTime: time, selectedEndTime: calculatedEndTime }));
    } else {
      // Reset end time when start time changes (normal mode)
      setBookingData((prev) => ({ ...prev, selectedTime: time, selectedEndTime: null }));
    }
  };

  const handleEndTimeSelect = (time: string) => {
    setBookingData((prev) => ({ ...prev, selectedEndTime: time }));
  };

  const handleOvernightChange = (include: boolean) => {
    setBookingData((prev) => ({ ...prev, includeOvernightStay: include }));
  };

  // Handler pour les séances multi-sessions (formules individuelles multi-séances)
  const handleSessionsChange = (sessions: SelectedSession[]) => {
    setBookingData((prev) => ({
      ...prev,
      selectedSessions: sessions,
      // Mettre à jour la première date sélectionnée pour la compatibilité
      selectedDate: sessions.length > 0 ? sessions[0].date : null,
      selectedTime: sessions.length > 0 ? sessions[0].startTime : null,
      selectedEndTime: sessions.length > 0 ? sessions[0].endTime : null,
    }));
  };

  // Handler pour les créneaux collectifs
  const handleSlotsSelected = (slotIds: string[]) => {
    // Récupérer les infos des créneaux sélectionnés depuis availabilityCalendar si disponible
    // Pour l'instant, on stocke juste les IDs
    setBookingData((prev) => ({
      ...prev,
      selectedSlotIds: slotIds,
      // Mettre à jour la première date sélectionnée pour la compatibilité
      selectedDate: slotIds.length > 0 ? prev.selectedDate || new Date().toISOString().split('T')[0] : null,
    }));
  };

  // Handler pour le nombre d'animaux (formules collectives)
  const handleAnimalCountChange = (count: number) => {
    setBookingData((prev) => ({ ...prev, animalCount: count }));
  };

  // Handler pour la sélection d'adresse
  const handleAddressSelect = (addressId: string | null, addressData?: {
    address: string;
    city?: string;
    postalCode?: string;
    coordinates?: { lat: number; lng: number };
  }) => {
    setBookingData((prev) => ({
      ...prev,
      selectedAddressId: addressId,
      selectedAddressData: addressData || null,
    }));
  };

  // Handler pour l'adresse guest (utilisateurs non connectés)
  const handleGuestAddressChange = (address: GuestAddressData | null) => {
    setBookingData((prev) => ({
      ...prev,
      guestAddress: address,
    }));
  };

  const handleToggleOption = (optionId: string) => {
    setBookingData((prev) => {
      const isSelected = prev.selectedOptionIds.includes(optionId);
      return {
        ...prev,
        selectedOptionIds: isSelected
          ? prev.selectedOptionIds.filter((id) => id !== optionId)
          : [...prev.selectedOptionIds, optionId],
      };
    });
  };

  // Loading state
  if (!announcerData || !serviceDetails) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
        <div className="text-center relative z-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-text-light">Chargement...</p>
        </div>
      </div>
    );
  }

  // Announcer not found
  if (!announcerData) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
        <div className="text-center relative z-10">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Annonceur introuvable</h1>
          <Link href="/" className="text-primary hover:underline">
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5 pointer-events-none" />

      {/* Decorative animated blobs */}
      <motion.div
        className="fixed top-20 -left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="fixed bottom-40 -right-20 w-96 h-96 bg-secondary/10 rounded-full blur-3xl pointer-events-none"
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.3, 0.4, 0.3],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />
      <motion.div
        className="fixed top-1/2 left-1/3 w-48 h-48 bg-purple/5 rounded-full blur-3xl pointer-events-none"
        animate={{
          x: [0, 20, 0],
          y: [0, -15, 0],
          opacity: [0.2, 0.35, 0.2],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 4,
        }}
      />

      {/* Floating paw decorations - desktop only */}
      <div className="hidden lg:block fixed inset-0 pointer-events-none overflow-hidden">
        {[
          { top: "15%", left: "8%", delay: 0, size: "text-3xl" },
          { top: "35%", right: "5%", delay: 1.5, size: "text-2xl" },
          { top: "65%", left: "5%", delay: 3, size: "text-2xl" },
          { top: "80%", right: "10%", delay: 4.5, size: "text-xl" },
        ].map((pos, i) => (
          <motion.span
            key={i}
            className={`absolute ${pos.size} opacity-10`}
            style={{ top: pos.top, left: pos.left, right: pos.right }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
              opacity: [0.05, 0.15, 0.05],
              y: [0, -10, 0],
              rotate: [-5, 5, -5],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: pos.delay,
            }}
          >
            🐾
          </motion.span>
        ))}
      </div>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-40 relative">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
              {announcerData.profileImage ? (
                <Image
                  src={announcerData.profileImage}
                  alt={announcerData.firstName}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10">
                  <span className="text-primary font-semibold">
                    {announcerData.firstName.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground text-sm truncate">
                Réserver avec {announcerData.firstName}
              </p>
              {announcerData.username && (
                <p className="text-xs text-gray-400 truncate">@{announcerData.username}</p>
              )}
              <p className="text-xs text-text-light truncate">
                {announcerData.location}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 relative z-10">
        {/* Step Indicator */}
        <StepIndicator
          currentStep={step}
          totalSteps={4}
          labels={STEP_LABELS}
          onStepClick={(targetStep) => {
            setHasManuallyNavigated(true);
            setStep(targetStep);
          }}
        />

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Step 1: Formula Selection */}
            {step === 1 && (
              <>
                <FormulaStep
                  services={serviceDetails as ServiceDetail[]}
                  selectedServiceId={bookingData.serviceId}
                  selectedVariantId={bookingData.variantId}
                  selectedServiceLocation={bookingData.serviceLocation}
                  selectedOptionIds={bookingData.selectedOptionIds}
                  selectedDate={bookingData.selectedDate}
                  selectedEndDate={bookingData.selectedEndDate}
                  selectedTime={bookingData.selectedTime}
                  selectedEndTime={bookingData.selectedEndTime}
                  days={calculateDays()}
                  nights={calculateNights()}
                  includeOvernightStay={bookingData.includeOvernightStay}
                  commissionRate={commissionRate}
                  preSelectedFromSidebar={!!(preSelectedServiceId && preSelectedVariantId)}
                  billingInfo={billingInfo}
                  onSelect={handleFormulaSelect}
                  onServiceLocationSelect={handleServiceLocationSelect}
                />

                {/* Vérification du chien pour les invités */}
                {requiresDogVerification && (
                  <GuestDogVerification
                    acceptedDogSizes={dogRestrictions.acceptedDogSizes}
                    dogCategoryAcceptance={dogRestrictions.dogCategoryAcceptance}
                    onDogDataChange={handleGuestDogDataChange}
                    onValidationChange={handleGuestDogValidationChange}
                    initialData={guestDogData}
                    className="mt-6"
                  />
                )}
              </>
            )}

            {/* Step 2: Date & Time Selection */}
            {step === 2 && selectedService && selectedVariant && (
              <DateTimeStep
                selectedService={selectedService}
                selectedVariant={selectedVariant}
                selectedDate={bookingData.selectedDate}
                selectedEndDate={bookingData.selectedEndDate}
                selectedTime={bookingData.selectedTime}
                selectedEndTime={bookingData.selectedEndTime}
                includeOvernightStay={bookingData.includeOvernightStay}
                calendarMonth={calendarMonth}
                availabilityCalendar={availabilityCalendar?.calendar}
                isRangeMode={isRangeMode}
                days={days}
                nights={nights}
                isCapacityBased={availabilityCalendar?.isCapacityBased}
                maxAnimalsPerSlot={availabilityCalendar?.maxAnimalsPerSlot}
                enableDurationBasedBlocking={selectedService.enableDurationBasedBlocking}
                bufferBefore={availabilityCalendar?.bufferBefore}
                bufferAfter={availabilityCalendar?.bufferAfter}
                acceptReservationsFrom={availabilityCalendar?.acceptReservationsFrom}
                acceptReservationsTo={availabilityCalendar?.acceptReservationsTo}
                // Support formules collectives
                isCollectiveFormula={isCollectiveFormula}
                collectiveSlots={(availabilityCalendar as { collectiveSlots?: CollectiveSlotInfo[] } | undefined)?.collectiveSlots}
                selectedSlotIds={bookingData.selectedSlotIds}
                onSlotsSelected={handleSlotsSelected}
                // Support formules multi-séances
                isMultiSessionIndividual={isMultiSessionIndividual}
                selectedSessions={bookingData.selectedSessions}
                onSessionsChange={handleSessionsChange}
                // Props pour CollectiveSlotPicker
                animalCount={bookingData.animalCount}
                animalType={bookingData.selectedAnimalType}
                // Billing info pour affichage jours/demi-journées
                billingInfo={billingInfo}
                clientBillingMode={selectedService.clientBillingMode}
                minimumBookingAdvanceHours={availabilityCalendar?.minimumBookingAdvanceHours}
                onDateSelect={handleDateSelect}
                onEndDateSelect={handleEndDateSelect}
                onTimeSelect={handleTimeSelect}
                onEndTimeSelect={handleEndTimeSelect}
                onOvernightChange={handleOvernightChange}
                onMonthChange={setCalendarMonth}
              />
            )}

            {/* Step 3: Options Selection */}
            {step === 3 && selectedService && (
              <OptionsStep
                options={selectedService.options as ServiceOption[]}
                selectedOptionIds={bookingData.selectedOptionIds}
                onToggleOption={handleToggleOption}
              />
            )}

            {/* Step 4: Summary */}
            {step === 4 && selectedService && selectedVariant && (bookingData.selectedDate || isCollectiveFormula || isMultiSessionIndividual) && priceCalculation && (
              <SummaryStep
                announcer={{
                  firstName: announcerData.firstName,
                  lastName: announcerData.lastName,
                  profileImage: announcerData.profileImage,
                  location: announcerData.location,
                  city: announcerData.city,
                  postalCode: announcerData.postalCode,
                }}
                selectedService={selectedService}
                selectedVariant={selectedVariant}
                selectedDate={bookingData.selectedDate || ""}
                selectedEndDate={bookingData.selectedEndDate}
                selectedTime={bookingData.selectedTime}
                selectedEndTime={bookingData.selectedEndTime}
                includeOvernightStay={bookingData.includeOvernightStay}
                days={days}
                selectedOptionIds={bookingData.selectedOptionIds}
                priceBreakdown={priceCalculation}
                serviceLocation={bookingData.serviceLocation}
                commissionRate={commissionRate}
                // Support formules collectives
                isCollectiveFormula={isCollectiveFormula}
                collectiveSlots={bookingData.selectedCollectiveSlots}
                animalCount={bookingData.animalCount}
                // Support formules multi-séances
                isMultiSessionIndividual={isMultiSessionIndividual}
                selectedSessions={bookingData.selectedSessions}
                // Animaux de l'utilisateur
                userAnimals={userAnimals}
                selectedAnimalIds={bookingData.selectedAnimalIds}
                error={error}
                // Billing info pour affichage jours/demi-journées
                billingInfo={billingInfo}
                clientBillingMode={selectedService.clientBillingMode}
                // Pricing details
                stripeFeeRate={stripeFeeRate}
                vatRate={vatRate}
                isSapApplied={sapVatInfo?.isSapApplied ?? false}
                sapVatRate={sapVatInfo?.vatRate ?? 20}
                announcerStatusType={announcerData?.statusType}
                // Gestion des adresses
                sessionToken={authToken}
                selectedAddressId={bookingData.selectedAddressId}
                onAddressSelect={handleAddressSelect}
                // Adresse guest
                guestAddress={bookingData.guestAddress}
                onGuestAddressChange={handleGuestAddressChange}
                announcerCoordinates={announcerData?.coordinates ?? undefined}
                // Chien invité
                guestDogData={guestDogData}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="mt-6 flex gap-3">
          {step > 1 && (
            <button
              onClick={prevStep}
              className="flex-1 py-3 px-4 border border-gray-300 rounded-xl font-semibold text-foreground hover:bg-gray-50 transition-colors"
            >
              Retour
            </button>
          )}
          {step < 4 ? (
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className={cn(
                "flex-1 py-3 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2",
                canProceed()
                  ? "bg-primary text-white hover:bg-primary/90"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              )}
            >
              Continuer
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  Poursuivre la réservation
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
