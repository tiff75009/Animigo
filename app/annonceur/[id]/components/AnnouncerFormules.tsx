"use client";

import { useState, useMemo, useEffect } from "react";
import { Package, Sparkles, Plus, MousePointerClick, Filter, PawPrint, Check, MapPin, Home, Users, Target, Clock, Info, CalendarDays, Mail, Lock, Loader2, X, LogIn, Dog, AlertTriangle, ArrowLeft, ArrowRight, ChevronLeft, Eye, CreditCard } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/app/lib/utils";
import { setAuthToken as storeAuthToken } from "@/app/lib/authToken";

// Types pour les étapes desktop
type DesktopStep =
  | "formule"
  | "dog"
  | "animals"
  | "dates"
  | "location"
  | "options"
  | "recap"
  | "finalize";

// Variants pour les animations de transition
const slideVariants = {
  enterFromRight: {
    x: 300,
    opacity: 0,
  },
  enterFromLeft: {
    x: -300,
    opacity: 0,
  },
  center: {
    x: 0,
    opacity: 1,
  },
  exitToLeft: {
    x: -300,
    opacity: 0,
  },
  exitToRight: {
    x: 300,
    opacity: 0,
  },
};
import GuestAnimalVerification, { type GuestAnimalData } from "@/app/reserver/[announcerId]/components/GuestAnimalVerification";
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
  MultiSessionCalendar,
  FormuleFilters,
  getFilteredFormules,
  type BookingSelection,
  type PriceBreakdown,
  type CalendarEntry,
  type ClientAddress,
  type GuestAddress,
  type SelectedSession,
  isGardeService,
} from "./booking";
import {
  FormuleStep,
  AnimalsStep,
  DatesStep,
  LocationStep,
  OptionsStep,
  RecapStep,
  FinalizeStep,
  StepNav,
  slideVariants as importedSlideVariants,
} from "./booking/steps";

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
  onVariantDeselect?: () => void;
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
  // Séances individuelles multi-sessions
  selectedSessions?: SelectedSession[];
  onSessionsChange?: (sessions: SelectedSession[]) => void;
  // Sélection de l'animal (utilisateur connecté - sélection multiple)
  userAnimals?: Array<{
    id: string;
    name: string;
    type: string;
    breed?: string;
    profilePhoto?: string;
  }>;
  selectedAnimalIds?: string[];
  onAnimalToggle?: (animalId: string, animalType: string) => void;
  maxSelectableAnimals?: number;
  // Infos annonceur pour la section lieu
  announcerCity?: string;
  announcerFirstName?: string;
  // Rayon d'action de l'annonceur
  announcerRadius?: number | null;
  // Callback quand l'utilisateur se connecte (pour mettre à jour l'état parent)
  onLoginSuccess?: (token: string) => void;
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
  // Callback pour finaliser la réservation
  onBook?: () => void;
  onFinalize?: () => void;
  isAnnouncer?: boolean;
  className?: string;

  // ─── Wizard intégré : étapes Récap + Finalisation ───
  // Données complémentaires nécessaires pour ces 2 nouvelles étapes
  collectiveSlotsDetails?: Array<{
    _id: string;
    date: string;
    startTime: string;
    endTime: string;
    availableSpots: number;
  }>;
  priceBreakdown?: PriceBreakdown | null;
  announcerStatusType?: "particulier" | "micro_entrepreneur" | "professionnel";
  announcerLastName?: string;
  // State du formulaire de finalisation (géré par la page parent)
  finalizeData?: {
    guestData?: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      password: string;
      confirmPassword: string;
    };
    notes?: string;
    acceptedCGV?: boolean;
    acceptedPrivacy?: boolean;
    acceptedCancellation?: boolean;
    isSubmitting?: boolean;
    submitError?: string | null;
    fieldErrors?: Record<string, string>;
  };
  onFinalizeDataChange?: (data: NonNullable<AnnouncerFormulesProps["finalizeData"]>) => void;
  // Handler appelé sur clic "Confirmer la réservation"
  onFinalizeWizard?: () => void | Promise<void>;
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
  onVariantDeselect,
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
  selectedSessions = [],
  onSessionsChange,
  userAnimals = [],
  selectedAnimalIds = [],
  onAnimalToggle,
  maxSelectableAnimals = 1,
  announcerCity,
  announcerFirstName,
  announcerRadius,
  onLoginSuccess,
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
  onBook,
  onFinalize,
  isAnnouncer = false,
  className,
  // Wizard intégré
  collectiveSlotsDetails,
  priceBreakdown,
  announcerStatusType,
  announcerLastName,
  finalizeData,
  onFinalizeDataChange,
  onFinalizeWizard,
}: AnnouncerFormulesProps) {
  // État pour l'étape actuelle (desktop)
  const [desktopStep, setDesktopStep] = useState<DesktopStep>("formule");
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");

  // État pour l'erreur de distance (adresse hors rayon d'action)
  const [isAddressOutOfRange, setIsAddressOutOfRange] = useState(false);

  // États pour le formulaire de connexion inline
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Mutation de connexion
  const login = useMutation(api.auth.login.login);

  // Handler de connexion
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const result = await login({
        email: loginEmail.trim().toLowerCase(),
        password: loginPassword,
      });

      if (result.success && result.token) {
        // Stocker le token
        await storeAuthToken(result.token);
        // Notifier le parent
        onLoginSuccess?.(result.token);
        // Réinitialiser le formulaire
        setShowLoginForm(false);
        setLoginEmail("");
        setLoginPassword("");
      }
    } catch (err) {
      if (err instanceof Error) {
        setLoginError(err.message);
      } else {
        setLoginError("Une erreur est survenue");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

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

  // Filtrer les formules via le helper partagé
  const filteredFormules = getFilteredFormules(service.formules, filterSessionType, filterLocation, filterAnimal);

  const resetFilters = () => {
    setFilterSessionType("all");
    setFilterLocation("all");
    setFilterAnimal("all");
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

  // Déterminer si c'est une formule individuelle multi-séances
  const isMultiSessionIndividual = !isCollectiveFormule &&
    (selectedFormule?.numberOfSessions || 1) > 1;
  const individualNumberOfSessions = selectedFormule?.numberOfSessions || 1;
  const individualSessionInterval = selectedFormule?.sessionInterval || 0;

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

  // Pour les formules collectives
  const hasSlotsSelected = selectedSlotIds.length > 0;
  const selectedSlotsCount = selectedSlotIds.length;

  // Pour les formules individuelles multi-séances
  const hasSessionsSelected = selectedSessions.length > 0;
  const selectedSessionsCount = selectedSessions.length;

  // Calculer les animaux compatibles avec la formule sélectionnée
  // Comparaison insensible à la casse pour gérer les différences de format
  const compatibleUserAnimals = userAnimals.filter((animal) => {
    const variantTypes = selectedFormule?.animalTypes;
    const serviceTypes = service?.animalTypes;
    // Fallback: si le variant n'a pas de types définis OU est un tableau vide, utiliser le service
    const acceptedTypes = (variantTypes && variantTypes.length > 0) ? variantTypes : (serviceTypes || []);
    if (acceptedTypes.length === 0) return true;
    const animalTypeLower = animal.type?.toLowerCase();
    return acceptedTypes.some((t) => t.toLowerCase() === animalTypeLower);
  });

  // L'utilisateur a-t-il sélectionné au moins un animal?
  const hasAnimalsSelected = selectedAnimalIds.length > 0;

  // Déterminer le serviceLocation de la formule ou du service
  const formuleServiceLocation = selectedFormule?.serviceLocation || service?.serviceLocation;

  // Mapper le DesktopStep courant vers l'id utilisé par useBookingSteps
  const currentStepIdForBar = useMemo(() => {
    if (desktopStep === "dates") {
      return isCollectiveFormule ? "slots" : isMultiSessionIndividual ? "sessions" : "calendar";
    }
    return desktopStep;
  }, [desktopStep, isCollectiveFormule, isMultiSessionIndividual]);

  const steps = useBookingSteps({
    hasVariantSelected,
    hasDateSelected,
    hasEndDateSelected,
    hasTimeSelected,
    hasEndTimeSelected,
    isRangeMode,
    showLocationSelector: showLocationSelector && !isCollectiveFormule, // Pas de sélecteur de lieu pour les collectives
    hasLocationSelected,
    hasOptions,
    hasOptionsSelected,
    // Paramètres pour les formules collectives
    isCollectiveFormula: isCollectiveFormule,
    hasSlotsSelected,
    requiredSlots: collectiveNumberOfSessions,
    selectedSlotsCount,
    // Paramètres pour les formules individuelles multi-séances
    isMultiSessionIndividual,
    hasSessionsSelected: isMultiSessionIndividual ? hasSessionsSelected : hasDateSelected && hasTimeSelected,
    requiredSessions: individualNumberOfSessions,
    selectedSessionsCount,
    // Nouveaux paramètres pour l'étape Animaux
    isLoggedIn,
    hasAnimalsSelected: hasAnimalsSelected || !isLoggedIn, // Pas d'animal requis pour les invités
    selectedAnimalsCount: selectedAnimalIds.length,
    maxAnimals: maxSelectableAnimals,
    // Vérification animal pour invités (chien/chat)
    requiresAnimalVerification,
    guestAnimalValid,
    // Paramètre pour l'étape Lieu
    serviceLocation: formuleServiceLocation,
    // Étape active courante pour cocher les précédentes
    currentStepId: currentStepIdForBar,
  });

  // Calculer les étapes disponibles pour la version desktop
  // Ordre: formule → dog → animals → location → dates → options
  // (même ordre que sur mobile)
  const availableDesktopSteps = useMemo((): DesktopStep[] => {
    const steps: DesktopStep[] = ["formule"];

    // Vérification de l'animal (invités uniquement - chien ou chat)
    if (requiresAnimalVerification) {
      steps.push("dog"); // Garde le même nom d'étape pour compatibilité
    }

    // Sélection des animaux (utilisateurs connectés uniquement)
    if (isLoggedIn && userAnimals.length > 0) {
      steps.push("animals");
    }

    // Lieu (AVANT les dates - même ordre que mobile)
    // Toujours ajouter l'étape location pour tous les types de services
    // - Pour afficher le lieu (announcer_home)
    // - OU permettre le choix (both)
    // - OU saisir l'adresse (client_home)
    if (service) {
      steps.push("location");
    }

    // Dates/Planning (APRÈS location)
    steps.push("dates");

    // Options (si disponibles)
    if (hasOptions) {
      steps.push("options");
    }

    // Récap et Finalisation : toujours présents en fin de wizard
    steps.push("recap");
    steps.push("finalize");

    return steps;
  }, [requiresAnimalVerification, isLoggedIn, userAnimals.length, service, hasOptions]);

  // Index de l'étape actuelle
  const currentStepIndex = availableDesktopSteps.indexOf(desktopStep);

  // Obtenir le titre de l'étape
  const getStepTitle = (step: DesktopStep): string => {
    switch (step) {
      case "formule": return "Choisissez votre formule";
      case "dog": return "Informations sur votre animal";
      case "animals": return "Sélectionnez vos animaux";
      case "dates": return isCollectiveFormule ? "Choisissez vos créneaux" : isMultiSessionIndividual ? "Choisissez vos séances" : "Choisissez vos dates";
      case "location": return isCollectiveFormule ? "Lieu des séances" : "Lieu de prestation";
      case "options": return "Options supplémentaires";
      default: return "";
    }
  };

  // Vérifier si on peut passer à l'étape suivante
  const canProceedToNextStep = (): boolean => {
    switch (desktopStep) {
      case "formule":
        return hasVariantSelected;
      case "dog":
        return guestAnimalValid;
      case "animals":
        return hasAnimalsSelected;
      case "dates":
        // Le client doit sélectionner EXACTEMENT le nombre de séances défini
        // par l'annonceur — ni plus, ni moins.
        if (isCollectiveFormule) return selectedSlotsCount === collectiveNumberOfSessions;
        if (isMultiSessionIndividual) return selectedSessionsCount === individualNumberOfSessions;
        return hasDateSelected && hasTimeSelected;
      case "location":
        // Pour les formules collectives, l'adresse est optionnelle (c'est juste pour afficher la distance)
        if (isCollectiveFormule) {
          return true; // On peut toujours passer à l'étape suivante
        }
        // Si à domicile, vérifier que l'adresse est dans le rayon
        if (bookingSelection?.serviceLocation === "client_home") {
          if (isAddressOutOfRange) return false;
          // Vérifier qu'une adresse est sélectionnée
          if (isLoggedIn) return Boolean(bookingSelection?.selectedAddressId);
          return Boolean(guestAddress?.coordinates);
        }
        // Si formule uniquement à domicile (pas de choix), on est forcément dans le cas ci-dessus
        const formuleServiceLoc = selectedFormule?.serviceLocation || service?.serviceLocation;
        if (formuleServiceLoc === "client_home") {
          if (isAddressOutOfRange) return false;
          if (isLoggedIn) return Boolean(bookingSelection?.selectedAddressId);
          return Boolean(guestAddress?.coordinates);
        }
        return hasLocationSelected;
      case "options":
        return true; // Options sont optionnelles
      case "recap":
        return true; // Le récap est juste affichage : on peut toujours continuer
      case "finalize":
        return true; // La validation est faite par FinalizeStep en interne
      default:
        return false;
    }
  };

  // Navigation vers l'étape suivante
  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < availableDesktopSteps.length) {
      setSlideDirection("right");
      setDesktopStep(availableDesktopSteps[nextIndex]);
    }
  };

  // Navigation vers l'étape précédente
  const goToPrevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      const prevStep = availableDesktopSteps[prevIndex];
      setSlideDirection("left");
      // Si on revient à l'étape formule, désélectionner la formule
      if (prevStep === "formule") {
        onVariantDeselect?.();
      }
      setDesktopStep(prevStep);
    }
  };

  // Automatiquement passer à l'étape suivante quand une formule est sélectionnée
  // ⚠️ Important : on attend que `selectedFormule` soit RÉELLEMENT résolu dans
  // `service.formules`. Sinon, si on saute trop tôt (ID dans l'URL mais formule
  // pas encore chargée), DatesStep/LocationStep reçoivent `selectedFormule = null`
  // et affichent un contenu vide → "je vois les étapes mais pas les forms".
  useEffect(() => {
    if (hasVariantSelected && selectedFormule && desktopStep === "formule") {
      const nextStep = availableDesktopSteps[1];
      if (nextStep) {
        // Délai très court juste pour l'animation
        const timer = setTimeout(() => {
          setSlideDirection("right");
          setDesktopStep(nextStep);
        }, 200);
        return () => clearTimeout(timer);
      }
    }
  }, [hasVariantSelected, selectedFormule, desktopStep, availableDesktopSteps]);

  // Revenir à l'étape formule si on désélectionne la formule
  useEffect(() => {
    if (!hasVariantSelected && desktopStep !== "formule") {
      setSlideDirection("left");
      setDesktopStep("formule");
    }
  }, [hasVariantSelected, desktopStep]);

  // Garde-fou : si pour une raison quelconque on se retrouve sur une étape
  // qui requiert une formule mais que `selectedFormule` est null, on revient
  // à "formule" pour permettre au user de re-sélectionner.
  useEffect(() => {
    if (
      hasVariantSelected &&
      !selectedFormule &&
      desktopStep !== "formule" &&
      service.formules.length > 0
    ) {
      // selectedVariantId existe mais ne correspond à aucune formule du service
      // → soit la formule a été supprimée, soit elle n'est plus active.
      // On retourne à l'étape "formule" pour que le user choisisse à nouveau.
      setSlideDirection("left");
      setDesktopStep("formule");
    }
  }, [hasVariantSelected, selectedFormule, desktopStep, service.formules.length]);

  return (
    <section className={cn("relative", className)}>
      {/* VERSION DESKTOP - Affichage par étapes avec animations */}
      <div className="hidden md:block">
        <div className="flex gap-4 lg:gap-6">
          {/* Barre d'étapes verticale */}
          <div className="hidden lg:block flex-shrink-0 transition-all duration-300">
            <div className="sticky top-36">
              <BookingStepBar steps={steps} defaultCollapsed={true} />
            </div>
          </div>

          {/* Contenu principal - une seule étape à la fois */}
          <div className="flex-1 min-w-0">
            {/* En-tête du service - style card de recherche */}
            <div
              className="bg-white px-[18px] py-[14px] mb-5"
              style={{
                borderRadius: 14,
                border: "1px solid #ece9e1",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-xl"
                  style={{
                    borderRadius: 10,
                    background: "#f7f5ef",
                  }}
                >
                  {service.categoryIcon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-0.5">
                    Réservation
                  </div>
                  <h2 className="text-[15px] font-semibold text-[#1f1f1d] tracking-[-0.01em] truncate m-0">
                    {service.categoryName}
                  </h2>
                </div>
              </div>
            </div>

            {/* Indicateur d'étapes horizontal - style pill compact :
                seule l'étape ACTIVE affiche son label + numéro,
                les autres se réduisent à un cercle (avec tooltip natif).
                Ainsi le label de l'étape courante est toujours lisible
                quel que soit le nombre d'étapes. */}
            {hasVariantSelected && (
              <div
                className="bg-white p-1.5 mb-5 overflow-x-auto"
                style={{
                  borderRadius: 999,
                  border: "1px solid #ece9e1",
                }}
              >
                <div className="flex items-center gap-1 min-w-max lg:min-w-0">
                  {availableDesktopSteps.map((step, index) => {
                    const isActive = desktopStep === step;
                    const isPast = index < currentStepIndex;
                    const stepNumber = index + 1;
                    const isClickable = isPast || isActive;

                    const shortLabel = (() => {
                      switch (step) {
                        case "formule": return "Formule";
                        case "dog": return "Animal";
                        case "animals": return "Animaux";
                        case "dates": return isCollectiveFormule ? "Créneaux" : isMultiSessionIndividual ? "Séances" : "Dates";
                        case "location": return "Lieu";
                        case "options": return "Options";
                        case "recap": return "Récapitulatif";
                        case "finalize": return "Finaliser";
                        default: return "";
                      }
                    })();

                    return (
                      <div
                        key={step}
                        className={cn(
                          "flex items-center gap-1",
                          isActive ? "flex-1 min-w-0" : "flex-shrink-0"
                        )}
                      >
                        <button
                          onClick={() => {
                            if (isPast) {
                              setSlideDirection("left");
                              setDesktopStep(step);
                            }
                          }}
                          disabled={!isClickable}
                          title={shortLabel}
                          aria-label={`Étape ${stepNumber} : ${shortLabel}`}
                          className={cn(
                            "flex items-center justify-center gap-2 rounded-full text-[12px] font-medium transition-all whitespace-nowrap",
                            isActive
                              ? "flex-1 px-3 py-1.5"
                              : "w-7 h-7 px-0 py-0"
                          )}
                          style={
                            isActive
                              ? { background: "#1f3a33", color: "#f7f5ef" }
                              : isPast
                                ? { color: "#2f4a3f", background: "#eaf0ed" }
                                : { color: "#9c9484", background: "#fff", border: "1px solid #ece9e1" }
                          }
                        >
                          <span
                            className={cn(
                              "flex items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0",
                              isActive ? "w-4 h-4" : "w-full h-full"
                            )}
                            style={
                              isActive
                                ? { background: "rgba(247,245,239,0.25)", color: "#f7f5ef" }
                                : isPast
                                  ? { background: "transparent", color: "#2f4a3f" }
                                  : { background: "transparent", color: "#9c9484" }
                            }
                          >
                            {isPast ? <Check className="w-3 h-3" /> : stepNumber}
                          </span>
                          {isActive && (
                            <span className="hidden lg:inline truncate">{shortLabel}</span>
                          )}
                        </button>
                        {index < availableDesktopSteps.length - 1 && (
                          <div
                            className="w-1.5 h-px flex-shrink-0"
                            style={{ background: isPast ? "#cfdbd3" : "#ece9e1" }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Contenu de l'étape avec animation */}
            <div className="relative overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                {/* ÉTAPE: Formules */}
                {desktopStep === "formule" && (
                  <FormuleStep
                    service={service}
                    selectedVariantId={selectedVariantId ?? null}
                    isGarde={isGarde}
                    commissionRate={commissionRate}
                    announcerFirstName={announcerFirstName}
                    isAnnouncer={isAnnouncer}
                    onVariantSelect={(sId, vId) => onVariantSelect?.(sId, vId)}
                    slideVariants={slideVariants}
                    slideDirection={slideDirection}
                  />
                )}

                {/* ÉTAPE: Vérification de l'animal (chien ou chat) */}
                {desktopStep === "dog" && requiresAnimalVerification && onGuestAnimalDataChange && onGuestAnimalValidationChange && (
                  <motion.div
                    key="dog"
                    initial={slideDirection === "right" ? "enterFromRight" : "enterFromLeft"}
                    animate="center"
                    exit={slideDirection === "right" ? "exitToLeft" : "exitToRight"}
                    variants={slideVariants}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div
                      className="bg-white p-[18px] sm:p-5"
                      style={{
                        borderRadius: 14,
                        border: `1px solid ${
                          guestAnimalValid
                            ? "#cfdbd3"
                            : guestAnimalError
                              ? "#f1cdcd"
                              : "#ece9e1"
                        }`,
                      }}
                    >
                      <GuestAnimalVerification
                        acceptedAnimalTypes={acceptedAnimalTypes}
                        dogRestrictions={dogRestrictions}
                        onAnimalDataChange={onGuestAnimalDataChange}
                        onValidationChange={onGuestAnimalValidationChange}
                        initialData={guestAnimalData}
                      />
                    </div>

                    <StepNav
                      onPrevStep={goToPrevStep}
                      onNextStep={goToNextStep}
                      canProceed={canProceedToNextStep()}
                    />
                  </motion.div>
                )}

                {/* ÉTAPE: Sélection des animaux (utilisateurs connectés) */}
                {desktopStep === "animals" && isLoggedIn && compatibleUserAnimals.length > 0 && onAnimalToggle && (
                  <AnimalsStep
                    userAnimals={compatibleUserAnimals}
                    selectedAnimalIds={selectedAnimalIds}
                    connectedDogErrors={connectedDogErrors}
                    onAnimalToggle={onAnimalToggle}
                    onPrevStep={goToPrevStep}
                    onNextStep={goToNextStep}
                    canProceed={canProceedToNextStep()}
                    slideVariants={slideVariants}
                    slideDirection={slideDirection}
                  />
                )}

                {/* ÉTAPE: Dates/Planning */}
                {desktopStep === "dates" && (
                  <DatesStep
                    isCollectiveFormule={isCollectiveFormule}
                    isMultiSessionIndividual={isMultiSessionIndividual}
                    selectedFormule={selectedFormule ?? null}
                    collectiveNumberOfSessions={collectiveNumberOfSessions}
                    collectiveSessionInterval={collectiveSessionInterval}
                    animalCount={animalCount}
                    selectedAnimalType={selectedAnimalType}
                    selectedSlotIds={selectedSlotIds}
                    onSlotsSelected={onSlotsSelected}
                    individualNumberOfSessions={individualNumberOfSessions}
                    individualSessionInterval={individualSessionInterval}
                    selectedSessions={selectedSessions}
                    onSessionsChange={onSessionsChange}
                    bookingSelection={bookingSelection}
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
                    onPrevStep={goToPrevStep}
                    onNextStep={goToNextStep}
                    canProceed={canProceedToNextStep()}
                    isLastStep={currentStepIndex === availableDesktopSteps.length - 1}
                    slideVariants={slideVariants}
                    slideDirection={slideDirection}
                  />
                )}

                {/* ÉTAPE: Lieu de prestation */}
                {desktopStep === "location" && (
                  <LocationStep
                    formuleServiceLocation={formuleServiceLocation}
                    isRangeMode={isRangeMode}
                    announcerFirstName={announcerFirstName}
                    announcerCoordinates={announcerCoordinates}
                    announcerRadius={announcerRadius}
                    bookingSelection={bookingSelection}
                    isLoggedIn={isLoggedIn}
                    clientAddresses={clientAddresses}
                    isLoadingAddresses={isLoadingAddresses}
                    guestAddress={guestAddress}
                    onLocationSelect={onLocationSelect}
                    onAddressSelect={onAddressSelect}
                    onAddNewAddress={onAddNewAddress}
                    onGuestAddressChange={onGuestAddressChange}
                    onAddressOutOfRange={setIsAddressOutOfRange}
                    onPrevStep={goToPrevStep}
                    onNextStep={goToNextStep}
                    canProceed={canProceedToNextStep()}
                    isLastStep={currentStepIndex === availableDesktopSteps.length - 1}
                    slideVariants={slideVariants}
                    slideDirection={slideDirection}
                  />
                )}

                {/* ÉTAPE: Options */}
                {desktopStep === "options" && (
                  <OptionsStep
                    options={service.options}
                    selectedOptionIds={selectedOptionIds}
                    onOptionToggle={onOptionToggle}
                    commissionRate={commissionRate}
                    onPrevStep={goToPrevStep}
                    onNextStep={goToNextStep}
                    isLastStep={false}
                    onBook={onBook}
                    onFinalize={onFinalize}
                    slideVariants={slideVariants}
                    slideDirection={slideDirection}
                  />
                )}

                {/* ÉTAPE: Récapitulatif */}
                {desktopStep === "recap" && selectedFormule && (
                  <RecapStep
                    service={service}
                    variant={selectedFormule}
                    bookingSelection={bookingSelection ?? ({} as BookingSelection)}
                    isCollectiveFormule={isCollectiveFormule}
                    isMultiSessionIndividual={isMultiSessionIndividual}
                    collectiveSlots={collectiveSlotsDetails ?? []}
                    selectedSessions={selectedSessions ?? []}
                    numberOfSessions={
                      isCollectiveFormule
                        ? collectiveNumberOfSessions
                        : individualNumberOfSessions
                    }
                    animalCount={animalCount}
                    selectedOptions={
                      service.options?.filter((o) =>
                        selectedOptionIds?.includes(o.id)
                      ) ?? []
                    }
                    priceBreakdown={priceBreakdown ?? null}
                    announcerStatusType={
                      (announcerStatusType ?? "particulier") as
                        | "particulier"
                        | "micro_entrepreneur"
                        | "professionnel"
                    }
                    announcerFirstName={announcerFirstName}
                    announcerLastName={announcerLastName ?? ""}
                    onPrevStep={goToPrevStep}
                    onNextStep={goToNextStep}
                    slideVariants={slideVariants}
                    slideDirection={slideDirection}
                  />
                )}

                {/* ÉTAPE: Finalisation */}
                {desktopStep === "finalize" && onFinalizeWizard && (
                  <FinalizeStep
                    isLoggedIn={isLoggedIn}
                    guestData={
                      finalizeData?.guestData ?? {
                        firstName: "",
                        lastName: "",
                        email: "",
                        phone: "",
                        password: "",
                        confirmPassword: "",
                      }
                    }
                    onGuestDataChange={(d) =>
                      onFinalizeDataChange?.({ ...finalizeData, guestData: d })
                    }
                    notes={finalizeData?.notes ?? ""}
                    onNotesChange={(v) =>
                      onFinalizeDataChange?.({ ...finalizeData, notes: v })
                    }
                    acceptedCGV={finalizeData?.acceptedCGV ?? false}
                    onAcceptCGV={(v) =>
                      onFinalizeDataChange?.({ ...finalizeData, acceptedCGV: v })
                    }
                    acceptedPrivacy={finalizeData?.acceptedPrivacy ?? false}
                    onAcceptPrivacy={(v) =>
                      onFinalizeDataChange?.({ ...finalizeData, acceptedPrivacy: v })
                    }
                    acceptedCancellation={finalizeData?.acceptedCancellation ?? false}
                    onAcceptCancellation={(v) =>
                      onFinalizeDataChange?.({
                        ...finalizeData,
                        acceptedCancellation: v,
                      })
                    }
                    showLoginForm={showLoginForm}
                    onShowLoginForm={setShowLoginForm}
                    loginEmail={loginEmail}
                    loginPassword={loginPassword}
                    onLoginEmailChange={setLoginEmail}
                    onLoginPasswordChange={setLoginPassword}
                    onLogin={handleLogin}
                    loginError={loginError}
                    isLoggingIn={isLoggingIn}
                    isSubmitting={finalizeData?.isSubmitting ?? false}
                    submitError={finalizeData?.submitError ?? null}
                    onSubmit={onFinalizeWizard}
                    fieldErrors={finalizeData?.fieldErrors ?? {}}
                    onPrevStep={goToPrevStep}
                    slideVariants={slideVariants}
                    slideDirection={slideDirection}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* VERSION MOBILE - Affichage classique (tout visible) */}
      <div className="md:hidden">
        <div className="space-y-6">
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

      {/* Titre section */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-3">
          <span className="p-2 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl">
            <Package className="w-5 h-5 text-primary" />
          </span>
          Choisir une formule
        </h3>
        {!hasVariantSelected && (
          <p className="text-sm text-gray-500 mt-2 ml-11">
            Sélectionnez la formule qui correspond à vos besoins
          </p>
        )}
      </div>

      {/* Filtres */}
      <div className="mb-4">
        <FormuleFilters
          services={[service]}
          filterSessionType={filterSessionType}
          filterLocation={filterLocation}
          filterAnimal={filterAnimal}
          onFilterSessionTypeChange={setFilterSessionType}
          onFilterLocationChange={setFilterLocation}
          onFilterAnimalChange={setFilterAnimal}
          onReset={resetFilters}
        />
      </div>

      {/* Liste des formules */}
      {service.formules.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-6 text-center">
          <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500">Aucune formule disponible</p>
        </div>
      ) : filteredFormules.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-6 text-center">
          <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 mb-2">Aucune formule ne correspond aux filtres</p>
          <button onClick={resetFilters} className="text-sm text-primary hover:underline font-medium">
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
              allowOvernightStay={service.allowOvernightStay}
              overnightPrice={service.overnightPrice}
              announcerFirstName={announcerFirstName}
              dogCategoryAcceptance={service.dogCategoryAcceptance}
              isAnnouncer={isAnnouncer}
            />
          ))}
        </div>
      )}

      {/* Section Animaux - Étape 1: sélectionner les animaux AVANT le planning - Desktop uniquement */}
      {hasVariantSelected && isLoggedIn && userAnimals.length > 0 && onAnimalToggle && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "hidden md:block bg-white rounded-2xl p-5 sm:p-6 border-2 transition-colors duration-300",
            hasAnimalsSelected
              ? "border-gray-100"
              : "border-primary/30"
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className={cn(
                "p-2 rounded-lg transition-colors duration-300",
                hasAnimalsSelected ? "bg-primary/10" : "bg-primary/15"
              )}>
                <PawPrint className={cn(
                  "w-5 h-5 transition-colors duration-300",
                  hasAnimalsSelected ? "text-primary" : "text-primary"
                )} />
              </span>
              Vos animaux
            </h3>
            <span className="text-sm text-gray-500">
              {selectedAnimalIds.length} sélectionné{selectedAnimalIds.length > 1 ? "s" : ""}
            </span>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            Sélectionnez le ou les animaux pour cette prestation. Les créneaux disponibles seront filtrés en fonction du nombre d'animaux.
          </p>

          {compatibleUserAnimals.length > 0 ? (
            <div className="grid gap-2">
              {compatibleUserAnimals.map((animal, idx) => {
                const isSelected = selectedAnimalIds.includes(animal.id);
                return (
                  <button
                    key={animal.id || `animal-${idx}`}
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
              Types acceptés : {(selectedFormule?.animalTypes || service?.animalTypes || []).join(", ")}.
            </div>
          )}
        </motion.div>
      )}

      {/* Section Nombre d'animaux - pour les invités avec formule collective - Desktop uniquement */}
      {hasVariantSelected && !isLoggedIn && isCollectiveFormule && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden md:block bg-white rounded-2xl p-5 sm:p-6 border border-gray-100"
        >
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
            <span className="p-2 bg-primary/10 rounded-lg">
              <PawPrint className="w-5 h-5 text-primary" />
            </span>
            Nombre d'animaux
          </h3>
          {/* Affichage: 1 animal pour les non connectés */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-500">
              {collectiveMaxAnimals > 1
                ? `Maximum ${collectiveMaxAnimals} par séance`
                : "1 animal par séance"
              }
            </p>
            <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
              1
            </span>
          </div>

          {/* Message et formulaire de connexion pour plusieurs animaux */}
          {collectiveMaxAnimals > 1 && !showLoginForm && (
            <div className="mt-3 p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm text-amber-800 flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Pour inscrire <strong>plusieurs animaux</strong> :</span>
                </span>
                <span className="flex flex-wrap gap-2 ml-6 sm:ml-0">
                  <button
                    type="button"
                    onClick={() => setShowLoginForm(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    Se connecter
                  </button>
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Créer un compte
                  </Link>
                </span>
              </p>
            </div>
          )}

          {/* Formulaire de connexion inline */}
          {collectiveMaxAnimals > 1 && showLoginForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3"
            >
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <LogIn className="w-4 h-4 text-primary" />
                    Connexion
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLoginForm(false);
                      setLoginError(null);
                    }}
                    className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                <form onSubmit={handleLogin} className="space-y-3">
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="votre@email.com"
                        required
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                      />
                    </div>
                  </div>

                  {/* Mot de passe */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mot de passe
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                      />
                    </div>
                  </div>

                  {/* Erreur */}
                  {loginError && (
                    <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">
                      {loginError}
                    </p>
                  )}

                  {/* Boutons */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={isLoggingIn}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                    <Link
                      href="/register"
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-center"
                    >
                      Créer un compte
                    </Link>
                  </div>

                  {/* Mot de passe oublié */}
                  <div className="text-center pt-1">
                    <Link
                      href="/forgot-password"
                      className="text-xs text-gray-500 hover:text-primary transition-colors"
                    >
                      Mot de passe oublié ?
                    </Link>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Section Vérification de l'animal - Desktop uniquement (mobile géré par AnnouncerMobileCTA) */}
      {hasVariantSelected && requiresAnimalVerification && onGuestAnimalDataChange && onGuestAnimalValidationChange && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "hidden md:block bg-white rounded-2xl p-5 sm:p-6 border-2 transition-colors duration-300",
            guestAnimalValid
              ? "border-green-200"
              : guestAnimalError
                ? "border-red-200"
                : "border-amber-200"
          )}
        >
          <GuestAnimalVerification
            acceptedAnimalTypes={acceptedAnimalTypes}
            dogRestrictions={dogRestrictions}
            onAnimalDataChange={onGuestAnimalDataChange}
            onValidationChange={onGuestAnimalValidationChange}
            initialData={guestAnimalData}
          />
        </motion.div>
      )}

      {/* Message si vérification de l'animal requise mais pas faite - Desktop uniquement */}
      {hasVariantSelected && requiresAnimalVerification && !guestAnimalValid && !guestAnimalError && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden md:block p-4 bg-amber-50 border border-amber-200 rounded-xl"
        >
          <div className="flex items-center gap-3">
            <Dog className="w-5 h-5 text-amber-600" />
            <p className="text-sm text-amber-800">
              Veuillez renseigner les informations de votre animal pour accéder au calendrier.
            </p>
          </div>
        </motion.div>
      )}

      {/* Section Créneaux collectifs - Desktop uniquement (mobile géré par AnnouncerMobileCTA) */}
      {hasVariantSelected && isCollectiveFormule && selectedFormule && onSlotsSelected && (!requiresAnimalVerification || guestAnimalValid) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden md:block bg-white rounded-2xl p-5 sm:p-6 border border-gray-100"
        >
          <CollectiveSlotPicker
            variantId={selectedFormule.id as string}
            numberOfSessions={collectiveNumberOfSessions}
            sessionInterval={collectiveSessionInterval}
            animalCount={animalCount}
            animalType={selectedAnimalType}
            onSlotsSelected={onSlotsSelected}
            selectedSlotIds={selectedSlotIds}
          />
        </motion.div>
      )}

      {/* Calendrier multi-séances - Desktop uniquement (mobile géré par AnnouncerMobileCTA) */}
      {hasVariantSelected && isMultiSessionIndividual && onSessionsChange && calendarMonth && onMonthChange && (!requiresAnimalVerification || guestAnimalValid) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden md:block"
        >
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
        </motion.div>
      )}

      {/* Calendrier normal - visible quand une formule non-collective à 1 séance est sélectionnée (desktop seulement, bloqué si vérification animal requise et pas faite) */}
      {hasVariantSelected && !isCollectiveFormule && !isMultiSessionIndividual && (!requiresAnimalVerification || guestAnimalValid) && (
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

      {/* Section Lieu de prestation - Desktop uniquement (mobile géré par AnnouncerMobileCTA) */}
      {hasVariantSelected && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden md:block bg-white rounded-2xl p-5 sm:p-6 border border-gray-100"
        >
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
            <span className="p-2 bg-blue-100 rounded-lg">
              <MapPin className="w-5 h-5 text-blue-600" />
            </span>
            {isCollectiveFormule ? "Lieu des séances" : "Lieu de prestation"}
          </h3>

          {/* Cas 1: Service collectif - toujours chez le prestataire + saisie adresse pour distance */}
          {isCollectiveFormule && (
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

          {/* Cas 2: Service uniquement chez le prestataire */}
          {!isCollectiveFormule && formuleServiceLocation === "announcer_home" && (
            <div className="space-y-3">
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
                L'adresse exacte vous sera communiquée une fois la réservation acceptée par {announcerFirstName || "le prestataire"}.
              </p>
            </div>
          )}

          {/* Cas 3: Service avec choix (both) ou garde */}
          {!isCollectiveFormule && (formuleServiceLocation === "both" || isRangeMode) && onLocationSelect && (
            <ServiceLocationSelector
              serviceLocation={formuleServiceLocation || "both"}
              selectedLocation={bookingSelection?.serviceLocation ?? null}
              onSelect={onLocationSelect}
              isRangeMode={isRangeMode}
              announcerFirstName={announcerFirstName}
            />
          )}

          {/* Cas 4: Service uniquement à domicile */}
          {!isCollectiveFormule && formuleServiceLocation === "client_home" && (
            <>
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
            </>
          )}

          {/* Afficher le sélecteur d'adresse si "à domicile" est sélectionné */}
          {!isCollectiveFormule && formuleServiceLocation === "both" && bookingSelection?.serviceLocation === "client_home" && (
            <div className="mt-4 pt-4 border-t border-gray-100">
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
        </motion.div>
      )}

      {/* Section Options additionnelles - Desktop uniquement (mobile géré par AnnouncerMobileCTA) */}
      {/* Pour les services garde (isRangeMode), toujours afficher cette section */}
      {hasVariantSelected && (service.options.length > 0 || isRangeMode) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "hidden md:block bg-white rounded-2xl p-5 sm:p-6 border-2 transition-colors duration-300 relative overflow-hidden",
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
