"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Loader2 } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useAuth } from "@/app/hooks/useAuth";

import {
  AnnouncerHero,
  AnnouncerFormules,
  AnnouncerProfile,
  AnnouncerReviews,
  AnnouncerBookingCard,
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
  DEFAULT_BOOKING_SELECTION,
  calculatePriceBreakdown,
  isGardeService,
} from "./components/booking";

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

export default function AnnouncerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { token, refreshToken } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("formules");

  // Récupérer le slug de l'annonceur depuis l'URL
  const announcerSlug = params.id as string;

  // Gérer le service sélectionné avec nuqs (categorySlug, synchronisé avec l'URL)
  const [selectedServiceSlug, setSelectedServiceSlug] = useQueryState("service");

  // État de la réservation (formule, options, dates, heures)
  const [bookingSelection, setBookingSelection] = useState<BookingSelection>(DEFAULT_BOOKING_SELECTION);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

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
    id: animal._id,
    name: animal.name,
    type: animal.type,
    breed: animal.breed,
    profilePhoto: animal.profilePhoto,
  }));

  // State for selected animals in collective sessions (supports multiple selection)
  const [selectedAnimalIds, setSelectedAnimalIds] = useState<string[]>([]);

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

  // Calculate maximum selectable animals for collective formulas
  const maxSelectableAnimals = useMemo(() => {
    // If no variant or not collective, default to 1
    if (!bookingVariant || bookingVariant.sessionType !== "collective") return 1;

    // Get the max animals per session from the variant
    const maxAnimalsPerSlot = bookingVariant.maxAnimalsPerSession || 5;

    // If we have selected slots, use the minimum available spots among all slots
    if (collectiveSlots.length > 0) {
      const minAvailableSpots = Math.min(...collectiveSlots.map((s: any) => s.availableSpots));
      // The max is the minimum between variant's max and available spots
      const maxFromSlots = Math.min(maxAnimalsPerSlot, minAvailableSpots);

      // Filter user animals by accepted types
      const acceptedTypes = bookingVariant.animalTypes || [];
      const compatibleAnimals = userAnimals.filter((a: any) =>
        acceptedTypes.length === 0 || acceptedTypes.includes(a.type)
      );

      // Final max is the minimum between slots availability and compatible animals
      return Math.min(maxFromSlots, Math.max(1, compatibleAnimals.length));
    }

    // No slots selected yet, use the variant's max or compatible animals count
    const acceptedTypes = bookingVariant.animalTypes || [];
    const compatibleAnimals = userAnimals.filter((a: any) =>
      acceptedTypes.length === 0 || acceptedTypes.includes(a.type)
    );

    return Math.min(maxAnimalsPerSlot, Math.max(1, compatibleAnimals.length));
  }, [bookingVariant, collectiveSlots, userAnimals]);

  // Calculate price breakdown
  const priceBreakdown = useMemo((): PriceBreakdown | null => {
    if (!bookingService || !bookingVariant) return null;

    const dayStartTime = announcerPreferences?.acceptReservationsFrom || "08:00";
    const dayEndTime = announcerPreferences?.acceptReservationsTo || "20:00";
    const overnightPrice = bookingService.overnightPrice;
    const enableDurationBasedBlocking = Boolean(bookingService.enableDurationBasedBlocking);

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
      bookingService.allowedPriceUnits
    );
  }, [bookingService, bookingVariant, bookingSelection, commissionRate, workdayHours, announcerPreferences]);

  // Find selected client address for display
  const selectedClientAddress = useMemo((): ClientAddress | null => {
    if (!bookingSelection.selectedAddressId || clientAddresses.length === 0) {
      return null;
    }
    return clientAddresses.find(a => a._id === bookingSelection.selectedAddressId) ?? null;
  }, [bookingSelection.selectedAddressId, clientAddresses]);

  // Booking handlers (doivent être avant les early returns)
  const handleVariantSelect = useCallback((serviceId: string, variantId: string) => {
    setBookingSelection((prev) => ({
      ...prev,
      selectedServiceId: serviceId,
      selectedVariantId: variantId,
      selectedOptionIds: [],
    }));
    if (announcer) {
      const service = announcer.services.find((s) => s.id === serviceId);
      if (service) {
        setSelectedServiceSlug(service.categorySlug ?? service.categoryId ?? null);
      }
    }
  }, [announcer, setSelectedServiceSlug]);

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
  const handleAnimalToggle = useCallback((animalId: string, animalType: string) => {
    setSelectedAnimalIds((prev) => {
      const isSelected = prev.includes(animalId);
      let newIds: string[];

      if (isSelected) {
        // Remove the animal
        newIds = prev.filter((id) => id !== animalId);
      } else {
        // Add the animal (respect max limit)
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
  }, []);

  const handleBook = useCallback(() => {
    if (!announcerData || !announcer) return;

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
    if (!announcerData || !announcer) return;

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

    // Paramètre pour aller directement à la finalisation
    params.set("finalize", "true");

    const queryString = params.toString();
    router.push(`/reserver/${announcerData.id}${queryString ? `?${queryString}` : ""}`);
  }, [announcerData, announcer, bookingSelection, selectedAnimalIds, router]);

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
        selectedServiceAnimals={selectedService?.animalTypes}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {/* Left Column - Main Content */}
          <div className="md:col-span-2 space-y-6 sm:space-y-8">
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
                // Infos annonceur pour la section lieu
                announcerCity={announcer.location ?? undefined}
                announcerFirstName={announcer.firstName}
                // Callback connexion inline
                onLoginSuccess={refreshToken}
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

          {/* Right Column - Booking Card (Sticky) */}
          <div className="hidden md:block">
            <AnnouncerBookingCard
              services={announcer.services}
              responseRate={announcer.responseRate}
              responseTime={announcer.responseTime}
              nextAvailable={announcer.availability.nextAvailable}
              selectedServiceId={selectedService?.id ?? null}
              commissionRate={commissionRate}
              bookingService={bookingService}
              bookingVariant={bookingVariant}
              bookingSelection={bookingSelection}
              priceBreakdown={priceBreakdown}
              clientAddress={selectedClientAddress}
              collectiveSlots={collectiveSlots}
              animalCount={bookingSelection.animalCount}
              selectedSessions={bookingSelection.selectedSessions}
              onServiceChange={(serviceId) => {
                // Trouver le categorySlug du service sélectionné et mettre à jour l'URL
                const service = announcer.services.find((s) => s.id === serviceId);
                setSelectedServiceSlug(service?.categorySlug ?? service?.categoryId ?? null);
              }}
              onBook={handleBook}
              onFinalize={handleFinalize}
            />
          </div>
        </div>
      </main>

      {/* Mobile Floating CTA */}
      <AnnouncerMobileCTA
        services={announcer.services}
        selectedServiceId={selectedService?.id ?? null}
        commissionRate={commissionRate}
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
      />
    </div>
  );
}
