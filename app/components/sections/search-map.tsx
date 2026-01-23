"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Search,
  MapPin,
  Star,
  CheckCircle,
  Clock,
  X,
  Eye,
  EyeOff,
  CalendarCheck,
  AlertCircle,
  Package,
  Zap,
  Check,
  Layers,
  Euro,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Calendar,
  Target,
  Moon,
  Sun,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useSearch, type AnnouncerResult } from "@/app/hooks/useSearch";
import {
  CategorySelector,
  DateSelector,
  LocationSearchBar,
  AnimalTypeDropdown,
} from "@/app/components/search";

// Helper function to extract city from location string
function extractCity(location: string): string {
  // Location formats: "Paris 11e", "75011 Paris", "Rue X, Paris 11e", etc.
  // We want to extract just the city (e.g., "Paris 11e" or "Paris")
  const parts = location.split(",").map((p) => p.trim());
  // Take the last part which is usually the city
  const lastPart = parts[parts.length - 1];
  // If it starts with a number (zip code), try to get just the city name
  if (/^\d/.test(lastPart)) {
    const cityMatch = lastPart.match(/\d+\s+(.+)/);
    return cityMatch ? cityMatch[1] : lastPart;
  }
  return lastPart;
}

// Dynamically import the map component to avoid SSR issues
const MapComponent = dynamic(() => import("./map-component"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 rounded-2xl flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
        <p className="text-text-light">Chargement de la carte...</p>
      </div>
    </div>
  ),
});

// Price unit labels
const priceUnitLabels: Record<string, string> = {
  hour: "/heure",
  day: "/jour",
  week: "/semaine",
  month: "/mois",
  flat: "",
};

const priceTypeLabels: Record<string, string> = {
  flat: "",
  per_day: "/jour",
  per_unit: "/unité",
};

// Format price in euros
function formatPrice(cents: number): string {
  return (cents / 100).toFixed(0) + "€";
}

// Animal emojis
const animalEmojis: Record<string, string> = {
  chien: "🐕",
  chat: "🐈",
  oiseau: "🦜",
  rongeur: "🐹",
  poisson: "🐠",
  reptile: "🦎",
  nac: "🐾",
};

// Time slots for booking
const bookingTimeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00",
];

// Interface for selected variant/options
interface BookingSelection {
  serviceId: string;
  variantId: string;
  variantName: string;
  variantPrice: number;
  variantPriceUnit: string;
  variantDuration?: number; // Durée en minutes
  optionIds: string[];
  serviceCategory: string;
  // Garde de nuit
  variantPricing?: {
    hourly?: number;
    daily?: number;
    weekly?: number;
    monthly?: number;
    nightly?: number;
  };
  allowOvernightStay?: boolean;
  dayStartTime?: string;
  dayEndTime?: string;
  overnightPrice?: number;
}

// Type helper for service details from Convex query
type ServiceDetailsResult = Awaited<ReturnType<typeof api.public.search.getAnnouncerServiceDetails._returnType>>;
type ServiceDetailType = NonNullable<ServiceDetailsResult>[number];
type ServiceVariantType = ServiceDetailType["variants"][number];

// Formulas Modal Component with Booking
function FormulasModal({
  isOpen,
  onClose,
  announcer,
  searchFilters,
}: {
  isOpen: boolean;
  onClose: () => void;
  announcer: AnnouncerResult;
  searchFilters?: {
    category: { slug: string; name: string; allowRangeBooking?: boolean; allowOvernightStay?: boolean } | null;
    date: string | null;
    time: string | null;
    endTime: string | null;
    startDate: string | null;
    endDate: string | null;
  };
}) {
  const router = useRouter();
  const [step, setStep] = useState<"formulas" | "booking">("formulas");
  const [selection, setSelection] = useState<BookingSelection | null>(null);
  // Pré-remplir les dates depuis les filtres de recherche
  const [selectedDate, setSelectedDate] = useState<string | null>(
    searchFilters?.date ?? searchFilters?.startDate ?? null
  );
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(
    searchFilters?.endDate ?? null
  );
  const [selectedTime, setSelectedTime] = useState<string | null>(
    searchFilters?.time ?? null
  );
  const [selectedEndTime, setSelectedEndTime] = useState<string | null>(
    searchFilters?.endTime ?? null
  );
  const [includeOvernightStay, setIncludeOvernightStay] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    // Initialiser le calendrier au mois de la date sélectionnée si disponible
    const initialDate = searchFilters?.date ?? searchFilters?.startDate;
    return initialDate ? new Date(initialDate) : new Date();
  });
  // Filtre par catégorie dans la modale ("all" ou slug de catégorie)
  const [categoryFilter, setCategoryFilter] = useState<string>(
    searchFilters?.category?.slug ?? "all"
  );

  // Mutation pour cr\u00e9er une r\u00e9servation en attente
  const createPendingBooking = useMutation(api.public.booking.createPendingBooking);

  // Fetch detailed service data
  const serviceDetails = useQuery(
    api.public.search.getAnnouncerServiceDetails,
    isOpen ? { announcerId: announcer.id as Id<"users"> } : "skip"
  );

  // Fetch announcer availability preferences (working hours)
  const announcerPreferences = useQuery(
    api.public.search.getAnnouncerAvailabilityPreferences,
    isOpen ? { announcerId: announcer.id as Id<"users"> } : "skip"
  );

  // Fetch availability calendar
  const startOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const endOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);

  // Fonction pour formater une date sans conversion UTC
  const formatDateLocal = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const availabilityCalendar = useQuery(
    api.public.search.getAnnouncerAvailabilityCalendar,
    isOpen && selection && step === "booking"
      ? {
          announcerId: announcer.id as Id<"users">,
          serviceCategory: selection.serviceCategory,
          startDate: formatDateLocal(startOfMonth),
          endDate: formatDateLocal(endOfMonth),
        }
      : "skip"
  );

  // Reset state when modal closes
  const handleClose = () => {
    setStep("formulas");
    setSelection(null);
    setSelectedDate(searchFilters?.date ?? searchFilters?.startDate ?? null);
    setSelectedEndDate(searchFilters?.endDate ?? null);
    setSelectedTime(searchFilters?.time ?? null);
    setIncludeOvernightStay(false);
    setBookingError(null);
    setCategoryFilter(searchFilters?.category?.slug ?? "all");
    onClose();
  };

  // Filtrer les services par catégorie
  const filteredServices = useMemo((): ServiceDetailType[] => {
    if (!serviceDetails) return [];
    if (categoryFilter === "all") return serviceDetails;
    return serviceDetails.filter((service: ServiceDetailType) => service.category === categoryFilter);
  }, [serviceDetails, categoryFilter]);

  // Obtenir les catégories disponibles pour le filtre
  const availableCategories = useMemo(() => {
    if (!serviceDetails) return [];
    return serviceDetails.map((service: ServiceDetailType) => ({
      slug: service.category,
      name: service.categoryName,
      icon: service.categoryIcon,
    }));
  }, [serviceDetails]);

  // Handle variant selection
  const handleSelectVariant = (
    serviceId: string,
    variant: {
      id: string;
      name: string;
      price: number;
      priceUnit: string;
      duration?: number;
      pricing?: {
        hourly?: number;
        daily?: number;
        weekly?: number;
        monthly?: number;
        nightly?: number;
      };
    },
    serviceCategory: string,
    serviceOvernightData?: {
      allowOvernightStay?: boolean;
      dayStartTime?: string;
      dayEndTime?: string;
      overnightPrice?: number;
    }
  ) => {
    setSelection({
      serviceId,
      variantId: variant.id,
      variantName: variant.name,
      variantPrice: variant.price,
      variantPriceUnit: variant.priceUnit,
      variantDuration: variant.duration,
      variantPricing: variant.pricing,
      optionIds: [],
      serviceCategory,
      // Overnight info from service
      allowOvernightStay: serviceOvernightData?.allowOvernightStay,
      dayStartTime: serviceOvernightData?.dayStartTime,
      dayEndTime: serviceOvernightData?.dayEndTime,
      overnightPrice: serviceOvernightData?.overnightPrice,
    });
    setIncludeOvernightStay(false); // Reset overnight when changing variant
    setStep("booking");
  };

  // Helper pour parser "HH:MM" en minutes
  const parseTimeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Calculer le montant total
  const calculateAmount = () => {
    if (!selection) return 0;
    let amount = selection.variantPrice;

    // Mode plage horaire (même jour avec heure début et fin)
    if (isSameDayRangeMode && selectedTime && selectedEndTime && selection.variantPriceUnit === "hour") {
      const startMinutes = parseTimeToMinutes(selectedTime);
      const endMinutes = parseTimeToMinutes(selectedEndTime);
      const durationMinutes = endMinutes - startMinutes;
      if (durationMinutes > 0) {
        amount = Math.round((selection.variantPrice * durationMinutes) / 60);
      }
    }
    // Si tarification horaire avec durée fixe (variant.duration)
    else if (selection.variantPriceUnit === "hour" && selection.variantDuration) {
      // Prix = taux horaire × (durée en heures)
      amount = Math.round((selection.variantPrice * selection.variantDuration) / 60);
    }
    // Si tarification journalière ou plage de dates (plusieurs jours)
    else if ((selection.variantPriceUnit === "day" || isRangeMode) && selectedDate && selectedEndDate && selectedDate !== selectedEndDate) {
      const start = new Date(selectedDate);
      const end = new Date(selectedEndDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (selection.variantPriceUnit === "day") {
        amount = selection.variantPrice * days;
      } else if (selection.variantPriceUnit === "hour") {
        // Pour hourly billing sur plusieurs jours : prix horaire × 8h × jours
        amount = selection.variantPrice * 8 * days;
      }

      // Ajouter le coût des nuits si activé
      if (includeOvernightStay && days > 1) {
        const nights = days - 1;
        // Utiliser pricing.nightly du variant ou overnightPrice du service
        const nightlyRate = selection.variantPricing?.nightly || selection.overnightPrice || 0;
        amount += nightlyRate * nights;
      }
    }
    return amount;
  };

  // Handle booking continuation - create pending booking and redirect
  const handleContinueBooking = async () => {
    if (!selection || !selectedDate) {
      setBookingError("Veuillez sélectionner une date");
      return;
    }

    // Validation selon le mode
    if (isSameDayRangeMode) {
      // Mode plage horaire : besoin de startTime ET endTime
      if (!selectedTime || !selectedEndTime) {
        setBookingError("Veuillez sélectionner l'heure de début et de fin");
        return;
      }
    } else if (selection.variantPriceUnit !== "day" && !isRangeMode) {
      // Mode horaire standard : besoin de l'heure
      if (!selectedTime) {
        setBookingError("Veuillez sélectionner une heure");
        return;
      }
    }

    setIsSubmitting(true);
    setBookingError(null);

    try {
      // Récupérer le token (optionnel)
      const token = localStorage.getItem("auth_token") || undefined;

      // Calculer les nuits si applicable
      let overnightNights = 0;
      let overnightAmount = 0;
      if (includeOvernightStay && selectedDate && selectedEndDate && selectedDate !== selectedEndDate) {
        const start = new Date(selectedDate);
        const end = new Date(selectedEndDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        overnightNights = Math.max(0, days - 1);
        const nightlyRate = selection.variantPricing?.nightly || selection.overnightPrice || 0;
        overnightAmount = nightlyRate * overnightNights;
      }

      // Créer la réservation en attente
      const result = await createPendingBooking({
        announcerId: announcer.id as Id<"users">,
        serviceId: selection.serviceId as Id<"services">,
        variantId: selection.variantId,
        optionIds: selection.optionIds.length > 0 ? selection.optionIds : undefined,
        startDate: selectedDate,
        endDate: selectedEndDate ?? selectedDate,
        startTime: selectedTime ?? undefined,
        endTime: selectedEndTime ?? undefined,
        calculatedAmount: priceDetails?.total ?? 0,
        // Garde de nuit
        includeOvernightStay: includeOvernightStay && overnightNights > 0 ? true : undefined,
        overnightNights: overnightNights > 0 ? overnightNights : undefined,
        overnightAmount: overnightAmount > 0 ? overnightAmount : undefined,
        token,
      });

      if (result.success) {
        // Rediriger vers la page de r\u00e9servation
        handleClose();
        router.push(`/reservation/${result.bookingId}`);
      }
    } catch (error) {
      console.error("Erreur:", error);
      if (error instanceof Error) {
        setBookingError(error.message);
      } else {
        setBookingError("Une erreur est survenue");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isLoading = serviceDetails === undefined;
  const totalVariants = filteredServices.reduce((acc: number, s: { variants: unknown[] }) => acc + s.variants.length, 0);
  const totalOptions = filteredServices.reduce((acc: number, s: { options: unknown[] }) => acc + s.options.length, 0);

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = (firstDay.getDay() + 6) % 7; // Monday = 0
    const days: Array<{ date: string; day: number; isCurrentMonth: boolean }> = [];

    // Previous month padding
    for (let i = startPadding - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({
        date: formatDateLocal(d),
        day: d.getDate(),
        isCurrentMonth: false,
      });
    }

    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({
        date: formatDateLocal(d),
        day: i,
        isCurrentMonth: true,
      });
    }

    // Next month padding
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month + 1, i);
        days.push({
          date: formatDateLocal(d),
          day: i,
          isCurrentMonth: false,
        });
      }
    }

    return days;
  };

  const calendarDays = generateCalendarDays();
  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

  // Extraire les données du calendrier et les buffers
  const calendarData = availabilityCalendar?.calendar ?? [];
  const bufferBefore = availabilityCalendar?.bufferBefore ?? 0;
  const bufferAfter = availabilityCalendar?.bufferAfter ?? 0;

  const getDateStatus = (date: string) => {
    if (!availabilityCalendar) return "loading";
    const dayInfo = calendarData.find((d: { date: string; status?: string }) => d.date === date);
    return dayInfo?.status ?? "available";
  };

  // Récupérer les créneaux réservés pour une date
  const getBookedSlotsForDate = (date: string) => {
    if (!availabilityCalendar) return [];
    const dayInfo = calendarData.find((d: { date: string; bookedSlots?: Array<{ startTime: string; endTime: string }> }) => d.date === date);
    return dayInfo?.bookedSlots ?? [];
  };

  // Convertir l'heure "HH:MM" en minutes depuis minuit
  const parseTime = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  // Soustraire des minutes d'une heure (pour buffer before)
  const subtractMinutes = (time: string, minutes: number): string => {
    const total = Math.max(0, parseTime(time) - minutes);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  // Ajouter des minutes à une heure (pour buffer after)
  const addMinutes = (time: string, minutes: number): string => {
    const total = Math.min(24 * 60 - 1, parseTime(time) + minutes);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  // Vérifier si un créneau horaire tombe dans une période déjà réservée (avec buffers)
  const isTimeSlotBooked = (time: string) => {
    if (!selectedDate) return false;

    const bookedSlots = getBookedSlotsForDate(selectedDate);
    if (bookedSlots.length === 0) return false;

    const slotStart = parseTime(time);

    // Vérifier si le créneau tombe dans une période déjà réservée (avec buffers)
    return bookedSlots.some((booked: { startTime: string; endTime: string }) => {
      // Appliquer les buffers: étendre la période bloquée
      const effectiveStart = subtractMinutes(booked.startTime, bufferBefore);
      const effectiveEnd = addMinutes(booked.endTime, bufferAfter);

      const bookedStart = parseTime(effectiveStart);
      const bookedEnd = parseTime(effectiveEnd);

      // Un créneau est bloqué s'il tombe dans la période réservée étendue
      // Exemple: réservé 8h30-10h30 avec buffer 30min avant/après
      // Période effective bloquée: 8h00-11h00
      // - 7h30: LIBRE
      // - 8h00, 8h30, ..., 10h30, 11h00: BLOQUÉ
      // - 11h30: LIBRE

      return slotStart >= bookedStart && slotStart <= bookedEnd;
    });
  };

  // Mode plage : daily billing OU allowRangeBooking activé
  const isRangeMode = selection?.variantPriceUnit === "day" || searchFilters?.category?.allowRangeBooking;
  // Mode plage horaire : allowRangeBooking ET même jour sélectionné
  const isSameDayRangeMode = searchFilters?.category?.allowRangeBooking && selectedDate && selectedEndDate && selectedDate === selectedEndDate;

  // Filtrer les créneaux selon les horaires de l'annonceur
  const filteredTimeSlots = useMemo(() => {
    if (!announcerPreferences) return bookingTimeSlots;
    const { acceptReservationsFrom, acceptReservationsTo } = announcerPreferences;
    return bookingTimeSlots.filter(
      (slot) => slot >= acceptReservationsFrom && slot <= acceptReservationsTo
    );
  }, [announcerPreferences]);

  // Calculer les détails du prix pour l'affichage
  const priceDetails = useMemo(() => {
    if (!selection || !selectedDate) return null;

    const basePrice = selection.variantPrice; // Prix de base du variant
    const pricing = selection.variantPricing; // Multi-tarification

    // Mode plage horaire (même jour)
    if (isSameDayRangeMode && selectedTime && selectedEndTime) {
      const startMinutes = parseTimeToMinutes(selectedTime);
      const endMinutes = parseTimeToMinutes(selectedEndTime);
      const durationMinutes = endMinutes - startMinutes;
      const durationHours = durationMinutes / 60;
      // Utiliser le tarif horaire du pricing ou le prix de base
      const hourlyRate = pricing?.hourly || basePrice;
      const total = Math.round((hourlyRate * durationMinutes) / 60);

      return {
        type: "hourly_range" as const,
        hourlyRate,
        durationMinutes,
        durationHours,
        total,
        dateLabel: new Date(selectedDate).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
        timeRange: `${selectedTime} - ${selectedEndTime}`,
      };
    }

    // Mode plage de dates (plusieurs jours)
    if (isRangeMode && selectedEndDate && selectedDate !== selectedEndDate) {
      const start = new Date(selectedDate);
      const end = new Date(selectedEndDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      let total = 0;
      let dailyRate: number;
      let weeklyRate: number | undefined;
      let monthlyRate: number | undefined;
      let hoursPerDay = 8; // Journée standard
      let calcType: "daily" | "weekly" | "monthly" | "hourly" = "daily";

      // Déterminer le tarif journalier - ordre de priorité
      if (pricing?.daily && pricing.daily > 0) {
        // 1. Multi-tarification avec prix journalier
        dailyRate = pricing.daily;
        weeklyRate = pricing.weekly;
        monthlyRate = pricing.monthly;
      } else if (selection.variantPriceUnit === "day" && basePrice > 0) {
        // 2. Prix de base est journalier
        dailyRate = basePrice;
        weeklyRate = pricing?.weekly;
        monthlyRate = pricing?.monthly;
      } else if (pricing?.weekly && pricing.weekly > 0) {
        // 3. Dériver du tarif hebdo
        dailyRate = Math.round(pricing.weekly / 7);
        weeklyRate = pricing.weekly;
        monthlyRate = pricing.monthly;
      } else if (pricing?.monthly && pricing.monthly > 0) {
        // 4. Dériver du tarif mensuel
        dailyRate = Math.round(pricing.monthly / 30);
        monthlyRate = pricing.monthly;
      } else if (pricing?.hourly && pricing.hourly > 0) {
        // 5. Prix horaire - calculer le tarif journalier
        dailyRate = pricing.hourly * hoursPerDay;
        calcType = "hourly";
      } else if (selection.variantPriceUnit === "hour" && basePrice > 0) {
        // 6. Prix de base est horaire
        dailyRate = basePrice * hoursPerDay;
        calcType = "hourly";
      } else if (basePrice > 0) {
        // 7. Fallback: utiliser le prix de base
        dailyRate = basePrice;
      } else {
        // 8. Dernier recours: 0 (ne devrait pas arriver)
        dailyRate = 0;
      }

      // Appliquer le meilleur tarif selon la durée (si multi-tarif disponible)
      if (calcType !== "hourly") {
        if (days >= 30 && monthlyRate) {
          const months = Math.floor(days / 30);
          const remainingDays = days % 30;
          total = (monthlyRate * months) + (dailyRate * remainingDays);
          calcType = "monthly";
        } else if (days >= 7 && weeklyRate) {
          const weeks = Math.floor(days / 7);
          const remainingDays = days % 7;
          total = (weeklyRate * weeks) + (dailyRate * remainingDays);
          calcType = "weekly";
        } else {
          total = dailyRate * days;
          calcType = "daily";
        }
      } else {
        // Mode horaire
        total = dailyRate * days;
      }

      // Calculer les nuits si garde de nuit activée
      const nights = includeOvernightStay && selection.allowOvernightStay && days > 1 ? days - 1 : 0;
      const nightlyRate = pricing?.nightly || selection.overnightPrice || 0;
      const overnightTotal = nights * nightlyRate;
      total += overnightTotal;

      return {
        type: "daily_range" as const,
        calcType,
        dailyRate,
        weeklyRate,
        monthlyRate,
        days,
        hoursPerDay: calcType === "hourly" ? hoursPerDay : undefined,
        total,
        startDate: start.toLocaleDateString("fr-FR", { day: "numeric", month: "long" }),
        endDate: end.toLocaleDateString("fr-FR", { day: "numeric", month: "long" }),
        // Overnight info
        includeOvernightStay: includeOvernightStay && selection.allowOvernightStay,
        nights,
        nightlyRate,
        overnightTotal,
        dayStartTime: selection.dayStartTime || "08:00",
        dayEndTime: selection.dayEndTime || "20:00",
      };
    }

    // Mode standard (date + heure + durée fixe)
    if (selection.variantPriceUnit === "hour" && selection.variantDuration) {
      const durationMinutes = selection.variantDuration;
      const hourlyRate = pricing?.hourly || basePrice;
      const total = Math.round((hourlyRate * durationMinutes) / 60);

      return {
        type: "fixed_duration" as const,
        hourlyRate,
        durationMinutes,
        total,
      };
    }

    // Mode simple (1 jour)
    const dailyRate = pricing?.daily || basePrice;
    return {
      type: "simple" as const,
      total: dailyRate,
    };
  }, [selection, selectedDate, selectedEndDate, selectedTime, selectedEndTime, isSameDayRangeMode, isRangeMode, includeOvernightStay]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-50"
          />
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && handleClose()}
          >
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-purple/10 p-5 border-b border-foreground/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {step === "booking" && (
                      <button
                        onClick={() => setStep("formulas")}
                        className="p-2 hover:bg-foreground/10 rounded-full transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5 text-foreground/60" />
                      </button>
                    )}
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-white shadow-sm">
                      {announcer.profileImage ? (
                        <Image
                          src={announcer.profileImage}
                          alt={announcer.firstName}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl bg-gray-100">
                          👤
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground">
                        {step === "booking" ? `Réserver avec ${announcer.firstName}` :
                         `${announcer.firstName} ${announcer.lastName.charAt(0)}.`}
                      </h3>
                      {step === "formulas" && (
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1 text-sm text-primary font-medium">
                            <Layers className="w-4 h-4" />
                            {totalVariants} prestation{totalVariants > 1 ? "s" : ""}
                          </span>
                          {totalOptions > 0 && (
                            <span className="flex items-center gap-1 text-sm text-amber-600 font-medium">
                              <Zap className="w-4 h-4" />
                              {totalOptions} option{totalOptions > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      )}
                      {step === "booking" && selection && (
                        <p className="text-sm text-text-light mt-1">
                          {selection.variantName}
                          {selection.variantDuration && (
                            <span className="mx-1">
                              ({selection.variantDuration < 60
                                ? `${selection.variantDuration} min`
                                : `${Math.floor(selection.variantDuration / 60)}h${selection.variantDuration % 60 > 0 ? selection.variantDuration % 60 : ""}`})
                            </span>
                          )}
                          {/* Afficher le prix depuis pricing ou fallback sur variantPrice */}
                          {" - "}
                          {selection.variantPricing?.daily ? (
                            <>{formatPrice(selection.variantPricing.daily)}/jour</>
                          ) : selection.variantPricing?.hourly ? (
                            <>{formatPrice(selection.variantPricing.hourly)}/h</>
                          ) : selection.variantPricing?.weekly ? (
                            <>{formatPrice(selection.variantPricing.weekly)}/sem</>
                          ) : selection.variantPricing?.monthly ? (
                            <>{formatPrice(selection.variantPricing.monthly)}/mois</>
                          ) : selection.variantPrice > 0 ? (
                            <>{formatPrice(selection.variantPrice)}{priceUnitLabels[selection.variantPriceUnit]}</>
                          ) : (
                            <span className="text-amber-600">Tarif non configuré</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-2 hover:bg-foreground/10 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-foreground/60" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 overflow-y-auto max-h-[60vh]">
                {/* Step: Formulas */}
                {step === "formulas" && (
                  <>
                    {isLoading ? (
                      <div className="flex items-center justify-center py-10">
                        <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full" />
                      </div>
                    ) : serviceDetails && serviceDetails.length > 0 ? (
                      <div className="space-y-6">
                        {/* Filtre par catégorie */}
                        {availableCategories.length > 1 && (
                          <div className="flex flex-wrap gap-2 pb-4 border-b border-foreground/10">
                            <button
                              onClick={() => setCategoryFilter("all")}
                              className={cn(
                                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                                categoryFilter === "all"
                                  ? "bg-primary text-white"
                                  : "bg-foreground/5 text-foreground/70 hover:bg-foreground/10"
                              )}
                            >
                              Tout ({serviceDetails.length})
                            </button>
                            {availableCategories.map((cat: { slug: string; name: string; icon?: string }) => (
                              <button
                                key={cat.slug}
                                onClick={() => setCategoryFilter(cat.slug)}
                                className={cn(
                                  "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                                  categoryFilter === cat.slug
                                    ? "bg-primary text-white"
                                    : "bg-foreground/5 text-foreground/70 hover:bg-foreground/10"
                                )}
                              >
                                {cat.icon && <span>{cat.icon}</span>}
                                {cat.name}
                              </button>
                            ))}
                          </div>
                        )}

                        {filteredServices.map((service: ServiceDetailType) => (
                          <div key={service.id} className="space-y-4">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl flex-shrink-0">
                                {service.categoryIcon ?? "✨"}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-foreground">{service.categoryName}</h4>
                                <p className="text-xs text-text-light">{service.animalTypes.join(", ")}</p>
                                {service.categoryDescription && (
                                  <p className="text-sm text-text-light mt-1">{service.categoryDescription}</p>
                                )}
                              </div>
                            </div>

                            {service.variants.length > 0 && (
                              <div className="space-y-2">
                                {service.variants.map((variant: ServiceVariantType) => (
                                  <div
                                    key={variant.id}
                                    className="p-4 bg-primary/5 rounded-xl border border-primary/10 hover:border-primary/30 transition-colors"
                                  >
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <h5 className="font-semibold text-foreground">{variant.name}</h5>
                                          {variant.duration && (
                                            <span className="text-xs px-2 py-0.5 bg-foreground/10 rounded-full text-foreground/60">
                                              {variant.duration}min
                                            </span>
                                          )}
                                        </div>
                                        {variant.description && (
                                          <p className="text-sm text-text-light mt-1">{variant.description}</p>
                                        )}
                                        {variant.includedFeatures && variant.includedFeatures.length > 0 && (
                                          <div className="mt-2 space-y-1">
                                            {variant.includedFeatures.map((feature: string, idx: number) => (
                                              <div key={idx} className="flex items-center gap-2 text-sm text-secondary">
                                                <Check className="w-3.5 h-3.5" />
                                                <span>{feature}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-right flex-shrink-0">
                                        {/* Afficher les tarifs multi-pricing ou fallback sur le prix de base */}
                                        {variant.pricing?.daily || variant.pricing?.hourly || variant.pricing?.weekly || variant.pricing?.monthly ? (
                                          <div className="space-y-0.5">
                                            {variant.pricing?.daily && (
                                              <div className="text-xl font-bold text-primary">
                                                {formatPrice(variant.pricing.daily)}<span className="text-sm font-normal text-text-light">/jour</span>
                                              </div>
                                            )}
                                            {variant.pricing?.hourly && !variant.pricing?.daily && (
                                              <div className="text-xl font-bold text-primary">
                                                {formatPrice(variant.pricing.hourly)}<span className="text-sm font-normal text-text-light">/h</span>
                                              </div>
                                            )}
                                            {/* Afficher tarifs supplémentaires en petit */}
                                            <div className="flex flex-wrap gap-1 justify-end">
                                              {variant.pricing?.weekly && (
                                                <span className="text-xs text-text-light">{formatPrice(variant.pricing.weekly)}/sem</span>
                                              )}
                                              {variant.pricing?.monthly && (
                                                <span className="text-xs text-text-light">{formatPrice(variant.pricing.monthly)}/mois</span>
                                              )}
                                            </div>
                                          </div>
                                        ) : variant.priceUnit === "hour" && variant.duration ? (
                                          <>
                                            <div className="text-xl font-bold text-primary">
                                              {formatPrice(Math.round((variant.price * variant.duration) / 60))}
                                            </div>
                                            <div className="text-xs text-text-light">
                                              {formatPrice(variant.price)}/h × {variant.duration < 60
                                                ? `${variant.duration}min`
                                                : `${Math.floor(variant.duration / 60)}h${variant.duration % 60 > 0 ? variant.duration % 60 : ""}`}
                                            </div>
                                          </>
                                        ) : (
                                          <>
                                            <div className="text-xl font-bold text-primary">{formatPrice(variant.price)}</div>
                                            <div className="text-xs text-text-light">{priceUnitLabels[variant.priceUnit] ?? ""}</div>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleSelectVariant(
                                        service.id,
                                        variant,
                                        service.category,
                                        {
                                          allowOvernightStay: service.allowOvernightStay,
                                          dayStartTime: service.dayStartTime,
                                          dayEndTime: service.dayEndTime,
                                          overnightPrice: service.overnightPrice,
                                        }
                                      )}
                                      className="w-full mt-3 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
                                    >
                                      Réserver cette prestation
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {service.options.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wider">Options additionnelles</p>
                                <div className="flex flex-wrap gap-2">
                                  {service.options.map((option: { id: string; name: string; price: number; priceType?: string }) => (
                                    <div key={option.id} className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm">
                                      <Zap className="w-4 h-4 text-amber-500" />
                                      <span className="font-medium text-amber-800">{option.name}</span>
                                      <span className="text-amber-600 font-semibold">+{formatPrice(option.price)}{option.priceType ? priceTypeLabels[option.priceType] : ""}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {filteredServices.indexOf(service) < filteredServices.length - 1 && (
                              <div className="border-b border-foreground/10" />
                            )}
                          </div>
                        ))}

                        {/* Message si aucune prestation après filtrage */}
                        {filteredServices.length === 0 && categoryFilter !== "all" && (
                          <div className="text-center py-6">
                            <div className="text-3xl mb-2">🔍</div>
                            <p className="text-text-light text-sm">Aucune prestation dans cette catégorie</p>
                            <button
                              onClick={() => setCategoryFilter("all")}
                              className="mt-2 text-primary text-sm font-medium hover:underline"
                            >
                              Voir toutes les prestations
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <div className="text-4xl mb-3">📭</div>
                        <p className="text-text-light">Aucune prestation disponible</p>
                      </div>
                    )}
                  </>
                )}

                {/* Step: Booking */}
                {step === "booking" && selection && (
                  <div className="space-y-6">
                    {/* Calendar */}
                    <div>
                      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        {isRangeMode ? "Sélectionnez vos dates" : "Sélectionnez une date"}
                      </h4>
                      <div className="bg-foreground/[0.02] rounded-xl p-4 border border-foreground/10">
                        {/* Month navigation */}
                        <div className="flex items-center justify-between mb-4">
                          <button
                            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                            className="p-2 hover:bg-foreground/10 rounded-lg transition-colors"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <h5 className="font-semibold">{monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</h5>
                          <button
                            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                            className="p-2 hover:bg-foreground/10 rounded-lg transition-colors"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Week days */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                          {weekDays.map((day) => (
                            <div key={day} className="text-center text-xs font-medium text-foreground/50 py-2">{day}</div>
                          ))}
                        </div>

                        {/* Calendar days */}
                        <div className="grid grid-cols-7 gap-1">
                          {calendarDays.map(({ date, day, isCurrentMonth }, idx) => {
                            const status = getDateStatus(date);
                            const isSelected = date === selectedDate;
                            const isEndSelected = date === selectedEndDate;
                            const isInRange = isRangeMode && selectedDate && selectedEndDate &&
                              date > selectedDate && date < selectedEndDate;
                            const isDisabled = status === "unavailable" || status === "past" || !isCurrentMonth;

                            return (
                              <button
                                key={idx}
                                disabled={isDisabled}
                                onClick={() => {
                                  if (isRangeMode) {
                                    if (!selectedDate || (selectedDate && selectedEndDate)) {
                                      setSelectedDate(date);
                                      setSelectedEndDate(null);
                                    } else {
                                      if (date < selectedDate) {
                                        setSelectedEndDate(selectedDate);
                                        setSelectedDate(date);
                                      } else {
                                        setSelectedEndDate(date);
                                      }
                                    }
                                  } else {
                                    setSelectedDate(date);
                                  }
                                }}
                                className={cn(
                                  "h-10 w-full text-sm font-medium rounded-lg transition-all",
                                  !isCurrentMonth && "text-foreground/20",
                                  isCurrentMonth && !isDisabled && "text-foreground hover:bg-primary/10",
                                  isDisabled && "text-foreground/20 cursor-not-allowed",
                                  status === "partial" && isCurrentMonth && "bg-amber-50 text-amber-700",
                                  (isSelected || isEndSelected) && "bg-primary text-white hover:bg-primary",
                                  isInRange && "bg-primary/20",
                                )}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-foreground/10 text-xs">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded bg-primary" />
                            <span>Sélectionné</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded bg-amber-100 border border-amber-300" />
                            <span>Partiel</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded bg-foreground/10" />
                            <span>Indisponible</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Time selection (for hourly OR same-day range) */}
                    {((!isRangeMode && selectedDate) || isSameDayRangeMode) && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-foreground flex items-center gap-2">
                            <Clock className="w-5 h-5 text-primary" />
                            {isSameDayRangeMode ? "Heure de début" : "Sélectionnez une heure"}
                          </h4>
                          {announcerPreferences && (
                            <span className="text-xs text-foreground/60 bg-foreground/5 px-2 py-1 rounded-lg">
                              Disponible : {announcerPreferences.acceptReservationsFrom} - {announcerPreferences.acceptReservationsTo}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                          {filteredTimeSlots.map((time) => {
                            const isBooked = isTimeSlotBooked(time);
                            return (
                              <button
                                key={time}
                                disabled={isBooked}
                                onClick={() => {
                                  setSelectedTime(time);
                                  // Reset end time si on change l'heure de début
                                  if (isSameDayRangeMode && selectedEndTime && time >= selectedEndTime) {
                                    setSelectedEndTime(null);
                                  }
                                }}
                                className={cn(
                                  "py-2 text-sm font-medium rounded-lg transition-all",
                                  isBooked
                                    ? "bg-red-100 text-red-400 cursor-not-allowed line-through"
                                    : selectedTime === time
                                    ? "bg-primary text-white"
                                    : "bg-foreground/5 hover:bg-primary/10"
                                )}
                                title={isBooked ? "Ce créneau est déjà réservé" : undefined}
                              >
                                {time}
                              </button>
                            );
                          })}
                        </div>

                        {/* End time selection (for same-day range) */}
                        {isSameDayRangeMode && selectedTime && (
                          <div className="mt-4">
                            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                              <Clock className="w-5 h-5 text-primary" />
                              Heure de fin
                            </h4>
                            <div className="grid grid-cols-5 gap-2">
                              {filteredTimeSlots
                                .filter(time => time > selectedTime)
                                .map((time) => {
                                  const isBooked = isTimeSlotBooked(time);
                                  return (
                                    <button
                                      key={time}
                                      disabled={isBooked}
                                      onClick={() => setSelectedEndTime(time)}
                                      className={cn(
                                        "py-2 text-sm font-medium rounded-lg transition-all",
                                        isBooked
                                          ? "bg-red-100 text-red-400 cursor-not-allowed line-through"
                                          : selectedEndTime === time
                                          ? "bg-primary text-white"
                                          : "bg-foreground/5 hover:bg-primary/10"
                                      )}
                                      title={isBooked ? "Ce créneau est déjà réservé" : undefined}
                                    >
                                      {time}
                                    </button>
                                  );
                                })}
                            </div>
                            {selectedTime && selectedEndTime && (
                              <p className="text-sm text-foreground/60 mt-2">
                                Durée : {(() => {
                                  const startMinutes = parseTimeToMinutes(selectedTime);
                                  const endMinutes = parseTimeToMinutes(selectedEndTime);
                                  const durationMinutes = endMinutes - startMinutes;
                                  const hours = Math.floor(durationMinutes / 60);
                                  const minutes = durationMinutes % 60;
                                  return hours > 0
                                    ? `${hours}h${minutes > 0 ? minutes : ""}`
                                    : `${minutes} min`;
                                })()}
                              </p>
                            )}
                          </div>
                        )}

                        {getBookedSlotsForDate(selectedDate).length > 0 && (
                          <div className="mt-3 p-2 bg-red-50 rounded-lg border border-red-100">
                            <p className="text-xs font-medium text-red-700 mb-1">
                              Créneaux déjà réservés :
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {getBookedSlotsForDate(selectedDate).map((slot: { startTime: string; endTime: string }, idx: number) => (
                                <span key={idx} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                                  {slot.startTime} - {slot.endTime}
                                </span>
                              ))}
                            </div>
                            <p className="text-xs text-red-600/70 mt-1">
                              {(bufferBefore > 0 || bufferAfter > 0) ? (
                                <>
                                  Période bloquée étendue
                                  {bufferBefore > 0 && ` de ${bufferBefore >= 60 ? `${bufferBefore / 60}h` : `${bufferBefore} min`} avant`}
                                  {bufferBefore > 0 && bufferAfter > 0 && " et"}
                                  {bufferAfter > 0 && ` de ${bufferAfter >= 60 ? `${bufferAfter / 60}h` : `${bufferAfter} min`} après`}
                                  {" "}chaque réservation
                                </>
                              ) : (
                                "Les heures barrées tombent dans cette période réservée"
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Option garde de nuit (pour plages multi-jours) */}
                    {selection?.allowOvernightStay && selectedDate && selectedEndDate && selectedDate !== selectedEndDate && priceDetails?.type === "daily_range" && (priceDetails?.days ?? 0) >= 2 && (
                      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200/50">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={includeOvernightStay}
                              onChange={(e) => setIncludeOvernightStay(e.target.checked)}
                              className="sr-only"
                            />
                            <div className={cn(
                              "w-5 h-5 rounded border-2 transition-all flex items-center justify-center",
                              includeOvernightStay
                                ? "bg-indigo-600 border-indigo-600"
                                : "border-foreground/20 group-hover:border-indigo-400"
                            )}>
                              {includeOvernightStay && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Moon className="w-4 h-4 text-indigo-600" />
                              <span className="font-medium text-foreground">Garde de nuit incluse</span>
                              {(selection.variantPricing?.nightly || selection.overnightPrice) ? (
                                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                                  +{formatPrice(selection.variantPricing?.nightly || selection.overnightPrice || 0)}/nuit
                                </span>
                              ) : null}
                            </div>
                            <p className="text-xs text-foreground/60 mt-0.5">
                              L&apos;animal reste la nuit chez l&apos;annonceur
                            </p>
                          </div>
                        </label>

                        {/* Planning détaillé si nuit incluse */}
                        {includeOvernightStay && priceDetails?.days > 1 && (
                          <div className="mt-4 pt-4 border-t border-indigo-200/50">
                            <p className="text-xs font-medium text-foreground/70 mb-2 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              Planning prévu
                            </p>
                            <div className="space-y-1.5 text-xs">
                              {Array.from({ length: priceDetails.days }).map((_, index) => {
                                const dayStart = selection.dayStartTime || "08:00";
                                const dayEnd = selection.dayEndTime || "20:00";
                                const isLastDay = index === priceDetails.days - 1;

                                return (
                                  <div key={index} className="space-y-1">
                                    <div className="flex items-center gap-2 text-foreground/80">
                                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                                      <span>Jour {index + 1}</span>
                                      <span className="text-foreground/50">{dayStart} - {dayEnd}</span>
                                    </div>
                                    {!isLastDay && (
                                      <div className="flex items-center gap-2 text-indigo-600 pl-5">
                                        <Moon className="w-3.5 h-3.5" />
                                        <span>Nuit {index + 1}</span>
                                        <span className="text-indigo-400">{dayEnd} → {dayStart}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Récapitulatif du prix */}
                    {selectedDate && priceDetails && (
                      <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 space-y-3">
                        {/* Titre et horaires annonceur */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-foreground/60 flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            Horaires de l'annonceur
                          </span>
                          <span className="font-medium text-foreground/80">
                            {announcerPreferences?.acceptReservationsFrom ?? "08:00"} - {announcerPreferences?.acceptReservationsTo ?? "20:00"}
                          </span>
                        </div>

                        {/* Détail du calcul selon le type */}
                        <div className="border-t border-foreground/10 pt-3 space-y-2">
                          {/* Plage horaire (même jour) */}
                          {priceDetails.type === "hourly_range" && (
                            <>
                              <div className="flex justify-between text-sm">
                                <span className="text-foreground/60">Date</span>
                                <span className="font-medium capitalize">{priceDetails.dateLabel}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-foreground/60">Horaire</span>
                                <span className="font-medium">{priceDetails.timeRange}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-foreground/60">Durée</span>
                                <span className="font-medium">
                                  {priceDetails.durationHours >= 1
                                    ? `${Math.floor(priceDetails.durationHours)}h${priceDetails.durationMinutes % 60 > 0 ? (priceDetails.durationMinutes % 60) + "min" : ""}`
                                    : `${priceDetails.durationMinutes} min`}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm text-foreground/60">
                                <span>Calcul</span>
                                <span>{formatPrice(priceDetails.hourlyRate)}/h × {priceDetails.durationHours.toFixed(1)}h</span>
                              </div>
                            </>
                          )}

                          {/* Plage de dates (plusieurs jours) */}
                          {priceDetails.type === "daily_range" && (
                            <>
                              <div className="flex justify-between text-sm">
                                <span className="text-foreground/60">Période</span>
                                <span className="font-medium">Du {priceDetails.startDate} au {priceDetails.endDate}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-foreground/60">Nombre de jours</span>
                                <span className="font-medium">{priceDetails.days} jour{priceDetails.days > 1 ? "s" : ""}</span>
                              </div>
                              {/* Afficher le calcul selon le type de tarif */}
                              <div className="flex justify-between text-sm text-foreground/60">
                                <span>Calcul</span>
                                <span>
                                  {priceDetails.calcType === "monthly" && priceDetails.monthlyRate ? (
                                    <>
                                      {formatPrice(priceDetails.monthlyRate)}/mois × {Math.floor(priceDetails.days / 30)}m
                                      {priceDetails.days % 30 > 0 && (
                                        <> + {formatPrice(priceDetails.dailyRate)}/j × {priceDetails.days % 30}j</>
                                      )}
                                    </>
                                  ) : priceDetails.calcType === "weekly" && priceDetails.weeklyRate ? (
                                    <>
                                      {formatPrice(priceDetails.weeklyRate)}/sem × {Math.floor(priceDetails.days / 7)}s
                                      {priceDetails.days % 7 > 0 && (
                                        <> + {formatPrice(priceDetails.dailyRate)}/j × {priceDetails.days % 7}j</>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      {formatPrice(priceDetails.dailyRate)}/jour × {priceDetails.days}j
                                      {priceDetails.hoursPerDay && ` (${priceDetails.hoursPerDay}h/jour)`}
                                    </>
                                  )}
                                </span>
                              </div>
                              {/* Afficher les nuits si garde de nuit incluse */}
                              {priceDetails.includeOvernightStay && priceDetails.nights > 0 && (
                                <div className="flex justify-between text-sm text-indigo-600">
                                  <span className="flex items-center gap-1">
                                    <Moon className="w-3.5 h-3.5" />
                                    Nuits ({priceDetails.nights})
                                  </span>
                                  <span>
                                    {formatPrice(priceDetails.nightlyRate)}/nuit × {priceDetails.nights}n = +{formatPrice(priceDetails.overnightTotal)}
                                  </span>
                                </div>
                              )}
                            </>
                          )}

                          {/* Durée fixe */}
                          {priceDetails.type === "fixed_duration" && (
                            <div className="flex justify-between text-sm text-foreground/60">
                              <span>Calcul</span>
                              <span>
                                {formatPrice(priceDetails.hourlyRate)}/h × {priceDetails.durationMinutes < 60
                                  ? `${priceDetails.durationMinutes} min`
                                  : `${Math.floor(priceDetails.durationMinutes / 60)}h${priceDetails.durationMinutes % 60 > 0 ? priceDetails.durationMinutes % 60 : ""}`}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Total */}
                        <div className="border-t border-foreground/10 pt-3 flex items-center justify-between">
                          <span className="font-semibold text-foreground">Total estimé</span>
                          <span className="text-xl font-bold text-primary">
                            {formatPrice(priceDetails.total)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Error */}
                    {bookingError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                        {bookingError}
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Footer */}
              {step === "booking" && (
                <div className="p-4 border-t border-foreground/10 bg-foreground/[0.02]">
                  <button
                    onClick={handleContinueBooking}
                    disabled={
                      isSubmitting ||
                      !selectedDate ||
                      (isSameDayRangeMode && (!selectedTime || !selectedEndTime)) ||
                      (!isRangeMode && !isSameDayRangeMode && !selectedTime)
                    }
                    className={cn(
                      "w-full py-3 rounded-xl font-semibold transition-colors",
                      isSubmitting ||
                      !selectedDate ||
                      (isSameDayRangeMode && (!selectedTime || !selectedEndTime)) ||
                      (!isRangeMode && !isSameDayRangeMode && !selectedTime)
                        ? "bg-foreground/10 text-foreground/40 cursor-not-allowed"
                        : "bg-primary text-white hover:bg-primary/90"
                    )}
                  >
                    {isSubmitting ? "Chargement..." : "Poursuivre la réservation"}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Announcer Card Component
function AnnouncerCard({
  announcer,
  isSelected,
  onClick,
  searchFilters,
}: {
  announcer: AnnouncerResult;
  isSelected: boolean;
  onClick: () => void;
  searchFilters?: {
    category?: { slug: string; name: string } | null;
    date?: string | null;
    endDate?: string | null;
  };
}) {
  const [showFormulas, setShowFormulas] = useState(false);

  const availabilityConfig = {
    available: {
      color: "text-green-600 bg-green-50",
      label: "Disponible",
      icon: CalendarCheck,
    },
    partial: {
      color: "text-amber-600 bg-amber-50",
      label: "Partiellement dispo",
      icon: AlertCircle,
    },
    unavailable: {
      color: "text-red-600 bg-red-50",
      label: announcer.availability.nextAvailable
        ? `Dispo le ${new Date(announcer.availability.nextAvailable).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`
        : "Indisponible",
      icon: AlertCircle,
    },
  };

  const availInfo = availabilityConfig[announcer.availability.status];
  const AvailIcon = availInfo.icon;

  return (
    <motion.div layout className="space-y-0">
      {/* Card principale */}
      <motion.div
        className={cn(
          "bg-white rounded-2xl p-4 shadow-md cursor-pointer transition-all",
          isSelected
            ? "ring-2 ring-primary shadow-lg"
            : "hover:shadow-lg",
          showFormulas && "rounded-b-none"
        )}
        onClick={onClick}
        whileHover={{ y: showFormulas ? 0 : -2 }}
        layout
      >
        <div className="flex gap-4">
          {/* Avatar */}
          <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
            {announcer.profileImage ? (
              <Image
                src={announcer.profileImage}
                alt={`${announcer.firstName} ${announcer.lastName}`}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">
                👤
              </div>
            )}
            {announcer.verified && (
              <div className="absolute -bottom-1 -right-1 bg-secondary text-white p-1 rounded-full">
                <CheckCircle className="w-3 h-3" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-semibold text-foreground truncate">
                {announcer.firstName} {announcer.lastName.charAt(0)}.
              </h4>
              <div className="flex items-center gap-1 text-sm">
                <Star className="w-4 h-4 fill-accent text-accent" />
                <span className="font-semibold">{announcer.rating}</span>
                <span className="text-text-light">({announcer.reviewCount})</span>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm text-text-light flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {extractCity(announcer.location)}
                {announcer.distance !== undefined && (
                  <span className="ml-1">• {announcer.distance.toFixed(1)} km</span>
                )}
              </p>
              {/* Badge statut */}
              <span
                className={cn(
                  "inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full",
                  announcer.statusType === "professionnel"
                    ? "bg-blue-100 text-blue-700"
                    : announcer.statusType === "micro_entrepreneur"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-gray-100 text-gray-600"
                )}
              >
                {announcer.statusType === "professionnel"
                  ? "Pro"
                  : announcer.statusType === "micro_entrepreneur"
                  ? "Micro-ent."
                  : "Particulier"}
              </span>
            </div>

            {/* Availability badge + Formulas count */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <div className={cn(
                "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                availInfo.color
              )}>
                <AvailIcon className="w-3 h-3" />
                {availInfo.label}
              </div>
              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-primary bg-primary/10">
                <Package className="w-3 h-3" />
                {announcer.services.length} prestation{announcer.services.length > 1 ? "s" : ""}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFormulas(!showFormulas);
                }}
                className={cn(
                  "flex items-center gap-1 text-xs font-medium transition-colors",
                  showFormulas
                    ? "text-primary"
                    : "text-primary/80 hover:text-primary"
                )}
              >
                {showFormulas ? "Masquer les prestations" : "Voir les prestations"}
                {showFormulas ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
              {announcer.basePrice && (
                <p className="font-bold text-primary">
                  {(announcer.basePrice / 100).toFixed(0)}€
                  <span className="font-normal text-text-light">/h</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Dropdown des prestations - Section séparée qui pousse le contenu vers le bas */}
      <AnimatePresence>
        {showFormulas && (
          <FormulasDropdownInline
            announcerId={announcer.id}
            searchFilters={searchFilters}
            onClose={() => setShowFormulas(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Composant dropdown inline (pousse le contenu vers le bas)
function FormulasDropdownInline({
  announcerId,
  searchFilters,
  onClose,
}: {
  announcerId: string;
  searchFilters?: {
    category?: { slug: string; name: string } | null;
    date?: string | null;
    endDate?: string | null;
  };
  onClose: () => void;
}) {
  const router = useRouter();

  // Fetch services
  const serviceDetails = useQuery(
    api.public.search.getAnnouncerServiceDetails,
    { announcerId: announcerId as Id<"users"> }
  );

  // Type for service
  type ServiceType = {
    id: string;
    category: string;
    categoryName: string;
    categoryIcon?: string;
    variants: Array<{
      id: string;
      name: string;
      price: number;
      priceUnit: string;
      pricing?: {
        hourly?: number;
        daily?: number;
        weekly?: number;
        monthly?: number;
        nightly?: number;
      };
      includedFeatures?: string[];
    }>;
    options: Array<{ id: string; name: string; price: number }>;
    // Overnight stay
    allowOvernightStay?: boolean;
    overnightPrice?: number;
    dayStartTime?: string;
    dayEndTime?: string;
    // Service location
    serviceLocation?: "announcer_home" | "client_home" | "both";
  };

  // Filter services by category if specified
  const filteredServices = (serviceDetails as ServiceType[] | undefined)?.filter((service) => {
    if (!searchFilters?.category) return true;
    return service.category === searchFilters.category.slug;
  }) || [];

  // Handle booking redirect
  const handleBookVariant = (serviceId: string, variantId: string) => {
    const params = new URLSearchParams();
    params.set("service", serviceId);
    params.set("variant", variantId);
    if (searchFilters?.date) params.set("date", searchFilters.date);
    if (searchFilters?.endDate) params.set("endDate", searchFilters.endDate);

    router.push(`/reserver/${announcerId}?${params.toString()}`);
  };

  // Get all pricing for variant
  const getVariantPricing = (variant: ServiceType["variants"][0]) => {
    const pricing = variant.pricing;
    const prices: Array<{ price: number; unit: string; label: string }> = [];

    if (pricing?.hourly) prices.push({ price: pricing.hourly, unit: "/h", label: "Heure" });
    if (pricing?.daily) prices.push({ price: pricing.daily, unit: "/jour", label: "Jour" });
    if (pricing?.weekly) prices.push({ price: pricing.weekly, unit: "/sem", label: "Semaine" });
    if (pricing?.monthly) prices.push({ price: pricing.monthly, unit: "/mois", label: "Mois" });

    // If no pricing object, use default price
    if (prices.length === 0) {
      const priceUnitLabels: Record<string, string> = {
        hour: "/h",
        day: "/jour",
        week: "/sem",
        month: "/mois",
        flat: "",
      };
      prices.push({ price: variant.price, unit: priceUnitLabels[variant.priceUnit] || "", label: "" });
    }

    return prices;
  };

  // Get display price for variant (main price)
  const getVariantDisplayPrice = (variant: ServiceType["variants"][0]) => {
    const pricing = variant.pricing;
    if (pricing?.daily) return { price: pricing.daily, unit: "/jour" };
    if (pricing?.hourly) return { price: pricing.hourly, unit: "/h" };
    if (pricing?.weekly) return { price: pricing.weekly, unit: "/sem" };
    if (pricing?.monthly) return { price: pricing.monthly, unit: "/mois" };
    const priceUnitLabels: Record<string, string> = {
      hour: "/h",
      day: "/jour",
      week: "/sem",
      month: "/mois",
      flat: "",
    };
    return { price: variant.price, unit: priceUnitLabels[variant.priceUnit] || "" };
  };

  // Get service location label
  const getServiceLocationLabel = (location?: string) => {
    switch (location) {
      case "announcer_home": return "Chez le pet-sitter";
      case "client_home": return "A domicile";
      case "both": return "A domicile ou chez le pet-sitter";
      default: return null;
    }
  };

  // Get service location icon
  const getServiceLocationIcon = (location?: string) => {
    switch (location) {
      case "announcer_home": return "🏠";
      case "client_home": return "🚗";
      case "both": return "🏠🚗";
      default: return null;
    }
  };

  // Format price
  const formatPrice = (cents: number): string => {
    return (cents / 100).toFixed(0) + "€";
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="bg-gray-50 rounded-b-2xl border-t border-gray-200 shadow-md">
        {/* Loading State */}
        {!serviceDetails && (
          <div className="p-6 flex items-center justify-center">
            <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
            <span className="ml-2 text-sm text-text-light">Chargement des prestations...</span>
          </div>
        )}

        {/* No Services */}
        {serviceDetails && filteredServices.length === 0 && (
          <div className="p-4 text-center text-sm text-text-light">
            Aucune prestation disponible
          </div>
        )}

        {/* Services List */}
        {filteredServices.length > 0 && (
          <div className="p-4 space-y-4">
            {filteredServices.map((service: ServiceType) => (
              <div key={service.id} className="space-y-3">
                {/* Service Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {service.categoryIcon && (
                      <span className="text-base">{service.categoryIcon}</span>
                    )}
                    <span className="text-sm font-semibold text-foreground">
                      {service.categoryName}
                    </span>
                  </div>
                </div>

                {/* Service Info Badges */}
                <div className="flex flex-wrap gap-2">
                  {/* Service Location */}
                  {service.serviceLocation && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg">
                      {getServiceLocationIcon(service.serviceLocation)}
                      {getServiceLocationLabel(service.serviceLocation)}
                    </span>
                  )}
                  {/* Overnight Stay */}
                  {service.allowOvernightStay && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-lg">
                      🌙 Garde de nuit
                      {service.overnightPrice && (
                        <span className="font-bold ml-1">{formatPrice(service.overnightPrice)}/nuit</span>
                      )}
                    </span>
                  )}
                </div>

                {/* Variants */}
                <div className="space-y-2">
                  {service.variants.map((variant) => {
                    const allPrices = getVariantPricing(variant);
                    const displayPrice = getVariantDisplayPrice(variant);
                    return (
                      <div
                        key={variant.id}
                        className="p-3 bg-white rounded-xl border border-gray-100 hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              {variant.name}
                            </p>
                            {variant.includedFeatures && variant.includedFeatures.length > 0 && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <Check className="w-3 h-3 text-secondary flex-shrink-0" />
                                <span className="text-xs text-text-light truncate">
                                  {variant.includedFeatures[0]}
                                  {variant.includedFeatures.length > 1 && ` +${variant.includedFeatures.length - 1}`}
                                </span>
                              </div>
                            )}
                            {/* Multiple prices display */}
                            {allPrices.length > 1 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {allPrices.map((p, idx) => (
                                  <span key={idx} className="text-xs bg-gray-100 px-2 py-0.5 rounded-md text-foreground">
                                    {formatPrice(p.price)}{p.unit}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-sm font-bold text-primary whitespace-nowrap">
                              {formatPrice(displayPrice.price)}
                              <span className="text-xs font-normal text-text-light">
                                {displayPrice.unit}
                              </span>
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBookVariant(service.id, variant.id);
                              }}
                              className="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1"
                            >
                              Réserver
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Options preview */}
                {service.options.length > 0 && (
                  <p className="text-xs text-text-light">
                    +{service.options.length} option{service.options.length > 1 ? "s" : ""} disponible{service.options.length > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            ))}

            {/* View All Link */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/reserver/${announcerId}`);
              }}
              className="w-full py-2.5 text-sm text-center text-white bg-primary font-medium rounded-xl hover:bg-primary/90 transition-colors"
            >
              Voir toutes les prestations et réserver
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function SearchMapSection() {
  const {
    filters,
    results,
    isLoading,
    setCategory,
    setAnimalType,
    setLocation,
    setRadius,
    setDate,
    setTime,
    setEndTime,
    setDateRange,
    setIncludeUnavailable,
    resetFilters,
  } = useSearch();

  const [selectedAnnouncer, setSelectedAnnouncer] = useState<AnnouncerResult | null>(null);
  const [mapStyle, setMapStyle] = useState<"default" | "plan">("default");

  // Convert results to map-compatible format (only those with coordinates)
  const mapSitters = results
    .filter((r: AnnouncerResult) => r.coordinates !== undefined)
    .map((r: AnnouncerResult) => ({
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      avatar: "👤",
      profileImage: r.profileImage ?? null,
      location: r.location,
      coordinates: r.coordinates!,
      services: r.services,
      rating: r.rating,
      reviewCount: r.reviewCount,
      hourlyRate: r.basePrice ? r.basePrice / 100 : 20,
      verified: r.verified,
      available: r.availability.status === "available",
      acceptedAnimals: r.acceptedAnimals,
      distance: r.distance,
      statusType: r.statusType,
      basePrice: r.basePrice,
    }));

  const hasActiveFilters =
    filters.category !== null ||
    filters.animalType !== null ||
    filters.location.text !== "" ||
    filters.date !== null ||
    filters.startDate !== null;

  return (
    <section id="recherche" className="pt-32 pb-20 bg-gradient-to-b from-primary/5 via-background to-background relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 text-6xl opacity-20 animate-float">🐕</div>
        <div className="absolute top-40 right-20 text-5xl opacity-20 animate-float" style={{ animationDelay: "0.5s" }}>🐈</div>
        <div className="absolute bottom-40 left-20 text-4xl opacity-20 animate-float" style={{ animationDelay: "1s" }}>🐰</div>
        <div className="absolute bottom-20 right-10 text-5xl opacity-20 animate-float" style={{ animationDelay: "1.5s" }}>🦜</div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="inline-block mb-4"
          >
            <span className="text-6xl">🐾</span>
          </motion.div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4">
            Trouvez le <span className="text-primary">professionnel idéal</span>
            <br />pour votre animal
          </h1>
          <p className="text-text-light text-lg md:text-xl max-w-2xl mx-auto">
            Recherchez par service, localisation et disponibilité pour trouver
            le prestataire parfait pour votre compagnon
          </p>
        </motion.div>

        {/* Category Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <CategorySelector
            selectedCategory={filters.category}
            onSelect={setCategory}
          />
        </motion.div>

        {/* Search Bar with Location, Radius and Animal Type */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="max-w-4xl mx-auto mb-6"
        >
          <div className="flex flex-col md:flex-row gap-4 items-stretch">
            {/* Location */}
            <div className="flex-1">
              <LocationSearchBar
                value={filters.location}
                onChange={setLocation}
                onGeolocationRequest={() => setMapStyle("plan")}
                placeholder="Ville, code postal..."
              />
            </div>

            {/* Radius selector */}
            <div className="relative">
              <div className="flex items-center gap-2 h-full px-4 py-3 rounded-xl border-2 border-foreground/10 bg-white">
                <Target className="w-5 h-5 text-primary" />
                <select
                  value={filters.radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="bg-transparent text-foreground font-medium focus:outline-none cursor-pointer pr-2"
                >
                  <option value={5}>5 km</option>
                  <option value={10}>10 km</option>
                  <option value={15}>15 km</option>
                  <option value={20}>20 km</option>
                  <option value={30}>30 km</option>
                  <option value={50}>50 km</option>
                </select>
              </div>
            </div>

            {/* Animal Type */}
            <AnimalTypeDropdown
              value={filters.animalType}
              onChange={setAnimalType}
            />
          </div>
        </motion.div>

        {/* Date Selector (conditional based on category) */}
        {filters.category && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto mb-6 flex justify-center"
          >
            <DateSelector
              billingType={filters.category.billingType}
              date={filters.date}
              time={filters.time}
              onDateChange={setDate}
              onTimeChange={setTime}
              startDate={filters.startDate}
              endDate={filters.endDate}
              onDateRangeChange={setDateRange}
              allowRangeBooking={filters.category.allowRangeBooking}
              endTime={filters.endTime}
              onEndTimeChange={setEndTime}
            />
          </motion.div>
        )}

        {/* Options row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-4xl mx-auto mb-8 flex flex-wrap items-center justify-center gap-4"
        >
          {/* Include unavailable toggle */}
          <label className="flex items-center gap-2 cursor-pointer px-4 py-2 rounded-xl border-2 border-foreground/10 bg-white hover:border-foreground/20 transition-all">
            <input
              type="checkbox"
              checked={filters.includeUnavailable}
              onChange={(e) => setIncludeUnavailable(e.target.checked)}
              className="w-4 h-4 rounded border-foreground/20 text-primary focus:ring-primary"
            />
            {filters.includeUnavailable ? (
              <Eye className="w-4 h-4 text-primary" />
            ) : (
              <EyeOff className="w-4 h-4 text-text-light" />
            )}
            <span className="text-sm text-foreground">Voir aussi les indisponibles</span>
          </label>

          {/* Reset filters */}
          {hasActiveFilters && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={resetFilters}
              className="flex items-center gap-2 px-4 py-2 text-sm text-primary hover:bg-primary/5 rounded-xl transition-colors"
            >
              <X className="w-4 h-4" />
              Réinitialiser les filtres
            </motion.button>
          )}
        </motion.div>

        {/* Results count */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mb-6"
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
              <p className="text-text-light">Recherche en cours...</p>
            </div>
          ) : (
            <p className="text-text-light">
              <span className="font-semibold text-foreground">{results.length}</span>{" "}
              professionnel{results.length > 1 ? "s" : ""} trouvé{results.length > 1 ? "s" : ""}
              {hasActiveFilters && " avec vos critères"}
            </p>
          )}
        </motion.div>

        {/* Map and Results */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Announcer List */}
          <div className="order-2 lg:order-1">
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
              {results.length === 0 && !isLoading ? (
                <div className="bg-white rounded-2xl p-8 text-center shadow-md">
                  <div className="text-5xl mb-4">🔍</div>
                  <h4 className="font-semibold text-foreground mb-2">
                    Aucun résultat
                  </h4>
                  <p className="text-text-light mb-4">
                    {hasActiveFilters
                      ? "Essayez de modifier vos critères de recherche"
                      : "Aucun professionnel disponible pour le moment"}
                  </p>
                  {hasActiveFilters && (
                    <motion.button
                      onClick={resetFilters}
                      className="px-4 py-2 bg-primary text-white rounded-xl font-medium"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Réinitialiser les filtres
                    </motion.button>
                  )}
                </div>
              ) : (
                results.map((announcer: AnnouncerResult) => (
                  <AnnouncerCard
                    key={announcer.id}
                    announcer={announcer}
                    isSelected={selectedAnnouncer?.id === announcer.id}
                    onClick={() => setSelectedAnnouncer(announcer)}
                    searchFilters={{
                      category: filters.category,
                      date: filters.date,
                      endDate: filters.endDate,
                    }}
                  />
                ))
              )}
            </div>
          </div>

          {/* Map */}
          <div className="order-1 lg:order-2">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden h-[400px] lg:h-[600px] sticky top-4">
              <MapComponent
                sitters={mapSitters}
                selectedSitter={
                  selectedAnnouncer
                    ? mapSitters.find((s: { id: string }) => s.id === selectedAnnouncer.id) ?? null
                    : null
                }
                onSitterSelect={(sitter) => {
                  const found = results.find((r: AnnouncerResult) => r.id === sitter.id);
                  if (found) setSelectedAnnouncer(found);
                }}
                searchCenter={filters.location.coordinates ?? null}
                searchRadius={filters.radius}
                mapStyle={mapStyle}
              />
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center mt-10"
        >
          <p className="text-text-light mb-4">
            Vous êtes un professionnel des services animaliers ?
          </p>
          <motion.button
            className="px-6 py-3 bg-secondary text-white rounded-xl font-semibold"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Rejoignez notre communauté
          </motion.button>
        </motion.div>
      </div>

    </section>
  );
}
