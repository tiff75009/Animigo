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
  CalendarCheck,
  AlertCircle,
  Filter,
  X,
  Eye,
  EyeOff,
  ChevronDown,
  SlidersHorizontal,
  List,
  Map as MapIcon,
  Package,
  Layers,
  Zap,
  Check,
  Clock,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Euro,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useSearch, type AnnouncerResult } from "@/app/hooks/useSearch";
import {
  CategorySelector,
  DateSelector,
  LocationSearchBar,
  AnimalTypeDropdown,
} from "@/app/components/search";
import FilterSidebar, {
  defaultAdvancedFilters,
} from "@/app/components/search/FilterSidebar";
import type { SitterLocation } from "@/app/lib/search-data";
import { Navbar } from "@/app/components/navbar";
import { Footer } from "@/app/components/footer";

// Dynamically import the map component to avoid SSR issues
const MapComponent = dynamic(
  () => import("@/app/components/sections/map-component"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-gray-100 rounded-2xl flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-text-light">Chargement de la carte...</p>
        </div>
      </div>
    ),
  }
);

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

// Radius options
const radiusOptions = [5, 10, 15, 20, 30, 50];

// Helper function to extract city from location string
function extractCity(location: string): string {
  const parts = location.split(",").map((p) => p.trim());
  const lastPart = parts[parts.length - 1];
  if (/^\d/.test(lastPart)) {
    const cityMatch = lastPart.match(/\d+\s+(.+)/);
    return cityMatch ? cityMatch[1] : lastPart;
  }
  return lastPart;
}

// Convert AnnouncerResult to SitterLocation for MapComponent
function toSitterLocation(announcer: AnnouncerResult): SitterLocation {
  return {
    id: announcer.id,
    firstName: announcer.firstName,
    lastName: announcer.lastName,
    avatar: announcer.profileImage || "",
    profileImage: announcer.profileImage || null,
    location: announcer.location,
    coordinates: announcer.coordinates!,
    services: announcer.services,
    rating: announcer.rating,
    reviewCount: announcer.reviewCount,
    hourlyRate: announcer.basePrice ? announcer.basePrice / 100 : 0,
    verified: announcer.verified,
    acceptedAnimals: announcer.acceptedAnimals,
    available: announcer.availability.status === "available",
    distance: announcer.distance,
    statusType: announcer.statusType,
    basePrice: announcer.basePrice,
  };
}

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
  variantDuration?: number;
  optionIds: string[];
  serviceCategory: string;
}

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
    category: { slug: string; name: string } | null;
    date: string | null;
    time: string | null;
    startDate: string | null;
    endDate: string | null;
  };
}) {
  const router = useRouter();
  const [step, setStep] = useState<"formulas" | "booking">("formulas");
  const [selection, setSelection] = useState<BookingSelection | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(
    searchFilters?.date ?? searchFilters?.startDate ?? null
  );
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(
    searchFilters?.endDate ?? null
  );
  const [selectedTime, setSelectedTime] = useState<string | null>(
    searchFilters?.time ?? null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const initialDate = searchFilters?.date ?? searchFilters?.startDate;
    return initialDate ? new Date(initialDate) : new Date();
  });
  const [categoryFilter, setCategoryFilter] = useState<string>(
    searchFilters?.category?.slug ?? "all"
  );

  const createPendingBooking = useMutation(api.public.booking.createPendingBooking);

  const serviceDetails = useQuery(
    api.public.search.getAnnouncerServiceDetails,
    isOpen ? { announcerId: announcer.id as Id<"users"> } : "skip"
  );

  const startOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const endOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);

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

  const handleClose = () => {
    setStep("formulas");
    setSelection(null);
    setSelectedDate(searchFilters?.date ?? searchFilters?.startDate ?? null);
    setSelectedEndDate(searchFilters?.endDate ?? null);
    setSelectedTime(searchFilters?.time ?? null);
    setBookingError(null);
    setCategoryFilter(searchFilters?.category?.slug ?? "all");
    onClose();
  };

  const filteredServices = useMemo(() => {
    if (!serviceDetails) return [];
    if (categoryFilter === "all") return serviceDetails;
    return serviceDetails.filter((service) => service.category === categoryFilter);
  }, [serviceDetails, categoryFilter]);

  const availableCategories = useMemo(() => {
    if (!serviceDetails) return [];
    return serviceDetails.map((service) => ({
      slug: service.category,
      name: service.categoryName,
      icon: service.categoryIcon,
    }));
  }, [serviceDetails]);

  const handleSelectVariant = (
    serviceId: string,
    variant: { id: string; name: string; price: number; priceUnit: string; duration?: number },
    serviceCategory: string
  ) => {
    setSelection({
      serviceId,
      variantId: variant.id,
      variantName: variant.name,
      variantPrice: variant.price,
      variantPriceUnit: variant.priceUnit,
      variantDuration: variant.duration,
      optionIds: [],
      serviceCategory,
    });
    setStep("booking");
  };

  const calculateAmount = () => {
    if (!selection) return 0;
    let amount = selection.variantPrice;
    if (selection.variantPriceUnit === "hour" && selection.variantDuration) {
      amount = Math.round((selection.variantPrice * selection.variantDuration) / 60);
    } else if (selection.variantPriceUnit === "day" && selectedDate && selectedEndDate) {
      const start = new Date(selectedDate);
      const end = new Date(selectedEndDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      amount = selection.variantPrice * days;
    }
    return amount;
  };

  const handleContinueBooking = async () => {
    if (!selection || !selectedDate) {
      setBookingError("Veuillez sélectionner une date");
      return;
    }
    if (selection.variantPriceUnit !== "day" && !selectedTime) {
      setBookingError("Veuillez sélectionner une heure");
      return;
    }

    setIsSubmitting(true);
    setBookingError(null);

    try {
      const token = localStorage.getItem("session_token") || undefined;
      const result = await createPendingBooking({
        announcerId: announcer.id as Id<"users">,
        serviceId: selection.serviceId as Id<"services">,
        variantId: selection.variantId,
        optionIds: selection.optionIds.length > 0 ? selection.optionIds : undefined,
        startDate: selectedDate,
        endDate: selectedEndDate ?? selectedDate,
        startTime: selectedTime ?? undefined,
        calculatedAmount: calculateAmount(),
        token,
      });

      if (result.success) {
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
  const totalVariants = filteredServices.reduce((acc, s) => acc + s.variants.length, 0);
  const totalOptions = filteredServices.reduce((acc, s) => acc + s.options.length, 0);

  const generateCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = (firstDay.getDay() + 6) % 7;
    const days: Array<{ date: string; day: number; isCurrentMonth: boolean }> = [];

    for (let i = startPadding - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: formatDateLocal(d), day: d.getDate(), isCurrentMonth: false });
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({ date: formatDateLocal(d), day: i, isCurrentMonth: true });
    }
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month + 1, i);
        days.push({ date: formatDateLocal(d), day: i, isCurrentMonth: false });
      }
    }
    return days;
  };

  const calendarDays = generateCalendarDays();
  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

  const calendarData = availabilityCalendar?.calendar ?? [];
  const bufferBefore = availabilityCalendar?.bufferBefore ?? 0;
  const bufferAfter = availabilityCalendar?.bufferAfter ?? 0;

  const getDateStatus = (date: string) => {
    if (!availabilityCalendar) return "loading";
    const dayInfo = calendarData.find((d) => d.date === date);
    return dayInfo?.status ?? "available";
  };

  const getBookedSlotsForDate = (date: string) => {
    if (!availabilityCalendar) return [];
    const dayInfo = calendarData.find((d) => d.date === date);
    return dayInfo?.bookedSlots ?? [];
  };

  const parseTime = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const subtractMinutes = (time: string, minutes: number): string => {
    const total = Math.max(0, parseTime(time) - minutes);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const addMinutes = (time: string, minutes: number): string => {
    const total = Math.min(24 * 60 - 1, parseTime(time) + minutes);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const isTimeSlotBooked = (time: string) => {
    if (!selectedDate) return false;
    const bookedSlots = getBookedSlotsForDate(selectedDate);
    if (bookedSlots.length === 0) return false;
    const slotStart = parseTime(time);
    return bookedSlots.some((booked) => {
      const effectiveStart = subtractMinutes(booked.startTime, bufferBefore);
      const effectiveEnd = addMinutes(booked.endTime, bufferAfter);
      const bookedStart = parseTime(effectiveStart);
      const bookedEnd = parseTime(effectiveEnd);
      return slotStart >= bookedStart && slotStart <= bookedEnd;
    });
  };

  const isRangeMode = selection?.variantPriceUnit === "day";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-50"
          />
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
                      <button onClick={() => setStep("formulas")} className="p-2 hover:bg-foreground/10 rounded-full transition-colors">
                        <ChevronLeft className="w-5 h-5 text-foreground/60" />
                      </button>
                    )}
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-white shadow-sm">
                      {announcer.profileImage ? (
                        <Image src={announcer.profileImage} alt={announcer.firstName} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl bg-gray-100">👤</div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground">
                        {step === "booking" ? `Réserver avec ${announcer.firstName}` : `${announcer.firstName} ${announcer.lastName.charAt(0)}.`}
                      </h3>
                      {step === "formulas" && (
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1 text-sm text-primary font-medium">
                            <Layers className="w-4 h-4" />
                            {totalVariants} formule{totalVariants > 1 ? "s" : ""}
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
                              ({selection.variantDuration < 60 ? `${selection.variantDuration} min` : `${Math.floor(selection.variantDuration / 60)}h${selection.variantDuration % 60 > 0 ? selection.variantDuration % 60 : ""}`})
                            </span>
                          )}
                          - {formatPrice(selection.variantPrice)}{priceUnitLabels[selection.variantPriceUnit]}
                        </p>
                      )}
                    </div>
                  </div>
                  <button onClick={handleClose} className="p-2 hover:bg-foreground/10 rounded-full transition-colors">
                    <X className="w-5 h-5 text-foreground/60" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 overflow-y-auto max-h-[60vh]">
                {step === "formulas" && (
                  <>
                    {isLoading ? (
                      <div className="flex items-center justify-center py-10">
                        <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full" />
                      </div>
                    ) : serviceDetails && serviceDetails.length > 0 ? (
                      <div className="space-y-6">
                        {availableCategories.length > 1 && (
                          <div className="flex flex-wrap gap-2 pb-4 border-b border-foreground/10">
                            <button
                              onClick={() => setCategoryFilter("all")}
                              className={cn("px-4 py-2 rounded-full text-sm font-medium transition-all", categoryFilter === "all" ? "bg-primary text-white" : "bg-foreground/5 text-foreground/70 hover:bg-foreground/10")}
                            >
                              Tout ({serviceDetails.length})
                            </button>
                            {availableCategories.map((cat) => (
                              <button
                                key={cat.slug}
                                onClick={() => setCategoryFilter(cat.slug)}
                                className={cn("px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2", categoryFilter === cat.slug ? "bg-primary text-white" : "bg-foreground/5 text-foreground/70 hover:bg-foreground/10")}
                              >
                                {cat.icon && <span>{cat.icon}</span>}
                                {cat.name}
                              </button>
                            ))}
                          </div>
                        )}

                        {filteredServices.map((service) => (
                          <div key={service.id} className="space-y-4">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl flex-shrink-0">
                                {service.categoryIcon ?? "✨"}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-foreground">{service.categoryName}</h4>
                                <p className="text-xs text-text-light">{service.animalTypes.join(", ")}</p>
                              </div>
                            </div>

                            {service.variants.length > 0 && (
                              <div className="space-y-2">
                                {service.variants.map((variant) => (
                                  <div key={variant.id} className="p-4 bg-primary/5 rounded-xl border border-primary/10 hover:border-primary/30 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <h5 className="font-semibold text-foreground">{variant.name}</h5>
                                          {variant.duration && (
                                            <span className="text-xs px-2 py-0.5 bg-foreground/10 rounded-full text-foreground/60">{variant.duration}min</span>
                                          )}
                                        </div>
                                        {variant.description && <p className="text-sm text-text-light mt-1">{variant.description}</p>}
                                        {variant.includedFeatures && variant.includedFeatures.length > 0 && (
                                          <div className="mt-2 space-y-1">
                                            {variant.includedFeatures.map((feature, idx) => (
                                              <div key={idx} className="flex items-center gap-2 text-sm text-secondary">
                                                <Check className="w-3.5 h-3.5" />
                                                <span>{feature}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-right flex-shrink-0">
                                        {variant.priceUnit === "hour" && variant.duration ? (
                                          <>
                                            <div className="text-xl font-bold text-primary">{formatPrice(Math.round((variant.price * variant.duration) / 60))}</div>
                                            <div className="text-xs text-text-light">{formatPrice(variant.price)}/h</div>
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
                                      onClick={() => handleSelectVariant(service.id, variant, service.category)}
                                      className="w-full mt-3 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
                                    >
                                      Réserver cette formule
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {service.options.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wider">Options additionnelles</p>
                                <div className="flex flex-wrap gap-2">
                                  {service.options.map((option) => (
                                    <div key={option.id} className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm">
                                      <Zap className="w-4 h-4 text-amber-500" />
                                      <span className="font-medium text-amber-800">{option.name}</span>
                                      <span className="text-amber-600 font-semibold">+{formatPrice(option.price)}{priceTypeLabels[option.priceType] ?? ""}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}

                        {filteredServices.length === 0 && categoryFilter !== "all" && (
                          <div className="text-center py-6">
                            <div className="text-3xl mb-2">🔍</div>
                            <p className="text-text-light text-sm">Aucune formule dans cette catégorie</p>
                            <button onClick={() => setCategoryFilter("all")} className="mt-2 text-primary text-sm font-medium hover:underline">
                              Voir toutes les formules
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <div className="text-4xl mb-3">📭</div>
                        <p className="text-text-light">Aucune formule disponible</p>
                      </div>
                    )}
                  </>
                )}

                {step === "booking" && selection && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        {isRangeMode ? "Sélectionnez vos dates" : "Sélectionnez une date"}
                      </h4>
                      <div className="bg-foreground/[0.02] rounded-xl p-4 border border-foreground/10">
                        <div className="flex items-center justify-between mb-4">
                          <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))} className="p-2 hover:bg-foreground/10 rounded-lg transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <h5 className="font-semibold">{monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</h5>
                          <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))} className="p-2 hover:bg-foreground/10 rounded-lg transition-colors">
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 mb-2">
                          {weekDays.map((day) => (
                            <div key={day} className="text-center text-xs font-medium text-foreground/50 py-2">{day}</div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {calendarDays.map(({ date, day, isCurrentMonth }, idx) => {
                            const status = getDateStatus(date);
                            const isSelected = date === selectedDate;
                            const isEndSelected = date === selectedEndDate;
                            const isInRange = isRangeMode && selectedDate && selectedEndDate && date > selectedDate && date < selectedEndDate;
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
                      </div>
                    </div>

                    {!isRangeMode && selectedDate && (
                      <div>
                        <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                          <Clock className="w-5 h-5 text-primary" />
                          Sélectionnez une heure
                        </h4>
                        <div className="grid grid-cols-5 gap-2">
                          {bookingTimeSlots.map((time) => {
                            const isBooked = isTimeSlotBooked(time);
                            return (
                              <button
                                key={time}
                                disabled={isBooked}
                                onClick={() => setSelectedTime(time)}
                                className={cn(
                                  "py-2 text-sm font-medium rounded-lg transition-all",
                                  isBooked ? "bg-red-100 text-red-400 cursor-not-allowed line-through" : selectedTime === time ? "bg-primary text-white" : "bg-foreground/5 hover:bg-primary/10"
                                )}
                              >
                                {time}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {selectedDate && (
                      <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                        <div className="flex items-center justify-between">
                          <span className="text-foreground/70">Total estimé</span>
                          <span className="text-xl font-bold text-primary">{formatPrice(calculateAmount())}</span>
                        </div>
                      </div>
                    )}

                    {bookingError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{bookingError}</div>
                    )}
                  </div>
                )}
              </div>

              {step === "booking" && (
                <div className="p-4 border-t border-foreground/10 bg-foreground/[0.02]">
                  <button
                    onClick={handleContinueBooking}
                    disabled={isSubmitting || !selectedDate || (!isRangeMode && !selectedTime)}
                    className={cn(
                      "w-full py-3 rounded-xl font-semibold transition-colors",
                      isSubmitting || !selectedDate || (!isRangeMode && !selectedTime)
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
  onShowFormulas,
}: {
  announcer: AnnouncerResult;
  isSelected: boolean;
  onClick: () => void;
  onShowFormulas: () => void;
}) {
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
    <motion.div
      className={cn(
        "bg-white rounded-2xl p-4 shadow-md cursor-pointer transition-all",
        isSelected ? "ring-2 ring-primary shadow-lg" : "hover:shadow-lg"
      )}
      onClick={onClick}
      whileHover={{ y: -2 }}
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
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
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
            <div className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", availInfo.color)}>
              <AvailIcon className="w-3 h-3" />
              {availInfo.label}
            </div>
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-primary bg-primary/10">
              <Package className="w-3 h-3" />
              {announcer.services.length} formule{announcer.services.length > 1 ? "s" : ""}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowFormulas();
              }}
              className="text-xs text-primary font-medium hover:underline"
            >
              Voir les formules
            </button>
            {announcer.basePrice && (
              <p className="font-bold text-primary">
                {formatPrice(announcer.basePrice)}
                <span className="font-normal text-text-light">/h</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function RecherchePage() {
  const {
    filters,
    advancedFilters,
    results,
    isLoading,
    setCategory,
    setAnimalType,
    setLocation,
    setRadius,
    setDate,
    setTime,
    setDateRange,
    setIncludeUnavailable,
    updateAdvancedFilters,
    resetAdvancedFilters,
    resetAllFilters,
  } = useSearch();

  const [selectedAnnouncerId, setSelectedAnnouncerId] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [formulasModalAnnouncer, setFormulasModalAnnouncer] = useState<AnnouncerResult | null>(null);

  // Convert announcers to SitterLocation format for the map
  const sittersForMap = useMemo(
    () =>
      results
        .filter((a) => a.coordinates)
        .map(toSitterLocation),
    [results]
  );

  // Find selected sitter for the map
  const selectedSitter = useMemo(
    () => sittersForMap.find((s) => s.id === selectedAnnouncerId) || null,
    [sittersForMap, selectedAnnouncerId]
  );

  // Check if any advanced filter is active
  const hasAdvancedFilters =
    advancedFilters.sortBy !== "relevance" ||
    advancedFilters.accountTypes.length > 0 ||
    advancedFilters.verifiedOnly ||
    advancedFilters.withPhotoOnly ||
    advancedFilters.hasGarden !== null ||
    advancedFilters.hasVehicle !== null ||
    advancedFilters.ownsAnimals.length > 0 ||
    advancedFilters.noAnimals ||
    advancedFilters.priceRange.min !== null ||
    advancedFilters.priceRange.max !== null;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background pt-20 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-32 left-10 text-6xl opacity-10 animate-float">🐕</div>
          <div className="absolute top-60 right-20 text-5xl opacity-10 animate-float" style={{ animationDelay: "0.5s" }}>🐈</div>
          <div className="absolute bottom-60 left-20 text-4xl opacity-10 animate-float" style={{ animationDelay: "1s" }}>🐰</div>
          <div className="absolute bottom-32 right-10 text-5xl opacity-10 animate-float" style={{ animationDelay: "1.5s" }}>🦜</div>
        </div>

        {/* Header with basic filters */}
        <div className="sticky top-20 z-40 bg-white/95 backdrop-blur-sm shadow-sm relative">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Category Selector */}
          <div className="mb-4">
            <CategorySelector
              selectedCategory={filters.category}
              onSelect={setCategory}
            />
          </div>

          {/* Filter Row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Location */}
            <div className="flex-1 min-w-[200px] max-w-md">
              <LocationSearchBar
                value={filters.location.text}
                onSelect={setLocation}
              />
            </div>

            {/* Radius */}
            <div className="relative">
              <select
                value={filters.radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
                className="appearance-none px-4 py-2.5 pr-8 rounded-xl border border-foreground/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {radiusOptions.map((r) => (
                  <option key={r} value={r}>
                    {r} km
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50 pointer-events-none" />
            </div>

            {/* Animal Type */}
            <AnimalTypeDropdown
              selected={filters.animalType}
              onSelect={setAnimalType}
            />

            {/* Date */}
            <DateSelector
              billingType={filters.category?.billingType || "hourly"}
              date={filters.date}
              time={filters.time}
              startDate={filters.startDate}
              endDate={filters.endDate}
              onDateChange={setDate}
              onTimeChange={setTime}
              onDateRangeChange={setDateRange}
            />

            {/* Include unavailable */}
            <button
              type="button"
              onClick={() => setIncludeUnavailable(!filters.includeUnavailable)}
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-colors",
                filters.includeUnavailable
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-foreground/10 text-foreground/60 hover:border-foreground/20"
              )}
            >
              {filters.includeUnavailable ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
              <span className="text-sm hidden sm:inline">Indisponibles</span>
            </button>

            {/* Mobile filter button */}
            <button
              type="button"
              onClick={() => setShowMobileFilters(true)}
              className={cn(
                "lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors",
                hasAdvancedFilters
                  ? "border-primary bg-primary text-white"
                  : "border-foreground/10 text-foreground hover:border-foreground/20"
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="text-sm">Filtres</span>
              {hasAdvancedFilters && (
                <span className="w-2 h-2 rounded-full bg-white" />
              )}
            </button>

            {/* View mode toggle (mobile) */}
            <div className="flex lg:hidden border border-foreground/10 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-2.5 transition-colors",
                  viewMode === "list"
                    ? "bg-primary text-white"
                    : "text-foreground/60"
                )}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("map")}
                className={cn(
                  "p-2.5 transition-colors",
                  viewMode === "map"
                    ? "bg-primary text-white"
                    : "text-foreground/60"
                )}
              >
                <MapIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Map Section - Full width, directly under filters */}
      <div
        className={cn(
          "w-full relative z-10",
          viewMode === "map" ? "block" : "hidden lg:block"
        )}
      >
        <div className="relative w-full overflow-hidden bg-white border-b border-foreground/10 shadow-sm">
          {/* Map Header */}
          <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-white/95 via-white/80 to-transparent px-4 py-3 pointer-events-none">
            <div className="max-w-7xl mx-auto flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">
                  {sittersForMap.length} pet-sitter{sittersForMap.length > 1 ? "s" : ""} sur la carte
                </h3>
                <p className="text-xs text-text-light">
                  {filters.location.text || "Toute la France"} • Rayon {filters.radius} km
                </p>
              </div>
            </div>
          </div>

          {/* Map Container */}
          <div className="h-[280px] lg:h-[320px] w-full">
            <MapComponent
              sitters={sittersForMap}
              selectedSitter={selectedSitter}
              onSitterSelect={(sitter) => setSelectedAnnouncerId(sitter.id)}
              searchCenter={filters.location.coordinates || null}
              searchRadius={filters.radius}
              mapStyle="plan"
            />
          </div>

          {/* Map Footer Gradient */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 relative z-10">
        {/* Results + Sidebar */}
        <div className="flex gap-6">
          {/* Results List */}
          <div
            className={cn(
              "flex-1",
              viewMode === "map" && "hidden lg:block"
            )}
          >
            {/* Results header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                {isLoading ? (
                  "Recherche en cours..."
                ) : (
                  <>
                    {results.length} annonceur{results.length > 1 ? "s" : ""}{" "}
                    {filters.category ? `pour ${filters.category.name}` : ""}
                  </>
                )}
              </h2>
              {(hasAdvancedFilters ||
                filters.category ||
                filters.animalType ||
                filters.location.text) && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-sm text-primary hover:underline"
                >
                  Effacer les filtres
                </button>
              )}
            </div>

            {/* Results grid */}
            {isLoading ? (
              <div className="grid gap-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl p-4 animate-pulse"
                  >
                    <div className="flex gap-4">
                      <div className="w-16 h-16 bg-gray-200 rounded-xl" />
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                        <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
                        <div className="h-3 bg-gray-200 rounded w-1/4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center">
                <Search className="w-12 h-12 text-foreground/20 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Aucun annonceur trouvé
                </h3>
                <p className="text-text-light mb-4">
                  Essayez de modifier vos critères de recherche ou d&apos;élargir
                  votre zone de recherche.
                </p>
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {results.map((announcer) => (
                  <AnnouncerCard
                    key={announcer.id}
                    announcer={announcer}
                    isSelected={selectedAnnouncerId === announcer.id}
                    onClick={() => setSelectedAnnouncerId(announcer.id)}
                    onShowFormulas={() => setFormulasModalAnnouncer(announcer)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar (Desktop only) */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <FilterSidebar
              filters={advancedFilters}
              onFilterChange={updateAdvancedFilters}
              onReset={resetAdvancedFilters}
              categorySlug={filters.category?.slug ?? null}
            />
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <AnimatePresence>
        {showMobileFilters && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 lg:hidden"
              onClick={() => setShowMobileFilters(false)}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white z-50 lg:hidden overflow-y-auto"
            >
              <FilterSidebar
                filters={advancedFilters}
                onFilterChange={updateAdvancedFilters}
                onReset={resetAdvancedFilters}
                categorySlug={filters.category?.slug ?? null}
                isMobile
                onClose={() => setShowMobileFilters(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Formulas Modal */}
      {formulasModalAnnouncer && (
        <FormulasModal
          isOpen={!!formulasModalAnnouncer}
          onClose={() => setFormulasModalAnnouncer(null)}
          announcer={formulasModalAnnouncer}
          searchFilters={{
            category: filters.category ? { slug: filters.category.slug, name: filters.category.name } : null,
            date: filters.date,
            time: filters.time,
            startDate: filters.startDate,
            endDate: filters.endDate,
          }}
        />
      )}
    </div>
    <Footer />
  </>
  );
}
