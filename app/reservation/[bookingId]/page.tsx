"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  FileText,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { type GuestAnimalData } from "@/app/components/animals";
import ConfirmationModal from "@/app/components/ui/ConfirmationModal";
import AddressSectionBooking from "./components/AddressSectionBooking";
import AuthSection from "./components/AuthSection";
import AnimalSection from "./components/AnimalSection";
import OptionsSection from "./components/OptionsSection";
import ReservationSummary from "./components/ReservationSummary";
import { calculateSmartPrice } from "./utils";
import type { GuestData, ServiceOption, PriceCalculationResult, BillingInfo } from "./types";

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
  const [selectedAnimalIds, setSelectedAnimalIds] = useState<Id<"animals">[]>([]);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState<string | null>(null);
  const [postalCode, setPostalCode] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [acceptedCancellationPolicy, setAcceptedCancellationPolicy] = useState(false);

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
  const [animalPreFilled, setAnimalPreFilled] = useState(false);

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

  // Récupérer la config pricing
  const pricingConfig = useQuery(
    api.admin.commissions.getPricingConfig,
    bookingData?.announcer?.statusType
      ? { announcerType: bookingData.announcer.statusType }
      : "skip"
  );

  // Workday config
  const workdayConfig = useQuery(api.admin.config.getWorkdayConfig);
  const workdayHours = workdayConfig?.workdayHours ?? 8;

  // Announcer availability preferences
  const announcerPreferences = useQuery(
    api.public.search.getAnnouncerAvailabilityPreferences,
    bookingData?.announcer?.id
      ? { announcerId: bookingData.announcer.id }
      : "skip"
  );

  // Calculer le taux TVA SAP (si conditions remplies)
  const sapVatInfo = useQuery(
    api.sap.eligibility.computeSapVatRate,
    token && bookingData?.announcer?.id && bookingData?.service?.category
      ? {
          sessionToken: token,
          announcerId: bookingData.announcer.id,
          serviceCategorySlug: bookingData.service.category,
          serviceId: bookingData.service.id,
          variantId: bookingData.variant?.id as Id<"serviceVariants"> | undefined,
        }
      : "skip"
  );

  // Politique d'annulation
  const cancellationPolicy = useQuery(
    api.planning.cancellation.getPublicAnnouncerCancellationPolicy,
    bookingData?.announcer?.id
      ? { announcerId: bookingData.announcer.id }
      : "skip"
  );

  const clientCancellationInfo = useQuery(
    api.planning.cancellation.getClientCancellationInfo,
    token ? { token } : "skip"
  );

  // Mutations
  const finalizeBooking = useMutation(api.public.booking.finalizeBooking);
  const finalizeAsGuest = useMutation(api.public.booking.finalizeBookingAsGuest);
  const login = useMutation(api.auth.login.login);

  // Vérifier si la réservation est expirée
  const isExpired = bookingData && bookingData.expiresAt < Date.now();

  // Initialiser les options sélectionnées
  useEffect(() => {
    if (bookingData?.options) {
      setSelectedOptionIds(bookingData.options.map((opt: ServiceOption) => opt.id));
    }
  }, [bookingData?.options]);

  // Pré-sélectionner l'animal
  useEffect(() => {
    if (
      bookingData?.selectedAnimalIds &&
      bookingData.selectedAnimalIds.length > 0 &&
      !selectedAnimalId &&
      isLoggedIn
    ) {
      setSelectedAnimalId(bookingData.selectedAnimalIds[0] as Id<"animals">);
    }
  }, [bookingData?.selectedAnimalIds, selectedAnimalId, isLoggedIn]);

  // Pré-remplir l'adresse depuis le profil
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

  // Pré-remplir l'adresse guest
  useEffect(() => {
    if (
      bookingData?.guestAddress?.address &&
      bookingData?.serviceLocation === "client_home" &&
      !addressPreFilled &&
      !isLoggedIn
    ) {
      setAddress(bookingData.guestAddress.address);
      if (bookingData.guestAddress.city) {
        setCity(bookingData.guestAddress.city);
      }
      if (bookingData.guestAddress.coordinates) {
        setCoordinates(bookingData.guestAddress.coordinates);
      }
      setAddressPreFilled(true);
    }
  }, [bookingData?.guestAddress, bookingData?.serviceLocation, addressPreFilled, isLoggedIn]);

  // Pré-remplir l'animal invité
  useEffect(() => {
    if (
      bookingData?.guestAnimalPreFill &&
      !animalPreFilled &&
      !isLoggedIn
    ) {
      const preFill = bookingData.guestAnimalPreFill;
      setGuestAnimalData(prev => ({
        ...prev,
        type: preFill.type || prev.type,
        breed: preFill.isMixedBreed ? undefined : preFill.breed,
        isMixedBreed: preFill.isMixedBreed || false,
        primaryBreed: preFill.isMixedBreed ? preFill.primaryBreed : undefined,
        secondaryBreed: preFill.isMixedBreed ? preFill.secondaryBreed : undefined,
      }));
      setAnimalPreFilled(true);
    }
  }, [bookingData?.guestAnimalPreFill, animalPreFilled, isLoggedIn]);

  // Détecter le type de formule
  const isCollectiveFormula = bookingData?.variant?.sessionType === "collective" ||
    (bookingData?.collectiveSlots && bookingData.collectiveSlots.length > 0);
  const isMultiSessionFormula = !isCollectiveFormula &&
    ((bookingData?.variant?.numberOfSessions ?? 1) > 1 ||
    (bookingData?.sessions && bookingData.sessions.length > 1));
  const numberOfSessions = bookingData?.variant?.numberOfSessions || 1;
  const effectiveAnimalCount = bookingData?.animalCount || 1;
  // Nombre réel de créneaux sélectionnés (pour les formules collectives)
  const actualSlotCount = isCollectiveFormula && bookingData?.collectiveSlots?.length
    ? bookingData.collectiveSlots.length
    : numberOfSessions;

  // Type de service pour la politique d'annulation
  const isGardeService_flag = bookingData?.service?.category?.toLowerCase().includes("garde") || false;
  const cancellationServiceType = isGardeService_flag
    ? "garde" as const
    : isCollectiveFormula
      ? "collectif" as const
      : isMultiSessionFormula
        ? "multi_seance" as const
        : "uni_seance" as const;

  // Calculer le nombre de jours/séances
  const daysCount = (() => {
    if (!bookingData) return 1;
    if (isCollectiveFormula && bookingData.collectiveSlots) {
      return bookingData.collectiveSlots.length || 1;
    }
    if (isMultiSessionFormula && bookingData.sessions) {
      return bookingData.sessions.length || numberOfSessions;
    }
    const start = new Date(bookingData.dates.startDate);
    const end = new Date(bookingData.dates.endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  })();

  // Total des options sélectionnées
  const optionsTotal = selectedOptionIds.reduce((sum, optId) => {
    const option = bookingData?.availableOptions?.find((o: ServiceOption) => o.id === optId);
    return sum + (option?.price || 0);
  }, 0);

  // Smart price calculation (uni-séance uniquement)
  const priceCalculation: PriceCalculationResult | null = (() => {
    if (!bookingData?.variant) return null;
    if (isCollectiveFormula || isMultiSessionFormula) return null;

    const pricing = bookingData.variant.pricing;
    const dayStartTime = bookingData.service.dayStartTime ||
                         announcerPreferences?.acceptReservationsFrom || "08:00";
    const dayEndTime = bookingData.service.dayEndTime ||
                       announcerPreferences?.acceptReservationsTo || "18:00";
    const useDurationBasedPricing = bookingData.service.enableDurationBasedBlocking && bookingData.variant.duration;
    const isGardeService = bookingData.service.category?.toLowerCase().includes("garde") || false;

    const dailyRate = pricing?.daily || (isGardeService ? bookingData.variant.price : 0);
    const hourlyRate = pricing?.hourly || (isGardeService && dailyRate ? Math.round(dailyRate / workdayHours) : bookingData.variant.price);
    const halfDailyRate = dailyRate ? Math.round(dailyRate / 2) : 0;

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
        hourly: hourlyRate,
        halfDaily: halfDailyRate,
        daily: dailyRate,
        nightly: pricing?.nightly || bookingData.service.overnightPrice,
      },
      optionsTotal,
      fixedServicePrice: useDurationBasedPricing ? bookingData.variant.price : undefined,
      serviceDurationMinutes: useDurationBasedPricing ? bookingData.variant.duration : undefined,
      clientBillingMode: bookingData.service.clientBillingMode,
    });
  })();

  // Montant total selon le type de formule
  const totalAmount = (() => {
    if (!bookingData?.variant) return 0;
    if (isCollectiveFormula) {
      return bookingData.variant.price * actualSlotCount * effectiveAnimalCount + optionsTotal;
    }
    if (isMultiSessionFormula) {
      return bookingData.variant.price * numberOfSessions + optionsTotal;
    }
    return priceCalculation?.totalAmount ?? 0;
  })();

  const isMultiDay = bookingData?.dates.endDate !== bookingData?.dates.startDate;

  // Billing info
  const billingInfo: BillingInfo | null = (() => {
    if (!bookingData?.dates || !priceCalculation) return null;

    const dayStartTime = bookingData.service.dayStartTime || announcerPreferences?.acceptReservationsFrom || "08:00";
    const dayEndTime = bookingData.service.dayEndTime || announcerPreferences?.acceptReservationsTo || "18:00";

    const firstDayIsHalfDay = priceCalculation.firstDayIsHalfDay;
    const lastDayIsHalfDay = priceCalculation.lastDayIsHalfDay;

    let fullDays = 0;
    let halfDays = 0;

    if (daysCount === 1) {
      if (firstDayIsHalfDay) {
        halfDays = 1;
      } else if (priceCalculation.firstDayIsFullDay) {
        fullDays = 1;
      }
    } else if (daysCount > 1) {
      fullDays = priceCalculation.fullDays;
      if (firstDayIsHalfDay) halfDays++;
      else if (priceCalculation.firstDayIsFullDay) fullDays++;
      if (lastDayIsHalfDay) halfDays++;
      else if (priceCalculation.lastDayIsFullDay) fullDays++;
    }

    return {
      billingUnit: priceCalculation.billingUnit,
      fullDays,
      halfDays,
      firstDayIsHalfDay,
      lastDayIsHalfDay,
      dayStartTime,
      dayEndTime,
    };
  })();

  // Frais
  const commissionRate = pricingConfig?.commissionRate ?? 15;
  const stripeFeeRate = pricingConfig?.stripeFeeRate ?? 3;
  const vatRate = pricingConfig?.vatRate ?? 20;
  const announcerStatusType = bookingData?.announcer?.statusType ?? "particulier";
  const baseAmountHT = totalAmount;
  const platformCommission = Math.round((baseAmountHT * commissionRate) / 100);
  const vatOnCommission = Math.round((platformCommission * vatRate) / 100);
  const paymentFees = Math.round((baseAmountHT * stripeFeeRate) / 100);
  const totalWithCommission = baseAmountHT + platformCommission + vatOnCommission + paymentFees;

  // Toggle option
  const toggleOption = (optionId: string) => {
    setSelectedOptionIds((prev) =>
      prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId]
    );
  };

  // Login
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

  // Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (isLoggedIn) {
      if (isCollectiveFormula) {
        if (selectedAnimalIds.length === 0) {
          errors.animal = "Veuillez selectionner au moins un animal";
        }
      } else {
        if (!selectedAnimalId) {
          errors.animal = "Veuillez selectionner un animal";
        }
      }
    } else {
      if (!guestData.firstName.trim()) errors.firstName = "Le prénom est requis";
      if (!guestData.lastName.trim()) errors.lastName = "Le nom est requis";
      if (!guestData.email.trim()) {
        errors.email = "L'email est requis";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestData.email)) {
        errors.email = "L'email n'est pas valide";
      }
      if (!guestData.phone.trim()) errors.phone = "Le téléphone est requis";
      if (guestData.password.length < 6) errors.password = "Le mot de passe doit contenir au moins 6 caractères";
      if (guestData.password !== guestData.confirmPassword) errors.confirmPassword = "Les mots de passe ne correspondent pas";
      if (!guestAnimalData.name.trim()) errors.animalName = "Le nom de l'animal est requis";
      if (!guestAnimalData.type) errors.animalType = "Le type d'animal est requis";
    }

    const needsClientAddress = bookingData?.serviceLocation === "client_home" && !isCollectiveFormula;
    if (needsClientAddress && !address.trim()) {
      errors.address = "L'adresse est requise";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const extractErrorMessage = (err: unknown): string => {
    if (err && typeof err === "object") {
      if ("data" in err && typeof err.data === "string") return err.data;
      if ("message" in err && typeof err.message === "string") return err.message;
    }
    return "Une erreur est survenue. Veuillez réessayer.";
  };

  // Ouvrir la modale de confirmation
  const handleOpenConfirmation = () => {
    if (!bookingData) return;
    if (!validateForm()) {
      setError("Veuillez corriger les erreurs dans le formulaire");
      return;
    }
    setError(null);
    setFieldErrors({});
    setShowConfirmationModal(true);
  };

  // Soumettre la réservation
  const handleSubmit = async () => {
    if (!bookingData) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const useAnnouncerLocation = bookingData.serviceLocation === "announcer_home" || isCollectiveFormula;
      const effectiveLocation = useAnnouncerLocation ? bookingData.announcer.location : address;
      const effectiveCity = useAnnouncerLocation ? null : city;
      const effectivePostalCode = useAnnouncerLocation ? null : postalCode;
      const effectiveCoordinates = useAnnouncerLocation ? null : coordinates;
      const effectiveAnimalId = selectedAnimalIds.length > 0 ? selectedAnimalIds[0] : selectedAnimalId;

      if (isLoggedIn && token) {
        if (!effectiveAnimalId) {
          setError("Veuillez sélectionner un animal");
          setShowConfirmationModal(false);
          return;
        }

        const result = await finalizeBooking({
          token,
          bookingId: bookingId as Id<"pendingBookings">,
          animalId: effectiveAnimalId,
          location: effectiveLocation,
          city: effectiveCity || undefined,
          postalCode: effectivePostalCode || undefined,
          coordinates: effectiveCoordinates || undefined,
          notes: notes || undefined,
          updatedOptionIds: selectedOptionIds,
          updatedAmount: totalAmount,
        });

        if (result.success) {
          setShowConfirmationModal(false);
          router.push(`/dashboard?tab=missions&success=booking`);
        }
      } else if (!isLoggedIn) {
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
          location: effectiveLocation.trim(),
          city: effectiveCity || undefined,
          postalCode: effectivePostalCode || undefined,
          coordinates: effectiveCoordinates || undefined,
          notes: notes?.trim() || undefined,
          updatedOptionIds: selectedOptionIds,
          updatedAmount: totalAmount,
        });

        if (result.success && result.token) {
          localStorage.setItem("auth_token", result.token);
          setShowConfirmationModal(false);
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
      if (errorMessage.includes("email") || errorMessage.includes("compte existe")) {
        setFieldErrors(prev => ({ ...prev, email: errorMessage }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fonction retour annonceur
  const handleBack = () => {
    if (!bookingData) return;
    const announcerSlug = bookingData.announcer.slug;
    if (!announcerSlug) {
      router.back();
      return;
    }

    const params = new URLSearchParams();
    if (bookingData.service?.category) params.set("service", bookingData.service.category);
    if (bookingData.variant?.id) params.set("formule", bookingData.variant.id);
    if (bookingData.dates?.startDate) params.set("date", bookingData.dates.startDate);
    if (bookingData.dates?.endDate) params.set("endDate", bookingData.dates.endDate);
    if (bookingData.dates?.startTime) params.set("startTime", bookingData.dates.startTime);
    if (bookingData.dates?.endTime) params.set("endTime", bookingData.dates.endTime);
    if (bookingData.serviceLocation) params.set("location", bookingData.serviceLocation);
    if (bookingData.options && bookingData.options.length > 0) {
      params.set("options", bookingData.options.map((o: { id: string; name: string; price: number }) => o.id).join(","));
    }
    if (bookingData.collectiveSlotIds && bookingData.collectiveSlotIds.length > 0) {
      params.set("slotIds", bookingData.collectiveSlotIds.join(","));
    }
    if (bookingData.sessions && bookingData.sessions.length > 0) {
      params.set("sessions", JSON.stringify(bookingData.sessions));
    }
    if (bookingData.animalCount) params.set("animalCount", String(bookingData.animalCount));
    if (bookingData.selectedAnimalType) params.set("animalType", bookingData.selectedAnimalType);
    if (bookingData.selectedAnimalIds && bookingData.selectedAnimalIds.length > 0) {
      params.set("animalIds", bookingData.selectedAnimalIds.join(","));
    }

    router.push(`/annonceur/${announcerSlug}?${params.toString()}`);
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
              onClick={handleBack}
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
            {/* Section Authentification */}
            <AuthSection
              isLoggedIn={isLoggedIn}
              token={token}
              showLoginForm={showLoginForm}
              setShowLoginForm={setShowLoginForm}
              loginEmail={loginEmail}
              setLoginEmail={setLoginEmail}
              loginPassword={loginPassword}
              setLoginPassword={setLoginPassword}
              handleLogin={handleLogin}
              guestData={guestData}
              setGuestData={setGuestData}
              fieldErrors={fieldErrors}
            />

            {/* Section Animal */}
            <AnimalSection
              isLoggedIn={isLoggedIn}
              token={token}
              isCollectiveFormula={!!isCollectiveFormula}
              selectedAnimalId={selectedAnimalId}
              setSelectedAnimalId={setSelectedAnimalId}
              selectedAnimalIds={selectedAnimalIds}
              setSelectedAnimalIds={setSelectedAnimalIds}
              preSelectedAnimalIds={bookingData.selectedAnimalIds || []}
              acceptedAnimalTypes={bookingData.variant?.animalTypes || []}
              collectiveSlots={bookingData.collectiveSlots}
              guestAnimalData={guestAnimalData}
              setGuestAnimalData={setGuestAnimalData}
              fieldErrors={fieldErrors}
            />

            {/* Section Options */}
            <OptionsSection
              availableOptions={bookingData.availableOptions || []}
              selectedOptionIds={selectedOptionIds}
              toggleOption={toggleOption}
            />

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
                <AddressSectionBooking
                  sessionToken={token}
                  isLoggedIn={isLoggedIn}
                  serviceLocation={bookingData.serviceLocation}
                  announcerLocation={bookingData.announcer.location}
                  announcerCity={bookingData.announcer.city}
                  announcerPostalCode={bookingData.announcer.postalCode}
                  isCollectiveFormula={isCollectiveFormula}
                  currentAddress={address}
                  currentCity={city}
                  currentPostalCode={postalCode}
                  currentCoordinates={coordinates}
                  onAddressChange={(data) => {
                    setAddress(data.address);
                    setCity(data.city);
                    setPostalCode(data.postalCode);
                    setCoordinates(data.coordinates);
                  }}
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
            <ReservationSummary
              bookingData={bookingData}
              isLoggedIn={isLoggedIn}
              isCollectiveFormula={!!isCollectiveFormula}
              isMultiSessionFormula={!!isMultiSessionFormula}
              numberOfSessions={numberOfSessions}
              effectiveAnimalCount={effectiveAnimalCount}
              isMultiDay={isMultiDay}
              daysCount={daysCount}
              priceCalculation={priceCalculation}
              billingInfo={billingInfo}
              selectedOptionIds={selectedOptionIds}
              address={address}
              coordinates={coordinates}
              city={city}
              guestAnimalData={guestAnimalData}
              baseAmountHT={baseAmountHT}
              platformCommission={platformCommission}
              commissionRate={commissionRate}
              paymentFees={paymentFees}
              stripeFeeRate={stripeFeeRate}
              vatRate={vatRate}
              vatOnCommission={vatOnCommission}
              totalWithCommission={totalWithCommission}
              announcerStatusType={announcerStatusType}
              isSapApplied={sapVatInfo?.isSapApplied ?? false}
              sapVatRate={sapVatInfo?.vatRate ?? 20}
              acceptedCancellationPolicy={acceptedCancellationPolicy}
              setAcceptedCancellationPolicy={setAcceptedCancellationPolicy}
              cancellationServiceType={cancellationServiceType}
              totalAmount={totalAmount}
              cancellationPolicy={cancellationPolicy ?? null}
              clientCancellationInfo={clientCancellationInfo ? {
                cancellationCount: clientCancellationInfo.cancellationCount,
                secondAnnouncerPercent: clientCancellationInfo.secondAnnouncerPercent,
              } : null}
              isSubmitting={isSubmitting}
              error={error}
              fieldErrors={fieldErrors}
              onConfirm={handleOpenConfirmation}
            />
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
        cancellationPolicy={{
          serviceType: cancellationServiceType,
          numberOfSessions,
          totalPrice: totalAmount,
          announcerPolicy: cancellationPolicy ?? null,
          clientInfo: clientCancellationInfo ? {
            cancellationCount: clientCancellationInfo.cancellationCount,
            secondAnnouncerPercent: clientCancellationInfo.secondAnnouncerPercent,
          } : null,
        }}
      />
    </div>
  );
}
