"use client";

import { useState } from "react";
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
  Calendar,
  Target,
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
}

// Formulas Modal Component with Booking
function FormulasModal({
  isOpen,
  onClose,
  announcer,
}: {
  isOpen: boolean;
  onClose: () => void;
  announcer: AnnouncerResult;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"formulas" | "booking">("formulas");
  const [selection, setSelection] = useState<BookingSelection | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Mutation pour cr\u00e9er une r\u00e9servation en attente
  const createPendingBooking = useMutation(api.public.booking.createPendingBooking);

  // Fetch detailed service data
  const serviceDetails = useQuery(
    api.public.search.getAnnouncerServiceDetails,
    isOpen ? { announcerId: announcer.id as Id<"users"> } : "skip"
  );

  // Fetch availability calendar
  const startOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const endOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);

  const availabilityCalendar = useQuery(
    api.public.search.getAnnouncerAvailabilityCalendar,
    isOpen && selection && step === "booking"
      ? {
          announcerId: announcer.id as Id<"users">,
          serviceCategory: selection.serviceCategory,
          startDate: startOfMonth.toISOString().split("T")[0],
          endDate: endOfMonth.toISOString().split("T")[0],
        }
      : "skip"
  );

  // Reset state when modal closes
  const handleClose = () => {
    setStep("formulas");
    setSelection(null);
    setSelectedDate(null);
    setSelectedEndDate(null);
    setSelectedTime(null);
    setBookingError(null);
    onClose();
  };

  // Handle variant selection
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

  // Calculer le montant total
  const calculateAmount = () => {
    if (!selection) return 0;
    let amount = selection.variantPrice;

    // Si tarification horaire avec durée, calculer le prix total
    if (selection.variantPriceUnit === "hour" && selection.variantDuration) {
      // Prix = taux horaire × (durée en heures)
      amount = Math.round((selection.variantPrice * selection.variantDuration) / 60);
    }
    // Si tarification journalière, multiplier par le nombre de jours
    else if (selection.variantPriceUnit === "day" && selectedDate && selectedEndDate) {
      const start = new Date(selectedDate);
      const end = new Date(selectedEndDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      amount = selection.variantPrice * days;
    }
    return amount;
  };

  // Handle booking continuation - create pending booking and redirect
  const handleContinueBooking = async () => {
    if (!selection || !selectedDate) {
      setBookingError("Veuillez s\u00e9lectionner une date");
      return;
    }

    // Pour les services horaires, v\u00e9rifier que l'heure est s\u00e9lectionn\u00e9e
    if (selection.variantPriceUnit !== "day" && !selectedTime) {
      setBookingError("Veuillez s\u00e9lectionner une heure");
      return;
    }

    setIsSubmitting(true);
    setBookingError(null);

    try {
      // R\u00e9cup\u00e9rer le token (optionnel)
      const token = localStorage.getItem("session_token") || undefined;

      // Cr\u00e9er la r\u00e9servation en attente
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
  const totalVariants = serviceDetails?.reduce((acc, s) => acc + s.variants.length, 0) ?? 0;
  const totalOptions = serviceDetails?.reduce((acc, s) => acc + s.options.length, 0) ?? 0;

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
        date: d.toISOString().split("T")[0],
        day: d.getDate(),
        isCurrentMonth: false,
      });
    }

    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d.toISOString().split("T")[0],
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
          date: d.toISOString().split("T")[0],
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

  const getDateStatus = (date: string) => {
    if (!availabilityCalendar) return "loading";
    const dayInfo = availabilityCalendar.find((d) => d.date === date);
    return dayInfo?.status ?? "available";
  };

  const isRangeMode = selection?.variantPriceUnit === "day";

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
                        {step === "success" ? "Réservation envoyée !" :
                         step === "booking" ? `Réserver avec ${announcer.firstName}` :
                         `${announcer.firstName} ${announcer.lastName.charAt(0)}.`}
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
                              ({selection.variantDuration < 60
                                ? `${selection.variantDuration} min`
                                : `${Math.floor(selection.variantDuration / 60)}h${selection.variantDuration % 60 > 0 ? selection.variantDuration % 60 : ""}`})
                            </span>
                          )}
                          - {formatPrice(selection.variantPrice)}{priceUnitLabels[selection.variantPriceUnit]}
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
                        {serviceDetails.map((service) => (
                          <div key={service.id} className="space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
                                {service.categoryIcon ?? "✨"}
                              </div>
                              <div>
                                <h4 className="font-semibold text-foreground">{service.categoryName}</h4>
                                <p className="text-xs text-text-light">{service.animalTypes.join(", ")}</p>
                              </div>
                            </div>

                            {service.variants.length > 0 && (
                              <div className="space-y-2">
                                {service.variants.map((variant) => (
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
                                        {/* Afficher le prix total calculé si service horaire avec durée */}
                                        {variant.priceUnit === "hour" && variant.duration ? (
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

                            {serviceDetails.indexOf(service) < serviceDetails.length - 1 && (
                              <div className="border-b border-foreground/10" />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <div className="text-4xl mb-3">📭</div>
                        <p className="text-text-light">Aucune formule disponible</p>
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

                    {/* Time selection (for hourly) */}
                    {!isRangeMode && selectedDate && (
                      <div>
                        <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                          <Clock className="w-5 h-5 text-primary" />
                          Sélectionnez une heure
                        </h4>
                        <div className="grid grid-cols-5 gap-2">
                          {bookingTimeSlots.map((time) => (
                            <button
                              key={time}
                              onClick={() => setSelectedTime(time)}
                              className={cn(
                                "py-2 text-sm font-medium rounded-lg transition-all",
                                selectedTime === time
                                  ? "bg-primary text-white"
                                  : "bg-foreground/5 hover:bg-primary/10"
                              )}
                            >
                              {time}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Récapitulatif du prix */}
                    {selectedDate && (
                      <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                        <div className="flex items-center justify-between">
                          <span className="text-foreground/70">Total estimé</span>
                          <span className="text-xl font-bold text-primary">
                            {formatPrice(calculateAmount())}
                          </span>
                        </div>
                        {/* Détail du calcul pour services horaires */}
                        {selection?.variantPriceUnit === "hour" && selection?.variantDuration && (
                          <p className="text-xs text-foreground/50 mt-1">
                            {formatPrice(selection.variantPrice)}/h × {selection.variantDuration < 60
                              ? `${selection.variantDuration} min`
                              : `${Math.floor(selection.variantDuration / 60)}h${selection.variantDuration % 60 > 0 ? selection.variantDuration % 60 : ""}`}
                          </p>
                        )}
                        {isRangeMode && selectedEndDate && (
                          <p className="text-xs text-foreground/50 mt-1">
                            Du {new Date(selectedDate).toLocaleDateString("fr-FR")} au {new Date(selectedEndDate).toLocaleDateString("fr-FR")}
                          </p>
                        )}
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
                    disabled={isSubmitting || !selectedDate || (!isRangeMode && !selectedTime)}
                    className={cn(
                      "w-full py-3 rounded-xl font-semibold transition-colors",
                      isSubmitting || !selectedDate || (!isRangeMode && !selectedTime)
                        ? "bg-foreground/10 text-foreground/40 cursor-not-allowed"
                        : "bg-primary text-white hover:bg-primary/90"
                    )}
                  >
                    {isSubmitting ? "Chargement..." : "Poursuivre la r\u00e9servation"}
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
        isSelected
          ? "ring-2 ring-primary shadow-lg"
          : "hover:shadow-lg"
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
                {(announcer.basePrice / 100).toFixed(0)}€
                <span className="font-normal text-text-light">/h</span>
              </p>
            )}
          </div>
        </div>
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
    setDateRange,
    setIncludeUnavailable,
    resetFilters,
  } = useSearch();

  const [selectedAnnouncer, setSelectedAnnouncer] = useState<AnnouncerResult | null>(null);
  const [formulasModalAnnouncer, setFormulasModalAnnouncer] = useState<AnnouncerResult | null>(null);
  const [mapStyle, setMapStyle] = useState<"default" | "plan">("default");

  // Convert results to map-compatible format (only those with coordinates)
  const mapSitters = results
    .filter((r) => r.coordinates !== undefined)
    .map((r) => ({
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
                results.map((announcer) => (
                  <AnnouncerCard
                    key={announcer.id}
                    announcer={announcer}
                    isSelected={selectedAnnouncer?.id === announcer.id}
                    onClick={() => setSelectedAnnouncer(announcer)}
                    onShowFormulas={() => setFormulasModalAnnouncer(announcer)}
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
                    ? mapSitters.find((s) => s.id === selectedAnnouncer.id) ?? null
                    : null
                }
                onSitterSelect={(sitter) => {
                  const found = results.find((r) => r.id === sitter.id);
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

      {/* Formulas Modal */}
      {formulasModalAnnouncer && (
        <FormulasModal
          isOpen={!!formulasModalAnnouncer}
          onClose={() => setFormulasModalAnnouncer(null)}
          announcer={formulasModalAnnouncer}
        />
      )}
    </section>
  );
}
