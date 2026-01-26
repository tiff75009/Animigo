"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle,
  MapPin,
  Calendar,
  CalendarCheck,
  Clock,
  User,
  Users,
  Mail,
  Phone,
  Lock,
  Loader2,
  AlertCircle,
  PawPrint,
  CreditCard,
  FileText,
  Sparkles,
  Plus,
  Check,
  Percent,
  Info,
  Moon,
  Sun,
  Package,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AnimalSelector, GuestAnimalForm, type GuestAnimalData } from "@/app/components/animals";
import AddressAutocomplete from "@/app/components/ui/AddressAutocomplete";
import ConfirmationModal from "@/app/components/ui/ConfirmationModal";

// Types
interface ServiceOption {
  id: string;
  name: string;
  description?: string;
  price: number;
  priceUnit?: string;
}

// Type pour les séances multi-sessions
interface SessionData {
  date: string;
  startTime: string;
  endTime: string;
}

// Type pour les créneaux collectifs
interface CollectiveSlotData {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  availableSpots: number;
}

interface PendingBookingData {
  id: Id<"pendingBookings">;
  announcer: {
    id: Id<"users">;
    firstName: string;
    lastName: string;
    profileImage: string | null;
    location: string;
    verified: boolean;
    accountType: string;
    companyType?: string;
    statusType: "particulier" | "micro_entrepreneur" | "professionnel";
  };
  service: {
    id: Id<"services">;
    category: string;
    categoryName: string;
    categoryIcon?: string;
    // Overnight settings from service
    allowOvernightStay?: boolean;
    dayStartTime?: string;
    dayEndTime?: string;
    overnightPrice?: number;
    // Duration-based blocking
    enableDurationBasedBlocking?: boolean;
  };
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
    // Support formules collectives/multi-séances
    numberOfSessions?: number;
    sessionInterval?: number;
    sessionType?: "individual" | "collective";
    animalTypes?: string[];
  } | null;
  options: Array<{ id: string; name: string; price: number }>;
  availableOptions: ServiceOption[];
  dates: {
    startDate: string;
    endDate: string;
    startTime?: string;
    endTime?: string;
  };
  amount: number;
  // Overnight booking data
  overnight?: {
    includeOvernightStay?: boolean;
    overnightNights?: number;
    overnightAmount?: number;
  };
  serviceLocation?: "announcer_home" | "client_home";
  // Support formules collectives
  collectiveSlotIds?: Id<"collectiveSlots">[];
  collectiveSlots?: CollectiveSlotData[];
  animalCount?: number;
  selectedAnimalType?: string;
  // Support formules multi-séances
  sessions?: SessionData[];
  userId?: Id<"users">;
  expiresAt: number;
}

interface GuestData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

// Smart price calculation result interface
interface PriceCalculationResult {
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
  hourlyRate: number;
  dailyRate: number;
  nightlyRate: number;
}

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
function daysBetweenDates(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
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
  const totalDays = daysBetweenDates(startDate, effectiveEndDate) + 1;

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
  const firstDayHours = calculateHoursBetween(effectiveStartTime, firstDayEndTime);
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
  const lastDayHours = calculateHoursBetween(lastDayStartTime, effectiveEndTime);
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

// Format hours for display
function formatHoursDisplay(hours: number): string {
  if (hours === Math.floor(hours)) {
    return `${hours}h`;
  }
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}h${minutes.toString().padStart(2, "0")}`;
}


function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  return minutes === "00" ? `${parseInt(hours)}h` : `${parseInt(hours)}h${minutes}`;
}

function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

// Formater la durée en heures/minutes
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h${mins}` : `${hours}h`;
}

// Calculer l'heure de fin à partir de l'heure de début et de la durée
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
}

// Calculer le prix du service basé sur le taux horaire et la durée
function calculateServicePrice(hourlyRateCents: number, durationMinutes: number): number {
  // Prix = taux horaire × (durée en heures)
  return Math.round((hourlyRateCents * durationMinutes) / 60);
}

function extractCity(location: string): string {
  // Location formats: "Paris 11e", "75011 Paris", "Rue X, Paris 11e", etc.
  const parts = location.split(",").map((p) => p.trim());
  const lastPart = parts[parts.length - 1];
  // If it starts with a number (zip code), try to get just the city name
  if (/^\d/.test(lastPart)) {
    const cityMatch = lastPart.match(/\d+\s+(.+)/);
    return cityMatch ? cityMatch[1] : lastPart;
  }
  return lastPart;
}

export default function ReservationPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  const router = useRouter();

  // State
  const [token, setToken] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedAnimalId, setSelectedAnimalId] = useState<Id<"animals"> | null>(null);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  // Guest data
  const [guestData, setGuestData] = useState<GuestData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [guestAnimalData, setGuestAnimalData] = useState<GuestAnimalData>({
    name: "",
    type: "",
    gender: "unknown",
    compatibilityTraits: [],
    behaviorTraits: [],
    needsTraits: [],
    customTraits: [],
  });
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [addressPreFilled, setAddressPreFilled] = useState(false);

  // Récupérer le token au chargement
  useEffect(() => {
    const storedToken = localStorage.getItem("auth_token");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  // Vérifier la session
  const sessionData = useQuery(
    api.auth.session.getSession,
    token ? { token } : "skip"
  );

  useEffect(() => {
    if (sessionData?.user) {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }
  }, [sessionData]);

  // Récupérer les données de la réservation
  const bookingData = useQuery(
    api.public.booking.getPendingBooking,
    { bookingId: bookingId as Id<"pendingBookings"> }
  );

  // Récupérer le taux de commission basé sur le type d'annonceur
  const commissionData = useQuery(
    api.admin.commissions.getCommissionRate,
    bookingData?.announcer?.statusType
      ? { announcerType: bookingData.announcer.statusType }
      : "skip"
  );

  // Workday config from admin settings
  const workdayConfig = useQuery(api.admin.config.getWorkdayConfig);
  const workdayHours = workdayConfig?.workdayHours ?? 8;

  // Announcer availability preferences
  const announcerPreferences = useQuery(
    api.public.search.getAnnouncerAvailabilityPreferences,
    bookingData?.announcer?.id
      ? { announcerId: bookingData.announcer.id }
      : "skip"
  );

  // Mutations
  const finalizeBooking = useMutation(api.public.booking.finalizeBooking);
  const finalizeAsGuest = useMutation(api.public.booking.finalizeBookingAsGuest);
  const login = useMutation(api.auth.login.login);

  // Vérifier si la réservation est expirée
  const isExpired = bookingData && bookingData.expiresAt < Date.now();

  // Initialiser les options sélectionnées depuis les données de réservation
  useEffect(() => {
    if (bookingData?.options) {
      setSelectedOptionIds(bookingData.options.map((opt: ServiceOption) => opt.id));
    }
  }, [bookingData?.options]);

  // Pré-remplir l'adresse depuis le profil utilisateur si réservation à domicile
  useEffect(() => {
    if (
      sessionData?.user?.location &&
      bookingData?.serviceLocation === "client_home" &&
      !addressPreFilled
    ) {
      setAddress(sessionData.user.location);
      setAddressPreFilled(true);
    }
  }, [sessionData?.user?.location, bookingData?.serviceLocation, addressPreFilled]);

  // Détecter le type de formule
  const isCollectiveFormula = bookingData?.variant?.sessionType === "collective" ||
    (bookingData?.collectiveSlots && bookingData.collectiveSlots.length > 0);
  const isMultiSessionFormula = !isCollectiveFormula &&
    ((bookingData?.variant?.numberOfSessions ?? 1) > 1 ||
    (bookingData?.sessions && bookingData.sessions.length > 1));
  const numberOfSessions = bookingData?.variant?.numberOfSessions || 1;
  const effectiveAnimalCount = bookingData?.animalCount || 1;

  // Calculer le nombre de jours/séances selon le type de formule
  const calculateDays = () => {
    if (!bookingData) return 1;
    // Formule collective: nombre de créneaux
    if (isCollectiveFormula && bookingData.collectiveSlots) {
      return bookingData.collectiveSlots.length || numberOfSessions;
    }
    // Formule multi-séances: nombre de séances
    if (isMultiSessionFormula && bookingData.sessions) {
      return bookingData.sessions.length || numberOfSessions;
    }
    // Formule uni-séance: calcul classique
    const start = new Date(bookingData.dates.startDate);
    const end = new Date(bookingData.dates.endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const daysCount = calculateDays();

  // Calculer le total des options sélectionnées
  const optionsTotal = selectedOptionIds.reduce((sum, optId) => {
    const option = bookingData?.availableOptions?.find((o: ServiceOption) => o.id === optId);
    return sum + (option?.price || 0);
  }, 0);

  // Smart price calculation (seulement pour les formules uni-séance classiques)
  const priceCalculation: PriceCalculationResult | null = (() => {
    if (!bookingData?.variant) return null;
    // Ne pas utiliser le calcul smart pour les formules collectives/multi-séances
    if (isCollectiveFormula || isMultiSessionFormula) return null;

    const pricing = bookingData.variant.pricing;

    // Get announcer working hours
    const dayStartTime = bookingData.service.dayStartTime ||
                         announcerPreferences?.acceptReservationsFrom || "08:00";
    const dayEndTime = bookingData.service.dayEndTime ||
                       announcerPreferences?.acceptReservationsTo || "20:00";

    // For duration-based blocking, use the variant's fixed price
    const useDurationBasedPricing = bookingData.service.enableDurationBasedBlocking && bookingData.variant.duration;

    return calculateSmartPrice({
      startDate: bookingData.dates.startDate,
      endDate: bookingData.dates.endDate,
      startTime: bookingData.dates.startTime || null,
      endTime: bookingData.dates.endTime || null,
      includeOvernightStay: bookingData.overnight?.includeOvernightStay || false,
      dayStartTime,
      dayEndTime,
      workdayHours,
      pricing: {
        hourly: pricing?.hourly || bookingData.variant.price,
        daily: pricing?.daily,
        nightly: pricing?.nightly || bookingData.service.overnightPrice,
      },
      optionsTotal,
      // Pass fixed price and duration for duration-based blocking
      fixedServicePrice: useDurationBasedPricing ? bookingData.variant.price : undefined,
      serviceDurationMinutes: useDurationBasedPricing ? bookingData.variant.duration : undefined,
    });
  })();

  // Extract values from price calculation
  const serviceBasePrice = priceCalculation
    ? priceCalculation.firstDayAmount + priceCalculation.fullDaysAmount + priceCalculation.lastDayAmount
    : 0;
  const overnightAmount = priceCalculation?.nightsAmount ?? 0;

  // Calculer le montant total selon le type de formule
  const totalAmount = (() => {
    if (!bookingData?.variant) return 0;
    // Formule collective: prix × séances × animaux + options
    if (isCollectiveFormula) {
      const basePrice = bookingData.variant.price * numberOfSessions * effectiveAnimalCount;
      return basePrice + optionsTotal;
    }
    // Formule multi-séances: prix × séances + options
    if (isMultiSessionFormula) {
      const basePrice = bookingData.variant.price * numberOfSessions;
      return basePrice + optionsTotal;
    }
    // Formule uni-séance: utiliser le calcul smart
    return priceCalculation?.totalAmount ?? 0;
  })();

  const isMultiDay = bookingData?.dates.endDate !== bookingData?.dates.startDate;

  // Calculer la commission
  const commissionRate = commissionData?.rate ?? 0;
  const commissionAmount = Math.round((totalAmount * commissionRate) / 100);
  const totalWithCommission = totalAmount + commissionAmount;

  // Toggle option selection
  const toggleOption = (optionId: string) => {
    setSelectedOptionIds((prev) =>
      prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId]
    );
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const result = await login({
        email: loginEmail,
        password: loginPassword,
      });

      if (result.success && result.token) {
        localStorage.setItem("auth_token", result.token);
        setToken(result.token);
        setIsLoggedIn(true);
        setShowLoginForm(false);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
    }
  };

  // Validation côté client
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (isLoggedIn) {
      // Validation utilisateur connecté
      if (!selectedAnimalId) {
        errors.animal = "Veuillez sélectionner un animal";
      }
    } else {
      // Validation invité
      if (!guestData.firstName.trim()) {
        errors.firstName = "Le prénom est requis";
      }
      if (!guestData.lastName.trim()) {
        errors.lastName = "Le nom est requis";
      }
      if (!guestData.email.trim()) {
        errors.email = "L'email est requis";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestData.email)) {
        errors.email = "L'email n'est pas valide";
      }
      if (!guestData.phone.trim()) {
        errors.phone = "Le téléphone est requis";
      }
      if (guestData.password.length < 6) {
        errors.password = "Le mot de passe doit contenir au moins 6 caractères";
      }
      if (guestData.password !== guestData.confirmPassword) {
        errors.confirmPassword = "Les mots de passe ne correspondent pas";
      }
      if (!guestAnimalData.name.trim()) {
        errors.animalName = "Le nom de l'animal est requis";
      }
      if (!guestAnimalData.type) {
        errors.animalType = "Le type d'animal est requis";
      }
    }

    // Validation commune
    if (!address.trim()) {
      errors.address = "L'adresse est requise";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Extraire le message d'erreur d'une ConvexError
  const extractErrorMessage = (err: unknown): string => {
    if (err && typeof err === "object") {
      // ConvexError stocke le message dans data
      if ("data" in err && typeof err.data === "string") {
        return err.data;
      }
      // Erreur standard avec message
      if ("message" in err && typeof err.message === "string") {
        return err.message;
      }
    }
    return "Une erreur est survenue. Veuillez réessayer.";
  };

  // Ouvrir la modale de confirmation après validation
  const handleOpenConfirmation = () => {
    if (!bookingData) return;

    // Validation côté client
    if (!validateForm()) {
      setError("Veuillez corriger les erreurs dans le formulaire");
      return;
    }

    setError(null);
    setFieldErrors({});
    setShowConfirmationModal(true);
  };

  // Soumettre la réservation après confirmation dans la modale
  const handleSubmit = async () => {
    if (!bookingData) return;

    setIsSubmitting(true);
    setError(null);

    try {
      if (isLoggedIn && token && selectedAnimalId) {
        // Utilisateur connecté
        const result = await finalizeBooking({
          token,
          bookingId: bookingId as Id<"pendingBookings">,
          animalId: selectedAnimalId,
          location: address,
          city: city || undefined,
          coordinates: coordinates || undefined,
          notes: notes || undefined,
          updatedOptionIds: selectedOptionIds,
          updatedAmount: totalAmount, // Prix du service (sans commission) - la commission sera calculée côté backend
        });

        if (result.success) {
          setShowConfirmationModal(false);
          router.push(`/dashboard?tab=missions&success=booking`);
        }
      } else {
        // Invité
        const result = await finalizeAsGuest({
          bookingId: bookingId as Id<"pendingBookings">,
          userData: {
            firstName: guestData.firstName.trim(),
            lastName: guestData.lastName.trim(),
            email: guestData.email.trim().toLowerCase(),
            phone: guestData.phone.trim(),
            password: guestData.password,
          },
          animalData: {
            name: guestAnimalData.name.trim(),
            type: guestAnimalData.type,
            gender: guestAnimalData.gender,
            breed: guestAnimalData.breed?.trim() || undefined,
            birthDate: guestAnimalData.birthDate || undefined,
            description: guestAnimalData.description?.trim() || undefined,
            compatibilityTraits: guestAnimalData.compatibilityTraits.length > 0 ? guestAnimalData.compatibilityTraits : undefined,
            behaviorTraits: guestAnimalData.behaviorTraits.length > 0 ? guestAnimalData.behaviorTraits : undefined,
            needsTraits: guestAnimalData.needsTraits.length > 0 ? guestAnimalData.needsTraits : undefined,
            customTraits: guestAnimalData.customTraits.length > 0 ? guestAnimalData.customTraits : undefined,
            specialNeeds: guestAnimalData.specialNeeds?.trim() || undefined,
            medicalConditions: guestAnimalData.medicalConditions?.trim() || undefined,
          },
          location: address.trim(),
          city: city || undefined,
          coordinates: coordinates || undefined,
          notes: notes?.trim() || undefined,
          updatedOptionIds: selectedOptionIds,
          updatedAmount: totalAmount, // Prix du service (sans commission) - la commission sera calculée côté backend
        });

        if (result.success && result.token) {
          localStorage.setItem("auth_token", result.token);
          setShowConfirmationModal(false);

          // Si l'email doit être vérifié, rediriger vers une page de confirmation
          if (result.requiresEmailVerification) {
            router.push(`/reservation/confirmation-email?email=${encodeURIComponent(guestData.email.trim().toLowerCase())}`);
          } else {
            router.push(`/dashboard?tab=missions&success=booking`);
          }
        }
      }
    } catch (err) {
      console.error("Erreur:", err);
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
      setShowConfirmationModal(false);

      // Si l'erreur concerne l'email existant, ajouter une erreur de champ
      if (errorMessage.includes("email") || errorMessage.includes("compte existe")) {
        setFieldErrors(prev => ({ ...prev, email: errorMessage }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (bookingData === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
          <p className="text-text-light">Chargement de votre réservation...</p>
        </div>
      </div>
    );
  }

  // Not found or expired
  if (!bookingData || isExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md bg-white rounded-3xl shadow-xl p-8"
        >
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">
            {isExpired ? "Réservation expirée" : "Réservation introuvable"}
          </h1>
          <p className="text-text-light mb-8">
            {isExpired
              ? "Cette réservation a expiré. Les réservations sont valides pendant 24 heures. Veuillez recommencer votre recherche."
              : "Cette réservation n'existe pas ou a déjà été finalisée."}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour à l&apos;accueil
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="container max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-text-light hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Retour</span>
            </button>
            <h1 className="text-lg font-bold text-foreground">
              Finaliser la réservation
            </h1>
            <div className="w-20" />
          </div>
        </div>
      </div>

      <div className="container max-w-5xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Colonne principale */}
          <div className="lg:col-span-3 space-y-6">
            {/* Section Authentification (si non connecté) */}
            {!isLoggedIn && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm overflow-hidden"
              >
                <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Vos informations
                  </h2>
                </div>
                <div className="p-6">
                  {showLoginForm ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Email
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="email"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            placeholder="votre@email.com"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Mot de passe
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="password"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            placeholder="••••••••"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowLoginForm(false)}
                          className="flex-1 py-3 border border-gray-200 text-foreground font-medium rounded-xl hover:bg-gray-50 transition-colors"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors"
                        >
                          Se connecter
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowLoginForm(true)}
                        className="w-full py-3 border-2 border-primary text-primary font-semibold rounded-xl hover:bg-primary/5 transition-colors mb-6"
                      >
                        J&apos;ai déjà un compte
                      </button>

                      <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center">
                          <span className="bg-white px-4 text-sm text-text-light">
                            ou créez un compte
                          </span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Prénom <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={guestData.firstName}
                              onChange={(e) =>
                                setGuestData({ ...guestData, firstName: e.target.value })
                              }
                              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                                fieldErrors.firstName ? "border-red-500 bg-red-50" : "border-gray-200"
                              }`}
                              placeholder="Jean"
                            />
                            {fieldErrors.firstName && (
                              <p className="mt-1 text-sm text-red-500">{fieldErrors.firstName}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Nom <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={guestData.lastName}
                              onChange={(e) =>
                                setGuestData({ ...guestData, lastName: e.target.value })
                              }
                              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                                fieldErrors.lastName ? "border-red-500 bg-red-50" : "border-gray-200"
                              }`}
                              placeholder="Dupont"
                            />
                            {fieldErrors.lastName && (
                              <p className="mt-1 text-sm text-red-500">{fieldErrors.lastName}</p>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Email <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                              type="email"
                              value={guestData.email}
                              onChange={(e) =>
                                setGuestData({ ...guestData, email: e.target.value })
                              }
                              className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                                fieldErrors.email ? "border-red-500 bg-red-50" : "border-gray-200"
                              }`}
                              placeholder="votre@email.com"
                            />
                          </div>
                          {fieldErrors.email && (
                            <p className="mt-1 text-sm text-red-500">{fieldErrors.email}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Téléphone <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                              type="tel"
                              value={guestData.phone}
                              onChange={(e) =>
                                setGuestData({ ...guestData, phone: e.target.value })
                              }
                              className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                                fieldErrors.phone ? "border-red-500 bg-red-50" : "border-gray-200"
                              }`}
                              placeholder="06 12 34 56 78"
                            />
                          </div>
                          {fieldErrors.phone && (
                            <p className="mt-1 text-sm text-red-500">{fieldErrors.phone}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Mot de passe <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <input
                                type="password"
                                value={guestData.password}
                                onChange={(e) =>
                                  setGuestData({ ...guestData, password: e.target.value })
                                }
                                className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                                  fieldErrors.password ? "border-red-500 bg-red-50" : "border-gray-200"
                                }`}
                                placeholder="••••••••"
                              />
                            </div>
                            {fieldErrors.password && (
                              <p className="mt-1 text-sm text-red-500">{fieldErrors.password}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Confirmer <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="password"
                              value={guestData.confirmPassword}
                              onChange={(e) =>
                                setGuestData({ ...guestData, confirmPassword: e.target.value })
                              }
                              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                                fieldErrors.confirmPassword ||
                                (guestData.confirmPassword &&
                                guestData.password !== guestData.confirmPassword)
                                  ? "border-red-500 bg-red-50"
                                  : "border-gray-200"
                              }`}
                              placeholder="••••••••"
                            />
                            {fieldErrors.confirmPassword && (
                              <p className="mt-1 text-sm text-red-500">{fieldErrors.confirmPassword}</p>
                            )}
                          </div>
                        </div>
                        {guestData.password.length > 0 && guestData.password.length < 6 && !fieldErrors.password && (
                          <p className="text-sm text-amber-600 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            Le mot de passe doit contenir au moins 6 caractères
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {/* Section Animal */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              <div className="bg-gradient-to-r from-secondary to-secondary/80 px-6 py-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <PawPrint className="w-5 h-5" />
                  Votre animal
                </h2>
              </div>
              <div className="p-6">
                {isLoggedIn && token ? (
                  <>
                    <AnimalSelector
                      token={token}
                      selectedAnimalId={selectedAnimalId}
                      onSelect={setSelectedAnimalId}
                      compact
                    />
                    {fieldErrors.animal && (
                      <p className="mt-3 text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {fieldErrors.animal}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <GuestAnimalForm
                      data={guestAnimalData}
                      onChange={setGuestAnimalData}
                    />
                    {(fieldErrors.animalName || fieldErrors.animalType) && (
                      <p className="mt-3 text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {fieldErrors.animalName || fieldErrors.animalType}
                      </p>
                    )}
                  </>
                )}
              </div>
            </motion.div>

            {/* Section Options */}
            {bookingData.availableOptions && bookingData.availableOptions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white rounded-2xl shadow-sm overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Plus className="w-5 h-5 text-primary" />
                    Options supplémentaires
                  </h2>
                  <p className="text-sm text-text-light mt-1">
                    Personnalisez votre prestation avec des services additionnels
                  </p>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {bookingData.availableOptions.map((option: ServiceOption) => {
                      const isSelected = selectedOptionIds.includes(option.id);
                      return (
                        <div
                          key={option.id}
                          onClick={() => toggleOption(option.id)}
                          className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          {/* Checkbox */}
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                              isSelected
                                ? "bg-primary text-white"
                                : "border-2 border-gray-300"
                            }`}
                          >
                            {isSelected && <Check className="w-4 h-4" />}
                          </div>

                          {/* Contenu */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="font-medium text-foreground">
                                {option.name}
                              </h4>
                              <span className="text-primary font-semibold whitespace-nowrap">
                                +{formatPrice(option.price)}
                                {option.priceUnit && (
                                  <span className="text-xs text-text-light font-normal">
                                    /{option.priceUnit}
                                  </span>
                                )}
                              </span>
                            </div>
                            {option.description && (
                              <p className="text-sm text-text-light mt-1">
                                {option.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Section Adresse */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-sm overflow-visible relative z-20"
            >
              <div className="bg-gradient-to-r from-accent to-accent/80 px-6 py-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Adresse de la prestation
                </h2>
              </div>
              <div className="p-6">
                <AddressAutocomplete
                  value={address}
                  onChange={(data) => {
                    if (data) {
                      // Construire l'adresse complète depuis les données structurées
                      const fullAddress = [
                        data.address,
                        data.postalCode,
                        data.city,
                      ]
                        .filter(Boolean)
                        .join(", ");
                      setAddress(fullAddress);
                      setCity(data.city);
                      setCoordinates(data.coordinates);
                    } else {
                      setCity(null);
                      setCoordinates(null);
                    }
                  }}
                  onInputChange={(value) => setAddress(value)}
                  onManualChange={(value) => {
                    setAddress(value);
                    // En mode manuel, on ne peut pas avoir les coordonnées
                    setCity(null);
                    setCoordinates(null);
                  }}
                  placeholder="Rechercher une adresse exacte..."
                  allowManualEntry={true}
                  searchType="address"
                  helperText="Saisissez l'adresse où aura lieu la prestation"
                  error={fieldErrors.address}
                />
              </div>
            </motion.div>

            {/* Section Notes */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Notes complémentaires
                  <span className="text-sm font-normal text-text-light">(optionnel)</span>
                </h2>
              </div>
              <div className="p-6">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Informations complémentaires pour l'annonceur (code d'accès, instructions particulières...)"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                />
              </div>
            </motion.div>
          </div>

          {/* Colonne récapitulatif (sticky sur desktop) */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm overflow-hidden lg:sticky lg:top-24"
            >
              <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Récapitulatif
                </h2>
              </div>
              <div className="p-6">
                {/* Annonceur */}
                <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                  <div className="relative w-14 h-14 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                    {bookingData.announcer.profileImage ? (
                      <Image
                        src={bookingData.announcer.profileImage}
                        alt={bookingData.announcer.firstName}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl bg-primary/10">
                        👤
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground flex items-center gap-1 truncate">
                      {bookingData.announcer.firstName} {bookingData.announcer.lastName.charAt(0)}.
                      {bookingData.announcer.verified && (
                        <CheckCircle className="w-4 h-4 text-secondary flex-shrink-0" />
                      )}
                    </p>
                    <p className="text-sm text-text-light flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {extractCity(bookingData.announcer.location)}
                    </p>
                    {/* Badge statut */}
                    <span
                      className={`inline-flex items-center mt-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${
                        bookingData.announcer.statusType === "professionnel"
                          ? "bg-blue-100 text-blue-700"
                          : bookingData.announcer.statusType === "micro_entrepreneur"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {bookingData.announcer.statusType === "professionnel"
                        ? "Professionnel"
                        : bookingData.announcer.statusType === "micro_entrepreneur"
                        ? "Micro-entrepreneur"
                        : "Particulier"}
                    </span>
                  </div>
                </div>

                {/* Service */}
                <div className="py-4 border-b border-gray-100">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{bookingData.service.categoryIcon || "✨"}</span>
                    <div>
                      <p className="font-semibold text-foreground">
                        {bookingData.service.categoryName}
                      </p>
                      {bookingData.variant && (
                        <p className="text-sm text-text-light">{bookingData.variant.name}</p>
                      )}
                      {/* Badge type de formule */}
                      {(isCollectiveFormula || isMultiSessionFormula) && (
                        <div className="flex items-center gap-2 mt-1">
                          {isCollectiveFormula ? (
                            <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              Collective
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                              {numberOfSessions} séances
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dates et horaires - adapté selon le type de formule */}
                <div className="py-4 border-b border-gray-100">
                  {isCollectiveFormula && bookingData.collectiveSlots && bookingData.collectiveSlots.length > 0 ? (
                    // Formule collective: liste numérotée des créneaux
                    <div className="p-3 bg-purple-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <CalendarCheck className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-800">
                          Créneaux sélectionnés ({bookingData.collectiveSlots.length}/{numberOfSessions})
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {bookingData.collectiveSlots.map((slot: CollectiveSlotData, index: number) => (
                          <div
                            key={slot._id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span className="w-5 h-5 rounded-full bg-purple-200 text-purple-700 text-xs flex items-center justify-center font-semibold">
                              {index + 1}
                            </span>
                            <span className="text-gray-700 capitalize">
                              {formatShortDate(slot.date)}
                            </span>
                            <span className="text-gray-500">•</span>
                            <span className="text-purple-700 font-medium">
                              {slot.startTime} - {slot.endTime}
                            </span>
                          </div>
                        ))}
                      </div>
                      {effectiveAnimalCount > 1 && (
                        <div className="mt-2 pt-2 border-t border-purple-200 flex items-center gap-2">
                          <Users className="w-4 h-4 text-purple-600" />
                          <span className="text-sm text-purple-700">
                            {effectiveAnimalCount} animal{effectiveAnimalCount > 1 ? "aux" : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : isMultiSessionFormula && bookingData.sessions && bookingData.sessions.length > 0 ? (
                    // Formule multi-séances: liste numérotée des séances
                    <div className="p-3 bg-primary/5 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <CalendarCheck className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">
                          Séances planifiées ({bookingData.sessions.length}/{numberOfSessions})
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {bookingData.sessions.map((session: SessionData, index: number) => (
                          <div
                            key={`${session.date}-${session.startTime}`}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-semibold">
                              {index + 1}
                            </span>
                            <span className="text-gray-700 capitalize">
                              {formatShortDate(session.date)}
                            </span>
                            <span className="text-gray-500">•</span>
                            <span className="text-primary font-medium">
                              {session.startTime} - {session.endTime}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    // Formule uni-séance: affichage classique
                    <>
                      <p className="text-xs font-medium text-text-light uppercase mb-2">Date et horaire</p>
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-foreground">
                          {isMultiDay && bookingData.dates.startTime && bookingData.dates.endTime ? (
                            // Multi-jours avec heures
                            <span>
                              Du {formatShortDate(bookingData.dates.startDate)} à {formatTime(bookingData.dates.startTime)} jusqu&apos;au {formatShortDate(bookingData.dates.endDate)} à {formatTime(bookingData.dates.endTime)}
                            </span>
                          ) : bookingData.dates.startTime && bookingData.dates.endTime ? (
                            // Même jour avec plage horaire
                            <span>
                              {formatShortDate(bookingData.dates.startDate)} de {formatTime(bookingData.dates.startTime)} à {formatTime(bookingData.dates.endTime)}
                            </span>
                          ) : bookingData.dates.startTime ? (
                            // Même jour avec heure de début et durée
                            <span>
                              {formatShortDate(bookingData.dates.startDate)} à {formatTime(bookingData.dates.startTime)}
                              {bookingData.variant?.duration && (
                                <span className="text-text-light">
                                  {" → "}{formatTime(calculateEndTime(bookingData.dates.startTime, bookingData.variant.duration))}
                                  {" "}({formatDuration(bookingData.variant.duration)})
                                </span>
                              )}
                            </span>
                          ) : isMultiDay ? (
                            // Multi-jours sans heures
                            <span>
                              Du {formatShortDate(bookingData.dates.startDate)} au {formatShortDate(bookingData.dates.endDate)}
                            </span>
                          ) : (
                            // Date simple
                            <span>{formatShortDate(bookingData.dates.startDate)}</span>
                          )}

                          {/* Durée */}
                          {priceCalculation && (daysCount > 1 || priceCalculation.firstDayHours > 0) && (
                            <div className="flex items-center gap-1 mt-1.5 text-xs text-text-light">
                              <Clock className="w-3 h-3" />
                              {daysCount > 1 ? (
                                <span>
                                  {daysCount} jour{daysCount > 1 ? "s" : ""}
                                  {priceCalculation.firstDayHours + priceCalculation.lastDayHours + (priceCalculation.fullDays * 8) > 0 && (
                                    <> · {formatHoursDisplay(priceCalculation.firstDayHours + priceCalculation.lastDayHours + (priceCalculation.fullDays * 8))} au total</>
                                  )}
                                </span>
                              ) : priceCalculation.firstDayHours > 0 ? (
                                <span>Durée : {formatHoursDisplay(priceCalculation.firstDayHours)}</span>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Prix - Détail adapté selon le type de formule */}
                <div className="pt-4">
                  {/* Formule collective ou multi-séances */}
                  {(isCollectiveFormula || isMultiSessionFormula) && bookingData.variant && (() => {
                    const withCommission = (amount: number) => Math.round(amount * (1 + commissionRate / 100));
                    const variantPriceWithComm = withCommission(bookingData.variant.price);
                    const basePrice = isCollectiveFormula
                      ? bookingData.variant.price * numberOfSessions * effectiveAnimalCount
                      : bookingData.variant.price * numberOfSessions;
                    const basePriceWithComm = withCommission(basePrice);

                    return (
                      <div className={`rounded-xl p-4 space-y-3 mb-3 ${isCollectiveFormula ? "bg-purple-50" : "bg-primary/5"}`}>
                        {/* Ligne formule */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Package className={`w-4 h-4 ${isCollectiveFormula ? "text-purple-600" : "text-primary"}`} />
                              <span className="font-medium text-foreground">
                                Formule : {bookingData.variant.name}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 ml-6">
                              └ {formatPrice(variantPriceWithComm)} × {numberOfSessions} séance{numberOfSessions > 1 ? "s" : ""}
                              {isCollectiveFormula && effectiveAnimalCount > 1 && ` × ${effectiveAnimalCount} animaux`}
                            </p>
                          </div>
                          <span className={`font-bold text-lg ${isCollectiveFormula ? "text-purple-700" : "text-primary"}`}>
                            {formatPrice(basePriceWithComm)}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Formule uni-séance (calcul smart) */}
                  {priceCalculation && !isCollectiveFormula && !isMultiSessionFormula && (() => {
                    const withCommission = (amount: number) => Math.round(amount * (1 + commissionRate / 100));
                    const firstDayWithComm = withCommission(priceCalculation.firstDayAmount);
                    const fullDaysWithComm = withCommission(priceCalculation.fullDaysAmount);
                    const dailyRateWithComm = withCommission(priceCalculation.dailyRate);
                    const hourlyRateWithComm = withCommission(priceCalculation.hourlyRate);
                    const lastDayWithComm = withCommission(priceCalculation.lastDayAmount);
                    const nightlyRateWithComm = withCommission(priceCalculation.nightlyRate);
                    const nightsAmountWithComm = withCommission(priceCalculation.nightsAmount);

                    return (
                    <div className="bg-gray-50 rounded-xl p-3 space-y-2 mb-3">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Détail des tarifs</p>

                      {/* Multi-jours */}
                      {isMultiDay ? (
                        <>
                          {/* Premier jour */}
                          <div className="flex justify-between text-sm">
                            <span className="text-text-light flex items-center gap-2">
                              <Sun className="w-4 h-4 text-amber-500" />
                              <span>
                                {formatShortDate(bookingData.dates.startDate)}
                                <span className="text-gray-400 ml-1">
                                  {bookingData.dates.startTime ? (
                                    `(${formatTime(bookingData.dates.startTime)} → 20h · ${formatHoursDisplay(priceCalculation.firstDayHours)})`
                                  ) : (
                                    `(${formatHoursDisplay(priceCalculation.firstDayHours)})`
                                  )}
                                </span>
                              </span>
                            </span>
                            <span className="font-medium">{formatPrice(firstDayWithComm)}</span>
                          </div>

                          {/* Jours complets intermédiaires */}
                          {priceCalculation.fullDays > 0 && (() => {
                            const startDateObj = new Date(bookingData.dates.startDate);
                            const firstMiddleDay = new Date(startDateObj);
                            firstMiddleDay.setDate(startDateObj.getDate() + 1);
                            const lastMiddleDay = new Date(firstMiddleDay);
                            lastMiddleDay.setDate(firstMiddleDay.getDate() + priceCalculation.fullDays - 1);

                            return (
                              <div className="flex justify-between text-sm">
                                <span className="text-text-light flex items-center gap-2">
                                  <Sun className="w-4 h-4 text-amber-500" />
                                  <span>
                                    {priceCalculation.fullDays === 1 ? (
                                      formatShortDate(firstMiddleDay.toISOString())
                                    ) : (
                                      `${formatShortDate(firstMiddleDay.toISOString())} → ${formatShortDate(lastMiddleDay.toISOString())}`
                                    )}
                                    <span className="text-gray-400 ml-1">
                                      ({priceCalculation.fullDays} jour{priceCalculation.fullDays > 1 ? "s" : ""} · {formatPrice(dailyRateWithComm)}/jour)
                                    </span>
                                  </span>
                                </span>
                                <span className="font-medium">{formatPrice(fullDaysWithComm)}</span>
                              </div>
                            );
                          })()}

                          {/* Dernier jour */}
                          {priceCalculation.lastDayHours > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-text-light flex items-center gap-2">
                                <Sun className="w-4 h-4 text-amber-500" />
                                <span>
                                  {formatShortDate(bookingData.dates.endDate)}
                                  <span className="text-gray-400 ml-1">
                                    {bookingData.dates.endTime ? (
                                      `(8h → ${formatTime(bookingData.dates.endTime)} · ${formatHoursDisplay(priceCalculation.lastDayHours)})`
                                    ) : (
                                      `(${formatHoursDisplay(priceCalculation.lastDayHours)})`
                                    )}
                                  </span>
                                </span>
                              </span>
                              <span className="font-medium">{formatPrice(lastDayWithComm)}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        /* Même jour */
                        priceCalculation.firstDayHours > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-text-light flex items-center gap-2">
                              <Clock className="w-4 h-4 text-blue-500" />
                              <span>
                                {bookingData.dates.startTime && bookingData.dates.endTime ? (
                                  <>
                                    {formatTime(bookingData.dates.startTime)} → {formatTime(bookingData.dates.endTime)}
                                    <span className="text-gray-400 ml-1">
                                      ({formatHoursDisplay(priceCalculation.firstDayHours)}
                                      {priceCalculation.firstDayIsFullDay || priceCalculation.firstDayAmount === priceCalculation.dailyRate
                                        ? ` · ${formatPrice(dailyRateWithComm)}/jour`
                                        : priceCalculation.hourlyRate > 0
                                          ? ` · ${formatPrice(hourlyRateWithComm)}/h`
                                          : ""
                                      })
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    {formatHoursDisplay(priceCalculation.firstDayHours)} de prestation
                                    <span className="text-gray-400 ml-1">
                                      ({priceCalculation.firstDayIsFullDay || priceCalculation.firstDayAmount === priceCalculation.dailyRate
                                        ? `${formatPrice(dailyRateWithComm)}/jour`
                                        : priceCalculation.hourlyRate > 0
                                          ? `${formatPrice(hourlyRateWithComm)}/h`
                                          : ""
                                      })
                                    </span>
                                  </>
                                )}
                              </span>
                            </span>
                            <span className="font-medium">{formatPrice(firstDayWithComm)}</span>
                          </div>
                        )
                      )}

                      {/* Nuits - prix avec commission incluse */}
                      {bookingData.overnight?.includeOvernightStay && priceCalculation.nights > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-indigo-700 flex items-center gap-2">
                            <Moon className="w-4 h-4" />
                            <span>
                              {priceCalculation.nights} nuit{priceCalculation.nights > 1 ? "s" : ""}
                              {priceCalculation.nightlyRate > 0 && (
                                <span className="text-indigo-400 ml-1">
                                  ({formatPrice(nightlyRateWithComm)}/nuit)
                                </span>
                              )}
                            </span>
                          </span>
                          <span className="font-medium text-indigo-700">+{formatPrice(nightsAmountWithComm)}</span>
                        </div>
                      )}
                    </div>
                  );
                  })()}

                  {/* Options - prix avec commission incluse */}
                  {selectedOptionIds.length > 0 && (
                    <div className="space-y-2 mb-3">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Options</p>
                      {selectedOptionIds.map((optId) => {
                        const opt = bookingData.availableOptions?.find(
                          (o: ServiceOption) => o.id === optId
                        );
                        if (!opt) return null;
                        const optPriceWithComm = Math.round(opt.price * (1 + commissionRate / 100));
                        return (
                          <div
                            key={optId}
                            className="flex justify-between text-sm text-secondary"
                          >
                            <span className="flex items-center gap-2">
                              <span className="w-4 h-4 flex items-center justify-center text-xs">✓</span>
                              {opt.name}
                            </span>
                            <span className="font-medium">+{formatPrice(optPriceWithComm)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Total - frais de service inclus */}
                  <div className="pt-3 border-t border-gray-200 mt-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total à payer</span>
                      <span className="text-primary">
                        {formatPrice(totalWithCommission)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 text-right">
                      Frais de service inclus
                    </p>
                  </div>
                </div>

                {/* Bouton Confirmer */}
                <button
                  onClick={handleOpenConfirmation}
                  disabled={isSubmitting}
                  className="w-full mt-6 py-4 bg-gradient-to-r from-primary to-primary/90 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  Confirmer la réservation
                </button>

                {/* Erreur */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3"
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{error}</p>
                      {Object.keys(fieldErrors).length > 0 && (
                        <p className="text-xs text-red-600 mt-1">
                          Vérifiez les champs marqués en rouge ci-dessus
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}

              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Modale de confirmation */}
      <ConfirmationModal
        isOpen={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        onConfirm={handleSubmit}
        isSubmitting={isSubmitting}
        isGuest={!isLoggedIn}
        userEmail={isLoggedIn ? sessionData?.user?.email : guestData.email}
      />
    </div>
  );
}
