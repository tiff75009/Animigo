"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { X, ArrowRight, Check, ShoppingCart, Calendar, Clock, CreditCard, Eye, PawPrint, MapPin, Home, Plus, ChevronLeft, AlertTriangle, Dog, LogIn, Mail, Lock, Loader2, Users, Package } from "lucide-react";
import GuestAnimalVerification, { type GuestAnimalData } from "@/app/reserver/[announcerId]/components/GuestAnimalVerification";
import { ServiceData, FormuleData } from "./types";
import { cn } from "@/app/lib/utils";
import { setAuthToken as storeAuthToken } from "@/app/lib/authToken";
import {
  BookingSummary,
  BookingCalendar,
  CollectiveSlotPicker,
  MultiSessionCalendar,
  ServiceLocationSelector,
  SelectableOptionCard,
  AddressSelector,
  GuestAddressSelector,
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
// Étape 1: Formule, Étape 1.5: Dog (invités), Étape 2: Animaux, Étape 3: Lieu, Étape 4: Dates, Étape 5: Options, Final: Summary
type MobileBookingStep = "formule" | "dog" | "animals" | "location" | "dates" | "options" | "summary";

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
  announcerCoordinates?: { lat: number; lng: number };
  announcerRadius?: number | null;
  // Props pour les adresses
  clientAddresses?: ClientAddress[];
  isLoadingAddresses?: boolean;
  onAddressSelect?: (addressId: string) => void;
  onAddNewAddress?: () => void;
  guestAddress?: GuestAddress | null;
  onGuestAddressChange?: (address: GuestAddress | null) => void;
  // Props pour les options
  onOptionToggle?: (optionId: string) => void;
  selectedOptionIds?: string[];
  // Statut de l'annonceur pour affichage HT/TTC
  announcerStatusType?: "particulier" | "micro_entrepreneur" | "professionnel";
  // Vérification de l'animal pour les invités (chien ou chat)
  requiresAnimalVerification?: boolean;
  acceptedAnimalTypes?: string[];
  guestAnimalValid?: boolean;
  guestAnimalError?: string;
  dogRestrictions?: {
    acceptedDogSizes: ("small" | "medium" | "large")[];
    dogCategoryAcceptance: "none" | "cat1" | "cat2" | "both";
  };
  guestAnimalData?: GuestAnimalData | null;
  onGuestAnimalDataChange?: (data: GuestAnimalData | null) => void;
  onGuestAnimalValidationChange?: (isValid: boolean, error?: string) => void;
  // Erreurs de restriction pour les chiens des utilisateurs connectés
  connectedDogErrors?: Record<string, string>;
  // Callback pour la connexion inline
  onLoginSuccess?: (token: string) => void;
  // Blocage annonceur
  isAnnouncer?: boolean;
}

// Get minimum price for a service
// Pour les services garde: prix demi-journée
// Pour les autres services (packs): prix total du pack
const getServiceMinPrice = (service: ServiceData): { price: number; unit: string; isTotal: boolean } => {
  const isGarde = isGardeService(service);
  let minPrice = Infinity;
  let minUnit = "";
  let isTotal = false;

  for (const formule of service.formules) {
    if (isGarde) {
      // Pour garde: afficher le prix demi-journée si disponible, sinon jour
      const halfDailyPrice = formule.pricing?.halfDaily;
      const dailyPrice = formule.pricing?.daily;
      if (halfDailyPrice && halfDailyPrice > 0 && halfDailyPrice < minPrice) {
        minPrice = halfDailyPrice;
        minUnit = "demi-journée";
        isTotal = false;
      } else if (dailyPrice && dailyPrice > 0 && dailyPrice < minPrice) {
        minPrice = dailyPrice;
        minUnit = "jour";
        isTotal = false;
      }
    } else {
      // Pour les autres services: calculer le prix total du pack
      const { price } = getFormuleBestPrice(formule, isGarde);
      const numberOfSessions = formule.numberOfSessions || 1;
      const totalPrice = price * numberOfSessions;
      if (totalPrice > 0 && totalPrice < minPrice) {
        minPrice = totalPrice;
        minUnit = numberOfSessions > 1 ? `${numberOfSessions} séances` : "";
        isTotal = true;
      }
    }
  }

  return { price: minPrice === Infinity ? 0 : minPrice, unit: minUnit, isTotal };
};

// Get global minimum price
const getGlobalMinPrice = (services: ServiceData[]): { price: number; unit: string; isTotal: boolean } => {
  let minPrice = Infinity;
  let minUnit = "";
  let isTotal = false;

  for (const service of services) {
    const isGarde = isGardeService(service);
    for (const formule of service.formules) {
      if (isGarde) {
        // Pour garde: afficher le prix demi-journée si disponible, sinon jour
        const halfDailyPrice = formule.pricing?.halfDaily;
        const dailyPrice = formule.pricing?.daily;
        if (halfDailyPrice && halfDailyPrice > 0 && halfDailyPrice < minPrice) {
          minPrice = halfDailyPrice;
          minUnit = "demi-journée";
          isTotal = false;
        } else if (dailyPrice && dailyPrice > 0 && dailyPrice < minPrice) {
          minPrice = dailyPrice;
          minUnit = "jour";
          isTotal = false;
        }
      } else {
        // Pour les autres services: calculer le prix total du pack
        const { price } = getFormuleBestPrice(formule, isGarde);
        const numberOfSessions = formule.numberOfSessions || 1;
        const totalPrice = price * numberOfSessions;
        if (totalPrice > 0 && totalPrice < minPrice) {
          minPrice = totalPrice;
          minUnit = numberOfSessions > 1 ? `${numberOfSessions} séances` : "";
          isTotal = true;
        }
      }
    }
  }

  return { price: minPrice === Infinity ? 0 : minPrice, unit: minUnit, isTotal };
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
  announcerCoordinates,
  announcerRadius,
  // Props pour les adresses
  clientAddresses = [],
  isLoadingAddresses = false,
  onAddressSelect,
  onAddNewAddress,
  guestAddress,
  onGuestAddressChange,
  // Props pour les options
  onOptionToggle,
  selectedOptionIds = [],
  // Statut annonceur HT/TTC
  announcerStatusType,
  // Vérification de l'animal pour les invités (chien ou chat)
  requiresAnimalVerification = false,
  acceptedAnimalTypes = [],
  guestAnimalValid = false,
  guestAnimalError,
  dogRestrictions,
  guestAnimalData,
  onGuestAnimalDataChange,
  onGuestAnimalValidationChange,
  connectedDogErrors = {},
  onLoginSuccess,
  isAnnouncer = false,
}: AnnouncerMobileCTAProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isCalendarSheetOpen, setIsCalendarSheetOpen] = useState(false);
  const [prevVariantId, setPrevVariantId] = useState<string | null>(null);

  // État pour le flux par étapes (services garde)
  const [mobileStep, setMobileStep] = useState<MobileBookingStep>("formule");
  const [isStepSheetOpen, setIsStepSheetOpen] = useState(false);

  // État pour l'erreur de distance (adresse hors rayon d'action)
  const [isAddressOutOfRange, setIsAddressOutOfRange] = useState(false);

  // État pour tracker si l'étape location a été confirmée (pour les collectives chez l'annonceur)
  const [locationConfirmed, setLocationConfirmed] = useState(false);

  // État pour le sheet de connexion
  const [isLoginSheetOpen, setIsLoginSheetOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // États pour les filtres de formules
  const [filterSessionType, setFilterSessionType] = useState<"all" | "individual" | "collective">("all");
  const [filterLocation, setFilterLocation] = useState<"all" | "announcer_home" | "client_home" | "both">("all");
  const [filterAnimal, setFilterAnimal] = useState<string>("all");

  // Labels pour les animaux
  const animalLabels: Record<string, string> = {
    chien: "Chien",
    chat: "Chat",
    oiseau: "Oiseau",
    rongeur: "Rongeur",
    reptile: "Reptile",
    poisson: "Poisson",
    nac: "NAC",
  };

  // Collecter tous les types d'animaux des formules
  const allAnimalsInFormules = useMemo(() => {
    const animals = new Set<string>();
    services.forEach(service => {
      service.formules.forEach((formule) => {
        formule.animalTypes?.forEach((type: string) => animals.add(type));
      });
    });
    return Array.from(animals);
  }, [services]);

  // Filtrer les formules selon les critères
  const getFilteredFormules = (formules: FormuleData[]) => {
    return formules.filter((formule) => {
      // Filtre par type de séance
      if (filterSessionType !== "all") {
        const isCollective = formule.sessionType === "collective";
        if (filterSessionType === "collective" && !isCollective) return false;
        if (filterSessionType === "individual" && isCollective) return false;
      }

      // Filtre par lieu
      if (filterLocation !== "all") {
        const formuleLocation = formule.serviceLocation || "both";
        if (filterLocation !== "both" && formuleLocation !== "both" && formuleLocation !== filterLocation) {
          return false;
        }
      }

      // Filtre par type d'animal
      if (filterAnimal !== "all") {
        const formuleAnimals = formule.animalTypes || [];
        if (formuleAnimals.length > 0 && !formuleAnimals.includes(filterAnimal)) {
          return false;
        }
      }

      return true;
    });
  };

  // Vérifier si des filtres sont actifs
  const hasActiveFilters = filterSessionType !== "all" || filterLocation !== "all" || filterAnimal !== "all";

  // Réinitialiser les filtres
  const resetFilters = () => {
    setFilterSessionType("all");
    setFilterLocation("all");
    setFilterAnimal("all");
  };

  // Mutation pour la connexion
  const loginMutation = useMutation(api.auth.login.login);

  // Gérer la connexion
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setLoginError("Veuillez remplir tous les champs");
      return;
    }

    setIsLoggingIn(true);
    setLoginError("");

    try {
      const result = await loginMutation({
        email: loginEmail.toLowerCase().trim(),
        password: loginPassword,
      });

      if (result.success && result.token) {
        // Stocker le token
        await storeAuthToken(result.token);
        // Notifier le parent
        onLoginSuccess?.(result.token);
        // Fermer le sheet
        setIsLoginSheetOpen(false);
        // Reset le formulaire
        setLoginEmail("");
        setLoginPassword("");
      } else {
        setLoginError(result.error || "Erreur de connexion");
      }
    } catch (error) {
      setLoginError("Une erreur est survenue");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Bloquer le scroll du body quand une modale est ouverte (mobile uniquement)
  useEffect(() => {
    const isAnySheetOpen = isSheetOpen || isCalendarSheetOpen || isStepSheetOpen || isLoginSheetOpen;
    // Vérifier si on est sur mobile (écran < 768px)
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    if (isAnySheetOpen && isMobile) {
      // Sauvegarder la position de scroll actuelle
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';

      return () => {
        // Restaurer le scroll
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isSheetOpen, isCalendarSheetOpen, isStepSheetOpen, isLoginSheetOpen]);

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
  // Pour les formules garde: vérifier startDate
  // Pour les formules individuelles: vérifier selectedSessions
  const hasDateSelected = isRangeMode
    ? Boolean(bookingSelection?.startDate)
    : selectedSessions.length > 0;
  const hasAnimalsSelected = isLoggedIn ? selectedAnimalIds.length > 0 : true; // Non connectés: pas de sélection requise
  const hasLocationSelected = Boolean(bookingSelection?.serviceLocation);
  const hasOptionsStep = (bookingService?.options?.length ?? 0) > 0;

  // Vérifier si le choix de lieu est nécessaire (si les deux options sont disponibles ou si uniquement à domicile)
  const formuleServiceLocation = bookingVariant?.serviceLocation || bookingService?.serviceLocation;
  const needsLocationChoice = formuleServiceLocation === "both";
  const needsAddressOnly = formuleServiceLocation === "client_home";
  const isAnnouncerHomeOnly = formuleServiceLocation === "announcer_home";
  // Pour les collectives, on affiche toujours l'étape lieu (pour montrer le lieu et calculer la distance)
  const needsLocationStep = needsLocationChoice || needsAddressOnly || isCollectiveFormule;

  // Vérifier si l'adresse est requise et saisie
  const isAddressRequired = bookingSelection?.serviceLocation === "client_home" || needsAddressOnly;
  const hasAddress = isAddressRequired
    ? (isLoggedIn ? Boolean(bookingSelection?.selectedAddressId) : Boolean(guestAddress?.coordinates))
    : true;
  // Vérifier que l'adresse est dans le rayon
  // Pour les formules collectives, l'adresse est optionnelle (c'est juste pour afficher la distance)
  const hasValidAddress = isCollectiveFormule
    ? true // Toujours valide pour les collectives
    : (hasAddress && !isAddressOutOfRange);

  // Animaux compatibles avec la formule sélectionnée
  // Comparaison insensible à la casse pour gérer les différences de format
  const compatibleUserAnimals = userAnimals.filter((animal) => {
    const variantTypes = bookingVariant?.animalTypes;
    const serviceTypes = bookingService?.animalTypes;
    // Fallback: si le variant n'a pas de types définis OU est un tableau vide, utiliser le service
    const acceptedTypes = (variantTypes && variantTypes.length > 0) ? variantTypes : (serviceTypes || []);
    if (acceptedTypes.length === 0) return true;
    const animalTypeLower = animal.type?.toLowerCase();
    return acceptedTypes.some((t: string) => t.toLowerCase() === animalTypeLower);
  });

  // Vérification du chien pour les invités (bloque les étapes si non vérifié)
  const isAnimalVerificationOk = !requiresAnimalVerification || guestAnimalValid;

  // Déterminer l'étape actuelle pour le flux garde mobile
  const getCurrentGardeStep = (): MobileBookingStep => {
    if (!hasVariantSelected) return "formule";
    // Étape vérification de l'animal pour les invités (après formule, avant dates)
    if (requiresAnimalVerification && !guestAnimalValid) return "dog";
    if (isLoggedIn && compatibleUserAnimals.length > 0 && !hasAnimalsSelected) return "animals";
    // Afficher l'étape location si besoin de choisir ou de saisir l'adresse
    if (needsLocationStep) {
      // Pour les formules collectives, l'étape location est affichée mais pas bloquante
      // On passe à la première fois qu'on arrive sur cette étape, puis on continue
      if (isCollectiveFormule && !locationConfirmed) return "location";
      // Si formule uniquement à domicile (non collective), vérifier que l'adresse est saisie et valide
      if (!isCollectiveFormule && needsAddressOnly && !hasValidAddress) return "location";
      // Si choix de lieu, vérifier qu'un lieu est choisi
      if (!isCollectiveFormule && needsLocationChoice && !hasLocationSelected) return "location";
      // Si à domicile choisi, vérifier l'adresse
      if (!isCollectiveFormule && bookingSelection?.serviceLocation === "client_home" && !hasValidAddress) return "location";
    }
    if (!hasDateSelected) return "dates";
    if (hasOptionsStep) return "options";
    return "summary";
  };

  // Auto-open step sheet when a variant is selected for the first time (garde mode ou formule à domicile)
  useEffect(() => {
    if (bookingVariant && bookingVariant.id.toString() !== prevVariantId) {
      setPrevVariantId(bookingVariant.id.toString());
      // Réinitialiser l'état de confirmation du lieu quand on change de formule
      setLocationConfirmed(false);

      // Vérifier le serviceLocation de la nouvelle formule
      const newFormuleLocation = bookingVariant.serviceLocation || bookingService?.serviceLocation;
      const isCollective = bookingVariant.sessionType === "collective";
      const isMultiSession = !isCollective && (bookingVariant.numberOfSessions || 1) > 1;

      // Flux par étapes si:
      // - Service garde (isRangeMode)
      // - Formule à domicile ou les deux (client_home ou both)
      // - OU si vérification de l'animal requise (invité avec chien)
      // - OU formule collective (pour afficher le lieu chez l'annonceur)
      const needsStepFlow = isRangeMode ||
        newFormuleLocation === "client_home" ||
        newFormuleLocation === "both" ||
        requiresAnimalVerification ||
        isCollective; // Les collectives passent toujours par le flux (pour afficher le lieu)

      // Pour les services garde ou formules nécessitant un flux par étapes
      if (needsStepFlow) {
        const nextStep = getCurrentGardeStep();
        setMobileStep(nextStep);
        if (nextStep !== "formule") {
          setIsStepSheetOpen(true);
        }
      } else if (isMultiSession) {
        // Pour les formules multi-sessions sans étapes préalables, ouvrir directement le calendrier
        setIsCalendarSheetOpen(true);
      } else {
        // Pour les autres services, ouvrir le calendrier
        if (!bookingSelection?.startDate) {
          setIsCalendarSheetOpen(true);
        }
      }
    }
  }, [bookingVariant, prevVariantId, bookingSelection?.startDate, isRangeMode, bookingService?.serviceLocation, requiresAnimalVerification]);

  // Pour les formules collectives, la réservation est complète quand tous les créneaux sont sélectionnés
  // Pour les formules multi-séances individuelles, quand toutes les séances sont sélectionnées
  // La vérification de l'animal doit être OK pour les invités
  const hasFullBooking = isCollectiveFormule
    ? hasVariantSelected && hasAllSlotsSelected && hasAddress && isAnimalVerificationOk
    : isMultiSessionIndividual
      ? hasVariantSelected && hasAllSessionsSelected && hasAddress && isAnimalVerificationOk
      : hasVariantSelected && hasDateSelected && Boolean(priceBreakdown) && hasAddress && isAnimalVerificationOk;

  // Get price to display
  const { price: minPrice, unit: minUnit, isTotal: isPriceTotal } = selectedService
    ? getServiceMinPrice(selectedService)
    : getGlobalMinPrice(services);
  const hasPrice = minPrice > 0;

  // Handle direct booking
  const handleBookClick = () => {
    // Vérification du chien requise pour les invités (tous types de services)
    // Si le chien n'est pas encore vérifié, ouvrir le sheet de vérification
    if (requiresAnimalVerification && hasVariantSelected) {
      // Déterminer l'étape : si chien déjà vérifié, passer aux dates, sinon vérification
      const stepToShow = guestAnimalValid ? "dates" : "dog";
      setMobileStep(stepToShow);
      setIsStepSheetOpen(true);
      return;
    }

    // Flux par étapes pour les services garde ou formules à domicile
    if ((isRangeMode || needsLocationStep) && hasVariantSelected) {
      const currentStep = getCurrentGardeStep();
      setMobileStep(currentStep);
      setIsStepSheetOpen(true);
      return;
    }

    // Cas spécial pour les formules collectives - flux step-by-step
    if (isCollectiveFormule && hasVariantSelected) {
      // Vérifier si on doit passer par le flux step-by-step (vérification chien, animaux, location)
      if (requiresAnimalVerification && !guestAnimalValid) {
        setMobileStep("dog");
        setIsStepSheetOpen(true);
        return;
      }
      if (isLoggedIn && compatibleUserAnimals.length > 0 && !hasAnimalsSelected) {
        setMobileStep("animals");
        setIsStepSheetOpen(true);
        return;
      }
      if (needsLocationStep && !hasValidAddress) {
        setMobileStep("location");
        setIsStepSheetOpen(true);
        return;
      }
      // Sinon, ouvrir le calendrier collectif ou le récap
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
    } else if (!hasVariantSelected) {
      // Aucune formule sélectionnée - ouvrir le sheet de connexion si non connecté
      if (!isLoggedIn) {
        setIsLoginSheetOpen(true);
      }
      // Si connecté, ne rien faire (l'utilisateur doit d'abord sélectionner une formule)
    } else if (services.length === 1 && services[0].formules.length === 1) {
      // Only one service with one formule, book directly
      onBook?.();
    }
  };

  // Gérer la navigation entre les étapes du flux garde
  const handleNextStep = () => {
    switch (mobileStep) {
      case "dog":
        // Après vérification de l'animal
        if (isLoggedIn && compatibleUserAnimals.length > 0) {
          setMobileStep("animals");
        } else if (needsLocationStep) {
          setMobileStep("location");
        } else if (isCollectiveFormule || isMultiSessionIndividual) {
          // Pour les formules collectives/multi-sessions, ouvrir le calendrier spécifique
          setIsStepSheetOpen(false);
          setIsCalendarSheetOpen(true);
        } else if (isRangeMode) {
          setMobileStep("dates");
        } else {
          // Mode non-garde sans besoin de lieu : fermer le sheet et ouvrir le calendrier
          setIsStepSheetOpen(false);
          setIsCalendarSheetOpen(true);
        }
        break;
      case "animals":
        if (needsLocationStep) {
          setMobileStep("location");
        } else if (isCollectiveFormule || isMultiSessionIndividual) {
          // Pour les formules collectives/multi-sessions, ouvrir le calendrier spécifique
          setIsStepSheetOpen(false);
          setIsCalendarSheetOpen(true);
        } else if (isRangeMode) {
          setMobileStep("dates");
        } else {
          setIsStepSheetOpen(false);
          setIsCalendarSheetOpen(true);
        }
        break;
      case "location":
        // Marquer l'étape location comme confirmée (pour toutes les formules collectives)
        if (isCollectiveFormule) {
          setLocationConfirmed(true);
        }
        if (isCollectiveFormule || isMultiSessionIndividual) {
          // Pour les formules collectives/multi-sessions, ouvrir le calendrier spécifique
          setIsStepSheetOpen(false);
          setIsCalendarSheetOpen(true);
        } else if (isRangeMode) {
          setMobileStep("dates");
        } else {
          setIsStepSheetOpen(false);
          setIsCalendarSheetOpen(true);
        }
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
      case "dog":
        // Retour = fermer le sheet (on était à la formule avant)
        setIsStepSheetOpen(false);
        break;
      case "animals":
        // Retour à dog si requis, sinon fermer
        if (requiresAnimalVerification) {
          setMobileStep("dog");
        } else {
          setIsStepSheetOpen(false);
        }
        break;
      case "location":
        if (isLoggedIn && compatibleUserAnimals.length > 0) {
          setMobileStep("animals");
        } else if (requiresAnimalVerification) {
          setMobileStep("dog");
        } else {
          setIsStepSheetOpen(false);
        }
        break;
      case "dates":
        if (needsLocationStep) {
          setMobileStep("location");
        } else if (isLoggedIn && compatibleUserAnimals.length > 0) {
          setMobileStep("animals");
        } else if (requiresAnimalVerification) {
          setMobileStep("dog");
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
      case "dog":
        return guestAnimalValid;
      case "animals":
        return hasAnimalsSelected;
      case "location":
        // Pour les formules collectives, l'adresse est optionnelle (c'est juste pour la distance)
        if (isCollectiveFormule) {
          return true; // Toujours possible de passer à l'étape suivante
        }
        // Si formule uniquement à domicile, vérifier seulement l'adresse et le rayon
        if (needsAddressOnly) {
          return hasValidAddress;
        }
        // Si choix de lieu (both), vérifier le lieu sélectionné + adresse si à domicile
        if (bookingSelection?.serviceLocation === "client_home") {
          return hasValidAddress;
        }
        return hasLocationSelected;
      case "dates":
        // Pour les formules garde: vérifier startDate
        if (isRangeMode) {
          return Boolean(bookingSelection?.startDate);
        }
        // Pour les formules multi-session: vérifier qu'on a toutes les sessions
        if (isMultiSessionIndividual) {
          return selectedSessions.length >= individualNumberOfSessions;
        }
        // Pour les formules uni-session: vérifier qu'on a au moins une session
        return selectedSessions.length > 0;
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
      case "dog":
        if (guestAnimalError) {
          return "Animal non accepté";
        }
        return guestAnimalValid ? "Continuer" : "Vérifiez votre animal";
      case "animals":
        return hasAnimalsSelected ? "Continuer" : "Sélectionnez vos animaux";
      case "location":
        // Pour les formules collectives, l'adresse est optionnelle
        if (isCollectiveFormule) {
          return "Continuer";
        }
        if (isAddressOutOfRange) {
          return "Adresse hors zone";
        }
        if (needsAddressOnly) {
          return hasAddress ? "Continuer" : "Saisissez votre adresse";
        }
        if (bookingSelection?.serviceLocation === "client_home" && !hasAddress) {
          return "Saisissez votre adresse";
        }
        return hasLocationSelected ? "Continuer" : "Choisissez le lieu";
      case "dates":
        if (isRangeMode) {
          return hasDateSelected ? "Continuer" : "Sélectionnez les dates";
        }
        if (isMultiSessionIndividual) {
          const remaining = individualNumberOfSessions - selectedSessions.length;
          if (remaining > 0) {
            return `Sélectionnez ${remaining} séance${remaining > 1 ? "s" : ""} de plus`;
          }
          return "Continuer";
        }
        return selectedSessions.length > 0 ? "Continuer" : "Sélectionnez un créneau";
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
        // Passer à l'étape location si nécessaire, sinon au récap
        if (needsLocationStep && !hasValidAddress) {
          setMobileStep("location");
          setIsStepSheetOpen(true);
        } else {
          // Ouvrir le récap
          setIsSheetOpen(true);
        }
      }
      return;
    }

    // Pour les formules individuelles multi-séances
    if (isMultiSessionIndividual) {
      if (hasAllSessionsSelected) {
        setIsCalendarSheetOpen(false);
        // Passer à l'étape location si nécessaire, sinon au récap
        if (needsLocationStep && !hasValidAddress) {
          setMobileStep("location");
          setIsStepSheetOpen(true);
        } else {
          // Ouvrir le récap
          setIsSheetOpen(true);
        }
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
            {isPriceTotal ? (
              // Prix total d'un pack
              minUnit && <span className="text-sm font-normal text-gray-500 ml-1">({minUnit})</span>
            ) : (
              // Prix par unité (demi-journée, jour, etc.)
              <span className="text-sm font-normal text-gray-500">
                {minUnit ? `/${minUnit}` : ""}
              </span>
            )}
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
        case "dog":
          return (
            <>
              <PawPrint className="w-4 h-4" />
              Informations animal
            </>
          );
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
      // Réservation incomplète - afficher "Reprendre la réservation"
      return (
        <>
          <ArrowRight className="w-4 h-4" />
          Reprendre la réservation
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
      // Réservation incomplète - afficher "Reprendre la réservation"
      return (
        <>
          <ArrowRight className="w-4 h-4" />
          Reprendre la réservation
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
    // Si aucune formule sélectionnée et non connecté, afficher "Se connecter"
    if (!hasVariantSelected && !isLoggedIn) {
      return (
        <>
          <LogIn className="w-4 h-4" />
          Se connecter
        </>
      );
    }
    // Si aucune formule sélectionnée mais connecté, inviter à sélectionner
    if (!hasVariantSelected) {
      return "Choisir une formule";
    }
    // Si formule sélectionnée mais réservation incomplète, afficher "Reprendre la réservation"
    if (hasVariantSelected && !hasFullBooking) {
      return (
        <>
          <ArrowRight className="w-4 h-4" />
          Reprendre la réservation
        </>
      );
    }
    return "Réserver";
  };

  // Check if book button should be enabled
  const isBookButtonEnabled = !hasVariantSelected || (hasFullBooking && hasRequiredTimeSelection) || !hasDateSelected || !hasRequiredTimeSelection;

  // Si annonceur, ne pas afficher le CTA
  if (isAnnouncer) return null;

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
                {/* Backdrop - bloque les interactions en dessous */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsSheetOpen(false)}
                  className="fixed inset-0 bg-black/50 z-[9998] md:hidden"
                  style={{ touchAction: 'none' }}
                />

                {/* Sheet - avec support clavier mobile */}
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="fixed inset-x-0 bottom-0 bg-white rounded-t-2xl z-[9999] md:hidden flex flex-col"
                  style={{
                    maxHeight: '85dvh',
                    height: 'auto',
                  }}
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

                  {/* Sheet Content - zone scrollable */}
                  <div
                    className="flex-1 overflow-y-auto p-4"
                    style={{
                      WebkitOverflowScrolling: 'touch',
                      overscrollBehavior: 'contain',
                      minHeight: 0,
                    }}
                  >
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
                          announcerStatusType={announcerStatusType}
                          requiresAnimalVerification={requiresAnimalVerification}
                          guestAnimalValid={guestAnimalValid}
                          guestAnimalError={guestAnimalError}
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
                      // Show service/formule selection with filters
                      <div className="space-y-4">
                        {/* Titre */}
                        <div className="flex items-center gap-3">
                          <span className="p-2 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl">
                            <Package className="w-5 h-5 text-primary" />
                          </span>
                          <h3 className="text-lg font-bold text-gray-900">Choisir une formule</h3>
                        </div>

                        {/* Filtres */}
                        {services.some(s => s.formules.length > 1) && (
                          <div className="flex flex-wrap gap-2 pb-3 border-b border-gray-100">
                            {/* Filtre type de séance */}
                            <button
                              onClick={() => setFilterSessionType(filterSessionType === "individual" ? "all" : "individual")}
                              className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition-all",
                                filterSessionType === "individual"
                                  ? "bg-primary text-white border-primary"
                                  : "bg-white text-gray-600 border-gray-200"
                              )}
                            >
                              <Users className="w-3 h-3" />
                              Individuel
                            </button>
                            <button
                              onClick={() => setFilterSessionType(filterSessionType === "collective" ? "all" : "collective")}
                              className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition-all",
                                filterSessionType === "collective"
                                  ? "bg-primary text-white border-primary"
                                  : "bg-white text-gray-600 border-gray-200"
                              )}
                            >
                              <Users className="w-3 h-3" />
                              Collectif
                            </button>

                            <span className="w-px h-5 bg-gray-200" />

                            {/* Filtre lieu */}
                            <button
                              onClick={() => setFilterLocation(filterLocation === "announcer_home" ? "all" : "announcer_home")}
                              className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition-all",
                                filterLocation === "announcer_home"
                                  ? "bg-secondary text-white border-secondary"
                                  : "bg-white text-gray-600 border-gray-200"
                              )}
                            >
                              <Home className="w-3 h-3" />
                              Chez le pro
                            </button>
                            <button
                              onClick={() => setFilterLocation(filterLocation === "client_home" ? "all" : "client_home")}
                              className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition-all",
                                filterLocation === "client_home"
                                  ? "bg-secondary text-white border-secondary"
                                  : "bg-white text-gray-600 border-gray-200"
                              )}
                            >
                              <MapPin className="w-3 h-3" />
                              À domicile
                            </button>

                            {/* Filtre animaux si disponible */}
                            {allAnimalsInFormules.length > 0 && (
                              <>
                                <span className="w-px h-5 bg-gray-200" />
                                <select
                                  value={filterAnimal}
                                  onChange={(e) => setFilterAnimal(e.target.value)}
                                  className={cn(
                                    "px-2.5 py-1 text-xs rounded-full border transition-all appearance-none pr-6 cursor-pointer",
                                    filterAnimal !== "all"
                                      ? "bg-amber-500 text-white border-amber-500"
                                      : "bg-white text-gray-600 border-gray-200"
                                  )}
                                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.25rem center", backgroundRepeat: "no-repeat", backgroundSize: "1em 1em" }}
                                >
                                  <option value="all">Animal</option>
                                  {allAnimalsInFormules.map(animal => (
                                    <option key={animal} value={animal}>{animalLabels[animal] || animal}</option>
                                  ))}
                                </select>
                              </>
                            )}

                            {/* Bouton reset */}
                            {hasActiveFilters && (
                              <button
                                onClick={resetFilters}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-primary transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}

                        {/* Liste des formules par service */}
                        {services.map((service, index) => {
                          const filteredFormules = getFilteredFormules(service.formules);
                          if (filteredFormules.length === 0) return null;

                          return (
                            <div
                              key={service.id.toString()}
                              className={cn(
                                index > 0 && "pt-3 border-t border-gray-100"
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
                              <div className="space-y-3">
                                {filteredFormules.map((formule) => {
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
                                      className="w-full p-4 bg-white border border-gray-200 rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                                    >
                                      {/* Titre + Prix */}
                                      <div className="flex items-start justify-between gap-3 mb-2">
                                        <p className="font-semibold text-gray-900">
                                          {formule.name}
                                        </p>
                                        <span className="text-lg font-bold text-primary flex-shrink-0">
                                          {formatPrice(
                                            calculatePriceWithCommission(formulePrice, commissionRate)
                                          )}
                                          €
                                          <span className="text-xs font-normal text-gray-500">
                                            {formuleUnit ? `/${formuleUnit}` : ""}
                                          </span>
                                        </span>
                                      </div>

                                      {/* Description */}
                                      {formule.description && (
                                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                                          {formule.description}
                                        </p>
                                      )}

                                      {/* Badges */}
                                      <div className="flex flex-wrap items-center gap-1.5 mb-3">
                                        {formule.sessionType === "collective" ? (
                                          <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full">
                                            <Users className="w-3 h-3" />
                                            Collectif
                                          </span>
                                        ) : (
                                          <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full">
                                            <Users className="w-3 h-3" />
                                            Individuel
                                          </span>
                                        )}
                                        {formule.serviceLocation && (
                                          <span className={cn(
                                            "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                                            formule.serviceLocation === "announcer_home" && "bg-primary/10 text-primary",
                                            formule.serviceLocation === "client_home" && "bg-secondary/10 text-secondary",
                                            formule.serviceLocation === "both" && "bg-purple-100 text-purple-600"
                                          )}>
                                            {formule.serviceLocation === "announcer_home" && <><Home className="w-3 h-3" /> Chez le pro</>}
                                            {formule.serviceLocation === "client_home" && <><MapPin className="w-3 h-3" /> À domicile</>}
                                            {formule.serviceLocation === "both" && <><Home className="w-2.5 h-2.5" /><MapPin className="w-2.5 h-2.5" /> Flexible</>}
                                          </span>
                                        )}
                                        {formule.duration && (
                                          <span className="flex items-center gap-1 text-xs text-gray-500">
                                            <Clock className="w-3 h-3" />
                                            {formule.duration} min
                                          </span>
                                        )}
                                        {formule.numberOfSessions && formule.numberOfSessions > 1 && (
                                          <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-purple-100 text-purple-600 rounded-full">
                                            <Calendar className="w-3 h-3" />
                                            {formule.numberOfSessions} séances
                                          </span>
                                        )}
                                      </div>

                                      {/* Bouton Réserver */}
                                      <div className="w-full py-2.5 bg-gradient-to-r from-primary to-primary/90 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2">
                                        Réserver maintenant
                                        <ArrowRight className="w-4 h-4" />
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
                          );
                        })}

                        {/* Message si aucune formule ne correspond aux filtres */}
                        {services.every(s => getFilteredFormules(s.formules).length === 0) && (
                          <div className="bg-gray-50 rounded-xl p-6 text-center">
                            <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500 text-sm mb-2">Aucune formule ne correspond aux filtres</p>
                            <button onClick={resetFilters} className="text-sm text-primary hover:underline font-medium">
                              Réinitialiser les filtres
                            </button>
                          </div>
                        )}
                      </div>
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
                {/* Backdrop - bloque les interactions en dessous */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsCalendarSheetOpen(false)}
                  className="fixed inset-0 bg-black/50 z-[9998] md:hidden"
                  style={{ touchAction: 'none' }}
                />

                {/* Calendar Sheet - avec support clavier mobile */}
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="fixed inset-x-0 bottom-0 bg-white rounded-t-2xl z-[9999] md:hidden flex flex-col"
                  style={{
                    maxHeight: '90dvh',
                    height: 'auto',
                  }}
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

                  {/* Sheet Content - zone scrollable */}
                  <div
                    className="flex-1 overflow-y-auto p-4"
                    style={{
                      WebkitOverflowScrolling: 'touch',
                      overscrollBehavior: 'contain',
                      minHeight: 0,
                    }}
                  >
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

      {/* Step Sheet pour services garde et vérification chien (Portal) */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isStepSheetOpen && hasVariantSelected && (isRangeMode || needsLocationStep || isCollectiveFormule || isMultiSessionIndividual || mobileStep === "dog") && (
              <>
                {/* Backdrop - bloque les interactions en dessous */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsStepSheetOpen(false)}
                  className="fixed inset-0 bg-black/50 z-[9998] md:hidden"
                  style={{ touchAction: 'none' }}
                />

                {/* Step Sheet - avec support clavier mobile */}
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="fixed inset-x-0 bottom-0 bg-white rounded-t-2xl z-[9999] md:hidden flex flex-col"
                  style={{
                    maxHeight: '90dvh',
                    height: 'auto',
                  }}
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
                          {mobileStep === "dog" && "Votre animal"}
                          {mobileStep === "animals" && "Vos animaux"}
                          {mobileStep === "location" && (needsAddressOnly ? "Votre adresse" : "Lieu de prestation")}
                          {mobileStep === "dates" && (isRangeMode ? "Dates de garde" : "Date et heure")}
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

                  {/* Indicateur d'étapes - commence à 1 avec Formule (déjà complétée) */}
                  <div className="flex items-center gap-1 px-4 py-3 border-b border-gray-50">
                    {(() => {
                      // Construire la liste des étapes : Formule (1) est toujours complétée
                      const steps: MobileBookingStep[] = ["formule"];
                      if (requiresAnimalVerification) steps.push("dog");
                      steps.push("dates");
                      if (hasOptionsStep) steps.push("options");
                      steps.push("summary");

                      return steps.map((step, index) => {
                        const isActive = mobileStep === step;
                        const stepIndex = steps.indexOf(mobileStep);
                        // Formule est toujours passée (index 0), les autres dépendent de l'étape actuelle
                        const isPast = step === "formule" || index < stepIndex;
                        const stepNumber = index + 1;

                        return (
                          <div key={step} className="flex items-center gap-1 flex-1">
                            <div className={cn(
                              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors flex-shrink-0",
                              isActive ? "bg-primary text-white" :
                              isPast ? "bg-secondary/20 text-secondary" :
                              "bg-gray-100 text-gray-400"
                            )}>
                              {isPast ? <Check className="w-3 h-3" /> : stepNumber}
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

                  {/* Sheet Content - zone scrollable */}
                  <div
                    className="flex-1 overflow-y-auto p-4"
                    style={{
                      WebkitOverflowScrolling: 'touch',
                      overscrollBehavior: 'contain',
                      minHeight: 0, // Important pour flex avec overflow
                    }}
                  >
                    {/* Étape Vérification de l'animal (chien ou chat) */}
                    {mobileStep === "dog" && onGuestAnimalDataChange && onGuestAnimalValidationChange && (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-500">
                          Renseignez les informations de votre animal pour vérifier qu'il correspond aux critères de cette formule.
                        </p>

                        <GuestAnimalVerification
                          acceptedAnimalTypes={acceptedAnimalTypes}
                          dogRestrictions={dogRestrictions}
                          onAnimalDataChange={onGuestAnimalDataChange}
                          onValidationChange={onGuestAnimalValidationChange}
                          initialData={guestAnimalData}
                        />
                      </div>
                    )}

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
                          {isCollectiveFormule && isAnnouncerHomeOnly
                            ? "Les séances ont lieu chez le prestataire."
                            : needsAddressOnly
                              ? "Indiquez l'adresse où aura lieu la prestation."
                              : "Où souhaitez-vous que la garde ait lieu ?"
                          }
                        </p>

                        {/* Cas formule collective chez l'annonceur uniquement */}
                        {isCollectiveFormule && isAnnouncerHomeOnly && (
                          <div className="space-y-4">
                            {/* Affichage du lieu de la séance */}
                            <div className="p-4 bg-gray-50 rounded-xl flex items-center gap-3">
                              <div className="p-2 bg-white rounded-lg">
                                <Home className="w-5 h-5 text-gray-500" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  Chez {announcerFirstName || "le prestataire"}
                                </p>
                                {announcerCity && (
                                  <p className="text-sm text-gray-500">
                                    {announcerCity}
                                  </p>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 italic px-1">
                              L'adresse exacte vous sera communiquée une fois la réservation acceptée.
                            </p>

                            {/* Saisie de l'adresse pour calculer la distance (optionnel) */}
                            <div className="pt-4 border-t border-gray-100">
                              <p className="text-sm font-medium text-gray-700 mb-3">
                                Votre adresse <span className="text-gray-400 font-normal">(pour calculer la distance)</span>
                              </p>
                              {isLoggedIn ? (
                                onAddressSelect && onAddNewAddress && (
                                  <AddressSelector
                                    addresses={clientAddresses}
                                    selectedAddressId={bookingSelection?.selectedAddressId ?? null}
                                    isLoading={isLoadingAddresses}
                                    onSelect={onAddressSelect}
                                    onAddNew={onAddNewAddress}
                                    announcerCoordinates={announcerCoordinates}
                                    announcerRadius={null}
                                  />
                                )
                              ) : (
                                onGuestAddressChange && (
                                  <GuestAddressSelector
                                    guestAddress={guestAddress ?? null}
                                    announcerCoordinates={announcerCoordinates}
                                    announcerRadius={null}
                                    onAddressChange={onGuestAddressChange}
                                  />
                                )
                              )}
                            </div>
                          </div>
                        )}

                        {/* Choix du lieu si les deux options sont disponibles */}
                        {!isAnnouncerHomeOnly && needsLocationChoice && onLocationSelect && (
                          <ServiceLocationSelector
                            serviceLocation={bookingService?.serviceLocation || "both"}
                            selectedLocation={bookingSelection?.serviceLocation ?? null}
                            onSelect={onLocationSelect}
                            isRangeMode={isRangeMode}
                            announcerFirstName={announcerFirstName}
                          />
                        )}

                        {/* Afficher la ville si chez l'annonceur */}
                        {!isAnnouncerHomeOnly && bookingSelection?.serviceLocation === "announcer_home" && announcerCity && (
                          <p className="text-xs text-gray-500 italic px-1">
                            L'adresse exacte vous sera communiquée après acceptation.
                          </p>
                        )}

                        {/* Sélecteur d'adresse si à domicile ou formule uniquement à domicile */}
                        {!isAnnouncerHomeOnly && (needsAddressOnly || bookingSelection?.serviceLocation === "client_home") && (
                          <div className={needsLocationChoice ? "mt-4 pt-4 border-t border-gray-100" : ""}>
                            {isLoggedIn ? (
                              onAddressSelect && onAddNewAddress && (
                                <AddressSelector
                                  addresses={clientAddresses}
                                  selectedAddressId={bookingSelection?.selectedAddressId ?? null}
                                  isLoading={isLoadingAddresses}
                                  onSelect={onAddressSelect}
                                  onAddNew={onAddNewAddress}
                                  announcerCoordinates={announcerCoordinates}
                                  announcerRadius={announcerRadius}
                                  onDistanceError={(outOfRange) => setIsAddressOutOfRange(outOfRange)}
                                />
                              )
                            ) : (
                              onGuestAddressChange && (
                                <GuestAddressSelector
                                  guestAddress={guestAddress ?? null}
                                  announcerCoordinates={announcerCoordinates}
                                  announcerRadius={announcerRadius}
                                  onAddressChange={onGuestAddressChange}
                                  onDistanceError={setIsAddressOutOfRange}
                                />
                              )
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Étape Dates */}
                    {mobileStep === "dates" && (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-500">
                          {isRangeMode
                            ? "Sélectionnez les dates de la garde."
                            : isCollectiveFormule
                              ? `Sélectionnez ${collectiveNumberOfSessions} séance${collectiveNumberOfSessions > 1 ? "s" : ""} collective${collectiveNumberOfSessions > 1 ? "s" : ""}.`
                              : isMultiSessionIndividual
                                ? `Sélectionnez ${individualNumberOfSessions} séance${individualNumberOfSessions > 1 ? "s" : ""}.`
                                : "Sélectionnez une date et un créneau."
                          }
                        </p>

                        {/* Calendrier pour services garde (mode plage de dates) */}
                        {isRangeMode && calendarMonth && onDateSelect && onEndDateSelect && onTimeSelect && onEndTimeSelect && onOvernightChange && onMonthChange && (
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

                        {/* CollectiveSlotPicker pour formules collectives */}
                        {!isRangeMode && isCollectiveFormule && bookingVariant && onSlotsSelected && (
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
                        )}

                        {/* Calendrier pour formules individuelles (multi-session ou uni-session) */}
                        {!isRangeMode && !isCollectiveFormule && calendarMonth && onMonthChange && onSessionsChange && (
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
                          announcerStatusType={announcerStatusType}
                          requiresAnimalVerification={requiresAnimalVerification}
                          guestAnimalValid={guestAnimalValid}
                          guestAnimalError={guestAnimalError}
                          compact
                        />
                      </div>
                    )}
                  </div>

                  {/* Bouton de navigation */}
                  <div className="p-4 border-t border-gray-100 flex-shrink-0 space-y-3">
                    {mobileStep === "summary" ? (
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setIsStepSheetOpen(false);
                          onFinalize?.();
                        }}
                        className="w-full py-3.5 bg-gradient-to-r from-primary to-primary/90 text-white font-semibold rounded-xl shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
                      >
                        <CreditCard className="w-4 h-4" />
                        Finaliser la réservation
                        <ArrowRight className="w-4 h-4" />
                      </motion.button>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={handleNextStep}
                        disabled={!canProceedToNextStep()}
                        className={cn(
                          "w-full py-3.5 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors",
                          mobileStep === "dog" && guestAnimalError
                            ? "bg-red-500 text-white cursor-not-allowed"
                            : canProceedToNextStep()
                              ? "bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg shadow-primary/25"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        )}
                      >
                        {mobileStep === "dog" && guestAnimalError && <AlertTriangle className="w-4 h-4" />}
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

      {/* Login Sheet (Portal) */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isLoginSheetOpen && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsLoginSheetOpen(false)}
                  className="fixed inset-0 bg-black/50 z-[9998] md:hidden"
                  style={{ touchAction: 'none' }}
                />

                {/* Login Sheet */}
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="fixed inset-x-0 bottom-0 bg-white rounded-t-2xl z-[9999] md:hidden flex flex-col"
                  style={{
                    maxHeight: '85dvh',
                    height: 'auto',
                  }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
                    <h3 className="text-lg font-semibold text-gray-900">Connexion</h3>
                    <button
                      onClick={() => setIsLoginSheetOpen(false)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleLogin} className="flex-1 overflow-y-auto p-4 space-y-4">
                    <p className="text-sm text-gray-500">
                      Connectez-vous pour accéder à toutes les fonctionnalités et réserver plus facilement.
                    </p>

                    {loginError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                        {loginError}
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <label htmlFor="mobile-login-email" className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            id="mobile-login-email"
                            type="email"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            placeholder="votre@email.com"
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            autoComplete="email"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="mobile-login-password" className="block text-sm font-medium text-gray-700 mb-1">
                          Mot de passe
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            id="mobile-login-password"
                            type="password"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            autoComplete="current-password"
                          />
                        </div>
                      </div>
                    </div>
                  </form>

                  {/* Footer */}
                  <div className="p-4 border-t border-gray-100 flex-shrink-0 space-y-3">
                    <button
                      type="submit"
                      onClick={handleLogin}
                      disabled={isLoggingIn}
                      className={cn(
                        "w-full py-3.5 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors",
                        isLoggingIn
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg shadow-primary/25"
                      )}
                    >
                      {isLoggingIn ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Connexion...
                        </>
                      ) : (
                        <>
                          <LogIn className="w-4 h-4" />
                          Se connecter
                        </>
                      )}
                    </button>

                    <p className="text-center text-sm text-gray-500">
                      Pas encore de compte ?{" "}
                      <a href="/inscription" className="text-primary font-medium">
                        Inscrivez-vous
                      </a>
                    </p>
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
