"use client";

import { useState } from "react";
import { Package, Sparkles, Plus, MousePointerClick, Filter, PawPrint, Check, MapPin, Home, Users, Target, Clock, Info, CalendarDays, Mail, Lock, Loader2, X, LogIn } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
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
  MultiSessionCalendar,
  type BookingSelection,
  type CalendarEntry,
  type ClientAddress,
  type GuestAddress,
  type SelectedSession,
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
  // Callback quand l'utilisateur se connecte (pour mettre à jour l'état parent)
  onLoginSuccess?: (token: string) => void;
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
  selectedSessions = [],
  onSessionsChange,
  userAnimals = [],
  selectedAnimalIds = [],
  onAnimalToggle,
  maxSelectableAnimals = 1,
  announcerCity,
  announcerFirstName,
  onLoginSuccess,
  className,
}: AnnouncerFormulesProps) {
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
        localStorage.setItem("auth_token", result.token);
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
  const compatibleUserAnimals = userAnimals.filter((animal) => {
    const acceptedTypes = selectedFormule?.animalTypes || service?.animalTypes || [];
    return acceptedTypes.length === 0 || acceptedTypes.includes(animal.type);
  });

  // L'utilisateur a-t-il sélectionné au moins un animal?
  const hasAnimalsSelected = selectedAnimalIds.length > 0;

  // Déterminer le serviceLocation de la formule ou du service
  const formuleServiceLocation = selectedFormule?.serviceLocation || service?.serviceLocation;

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
    // Paramètre pour l'étape Lieu
    serviceLocation: formuleServiceLocation,
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
                  allowOvernightStay={service.allowOvernightStay}
                  overnightPrice={service.overnightPrice}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Section Animaux - Étape 1: sélectionner les animaux AVANT le planning */}
      {hasVariantSelected && isLoggedIn && userAnimals.length > 0 && onAnimalToggle && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "bg-white rounded-2xl p-5 sm:p-6 border-2 transition-colors duration-300",
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

      {/* Section Nombre d'animaux - pour les invités avec formule collective */}
      {hasVariantSelected && !isLoggedIn && isCollectiveFormule && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100"
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

      {/* Section Créneaux collectifs - visible pour formules collectives */}
      {hasVariantSelected && isCollectiveFormule && selectedFormule && onSlotsSelected && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100"
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

      {/* Calendrier multi-séances - visible quand une formule individuelle avec plusieurs séances est sélectionnée */}
      {hasVariantSelected && isMultiSessionIndividual && onSessionsChange && calendarMonth && onMonthChange && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
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

      {/* Calendrier normal - visible quand une formule non-collective à 1 séance est sélectionnée (desktop seulement) */}
      {hasVariantSelected && !isCollectiveFormule && !isMultiSessionIndividual && (
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

      {/* Section Lieu de prestation */}
      {hasVariantSelected && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100"
        >
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
            <span className="p-2 bg-blue-100 rounded-lg">
              <MapPin className="w-5 h-5 text-blue-600" />
            </span>
            {isCollectiveFormule ? "Lieu des séances" : "Lieu de prestation"}
          </h3>

          {/* Cas 1: Service collectif - toujours chez le prestataire */}
          {isCollectiveFormule && (
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
                  />
                )
              ) : (
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
                  />
                )
              ) : (
                onGuestAddressChange && (
                  <GuestAddressSelector
                    guestAddress={guestAddress ?? null}
                    announcerCoordinates={announcerCoordinates}
                    onAddressChange={onGuestAddressChange}
                  />
                )
              )}
            </div>
          )}
        </motion.div>
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
