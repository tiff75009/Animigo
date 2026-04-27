"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryState, parseAsString, parseAsArrayOf, parseAsBoolean, parseAsInteger, parseAsJson } from "nuqs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { setAuthToken as storeAuthToken } from "@/app/lib/authToken";
import { Loader2 } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useAuth } from "@/app/hooks/useAuth";

import {
  AnnouncerHero,
  AnnouncerFormules,
  AnnouncerProfile,
  AnnouncerReviews,
  AnnouncerBookingCard,
  AnnouncerInsightCard,
  AnnouncerMobileCTA,
  AnnouncerTabs,
  type TabType,
  type AnnouncerData,
} from "./components";
import { Navbar } from "@/app/components/navbar";
import {
  type BookingSelection,
  type PriceBreakdown,
  type ClientAddress,
  type SelectedSession,
  type ClientBillingConfig,
  DEFAULT_BOOKING_SELECTION,
  calculatePriceBreakdown,
  isGardeService,
} from "./components/booking";
import GuestAnimalVerification, { type GuestAnimalData, type GuestDogData } from "@/app/reserver/[announcerId]/components/GuestAnimalVerification";
import {
  checkBreedCategory,
  getSizeFromWeight,
  isDogAccepted,
  type DogSize,
} from "@/data/categorized-dog-breeds";

// Calcul de distance avec la formule de Haversine (en km)
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Extraire ville + code postal d'une adresse, ou retourner undefined si c'est une adresse de rue
function extractCityDisplay(location: string | null | undefined): string | undefined {
  if (!location) return undefined;

  // Si l'adresse contient des indicateurs de rue, ne pas l'afficher
  const streetIndicators = /^\d+\s|rue|avenue|boulevard|allée|impasse|chemin|place|passage/i;
  if (streetIndicators.test(location)) {
    // Essayer d'extraire code postal + ville (format: "75001 Paris" ou "Paris 75001")
    const postalCityMatch = location.match(/(\d{5})\s+([A-Za-zÀ-ÿ\s-]+)/);
    if (postalCityMatch) {
      return `${postalCityMatch[1]} ${postalCityMatch[2].trim()}`;
    }
    // Si on ne trouve pas, ne rien afficher
    return undefined;
  }

  // Si c'est déjà au format "75001 Paris" ou juste une ville, le garder
  return location;
}

export default function AnnouncerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { token, user: authUser, refreshToken, isLoading: isAuthLoading } = useAuth();
  const isAnnouncer = authUser?.accountType === "annonceur_pro" || authUser?.accountType === "annonceur_particulier";
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("formules");

  // Récupérer le slug de l'annonceur depuis l'URL
  const announcerSlug = params.id as string;

  // Gérer le service sélectionné avec nuqs (categorySlug, synchronisé avec l'URL)
  const [selectedServiceSlug, setSelectedServiceSlug] = useQueryState("service");

  // Gérer la formule pré-sélectionnée via l'URL (pour redirection depuis la recherche)
  const [formuleQueryParam, setFormuleQueryParam] = useQueryState("formule");

  // Paramètres de réservation via URL (pour restaurer l'état après retour de /reservation)
  const [urlStartDate, setUrlStartDate] = useQueryState("date");
  const [urlEndDate, setUrlEndDate] = useQueryState("endDate");
  const [urlStartTime, setUrlStartTime] = useQueryState("startTime");
  const [urlEndTime, setUrlEndTime] = useQueryState("endTime");
  const [urlLocation, setUrlLocation] = useQueryState("location");
  const [urlOptions, setUrlOptions] = useQueryState("options");
  const [urlSlotIds, setUrlSlotIds] = useQueryState("slotIds");
  const [urlSessions, setUrlSessions] = useQueryState("sessions");
  const [urlAnimalCount, setUrlAnimalCount] = useQueryState("animalCount");
  const [urlAnimalType, setUrlAnimalType] = useQueryState("animalType");
  const [urlAnimalIds, setUrlAnimalIds] = useQueryState("animalIds");

  // État de la réservation (formule, options, dates, heures)
  const [bookingSelection, setBookingSelection] = useState<BookingSelection>(DEFAULT_BOOKING_SELECTION);

  // Flag pour savoir si on a déjà initialisé depuis l'URL
  const [hasInitializedFromUrl, setHasInitializedFromUrl] = useState(false);

  // ─── State du wizard intégré : étape Finalisation ───
  // Inclut auth invité, notes, acceptations CGV, etc.
  const [finalizeData, setFinalizeData] = useState<{
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
  }>({
    guestData: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
    notes: "",
    acceptedCGV: false,
    acceptedPrivacy: false,
    acceptedCancellation: false,
    isSubmitting: false,
    submitError: null,
    fieldErrors: {},
  });

  // Effet pour initialiser le state depuis les paramètres URL (après retour de /reservation)
  useEffect(() => {
    if (hasInitializedFromUrl) return;

    // Vérifier si on a des paramètres de retour (dates, créneaux, ou animaux)
    const hasReturnParams = urlStartDate || urlSlotIds || urlSessions || urlAnimalIds;
    if (!hasReturnParams) return;

    const parsedAnimalIds = urlAnimalIds ? urlAnimalIds.split(",").filter(Boolean) : [];

    setBookingSelection(prev => ({
      ...prev,
      startDate: urlStartDate || prev.startDate,
      endDate: urlEndDate || prev.endDate,
      startTime: urlStartTime || prev.startTime,
      endTime: urlEndTime || prev.endTime,
      serviceLocation: (urlLocation as "announcer_home" | "client_home") || prev.serviceLocation,
      selectedOptionIds: urlOptions ? urlOptions.split(",").filter(Boolean) : prev.selectedOptionIds,
      selectedSlotIds: urlSlotIds ? urlSlotIds.split(",").filter(Boolean) : prev.selectedSlotIds,
      selectedSessions: urlSessions ? (() => { try { return JSON.parse(urlSessions); } catch { return prev.selectedSessions; } })() : prev.selectedSessions,
      animalCount: urlAnimalCount ? parseInt(urlAnimalCount, 10) || 1 : prev.animalCount,
      selectedAnimalType: urlAnimalType || prev.selectedAnimalType,
      selectedAnimalIds: parsedAnimalIds.length > 0 ? parsedAnimalIds : prev.selectedAnimalIds,
    }));

    // Synchroniser le state selectedAnimalIds séparé avec les IDs de l'URL
    if (parsedAnimalIds.length > 0) {
      setSelectedAnimalIds(parsedAnimalIds);
    }

    setHasInitializedFromUrl(true);

    // Mettre à jour le mois du calendrier si on a une date
    if (urlStartDate) {
      setCalendarMonth(new Date(urlStartDate));
    }
  }, [urlStartDate, urlEndDate, urlStartTime, urlEndTime, urlLocation, urlOptions, urlSlotIds, urlSessions, urlAnimalCount, urlAnimalType, urlAnimalIds, hasInitializedFromUrl]);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    // Initialiser avec la date de l'URL si présente
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const dateParam = urlParams.get('date');
      if (dateParam) {
        return new Date(dateParam);
      }
    }
    return new Date();
  });

  // Récupérer les données de l'annonceur par son slug
  const announcerData = useQuery(
    api.public.announcer.getAnnouncerBySlug,
    { slug: announcerSlug }
  );

  // Récupérer les coordonnées du client connecté (pour calculer la distance)
  const clientLocation = useQuery(
    api.client.profile.getClientCoordinates,
    token ? { token } : "skip"
  );

  // Récupérer le taux de commission basé sur le type d'annonceur
  const commissionData = useQuery(
    api.admin.commissions.getCommissionRate,
    announcerData?.statusType
      ? { announcerType: announcerData.statusType as "particulier" | "micro_entrepreneur" | "professionnel" }
      : "skip"
  );
  const commissionRate = commissionData?.rate ?? 15; // Default 15% for particuliers

  // Récupérer les taux de TVA et frais Stripe
  const vatRateData = useQuery(api.admin.commissions.getVatRate);
  const stripeFeeRateData = useQuery(api.admin.commissions.getStripeFeeRate);
  const vatRate = vatRateData?.rate ?? 20; // Default 20%
  const stripeFeeRate = stripeFeeRateData?.rate ?? 3; // Default 3%

  // Workday config from admin settings
  const workdayConfig = useQuery(api.admin.config.getWorkdayConfig);
  const workdayHours = workdayConfig?.workdayHours ?? 8;

  // Announcer preferences for availability
  const announcerPreferences = useQuery(
    api.public.search.getAnnouncerAvailabilityPreferences,
    announcerData?.id
      ? { announcerId: announcerData.id as Id<"users"> }
      : "skip"
  );

  // Calendar availability - query for date range
  // For MultiSessionCalendar: 4 weeks from calendarMonth
  // For regular calendar: current month
  const formatDateLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Memoize date range calculation to avoid recreating on every render
  const { calendarStartDateStr, calendarEndDateStr } = useMemo(() => {
    const getMonday = (date: Date): Date => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(d.setDate(diff));
    };

    // Calculate date range that covers both calendar views
    const startOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const endOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);

    // For MultiSessionCalendar: get Monday of current week + 4 weeks
    const multiSessionStart = getMonday(calendarMonth);
    const multiSessionEnd = new Date(multiSessionStart);
    multiSessionEnd.setDate(multiSessionStart.getDate() + 27); // 4 weeks = 28 days

    // Use the broader range to cover both calendar types
    const calendarStartDate = startOfMonth < multiSessionStart ? startOfMonth : multiSessionStart;
    const calendarEndDate = endOfMonth > multiSessionEnd ? endOfMonth : multiSessionEnd;

    return {
      calendarStartDateStr: formatDateLocal(calendarStartDate),
      calendarEndDateStr: formatDateLocal(calendarEndDate),
    };
  }, [calendarMonth]);

  // Get selected service for calendar query
  const selectedServiceForCalendar = announcerData?.id && bookingSelection.selectedServiceId
    ? announcerData
    : null;

  // Find the service category slug for availability query
  const selectedServiceCategory = useMemo(() => {
    if (!announcerData || !bookingSelection.selectedServiceId) return null;
    const service = announcerData.services?.find(
      (s: { id: string; categorySlug?: string }) => s.id === bookingSelection.selectedServiceId
    );
    return service?.categorySlug || null;
  }, [announcerData, bookingSelection.selectedServiceId]);

  const availabilityCalendar = useQuery(
    api.public.search.getAnnouncerAvailabilityCalendar,
    announcerData?.id && selectedServiceCategory
      ? {
          announcerId: announcerData.id as Id<"users">,
          serviceCategory: selectedServiceCategory,
          startDate: calendarStartDateStr,
          endDate: calendarEndDateStr,
        }
      : "skip"
  );

  // Client addresses - only fetch if user is logged in
  const clientAddressesData = useQuery(
    api.client.addresses.getAddresses,
    token ? { sessionToken: token } : "skip"
  );
  const clientAddresses: ClientAddress[] = (clientAddressesData || []) as ClientAddress[];

  // Collective slots details - fetch selected slot info for the summary
  const collectiveSlotsData = useQuery(
    api.planning.collectiveSlots.getSlotsByIds,
    bookingSelection.selectedSlotIds.length > 0
      ? { slotIds: bookingSelection.selectedSlotIds as Id<"collectiveSlots">[] }
      : "skip"
  );
  const collectiveSlots = collectiveSlotsData || [];

  // User's animals - fetch for collective session animal selection
  const userAnimalsData = useQuery(
    api.animals.getUserAnimals,
    token ? { token } : "skip"
  );
  const userAnimals = (userAnimalsData || []).map((animal: any) => ({
    id: String(animal.id), // Le backend retourne déjà 'id' (pas '_id')
    name: animal.name,
    type: animal.type,
    breed: animal.breed,
    breedSlug: animal.breed?.toLowerCase().replace(/\s+/g, '-').normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
    weight: animal.weight,
    size: animal.size,
    profilePhoto: animal.profilePhoto,
  }));

  // State for selected animals in collective sessions (supports multiple selection)
  const [selectedAnimalIds, setSelectedAnimalIds] = useState<string[]>(() => {
    // Pré-remplir depuis l'URL si animalIds est présent
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ids = params.get("animalIds");
      if (ids) return ids.split(",").filter(Boolean);
    }
    return [];
  });

  // État pour la vérification de l'animal (invités - chien ou chat)
  const [guestAnimalData, setGuestAnimalData] = useState<GuestAnimalData | null>(null);
  const [guestAnimalValid, setGuestAnimalValid] = useState(false);
  const [guestAnimalError, setGuestAnimalError] = useState<string | undefined>(undefined);

  // État pour les erreurs de restriction des chiens (utilisateurs connectés)
  const [connectedDogErrors, setConnectedDogErrors] = useState<Record<string, string>>({});

  // Calculer la distance entre le client et l'annonceur
  // (doit être avant les early returns pour respecter les règles des hooks)
  const distance = useMemo(() => {
    if (!clientLocation?.coordinates || !announcerData?.coordinates) {
      return undefined;
    }
    return calculateDistance(
      clientLocation.coordinates.lat,
      clientLocation.coordinates.lng,
      announcerData.coordinates.lat,
      announcerData.coordinates.lng
    );
  }, [clientLocation?.coordinates, announcerData?.coordinates]);

  // Transformer les données pour correspondre au type AnnouncerData (peut être null)
  const announcer: AnnouncerData | null = useMemo(() => {
    if (!announcerData) return null;
    return {
      id: announcerData.id,
      firstName: announcerData.firstName,
      lastName: announcerData.lastName,
      memberSince: announcerData.memberSince,
      verified: announcerData.verified,
      isIdentityVerified: announcerData.isIdentityVerified,
      statusType: announcerData.statusType as "professionnel" | "micro_entrepreneur" | "particulier",
      profileImage: announcerData.profileImage,
      coverImage: announcerData.coverImage,
      bio: announcerData.bio,
      location: announcerData.location,
      coordinates: announcerData.coordinates,
      rating: announcerData.rating,
      reviewCount: announcerData.reviewCount,
      responseTime: announcerData.responseTime,
      responseRate: announcerData.responseRate,
      acceptedAnimals: announcerData.acceptedAnimals,
      equipment: {
        housingType: announcerData.equipment.housingType as "house" | "apartment" | null,
        housingSize: announcerData.equipment.housingSize,
        hasGarden: announcerData.equipment.hasGarden,
        gardenSize: announcerData.equipment.gardenSize,
        hasVehicle: announcerData.equipment.hasVehicle,
        isSmoker: announcerData.equipment.isSmoker,
        hasChildren: announcerData.equipment.hasChildren,
        childrenAges: announcerData.equipment.childrenAges,
        providesFood: announcerData.equipment.providesFood,
      },
      ownAnimals: announcerData.ownAnimals || [],
      icadRegistered: announcerData.icadRegistered,
      gallery: announcerData.gallery,
      services: announcerData.services,
      activities: announcerData.activities,
      reviews: announcerData.reviews,
      availability: {
        nextAvailable: announcerData.availability.nextAvailable,
      },
      radius: announcerData.radius,
    };
  }, [announcerData]);

  // Trouver le service sélectionné par son categorySlug (peut être null)
  const selectedService = useMemo(() => {
    if (!announcer) return null;
    if (selectedServiceSlug) {
      return announcer.services.find((s) => s.categorySlug === selectedServiceSlug || s.categoryId === selectedServiceSlug) ?? null;
    }
    return announcer.services[0] ?? null;
  }, [announcer, selectedServiceSlug]);

  // Find selected service and variant from booking selection
  const bookingService = useMemo(() => {
    if (!announcer || !bookingSelection.selectedServiceId) return null;
    return announcer.services.find((s) => s.id === bookingSelection.selectedServiceId) ?? null;
  }, [announcer, bookingSelection.selectedServiceId]);

  const bookingVariant = useMemo(() => {
    if (!bookingService || !bookingSelection.selectedVariantId) return null;
    return bookingService.formules.find((f) => f.id === bookingSelection.selectedVariantId) ?? null;
  }, [bookingService, bookingSelection.selectedVariantId]);

  // Determine if range mode (daily services like garde)
  const isRangeMode = bookingService ? isGardeService(bookingService) : false;

  // Calculate days count
  const days = useMemo(() => {
    if (!bookingSelection.startDate) return 1;
    if (!bookingSelection.endDate || bookingSelection.startDate === bookingSelection.endDate) return 1;
    const start = new Date(bookingSelection.startDate);
    const end = new Date(bookingSelection.endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }, [bookingSelection.startDate, bookingSelection.endDate]);

  const nights = bookingSelection.includeOvernightStay ? Math.max(0, days - 1) : 0;

  // Maximum selectable animals = tous les animaux compatibles (pas de limite)
  // Les créneaux seront filtrés en fonction du nombre d'animaux sélectionnés
  const maxSelectableAnimals = useMemo(() => {
    if (!bookingVariant) return 1;

    // Get accepted animal types (comparaison insensible à la casse)
    const acceptedTypes = (bookingVariant.animalTypes || []).map((t: string) => t.toLowerCase());
    const compatibleAnimals = userAnimals.filter((a: any) =>
      acceptedTypes.length === 0 || acceptedTypes.includes(a.type?.toLowerCase())
    );

    // Permettre de sélectionner tous les animaux compatibles
    return Math.max(1, compatibleAnimals.length);
  }, [bookingVariant, userAnimals]);

  // Nettoyer les animaux sélectionnés si leur type n'est plus compatible
  useEffect(() => {
    if (selectedAnimalIds.length === 0) return;
    // Ne pas filtrer tant que les animaux de l'utilisateur ne sont pas chargés
    // sinon tous les IDs seraient supprimés car find() retourne undefined
    if (!userAnimalsData || userAnimals.length === 0) return;

    // Filtrer les animaux compatibles (par type uniquement, comparaison insensible à la casse)
    const acceptedTypes = (bookingVariant?.animalTypes || []).map((t: string) => t.toLowerCase());
    const compatibleIds = selectedAnimalIds.filter((id) => {
      const animal = userAnimals.find((a: { id: string; type: string }) => a.id === id);
      if (!animal) return false;
      return acceptedTypes.length === 0 || acceptedTypes.includes(animal.type?.toLowerCase());
    });

    // Si les IDs ont changé, mettre à jour
    if (compatibleIds.length !== selectedAnimalIds.length) {
      setSelectedAnimalIds(compatibleIds);
      setBookingSelection((prev) => ({
        ...prev,
        selectedAnimalIds: compatibleIds,
        animalCount: Math.max(1, compatibleIds.length),
      }));
    }
  }, [bookingVariant, userAnimals, userAnimalsData, selectedAnimalIds]);

  // Calculate price breakdown
  const priceBreakdown = useMemo((): PriceBreakdown | null => {
    if (!bookingService || !bookingVariant) return null;

    const dayStartTime = announcerPreferences?.acceptReservationsFrom || "08:00";
    const dayEndTime = announcerPreferences?.acceptReservationsTo || "20:00";
    const overnightPrice = bookingService.overnightPrice;
    const enableDurationBasedBlocking = Boolean(bookingService.enableDurationBasedBlocking);

    // Construire la config de facturation client depuis les paramètres du service
    let clientBillingConfig: ClientBillingConfig | undefined;
    if (bookingService.clientBillingMode) {
      clientBillingConfig = {
        mode: bookingService.clientBillingMode,
        surchargePercent: bookingService.hourlyBillingSurchargePercent || 0,
        workdayHours: workdayHours,
        halfDayHours: workdayHours / 2,
      };
    }

    return calculatePriceBreakdown(
      bookingService,
      bookingVariant,
      bookingSelection,
      commissionRate,
      workdayHours,
      dayStartTime,
      dayEndTime,
      overnightPrice,
      enableDurationBasedBlocking,
      bookingService.allowedPriceUnits,
      clientBillingConfig
    );
  }, [bookingService, bookingVariant, bookingSelection, commissionRate, workdayHours, announcerPreferences]);

  // Find selected client address for display
  const selectedClientAddress = useMemo((): ClientAddress | null => {
    if (!bookingSelection.selectedAddressId || clientAddresses.length === 0) {
      return null;
    }
    return clientAddresses.find(a => a._id === bookingSelection.selectedAddressId) ?? null;
  }, [bookingSelection.selectedAddressId, clientAddresses]);

  // Déterminer si la vérification de l'animal est requise pour les invités (chien ou chat)
  const requiresAnimalVerification = useMemo(() => {
    // Seulement pour les invités (non connectés)
    if (token) return false;
    // Doit avoir un service et un variant sélectionnés
    if (!bookingService || !bookingVariant) return false;
    // Le service doit accepter les chiens ou les chats
    const serviceAcceptsDogs = bookingService.animalTypes?.includes("chien");
    const serviceAcceptsCats = bookingService.animalTypes?.includes("chat");
    if (!serviceAcceptsDogs && !serviceAcceptsCats) return false;
    // Le variant doit accepter les chiens ou les chats
    const variantAnimalTypes = bookingVariant.animalTypes || [];
    const variantAcceptsDogs = variantAnimalTypes.length === 0 || variantAnimalTypes.includes("chien");
    const variantAcceptsCats = variantAnimalTypes.length === 0 || variantAnimalTypes.includes("chat");
    return (serviceAcceptsDogs && variantAcceptsDogs) || (serviceAcceptsCats && variantAcceptsCats);
  }, [token, bookingService, bookingVariant]);

  // Types d'animaux acceptés par le service/variant pour les invités
  const acceptedAnimalTypes = useMemo(() => {
    if (!bookingService || !bookingVariant) return [];
    const serviceTypes = bookingService.animalTypes || [];
    const variantTypes = bookingVariant.animalTypes || [];
    // Si le variant ne spécifie pas de types, utiliser ceux du service
    const effectiveTypes = variantTypes.length > 0 ? variantTypes : serviceTypes;
    // Filtrer pour ne garder que chien et chat
    return effectiveTypes.filter((t: string) => t === "chien" || t === "chat");
  }, [bookingService, bookingVariant]);

  // Restrictions du chien depuis le variant (avec fallback vers le service)
  const dogRestrictions = useMemo(() => {
    if (!bookingVariant || !bookingService) {
      return {
        acceptedDogSizes: ["small", "medium", "large"] as ("small" | "medium" | "large")[],
        dogCategoryAcceptance: "none" as "none" | "cat1" | "cat2" | "both",
      };
    }
    // Priorité au variant, sinon au service
    const acceptedDogSizes = (bookingVariant as { acceptedDogSizes?: ("small" | "medium" | "large")[] }).acceptedDogSizes
      || (bookingService as { acceptedDogSizes?: ("small" | "medium" | "large")[] }).acceptedDogSizes
      || ["small", "medium", "large"];
    const dogCategoryAcceptance = (bookingVariant as { dogCategoryAcceptance?: "none" | "cat1" | "cat2" | "both" }).dogCategoryAcceptance
      || (bookingService as { dogCategoryAcceptance?: "none" | "cat1" | "cat2" | "both" }).dogCategoryAcceptance
      || "none";
    return { acceptedDogSizes, dogCategoryAcceptance };
  }, [bookingVariant, bookingService]);

  // Handlers pour la vérification de l'animal (invités)
  const handleGuestAnimalDataChange = useCallback((data: GuestAnimalData | null) => {
    setGuestAnimalData(data);
  }, []);

  const handleGuestAnimalValidationChange = useCallback((isValid: boolean, error?: string) => {
    setGuestAnimalValid(isValid);
    setGuestAnimalError(error);
  }, []);

  // Ref pour stocker les animalIds de l'URL initiale (nuqs peut nettoyer l'URL après le montage)
  // On utilise le même state initial que selectedAnimalIds pour garantir la cohérence
  const initialUrlAnimalIdsRef = useRef<string[]>(selectedAnimalIds);
  const hasAppliedUrlAnimalsRef = useRef(false);

  // Booking handlers (doivent être avant les early returns)
  const handleVariantSelect = useCallback((serviceId: string, variantId: string) => {
    // Préserver les animaux pré-sélectionnés depuis l'URL uniquement à la première sélection
    let urlIds: string[] = [];
    if (!hasAppliedUrlAnimalsRef.current) {
      urlIds = initialUrlAnimalIdsRef.current;
      if (urlIds.length > 0) {
        hasAppliedUrlAnimalsRef.current = true;
      }
    }
    const preserveAnimals = urlIds.length > 0;

    setBookingSelection((prev) => ({
      ...prev,
      selectedServiceId: serviceId,
      selectedVariantId: variantId,
      selectedOptionIds: [],
      selectedAnimalIds: preserveAnimals ? urlIds : [],
      animalCount: preserveAnimals ? urlIds.length : 1,
    }));
    setSelectedAnimalIds(preserveAnimals ? urlIds : []);
    // Réinitialiser la vérification de l'animal quand on change de formule
    setGuestAnimalData(null);
    setGuestAnimalValid(false);
    setGuestAnimalError(undefined);
    if (announcer) {
      const service = announcer.services.find((s) => s.id === serviceId);
      if (service) {
        setSelectedServiceSlug(service.categorySlug ?? service.categoryId ?? null);
      }
    }
  }, [announcer, setSelectedServiceSlug]);

  // Pré-sélectionner la formule si le paramètre ?formule= est présent dans l'URL
  useEffect(() => {
    if (!formuleQueryParam || !announcer) return;

    // Chercher le service qui contient cette formule
    for (const service of announcer.services) {
      const formule = service.formules?.find((f: { id: string }) => f.id === formuleQueryParam);
      if (formule) {
        // Utiliser les animalIds sauvegardés au montage (nuqs peut nettoyer l'URL)
        const urlIds = initialUrlAnimalIdsRef.current;

        // Sélectionner le service et la formule en préservant les animaux de l'URL
        setBookingSelection((prev) => ({
          ...prev,
          selectedServiceId: service.id,
          selectedVariantId: formule.id,
          selectedOptionIds: [],
          selectedAnimalIds: urlIds.length > 0 ? urlIds : prev.selectedAnimalIds,
          animalCount: urlIds.length > 0 ? urlIds.length : prev.animalCount,
        }));
        // Synchroniser le state local si des animaux viennent de l'URL
        if (urlIds.length > 0) {
          setSelectedAnimalIds(urlIds);
        }
        // Mettre à jour le service slug dans l'URL
        setSelectedServiceSlug(service.categorySlug ?? service.categoryId ?? null);
        // Nettoyer le paramètre formule de l'URL (on garde juste service)
        setFormuleQueryParam(null);
        break;
      }
    }
  }, [formuleQueryParam, announcer, setSelectedServiceSlug, setFormuleQueryParam]);

  const handleVariantDeselect = useCallback(() => {
    setBookingSelection((prev) => ({
      ...prev,
      selectedVariantId: null,
    }));
  }, []);

  const handleOptionToggle = useCallback((optionId: string) => {
    setBookingSelection((prev) => ({
      ...prev,
      selectedOptionIds: prev.selectedOptionIds.includes(optionId)
        ? prev.selectedOptionIds.filter((id) => id !== optionId)
        : [...prev.selectedOptionIds, optionId],
    }));
  }, []);

  const handleDateSelect = useCallback((date: string) => {
    setBookingSelection((prev) => ({ ...prev, startDate: date }));
  }, []);

  const handleEndDateSelect = useCallback((date: string | null) => {
    setBookingSelection((prev) => ({ ...prev, endDate: date }));
  }, []);

  const handleTimeSelect = useCallback((time: string) => {
    setBookingSelection((prev) => ({ ...prev, startTime: time, endTime: null }));
  }, []);

  const handleEndTimeSelect = useCallback((time: string) => {
    setBookingSelection((prev) => ({ ...prev, endTime: time }));
  }, []);

  const handleOvernightChange = useCallback((include: boolean) => {
    setBookingSelection((prev) => ({ ...prev, includeOvernightStay: include }));
  }, []);

  const handleLocationSelect = useCallback((location: "announcer_home" | "client_home") => {
    setBookingSelection((prev) => ({
      ...prev,
      serviceLocation: location,
      // Auto-select default address when choosing client_home
      selectedAddressId: location === "client_home" && clientAddresses.length > 0
        ? (clientAddresses.find(a => a.isDefault)?._id ?? clientAddresses[0]._id) as string
        : null,
    }));
  }, [clientAddresses]);

  const handleAddressSelect = useCallback((addressId: string) => {
    setBookingSelection((prev) => ({ ...prev, selectedAddressId: addressId }));
  }, []);

  const handleAddNewAddress = useCallback(() => {
    // Navigate to client profile to add a new address
    router.push("/client/profil?section=adresses&action=new");
  }, [router]);

  const handleGuestAddressChange = useCallback((address: {
    address: string;
    city: string | null;
    postalCode: string | null;
    coordinates: { lat: number; lng: number } | null;
  } | null) => {
    setBookingSelection((prev) => ({ ...prev, guestAddress: address }));
  }, []);

  // Handlers pour créneaux collectifs
  const handleSlotsSelected = useCallback((slotIds: string[]) => {
    setBookingSelection((prev) => ({ ...prev, selectedSlotIds: slotIds }));
  }, []);

  const handleAnimalCountChange = useCallback((count: number) => {
    setBookingSelection((prev) => ({ ...prev, animalCount: count }));
  }, []);

  // Handler pour les séances individuelles multi-sessions
  const handleSessionsChange = useCallback((sessions: SelectedSession[]) => {
    setBookingSelection((prev) => ({ ...prev, selectedSessions: sessions }));
  }, []);

  // Handler pour la sélection/déselection d'animal (utilisateur connecté - sélection multiple)
  // Pas de limite : l'utilisateur peut sélectionner tous ses animaux compatibles
  // Les créneaux seront filtrés en fonction du nombre d'animaux sélectionnés
  const handleAnimalToggle = useCallback((animalId: string, animalType: string) => {
    // Vérifier que le type d'animal est accepté par la formule (comparaison insensible à la casse)
    const variantTypes = bookingVariant?.animalTypes || [];
    const serviceTypes = bookingService?.animalTypes || [];
    const acceptedTypes = variantTypes.length > 0 ? variantTypes : serviceTypes;
    const acceptedTypesLower = acceptedTypes.map((t: string) => t.toLowerCase());
    const animalTypeLower = animalType?.toLowerCase();
    if (acceptedTypesLower.length > 0 && !acceptedTypesLower.includes(animalTypeLower)) {
      console.warn(`Animal type ${animalType} not accepted for this variant`);
      return;
    }

    // Pour les chiens, vérifier les restrictions de la formule
    if (animalType === "chien") {
      const animal = userAnimals.find((a: { id: string }) => a.id === animalId);
      if (animal) {
        // Récupérer les restrictions de la formule
        const variantDogSizes = bookingVariant?.acceptedDogSizes || ["small", "medium", "large"];
        const variantDogCategory = bookingVariant?.dogCategoryAcceptance || "none";

        // Déterminer la taille du chien
        let dogSize: DogSize = "medium";
        if (animal.weight) {
          dogSize = getSizeFromWeight(animal.weight);
        } else if (animal.size) {
          // Mapper la taille du schéma vers DogSize
          const sizeMapping: Record<string, DogSize> = {
            petit: "small",
            moyen: "medium",
            grand: "large",
            tres_grand: "large",
          };
          dogSize = sizeMapping[animal.size] || "medium";
        }

        // Vérifier la catégorie du chien (basée sur la race)
        let dogCategory: "none" | "cat1" | "cat2" = "none";
        if (animal.breed && animal.breedSlug) {
          const categoryResult = checkBreedCategory(animal.breed, animal.breedSlug);
          if (categoryResult.isCategorized) {
            // Pour les chiens catégorisés, sans info LOF on assume cat1 par défaut (plus restrictif)
            dogCategory = categoryResult.category === "unknown" ? "cat1" : categoryResult.category as "cat1" | "cat2";
          }
        }

        // Vérifier si le chien est accepté
        const acceptanceResult = isDogAccepted(
          dogSize,
          dogCategory,
          variantDogSizes as DogSize[],
          variantDogCategory
        );

        if (!acceptanceResult.accepted) {
          // Stocker l'erreur et ne pas sélectionner
          setConnectedDogErrors((prev) => ({
            ...prev,
            [animalId]: acceptanceResult.reason || "Ce chien ne respecte pas les restrictions de cette formule",
          }));
          return;
        } else {
          // Supprimer l'erreur si elle existait
          setConnectedDogErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[animalId];
            return newErrors;
          });
        }
      }
    }

    setSelectedAnimalIds((prev) => {
      const isSelected = prev.includes(animalId);
      let newIds: string[];

      if (isSelected) {
        // Remove the animal
        newIds = prev.filter((id) => id !== animalId);
        // Supprimer l'erreur si elle existait
        setConnectedDogErrors((prevErrors) => {
          const newErrors = { ...prevErrors };
          delete newErrors[animalId];
          return newErrors;
        });
      } else {
        // Add the animal (pas de limite)
        newIds = [...prev, animalId];
      }

      // Sync animalCount with selected animals count
      const newCount = Math.max(1, newIds.length);
      setBookingSelection((prevBooking) => ({
        ...prevBooking,
        selectedAnimalType: animalType,
        animalCount: newCount,
        selectedAnimalIds: newIds,
      }));

      return newIds;
    });
  }, [bookingVariant, userAnimals]);

  const handleBook = useCallback(() => {
    if (isAnnouncer || !announcerData || !announcer) return;

    const params = new URLSearchParams();

    if (bookingSelection.selectedServiceId) {
      const service = announcer.services.find((s) => s.id === bookingSelection.selectedServiceId);
      params.set("service", service?.categorySlug ?? bookingSelection.selectedServiceId);
    }
    if (bookingSelection.selectedVariantId) {
      params.set("variant", bookingSelection.selectedVariantId);
    }
    if (bookingSelection.selectedOptionIds.length > 0) {
      params.set("options", bookingSelection.selectedOptionIds.join(","));
    }
    if (bookingSelection.startDate) {
      params.set("date", bookingSelection.startDate);
    }
    if (bookingSelection.endDate && bookingSelection.endDate !== bookingSelection.startDate) {
      params.set("endDate", bookingSelection.endDate);
    }
    if (bookingSelection.startTime) {
      params.set("startTime", bookingSelection.startTime);
    }
    if (bookingSelection.endTime) {
      params.set("endTime", bookingSelection.endTime);
    }
    if (bookingSelection.includeOvernightStay) {
      params.set("overnight", "true");
    }
    if (bookingSelection.serviceLocation) {
      params.set("location", bookingSelection.serviceLocation);
    }
    if (bookingSelection.selectedAddressId) {
      params.set("addressId", bookingSelection.selectedAddressId);
    }
    // Guest address for non-logged in users
    if (bookingSelection.guestAddress) {
      params.set("guestAddress", bookingSelection.guestAddress.address);
      if (bookingSelection.guestAddress.city) {
        params.set("guestCity", bookingSelection.guestAddress.city);
      }
      if (bookingSelection.guestAddress.postalCode) {
        params.set("guestPostalCode", bookingSelection.guestAddress.postalCode);
      }
      if (bookingSelection.guestAddress.coordinates) {
        params.set("guestLat", bookingSelection.guestAddress.coordinates.lat.toString());
        params.set("guestLng", bookingSelection.guestAddress.coordinates.lng.toString());
      }
    }
    // Créneaux collectifs
    if (bookingSelection.selectedSlotIds.length > 0) {
      params.set("slotIds", bookingSelection.selectedSlotIds.join(","));
    }
    if (bookingSelection.animalCount > 1) {
      params.set("animalCount", bookingSelection.animalCount.toString());
    }
    if (bookingSelection.selectedAnimalType && bookingSelection.selectedAnimalType !== "chien") {
      params.set("animalType", bookingSelection.selectedAnimalType);
    }
    // Séances individuelles multi-sessions
    if (bookingSelection.selectedSessions.length > 0) {
      params.set("sessions", JSON.stringify(bookingSelection.selectedSessions));
    }
    // Animaux sélectionnés
    if (selectedAnimalIds.length > 0) {
      params.set("animalIds", selectedAnimalIds.join(","));
    }

    const queryString = params.toString();
    router.push(`/reserver/${announcerData.id}${queryString ? `?${queryString}` : ""}`);
  }, [announcerData, announcer, bookingSelection, selectedAnimalIds, router]);

  // Handler pour aller directement à la finalisation
  const handleFinalize = useCallback(() => {
    if (isAnnouncer || !announcerData || !announcer) return;

    const params = new URLSearchParams();

    if (bookingSelection.selectedServiceId) {
      const service = announcer.services.find((s) => s.id === bookingSelection.selectedServiceId);
      params.set("service", service?.categorySlug ?? bookingSelection.selectedServiceId);
    }
    if (bookingSelection.selectedVariantId) {
      params.set("variant", bookingSelection.selectedVariantId);
    }
    if (bookingSelection.selectedOptionIds.length > 0) {
      params.set("options", bookingSelection.selectedOptionIds.join(","));
    }
    if (bookingSelection.startDate) {
      params.set("date", bookingSelection.startDate);
    }
    if (bookingSelection.endDate && bookingSelection.endDate !== bookingSelection.startDate) {
      params.set("endDate", bookingSelection.endDate);
    }
    if (bookingSelection.startTime) {
      params.set("startTime", bookingSelection.startTime);
    }
    if (bookingSelection.endTime) {
      params.set("endTime", bookingSelection.endTime);
    }
    if (bookingSelection.includeOvernightStay) {
      params.set("overnight", "true");
    }
    if (bookingSelection.serviceLocation) {
      params.set("location", bookingSelection.serviceLocation);
    }
    if (bookingSelection.selectedAddressId) {
      params.set("addressId", bookingSelection.selectedAddressId);
    }
    // Guest address for non-logged in users
    if (bookingSelection.guestAddress) {
      params.set("guestAddress", bookingSelection.guestAddress.address);
      if (bookingSelection.guestAddress.city) {
        params.set("guestCity", bookingSelection.guestAddress.city);
      }
      if (bookingSelection.guestAddress.postalCode) {
        params.set("guestPostalCode", bookingSelection.guestAddress.postalCode);
      }
      if (bookingSelection.guestAddress.coordinates) {
        params.set("guestLat", bookingSelection.guestAddress.coordinates.lat.toString());
        params.set("guestLng", bookingSelection.guestAddress.coordinates.lng.toString());
      }
    }
    // Créneaux collectifs
    if (bookingSelection.selectedSlotIds.length > 0) {
      params.set("slotIds", bookingSelection.selectedSlotIds.join(","));
    }
    if (bookingSelection.animalCount > 1) {
      params.set("animalCount", bookingSelection.animalCount.toString());
    }
    if (bookingSelection.selectedAnimalType && bookingSelection.selectedAnimalType !== "chien") {
      params.set("animalType", bookingSelection.selectedAnimalType);
    }
    // Séances individuelles multi-sessions
    if (bookingSelection.selectedSessions.length > 0) {
      params.set("sessions", JSON.stringify(bookingSelection.selectedSessions));
    }
    // Animaux sélectionnés
    if (selectedAnimalIds.length > 0) {
      params.set("animalIds", selectedAnimalIds.join(","));
    }

    // Données de l'animal invité (pré-remplissage)
    if (guestAnimalData) {
      params.set("guestAnimalType", guestAnimalData.animalType);
      if (guestAnimalData.breed) {
        params.set("guestAnimalBreed", guestAnimalData.breed);
      }
      if (guestAnimalData.isMixedBreed) {
        params.set("guestAnimalMixed", "true");
      }
      if (guestAnimalData.dogData?.dominantBreed) {
        params.set("guestAnimalPrimaryBreed", guestAnimalData.dogData.dominantBreed);
      } else if (guestAnimalData.catData?.primaryBreed) {
        params.set("guestAnimalPrimaryBreed", guestAnimalData.catData.primaryBreed);
      }
      if (guestAnimalData.catData?.secondaryBreed) {
        params.set("guestAnimalSecondaryBreed", guestAnimalData.catData.secondaryBreed);
      }
    }

    // Paramètre pour aller directement à la finalisation
    params.set("finalize", "true");

    const queryString = params.toString();
    router.push(`/reserver/${announcerData.id}${queryString ? `?${queryString}` : ""}`);
  }, [announcerData, announcer, bookingSelection, selectedAnimalIds, guestAnimalData, router]);

  // ─── Mutations Convex pour la finalisation in-wizard ───
  const createPendingBookingMutation = useMutation(api.public.booking.createPendingBooking);
  const finalizeBookingMutation = useMutation(api.public.booking.finalizeBooking);
  const finalizeBookingAsGuestMutation = useMutation(api.public.booking.finalizeBookingAsGuest);

  // Handler de finalisation directe depuis le wizard (étape Finaliser)
  const handleFinalizeWizard = useCallback(async () => {
    if (isAnnouncer || !announcerData || !announcer || !bookingService || !bookingVariant) return;

    // Reset des erreurs
    setFinalizeData((prev) => ({ ...prev, isSubmitting: true, submitError: null, fieldErrors: {} }));

    try {
      const isLoggedIn = !!token;
      const guest = finalizeData.guestData;

      // ── 1. Validation pour les invités ──
      if (!isLoggedIn) {
        const errors: Record<string, string> = {};
        if (!guest?.firstName?.trim()) errors.firstName = "Prénom requis";
        if (!guest?.lastName?.trim()) errors.lastName = "Nom requis";
        if (!guest?.email?.trim()) errors.email = "Email requis";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email)) errors.email = "Email invalide";
        if (!guest?.phone?.trim()) errors.phone = "Téléphone requis";
        if (!guest?.password || guest.password.length < 6)
          errors.password = "Mot de passe (min. 6 caractères)";
        if (guest?.password !== guest?.confirmPassword)
          errors.confirmPassword = "Les mots de passe ne correspondent pas";
        if (!guestAnimalData) errors.animal = "Veuillez vérifier votre animal";

        if (Object.keys(errors).length > 0) {
          setFinalizeData((prev) => ({
            ...prev,
            isSubmitting: false,
            fieldErrors: errors,
            submitError: "Veuillez corriger les erreurs du formulaire",
          }));
          return;
        }
      }

      // ── 2. Calcul des paramètres communs ──
      const totalAmount = priceBreakdown?.total ?? 0;
      const isCollectiveFormula =
        bookingVariant.sessionType === "collective" || bookingSelection.selectedSlotIds.length > 0;
      const isMultiSessionIndividual =
        !isCollectiveFormula && (bookingVariant.numberOfSessions || 1) > 1;
      const effectiveAnimalCount = isCollectiveFormula
        ? Math.max(1, bookingSelection.animalCount || 1)
        : Math.max(1, selectedAnimalIds.length || 1);
      const overnightAmount = nights > 0 && bookingService.overnightPrice
        ? nights * bookingService.overnightPrice
        : 0;

      const effectiveStartDate = bookingSelection.startDate;
      const effectiveEndDate = bookingSelection.endDate || bookingSelection.startDate;

      if (!effectiveStartDate) {
        throw new Error("Veuillez sélectionner une date");
      }

      // ── 3. Créer la réservation pending ──
      const pendingResult = await createPendingBookingMutation({
        announcerId: announcerData.id as Id<"users">,
        serviceId: bookingService.id as Id<"services">,
        variantId: bookingVariant.id,
        optionIds: bookingSelection.selectedOptionIds as Id<"serviceOptions">[],
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        startTime: bookingSelection.startTime || undefined,
        endTime: bookingSelection.endTime || undefined,
        calculatedAmount: totalAmount,
        collectiveSlotIds: isCollectiveFormula && bookingSelection.selectedSlotIds.length > 0
          ? bookingSelection.selectedSlotIds as Id<"collectiveSlots">[]
          : undefined,
        animalCount: isCollectiveFormula ? bookingSelection.animalCount : undefined,
        selectedAnimalType: isCollectiveFormula ? bookingSelection.selectedAnimalType : undefined,
        effectiveAnimalCount,
        selectedAnimalIds: selectedAnimalIds.length > 0 ? selectedAnimalIds : undefined,
        sessions: isMultiSessionIndividual && bookingSelection.selectedSessions.length > 0
          ? bookingSelection.selectedSessions
          : undefined,
        includeOvernightStay: bookingSelection.includeOvernightStay && nights > 0 ? true : undefined,
        overnightNights: nights > 0 ? nights : undefined,
        overnightAmount: overnightAmount > 0 ? overnightAmount : undefined,
        serviceLocation: bookingSelection.serviceLocation || undefined,
        guestAddress: bookingSelection.guestAddress ? {
          address: bookingSelection.guestAddress.address,
          city: bookingSelection.guestAddress.city || undefined,
          postalCode: bookingSelection.guestAddress.postalCode || undefined,
          coordinates: bookingSelection.guestAddress.coordinates || undefined,
        } : undefined,
        guestAnimalPreFill: guestAnimalData ? {
          type: guestAnimalData.animalType,
          breed: guestAnimalData.breed || undefined,
          isMixedBreed: guestAnimalData.isMixedBreed || undefined,
          primaryBreed: guestAnimalData.dogData?.dominantBreed || guestAnimalData.catData?.primaryBreed || undefined,
          secondaryBreed: guestAnimalData.catData?.secondaryBreed || undefined,
        } : undefined,
        token: token || undefined,
      });

      if (!pendingResult.success || !pendingResult.bookingId) {
        throw new Error("Impossible de créer la réservation");
      }

      // ── 4. Calcul du lieu effectif ──
      const useAnnouncerLocation =
        bookingSelection.serviceLocation === "announcer_home" || isCollectiveFormula;
      const effectiveLocation = useAnnouncerLocation
        ? (announcerData.location || "")
        : (bookingSelection.guestAddress?.address || selectedClientAddress?.address || "");
      const effectiveCity = useAnnouncerLocation ? undefined : (bookingSelection.guestAddress?.city || selectedClientAddress?.city || undefined);
      const effectivePostalCode = useAnnouncerLocation ? undefined : (bookingSelection.guestAddress?.postalCode || selectedClientAddress?.postalCode || undefined);
      const effectiveCoordinates = useAnnouncerLocation ? undefined : (bookingSelection.guestAddress?.coordinates || selectedClientAddress?.coordinates || undefined);

      // ── 5. Finaliser selon le statut connexion ──
      if (isLoggedIn && token) {
        const animalId = selectedAnimalIds[0];
        if (!animalId) {
          throw new Error("Veuillez sélectionner un animal");
        }

        const result = await finalizeBookingMutation({
          token,
          bookingId: pendingResult.bookingId,
          animalId: animalId as Id<"animals">,
          animalIds: selectedAnimalIds.length > 1 ? (selectedAnimalIds as Id<"animals">[]) : undefined,
          location: effectiveLocation,
          city: effectiveCity,
          postalCode: effectivePostalCode,
          coordinates: effectiveCoordinates,
          notes: finalizeData.notes?.trim() || undefined,
          updatedOptionIds: bookingSelection.selectedOptionIds,
          updatedAmount: totalAmount,
        });

        if (result.success) {
          router.push(`/dashboard?tab=missions&success=booking`);
        }
      } else {
        // Invité — créer le compte + finaliser
        const animalType = guestAnimalData?.animalType || "chien";
        const result = await finalizeBookingAsGuestMutation({
          bookingId: pendingResult.bookingId,
          userData: {
            firstName: guest!.firstName.trim(),
            lastName: guest!.lastName.trim(),
            email: guest!.email.trim().toLowerCase(),
            phone: guest!.phone.trim(),
            password: guest!.password,
          },
          animalData: {
            name: guest!.firstName.trim(), // Nom de l'animal par défaut = prénom de l'utilisateur (à compléter plus tard)
            type: animalType,
            gender: "unknown",
            breed: guestAnimalData?.breed || undefined,
          },
          location: effectiveLocation.trim(),
          city: effectiveCity,
          postalCode: effectivePostalCode,
          coordinates: effectiveCoordinates,
          notes: finalizeData.notes?.trim() || undefined,
          updatedOptionIds: bookingSelection.selectedOptionIds,
          updatedAmount: totalAmount,
        });

        if (result.success && result.token) {
          await storeAuthToken(result.token);
          if (result.requiresEmailVerification) {
            router.push(`/reservation/confirmation-email?email=${encodeURIComponent(guest!.email.trim().toLowerCase())}`);
          } else {
            router.push(`/dashboard?tab=missions&success=booking`);
          }
        }
      }
    } catch (err: unknown) {
      let errorMessage = "Erreur lors de la réservation";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "object" && err !== null && "data" in err) {
        const convexErr = err as { data?: string | { message?: string } };
        if (typeof convexErr.data === "string") errorMessage = convexErr.data;
        else if (convexErr.data?.message) errorMessage = convexErr.data.message;
      }
      const fieldErrors: Record<string, string> = {};
      if (errorMessage.toLowerCase().includes("email") || errorMessage.toLowerCase().includes("compte existe")) {
        fieldErrors.email = errorMessage;
      }
      setFinalizeData((prev) => ({
        ...prev,
        isSubmitting: false,
        submitError: errorMessage,
        fieldErrors,
      }));
      return;
    }

    setFinalizeData((prev) => ({ ...prev, isSubmitting: false }));
  }, [
    isAnnouncer,
    announcerData,
    announcer,
    bookingService,
    bookingVariant,
    bookingSelection,
    selectedAnimalIds,
    selectedClientAddress,
    nights,
    priceBreakdown,
    token,
    finalizeData.guestData,
    finalizeData.notes,
    guestAnimalData,
    createPendingBookingMutation,
    finalizeBookingMutation,
    finalizeBookingAsGuestMutation,
    router,
  ]);

  // Early returns APRÈS tous les hooks
  if (announcerData === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-gray-500">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (announcerData === null || !announcer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Annonceur introuvable
          </h1>
          <p className="text-gray-500 mb-6">
            Ce profil n&apos;existe pas ou n&apos;est plus disponible.
          </p>
          <button
            onClick={() => router.push("/recherche")}
            className="px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors"
          >
            Retour à la recherche
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header fixe avec recherche */}
      <Navbar hideSpacers />

      {/* Hero Section avec Cover et Action Bar */}
      <AnnouncerHero
        announcer={announcer}
        slug={announcerSlug}
        distance={distance}
        isFavorite={isFavorite}
        onToggleFavorite={() => setIsFavorite(!isFavorite)}
      />

      {/* Navigation Tabs */}
      <AnnouncerTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        reviewCount={announcer.reviewCount}
        serviceCount={announcer.services?.length || 0}
      />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            {/* Tab: Formules - Selected service with formules and options */}
            {activeTab === "formules" && (
              <AnnouncerFormules
                service={selectedService}
                commissionRate={commissionRate}
                selectedVariantId={bookingSelection.selectedVariantId}
                selectedOptionIds={bookingSelection.selectedOptionIds}
                bookingSelection={bookingSelection}
                isRangeMode={isRangeMode}
                days={days}
                nights={nights}
                calendarMonth={calendarMonth}
                availabilityCalendar={availabilityCalendar?.calendar}
                isCapacityBased={availabilityCalendar?.isCapacityBased}
                maxAnimalsPerSlot={availabilityCalendar?.maxAnimalsPerSlot}
                acceptReservationsFrom={availabilityCalendar?.acceptReservationsFrom || announcerPreferences?.acceptReservationsFrom}
                acceptReservationsTo={availabilityCalendar?.acceptReservationsTo || announcerPreferences?.acceptReservationsTo}
                bufferBefore={availabilityCalendar?.bufferBefore || 0}
                bufferAfter={availabilityCalendar?.bufferAfter || 0}
                onVariantSelect={handleVariantSelect}
                onVariantDeselect={handleVariantDeselect}
                onOptionToggle={handleOptionToggle}
                onLocationSelect={handleLocationSelect}
                isLoggedIn={!!token}
                clientAddresses={clientAddresses}
                isLoadingAddresses={clientAddressesData === undefined}
                onAddressSelect={handleAddressSelect}
                onAddNewAddress={handleAddNewAddress}
                guestAddress={bookingSelection.guestAddress}
                announcerCoordinates={announcerData?.coordinates ?? undefined}
                onGuestAddressChange={handleGuestAddressChange}
                onDateSelect={handleDateSelect}
                onEndDateSelect={handleEndDateSelect}
                onTimeSelect={handleTimeSelect}
                onEndTimeSelect={handleEndTimeSelect}
                onOvernightChange={handleOvernightChange}
                onMonthChange={setCalendarMonth}
                // Props créneaux collectifs
                selectedSlotIds={bookingSelection.selectedSlotIds}
                onSlotsSelected={handleSlotsSelected}
                selectedAnimalType={bookingSelection.selectedAnimalType}
                animalCount={bookingSelection.animalCount}
                onAnimalCountChange={handleAnimalCountChange}
                // Props séances individuelles multi-sessions
                selectedSessions={bookingSelection.selectedSessions}
                onSessionsChange={handleSessionsChange}
                // Props sélection d'animal (multiple)
                userAnimals={userAnimals}
                selectedAnimalIds={selectedAnimalIds}
                onAnimalToggle={handleAnimalToggle}
                maxSelectableAnimals={maxSelectableAnimals}
                // Infos annonceur pour la section lieu (ville + CP uniquement)
                announcerCity={extractCityDisplay(announcer.location)}
                announcerFirstName={announcer.firstName}
                // Rayon d'action de l'annonceur
                announcerRadius={announcer.radius}
                // Callback connexion inline
                onLoginSuccess={refreshToken}
                // Vérification de l'animal pour les invités (intégré dans AnnouncerFormules)
                requiresAnimalVerification={requiresAnimalVerification}
                acceptedAnimalTypes={acceptedAnimalTypes}
                guestAnimalValid={guestAnimalValid}
                guestAnimalError={guestAnimalError}
                dogRestrictions={dogRestrictions}
                guestAnimalData={guestAnimalData}
                onGuestAnimalDataChange={handleGuestAnimalDataChange}
                onGuestAnimalValidationChange={handleGuestAnimalValidationChange}
                // Erreurs de restriction pour les chiens des utilisateurs connectés
                connectedDogErrors={connectedDogErrors}
                // Callback pour finaliser la réservation (undefined pour les annonceurs)
                onBook={isAnnouncer ? undefined : handleBook}
                onFinalize={isAnnouncer ? undefined : handleFinalize}
                isAnnouncer={isAnnouncer}
                // ─── Wizard intégré : props pour étapes Récap + Finalisation ───
                collectiveSlotsDetails={collectiveSlots.map((s: { _id: string; date: string; startTime: string; endTime: string; maxAnimals: number; bookedAnimals: number }) => ({
                  _id: String(s._id),
                  date: s.date,
                  startTime: s.startTime,
                  endTime: s.endTime,
                  availableSpots: s.maxAnimals - s.bookedAnimals,
                }))}
                priceBreakdown={priceBreakdown ?? null}
                announcerStatusType={
                  (announcer.statusType ?? "particulier") as
                    | "particulier"
                    | "micro_entrepreneur"
                    | "professionnel"
                }
                announcerLastName={announcer.lastName ?? ""}
                finalizeData={finalizeData}
                onFinalizeDataChange={setFinalizeData}
                onFinalizeWizard={isAnnouncer ? undefined : handleFinalizeWizard}
              />
            )}

            {/* Tab: Profil - Gallery, Compagnons, À propos */}
            {activeTab === "profil" && (
              <AnnouncerProfile
                announcer={announcer}
              />
            )}

            {/* Tab: Avis - Reviews */}
            {activeTab === "avis" && (
              <AnnouncerReviews
                reviews={announcer.reviews}
                rating={announcer.rating}
                reviewCount={announcer.reviewCount}
              />
            )}
          </div>

          {/* Right Column - Booking Card ou Insight Card (Sticky) */}
          <div className="hidden lg:block">
            {isAnnouncer ? (
              <AnnouncerInsightCard
                announcer={announcer}
                commissionRate={commissionRate}
              />
            ) : (
              <AnnouncerBookingCard
                services={announcer.services}
                responseRate={announcer.responseRate}
                responseTime={announcer.responseTime}
                nextAvailable={announcer.availability.nextAvailable}
                selectedServiceId={selectedService?.id ?? null}
                commissionRate={commissionRate}
                vatRate={vatRate}
                stripeFeeRate={stripeFeeRate}
                bookingService={bookingService}
                bookingVariant={bookingVariant}
                bookingSelection={bookingSelection}
                priceBreakdown={priceBreakdown}
                clientAddress={selectedClientAddress}
                collectiveSlots={collectiveSlots}
                animalCount={bookingSelection.animalCount}
                selectedSessions={bookingSelection.selectedSessions}
                announcerFirstName={announcer.firstName}
                announcerId={announcerData?.id}
                announcerStatusType={announcerData?.statusType as "particulier" | "micro_entrepreneur" | "professionnel" | undefined}
                // Vérification de l'animal pour les invités
                requiresAnimalVerification={requiresAnimalVerification}
                guestAnimalValid={guestAnimalValid}
                guestAnimalError={guestAnimalError}
                onServiceChange={(serviceId) => {
                  // Trouver le categorySlug du service sélectionné et mettre à jour l'URL
                  const service = announcer.services.find((s) => s.id === serviceId);
                  setSelectedServiceSlug(service?.categorySlug ?? service?.categoryId ?? null);
                }}
                onBook={handleBook}
                onFinalize={handleFinalize}
              />
            )}
          </div>
        </div>
      </main>

      {/* Mobile Floating CTA */}
      <AnnouncerMobileCTA
        services={announcer.services}
        selectedServiceId={selectedService?.id ?? null}
        commissionRate={commissionRate}
        vatRate={vatRate}
        stripeFeeRate={stripeFeeRate}
        bookingService={bookingService}
        bookingVariant={bookingVariant}
        bookingSelection={bookingSelection}
        priceBreakdown={priceBreakdown}
        // Calendar props for mobile sheet
        isRangeMode={isRangeMode}
        days={days}
        nights={nights}
        calendarMonth={calendarMonth}
        availabilityCalendar={availabilityCalendar?.calendar}
        isCapacityBased={availabilityCalendar?.isCapacityBased}
        maxAnimalsPerSlot={availabilityCalendar?.maxAnimalsPerSlot}
        acceptReservationsFrom={availabilityCalendar?.acceptReservationsFrom || announcerPreferences?.acceptReservationsFrom}
        acceptReservationsTo={availabilityCalendar?.acceptReservationsTo || announcerPreferences?.acceptReservationsTo}
        bufferBefore={availabilityCalendar?.bufferBefore || 0}
        bufferAfter={availabilityCalendar?.bufferAfter || 0}
        onDateSelect={handleDateSelect}
        onEndDateSelect={handleEndDateSelect}
        onTimeSelect={handleTimeSelect}
        onEndTimeSelect={handleEndTimeSelect}
        onOvernightChange={handleOvernightChange}
        onMonthChange={setCalendarMonth}
        onBook={handleBook}
        onFinalize={handleFinalize}
        // Props créneaux collectifs
        selectedSlotIds={bookingSelection.selectedSlotIds}
        onSlotsSelected={handleSlotsSelected}
        animalCount={bookingSelection.animalCount}
        onAnimalCountChange={handleAnimalCountChange}
        selectedAnimalType={bookingSelection.selectedAnimalType}
        // Props séances individuelles multi-sessions
        selectedSessions={bookingSelection.selectedSessions}
        onSessionsChange={handleSessionsChange}
        // Props pour sélection d'animaux (garde)
        isLoggedIn={!!token}
        isAuthLoading={isAuthLoading}
        userAnimals={userAnimals}
        selectedAnimalIds={selectedAnimalIds}
        onAnimalToggle={handleAnimalToggle}
        maxSelectableAnimals={maxSelectableAnimals}
        // Props pour le lieu
        onLocationSelect={handleLocationSelect}
        announcerFirstName={announcer.firstName}
        announcerStatusType={announcerData?.statusType as "particulier" | "micro_entrepreneur" | "professionnel" | undefined}
        announcerCity={extractCityDisplay(announcer.location)}
        announcerCoordinates={announcerData?.coordinates ?? undefined}
        announcerRadius={announcer.radius}
        // Props pour les adresses
        clientAddresses={clientAddresses}
        isLoadingAddresses={clientAddressesData === undefined}
        onAddressSelect={handleAddressSelect}
        onAddNewAddress={handleAddNewAddress}
        guestAddress={bookingSelection.guestAddress}
        onGuestAddressChange={handleGuestAddressChange}
        // Callback connexion inline
        onLoginSuccess={refreshToken}
        // Props pour les options
        onOptionToggle={handleOptionToggle}
        selectedOptionIds={bookingSelection.selectedOptionIds}
        // Vérification de l'animal pour les invités
        requiresAnimalVerification={requiresAnimalVerification}
        acceptedAnimalTypes={acceptedAnimalTypes}
        guestAnimalValid={guestAnimalValid}
        guestAnimalError={guestAnimalError}
        dogRestrictions={dogRestrictions}
        guestAnimalData={guestAnimalData}
        onGuestAnimalDataChange={handleGuestAnimalDataChange}
        onGuestAnimalValidationChange={handleGuestAnimalValidationChange}
        // Erreurs de restriction pour les chiens des utilisateurs connectés
        connectedDogErrors={connectedDogErrors}
        // Blocage annonceur
        isAnnouncer={isAnnouncer}
      />
    </div>
  );
}
