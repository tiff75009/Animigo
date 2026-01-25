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
  type ServiceDetail,
  type ServiceVariant,
  type ServiceOption,
} from "./components";

// Types
interface GuestAddressData {
  address: string;
  city: string | null;
  postalCode: string | null;
  coordinates: { lat: number; lng: number } | null;
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
  fullDays: number;
  fullDaysAmount: number;
  lastDayAmount: number;
  lastDayHours: number;
  lastDayIsFullDay: boolean;
  nightsAmount: number;
  nights: number;
  optionsAmount: number;
  totalAmount: number;
  // For display
  hourlyRate: number;
  dailyRate: number;
  nightlyRate: number;
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
  pricing: {
    hourly?: number;
    daily?: number;
    nightly?: number;
  };
  optionsTotal: number;
  // For duration-based blocking: use fixed price instead of hourly calculation
  fixedServicePrice?: number;
  serviceDurationMinutes?: number;
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
    pricing,
    optionsTotal,
    fixedServicePrice,
    serviceDurationMinutes,
  } = params;

  // Determine rates (derive missing rates from available ones)
  const hourlyRate = pricing.hourly || (pricing.daily ? Math.round(pricing.daily / workdayHours) : 0);
  const dailyRate = pricing.daily || (hourlyRate ? hourlyRate * workdayHours : 0);
  const nightlyRate = pricing.nightly || 0;

  // Calculate total days
  const effectiveEndDate = endDate || startDate;
  const totalDays = daysBetween(startDate, effectiveEndDate) + 1;

  // Single day booking
  if (totalDays === 1) {
    let firstDayHours: number;
    let firstDayAmount: number;
    let firstDayIsFullDay = false;

    // Duration-based blocking: use fixed price
    if (fixedServicePrice !== undefined && serviceDurationMinutes !== undefined) {
      firstDayHours = serviceDurationMinutes / 60;
      firstDayAmount = fixedServicePrice;
      // Not a "full day" in the traditional sense, it's a fixed duration service
      firstDayIsFullDay = false;

      return {
        firstDayAmount,
        firstDayHours,
        firstDayIsFullDay,
        fullDays: 0,
        fullDaysAmount: 0,
        lastDayAmount: 0,
        lastDayHours: 0,
        lastDayIsFullDay: false,
        nightsAmount: 0,
        nights: 0,
        optionsAmount: optionsTotal,
        totalAmount: firstDayAmount + optionsTotal,
        hourlyRate: 0, // Not applicable for fixed price
        dailyRate: 0,
        nightlyRate,
      };
    }

    if (startTime && endTime) {
      // Specific time range
      firstDayHours = calculateHoursBetween(startTime, endTime);
      if (firstDayHours >= workdayHours && dailyRate > 0) {
        firstDayAmount = dailyRate;
        firstDayIsFullDay = true;
      } else {
        // Cap hourly amount at daily rate to avoid paying more for fewer hours
        const hourlyAmount = Math.round(hourlyRate * firstDayHours);
        firstDayAmount = dailyRate > 0 ? Math.min(hourlyAmount, dailyRate) : hourlyAmount;
      }
    } else {
      // Full day
      firstDayHours = workdayHours;
      firstDayAmount = dailyRate || (hourlyRate * workdayHours);
      firstDayIsFullDay = true;
    }

    return {
      firstDayAmount,
      firstDayHours,
      firstDayIsFullDay,
      fullDays: 0,
      fullDaysAmount: 0,
      lastDayAmount: 0,
      lastDayHours: 0,
      lastDayIsFullDay: false,
      nightsAmount: 0,
      nights: 0,
      optionsAmount: optionsTotal,
      totalAmount: firstDayAmount + optionsTotal,
      hourlyRate,
      dailyRate,
      nightlyRate,
    };
  }

  // Multi-day booking
  // First day calculation
  const effectiveStartTime = startTime || dayStartTime;
  const firstDayEndTime = dayEndTime;
  let firstDayHours = calculateHoursBetween(effectiveStartTime, firstDayEndTime);
  let firstDayAmount: number;
  let firstDayIsFullDay = false;

  if (firstDayHours >= workdayHours && dailyRate > 0) {
    firstDayAmount = dailyRate;
    firstDayIsFullDay = true;
  } else if (hourlyRate > 0) {
    // Cap hourly amount at daily rate to avoid paying more for fewer hours
    const hourlyAmount = Math.round(hourlyRate * firstDayHours);
    firstDayAmount = dailyRate > 0 ? Math.min(hourlyAmount, dailyRate) : hourlyAmount;
  } else {
    firstDayAmount = dailyRate;
    firstDayIsFullDay = true;
  }

  // Last day calculation
  const lastDayStartTime = dayStartTime;
  const effectiveEndTime = endTime || dayEndTime;
  let lastDayHours = calculateHoursBetween(lastDayStartTime, effectiveEndTime);
  let lastDayAmount: number;
  let lastDayIsFullDay = false;

  if (lastDayHours >= workdayHours && dailyRate > 0) {
    lastDayAmount = dailyRate;
    lastDayIsFullDay = true;
  } else if (hourlyRate > 0) {
    // Cap hourly amount at daily rate to avoid paying more for fewer hours
    const hourlyAmount = Math.round(hourlyRate * lastDayHours);
    lastDayAmount = dailyRate > 0 ? Math.min(hourlyAmount, dailyRate) : hourlyAmount;
  } else {
    lastDayAmount = dailyRate;
    lastDayIsFullDay = true;
  }

  // Full days in between (excluding first and last)
  const fullDays = Math.max(0, totalDays - 2);
  const fullDaysAmount = fullDays * dailyRate;

  // Nights
  const nights = includeOvernightStay ? totalDays - 1 : 0;
  const nightsAmount = nights * nightlyRate;

  const totalAmount = firstDayAmount + fullDaysAmount + lastDayAmount + nightsAmount + optionsTotal;

  return {
    firstDayAmount,
    firstDayHours,
    firstDayIsFullDay,
    fullDays,
    fullDaysAmount,
    lastDayAmount,
    lastDayHours,
    lastDayIsFullDay,
    nightsAmount,
    nights,
    optionsAmount: optionsTotal,
    totalAmount,
    hourlyRate,
    dailyRate,
    nightlyRate,
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
  // If finalize=true and all required data is present, go directly to step 4 (summary)
  const getInitialStep = () => {
    if (shouldFinalize && preSelectedServiceId && preSelectedVariantId && preSelectedDate && preSelectedStartTime) {
      return 4; // Go directly to summary/finalization step
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
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    return preSelectedDate ? new Date(preSelectedDate) : new Date();
  });

  // Effect pour aller directement à l'étape 4 si finalize=true
  useEffect(() => {
    if (shouldFinalize && preSelectedServiceId && preSelectedVariantId && preSelectedDate && preSelectedStartTime) {
      setStep(4);
    }
  }, [shouldFinalize, preSelectedServiceId, preSelectedVariantId, preSelectedDate, preSelectedStartTime]);

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

  // Commission rate based on announcer type
  const commissionData = useQuery(
    api.admin.commissions.getCommissionRate,
    announcerData?.statusType
      ? { announcerType: announcerData.statusType }
      : "skip"
  );
  const commissionRate = commissionData?.rate ?? 15; // Default 15% for particuliers

  // Selected service and variant (needed before calendar query)
  // Match by id OR by category (slug) since URL may contain either
  const selectedService = serviceDetails?.find(
    (s: ServiceDetail) => s.id === bookingData.serviceId || s.category === bookingData.serviceId
  ) as ServiceDetail | undefined;

  const selectedVariant = selectedService?.variants.find(
    (v: ServiceVariant) => v.id === bookingData.variantId
  ) as ServiceVariant | undefined;

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

  // Calculate days (for display purposes)
  const calculateDays = () => {
    if (!bookingData.selectedDate) return 1;
    if (!bookingData.selectedEndDate || bookingData.selectedDate === bookingData.selectedEndDate) return 1;
    const start = new Date(bookingData.selectedDate);
    const end = new Date(bookingData.selectedEndDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const days = calculateDays();

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
    if (!selectedVariant || !selectedService || !bookingData.selectedDate) {
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

    return calculateSmartPrice({
      startDate: bookingData.selectedDate,
      endDate: bookingData.selectedEndDate,
      startTime: bookingData.selectedTime,
      endTime: bookingData.selectedEndTime,
      includeOvernightStay: bookingData.includeOvernightStay,
      dayStartTime,
      dayEndTime,
      workdayHours,
      pricing: {
        hourly: pricing?.hourly || selectedVariant.price,
        daily: pricing?.daily,
        nightly: pricing?.nightly || selectedService.overnightPrice,
      },
      optionsTotal,
      // Pass fixed price and duration for duration-based blocking
      fixedServicePrice: useDurationBasedPricing ? selectedVariant.price : undefined,
      serviceDurationMinutes: useDurationBasedPricing ? selectedVariant.duration : undefined,
    });
  }, [selectedVariant, selectedService, bookingData, workdayHours, announcerPreferences, optionsTotal]);

  // Extract values from price calculation for easy access
  const baseAmount = priceCalculation
    ? priceCalculation.firstDayAmount + priceCalculation.fullDaysAmount + priceCalculation.lastDayAmount
    : 0;
  const overnightAmount = priceCalculation?.nightsAmount ?? 0;
  const nights = priceCalculation?.nights ?? 0;
  const totalAmount = priceCalculation?.totalAmount ?? 0;

  // Handle form submission
  const handleSubmit = async () => {
    if (!selectedService || !selectedVariant || !bookingData.selectedDate) {
      setError("Veuillez compléter toutes les informations");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

      // Use actual IDs from selected objects, not URL params (which may be slugs)
      if (!selectedService || !selectedVariant) {
        setError("Service ou formule non trouvé");
        setIsSubmitting(false);
        return;
      }

      const result = await createPendingBooking({
        announcerId: announcerId as Id<"users">,
        serviceId: selectedService.id as Id<"services">,
        variantId: selectedVariant.id,
        optionIds: bookingData.selectedOptionIds as Id<"serviceOptions">[],
        startDate: bookingData.selectedDate,
        endDate: bookingData.selectedEndDate || bookingData.selectedDate,
        startTime: bookingData.selectedTime || undefined,
        endTime: bookingData.selectedEndTime || undefined,
        calculatedAmount: totalAmount,
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
        token: token || undefined,
      });

      if (result.success) {
        router.push(`/reservation/${result.bookingId}`);
      } else {
        setError("Une erreur est survenue lors de la création de la réservation");
      }
    } catch (err) {
      console.error("Booking error:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de la réservation");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Navigate steps
  const nextStep = () => {
    if (step < 4) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  // Validation for each step
  const canProceed = () => {
    switch (step) {
      case 1:
        // Service et variante requis
        if (!bookingData.serviceId || !bookingData.variantId) return false;
        // Si le service propose "both", le lieu doit être sélectionné
        if (selectedService?.serviceLocation === "both" && !bookingData.serviceLocation) return false;
        return true;
      case 2:
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
              <FormulaStep
                services={serviceDetails as ServiceDetail[]}
                selectedServiceId={bookingData.serviceId}
                selectedVariantId={bookingData.variantId}
                selectedServiceLocation={bookingData.serviceLocation}
                selectedOptionIds={bookingData.selectedOptionIds}
                selectedDate={bookingData.selectedDate}
                selectedTime={bookingData.selectedTime}
                selectedEndTime={bookingData.selectedEndTime}
                commissionRate={commissionRate}
                preSelectedFromSidebar={!!(preSelectedServiceId && preSelectedVariantId)}
                onSelect={handleFormulaSelect}
                onServiceLocationSelect={handleServiceLocationSelect}
              />
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
            {step === 4 && selectedService && selectedVariant && bookingData.selectedDate && priceCalculation && (
              <SummaryStep
                announcer={{
                  firstName: announcerData.firstName,
                  lastName: announcerData.lastName,
                  profileImage: announcerData.profileImage,
                  location: announcerData.location,
                }}
                selectedService={selectedService}
                selectedVariant={selectedVariant}
                selectedDate={bookingData.selectedDate}
                selectedEndDate={bookingData.selectedEndDate}
                selectedTime={bookingData.selectedTime}
                selectedEndTime={bookingData.selectedEndTime}
                includeOvernightStay={bookingData.includeOvernightStay}
                days={days}
                selectedOptionIds={bookingData.selectedOptionIds}
                priceBreakdown={priceCalculation}
                serviceLocation={bookingData.serviceLocation}
                commissionRate={commissionRate}
                error={error}
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
